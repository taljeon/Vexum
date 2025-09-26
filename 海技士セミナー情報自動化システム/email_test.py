#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import sqlite3
import logging
import smtplib
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.header import Header
import pytz

# 로그 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# 일본 표준시 설정
JST = pytz.timezone('Asia/Tokyo')

class EmailTester:
    def __init__(self):
        # 메일 설정 (환경변수에서 읽기)
        self.smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        self.smtp_port = int(os.getenv('SMTP_PORT', '587'))
        self.smtp_username = os.getenv('SMTP_USERNAME', '')
        self.smtp_password = os.getenv('SMTP_PASSWORD', '')
        self.from_email = os.getenv('FROM_EMAIL', self.smtp_username)
        self.test_email = os.getenv('TEST_EMAIL', '')

        if not self.test_email:
            logger.error("TEST_EMAIL 환경변수가 설정되지 않았습니다")
            sys.exit(1)

        if not self.smtp_username or not self.smtp_password:
            logger.error("SMTP_USERNAME과 SMTP_PASSWORD 환경변수가 설정되지 않았습니다")
            sys.exit(1)

    def create_sample_seminar_data(self):
        """샘플 세미나 데이터 생성 - 2025年実際のセミナー情報に基づく"""
        current_time = datetime.now(JST)
        return [
            {
                'title': 'めざせ！海技者セミナー IN TOKYO 2025',
                'event_date': '2025年6月9日（月）',
                'location': '東京都江東区',
                'status': '参加者募集中',
                'region': '関東運輸局',
                'source_url': 'https://c2sea.go.jp/learning/study/entry-556.html',
                'summary': '関東運輸局主催の海技者セミナーです。海運事業者91社が参加予定で、企業説明会と就職面接を同時開催します。'
            },
            {
                'title': 'めざせ！海技者セミナー IN KOBE 2025',
                'event_date': '2025年2月9日（日） 9:30-15:00',
                'location': '神戸国際展示場 第3号館',
                'status': '開催終了',
                'region': '神戸運輸監理部',
                'source_url': 'https://wwwtb.mlit.go.jp/kobe/kaigisya_seminar2024.html',
                'summary': '神戸運輸監理部主催。91社の海運事業者が参加し、船員志望者と海運事業者のマッチング支援を実施しました。'
            },
            {
                'title': 'めざせ！海技者セミナー in 静岡 2024',
                'event_date': '2024年12月14日（土） 12:00-16:30',
                'location': '清水マリンターミナル',
                'status': '開催終了',
                'region': '中部運輸局',
                'source_url': 'https://c2sea.go.jp/learning/study/entry-556.html',
                'summary': '中部運輸局主催。50社の海運事業者が参加し、企業説明会と就職相談を実施しました。'
            }
        ]

    def format_email_content(self, seminars):
        """メール本文を作成"""
        current_time = datetime.now(JST)

        subject = f"【海技士セミナー情報】新着情報 {len(seminars)}件 - {current_time.strftime('%Y年%m月%d日')}"

        # HTML形式のメール本文
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {{ font-family: 'Hiragino Sans', 'Yu Gothic', 'Meiryo', sans-serif; line-height: 1.6; }}
        .header {{ background-color: #2c5aa0; color: white; padding: 20px; text-align: center; }}
        .content {{ padding: 20px; }}
        .seminar {{ border: 1px solid #ddd; margin: 15px 0; padding: 15px; border-radius: 5px; }}
        .seminar h3 {{ color: #2c5aa0; margin-top: 0; }}
        .info {{ background-color: #f8f9fa; padding: 10px; margin: 10px 0; border-radius: 3px; }}
        .status {{ font-weight: bold; color: #dc3545; }}
        .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>🚢 海技士セミナー情報自動通知システム</h1>
        <p>収集日時: {current_time.strftime('%Y年%m月%d日 %H時%M分')}</p>
    </div>

    <div class="content">
        <h2>📢 新着セミナー情報 ({len(seminars)}件)</h2>
        <p>地方運輸局のWebサイトから最新のセミナー情報をお届けします。</p>
"""

        for i, seminar in enumerate(seminars, 1):
            html_content += f"""
        <div class="seminar">
            <h3>{i}. {seminar['title']}</h3>
            <div class="info">
                <strong>📅 開催予定日:</strong> {seminar['event_date']}<br>
                <strong>📍 開催場所:</strong> {seminar['location']}<br>
                <strong>🏛️ 主催:</strong> {seminar['region']}<br>
                <strong>📊 募集状況:</strong> <span class="status">{seminar['status']}</span><br>
                <strong>🔗 詳細URL:</strong> <a href="{seminar['source_url']}" target="_blank">{seminar['source_url']}</a>
            </div>
            <p><strong>概要:</strong> {seminar['summary']}</p>
        </div>
"""

        html_content += f"""
    </div>

    <div class="footer">
        <hr>
        <p>このメールは海技士セミナー情報自動化システムから送信されています。</p>
        <p>システム運用者: 海技士セミナー自動化システム</p>
        <p>送信時刻: {current_time.strftime('%Y年%m月%d日 %H時%M分%S秒 JST')}</p>

        <h3>📊 システム稼働統計</h3>
        <p>総収集件数: {len(seminars)*3}件 | 新着重要セミナー: {len(seminars)}件 | 通知成功: 1件</p>

        <h3>🔍 収集対象地域</h3>
        <p>関東運輸局, 近畿運輸局, 中部運輸局, 九州運輸局, 東北運輸局, 北海道運輸局, 中国運輸局, 四国運輸局, 沖縄総合事務局</p>
    </div>
</body>
</html>
"""

        return subject, html_content

    def send_test_email(self, seminars):
        """テストメール送信"""
        try:
            subject, html_content = self.format_email_content(seminars)

            # メールメッセージ作成
            msg = MIMEMultipart('alternative')
            msg['Subject'] = Header(subject, 'utf-8')
            msg['From'] = self.from_email
            msg['To'] = self.test_email

            # HTML部分を添付
            html_part = MIMEText(html_content, 'html', 'utf-8')
            msg.attach(html_part)

            # SMTP接続してメール送信
            logger.info(f"メール送信開始: {self.test_email}")
            logger.info(f"SMTP設定: {self.smtp_server}:{self.smtp_port}")

            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)

            logger.info(f"✅ メール送信成功: {subject}")
            return True

        except Exception as e:
            logger.error(f"❌ メール送信失敗: {str(e)}")
            return False

    def run_test(self):
        """テスト実行"""
        logger.info("🚀 海技士セミナー情報メール送信テスト開始")
        logger.info(f"送信先: {self.test_email}")

        # サンプルデータ作成
        sample_seminars = self.create_sample_seminar_data()
        logger.info(f"📋 サンプルセミナー情報作成: {len(sample_seminars)}件")

        # メール送信テスト
        success = self.send_test_email(sample_seminars)

        if success:
            logger.info("✅ テスト完了: メール送信に成功しました")
            logger.info("📧 受信BOXを確認してください")
        else:
            logger.error("❌ テスト失敗: メール送信でエラーが発生しました")

def main():
    """メイン関数"""
    print("=" * 60)
    print("🚢 海技士セミナー情報 メール送信テスト")
    print("=" * 60)

    # 環境変数チェック
    required_vars = ['TEST_EMAIL', 'SMTP_USERNAME', 'SMTP_PASSWORD']
    missing_vars = [var for var in required_vars if not os.getenv(var)]

    if missing_vars:
        print(f"❌ 必要な環境変数が設定されていません: {', '.join(missing_vars)}")
        print("\n設定例:")
        print("export TEST_EMAIL='your-email@example.com'")
        print("export SMTP_USERNAME='your-gmail@gmail.com'")
        print("export SMTP_PASSWORD='your-app-password'")
        print("export SMTP_SERVER='smtp.gmail.com'")
        print("export SMTP_PORT='587'")
        sys.exit(1)

    tester = EmailTester()
    tester.run_test()

if __name__ == '__main__':
    main()