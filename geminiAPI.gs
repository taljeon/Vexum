/**
 * geminiAPI.gs - Gemini API 연동 모듈
 * API 호출, 응답 처리, 에러 처리, 비용 최적화
 * 
 * @version 2.0
 * @author Google Apps Script System
 * @updated 2024
 */

/**
 * Gemini API 관리 클래스
 */
class GeminiAPI {
  
  /**
   * 텍스트 요약 실행 (개선된 버전)
   * @param {string} text - 요약할 텍스트
   * @param {Object} options - 요약 옵션
   * @returns {Object} 요약 결과와 메타데이터
   */
  static summarizeText(text, options = {}) {
    const startTime = new Date();
    
    try {
      // 설정 로드
      const config = ConfigManager.getApiConfig();
      if (!config.apiKey) {
        throw new Error('Gemini API key not configured');
      }
      
      // 텍스트 전처리 및 최적화
      const optimizedText = TextOptimizer.optimizeForApi(text, {
        targetTokens: options.targetTokens || config.maxTokens || 30000,
        preserveStructure: options.preserveStructure !== false
      });
      
      // 비용 분석
      const costAnalysis = this.analyzeCost(optimizedText.text);
      Logger.info('API cost analysis', costAnalysis);
      
      // API 호출 실행
      const result = this._makeApiCall(optimizedText.text, {
        maxRetries: config.maxRetries || 3,
        retryDelay: config.retryDelay || 1000,
        ...options
      });
      
      // 응답 후처리
      const summary = this._postProcessSummary(result.summary, {
        originalLength: text.length,
        optimizedLength: optimizedText.text.length,
        compressionRatio: optimizedText.compressionRatio
      });
      
      // 성능 로깅
      const executionTime = new Date() - startTime;
      PerformanceAnalyzer.recordApiCall({
        type: 'gemini_summarize',
        duration: executionTime,
        inputTokens: costAnalysis.estimatedTokens,
        outputTokens: this._estimateTokens(summary),
        success: true,
        compressionRatio: optimizedText.compressionRatio
      });
      
      return {
        summary: summary,
        metadata: {
          originalLength: text.length,
          processedLength: optimizedText.text.length,
          compressionRatio: optimizedText.compressionRatio,
          estimatedCost: costAnalysis.estimatedCost,
          executionTime: executionTime,
          qualityScore: optimizedText.qualityScore
        }
      };
      
    } catch (error) {
      const executionTime = new Date() - startTime;
      
      // 에러 분류 및 처리
      const errorInfo = ErrorHandler.classifyError(error, 'gemini_api');
      Logger.error('Gemini API summarization failed', {
        error: error.message,
        classification: errorInfo,
        textLength: text.length,
        executionTime: executionTime
      });
      
      // 성능 분석에 실패 기록
      PerformanceAnalyzer.recordApiCall({
        type: 'gemini_summarize',
        duration: executionTime,
        success: false,
        errorType: errorInfo.category
      });
      
      // 복구 가능한 에러인지 확인
      if (errorInfo.recoverable) {
        return this._attemptRecovery(text, options, errorInfo);
      }
      
      throw error;
    }
  }
  
