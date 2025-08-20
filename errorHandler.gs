/**
 * errorHandler.gs - 에러 분류 및 처리 모듈
 * 에러 분석, 자동 복구, 에러 통계 관리
 * 
 * @version 2.0
 * @author Google Apps Script System
 * @updated 2024
 */

/**
 * 에러 처리 관리 클래스
 */
class ErrorHandler {
  
  /**
   * 에러 분류 및 분석 (메인 함수)
   * @param {Error} error - 분류할 에러 객체
   * @param {string} context - 에러 발생 컨텍스트
   * @returns {Object} 에러 분류 정보
   */
  static classifyError(error, context = 'unknown') {
    try {
      const errorMessage = error.message || error.toString() || 'Unknown error';
      const classification = {
        originalError: errorMessage,
        context: context,
        category: 'unknown',
        severity: 'medium',
        recoverable: false,
        recoveryStrategy: null,
        autoRetry: false,
        estimatedRecoveryTime: 0,
        userAction: null,
        systemAction: null,
        relatedComponents: [],
        timestamp: new Date().toISOString()
      };
      
      // 기본 분류 실행
      this._classifyByMessage(classification, errorMessage);
      this._classifyByContext(classification, context);
      this._determineSeverity(classification);
      this._determineRecoveryStrategy(classification);
      
      // 분류 결과 로깅
      Logger.debug('Error classified', classification);
      
      // 에러 통계 업데이트
      this._updateErrorClassificationStats(classification);
      
      return classification;
      
    } catch (classificationError) {
      Logger.error('Error classification failed', {
        originalError: error.message,
        classificationError: classificationError.message
      });
      
      // 분류 실패 시 기본 정보 반환
      return {
        originalError: error.message || 'Unknown error',
        context: context,
        category: 'classification_failed',
        severity: 'high',
        recoverable: false,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  /**
   * 메시지 기반 에러 분류
   * @private
   */
  static _classifyByMessage(classification, message) {
    const lowerMessage = message.toLowerCase();
    
    // API 관련 에러
    if (lowerMessage.includes('api') || lowerMessage.includes('gemini') || lowerMessage.includes('request failed')) {
      classification.category = 'api_error';
      classification.relatedComponents = ['gemini_api', 'network'];
      
      if (lowerMessage.includes('quota') || lowerMessage.includes('rate limit')) {
        classification.category = 'api_quota_exceeded';
        classification.recoverable = true;
        classification.autoRetry = true;
        classification.estimatedRecoveryTime = 60000; // 1분
      } else if (lowerMessage.includes('timeout')) {
        classification.category = 'api_timeout';
        classification.recoverable = true;
        classification.autoRetry = true;
        classification.estimatedRecoveryTime = 5000; // 5초
      } else if (lowerMessage.includes('unauthorized') || lowerMessage.includes('api key')) {
        classification.category = 'api_authentication';
        classification.recoverable = false;
        classification.severity = 'high';
      }
    }
    
    // PDF 관련 에러
    else if (lowerMessage.includes('pdf') || lowerMessage.includes('export')) {
      classification.category = 'pdf_error';
      classification.relatedComponents = ['document_processor', 'drive_api'];
      
      if (lowerMessage.includes('permission') || lowerMessage.includes('access')) {
        classification.category = 'pdf_permission_error';
        classification.recoverable = false;
        classification.severity = 'high';
      } else if (lowerMessage.includes('size') || lowerMessage.includes('limit')) {
        classification.category = 'pdf_size_error';
        classification.recoverable = true;
      }
    }
    
    // 이메일 관련 에러
    else if (lowerMessage.includes('email') || lowerMessage.includes('gmail') || lowerMessage.includes('mail')) {
      classification.category = 'email_error';
      classification.relatedComponents = ['gmail_api', 'email_sender'];
      
      if (lowerMessage.includes('quota') || lowerMessage.includes('limit')) {
        classification.category = 'email_quota_exceeded';
        classification.recoverable = true;
        classification.estimatedRecoveryTime = 86400000; // 24시간
      } else if (lowerMessage.includes('attachment') || lowerMessage.includes('size')) {
        classification.category = 'email_attachment_error';
        classification.recoverable = true;
      }
    }
    
    // 권한 관련 에러
    else if (lowerMessage.includes('permission') || lowerMessage.includes('access') || lowerMessage.includes('denied')) {
      classification.category = 'permission_error';
      classification.severity = 'high';
      classification.recoverable = false;
      classification.relatedComponents = ['script_permissions', 'drive_access'];
    }
    
    // 네트워크 관련 에러
    else if (lowerMessage.includes('network') || lowerMessage.includes('connection') || lowerMessage.includes('fetch')) {
      classification.category = 'network_error';
      classification.recoverable = true;
      classification.autoRetry = true;
      classification.estimatedRecoveryTime = 10000; // 10초
      classification.relatedComponents = ['network', 'external_api'];
    }
    
    // 타임아웃 관련 에러
    else if (lowerMessage.includes('timeout') || lowerMessage.includes('time') || lowerMessage.includes('exceeded maximum execution time')) {
      classification.category = 'timeout_error';
      classification.recoverable = true;
      classification.relatedComponents = ['execution_time', 'script_runtime'];
    }
    
    // 메모리 관련 에러
    else if (lowerMessage.includes('memory') || lowerMessage.includes('heap') || lowerMessage.includes('out of memory')) {
      classification.category = 'memory_error';
      classification.severity = 'high';
      classification.recoverable = true;
      classification.relatedComponents = ['script_runtime', 'text_optimizer'];
    }
    
    // 설정 관련 에러
    else if (lowerMessage.includes('config') || lowerMessage.includes('property') || lowerMessage.includes('setting')) {
      classification.category = 'configuration_error';
      classification.severity = 'medium';
      classification.recoverable = false;
      classification.relatedComponents = ['config_manager'];
    }
    
    // 데이터 관련 에러
    else if (lowerMessage.includes('null') || lowerMessage.includes('undefined') || lowerMessage.includes('invalid')) {
      classification.category = 'data_error';
      classification.recoverable = true;
      classification.relatedComponents = ['data_processing'];
    }
    
    // 스크립트 에러
    else if (lowerMessage.includes('script') || lowerMessage.includes('function') || lowerMessage.includes('reference')) {
      classification.category = 'script_error';
      classification.severity = 'high';
      classification.recoverable = false;
      classification.relatedComponents = ['script_runtime'];
    }
  }
  
  /**
   * 컨텍스트 기반 에러 분류
   * @private
   */
  static _classifyByContext(classification, context) {
    switch (context) {
      case 'gemini_api':
        if (classification.category === 'unknown') {
          classification.category = 'api_error';
        }
        classification.relatedComponents.push('gemini_api');
        break;
        
      case 'document_processing':
        if (classification.category === 'unknown') {
          classification.category = 'document_processing_error';
        }
        classification.relatedComponents.push('document_processor');
        break;
        
      case 'email_sending':
        if (classification.category === 'unknown') {
          classification.category = 'email_error';
        }
        classification.relatedComponents.push('email_sender');
        break;
        
      case 'trigger_execution':
        classification.relatedComponents.push('trigger_manager');
        break;
        
      case 'text_optimization':
        classification.relatedComponents.push('text_optimizer');
        break;
        
      case 'performance_analysis':
        classification.relatedComponents.push('performance_analyzer');
        break;
    }
  }
  
  /**
   * 심각도 결정
   * @private
   */
  static _determineSeverity(classification) {
    // 치명적 에러 패턴
    const criticalPatterns = [
      'api key', 'authentication', 'permission denied', 
      'script error', 'fatal', 'critical', 'security'
    ];
    
    // 높은 심각도 패턴
    const highSeverityPatterns = [
      'memory', 'heap', 'execution time exceeded', 
      'configuration', 'invalid', 'corrupted'
    ];
    
    // 낮은 심각도 패턴
    const lowSeverityPatterns = [
      'temporary', 'retry', 'warning', 'minor'
    ];
    
    const message = classification.originalError.toLowerCase();
    
    if (criticalPatterns.some(pattern => message.includes(pattern))) {
      classification.severity = 'critical';
    } else if (highSeverityPatterns.some(pattern => message.includes(pattern))) {
      classification.severity = 'high';
    } else if (lowSeverityPatterns.some(pattern => message.includes(pattern))) {
      classification.severity = 'low';
    } else {
      // 카테고리별 기본 심각도
      switch (classification.category) {
        case 'api_authentication':
        case 'permission_error':
        case 'script_error':
          classification.severity = 'critical';
          break;
          
        case 'memory_error':
        case 'configuration_error':
          classification.severity = 'high';
          break;
          
        case 'timeout_error':
        case 'network_error':
          classification.severity = 'low';
          break;
          
        default:
          classification.severity = 'medium';
      }
    }
  }
  
  /**
   * 복구 전략 결정
   * @private
   */
  static _determineRecoveryStrategy(classification) {
    switch (classification.category) {
      case 'api_quota_exceeded':
        classification.recoverable = true;
        classification.recoveryStrategy = 'wait_and_retry';
        classification.autoRetry = true;
        classification.estimatedRecoveryTime = 3600000; // 1시간
        classification.userAction = 'API 사용량 확인';
        classification.systemAction = '1시간 후 자동 재시도';
        break;
        
      case 'api_timeout':
        classification.recoverable = true;
        classification.recoveryStrategy = 'immediate_retry';
        classification.autoRetry = true;
        classification.estimatedRecoveryTime = 5000; // 5초
        classification.userAction = 'ネットワーク状態 확인';
        classification.systemAction = '5초 후 자동 재시도';
        break;
        
      case 'api_authentication':
        classification.recoverable = false;
        classification.recoveryStrategy = 'manual_intervention';
        classification.userAction = 'APIキーの確認・更新';
        classification.systemAction = '自動実行停止';
        break;
        
      case 'email_quota_exceeded':
        classification.recoverable = true;
        classification.recoveryStrategy = 'wait_and_retry';
        classification.estimatedRecoveryTime = 86400000; // 24시간
        classification.userAction = 'Gmail 送信制限確認';
        classification.systemAction = '翌日自動再開';
        break;
        
      case 'email_attachment_error':
        classification.recoverable = true;
        classification.recoveryStrategy = 'reduce_attachment_size';
        classification.userAction = '添付ファイルサイズ確認';
        classification.systemAction = '添付ファイル数削減・統合送信';
        break;
        
      case 'timeout_error':
        classification.recoverable = true;
        classification.recoveryStrategy = 'reduce_processing_load';
        classification.userAction = '処理対象の削減検討';
        classification.systemAction = 'バッチサイズ自動調整';
        break;
        
      case 'memory_error':
        classification.recoverable = true;
        classification.recoveryStrategy = 'reduce_memory_usage';
        classification.userAction = 'データサイズ確認';
        classification.systemAction = 'テキスト最適化強化';
        break;
        
      case 'network_error':
        classification.recoverable = true;
        classification.recoveryStrategy = 'exponential_backoff';
        classification.autoRetry = true;
        classification.estimatedRecoveryTime = 10000; // 10초
        classification.userAction = 'インターネット接続確認';
        classification.systemAction = '指数バックオフで再試行';
        break;
        
      case 'permission_error':
        classification.recoverable = false;
        classification.recoveryStrategy = 'manual_intervention';
        classification.userAction = 'スクリプト権限・ファイル共有設定確認';
        classification.systemAction = '自動実行停止';
        break;
        
      case 'configuration_error':
        classification.recoverable = false;
        classification.recoveryStrategy = 'manual_intervention';
        classification.userAction = '設定値の確認・修正';
        classification.systemAction = '設定検証実行';
        break;
        
      case 'data_error':
        classification.recoverable = true;
        classification.recoveryStrategy = 'data_validation';
        classification.userAction = 'スプレッドシートデータ確認';
        classification.systemAction = 'データ検証強化';
        break;
        
      default:
        classification.recoverable = false;
        classification.recoveryStrategy = 'manual_investigation';
        classification.userAction = 'ログの詳細確認';
        classification.systemAction = 'エラー詳細ログ出力';
    }
  }
  
  /**
   * 자동 복구 시도
   * @param {Object} classification - 에러 분류 정보
   * @param {Object} originalContext - 원본 실행 컨텍스트
   * @returns {Object} 복구 시도 결과
   */
  static attemptAutoRecovery(classification, originalContext = {}) {
    try {
      Logger.info('Attempting auto recovery', {
        category: classification.category,
        strategy: classification.recoveryStrategy,
        context: originalContext
      });
      
      const recoveryResult = {
        attempted: true,
        strategy: classification.recoveryStrategy,
        success: false,
        message: '',
        retryRecommended: false,
        retryDelay: 0
      };
      
      switch (classification.recoveryStrategy) {
        case 'immediate_retry':
          recoveryResult.success = true;
          recoveryResult.retryRecommended = true;
          recoveryResult.retryDelay = 0;
          recoveryResult.message = '즉시 재시도 권장';
          break;
          
        case 'wait_and_retry':
          recoveryResult.success = true;
          recoveryResult.retryRecommended = true;
          recoveryResult.retryDelay = classification.estimatedRecoveryTime;
          recoveryResult.message = `${classification.estimatedRecoveryTime / 1000}초 대기 후 재시도`;
          break;
          
        case 'exponential_backoff':
          const backoffResult = this._performExponentialBackoff(originalContext);
          recoveryResult.success = backoffResult.success;
          recoveryResult.retryRecommended = backoffResult.success;
          recoveryResult.retryDelay = backoffResult.nextRetryDelay;
          recoveryResult.message = backoffResult.message;
          break;
          
        case 'reduce_attachment_size':
          const attachmentResult = this._reduceAttachmentLoad(originalContext);
          recoveryResult.success = attachmentResult.success;
          recoveryResult.retryRecommended = true;
          recoveryResult.retryDelay = 0;
          recoveryResult.message = attachmentResult.message;
          break;
          
        case 'reduce_processing_load':
          const processingResult = this._reduceProcessingLoad(originalContext);
          recoveryResult.success = processingResult.success;
          recoveryResult.retryRecommended = true;
          recoveryResult.retryDelay = 0;
          recoveryResult.message = processingResult.message;
          break;
          
        case 'reduce_memory_usage':
          const memoryResult = this._optimizeMemoryUsage(originalContext);
          recoveryResult.success = memoryResult.success;
          recoveryResult.retryRecommended = true;
          recoveryResult.retryDelay = 0;
          recoveryResult.message = memoryResult.message;
          break;
          
        case 'data_validation':
          const validationResult = this._performDataValidation(originalContext);
          recoveryResult.success = validationResult.success;
          recoveryResult.retryRecommended = validationResult.success;
          recoveryResult.message = validationResult.message;
          break;
          
        default:
          recoveryResult.success = false;
          recoveryResult.message = '자동 복구 전략이 없습니다';
      }
      
      // 복구 시도 결과 로깅
      Logger.info('Auto recovery attempt completed', recoveryResult);
      
      // 복구 통계 업데이트
      this._updateRecoveryStats(classification.category, recoveryResult.success);
      
      return recoveryResult;
      
    } catch (recoveryError) {
      Logger.error('Auto recovery attempt failed', {
        error: recoveryError.message,
        classification: classification.category
      });
      
      return {
        attempted: true,
        success: false,
        message: `복구 시도 중 에러 발생: ${recoveryError.message}`,
        retryRecommended: false
      };
    }
  }
  
  /**
   * 지수 백오프 수행
   * @private
   */
  static _performExponentialBackoff(context) {
    try {
      const retryKey = `retry_count_${context.operationType || 'unknown'}`;
      const properties = PropertiesService.getScriptProperties();
      const currentRetryCount = parseInt(properties.getProperty(retryKey) || '0');
      
      const maxRetries = 5;
      if (currentRetryCount >= maxRetries) {
        properties.deleteProperty(retryKey);
        return {
          success: false,
          message: `최대 재시도 횟수 (${maxRetries}) 초과`,
          nextRetryDelay: 0
        };
      }
      
      // 지수 백오프 계산: 2^attempt * 1000ms
      const nextRetryDelay = Math.pow(2, currentRetryCount) * 1000;
      
      // 재시도 카운트 증가
      properties.setProperty(retryKey, (currentRetryCount + 1).toString());
      
      return {
        success: true,
        message: `재시도 ${currentRetryCount + 1}/${maxRetries}`,
        nextRetryDelay: nextRetryDelay
      };
      
    } catch (error) {
      return {
        success: false,
        message: `백오프 처리 실패: ${error.message}`,
        nextRetryDelay: 5000
      };
    }
  }
  
  /**
   * 첨부파일 로드 감소
   * @private
   */
  static _reduceAttachmentLoad(context) {
    try {
      // 현재 이메일 모드를 통합 모드로 변경
      const properties = PropertiesService.getScriptProperties();
      const currentMode = properties.getProperty('EMAIL_MODE');
      
      if (currentMode !== CONFIG.EMAIL_MODE.CONSOLIDATED) {
        properties.setProperty('EMAIL_MODE', CONFIG.EMAIL_MODE.CONSOLIDATED);
        return {
          success: true,
          message: '이메일 모드를 통합 발송으로 변경하여 첨부파일 로드 감소'
        };
      }
      
      // 이미 통합 모드라면 첨부파일 개수 제한
      properties.setProperty('MAX_ATTACHMENTS_PER_EMAIL', '15'); // 기본 25에서 15로 감소
      
      return {
        success: true,
        message: '이메일당 최대 첨부파일 개수를 15개로 제한'
      };
      
    } catch (error) {
      return {
        success: false,
        message: `첨부파일 로드 감소 실패: ${error.message}`
      };
    }
  }
  
  /**
   * 처리 로드 감소
   * @private
   */
  static _reduceProcessingLoad(context) {
    try {
      const properties = PropertiesService.getScriptProperties();
      
      // 배치 크기 감소
      const currentBatchSize = parseInt(properties.getProperty('BATCH_SIZE') || '10');
      const newBatchSize = Math.max(1, Math.floor(currentBatchSize * 0.7));
      
      properties.setProperty('BATCH_SIZE', newBatchSize.toString());
      
      // 실행 시간 제한 감소
      const currentTimeLimit = parseInt(properties.getProperty('EXECUTION_TIME_LIMIT') || '240000');
      const newTimeLimit = Math.max(60000, Math.floor(currentTimeLimit * 0.8));
      
      properties.setProperty('EXECUTION_TIME_LIMIT', newTimeLimit.toString());
      
      return {
        success: true,
        message: `배치 크기를 ${newBatchSize}로, 시간 제한을 ${newTimeLimit/1000}초로 조정`
      };
      
    } catch (error) {
      return {
        success: false,
        message: `처리 로드 감소 실패: ${error.message}`
      };
    }
  }
  
  /**
   * 메모리 사용량 최적화
   * @private
   */
  static _optimizeMemoryUsage(context) {
    try {
      const properties = PropertiesService.getScriptProperties();
      
      // 텍스트 최적화 강화
      properties.setProperty('TEXT_OPTIMIZATION_LEVEL', 'aggressive');
      
      // 토큰 제한 강화
      const currentTokenLimit = parseInt(properties.getProperty('MAX_API_TOKENS') || '30000');
      const newTokenLimit = Math.max(10000, Math.floor(currentTokenLimit * 0.6));
      
      properties.setProperty('MAX_API_TOKENS', newTokenLimit.toString());
      
      // 메모리 집약적 기능 비활성화
      properties.setProperty('ENABLE_DETAILED_LOGGING', 'false');
      
      return {
        success: true,
        message: `메모리 최적화 모드 활성화, 토큰 제한을 ${newTokenLimit}로 조정`
      };
      
    } catch (error) {
      return {
        success: false,
        message: `메모리 최적화 실패: ${error.message}`
      };
    }
  }
  
  /**
   * 데이터 검증 수행
   * @private
   */
  static _performDataValidation(context) {
    try {
      // 스프레드시트 접근 가능성 확인
      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      if (!spreadsheet) {
        return {
          success: false,
          message: '스프레드시트에 접근할 수 없습니다'
        };
      }
      
      // 시트 존재 확인
      const sheets = spreadsheet.getSheets();
      if (sheets.length === 0) {
        return {
          success: false,
          message: '처리할 시트가 없습니다'
        };
      }
      
      // 빈 시트 확인
      let validSheets = 0;
      sheets.forEach(sheet => {
        const range = sheet.getDataRange();
        if (range.getNumRows() > 1 && range.getNumColumns() > 0) {
          validSheets++;
        }
      });
      
      if (validSheets === 0) {
        return {
          success: false,
          message: '유효한 데이터가 있는 시트가 없습니다'
        };
      }
      
      return {
        success: true,
        message: `데이터 검증 완료: ${validSheets}개의 유효한 시트 발견`
      };
      
    } catch (error) {
      return {
        success: false,
        message: `데이터 검증 실패: ${error.message}`
      };
    }
  }
  
  /**
   * 에러 분류 통계 업데이트
   * @private
   */
  static _updateErrorClassificationStats(classification) {
    try {
      const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
      const statsKey = `error_classification_stats_${today}`;
      
      const properties = PropertiesService.getScriptProperties();
      const stats = JSON.parse(properties.getProperty(statsKey) || '{}');
      
      // 카테고리별 통계
      if (!stats.byCategory) {
        stats.byCategory = {};
      }
      stats.byCategory[classification.category] = (stats.byCategory[classification.category] || 0) + 1;
      
      // 심각도별 통계
      if (!stats.bySeverity) {
        stats.bySeverity = {};
      }
      stats.bySeverity[classification.severity] = (stats.bySeverity[classification.severity] || 0) + 1;
      
      // 복구 가능성별 통계
      if (!stats.byRecoverability) {
        stats.byRecoverability = {};
      }
      const recoverabilityKey = classification.recoverable ? 'recoverable' : 'non_recoverable';
      stats.byRecoverability[recoverabilityKey] = (stats.byRecoverability[recoverabilityKey] || 0) + 1;
      
      // 전체 통계
      stats.totalErrors = (stats.totalErrors || 0) + 1;
      stats.lastUpdate = new Date().toISOString();
      
      properties.setProperty(statsKey, JSON.stringify(stats));
      
    } catch (error) {
      Logger.error('Failed to update error classification stats', {
        error: error.message
      });
    }
  }
  
  /**
   * 복구 통계 업데이트
   * @private
   */
  static _updateRecoveryStats(category, success) {
    try {
      const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
      const statsKey = `recovery_stats_${today}`;
      
      const properties = PropertiesService.getScriptProperties();
      const stats = JSON.parse(properties.getProperty(statsKey) || '{}');
      
      if (!stats[category]) {
        stats[category] = {
          attempts: 0,
          successes: 0,
          failures: 0
        };
      }
      
      stats[category].attempts++;
      if (success) {
        stats[category].successes++;
      } else {
        stats[category].failures++;
      }
      
      stats[category].successRate = (stats[category].successes / stats[category].attempts) * 100;
      
      properties.setProperty(statsKey, JSON.stringify(stats));
      
    } catch (error) {
      Logger.error('Failed to update recovery stats', {
        error: error.message
      });
    }
  }
  
  /**
   * 에러 분류 통계 조회
   */
  static getErrorClassificationStats() {
    try {
      const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
      const statsKey = `error_classification_stats_${today}`;
      
      const properties = PropertiesService.getScriptProperties();
      const stats = JSON.parse(properties.getProperty(statsKey) || '{}');
      
      return {
        date: today,
        totalErrors: stats.totalErrors || 0,
        byCategory: stats.byCategory || {},
        bySeverity: stats.bySeverity || {},
        byRecoverability: stats.byRecoverability || {},
        lastUpdate: stats.lastUpdate || null
      };
      
    } catch (error) {
      Logger.error('Failed to get error classification stats', {
        error: error.message
      });
      
      return {
        date: 'unknown',
        totalErrors: 0,
        error: error.message
      };
    }
  }
  
  /**
   * 복구 통계 조회
   */
  static getRecoveryStats() {
    try {
      const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
      const statsKey = `recovery_stats_${today}`;
      
      const properties = PropertiesService.getScriptProperties();
      const stats = JSON.parse(properties.getProperty(statsKey) || '{}');
      
      return {
        date: today,
        categories: stats
      };
      
    } catch (error) {
      Logger.error('Failed to get recovery stats', {
        error: error.message
      });
      
      return {
        date: 'unknown',
        error: error.message
      };
    }
  }
  
  /**
   * 에러 패턴 분석
   */
  static analyzeErrorPatterns() {
    try {
      const patterns = {
        frequentErrors: [],
        timeBasedPatterns: {},
        recoveryEffectiveness: {},
        recommendations: []
      };
      
      // 최근 7일간의 에러 분류 데이터 수집
      const classificationData = this._collectRecentClassificationData(7);
      
      if (classificationData.length === 0) {
        return patterns;
      }
      
      // 빈발 에러 패턴 분석
      patterns.frequentErrors = this._analyzeFrequentErrors(classificationData);
      
      // 시간대별 패턴 분석
      patterns.timeBasedPatterns = this._analyzeTimeBasedPatterns(classificationData);
      
      // 복구 효과성 분석
      patterns.recoveryEffectiveness = this._analyzeRecoveryEffectiveness();
      
      // 추천사항 생성
      patterns.recommendations = this._generatePatternRecommendations(patterns);
      
      return patterns;
      
    } catch (error) {
      Logger.error('Failed to analyze error patterns', {
        error: error.message
      });
      
      return {
        error: error.message
      };
    }
  }
  
  /**
   * 최근 분류 데이터 수집
   * @private
   */
  static _collectRecentClassificationData(days) {
    const data = [];
    const properties = PropertiesService.getScriptProperties();
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      
      const statsKey = `error_classification_stats_${dateStr}`;
      const dayStats = JSON.parse(properties.getProperty(statsKey) || '{}');
      
      if (dayStats.byCategory) {
        Object.entries(dayStats.byCategory).forEach(([category, count]) => {
          data.push({
            date: dateStr,
            category: category,
            count: count
          });
        });
      }
    }
    
    return data;
  }
  
  /**
   * 빈발 에러 분석
   * @private
   */
  static _analyzeFrequentErrors(data) {
    const categoryTotals = {};
    
    data.forEach(entry => {
      categoryTotals[entry.category] = (categoryTotals[entry.category] || 0) + entry.count;
    });
    
    return Object.entries(categoryTotals)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([category, count]) => ({
        category: category,
        count: count,
        percentage: (count / data.reduce((sum, entry) => sum + entry.count, 0)) * 100
      }));
  }
  
  /**
   * 시간대별 패턴 분석
   * @private
   */
  static _analyzeTimeBasedPatterns(data) {
    const patterns = {};
    
    // 날짜별 에러 발생량 분석
    data.forEach(entry => {
      if (!patterns[entry.date]) {
        patterns[entry.date] = {
          totalErrors: 0,
          categories: {}
        };
      }
      
      patterns[entry.date].totalErrors += entry.count;
      patterns[entry.date].categories[entry.category] = entry.count;
    });
    
    return patterns;
  }
  
  /**
   * 복구 효과성 분석
   * @private
   */
  static _analyzeRecoveryEffectiveness() {
    try {
      const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
      const properties = PropertiesService.getScriptProperties();
      
      const recoveryStats = JSON.parse(properties.getProperty(`recovery_stats_${today}`) || '{}');
      
      const effectiveness = {};
      
      Object.entries(recoveryStats).forEach(([category, stats]) => {
        if (stats.attempts > 0) {
          effectiveness[category] = {
            successRate: stats.successRate,
            totalAttempts: stats.attempts,
            effectivenessScore: this._calculateEffectivenessScore(stats)
          };
        }
      });
      
      return effectiveness;
      
    } catch (error) {
      Logger.error('Failed to analyze recovery effectiveness', {
        error: error.message
      });
      
      return {};
    }
  }
  
  /**
   * 효과성 점수 계산
   * @private
   */
  static _calculateEffectivenessScore(stats) {
    // 성공률 가중치 70%, 시도 횟수 가중치 30%
    const successWeight = 0.7;
    const attemptWeight = 0.3;
    
    const successScore = stats.successRate / 100;
    const attemptScore = Math.min(stats.attempts / 10, 1); // 최대 10회 시도까지 만점
    
    return (successScore * successWeight + attemptScore * attemptWeight) * 100;
  }
  
  /**
   * 패턴 기반 추천사항 생성
   * @private
   */
  static _generatePatternRecommendations(patterns) {
    const recommendations = [];
    
    // 빈발 에러 기반 추천
    if (patterns.frequentErrors.length > 0) {
      const topError = patterns.frequentErrors[0];
      
      if (topError.percentage > 50) {
        recommendations.push({
          priority: 'high',
          category: 'frequent_error',
          message: `${topError.category} 에러가 전체의 ${topError.percentage.toFixed(1)}%를 차지합니다. 근본 원인 분석이 필요합니다.`
        });
      }
    }
    
    // 복구 효과성 기반 추천
    Object.entries(patterns.recoveryEffectiveness).forEach(([category, effectiveness]) => {
      if (effectiveness.successRate < 50) {
        recommendations.push({
          priority: 'medium',
          category: 'recovery_improvement',
          message: `${category} 에러의 복구 성공률이 ${effectiveness.successRate.toFixed(1)}%로 낮습니다. 복구 전략 개선이 필요합니다.`
        });
      }
    });
    
    return recommendations;
  }
  
  /**
   * 에러 처리 설정 최적화
   */
  static optimizeErrorHandling() {
    try {
      const patterns = this.analyzeErrorPatterns();
      const properties = PropertiesService.getScriptProperties();
      
      let optimizations = [];
      
      // 빈발 에러 기반 최적화
      if (patterns.frequentErrors.length > 0) {
        const topError = patterns.frequentErrors[0];
        
        switch (topError.category) {
          case 'api_timeout':
            properties.setProperty('API_TIMEOUT_MS', '30000'); // 30초로 증가
            optimizations.push('API 타임아웃 시간을 30초로 증가');
            break;
            
          case 'email_quota_exceeded':
            properties.setProperty('EMAIL_MODE', CONFIG.EMAIL_MODE.CONSOLIDATED);
            optimizations.push('이메일 모드를 통합 발송으로 변경');
            break;
            
          case 'memory_error':
            properties.setProperty('TEXT_OPTIMIZATION_LEVEL', 'aggressive');
            properties.setProperty('MAX_API_TOKENS', '20000');
            optimizations.push('메모리 사용량 최적화 설정 적용');
            break;
        }
      }
      
      // 복구 효과성 기반 최적화
      Object.entries(patterns.recoveryEffectiveness).forEach(([category, effectiveness]) => {
        if (effectiveness.successRate < 30) {
          // 성공률이 매우 낮은 경우 복구 시도 비활성화
          properties.setProperty(`DISABLE_AUTO_RECOVERY_${category.toUpperCase()}`, 'true');
          optimizations.push(`${category} 에러의 자동 복구 비활성화 (성공률 ${effectiveness.successRate.toFixed(1)}%)`);
        }
      });
      
      Logger.info('Error handling optimization completed', {
        optimizations: optimizations,
        patternAnalysis: patterns
      });
      
      return {
        success: true,
        optimizations: optimizations,
        patterns: patterns
      };
      
    } catch (error) {
      Logger.error('Failed to optimize error handling', {
        error: error.message
      });
      
      return {
        success: false,
        error: error.message
      };
    }
  }
}