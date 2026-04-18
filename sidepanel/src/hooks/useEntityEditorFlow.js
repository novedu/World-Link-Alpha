import { useState } from 'react';
import { parseTags } from '../utils/entityUtils';
import { formatAiProvider } from '../utils/aiUtils';
import { normalizeAssistProfile } from '../utils/assistUtils';
import { formatRuntimeError, sendRuntimeMessage } from '../services/runtimeApi';

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

export function useEntityEditorFlow({
  selectedWorldId,
  selectedBookId,
  bookEntityUsages,
  entityRelations,
  setActiveTab,
  onUiMessage
}) {
  const [editingEntity, setEditingEntity] = useState(null);
  const [isSavingEntity, setIsSavingEntity] = useState(false);
  const [isAiAssisting, setIsAiAssisting] = useState(false);
  const [isCheckingConflict, setIsCheckingConflict] = useState(false);
  const [isSubmittingAiFeedback, setIsSubmittingAiFeedback] = useState(false);
  const [aiAssistMeta, setAiAssistMeta] = useState(null);
  const [aiAssistProfile, setAiAssistProfile] = useState(() => normalizeAssistProfile());
  const [conflictCheckMeta, setConflictCheckMeta] = useState(null);

  const handleStartNewEntity = () => {
    if (!selectedWorldId) {
      onUiMessage?.('请先选择或创建一个世界', 'warning');
      return;
    }
    setActiveTab('entities');
    setAiAssistMeta(null);
    setConflictCheckMeta(null);
    setEditingEntity({
      id: '',
      worldId: selectedWorldId,
      name: '',
      type: 'other',
      summary: '',
      tags: '',
      relations: [],
      conflictHints: [],
      selectedText: '',
      sourceUrl: '',
      sourceTitle: '',
      usedInCurrentBook: Boolean(selectedBookId)
    });
  };

  const handleEditEntity = (entity) => {
    const usedInCurrentBook = selectedBookId
      ? bookEntityUsages.some((usage) => usage.bookId === selectedBookId && usage.entityId === entity.id)
      : false;
    const relations = entityRelations
      .filter((relation) => relation.fromEntityId === entity.id && relation.worldId === entity.worldId)
      .map((relation) => ({
        id: relation.id,
        toEntityId: relation.toEntityId,
        type: relation.type,
        note: relation.note || '',
        createdAt: relation.createdAt
      }));
    setActiveTab('entities');
    setAiAssistMeta(null);
    setConflictCheckMeta(null);
    setEditingEntity({
      ...entity,
      tags: parseTags(entity.tags).join(', '),
      relations,
      conflictHints: [],
      usedInCurrentBook
    });
  };

  const handleEntityFieldChange = (field, value) => {
    setEditingEntity((prev) => ({ ...(prev || {}), [field]: value }));
  };

  const handleToggleEditorTag = (tag) => {
    if (!editingEntity) return;
    const currentTags = parseTags(editingEntity.tags);
    const nextTags = currentTags.includes(tag)
      ? currentTags.filter((item) => item !== tag)
      : [...currentTags, tag];
    setEditingEntity((prev) => ({ ...(prev || {}), tags: nextTags.join(', ') }));
  };

  const handleCancelEdit = () => {
    setEditingEntity(null);
    setAiAssistMeta(null);
    setConflictCheckMeta(null);
  };

  const handleSaveEntity = async () => {
    if (!editingEntity || isSavingEntity) return;
    const name = String(editingEntity.name || '').trim();
    if (!name) {
      onUiMessage?.('实体名称不能为空', 'warning');
      return;
    }

    setIsSavingEntity(true);
    const payload = {
      entity: {
        id: editingEntity.id || '',
        worldId: selectedWorldId,
        name,
        type: editingEntity.type || 'other',
        summary: editingEntity.summary || '',
        tags: parseTags(editingEntity.tags),
        relations: Array.isArray(editingEntity.relations) ? editingEntity.relations : [],
        selectedText: editingEntity.selectedText || '',
        sourceUrl: editingEntity.sourceUrl || '',
        sourceTitle: editingEntity.sourceTitle || '',
        usedInCurrentBook: Boolean(editingEntity.usedInCurrentBook)
      },
      selectedBookId
    };
    const result = await sendRuntimeMessage('SAVE_ENTITY_FROM_SIDEPANEL', payload);
    setIsSavingEntity(false);

    if (!result?.success) {
      onUiMessage?.(formatRuntimeError(result, '保存失败'), 'error');
      return;
    }

    setEditingEntity({
      ...result.entity,
      tags: parseTags(result.entity.tags).join(', '),
      relations: Array.isArray(result.relations)
        ? result.relations.map((relation) => ({
            id: relation.id,
            toEntityId: relation.toEntityId,
            type: relation.type,
            note: relation.note || '',
            createdAt: relation.createdAt
          }))
        : Array.isArray(editingEntity.relations)
          ? editingEntity.relations
          : [],
      conflictHints: Array.isArray(editingEntity.conflictHints) ? editingEntity.conflictHints : [],
      usedInCurrentBook: Boolean(editingEntity.usedInCurrentBook)
    });
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
    const result = await sendRuntimeMessage('AI_ENTITY_ASSIST', {
      mode: normalizedMode,
      text: sourceText,
      entityId: editingEntity.id || '',
      worldId: selectedWorldId,
      assistProfile
    });
    setIsAiAssisting(false);

    if (!result?.success) {
      onUiMessage?.(formatRuntimeError(result, 'AI 处理失败'), 'error');
      return;
    }

    setEditingEntity((prev) => ({
      ...(prev || {}),
      summary: result.text || sourceText
    }));
    const nextMeta = {
      mode: normalizedMode,
      provider: result.provider || 'local-heuristic',
      model: result.model || '',
      strategyVersion: String(result.strategyVersion || ''),
      qualityScore: normalizeOptionalRatio(result.qualityScore),
      qualityTier: String(result.qualityTier || '').trim().toLowerCase(),
      qualityLabel: String(result.qualityLabel || '').trim(),
      fallbackReason: result.fallbackReason || '',
      fallbackType: result.fallbackType || '',
      fallbackStatus: result.fallbackStatus,
      fallbackRetriable: Boolean(result.fallbackRetriable),
      fallbackTraceId: result.fallbackTraceId || '',
      assistProfile: normalizeAssistProfile(result.assistProfile || assistProfile),
      updatedAt: Date.now()
    };
    setAiAssistMeta(nextMeta);
    onUiMessage?.(
      `${normalizedMode === 'expand' ? 'AI 扩写已生成' : 'AI 总结已生成'}（${formatAiProvider(nextMeta.provider, nextMeta.model)}）`,
      'success'
    );
  };

  const handleCheckConflict = async () => {
    if (!editingEntity || isCheckingConflict) return;
    const name = String(editingEntity.name || '').trim();
    if (!name) {
      onUiMessage?.('请先输入实体名称', 'warning');
      return;
    }

    setIsCheckingConflict(true);
    const result = await sendRuntimeMessage('CHECK_ENTITY_CONFLICT', {
      worldId: selectedWorldId,
      draftEntity: {
        id: editingEntity.id || '',
        name,
        type: editingEntity.type || 'other',
        summary: editingEntity.summary || ''
      }
    });
    setIsCheckingConflict(false);

    if (!result?.success) {
      onUiMessage?.(formatRuntimeError(result, '冲突检测失败'), 'error');
      return;
    }

    const hints = Array.isArray(result.conflicts) ? result.conflicts : [];
    const conflictMeta =
      result.conflictMeta && typeof result.conflictMeta === 'object'
        ? {
            total: Number(result.conflictMeta.total || hints.length || 0),
            high: Number(result.conflictMeta.high || 0),
            medium: Number(result.conflictMeta.medium || 0),
            low: Number(result.conflictMeta.low || 0)
          }
        : null;
    setEditingEntity((prev) => ({
      ...(prev || {}),
      conflictHints: hints
    }));
    const nextMeta = {
      provider: result.provider || 'local-heuristic',
      model: result.model || '',
      fallbackReason: result.fallbackReason || '',
      fallbackType: result.fallbackType || '',
      fallbackStatus: result.fallbackStatus,
      fallbackRetriable: Boolean(result.fallbackRetriable),
      fallbackTraceId: result.fallbackTraceId || '',
      strategyVersion: String(result.strategyVersion || ''),
      calibration: normalizeConflictCalibrationMeta(result.calibration),
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
    const result = await sendRuntimeMessage('REPORT_AI_FEEDBACK', {
      scope: normalizedScope,
      decision: normalizedDecision,
      provider: targetMeta.provider || '',
      model: targetMeta.model || '',
      strategyVersion: targetMeta.strategyVersion || '',
      traceId: targetMeta.fallbackTraceId || '',
      worldId: selectedWorldId || '',
      bookId: selectedBookId || '',
      entityId: editingEntity?.id || '',
      mode: normalizedScope === 'assist' ? targetMeta.mode || '' : '',
      assistProfile: normalizedScope === 'assist' ? targetMeta.assistProfile || undefined : undefined,
      qualityScore: normalizedScope === 'assist' ? targetMeta.qualityScore : undefined,
      qualityTier: normalizedScope === 'assist' ? targetMeta.qualityTier : '',
      qualityLabel: normalizedScope === 'assist' ? targetMeta.qualityLabel : '',
      conflictCount: normalizedScope === 'conflict' ? Number(targetMeta.count || 0) : undefined,
      conflictMeta: normalizedScope === 'conflict' ? targetMeta.conflictMeta || undefined : undefined,
      feedbackAt: Date.now()
    });
    setIsSubmittingAiFeedback(false);

    if (!result?.success) {
      onUiMessage?.(formatRuntimeError(result, '反馈提交失败'), 'error');
      return;
    }

    const nextFeedbackMeta = {
      feedbackDecision: normalizedDecision,
      feedbackAt: Date.now()
    };
    if (normalizedScope === 'assist') {
      setAiAssistMeta((prev) => ({ ...(prev || {}), ...nextFeedbackMeta }));
    } else {
      setConflictCheckMeta((prev) => ({ ...(prev || {}), ...nextFeedbackMeta }));
    }

    if (result.recorded === false) {
      onUiMessage?.(result.message || '反馈已接收，云端稍后同步', 'warning');
      return;
    }

    onUiMessage?.(
      normalizedDecision === 'positive' ? '已记录：结果有帮助' : '已记录：结果待优化',
      'success'
    );
  };

  return {
    editingEntity,
    setEditingEntity,
    isSavingEntity,
    isAiAssisting,
    isCheckingConflict,
    isSubmittingAiFeedback,
    aiAssistMeta,
    aiAssistProfile,
    setAiAssistProfile,
    conflictCheckMeta,
    handleStartNewEntity,
    handleEditEntity,
    handleEntityFieldChange,
    handleToggleEditorTag,
    handleAiAssist,
    handleCheckConflict,
    handleSubmitAiFeedback,
    handleCancelEdit,
    handleSaveEntity
  };
}
