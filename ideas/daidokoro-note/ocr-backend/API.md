# 台所ノート OCR API ドキュメント

## 概要

レシピ画像をOCRで読み取り、構造化データに変換するAPIです。

- **Base URL**: `http://localhost:8000`
- **認証**: Bearer Token（`Authorization: Bearer <token>`）
- **デフォルトトークン**: `dev-token`（開発環境）

---

## エンドポイント一覧

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/v1/health` | ヘルスチェック |
| POST | `/v1/recipes/ingest` | レシピ画像のOCR処理 |
| GET | `/v1/recipes/{recipe_id}` | 保存済みレシピの取得 |

---

## 認証

すべての `/v1/recipes/*` エンドポイントは認証が必要です。

```bash
# ヘッダーに Bearer トークンを追加
-H "Authorization: Bearer dev-token"
```

環境変数 `API_TOKEN` でトークンを変更できます。

---

## エンドポイント詳細

### GET /v1/health

システムの稼働状態を確認します。**認証不要**。

#### リクエスト

```bash
curl http://localhost:8000/v1/health
```

#### レスポンス

```json
{
  "status": "healthy",
  "ocr_loaded": true,
  "db_connected": true,
  "ollama_available": true
}
```

| フィールド | 型 | 説明 |
|-----------|-----|------|
| status | string | `healthy` または `degraded` |
| ocr_loaded | boolean | PaddleOCRの読み込み状態 |
| db_connected | boolean | SQLiteの接続状態 |
| ollama_available | boolean | Ollamaの利用可否 |

---

### POST /v1/recipes/ingest

レシピ画像をアップロードし、OCR→構造化→保存を実行します。

#### リクエスト

```bash
curl -X POST http://localhost:8000/v1/recipes/ingest \
  -H "Authorization: Bearer dev-token" \
  -F "image=@/path/to/recipe.jpg"
```

#### パラメータ（multipart/form-data）

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| image | file | ○ | レシピ画像ファイル |
| source_url | string | - | 元のURL（X投稿など） |
| title_hint | string | - | タイトルのヒント |
| lang | string | - | 言語コード（デフォルト: `ja`） |

#### 対応ファイル形式

- **拡張子**: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.bmp`
- **MIME**: `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `image/bmp`
- **最大サイズ**: 10MB

#### レスポンス（成功: 200）

```json
{
  "recipe_id": "01HXYZ1234567890ABCDEF",
  "raw_ocr_text": "鶏肉のトマト煮\n\n材料（2人分）\n鶏もも肉 300g\nトマト缶 1缶\n...",
  "structured_recipe": {
    "title": "鶏肉のトマト煮",
    "servings": "2人分",
    "ingredients": [
      {"name": "鶏もも肉", "amount": "300g", "note": null},
      {"name": "トマト缶", "amount": "1缶", "note": null}
    ],
    "steps": [
      {"order": 1, "text": "鶏肉を一口大に切る"},
      {"order": 2, "text": "フライパンで焼き色をつける"}
    ],
    "time": "30分",
    "notes": ["冷蔵庫で3日保存可能"],
    "tags": ["煮物", "鶏肉"],
    "source": {"url": null, "platform": null},
    "raw_text_used": "..."
  },
  "confidence": 0.85,
  "warnings": []
}
```

#### レスポンスフィールド

| フィールド | 型 | 説明 |
|-----------|-----|------|
| recipe_id | string | 生成されたレシピID（ULID） |
| raw_ocr_text | string | OCRで抽出した生テキスト |
| structured_recipe | object/null | 構造化されたレシピデータ |
| confidence | float | OCRの信頼度（0.0〜1.0） |
| warnings | array | 警告メッセージのリスト |

#### structured_recipe の構造

| フィールド | 型 | 説明 |
|-----------|-----|------|
| title | string/null | レシピタイトル |
| servings | string/null | 分量（例: "2人分"） |
| ingredients | array | 材料リスト |
| steps | array | 手順リスト |
| time | string/null | 調理時間 |
| notes | array | 補足・コツ |
| tags | array | タグ |
| source | object/null | 出典情報 |
| raw_text_used | string | 構造化に使用したテキスト |

#### エラーレスポンス

```json
// 400 Bad Request
{
  "detail": "Unsupported file type: text/plain. Allowed: ['image/jpeg', ...]"
}

// 401 Unauthorized
{
  "detail": "Invalid or missing Authorization header"
}

// 413 Payload Too Large
{
  "detail": "File too large. Maximum size: 10MB"
}
```

---

### GET /v1/recipes/{recipe_id}

保存済みのレシピを取得します。

#### リクエスト

```bash
curl http://localhost:8000/v1/recipes/01HXYZ1234567890ABCDEF \
  -H "Authorization: Bearer dev-token"
```

#### レスポンス（成功: 200）

```json
{
  "id": "01HXYZ1234567890ABCDEF",
  "created_at": "2024-01-15T10:30:00Z",
  "source_url": null,
  "image_path": "/app/data/images/01HXYZ1234567890ABCDEF.jpg",
  "ocr_raw_text": "鶏肉のトマト煮...",
  "structured_recipe": { ... },
  "confidence": 0.85,
  "warnings": []
}
```

#### エラーレスポンス

```json
// 404 Not Found
{
  "detail": "Recipe not found"
}
```

---

## 警告コード

| コード | 説明 |
|--------|------|
| OCR_ERROR | OCR処理中にエラーが発生 |
| OCR_TEXT_EMPTY | OCRでテキストを検出できなかった |
| LLM_ERROR | LLM構造化処理に失敗 |
| LLM_JSON_PARSE_FAILED | LLMの出力をJSONとして解析できなかった |
| LLM_TIMEOUT | LLM処理がタイムアウト |
| LLM_RETRY_EXHAUSTED | LLMリトライ回数を超過 |
| SCHEMA_VALIDATION_FAILED | 構造化データがスキーマに適合しない |

---

## 使用例

### Python

```python
import httpx

API_URL = "http://localhost:8000"
TOKEN = "dev-token"

# レシピ画像をアップロード
with open("recipe.jpg", "rb") as f:
    response = httpx.post(
        f"{API_URL}/v1/recipes/ingest",
        headers={"Authorization": f"Bearer {TOKEN}"},
        files={"image": ("recipe.jpg", f, "image/jpeg")},
    )

result = response.json()
print(f"Recipe ID: {result['recipe_id']}")
print(f"Title: {result['structured_recipe']['title']}")
```

### JavaScript (fetch)

```javascript
const formData = new FormData();
formData.append('image', fileInput.files[0]);

const response = await fetch('http://localhost:8000/v1/recipes/ingest', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer dev-token',
  },
  body: formData,
});

const result = await response.json();
console.log('Recipe:', result.structured_recipe);
```

---

## OpenAPI (Swagger UI)

FastAPIの自動生成ドキュメントも利用可能です:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
