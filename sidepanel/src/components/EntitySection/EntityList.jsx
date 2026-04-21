import EmptyStateCard from '../EmptyStateCard';
import { parseTags } from '../../utils/entityUtils';

function getDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

export function EntityList({
  entitiesForView,
  editingEntity,
  selectedBookId,
  hasActiveEntityFilters,
  totalEntitiesInContext,
  isEntityUsedInCurrentBook,
  onEditEntity,
  onStartNewEntity,
  onClearEntityFilters,
  onClearBookSelection,
  onGoToCaptureTab,
  selectedEntities = [],
  onEntitySelect,
  onSelectAll
}) {
  if (entitiesForView.length === 0) {
    return (
      <EmptyStateCard
        icon={hasActiveEntityFilters ? '筛' : selectedBookId ? '书' : '设'}
        title={
          hasActiveEntityFilters && totalEntitiesInContext > 0
            ? '没有匹配设定'
            : selectedBookId
              ? '当前作品还没有设定'
              : '这个世界还没有设定'
        }
        description={
          hasActiveEntityFilters && totalEntitiesInContext > 0
            ? '换个条件，或清空筛选。'
            : selectedBookId
              ? '可以先新建设定，或去灵感箱整理素材。'
              : '可以先新建设定，或先整理灵感。'
        }
        actions={
          hasActiveEntityFilters && totalEntitiesInContext > 0
            ? [{ label: '清空筛选', onClick: onClearEntityFilters }]
            : selectedBookId
              ? [
                  { label: '+ 新建设定', onClick: onStartNewEntity, variant: 'primary' },
                  { label: '查看全部设定', onClick: onClearBookSelection },
                  { label: '去整理灵感', onClick: onGoToCaptureTab }
                ]
              : [
                  { label: '+ 新建设定', onClick: onStartNewEntity, variant: 'primary' },
                  { label: '去整理灵感', onClick: onGoToCaptureTab }
                ]
        }
      />
    );
  }

  const isAllSelected = entitiesForView.length > 0 && entitiesForView.every(entity => selectedEntities.includes(entity.id));

  return (
    <div className="entity-list">
      {entitiesForView.length > 0 && onEntitySelect && (
        <div className="entity-list-header">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={(e) => onSelectAll(e.target.checked)}
            />
            <span>全选 ({entitiesForView.length})</span>
          </label>
          {selectedEntities.length > 0 && (
            <span className="selected-count">已选择 {selectedEntities.length} 项</span>
          )}
        </div>
      )}
      {entitiesForView.map((entity) => {
        const isActive = Boolean(editingEntity && editingEntity.id === entity.id);
        const isSelected = selectedEntities.includes(entity.id);
        const allTags = parseTags(entity.tags);
        const tags = allTags.slice(0, 2);
        const extraTagCount = Math.max(allTags.length - tags.length, 0);
        const isUsedInCurrentBook = Boolean(selectedBookId && isEntityUsedInCurrentBook && isEntityUsedInCurrentBook(entity.id));
        const entityName = entity.name || '未命名设定';
        const summaryText = String(entity.summary || '').trim();
        const sourceText = String(entity.sourceTitle || '').trim() || getDomain(entity.sourceUrl);
        const usageCount = Array.isArray(entity.usages) ? entity.usages.length : 0;

        return (
          <div key={entity.id} className={`entity-card ${isActive ? 'entity-card-active' : ''} ${isSelected ? 'entity-card-selected' : ''}`}>
            {onEntitySelect && (
              <div className="entity-card-checkbox">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => onEntitySelect(entity.id, e.target.checked)}
                />
              </div>
            )}
            <button
              type="button"
              onClick={() => onEditEntity(entity)}
              className="entity-card-content"
              title={entityName}
            >
              <div className="entity-card-main">
                <div className="entity-card-header">
                  <span className="entity-card-title">{entityName}</span>
                  {isActive ? <span className="tag tag-secondary">编辑中</span> : null}
                </div>

                <div className="entity-card-tags">
                  <span className="tag tag-primary">{entity.type || 'other'}</span>
                  {isUsedInCurrentBook ? <span className="tag tag-success">当前作品</span> : null}
                </div>
              </div>

              <p className={`entity-card-summary ${summaryText ? '' : 'entity-card-summary-empty'}`}>
                {summaryText || '暂无摘要，可在右侧补充。'}
              </p>

              <div className="entity-card-meta-row">
                <span className="entity-card-meta-item">
                  来源：{sourceText || '手动创建'}
                </span>
                <span className="entity-card-meta-item">
                  被作品使用：{usageCount}
                </span>
              </div>

              {tags.length > 0 || extraTagCount > 0 ? (
                <div className="entity-card-footer">
                  <div className="entity-card-tag-list">
                  {tags.map((tag) => (
                      <span key={tag} className="tag tag-secondary">
                      {tag}
                    </span>
                  ))}
                    {extraTagCount > 0 ? <span className="tag tag-secondary">+{extraTagCount} 标签</span> : null}
                  </div>
                </div>
              ) : null}
            </button>
          </div>
        );
      })}
    </div>
  );
}
