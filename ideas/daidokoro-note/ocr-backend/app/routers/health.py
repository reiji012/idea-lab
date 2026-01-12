from fastapi import APIRouter

from app.models.schemas import HealthResponse
from app.models.database import check_db_connection
from app.services.ocr_service import is_ocr_loaded
from app.services.llm_service import check_ollama_available

router = APIRouter(tags=["health"])


@router.get("/v1/health", response_model=HealthResponse)
async def health_check():
    """ヘルスチェック"""
    ocr_loaded = is_ocr_loaded()
    db_connected = check_db_connection()
    ollama_available = await check_ollama_available()

    status = "healthy" if (ocr_loaded and db_connected) else "degraded"

    return HealthResponse(
        status=status,
        ocr_loaded=ocr_loaded,
        db_connected=db_connected,
        ollama_available=ollama_available,
    )
