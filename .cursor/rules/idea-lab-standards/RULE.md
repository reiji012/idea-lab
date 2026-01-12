---
description: "Standards for managing multiple app ideas in this repository"
alwaysApply: true
---

# リポジトリ構成

このリポジトリは複数のアプリアイデアを集積・管理するためのものです。

```
ideas/
  <idea-name>/
    README.md  # アイデアの詳細
```

# 新しいアイデアの追加

## ディレクトリ作成
- `ideas/<idea-name>/` を作成
- `<idea-name>` は kebab-case（例: `walking-log`）

## README.md のテンプレート

```markdown
# <アイデア名>

## 概要
<アイデアの説明>

## 機能
- 機能1
- 機能2

## 技術スタック
- **フレームワーク**: <使用技術>
- **ターゲット**: <対象プラットフォーム>
```

## プロジェクト初期化（任意）
- Flutter: `flutter create .`
- Next.js: `npx create-next-app@latest .`
- Vite: `npm create vite@latest .`

# コーディング規約

- 日本語コメントを使用
- 各アイデアは独立したプロジェクトとして管理
- 依存関係は各ディレクトリ内で完結

## アイデア固有のルール

各アイデア固有のルールは以下の場所に配置：
- Cursor: `ideas/<idea-name>/.cursorrules`
- Gemini: `ideas/<idea-name>/.gemini/rules.md`
- Claude Code: `ideas/<idea-name>/.clinerules`

# Git コミットメッセージ

```
<type>(<scope>): <subject>

例:
feat(alk): Add map pin feature
docs(readme): Update structure
```

**Type**: `feat`, `fix`, `docs`, `chore`, `refactor`
**Scope**: アイデア名 または `readme`, `workflow`

# 新しいアイデア作成ワークフロー

ユーザーが「新しいアイデアを作って」と言った場合、以下の手順に従う：

1.  **詳細を確認**:
    - ユーザーに**アイデア名**を尋ねる（短く、英数字、kebab-case推奨）
    - **アイデアの概要**を尋ねる
    - **使用する技術**を尋ねる（例: シンプルなHTML/JS、Next.js、Flutterなど）

2.  **ディレクトリ作成**:
    - 新しいディレクトリを作成: `ideas/<idea-name>`

3.  **プロジェクト初期化**:
    - ユーザーが**シンプルなHTML/JS**を選択した場合:
        - `ideas/<idea-name>/` に `index.html`、`style.css`、`script.js` を作成
        - 基本的なボイラープレートコードを追加
    - ユーザーが**フレームワーク**を選択した場合（例: Next.js、Vite、Flutter）:
        - `ideas/` 内で適切な初期化コマンドを実行
        - *注意: 正しいディレクトリにいることを確認すること*

4.  **ドキュメント作成**:
    - `ideas/<idea-name>/README.md` を作成
    - 以下の内容を含める:
        - `# <アイデア名>`
        - 概要
        - 機能リスト
        - 技術スタック
        - 実行方法（必要に応じて）

5.  **ユーザーに通知**:
    - アイデアプロジェクトがセットアップされ、開発準備が整ったことをユーザーに通知する

# 新しいアイデア作成ワークフロー

ユーザーが「新しいアイデアを作って」と言った場合、以下の手順に従う：

1. **詳細を確認**:
   - アイデア名を尋ねる（kebab-case推奨）
   - アイデアの概要を尋ねる
   - 使用する技術を尋ねる（例: Flutter, Next.js, Vite, シンプルなHTML/JS）

2. **ディレクトリ作成**:
   - `ideas/<idea-name>` を作成

3. **プロジェクト初期化**:
   - シンプルなHTML/JSの場合: `index.html`, `style.css`, `script.js` を作成
   - フレームワークの場合: 適切な初期化コマンドを実行

4. **ドキュメント作成**:
   - `ideas/<idea-name>/README.md` を作成
   - 概要、機能、技術スタックを記載

5. **完了通知**:
   - セットアップ完了をユーザーに通知

