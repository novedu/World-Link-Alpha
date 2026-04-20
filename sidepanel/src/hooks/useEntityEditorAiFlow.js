import { entityService } from '../services/entity.service.ts';
import { aiService } from '../services/ai.service.ts';
import { formatAiProvider } from '../utils/aiUtils';

function normalizeOptionalRatio(value) {
  const raw = Number(value);
  if (!Number.isFinite(raw)) return null;
  const normalized = raw > 1 && raw <= 100 ? raw / 100 : raw;
  if (normalized < 0 || normalized > 1) return null;
  return Number(normalized.toFixed(2));
}

function normalizeConflictCalibrationMeta(input) {
  if (!input || typeof input !== 'object') return null;
  const similarity = input.similarity && typeof input.similarity === 'object' ? input.similarity : {};
  const risk = input.risk && typeof input.risk === 'object' ? input.risk : {};
  const rowLimitRaw = Number(input.rowLimit || 0);
  const rowLimit = Number.isFinite(rowLimitRaw) && rowLimitRaw > 0 ? Math.floor(rowLimitRaw) : 0;
  const name = normalizeOptionalRatio(similarity.name);
  const summary = normalizeOptionalRatio(similarity.summary);
  const high = normalizeOptionalRatio(risk.high);
  const medium = normalizeOptionalRatio(risk.medium);
  if (name === null && summary === null && high === null && medium === null && rowLimit <= 0) return null;
  return {
    similarity: {
      name: name ?? 0,
      summary: summary ?? 0
    },
    risk: {
      high: high ?? 0,
      medium: medium ?? 0
    },
    rowLimit: rowLimit || 0
  };
}

function normalizeConflictHintRow(item) {
  const name = String(item?.name || item?.entityName || item?.existingName || '').trim();
  const confidence = normalizeOptionalRatio(item?.confidence) ?? 0;
  return {
    ...item,
    entityId: String(item?.entityId || item?.existingId || '').trim(),
    name,
    reasonCode: String(item?.reasonCode || item?.reason || '').trim(),
    confidence
  };
}

function normalizeAssistProfile(profile) {
  if (!profile || typeof profile !== 'object') {
    return {
      expandRatio: 0.3,
      summaryRatio: 0.2,
      style: 'narrative',
      perspective: 'third_person'
    };
  }
  return {
    expandRatio: normalizeOptionalRatio(profile.expandRatio) ?? 0.3,
    summaryRatio: normalizeOptionalRatio(profile.summaryRatio) ?? 0.2,
    style: String(profile.style || 'narrative').trim() || 'narrative',
    perspective: String(profile.perspective || 'third_person').trim() || 'third_person'
  };
}

