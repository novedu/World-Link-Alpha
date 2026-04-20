export function RelationGraphStatusPanel({
  shouldShowSimplifyTip,
  isAutoPerformanceMode,
  graphProfile,
  graph,
  relationCount,
  graphStatusTips,
  visibleGraphEdges,
  canLoadMoreEdges,
  hiddenEdgeCount,
  batchPreset,
  onLoadMoreEdges
}) {
  return (
    <>
      {shouldShowSimplifyTip ? (
        <p className="relation-graph-perf-tip">
          {isAutoPerformanceMode ? '已切轻量模式' : `${graphProfile.label}模式`} · 关系{' '}
          {graph.meta.renderedEdgeCount}/{Math.max(graph.meta.sourceEdgeCount, relationCount || 0)}
        </p>
      ) : null}
      {graphStatusTips.length > 0 ? (
        <div className="relation-graph-status-list">
          {graphStatusTips.map((tip, index) => (
            <span key={`${tip}-${index}`} className="relation-graph-status-pill">
              {tip}
            </span>
          ))}
        </div>
      ) : null}
      <div className="relation-graph-loadmore">
        <span className="relation-graph-loadmore-meta">
          已显示 {visibleGraphEdges.length}/{graph.edges.length} 条关系
        </span>
        {canLoadMoreEdges ? (
          <button type="button" className="btn-inline btn-inline-secondary" onClick={onLoadMoreEdges}>
            再加载 +{Math.min(hiddenEdgeCount, batchPreset.step)}
          </button>
        ) : null}
      </div>
    </>
  );
}
