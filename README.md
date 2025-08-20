# Google Apps Script PDF Document Automation System

## 概要 (Overview)

このシステムは、Googleスプレッドシートのデータを自動的にPDF化し、Gemini APIで要約を生成して、メールで送信するGoogle Apps Scriptプロジェクトです。

## 主な機能 (Main Features)

- 📄 **自動PDF生成**: スプレッドシートの各シートを個別にPDF化
- 🤖 **AI要約生成**: Gemini APIを使用した自動テキスト要約
- 📧 **柔軟なメール送信**: 統合送信、個別送信、エラー報告の3つのモード
- ⚡ **自動実行**: 時間ベースのトリガーによる定期実行
- 📊 **性能監視**: 詳細な実行統計と性能分析
- 🔧 **エラー処理**: 包括的なエラー分類と自動復旧機能

## ファイル構成 (File Structure)

```
├── main.gs                    # メイン進入点とUI管理
├── config.gs                  # 動的設定管理
├── documentProcessor.gs       # 文書処理コアロジック
├── geminiAPI.gs              # Gemini API連携と最適化
├── emailSender.gs            # メール送信管理
├── textOptimizer.gs          # テキスト最適化と圧縮
├── logger.gs                 # 構造化ログとエラー分析
├── triggerManager.gs         # 自動実行とトリガー管理
├── performanceAnalyzer.gs    # 性能分析とモニタリング
└── errorHandler.gs           # エラー分類と自動復旧
```

## セットアップ方法 (Setup Instructions)

### 1. Google Apps Scriptプロジェクト作成

1. [Google Apps Script](https://script.google.com/)にアクセス
2. 新しいプロジェクトを作成
3. 各`.gs`ファイルの内容をコピーして貼り付け

### 2. 必要なAPIの有効化

- **Google Drive API**: PDF生成に必要
- **Gmail API**: メール送信に必要
- **Google Sheets API**: スプレッドシート操作に必要

### 3. Gemini API設定

1. [Google AI Studio](https://makersuite.google.com/)でAPIキーを取得
2. Google Apps Scriptのプロパティに`GEMINI_API_KEY`として設定

### 4. 初期設定

```javascript
// スクリプトエディタで実行
function setupInitialConfiguration() {
  ConfigManager.initializeConfig();
}
```

## 使用方法 (Usage)

### メニューからの実行

スプレッドシートを開くと、カスタムメニュー「ドキュメント送信メニュー」が表示されます：

- **PDF統合送信（推奨）**: 全PDFを1つのメールで送信
- **PDF個別送信**: 各PDFを個別メールで送信
- **失敗のみ報告**: エラーが発生した場合のみ報告

### 自動実行設定

- **自動実行開始**: 定期的な自動実行を開始
- **自動実行停止**: 自動実行を停止
- **自動実行状態確認**: 現在の実行状態を表示

### モニタリング機能

- **エラーログ確認**: 最近のエラーログを表示
- **性能統計**: 実行性能の統計を表示
- **システム状態確認**: システム全体の健康状態を確認

## 設定オプション (Configuration Options)

### メール送信モード

- `CONSOLIDATED`: 統合送信（推奨）
- `INDIVIDUAL`: 個別送信
- `ERRORS_ONLY`: エラー報告のみ

### 実行間隔

- デフォルト: 5分間隔
- 設定可能範囲: 1分〜60分

### テキスト最適化レベル

- `minimal`: 最小限の最適化
- `moderate`: 中程度の最適化
- `aggressive`: 積極的な最適化

## エラー処理 (Error Handling)

システムには包括的なエラー処理機能が組み込まれています：

### 自動分類

- API関連エラー
- PDF生成エラー
- メール送信エラー
- 権限エラー
- ネットワークエラー

### 自動復旧

- 指数バックオフによる再試行
- 処理負荷の自動調整
- メモリ使用量の最適化
- 添付ファイルサイズの調整

## 性能監視 (Performance Monitoring)

### リアルタイム統計

- API呼び出し成功率
- 平均処理時間
- メール送信統計
- エラー発生率

### 詳細分析

- セッション別統計
- 時間帯別パターン分析
- ベンチマークテスト
- システム健康状態レポート

## ベストプラクティス (Best Practices)

### 1. 定期的なメンテナンス

```javascript
// 月1回実行推奨
function monthlyMaintenance() {
  Logger.cleanupOldLogs(30);
  PerformanceAnalyzer.cleanupPerformanceData(30);
}
```

### 2. 設定の定期確認

```javascript
// 週1回実行推奨
function weeklyConfigCheck() {
  ConfigManager.validate();
}
```

### 3. 性能最適化

- テキスト量に応じた最適化レベルの調整
- API使用量の監視
- メール送信制限の管理

## トラブルシューティング (Troubleshooting)

### よくある問題

1. **API制限エラー**
   - 解決方法: 実行間隔を長くする、テキスト最適化を強化

2. **メール送信制限**
   - 解決方法: 統合送信モードに変更、添付ファイル数を減らす

3. **実行時間制限**
   - 解決方法: 処理対象を分割、バッチサイズを調整

4. **権限エラー**
   - 解決方法: 必要なAPIの有効化、スクリプト権限の確認

### デバッグ機能

```javascript
// 詳細分析の実行
PerformanceAnalyzer.exportDetailedAnalysis();

// エラーログの分析
Logger.analyzeErrorLogs();

// システム健康状態の確認
PerformanceAnalyzer.getSystemHealthReport();
```

## 制限事項 (Limitations)

- Google Apps Scriptの実行時間制限（6分）
- Gmail送信制限（1日100通）
- Gemini API利用制限
- スプレッドシートのサイズ制限

## ライセンス (License)

このプロジェクトはMITライセンスの下で公開されています。

## 貢献 (Contributing)

プルリクエストやイシューの報告を歓迎します。

## サポート (Support)

質問や問題がある場合は、GitHubのIssuesページでお知らせください。

---

**注意**: このシステムを使用する前に、Gemini APIの利用規約とGoogle Apps Scriptの制限事項を必ずご確認ください。