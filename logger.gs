/**
 * logger.gs - 로깅 및 에러 관리 모듈
 * 구조화된 로깅, 에러 분석, 세션 관리
 * 
 * @version 2.0
 * @author Google Apps Script System
 * @updated 2024
 */

/**
 * 로깅 관리 클래스
 */
class Logger {
  
  /**
   * 새 세션 시작
   */
  static startNewSession() {
    const sessionId = Utilities.getUuid();
    const timestamp = new Date().toISOString();
    
    PropertiesService.getScriptProperties().setProperty('CURRENT_SESSION_ID', sessionId);
    
    this.info('New session started', {
      sessionId: sessionId,
      timestamp: timestamp,
      triggerSource: this._getTriggerSource()
    });
    
    return sessionId;
  }
  
  /**
   * 현재 세션 ID 조회
   */
  static getCurrentSessionId() {
    return PropertiesService.getScriptProperties().getProperty('CURRENT_SESSION_ID') || 'unknown';
  }
  
  /**
   * 정보 레벨 로그
   * @param {string} message - 로그 메시지
   * @param {Object} context - 추가 컨텍스트 정보
   */
  static info(message, context = {}) {
    this._writeLog('INFO', message, context);
  }
  
  /**
   * 경고 레벨 로그
   * @param {string} message - 로그 메시지
   * @param {Object} context - 추가 컨텍스트 정보
   */
  static warn(message, context = {}) {
    this._writeLog('WARN', message, context);
  }
  
  /**
   * 에러 레벨 로그
   * @param {string} message - 로그 메시지
   * @param {Object} context - 추가 컨텍스트 정보
   */
  static error(message, context = {}) {
    this._writeLog('ERROR', message, context);
    
    // 에러 통계 업데이트
    this._updateErrorStats(message, context);
  }
  
  /**
   * 치명적 에러 로그
   * @param {string} message - 로그 메시지
   * @param {Object} context - 추가 컨텍스트 정보
   */
  static critical(message, context = {}) {
    this._writeLog('CRITICAL', message, context);
    
    // 에러 통계 업데이트
    this._updateErrorStats(message, context);
    
    // 치명적 에러 알림
    this._notifyCriticalError(message, context);
  }
  
  /**
   * 디버그 레벨 로그 (개발 시에만 활성화)
   * @param {string} message - 로그 메시지
   * @param {Object} context - 추가 컨텍스트 정보
   */
  static debug(message, context = {}) {
    const config = ConfigManager.getLoggingConfig();
    if (config.enableDebugLogs) {
      this._writeLog('DEBUG', message, context);
    }
  }
  
  /**
   * 로그 작성 (내부 함수)
   * @private
   */
  static _writeLog(level, message, context = {}) {
    try {
      const timestamp = new Date().toISOString();
      const sessionId = this.getCurrentSessionId();
      
      // 로그 엔트리 구성
      const logEntry = {
        timestamp: timestamp,
        level: level,
        message: message,
        sessionId: sessionId,
        context: context,
        source: this._getSourceInfo()
      };
      
      // 콘솔 로그 (기본)
      console.log(`[${level}] ${timestamp} [${sessionId.substring(0, 8)}] ${message}`, context);
      
      // 구조화된 로그 저장
      this._saveStructuredLog(logEntry);
      
      // 로그 레벨별 추가 처리
      if (level === 'ERROR' || level === 'CRITICAL') {
        this._handleErrorLog(logEntry);
      }
      
    } catch (error) {
      // 로깅 자체 에러는 콘솔에만 출력
      console.error('Logging failed:', error.message);
    }
  }
  
