/**
 * emailSender.gs - 이메일 발송 모듈
 * 다양한 발송 모드, 첨부파일 관리, 발송 한도 관리
 * 
 * @version 2.0
 * @author Google Apps Script System
 * @updated 2024
 */

/**
 * 이메일 발송 관리 클래스
 */
class EmailSender {
  
  /**
   * 통합 이메일 발송 (모든 PDF를 하나의 이메일로)
   * @param {Array} pdfResults - PDF 처리 결과 배열
   * @param {Object} options - 발송 옵션
   */
  static sendConsolidatedEmail(pdfResults, options = {}) {
    const startTime = new Date();
    
    try {
      Logger.info('Starting consolidated email send', {
        resultCount: pdfResults.length,
        options: options
      });
      
      // 결과 분류
      const categorized = this._categorizeResults(pdfResults);
      
      // 이메일 내용 구성
      const emailContent = this._buildConsolidatedContent(categorized, options);
      
      // 첨부파일 검증 및 준비
      const attachments = this._prepareAttachments(categorized.successful, options);
      
      // Gmail 한도 확인
      this._checkGmailLimits(attachments);
      
      // 이메일 발송
      const result = this._sendEmail({
        to: ConfigManager.getEmailConfig().recipients,
        subject: emailContent.subject,
        body: emailContent.body,
        attachments: attachments,
        options: options
      });
      
      // 발송 결과 로깅
      const executionTime = new Date() - startTime;
      Logger.info('Consolidated email sent successfully', {
        recipients: result.recipientCount,
        attachmentCount: attachments.length,
        executionTime: executionTime
      });
      
      // 성능 기록
      PerformanceAnalyzer.recordEmailSend({
        type: 'consolidated',
        recipientCount: result.recipientCount,
        attachmentCount: attachments.length,
        duration: executionTime,
        success: true
      });
      
      return {
        success: true,
        recipientCount: result.recipientCount,
        attachmentCount: attachments.length,
        executionTime: executionTime
      };
      
    } catch (error) {
      const executionTime = new Date() - startTime;
      
      Logger.error('Consolidated email send failed', {
        error: error.message,
        resultCount: pdfResults.length,
        executionTime: executionTime
      });
      
      PerformanceAnalyzer.recordEmailSend({
        type: 'consolidated',
        duration: executionTime,
        success: false,
        errorType: error.message
      });
      
      throw error;
    }
  }
  
  /**
   * 개별 이메일 발송 (각 PDF별로 개별 이메일)
   * @param {Array} pdfResults - PDF 처리 결과 배열
   * @param {Object} options - 발송 옵션
   */
  static sendIndividualEmails(pdfResults, options = {}) {
    const startTime = new Date();
    
    try {
      Logger.info('Starting individual email sends', {
        resultCount: pdfResults.length,
        options: options
      });
      
      const successful = pdfResults.filter(result => result.success);
      const results = [];
      
      // Gmail 한도 확인
      this._checkDailyEmailLimit(successful.length);
      
      for (let i = 0; i < successful.length; i++) {
        const result = successful[i];
        
        try {
          const emailContent = this._buildIndividualContent(result, options);
          const attachments = result.pdfBlob ? [result.pdfBlob] : [];
          
          // 첨부파일 크기 검증
          this._validateAttachmentSize(attachments);
          
          const sendResult = this._sendEmail({
            to: ConfigManager.getEmailConfig().recipients,
            subject: emailContent.subject,
            body: emailContent.body,
            attachments: attachments,
            options: options
          });
          
          results.push({
            sheetName: result.sheetName,
            success: true,
            recipientCount: sendResult.recipientCount
          });
          
          Logger.info('Individual email sent', {
            sheetName: result.sheetName,
            recipients: sendResult.recipientCount
          });
          
          // 발송 간 대기 (Gmail 한도 고려)
          if (i < successful.length - 1) {
            Utilities.sleep(ConfigManager.getEmailConfig().sendDelay || 1000);
          }
          
        } catch (error) {
          Logger.error('Individual email send failed', {
            sheetName: result.sheetName,
            error: error.message
          });
          
          results.push({
            sheetName: result.sheetName,
            success: false,
            error: error.message
          });
        }
      }
      
      // 전체 결과 분석
      const totalSuccess = results.filter(r => r.success).length;
      const executionTime = new Date() - startTime;
      
      Logger.info('Individual email sends completed', {
        totalEmails: results.length,
        successful: totalSuccess,
        failed: results.length - totalSuccess,
        executionTime: executionTime
      });
      
      // 성능 기록
      PerformanceAnalyzer.recordEmailSend({
        type: 'individual',
        emailCount: results.length,
        successCount: totalSuccess,
        duration: executionTime,
        success: totalSuccess > 0
      });
      
      return {
        success: totalSuccess > 0,
        totalEmails: results.length,
        successfulEmails: totalSuccess,
        failedEmails: results.length - totalSuccess,
        results: results,
        executionTime: executionTime
      };
      
    } catch (error) {
      const executionTime = new Date() - startTime;
      
      Logger.error('Individual email sends failed', {
        error: error.message,
        executionTime: executionTime
      });
      
      throw error;
    }
  }
  
