#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
水路通報自動配信システム - 実際メールテスト設定
"""

import os
import sys
import smtplib
import sqlite3
from datetime import datetime, timezone
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
import json

class EmailTestManager:
    def __init__(self):
        self.config = self.load_config()
        self.test_results = {}

    def load_config(self):
        """環境変数から設定を読み込み"""
        return {
            'smtp_host': os.getenv('SMTP_HOST', 'smtp.gmail.com'),
            'smtp_port': int(os.getenv('SMTP_PORT', '587')),
            'smtp_username': os.getenv('SMTP_USERNAME'),
            'smtp_password': os.getenv('SMTP_PASSWORD'),
            'smtp_from_name': os.getenv('SMTP_FROM_NAME', '水路通報配信システム'),
            'smtp_from_email': os.getenv('SMTP_FROM_EMAIL'),
            'dry_run': os.getenv('DRY_RUN', 'true').lower() == 'true'
        }

    def validate_config(self):
        """メール設定の検証"""
        print("📧 メール設定検証中...")

        required_fields = ['smtp_username', 'smtp_password', 'smtp_from_email']
        missing_fields = []

        for field in required_fields:
            if not self.config.get(field):
                missing_fields.append(field)

        if missing_fields:
            print(f"❌ 必須設定が不足しています: {', '.join(missing_fields)}")
            return False

        print("✅ 基本設定OK")
        return True

    def test_smtp_connection(self):
        """SMTP接続テスト"""
        print(f"🔌 SMTP接続テスト ({self.config['smtp_host']}:{self.config['smtp_port']})...")

        try:
            server = smtplib.SMTP(self.config['smtp_host'], self.config['smtp_port'])
            server.starttls()
            server.login(self.config['smtp_username'], self.config['smtp_password'])
            server.quit()

            print("✅ SMTP接続成功")
            self.test_results['smtp_connection'] = 'success'
            return True

        except Exception as e:
            print(f"❌ SMTP接続失敗: {str(e)}")
            self.test_results['smtp_connection'] = f'failed: {str(e)}'
            return False

    def send_test_email(self, test_recipient=None):
        """テストメール送信"""
        if not test_recipient:
            test_recipient = self.config['smtp_username']

        print(f"📧 テストメール送信中... (宛先: {test_recipient})")

        if self.config['dry_run']:
            print("⚠️  DRY-RUNモード: 実際の送信は行いません")
            self.test_results['test_email'] = 'dry_run_mode'
            return True

        try:
            # メール作成
            msg = MIMEMultipart('alternative')
            msg['From'] = f"{self.config['smtp_from_name']} <{self.config['smtp_from_email']}>"
            msg['To'] = test_recipient
            msg['Subject'] = "【テスト】水路通報自動配信システム - 動作確認"

            # HTMLメール本文
            html_body = f"""
            <html>
            <head><meta charset="utf-8"></head>
            <body>
                <h2>🌊 水路通報自動配信システム - テストメール</h2>

                <p>このメールは水路通報自動配信システムの動作確認用テストメールです。</p>

                <h3>📊 テスト実行情報</h3>
                <table border="1" style="border-collapse: collapse;">
                    <tr><td><strong>実行日時</strong></td><td>{datetime.now().strftime('%Y-%m-%d %H:%M:%S JST')}</td></tr>
                    <tr><td><strong>SMTPサーバー</strong></td><td>{self.config['smtp_host']}:{self.config['smtp_port']}</td></tr>
                    <tr><td><strong>送信者</strong></td><td>{self.config['smtp_from_email']}</td></tr>
                    <tr><td><strong>受信者</strong></td><td>{test_recipient}</td></tr>
                </table>

                <h3>🧪 次のステップ</h3>
                <ol>
                    <li>このメールが正常に受信できていることを確認</li>
                    <li><code>DRY_RUN=false</code> に設定して本番モードに切り替え</li>
                    <li>実際の水路通報配信テストを実行</li>
                </ol>

                <hr>
                <p><small>水路通報自動配信システム v1.0</small></p>
            </body>
            </html>
            """

            # テキスト版
            text_body = f"""
水路通報自動配信システム - テストメール

このメールは水路通報自動配信システムの動作確認用テストメールです。

テスト実行情報:
- 実行日時: {datetime.now().strftime('%Y-%m-%d %H:%M:%S JST')}
- SMTPサーバー: {self.config['smtp_host']}:{self.config['smtp_port']}
- 送信者: {self.config['smtp_from_email']}
- 受信者: {test_recipient}

次のステップ:
1. このメールが正常に受信できていることを確認
2. DRY_RUN=false に設定して本番モードに切り替え
3. 実際の水路通報配信テストを実行

