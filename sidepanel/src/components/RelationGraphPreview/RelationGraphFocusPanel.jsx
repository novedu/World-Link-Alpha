import EmptyStateCard from '../EmptyStateCard';

export function RelationGraphFocusPanel({
  activeNodeName,
  selectedEdgeRows,
  focusDirection,
  onFocusDirectionChange,
  onClearFocus
}) {
  return (
    <div className="relation-graph-focus-panel">
      <div className="relation-graph-focus-head">
        <p className="relation-graph-focus-title">
          {activeNodeName} · {selectedEdgeRows.length} 条关系
        </p>
        <div className="relation-graph-focus-filters">
          <button
            type="button"
            className={`focus-filter-btn ${focusDirection === 'all' ? 'focus-filter-btn-active' : ''}`}
            onClick={() => onFocusDirectionChange('all')}
          >
            全部
          </button>
          <button
            type="button"
            className={`focus-filter-btn ${focusDirection === 'out' ? 'focus-filter-btn-active' : ''}`}
            onClick={() => onFocusDirectionChange('out')}
          >
            发出
          </button>
          <button
            type="button"
            className={`focus-filter-btn ${focusDirection === 'in' ? 'focus-filter-btn-active' : ''}`}
            onClick={() => onFocusDirectionChange('in')}
          >
            指向
          </button>
          <button type="button" className="focus-filter-btn focus-filter-btn-clear" onClick={onClearFocus}>
            回到全图
          </button>
        </div>
      </div>
      {selectedEdgeRows.length > 0 ? (
        <div className="overview-list">
          {selectedEdgeRows.map((edge) => (
            <div key={`focus-${edge.id}`} className="relation-edge-item">
              <div className="relation-edge-main">
                <span className="relation-edge-text">{edge.fromName}</span>
                <span className="tag tag-primary">{edge.typeLabel}</span>
                <span className="relation-edge-text">{edge.toName}</span>
              </div>
              {edge.note ? <span className="relation-edge-note">{edge.note}</span> : null}
            </div>
          ))}
        </div>
      ) : (
        <EmptyStateCard
          compact
          icon="焦"
          title="当前节点暂无关系"
          description="可切换方向，或回到全图继续查看。"
          actions={
            focusDirection !== 'all'
              ? [
                  { label: '查看全部', onClick: () => onFocusDirectionChange('all') },
                  { label: '回到全图', onClick: onClearFocus }
                ]
              : [{ label: '回到全图', onClick: onClearFocus }]
          }
        />
      )}
    </div>
  );
}
