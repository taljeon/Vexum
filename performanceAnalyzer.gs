/**
 * performanceAnalyzer.gs - 성능 분석 및 모니터링 모듈
 * 실행 성능 추적, 시스템 최적화, 벤치마킹
 * 
 * @version 2.0
 * @author Google Apps Script System
 * @updated 2024
 */

/**
 * 성능 분석 클래스
 */
class PerformanceAnalyzer {
  
  /**
   * API 호출 성능 기록
   * @param {Object} callData - API 호출 데이터
   */
  static recordApiCall(callData) {
    try {
      const timestamp = new Date().toISOString();
      const sessionId = Logger.getCurrentSessionId();
      
      // 성능 기록 구성
      const performanceRecord = {
        timestamp: timestamp,
        sessionId: sessionId,
        type: callData.type || 'unknown',
        duration: callData.duration || 0,
        inputTokens: callData.inputTokens || 0,
        outputTokens: callData.outputTokens || 0,
        success: callData.success !== false,
        errorType: callData.errorType || null,
        compressionRatio: callData.compressionRatio || null,
        metadata: callData.metadata || {}
      };
      
      // 세션별 성능 데이터 저장
      this._savePerformanceRecord(performanceRecord);
      
      // 실시간 통계 업데이트
      this._updateRealTimeStats(performanceRecord);
      
      Logger.debug('API call performance recorded', performanceRecord);
      
    } catch (error) {
      Logger.error('Failed to record API call performance', {
        error: error.message,
        callData: callData
      });
    }
  }
  
  /**
   * 이메일 발송 성능 기록
   * @param {Object} emailData - 이메일 발송 데이터
   */
  static recordEmailSend(emailData) {
    try {
      const timestamp = new Date().toISOString();
      const sessionId = Logger.getCurrentSessionId();
      
      // 이메일 성능 기록 구성
      const emailRecord = {
        timestamp: timestamp,
        sessionId: sessionId,
        type: emailData.type || 'unknown',
        duration: emailData.duration || 0,
        recipientCount: emailData.recipientCount || 0,
        attachmentCount: emailData.attachmentCount || 0,
        emailCount: emailData.emailCount || 1,
        successCount: emailData.successCount || (emailData.success ? 1 : 0),
        success: emailData.success !== false,
        errorType: emailData.errorType || null
      };
      
      // 이메일 성능 데이터 저장
      this._saveEmailRecord(emailRecord);
      
      Logger.debug('Email send performance recorded', emailRecord);
      
    } catch (error) {
      Logger.error('Failed to record email send performance', {
        error: error.message,
        emailData: emailData
      });
    }
  }
  
  /**
   * 문서 처리 성능 기록
   * @param {Object} processingData - 문서 처리 데이터
   */
  static recordDocumentProcessing(processingData) {
    try {
      const timestamp = new Date().toISOString();
      const sessionId = Logger.getCurrentSessionId();
      
      // 문서 처리 성능 기록 구성
      const processingRecord = {
        timestamp: timestamp,
        sessionId: sessionId,
        sheetName: processingData.sheetName || 'unknown',
        duration: processingData.duration || 0,
        textLength: processingData.textLength || 0,
        pdfSize: processingData.pdfSize || 0,
        summaryLength: processingData.summaryLength || 0,
        success: processingData.success !== false,
        errorType: processingData.errorType || null,
        processingSteps: processingData.processingSteps || []
      };
      
      // 문서 처리 성능 데이터 저장
      this._saveProcessingRecord(processingRecord);
      
      Logger.debug('Document processing performance recorded', processingRecord);
      
    } catch (error) {
      Logger.error('Failed to record document processing performance', {
        error: error.message,
        processingData: processingData
      });
    }
  }
  
