#!/bin/bash
# 📋 海技士セミナー情報システム ログ確認スクリプト

echo "📋 海技士セミナー情報システム ログ確認"
echo "================================================="

echo "🔍 リアルタイムログ表示中... (Ctrl+Cで終了)"
echo ""

docker-compose -f docker-compose.production.yml logs -f --tail=50 seminar-automation