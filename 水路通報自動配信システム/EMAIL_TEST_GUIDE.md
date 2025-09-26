# 📧 水路通報自動配信システム - メール実機テストガイド

## 🎯 テスト目的

実際のSMTP設定を使用してメール配信機能をテストし、本番運用の準備を完了させます。

## 📋 事前準備チェックリスト

### 1. Gmail アプリパスワード取得（Gmail使用の場合）

- [ ] Googleアカウントの2段階認証を有効化
- [ ] [Google アカウント設定](https://myaccount.google.com/security) → アプリパスワード生成
- [ ] 16桁のアプリパスワードをメモ

### 2. 環境設定ファイル準備

```bash
# 本番用設定をコピー
cd /path/to/water_pkg
cp .env.production .env

# 設定を編集
nano .env
```

### 3. 必須設定項目

`.env`ファイルで以下を実際の値に変更：

```env
# SMTP設定 - 実際の値に変更！
SMTP_USERNAME=your-actual-email@gmail.com
SMTP_PASSWORD=your-16-digit-app-password
SMTP_FROM_EMAIL=your-actual-email@gmail.com

# テストモード（最初はtrueのまま）
DRY_RUN=true
```

## 🧪 ステップ1: 初期テスト実行

### 1.1 システム起動

```bash
# Docker コンテナ起動
docker-compose up -d --build

# 起動状態確認
docker-compose ps
```

### 1.2 メール設定テスト実行

```bash
# メール設定テストスクリプト実行
docker-compose exec waterway-system python email_test_setup.py
```

**期待される出力:**
```
🌊 水路通報自動配信システム - メール設定テスト
==================================================
📧 メール設定検証中...
✅ 基本設定OK
🔌 SMTP接続テスト (smtp.gmail.com:587)...
✅ SMTP接続成功
🗃️  テスト用データベース作成中...
✅ テストデータベース作成完了
📧 テストメール送信中... (宛先: your-email@gmail.com)
⚠️  DRY-RUNモード: 実際の送信は行いません
✅ すべてのテストが成功しました！
```

### 1.3 エラー時の対処

**SMTP接続エラーの場合:**
```bash
❌ SMTP接続失敗: (535, b'5.7.8 Username and Password not accepted')
```

**対処法:**
1. Gmail アプリパスワードを再確認
2. 2段階認証が有効になっているか確認
3. 「安全性の低いアプリからのアクセス」が無効になっているか確認

## 🧪 ステップ2: 実際のメール送信テスト

### 2.1 実際の送信モードに切替

```bash
# .env ファイル編集
docker-compose exec waterway-system nano /app/.env

# DRY_RUN を false に変更
DRY_RUN=false
```

### 2.2 システム再起動

```bash
# 設定反映のため再起動
docker-compose restart

# 再起動確認
docker-compose ps
```

### 2.3 実際のメール送信テスト

```bash
# 実メール送信テスト実行
docker-compose exec waterway-system python email_test_setup.py
```

**期待される出力:**
```
📧 テストメール送信中... (宛先: your-email@gmail.com)
✅ テストメール送信成功
✅ すべてのテストが成功しました！
```

### 2.4 メール受信確認

受信したテストメールに以下が含まれていることを確認：

- [ ] 件名: 【テスト】水路通報自動配信システム - 動作確認
- [ ] 送信者: 水路通報配信システム
- [ ] HTML形式で表示される
- [ ] 実行情報テーブルが正しい

## 🧪 ステップ3: 水路通報配信テスト

### 3.1 単一地域テスト

```bash
# 東京地域のみでテスト
docker-compose exec waterway-system python scheduler.py daily tokyo

# ログ確認
docker-compose logs -f waterway-system
```

### 3.2 配信確認項目

- [ ] RSS取得成功
- [ ] データベース登録成功
- [ ] メール送信成功
- [ ] エラーなく完了

### 3.3 全地域テスト

```bash
# 全地域で実行
docker-compose exec waterway-system python scheduler.py daily all

# 実行状況確認
docker-compose exec waterway-system cat /app/logs/execution_status.json
```

## 🧪 ステップ4: スケジュール動作確認

### 4.1 スケジューラー起動確認

```bash
# スケジューラーの状況確認
docker-compose logs waterway-system | grep "スケジューラー"

# 健康状態チェック
docker-compose exec waterway-system python scheduler.py health
```

### 4.2 次回実行予定確認

```bash
# スケジュール情報表示
docker-compose logs waterway-system | grep "スケジュール設定完了"

# 現在時刻との比較
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

## 📊 テスト結果の記録

### 成功基準

全ての項目が ✅ であることを確認：

- [ ] SMTP接続テスト成功
- [ ] テストメール送信成功
- [ ] テストメール受信確認
- [ ] 実際の水路通報配信成功
- [ ] スケジューラー正常動作
- [ ] ログファイル正常出力
- [ ] データベース正常更新

### トラブル時の連絡先

**よくある問題と解決策:**

| 問題 | 原因 | 解決策 |
|------|------|--------|
| SMTP認証エラー | アプリパスワード未設定 | Gmail 2段階認証とアプリパスワード設定 |
| タイムアウトエラー | ネットワーク問題 | ファイアウォール設定確認 |
| 重複送信 | テストデータ残存 | `setup_test_data.py --init-db` でクリア |
| 時刻ズレ | タイムゾーン設定 | `TZ=Asia/Tokyo` 確認 |

### サポートコマンド

```bash
# 完全な診断情報取得
docker-compose exec waterway-system python scheduler.py health > system_health.json

# 詳細ログ確認
docker-compose exec waterway-system tail -f /app/logs/scheduler.log

# データベース内容確認
docker-compose exec waterway-system sqlite3 /app/data/waterway_notices.db "
SELECT region, COUNT(*) as count FROM waterway_notices GROUP BY region;
SELECT * FROM delivery_logs ORDER BY created_at DESC LIMIT 10;
"

# 緊急時の停止
docker-compose down

# 設定リセット
cp .env.production .env
docker-compose restart
```

## 🎉 テスト完了後の本番運用

テストが全て成功した場合、以下で本番運用開始：

```bash
# 本番設定確認
grep -v "PASSWORD\|TOKEN" .env

# システム稼働状況の最終確認
docker-compose ps
docker-compose exec waterway-system python scheduler.py health

# 運用開始！
echo "🚀 水路通報自動配信システム本番運用開始！"
```

**定期メンテナンス項目:**
- 週次: ログサイズ確認、ヘルスチェック
- 月次: データベースバックアップ
- 四半期: パフォーマンス評価、設定見直し

---

**📧 このガイドに従って実機テストを行い、安全で確実な本番運用を開始してください。**