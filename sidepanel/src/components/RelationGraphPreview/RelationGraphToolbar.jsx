export function RelationGraphToolbar({ detailMode, onModeChange, onZoomOut, onReset, onZoomIn }) {
  return (
    <div className="relation-graph-toolbar">
      <p className="relation-graph-tip">拖拽移动 · 滚轮缩放 · 点击节点聚焦</p>
      <div className="relation-graph-controls">
        <select
          className="field-input relation-graph-mode-select"
          value={detailMode}
          onChange={(event) => onModeChange(event.target.value)}
          title="显示模式"
        >
          <option value="auto">自动</option>
          <option value="standard">标准</option>
          <option value="performance">轻量</option>
        </select>
        <button type="button" className="btn-inline btn-inline-secondary" onClick={onZoomOut}>
          缩小
        </button>
        <button type="button" className="btn-inline btn-inline-secondary" onClick={onReset}>
          重置
        </button>
        <button type="button" className="btn-inline btn-inline-secondary" onClick={onZoomIn}>
          放大
        </button>
      </div>
    </div>
  );
}