  /**
   * 성능 데이터 저장
   * @private
   */
  static _savePerformanceRecord(record) {
    try {
      const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
      const perfKey = `performance_${today}`;
      
      const properties = PropertiesService.getScriptProperties();
      const existingData = JSON.parse(properties.getProperty(perfKey) || '{"apiCalls": []}');
      
      if (!existingData.apiCalls) {
        existingData.apiCalls = [];
      }
      
      existingData.apiCalls.push(record);
      
      // 데이터 크기 제한 (최대 100개 기록)
      if (existingData.apiCalls.length > 100) {
        existingData.apiCalls = existingData.apiCalls.slice(-100);
      }
      
      properties.setProperty(perfKey, JSON.stringify(existingData));
      
    } catch (error) {
      Logger.error('Failed to save performance record', {
        error: error.message
      });
    }
  }
  
  /**
   * 이메일 기록 저장
   * @private
   */
  static _saveEmailRecord(record) {
    try {
      const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
      const perfKey = `performance_${today}`;
      
      const properties = PropertiesService.getScriptProperties();
      const existingData = JSON.parse(properties.getProperty(perfKey) || '{}');
      
      if (!existingData.emailSends) {
        existingData.emailSends = [];
      }
      
      existingData.emailSends.push(record);
      
      // 데이터 크기 제한
      if (existingData.emailSends.length > 50) {
        existingData.emailSends = existingData.emailSends.slice(-50);
      }
      
      properties.setProperty(perfKey, JSON.stringify(existingData));
      
    } catch (error) {
      Logger.error('Failed to save email record', {
        error: error.message
      });
    }
  }
  
  /**
   * 문서 처리 기록 저장
   * @private
   */
  static _saveProcessingRecord(record) {
    try {
      const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
      const perfKey = `performance_${today}`;
      
      const properties = PropertiesService.getScriptProperties();
      const existingData = JSON.parse(properties.getProperty(perfKey) || '{}');
      
      if (!existingData.documentProcessing) {
        existingData.documentProcessing = [];
      }
      
      existingData.documentProcessing.push(record);
      
      // 데이터 크기 제한
      if (existingData.documentProcessing.length > 100) {
        existingData.documentProcessing = existingData.documentProcessing.slice(-100);
      }
      
      properties.setProperty(perfKey, JSON.stringify(existingData));
      
    } catch (error) {
      Logger.error('Failed to save processing record', {
        error: error.message
      });
    }
  }
  
  /**
   * 실시간 통계 업데이트
   * @private
   */
  static _updateRealTimeStats(record) {
    try {
      const statsKey = 'realtime_performance_stats';
      const properties = PropertiesService.getScriptProperties();
      const stats = JSON.parse(properties.getProperty(statsKey) || '{}');
      
      // 기본 통계 초기화
      if (!stats.apiCalls) {
        stats.apiCalls = {
          total: 0,
          successful: 0,
          totalDuration: 0,
          totalTokens: 0
        };
      }
      
      // 통계 업데이트
      stats.apiCalls.total++;
      if (record.success) {
        stats.apiCalls.successful++;
      }
      stats.apiCalls.totalDuration += record.duration;
      stats.apiCalls.totalTokens += (record.inputTokens + record.outputTokens);
      
      // 평균 계산
      stats.apiCalls.averageDuration = stats.apiCalls.totalDuration / stats.apiCalls.total;
      stats.apiCalls.successRate = (stats.apiCalls.successful / stats.apiCalls.total) * 100;
      stats.apiCalls.averageTokensPerCall = stats.apiCalls.totalTokens / stats.apiCalls.total;
      
      stats.lastUpdated = new Date().toISOString();
      
      properties.setProperty(statsKey, JSON.stringify(stats));
      
    } catch (error) {
      Logger.error('Failed to update real-time stats', {
        error: error.message
      });
    }
  }
  
