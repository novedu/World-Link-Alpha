import { useEffect, useMemo, useState } from 'react';
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
  onSearchChange,
  onTypeFilterChange,
  onTagFilterChange,
  onClearSearch,
  onClearTypeFilter,
  onClearTagFilter,
  onStartNewEntity,
  onEditEntity,
  onChangeField,
  onToggleEditorTag,
  onSaveEntity,
  onCancelEdit,
  onExportJson,
  onExportMarkdown,
  isExportDisabled,
  isMarkdownExportDisabled,
  isJsonExportDisabled,
  jsonExportDisabledReason,
  isSavingEntity,
  isEntityUsedInCurrentBook
}) {
  const [tagInput, setTagInput] = useState('');
  const editorTags = parseTags(editingEntity?.tags);
  const editorTagSet = useMemo(() => new Set(editorTags), [editorTags]);
  const tagSuggestionId = 'wl-editor-tag-suggestions';

  useEffect(() => {
    setTagInput('');
  }, [editingEntity?.id]);

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
    setTagInput('');
  };

  const handleTagInputKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      handleAddTagsFromInput();
    }
  };

  const suggestionTagOptions = tagOptions.filter((tag) => !editorTagSet.has(tag));

  return (
    <div className="section-body">
      <div className="toolbar-wrap toolbar-row-between">
        <button type="button" onClick={onStartNewEntity} className="btn-primary">
          + 新建实体
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
                onClick={() => {
                  onClearSearch();
                  onClearTypeFilter();
                  onClearTagFilter();
                }}
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
        </>
      ) : (
        <p className="helper-text">请先在上方选择或创建一个世界，然后才能创建实体。</p>
      )}

      {selectedWorldId ? (
        <div className="entity-layout">
          <div className="entity-list">
            {entitiesForView.length === 0 ? (
              <div className="empty-state">
                <p className="text-sm text-center">
                  {selectedBookId
                    ? '当前世界中尚未为本书标记任何实体，可在实体编辑中开启“用于当前书项目”。'
                    : '当前世界还没有任何实体，可切到捕获页整理素材后创建。'}
                </p>
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
                  style={{
                    borderColor: isActive ? 'var(--primary)' : 'var(--border-default)',
                    backgroundColor: isActive ? 'var(--primary-soft)' : 'var(--bg-card)'
                  }}
                >
                  <div className="entity-card-header">
                    <span className="entity-card-title">{entity.name}</span>
                    <div className="entity-card-tags">
                      {selectedBookId && isEntityUsedInCurrentBook && isEntityUsedInCurrentBook(entity.id) ? (
                        <span className="tag tag-success">本书使用</span>
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
              <h3 className="editor-title">实体编辑</h3>
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
                      onChange={(event) => setTagInput(event.target.value)}
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

                {selectedBookId ? (
                  <div className="checkbox-row">
                    <input
                      id="usedInCurrentBook"
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 bg-white"
                      checked={Boolean(editingEntity.usedInCurrentBook)}
                      onChange={(event) => onChangeField('usedInCurrentBook', event.target.checked)}
                    />
                    <label htmlFor="usedInCurrentBook" className="text-sm" style={{ color: 'var(--text-primary)' }}>
                      用于当前书项目
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
                      style={{ color: 'var(--primary)' }}
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
