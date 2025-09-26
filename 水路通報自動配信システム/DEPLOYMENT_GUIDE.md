# 🌊 水路通報の地域別日次自動配信システム - 運用ガイド

## 📋 概要

水路通報の地域別日次自動配信システムは、日本の海上保安庁が発行する水路通報を自動収集し、地域別に配信するDockerベースのシステムです。

## 🚀 初回セットアップ

### 前提条件
- Docker Desktop がインストール済み
- 8080ポートが使用可能
- インターネット接続

### 1. システム起動

```bash
# プロジェクトディレクトリに移動
cd waterway_pkg

# コンテナビルド・起動
docker-compose up -d --build

# 起動確認
docker-compose ps
```

### 2. テストデータ初期化

```bash
# テストデータの投入
docker-compose exec waterway-system python setup_test_data.py --init-all

# データ確認
docker-compose exec waterway-system python setup_test_data.py --show-status
```

## 🧪 初回DRY-RUN実行

### 1. 全地域テスト実行

```bash
# 全地域でdry-run実行
docker-compose exec waterway-system python scheduler.py daily all --dry-run

# 東京地域のみテスト
docker-compose exec waterway-system python scheduler.py daily tokyo --dry-run

# 週次まとめテスト
docker-compose exec waterway-system python scheduler.py weekly all --dry-run
```

### 2. ログ確認

```bash
# リアルタイムログ確認
docker-compose logs -f waterway-system

# スケジューラーログのみ
docker-compose exec waterway-system tail -f /app/logs/scheduler.log

# 実行状況確認
docker-compose exec waterway-system cat /app/logs/execution_status.json
```

### 3. 出力データ確認

```bash
# データベース内容確認
docker-compose exec waterway-system sqlite3 /app/data/waterway_notices.db ".tables"

# 配信記録確認
docker-compose exec waterway-system python -c "
import sqlite3
conn = sqlite3.connect('/app/data/waterway_notices.db')
cursor = conn.cursor()
cursor.execute('SELECT * FROM delivery_logs ORDER BY created_at DESC LIMIT 10')
for row in cursor.fetchall():
    print(row)
conn.close()
"
```

## 🔧 本番配信への切替

### 1. SMTP認証設定

`.env`ファイルを編集:

```bash
# .envファイルの編集
docker-compose exec waterway-system nano /app/.env

# または、ローカルで編集後コンテナ再起動
# vim .env
# docker-compose restart
```

**SMTP設定例:**
```env
# Gmail使用の場合
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-account@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_NAME=水路通報配信システム
SMTP_FROM_EMAIL=your-account@gmail.com
```

### 2. Slack認証設定

```env
# SlackのWebhook URL
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/TOKEN
SLACK_CHANNEL=#waterway-notices
SLACK_USERNAME=水路通報Bot
SLACK_ICON_EMOJI=:ocean:
```

### 3. 本番モード切替

```env
# DRY_RUNをfalseに変更
DRY_RUN=false
```

### 4. システム再起動

```bash
# 設定を反映するため再起動
docker-compose restart

# 本番モードでのテスト実行
docker-compose exec waterway-system python scheduler.py daily tokyo

# 成功確認後、全地域実行
docker-compose exec waterway-system python scheduler.py daily all
```

## ⏰ スケジュール運用

### 自動スケジュール確認

```bash
# スケジューラー状況確認
docker-compose exec waterway-system python scheduler.py health

# 次回実行予定確認
docker-compose logs waterway-system | grep "スケジュール設定完了"
```

### デフォルトスケジュール
- **日次ジョブ**: 毎日 06:30 JST
- **週次まとめ**: 毎週金曜 09:30 JST
- **ヘルスチェック**: 毎時間

### スケジュール変更

`.env`ファイルで調整:
```env
DAILY_SCHEDULE_TIME=07:00
WEEKLY_SCHEDULE_DAY=saturday
WEEKLY_SCHEDULE_TIME=10:00
```

## 📊 監視・メンテナンス

### 1. システム状態確認

```bash
# コンテナ状態確認
docker-compose ps

# ヘルスチェック実行
docker-compose exec waterway-system python healthcheck.py

# リソース使用量確認
docker stats waterway-notices-system
```

### 2. ログローテーション

```bash
# ログサイズ確認
docker-compose exec waterway-system du -sh /app/logs/

# 古いログの削除（30日以上）
docker-compose exec waterway-system find /app/logs/ -name "*.log" -mtime +30 -delete
```