  /**
   * 현재 세션 통계 조회
   */
  static getCurrentSessionStats() {
    try {
      const sessionId = Logger.getCurrentSessionId();
      const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
      const perfKey = `performance_${today}`;
      
      const properties = PropertiesService.getScriptProperties();
      const data = JSON.parse(properties.getProperty(perfKey) || '{}');
      
      const sessionStats = {
        sessionId: sessionId,
        apiCalls: 0,
        emailSends: 0,
        documentProcessing: 0,
        averageProcessingTime: 0,
        successRate: 0,
        totalDuration: 0
      };
      
      // API 호출 통계
      if (data.apiCalls) {
        const sessionApiCalls = data.apiCalls.filter(call => call.sessionId === sessionId);
        sessionStats.apiCalls = sessionApiCalls.length;
        
        if (sessionApiCalls.length > 0) {
          const successfulCalls = sessionApiCalls.filter(call => call.success).length;
          sessionStats.successRate = (successfulCalls / sessionApiCalls.length) * 100;
          
          const totalDuration = sessionApiCalls.reduce((sum, call) => sum + call.duration, 0);
          sessionStats.averageProcessingTime = totalDuration / sessionApiCalls.length;
          sessionStats.totalDuration += totalDuration;
        }
      }
      
      // 이메일 발송 통계
      if (data.emailSends) {
        const sessionEmails = data.emailSends.filter(email => email.sessionId === sessionId);
        sessionStats.emailSends = sessionEmails.length;
        
        const emailDuration = sessionEmails.reduce((sum, email) => sum + email.duration, 0);
        sessionStats.totalDuration += emailDuration;
      }
      
      // 문서 처리 통계
      if (data.documentProcessing) {
        const sessionDocs = data.documentProcessing.filter(doc => doc.sessionId === sessionId);
        sessionStats.documentProcessing = sessionDocs.length;
        
        const docDuration = sessionDocs.reduce((sum, doc) => sum + doc.duration, 0);
        sessionStats.totalDuration += docDuration;
      }
      
      return sessionStats;
      
    } catch (error) {
      Logger.error('Failed to get current session stats', {
        error: error.message
      });
      
      return {
        sessionId: 'unknown',
        error: error.message
      };
    }
  }
  
  /**
   * 성능 통계 표시
   */
  static showStats() {
    try {
      const sessionStats = this.getCurrentSessionStats();
      const systemStats = this.getSystemStats();
      
      let message = `■ 性能統計\n\n`;
      
      // 현재 세션 통계
      message += `【現在のセッション】\n`;
      message += `セッションID: ${sessionStats.sessionId.substring(0, 8)}...\n`;
      message += `API呼び出し: ${sessionStats.apiCalls}回\n`;
      message += `メール送信: ${sessionStats.emailSends}回\n`;
      message += `文書処理: ${sessionStats.documentProcessing}件\n`;
      message += `成功率: ${sessionStats.successRate.toFixed(1)}%\n`;
      message += `平均処理時間: ${sessionStats.averageProcessingTime.toFixed(0)}ms\n`;
      message += `総実行時間: ${(sessionStats.totalDuration / 1000).toFixed(1)}秒\n\n`;
      
      // 시스템 전체 통계
      message += `【システム全体】\n`;
      message += `今日のAPI呼び出し: ${systemStats.todayApiCalls}回\n`;
      message += `今日の成功率: ${systemStats.todaySuccessRate.toFixed(1)}%\n`;
      message += `平均応答時間: ${systemStats.averageResponseTime.toFixed(0)}ms\n`;
      message += `最終実行: ${systemStats.lastExecution || 'N/A'}\n\n`;
      
      // 추가 정보
      if (systemStats.recommendations && systemStats.recommendations.length > 0) {
        message += `【推奨事項】\n`;
        systemStats.recommendations.forEach(rec => {
          message += `• ${rec}\n`;
        });
      }
      
      SpreadsheetApp.getUi().alert('性能統計', message, SpreadsheetApp.getUi().ButtonSet.OK);
      
    } catch (error) {
      Logger.error('Failed to show performance stats', {
        error: error.message
      });
      
      SpreadsheetApp.getUi().alert(
        '性能統計エラー',
        `統計表示に失敗しました: ${error.message}`,
        SpreadsheetApp.getUi().ButtonSet.OK
      );
    }
  }
  
