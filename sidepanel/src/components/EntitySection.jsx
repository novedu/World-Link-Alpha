import { useMemo, useState } from 'react';
import { formatAiFallbackHint, formatAiProvider, formatAiQualityMeta } from '../utils/aiUtils';
import {
  AI_ASSIST_LENGTH_OPTIONS,
  AI_ASSIST_STYLE_OPTIONS,
  formatAssistProfile,
  normalizeAssistProfile
} from '../utils/assistUtils';
import { parseTags } from '../utils/entityUtils';
import {
  buildConflictSignalsText,
  formatConflictReason,
  getConflictResolutionSuggestion,
  getConflictRiskKey,
  getConflictRiskMeta
} from '../utils/conflictUtils';
import { aiService } from '../services/ai.service';
import EmptyStateCard from './EmptyStateCard';

const TYPE_OPTIONS = [
  { value: 'all', label: '全部类型' },
  { value: 'character', label: '人物' },
  { value: 'location', label: '地点' },
  { value: 'faction', label: '势力/组织' },
  { value: 'item', label: '物品/武器' },
  { value: 'mineral', label: '矿石/资源' },
  { value: 'creature', label: '生物/怪物' },
  { value: 'event', label: '事件' },
  { value: 'law', label: '规则/法则' },
  { value: 'other', label: '其他' }
];

const EDITOR_TYPE_OPTIONS = TYPE_OPTIONS.filter((item) => item.value !== 'all');