  /**
   * 구조화된 로그 저장
   * @private
   */
  static _saveStructuredLog(logEntry) {
    const config = ConfigManager.getLoggingConfig();
    
    if (!config.enableStructuredLogging) {
      return;
    }
    
    try {
      // 오늘 날짜의 로그 키
      const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
      const logKey = `structured_logs_${today}`;
      
      // 기존 로그 조회
      const properties = PropertiesService.getScriptProperties();
      const existingLogs = JSON.parse(properties.getProperty(logKey) || '[]');
      
      // 새 로그 추가
      existingLogs.push(logEntry);
      
      // 로그 크기 제한 (최대 100개)
      if (existingLogs.length > 100) {
        existingLogs.splice(0, existingLogs.length - 100);
      }
      
      // 저장
      properties.setProperty(logKey, JSON.stringify(existingLogs));
      
    } catch (error) {
      console.error('Structured log saving failed:', error.message);
    }
  }
  
  /**
   * 에러 로그 처리
   * @private
   */
  static _handleErrorLog(logEntry) {
    try {
      // 에러 분류
      const errorClassification = ErrorHandler.classifyError(
        new Error(logEntry.message), 
        logEntry.context.source || 'unknown'
      );
      
      // 에러 히스토리 업데이트
      this._updateErrorHistory(logEntry, errorClassification);
      
      // 에러 패턴 분석
      this._analyzeErrorPatterns(logEntry, errorClassification);
      
    } catch (error) {
      console.error('Error log handling failed:', error.message);
    }
  }
  
  /**
   * 소스 정보 수집
   * @private
   */
  static _getSourceInfo() {
    try {
      // 스택 트레이스에서 호출자 정보 추출
      const stack = new Error().stack;
      const lines = stack.split('\n');
      
      // Logger 호출을 건너뛰고 실제 호출자 찾기
      for (let i = 2; i < lines.length; i++) {
        const line = lines[i];
        if (line && !line.includes('Logger.') && !line.includes('logger.gs')) {
          const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
          if (match) {
            return {
              function: match[1],
              file: match[2],
              line: parseInt(match[3]),
              column: parseInt(match[4])
            };
          }
        }
      }
      
    } catch (error) {
      // 소스 정보 수집 실패 시 기본값
    }
    
    return {
      function: 'unknown',
      file: 'unknown',
      line: 0,
      column: 0
    };
  }
  
  /**
   * 트리거 소스 확인
   * @private
   */
  static _getTriggerSource() {
    try {
      const trigger = ScriptApp.getScriptTriggers().find(t => 
        t.getHandlerFunction() === 'sendAllPdfs'
      );
      
      if (trigger) {
        return {
          type: 'trigger',
          triggerType: trigger.getTriggerSource().toString(),
          handlerFunction: trigger.getHandlerFunction()
        };
      }
      
    } catch (error) {
      // 트리거 정보 수집 실패
    }
    
    return {
      type: 'manual',
      triggerType: 'user_initiated'
    };
  }
  
  /**
   * 에러 통계 업데이트
   * @private
   */
  static _updateErrorStats(message, context) {
    try {
      const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
      const statsKey = `error_stats_${today}`;
      
      const properties = PropertiesService.getScriptProperties();
      const stats = JSON.parse(properties.getProperty(statsKey) || '{}');
      
      // 에러 카운트 증가
      stats.totalErrors = (stats.totalErrors || 0) + 1;
      stats.lastErrorTime = new Date().toISOString();
      
      // 에러 유형별 카운트
      const errorType = this._classifyErrorType(message);
      if (!stats.errorsByType) {
        stats.errorsByType = {};
      }
      stats.errorsByType[errorType] = (stats.errorsByType[errorType] || 0) + 1;
      
      // 세션별 에러 카운트
      const sessionId = this.getCurrentSessionId();
      if (!stats.errorsBySession) {
        stats.errorsBySession = {};
      }
      stats.errorsBySession[sessionId] = (stats.errorsBySession[sessionId] || 0) + 1;
      
      properties.setProperty(statsKey, JSON.stringify(stats));
      
    } catch (error) {
      console.error('Error stats update failed:', error.message);
    }
  }
  