  /**
   * 시스템 전체 통계 조회
   */
  static getSystemStats() {
    try {
      const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
      const perfKey = `performance_${today}`;
      
      const properties = PropertiesService.getScriptProperties();
      const data = JSON.parse(properties.getProperty(perfKey) || '{}');
      
      const stats = {
        todayApiCalls: 0,
        todaySuccessRate: 0,
        averageResponseTime: 0,
        lastExecution: null,
        recommendations: []
      };
      
      // API 호출 분석
      if (data.apiCalls && data.apiCalls.length > 0) {
        stats.todayApiCalls = data.apiCalls.length;
        
        const successfulCalls = data.apiCalls.filter(call => call.success).length;
        stats.todaySuccessRate = (successfulCalls / data.apiCalls.length) * 100;
        
        const totalDuration = data.apiCalls.reduce((sum, call) => sum + call.duration, 0);
        stats.averageResponseTime = totalDuration / data.apiCalls.length;
        
        // 마지막 실행 시간
        const lastCall = data.apiCalls[data.apiCalls.length - 1];
        stats.lastExecution = new Date(lastCall.timestamp).toLocaleString();
        
        // 성능 추천사항 생성
        stats.recommendations = this._generatePerformanceRecommendations(data);
      }
      
      return stats;
      
    } catch (error) {
      Logger.error('Failed to get system stats', {
        error: error.message
      });
      
      return {
        todayApiCalls: 0,
        error: error.message
      };
    }
  }
  
  /**
   * 성능 추천사항 생성
   * @private
   */
  static _generatePerformanceRecommendations(data) {
    const recommendations = [];
    
    try {
      // API 호출 분석
      if (data.apiCalls && data.apiCalls.length > 0) {
        const avgResponseTime = data.apiCalls.reduce((sum, call) => sum + call.duration, 0) / data.apiCalls.length;
        
        if (avgResponseTime > 10000) { // 10초 이상
          recommendations.push('API応答時間が遅いです。テキスト最適化を検討してください。');
        }
        
        const failureRate = (data.apiCalls.filter(call => !call.success).length / data.apiCalls.length) * 100;
        if (failureRate > 20) {
          recommendations.push('API失敗率が高いです。ネットワークやAPIキーを確認してください。');
        }
        
        // 토큰 사용량 분석
        const avgTokens = data.apiCalls.reduce((sum, call) => sum + (call.inputTokens || 0), 0) / data.apiCalls.length;
        if (avgTokens > 25000) {
          recommendations.push('トークン使用量が多いです。テキスト圧縮を強化してください。');
        }
      }
      
      // 이메일 발송 분석
      if (data.emailSends && data.emailSends.length > 0) {
        const avgEmailDuration = data.emailSends.reduce((sum, email) => sum + email.duration, 0) / data.emailSends.length;
        
        if (avgEmailDuration > 5000) { // 5초 이상
          recommendations.push('メール送信が遅いです。添付ファイルサイズを確認してください。');
        }
        
        const totalAttachments = data.emailSends.reduce((sum, email) => sum + (email.attachmentCount || 0), 0);
        if (totalAttachments > 50) {
          recommendations.push('添付ファイル数が多いです。統合送信を推奨します。');
        }
      }
      
      // 문서 처리 분석
      if (data.documentProcessing && data.documentProcessing.length > 0) {
        const avgProcessingTime = data.documentProcessing.reduce((sum, doc) => sum + doc.duration, 0) / data.documentProcessing.length;
        
        if (avgProcessingTime > 15000) { // 15초 이상
          recommendations.push('文書処理が遅いです。処理対象の削減を検討してください。');
        }
        
        const avgTextLength = data.documentProcessing.reduce((sum, doc) => sum + (doc.textLength || 0), 0) / data.documentProcessing.length;
        if (avgTextLength > 50000) {
          recommendations.push('処理するテキストが長いです。事前フィルタリングを検討してください。');
        }
      }
      
    } catch (error) {
      Logger.error('Failed to generate performance recommendations', {
        error: error.message
      });
    }
    
    return recommendations;
  }
  
