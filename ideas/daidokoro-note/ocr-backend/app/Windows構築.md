1. WSL2 セットアップ
  # PowerShell (管理者権限)
  wsl --install -d Ubuntu-22.04
  # 再起動後、ユーザー名・パスワード設定
  ---
  2. WSL2内: 基本環境
  # パッケージ更新
  sudo apt update && sudo apt upgrade -y
  # 必要なツール
  sudo apt install -y git curl wget build-essential
  # ディレクトリ作成
  mkdir -p ~/develop/idea-lab
  cd ~/develop/idea-lab
  git clone https://github.com/YOUR_USER/idea-lab.git idea-lab
  ---
  3. WSL2内: CUDA セットアップ
  # NVIDIA CUDA (WSL2用)
  wget https://developer.download.nvidia.com/compute/cuda/repos/wsl-ubuntu/x86_64/cuda-keyring_1.1-1_all.deb
  sudo dpkg -i cuda-keyring_1.1-1_all.deb
  sudo apt update
  sudo apt install -y cuda-toolkit-12-4
  # 確認
  nvidia-smi
  ---
  4. WSL2内: Python + OCRバックエンド
  # Python 3.11
  sudo apt install -y python3.11 python3.11-venv python3.11-dev
  # OCRバックエンド
  cd ~/develop/idea-lab/idea-lab/ideas/daidokoro-note/ocr-backend
  python3.11 -m venv venv
  source venv/bin/activate
  pip install --upgrade pip
  pip install -r requirements.txt
  # GPU確認
  python -c "import paddle; print('GPU:', paddle.device.is_compiled_with_cuda())"
  ---
  5. WSL2内: Ollama セットアップ
  # インストール
  curl -fsSL https://ollama.com/install.sh | sh
  # モデルダウンロード (時間かかる)
  ollama pull qwen2.5:32b
  # 確認
  ollama list
  ---
  6. WSL2内: GitHub Actions Runner
  # runnerディレクトリ
  mkdir -p ~/actions-runner && cd ~/actions-runner
  # ダウンロード (最新バージョンは GitHub で確認)
  curl -o actions-runner-linux-x64-2.321.0.tar.gz -L \
    https://github.com/actions/runner/releases/download/v2.321.0/actions-runner-linux-x64-2.321.0.tar.gz
  tar xzf ./actions-runner-linux-x64-2.321.0.tar.gz
  # 設定 (GitHubでトークン取得: Settings > Actions > Runners > New self-hosted runner)
  ./config.sh --url https://github.com/YOUR_USER/idea-lab --token YOUR_TOKEN
  # ラベルを聞かれたら: Linux (デフォルトでOK)
  # サービス化
  sudo ./svc.sh install
  sudo ./svc.sh start
  sudo ./svc.sh status
  ---
  7. WSL2内: サービス自動起動設定
  # systemdが有効か確認
  systemctl --version
  # /etc/wsl.conf を編集
  sudo tee /etc/wsl.conf << 'EOF'
  [boot]
  systemd=true
  EOF
  # Ollama用のsystemdサービス作成
  sudo tee /etc/systemd/system/ollama-api.service << 'EOF'
  [Unit]
  Description=Ollama API Server
  After=network.target
  [Service]
  Environment="OLLAMA_HOST=0.0.0.0"
  ExecStart=/usr/local/bin/ollama serve
  Restart=always
  User=YOUR_USER
  [Install]
  WantedBy=multi-user.target
  EOF
  # OCRバックエンド用
  sudo tee /etc/systemd/system/ocr-backend.service << 'EOF'
  [Unit]
  Description=OCR Backend API
  After=network.target ollama-api.service
  [Service]
  WorkingDirectory=/home/YOUR_USER/develop/idea-lab/idea-lab/ideas/daidokoro-note/ocr-backend
  ExecStart=/home/YOUR_USER/develop/idea-lab/idea-lab/ideas/daidokoro-note/ocr-backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
  Restart=always
  User=YOUR_USER
  Environment="PATH=/home/YOUR_USER/develop/idea-lab/idea-lab/ideas/daidokoro-note/ocr-backend/venv/bin"
  [Install]
  WantedBy=multi-user.target
  EOF
  # YOUR_USER を実際のユーザー名に置換してから:
  sudo systemctl daemon-reload
  sudo systemctl enable ollama-api ocr-backend
  sudo systemctl start ollama-api ocr-backend
  ---
  8. Mac mini側: Runnerにラベル追加
  Mac miniのrunnerに macOS ラベルを追加する必要があります:
  # Mac miniで
  cd ~/actions-runner  # runnerのディレクトリ
  ./config.sh remove   # 一度削除
  ./config.sh --url https://github.com/YOUR_USER/idea-lab --token NEW_TOKEN
  # ラベルを聞かれたら: self-hosted, macOS
  ---
  9. フロントエンドのAPI URL更新
  src/lib/ocr-api.ts をWindows PCのIPに変更:
  const OCR_API_URL = 'http://<WINDOWS-PC-IP>:8000';
  ---
  チェックリスト
  | 項目            | コマンド                                                                |
  |-----------------|-------------------------------------------------------------------------|
  | GPU認識         | nvidia-smi                                                              |
  | CUDA            | python -c "import paddle; print(paddle.device.is_compiled_with_cuda())" |
  | Ollama          | curl http://localhost:11434/api/tags                                    |
  | OCRバックエンド | curl http://localhost:8000/v1/health                                    |
  | Runner          | sudo systemctl status actions.runner.*