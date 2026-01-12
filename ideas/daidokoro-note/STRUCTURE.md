# 台所ノート ファイル構成
更新テスト


## 概要

- **フロントエンド**: Next.js 16 (TypeScript + Tailwind CSS)
- **バックエンド**: FastAPI (Python) + PaddleOCR + Ollama

---

## フロントエンド (`/`)

```
daidokoro-note/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # ルートレイアウト（日本語設定・ナビゲーション）
│   │   ├── page.tsx                # レシピ一覧（ホーム）
│   │   ├── globals.css             # グローバルスタイル（暖色系カラー）
│   │   ├── recipes/
│   │   │   └── [id]/
│   │   │       └── page.tsx        # レシピ詳細
│   │   ├── fridge/
│   │   │   └── page.tsx            # 冷蔵庫の中身
│   │   └── history/
│   │       └── page.tsx            # 調理履歴
│   ├── components/
│   │   ├── BottomNavigation.tsx    # 下部固定ナビゲーション
│   │   ├── Header.tsx              # ページヘッダー
│   │   ├── Modal.tsx               # 汎用モーダル
│   │   ├── Button.tsx              # 汎用ボタン
│   │   ├── ImageUpload.tsx         # 画像アップロード（Base64）
│   │   ├── RecipeCard.tsx          # レシピカード
│   │   └── RecipeForm.tsx          # レシピ登録フォーム
│   ├── lib/
│   │   └── storage.ts              # localStorage操作（CRUD）
│   └── types/
│       └── index.ts                # TypeScript型定義
├── public/                         # 静的ファイル
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
└── README.md
```

### 主要な型定義 (`src/types/index.ts`)

| 型名 | 説明 |
|------|------|
| `Recipe` | レシピ（id, title, ingredients, steps, images, source, category, cookedCount） |
| `FridgeIngredient` | 冷蔵庫の食材（id, name, addedAt） |
| `CookingHistory` | 調理履歴（id, recipeId?, title, date, note） |
| `RecipeCategory` | カテゴリ（main, side, soup, salad, pasta, rice, curry, noodle, other） |
| `RecipeSource` | 登録元（x, book, original, history） |

### 画面構成

| パス | 画面 | 機能 |
|------|------|------|
| `/` | レシピ一覧 | 検索、カテゴリフィルタ、新規登録 |
| `/recipes/[id]` | レシピ詳細 | 画像、材料、作り方、編集、削除、「作った」記録 |
| `/fridge` | 冷蔵庫 | 食材登録・削除、おすすめレシピ表示 |
| `/history` | 調理履歴 | 記録一覧、自由記録、レシピ化 |

---

## OCRバックエンド (`/ocr-backend`)

```
ocr-backend/
├── app/
│   ├── __init__.py
│   ├── main.py                     # FastAPIアプリ（エントリポイント）
│   ├── config.py                   # 設定管理（環境変数）
│   ├── dependencies.py             # 認証ミドルウェア（Bearer Token）
│   ├── models/
│   │   ├── __init__.py
│   │   ├── schemas.py              # Pydanticスキーマ（リクエスト/レスポンス）
│   │   └── database.py             # SQLite操作
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── recipes.py              # /v1/recipes/* エンドポイント
│   │   └── health.py               # /v1/health エンドポイント
│   └── services/
│       ├── __init__.py
│       ├── image_processor.py      # 画像前処理（EXIF補正・リサイズ）
│       ├── ocr_service.py          # PaddleOCR・行順復元
│       └── llm_service.py          # Ollama連携・構造化JSON生成
├── data/
│   ├── images/                     # 保存画像
│   └── db.sqlite3                  # SQLiteデータベース
├── requirements.txt
├── .env.example
├── .gitignore
└── README.md
```

### APIエンドポイント

| メソッド | パス | 説明 |
|----------|------|------|
| `GET` | `/v1/health` | ヘルスチェック（OCR/DB/Ollama状態） |
| `POST` | `/v1/recipes/ingest` | 画像アップロード→OCR→構造化→保存 |
| `GET` | `/v1/recipes/{id}` | 保存済みレシピ取得 |

### データベーススキーマ (`recipes`テーブル)

| カラム | 型 | 説明 |
|--------|-----|------|
| id | TEXT | ULID |
| created_at | TEXT | ISO日付 |
| source_url | TEXT | 元URL（nullable） |
| image_path | TEXT | 画像ファイルパス |
| ocr_raw_text | TEXT | OCR生テキスト |
| ocr_blocks_json | TEXT | bbox付きOCR結果（JSON） |
| structured_json | TEXT | 構造化レシピ（JSON） |
| confidence | REAL | OCR信頼度 |
| warnings_json | TEXT | 警告リスト（JSON） |
| llm_model | TEXT | 使用LLMモデル |
| version | INTEGER | スキーマバージョン |

### 構造化レシピJSON形式

```json
{
  "title": "レシピ名",
  "servings": "2人分",
  "ingredients": [
    { "name": "材料名", "amount": "分量", "note": "備考" }
  ],
  "steps": [
    { "order": 1, "text": "手順" }
  ],
  "time": "調理時間",
  "notes": ["ポイント"],
  "tags": ["タグ"],
  "source": { "url": null, "platform": null },
  "raw_text_used": "OCR元テキスト"
}
```

---

## 環境変数

### フロントエンド
- データはlocalStorageに保存（環境変数不要）

### バックエンド (`.env`)

| 変数 | 説明 | デフォルト |
|------|------|-----------|
| `API_TOKEN` | 認証トークン | dev-token |
| `DB_PATH` | SQLiteパス | ./data/db.sqlite3 |
| `IMAGE_DIR` | 画像保存先 | ./data/images |
| `MAX_UPLOAD_MB` | 最大アップロードサイズ | 10 |
| `OLLAMA_BASE_URL` | OllamaのURL | http://localhost:11434 |
| `OLLAMA_MODEL` | 使用モデル | llama3.2 |
| `OCR_LANG` | OCR言語 | japan |

---

## Docker

### ファイル構成

```
daidokoro-note/
├── docker-compose.yml      # オーケストレーション
├── Dockerfile.frontend     # Next.js用
├── .dockerignore
└── ocr-backend/
    ├── Dockerfile          # FastAPI用
    └── .dockerignore
```

### 起動方法

```bash
# 事前準備: Ollamaをホストで起動しておく
ollama serve
ollama pull llama3.2

# Docker Compose で起動
cd ideas/daidokoro-note
docker compose up --build

# バックグラウンド起動
docker compose up -d --build
```

### アクセスURL

| サービス | URL |
|----------|-----|
| フロントエンド | http://localhost:3000 |
| OCRバックエンド | http://localhost:8000 |
| API ドキュメント | http://localhost:8000/docs |

### 環境変数 (docker-compose)

```bash
# .env ファイルを作成
API_TOKEN=your-secret-token
OLLAMA_MODEL=llama3.2
```

### 注意事項

- **Ollama**: ホストマシンで起動が必要（`host.docker.internal` 経由でアクセス）
- **PaddleOCR**: 初回起動時にモデルダウンロードで時間がかかる
- **データ永続化**: `ocr-data` ボリュームに保存される
