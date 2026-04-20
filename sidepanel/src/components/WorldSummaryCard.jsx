import { useMemo, useState } from 'react';
import RelationGraphPreviewCard from './RelationGraphPreviewCard';
import EmptyStateCard from './EmptyStateCard';

const ACTIVITY_GROUP_META = {
  high: { label: '高活跃', hint: '关系多，优先复用' },
  mid: { label: '中活跃', hint: '结构稳，可继续补' },
  low: { label: '低活跃', hint: '刚起步，可继续扩' }
};

function resolveWorldActivity(row) {
  const relations = Number(row?.relations || 0);
  const entities = Number(row?.entities || 0);
  const books = Number(row?.books || 0);
  const score = relations * 2 + entities + books;
  if (relations >= 10 || entities >= 18 || score >= 30) return 'high';
  if (relations >= 4 || entities >= 8 || score >= 12) return 'mid';
  return 'low';
}

function formatCaptureTime(timestamp) {
  if (!timestamp) return '-';
  return new Date(timestamp).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatEntityTime(entity) {
  const source = entity?.updatedAt || entity?.createdAt;
  if (!source) return '-';
  return new Date(source).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function WorldSummaryCard({
  currentWorld,
  currentBook,
  distributionRows,
  recentEntities,
  recentCaptures,
  selectedWorldId,
  worldQuickRows,
  onQuickJumpWorld,
  selectedBookId,
  booksInWorld,
  relationScope,
  onRelationScopeChange,
  overviewBookGraphId,
  onOverviewBookGraphChange,
  worldRelationCount,
  worldRelationTypeRows,
  worldRelationPreviewRows,
  worldRelationGraphEdges,
  bookRelationCount,
  bookRelationTypeRows,
  bookRelationPreviewRows,
  bookRelationGraphEdges,
  onGoToTimelineTab
}) {
  const [quickKeyword, setQuickKeyword] = useState('');
  const [quickSortBy, setQuickSortBy] = useState('smart');
  const [quickViewMode, setQuickViewMode] = useState('flat');

  const recentActivityRows = [
    ...recentEntities.map((entity) => ({
      id: `entity-${entity.id}`,
      timestamp: Number(entity.updatedAt || entity.createdAt || 0),
      label: `设定更新 · ${entity.name || '未命名设定'}`,
      type: '设定',
      subtype: 'update',
      note: entity.type || 'other',
      entityId: entity.id
    })),
    ...recentCaptures.map((capture, index) => ({
      id: `capture-${capture.timestamp || index}-${String(capture.text || '').slice(0, 20)}`,
      timestamp: Number(capture.timestamp || 0),
      label: `灵感记录 · ${String(capture.text || '').slice(0, 28)}`,
      type: '灵感',
      subtype: 'capture',
      note: capture.sourceTitle || '未知来源'
    }))
  ]
    .filter((row) => row.timestamp > 0)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 6);

  const canUseBookScope = Boolean(selectedBookId);
  const canSwitchBookGraph = Array.isArray(booksInWorld) && booksInWorld.length > 0;
  const isBookScope = canUseBookScope && relationScope === 'book';
  const activeRelationCount = isBookScope ? bookRelationCount : worldRelationCount;
  const activeRelationTypeRows = isBookScope ? bookRelationTypeRows : worldRelationTypeRows;
  const activeRelationPreviewRows = isBookScope ? bookRelationPreviewRows : worldRelationPreviewRows;
  const activeRelationGraphEdges = isBookScope ? bookRelationGraphEdges : worldRelationGraphEdges;
  const hasWorldQuickRows = Array.isArray(worldQuickRows) && worldQuickRows.length > 0;
  const normalizedQuickKeyword = String(quickKeyword || '').trim().toLowerCase();
  const quickRowsForView = useMemo(() => {
    const rows = Array.isArray(worldQuickRows) ? [...worldQuickRows] : [];
    if (quickSortBy === 'relations') {
      rows.sort((a, b) => b.relations - a.relations || b.entities - a.entities || b.books - a.books);
    } else if (quickSortBy === 'entities') {
      rows.sort((a, b) => b.entities - a.entities || b.relations - a.relations || b.books - a.books);
    } else if (quickSortBy === 'books') {
      rows.sort((a, b) => b.books - a.books || b.entities - a.entities || b.relations - a.relations);
    } else {
      rows.sort((a, b) => b.relations - a.relations || b.entities - a.entities || b.books - a.books);
    }
    if (!normalizedQuickKeyword) {
      return rows;
    }
    return rows.filter((row) => String(row.worldName || '').toLowerCase().includes(normalizedQuickKeyword));
  }, [worldQuickRows, quickSortBy, normalizedQuickKeyword]);
  const quickGroupedRows = useMemo(() => {
    if (quickViewMode !== 'grouped') return [];
    const groups = {
      high: [],
      mid: [],
      low: []
    };
    quickRowsForView.forEach((row) => {
      const key = resolveWorldActivity(row);
      groups[key].push(row);
    });
    return ['high', 'mid', 'low']
      .map((key) => ({
        key,
        ...ACTIVITY_GROUP_META[key],
        rows: groups[key]
      }))
      .filter((group) => group.rows.length > 0);
  }, [quickRowsForView, quickViewMode]);

  const renderQuickRow = (row) => {
    const isCurrent = String(row.worldId) === String(selectedWorldId || '');
    return (
      <div key={row.worldId} className="world-quick-item">
        <div className="world-quick-main">
          <div className="world-quick-title-row">
            <span className="world-quick-title">{row.worldName}</span>
            <span className="tag tag-secondary">{ACTIVITY_GROUP_META[resolveWorldActivity(row)].label}</span>
            {isCurrent ? <span className="tag tag-primary">当前</span> : null}
          </div>
          <div className="world-quick-meta">
            <span>作品 {row.books}</span>
            <span>设定 {row.entities}</span>
            <span>关系 {row.relations}</span>
          </div>
        </div>
        <button
          type="button"
          className={`btn-secondary btn-mini ${isCurrent ? 'btn-secondary-muted' : ''}`}
          onClick={() => onQuickJumpWorld?.(row.worldId)}
          disabled={isCurrent}
          title={isCurrent ? '当前已在该世界观库上下文' : `切换到「${row.worldName}」`}
        >
          {isCurrent ? '当前' : '切换'}
        </button>
      </div>
    );
  };

  const renderOverviewTitle = ({ icon, title, meta }) => (
    <div className="overview-title-row">
      <span className="overview-title-badge" aria-hidden="true">
        {icon}
      </span>
      <div className="overview-title-main">
        <h3 className="overview-title">{title}</h3>
        {meta ? <p className="overview-title-meta">{meta}</p> : null}
      </div>
    </div>
  );

  return (
    <div className="section-body">
      <div className="summary-grid">
        <div className="summary-item">
          <div className="summary-item-label">当前世界</div>
          <div className="summary-item-value">{currentWorld?.name || '未选择世界'}</div>
        </div>
        <div className="summary-item">
          <div className="summary-item-label">当前作品</div>
          <div className="summary-item-value">{currentBook?.title || '全部作品'}</div>
        </div>
      </div>

      <div className="overview-block">
        {renderOverviewTitle({
          icon: '跨',
          title: '世界快览',
          meta: hasWorldQuickRows
            ? `${quickRowsForView.length}/${worldQuickRows.length} 个世界${normalizedQuickKeyword ? '（已筛选）' : ''}`
            : ''
        })}
        <div className="world-quick-toolbar">
          <input
            className="field-input world-quick-search"
            value={quickKeyword}
            onChange={(event) => setQuickKeyword(event.target.value)}
            placeholder="搜索世界"
          />
          <select
            className="field-input world-quick-sort"
            value={quickSortBy}
            onChange={(event) => setQuickSortBy(event.target.value)}
          >
            <option value="smart">智能排序</option>
            <option value="relations">按关系数</option>
            <option value="entities">按设定数</option>
            <option value="books">按作品数</option>
          </select>
          <select
            className="field-input world-quick-view"
            value={quickViewMode}
            onChange={(event) => setQuickViewMode(event.target.value)}
          >
            <option value="flat">平铺列表</option>
            <option value="grouped">分组视图</option>
          </select>
        </div>
        {quickViewMode === 'grouped' ? <p className="helper-text overview-inline-note">按活跃度分组查看。</p> : null}
        {hasWorldQuickRows ? (
          quickRowsForView.length > 0 ? (
            quickViewMode === 'grouped' ? (
              <div className="world-quick-group-list">
                {quickGroupedRows.map((group) => (
                  <section key={group.key} className="world-quick-group">
                    <div className="world-quick-group-header">
                      <span className="world-quick-group-title">{group.label}</span>
                      <span className="world-quick-group-hint">{group.hint}</span>
                    </div>
                    <div className="world-quick-list">
                      {group.rows.map((row) => renderQuickRow(row))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="world-quick-list">
                {quickRowsForView.map((row) => renderQuickRow(row))}
              </div>
            )
          ) : (
            <EmptyStateCard
              compact
              icon="筛"
              title="没有匹配结果"
              description="换个关键词，或清空筛选。"
              actions={normalizedQuickKeyword ? [{ label: '清空关键词', onClick: () => setQuickKeyword('') }] : []}
            />
          )
        ) : (
          <EmptyStateCard compact icon="库" title="还没有世界数据" description="先建世界，概览会自动出现。" />
        )}
      </div>

      <div className="overview-block">
        {renderOverviewTitle({ icon: '类', title: '设定类型' })}
        {distributionRows.length > 0 ? (
          <div className="overview-list">
            {distributionRows.map((row) => (
              <div key={row.type} className="overview-list-item">
                <span>{row.label}</span>
                <span className="overview-list-value">{row.count}</span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyStateCard compact icon="类" title="还没有类型数据" description="先新增设定，再回来看分布。" />
        )}
      </div>

      <div className="overview-block">
        {renderOverviewTitle({ icon: '更', title: '最近更新' })}
        {recentEntities.length > 0 ? (
          <div className="overview-list">
            {recentEntities.map((entity) => (
              <div key={entity.id} className="overview-list-item">
                <div className="overview-item-main">
                  <span className="overview-item-title">{entity.name}</span>
                  <span className="overview-item-meta">{entity.type || 'other'}</span>
                </div>
                <span className="overview-list-value">{formatEntityTime(entity)}</span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyStateCard compact icon="设" title="还没有设定" description="先新建设定，这里会显示最近更新。" />
        )}
      </div>

      <div className="overview-block">
        {renderOverviewTitle({ icon: '灵', title: '最近灵感' })}
        {recentCaptures.length > 0 ? (
          <div className="overview-list">
            {recentCaptures.map((capture) => (
              <div key={`${capture.timestamp}-${capture.text}`} className="overview-list-item">
                <div className="overview-item-main">
                  <span className="overview-item-title">{String(capture.text || '').slice(0, 22)}</span>
                  <span className="overview-item-meta">{capture.sourceTitle || '未知来源'}</span>
                </div>
                <span className="overview-list-value">{formatCaptureTime(capture.timestamp)}</span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyStateCard compact icon="灵" title="还没有灵感" description="划词保存后，这里会自动更新。" />
        )}
      </div>

      <div className="overview-block overview-block-emphasis">
        {renderOverviewTitle({
          icon: '图',
          title: '关系图谱',
          meta: `${isBookScope ? '作品视角' : '世界视角'} · ${activeRelationCount} 条关系`
        })}
        <div className="relation-scope-switch">
          <button
            type="button"
            className={`scope-switch-btn ${!isBookScope ? 'scope-switch-btn-active' : ''}`}
            onClick={() => onRelationScopeChange?.('world')}
          >
            世界视角
          </button>
          <button
            type="button"
            className={`scope-switch-btn ${isBookScope ? 'scope-switch-btn-active' : ''}`}
            onClick={() => onRelationScopeChange?.('book')}
            disabled={!canSwitchBookGraph}
            title={!canSwitchBookGraph ? '当前世界还没有作品，暂时不能切到作品视角' : ''}
          >
            作品视角
          </button>
        </div>
        {isBookScope && canSwitchBookGraph ? (
          <div className="relation-book-picker">
            <label className="field-label">查看作品</label>
            <select
              className="field-input"
              value={overviewBookGraphId}
              onChange={(event) => onOverviewBookGraphChange?.(event.target.value)}
            >
              {booksInWorld.map((book) => (
                <option key={book.id} value={book.id}>
                  {book.title}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        {activeRelationCount > 0 ? (
          <div className="overview-list relation-overview-stack">
            <RelationGraphPreviewCard edges={activeRelationGraphEdges} relationCount={activeRelationCount} />

            {activeRelationTypeRows.length > 0 ? (
              <div className="overview-list">
                {activeRelationTypeRows.map((row) => (
                  <div key={row.type} className="overview-list-item">
                    <span>{row.label}</span>
                    <span className="overview-list-value">{row.count}</span>
                  </div>
                ))}
              </div>
            ) : null}

            {activeRelationPreviewRows.length > 0 ? (
              <div className="overview-list">
                {activeRelationPreviewRows.map((relation) => (
                  <div key={relation.id} className="relation-edge-item">
                    <div className="relation-edge-main">
                      <span className="relation-edge-text">{relation.fromName}</span>
                      <span className="tag tag-primary">{relation.typeLabel}</span>
                      <span className="relation-edge-text">{relation.toName}</span>
                    </div>
                    {relation.note ? <span className="relation-edge-note">{relation.note}</span> : null}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <EmptyStateCard
            compact
            icon="图"
            title="还没有关系"
            description="先在设定编辑里添加关系。"
          />
        )}
      </div>

      <div className="overview-block">
        <div className="overview-block-header">
          {renderOverviewTitle({ icon: '动', title: '最近动态', meta: '这里只看最近变化，完整记录见时间轴' })}
          {onGoToTimelineTab ? (
            <button type="button" className="btn-inline btn-inline-secondary overview-block-action" onClick={onGoToTimelineTab}>
              打开时间轴
            </button>
          ) : null}
        </div>
        {recentActivityRows.length > 0 ? (
          <div className="timeline-list">
            {recentActivityRows.map((item) => (
              <div key={item.id} className="timeline-item">
                <div className="timeline-item-main">
                  <span className={`tag ${item.type === '设定' ? 'tag-primary' : 'tag-secondary'}`}>
                    {item.subtype === 'update' ? '更新' : item.subtype === 'capture' ? '捕获' : item.type}
                  </span>
                  <span className="timeline-item-label">{item.label}</span>
                </div>
                <div className="timeline-item-meta">
                  <span>{item.note}</span>
                  <span className="timeline-item-time">{formatCaptureTime(item.timestamp)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyStateCard compact icon="动" title="还没有最近动态" description="设定更新和灵感会出现在这里。" />
        )}
      </div>
    </div>
  );
}

export default WorldSummaryCard;
