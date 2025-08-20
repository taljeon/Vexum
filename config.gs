/**
 * config.gs - 설정 및 상수 관리
 * 시스템 전체에서 사용하는 설정값과 상수 정의
 * 
 * @version 2.0
 * @author Google Apps Script System
 * @updated 2024
 */

// Global Configuration Constants
const CONFIG = {
  // Execution and batch settings
  EXECUTION: {
    MAX_TIME_MS: 4 * 60 * 1000,           // 4분 (설정 가능)
    BATCH_SIZE: 3,                        // 배치 크기 (설정 가능)
    MAX_RETRIES: 3,                       // 최대 재시도 횟수
    BATCH_DELAY_MS: 2000,                 // 배치 간 대기시간 (ms)
    TRIGGER_INTERVAL_MINUTES: 5,          // 자동 실행 간격 (분)
    RATE_LIMIT_BACKOFF_BASE_MS: 1000,     // Rate limit 백오프 기본 시간
    HEALTH_CHECK_INTERVAL_HOURS: 24       // 시스템 상태 체크 간격 (시간)
  },
  
  // Text processing settings
  TEXT: {
    SUMMARY_MAX_LENGTH: 150,              // 요약 최대 길이
    MAX_TEXT_LENGTH: 8000,                // API 전송 최대 텍스트 길이
    SAMPLING_RATIO: 0.7,                  // 긴 텍스트 샘플링 비율 (70%)
    MIN_TEXT_LENGTH: 50,                  // 최소 텍스트 길이
    TRUNCATION_INDICATOR: '\n\n[文書の一部を要約用に抽出]'
  },
  
  // Email settings
  EMAIL: {
    MAX_ATTACHMENTS_PER_EMAIL: 25,        // Gmail 첨부파일 제한
    MAX_EMAIL_SIZE_MB: 25,                // 최대 이메일 크기 (MB)
    MAX_SUBJECT_LENGTH: 100,              // 제목 최대 길이
    DAILY_EMAIL_LIMIT: 1500,              // Gmail 일일 전송 제한
    RETRY_DELAY_MS: 3000                  // 메일 전송 재시도 대기시간
  },
  
  // Logging and monitoring
  LOGGING: {
    ERROR_SHEET_NAME: 'ErrorLog',         // 에러 로그 시트명
    MAX_LOG_ENTRIES: 1000,                // 최대 로그 항목 수
    LOG_CLEANUP_BATCH_SIZE: 100,          // 로그 정리 시 삭제할 행 수
    SESSION_TIMEOUT_HOURS: 24,            // 세션 타임아웃 (시간)
    PERFORMANCE_LOG_ENABLED: true         // 성능 로그 활성화 여부
  },
  
  // API settings
  API: {
    GEMINI_TIMEOUT_MS: 30000,             // Gemini API 타임아웃 (30초)
    TOKEN_COST_PER_MILLION: 3.5,          // 백만 토큰당 비용 (USD)
    ESTIMATED_CHARS_PER_TOKEN_JP: 1.5,    // 일본어 문자당 토큰 추정치
    ESTIMATED_CHARS_PER_TOKEN_EN: 4,      // 영어 문자당 토큰 추정치
    RATE_LIMIT_BUFFER_RATIO: 0.8          // Rate limit 버퍼 비율
  },
  
  // Email delivery modes
  EMAIL_MODE: {
    INDIVIDUAL: 'individual',             // 시트별 개별 발송
    CONSOLIDATED: 'consolidated',         // 통합 발송 (권장)
    ERRORS_ONLY: 'errors_only'           // 실패만 보고
  },
  
  // System status
  SYSTEM_STATUS: {
    HEALTHY: 'HEALTHY',
    WARNING: 'WARNING', 
    CRITICAL: 'CRITICAL',
    ERROR: 'ERROR'
  }
};