  /**
   * 에러 전용 이메일 발송 (실패한 케이스만)
   * @param {Array} pdfResults - PDF 처리 결과 배열
   * @param {Object} options - 발송 옵션
   */
  static sendErrorReport(pdfResults, options = {}) {
    const startTime = new Date();
    
    try {
      Logger.info('Starting error report send', {
        resultCount: pdfResults.length,
        options: options
      });
      
      const errors = pdfResults.filter(result => !result.success);
      
      if (errors.length === 0) {
        Logger.info('No errors to report');
        return {
          success: true,
          message: 'No errors to report',
          errorCount: 0
        };
      }
      
      // 에러 리포트 내용 구성
      const emailContent = this._buildErrorReportContent(errors, options);
      
      // 이메일 발송
      const result = this._sendEmail({
        to: ConfigManager.getEmailConfig().recipients,
        subject: emailContent.subject,
        body: emailContent.body,
        attachments: [],
        options: { ...options, isErrorReport: true }
      });
      
      const executionTime = new Date() - startTime;
      
      Logger.info('Error report sent successfully', {
        errorCount: errors.length,
        recipients: result.recipientCount,
        executionTime: executionTime
      });
      
      // 성능 기록
      PerformanceAnalyzer.recordEmailSend({
        type: 'error_report',
        recipientCount: result.recipientCount,
        errorCount: errors.length,
        duration: executionTime,
        success: true
      });
      
      return {
        success: true,
        errorCount: errors.length,
        recipientCount: result.recipientCount,
        executionTime: executionTime
      };
      
    } catch (error) {
      const executionTime = new Date() - startTime;
      
      Logger.error('Error report send failed', {
        error: error.message,
        executionTime: executionTime
      });
      
      throw error;
    }
  }
  
  /**
   * 결과 분류 (성공/실패)
   * @private
   */
  static _categorizeResults(results) {
    const successful = [];
    const failed = [];
    
    results.forEach(result => {
      if (result.success && result.pdfBlob) {
        successful.push(result);
      } else {
        failed.push(result);
      }
    });
    
    return { successful, failed };
  }
  
  /**
   * 통합 이메일 내용 구성
   * @private
   */
  static _buildConsolidatedContent(categorized, options = {}) {
    const { successful, failed } = categorized;
    const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    
    // 제목 구성
    const subject = `PDF処理結果 - ${successful.length}件成功 - ${timestamp}`;
    
    // 본문 구성
    let body = `PDF処理が完了しました。\n\n`;
    body += `実行時刻: ${timestamp}\n`;
    body += `成功: ${successful.length}件\n`;
    body += `失敗: ${failed.length}件\n`;
    body += `合計: ${successful.length + failed.length}件\n\n`;
    
    // 성공 목록
    if (successful.length > 0) {
      body += `■ 成功したシート:\n`;
      successful.forEach((result, index) => {
        body += `${index + 1}. ${result.sheetName}`;
        if (result.summary) {
          body += ` (要約済み)`;
        }
        body += `\n`;
      });
      body += `\n`;
    }
    
    // 실패 목록
    if (failed.length > 0) {
      body += `■ 失敗したシート:\n`;
      failed.forEach((result, index) => {
        body += `${index + 1}. ${result.sheetName} - ${result.error || '不明なエラー'}\n`;
      });
      body += `\n`;
    }
    
    // 추가 정보
    if (options.includeStats) {
      const stats = PerformanceAnalyzer.getCurrentSessionStats();
      body += `■ 実行統計:\n`;
      body += `平均処理時間: ${stats.averageProcessingTime}ms\n`;
      body += `成功率: ${stats.successRate}%\n\n`;
    }
    
    body += `このメールは自動送信されました。\n`;
    body += `問題がある場合は、システム管理者にご連絡ください。`;
    
    return { subject, body };
  }
  
