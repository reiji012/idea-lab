# syntax=docker/dockerfile:1

# CUDA 12.4 + cuDNN + Python 3.11 ベースイメージ (GPU対応)
FROM nvidia/cuda:12.4.1-cudnn-runtime-ubuntu22.04

WORKDIR /app

# Python 3.11 + システム依存パッケージ
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.11 \
    python3.11-venv \
    python3-pip \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && ln -sf /usr/bin/python3.11 /usr/bin/python \
    && ln -sf /usr/bin/python3.11 /usr/bin/python3

# pip アップグレード
RUN python -m pip install --upgrade pip

# PaddlePaddle GPU版を公式リポジトリからインストール (CUDA 12.x用)
RUN pip install --no-cache-dir paddlepaddle-gpu==3.0.0b1 -i https://www.paddlepaddle.org.cn/packages/stable/cu123/

# その他のPythonパッケージインストール
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# アプリケーションコード
COPY app ./app

# データディレクトリ作成
RUN mkdir -p /app/data/images

# 非rootユーザー
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:8000/v1/health', timeout=5)" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
