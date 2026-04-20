import { useState } from 'react';
import { parseTags } from '../utils/entityUtils';
import { formatAiProvider } from '../utils/aiUtils';
import { normalizeAssistProfile } from '../utils/assistUtils';
import { entityService } from '../services/entity.service.ts';
import { captureService } from '../services/capture.service.ts';
import { aiService } from '../services/ai.service.ts';
import { timelineService } from '../services/timeline.service.ts';

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

const IMAGE_ENTITY_TYPE_MAP = {
  character: 'character',
  location: 'location',
  item: 'item',
  faction: 'character',
  creature: 'character',
  mineral: 'item',
  event: 'location',
  law: 'location',
  other: 'character'
};

function normalizeIsoTimestamp(value) {
  const input = String(value || '').trim();
  if (!input) return new Date().toISOString();
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
  return parsed.toISOString();
}

function parseTimelineMetadata(rawMetadata) {
  if (!rawMetadata) return null;
  if (typeof rawMetadata === 'object') return rawMetadata;
  if (typeof rawMetadata !== 'string') return null;
  try {
    return JSON.parse(rawMetadata);
  } catch {
    return null;
  }
}

function normalizeImageAsset(item) {
  const imageUrl = String(item?.imageUrl || '').trim();
  if (!imageUrl) return null;
  return {
    id: String(item?.id || '').trim() || `image-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    imageUrl,
    prompt: String(item?.prompt || '').trim(),
    style: String(item?.style || 'realistic').trim() || 'realistic',
    entityType: String(item?.entityType || 'character').trim() || 'character',
    generatedAt: normalizeIsoTimestamp(item?.generatedAt || item?.timestamp || item?.createdAt)
  };
}

export function useEntityEditorFlow({
  selectedWorldId,
  selectedBookId,
  bookEntityUsages,
  entityRelations,
  setActiveTab,
  onDataChanged,
  onUiMessage
}) {
  const [editingEntity, setEditingEntity] = useState(null);
  const [isSavingEntity, setIsSavingEntity] = useState(false);
  const [isAiAssisting, setIsAiAssisting] = useState(false);
  const [isCheckingConflict, setIsCheckingConflict] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isSubmittingAiFeedback, setIsSubmittingAiFeedback] = useState(false);
  const [aiAssistMeta, setAiAssistMeta] = useState(null);
  const [aiAssistProfile, setAiAssistProfile] = useState(() => normalizeAssistProfile());
  const [conflictCheckMeta, setConflictCheckMeta] = useState(null);

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

  const fetchEntityImageAssets = async (entityId) => {
    const normalizedEntityId = String(entityId || '').trim();
    if (!normalizedEntityId) return [];
    try {
      const result = await timelineService.getEntityEvents(normalizedEntityId);
      if (!result?.success || !Array.isArray(result?.data)) return [];
      const imageAssets = result.data
        .filter((event) => String(event?.eventType || '').trim() === 'image_generated')
        .map((event) => {
          const metadata = parseTimelineMetadata(event?.metadata);
          const normalized = normalizeImageAsset({
            id: event?.id,
            imageUrl: metadata?.imageUrl,
            prompt: metadata?.prompt,
            style: metadata?.style,
            entityType: metadata?.entityType,
            generatedAt: metadata?.generatedAt || event?.timestamp || event?.createdAt
          });
          if (!normalized) return null;
          return {
            ...normalized,
            timelineEventId: String(event?.id || '').trim()
          };
        })
        .filter(Boolean)
        .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
      return imageAssets;
    } catch {
      return [];
    }
  };

  const persistImageAssetEvent = async ({ worldId, entityId, entityName, summary, asset }) => {
    const normalizedWorldId = String(worldId || '').trim();
    const normalizedEntityId = String(entityId || '').trim();
    const normalizedAsset = normalizeImageAsset(asset);
    if (!normalizedWorldId || !normalizedEntityId || !normalizedAsset) return false;
    try {
      const result = await timelineService.createEvent({
        worldId: normalizedWorldId,
        entityId: normalizedEntityId,
        eventType: 'image_generated',
        title: '生成设定配图',
        description: String(entityName || '').trim() || '未命名设定',
        timestamp: normalizedAsset.generatedAt,
        metadata: JSON.stringify({
          imageUrl: normalizedAsset.imageUrl,
          prompt: normalizedAsset.prompt,
          style: normalizedAsset.style,
          entityType: normalizedAsset.entityType,
          generatedAt: normalizedAsset.generatedAt,
          summary: String(summary || '').trim()
        })
      });
      return Boolean(result?.success && result?.data);
    } catch {
      return false;
    }
  };

  const applyImageAssetsToEditor = (assets, targetEntityId = '') => {
    setEditingEntity((prev) => {
      if (!prev) return prev;
      if (targetEntityId && String(prev.id || '').trim() !== String(targetEntityId || '').trim()) return prev;
      const normalizedAssets = Array.isArray(assets) ? assets : [];
      const currentImageUrl = String(prev.imageUrl || '').trim();
      const fallbackImageUrl = String(normalizedAssets[0]?.imageUrl || '').trim();
      return {
        ...(prev || {}),
        imageAssets: normalizedAssets,
        imageUrl: currentImageUrl || fallbackImageUrl
      };
    });
  };

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
      imageUrl: '',
      imageAssets: [],
      pendingImageAsset: null,
      usedInCurrentBook: Boolean(selectedBookId)
    });
  };

  const handleEditEntity = async (entity) => {
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
    const nextEditorState = {
      ...entity,
      tags: parseTags(entity.tags).join(', '),
      relations,
      conflictHints: [],
      imageUrl: String(entity?.imageUrl || '').trim(),
      imageAssets: [],
      pendingImageAsset: null,
      usedInCurrentBook
    };
    setEditingEntity(nextEditorState);

    const entityId = String(entity?.id || '').trim();
    if (!entityId) return;
    const imageAssets = await fetchEntityImageAssets(entityId);
    setEditingEntity((prev) => {
      if (!prev || String(prev.id || '').trim() !== entityId) return prev;
      const currentImageUrl = String(prev.imageUrl || '').trim();
      const fallbackImageUrl = String(imageAssets[0]?.imageUrl || '').trim();
      return {
        ...(prev || {}),
        imageAssets,
        imageUrl: currentImageUrl || fallbackImageUrl
      };
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

  const handleApplyImageAsset = (asset) => {
    const normalizedAsset = normalizeImageAsset(asset);
    if (!normalizedAsset) return;
    setEditingEntity((prev) => {
      if (!prev) return prev;
      const existingAssets = Array.isArray(prev.imageAssets) ? prev.imageAssets : [];
      const hasExisting = existingAssets.some((item) => item.imageUrl === normalizedAsset.imageUrl);
      const nextAssets = hasExisting ? existingAssets : [normalizedAsset, ...existingAssets];
      return {
        ...(prev || {}),
        imageUrl: normalizedAsset.imageUrl,
        imageAssets: nextAssets
      };
    });
  };

  const handleGenerateEntityImage = async (seedAsset) => {
    if (!editingEntity || isGeneratingImage) return;
    const entityName = String(editingEntity.name || '').trim();
    if (!entityName) {
      onUiMessage?.('请先输入设定名称，再生成配图', 'warning');
      return;
    }

    setIsGeneratingImage(true);
    try {
      const preferredType = String(seedAsset?.entityType || IMAGE_ENTITY_TYPE_MAP[editingEntity.type] || 'character').trim();
      const preferredStyle = String(seedAsset?.style || 'realistic').trim() || 'realistic';
      const prompt =
        String(seedAsset?.prompt || '').trim() ||
        `A detailed ${preferredType} named ${entityName}. ${String(editingEntity.summary || '').trim()}`;

      const result = await aiService.generateImage({
        prompt,
        entityType: preferredType,
        style: preferredStyle
      });

      if (!result?.success || !result?.data?.imageUrl) {
        onUiMessage?.('配图生成失败，请稍后重试', 'error');
        return;
      }

      const generatedAsset = normalizeImageAsset({
        imageUrl: result.data.imageUrl,
        prompt,
        style: preferredStyle,
        entityType: preferredType,
        generatedAt: new Date().toISOString()
      });

      if (!generatedAsset) {
        onUiMessage?.('配图生成失败，请稍后重试', 'error');
        return;
      }

      const editorEntityId = String(editingEntity.id || '').trim();
      const editorWorldId = String(editingEntity.worldId || selectedWorldId || '').trim();
      const canPersistToTimeline = Boolean(editorEntityId && editorWorldId);
      let persisted = false;

      if (canPersistToTimeline) {
        persisted = await persistImageAssetEvent({
          worldId: editorWorldId,
          entityId: editorEntityId,
          entityName,
          summary: editingEntity.summary,
          asset: generatedAsset
        });
      }

      if (persisted && editorEntityId) {
        const latestAssets = await fetchEntityImageAssets(editorEntityId);
        if (latestAssets.length > 0) {
          applyImageAssetsToEditor(latestAssets, editorEntityId);
        } else {
          handleApplyImageAsset(generatedAsset);
        }
        setEditingEntity((prev) => ({
          ...(prev || {}),
          pendingImageAsset: null
        }));
        onUiMessage?.('配图已生成并写入时间轴', 'success');
        return;
      }

      setEditingEntity((prev) => {
        if (!prev) return prev;
        if (editorEntityId && String(prev.id || '').trim() !== editorEntityId) return prev;
        const existingAssets = Array.isArray(prev.imageAssets) ? prev.imageAssets : [];
        const nextAssets = [generatedAsset, ...existingAssets.filter((item) => item.imageUrl !== generatedAsset.imageUrl)];
        return {
          ...(prev || {}),
          imageUrl: generatedAsset.imageUrl,
          imageAssets: nextAssets,
          pendingImageAsset: generatedAsset
        };
      });

      if (canPersistToTimeline) {
        onUiMessage?.('配图已生成，时间轴写入失败（可重试）', 'warning');
      } else {
        onUiMessage?.('配图已生成，保存设定后会写入时间轴', 'success');
      }
    } catch (error) {
      console.error('[Sidepanel] handleGenerateEntityImage error:', error);
      onUiMessage?.(error?.message || '配图生成失败，请稍后重试', 'error');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleSaveEntity = async () => {
    if (!editingEntity || isSavingEntity) return;
    const name = String(editingEntity.name || '').trim();
    if (!name) {
      onUiMessage?.('实体名称不能为空', 'warning');
      return;
    }

    setIsSavingEntity(true);
    try {
      const createPayload = {
        worldId: selectedWorldId,
        name,
        type: editingEntity.type || 'other',
        summary: editingEntity.summary || '',
        tags: parseTags(editingEntity.tags),
        sourceUrl: editingEntity.sourceUrl || '',
        sourceTitle: editingEntity.sourceTitle || ''
      };

      const updatePayload = {
        name,
        type: editingEntity.type || 'other',
        summary: editingEntity.summary || '',
        tags: parseTags(editingEntity.tags),
        sourceUrl: editingEntity.sourceUrl || '',
        sourceTitle: editingEntity.sourceTitle || ''
      };

      const saveResult = editingEntity.id
        ? await entityService.updateEntity(editingEntity.id, updatePayload)
        : await entityService.createEntity(createPayload);

      if (!saveResult?.success || !saveResult?.data) {
        onUiMessage?.('保存失败，请稍后重试', 'error');
        return;
      }

      const savedEntity = saveResult.data;
      const savedEntityId = String(savedEntity.id || '').trim();

      if (selectedBookId && savedEntityId) {
        if (editingEntity.usedInCurrentBook) {
          await entityService.bindEntityToBook(savedEntityId, selectedBookId);
        } else {
          await entityService.unbindEntityFromBook(savedEntityId, selectedBookId);
        }
      }

      const relationPayload = Array.isArray(editingEntity.relations)
        ? editingEntity.relations
            .map((relation) => ({
              toEntityId: String(relation?.toEntityId || '').trim(),
              type: String(relation?.type || 'related_to').trim() || 'related_to',
              note: String(relation?.note || '').trim()
            }))
            .filter((relation) => relation.toEntityId)
        : [];

      const relationResult = await entityService.replaceRelations(savedEntityId, selectedWorldId, relationPayload);
      const savedRelations =
        relationResult?.success && Array.isArray(relationResult.data)
          ? relationResult.data.map((relation) => ({
              id: relation.id,
              toEntityId: relation.toEntityId,
              type: relation.type,
              note: relation.note || '',
              createdAt: relation.createdAt
            }))
          : [];

      if (editingEntity.captureId && savedEntityId) {
        try {
          await captureService.markCaptureAsConverted(editingEntity.captureId, savedEntityId);
        } catch {
          // 捕获记录转换失败不阻断设定保存
        }
      }

      const pendingImageAsset = normalizeImageAsset(editingEntity.pendingImageAsset);
      if (pendingImageAsset && savedEntityId) {
        const savedWorldId = String(savedEntity.worldId || selectedWorldId || editingEntity.worldId || '').trim();
        await persistImageAssetEvent({
          worldId: savedWorldId,
          entityId: savedEntityId,
          entityName: name,
          summary: editingEntity.summary,
          asset: pendingImageAsset
        });
      }

      await onDataChanged?.();

      let entityDetail = savedEntity;
      if (savedEntityId) {
        try {
          const detailResult = await entityService.getEntity(savedEntityId);
          if (detailResult?.success && detailResult?.data) {
            entityDetail = detailResult.data;
          }
        } catch {
          // 详情补拉失败时回退保存结果，不阻断主流程
        }
      }

      const persistedImageAssets = savedEntityId ? await fetchEntityImageAssets(savedEntityId) : [];
      const fallbackImageAsset = pendingImageAsset && !persistedImageAssets.length ? [pendingImageAsset] : [];
      const imageAssetsForEditor = persistedImageAssets.length > 0 ? persistedImageAssets : fallbackImageAsset;
      const imageUrlFromState = String(editingEntity.imageUrl || '').trim();
      const imageUrlFromAssets = String(imageAssetsForEditor[0]?.imageUrl || '').trim();

      setEditingEntity({
        ...entityDetail,
        tags: parseTags(entityDetail.tags).join(', '),
        relations: savedRelations,
        conflictHints: Array.isArray(editingEntity.conflictHints) ? editingEntity.conflictHints : [],
        imageUrl: imageUrlFromState || imageUrlFromAssets,
        imageAssets: imageAssetsForEditor,
        pendingImageAsset: null,
        usedInCurrentBook: Boolean(editingEntity.usedInCurrentBook),
        captureId: editingEntity.captureId || ''
      });

      onUiMessage?.('设定已保存', 'success');
    } catch (error) {
      console.error('[Sidepanel] handleSaveEntity error:', error);
      onUiMessage?.('保存失败，请稍后重试', 'error');
    } finally {
      setIsSavingEntity(false);
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
    editingEntity,
    setEditingEntity,
    isSavingEntity,
    isAiAssisting,
    isCheckingConflict,
    isGeneratingImage,
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
    handleGenerateEntityImage,
    handleApplyImageAsset,
    handleSubmitAiFeedback,
    handleCancelEdit,
    handleSaveEntity
  };
}
