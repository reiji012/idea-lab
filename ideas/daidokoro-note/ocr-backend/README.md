# Recipe OCR Backend

料理レシピ画像をOCRで読み取り、構造化JSONに変換するFastAPI バックエンド。

## 機能

- 画像アップロード（JPEG/PNG/WebP）
- PaddleOCRによる日本語テキスト抽出
- bbox座標による読み順復元
- Ollama（ローカルLLM）による構造化JSON生成
- SQLiteへの永続化

## セットアップ

### 1. 仮想環境の作成

```bash
cd ocr-backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

### 2. 依存パッケージのインストール

```bash
pip install -r requirements.txt
```

### 3. 環境変数の設定

```bash
cp .env.example .env
# .env を編集してAPI_TOKEN等を設定
```

### 4. Ollamaの準備

```bash
# Ollamaをインストール後、モデルをダウンロード
ollama pull llama3.2
```

### 5. サーバー起動

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1
```

## API エンドポイント

### ヘルスチェック

```bash
GET /v1/health
```

### レシピ取り込み

```bash
POST /v1/recipes/ingest
Authorization: Bearer <token>
Content-Type: multipart/form-data

- image: file (required)
- source_url: string (optional)
- title_hint: string (optional)
- lang: string (default: ja)
```

### レシピ取得

```bash
GET /v1/recipes/{recipe_id}
Authorization: Bearer <token>
```

## レスポンス例

```json
{
  "recipe_id": "01JCXYZ...",
  "raw_ocr_text": "鶏むね肉のレモンバター\n材料...",
  "structured_recipe": {
    "title": "鶏むね肉のレモンバター",
    "servings": "2人分",
    "ingredients": [
      {"name": "鶏むね肉", "amount": "1枚", "note": null}
    ],
    "steps": [
      {"order": 1, "text": "鶏むね肉を一口大に切る"}
    ],
    "time": "20分",
    "notes": [],
    "tags": ["鶏肉", "簡単"],
    "source": {"url": null, "platform": null},
    "raw_text_used": "..."
  },
  "confidence": 0.95,
  "warnings": []
}
```

## 設定

| 環境変数 | 説明 | デフォルト |
|---------|------|-----------|
| API_TOKEN | 認証トークン | dev-token |
| DB_PATH | SQLiteファイルパス | ./data/db.sqlite3 |
| IMAGE_DIR | 画像保存ディレクトリ | ./data/images |
| MAX_UPLOAD_MB | 最大アップロードサイズ | 10 |
| OLLAMA_BASE_URL | OllamaのURL | http://localhost:11434 |
| OLLAMA_MODEL | 使用するモデル | llama3.2 |
| LLM_TIMEOUT | LLMタイムアウト(秒) | 120 |
| OCR_LANG | OCR言語 | japan |
| OCR_USE_GPU | OCRでGPUを使用 | true |

## GPU環境でのセットアップ (RTX 5080等)

GPU搭載PCでOCR/LLMの性能を向上させるための設定。

### 1. NVIDIA CUDAのインストール

```bash
# CUDA 12.x をインストール
# https://developer.nvidia.com/cuda-downloads
```

### 2. PaddlePaddle GPU版のインストール

```bash
# requirements.txt は paddlepaddle-gpu を使用するよう変更済み
pip install -r requirements.txt

# インストール確認
python -c "import paddle; print(paddle.device.is_compiled_with_cuda())"
# True が出力されればOK
```

### 3. 高性能LLMモデルの準備

RTX 5080 (16GB VRAM) での推奨モデル:

```bash
# 日本語に強い推奨モデル (32B)
ollama pull qwen2.5:32b

# または バランス型 (27B)
ollama pull gemma2:27b

# または 大規模モデル (70B, 4bit量子化)
ollama pull llama3.1:70b
```

### 4. 環境変数の設定

`.env` ファイルに以下を追加:

```bash
# GPU有効化
OCR_USE_GPU=true

# 大モデル用に推奨設定
OLLAMA_MODEL=qwen2.5:32b
LLM_TIMEOUT=180

# 外部からアクセスする場合
OLLAMA_BASE_URL=http://0.0.0.0:11434
```

### 5. Ollamaの起動 (外部アクセス許可)

```bash
# 他のPCからアクセスする場合
OLLAMA_HOST=0.0.0.0 ollama serve
```

### モデル比較

| モデル | VRAM使用量 | 日本語 | 速度 |
|--------|-----------|--------|------|
| llama3.2 (7B) | ~5GB | 普通 | 速い |
| qwen2.5:32b | ~18GB | 優秀 | 中程度 |
| gemma2:27b | ~16GB | 良い | 中程度 |
| llama3.1:70b | ~40GB (4bit) | 良い | 遅い |

RTX 5080 16GBでは `qwen2.5:32b` が最もバランスが良い。
