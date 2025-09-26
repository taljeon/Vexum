#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
水路通報自動配信システム - 簡単メールテスト
"""

import os
import sys
import smtplib
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# .env 파일 로드
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    # .env 파일을 수동으로 파싱
    if os.path.exists('.env'):
        with open('.env', 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key.strip()] = value.strip()

def test_email():
    print("🌊 水路通報自動配信システム - 簡単メールテスト")
    print("=" * 50)

    # 環境変数確認
    smtp_host = os.getenv('SMTP_HOST', 'smtp.gmail.com')
    smtp_port = int(os.getenv('SMTP_PORT', '587'))
    smtp_username = os.getenv('SMTP_USERNAME', '')
    smtp_password = os.getenv('SMTP_PASSWORD', '')
    smtp_from_name = os.getenv('SMTP_FROM_NAME', '水路通報配信システム')
    smtp_from_email = os.getenv('SMTP_FROM_EMAIL', smtp_username)
    dry_run = os.getenv('DRY_RUN', 'true').lower() == 'true'

    print(f"SMTP設定:")
    print(f"  サーバー: {smtp_host}:{smtp_port}")
    print(f"  ユーザー: {smtp_username}")
    print(f"  送信者名: {smtp_from_name}")
    print(f"  DRY-RUNモード: {dry_run}")
    print()

    # 基本検証
    if not smtp_username or not smtp_password:
        print("❌ SMTP_USERNAMEまたはSMTP_PASSWORDが設定されていません")
        print("💡 .envファイルで設定してください:")
        print("   SMTP_USERNAME=your-email@gmail.com")
        print("   SMTP_PASSWORD=your-app-password")
        return False

    if dry_run:
        print("⚠️  DRY-RUNモード: 実際の送信は行いません")
        print("✅ 設定は正常です")
        return True

    # SMTP接続テスト
    print("🔌 SMTP接続テスト中...")
    try:
        server = smtplib.SMTP(smtp_host, smtp_port)
        server.starttls()
        server.login(smtp_username, smtp_password)
        server.quit()
        print("✅ SMTP接続成功")
    except Exception as e:
        print(f"❌ SMTP接続失敗: {str(e)}")
        print("💡 以下を確認してください:")
        print("   1. Gmailの2段階認証が有効か")
        print("   2. アプリパスワードが正しく設定されているか")
        print("   3. ネットワーク接続に問題がないか")
        return False

    # テストメール送信
    print("📧 テストメール送信中...")
    try:
        msg = MIMEMultipart()
        msg['From'] = f"{smtp_from_name} <{smtp_from_email}>"
        msg['To'] = smtp_username
        msg['Subject'] = "【テスト】水路通報自動配信システム動作確認"

        body = f"""
水路通報自動配信システムのテストメールです。

実行時刻: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
システム: Docker環境
状態: 正常動作中

このメールが受信できていれば、システムは正常に動作しています。

---
水路通報自動配信システム
        """

        msg.attach(MIMEText(body, 'plain', 'utf-8'))

        server = smtplib.SMTP(smtp_host, smtp_port)
        server.starttls()
        server.login(smtp_username, smtp_password)
        server.send_message(msg)
        server.quit()

        print("✅ テストメール送信成功")
        print(f"📬 {smtp_username} にメールを送信しました")
        return True

    except Exception as e:
        print(f"❌ メール送信失敗: {str(e)}")
        return False

if __name__ == "__main__":
    success = test_email()
    sys.exit(0 if success else 1)