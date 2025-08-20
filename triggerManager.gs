/**
 * triggerManager.gs - 트리거 관리 모듈
 * 자동 실행 스케줄링, 트리거 상태 관리, 안전 기능
 * 
 * @version 2.0
 * @author Google Apps Script System
 * @updated 2024
 */

/**
 * 트리거 관리 클래스
 */
class TriggerManager {
  
  /**
   * 자동 실행 시작
   */
  static start() {
    try {
      Logger.info('Starting automatic execution setup');
      
      // 기존 트리거 정리
      this.cleanup();
      
      // 설정 로드
      const config = ConfigManager.getTriggerConfig();
      
      // 새 트리거 생성
      const trigger = ScriptApp.newTrigger('sendAllPdfs')
        .timeBased()
        .everyMinutes(config.intervalMinutes || 5)
        .create();
      
      // 트리거 정보 저장
      const triggerInfo = {
        id: trigger.getUniqueId(),
        handlerFunction: trigger.getHandlerFunction(),
        intervalMinutes: config.intervalMinutes || 5,
        createdAt: new Date().toISOString(),
        createdBy: 'user',
        isActive: true,
        executionHistory: []
      };
      
      const properties = PropertiesService.getScriptProperties();
      properties.setProperty('ACTIVE_TRIGGER_INFO', JSON.stringify(triggerInfo));
      
      // 상태 표시
      const ui = SpreadsheetApp.getUi();
      ui.alert(
        '自動実行開始',
        `${config.intervalMinutes}分間隔で自動実行を開始しました。\n\n` +
        `実行間隔: ${config.intervalMinutes}分\n` +
        `送信モード: ${ConfigManager.getEmailMode()}\n` +
        `トリガーID: ${trigger.getUniqueId().substring(0, 8)}...`,
        ui.ButtonSet.OK
      );
      
      Logger.info('Automatic execution started successfully', {
        triggerId: trigger.getUniqueId(),
        interval: config.intervalMinutes,
        emailMode: ConfigManager.getEmailMode()
      });
      
      // 헬스체크 스케줄링
      this._scheduleHealthCheck();
      
    } catch (error) {
      Logger.error('Failed to start automatic execution', {
        error: error.message
      });
      
      SpreadsheetApp.getUi().alert(
        '自動実行開始エラー',
        `自動実行の開始に失敗しました: ${error.message}`,
        SpreadsheetApp.getUi().ButtonSet.OK
      );
      
      throw error;
    }
  }
  
  /**
   * 자동 실행 중지
   */
  static stop() {
    try {
      Logger.info('Stopping automatic execution');
      
      // 활성 트리거 정보 조회
      const properties = PropertiesService.getScriptProperties();
      const triggerInfoJson = properties.getProperty('ACTIVE_TRIGGER_INFO');
      
      let triggerInfo = null;
      if (triggerInfoJson) {
        triggerInfo = JSON.parse(triggerInfoJson);
      }
      
      // 모든 트리거 삭제
      const deletedCount = this.cleanup();
      
      // 트리거 정보 업데이트
      if (triggerInfo) {
        triggerInfo.isActive = false;
        triggerInfo.stoppedAt = new Date().toISOString();
        triggerInfo.stoppedBy = 'user';
        properties.setProperty('LAST_TRIGGER_INFO', JSON.stringify(triggerInfo));
      }
      
      // 활성 트리거 정보 삭제
      properties.deleteProperty('ACTIVE_TRIGGER_INFO');
      
      // 상태 표시
      const ui = SpreadsheetApp.getUi();
      ui.alert(
        '自動実行停止',
        `自動実行を停止しました。\n\n` +
        `削除されたトリガー数: ${deletedCount}`,
        ui.ButtonSet.OK
      );
      
      Logger.info('Automatic execution stopped successfully', {
        deletedTriggers: deletedCount,
        previousTrigger: triggerInfo ? triggerInfo.id : 'none'
      });
      
    } catch (error) {
      Logger.error('Failed to stop automatic execution', {
        error: error.message
      });
      
      SpreadsheetApp.getUi().alert(
        '自動実行停止エラー',
        `自動実行の停止に失敗しました: ${error.message}`,
        SpreadsheetApp.getUi().ButtonSet.OK
      );
      
      throw error;
    }
  }
  
