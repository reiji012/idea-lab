import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# 基本パス
BASE_DIR = Path(__file__).resolve().parent.parent

# API認証
API_TOKEN = os.getenv("API_TOKEN", "dev-token")

# データベース・ストレージ
DB_PATH = os.getenv("DB_PATH", str(BASE_DIR / "data" / "db.sqlite3"))
IMAGE_DIR = os.getenv("IMAGE_DIR", str(BASE_DIR / "data" / "images"))

# アップロード制限
MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "10"))
MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024

# Ollama設定
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")

# OCR設定
OCR_LANG = os.getenv("OCR_LANG", "japan")

# 画像処理設定
IMAGE_MIN_SIZE = 2000  # 長辺の最小サイズ
IMAGE_MAX_SIZE = 4000  # 長辺の最大サイズ

# タイムアウト
REQUEST_TIMEOUT = 30

# 許可するファイル形式
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_MIMETYPES = {"image/jpeg", "image/png", "image/webp"}
