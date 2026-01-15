import numpy as np
from PIL import Image
from paddleocr import PaddleOCR
from typing import Optional

from app.config import OCR_LANG, OCR_USE_GPU

# グローバルOCRインスタンス（起動時にロード）
_ocr_instance: Optional[PaddleOCR] = None


def init_ocr():
    """OCRエンジンを初期化（起動時に呼び出し）"""
    global _ocr_instance
    if _ocr_instance is None:
        _ocr_instance = PaddleOCR(
            use_angle_cls=True,
            lang=OCR_LANG,
            show_log=False,
            use_gpu=OCR_USE_GPU,
        )
    return _ocr_instance


def get_ocr() -> PaddleOCR:
    """OCRインスタンスを取得"""
    global _ocr_instance
    if _ocr_instance is None:
        init_ocr()
    return _ocr_instance


def is_ocr_loaded() -> bool:
    """OCRがロード済みかチェック"""
    return _ocr_instance is not None


def run_ocr(image: Image.Image) -> tuple[str, list[dict], float]:
    """
    OCRを実行し、行順復元したテキストとブロック情報を返す

    Returns:
        raw_text: 行順復元したOCRテキスト
        blocks: 各ブロックの情報 [{text, bbox, score}]
        confidence: 全体の信頼度スコア
    """
    ocr = get_ocr()

    # PIL ImageをNumPy配列に変換
    img_array = np.array(image)

    # OCR実行
    result = ocr.ocr(img_array, cls=True)

    if not result or not result[0]:
        return "", [], 0.0

    # ブロック情報を抽出
    blocks = []
    for line in result[0]:
        bbox = line[0]  # [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
        text = line[1][0]
        score = line[1][1]

        # bbox中心座標を計算
        center_x = sum(p[0] for p in bbox) / 4
        center_y = sum(p[1] for p in bbox) / 4

        # 文字の高さを計算（行クラスタリング用）
        height = (bbox[3][1] - bbox[0][1] + bbox[2][1] - bbox[1][1]) / 2

        blocks.append({
            "text": text,
            "bbox": bbox,
            "score": score,
            "center_x": center_x,
            "center_y": center_y,
            "height": height,
        })

    # 行順復元
    raw_text = reconstruct_reading_order(blocks)

    # 信頼度計算（平均スコア）
    if blocks:
        confidence = sum(b["score"] for b in blocks) / len(blocks)
    else:
        confidence = 0.0

    # 返却用にblockを整形（内部情報を除去）
    output_blocks = [
        {"text": b["text"], "bbox": b["bbox"], "score": b["score"]}
        for b in blocks
    ]

    return raw_text, output_blocks, confidence


def reconstruct_reading_order(blocks: list[dict]) -> str:
    """
    bbox情報から読み順を復元してテキストを生成

    方針:
    1. Y座標でクラスタリング（行判定）
    2. 行内はX座標で昇順
    3. 行はY座標で昇順
    """
    if not blocks:
        return ""

    # 平均文字高さを計算（行クラスタリングの閾値に使用）
    avg_height = sum(b["height"] for b in blocks) / len(blocks)
    threshold = avg_height * 0.5

    # Y座標でソート
    sorted_blocks = sorted(blocks, key=lambda b: b["center_y"])

    # 行にクラスタリング
    lines = []
    current_line = [sorted_blocks[0]]

    for block in sorted_blocks[1:]:
        # 前のブロックとのY差が閾値以内なら同じ行
        if abs(block["center_y"] - current_line[-1]["center_y"]) < threshold:
            current_line.append(block)
        else:
            lines.append(current_line)
            current_line = [block]

    lines.append(current_line)

    # 各行内をX座標でソートし、テキストを結合
    text_lines = []
    for line in lines:
        sorted_line = sorted(line, key=lambda b: b["center_x"])
        line_text = "".join(b["text"] for b in sorted_line)
        text_lines.append(line_text)

    return "\n".join(text_lines)
