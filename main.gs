/**
 * main.gs - 메인 진입점 및 UI 관리
 * 메뉴 생성, 사용자 인터페이스, 메인 실행 함수
 * 
 * @version 2.0
 * @author Google Apps Script System
 * @updated 2024
 */

/**
 * onOpen: 커스텀 메뉴 생성
 */
function onOpen() {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('ドキュメント送信メニュー')
      .addItem('設定検証', 'validateConfiguration')
      .addSeparator()
      .addItem('PDF統合送信（推奨）', 'sendAllPdfsConsolidated')
      .addItem('PDF個別送信', 'sendAllPdfsIndividual') 
      .addItem('失敗のみ報告', 'sendErrorsOnly')
      .addSeparator()
      .addItem('自動実行開始', 'startAutoExecution')
      .addItem('自動実行停止', 'stopAutoExecution')
      .addItem('自動実行状態確認', 'showTriggerStatus')
      .addSeparator()
      .addItem('エラーログ確認', 'showErrorLog')
      .addItem('設定変更', 'showConfigDialog')
      .addItem('性能統計', 'showPerformanceStats')
      .addItem('システム状態確認', 'showSystemHealth')
      .addSeparator()
      .addItem('詳細分析エクスポート', 'exportDetailedAnalysis')
      .addItem('ベンチマークテスト', 'runPerformanceBenchmark')
      .addToUi();
      
    Logger.info('Menu initialized successfully');
    
  } catch (error) {
    console.error('Menu initialization failed:', error.message);
  }
}

/**
 * 설정 변경 다이얼로그 (개선된 버전)
 */
function showConfigDialog() {
  try {
    const ui = SpreadsheetApp.getUi();
    const properties = PropertiesService.getScriptProperties();
    
    const currentMode = properties.getProperty('EMAIL_MODE') || CONFIG.EMAIL_MODE.CONSOLIDATED;
    const triggerStatus = TriggerManager.getStatus();
    
    let promptMessage = `現在の設定:\n`;
    promptMessage += `送信モード: ${currentMode}\n`;
    promptMessage += `自動実行: ${triggerStatus.isActive ? '実行中' : '停止中'}\n\n`;
    promptMessage += `新しい送信モードを選択してください:\n`;
    promptMessage += `1. consolidated (統合送信・推奨)\n`;
    promptMessage += `2. individual (個別送信)\n`;
    promptMessage += `3. errors_only (失敗のみ)\n\n`;
    promptMessage += `番号を入力:`;
    
    const response = ui.prompt(
      '送信モード設定',
      promptMessage,
      ui.ButtonSet.OK_CANCEL
    );
    
    if (response.getSelectedButton() === ui.Button.OK) {
      const input = response.getResponseText().trim();
      let newMode;
      
      switch (input) {
        case '1':
          newMode = CONFIG.EMAIL_MODE.CONSOLIDATED;
          break;
        case '2':
          newMode = CONFIG.EMAIL_MODE.INDIVIDUAL;
          break;
        case '3':
          newMode = CONFIG.EMAIL_MODE.ERRORS_ONLY;
          break;
        default:
          ui.alert('無効な選択です。設定は変更されませんでした。');
          return;
      }
      
      properties.setProperty('EMAIL_MODE', newMode);
      Logger.info('Email mode changed', { 
        oldMode: currentMode, 
        newMode: newMode,
        changedBy: 'user'
      });
      
      ui.alert(`送信モードを「${newMode}」に設定しました。`);
    }
    
  } catch (error) {
    Logger.error('Config dialog failed', { error: error.message });
    SpreadsheetApp.getUi().alert('設定変更エラー: ' + error.message);
  }
}

/**
 * 메인 실행 함수들 (각 모드별 진입점)
 */
function sendAllPdfsConsolidated() {
  Logger.startNewSession();
  Logger.info('Manual execution started', { mode: 'consolidated' });
  DocumentProcessor.sendAllPdfs(CONFIG.EMAIL_MODE.CONSOLIDATED);
}

function sendAllPdfsIndividual() {
  Logger.startNewSession();
  Logger.info('Manual execution started', { mode: 'individual' });
  DocumentProcessor.sendAllPdfs(CONFIG.EMAIL_MODE.INDIVIDUAL);
}

function sendErrorsOnly() {
  Logger.startNewSession();
  Logger.info('Manual execution started', { mode: 'errors_only' });
  DocumentProcessor.sendAllPdfs(CONFIG.EMAIL_MODE.ERRORS_ONLY);
}

/**
 * 자동 실행용 진입점 (트리거에서 호출)
 */