// Error type definitions
const ERROR_TYPES = {
  TEMPORARY: 'TEMPORARY',                 // 일시적 에러 (재시도 가능)
  PERMANENT: 'PERMANENT',                 // 영구적 에러 (재시도 불가)
  RATE_LIMIT: 'RATE_LIMIT',              // API 제한 에러
  PERMISSION: 'PERMISSION',               // 권한 에러
  NETWORK: 'NETWORK',                     // 네트워크 에러
  VALIDATION: 'VALIDATION',               // 데이터 검증 에러
  CONFIGURATION: 'CONFIGURATION'          // 설정 에러
};

// Log level definitions
const LOG_LEVELS = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  CRITICAL: 'CRITICAL'
};

/**
 * 안전한 API 키 관리 함수들
 */

/**
 * Gemini API 키를 안전하게 가져오기
 * @returns {string} API 키
 */
function getGeminiApiKey() {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not found in Script Properties. Please configure it in Apps Script project settings.');
  }
  return apiKey;
}

/**
 * 이메일 설정을 안전하게 가져오기
 * @returns {Object} 이메일 설정
 */
function getEmailConfig() {
  const properties = PropertiesService.getScriptProperties();
  const recipients = properties.getProperty('EMAIL_RECIPIENTS') || properties.getProperty('MAIL_TO');
  const subject = properties.getProperty('EMAIL_SUBJECT') || properties.getProperty('MAIL_SUBJECT');
  
  if (!recipients) {
    throw new Error('EMAIL_RECIPIENTS not found in Script Properties. Please configure email recipients.');
  }
  
  return {
    recipients: recipients,
    subject: subject || 'PDF処理結果報告',
    adminEmail: properties.getProperty('ADMIN_EMAIL') || recipients.split(',')[0].trim()
  };
}

/**
 * 설정 관리 클래스 (개선된 버전)
 */
class ConfigManager {
  /**
   * 필수 설정 항목들
   */
  static get REQUIRED_PROPERTIES() {
    return ['GEMINI_API_KEY', 'EMAIL_RECIPIENTS'];
  }
  
  /**
   * 선택적 설정 항목들
   */
  static get OPTIONAL_PROPERTIES() {
    return [
      'ADMIN_EMAIL', 
      'EMAIL_MODE',
      'EXECUTION_MAX_TIME_MINUTES',
      'BATCH_SIZE',
      'TRIGGER_INTERVAL_MINUTES',
      'MAX_TEXT_LENGTH',
      'SUMMARY_MAX_LENGTH'
    ];
  }
  
  /**
   * 기본값 설정
   */
  static get DEFAULT_VALUES() {
    return {
      EMAIL_MODE: CONFIG.EMAIL_MODE.CONSOLIDATED,
      EXECUTION_MAX_TIME_MINUTES: 4,
      BATCH_SIZE: 3,
      TRIGGER_INTERVAL_MINUTES: 5,
      MAX_TEXT_LENGTH: 8000,
      SUMMARY_MAX_LENGTH: 150
    };
  }
  
  /**
   * 설정 검증 (개선된 버전)
   */
  static validate() {
    try {
      const properties = PropertiesService.getScriptProperties();
      const missing = [];
      const warnings = [];
      
      // 필수 설정 확인
      this.REQUIRED_PROPERTIES.forEach(prop => {
        if (!properties.getProperty(prop)) {
          missing.push(prop);
        }
      });
      
      if (missing.length > 0) {
        throw new Error(`必須設定が不足しています: ${missing.join(', ')}`);
      }
      
      // 선택적 설정 기본값 설정
      this.setDefaultValues();
      
      // Gemini API 키 테스트
      const apiKey = properties.getProperty('GEMINI_API_KEY');
      const apiTest = this.testGeminiApiKey(apiKey);
      if (!apiTest.success) {
        warnings.push(`Gemini API警告: ${apiTest.message}`);
      }
      
      // 설정값 검증
      const validationResults = this.validateConfigValues();
      warnings.push(...validationResults.warnings);
      
      // 에러 로그 시트 초기화
      Logger.initializeErrorLogSheet();
      
      // 검증 결과 표시
      const emailMode = this.getEmailMode();
      const executionSettings = this.getExecutionSettings();
      
      let message = '設定検証完了\n\n';
      message += `送信モード: ${emailMode}\n`;
      message += `実行時間制限: ${executionSettings.maxTimeMinutes}分\n`;
      message += `バッチサイズ: ${executionSettings.batchSize}\n`;
      message += `トリガー間隔: ${executionSettings.triggerIntervalMinutes}分\n`;
      
      if (warnings.length > 0) {
        message += '\n警告:\n';
        warnings.forEach(warning => {
          message += `• ${warning}\n`;
        });
      }
      
      message += '\n設定変更は「設定変更」メニューから可能です。';
      
      SpreadsheetApp.getUi().alert(message);
      
      Logger.info('Configuration validation completed', {
        emailMode,
        executionSettings,
        warningCount: warnings.length
      });
      
    } catch (error) {
      Logger.error('Configuration validation failed', { error: error.message });
      SpreadsheetApp.getUi().alert('設定エラー: ' + error.message);
      throw error;
    }
  }
  
