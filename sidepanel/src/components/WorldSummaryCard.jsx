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
  recentCaptures
}) {
  return (
    <div className="section-body">
      <div className="summary-grid">
        <div className="summary-item">
          <div className="summary-item-label">当前世界</div>
          <div className="summary-item-value">{currentWorld?.name || '未选择世界'}</div>
        </div>
        <div className="summary-item">
          <div className="summary-item-label">当前书项目</div>
          <div className="summary-item-value">{currentBook?.title || '全部书 / 未指定'}</div>
        </div>
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
          <p className="helper-text">当前范围暂无实体类型数据。</p>
        )}
      </div>

      <div className="overview-block">
        <h3 className="overview-title">最近更新实体</h3>
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
          <p className="helper-text">当前世界还没有实体。</p>
        )}
      </div>

      <div className="overview-block">
        <h3 className="overview-title">最近捕获记录</h3>
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
          <p className="helper-text">暂无捕获记录。</p>
        )}
      </div>
    </div>
  );
}

export default WorldSummaryCard;