  /**
   * 실제 API 호출 실행 (재시도 로직 포함)
   * @private
   */
  static _makeApiCall(text, options = {}) {
    const maxRetries = options.maxRetries || 3;
    const retryDelay = options.retryDelay || 1000;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        Logger.info('Gemini API call attempt', { 
          attempt: attempt, 
          textLength: text.length 
        });
        
        const response = this._executeApiRequest(text, options);
        
        // 응답 검증
        if (!response || !response.summary) {
          throw new Error('Invalid API response: missing summary');
        }
        
        Logger.info('Gemini API call successful', {
          attempt: attempt,
          responseLength: response.summary.length
        });
        
        return response;
        
      } catch (error) {
        Logger.warn('Gemini API call failed', {
          attempt: attempt,
          error: error.message,
          willRetry: attempt < maxRetries
        });
        
        if (attempt === maxRetries) {
          throw new Error(`API call failed after ${maxRetries} attempts: ${error.message}`);
        }
        
        // 지수 백오프로 재시도 대기
        const waitTime = retryDelay * Math.pow(2, attempt - 1);
        Utilities.sleep(waitTime);
      }
    }
  }
  
  /**
   * HTTP 요청 실행
   * @private
   */
  static _executeApiRequest(text, options = {}) {
    const config = ConfigManager.getApiConfig();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${config.apiKey}`;
    
    // 프롬프트 구성
    const prompt = this._buildPrompt(text, options);
    
    const payload = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: options.temperature || 0.3,
        topK: options.topK || 40,
        topP: options.topP || 0.8,
        maxOutputTokens: options.maxOutputTokens || 2048,
        stopSequences: options.stopSequences || []
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH", 
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    };
    
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(url, requestOptions);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    if (responseCode !== 200) {
      throw new Error(`API request failed with status ${responseCode}: ${responseText}`);
    }
    
    const responseData = JSON.parse(responseText);
    
    if (responseData.error) {
      throw new Error(`API error: ${responseData.error.message}`);
    }
    
    if (!responseData.candidates || !responseData.candidates[0] || !responseData.candidates[0].content) {
      throw new Error('Invalid API response structure');
    }
    
    const summary = responseData.candidates[0].content.parts[0].text;
    
    return {
      summary: summary,
      usage: responseData.usageMetadata || {},
      rawResponse: responseData
    };
  }
  
  /**
   * 프롬프트 구성
   * @private
   */
  static _buildPrompt(text, options = {}) {
    const language = options.language || 'ja';
    const maxLength = options.maxLength || 300;
    const style = options.style || 'business';
    
    let prompt = '';
    
    if (language === 'ja') {
      prompt = `以下のテキストを${maxLength}文字以内で要約してください。`;
      if (style === 'business') {
        prompt += 'ビジネス文書として適切な形式で、重要なポイントを明確に整理してください。';
      }
    } else {
      prompt = `Please summarize the following text in ${maxLength} characters or less.`;
      if (style === 'business') {
        prompt += ' Format it as a business document with clear key points.';
      }
    }
    
    prompt += `\n\nテキスト:\n${text}`;
    
    return prompt;
  }
  
  /**
   * 요약 결과 후처리
   * @private
   */
  static _postProcessSummary(summary, metadata = {}) {
    if (!summary) {
      return '';
    }
    
    // 기본 정리
    let processed = summary.trim();
    
    // 중복 공백 제거
    processed = processed.replace(/\s+/g, ' ');
    
    // 불완전한 문장 제거 (선택적)
    const lines = processed.split('\n');
    const cleanLines = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed.length > 10 && !trimmed.endsWith('...');
    });
    
    processed = cleanLines.join('\n');
    
    // 최종 검증
    if (processed.length < 10) {
      Logger.warn('Summary too short after post-processing', {
        original: summary.length,
        processed: processed.length
      });
    }
    
    return processed;
  }
  
  /**
   * 비용 분석
   * @param {string} text - 분석할 텍스트
   * @returns {Object} 비용 분석 결과
   */
  static analyzeCost(text) {
    const estimatedTokens = this._estimateTokens(text);
    const config = ConfigManager.getApiConfig();
    
    // Gemini Pro 가격 (2024년 기준 예상)
    const pricePerToken = config.pricePerToken || 0.00025; // $0.00025 per token
    const estimatedCost = estimatedTokens * pricePerToken;
    
    return {
      estimatedTokens: estimatedTokens,
      estimatedCost: estimatedCost,
      currency: 'USD',
      model: 'gemini-pro',
      analysis: this._getCostAnalysis(estimatedTokens, estimatedCost)
    };
  }
  
  /**
   * 토큰 수 추정
   * @private
   */
  static _estimateTokens(text) {
    if (!text) return 0;
    
    // 대략적 토큰 추정 (실제보다 약간 높게)
    // 영어: ~4자/토큰, 일본어: ~2자/토큰, 한국어: ~2.5자/토큰
    const avgCharsPerToken = 3; // 보수적 추정
    return Math.ceil(text.length / avgCharsPerToken);
  }
  
  /**
   * 비용 분석 메시지 생성
   * @private
   */
  static _getCostAnalysis(tokens, cost) {
    if (cost < 0.01) {
      return 'Low cost operation';
    } else if (cost < 0.05) {
      return 'Moderate cost operation';
    } else {
      return 'High cost operation - consider text optimization';
    }
  }
  
  /**
   * 에러 복구 시도
   * @private
   */
  static _attemptRecovery(text, options, errorInfo) {
    Logger.info('Attempting API error recovery', { 
      errorType: errorInfo.category,
      strategy: errorInfo.recoveryStrategy 
    });
    
    switch (errorInfo.recoveryStrategy) {
      case 'reduce_text_length':
        // 텍스트 길이 50% 축소 후 재시도
        const shortenedText = text.substring(0, Math.floor(text.length * 0.5));
        return this.summarizeText(shortenedText, {
          ...options,
          isRecoveryAttempt: true
        });
        
      case 'simplify_request':
        // 간단한 요청으로 재시도
        return this.summarizeText(text, {
          ...options,
          temperature: 0.1,
          maxLength: 100,
          isRecoveryAttempt: true
        });
        
      case 'fallback_summary':
        // 로컬 요약 반환
        return {
          summary: this._generateFallbackSummary(text),
          metadata: {
            fallback: true,
            reason: errorInfo.category
          }
        };
        
      default:
        throw new Error(`Recovery failed: ${errorInfo.category}`);
    }
  }
  
  /**
   * 대체 요약 생성 (API 실패 시)
   * @private
   */
  static _generateFallbackSummary(text) {
    const maxLength = 200;
    
    if (text.length <= maxLength) {
      return text;
    }
    
    // 첫 번째 문단이나 문장들 추출
    const sentences = text.split(/[.!?。！？]/);
    let summary = '';
    
    for (const sentence of sentences) {
      if (summary.length + sentence.length > maxLength) {
        break;
      }
      summary += sentence + '。';
    }
    
    return summary || text.substring(0, maxLength) + '...';
  }
  
  /**
   * API 상태 확인
   */
  static checkApiHealth() {
    try {
      const testText = 'テスト用の短いテキストです。';
      const result = this.summarizeText(testText, {
        maxLength: 50,
        healthCheck: true
      });
      
      return {
        status: 'healthy',
        responseTime: result.metadata.executionTime,
        lastChecked: new Date().toISOString()
      };
      
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        lastChecked: new Date().toISOString()
      };
    }
  }
  
  /**
   * 일일 사용량 통계 조회
   */
  static getDailyUsageStats() {
    const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const usageKey = `api_usage_${today}`;
    
    const properties = PropertiesService.getScriptProperties();
    const usage = JSON.parse(properties.getProperty(usageKey) || '{}');
    
    return {
      date: today,
      totalCalls: usage.totalCalls || 0,
      totalTokens: usage.totalTokens || 0,
      totalCost: usage.totalCost || 0,
      averageResponseTime: usage.averageResponseTime || 0,
      errorRate: usage.errorRate || 0
    };
  }
  
  /**
   * 사용량 기록 업데이트
   * @param {Object} callData - 호출 데이터
   */
  static updateUsageStats(callData) {
    const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const usageKey = `api_usage_${today}`;
    
    const properties = PropertiesService.getScriptProperties();
    const usage = JSON.parse(properties.getProperty(usageKey) || '{}');
    
    usage.totalCalls = (usage.totalCalls || 0) + 1;
    usage.totalTokens = (usage.totalTokens || 0) + (callData.tokens || 0);
    usage.totalCost = (usage.totalCost || 0) + (callData.cost || 0);
    
    if (callData.responseTime) {
      const currentAvg = usage.averageResponseTime || 0;
      const totalCalls = usage.totalCalls;
      usage.averageResponseTime = ((currentAvg * (totalCalls - 1)) + callData.responseTime) / totalCalls;
    }
    
    if (callData.isError) {
      usage.errorCount = (usage.errorCount || 0) + 1;
      usage.errorRate = usage.errorCount / usage.totalCalls;
    }
    
    properties.setProperty(usageKey, JSON.stringify(usage));
  }
}