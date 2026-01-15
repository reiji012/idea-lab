# Windows PC (RTX 5080) 構築手順

OCRバックエンドをWindowsネイティブで構築する手順。

---

## 1. ソフトウェアインストール

| ソフト | URL | 備考 |
|--------|-----|------|
| Python 3.11 | https://www.python.org/downloads/ | 「Add to PATH」にチェック |
| Git | https://git-scm.com/download/win | Git Bash含む |
| CUDA Toolkit 12.x | https://developer.nvidia.com/cuda-downloads | RTX 5080用 |
| Ollama | https://ollama.com/download/windows | インストーラー実行 |

インストール後、PowerShellで確認:
```powershell
python --version
git --version
nvidia-smi
ollama --version
```

---

## 2. リポジトリ取得

```powershell
mkdir C:\Users\YOUR_USER\develop\idea-lab
cd C:\Users\YOUR_USER\develop\idea-lab
git clone https://github.com/YOUR_USER/idea-lab.git idea-lab
```

---

## 3. OCRバックエンド セットアップ

```powershell
cd C:\Users\YOUR_USER\develop\idea-lab\idea-lab\ideas\daidokoro-note\ocr-backend

# 仮想環境作成
python -m venv venv
.\venv\Scripts\Activate.ps1

# パッケージインストール
pip install --upgrade pip
pip install -r requirements.txt

# GPU確認
python -c "import paddle; print('GPU:', paddle.device.is_compiled_with_cuda())"
# True が出ればOK
```

---

## 4. 環境変数設定

### .env ファイル作成

`ocr-backend\.env`:
```
API_TOKEN=your-secure-token
OLLAMA_MODEL=qwen2.5:32b
LLM_TIMEOUT=180
OCR_USE_GPU=true
```

### システム環境変数（外部アクセス許可用）

1. 「システム環境変数の編集」を開く
2. 「環境変数」→「システム環境変数」→「新規」
3. 変数名: `OLLAMA_HOST` / 値: `0.0.0.0`

---

## 5. Ollamaモデル取得

```powershell
# 推奨モデル (16GB VRAM用)
ollama pull qwen2.5:32b

# 確認
ollama list
```

---

## 6. ファイアウォール許可

管理者PowerShellで:
```powershell
netsh advfirewall firewall add rule name="OCR Backend" dir=in action=allow protocol=tcp localport=8000
netsh advfirewall firewall add rule name="Ollama" dir=in action=allow protocol=tcp localport=11434
```

---

## 7. GitHub Actions Runner

```powershell
mkdir C:\actions-runner
cd C:\actions-runner

# ダウンロード・展開
Invoke-WebRequest -Uri https://github.com/actions/runner/releases/download/v2.321.0/actions-runner-win-x64-2.321.0.zip -OutFile runner.zip
Expand-Archive -Path runner.zip -DestinationPath .

# 設定（トークンはGitHub Settings > Actions > Runners で取得）
.\config.cmd --url https://github.com/YOUR_USER/idea-lab --token YOUR_TOKEN
# ラベル聞かれたら: self-hosted, Windows

# サービス化
.\svc.cmd install
.\svc.cmd start
.\svc.cmd status
```

---

## 8. 自動起動設定

### Ollama
インストーラーが自動設定済み。

### OCRバックエンド

1. バッチファイル作成 `C:\scripts\start-ocr.bat`:
```batch
@echo off
cd C:\Users\YOUR_USER\develop\idea-lab\idea-lab\ideas\daidokoro-note\ocr-backend
call venv\Scripts\activate.bat
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

2. タスクスケジューラで登録:
   - 「基本タスクの作成」
   - トリガー: 「ログオン時」
   - 操作: 「プログラムの開始」→ `C:\scripts\start-ocr.bat`
   - 「最上位の特権で実行する」にチェック

---

## 9. Mac mini側: Runnerにラベル追加

```bash
cd ~/actions-runner
./svc.sh stop
./config.sh remove
./config.sh --url https://github.com/YOUR_USER/idea-lab --token NEW_TOKEN
# ラベル: self-hosted, macOS
./svc.sh start
```

---

## 10. フロントエンドのAPI URL更新

`src/lib/ocr-api.ts`:
```typescript
const OCR_API_URL = 'http://<WINDOWS-PC-IP>:8000';
```

---

## チェックリスト

| 項目 | コマンド |
|------|----------|
| GPU認識 | `nvidia-smi` |
| CUDA | `python -c "import paddle; print(paddle.device.is_compiled_with_cuda())"` |
| Ollama | `curl http://localhost:11434/api/tags` |
| OCRバックエンド | `curl http://localhost:8000/v1/health` |
| Runner | `Get-Service actions.runner.*` |
| LAN内アクセス | `curl http://<WINDOWS-PC-IP>:8000/v1/health` |

---

## トラブルシューティング

### PaddlePaddle GPU版がインストールできない
```powershell
# CUDA 12.x用
pip install paddlepaddle-gpu==3.0.0b1 -f https://www.paddlepaddle.org.cn/whl/windows/mkl/avx/stable.html
```

### Ollamaに外部からアクセスできない
- システム環境変数 `OLLAMA_HOST=0.0.0.0` を確認
- Ollamaを再起動
- ファイアウォール設定を確認

### OCRバックエンドが起動しない
```powershell
# ログ確認
cd ocr-backend
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --host 0.0.0.0 --port 8000 --log-level debug
```