function sendAllPdfs() {
  Logger.startNewSession();
  const emailMode = ConfigManager.getEmailMode();
  Logger.info('Triggered execution started', { mode: emailMode });
  DocumentProcessor.sendAllPdfs(emailMode);
}

/**
 * 자동 실행 관리
 */
function startAutoExecution() {
  TriggerManager.start();
}

function stopAutoExecution() {
  TriggerManager.stop();
}

function showTriggerStatus() {
  TriggerManager.showStatus();
}

/**
 * 설정 및 로그 관리
 */
function validateConfiguration() {
  ConfigManager.validate();
}

function showErrorLog() {
  Logger.showErrorLog();
}

function showPerformanceStats() {
  PerformanceAnalyzer.showStats();
}

function showSystemHealth() {
  const health = PerformanceAnalyzer.getSystemHealthReport();
  
  let message = `システム状態: ${health.overall}\n\n`;
  
  if (health.triggers) {
    message += `自動実行: ${health.triggers.isActive ? '実行中' : '停止中'}\n`;
    message += `送信モード: ${health.triggers.emailMode}\n`;
  }
  
  if (health.errors) {
    message += `最近のエラー: ${health.errors.recentErrorCount}件\n`;
  }
  
  if (health.recommendations && health.recommendations.length > 0) {
    message += `\n推奨事項:\n`;
    health.recommendations.forEach(rec => {
      message += `• ${rec}\n`;
    });
  }
  
  SpreadsheetApp.getUi().alert(message);
}

/**
 * 고급 기능들
 */
function exportDetailedAnalysis() {
  PerformanceAnalyzer.exportDetailedAnalysis();
}

function runPerformanceBenchmark() {
  try {
    const ui = SpreadsheetApp.getUi();
    const response = ui.prompt(
      'ベンチマークテスト',
      'テストするシート数を入力してください (1-10):',
      ui.ButtonSet.OK_CANCEL
    );
    
    if (response.getSelectedButton() === ui.Button.OK) {
      const count = parseInt(response.getResponseText()) || 5;
      if (count >= 1 && count <= 10) {
        const results = PerformanceAnalyzer.runBenchmark(count);
        ui.alert(
          `ベンチマーク結果:\n` +
          `処理時間: ${results.totalTimeSeconds}秒\n` +
          `平均処理時間: ${results.avgTimePerSheet}ms/シート\n` +
          `成功率: ${results.successRate}%`
        );
      } else {
        ui.alert('1-10の範囲で入力してください。');
      }
    }
    
  } catch (error) {
    Logger.error('Benchmark test failed', { error: error.message });
    SpreadsheetApp.getUi().alert('ベンチマークテストエラー: ' + error.message);
  }
}

/**
 * 개발자용 헬퍼 함수들
 */
function resetAllSettings() {
  try {
    const ui = SpreadsheetApp.getUi();
    const response = ui.alert(
      '設定リセット確認',
      'すべての設定をリセットしますか？この操作は元に戻せません。',
      ui.ButtonSet.YES_NO
    );
    
    if (response === ui.Button.YES) {
      // 트리거 정리
      TriggerManager.cleanup();
      
      // 프로퍼티 정리 (API 키 등 중요 설정 제외)
      const properties = PropertiesService.getScriptProperties();
      const keysToReset = ['EMAIL_MODE', 'CURRENT_SESSION_ID', 'ACTIVE_TRIGGER_INFO', 'LAST_EXECUTION_INFO'];
      keysToReset.forEach(key => properties.deleteProperty(key));
      
      Logger.info('All settings reset by user');
      ui.alert('設定をリセットしました。');
    }
    
  } catch (error) {
    Logger.error('Settings reset failed', { error: error.message });
    SpreadsheetApp.getUi().alert('設定リセットエラー: ' + error.message);
  }
}

function debugAllTriggers() {
  const triggerInfo = TriggerManager.debugTriggers();
  console.log('All triggers:', triggerInfo);
  
  const ui = SpreadsheetApp.getUi();
  const message = triggerInfo.length > 0 
    ? `トリガー数: ${triggerInfo.length}個\n詳細はログを確認してください。`
    : 'アクティブなトリガーはありません。';
    
  ui.alert(message);
}

/**
 * 글로벌 에러 핸들러
 */
function onError(error) {
  Logger.critical('Global error handler triggered', {
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
  
  // 치명적 에러 시 자동 실행 중지
  if (error.message.includes('CRITICAL') || error.message.includes('FATAL')) {
    TriggerManager.stopOnCriticalError();
  }
}