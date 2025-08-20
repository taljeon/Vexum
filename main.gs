/**
 * main.gs - Main entry point and UI management
 * Menu creation, user interface, main execution functions
 * 
 * @version 2.0
 * @author Google Apps Script System
 * @updated 2024
 */

/**
 * onOpen: Create custom menu
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
    Logger.error('Menu initialization failed', { error: error.message });
  }
}

/**
 * Configuration dialog
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
 * Main execution functions (entry points for each mode)
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
 * Auto execution entry point (called by triggers)
 */
function sendAllPdfs() {
  Logger.startNewSession();
  const emailMode = ConfigManager.getEmailMode();
  Logger.info('Triggered execution started', { mode: emailMode });
  DocumentProcessor.sendAllPdfs(emailMode);
}

/**
 * Auto execution management
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
 * Configuration and log management
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
 * Advanced features
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
 * Developer helper functions
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
      TriggerManager.cleanup();
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
  Logger.info('Debug triggers requested', { triggerCount: triggerInfo.length, triggers: triggerInfo });
  
  const ui = SpreadsheetApp.getUi();
  const message = triggerInfo.length > 0 
    ? `トリガー数: ${triggerInfo.length}個\n詳細はログを確認してください。`
    : 'アクティブなトリガーはありません。';
    
  ui.alert(message);
}

/**
 * Global error handler
 */
function onError(error) {
  Logger.critical('Global error handler triggered', {
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
  
  // Stop auto execution on critical errors
  if (error.message.includes('CRITICAL') || error.message.includes('FATAL')) {
    TriggerManager.stopOnCriticalError();
  }
}

/**
 * 초기 설정 함수 (최초 1회 실행 필요)
 * Google Apps Script 프로젝트를 처음 설정할 때 실행하세요
 */
function setupInitialConfiguration() {
  try {
    Logger.info('Starting initial system configuration');
    
    const ui = SpreadsheetApp.getUi();
    const response = ui.alert(
      'システム初期設定',
      'システムの初期設定を開始します。\n' +
      'この処理は最初の1回のみ実行してください。\n\n' +
      '続行しますか？',
      ui.ButtonSet.YES_NO
    );
    
    if (response !== ui.Button.YES) {
      ui.alert('初期設定がキャンセルされました。');
      return;
    }
    
    ConfigManager.initializeConfig();
    Logger.startNewSession();
    Logger.info('Initial configuration started');
    
    const validation = ConfigManager.validate();
    let message = '初期設定が完了しました。\n\n';
    message += '■ 設定結果:\n';
    message += `設定状態: ${validation.isValid ? '正常' : '要確認'}\n`;
    
    if (validation.missingApiKey) {
      message += '\n■ 追加設定が必要:\n';
      message += '• Gemini APIキーの設定\n';
      message += '  プロジェクト設定 → スクリプト属性で設定してください\n';
      message += '  属性名: GEMINI_API_KEY\n';
    }
    
    if (validation.missingEmailConfig) {
      message += '• メール送信先の設定\n';
      message += '  属性名: EMAIL_RECIPIENTS\n';
    }
    
    message += '\n次のステップ:\n';
    message += '1. 必要な場合、APIキーを設定\n';
    message += '2. 「設定検証」メニューで確認\n';
    message += '3. 「PDF統合送信」でテスト実行\n';
    
    ui.alert('初期設定完了', message, ui.ButtonSet.OK);
    
    Logger.info('Initial configuration completed successfully', {
      validation: validation
    });
    
  } catch (error) {
    Logger.error('Initial configuration failed', {
      error: error.message
    });
    
    SpreadsheetApp.getUi().alert(
      '初期設定エラー',
      `初期設定中にエラーが発生しました:\n${error.message}\n\n` +
      'ログを確認して、必要に応じて手動で設定してください。',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
    throw error;
  }
}

/**
 * 초기 설정 함수 (UI 없는 버전)
 * Apps Script 에디터에서 직접 실행할 때 사용
 */
function setupInitialConfigurationHeadless() {
  try {
    Logger.info('Starting initial system configuration (headless mode)');
    
    ConfigManager.initializeConfig();
    Logger.startNewSession();
    Logger.info('Initial configuration started (headless)');
    
    const validation = ConfigManager.validate();
    
    Logger.info('Initial configuration completed successfully (headless)', {
      validation: validation
    });
    
    return {
      success: true,
      validation: validation,
      message: '初期設定が完了しました。コンソールログを確認してください。'
    };
    
  } catch (error) {
    Logger.error('Initial configuration failed (headless)', {
      error: error.message
    });
    
    return {
      success: false,
      error: error.message,
      message: 'エラーが発生しました。コンソールログを確認してください。'
    };
  }
}

/**
 * API 키 설정 도우미 함수
 * Gemini API 키를 쉽게 설정할 수 있는 함수
 */
function setGeminiApiKey() {
  try {
    const ui = SpreadsheetApp.getUi();
    const response = ui.prompt(
      'Gemini APIキー設定',
      'Gemini APIキーを入力してください:\n' +
      '(Google AI Studioで取得できます)',
      ui.ButtonSet.OK_CANCEL
    );
    
    if (response.getSelectedButton() === ui.Button.OK) {
      const apiKey = response.getResponseText().trim();
      
      if (apiKey.length > 0) {
        PropertiesService.getScriptProperties().setProperty('GEMINI_API_KEY', apiKey);
        
        ui.alert(
          'APIキー設定完了',
          'Gemini APIキーが正常に設定されました。',
          ui.ButtonSet.OK
        );
        
        Logger.info('Gemini API key configured successfully');
        
        validateConfiguration();
        
      } else {
        ui.alert('APIキーが入力されませんでした。');
      }
    }
    
  } catch (error) {
    Logger.error('API key setup failed', {
      error: error.message
    });
    
    SpreadsheetApp.getUi().alert(
      'APIキー設定エラー',
      `APIキーの設定に失敗しました: ${error.message}`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

/**
 * 이메일 수신자 설정 도우미 함수
 */
function setEmailRecipients() {
  try {
    const ui = SpreadsheetApp.getUi();
    const response = ui.prompt(
      'メール送信先設定',
      'メール送信先を入力してください:\n' +
      '(複数の場合はカンマで区切り)\n' +
      '例: user1@example.com, user2@example.com',
      ui.ButtonSet.OK_CANCEL
    );
    
    if (response.getSelectedButton() === ui.Button.OK) {
      const recipients = response.getResponseText().trim();
      
      if (recipients.length > 0) {
        PropertiesService.getScriptProperties().setProperty('EMAIL_RECIPIENTS', recipients);
        
        ui.alert(
          'メール送信先設定完了',
          `送信先が設定されました:\n${recipients}`,
          ui.ButtonSet.OK
        );
        
        Logger.info('Email recipients configured successfully', {
          recipients: recipients
        });
        
        validateConfiguration();
        
      } else {
        ui.alert('メール送信先が入力されませんでした。');
      }
    }
    
  } catch (error) {
    Logger.error('Email recipients setup failed', {
      error: error.message
    });
    
    SpreadsheetApp.getUi().alert(
      'メール送信先設定エラー',
      `メール送信先の設定に失敗しました: ${error.message}`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}