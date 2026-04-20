import WorldSummaryCard from '../WorldSummaryCard';

export function OverviewTabSection({
  overviewStats,
  currentWorld,
  currentBook,
  distributionRows,
  recentEntities,
  recentCaptures,
  selectedBookId,
  booksInWorld,
  resolvedOverviewRelationScope,
  onRelationScopeChange,
  resolvedOverviewBookGraphId,
  onOverviewBookGraphChange,
  relationsInWorld,
  worldRelationRows,
  scopedBookRelationRows,
  selectedWorldId,
  worldQuickRows,
  onQuickJumpWorld,
  onGoToTimelineTab
}) {
  return (
    <div className="section-card fade-in">
      <div className="card-header">
        <h2>快速概览</h2>
        <div className="text-sm card-header-meta card-header-meta-muted">
          当前范围的核心信息
        </div>
      </div>
      <div className="metrics-grid overview-metrics-grid">
        {overviewStats.map((item) => (
          <div key={item.id} className={`metric-card metric-card-${item.id}`}>
            <div className="metric-label">{item.label}</div>
            <div className="metric-value">{item.value}</div>
          </div>
        ))}
      </div>
      <div className="section-divider overview-metrics-divider" />
      <WorldSummaryCard
        currentWorld={currentWorld}
        currentBook={currentBook}
        distributionRows={distributionRows}
        recentEntities={recentEntities}
        recentCaptures={recentCaptures}
        selectedBookId={selectedBookId}
        booksInWorld={booksInWorld}
        relationScope={resolvedOverviewRelationScope}
        onRelationScopeChange={onRelationScopeChange}
        overviewBookGraphId={resolvedOverviewBookGraphId}
        onOverviewBookGraphChange={onOverviewBookGraphChange}
        worldRelationCount={relationsInWorld.length}
        worldRelationTypeRows={worldRelationRows.relationTypeRows}
        worldRelationPreviewRows={worldRelationRows.relationPreviewRows}
        worldRelationGraphEdges={worldRelationRows.relationGraphEdges}
        bookRelationCount={scopedBookRelationRows.relationCount}
        bookRelationTypeRows={scopedBookRelationRows.relationTypeRows}
        bookRelationPreviewRows={scopedBookRelationRows.relationPreviewRows}
        bookRelationGraphEdges={scopedBookRelationRows.relationGraphEdges}
        selectedWorldId={selectedWorldId}
        worldQuickRows={worldQuickRows}
        onQuickJumpWorld={onQuickJumpWorld}
        onGoToTimelineTab={onGoToTimelineTab}
      />
    </div>
  );
}
