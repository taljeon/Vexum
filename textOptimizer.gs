/**
 * textOptimizer.gs - 텍스트 최적화 모듈
 * API 비용 절약을 위한 텍스트 압축 및 최적화
 * 
 * @version 2.0
 * @author Google Apps Script System
 * @updated 2024
 */

/**
 * 텍스트 최적화 클래스
 */
class TextOptimizer {
  
  /**
   * API 호출용 텍스트 최적화 (메인 함수)
   * @param {string} text - 최적화할 텍스트
   * @param {Object} options - 최적화 옵션
   * @returns {Object} 최적화 결과
   */
  static optimizeForApi(text, options = {}) {
    const startTime = new Date();
    
    try {
      Logger.info('Starting text optimization', {
        originalLength: text.length,
        targetTokens: options.targetTokens || 30000,
        preserveStructure: options.preserveStructure !== false
      });
      
      // 초기 텍스트 분석
      const analysis = this._analyzeText(text);
      
      // 최적화 전략 결정
      const strategy = this._determineOptimizationStrategy(text, options, analysis);
      
      // 단계적 최적화 실행
      let optimizedText = text;
      let compressionSteps = [];
      
      for (const step of strategy.steps) {
        const stepResult = this._applyOptimizationStep(optimizedText, step, options);
        optimizedText = stepResult.text;
        compressionSteps.push({
          step: step.name,
          beforeLength: stepResult.beforeLength,
          afterLength: stepResult.afterLength,
          compressionRatio: stepResult.compressionRatio
        });
      }
      
      // 품질 평가
      const qualityScore = this._assessQuality(text, optimizedText, options);
      
      // 최종 결과
      const finalCompressionRatio = optimizedText.length / text.length;
      const executionTime = new Date() - startTime;
      
      Logger.info('Text optimization completed', {
        originalLength: text.length,
        optimizedLength: optimizedText.length,
        compressionRatio: finalCompressionRatio,
        qualityScore: qualityScore,
        executionTime: executionTime
      });
      
      return {
        text: optimizedText,
        compressionRatio: finalCompressionRatio,
        qualityScore: qualityScore,
        analysis: analysis,
        strategy: strategy.name,
        compressionSteps: compressionSteps,
        executionTime: executionTime
      };
      
    } catch (error) {
      Logger.error('Text optimization failed', {
        error: error.message,
        textLength: text.length
      });
      
      // 최적화 실패 시 원본 반환
      return {
        text: text,
        compressionRatio: 1.0,
        qualityScore: 1.0,
        error: error.message
      };
    }
  }
  
  /**
   * 텍스트 분석
   * @private
   */
  static _analyzeText(text) {
    const lines = text.split('\n');
    const words = text.split(/\s+/).filter(word => word.length > 0);
    const sentences = text.split(/[.!?。！？]/).filter(s => s.trim().length > 0);
    
    // 문자 유형 분석
    const charTypes = {
      japanese: (text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g) || []).length,
      korean: (text.match(/[\uAC00-\uD7AF]/g) || []).length,
      english: (text.match(/[a-zA-Z]/g) || []).length,
      numbers: (text.match(/[0-9]/g) || []).length,
      punctuation: (text.match(/[^\w\s]/g) || []).length
    };
    
    // 반복 패턴 분석
    const repetitivePatterns = this._findRepetitivePatterns(text);
    
    // 구조 분석
    const structure = {
      hasHeaders: /^#+\s/.test(text) || /■|●|○/.test(text),
      hasTables: /\|.*\|/.test(text) || /\t.*\t/.test(text),
      hasLists: /^\s*[-*+]\s/.test(text) || /^\s*\d+\.\s/.test(text),
      hasFormulas: /[=+\-*/()]/.test(text)
    };
    
