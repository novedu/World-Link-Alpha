import { useState } from 'react';
import { parseTags } from '../utils/entityUtils';
import { formatRuntimeError, sendRuntimeMessage } from '../services/runtimeApi';

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

  const handleStartNewEntity = () => {
    if (!selectedWorldId) {
      onUiMessage?.('请先选择或创建一个世界', 'warning');
      return;
    }
    setActiveTab('entities');
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

  const handleCancelEdit = () => setEditingEntity(null);

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

  const handleAiAssist = async (mode) => {
    if (!editingEntity || isAiAssisting) return;
    const normalizedMode = mode === 'expand' ? 'expand' : 'summarize';
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
      worldId: selectedWorldId
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
    onUiMessage?.(normalizedMode === 'expand' ? 'AI 扩写已生成' : 'AI 总结已生成', 'success');
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
    setEditingEntity((prev) => ({
      ...(prev || {}),
      conflictHints: hints
    }));
    onUiMessage?.(hints.length > 0 ? `发现 ${hints.length} 条潜在冲突` : '未发现明显冲突', 'success');
  };

  return {
    editingEntity,
    setEditingEntity,
    isSavingEntity,
    isAiAssisting,
    isCheckingConflict,
    handleStartNewEntity,
    handleEditEntity,
    handleEntityFieldChange,
    handleToggleEditorTag,
    handleAiAssist,
    handleCheckConflict,
    handleCancelEdit,
    handleSaveEntity
  };
}