---
水路通報自動配信システム v1.0
            """

            # メール本文を追加
            part1 = MIMEText(text_body, 'plain', 'utf-8')
            part2 = MIMEText(html_body, 'html', 'utf-8')

            msg.attach(part1)
            msg.attach(part2)

            # SMTP送信
            server = smtplib.SMTP(self.config['smtp_host'], self.config['smtp_port'])
            server.starttls()
            server.login(self.config['smtp_username'], self.config['smtp_password'])
            server.send_message(msg)
            server.quit()

            print("✅ テストメール送信成功")
            self.test_results['test_email'] = 'success'
            return True

        except Exception as e:
            print(f"❌ テストメール送信失敗: {str(e)}")
            self.test_results['test_email'] = f'failed: {str(e)}'
            return False

    def create_test_database(self):
        """テスト用データベース作成"""
        print("🗃️  テスト用データベース作成中...")

        try:
            db_path = '/app/data/waterway_notices.db'
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()

            # テーブル作成
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS waterway_notices (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    region TEXT NOT NULL,
                    title TEXT NOT NULL,
                    content TEXT,
                    published_date TEXT,
                    url TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')

            cursor.execute('''
                CREATE TABLE IF NOT EXISTS delivery_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    region TEXT NOT NULL,
                    delivery_type TEXT NOT NULL,
                    status TEXT NOT NULL,
                    message TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')

            # テストデータ挿入
            test_notices = [
                ('tokyo', '【テスト】東京湾航行制限', 'テスト用の水路通報データです。', '2024-01-20 10:00:00', 'https://example.com/tokyo1'),
                ('yokohama', '【テスト】横浜港工事情報', 'テスト用の工事情報です。', '2024-01-20 11:00:00', 'https://example.com/yokohama1'),
                ('osaka', '【テスト】大阪湾気象警報', 'テスト用の気象情報です。', '2024-01-20 12:00:00', 'https://example.com/osaka1')
            ]

            cursor.executemany('''
                INSERT INTO waterway_notices (region, title, content, published_date, url)
                VALUES (?, ?, ?, ?, ?)
            ''', test_notices)

            conn.commit()
            conn.close()

            print("✅ テストデータベース作成完了")
            self.test_results['test_database'] = 'success'
            return True

        except Exception as e:
            print(f"❌ データベース作成失敗: {str(e)}")
            self.test_results['test_database'] = f'failed: {str(e)}'
            return False

    def generate_test_report(self):
        """テスト結果レポート生成"""
        report = {
            'timestamp': datetime.now().isoformat(),
            'config': {
                'smtp_host': self.config['smtp_host'],
                'smtp_port': self.config['smtp_port'],
                'smtp_username': self.config['smtp_username'],
                'dry_run_mode': self.config['dry_run']
            },
            'test_results': self.test_results,
            'overall_status': 'success' if all(
                'success' in str(result) or 'dry_run_mode' in str(result)
                for result in self.test_results.values()
            ) else 'failed'
        }

        return report

def main():
    """メインテスト実行"""
    print("🌊 水路通報自動配信システム - メール設定テスト")
    print("=" * 50)

    test_manager = EmailTestManager()

    # 設定検証
    if not test_manager.validate_config():
        print("\n❌ 設定エラーのため終了します")
        print("\n💡 以下を確認してください:")
        print("1. .env ファイルが存在するか")
        print("2. SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM_EMAIL が設定されているか")
        print("3. Gmail の場合、2段階認証とアプリパスワードが設定されているか")
        sys.exit(1)

    # SMTP接続テスト
    smtp_ok = test_manager.test_smtp_connection()

    # データベーステスト
    db_ok = test_manager.create_test_database()

    # テストメール送信
    if smtp_ok:
        email_ok = test_manager.send_test_email()
    else:
        print("⏭️  SMTP接続失敗のためメールテストをスキップします")
        email_ok = False

    # テスト結果出力
    print("\n📊 テスト結果レポート")
    print("=" * 30)

    report = test_manager.generate_test_report()
    print(json.dumps(report, ensure_ascii=False, indent=2))

    # 次のステップ案内
    print("\n🎯 次のステップ:")
    if report['overall_status'] == 'success':
        print("✅ すべてのテストが成功しました！")
        if test_manager.config['dry_run']:
            print("💡 本番配信を行う場合は以下を実行:")
            print("   1. DRY_RUN=false に設定")
            print("   2. docker-compose restart")
            print("   3. python scheduler.py daily tokyo (単一地域テスト)")
            print("   4. python scheduler.py daily all (全地域実行)")
        else:
            print("💡 本番モードでの配信テストが可能です:")
            print("   python scheduler.py daily tokyo --dry-run")
    else:
        print("❌ 一部のテストが失敗しました")
        print("💡 エラー内容を確認して設定を修正してください")

    sys.exit(0 if report['overall_status'] == 'success' else 1)

if __name__ == "__main__":
    main()