  /**
   * 개별 이메일 내용 구성
   * @private
   */
  static _buildIndividualContent(result, options = {}) {
    const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
    
    // 제목 구성
    const subject = `PDF処理完了: ${result.sheetName} - ${timestamp}`;
    
    // 본문 구성
    let body = `PDF処理が完了しました。\n\n`;
    body += `シート名: ${result.sheetName}\n`;
    body += `処理時刻: ${timestamp}\n`;
    body += `状態: 成功\n\n`;
    
    if (result.summary) {
      body += `■ 要約:\n${result.summary}\n\n`;
    }
    
    if (result.metadata) {
      body += `■ 処理情報:\n`;
      body += `処理時間: ${result.metadata.processingTime || 'N/A'}ms\n`;
      body += `文字数: ${result.metadata.textLength || 'N/A'}文字\n`;
      if (result.metadata.compressionRatio) {
        body += `圧縮率: ${(result.metadata.compressionRatio * 100).toFixed(1)}%\n`;
      }
      body += `\n`;
    }
    
    body += `PDFファイルが添付されています。\n\n`;
    body += `このメールは自動送信されました。`;
    
    return { subject, body };
  }
  
  /**
   * 에러 리포트 내용 구성
   * @private
   */
  static _buildErrorReportContent(errors, options = {}) {
    const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    
    // 제목 구성
    const subject = `PDF処理エラー報告 - ${errors.length}件の失敗 - ${timestamp}`;
    
    // 본문 구성
    let body = `PDF処理でエラーが発生しました。\n\n`;
    body += `実行時刻: ${timestamp}\n`;
    body += `失敗件数: ${errors.length}件\n\n`;
    
    // 에러 분류
    const errorsByType = {};
    errors.forEach(error => {
      const errorType = this._classifyErrorType(error.error);
      if (!errorsByType[errorType]) {
        errorsByType[errorType] = [];
      }
      errorsByType[errorType].push(error);
    });
    
    // 에러 유형별 리포트
    Object.keys(errorsByType).forEach(errorType => {
      const errorList = errorsByType[errorType];
      body += `■ ${errorType} (${errorList.length}件):\n`;
      errorList.forEach((error, index) => {
        body += `${index + 1}. ${error.sheetName} - ${error.error}\n`;
      });
      body += `\n`;
    });
    
    // 해결 방안 제시
    body += `■ 推奨対処法:\n`;
    Object.keys(errorsByType).forEach(errorType => {
      const suggestion = this._getErrorSuggestion(errorType);
      if (suggestion) {
        body += `${errorType}: ${suggestion}\n`;
      }
    });
    body += `\n`;
    
    body += `システム管理者による確認が必要です。\n`;
    body += `このメールは自動送信されました。`;
    
    return { subject, body };
  }
  
  /**
   * 첨부파일 준비
   * @private
   */
  static _prepareAttachments(results, options = {}) {
    const attachments = [];
    const maxAttachments = options.maxAttachments || 25; // Gmail 제한
    
    for (let i = 0; i < Math.min(results.length, maxAttachments); i++) {
      const result = results[i];
      if (result.pdfBlob) {
        attachments.push(result.pdfBlob);
      }
    }
    
    if (results.length > maxAttachments) {
      Logger.warn('Attachment limit exceeded', {
        total: results.length,
        attached: maxAttachments,
        skipped: results.length - maxAttachments
      });
    }
    
    return attachments;
  }
  
  /**
   * Gmail 한도 확인
   * @private
   */
  static _checkGmailLimits(attachments) {
    // 첨부파일 개수 제한 (Gmail: 25개)
    if (attachments.length > 25) {
      throw new Error(`Too many attachments: ${attachments.length} (max: 25)`);
    }
    
    // 첨부파일 크기 제한 (Gmail: 25MB)
    const totalSize = attachments.reduce((sum, attachment) => {
      return sum + (attachment.getBytes ? attachment.getBytes().length : 0);
    }, 0);
    
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (totalSize > maxSize) {
      throw new Error(`Attachments too large: ${(totalSize / 1024 / 1024).toFixed(2)}MB (max: 25MB)`);
    }
    
    // 일일 이메일 한도 확인
    this._checkDailyEmailLimit(1);
  }
  