  /**
   * 기본값 설정
   */
  static setDefaultValues() {
    const properties = PropertiesService.getScriptProperties();
    
    Object.entries(this.DEFAULT_VALUES).forEach(([key, value]) => {
      if (!properties.getProperty(key)) {
        properties.setProperty(key, value.toString());
        Logger.info(`Default value set for ${key}`, { value });
      }
    });
  }
  
  /**
   * 설정값 검증
   */
  static validateConfigValues() {
    const properties = PropertiesService.getScriptProperties();
    const warnings = [];
    
    // 실행 시간 제한 검증
    const maxTimeMinutes = parseInt(properties.getProperty('EXECUTION_MAX_TIME_MINUTES')) || 4;
    if (maxTimeMinutes < 1 || maxTimeMinutes > 30) {
      warnings.push('실行時間制限は1-30分の範囲で設定してください');
    }
    
    // 배치 크기 검증
    const batchSize = parseInt(properties.getProperty('BATCH_SIZE')) || 3;
    if (batchSize < 1 || batchSize > 10) {
      warnings.push('バッチサイズは1-10の範囲で設定してください');
    }
    
    // 트리거 간격 검증
    const triggerInterval = parseInt(properties.getProperty('TRIGGER_INTERVAL_MINUTES')) || 5;
    if (triggerInterval < 1 || triggerInterval > 60) {
      warnings.push('トリガー間隔は1-60分の範囲で設定してください');
    }
    
    // 텍스트 길이 검증
    const maxTextLength = parseInt(properties.getProperty('MAX_TEXT_LENGTH')) || 8000;
    if (maxTextLength < 1000 || maxTextLength > 50000) {
      warnings.push('最大テキスト長は1000-50000文字の範囲で設定してください');
    }
    
    return { warnings };
  }
  
