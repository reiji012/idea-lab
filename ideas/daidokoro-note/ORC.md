要件定義：Recipe OCR Backend（PC上で稼働 / FastAPI）
0. ゴール

入力：料理レシピが写った画像（X等の投稿画像、写真ベース）

出力：レシピを 材料/手順 に構造化した JSON

保存：raw（OCR生） と structured（整形後JSON） を同一レコードとして保存

後で Supabase に移行できるよう、データモデルは一般化しておく

1. システム構成（最短実用）

Frontend（既存）

画像ファイルをOCRサーバへPOSTする

返ってきた結果表示/保存完了通知など（ここは既存）

OCRサーバ（PC）：FastAPI

画像受け取り

前処理（リサイズ等）

PaddleOCRで bbox付きOCR

bboxを使って行順を復元してOCRテキスト生成（raw）

LLMへ投入して構造化JSON生成（structured）

SQLiteへ保存

APIで結果返却

2. API要件
2.1 認証（最低限）

方式：Authorization: Bearer <token> の固定トークン（envで設定）

LAN内運用でも必須（誤アクセス/踏み台対策）

失敗時：401 Unauthorized

2.2 エンドポイント（同期版：最短）
POST /v1/recipes/ingest

目的：画像を受け取り、OCR→構造化→保存まで実行し、結果を返す

受け取り：

multipart/form-data

image: file (jpg/png/webp)

optional fields:

source_url（Xの投稿URLなど）

title_hint（任意）

lang（default ja）

返却（200）：

recipe_id

raw_ocr_text

structured_recipe（JSON）

confidence（OCR信頼指標の簡易値）

warnings（例：材料と手順の判定が曖昧等）

GET /v1/recipes/{recipe_id}

保存済みを取得

GET /v1/health

ヘルスチェック（PaddleOCRロード済み/DB接続OK）

まずは同期処理でOK。処理時間が長い場合のために将来 POST /v1/jobs で非同期化できる設計余地を残す（後述）。

3. OCR処理要件（PaddleOCR）
3.1 OCRエンジン

PaddleOCR を使用

必須：bbox（座標）付きで抽出できること

言語：日本語を優先（japan/japanese相当のモデル設定）

3.2 前処理（必須）

入力画像の長辺を最低 2000px 以上に揃える（小さい文字救済）

既に大きい場合は上限 3000〜4000px 程度で抑える（処理時間対策）

EXIF回転の補正（スマホ画像あるある）

可能なら軽いコントラスト調整（任意・後回しでもいい）

3.3 行順復元（必須）

OCR結果は bbox 単位で返るため、読み順を復元する

仕様（シンプルでOK）：

bboxの中心Yでクラスタリング（行判定：閾値は文字高さ依存で動的に）

行内はX昇順で並べる

行はY昇順で並べる

出力：

raw_ocr_text：行ごとに改行を入れてテキスト化

ocr_blocks（保存用）：各ブロックの {text, bbox, score} を保持

3.4 OCR信頼度

PaddleOCRのスコアを利用して簡易的な confidence を作る

例：ブロックscoreの平均、または低スコア率

低信頼の場合は warnings に入れる（“文字が小さい/背景が複雑”等の推定コメントは任意）

4. LLM整形要件（構造化JSON化）
4.1 入力

raw_ocr_text を主入力にする

追加コンテキストとして source_url や title_hint を渡しても良い

4.2 出力スキーマ（固定）

LLMの出力は必ずこのJSONスキーマに合わせる（足りない項目はnull/空でOK）。

{
  "title": "string|null",
  "servings": "string|null",
  "ingredients": [
    { "name": "string", "amount": "string|null", "note": "string|null" }
  ],
  "steps": [
    { "order": 1, "text": "string" }
  ],
  "time": "string|null",
  "notes": ["string"],
  "tags": ["string"],
  "source": { "url": "string|null", "platform": "string|null" },
  "raw_text_used": "string"
}

4.3 整形方針

OCR誤字は 補正してよい が、監査のため raw_text_used に投入テキストを保存

手順は order を必ず付与（1..n）

材料は行ごとに分解し、分量が不明なら amount=null

見出し（材料/作り方/手順/調味料 等）を推定して分類

“レシピでない”場合は warnings を出しつつ、ingredients/steps を空で返してよい

4.4 LLM失敗時のフォールバック

LLMが落ちた / JSONパース不可：

structured_recipe = null

warnings に LLM_PARSE_FAILED 等を入れる

rawは保存し、後で再整形できるようにする（再実行エンドポイントは将来）

5. 保存要件（SQLite）
5.1 保存対象（必須）

画像ファイル：ディスクに保存（例：./data/images/{recipe_id}.jpg）

DB：SQLite（例：./data/db.sqlite3）

5.2 テーブル設計（最低限）
recipes

id (uuid or ulid 推奨)

created_at

source_url (nullable)

image_path

ocr_raw_text (TEXT)

ocr_blocks_json (TEXT / JSON文字列) ※bboxやscore含む

structured_json (TEXT / JSON文字列, nullable)

confidence (REAL nullable)

warnings_json (TEXT / JSON文字列)

llm_model (nullable) ※何使ったか追跡用

version (INT) ※将来スキーマ変更用

後で Supabase へ移す時も、そのまま recipes テーブルで移行しやすい形。

6. 非機能要件
6.1 実行環境

OS：PC（macOS想定でもOK。Dockerでも可）

FastAPI + Uvicorn で起動

PaddleOCRモデルは初回ロードが重いので サーバ起動時にロードして常駐

6.2 性能目標（目安）

1枚あたり 3〜10秒程度（画像サイズ/PC性能に依存）

タイムアウト：30秒（フロント側も合わせる）

6.3 同時実行制御

同時に複数来たらCPUが死ぬので、

ワーカー数制限（Uvicorn workers=1）

もしくはアプリ側で asyncio.Semaphore(1) で直列化

将来：ジョブキュー化（RQ/Celery）に移行できるようにする

6.4 ログ・監視

リクエスト単位で request_id を発行してログに載せる

保存した recipe_id と紐付け

例外時にスタックトレースはサーバログのみ（レスポンスには出さない）

6.5 セキュリティ

トークン認証必須

アップロードファイルのMIME/拡張子チェック

ファイルサイズ上限（例：10MB）

画像保存パスはサニタイズ（recipe_id固定で生成）

7. 実装タスク分解（AIエージェント用）

FastAPIプロジェクト作成

/v1/health 実装

認証ミドルウェア（Bearer token）

画像アップロード受け取り（multipart）

画像保存 + EXIF回転補正 + リサイズ

PaddleOCR組み込み（起動時ロード）

bbox結果から読み順復元して raw_ocr_text 生成

LLM呼び出しモジュール（プロンプト + JSONスキーマ強制）

LLM出力のJSONパースとバリデーション（失敗時フォールバック）

SQLite永続化（recipesテーブル）

POST /v1/recipes/ingest のレスポンス整形

GET /v1/recipes/{id} 実装

ログ整備（request_id/recipe_id）

設定を env 化（TOKEN, DB_PATH, IMAGE_DIR, LLM設定, MAX_UPLOAD_MB）

8. 受け入れ条件（テスト観点）

画像をPOSTすると、DBに1レコードできる

ocr_raw_text に何かしら文字が入る（空ならwarning）

structured_json が JSONとしてパース可能 で、ingredients/stepsが配列として返る

LLMが死んでも raw は保存され、APIは落ちない

同時に2リクエスト投げてもサーバが過負荷で落ちない（直列化でOK）