function EntitySection({
  selectedWorldId,
  selectedBookId,
  entitiesForView,
  editingEntity,
  entitySearchQuery,
  entityTypeFilter,
  entityTagFilter,
  tagOptions,
  baseTagOptions,
  entitiesInWorld,
  relationOptions,
  relationLabels,
  manuscriptText,
  manuscriptSuggestions,
  manuscriptRelationSuggestions,
  manuscriptParseMeta,
  isParsingManuscript,
  onSearchChange,
  onTypeFilterChange,
  onTagFilterChange,
  onClearEntityFilters,
  onStartNewEntity,
  onEditEntity,
  onChangeField,
  onToggleEditorTag,
  onAiAssist,
  onCheckConflict,
  onManuscriptTextChange,
  onParseManuscript,
  onApplyManuscriptSuggestion,
  onClearManuscriptSuggestions,
  onBatchApplyRelations,
  onSaveEntity,
  onCancelEdit,
  onExportJson,
  onExportMarkdown,
  isExportDisabled,
  isMarkdownExportDisabled,
  isJsonExportDisabled,
  jsonExportDisabledReason,
  isSavingEntity,
  isAiAssisting,
  isCheckingConflict,
  isSubmittingAiFeedback,
  aiAssistMeta,
  aiAssistProfile,
  onAiAssistProfileChange,
  conflictCheckMeta,
  onSubmitAiFeedback,
  isEntityUsedInCurrentBook,
  totalEntitiesInContext,
  onGoToCaptureTab,
  onClearBookSelection,
  onAddWorld
}) {
  const [tagInputState, setTagInputState] = useState({ editorId: '', value: '' });
  const [relationDraftState, setRelationDraftState] = useState({
    editorId: '',
    toEntityId: '',
    type: 'related_to',
    note: ''
  });
  const [conflictRiskFilter, setConflictRiskFilter] = useState('all');
  const editorTags = parseTags(editingEntity?.tags);
  const editorTagSet = useMemo(() => new Set(editorTags), [editorTags]);
  const tagSuggestionId = 'wl-editor-tag-suggestions';
  const currentEditorId = editingEntity?.id || '__new__';
  const tagInput = tagInputState.editorId === currentEditorId ? tagInputState.value : '';
  const relationDraft =
    relationDraftState.editorId === currentEditorId
      ? relationDraftState
      : { editorId: currentEditorId, toEntityId: '', type: 'related_to', note: '' };

  const updateTagInput = (value) => {
    setTagInputState({
      editorId: currentEditorId,
      value
    });
  };

  const clearTagInput = () => {
    setTagInputState({
      editorId: currentEditorId,
      value: ''
    });
  };

  const appendEditorTag = (rawTag) => {
    const nextTag = String(rawTag || '').trim();
    if (!nextTag || editorTagSet.has(nextTag)) return false;
    onToggleEditorTag(nextTag);
    return true;
  };

  const removeEditorTag = (tag) => {
    if (!editorTagSet.has(tag)) return;
    onToggleEditorTag(tag);
  };

  const handleAddTagsFromInput = () => {
    const nextTags = parseTags(tagInput);
    if (nextTags.length === 0) return;
    nextTags.forEach((tag) => appendEditorTag(tag));
    clearTagInput();
  };

  const handleTagInputKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      handleAddTagsFromInput();
    }
  };

  const suggestionTagOptions = tagOptions.filter((tag) => !editorTagSet.has(tag));
  const hasActiveEntityFilters = Boolean(entitySearchQuery || entityTagFilter || entityTypeFilter !== 'all');
  const safeRelationOptions = relationOptions?.length ? relationOptions : [{ value: 'related_to', label: '关联' }];
  const editorRelations = Array.isArray(editingEntity?.relations) ? editingEntity.relations : [];
  const conflictHints = Array.isArray(editingEntity?.conflictHints) ? editingEntity.conflictHints : [];
  const normalizedAssistProfile = normalizeAssistProfile(aiAssistProfile);
  const filteredConflictHints = [...conflictHints]
    .sort((a, b) => Number(b?.confidence || 0) - Number(a?.confidence || 0))
    .filter((hint) => conflictRiskFilter === 'all' || getConflictRiskKey(hint?.confidence) === conflictRiskFilter);
  const manuscriptRows = Array.isArray(manuscriptSuggestions) ? manuscriptSuggestions : [];
  const manuscriptRelationRows = Array.isArray(manuscriptRelationSuggestions) ? manuscriptRelationSuggestions : [];
  const hasManuscriptResults = manuscriptRows.length > 0 || manuscriptRelationRows.length > 0;
  const relationTargetOptions = (entitiesInWorld || []).filter((entity) => {
    const id = String(entity?.id || '');
    return id && id !== editingEntity?.id;
  });
  const relationTargetIdByName = useMemo(() => {
    const output = new Map();
    relationTargetOptions.forEach((entity) => {
      const key = String(entity?.name || '').trim();
      if (!key || output.has(key)) return;
      output.set(key, entity.id);
    });
    return output;
  }, [relationTargetOptions]);
  const relationTargetMap = new Map(relationTargetOptions.map((entity) => [entity.id, entity.name]));
  const canEditRelations = Boolean(editingEntity && editingEntity.id);
  const formatTime = (timestamp) => {
    const value = Number(timestamp || 0);
    if (!value) return '';
    return new Date(value).toLocaleTimeString('zh-CN', { hour12: false });
  };
  const manuscriptFallbackHint =
    manuscriptParseMeta?.provider === 'local-fallback' ? formatAiFallbackHint(manuscriptParseMeta, '云端书稿解析') : '';
  const aiAssistFallbackHint = aiAssistMeta?.provider === 'local-fallback' ? formatAiFallbackHint(aiAssistMeta, '云端文案') : '';
  const conflictFallbackHint =
    conflictCheckMeta?.provider === 'local-fallback' ? formatAiFallbackHint(conflictCheckMeta, '云端冲突检查') : '';
  const conflictSummaryMeta = conflictCheckMeta?.conflictMeta || null;
  const conflictCalibrationMeta = conflictCheckMeta?.calibration || null;
  const aiAssistQualityText = formatAiQualityMeta(aiAssistMeta);
  const aiAssistFeedbackDecision = String(aiAssistMeta?.feedbackDecision || '');
  const conflictFeedbackDecision = String(conflictCheckMeta?.feedbackDecision || '');
  const formatThresholdPercent = (value) => `${Math.round(Number(value || 0) * 100)}%`;

  const updateRelationDraft = (field, value) => {
    setRelationDraftState((prev) => ({
      editorId: currentEditorId,
      toEntityId: prev.editorId === currentEditorId ? prev.toEntityId : '',
      type: prev.editorId === currentEditorId ? prev.type : 'related_to',
      note: prev.editorId === currentEditorId ? prev.note : '',
      [field]: value
    }));
  };

  const handleAddRelation = () => {
    if (!editingEntity) return;
    const toEntityId = String(relationDraft.toEntityId || '').trim();
    if (!toEntityId || toEntityId === editingEntity.id) return;
    const type = String(relationDraft.type || 'related_to').trim() || 'related_to';
    const note = String(relationDraft.note || '').trim();
    const existed = editorRelations.some((relation) => relation.toEntityId === toEntityId && relation.type === type);
    if (existed) return;
    onChangeField('relations', [...editorRelations, { id: '', toEntityId, type, note }]);
    setRelationDraftState({
      editorId: currentEditorId,
      toEntityId: '',
      type: 'related_to',
      note: ''
    });
  };

  const handleRemoveRelation = (index) => {
    if (!editingEntity) return;
    const next = editorRelations.filter((_, itemIndex) => itemIndex !== index);
    onChangeField('relations', next);
  };

  const normalizeRelationType = (value) => {
    const relationType = String(value || '').trim();
    return safeRelationOptions.some((item) => item.value === relationType) ? relationType : 'related_to';
  };

  const buildInferredRelationNote = (suggestion) => {
    const evidence = String(suggestion?.evidence || '').trim();
    const hitCount = Number(suggestion?.count || 0);
    const evidencePart = evidence ? `书稿推断：${evidence.slice(0, 60)}${evidence.length > 60 ? '…' : ''}` : '';
    const countPart = hitCount > 1 ? `命中 ${hitCount} 处` : '';
    return [evidencePart, countPart].filter(Boolean).join('；').slice(0, 120);
  };

  const getRelationSuggestionApplyState = (suggestion) => {
    if (!canEditRelations) {
      return { canApply: false, reason: '请先保存设定后再应用关系推断' };
    }

    const editorName = String(editingEntity?.name || '').trim();
    if (!editorName) {
      return { canApply: false, reason: '请先填写当前设定名称' };
    }

    const fromName = String(suggestion?.fromName || '').trim();
    const toName = String(suggestion?.toName || '').trim();
    if (!fromName || !toName) {
      return { canApply: false, reason: '关系推断结果缺少名称，暂不可用' };
    }

    if (fromName !== editorName) {
      return { canApply: false, reason: `请切换到设定「${fromName}」后再应用` };
    }

    const targetId = relationTargetIdByName.get(toName);
    if (!targetId) {
      return { canApply: false, reason: `未找到目标设定「${toName}」` };
    }

    const relationType = normalizeRelationType(suggestion?.type);
    const existed = editorRelations.some((relation) => relation.toEntityId === targetId && relation.type === relationType);
    if (existed) {
      return { canApply: false, reason: '该关系已存在，无需重复添加' };
    }

    return {
      canApply: true,
      targetId,
      relationType
    };
  };

  const handleApplyRelationSuggestion = (suggestion, mode = 'append') => {
    if (!editingEntity) return;
    const applyState = getRelationSuggestionApplyState(suggestion);
    if (!applyState.canApply) return;
    const relationType = applyState.relationType || 'related_to';
    const targetId = applyState.targetId;
    const note = buildInferredRelationNote(suggestion);

    if (mode === 'draft') {
      setRelationDraftState({
        editorId: currentEditorId,
        toEntityId: targetId,
        type: relationType,
        note
      });
      return;
    }

    onChangeField('relations', [...editorRelations, { id: '', toEntityId: targetId, type: relationType, note }]);
  };

  const handleGenerateImage = async () => {
    if (!editingEntity || !editingEntity.name) return;

    try {
      const entityTypeMap = {
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

      const entityType = entityTypeMap[editingEntity.type] || 'character';
      const prompt = `A detailed ${entityType} named ${editingEntity.name}. ${editingEntity.summary || ''}`;

      const response = await aiService.generateImage({
        prompt: prompt,
        entityType: entityType,
        style: 'realistic'
      });

      if (response.success && response.data) {
        onChangeField('imageUrl', response.data.imageUrl);
        alert('图片生成成功！');
      }
    } catch (error) {
      console.error('Error generating image:', error);
      alert('图片生成失败，请重试。');
    }
  };

  return (
    <div className="section-body">
      <div className="toolbar-wrap toolbar-row-between">
        <button type="button" onClick={onStartNewEntity} className="btn-primary">
          + 新建设定
        </button>
        <div className="toolbar-wrap toolbar-inline-actions">
          <button
            type="button"
            onClick={onExportJson}
            className="btn-secondary"
            disabled={Boolean(isExportDisabled || isJsonExportDisabled)}
            title={jsonExportDisabledReason || ''}
          >
            导出 JSON
          </button>
          <button
            type="button"
            onClick={onExportMarkdown}
            className="btn-secondary"
            disabled={Boolean(isExportDisabled || isMarkdownExportDisabled)}
          >
            导出 Markdown
          </button>
        </div>
      </div>
      {jsonExportDisabledReason ? <p className="helper-text">{jsonExportDisabledReason}</p> : null}

      {selectedWorldId ? (
        <>
          <div className="toolbar-wrap">
            <input
              type="text"
              value={entitySearchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="搜索名称或描述"
              className="field-input toolbar-search"
            />
            <select
              className="field-input toolbar-select"
              value={entityTypeFilter}
              onChange={(event) => onTypeFilterChange(event.target.value)}
            >
              {TYPE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <select
              className="field-input toolbar-select"
              value={entityTagFilter}
              onChange={(event) => onTagFilterChange(event.target.value)}
            >
              <option value="">全部标签</option>
              {tagOptions.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
            {(entitySearchQuery || entityTagFilter || entityTypeFilter !== 'all') && (
              <button
                type="button"
                onClick={onClearEntityFilters}
                className="btn-secondary"
              >
                清空筛选
              </button>
            )}
          </div>

          <div className="tag-filter-row">
            {baseTagOptions.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`tag-chip ${entityTagFilter === tag ? 'tag-chip-active' : ''}`}
                onClick={() => onTagFilterChange(entityTagFilter === tag ? '' : tag)}
              >
                {tag}
              </button>
            ))}
          </div>

          <div className="manuscript-panel">
            <div className="field-header">
              <label className="field-label">书稿自动解析（v0）</label>
              <div className="toolbar-wrap toolbar-inline-actions">
                <button
                  type="button"
                  className="btn-inline btn-inline-secondary"
                  onClick={onParseManuscript}
                  disabled={isParsingManuscript}
                >
                  {isParsingManuscript ? '解析中...' : '解析书稿'}
                </button>
                {manuscriptRelationSuggestions.length > 0 ? (
                  <button type="button" className="btn-inline btn-inline-secondary" onClick={onBatchApplyRelations}>
                    批量应用关系
                  </button>
                ) : null}
                {hasManuscriptResults ? (
                  <button type="button" className="btn-inline btn-inline-secondary" onClick={onClearManuscriptSuggestions}>
                    清空结果
                  </button>
                ) : null}
              </div>
            </div>
            <textarea
              className="field-input w-full manuscript-input"
              value={String(manuscriptText || '')}
              onChange={(event) => onManuscriptTextChange?.(event.target.value)}
              placeholder="粘贴章节或书稿片段，自动提取候选设定（人物/地点/势力等）"
            />
            {manuscriptRows.length > 0 ? (
              <div className="manuscript-suggestion-list">
                {manuscriptRows.map((item, index) => (
                  <div key={`${item.name}-${index}`} className="manuscript-suggestion-item">
                    <div className="manuscript-suggestion-main">
                      <span className="manuscript-suggestion-name">{item.name}</span>
                      <span className="tag tag-primary">{item.type || 'other'}</span>
                      <span className="manuscript-suggestion-meta">
                        频次 {item.frequency || 0} · 置信 {Math.round(Number(item.confidence || 0) * 100)}%
                      </span>
                    </div>
                    {item.summary ? <p className="manuscript-suggestion-summary">{item.summary}</p> : null}
                    <div className="manuscript-suggestion-actions">
                      <button
                        type="button"
                        className="btn-inline btn-inline-primary"
                        onClick={() => onApplyManuscriptSuggestion?.(item)}
                      >
                        填充到设定编辑
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            {manuscriptParseMeta ? (
              <p className="helper-text ai-meta-row">
                最近解析：{formatAiProvider(manuscriptParseMeta.provider, manuscriptParseMeta.model)} · {formatTime(manuscriptParseMeta.updatedAt)}
              </p>
            ) : null}
            {manuscriptFallbackHint ? <p className="helper-text ai-fallback-reason">{manuscriptFallbackHint}</p> : null}
            {manuscriptRelationRows.length > 0 ? (
              <div className="manuscript-relation-list">
                {manuscriptRelationRows.map((item, index) => {
                  const applyState = getRelationSuggestionApplyState(item);
                  const relationType = normalizeRelationType(item.type);
                  return (
                    <div key={`${item.fromName}-${item.toName}-${relationType}-${index}`} className="manuscript-relation-item">
                      <div className="manuscript-relation-main">
                        <span className="manuscript-relation-node">{item.fromName || '未知设定'}</span>
                        <span className="tag tag-primary">{relationLabels[relationType] || relationType}</span>
                        <span className="manuscript-relation-node">{item.toName || '未知设定'}</span>
                        <span className="manuscript-suggestion-meta">
                          命中 {Number(item.count || 1)} · 置信 {Math.round(Number(item.confidence || 0) * 100)}%
                        </span>
                      </div>
                      {item.evidence ? <p className="manuscript-relation-evidence">证据：{item.evidence}</p> : null}
                      <div className="manuscript-suggestion-actions">
                        <button
                          type="button"
                          className="btn-inline btn-inline-primary"
                          onClick={() => handleApplyRelationSuggestion(item, 'append')}
                          disabled={!applyState.canApply}
                          title={!applyState.canApply ? applyState.reason : ''}
                        >
                          一键添加关系
                        </button>
                        <button
                          type="button"
                          className="btn-inline btn-inline-secondary"
                          onClick={() => handleApplyRelationSuggestion(item, 'draft')}
                          disabled={!applyState.canApply}
                          title={!applyState.canApply ? applyState.reason : ''}
                        >
                          填充关系草稿
                        </button>
                        {!applyState.canApply ? <span className="helper-text">{applyState.reason}</span> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </>
      ) : (
        <EmptyStateCard
          icon="世"
          title="还没有可用世界"
          description="先创建世界观库，再管理设定与作品。"
          actions={[
            { label: '+ 新建世界观', onClick: onAddWorld, variant: 'primary' },
            { label: '先去灵感箱', onClick: onGoToCaptureTab }
          ]}
        />
      )}

      {selectedWorldId ? (
        <div className="entity-layout">
          <div className="entity-list">
            {entitiesForView.length === 0 ? (
              <EmptyStateCard
                icon={hasActiveEntityFilters ? '筛' : selectedBookId ? '书' : '设'}
                title={
                  hasActiveEntityFilters && totalEntitiesInContext > 0
                    ? '当前筛选无结果'
                    : selectedBookId
                      ? '当前作品还没有绑定设定'
                      : '当前世界还没有设定'
                }
                description={
                  hasActiveEntityFilters && totalEntitiesInContext > 0
                    ? '清空筛选后可查看该范围已存在的设定。'
                    : selectedBookId
                      ? '可以先新建设定并勾选“用于当前作品”，或去灵感箱快速整理。'
                      : '先收集灵感再整理，或直接手动新建设定开始。'
                }
                actions={
                  hasActiveEntityFilters && totalEntitiesInContext > 0
                    ? [{ label: '清空筛选', onClick: onClearEntityFilters }]
                    : selectedBookId
                      ? [
                          { label: '+ 新建设定', onClick: onStartNewEntity, variant: 'primary' },
                          { label: '查看世界全部设定', onClick: onClearBookSelection },
                          { label: '去灵感箱整理', onClick: onGoToCaptureTab }
                        ]
                      : [
                          { label: '+ 新建设定', onClick: onStartNewEntity, variant: 'primary' },
                          { label: '去灵感箱整理', onClick: onGoToCaptureTab }
                        ]
                }
              />
            ) : null}

            {entitiesForView.map((entity) => {
              const isActive = Boolean(editingEntity && editingEntity.id === entity.id);
              const tags = parseTags(entity.tags).slice(0, 3);
              return (
                <button
                  key={entity.id}
                  type="button"
                  onClick={() => onEditEntity(entity)}
                  className={`entity-card ${isActive ? 'entity-card-active' : ''}`}
                >
                  <div className="entity-card-header">
                    <span className="entity-card-title">{entity.name}</span>
                    <div className="entity-card-tags">
                      {selectedBookId && isEntityUsedInCurrentBook && isEntityUsedInCurrentBook(entity.id) ? (
                        <span className="tag tag-success">当前作品使用</span>
                      ) : null}
                      <span className="tag tag-primary">{entity.type || 'other'}</span>
                    </div>
                  </div>

                  {tags.length > 0 ? (
                    <div className="entity-card-tags mt-2">
                      {tags.map((tag) => (
                        <span key={tag} className="tag tag-primary">
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {entity.summary ? <p className="entity-card-summary">{entity.summary}</p> : null}
                </button>
              );
            })}
          </div>

          {editingEntity ? (
            <div className="editor-panel">
              <h3 className="editor-title">设定编辑</h3>
              <div className="form-stack">
                <div className="field-stack">
                  <label className="field-label">名称</label>
                  <input
                    className="field-input w-full"
                    value={editingEntity.name}
                    onChange={(event) => onChangeField('name', event.target.value)}
                  />
                </div>

                <div className="field-stack">
                  <label className="field-label">类型</label>
                  <select
                    className="field-input w-full"
                    value={editingEntity.type}
                    onChange={(event) => onChangeField('type', event.target.value)}
                  >
                    {EDITOR_TYPE_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field-stack">
                  <label className="field-label">简要描述</label>
                  <textarea
                    className="field-input w-full min-h-[96px]"
                    value={editingEntity.summary}
                    onChange={(event) => onChangeField('summary', event.target.value)}
                  />
                  {editingEntity.imageUrl && (
                    <div className="entity-image-preview">
                      <img 
                        src={editingEntity.imageUrl} 
                        alt={editingEntity.name} 
                        className="entity-image"
                      />
                    </div>
                  )}
                  <div className="editor-ai-actions">
                    <select
                      className="field-input editor-ai-select"
                      value={normalizedAssistProfile.style}
                      onChange={(event) =>
                        onAiAssistProfileChange?.({
                          ...normalizedAssistProfile,
                          style: event.target.value
                        })
                      }
                      title="文案风格"
                    >
                      {AI_ASSIST_STYLE_OPTIONS.map((item) => (
                        <option key={item.value} value={item.value}>
                          风格：{item.label}
                        </option>
                      ))}
                    </select>
                    <select
                      className="field-input editor-ai-select"
                      value={normalizedAssistProfile.targetLength}
                      onChange={(event) =>
                        onAiAssistProfileChange?.({
                          ...normalizedAssistProfile,
                          targetLength: event.target.value
                        })
                      }
                      title="输出长度"
                    >
                      {AI_ASSIST_LENGTH_OPTIONS.map((item) => (
                        <option key={item.value} value={item.value}>
                          长度：{item.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn-inline btn-inline-secondary"
                      onClick={() => onAiAssist?.('summarize', normalizedAssistProfile)}
                      disabled={isAiAssisting}
                    >
                      {isAiAssisting ? '处理中...' : 'AI 总结'}
                    </button>
                    <button
                      type="button"
                      className="btn-inline btn-inline-secondary"
                      onClick={() => onAiAssist?.('expand', normalizedAssistProfile)}
                      disabled={isAiAssisting}
                    >
                      {isAiAssisting ? '处理中...' : 'AI 扩写'}
                    </button>
                    <button
                      type="button"
                      className="btn-inline btn-inline-secondary"
                      onClick={() => onCheckConflict?.()}
                      disabled={isCheckingConflict}
                    >
                      {isCheckingConflict ? '检测中...' : 'AI 冲突检查'}
                    </button>
                    <button
                      type="button"
                      className="btn-inline btn-inline-secondary"
                      onClick={() => handleGenerateImage()}
                      disabled={isAiAssisting}
                    >
                      {isAiAssisting ? '生成中...' : 'AI 生成图片'}
                    </button>
                  </div>
                  {conflictHints.length > 0 ? (
                    <>
                      <div className="conflict-hint-toolbar">
                        <p className="helper-text">
                          冲突结果 {filteredConflictHints.length}/{conflictHints.length}
                        </p>
                        <select
                          className="field-input conflict-filter-select"
                          value={conflictRiskFilter}
                          onChange={(event) => setConflictRiskFilter(event.target.value)}
                        >
                          <option value="all">全部风险</option>
                          <option value="high">高风险</option>
                          <option value="medium">中风险</option>
                          <option value="low">低风险</option>
                        </select>
                      </div>
                      {conflictSummaryMeta ? (
                        <>
                          <div className="conflict-risk-summary">
                            <span className="tag tag-warning">高风险 {conflictSummaryMeta.high || 0}</span>
                            <span className="tag tag-primary">中风险 {conflictSummaryMeta.medium || 0}</span>
                            <span className="tag tag-secondary">低风险 {conflictSummaryMeta.low || 0}</span>
                            {conflictCheckMeta?.strategyVersion ? (
                              <span className="helper-text">策略 {conflictCheckMeta.strategyVersion}</span>
                            ) : null}
                          </div>
                          {conflictCalibrationMeta ? (
                            <p className="helper-text conflict-calibration-text">
                              阈值：名称≥{formatThresholdPercent(conflictCalibrationMeta.similarity?.name)} · 描述≥
                              {formatThresholdPercent(conflictCalibrationMeta.similarity?.summary)} · 高风险≥
                              {formatThresholdPercent(conflictCalibrationMeta.risk?.high)} · 中风险≥
                              {formatThresholdPercent(conflictCalibrationMeta.risk?.medium)} · Top{' '}
                              {Number(conflictCalibrationMeta.rowLimit || 0)}
                            </p>
                          ) : null}
                        </>
                      ) : null}
                      {filteredConflictHints.length > 0 ? (
                        <div className="conflict-hint-list">
                          {filteredConflictHints.map((hint) => {
                            const signalsText = buildConflictSignalsText(hint);
                            const riskMeta = getConflictRiskMeta(hint?.confidence);
                            const reasonLabel = formatConflictReason(hint);
                            const suggestionText = getConflictResolutionSuggestion(hint);
                            return (
                              <div key={`${hint.entityId}-${reasonLabel}`} className="conflict-hint-block">
                                <div className="conflict-hint-item">
                                  <div className="conflict-hint-main">
                                    <span className={`tag ${riskMeta.tagClassName}`}>{riskMeta.label}</span>
                                    <span className="conflict-hint-name">{hint.name}</span>
                                    <span className="conflict-hint-meta">{reasonLabel}</span>
                                  </div>
                                  <span className="conflict-hint-score">{Math.round(Number(hint.confidence || 0) * 100)}%</span>
                                </div>
                                <p className="conflict-hint-suggestion">建议：{suggestionText}</p>
                                {signalsText ? <p className="conflict-hint-signals">{signalsText}</p> : null}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <EmptyStateCard
                          compact
                          icon="筛"
                          title="当前筛选下没有冲突结果"
                          description="可切换风险筛选查看其他等级结果。"
                          actions={conflictRiskFilter !== 'all' ? [{ label: '查看全部风险', onClick: () => setConflictRiskFilter('all') }] : []}
                        />
                      )}
                    </>
                  ) : null}
                {aiAssistMeta ? (
                  <p className="helper-text ai-meta-row">
                    最近 AI 文案：{aiAssistMeta.mode === 'expand' ? '扩写' : '总结'} · {formatAiProvider(aiAssistMeta.provider, aiAssistMeta.model)} ·{' '}
                    策略 {formatAssistProfile(aiAssistMeta.assistProfile)}
                    {aiAssistQualityText ? ` · ${aiAssistQualityText}` : ''}
                    {aiAssistMeta.strategyVersion ? ` · 模型策略 ${aiAssistMeta.strategyVersion}` : ''} · {formatTime(aiAssistMeta.updatedAt)}
                  </p>
                ) : null}
                {aiAssistMeta ? (
                  <div className="ai-feedback-row">
                    <button
                      type="button"
                      className={`btn-inline ${aiAssistFeedbackDecision === 'positive' ? 'btn-inline-primary' : 'btn-inline-secondary'}`}
                      disabled={isSubmittingAiFeedback}
                      onClick={() => onSubmitAiFeedback?.('assist', 'positive')}
                    >
                      {aiAssistFeedbackDecision === 'positive' ? '✓ 结果有帮助' : '结果有帮助'}
                    </button>
                    <button
                      type="button"
                      className={`btn-inline ${aiAssistFeedbackDecision === 'negative' ? 'btn-inline-primary' : 'btn-inline-secondary'}`}
                      disabled={isSubmittingAiFeedback}
                      onClick={() => onSubmitAiFeedback?.('assist', 'negative')}
                    >
                      {aiAssistFeedbackDecision === 'negative' ? '✓ 需优化' : '需优化'}
                    </button>
                  </div>
                ) : null}
                {aiAssistFallbackHint ? <p className="helper-text ai-fallback-reason">{aiAssistFallbackHint}</p> : null}
                {conflictCheckMeta ? (
                  <p className="helper-text ai-meta-row">
                    最近冲突检查：{conflictCheckMeta.count || 0} 条 · {formatAiProvider(conflictCheckMeta.provider, conflictCheckMeta.model)} ·{' '}
                    {formatTime(conflictCheckMeta.updatedAt)}
                  </p>
                ) : null}
                {conflictCheckMeta ? (
                  <div className="ai-feedback-row">
                    <button
                      type="button"
                      className={`btn-inline ${conflictFeedbackDecision === 'positive' ? 'btn-inline-primary' : 'btn-inline-secondary'}`}
                      disabled={isSubmittingAiFeedback}
                      onClick={() => onSubmitAiFeedback?.('conflict', 'positive')}
                    >
                      {conflictFeedbackDecision === 'positive' ? '✓ 检测准确' : '检测准确'}
                    </button>
                    <button
                      type="button"
                      className={`btn-inline ${conflictFeedbackDecision === 'negative' ? 'btn-inline-primary' : 'btn-inline-secondary'}`}
                      disabled={isSubmittingAiFeedback}
                      onClick={() => onSubmitAiFeedback?.('conflict', 'negative')}
                    >
                      {conflictFeedbackDecision === 'negative' ? '✓ 需校准' : '需校准'}
                    </button>
                  </div>
                ) : null}
                {conflictFallbackHint ? <p className="helper-text ai-fallback-reason">{conflictFallbackHint}</p> : null}
              </div>

                <div className="field-stack">
                  <label className="field-label">标签</label>
                  {editorTags.length > 0 ? (
                    <div className="editor-tag-list">
                      {editorTags.map((tag) => (
                        <span key={tag} className="editor-tag-pill">
                          <span className="editor-tag-text">{tag}</span>
                          <button
                            type="button"
                            className="editor-tag-remove"
                            onClick={() => removeEditorTag(tag)}
                            aria-label={`移除标签 ${tag}`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="helper-text">暂无标签，可通过下方输入框或常用标签添加。</p>
                  )}

                  <div className="editor-tag-input-row">
                    <input
                      className="field-input editor-tag-input"
                      value={tagInput}
                      onChange={(event) => updateTagInput(event.target.value)}
                      onKeyDown={handleTagInputKeyDown}
                      placeholder="输入标签，按 Enter 添加"
                      list={tagSuggestionId}
                    />
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleAddTagsFromInput}
                      disabled={!tagInput.trim()}
                    >
                      添加
                    </button>
                  </div>

                  <datalist id={tagSuggestionId}>
                    {suggestionTagOptions.map((tag) => (
                      <option key={tag} value={tag} />
                    ))}
                  </datalist>

                  <div className="tag-filter-row">
                    {baseTagOptions.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className={`tag-chip ${editorTagSet.has(tag) ? 'tag-chip-active' : ''}`}
                        onClick={() => (editorTagSet.has(tag) ? removeEditorTag(tag) : appendEditorTag(tag))}
                      >
                        {editorTagSet.has(tag) ? `✓ ${tag}` : `+ ${tag}`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="field-stack">
                  <label className="field-label">设定关系</label>
                  {!canEditRelations ? (
                    <p className="helper-text">先保存设定，再配置关系。</p>
                  ) : (
                    <>
                      <div className="relation-editor-grid">
                        <select
                          className="field-input w-full"
                          value={relationDraft.type}
                          onChange={(event) => updateRelationDraft('type', event.target.value)}
                        >
                          {safeRelationOptions.map((item) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                        <select
                          className="field-input w-full"
                          value={relationDraft.toEntityId}
                          onChange={(event) => updateRelationDraft('toEntityId', event.target.value)}
                        >
                          <option value="">选择关联设定</option>
                          {relationTargetOptions.map((entity) => (
                            <option key={entity.id} value={entity.id}>
                              {entity.name}
                            </option>
                          ))}
                        </select>
                        <input
                          className="field-input w-full"
                          value={relationDraft.note}
                          onChange={(event) => updateRelationDraft('note', event.target.value)}
                          placeholder="备注（可选）"
                        />
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={handleAddRelation}
                          disabled={!relationDraft.toEntityId}
                        >
                          添加关系
                        </button>
                      </div>

                      {editorRelations.length > 0 ? (
                        <div className="relation-list">
                          {editorRelations.map((relation, index) => (
                            <div key={`${relation.toEntityId}-${relation.type}-${index}`} className="relation-item">
                              <div className="relation-main">
                                <span className="tag tag-primary">{relationLabels[relation.type] || relation.type}</span>
                                <span className="relation-target">{relationTargetMap.get(relation.toEntityId) || '未知设定'}</span>
                                {relation.note ? <span className="relation-note">{relation.note}</span> : null}
                              </div>
                              <button
                                type="button"
                                className="btn-inline btn-inline-secondary"
                                onClick={() => handleRemoveRelation(index)}
                              >
                                移除
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="helper-text">暂无关系，可用于后续图谱与冲突分析。</p>
                      )}
                    </>
                  )}
                </div>

                {selectedBookId ? (
                  <div className="checkbox-row">
                    <input
                      id="usedInCurrentBook"
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 bg-white"
                      checked={Boolean(editingEntity.usedInCurrentBook)}
                      onChange={(event) => onChangeField('usedInCurrentBook', event.target.checked)}
                    />
                    <label htmlFor="usedInCurrentBook" className="checkbox-label">
                      用于当前作品
                    </label>
                  </div>
                ) : null}

                {editingEntity.sourceUrl || editingEntity.sourceTitle ? (
                  <div className="field-stack">
                    <label className="field-label">来源</label>
                    <a
                      href={editingEntity.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="source-link"
                    >
                      {editingEntity.sourceTitle || editingEntity.sourceUrl}
                    </a>
                  </div>
                ) : null}

                <div className="toolbar-wrap justify-end pt-2">
                  <button type="button" onClick={onCancelEdit} className="btn-secondary">
                    取消
                  </button>
                  <button type="button" onClick={onSaveEntity} className="btn-primary" disabled={isSavingEntity}>
                    {isSavingEntity ? '保存中...' : '保存'}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default EntitySection;
