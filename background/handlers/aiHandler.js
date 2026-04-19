// AI相关的消息处理器

const { safeName, normalizeTags, createId } = require('../utils/helpers');

class AiHandler {
  constructor(dataRepository) {
    this.dataRepository = dataRepository;
  }

  async handleAiEntityAssist(data) {
    try {
      const mode = safeName(data.mode).toLowerCase();
      const text = safeName(data.text);
      const assistProfile = data.assistProfile || {};

      if (!text) {
        return { success: false, error: '文本不能为空' };
      }

      if (mode === 'summarize') {
        const summary = this.summarizeText(text, assistProfile);
        return { success: true, result: summary };
      }

      if (mode === 'expand') {
        const expanded = this.expandText(text, assistProfile);
        return { success: true, result: expanded };
      }

      return { success: false, error: '无效的模式' };
    } catch (error) {
      console.error('[AiHandler] handleAiEntityAssist error:', error);
      return { success: false, error: error?.message || 'AI辅助失败' };
    }
  }

  summarizeText(text, profile) {
    const maxLength = profile.targetLength === 'short' ? 50 : profile.targetLength === 'long' ? 200 : 100;
    const style = profile.style || 'balanced';

    if (text.length <= maxLength) {
      return {
        summary: text,
        tags: [],
        suggestedType: 'other'
      };
    }

    const sentences = text.split(/[。！？\n]/).filter(Boolean);
    let summary = '';

    if (style === 'concise') {
      summary = sentences[0] ? sentences[0].slice(0, maxLength) : text.slice(0, maxLength);
    } else if (style === 'detailed') {
      summary = sentences.slice(0, 3).join('。');
      if (summary.length > maxLength * 2) {
        summary = summary.slice(0, maxLength * 2);
      }
    } else {
      summary = sentences.slice(0, 2).join('。');
      if (summary.length > maxLength) {
        summary = summary.slice(0, maxLength);
      }
    }

    const words = text.split(/[\s,，。、]/).filter(Boolean);
    const wordCount = {};
    words.forEach((word) => {
      if (word.length >= 2) {
        wordCount[word] = (wordCount[word] || 0) + 1;
      }
    });

    const sorted = Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);