  /**
   * 에러 히스토리 업데이트
   * @private
   */
  static _updateErrorHistory(logEntry, classification) {
    try {
      const historyKey = 'error_history';
      const properties = PropertiesService.getScriptProperties();
      const history = JSON.parse(properties.getProperty(historyKey) || '[]');
      
      // 새 에러 히스토리 엔트리
      const historyEntry = {
        timestamp: logEntry.timestamp,
        message: logEntry.message,
        level: logEntry.level,
        sessionId: logEntry.sessionId,
        classification: classification,
        context: logEntry.context
      };
      
      history.push(historyEntry);
      
      // 히스토리 크기 제한 (최대 50개)
      if (history.length > 50) {
        history.splice(0, history.length - 50);
      }
      
      properties.setProperty(historyKey, JSON.stringify(history));
      
    } catch (error) {
      console.error('Error history update failed:', error.message);
    }
  }
  
  /**
   * 에러 패턴 분석
   * @private
   */
  static _analyzeErrorPatterns(logEntry, classification) {
    try {
      // 최근 에러들 조회
      const recentErrors = this._getRecentErrors(10);
      
      // 패턴 분석
      const patterns = this._identifyPatterns(recentErrors);
      
      // 패턴이 발견되면 알림
      if (patterns.length > 0) {
        this.warn('Error patterns detected', {
          patterns: patterns,
          recentErrorCount: recentErrors.length
        });
      }
      
    } catch (error) {
      console.error('Error pattern analysis failed:', error.message);
    }
  }
  
  /**
   * 최근 에러 조회
   * @private
   */
  static _getRecentErrors(limit = 10) {
    try {
      const historyKey = 'error_history';
      const properties = PropertiesService.getScriptProperties();
      const history = JSON.parse(properties.getProperty(historyKey) || '[]');
      
      return history.slice(-limit);
      
    } catch (error) {
      return [];
    }
  }
  
  /**
   * 에러 패턴 식별
   * @private
   */
  static _identifyPatterns(errors) {
    const patterns = [];
    
    if (errors.length < 3) {
      return patterns;
    }
    
    // 동일 에러 반복 패턴
    const messageGroups = {};
    errors.forEach(error => {
      const key = error.message.substring(0, 50); // 첫 50자로 그룹핑
      if (!messageGroups[key]) {
        messageGroups[key] = [];
      }
      messageGroups[key].push(error);
    });
    
    Object.entries(messageGroups).forEach(([message, group]) => {
      if (group.length >= 3) {
        patterns.push({
          type: 'repeated_error',
          message: message,
          count: group.length,
          timespan: this._calculateTimespan(group)
        });
      }
    });
    
    // 에러 급증 패턴
    const recentTime = new Date();
    recentTime.setMinutes(recentTime.getMinutes() - 30); // 최근 30분
    
    const recentErrors = errors.filter(error => 
      new Date(error.timestamp) > recentTime
    );
    
    if (recentErrors.length >= 5) {
      patterns.push({
        type: 'error_spike',
        count: recentErrors.length,
        timeframe: '30_minutes'
      });
    }
    
    return patterns;
  }
  
  /**
   * 시간 범위 계산
   * @private
   */
  static _calculateTimespan(errorGroup) {
    if (errorGroup.length < 2) {
      return 0;
    }
    
    const timestamps = errorGroup.map(e => new Date(e.timestamp));
    const earliest = Math.min(...timestamps);
    const latest = Math.max(...timestamps);
    
    return latest - earliest; // 밀리초
  }
  
  /**
   * 치명적 에러 알림
   * @private
   */
  static _notifyCriticalError(message, context) {
    try {
      const config = ConfigManager.getEmailConfig();
      
      if (config.enableCriticalErrorNotification) {
        // 즉시 이메일 알림 발송
        this._sendCriticalErrorEmail(message, context);
      }
      
      // 자동 실행 중지 (필요시)
      if (context.shouldStopExecution) {
        TriggerManager.stopOnCriticalError();
      }
      
    } catch (error) {
      console.error('Critical error notification failed:', error.message);
    }
  }
  
