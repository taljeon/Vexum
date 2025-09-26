# 水路通報の地域別日次自動配信システム - Dockerfile
FROM python:3.11-slim

# メンテナンス情報
LABEL maintainer="waterway-system@example.com"
LABEL description="水路通報の地域別日次自動配信システム"
LABEL version="1.0.0"

# 作業ディレクトリ設定
WORKDIR /app

# システムパッケージのインストール
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    sqlite3 \
    cron \
    tzdata \
    && rm -rf /var/lib/apt/lists/*

# タイムゾーン設定
ENV TZ=Asia/Tokyo
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Pythonの環境変数
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app
ENV PIP_NO_CACHE_DIR=1

# 依存関係ファイルをコピー
COPY requirements.txt .

# Pythonパッケージのインストール
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# アプリケーションファイルをコピー
COPY waterway_notice_system.py .
COPY scheduler.py .
COPY setup_test_data.py .
COPY vessels.csv .
COPY routing.csv .
COPY config/ ./config/

# 必要なディレクトリを作成
RUN mkdir -p /app/data /app/logs /app/backups /app/temp

# 実行権限を付与
RUN chmod +x scheduler.py waterway_notice_system.py setup_test_data.py

# ヘルスチェック用のエンドポイント作成
COPY healthcheck.py .
RUN chmod +x healthcheck.py

# 非rootユーザーの作成
RUN groupadd -r waterway && useradd -r -g waterway -d /app -s /bin/bash waterway

# ファイル権限の設定
RUN chown -R waterway:waterway /app

# ユーザー切り替え
USER waterway

# ヘルスチェック設定
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python healthcheck.py

# ポート公開
EXPOSE 8080

# エントリーポイントスクリプト作成
COPY --chown=waterway:waterway entrypoint.sh /app/
RUN chmod +x /app/entrypoint.sh

# デフォルト実行コマンド
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["scheduler"]