  /**
   * 트리거 상태 조회 및 표시
   */
  static showStatus() {
    try {
      const status = this.getStatus();
      
      let message = `■ 自動実行状態\n\n`;
      message += `状態: ${status.isActive ? '実行中' : '停止中'}\n`;
      
      if (status.isActive && status.triggerInfo) {
        const trigger = status.triggerInfo;
        message += `実行間隔: ${trigger.intervalMinutes}分\n`;
        message += `開始時刻: ${new Date(trigger.createdAt).toLocaleString()}\n`;
        message += `送信モード: ${ConfigManager.getEmailMode()}\n`;
        
        if (trigger.executionHistory && trigger.executionHistory.length > 0) {
          const lastExecution = trigger.executionHistory[trigger.executionHistory.length - 1];
          message += `最終実行: ${new Date(lastExecution.timestamp).toLocaleString()}\n`;
          message += `最終結果: ${lastExecution.success ? '成功' : '失敗'}\n`;
        }
        
        // 다음 실행 예상 시간
        const nextExecution = this._calculateNextExecution(trigger);
        if (nextExecution) {
          message += `次回実行予定: ${nextExecution.toLocaleString()}\n`;
        }
      } else if (status.lastTriggerInfo) {
        const lastTrigger = status.lastTriggerInfo;
        message += `最後の実行: ${new Date(lastTrigger.stoppedAt || lastTrigger.createdAt).toLocaleString()}\n`;
        message += `停止理由: ${lastTrigger.stoppedBy === 'user' ? 'ユーザー操作' : 'システム'}\n`;
      }
      
      // 시스템 건강 상태
      const healthCheck = this._performHealthCheck();
      message += `\n■ システム状態\n`;
      message += `全体状態: ${healthCheck.overall}\n`;
      message += `API状態: ${healthCheck.apiHealth}\n`;
      message += `設定状態: ${healthCheck.configHealth}\n`;
      
      if (healthCheck.warnings.length > 0) {
        message += `\n■ 警告:\n`;
        healthCheck.warnings.forEach(warning => {
          message += `• ${warning}\n`;
        });
      }
      
      SpreadsheetApp.getUi().alert('自動実行状態', message, SpreadsheetApp.getUi().ButtonSet.OK);
      
    } catch (error) {
      Logger.error('Failed to show trigger status', {
        error: error.message
      });
      
      SpreadsheetApp.getUi().alert(
        'ステータス確認エラー',
        `状態確認に失敗しました: ${error.message}`,
        SpreadsheetApp.getUi().ButtonSet.OK
      );
    }
  }
  
  /**
   * 트리거 상태 조회 (내부용)
   */
  static getStatus() {
    try {
      const properties = PropertiesService.getScriptProperties();
      const activeTriggerJson = properties.getProperty('ACTIVE_TRIGGER_INFO');
      const lastTriggerJson = properties.getProperty('LAST_TRIGGER_INFO');
      
      const status = {
        isActive: false,
        triggerInfo: null,
        lastTriggerInfo: null,
        systemHealth: 'unknown'
      };
      
      if (activeTriggerJson) {
        status.triggerInfo = JSON.parse(activeTriggerJson);
        status.isActive = status.triggerInfo.isActive;
      }
      
      if (lastTriggerJson) {
        status.lastTriggerInfo = JSON.parse(lastTriggerJson);
      }
      
      // 실제 트리거 존재 여부 확인
      if (status.isActive) {
        const actualTriggers = ScriptApp.getScriptTriggers();
        const triggerExists = actualTriggers.some(trigger => 
          trigger.getUniqueId() === status.triggerInfo.id
        );
        
        if (!triggerExists) {
          // 트리거가 실제로 없으면 상태 수정
          status.isActive = false;
          properties.deleteProperty('ACTIVE_TRIGGER_INFO');
          Logger.warn('Active trigger not found, updating status');
        }
      }
      
      return status;
      
    } catch (error) {
      Logger.error('Failed to get trigger status', {
        error: error.message
      });
      
      return {
        isActive: false,
        triggerInfo: null,
        lastTriggerInfo: null,
        error: error.message
      };
    }
  }
  
  /**
   * 모든 트리거 정리
   */
  static cleanup() {
    try {
      const triggers = ScriptApp.getScriptTriggers();
      let deletedCount = 0;
      
      triggers.forEach(trigger => {
        if (trigger.getHandlerFunction() === 'sendAllPdfs') {
          ScriptApp.deleteTrigger(trigger);
          deletedCount++;
        }
      });
      
      Logger.info('Trigger cleanup completed', {
        deletedCount: deletedCount
      });
      
      return deletedCount;
      
    } catch (error) {
      Logger.error('Trigger cleanup failed', {
        error: error.message
      });
      
      return 0;
    }
  }
  
