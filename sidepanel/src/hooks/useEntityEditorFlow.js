import { parseTags } from '../utils/entityUtils';
import { entityService } from '../services/entity.service.ts';
import { captureService } from '../services/capture.service.ts';
import { useEntityEditorState } from './useEntityEditorState';
import { useEntityEditorImageFlow } from './useEntityEditorImageFlow';
import { useEntityEditorAiFlow } from './useEntityEditorAiFlow';

function normalizeImageAsset(item) {
  const imageUrl = String(item?.imageUrl || '').trim();
  if (!imageUrl) return null;
  return {
    id: String(item?.id || '').trim() || `image-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    imageUrl,
    prompt: String(item?.prompt || '').trim(),
    style: String(item?.style || 'realistic').trim() || 'realistic',
    entityType: String(item?.entityType || 'character').trim() || 'character',
    generatedAt: new Date().toISOString()
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
  const state = useEntityEditorState();

  const {
    editingEntity,
    setEditingEntity,
    isSavingEntity,
    setIsSavingEntity,
    isGeneratingImage,
    setIsGeneratingImage,
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
    setAiAssistProfile
  } = state;

  const imageFlow = useEntityEditorImageFlow({
    editingEntity,
    setEditingEntity,
    selectedWorldId,
    isGeneratingImage,
    setIsGeneratingImage,
    onUiMessage
  });

  const aiFlow = useEntityEditorAiFlow({
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
  });

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
    const imageAssets = await imageFlow.fetchEntityImageAssets(entityId);
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
        await imageFlow.persistImageAssetEvent({
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

      const persistedImageAssets = savedEntityId ? await imageFlow.fetchEntityImageAssets(savedEntityId) : [];
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
    handleAiAssist: aiFlow.handleAiAssist,
    handleCheckConflict: aiFlow.handleCheckConflict,
    handleGenerateEntityImage: imageFlow.handleGenerateEntityImage,
    handleApplyImageAsset: imageFlow.handleApplyImageAsset,
    handleSubmitAiFeedback: aiFlow.handleSubmitAiFeedback,
    handleCancelEdit,
    handleSaveEntity
  };
}