### 3. データベースバックアップ

```bash
# 手動バックアップ
docker-compose exec waterway-system cp /app/data/waterway_notices.db /app/backups/waterway_notices_$(date +%Y%m%d_%H%M%S).db

# バックアップ確認
docker-compose exec waterway-system ls -la /app/backups/
```

## 🔍 トラブルシューティング

### 1. 時刻ズレ問題

```bash
# コンテナ内時刻確認
docker-compose exec waterway-system date

# タイムゾーン確認
docker-compose exec waterway-system cat /etc/timezone

# 時刻同期（必要に応じて）
docker-compose restart
```

### 2. RSS取得失敗

```bash
# RSS取得テスト
docker-compose exec waterway-system python -c "
import requests
import feedparser

urls = [
    'https://www1.kaiho.mlit.go.jp/TUHO/rss/tokyo.rss',
    'https://www1.kaiho.mlit.go.jp/TUHO/rss/yokohama.rss'
]

for url in urls:
    try:
        response = requests.get(url, timeout=30)
        print(f'{url}: {response.status_code}')

        feed = feedparser.parse(url)
        print(f'エントリ数: {len(feed.entries)}')
    except Exception as e:
        print(f'{url}: エラー - {str(e)}')
"
```

### 3. メール配信失敗

```bash
# SMTP接続テスト
docker-compose exec waterway-system python -c "
import smtplib
import os

smtp_host = os.getenv('SMTP_HOST', 'smtp.gmail.com')
smtp_port = int(os.getenv('SMTP_PORT', '587'))
smtp_user = os.getenv('SMTP_USERNAME')
smtp_pass = os.getenv('SMTP_PASSWORD')

try:
    server = smtplib.SMTP(smtp_host, smtp_port)
    server.starttls()
    server.login(smtp_user, smtp_pass)
    server.quit()
    print('SMTP接続成功')
except Exception as e:
    print(f'SMTP接続エラー: {str(e)}')
"
```

### 4. 重複送信防止確認

```bash
# 重複チェック設定確認
docker-compose exec waterway-system python -c "
import os
print(f'重複チェック日数: {os.getenv(\"DUPLICATE_CHECK_DAYS\", \"7\")}')
print(f'類似度閾値: {os.getenv(\"CONTENT_SIMILARITY_THRESHOLD\", \"0.85\")}')
"

# 重複データ確認
docker-compose exec waterway-system python -c "
import sqlite3
conn = sqlite3.connect('/app/data/waterway_notices.db')
cursor = conn.cursor()
cursor.execute('SELECT region, COUNT(*) FROM waterway_notices GROUP BY region')
for row in cursor.fetchall():
    print(f'{row[0]}: {row[1]}件')
conn.close()
"
```

## 🚨 緊急時対応

### システム緊急停止

```bash
# 即座に全サービス停止
docker-compose down

# 強制停止（応答しない場合）
docker-compose kill
```

### 緊急時設定変更

```bash
# DRY_RUNモードに戻す（誤配信防止）
sed -i 's/DRY_RUN=false/DRY_RUN=true/' .env
docker-compose restart

# 特定地域のみに限定
sed -i 's/DEFAULT_REGIONS=all/DEFAULT_REGIONS=tokyo/' .env
docker-compose restart
```

### データ復旧

```bash
# バックアップからの復旧
docker-compose exec waterway-system cp /app/backups/waterway_notices_YYYYMMDD_HHMMSS.db /app/data/waterway_notices.db

# システム再起動
docker-compose restart
```

## 📞 サポート・問い合わせ

### ログ収集

問題報告時は以下の情報を添付してください:

```bash
# システム情報収集
docker-compose exec waterway-system python scheduler.py health > system_health.json

# 最新ログ取得
docker-compose logs --tail=100 waterway-system > latest_logs.txt

# 設定情報取得（パスワード部分は除く）
grep -v "PASSWORD\|TOKEN\|WEBHOOK" .env > current_config.txt
```

### 定期メンテナンス推奨項目

- **週次**: ログサイズ確認、ヘルスチェック実行
- **月次**: データベースバックアップ、設定見直し
- **四半期**: システム全体の性能評価、アップデート確認

このガイドに従って運用することで、水路通報自動配信システムを安定して運用できます。