  /**
   * 치명적 에러 시 자동 중지
   */
  static stopOnCriticalError() {
    try {
      Logger.info('Stopping execution due to critical error');
      
      // 트리거 중지
      this.cleanup();
      
      // 상태 업데이트
      const properties = PropertiesService.getScriptProperties();
      const triggerInfoJson = properties.getProperty('ACTIVE_TRIGGER_INFO');
      
      if (triggerInfoJson) {
        const triggerInfo = JSON.parse(triggerInfoJson);
        triggerInfo.isActive = false;
        triggerInfo.stoppedAt = new Date().toISOString();
        triggerInfo.stoppedBy = 'critical_error';
        triggerInfo.stopReason = 'Critical error detected - automatic safety stop';
        
        properties.setProperty('LAST_TRIGGER_INFO', JSON.stringify(triggerInfo));
        properties.deleteProperty('ACTIVE_TRIGGER_INFO');
      }
      
      // 관리자에게 알림
      this._notifyEmergencyStop();
      
      Logger.info('Emergency stop completed');
      
    } catch (error) {
      Logger.error('Emergency stop failed', {
        error: error.message
      });
    }
  }
  
  /**
   * 실행 히스토리 기록
   */
  static recordExecution(success, metadata = {}) {
    try {
      const properties = PropertiesService.getScriptProperties();
      const triggerInfoJson = properties.getProperty('ACTIVE_TRIGGER_INFO');
      
      if (!triggerInfoJson) {
        Logger.warn('No active trigger info found for execution recording');
        return;
      }
      
      const triggerInfo = JSON.parse(triggerInfoJson);
      
      // 실행 기록 추가
      const executionRecord = {
        timestamp: new Date().toISOString(),
        success: success,
        metadata: metadata,
        sessionId: Logger.getCurrentSessionId()
      };
      
      if (!triggerInfo.executionHistory) {
        triggerInfo.executionHistory = [];
      }
      
      triggerInfo.executionHistory.push(executionRecord);
      
      // 히스토리 크기 제한 (최대 50개)
      if (triggerInfo.executionHistory.length > 50) {
        triggerInfo.executionHistory = triggerInfo.executionHistory.slice(-50);
      }
      
      // 성공률 계산
      const recentExecutions = triggerInfo.executionHistory.slice(-10);
      const successCount = recentExecutions.filter(exec => exec.success).length;
      triggerInfo.recentSuccessRate = (successCount / recentExecutions.length) * 100;
      
      // 업데이트된 정보 저장
      properties.setProperty('ACTIVE_TRIGGER_INFO', JSON.stringify(triggerInfo));
      
      Logger.info('Execution recorded', {
        success: success,
        recentSuccessRate: triggerInfo.recentSuccessRate,
        historyLength: triggerInfo.executionHistory.length
      });
      
      // 성공률이 낮으면 경고
      if (triggerInfo.recentSuccessRate < 50) {
        Logger.warn('Low success rate detected', {
          successRate: triggerInfo.recentSuccessRate,
          recentExecutions: recentExecutions.length
        });
        
        this._handleLowSuccessRate(triggerInfo);
      }
      
    } catch (error) {
      Logger.error('Failed to record execution', {
        error: error.message,
        success: success
      });
    }
  }
  
  /**
   * 다음 실행 시간 계산
   * @private
   */
  static _calculateNextExecution(triggerInfo) {
    try {
      if (!triggerInfo.executionHistory || triggerInfo.executionHistory.length === 0) {
        // 히스토리가 없으면 현재 시간 기준으로 계산
        const nextTime = new Date();
        nextTime.setMinutes(nextTime.getMinutes() + triggerInfo.intervalMinutes);
        return nextTime;
      }
      
      // 마지막 실행 시간 기준으로 계산
      const lastExecution = triggerInfo.executionHistory[triggerInfo.executionHistory.length - 1];
      const lastTime = new Date(lastExecution.timestamp);
      const nextTime = new Date(lastTime.getTime() + (triggerInfo.intervalMinutes * 60 * 1000));
      
      // 이미 지난 시간이면 다음 주기로
      if (nextTime <= new Date()) {
        const now = new Date();
        const minutesSinceLastExecution = (now - lastTime) / (1000 * 60);
        const cyclesPassed = Math.floor(minutesSinceLastExecution / triggerInfo.intervalMinutes);
        nextTime.setMinutes(lastTime.getMinutes() + ((cyclesPassed + 1) * triggerInfo.intervalMinutes));
      }
      
      return nextTime;
      
    } catch (error) {
      Logger.error('Failed to calculate next execution time', {
        error: error.message
      });
      return null;
    }
  }
  