  /**
   * 첨부파일 크기 검증
   * @private
   */
  static _validateAttachmentSize(attachments) {
    const maxSingleFileSize = 25 * 1024 * 1024; // 25MB per file
    
    attachments.forEach((attachment, index) => {
      const size = attachment.getBytes ? attachment.getBytes().length : 0;
      if (size > maxSingleFileSize) {
        throw new Error(`Attachment ${index + 1} too large: ${(size / 1024 / 1024).toFixed(2)}MB (max: 25MB)`);
      }
    });
  }
  
  /**
   * 일일 이메일 한도 확인
   * @private
   */
  static _checkDailyEmailLimit(emailCount) {
    const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const properties = PropertiesService.getScriptProperties();
    const usageKey = `email_usage_${today}`;
    
    const currentUsage = parseInt(properties.getProperty(usageKey) || '0');
    const dailyLimit = ConfigManager.getEmailConfig().dailyLimit || 100; // Gmail 기본 한도
    
    if (currentUsage + emailCount > dailyLimit) {
      throw new Error(`Daily email limit exceeded: ${currentUsage + emailCount}/${dailyLimit}`);
    }
    
    // 사용량 업데이트
    properties.setProperty(usageKey, (currentUsage + emailCount).toString());
  }
  
  /**
   * 실제 이메일 발송
   * @private
   */
  static _sendEmail({ to, subject, body, attachments = [], options = {} }) {
    try {
      const recipients = Array.isArray(to) ? to : [to];
      const emailConfig = ConfigManager.getEmailConfig();
      
      // 발송 옵션 구성
      const mailOptions = {
        attachments: attachments,
        htmlBody: options.useHtml ? this._convertToHtml(body) : undefined,
        replyTo: emailConfig.replyTo || undefined,
        cc: options.cc || emailConfig.cc || undefined,
        bcc: options.bcc || emailConfig.bcc || undefined
      };
      
      // 실제 발송
      recipients.forEach(recipient => {
        GmailApp.sendEmail(recipient, subject, body, mailOptions);
        Logger.info('Email sent', { 
          recipient: recipient, 
          subject: subject,
          attachmentCount: attachments.length
        });
      });
      
      return {
        success: true,
        recipientCount: recipients.length
      };
      
    } catch (error) {
      Logger.error('Email send failed', {
        error: error.message,
        recipients: to,
        subject: subject
      });
      throw error;
    }
  }
  
  /**
   * 텍스트를 HTML로 변환
   * @private
   */
  static _convertToHtml(text) {
    return text
      .replace(/\n/g, '<br>')
      .replace(/■/g, '<strong>■</strong>')
      .replace(/(\d+\.\s)/g, '<strong>$1</strong>');
  }
  
  /**
   * 에러 유형 분류
   * @private
   */
  static _classifyErrorType(errorMessage) {
    if (!errorMessage) return 'その他のエラー';
    
    const message = errorMessage.toLowerCase();
    
    if (message.includes('api') || message.includes('gemini')) {
      return 'API関連エラー';
    } else if (message.includes('pdf') || message.includes('export')) {
      return 'PDF生成エラー';
    } else if (message.includes('permission') || message.includes('access')) {
      return 'アクセス権限エラー';
    } else if (message.includes('timeout') || message.includes('time')) {
      return 'タイムアウトエラー';
    } else if (message.includes('network') || message.includes('connection')) {
      return 'ネットワークエラー';
    } else {
      return 'その他のエラー';
    }
  }
  
  /**
   * 에러 유형별 해결 방안 제시
   * @private
   */
  static _getErrorSuggestion(errorType) {
    const suggestions = {
      'API関連エラー': 'APIキーの確認、利用制限の確認',
      'PDF生成エラー': 'シートの内容、データ形式の確認',
      'アクセス権限エラー': 'スプレッドシートの共有設定確認',
      'タイムアウトエラー': '処理対象の削減、実行時間の調整',
      'ネットワークエラー': 'インターネット接続の確認、再実行'
    };
    
    return suggestions[errorType] || '詳細なログの確認';
  }
  
  /**
   * 이메일 발송 통계 조회
   */
  static getEmailStats() {
    const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const properties = PropertiesService.getScriptProperties();
    const usageKey = `email_usage_${today}`;
    
    const todayUsage = parseInt(properties.getProperty(usageKey) || '0');
    const dailyLimit = ConfigManager.getEmailConfig().dailyLimit || 100;
    
    return {
      todayUsage: todayUsage,
      dailyLimit: dailyLimit,
      remainingQuota: dailyLimit - todayUsage,
      usagePercentage: ((todayUsage / dailyLimit) * 100).toFixed(1)
    };
  }
}