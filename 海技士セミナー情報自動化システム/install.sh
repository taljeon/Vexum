#!/bin/bash
# 🚢 海技士セミナー情報システム インストールスクリプト

echo "🚢 海技士セミナー情報システムをインストール中..."
echo "================================================="

# Docker確認
if ! command -v docker &> /dev/null; then
    echo "❌ Dockerが見つかりません。まずDockerをインストールしてください。"
    echo "📥 https://docs.docker.com/get-docker/"
    exit 1
fi

# Docker Compose確認
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Composeが見つかりません。まずDocker Composeをインストールしてください。"
    exit 1
fi

echo "✅ Docker環境確認完了"

# 環境設定
echo ""
echo "📧 メール設定を入力してください："
read -p "受信者メールアドレス: " EMAIL
read -p "送信用Gmailアドレス: " GMAIL
read -s -p "Gmailアプリパスワード (16桁): " PASSWORD
echo ""

# .envファイル生成
cat > .env << EOF
# 海技士セミナー情報システム 環境設定

# メール受信者
TEST_EMAIL=$EMAIL

# Gmail SMTP設定
SMTP_USERNAME=$GMAIL
SMTP_PASSWORD=$PASSWORD
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
FROM_EMAIL=$GMAIL

# 運用モード設定
DRY_RUN=false
EOF

echo "✅ 環境設定ファイル(.env)を作成しました"

# システム開始
echo ""
echo "🚀 システムを開始中..."
docker-compose -f docker-compose.production.yml up -d

echo ""
echo "🎉 インストール完了！"
echo "================================================="
echo "📅 毎日午前9時(JST)に自動実行されます"
echo ""
echo "🔧 管理コマンド:"
echo "  テスト実行: ./test.sh"
echo "  システム停止: ./stop.sh"
echo "  ログ確認: ./logs.sh"
echo "  システム再起動: ./restart.sh"
echo ""
echo "💌 今すぐテストメールを送信しますか？ (y/n)"
read -p "> " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📤 テストメール送信中..."
    docker-compose -f docker-compose.production.yml exec seminar-automation python seminar_scheduler.py --production
    echo "✅ テストメール送信完了！メールボックスを確認してください。"
fi

echo ""
echo "🎊 海技士セミナー情報システムの準備が完了しました！"