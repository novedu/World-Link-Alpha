import { CANVAS_HEIGHT, CANVAS_WIDTH, formatNodeLabel } from './graphLayout';

export function RelationGraphViewport({
  svgRef,
  isPanning,
  viewport,
  visibleGraphEdges,
  resolvedActiveNodeId,
  connectedEdgeIds,
  visibleGraphNodes,
  connectedNodeIds,
  onWheel,
  onPointerDown,
  onPointerMove,
  onPointerEnd,
  onToggleNode
}) {
  return (
    <div className="relation-graph-viewport">
      <svg
        ref={svgRef}
        className={`relation-graph-svg ${isPanning ? 'relation-graph-svg-panning' : ''}`}
        viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        <rect x="0" y="0" width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="relation-graph-bg" />

        <g transform={`translate(${viewport.x} ${viewport.y}) scale(${viewport.scale})`}>
          {visibleGraphEdges.map((edge) => {
            const isActive = resolvedActiveNodeId ? connectedEdgeIds.has(edge.id) : true;
            return (
              <line
                key={edge.id}
                x1={edge.x1}
                y1={edge.y1}
                x2={edge.x2}
                y2={edge.y2}
                className={`relation-graph-edge ${
                  isActive ? 'relation-graph-edge-active' : 'relation-graph-edge-muted'
                }`}
              />
            );
          })}

          {visibleGraphNodes.map((node) => {
            const isActive = resolvedActiveNodeId ? connectedNodeIds.has(node.id) : true;
            const isFocus = resolvedActiveNodeId === node.id;
            return (
              <g
                key={node.id}
                data-node-id={node.id}
                transform={`translate(${node.x} ${node.y})`}
                className={`relation-graph-node ${
                  isFocus ? 'relation-graph-node-focus' : isActive ? 'relation-graph-node-active' : 'relation-graph-node-muted'
                }`}
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleNode(node.id);
                }}
              >
                <circle r={node.radius} />
                <text dy="0.32em">{formatNodeLabel(node.name)}</text>
                <title>{`${node.name} · 关系 ${node.degree}`}</title>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
