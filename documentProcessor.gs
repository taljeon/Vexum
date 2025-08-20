/**
 * documentProcessor.gs - 핵심 문서 처리 로직
 * 문서 처리, 배치 실행, 텍스트 최적화
 * 
 * @version 2.0
 * @author Google Apps Script System
 * @updated 2024
 */

/**
 * 문서 처리 메인 클래스 (개선된 버전)
 */
class DocumentProcessor {
  /**
   * 메인 처리 함수 (모드별 분기) - 개선된 버전
   */
  static sendAllPdfs(emailMode = null) {
    const performanceMonitor = PerformanceAnalyzer.startPerformanceMonitoring();
    const startTime = new Date().getTime();
    let successCount = 0;
    let failCount = 0;
    const errors = [];
    const processedData = [];
    
    try {
      // 설정 검증 및 동적 설정 로드
      ConfigManager.validateRequiredProperties();
      const executionSettings = ConfigManager.getExecutionSettings();
      
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheets = ss.getSheets().filter(sheet => 
        sheet.getName() !== CONFIG.LOGGING.ERROR_SHEET_NAME
      );
      
      if (sheets.length === 0) {
        throw new Error('処理対象のシートがありません。');
      }
      
      // 동적 설정 계산
      const dynamicLimits = ConfigHelper.calculateDynamicLimits(sheets.length);
      if (dynamicLimits.willExceedTimeLimit) {
        Logger.warning('Execution may exceed time limit', {
          sheetCount: sheets.length,
          estimatedTime: Math.round(dynamicLimits.estimatedExecutionTimeMs / 1000),
          maxTime: Math.round(executionSettings.maxTimeMs / 1000),
          recommendations: dynamicLimits.recommendations
        });
      }
      
      const settings = ConfigManager.getAllSettings();
      
      // 이메일 모드 결정
      const currentEmailMode = emailMode || ConfigManager.getEmailMode();
      
      Logger.info('PDF送信処理開始', { 
        totalSheets: sheets.length,
        emailMode: currentEmailMode,
        batchSize: executionSettings.batchSize,
        maxTimeMs: executionSettings.maxTimeMs,
        recommendedBatchSize: dynamicLimits.recommendedBatchSize
      });
      
      performanceMonitor.checkpoint('Initialization completed');
      
      // 시트 처리 (PDF 생성 및 요약 생성)
      const results = this.processSheetsInBatches(
        sheets, 
        settings.GEMINI_API_KEY, 
        startTime,
        executionSettings,
        performanceMonitor
      );
      
      successCount = results.successCount;
      failCount = results.failCount;
      errors.push(...results.errors);
      processedData.push(...results.processedData);
      
      performanceMonitor.checkpoint('Sheet processing completed');
      
      // 메일 전송 (모드에 따라 분기)
      if (successCount > 0 || currentEmailMode !== CONFIG.EMAIL_MODE.ERRORS_ONLY) {
        EmailSender.sendByMode(currentEmailMode, processedData, settings.MAIL_TO, settings.MAIL_SUBJECT, errors);
        performanceMonitor.checkpoint('Email sending completed');
      }
      
      // 성능 분석
      const performanceResults = performanceMonitor.finish(sheets.length, successCount, failCount);
      const apiUsage = PerformanceAnalyzer.analyzeApiUsage(processedData);
      
      // 결과 보고
      const executionTime = new Date().getTime() - startTime;
      Logger.info('PDF送信処理完了', {
        successCount,
        failCount,
        emailMode: currentEmailMode,
        executionTime: `${Math.round(executionTime/1000)}秒`,
        avgTimePerSheet: performanceResults.avgTimePerSheet,
        apiUsage: apiUsage
      });
      
      // 트리거 실행 결과 저장
      TriggerManager.saveExecutionResult(successCount, failCount, currentEmailMode, Math.round(executionTime/1000));
      
      // 사용자에게 결과 표시
      this.showExecutionResults(successCount, failCount, currentEmailMode, executionTime, performanceResults, apiUsage);
      
      // 실패가 있을 경우 관리자에게 보고서 전송
      if (failCount > 0) {
        this.sendSummaryReport(successCount, failCount, errors, performanceResults);
      }
      
    } catch (error) {
      const criticalError = ErrorHandler.handleCriticalError(error, 'sendAllPdfs');
      Logger.critical('sendAllPdfs critical error', criticalError);
      
      // 치명적 에러 시 자동 실행 중지
      if (criticalError.shouldStopTrigger) {
        TriggerManager.stopOnCriticalError();
      }
      
      SpreadsheetApp.getUi().alert("致命的エラー: " + error.message);
    }
  }
  
