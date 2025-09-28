#!/bin/bash
# 🚢 해기사 세미나 자동화 시스템 설치 스크립트

echo "🚢 해기사 세미나 자동화 시스템 설치를 시작합니다..."
echo "================================================="

# Docker 확인
echo "🔍 Docker 환경을 확인하는 중..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker가 설치되지 않았습니다."
    echo "📥 Docker Desktop 다운로드: https://www.docker.com/products/docker-desktop"
    echo "설치 후 다시 실행해주세요."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose가 설치되지 않았습니다."
    echo "Docker Desktop과 함께 설치됩니다."
    exit 1
fi

# Docker 실행 상태 확인
if ! docker info &> /dev/null; then
    echo "❌ Docker가 실행되지 않았습니다."
    echo "🔧 Docker Desktop을 시작해주세요."
    exit 1
fi

echo "✅ Docker 환경 확인 완료"

# 환경설정
echo ""
echo "📧 메일 설정을 입력해주세요:"
echo "💡 Gmail 앱 패스워드 생성 방법:"
echo "   1. Gmail → 계정 관리 → 보안"
echo "   2. 2단계 인증 활성화"
echo "   3. 앱 패스워드 생성 (16자리)"
echo ""

read -p "📧 메일을 받을 이메일 주소: " EMAIL
read -p "📨 발송용 Gmail 주소: " GMAIL
echo -n "🔑 Gmail 앱 패스워드 (16자리, 입력 시 보이지 않음): "
read -s PASSWORD
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