    return {
      summary: summary || text.slice(0, maxLength),
      tags: sorted,
      suggestedType: 'other'
    };
  }

  expandText(text, profile) {
    const style = profile.style || 'balanced';
    const baseLength = text.length;

    let expanded = text;

    if (style === 'concise') {
      expanded = text;
    } else if (style === 'detailed') {
      const fillers = [
        '仔细观察可以发现，',
        '深入了解之后可以看出，',
        '值得注意的是，',
        '从多个角度来看，'
      ];
      const randomFillers = fillers.slice(0, 2).join('');
      expanded = `${randomFillers}${text}。`;
    } else {
      const filler = '进一步分析表明，';
      expanded = `${filler}${text}。`;
    }

    return {
      expanded,
      originalLength: baseLength,
      expandedLength: expanded.length
    };
  }

  async handleReportAiFeedback(data) {
    try {
      const scope = data.scope;
      const decision = data.decision;
      const qualityScore = data.qualityScore;
      const conflictCount = data.conflictCount;
      const feedbackAt = data.feedbackAt || Date.now();

      console.log('[AiHandler] AI Feedback received:', { scope, decision, qualityScore, conflictCount, feedbackAt });

      return { success: true, acknowledged: true };
    } catch (error) {
      console.error('[AiHandler] handleReportAiFeedback error:', error);
      return { success: false, error: error?.message || '反馈记录失败' };
    }
  }

  async handleParseManuscript(data) {
    try {
      const worldId = safeName(data.worldId);
      const text = String(data.text || '').trim();
      const bookId = data.bookId ? safeName(data.bookId) : null;

      if (!worldId) {
        return { success: false, error: '缺少世界ID' };
      }

      if (!text) {
        return { success: false, error: '稿件内容不能为空' };
      }

      const entities = this.extractEntitiesFromText(text);
      return {
        success: true,
        worldId,
        bookId,
        entities,
        stats: {
          totalCharacters: text.length,
          extractedEntities: entities.length
        }
      };
    } catch (error) {
      console.error('[AiHandler] handleParseManuscript error:', error);
      return { success: false, error: error?.message || '稿件解析失败' };
    }
  }

  extractEntitiesFromText(text) {
    const entities = [];
    const sentences = text.split(/[。！？\n]/).filter(Boolean);

    sentences.forEach((sentence, index) => {
      const trimmed = sentence.trim();
      if (trimmed.length > 5 && trimmed.length < 100) {
        entities.push({
          id: createId('entity'),
          name: trimmed.slice(0, 20),
          type: 'other',
          summary: trimmed,
          createdAt: Date.now()
        });
      }
    });

    return entities.slice(0, 50);
  }

  normalizeAiFeedbackScope(scope) {
    const AI_FEEDBACK_SCOPES = new Set(['assist', 'conflict']);
    return AI_FEEDBACK_SCOPES.has(scope) ? scope : null;
  }

  normalizeAiFeedbackDecision(decision) {
    const AI_FEEDBACK_DECISIONS = new Set(['positive', 'negative']);
    return AI_FEEDBACK_DECISIONS.has(decision) ? decision : null;
  }

  normalizeRatio01(value, fallback) {
    const normalized = Number(value);
    if (!Number.isFinite(normalized)) return fallback;
    if (normalized < 0 || normalized > 1) return fallback;
    return normalized;
  }

  validateAiEntityAssistPayload(payload) {
    if (!this.isPlainObject(payload)) {
      return this.createValidationResult('AI_ENTITY_ASSIST 参数必须是对象');
    }

    const mode = safeName(payload.mode).toLowerCase();
    if (mode !== 'summarize' && mode !== 'expand') {
      return this.createValidationResult('AI_ENTITY_ASSIST.mode 非法');
    }

    const text = safeName(payload.text);
    if (!text) {
      return this.createValidationResult('AI_ENTITY_ASSIST.text 不能为空');
    }

    if (text.length > 6000) {
      return this.createValidationResult('AI_ENTITY_ASSIST.text 过长');
    }

    if (payload.assistProfile !== undefined) {
      if (!this.isPlainObject(payload.assistProfile)) {
        return this.createValidationResult('AI_ENTITY_ASSIST.assistProfile 必须是对象');
      }
      if (payload.assistProfile.style !== undefined) {
        const style = safeName(payload.assistProfile.style).toLowerCase();
        if (style !== 'concise' && style !== 'balanced' && style !== 'detailed') {
          return this.createValidationResult('AI_ENTITY_ASSIST.assistProfile.style 非法');
        }
      }
      if (payload.assistProfile.targetLength !== undefined) {
        const targetLength = safeName(payload.assistProfile.targetLength).toLowerCase();
        if (targetLength !== 'short' && targetLength !== 'medium' && targetLength !== 'long') {
          return this.createValidationResult('AI_ENTITY_ASSIST.assistProfile.targetLength 非法');
        }
      }
    }

    return null;
  }

  validateReportAiFeedbackPayload(payload) {
    if (!this.isPlainObject(payload)) {
      return this.createValidationResult('REPORT_AI_FEEDBACK 参数必须是对象');
    }

    const scope = this.normalizeAiFeedbackScope(payload.scope);
    if (!scope) {
      return this.createValidationResult('REPORT_AI_FEEDBACK.scope 非法');
    }

    const decision = this.normalizeAiFeedbackDecision(payload.decision);
    if (!decision) {
      return this.createValidationResult('REPORT_AI_FEEDBACK.decision 非法');
    }

    if (payload.qualityScore !== undefined) {
      const normalized = this.normalizeRatio01(payload.qualityScore, null);
      if (normalized === null) {
        return this.createValidationResult('REPORT_AI_FEEDBACK.qualityScore 非法');
      }
    }

    if (payload.conflictCount !== undefined) {
      const conflictCount = Number(payload.conflictCount);
      if (!Number.isFinite(conflictCount) || conflictCount < 0) {
        return this.createValidationResult('REPORT_AI_FEEDBACK.conflictCount 非法');
      }
    }

    if (payload.feedbackAt !== undefined) {
      const feedbackAt = Number(payload.feedbackAt);
      if (!Number.isFinite(feedbackAt) || feedbackAt <= 0) {
        return this.createValidationResult('REPORT_AI_FEEDBACK.feedbackAt 非法');
      }
    }

    return null;
  }

  validateParseManuscriptPayload(payload) {
    if (!this.isPlainObject(payload)) {
      return this.createValidationResult('PARSE_MANUSCRIPT 参数必须是对象');
    }

    if (!safeName(payload.worldId)) {
      return this.createValidationResult('PARSE_MANUSCRIPT 缺少 worldId');
    }

    const text = String(payload.text || '').trim();
    if (!text) {
      return this.createValidationResult('PARSE_MANUSCRIPT.text 不能为空');
    }

    if (text.length > 120000) {
      return this.createValidationResult('PARSE_MANUSCRIPT.text 过长');
    }

    if (payload.bookId !== undefined && typeof payload.bookId !== 'string') {
      return this.createValidationResult('PARSE_MANUSCRIPT.bookId 必须是字符串');
    }

    return null;
  }

  isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  createValidationResult(error, details = {}) {
    return {
      success: false,
      error,
      errorType: 'validation',
      details
    };
  }
}

module.exports = AiHandler;
