#!/bin/bash
# 🔄 海技士セミナー情報システム 再起動スクリプト

echo "🔄 海技士セミナー情報システムを再起動中..."

# システム停止
echo "1/2 システム停止中..."
docker-compose -f docker-compose.production.yml down

# システム開始
echo "2/2 システム開始中..."
docker-compose -f docker-compose.production.yml up -d

echo "✅ 再起動完了！"
echo ""
echo "🔍 状態確認:"
docker-compose -f docker-compose.production.yml ps