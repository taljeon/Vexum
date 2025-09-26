#!/bin/bash
# 🧪 海技士セミナー情報システム テストスクリプト

echo "🧪 海技士セミナー情報システム テスト実行中..."
echo "================================================="

# システム状態確認
echo "📊 システム状態:"
docker-compose -f docker-compose.production.yml ps

echo ""
echo "📤 テストメール送信中..."
docker-compose -f docker-compose.production.yml exec seminar-automation python seminar_scheduler.py --production

echo ""
echo "✅ テスト完了！"
echo "📧 メールボックスを確認してください"
echo ""
echo "🔍 ログを確認するには:"
echo "  docker-compose -f docker-compose.production.yml logs seminar-automation"