    return {
      totalLength: text.length,
      lineCount: lines.length,
      wordCount: words.length,
      sentenceCount: sentences.length,
      avgLineLength: text.length / lines.length,
      avgWordLength: text.replace(/\s/g, '').length / words.length,
      charTypes: charTypes,
      repetitivePatterns: repetitivePatterns,
      structure: structure,
      complexity: this._calculateComplexity(text, charTypes, structure)
    };
  }
  
  /**
   * 최적화 전략 결정
   * @private
   */
  static _determineOptimizationStrategy(text, options, analysis) {
    const targetTokens = options.targetTokens || 30000;
    const currentEstimatedTokens = this._estimateTokenCount(text);
    const compressionNeeded = currentEstimatedTokens > targetTokens;
    const compressionRatio = targetTokens / currentEstimatedTokens;
    
    let strategy = {
      name: 'no_optimization',
      steps: []
    };
    
    if (!compressionNeeded) {
      strategy.name = 'minimal_cleanup';
      strategy.steps = [
        { name: 'remove_extra_whitespace', priority: 1 },
        { name: 'normalize_line_breaks', priority: 1 }
      ];
    } else if (compressionRatio > 0.8) {
      strategy.name = 'light_optimization';
      strategy.steps = [
        { name: 'remove_extra_whitespace', priority: 1 },
        { name: 'normalize_line_breaks', priority: 1 },
        { name: 'remove_empty_lines', priority: 2 },
        { name: 'compress_repetitive_content', priority: 2 }
      ];
    } else if (compressionRatio > 0.6) {
      strategy.name = 'moderate_optimization';
      strategy.steps = [
        { name: 'remove_extra_whitespace', priority: 1 },
        { name: 'normalize_line_breaks', priority: 1 },
        { name: 'remove_empty_lines', priority: 2 },
        { name: 'compress_repetitive_content', priority: 2 },
        { name: 'summarize_tables', priority: 3 },
        { name: 'compress_formulas', priority: 3 }
      ];
    } else if (compressionRatio > 0.4) {
      strategy.name = 'aggressive_optimization';
      strategy.steps = [
        { name: 'remove_extra_whitespace', priority: 1 },
        { name: 'normalize_line_breaks', priority: 1 },
        { name: 'remove_empty_lines', priority: 2 },
        { name: 'compress_repetitive_content', priority: 2 },
        { name: 'summarize_tables', priority: 3 },
        { name: 'compress_formulas', priority: 3 },
        { name: 'extract_key_sections', priority: 4 },
        { name: 'intelligent_truncation', priority: 4 }
      ];
    } else {
      strategy.name = 'extreme_optimization';
      strategy.steps = [
        { name: 'extract_key_sections', priority: 1 },
        { name: 'intelligent_truncation', priority: 1 },
        { name: 'compress_all_content', priority: 2 }
      ];
    }
    
    // 구조 보존 옵션 적용
    if (options.preserveStructure === false) {
      strategy.steps.push(
        { name: 'remove_formatting', priority: 5 },
        { name: 'merge_similar_content', priority: 5 }
      );
    }
    
    return strategy;
  }
  
  /**
   * 최적화 단계 적용
   * @private
   */
  static _applyOptimizationStep(text, step, options) {
    const beforeLength = text.length;
    let afterText = text;
    
    switch (step.name) {
      case 'remove_extra_whitespace':
        afterText = this._removeExtraWhitespace(text);
        break;
        
      case 'normalize_line_breaks':
        afterText = this._normalizeLineBreaks(text);
        break;
        
      case 'remove_empty_lines':
        afterText = this._removeEmptyLines(text);
        break;
        
      case 'compress_repetitive_content':
        afterText = this._compressRepetitiveContent(text);
        break;
        
      case 'summarize_tables':
        afterText = this._summarizeTables(text);
        break;
        
      case 'compress_formulas':
        afterText = this._compressFormulas(text);
        break;
        
      case 'extract_key_sections':
        afterText = this._extractKeySections(text, options);
        break;
        
      case 'intelligent_truncation':
        afterText = this._intelligentTruncation(text, options);
        break;
        
      case 'remove_formatting':
        afterText = this._removeFormatting(text);
        break;
        
      case 'merge_similar_content':
        afterText = this._mergeSimilarContent(text);
        break;
        
      case 'compress_all_content':
        afterText = this._compressAllContent(text);
        break;
        
      default:
        // 알 수 없는 단계는 건너뛰기
        break;
    }
    
    const afterLength = afterText.length;
    const compressionRatio = afterLength / beforeLength;
    
    return {
      text: afterText,
      beforeLength: beforeLength,
      afterLength: afterLength,
      compressionRatio: compressionRatio
    };
  }
  
  /**
   * 여분의 공백 제거
   * @private
   */
  static _removeExtraWhitespace(text) {
    return text
      .replace(/[ \t]+/g, ' ')  // 연속된 공백을 하나로
      .replace(/\n[ \t]+/g, '\n')  // 줄 시작의 공백 제거
      .replace(/[ \t]+\n/g, '\n')  // 줄 끝의 공백 제거
      .trim();
  }
  
  /**
   * 줄바꿈 정규화
   * @private
   */
  static _normalizeLineBreaks(text) {
    return text
      .replace(/\r\n/g, '\n')  // Windows 줄바꿈 통일
      .replace(/\r/g, '\n')    // Mac 줄바꿈 통일
      .replace(/\n{3,}/g, '\n\n');  // 3개 이상 연속 줄바꿈을 2개로
  }
  
  /**
   * 빈 줄 제거
   * @private
   */
  static _removeEmptyLines(text) {
    return text
      .split('\n')
      .filter(line => line.trim().length > 0)
      .join('\n');
  }
  
  /**
   * 반복적 내용 압축
   * @private
   */
  static _compressRepetitiveContent(text) {
    // 동일한 줄이 3번 이상 반복되는 경우 압축
    const lines = text.split('\n');
    const compressed = [];
    let i = 0;
    
    while (i < lines.length) {
      const currentLine = lines[i].trim();
      let repeatCount = 1;
      
      // 연속된 동일 줄 찾기
      while (i + repeatCount < lines.length && 
             lines[i + repeatCount].trim() === currentLine) {
        repeatCount++;
      }
      
      if (repeatCount >= 3 && currentLine.length > 0) {
        // 3번 이상 반복되는 경우 압축
        compressed.push(`${currentLine} (×${repeatCount})`);
      } else {
        // 그대로 추가
        for (let j = 0; j < repeatCount; j++) {
          compressed.push(lines[i + j]);
        }
      }
      
      i += repeatCount;
    }
    
    return compressed.join('\n');
  }
  
  /**
   * 테이블 요약
   * @private
   */
  static _summarizeTables(text) {
    // 간단한 테이블 패턴 인식 및 요약
    return text.replace(/(\|[^|\n]+\|[\s\S]*?\|[^|\n]+\|)/g, (match) => {
      const lines = match.split('\n').filter(line => line.trim().length > 0);
      if (lines.length > 5) {
        const header = lines[0];
        const rowCount = lines.length - 1;
        return `${header}\n[テーブル: ${rowCount}行のデータ]`;
      }
      return match;
    });
  }
  
  /**
   * 수식 압축
   * @private
   */
  static _compressFormulas(text) {
    // 복잡한 수식을 간단하게 표현
    return text.replace(/=[\w+\-*/().,\s]+/g, (match) => {
      if (match.length > 50) {
        return '[複雑な数式]';
      }
      return match;
    });
  }
  
  /**
   * 핵심 섹션 추출
   * @private
   */
  static _extractKeySections(text, options) {
    const lines = text.split('\n');
    const keyLines = [];
    
    // 헤더, 중요 정보가 포함된 줄 우선 추출
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.length === 0) return;
      
      // 헤더나 중요 표시가 있는 줄
      if (/^#+\s|■|●|○|\*|^\d+\.|重要|注意|警告/.test(trimmed)) {
        keyLines.push(line);
      }
      // 숫자가 포함된 중요 정보
      else if (/\d/.test(trimmed) && trimmed.length < 100) {
        keyLines.push(line);
      }
      // 짧은 중요 문장
      else if (trimmed.length < 50 && /です|である|ます|だ/.test(trimmed)) {
        keyLines.push(line);
      }
    });
    
    // 최소한의 컨텍스트 유지
    if (keyLines.length < lines.length * 0.3) {
      // 너무 많이 줄어들면 추가로 중간 크기 문장들 포함
      lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed.length > 20 && trimmed.length < 100 && !keyLines.includes(line)) {
          keyLines.push(line);
        }
      });
    }
    
    return keyLines.join('\n');
  }
  
  /**
   * 지능적 절단
   * @private
   */
  static _intelligentTruncation(text, options) {
    const targetLength = (options.targetTokens || 30000) * 3; // 대략 추정
    
    if (text.length <= targetLength) {
      return text;
    }
    
    // 문장 단위로 절단
    const sentences = text.split(/[.!?。！？]/);
    let result = '';
    
    for (const sentence of sentences) {
      if ((result + sentence).length > targetLength) {
        break;
      }
      result += sentence + '。';
    }
    
    return result || text.substring(0, targetLength) + '...';
  }
  
  /**
   * 포매팅 제거
   * @private
   */
  static _removeFormatting(text) {
    return text
      .replace(/[#*_`]/g, '')  // 마크다운 포매팅 제거
      .replace(/■|●|○/g, '-')  // 불릿 포인트 단순화
      .replace(/\t/g, ' ');    // 탭을 공백으로
  }
  
  /**
   * 유사 내용 병합
   * @private
   */
  static _mergeSimilarContent(text) {
    const lines = text.split('\n');
    const merged = [];
    const seen = new Set();
    
    lines.forEach(line => {
      const normalized = line.trim().toLowerCase();
      
      // 유사한 내용이 이미 있는지 확인
      let isSimilar = false;
      for (const seenLine of seen) {
        if (this._calculateSimilarity(normalized, seenLine) > 0.8) {
          isSimilar = true;
          break;
        }
      }
      
      if (!isSimilar && normalized.length > 0) {
        merged.push(line);
        seen.add(normalized);
      }
    });
    
    return merged.join('\n');
  }
  
  /**
   * 전체 내용 압축 (극단적 케이스)
   * @private
   */
  static _compressAllContent(text) {
    // 가장 중요한 정보만 추출
    const lines = text.split('\n');
    const important = [];
    
    lines.forEach(line => {
      const trimmed = line.trim();
      
      // 숫자, 날짜, 중요 키워드가 포함된 짧은 줄만 유지
      if (trimmed.length > 0 && trimmed.length < 80) {
        if (/\d|重要|注意|エラー|成功|失敗|完了/.test(trimmed)) {
          important.push(trimmed);
        }
      }
    });
    
    return important.slice(0, 20).join('\n'); // 최대 20줄
  }
  
  /**
   * 반복 패턴 찾기
   * @private
   */
  static _findRepetitivePatterns(text) {
    const patterns = [];
    const lines = text.split('\n');
    const lineFreq = {};
    
    // 줄 빈도 계산
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.length > 10) {
        lineFreq[trimmed] = (lineFreq[trimmed] || 0) + 1;
      }
    });
    
    // 3번 이상 반복되는 패턴 찾기
    Object.entries(lineFreq).forEach(([line, count]) => {
      if (count >= 3) {
        patterns.push({
          pattern: line,
          frequency: count,
          type: 'repeated_line'
        });
      }
    });
    
    return patterns;
  }
  
  /**
   * 복잡도 계산
   * @private
   */
  static _calculateComplexity(text, charTypes, structure) {
    let complexity = 0;
    
    // 문자 유형 다양성
    const totalChars = Object.values(charTypes).reduce((sum, count) => sum + count, 0);
    const typeCount = Object.values(charTypes).filter(count => count > 0).length;
    complexity += typeCount * 0.2;
    
    // 구조적 복잡성
    const structureCount = Object.values(structure).filter(Boolean).length;
    complexity += structureCount * 0.3;
    
    // 길이 복잡성
    complexity += Math.min(text.length / 10000, 1.0) * 0.5;
    
    return Math.min(complexity, 3.0); // 0-3 점 범위
  }
  
  /**
   * 품질 평가
   * @private
   */
  static _assessQuality(originalText, optimizedText, options) {
    // 길이 비율
    const lengthRatio = optimizedText.length / originalText.length;
    
    // 핵심 정보 보존 확인
    const keywordPreservation = this._checkKeywordPreservation(originalText, optimizedText);
    
    // 구조 보존 확인
    const structurePreservation = options.preserveStructure !== false ? 
      this._checkStructurePreservation(originalText, optimizedText) : 1.0;
    
    // 가독성 확인
    const readability = this._assessReadability(optimizedText);
    
    // 종합 점수 (0-1)
    const qualityScore = (
      keywordPreservation * 0.4 +
      structurePreservation * 0.3 +
      readability * 0.2 +
      Math.min(lengthRatio * 2, 1.0) * 0.1
    );
    
    return Math.max(0, Math.min(1, qualityScore));
  }
  
  /**
   * 키워드 보존 확인
   * @private
   */
  static _checkKeywordPreservation(original, optimized) {
    // 중요 키워드 추출
    const importantKeywords = this._extractImportantKeywords(original);
    
    let preservedCount = 0;
    importantKeywords.forEach(keyword => {
      if (optimized.includes(keyword)) {
        preservedCount++;
      }
    });
    
    return importantKeywords.length > 0 ? preservedCount / importantKeywords.length : 1.0;
  }
  
  /**
   * 중요 키워드 추출
   * @private
   */
  static _extractImportantKeywords(text) {
    const keywords = [];
    
    // 숫자 패턴
    const numbers = text.match(/\d+(?:\.\d+)?/g) || [];
    keywords.push(...numbers);
    
    // 중요 단어
    const importantWords = text.match(/重要|注意|エラー|成功|失敗|完了|開始|終了/g) || [];
    keywords.push(...importantWords);
    
    // 고유명사 (대문자로 시작하는 단어)
    const properNouns = text.match(/[A-Z][a-z]+/g) || [];
    keywords.push(...properNouns);
    
    return [...new Set(keywords)]; // 중복 제거
  }
  
  /**
   * 구조 보존 확인
   * @private
   */
  static _checkStructurePreservation(original, optimized) {
    const originalLines = original.split('\n').length;
    const optimizedLines = optimized.split('\n').length;
    
    // 줄 수 비율
    const lineRatio = optimizedLines / originalLines;
    
    // 헤더 보존 확인
    const originalHeaders = (original.match(/^#+\s|■|●|○/gm) || []).length;
    const optimizedHeaders = (optimized.match(/^#+\s|■|●|○/gm) || []).length;
    const headerRatio = originalHeaders > 0 ? optimizedHeaders / originalHeaders : 1.0;
    
    return (lineRatio + headerRatio) / 2;
  }
  
  /**
   * 가독성 평가
   * @private
   */
  static _assessReadability(text) {
    const lines = text.split('\n');
    const validLines = lines.filter(line => line.trim().length > 0);
    
    if (validLines.length === 0) return 0;
    
    // 평균 줄 길이
    const avgLineLength = text.length / validLines.length;
    const lineLengthScore = avgLineLength > 20 && avgLineLength < 200 ? 1.0 : 0.5;
    
    // 줄 수
    const lineCountScore = validLines.length > 5 ? 1.0 : validLines.length / 5;
    
    // 문장 완성도
    const completenessScore = this._checkSentenceCompleteness(text);
    
    return (lineLengthScore + lineCountScore + completenessScore) / 3;
  }
  
  /**
   * 문장 완성도 확인
   * @private
   */
  static _checkSentenceCompleteness(text) {
    const sentences = text.split(/[.!?。！？]/);
    const completeSentences = sentences.filter(s => s.trim().length > 10);
    
    return sentences.length > 0 ? completeSentences.length / sentences.length : 0;
  }
  
  /**
   * 문자열 유사도 계산
   * @private
   */
  static _calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this._levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }
  
  /**
   * 레벤슈타인 거리 계산
   * @private
   */
  static _levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
  
  /**
   * 토큰 수 추정
   * @private
   */
  static _estimateTokenCount(text) {
    // 언어별 추정 (보수적)
    const japaneseChars = (text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g) || []).length;
    const koreanChars = (text.match(/[\uAC00-\uD7AF]/g) || []).length;
    const englishChars = (text.match(/[a-zA-Z]/g) || []).length;
    
    // 대략적 토큰 계산
    const japaneseTokens = japaneseChars / 2;
    const koreanTokens = koreanChars / 2.5;
    const englishTokens = englishChars / 4;
    
    return Math.ceil(japaneseTokens + koreanTokens + englishTokens);
  }
  
  /**
   * 최적화 통계 조회
   */
  static getOptimizationStats() {
    const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const properties = PropertiesService.getScriptProperties();
    const statsKey = `optimization_stats_${today}`;
    
    const stats = JSON.parse(properties.getProperty(statsKey) || '{}');
    
    return {
      date: today,
      totalOptimizations: stats.totalOptimizations || 0,
      totalOriginalLength: stats.totalOriginalLength || 0,
      totalOptimizedLength: stats.totalOptimizedLength || 0,
      averageCompressionRatio: stats.averageCompressionRatio || 0,
      averageQualityScore: stats.averageQualityScore || 0
    };
  }
  
  /**
   * 최적화 통계 업데이트
   * @param {Object} optimizationResult - 최적화 결과
   */
  static updateOptimizationStats(optimizationResult) {
    const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const properties = PropertiesService.getScriptProperties();
    const statsKey = `optimization_stats_${today}`;
    
    const stats = JSON.parse(properties.getProperty(statsKey) || '{}');
    
    const newCount = (stats.totalOptimizations || 0) + 1;
    const newOriginalLength = (stats.totalOriginalLength || 0) + (optimizationResult.originalLength || 0);
    const newOptimizedLength = (stats.totalOptimizedLength || 0) + (optimizationResult.optimizedLength || 0);
    
    const newCompressionRatio = newOptimizedLength / newOriginalLength;
    const currentAvgQuality = stats.averageQualityScore || 0;
    const newAvgQuality = ((currentAvgQuality * (newCount - 1)) + (optimizationResult.qualityScore || 0)) / newCount;
    
    const updatedStats = {
      totalOptimizations: newCount,
      totalOriginalLength: newOriginalLength,
      totalOptimizedLength: newOptimizedLength,
      averageCompressionRatio: newCompressionRatio,
      averageQualityScore: newAvgQuality,
      lastUpdated: new Date().toISOString()
    };
    
    properties.setProperty(statsKey, JSON.stringify(updatedStats));
  }
}