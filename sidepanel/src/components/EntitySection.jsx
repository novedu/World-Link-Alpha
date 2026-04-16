import { useMemo, useState } from 'react';
import { parseTags } from '../utils/entityUtils';

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
  const manuscriptRows = Array.isArray(manuscriptSuggestions) ? manuscriptSuggestions : [];
  const relationTargetOptions = (entitiesInWorld || []).filter((entity) => {
    const id = String(entity?.id || '');
    return id && id !== editingEntity?.id;
  });
  const relationTargetMap = new Map(relationTargetOptions.map((entity) => [entity.id, entity.name]));
  const canEditRelations = Boolean(editingEntity && editingEntity.id);

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
                {manuscriptRows.length > 0 ? (
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
          </div>
        </>
      ) : (
        <div className="empty-state">
          <p className="empty-state-title">还没有可用世界</p>
          <p className="empty-state-desc">先创建世界观库，再管理设定与作品。</p>
          <div className="empty-state-actions">
            <button type="button" className="btn-primary btn-mini" onClick={onAddWorld}>
              + 新建世界观
            </button>
            <button type="button" className="btn-secondary btn-mini" onClick={onGoToCaptureTab}>
              先去灵感箱
            </button>
          </div>
        </div>
      )}

      {selectedWorldId ? (
        <div className="entity-layout">
          <div className="entity-list">
            {entitiesForView.length === 0 ? (
              <div className="empty-state">
                {hasActiveEntityFilters && totalEntitiesInContext > 0 ? (
                  <>
                    <p className="empty-state-title">当前筛选无结果</p>
                    <p className="empty-state-desc">清空筛选后可查看该范围已存在的设定。</p>
                    <div className="empty-state-actions">
                      <button type="button" className="btn-secondary btn-mini" onClick={onClearEntityFilters}>
                        清空筛选
                      </button>
                    </div>
                  </>
                ) : selectedBookId ? (
                  <>
                    <p className="empty-state-title">当前作品还没有绑定设定</p>
                    <p className="empty-state-desc">可以先新建设定并勾选“用于当前作品”，或去灵感箱快速整理。</p>
                    <div className="empty-state-actions">
                      <button type="button" className="btn-primary btn-mini" onClick={onStartNewEntity}>
                        + 新建设定
                      </button>
                      <button type="button" className="btn-secondary btn-mini" onClick={onClearBookSelection}>
                        查看世界全部设定
                      </button>
                      <button type="button" className="btn-secondary btn-mini" onClick={onGoToCaptureTab}>
                        去灵感箱整理
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="empty-state-title">当前世界还没有设定</p>
                    <p className="empty-state-desc">先收集灵感再整理，或直接手动新建设定开始。</p>
                    <div className="empty-state-actions">
                      <button type="button" className="btn-primary btn-mini" onClick={onStartNewEntity}>
                        + 新建设定
                      </button>
                      <button type="button" className="btn-secondary btn-mini" onClick={onGoToCaptureTab}>
                        去灵感箱整理
                      </button>
                    </div>
                  </>
                )}
              </div>
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
                  <div className="editor-ai-actions">
                    <button
                      type="button"
                      className="btn-inline btn-inline-secondary"
                      onClick={() => onAiAssist?.('summarize')}
                      disabled={isAiAssisting}
                    >
                      {isAiAssisting ? '处理中...' : 'AI 总结'}
                    </button>
                    <button
                      type="button"
                      className="btn-inline btn-inline-secondary"
                      onClick={() => onAiAssist?.('expand')}
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
                  </div>
                  {conflictHints.length > 0 ? (
                    <div className="conflict-hint-list">
                      {conflictHints.map((hint) => (
                        <div key={`${hint.entityId}-${hint.reason}`} className="conflict-hint-item">
                          <div className="conflict-hint-main">
                            <span className="tag tag-warning">冲突提醒</span>
                            <span className="conflict-hint-name">{hint.name}</span>
                            <span className="conflict-hint-meta">{hint.reason}</span>
                          </div>
                          <span className="conflict-hint-score">{Math.round(Number(hint.confidence || 0) * 100)}%</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
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
