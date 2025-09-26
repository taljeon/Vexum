# 🌊 水路通報自動配信システム - コマンド一覧 & 切替チェックリスト

## 📋 実行コマンド一覧

### 基本システム操作

```bash
# システム起動
docker-compose up -d --build

# システム停止
docker-compose down

# システム再起動
docker-compose restart

# 状態確認
docker-compose ps
docker-compose logs -f
```

### 初期設定コマンド

```bash
# テストデータ初期化
docker-compose exec waterway-system python setup_test_data.py --init-all

# データベース初期化のみ
docker-compose exec waterway-system python setup_test_data.py --init-db

# vessels.csv投入
docker-compose exec waterway-system python setup_test_data.py --load-vessels

# routing.csv投入
docker-compose exec waterway-system python setup_test_data.py --load-routing

# データ確認
docker-compose exec waterway-system python setup_test_data.py --show-status
```

### DRY-RUN実行コマンド

```bash
# 全地域 日次ジョブ (DRY-RUN)
docker-compose exec waterway-system python scheduler.py daily all --dry-run

# 特定地域 日次ジョブ (DRY-RUN)
docker-compose exec waterway-system python scheduler.py daily tokyo --dry-run
docker-compose exec waterway-system python scheduler.py daily yokohama --dry-run
docker-compose exec waterway-system python scheduler.py daily osaka --dry-run

# 週次まとめジョブ (DRY-RUN)
docker-compose exec waterway-system python scheduler.py weekly all --dry-run

# テスト実行 (東京地域、DRY-RUN)
docker-compose exec waterway-system python scheduler.py test
```

### 本番実行コマンド

```bash
# 全地域 日次ジョブ (本番)
docker-compose exec waterway-system python scheduler.py daily all

# 特定地域 日次ジョブ (本番)
docker-compose exec waterway-system python scheduler.py daily tokyo
docker-compose exec waterway-system python scheduler.py daily osaka

# 週次まとめジョブ (本番)
docker-compose exec waterway-system python scheduler.py weekly all
```

### 監視・メンテナンスコマンド

```bash
# ヘルスチェック実行
docker-compose exec waterway-system python scheduler.py health

# システムヘルスチェック詳細
docker-compose exec waterway-system python healthcheck.py

# ログ確認
docker-compose exec waterway-system tail -f /app/logs/scheduler.log
docker-compose exec waterway-system tail -f /app/logs/waterway_system.log

# 実行状況確認
docker-compose exec waterway-system cat /app/logs/execution_status.json

# データベース確認
docker-compose exec waterway-system sqlite3 /app/data/waterway_notices.db ".tables"
docker-compose exec waterway-system sqlite3 /app/data/waterway_notices.db "SELECT COUNT(*) FROM waterway_notices;"

# ディスク使用量確認
docker-compose exec waterway-system df -h
docker-compose exec waterway-system du -sh /app/data /app/logs
```

## ✅ DRY-RUN → PROD 切替チェックリスト

### ステップ1: DRY-RUN動作確認 ✅

- [ ] **システム起動確認**
  ```bash
  docker-compose up -d --build
  docker-compose ps  # すべて "Up" 状態
  ```

- [ ] **テストデータ投入確認**
  ```bash
  docker-compose exec waterway-system python setup_test_data.py --init-all
  # ✅ データベース初期化完了
  # ✅ vessels.csv読込完了
  # ✅ routing.csv読込完了
  ```

- [ ] **DRY-RUN実行確認**
  ```bash
  docker-compose exec waterway-system python scheduler.py daily all --dry-run
  # ✅ RSS取得成功
  # ✅ データ処理成功
  # ✅ 実際の配信なし（DRY-RUN）
  ```

- [ ] **ログ出力確認**
  ```bash
  docker-compose exec waterway-system ls -la /app/logs/
  # ✅ scheduler.log存在
  # ✅ waterway_system.log存在
  # ✅ execution_status.json存在
  ```

### ステップ2: 本番設定準備 ⚙️

- [ ] **メール認証設定**
  ```bash
  # .envファイル編集
  SMTP_HOST=smtp.gmail.com
  SMTP_PORT=587
  SMTP_USERNAME=your-email@gmail.com        # ✅ 実際のアドレス
  SMTP_PASSWORD=your-16-digit-app-password  # ✅ Gmailアプリパスワード
  SMTP_FROM_NAME=水路通報配信システム
  SMTP_FROM_EMAIL=your-email@gmail.com      # ✅ 実際のアドレス
  ```

- [ ] **Slack認証設定**
  ```bash
  SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/TOKEN  # ✅ 実際のWebhook URL
  SLACK_CHANNEL=#waterway-notices           # ✅ 実際のチャンネル
  SLACK_USERNAME=水路通報Bot
  SLACK_ICON_EMOJI=:ocean:
  ```

- [ ] **セキュリティ設定**
  ```bash
  API_TOKEN=your-secure-api-token-here      # ✅ 安全なランダム文字列
  ```

### ステップ3: 認証テスト 🧪

