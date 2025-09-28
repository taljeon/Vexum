#!/bin/bash
# 🚀 海技士セミナー情報システム 開始スクリプト

echo "🚀 海技士セミナー情報システムを開始中..."

# .envファイル確認
if [ ! -f ".env" ]; then
    echo "❌ .envファイルが見つかりません"
    echo "💡 .env.exampleをコピーして.envファイルを作成してください"
    echo "   cp .env.example .env"
    echo "   nano .env  # 設定を編集"
    exit 1
fi

# システム開始
docker-compose -f docker-compose.production.yml up -d

echo "✅ システム開始完了！"
echo ""
echo "🔍 状態確認:"
docker-compose -f docker-compose.production.yml ps

echo ""
echo "📋 管理コマンド:"
echo "  状態確認: docker-compose -f docker-compose.production.yml ps"
echo "  ログ確認: docker-compose -f docker-compose.production.yml logs -f"
echo "  テスト実行: docker-compose -f docker-compose.production.yml exec seminar-automation python seminar_scheduler.py --production"
echo "  システム停止: docker-compose -f docker-compose.production.yml down"