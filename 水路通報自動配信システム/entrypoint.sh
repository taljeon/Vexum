#!/bin/bash
set -e

echo "=== 水路通報自動配信システム 起動 ==="

# 環境変数の確認
echo "環境設定確認:"
echo "  - タイムゾーン: ${TZ:-Asia/Tokyo}"
echo "  - DRY_RUNモード: ${DRY_RUN:-true}"
echo "  - ログレベル: ${LOG_LEVEL:-INFO}"

# 必要ディレクトリの作成
mkdir -p /app/data /app/logs /app/backups /app/temp
chmod 755 /app/data /app/logs /app/backups /app/temp

# データベース初期化（必要な場合）
if [ ! -f "/app/data/waterway_notices.db" ]; then
    echo "データベースを初期化中..."
    python setup_test_data.py --init-db
fi

# 実行モード判定
case "${1:-scheduler}" in
    "scheduler")
        echo "スケジューラーモードで開始します"
        exec python scheduler.py
        ;;
    "daily")
        echo "日次ジョブを実行します"
        exec python scheduler.py daily all --dry-run
        ;;
    "weekly")
        echo "週次ジョブを実行します"
        exec python scheduler.py weekly all --dry-run
        ;;
    "test")
        echo "テストモードで実行します"
        exec python scheduler.py test
        ;;
    "bash")
        echo "シェルモードで開始します"
        exec /bin/bash
        ;;
    *)
        echo "不明なコマンド: $1"
        echo "利用可能なコマンド: scheduler, daily, weekly, test, bash"
        exit 1
        ;;
esac