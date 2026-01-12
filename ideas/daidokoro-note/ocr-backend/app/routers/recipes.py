import asyncio
from fastapi import APIRouter, File, Form, UploadFile, HTTPException, Depends
from typing import Optional
import ulid

from app.config import MAX_UPLOAD_BYTES, ALLOWED_EXTENSIONS, ALLOWED_MIMETYPES, OLLAMA_MODEL
from app.models.schemas import IngestResponse, RecipeResponse, StructuredRecipe
from app.models.database import save_recipe, get_recipe
from app.services.image_processor import process_image, save_image
from app.services.ocr_service import run_ocr
from app.services.llm_service import structure_recipe
from app.dependencies import verify_token

router = APIRouter(prefix="/v1/recipes", tags=["recipes"])

# 同時実行制御用セマフォ
_semaphore = asyncio.Semaphore(1)


@router.post("/ingest", response_model=IngestResponse)
async def ingest_recipe(
    image: UploadFile = File(...),
    source_url: Optional[str] = Form(None),
    title_hint: Optional[str] = Form(None),
    lang: str = Form("ja"),
    _: str = Depends(verify_token),
):
    """
    画像を受け取り、OCR→構造化→保存まで実行し、結果を返す
    """
    warnings = []

    # ファイル検証
    if image.content_type not in ALLOWED_MIMETYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {image.content_type}. Allowed: {ALLOWED_MIMETYPES}"
        )

    # 拡張子チェック
    ext = "." + image.filename.split(".")[-1].lower() if "." in image.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file extension: {ext}. Allowed: {ALLOWED_EXTENSIONS}"
        )

    # ファイルサイズチェック
    contents = await image.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {MAX_UPLOAD_BYTES // (1024*1024)}MB"
        )

    # セマフォで直列化（CPU保護）
    async with _semaphore:
        # レシピID生成
        recipe_id = str(ulid.new())

        # 画像前処理
        try:
            processed_image = process_image(contents)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Image processing failed: {str(e)}")

        # 画像保存
        image_path = save_image(processed_image, recipe_id)

        # OCR実行
        try:
            raw_text, ocr_blocks, confidence = run_ocr(processed_image)
        except Exception as e:
            warnings.append(f"OCR_ERROR: {str(e)}")
            raw_text = ""
            ocr_blocks = []
            confidence = 0.0

        if not raw_text:
            warnings.append("OCR_TEXT_EMPTY")

        # LLM構造化
        structured_dict = None
        if raw_text:
            structured_dict, llm_warnings = await structure_recipe(
                raw_text,
                source_url=source_url,
                title_hint=title_hint,
            )
            warnings.extend(llm_warnings)

        # DB保存
        save_recipe(
            recipe_id=recipe_id,
            image_path=image_path,
            ocr_raw_text=raw_text,
            ocr_blocks=ocr_blocks,
            structured_json=structured_dict,
            confidence=confidence,
            warnings=warnings,
            source_url=source_url,
            llm_model=OLLAMA_MODEL if structured_dict else None,
        )

        # レスポンス構築
        structured_recipe = None
        if structured_dict:
            try:
                structured_recipe = StructuredRecipe(**structured_dict)
            except Exception:
                warnings.append("SCHEMA_VALIDATION_FAILED")

        return IngestResponse(
            recipe_id=recipe_id,
            raw_ocr_text=raw_text,
            structured_recipe=structured_recipe,
            confidence=confidence,
            warnings=warnings,
        )


@router.get("/{recipe_id}", response_model=RecipeResponse)
async def get_recipe_by_id(
    recipe_id: str,
    _: str = Depends(verify_token),
):
    """保存済みレシピを取得"""
    recipe = get_recipe(recipe_id)

    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    structured_recipe = None
    if recipe["structured_json"]:
        try:
            structured_recipe = StructuredRecipe(**recipe["structured_json"])
        except Exception:
            pass

    return RecipeResponse(
        id=recipe["id"],
        created_at=recipe["created_at"],
        source_url=recipe["source_url"],
        image_path=recipe["image_path"],
        ocr_raw_text=recipe["ocr_raw_text"],
        structured_recipe=structured_recipe,
        confidence=recipe["confidence"],
        warnings=recipe["warnings"],
    )