  /**
   * 벤치마크 테스트 실행
   * @param {number} testSheetCount - 테스트할 시트 수
   */
  static runBenchmark(testSheetCount = 5) {
    try {
      Logger.info('Starting performance benchmark', {
        testSheetCount: testSheetCount
      });
      
      const startTime = new Date();
      const results = {
        testSheetCount: testSheetCount,
        successCount: 0,
        failureCount: 0,
        totalTimeSeconds: 0,
        avgTimePerSheet: 0,
        successRate: 0,
        detailedResults: []
      };
      
      // 벤치마크용 더미 데이터 생성
      const dummySheets = this._generateBenchmarkData(testSheetCount);
      
      // 각 시트에 대해 처리 시뮬레이션
      for (let i = 0; i < dummySheets.length; i++) {
        const sheetStartTime = new Date();
        
        try {
          // 실제 처리 시뮬레이션 (텍스트 최적화 + API 호출 시뮬레이션)
          const sheetResult = this._simulateSheetProcessing(dummySheets[i]);
          
          const sheetDuration = new Date() - sheetStartTime;
          
          results.detailedResults.push({
            sheetIndex: i + 1,
            sheetName: dummySheets[i].name,
            duration: sheetDuration,
            success: sheetResult.success,
            textLength: dummySheets[i].textLength,
            processingSteps: sheetResult.steps
          });
          
          if (sheetResult.success) {
            results.successCount++;
          } else {
            results.failureCount++;
          }
          
        } catch (error) {
          const sheetDuration = new Date() - sheetStartTime;
          
          results.detailedResults.push({
            sheetIndex: i + 1,
            sheetName: dummySheets[i].name,
            duration: sheetDuration,
            success: false,
            error: error.message
          });
          
          results.failureCount++;
        }
      }
      
      // 결과 계산
      const totalTime = new Date() - startTime;
      results.totalTimeSeconds = totalTime / 1000;
      results.avgTimePerSheet = totalTime / testSheetCount;
      results.successRate = (results.successCount / testSheetCount) * 100;
      
      // 벤치마크 결과 저장
      this._saveBenchmarkResults(results);
      
      Logger.info('Performance benchmark completed', {
        totalTime: results.totalTimeSeconds,
        successRate: results.successRate,
        avgTimePerSheet: results.avgTimePerSheet
      });
      
      return results;
      
    } catch (error) {
      Logger.error('Performance benchmark failed', {
        error: error.message
      });
      
      throw error;
    }
  }
  
  /**
   * 벤치마크용 더미 데이터 생성
   * @private
   */
  static _generateBenchmarkData(count) {
    const dummySheets = [];
    
    for (let i = 0; i < count; i++) {
      const textLength = Math.floor(Math.random() * 20000) + 5000; // 5KB-25KB
      const dummyText = this._generateDummyText(textLength);
      
      dummySheets.push({
        name: `BenchmarkSheet_${i + 1}`,
        textLength: textLength,
        content: dummyText,
        complexity: Math.random() * 3 // 0-3 복잡도
      });
    }
    
    return dummySheets;
  }
  
  /**
   * 더미 텍스트 생성
   * @private
   */
  static _generateDummyText(length) {
    const sampleTexts = [
      '売上データの分析結果を報告します。',
      'プロジェクトの進捗状況について説明します。',
      '顧客満足度調査の結果をまとめました。',
      '品質管理システムの改善提案です。',
      'マーケティング戦略の検討事項です。'
    ];
    
    let text = '';
    while (text.length < length) {
      const randomText = sampleTexts[Math.floor(Math.random() * sampleTexts.length)];
      text += randomText + '\n';
      
      // 시트 데이터 시뮬레이션을 위한 표 형태 추가
      if (Math.random() < 0.3) {
        text += '項目\t値\t備考\n';
        for (let i = 0; i < 5; i++) {
          text += `データ${i + 1}\t${Math.floor(Math.random() * 1000)}\t説明${i + 1}\n`;
        }
      }
    }
    
    return text.substring(0, length);
  }
  
