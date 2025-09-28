#!/bin/bash
# 🛑 海技士セミナー情報システム 停止スクリプト

echo "🛑 海技士セミナー情報システムを停止中..."

docker-compose -f docker-compose.production.yml down

echo "✅ システム停止完了！"
echo ""
echo "📋 システムを再開するには:"
echo "  ./start.sh を実行してください"