import { useMemo, useState } from 'react';
import RelationGraphPreviewCard from './RelationGraphPreviewCard';
import EmptyStateCard from './EmptyStateCard';

const ACTIVITY_GROUP_META = {
  high: { label: '高活跃', hint: '关系密度高，优先复用' },
  mid: { label: '中活跃', hint: '结构稳定，可持续补充' },
  low: { label: '低活跃', hint: '基础库，可按需扩展' }
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
  bookRelationGraphEdges
}) {
  const [quickKeyword, setQuickKeyword] = useState('');
  const [quickSortBy, setQuickSortBy] = useState('smart');
  const [quickViewMode, setQuickViewMode] = useState('flat');
  const [quickGroupBy, setQuickGroupBy] = useState('activity'); // activity, tag, domain
  const timelineFilter = 'all';
  const timelineSort = 'time'; // time, type
  
  const timelineRows = [
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
    .filter((row) => {
      if (timelineFilter === 'all') return true;
      return row.type === timelineFilter;
    })
    .sort((a, b) => {
      if (timelineSort === 'time') {
        return b.timestamp - a.timestamp;
      } else {
        return a.type.localeCompare(b.type) || b.timestamp - a.timestamp;
      }
    })
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
  const quickGroupedRows = useMemo(() => {
    if (quickViewMode !== 'grouped') return [];
    
    if (quickGroupBy === 'activity') {
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
    }
    
    // 按标签分组（简化实现，使用世界名称的首字符作为标签示例）
    if (quickGroupBy === 'tag') {
      const groups = {};
      quickRowsForView.forEach((row) => {
        const tag = row.worldName.charAt(0).toUpperCase();
        if (!groups[tag]) groups[tag] = [];
        groups[tag].push(row);
      });
      return Object.entries(groups)
        .map(([key, rows]) => ({
          key,
          label: `标签 ${key}`,
          hint: `包含 ${rows.length} 个世界观库`,
          rows
        }))
        .sort((a, b) => a.key.localeCompare(b.key));
    }
    
    // 按领域分组（简化实现，根据关系数和实体数判断领域）
    if (quickGroupBy === 'domain') {
      const groups = {
        fantasy: [],
        sciFi: [],
        modern: []
      };
      quickRowsForView.forEach((row) => {
        if (row.relations > 8) {
          groups.fantasy.push(row);
        } else if (row.entities > 15) {
          groups.sciFi.push(row);
        } else {
          groups.modern.push(row);
        }
      });
      return [
        { key: 'fantasy', label: '奇幻领域', hint: '关系密集的世界观', rows: groups.fantasy },
        { key: 'sciFi', label: '科幻领域', hint: '实体丰富的世界观', rows: groups.sciFi },
        { key: 'modern', label: '现代领域', hint: '基础设定的世界观', rows: groups.modern }
      ].filter((group) => group.rows.length > 0);
    }
    
    return [];
  }, [quickRowsForView, quickViewMode, quickGroupBy]);

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
          <div className="summary-item-label">当前世界观库</div>
          <div className="summary-item-value">{currentWorld?.name || '未选择世界观库'}</div>
        </div>
        <div className="summary-item">
          <div className="summary-item-label">当前作品</div>
          <div className="summary-item-value">{currentBook?.title || '全部作品 / 未指定'}</div>
        </div>
      </div>

      <div className="overview-block">
        {renderOverviewTitle({
          icon: '跨',
          title: '跨世界快览（v1）',
          meta: hasWorldQuickRows
            ? `${quickRowsForView.length}/${worldQuickRows.length} 个世界观库${normalizedQuickKeyword ? '（已过滤）' : ''}`
            : ''
        })}
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
          <select
            className="field-input world-quick-view"
            value={quickViewMode}
            onChange={(event) => setQuickViewMode(event.target.value)}
          >
            <option value="flat">平铺列表</option>
            <option value="grouped">分组视图</option>
          </select>
          {quickViewMode === 'grouped' && (
            <select
              className="field-input world-quick-group"
              value={quickGroupBy}
              onChange={(event) => setQuickGroupBy(event.target.value)}
            >
              <option value="activity">按活跃度</option>
              <option value="tag">按标签</option>
              <option value="domain">按领域</option>
            </select>
          )}
        </div>
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
              title="没有匹配的世界观库"
              description="试试清空关键词或切换排序方式。"
              actions={normalizedQuickKeyword ? [{ label: '清空关键词', onClick: () => setQuickKeyword('') }] : []}
            />
          )
        ) : (
          <EmptyStateCard compact icon="库" title="暂无可快览的世界观库数据" description="先创建世界观库并录入设定，概览会自动生成。" />
        )}
      </div>

      <div className="overview-block">
        {renderOverviewTitle({ icon: '类', title: '类型分布' })}
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
          <EmptyStateCard compact icon="类" title="当前范围暂无设定类型数据" description="可先在设定库中新建或导入设定。" />
        )}
      </div>

      <div className="overview-block">
        {renderOverviewTitle({ icon: '更', title: '最近更新设定' })}
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
          <EmptyStateCard compact icon="设" title="当前世界观库还没有设定" description="先在设定库新建条目，更新记录会自动出现在这里。" />
        )}
      </div>

      <div className="overview-block">
        {renderOverviewTitle({ icon: '灵', title: '最近灵感记录' })}
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
          <EmptyStateCard compact icon="灵" title="暂无灵感记录" description="网页划词后会自动出现在灵感箱和此处。" />
        )}
      </div>

      <div className="overview-block overview-block-emphasis">
        {renderOverviewTitle({
          icon: '图',
          title: '设定关系图谱（v2）',
          meta: `${isBookScope ? '当前作品视图' : '世界范围视图'} · ${activeRelationCount} 条关系`
        })}
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
            title="当前范围暂无关系边"
            description="可在设定编辑中添加关系后回来看图谱预览。"
          />
        )}
      </div>

      <div className="overview-block">
        {renderOverviewTitle({ icon: '时', title: '时间轴（v0）' })}
        <p className="helper-text timeline-hint">当前按时间倒序展示全部事件。</p>
        {timelineRows.length > 0 ? (
          <div className="timeline-list">
            {timelineRows.map((item) => (
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
          <EmptyStateCard compact icon="时" title="暂无可展示的时间轴事件" description="设定更新与灵感记录会自动汇入时间轴。" />
        )}
      </div>
    </div>
  );
}

export default WorldSummaryCard;
