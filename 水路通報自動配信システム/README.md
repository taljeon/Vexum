# 🌊 水路通報の地域別日次自動配信システム

[![Docker](https://img.shields.io/badge/Docker-ready-blue)](https://www.docker.com/)
[![Python](https://img.shields.io/badge/Python-3.11-green)](https://www.python.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

日本の海上保安庁が発行する水路通報を自動収集し、地域別に配信するDockerベースのシステムです。

## ✨ 主な機能

- 📡 **RSS自動収集**: 各地域の水路通報RSSを定期取得
- 🕐 **定時自動配信**: 日次(06:30 JST)・週次(金曜 09:30 JST)の自動配信
- 📧 **メール配信**: SMTP経由でHTML形式メール送信
- 💬 **Slack通知**: Webhook経由でSlackチャンネル通知
- 🗺️ **地域別配信**: 関心地域別のカスタマイズ配信
- 🔄 **重複防止**: インテリジェントな重複通報除去
- 📊 **配信履歴管理**: SQLiteによる配信記録の永続化
- 🏥 **ヘルスモニタリング**: システム状態の自動監視

## 🗾 対応地域

| 地域 | RSS URL | 管轄海域 |
|------|---------|----------|
| 東京 | tokyo.rss | 関東・伊豆諸島 |
| 横浜 | yokohama.rss | 相模湾・東京湾 |
| 名古屋 | nagoya.rss | 伊勢湾・熊野灘 |
| 大阪 | osaka.rss | 大阪湾・紀伊水道 |
| 神戸 | kobe.rss | 瀬戸内海東部 |
| 下関 | shimonoseki.rss | 瀬戸内海西部・響灘 |
| 札幌 | sapporo.rss | 北海道沿岸 |
| 仙台 | sendai.rss | 東北太平洋沿岸 |
| 広島 | hiroshima.rss | 瀬戸内海中部 |

## 🚀 クイックスタート

### 前提条件

- Docker Desktop インストール済み
- 8080ポート利用可能
- インターネット接続

### 1. システム起動

```bash
# プロジェクトディレクトリに移動
cd waterway_pkg

# システム起動
docker-compose up -d --build

# 状態確認
docker-compose ps
```

### 2. 初期データ投入

```bash
# テストデータ初期化
docker-compose exec waterway-system python setup_test_data.py --init-all

# 動作確認
docker-compose exec waterway-system python scheduler.py test
```

### 3. DRY-RUN実行

```bash
# 全地域テスト実行
docker-compose exec waterway-system python scheduler.py daily all --dry-run

# ログ確認
docker-compose logs -f waterway-system
```

## ⚙️ 本番環境設定

### 1. 環境設定

`.env`ファイルを編集:

```env
# 本番モードに切替
DRY_RUN=false

# SMTP設定 (Gmail例)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-16-digit-app-password

# Slack設定
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
SLACK_CHANNEL=#waterway-notices
```

### 2. システム再起動

```bash
docker-compose restart
```

### 3. 本番実行

```bash
# 単一地域テスト
docker-compose exec waterway-system python scheduler.py daily tokyo

# 全地域実行
docker-compose exec waterway-system python scheduler.py daily all
```

## 📋 主要コマンド

### 日次・週次実行

```bash
# 日次ジョブ実行
docker-compose exec waterway-system python scheduler.py daily [地域名|all] [--dry-run]

# 週次まとめ実行
docker-compose exec waterway-system python scheduler.py weekly [地域名|all] [--dry-run]

# テスト実行
docker-compose exec waterway-system python scheduler.py test
```

### 監視・メンテナンス

```bash
# ヘルスチェック
docker-compose exec waterway-system python scheduler.py health

# ログ確認
docker-compose logs -f waterway-system

# データベース確認
docker-compose exec waterway-system sqlite3 /app/data/waterway_notices.db ".tables"
```

## 🏗️ アーキテクチャ

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   RSS Sources   │    │   Docker App    │    │   Destinations  │
│                 │    │                 │    │                 │
│ • tokyo.rss     │───▶│  • Scheduler    │───▶│ • SMTP Mail     │
│ • yokohama.rss  │    │  • RSS Parser   │    │ • Slack Webhook │
│ • osaka.rss     │    │  • Deduplicator │    │ • Database Log  │
│ • ...           │    │  • Distributor  │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### コンポーネント構成

- **スケジューラー** (`scheduler.py`): 定時実行制御
- **水路通報システム** (`waterway_notice_system.py`): RSS取得・処理・配信
- **データセットアップ** (`setup_test_data.py`): 初期データ投入
- **ヘルスチェック** (`healthcheck.py`): システム監視

## 📁 プロジェクト構成

```
水路通報自動配信システム/
├── docker-compose.yml          # Docker Compose設定
├── Dockerfile                  # Dockerイメージ定義
├── .env                        # 環境変数設定
├── requirements.txt            # Python依存関係
├── entrypoint.sh              # コンテナエントリーポイント
├── scheduler.py               # スケジューラー
├── waterway_notice_system.py  # メインシステム (要実装)
├── setup_test_data.py         # データセットアップ (要実装)
├── healthcheck.py             # ヘルスチェック
├── vessels.csv                # 船舶情報 (要作成)
├── routing.csv                # 配信ルーティング (要作成)
├── data/                      # データベース格納
├── logs/                      # ログファイル格納
├── DEPLOYMENT_GUIDE.md        # 運用ガイド
├── COMMANDS_CHECKLIST.md      # コマンド・チェックリスト
└── README.md                  # このファイル
```

## 🔧 設定オプション

### スケジュール設定

```env
# 日次実行時刻 (JST)
DAILY_SCHEDULE_TIME=06:30

# 週次実行曜日・時刻
WEEKLY_SCHEDULE_DAY=friday
WEEKLY_SCHEDULE_TIME=09:30
```

### パフォーマンス設定

```env
# 並行リクエスト数
MAX_CONCURRENT_REQUESTS=5

# リクエスト間隔 (秒)
REQUEST_DELAY=1.0

# RSS取得タイムアウト (秒)
RSS_FETCH_TIMEOUT=30
```

### 重複除去設定

```env
# 重複チェック期間 (日)
DUPLICATE_CHECK_DAYS=7

# 類似度判定閾値 (0.0-1.0)
CONTENT_SIMILARITY_THRESHOLD=0.85
```

## 📊 監視・アラート

### システムヘルス

- **ディスク容量**: 使用量90%超過でアラート
- **データベース**: 接続性とテーブル整合性チェック
- **RSS取得**: タイムアウト・エラー率監視
- **配信成功率**: メール・Slack配信成功率

### ログローテーション

- **日次ログ**: 30日保存
- **実行状況**: 最新100回分保持
- **配信履歴**: SQLiteで永続保存

## 🔐 セキュリティ

### 認証・認可

- **SMTP認証**: Gmail App Passwordsを推奨
- **Slack認証**: Incoming Webhooksを使用
- **データベース**: 読み取り専用アクセス制御

### データ保護

- **機密情報**: 環境変数で管理
- **ログ**: 個人情報除去
- **バックアップ**: 暗号化推奨

## 🆘 トラブルシューティング

### よくある問題

| 問題 | 原因 | 対処法 |
|------|------|--------|
| RSS取得失敗 | ネットワーク・サイトメンテ | リトライ機構で自動復旧 |
| メール配信失敗 | SMTP認証・設定エラー | `.env`設定確認 |
| 時刻ズレ | タイムゾーン設定 | `TZ=Asia/Tokyo`確認 |
| 重複送信 | 重複判定設定 | 閾値調整・データクリア |

### サポートコマンド

```bash
# システム診断
docker-compose exec waterway-system python scheduler.py health

# 詳細ヘルスチェック
docker-compose exec waterway-system python healthcheck.py

# 緊急停止
docker-compose down

# 設定初期化
cp .env.backup .env && docker-compose restart
```

## 📚 ドキュメント

- [📖 運用ガイド](DEPLOYMENT_GUIDE.md) - 詳細な運用手順
- [✅ コマンド・チェックリスト](COMMANDS_CHECKLIST.md) - 実行コマンドと切替手順

## 🤝 貢献

プルリクエスト・Issue報告を歓迎します。

## 📄 ライセンス

[MIT License](LICENSE) - 詳細はLICENSEファイルをご確認ください。

## 🙋‍♂️ サポート

システムに関する質問・要望は、Issueまたは以下にご連絡ください:

- 📧 Email: waterway-system@example.com
- 💬 Slack: #waterway-support

---

**🚢 安全な航行のために、正確でタイムリーな水路通報配信を提供します。**