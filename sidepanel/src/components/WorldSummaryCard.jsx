import { useMemo, useState } from 'react';
import RelationGraphPreviewCard from './RelationGraphPreviewCard';

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
  bookRelationGraphEdges
}) {
  const [quickKeyword, setQuickKeyword] = useState('');
  const [quickSortBy, setQuickSortBy] = useState('smart');
  const timelineRows = [
    ...recentEntities.map((entity) => ({
      id: `entity-${entity.id}`,
      timestamp: Number(entity.updatedAt || entity.createdAt || 0),
      label: `设定更新 · ${entity.name || '未命名设定'}`,
      type: '设定',
      note: entity.type || 'other'
    })),
    ...recentCaptures.map((capture, index) => ({
      id: `capture-${capture.timestamp || index}-${String(capture.text || '').slice(0, 20)}`,
      timestamp: Number(capture.timestamp || 0),
      label: `灵感记录 · ${String(capture.text || '').slice(0, 28)}`,
      type: '灵感',
      note: capture.sourceTitle || '未知来源'
    }))
  ]
    .filter((row) => row.timestamp > 0)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 12);

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

  return (
    <div className="section-body">
      <div className="summary-grid">
        <div className="summary-item">
          <div className="summary-item-label">当前世界观库</div>
          <div className="summary-item-value">{currentWorld?.name || '未选择世界观库'}</div>
        </div>
        <div className="summary-item">
          <div className="summary-item-label">当前作品</div>
          <div className="summary-item-value">{currentBook?.title || '全部作品 / 未指定'}</div>
        </div>
      </div>

      <div className="overview-block">
        <h3 className="overview-title">跨世界快览（v1）</h3>
        <div className="world-quick-toolbar">
          <input
            className="field-input world-quick-search"
            value={quickKeyword}
            onChange={(event) => setQuickKeyword(event.target.value)}
            placeholder="搜索世界观库..."
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
        </div>
        {hasWorldQuickRows ? (
          <div className="world-quick-list">
            {quickRowsForView.map((row) => {
              const isCurrent = String(row.worldId) === String(selectedWorldId || '');
              return (
                <div key={row.worldId} className="world-quick-item">
                  <div className="world-quick-main">
                    <div className="world-quick-title-row">
                      <span className="world-quick-title">{row.worldName}</span>
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
            })}
          </div>
        ) : (
          <p className="helper-text">暂无可快览的世界观库数据。</p>
        )}
        {hasWorldQuickRows && quickRowsForView.length === 0 ? <p className="helper-text">没有匹配的世界观库，试试清空关键词。</p> : null}
      </div>

      <div className="overview-block">
        <h3 className="overview-title">类型分布</h3>
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
          <p className="helper-text">当前范围暂无设定类型数据。</p>
        )}
      </div>

      <div className="overview-block">
        <h3 className="overview-title">最近更新设定</h3>
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
          <p className="helper-text">当前世界观库还没有设定。</p>
        )}
      </div>

      <div className="overview-block">
        <h3 className="overview-title">最近灵感记录</h3>
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
          <p className="helper-text">暂无灵感记录。</p>
        )}
      </div>

      <div className="overview-block">
        <h3 className="overview-title">设定关系图谱（v2）</h3>
        <div className="relation-scope-switch">
          <button
            type="button"
            className={`scope-switch-btn ${!isBookScope ? 'scope-switch-btn-active' : ''}`}
            onClick={() => onRelationScopeChange?.('world')}
          >
            世界级关联图
          </button>
          <button
            type="button"
            className={`scope-switch-btn ${isBookScope ? 'scope-switch-btn-active' : ''}`}
            onClick={() => onRelationScopeChange?.('book')}
            disabled={!canSwitchBookGraph}
            title={!canSwitchBookGraph ? '当前世界观库暂无作品，无法切换作品级图谱' : ''}
          >
            当前作品图谱
          </button>
        </div>
        {isBookScope && canSwitchBookGraph ? (
          <div className="relation-book-picker">
            <label className="field-label">目标作品</label>
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
          <div className="overview-list">
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
          <p className="helper-text">当前范围暂无关系边。可在设定编辑中添加关系后回来看图谱预览。</p>
        )}
      </div>

      <div className="overview-block">
        <h3 className="overview-title">时间轴（v0）</h3>
        {timelineRows.length > 0 ? (
          <div className="timeline-list">
            {timelineRows.map((item) => (
              <div key={item.id} className="timeline-item">
                <div className="timeline-item-main">
                  <span className="tag tag-primary">{item.type}</span>
                  <span className="timeline-item-label">{item.label}</span>
                </div>
                <div className="timeline-item-meta">
                  <span>{item.note}</span>
                  <span>{formatCaptureTime(item.timestamp)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="helper-text">暂无可展示的时间轴事件。</p>
        )}
      </div>
    </div>
  );
}

export default WorldSummaryCard;