  /**
   * 헬스체크 수행
   * @private
   */
  static _performHealthCheck() {
    const healthCheck = {
      overall: 'healthy',
      apiHealth: 'unknown',
      configHealth: 'unknown',
      warnings: []
    };
    
    try {
      // API 상태 확인
      const apiHealth = GeminiAPI.checkApiHealth();
      healthCheck.apiHealth = apiHealth.status;
      
      if (apiHealth.status === 'unhealthy') {
        healthCheck.warnings.push('API接続に問題があります');
        healthCheck.overall = 'warning';
      }
      
      // 설정 상태 확인
      const configHealth = ConfigManager.validateConfiguration();
      healthCheck.configHealth = configHealth.isValid ? 'healthy' : 'unhealthy';
      
      if (!configHealth.isValid) {
        healthCheck.warnings.push('設定に問題があります');
        healthCheck.overall = 'unhealthy';
      }
      
      // 최근 실행 성공률 확인
      const status = this.getStatus();
      if (status.triggerInfo && status.triggerInfo.recentSuccessRate < 70) {
        healthCheck.warnings.push(`実行成功率が低いです (${status.triggerInfo.recentSuccessRate.toFixed(1)}%)`);
        if (healthCheck.overall === 'healthy') {
          healthCheck.overall = 'warning';
        }
      }
      
      // 에러 로그 확인
      const errorStats = Logger.getLoggingStats();
      if (errorStats.totalErrors > 10) {
        healthCheck.warnings.push('最近のエラー数が多いです');
        if (healthCheck.overall === 'healthy') {
          healthCheck.overall = 'warning';
        }
      }
      
    } catch (error) {
      healthCheck.overall = 'unhealthy';
      healthCheck.warnings.push(`ヘルスチェック失敗: ${error.message}`);
    }
    
    return healthCheck;
  }
  
  /**
   * 헬스체크 스케줄링
   * @private
   */
  static _scheduleHealthCheck() {
    try {
      // 기존 헬스체크 트리거 정리
      const triggers = ScriptApp.getScriptTriggers();
      triggers.forEach(trigger => {
        if (trigger.getHandlerFunction() === 'performScheduledHealthCheck') {
          ScriptApp.deleteTrigger(trigger);
        }
      });
      
      // 새 헬스체크 트리거 생성 (1시간마다)
      ScriptApp.newTrigger('performScheduledHealthCheck')
        .timeBased()
        .everyHours(1)
        .create();
        
      Logger.info('Health check scheduled');
      
    } catch (error) {
      Logger.warn('Failed to schedule health check', {
        error: error.message
      });
    }
  }
  
  /**
   * 낮은 성공률 처리
   * @private
   */
  static _handleLowSuccessRate(triggerInfo) {
    try {
      const config = ConfigManager.getEmailConfig();
      
      if (config.enableLowSuccessRateNotification) {
        // 관리자에게 알림
        const subject = '[WARNING] 実行成功率低下';
        const body = `
自動実行の成功率が低下しています。

現在の成功率: ${triggerInfo.recentSuccessRate.toFixed(1)}%
最近の実行回数: ${triggerInfo.executionHistory.slice(-10).length}回

システムの確認をお勧めします。

このメールは自動送信されました。
        `;
        
        GmailApp.sendEmail(
          config.recipients[0] || config.recipients,
          subject,
          body
        );
        
        Logger.info('Low success rate notification sent');
      }
      
      // 성공률이 매우 낮으면 (30% 미만) 자동 중지 고려
      if (triggerInfo.recentSuccessRate < 30) {
        Logger.warn('Success rate critically low, considering auto-stop', {
          successRate: triggerInfo.recentSuccessRate
        });
        
        // 설정에 따라 자동 중지
        const triggerConfig = ConfigManager.getTriggerConfig();
        if (triggerConfig.autoStopOnLowSuccessRate) {
          this.stopOnCriticalError();
        }
      }
      
    } catch (error) {
      Logger.error('Failed to handle low success rate', {
        error: error.message
      });
    }
  }
  
  /**
   * 긴급 중지 알림
   * @private
   */
  static _notifyEmergencyStop() {
    try {
      const config = ConfigManager.getEmailConfig();
      
      if (config.enableEmergencyNotification) {
        const subject = '[EMERGENCY] 自動実行緊急停止';
        const body = `
システムで致命的な問題が検出されたため、自動実行を緊急停止しました。

停止時刻: ${new Date().toLocaleString()}
停止理由: 致命的エラーの検出

速やかにシステムの確認をお願いします。

このメールは自動送信されました。
        `;
        
        GmailApp.sendEmail(
          config.recipients[0] || config.recipients,
          subject,
          body
        );
        
        Logger.info('Emergency stop notification sent');
      }
      
    } catch (error) {
      Logger.error('Failed to send emergency stop notification', {
        error: error.message
      });
    }
  }
  