  /**
   * Gemini API 키 테스트 (개선된 버전)
   */
  static testGeminiApiKey(apiKey) {
    try {
      if (!apiKey || apiKey.length < 20) {
        return {
          success: false,
          message: 'API키가 너무 짧습니다'
        };
      }
      
      const testPayload = {
        contents: [{ parts: [{ text: "テスト" }] }]
      };
      
      const response = GeminiAPI.callWithRetry(apiKey, testPayload, 1);
      if (!response) {
        return {
          success: false,
          message: 'API 응답이 없습니다'
        };
      }
      
      return {
        success: true,
        message: 'API키가 정상입니다'
      };
      
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }
  
  /**
   * 실행 설정 가져오기
   */
  static getExecutionSettings() {
    const properties = PropertiesService.getScriptProperties();
    
    return {
      maxTimeMinutes: parseInt(properties.getProperty('EXECUTION_MAX_TIME_MINUTES')) || 4,
      maxTimeMs: (parseInt(properties.getProperty('EXECUTION_MAX_TIME_MINUTES')) || 4) * 60 * 1000,
      batchSize: parseInt(properties.getProperty('BATCH_SIZE')) || 3,
      triggerIntervalMinutes: parseInt(properties.getProperty('TRIGGER_INTERVAL_MINUTES')) || 5,
      maxRetries: CONFIG.EXECUTION.MAX_RETRIES,
      batchDelayMs: CONFIG.EXECUTION.BATCH_DELAY_MS
    };
  }
  
  /**
   * 텍스트 설정 가져오기
   */
  static getTextSettings() {
    const properties = PropertiesService.getScriptProperties();
    
    return {
      summaryMaxLength: parseInt(properties.getProperty('SUMMARY_MAX_LENGTH')) || CONFIG.TEXT.SUMMARY_MAX_LENGTH,
      maxTextLength: parseInt(properties.getProperty('MAX_TEXT_LENGTH')) || CONFIG.TEXT.MAX_TEXT_LENGTH,
      samplingRatio: CONFIG.TEXT.SAMPLING_RATIO,
      minTextLength: CONFIG.TEXT.MIN_TEXT_LENGTH,
      truncationIndicator: CONFIG.TEXT.TRUNCATION_INDICATOR
    };
  }
  
  /**
   * 필수 속성 검증
   */
  static validateRequiredProperties() {
    const properties = PropertiesService.getScriptProperties();
    const missing = this.REQUIRED_PROPERTIES.filter(prop => !properties.getProperty(prop));
    
    if (missing.length > 0) {
      throw new Error(`スクリプトプロパティが未設定: ${missing.join(', ')}`);
    }
  }
  
  /**
   * 현재 이메일 모드 가져오기
   */
  static getEmailMode() {
    return PropertiesService.getScriptProperties().getProperty('EMAIL_MODE') || CONFIG.EMAIL_MODE.CONSOLIDATED;
  }
  
  /**
   * API 설정 가져오기 (안전한 방식)
   */
  static getApiConfig() {
    try {
      const apiKey = getGeminiApiKey();
      return {
        apiKey: apiKey,
        maxTokens: CONFIG.API.GEMINI_TIMEOUT_MS / 1000, // Convert to reasonable token estimate
        maxRetries: CONFIG.EXECUTION.MAX_RETRIES,
        retryDelay: CONFIG.EXECUTION.RATE_LIMIT_BACKOFF_BASE_MS,
        pricePerToken: CONFIG.API.TOKEN_COST_PER_MILLION / 1000000,
        timeout: CONFIG.API.GEMINI_TIMEOUT_MS
      };
    } catch (error) {
      Logger.error('Failed to get API configuration', { error: error.message });
      throw new Error('API configuration error: ' + error.message);
    }
  }
  
  /**
   * 이메일 설정 가져오기 (안전한 방식)
   */
  static getEmailConfig() {
    try {
      return getEmailConfig();
    } catch (error) {
      Logger.error('Failed to get email configuration', { error: error.message });
      throw new Error('Email configuration error: ' + error.message);
    }
  }
  
  /**
   * 이메일 모드 설정
   */
  static setEmailMode(mode) {
    if (!Object.values(CONFIG.EMAIL_MODE).includes(mode)) {
      throw new Error(`Invalid email mode: ${mode}`);
    }
    PropertiesService.getScriptProperties().setProperty('EMAIL_MODE', mode);
    Logger.info('Email mode updated', { newMode: mode });
  }
  
  /**
   * 모든 설정 가져오기
   */
  static getAllSettings() {
    const properties = PropertiesService.getScriptProperties();
    const settings = {};
    
    [...this.REQUIRED_PROPERTIES, ...this.OPTIONAL_PROPERTIES].forEach(prop => {
      settings[prop] = properties.getProperty(prop);
    });
    
    return settings;
  }
  
  /**
   * 설정 업데이트
   */
  static updateSettings(newSettings) {
    const properties = PropertiesService.getScriptProperties();
    const updatedKeys = [];
    
    Object.entries(newSettings).forEach(([key, value]) => {
      if ([...this.REQUIRED_PROPERTIES, ...this.OPTIONAL_PROPERTIES].includes(key)) {
        properties.setProperty(key, value.toString());
        updatedKeys.push(key);
      }
    });
    
    Logger.info('Settings updated', { updatedKeys, settingsCount: updatedKeys.length });
    
    return updatedKeys;
  }
  
  /**
   * 설정 초기화 (기본값으로)
   */
  static resetToDefaults() {
    const properties = PropertiesService.getScriptProperties();
    
    // 필수 설정은 유지하고 선택적 설정만 초기화
    this.OPTIONAL_PROPERTIES.forEach(prop => {
      if (this.DEFAULT_VALUES[prop] !== undefined) {
        properties.setProperty(prop, this.DEFAULT_VALUES[prop].toString());
      } else {
        properties.deleteProperty(prop);
      }
    });
    
    Logger.info('Settings reset to defaults');
  }
  
  /**
   * 설정 상태 체크
   */
  static getConfigurationHealth() {
    try {
      const settings = this.getAllSettings();
      const health = {
        status: CONFIG.SYSTEM_STATUS.HEALTHY,
        issues: [],
        warnings: []
      };
      
      // 필수 설정 확인
      this.REQUIRED_PROPERTIES.forEach(prop => {
        if (!settings[prop]) {
          health.status = CONFIG.SYSTEM_STATUS.ERROR;
          health.issues.push(`필수 설정 누락: ${prop}`);
        }
      });
      
      // API 키 유효성 간단 확인
      if (settings.GEMINI_API_KEY && settings.GEMINI_API_KEY.length < 20) {
        health.status = CONFIG.SYSTEM_STATUS.WARNING;
        health.warnings.push('Gemini API 키가 너무 짧습니다');
      }
      
      // 이메일 주소 형식 확인
      if (settings.MAIL_TO && !settings.MAIL_TO.includes('@')) {
        health.status = CONFIG.SYSTEM_STATUS.WARNING;
        health.warnings.push('메일 주소 형식이 올바르지 않을 수 있습니다');
      }
      
      return health;
      
    } catch (error) {
      return {
        status: CONFIG.SYSTEM_STATUS.ERROR,
        issues: [error.message]
      };
    }
  }
}

/**
 * 설정 헬퍼 함수들
 */
class ConfigHelper {
  /**
   * 동적 설정값 계산
   */
  static calculateDynamicLimits(sheetCount) {
    const baseSettings = ConfigManager.getExecutionSettings();
    
    // 시트 수에 따른 동적 배치 크기 조정
    let optimalBatchSize = baseSettings.batchSize;
    if (sheetCount > 20) {
      optimalBatchSize = Math.min(5, baseSettings.batchSize + 1);
    } else if (sheetCount < 5) {
      optimalBatchSize = Math.max(1, baseSettings.batchSize - 1);
    }
    
    // 예상 실행 시간 계산
    const avgProcessingTimePerSheet = 15000; // 15초 추정
    const estimatedTotalTime = (sheetCount / optimalBatchSize) * avgProcessingTimePerSheet;
    
    return {
      recommendedBatchSize: optimalBatchSize,
      estimatedExecutionTimeMs: estimatedTotalTime,
      willExceedTimeLimit: estimatedTotalTime > baseSettings.maxTimeMs,
      recommendations: this.generateRecommendations(sheetCount, estimatedTotalTime, baseSettings.maxTimeMs)
    };
  }
  
  /**
   * 추천사항 생성
   */
  static generateRecommendations(sheetCount, estimatedTime, maxTime) {
    const recommendations = [];
    
    if (estimatedTime > maxTime) {
      recommendations.push('実行時間制限を超える可能性があります。バッチサイズを増やすか、実行時間制限を늘려주세요。');
    }
    
    if (sheetCount > 50) {
      recommendations.push('シート数が多습니다. "統合送信" 모드를 강력히 권장합니다.');
    }
    
    if (sheetCount > 100) {
      recommendations.push('非常に多くのシートがあります。처리 시간이 오래 걸릴 수 있습니다.');
    }
    
    return recommendations;
  }
}