  /**
   * 배치 단위로 시트 처리 (개선된 버전)
   */
  static processSheetsInBatches(sheets, apiKey, startTime, executionSettings, performanceMonitor) {
    let successCount = 0;
    let failCount = 0;
    const errors = [];
    const processedData = [];
    const batchResults = [];
    
    const totalBatches = Math.ceil(sheets.length / executionSettings.batchSize);
    
    for (let i = 0; i < sheets.length; i += executionSettings.batchSize) {
      const batchNumber = Math.floor(i / executionSettings.batchSize) + 1;
      
      // 실행 시간 체크 (개선된 버전)
      const currentTime = new Date().getTime();
      const elapsedTime = currentTime - startTime;
      const remainingTime = executionSettings.maxTimeMs - elapsedTime;
      
      if (remainingTime < 30000) { // 30초 버퍼
        const remaining = sheets.length - i;
        Logger.warning('시간 제한으로 인한 중단', {
          processedSheets: i,
          remainingSheets: remaining,
          elapsedTimeSeconds: Math.round(elapsedTime / 1000),
          remainingTimeSeconds: Math.round(remainingTime / 1000)
        });
        break;
      }
      
      const batch = sheets.slice(i, i + executionSettings.batchSize);
      const batchStartTime = new Date().getTime();
      
      Logger.info(`배치 ${batchNumber}/${totalBatches} 처리 시작`, {
        batchSize: batch.length,
        remainingTimeSeconds: Math.round(remainingTime / 1000)
      });
      
      // 배치 처리
      const batchResult = this.processBatch(batch, apiKey, batchNumber);
      
      successCount += batchResult.successCount;
      failCount += batchResult.failCount;
      errors.push(...batchResult.errors);
      processedData.push(...batchResult.processedData);
      
      const batchTime = new Date().getTime() - batchStartTime;
      batchResults.push({
        batchNumber,
        processingTime: batchTime,
        successCount: batchResult.successCount,
        failCount: batchResult.failCount
      });
      
      performanceMonitor.checkpoint(`Batch ${batchNumber}/${totalBatches} completed`);
      
      // 배치 간 대기 (마지막 배치가 아닌 경우)
      if (i + executionSettings.batchSize < sheets.length) {
        Utilities.sleep(executionSettings.batchDelayMs);
      }
    }
    
    // 배치 처리 통계 로깅
    this.logBatchStatistics(batchResults);
    
    return { successCount, failCount, errors, processedData, batchResults };
  }
  
  /**
   * 단일 배치 처리
   */
  static processBatch(batch, apiKey, batchNumber) {
    let successCount = 0;
    let failCount = 0;
    const errors = [];
    const processedData = [];
    
    batch.forEach((sheet, indexInBatch) => {
      try {
        const result = this.processSheetForData(sheet, apiKey);
        successCount++;
        processedData.push(result);
        
        Logger.info(`시트 처리 성공`, {
          batchNumber,
          indexInBatch,
          sheetName: sheet.getName(),
          originalLength: result.originalTextLength,
          optimizedLength: result.optimizedTextLength,
          reductionRate: Math.round((1 - result.optimizedTextLength / result.originalTextLength) * 100)
        });
        
      } catch (error) {
        failCount++;
        const errorInfo = `${sheet.getName()}: ${error.message}`;
        errors.push(errorInfo);
        
        const classifiedError = ErrorHandler.classifyError(error);
        Logger.error('시트 처리 실패', {
          batchNumber,
          indexInBatch,
          sheetName: sheet.getName(),
          errorType: classifiedError.type,
          error: error.message,
          retryable: classifiedError.retryable
        });
        
        // 재시도 가능한 에러의 경우 재시도 로직
        if (classifiedError.retryable && classifiedError.suggestedDelay) {
          try {
            Utilities.sleep(classifiedError.suggestedDelay);
            const retryResult = this.processSheetForData(sheet, apiKey);
            successCount++;
            failCount--; // 이전 실패 카운트 차감
            processedData.push(retryResult);
            errors.pop(); // 이전 에러 제거
            
            Logger.info('재시도 성공', {
              sheetName: sheet.getName(),
              originalError: error.message
            });
            
          } catch (retryError) {
            Logger.error('재시도 실패', {
              sheetName: sheet.getName(),
              originalError: error.message,
              retryError: retryError.message
            });
          }
        }
      }
    });
    
    return { successCount, failCount, errors, processedData };
  }
  
