import EmptyStateCard from '../EmptyStateCard';
import { parseTags } from '../../utils/entityUtils';

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
  onGoToCaptureTab
}) {
  if (entitiesForView.length === 0) {
    return (
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
              ? '可以先新建设定并勾选"用于当前作品"，或去灵感箱快速整理。'
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
    );
  }

  return (
    <div className="entity-list">
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
  );
}