  /**
   * 치명적 에러 이메일 발송
   * @private
   */
  static _sendCriticalErrorEmail(message, context) {
    try {
      const config = ConfigManager.getEmailConfig();
      const timestamp = new Date().toISOString();
      
      const subject = `[CRITICAL] システムエラー発生 - ${timestamp}`;
      const body = `
システムで致命的なエラーが発生しました。

時刻: ${timestamp}
セッション: ${this.getCurrentSessionId()}
エラー: ${message}

詳細情報:
${JSON.stringify(context, null, 2)}

このメールは自動送信されました。
システム管理者による確認が必要です。
      `;
      
      GmailApp.sendEmail(
        config.recipients[0] || config.recipients,
        subject,
        body
      );
      
    } catch (error) {
      console.error('Critical error email failed:', error.message);
    }
  }
  
  /**
   * 에러 유형 분류
   * @private
   */
  static _classifyErrorType(message) {
    if (!message) return 'unknown';
    
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('api') || lowerMessage.includes('gemini')) {
      return 'api_error';
    } else if (lowerMessage.includes('pdf') || lowerMessage.includes('export')) {
      return 'pdf_error';
    } else if (lowerMessage.includes('email') || lowerMessage.includes('gmail')) {
      return 'email_error';
    } else if (lowerMessage.includes('permission') || lowerMessage.includes('access')) {
      return 'permission_error';
    } else if (lowerMessage.includes('timeout') || lowerMessage.includes('time')) {
      return 'timeout_error';
    } else if (lowerMessage.includes('network') || lowerMessage.includes('connection')) {
      return 'network_error';
    } else {
      return 'system_error';
    }
  }
  
  /**
   * 에러 로그 분석 (구현됨)
   * 미완성이었던 함수를 완전히 구현
   */
  static analyzeErrorLogs() {
    try {
      const analysis = {
        summary: {},
        patterns: [],
        recommendations: [],
        timeRange: {
          start: null,
          end: null
        }
      };
      
      // 최근 7일간의 에러 데이터 수집
      const errorData = this._collectErrorData(7);
      
      if (errorData.length === 0) {
        analysis.summary = {
          totalErrors: 0,
          message: 'No errors found in the last 7 days'
        };
        return analysis;
      }
      
      // 시간 범위 설정
      const timestamps = errorData.map(e => new Date(e.timestamp));
      analysis.timeRange.start = new Date(Math.min(...timestamps));
      analysis.timeRange.end = new Date(Math.max(...timestamps));
      
      // 에러 요약 분석
      analysis.summary = this._generateErrorSummary(errorData);
      
      // 패턴 분석
      analysis.patterns = this._analyzeErrorTrends(errorData);
      
      // 추천사항 생성
      analysis.recommendations = this._generateRecommendations(analysis.summary, analysis.patterns);
      
      // 분석 결과 표시
      this._displayAnalysisResults(analysis);
      
      return analysis;
      
    } catch (error) {
      this.error('Error log analysis failed', { error: error.message });
      throw error;
    }
  }
  
  /**
   * 에러 데이터 수집
   * @private
   */
  static _collectErrorData(days) {
    const errorData = [];
    const properties = PropertiesService.getScriptProperties();
    
    // 지난 N일간의 데이터 수집
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      
      // 일별 로그 조회
      const logsKey = `structured_logs_${dateStr}`;
      const logs = JSON.parse(properties.getProperty(logsKey) || '[]');
      
      // 에러 레벨 로그만 필터링
      const errors = logs.filter(log => 
        log.level === 'ERROR' || log.level === 'CRITICAL'
      );
      
      errorData.push(...errors);
    }
    
    return errorData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }
  
  /**
   * 에러 요약 생성
   * @private
   */
  static _generateErrorSummary(errorData) {
    const summary = {
      totalErrors: errorData.length,
      criticalErrors: 0,
      errorsByType: {},
      errorsBySession: {},
      errorsByDay: {},
      topErrors: []
    };
    
    // 데이터 분석
    const messageCounts = {};
    
    errorData.forEach(error => {
      // 치명적 에러 카운트
      if (error.level === 'CRITICAL') {
        summary.criticalErrors++;
      }
      
      // 유형별 카운트
      const errorType = this._classifyErrorType(error.message);
      summary.errorsByType[errorType] = (summary.errorsByType[errorType] || 0) + 1;
      
      // 세션별 카운트
      summary.errorsBySession[error.sessionId] = (summary.errorsBySession[error.sessionId] || 0) + 1;
      
      // 일별 카운트
      const day = error.timestamp.split('T')[0];
      summary.errorsByDay[day] = (summary.errorsByDay[day] || 0) + 1;
      
      // 메시지별 카운트 (상위 에러 식별용)
      const shortMessage = error.message.substring(0, 100);
      messageCounts[shortMessage] = (messageCounts[shortMessage] || 0) + 1;
    });
    
    // 상위 에러 메시지 추출
    summary.topErrors = Object.entries(messageCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([message, count]) => ({ message, count }));
    
    return summary;
  }
  
  /**
   * 에러 트렌드 분석
   * @private
   */
  static _analyzeErrorTrends(errorData) {
    const patterns = [];
    
    // 시간대별 패턴 분석
    const hourlyPattern = this._analyzeHourlyPattern(errorData);
    if (hourlyPattern.significance > 0.7) {
      patterns.push(hourlyPattern);
    }
    
    // 반복 에러 패턴
    const repetitivePattern = this._analyzeRepetitiveErrors(errorData);
    if (repetitivePattern.significance > 0.5) {
      patterns.push(repetitivePattern);
    }
    
    // 에러 급증 패턴
    const spikePattern = this._analyzeErrorSpikes(errorData);
    if (spikePattern.significance > 0.6) {
      patterns.push(spikePattern);
    }
    
    return patterns;
  }
  
  /**
   * 시간대별 패턴 분석
   * @private
   */
  static _analyzeHourlyPattern(errorData) {
    const hourCounts = new Array(24).fill(0);
    
    errorData.forEach(error => {
      const hour = new Date(error.timestamp).getHours();
      hourCounts[hour]++;
    });
    
    const maxCount = Math.max(...hourCounts);
    const avgCount = hourCounts.reduce((sum, count) => sum + count, 0) / 24;
    const peakHour = hourCounts.indexOf(maxCount);
    
    return {
      type: 'hourly_pattern',
      peakHour: peakHour,
      peakCount: maxCount,
      averageCount: avgCount,
      significance: maxCount > (avgCount * 2) ? (maxCount / (avgCount * 2)) : 0,
      description: `Peak error time: ${peakHour}:00 (${maxCount} errors)`
    };
  }
  
  /**
   * 반복 에러 분석
   * @private
   */
  static _analyzeRepetitiveErrors(errorData) {
    const messageGroups = {};
    
    errorData.forEach(error => {
      const key = error.message.substring(0, 50);
      if (!messageGroups[key]) {
        messageGroups[key] = [];
      }
      messageGroups[key].push(error);
    });
    
    const repetitiveGroups = Object.entries(messageGroups)
      .filter(([, group]) => group.length >= 3)
      .sort(([,a], [,b]) => b.length - a.length);
    
    if (repetitiveGroups.length === 0) {
      return { type: 'repetitive_errors', significance: 0 };
    }
    
    const topGroup = repetitiveGroups[0];
    const [message, group] = topGroup;
    
    return {
      type: 'repetitive_errors',
      topError: message,
      count: group.length,
      percentage: (group.length / errorData.length) * 100,
      significance: Math.min(group.length / 10, 1),
      description: `Most frequent error: "${message}" (${group.length} times)`
    };
  }
  
  /**
   * 에러 급증 분석
   * @private
   */
  static _analyzeErrorSpikes(errorData) {
    if (errorData.length < 5) {
      return { type: 'error_spikes', significance: 0 };
    }
    
    // 1시간 단위로 그룹핑
    const hourlyGroups = {};
    
    errorData.forEach(error => {
      const timestamp = new Date(error.timestamp);
      const hourKey = `${timestamp.getFullYear()}-${timestamp.getMonth()}-${timestamp.getDate()}-${timestamp.getHours()}`;
      
      if (!hourlyGroups[hourKey]) {
        hourlyGroups[hourKey] = [];
      }
      hourlyGroups[hourKey].push(error);
    });
    
    const hourlyCounts = Object.values(hourlyGroups).map(group => group.length);
    const avgHourlyCount = hourlyCounts.reduce((sum, count) => sum + count, 0) / hourlyCounts.length;
    const maxHourlyCount = Math.max(...hourlyCounts);
    
    const spikeThreshold = avgHourlyCount * 3;
    const spikes = hourlyCounts.filter(count => count > spikeThreshold);
    
    return {
      type: 'error_spikes',
      spikeCount: spikes.length,
      maxHourlyCount: maxHourlyCount,
      averageHourlyCount: avgHourlyCount,
      significance: spikes.length > 0 ? Math.min(maxHourlyCount / spikeThreshold, 1) : 0,
      description: `${spikes.length} error spikes detected (threshold: ${spikeThreshold.toFixed(1)})`
    };
  }
  
  /**
   * 추천사항 생성
   * @private
   */
  static _generateRecommendations(summary, patterns) {
    const recommendations = [];
    
    // 에러 수준별 추천
    if (summary.criticalErrors > 0) {
      recommendations.push({
        priority: 'high',
        category: 'critical_errors',
        message: `${summary.criticalErrors}개의 치명적 에러가 발견되었습니다. 즉시 확인이 필요합니다.`
      });
    }
    
    if (summary.totalErrors > 50) {
      recommendations.push({
        priority: 'high',
        category: 'error_volume',
        message: '에러 발생량이 많습니다. 시스템 안정성 점검이 필요합니다.'
      });
    }
    
    // 패턴별 추천
    patterns.forEach(pattern => {
      switch (pattern.type) {
        case 'hourly_pattern':
          if (pattern.significance > 0.8) {
            recommendations.push({
              priority: 'medium',
              category: 'timing',
              message: `${pattern.peakHour}시경에 에러가 집중됩니다. 해당 시간대 모니터링을 강화하세요.`
            });
          }
          break;
          
        case 'repetitive_errors':
          if (pattern.significance > 0.7) {
            recommendations.push({
              priority: 'high',
              category: 'root_cause',
              message: `동일한 에러가 반복됩니다: "${pattern.topError}". 근본 원인 분석이 필요합니다.`
            });
          }
          break;
          
        case 'error_spikes':
          if (pattern.significance > 0.7) {
            recommendations.push({
              priority: 'medium',
              category: 'system_load',
              message: `에러 급증이 감지되었습니다. 시스템 부하나 외부 요인을 확인하세요.`
            });
          }
          break;
      }
    });
    
    // 유형별 추천
    Object.entries(summary.errorsByType).forEach(([type, count]) => {
      if (count > summary.totalErrors * 0.3) {
        const typeRecommendations = {
          'api_error': 'API 연결 상태와 키 유효성을 확인하세요.',
          'pdf_error': 'PDF 생성 프로세스와 데이터 형식을 점검하세요.',
          'email_error': '이메일 서비스 상태와 첨부파일 크기를 확인하세요.',
          'permission_error': '스크립트 권한과 파일 액세스 권한을 점검하세요.',
          'timeout_error': '처리 시간 최적화나 배치 크기 조정을 고려하세요.'
        };
        
        if (typeRecommendations[type]) {
          recommendations.push({
            priority: 'medium',
            category: 'error_type',
            message: `${type} 에러가 주요 원인입니다. ${typeRecommendations[type]}`
          });
        }
      }
    });
    
    return recommendations;
  }
  
  /**
   * 분석 결과 표시
   * @private
   */
  static _displayAnalysisResults(analysis) {
    try {
      const ui = SpreadsheetApp.getUi();
      
      let message = `■ エラーログ分析結果\n\n`;
      
      // 요약 정보
      message += `期間: ${analysis.timeRange.start.toLocaleDateString()} - ${analysis.timeRange.end.toLocaleDateString()}\n`;
      message += `総エラー数: ${analysis.summary.totalErrors}件\n`;
      message += `致命的エラー: ${analysis.summary.criticalErrors}件\n\n`;
      
      // 상위 에러 유형
      if (analysis.summary.topErrors.length > 0) {
        message += `■ 主要エラー:\n`;
        analysis.summary.topErrors.forEach((error, index) => {
          message += `${index + 1}. ${error.message.substring(0, 50)}... (${error.count}回)\n`;
        });
        message += `\n`;
      }
      
      // 패턴 정보
      if (analysis.patterns.length > 0) {
        message += `■ 検出されたパターン:\n`;
        analysis.patterns.forEach(pattern => {
          message += `• ${pattern.description}\n`;
        });
        message += `\n`;
      }
      
      // 추천사항
      if (analysis.recommendations.length > 0) {
        message += `■ 推奨事項:\n`;
        analysis.recommendations.forEach(rec => {
          const priority = rec.priority === 'high' ? '【重要】' : '【推奨】';
          message += `${priority} ${rec.message}\n`;
        });
      }
      
      ui.alert('エラーログ分析', message, ui.ButtonSet.OK);
      
    } catch (error) {
      console.error('Analysis results display failed:', error.message);
    }
  }
  
  /**
   * 에러 로그 표시 (UI)
   */
  static showErrorLog() {
    try {
      const recentErrors = this._getRecentErrors(20);
      
      if (recentErrors.length === 0) {
        SpreadsheetApp.getUi().alert('エラーログが見つかりませんでした。');
        return;
      }
      
      let message = `最近のエラーログ (${recentErrors.length}件):\n\n`;
      
      recentErrors.reverse().forEach((error, index) => {
        const timestamp = new Date(error.timestamp).toLocaleString();
        message += `${index + 1}. [${error.level}] ${timestamp}\n`;
        message += `   ${error.message}\n`;
        if (error.context && Object.keys(error.context).length > 0) {
          message += `   Context: ${JSON.stringify(error.context)}\n`;
        }
        message += `\n`;
      });
      
      SpreadsheetApp.getUi().alert('エラーログ', message, SpreadsheetApp.getUi().ButtonSet.OK);
      
    } catch (error) {
      console.error('Error log display failed:', error.message);
      SpreadsheetApp.getUi().alert('エラーログの表示に失敗しました: ' + error.message);
    }
  }
  
  /**
   * 로깅 통계 조회
   */
  static getLoggingStats() {
    try {
      const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
      const statsKey = `error_stats_${today}`;
      
      const properties = PropertiesService.getScriptProperties();
      const stats = JSON.parse(properties.getProperty(statsKey) || '{}');
      
      return {
        date: today,
        totalErrors: stats.totalErrors || 0,
        criticalErrors: stats.criticalErrors || 0,
        errorsByType: stats.errorsByType || {},
        lastErrorTime: stats.lastErrorTime || null,
        currentSessionId: this.getCurrentSessionId()
      };
      
    } catch (error) {
      console.error('Logging stats retrieval failed:', error.message);
      return {
        date: 'unknown',
        totalErrors: 0,
        error: error.message
      };
    }
  }
  
  /**
   * 로그 정리 (오래된 로그 삭제)
   */
  static cleanupOldLogs(daysToKeep = 7) {
    try {
      const properties = PropertiesService.getScriptProperties();
      const allProperties = properties.getProperties();
      
      let cleanedCount = 0;
      
      Object.keys(allProperties).forEach(key => {
        if (key.startsWith('structured_logs_') || key.startsWith('error_stats_')) {
          const dateStr = key.split('_').pop();
          const logDate = new Date(dateStr);
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
          
          if (logDate < cutoffDate) {
            properties.deleteProperty(key);
            cleanedCount++;
          }
        }
      });
      
      this.info('Log cleanup completed', {
        cleanedCount: cleanedCount,
        daysToKeep: daysToKeep
      });
      
      return cleanedCount;
      
    } catch (error) {
      this.error('Log cleanup failed', { error: error.message });
      throw error;
    }
  }
}