export function useEntityEditorAiFlow({
  editingEntity,
  setEditingEntity,
  selectedWorldId,
  isAiAssisting,
  setIsAiAssisting,
  isCheckingConflict,
  setIsCheckingConflict,
  isSubmittingAiFeedback,
  setIsSubmittingAiFeedback,
  aiAssistMeta,
  setAiAssistMeta,
  conflictCheckMeta,
  setConflictCheckMeta,
  aiAssistProfile,
  onUiMessage
}) {
  const fetchContextEntities = async () => {
    if (!selectedWorldId) return [];
    try {
      const result = await entityService.getEntities(selectedWorldId);
      if (!result?.success || !Array.isArray(result?.data)) return [];
      return result.data.map((entity) => ({
        id: String(entity?.id || '').trim(),
        name: String(entity?.name || '').trim(),
        type: String(entity?.type || 'other').trim() || 'other',
        summary: String(entity?.summary || '').trim()
      })).filter((entity) => entity.id && entity.name);
    } catch {
      return [];
    }
  };

  const handleAiAssist = async (mode, profileInput) => {
    if (!editingEntity || isAiAssisting) return;
    const normalizedMode = mode === 'expand' ? 'expand' : 'summarize';
    const assistProfile = normalizeAssistProfile(profileInput || aiAssistProfile);
    const sourceText =
      String(editingEntity.summary || '').trim() ||
      String(editingEntity.selectedText || '').trim() ||
      String(editingEntity.name || '').trim();

    if (!sourceText) {
      onUiMessage?.('请先输入描述或选择可用于处理的文本', 'warning');
      return;
    }

    setIsAiAssisting(true);
    try {
      const contextEntities = await fetchContextEntities();
      const result = await aiService.entityAssist({
        mode: normalizedMode,
        text: sourceText,
        assistProfile,
        contextEntities
      });

      if (!result?.success || !result?.data) {
        onUiMessage?.('AI 处理失败，请稍后重试', 'error');
        return;
      }

      const payload = result.data;
      const nextSummary = String(payload.result || payload.text || sourceText);
      setEditingEntity((prev) => ({
        ...(prev || {}),
        summary: nextSummary
      }));
      const nextMeta = {
        mode: normalizedMode,
        provider: payload.provider || 'local-heuristic',
        model: payload.model || '',
        strategyVersion: String(payload.strategyVersion || ''),
        qualityScore: normalizeOptionalRatio(payload.qualityScore),
        qualityTier: String(payload.qualityTier || '').trim().toLowerCase(),
        qualityLabel: String(payload.qualityLabel || '').trim(),
        fallbackReason: payload.fallbackReason || '',
        fallbackType: payload.fallbackType || '',
        fallbackStatus: payload.fallbackStatus,
        fallbackRetriable: Boolean(payload.fallbackRetriable),
        fallbackTraceId: payload.fallbackTraceId || '',
        assistProfile: normalizeAssistProfile(payload.assistProfile || assistProfile),
        updatedAt: Date.now()
      };
      setAiAssistMeta(nextMeta);
      onUiMessage?.(
        `${normalizedMode === 'expand' ? 'AI 扩写已生成' : 'AI 总结已生成'}（${formatAiProvider(nextMeta.provider, nextMeta.model)}）`,
        'success'
      );
    } catch (error) {
      console.error('[Sidepanel] handleAiAssist error:', error);
      onUiMessage?.(error?.message || 'AI 处理失败，请稍后重试', 'error');
    } finally {
      setIsAiAssisting(false);
    }
  };

  const handleCheckConflict = async () => {
    if (!editingEntity || isCheckingConflict) return;
    const name = String(editingEntity.name || '').trim();
    if (!name) {
      onUiMessage?.('请先输入实体名称', 'warning');
      return;
    }

    setIsCheckingConflict(true);
    try {
      const contextEntities = await fetchContextEntities();
      const filteredContextEntities = contextEntities.filter((item) => item.id !== String(editingEntity.id || '').trim());
      const result = await aiService.entityConflict({
        targetEntity: {
          id: editingEntity.id || '',
          name,
          type: editingEntity.type || 'other',
          summary: editingEntity.summary || ''
        },
        contextEntities: filteredContextEntities,
        worldContext: {
          worldId: selectedWorldId || '',
          worldName: ''
        }
      });

      if (!result?.success || !result?.data) {
        onUiMessage?.('冲突检测失败，请稍后重试', 'error');
        return;
      }

      const payload = result.data;
      const hints = Array.isArray(payload.conflicts) ? payload.conflicts.map(normalizeConflictHintRow) : [];
      const conflictDistribution = payload.distribution && typeof payload.distribution === 'object'
        ? payload.distribution
        : {};
      const conflictMeta =
        payload.conflictMeta && typeof payload.conflictMeta === 'object'
          ? {
              total: Number(payload.conflictMeta.total || hints.length || 0),
              high: Number(payload.conflictMeta.high || 0),
              medium: Number(payload.conflictMeta.medium || 0),
              low: Number(payload.conflictMeta.low || 0)
            }
          : {
              total: hints.length,
              high: Number(conflictDistribution.high || 0),
              medium: Number(conflictDistribution.medium || 0),
              low: Number(conflictDistribution.low || 0)
            };

      setEditingEntity((prev) => ({
        ...(prev || {}),
        conflictHints: hints
      }));
      const nextMeta = {
        provider: payload.provider || 'local-heuristic',
        model: payload.model || '',
        fallbackReason: payload.fallbackReason || '',
        fallbackType: payload.fallbackType || '',
        fallbackStatus: payload.fallbackStatus,
        fallbackRetriable: Boolean(payload.fallbackRetriable),
        fallbackTraceId: payload.fallbackTraceId || '',
        strategyVersion: String(payload.strategyVersion || ''),
        calibration: normalizeConflictCalibrationMeta(payload.calibration),
        conflictMeta,
        updatedAt: Date.now(),
        count: hints.length
      };
      setConflictCheckMeta(nextMeta);
      const riskSummary =
        conflictMeta && conflictMeta.total > 0 ? ` 高${conflictMeta.high}/中${conflictMeta.medium}/低${conflictMeta.low}` : '';
      onUiMessage?.(
        `${hints.length > 0 ? `发现 ${hints.length} 条潜在冲突` : '未发现明显冲突'}（${formatAiProvider(
          nextMeta.provider,
          nextMeta.model
        )}${riskSummary}）`,
        'success'
      );
    } catch (error) {
      console.error('[Sidepanel] handleCheckConflict error:', error);
      onUiMessage?.(error?.message || '冲突检测失败，请稍后重试', 'error');
    } finally {
      setIsCheckingConflict(false);
    }
  };

  const handleSubmitAiFeedback = async (scope, decision) => {
    const normalizedScope = scope === 'conflict' ? 'conflict' : 'assist';
    const normalizedDecision = decision === 'negative' ? 'negative' : 'positive';
    if (isSubmittingAiFeedback) return;

    const targetMeta = normalizedScope === 'assist' ? aiAssistMeta : conflictCheckMeta;
    if (!targetMeta) {
      onUiMessage?.('当前暂无可反馈的 AI 结果', 'warning');
      return;
    }

    setIsSubmittingAiFeedback(true);
    try {
      const result = await aiService.reportFeedback({
        type: normalizedScope,
        feedback: {
          isPositive: normalizedDecision === 'positive',
          traceId: targetMeta.fallbackTraceId || '',
          comment: ''
        }
      });

      if (!result?.success) {
        onUiMessage?.('反馈提交失败，请稍后重试', 'error');
        return;
      }

      const payload = result.data || {};
      const nextFeedbackMeta = {
        feedbackDecision: normalizedDecision,
        feedbackAt: Date.now()
      };
      if (normalizedScope === 'assist') {
        setAiAssistMeta((prev) => ({ ...(prev || {}), ...nextFeedbackMeta }));
      } else {
        setConflictCheckMeta((prev) => ({ ...(prev || {}), ...nextFeedbackMeta }));
      }

      if (payload.recorded === false) {
        onUiMessage?.(payload.message || '反馈已接收，云端稍后同步', 'warning');
        return;
      }

      onUiMessage?.(
        normalizedDecision === 'positive' ? '已记录：结果有帮助' : '已记录：结果待优化',
        'success'
      );
    } catch (error) {
      console.error('[Sidepanel] submit AI feedback error:', error);
      onUiMessage?.(error?.message || '反馈提交失败，请稍后重试', 'error');
    } finally {
      setIsSubmittingAiFeedback(false);
    }
  };

  return {
    handleAiAssist,
    handleCheckConflict,
    handleSubmitAiFeedback
  };
}