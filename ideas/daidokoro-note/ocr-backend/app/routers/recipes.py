import asyncio
import logging
from fastapi import APIRouter, File, Form, UploadFile, HTTPException, Depends
from typing import Optional, List
import ulid

from app.config import MAX_UPLOAD_BYTES, ALLOWED_EXTENSIONS, ALLOWED_MIMETYPES, OLLAMA_MODEL

logger = logging.getLogger(__name__)

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
    _: str = Depends(verify_token),
):
    """
    画像を受け取り、OCR→構造化→保存まで実行し、結果を返す
    """
    logger.info(f"=== Ingest request: filename={image.filename}, content_type={image.content_type} ===")
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
        logger.info(f"Processing recipe: id={recipe_id}, size={len(contents)} bytes")

        # 画像前処理
        try:
            processed_image = process_image(contents)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Image processing failed: {str(e)}")

        # 画像保存
        image_path = save_image(processed_image, recipe_id)

        # OCR実行
        logger.info("Step 2: Running OCR...")
        try:
            raw_text, ocr_blocks, confidence = run_ocr(processed_image)
        except Exception as e:
            logger.exception(f"OCR failed: {str(e)}")
            warnings.append(f"OCR_ERROR: {str(e)}")
            raw_text = ""
            ocr_blocks = []
            confidence = 0.0

        if not raw_text:
            logger.warning("OCR returned empty text")
            warnings.append("OCR_TEXT_EMPTY")

        # LLM構造化
        structured_dict = None
        if raw_text:
            logger.info("Step 3: Running LLM structuring...")
            structured_dict, llm_warnings = await structure_recipe(
                raw_text,
                source_url=source_url,
                title_hint=title_hint,
            )
            warnings.extend(llm_warnings)
            if structured_dict:
                logger.info(f"LLM structuring successful: title={structured_dict.get('title')}")
            else:
                logger.warning(f"LLM structuring failed: warnings={llm_warnings}")

        # DB保存
        logger.info("Step 4: Saving to database...")
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

        logger.info(f"=== Ingest complete: recipe_id={recipe_id}, warnings={warnings} ===")
        return IngestResponse(
            recipe_id=recipe_id,
            raw_ocr_text=raw_text,
            structured_recipe=structured_recipe,
            confidence=confidence,
            warnings=warnings,
        )


@router.post("/ingest/batch", response_model=BatchIngestResponse)
async def ingest_recipe_batch(
    images: List[UploadFile] = File(...),
    source_url: Optional[str] = Form(None),
    title_hint: Optional[str] = Form(None),
    _: str = Depends(verify_token),
):
    """
    複数画像を受け取り、全てOCR→テキスト結合→構造化→保存まで実行し、結果を返す
    """
    if not images:
        raise HTTPException(status_code=400, detail="No images provided")

    if len(images) > 4:
        raise HTTPException(status_code=400, detail="Maximum 4 images allowed")

    warnings = []
    raw_texts = []
    confidences = []
    image_paths = []

    # セマフォで直列化（CPU保護）
    async with _semaphore:
        recipe_id = str(ulid.new())

        # 各画像を処理
        for i, image in enumerate(images):
            # ファイル検証
            if image.content_type not in ALLOWED_MIMETYPES:
                warnings.append(f"IMAGE_{i}_SKIPPED: Unsupported file type")
                continue

            ext = "." + image.filename.split(".")[-1].lower() if "." in image.filename else ""
            if ext not in ALLOWED_EXTENSIONS:
                warnings.append(f"IMAGE_{i}_SKIPPED: Unsupported extension")
                continue

            contents = await image.read()
            if len(contents) > MAX_UPLOAD_BYTES:
                warnings.append(f"IMAGE_{i}_SKIPPED: File too large")
                continue

            # 画像前処理
            try:
                processed_image = process_image(contents)
            except Exception as e:
                warnings.append(f"IMAGE_{i}_PROCESSING_ERROR: {str(e)}")
                continue

            # 画像保存
            img_path = save_image(processed_image, f"{recipe_id}_{i}")
            image_paths.append(img_path)

            # OCR実行
            try:
                raw_text, ocr_blocks, confidence = run_ocr(processed_image)
                if raw_text:
                    raw_texts.append(raw_text)
                    confidences.append(confidence)
                else:
                    warnings.append(f"IMAGE_{i}_OCR_EMPTY")
            except Exception as e:
                warnings.append(f"IMAGE_{i}_OCR_ERROR: {str(e)}")

        if not raw_texts:
            raise HTTPException(status_code=400, detail="No text could be extracted from any image")

        # 全テキストを結合
        combined_text = "\n\n---\n\n".join(raw_texts)
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0

        # LLM構造化（結合テキストを使用）
        structured_dict = None
        structured_dict, llm_warnings = await structure_recipe(
            combined_text,
            source_url=source_url,
            title_hint=title_hint,
        )
        warnings.extend(llm_warnings)

        # DB保存
        save_recipe(
            recipe_id=recipe_id,
            image_path=image_paths[0] if image_paths else "",
            ocr_raw_text=combined_text,
            ocr_blocks=[],
            structured_json=structured_dict,
            confidence=avg_confidence,
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

        return BatchIngestResponse(
            recipe_id=recipe_id,
            raw_ocr_texts=raw_texts,
            combined_raw_text=combined_text,
            structured_recipe=structured_recipe,
            average_confidence=avg_confidence,
            warnings=warnings,
            processed_count=len(raw_texts),
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