  /**
   * 모든 트리거 디버그 정보 조회
   */
  static debugTriggers() {
    try {
      const triggers = ScriptApp.getScriptTriggers();
      const triggerInfo = [];
      
      triggers.forEach(trigger => {
        const info = {
          id: trigger.getUniqueId(),
          handlerFunction: trigger.getHandlerFunction(),
          triggerSource: trigger.getTriggerSource().toString(),
          eventType: trigger.getEventType() ? trigger.getEventType().toString() : 'N/A'
        };
        
        // 시간 기반 트리거인 경우 추가 정보
        if (trigger.getTriggerSource() === ScriptApp.TriggerSource.CLOCK) {
          try {
            // 시간 기반 트리거의 상세 정보는 직접 접근할 수 없으므로 기본 정보만
            info.triggerType = 'time_based';
          } catch (e) {
            info.triggerType = 'unknown';
          }
        }
        
        triggerInfo.push(info);
      });
      
      Logger.info('Debug trigger information collected', {
        triggerCount: triggerInfo.length,
        triggers: triggerInfo
      });
      
      return triggerInfo;
      
    } catch (error) {
      Logger.error('Failed to debug triggers', {
        error: error.message
      });
      
      return [];
    }
  }
  
  /**
   * 트리거 통계 조회
   */
  static getTriggerStats() {
    try {
      const status = this.getStatus();
      const stats = {
        isActive: status.isActive,
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageExecutionTime: 0,
        recentSuccessRate: 0,
        lastExecution: null,
        uptime: null
      };
      
      if (status.triggerInfo && status.triggerInfo.executionHistory) {
        const history = status.triggerInfo.executionHistory;
        
        stats.totalExecutions = history.length;
        stats.successfulExecutions = history.filter(exec => exec.success).length;
        stats.failedExecutions = history.length - stats.successfulExecutions;
        
        if (history.length > 0) {
          // 평균 실행 시간 계산 (메타데이터에서)
          const executionTimes = history
            .filter(exec => exec.metadata && exec.metadata.executionTime)
            .map(exec => exec.metadata.executionTime);
            
          if (executionTimes.length > 0) {
            stats.averageExecutionTime = executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length;
          }
          
          // 최근 성공률
          const recentHistory = history.slice(-10);
          const recentSuccessCount = recentHistory.filter(exec => exec.success).length;
          stats.recentSuccessRate = (recentSuccessCount / recentHistory.length) * 100;
          
          // 마지막 실행
          stats.lastExecution = history[history.length - 1];
          
          // 업타임 계산
          if (status.triggerInfo.createdAt) {
            const createdTime = new Date(status.triggerInfo.createdAt);
            const currentTime = new Date();
            stats.uptime = currentTime - createdTime; // 밀리초
          }
        }
      }
      
      return stats;
      
    } catch (error) {
      Logger.error('Failed to get trigger stats', {
        error: error.message
      });
      
      return {
        isActive: false,
        error: error.message
      };
    }
  }
}

/**
 * 스케줄된 헬스체크 실행 함수 (트리거에서 호출)
 */
function performScheduledHealthCheck() {
  try {
    Logger.info('Performing scheduled health check');
    
    const healthCheck = TriggerManager._performHealthCheck();
    
    if (healthCheck.overall === 'unhealthy') {
      Logger.warn('System health check failed', {
        warnings: healthCheck.warnings,
        apiHealth: healthCheck.apiHealth,
        configHealth: healthCheck.configHealth
      });
      
      // 심각한 문제가 감지되면 알림
      const config = ConfigManager.getEmailConfig();
      if (config.enableHealthCheckNotification) {
        const subject = '[WARNING] システムヘルスチェック異常';
        const body = `
定期ヘルスチェックで問題が検出されました。

全体状態: ${healthCheck.overall}
API状態: ${healthCheck.apiHealth}
設定状態: ${healthCheck.configHealth}

警告事項:
${healthCheck.warnings.map(w => `• ${w}`).join('\n')}

システムの確認をお勧めします。

このメールは自動送信されました。
        `;
        
        GmailApp.sendEmail(
          config.recipients[0] || config.recipients,
          subject,
          body
        );
      }
    } else {
      Logger.info('Scheduled health check passed', {
        overall: healthCheck.overall,
        warningCount: healthCheck.warnings.length
      });
    }
    
  } catch (error) {
    Logger.error('Scheduled health check failed', {
      error: error.message
    });
  }
}