import sqlite3
import json
from pathlib import Path
from typing import Optional
from datetime import datetime

from app.config import DB_PATH


def get_connection() -> sqlite3.Connection:
    """データベース接続を取得"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """データベースを初期化"""
    Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS recipes (
            id TEXT PRIMARY KEY,
            created_at TEXT NOT NULL,
            source_url TEXT,
            image_path TEXT NOT NULL,
            ocr_raw_text TEXT NOT NULL,
            ocr_blocks_json TEXT,
            structured_json TEXT,
            confidence REAL,
            warnings_json TEXT,
            llm_model TEXT,
            version INTEGER DEFAULT 1
        )
    """)

    conn.commit()
    conn.close()


def save_recipe(
    recipe_id: str,
    image_path: str,
    ocr_raw_text: str,
    ocr_blocks: list,
    structured_json: Optional[dict],
    confidence: Optional[float],
    warnings: list[str],
    source_url: Optional[str] = None,
    llm_model: Optional[str] = None,
) -> None:
    """レシピを保存"""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO recipes (
            id, created_at, source_url, image_path, ocr_raw_text,
            ocr_blocks_json, structured_json, confidence, warnings_json,
            llm_model, version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        recipe_id,
        datetime.utcnow().isoformat(),
        source_url,
        image_path,
        ocr_raw_text,
        json.dumps(ocr_blocks, ensure_ascii=False),
        json.dumps(structured_json, ensure_ascii=False) if structured_json else None,
        confidence,
        json.dumps(warnings, ensure_ascii=False),
        llm_model,
        1,
    ))

    conn.commit()
    conn.close()


def get_recipe(recipe_id: str) -> Optional[dict]:
    """レシピを取得"""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM recipes WHERE id = ?", (recipe_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return None

    return {
        "id": row["id"],
        "created_at": row["created_at"],
        "source_url": row["source_url"],
        "image_path": row["image_path"],
        "ocr_raw_text": row["ocr_raw_text"],
        "ocr_blocks": json.loads(row["ocr_blocks_json"]) if row["ocr_blocks_json"] else [],
        "structured_json": json.loads(row["structured_json"]) if row["structured_json"] else None,
        "confidence": row["confidence"],
        "warnings": json.loads(row["warnings_json"]) if row["warnings_json"] else [],
        "llm_model": row["llm_model"],
    }


def check_db_connection() -> bool:
    """DB接続をチェック"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        conn.close()
        return True
    except Exception:
        return False
