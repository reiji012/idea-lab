import logging
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.routers import recipes, health
from app.models.database import init_db
from app.services.ocr_service import init_ocr

# ロギング設定
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - [%(request_id)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


class RequestIdFilter(logging.Filter):
    def filter(self, record):
        if not hasattr(record, "request_id"):
            record.request_id = "-"
        return True


for handler in logging.root.handlers:
    handler.addFilter(RequestIdFilter())


@asynccontextmanager
async def lifespan(app: FastAPI):
    """アプリケーションのライフサイクル管理"""
    # 起動時
    logger.info("Initializing database...", extra={"request_id": "startup"})
    init_db()

    logger.info("Loading OCR model (this may take a while)...", extra={"request_id": "startup"})
    init_ocr()

    logger.info("Server is ready!", extra={"request_id": "startup"})

    yield

    # シャットダウン時
    logger.info("Shutting down...", extra={"request_id": "shutdown"})


app = FastAPI(
    title="Recipe OCR Backend",
    description="料理レシピ画像をOCRで読み取り、構造化JSONに変換するAPI",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://192.168.11.23:3000",
        "http://192.168.11.23:3001",
        "http://192.168.11.23:3002",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_request_id(request: Request, call_next):
    """リクエストIDを付与するミドルウェア"""
    request_id = str(uuid.uuid4())[:8]
    request.state.request_id = request_id

    # ロギングコンテキストに追加
    logger.info(
        f"{request.method} {request.url.path}",
        extra={"request_id": request_id}
    )

    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id

    logger.info(
        f"{request.method} {request.url.path} - {response.status_code}",
        extra={"request_id": request_id}
    )

    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """グローバル例外ハンドラ"""
    request_id = getattr(request.state, "request_id", "-")
    logger.error(
        f"Unhandled exception: {exc}",
        extra={"request_id": request_id},
        exc_info=True,
    )
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "request_id": request_id,
        },
    )


# ルーター登録
app.include_router(health.router)
app.include_router(recipes.router)


@app.get("/")
async def root():
    """ルートエンドポイント"""
    return {
        "name": "Recipe OCR Backend",
        "version": "1.0.0",
        "docs": "/docs",
    }