- [ ] **SMTP接続テスト**
  ```bash
  docker-compose exec waterway-system python -c "
  import smtplib, os
  server = smtplib.SMTP(os.getenv('SMTP_HOST'), int(os.getenv('SMTP_PORT')))
  server.starttls()
  server.login(os.getenv('SMTP_USERNAME'), os.getenv('SMTP_PASSWORD'))
  server.quit()
  print('✅ SMTP接続成功')
  "
  ```

- [ ] **Slack接続テスト**
  ```bash
  docker-compose exec waterway-system python -c "
  import requests, os
  webhook_url = os.getenv('SLACK_WEBHOOK_URL')
  payload = {'text': 'テストメッセージ - 水路通報システム'}
  response = requests.post(webhook_url, json=payload)
  print(f'✅ Slack接続成功: {response.status_code}')
  "
  ```

### ステップ4: 本番モード切替 🔄

- [ ] **DRY_RUN設定変更**
  ```bash
  # .envファイルで変更
  DRY_RUN=false  # ✅ trueからfalseに変更
  ```

- [ ] **システム再起動**
  ```bash
  docker-compose restart
  # ✅ 設定変更を反映
  ```

- [ ] **本番設定確認**
  ```bash
  docker-compose exec waterway-system python -c "
  import os
  print(f'DRY_RUN: {os.getenv(\"DRY_RUN\")}')  # ✅ 'false'を確認
  print(f'SMTP設定: {bool(os.getenv(\"SMTP_USERNAME\"))}')  # ✅ True
  print(f'Slack設定: {bool(os.getenv(\"SLACK_WEBHOOK_URL\"))}')  # ✅ True
  "
  ```

### ステップ5: 本番実行テスト 🚀

- [ ] **単一地域テスト**
  ```bash
  docker-compose exec waterway-system python scheduler.py daily tokyo
  # ✅ 実際のメール配信
  # ✅ 実際のSlack通知
  # ✅ エラーなし
  ```

- [ ] **配信結果確認**
  ```bash
  # メール受信確認 ✅
  # Slackチャンネル確認 ✅
  # ログでエラーがないことを確認 ✅
  docker-compose logs waterway-system | tail -20
  ```

- [ ] **全地域実行**
  ```bash
  docker-compose exec waterway-system python scheduler.py daily all
  # ✅ 全地域配信成功
  ```

### ステップ6: スケジューラー動作確認 ⏰

- [ ] **スケジューラー起動**
  ```bash
  # コンテナが既にスケジューラーモードで動作していることを確認
  docker-compose logs waterway-system | grep "スケジューラー開始"
  # ✅ "水路通報自動配信スケジューラーを開始します" 表示
  ```

- [ ] **スケジュール設定確認**
  ```bash
  docker-compose logs waterway-system | grep "スケジュール設定完了"
  # ✅ 日次ジョブ: 毎日 06:30 JST
  # ✅ 週次ジョブ: 毎週friday 09:30 JST
  # ✅ DRY_RUNモード: 無効
  ```

- [ ] **次回実行時刻確認**
  ```bash
  docker-compose exec waterway-system python -c "
  from datetime import datetime
  import pytz
  jst = pytz.timezone('Asia/Tokyo')
  now = datetime.now(jst)
  print(f'現在時刻: {now.strftime(\"%Y-%m-%d %H:%M:%S JST\")}')
  print('次回日次実行: 翌日 06:30 JST')
  print('次回週次実行: 次の金曜 09:30 JST')
  "
  ```

## 🚨 緊急時対応チェックリスト

### 誤配信時の対応

- [ ] **即座にDRY-RUNモードに戻す**
  ```bash
  sed -i 's/DRY_RUN=false/DRY_RUN=true/' .env
  docker-compose restart
  ```

- [ ] **問題調査**
  ```bash
  docker-compose logs --tail=100 waterway-system
  docker-compose exec waterway-system cat /app/logs/execution_status.json
  ```

### システム異常時の対応

- [ ] **システム緊急停止**
  ```bash
  docker-compose down
  ```

- [ ] **データベースバックアップ作成**
  ```bash
  docker cp waterway-notices-system:/app/data/waterway_notices.db ./backup_$(date +%Y%m%d_%H%M%S).db
  ```

- [ ] **設定初期化**
  ```bash
  cp .env.backup .env  # バックアップから復旧
  docker-compose up -d
  ```

## 📊 運用監視項目

### 日次確認項目

- [ ] **システム稼働状況**
  ```bash
  docker-compose ps  # すべて "Up" 状態
  ```

- [ ] **ヘルスチェック**
  ```bash
  docker-compose exec waterway-system python scheduler.py health
  ```

### 週次確認項目

- [ ] **ログローテーション**
  ```bash
  docker-compose exec waterway-system find /app/logs/ -name "*.log" -mtime +7 -delete
  ```

- [ ] **データベースバックアップ**
  ```bash
  docker-compose exec waterway-system cp /app/data/waterway_notices.db /app/backups/weekly_backup_$(date +%Y%m%d).db
  ```

### 月次確認項目

- [ ] **ディスク使用量確認**
  ```bash
  docker-compose exec waterway-system df -h
  docker-compose exec waterway-system du -sh /app/data /app/logs /app/backups
  ```

- [ ] **システム性能評価**
  ```bash
  docker stats waterway-notices-system --no-stream
  ```

このチェックリストに従うことで、安全で確実なDRY-RUN → 本番運用への切替が可能です。