  /**
   * 시트 처리 시뮬레이션
   * @private
   */
  static _simulateSheetProcessing(sheetData) {
    const steps = [];
    const startTime = new Date();
    
    try {
      // 1. 텍스트 최적화 시뮬레이션
      steps.push({ step: 'text_optimization', startTime: new Date() });
      Utilities.sleep(Math.floor(Math.random() * 500) + 200); // 200-700ms
      steps.push({ step: 'text_optimization', endTime: new Date(), success: true });
      
      // 2. API 호출 시뮬레이션
      steps.push({ step: 'api_call', startTime: new Date() });
      const apiDelay = Math.floor(Math.random() * 2000) + 1000; // 1-3초
      Utilities.sleep(apiDelay);
      
      // 복잡도에 따른 실패 확률
      const failureProbability = sheetData.complexity * 0.1;
      const success = Math.random() > failureProbability;
      
      steps.push({ step: 'api_call', endTime: new Date(), success: success });
      
      if (!success) {
        throw new Error('Simulated API failure');
      }
      
      // 3. PDF 생성 시뮬레이션
      steps.push({ step: 'pdf_generation', startTime: new Date() });
      Utilities.sleep(Math.floor(Math.random() * 300) + 100); // 100-400ms
      steps.push({ step: 'pdf_generation', endTime: new Date(), success: true });
      
      return {
        success: true,
        steps: steps,
        totalDuration: new Date() - startTime
      };
      
    } catch (error) {
      return {
        success: false,
        steps: steps,
        error: error.message,
        totalDuration: new Date() - startTime
      };
    }
  }
  
  /**
   * 벤치마크 결과 저장
   * @private
   */
  static _saveBenchmarkResults(results) {
    try {
      const timestamp = new Date().toISOString();
      const benchmarkKey = `benchmark_${timestamp.split('T')[0]}`;
      
      const properties = PropertiesService.getScriptProperties();
      const existingBenchmarks = JSON.parse(properties.getProperty(benchmarkKey) || '[]');
      
      const benchmarkEntry = {
        timestamp: timestamp,
        results: results,
        systemInfo: {
          triggerStatus: TriggerManager.getStatus(),
          currentConfig: ConfigManager.getEmailMode()
        }
      };
      
      existingBenchmarks.push(benchmarkEntry);
      
      // 최대 10개 벤치마크 결과 유지
      if (existingBenchmarks.length > 10) {
        existingBenchmarks.splice(0, existingBenchmarks.length - 10);
      }
      
      properties.setProperty(benchmarkKey, JSON.stringify(existingBenchmarks));
      
    } catch (error) {
      Logger.error('Failed to save benchmark results', {
        error: error.message
      });
    }
  }
  
