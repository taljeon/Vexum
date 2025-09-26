# 🚢 海技士セミナー情報自動化システム

## 📋 概要

日本の地方運輸局から海技士セミナー情報を自動収集し、毎日メールで配信するシステムです。

### ✨ 主な機能
- 📅 **自動スケジュール**: 毎日午前9時(JST)に自動実行
- 🌐 **情報収集**: 10の地方運輸局Webサイトから最新情報を収集
- 📧 **メール配信**: 新着情報をHTMLメールで配信
- 🔄 **重複防止**: 既送信情報の重複配信を防止
- 💾 **データ保存**: SQLiteデータベースで情報を永続保存

## 🚀 簡単インストール（推奨）

### 必要環境
- Docker & Docker Compose
- インターネット接続
- Gmail アカウント（2段階認証 + アプリパスワード）

### インストール手順

1. **システムファイルをダウンロード**
   ```bash
   # 配布ファイルを解凍
   unzip seminar-automation-system.zip
   cd seminar-automation-system
   ```

2. **自動インストール実行**
   ```bash
   ./install.sh
   ```

   インストール時に入力が必要な情報：
   - 📧 受信者メールアドレス
   - 📨 送信用Gmailアドレス
   - 🔑 Gmailアプリパスワード（16桁）

3. **完了！**
   - システムが自動起動
   - 毎日午前9時に自動実行
   - 即座にテストメール送信可能

## 🛠️ 管理コマンド

| コマンド | 説明 |
|----------|------|
| `./start.sh` | システム開始 |
| `./stop.sh` | システム停止 |
| `./restart.sh` | システム再起動 |
| `./test.sh` | テストメール送信 |
| `./logs.sh` | ログ確認 |

## 📧 Gmail設定方法

1. **Gmail アカウントにログイン**
2. **セキュリティ設定**
   - Googleアカウント管理 → セキュリティ
   - 2段階認証を有効化
3. **アプリパスワード生成**
   - 「アプリパスワード」を選択
   - アプリ: その他（カスタム名）
   - 名前: "海技士セミナーシステム"
   - 生成された16桁のパスワードを記録

## 🔧 詳細設定

### 環境変数設定 (.env ファイル)
```bash
# メール受信者
TEST_EMAIL=your-email@company.com

# Gmail SMTP設定
SMTP_USERNAME=your-gmail@gmail.com
SMTP_PASSWORD=your-16-digit-app-password
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
FROM_EMAIL=your-gmail@gmail.com

# 運用モード
DRY_RUN=false  # false: 実際送信, true: テストのみ
```

### 手動操作コマンド
```bash
# システム状態確認
docker-compose -f docker-compose.production.yml ps

# 即座にテスト実行
docker-compose -f docker-compose.production.yml exec seminar-automation python seminar_scheduler.py --production

# ログ確認
docker-compose -f docker-compose.production.yml logs -f

# システム完全削除
docker-compose -f docker-compose.production.yml down -v
```

## 📊 監視とトラブルシューティング

### システム状態確認
```bash
./logs.sh  # ログをリアルタイム確認
```

### よくある問題

#### ❌ メールが届かない
- **スパムフォルダ**を確認
- **Gmail アプリパスワード**が正しいか確認
- **2段階認証**が有効になっているか確認

#### ❌ システムが起動しない
- **Docker**が実行中か確認: `docker --version`
- **Docker Compose**がインストール済みか確認: `docker-compose --version`
- **ポート587**が開いているか確認（ファイアウォール）

#### ❌ 情報収集できない
- **インターネット接続**を確認
- **地方運輸局サイト**にアクセスできるか確認

## 🔒 セキュリティ

- ✅ メールパスワードは環境変数で管理
- ✅ Docker コンテナ内で隔離実行
- ✅ HTTPS通信でデータ収集
- ✅ ローカルデータベースでデータ保護

## 📞 サポート

### ログファイル場所
- Docker ログ: `docker-compose logs`
- アプリケーションログ: Docker volume内

### 問題報告時の情報
1. エラーメッセージ
2. システムログ (`./logs.sh`)
3. 環境情報 (OS、Docker バージョン)

## 📈 システム要件

### 最小要件
- **CPU**: 1 Core
- **メモリ**: 512MB
- **ディスク**: 1GB
- **ネットワーク**: SMTP (587ポート) アクセス

### 推奨環境
- **Ubuntu 20.04** または **CentOS 8**
- **Docker 20.10+**
- **Docker Compose 1.29+**

---

## 🎉 運用開始

インストール完了後、システムは以下のスケジュールで自動動作します：

- 📅 **毎日 09:00 JST**: 自動情報収集・メール配信
- 🔍 **毎時間**: システム健康状態チェック
- 💾 **継続的**: データベース自動バックアップ

**📧 これで海技士セミナー情報を見逃すことはありません！**