  /**
   * 개별 시트 처리 (데이터 준비만) - 개선된 버전
   */
  static processSheetForData(sheet, apiKey) {
    const processingStartTime = new Date().getTime();
    
    try {
      // 1. 시트 데이터 검증
      const docId = this.validateSheetData(sheet);
      
      // 2. 문서 가져오기 및 텍스트 추출
      const doc = DocumentApp.openById(docId);
      const bodyText = doc.getBody().getText();
      
      if (!bodyText.trim()) {
        throw new Error('ドキュメントが空です');
      }
      
      // 3. 텍스트 품질 평가
      const textQuality = TextOptimizer.assessTextQuality(bodyText);
      if (textQuality.score < 30) {
        Logger.warning('Low text quality detected', {
          sheetName: sheet.getName(),
          qualityScore: textQuality.score,
          issues: textQuality.issues
        });
      }
      
      // 4. 텍스트 길이 최적화
      const textSettings = ConfigManager.getTextSettings();
      const optimizedText = TextOptimizer.optimizeForApi(bodyText, textSettings);
      
      // 5. Gemini API로 요약 생성
      const summaryText = GeminiAPI.generateSummary(apiKey, optimizedText, textSettings.summaryMaxLength);
      
      // 6. PDF 변환
      const file = DriveApp.getFileById(docId);
      const pdfBlob = file.getAs("application/pdf").setName(file.getName() + ".pdf");
      
      const processingTime = new Date().getTime() - processingStartTime;
      
      return {
        sheetName: sheet.getName(),
        docId: docId,
        fileName: file.getName(),
        summaryText: summaryText,
        pdfBlob: pdfBlob,
        originalTextLength: bodyText.length,
        optimizedTextLength: optimizedText.length,
        textQuality: textQuality,
        processingTime: processingTime,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      // 에러에 추가 컨텍스트 정보 추가
      const enhancedError = new Error(error.message);
      enhancedError.sheetName = sheet.getName();
      enhancedError.processingTime = new Date().getTime() - processingStartTime;
      enhancedError.originalError = error;
      
      throw enhancedError;
    }
  }
  
  /**
   * 시트 데이터 검증 (개선된 버전)
   */
  static validateSheetData(sheet) {
    const docId = sheet.getRange("A1").getValue();
    
    if (!docId) {
      throw new Error('A1セルにDocument IDが設定されていません');
    }
    
    if (typeof docId !== 'string') {
      throw new Error(`Document IDは文字列である必要があります: ${typeof docId}`);
    }
    
    // Google 문서 ID 형식 검증 (더 정확한 검증)
    const docIdPattern = /^[a-zA-Z0-9-_]{25,}$/;
    if (!docIdPattern.test(docId)) {
      throw new Error(`無効なDocument ID形式: ${docId}`);
    }
    
    try {
      const doc = DocumentApp.openById(docId);
      
      // 문서 접근 권한 확인
      const docName = doc.getName();
      if (!docName) {
        throw new Error('文書名を取得できません。アクセス権限を確認してください。');
      }
      
      return docId;
      
    } catch (error) {
      if (error.message.includes('权限') || error.message.includes('permission')) {
        throw new Error(`ドキュメントへのアクセス権限がありません: ${docId}`);
      } else if (error.message.includes('not found') || error.message.includes('見つかりません')) {
        throw new Error(`ドキュメントが見つかりません: ${docId}`);
      } else {
        throw new Error(`ドキュメントにアクセスできません: ${error.message}`);
      }
    }
  }
  
  /**
   * 배치 처리 통계 로깅
   */
  static logBatchStatistics(batchResults) {
    if (batchResults.length === 0) return;
    
    const totalProcessingTime = batchResults.reduce((sum, batch) => sum + batch.processingTime, 0);
    const avgProcessingTime = totalProcessingTime / batchResults.length;
    const totalSuccess = batchResults.reduce((sum, batch) => sum + batch.successCount, 0);
    const totalFail = batchResults.reduce((sum, batch) => sum + batch.failCount, 0);
    
    Logger.info('배치 처리 통계', {
      totalBatches: batchResults.length,
      totalProcessingTimeMs: totalProcessingTime,
      avgProcessingTimeMs: Math.round(avgProcessingTime),
      totalSuccess,
      totalFail,
      overallSuccessRate: Math.round((totalSuccess / (totalSuccess + totalFail)) * 100),
      batchDetails: batchResults.map(batch => ({
        batch: batch.batchNumber,
        timeMs: batch.processingTime,
        success: batch.successCount,
        fail: batch.failCount
      }))
    });
  }
  
  /**
   * 실행 결과 표시 (개선된 버전)
   */
  static showExecutionResults(successCount, failCount, emailMode, executionTime, performanceResults, apiUsage) {
    let message = `処理完了 [${emailMode}]\n\n`;
    message += `【結果】\n`;
    message += `成功: ${successCount}件\n`;
    message += `失敗: ${failCount}件\n`;
    message += `成功率: ${performanceResults.successRate}%\n\n`;
    
    message += `【性能】\n`;
    message += `実行時間: ${Math.round(executionTime/1000)}秒\n`;
    message += `平均処理時間: ${performanceResults.avgTimePerSheet}ms/シート\n\n`;
    
    if (apiUsage && apiUsage.totalRequests > 0) {
      message += `【API使用量】\n`;
      message += `API呼び出し: ${apiUsage.totalRequests}回\n`;
      message += `推定トークン: ${apiUsage.totalOptimizedTokens.toLocaleString()}\n`;
      message += `最適化効率: ${apiUsage.optimizationEfficiency}%\n`;
      message += `推定コスト: $${apiUsage.costSavings.toFixed(4)}\n`;
    }
    
    SpreadsheetApp.getUi().alert(message);
  }
  
  /**
   * 관리자 보고서 전송 (개선된 버전)
   */
  static sendSummaryReport(successCount, failCount, errors, performanceResults) {
    try {
      const adminEmail = PropertiesService.getScriptProperties().getProperty("ADMIN_EMAIL");
      if (!adminEmail) return;
      
      const reportContent = `
PDF文書自動送信システム 실행 리포트

실행 시각: ${new Date().toLocaleString('ja-JP')}

【처리 결과】
성공: ${successCount}件
실패: ${failCount}件
성공률: ${performanceResults ? performanceResults.successRate : 'N/A'}%

【성능 정보】
총실행시간: ${performanceResults ? Math.round(performanceResults.totalTimeSeconds) : 'N/A'}초
평균처리시간: ${performanceResults ? performanceResults.avgTimePerSheet : 'N/A'}ms/시트

【실패 상세】
${failCount > 0 ? errors.map(err => `• ${err}`).join('\n') : '실패 없음'}

【권장사항】
${failCount > successCount ? '• 실패률이 높습니다. 설정과 문서 접근권한을 확인해주세요.' : ''}
${performanceResults && performanceResults.totalTimeSeconds > 180 ? '• 실행시간이 깁니다. 배치 크기 조정을 고려해주세요.' : ''}

상세한 에러로그는 스프레드시트의 「${CONFIG.LOGGING.ERROR_SHEET_NAME}」시트를 확인해주세요.
      `.trim();
      
      MailApp.sendEmail({
        to: adminEmail,
        subject: `PDF送信システム レポート - 失敗${failCount}件 (成功率${performanceResults ? performanceResults.successRate : 'N/A'}%)`,
        body: reportContent
      });
      
      Logger.info('Summary report sent to admin', {
        adminEmail,
        successCount,
        failCount,
        successRate: performanceResults ? performanceResults.successRate : null
      });
      
    } catch (error) {
      Logger.error('Failed to send summary report', { error: error.message });
    }
  }
  
  /**
   * 문서 처리 상태 체크
   */
  static checkProcessingHealth() {
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheets = ss.getSheets().filter(sheet => 
        sheet.getName() !== CONFIG.LOGGING.ERROR_SHEET_NAME
      );
      
      const health = {
        totalSheets: sheets.length,
        accessibleSheets: 0,
        inaccessibleSheets: 0,
        emptySheets: 0,
        issues: []
      };
      
      sheets.forEach(sheet => {
        try {
          const docId = sheet.getRange("A1").getValue();
          if (!docId) {
            health.inaccessibleSheets++;
            health.issues.push(`${sheet.getName()}: Document ID가 없습니다`);
            return;
          }
          
          const doc = DocumentApp.openById(docId);
          const bodyText = doc.getBody().getText();
          
          if (!bodyText.trim()) {
            health.emptySheets++;
            health.issues.push(`${sheet.getName()}: 문서가 비어있습니다`);
          } else {
            health.accessibleSheets++;
          }
          
        } catch (error) {
          health.inaccessibleSheets++;
          health.issues.push(`${sheet.getName()}: ${error.message}`);
        }
      });
      
      return health;
      
    } catch (error) {
      return {
        error: error.message,
        totalSheets: 0,
        accessibleSheets: 0,
        inaccessibleSheets: 0,
        emptySheets: 0,
        issues: ['Health check failed']
      };
    }
  }
}