  /**
   * 시스템 건강 상태 리포트 생성
   */
  static getSystemHealthReport() {
    try {
      const report = {
        overall: 'healthy',
        timestamp: new Date().toISOString(),
        components: {},
        recommendations: []
      };
      
      // 트리거 상태 확인
      const triggerStatus = TriggerManager.getStatus();
      report.components.triggers = {
        isActive: triggerStatus.isActive,
        emailMode: ConfigManager.getEmailMode(),
        status: triggerStatus.isActive ? 'active' : 'inactive'
      };
      
      // 성능 상태 확인
      const systemStats = this.getSystemStats();
      report.components.performance = {
        todayApiCalls: systemStats.todayApiCalls,
        successRate: systemStats.todaySuccessRate,
        averageResponseTime: systemStats.averageResponseTime,
        status: systemStats.todaySuccessRate >= 80 ? 'good' : 'warning'
      };
      
      // 에러 상태 확인
      const errorStats = Logger.getLoggingStats();
      report.components.errors = {
        recentErrorCount: errorStats.totalErrors,
        lastErrorTime: errorStats.lastErrorTime,
        status: errorStats.totalErrors <= 5 ? 'good' : 'warning'
      };
      
      // 설정 상태 확인
      const configValidation = ConfigManager.validateConfiguration();
      report.components.configuration = {
        isValid: configValidation.isValid,
        issues: configValidation.issues || [],
        status: configValidation.isValid ? 'good' : 'error'
      };
      
      // 전체 상태 결정
      const componentStatuses = Object.values(report.components).map(comp => comp.status);
      if (componentStatuses.includes('error')) {
        report.overall = 'error';
      } else if (componentStatuses.includes('warning')) {
        report.overall = 'warning';
      }
      
      // 추천사항 생성
      if (report.components.performance.successRate < 80) {
        report.recommendations.push('API成功率が低いです。システムの確認が必要です。');
      }
      
      if (report.components.errors.recentErrorCount > 10) {
        report.recommendations.push('エラー数が多いです。ログの確認をお勧めします。');
      }
      
      if (!report.components.configuration.isValid) {
        report.recommendations.push('設定に問題があります。設定の見直しが必要です。');
      }
      
      if (!report.components.triggers.isActive) {
        report.recommendations.push('自動実行が停止しています。必要に応じて再開してください。');
      }
      
      return report;
      
    } catch (error) {
      Logger.error('Failed to generate system health report', {
        error: error.message
      });
      
      return {
        overall: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  /**
   * 상세 분석 내보내기
   */
  static exportDetailedAnalysis() {
    try {
      const analysis = {
        timestamp: new Date().toISOString(),
        systemHealth: this.getSystemHealthReport(),
        performanceStats: this.getSystemStats(),
        sessionStats: this.getCurrentSessionStats(),
        triggerInfo: TriggerManager.getStatus(),
        errorAnalysis: Logger.analyzeErrorLogs()
      };
      
      // 분석 결과를 JSON 형태로 로그에 출력
      console.log('=== DETAILED SYSTEM ANALYSIS ===');
      console.log(JSON.stringify(analysis, null, 2));
      
      // 사용자에게 결과 요약 표시
      let message = `■ 詳細分析エクスポート完了\n\n`;
      message += `実行時刻: ${new Date().toLocaleString()}\n`;
      message += `システム状態: ${analysis.systemHealth.overall}\n`;
      message += `今日のAPI呼び出し: ${analysis.performanceStats.todayApiCalls}回\n`;
      message += `成功率: ${analysis.performanceStats.todaySuccessRate.toFixed(1)}%\n\n`;
      message += `詳細な分析結果はログに出力されました。\n`;
      message += `スクリプトエディタのログを確認してください。`;
      
      SpreadsheetApp.getUi().alert('詳細分析', message, SpreadsheetApp.getUi().ButtonSet.OK);
      
      Logger.info('Detailed analysis exported', {
        analysisComponents: Object.keys(analysis),
        systemOverall: analysis.systemHealth.overall
      });
      
    } catch (error) {
      Logger.error('Failed to export detailed analysis', {
        error: error.message
      });
      
      SpreadsheetApp.getUi().alert(
        '詳細分析エラー',
        `分析エクスポートに失敗しました: ${error.message}`,
        SpreadsheetApp.getUi().ButtonSet.OK
      );
    }
  }
  
  /**
   * 성능 데이터 정리 (오래된 데이터 삭제)
   */
  static cleanupPerformanceData(daysToKeep = 7) {
    try {
      const properties = PropertiesService.getScriptProperties();
      const allProperties = properties.getProperties();
      
      let cleanedCount = 0;
      
      Object.keys(allProperties).forEach(key => {
        if (key.startsWith('performance_') || key.startsWith('benchmark_')) {
          const dateStr = key.split('_').pop();
          
          try {
            const dataDate = new Date(dateStr);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
            
            if (dataDate < cutoffDate) {
              properties.deleteProperty(key);
              cleanedCount++;
            }
          } catch (dateError) {
            // 날짜 파싱 실패 시 건너뛰기
          }
        }
      });
      
      Logger.info('Performance data cleanup completed', {
        cleanedCount: cleanedCount,
        daysToKeep: daysToKeep
      });
      
      return cleanedCount;
      
    } catch (error) {
      Logger.error('Performance data cleanup failed', {
        error: error.message
      });
      
      return 0;
    }
  }
}