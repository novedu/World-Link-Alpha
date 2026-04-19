import EmptyStateCard from '../EmptyStateCard';

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

export function EntityToolbar({
  onStartNewEntity,
  onExportJson,
  onExportMarkdown,
  isExportDisabled,
  isMarkdownExportDisabled,
  isJsonExportDisabled,
  jsonExportDisabledReason
}) {
  return (
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
  );
}

export function EntityFilters({
  entitySearchQuery,
  entityTypeFilter,
  entityTagFilter,
  tagOptions,
  baseTagOptions,
  onSearchChange,
  onTypeFilterChange,
  onTagFilterChange,
  onClearEntityFilters
}) {
  const hasActiveFilters = Boolean(entitySearchQuery || entityTagFilter || entityTypeFilter !== 'all');

  return (
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
        {hasActiveFilters && (
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
    </>
  );
}

export { TYPE_OPTIONS };
