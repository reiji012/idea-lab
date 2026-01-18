import json
import logging
import httpx
from typing import Optional

from app.config import OLLAMA_BASE_URL, OLLAMA_MODEL, LLM_TIMEOUT

logger = logging.getLogger(__name__)

# JSON出力スキーマのプロンプト
SYSTEM_PROMPT = """あなたは料理レシピを構造化するアシスタントです。
OCRで読み取ったテキストを解析し、以下のJSON形式で出力してください。

必ず以下のJSON形式で出力してください。マークダウンのコードブロックは使わず、JSONのみを出力してください。

{
  "title": "レシピ名（推定）",
  "servings": "分量（例: 2人分）",
  "ingredients": [
    {"name": "材料名", "amount": "分量", "note": "備考"}
  ],
  "steps": [
    {"order": 1, "text": "手順の説明"}
  ],
  "time": "調理時間",
  "notes": ["ポイントやコツ"],
  "tags": ["タグ"],
  "source": {"url": null, "platform": null}
}

注意点:
- OCRの誤字は適切に補正してください
- 材料と手順を明確に分けてください
- 手順には必ずorderを1から順番に付けてください
- 不明な項目はnullまたは空配列にしてください
- レシピでない場合はingredientsとstepsを空配列にしてください"""


async def check_ollama_available() -> bool:
    """Ollamaが利用可能かチェック"""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            return response.status_code == 200
    except Exception:
        return False


async def structure_recipe(
    raw_text: str,
    source_url: Optional[str] = None,
    title_hint: Optional[str] = None,
) -> tuple[Optional[dict], list[str]]:
    """
    LLMを使ってOCRテキストを構造化JSONに変換

    Returns:
        structured: 構造化されたレシピJSON（失敗時はNone）
        warnings: 警告メッセージのリスト
    """
    warnings = []

    if not raw_text.strip():
        logger.warning("OCR text is empty")
        warnings.append("OCR_TEXT_EMPTY")
        return None, warnings

    logger.info(f"Starting LLM structuring with model: {OLLAMA_MODEL}")
    logger.debug(f"OCR text length: {len(raw_text)} chars")

    # プロンプト構築
    user_content = f"以下のOCRテキストからレシピ情報を抽出してください:\n\n{raw_text}"

    if source_url:
        user_content += f"\n\n元URL: {source_url}"
    if title_hint:
        user_content += f"\n\nタイトルヒント: {title_hint}"

    try:
        logger.info(f"Sending request to Ollama: {OLLAMA_BASE_URL}/api/generate")
        async with httpx.AsyncClient(timeout=float(LLM_TIMEOUT)) as client:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json={
                    "model": OLLAMA_MODEL,
                    "prompt": f"{SYSTEM_PROMPT}\n\nユーザー: {user_content}\n\nアシスタント:",
                    "stream": False,
                    "options": {
                        "temperature": 0.1,
                    },
                },
            )

            if response.status_code != 200:
                error_body = response.text
                logger.error(f"LLM request failed: status={response.status_code}, body={error_body}")
                warnings.append(f"LLM_REQUEST_FAILED: {response.status_code}")
                return None, warnings

            result = response.json()
            llm_output = result.get("response", "")
            logger.info(f"LLM response received: {len(llm_output)} chars")
            logger.debug(f"LLM raw output: {llm_output[:500]}...")

            # JSONをパース
            structured = parse_llm_response(llm_output)

            if structured is None:
                logger.error(f"Failed to parse LLM response as JSON: {llm_output[:200]}...")
                warnings.append("LLM_PARSE_FAILED")
                return None, warnings

            logger.info(f"Successfully parsed recipe: {structured.get('title', 'unknown')}")

            # raw_text_usedを追加
            structured["raw_text_used"] = raw_text

            # 検証
            if not structured.get("ingredients") and not structured.get("steps"):
                logger.warning("Parsed result has no ingredients or steps - may not be a recipe")
                warnings.append("NOT_A_RECIPE")

            return structured, warnings

    except httpx.TimeoutException:
        logger.error(f"LLM request timed out after {LLM_TIMEOUT}s")
        warnings.append("LLM_TIMEOUT")
        return None, warnings
    except Exception as e:
        logger.exception(f"LLM error: {str(e)}")
        warnings.append(f"LLM_ERROR: {str(e)}")
        return None, warnings


def parse_llm_response(response: str) -> Optional[dict]:
    """LLMの応答からJSONを抽出してパース"""
    try:
        # まず直接パースを試みる
        return json.loads(response.strip())
    except json.JSONDecodeError:
        pass

    # コードブロックからJSONを抽出
    try:
        if "```json" in response:
            start = response.index("```json") + 7
            end = response.index("```", start)
            json_str = response[start:end].strip()
            return json.loads(json_str)
        elif "```" in response:
            start = response.index("```") + 3
            end = response.index("```", start)
            json_str = response[start:end].strip()
            return json.loads(json_str)
    except (ValueError, json.JSONDecodeError):
        pass

    # { から } までを抽出
    try:
        start = response.index("{")
        end = response.rindex("}") + 1
        json_str = response[start:end]
        return json.loads(json_str)
    except (ValueError, json.JSONDecodeError):
        pass

    return None
