import { useMemo, useRef, useState } from 'react';

const CANVAS_WIDTH = 320;
const CANVAS_HEIGHT = 220;
const MIN_SCALE = 0.75;
const MAX_SCALE = 2.4;
const DEFAULT_VIEWPORT = { x: 0, y: 0, scale: 1 };

function clampScale(value) {
  return Math.max(MIN_SCALE, Math.min(MAX_SCALE, value));
}

function formatNodeLabel(name) {
  const raw = String(name || '');
  if (raw.length <= 5) return raw;
  return `${raw.slice(0, 5)}…`;
}

function buildGraph(edges) {
  const sourceEdges = Array.isArray(edges) ? edges : [];
  if (sourceEdges.length === 0) {
    return { nodes: [], edges: [] };
  }

  const nodeLimit = 18;
  const edgeLimit = 42;
  const nodeMap = new Map();
  const filteredEdges = [];

  sourceEdges.forEach((edge) => {
    if (filteredEdges.length >= edgeLimit) return;
    const fromId = String(edge?.fromEntityId || '').trim();
    const toId = String(edge?.toEntityId || '').trim();
    if (!fromId || !toId || fromId === toId) return;

    const addFrom = nodeMap.has(fromId) ? 0 : 1;
    const addTo = nodeMap.has(toId) ? 0 : 1;
    if (nodeMap.size + addFrom + addTo > nodeLimit) return;

    if (!nodeMap.has(fromId)) {
      nodeMap.set(fromId, {
        id: fromId,
        name: edge.fromName || '未知设定',
        degree: 0
      });
    }
    if (!nodeMap.has(toId)) {
      nodeMap.set(toId, {
        id: toId,
        name: edge.toName || '未知设定',
        degree: 0
      });
    }

    filteredEdges.push({
      id: edge.id || `${fromId}-${edge.type || 'related_to'}-${toId}`,
      fromEntityId: fromId,
      toEntityId: toId,
      typeLabel: edge.typeLabel || edge.type || '关联',
      note: edge.note || ''
    });
  });

  filteredEdges.forEach((edge) => {
    const from = nodeMap.get(edge.fromEntityId);
    const to = nodeMap.get(edge.toEntityId);
    if (from) from.degree += 1;
    if (to) to.degree += 1;
  });

  const nodes = [...nodeMap.values()].sort((a, b) => b.degree - a.degree || a.name.localeCompare(b.name, 'zh-Hans-CN'));
  const centerX = CANVAS_WIDTH / 2;
  const centerY = CANVAS_HEIGHT / 2;
  const radius = Math.max(56, Math.min(CANVAS_WIDTH, CANVAS_HEIGHT) / 2 - 30);
  const nodeCount = nodes.length;
  const minX = 26;
  const maxX = CANVAS_WIDTH - 26;
  const minY = 24;
  const maxY = CANVAS_HEIGHT - 24;

  const layoutNodes = nodes.map((node, index) => {
    const angle = (index / Math.max(nodeCount, 1)) * Math.PI * 2 - Math.PI / 2;
    const spread = radius * (0.72 + Math.min(node.degree, 8) * 0.03);
    const x = centerX + Math.cos(angle) * spread;
    const y = centerY + Math.sin(angle) * spread;
    return {
      ...node,
      x,
      y,
      vx: 0,
      vy: 0,
      radius: Math.min(21, 12 + Math.max(0, node.degree - 1) * 1.2)
    };
  });

  const nodeById = new Map(layoutNodes.map((node) => [node.id, node]));
  const edgePairs = filteredEdges
    .map((edge) => ({
      from: nodeById.get(edge.fromEntityId),
      to: nodeById.get(edge.toEntityId)
    }))
    .filter((edge) => edge.from && edge.to);

  const iterations = 90;
  const repulsion = 820;
  const springLength = 74;
  const springStrength = 0.028;
  const centerPull = 0.011;
  const damping = 0.84;

  for (let step = 0; step < iterations; step += 1) {
    for (let i = 0; i < layoutNodes.length; i += 1) {
      const nodeA = layoutNodes[i];
      for (let j = i + 1; j < layoutNodes.length; j += 1) {
        const nodeB = layoutNodes[j];
        const dx = nodeB.x - nodeA.x;
        const dy = nodeB.y - nodeA.y;
        const distanceSq = dx * dx + dy * dy + 0.01;
        const distance = Math.sqrt(distanceSq);
        const force = repulsion / distanceSq;
        const fx = (force * dx) / distance;
        const fy = (force * dy) / distance;
        nodeA.vx -= fx;
        nodeA.vy -= fy;
        nodeB.vx += fx;
        nodeB.vy += fy;
      }
    }

    edgePairs.forEach(({ from, to }) => {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const distance = Math.sqrt(dx * dx + dy * dy) || 1;
      const stretch = distance - springLength;
      const force = stretch * springStrength;
      const fx = (force * dx) / distance;
      const fy = (force * dy) / distance;
      from.vx += fx;
      from.vy += fy;
      to.vx -= fx;
      to.vy -= fy;
    });

    layoutNodes.forEach((node) => {
      node.vx += (centerX - node.x) * centerPull;
      node.vy += (centerY - node.y) * centerPull;
      node.vx *= damping;
      node.vy *= damping;
      node.x = Math.max(minX, Math.min(maxX, node.x + node.vx));
      node.y = Math.max(minY, Math.min(maxY, node.y + node.vy));
    });
  }

  const nodeWithPos = layoutNodes.map((node) => ({
    ...node,
    vx: undefined,
    vy: undefined
  }));
  const layoutNodeById = new Map(nodeWithPos.map((node) => [node.id, node]));

  const edgeWithPos = filteredEdges
    .map((edge) => {
      const from = layoutNodeById.get(edge.fromEntityId);
      const to = layoutNodeById.get(edge.toEntityId);
      if (!from || !to) return null;
      return {
        ...edge,
        x1: from.x,
        y1: from.y,
        x2: to.x,
        y2: to.y
      };
    })
    .filter(Boolean);

  return { nodes: nodeWithPos, edges: edgeWithPos };
}

function RelationGraphPreviewCard({ edges, relationCount }) {
  const [viewport, setViewport] = useState(DEFAULT_VIEWPORT);
  const [activeNodeId, setActiveNodeId] = useState('');
  const [isPanning, setIsPanning] = useState(false);
  const pointerStateRef = useRef(null);
  const svgRef = useRef(null);

  const graph = useMemo(() => buildGraph(edges), [edges]);
  const nodeNameMap = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node.name])), [graph.nodes]);
  const activeNodeName = activeNodeId ? nodeNameMap.get(activeNodeId) || '未知设定' : '';

  const connectedEdgeIds = useMemo(() => {
    if (!activeNodeId) return new Set();
    return new Set(
      graph.edges
        .filter((edge) => edge.fromEntityId === activeNodeId || edge.toEntityId === activeNodeId)
        .map((edge) => edge.id)
    );
  }, [graph.edges, activeNodeId]);

  const connectedNodeIds = useMemo(() => {
    if (!activeNodeId) return new Set();
    const ids = new Set([activeNodeId]);
    graph.edges.forEach((edge) => {
      if (edge.fromEntityId === activeNodeId) ids.add(edge.toEntityId);
      if (edge.toEntityId === activeNodeId) ids.add(edge.fromEntityId);
    });
    return ids;
  }, [graph.edges, activeNodeId]);

  const selectedEdgeRows = useMemo(() => {
    if (!activeNodeId) return [];
    return graph.edges
      .filter((edge) => connectedEdgeIds.has(edge.id))
      .slice(0, 6)
      .map((edge) => ({
        ...edge,
        fromName: nodeNameMap.get(edge.fromEntityId) || '未知设定',
        toName: nodeNameMap.get(edge.toEntityId) || '未知设定'
      }));
  }, [activeNodeId, connectedEdgeIds, graph.edges, nodeNameMap]);

  const handleReset = () => {
    setViewport(DEFAULT_VIEWPORT);
    setIsPanning(false);
  };

  const handleWheel = (event) => {
    event.preventDefault();
    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;

    setViewport((prev) => {
      const delta = event.deltaY < 0 ? 0.12 : -0.12;
      const nextScale = clampScale(prev.scale + delta);
      if (nextScale === prev.scale) return prev;
      const graphX = (pointerX - prev.x) / prev.scale;
      const graphY = (pointerY - prev.y) / prev.scale;
      const nextX = pointerX - graphX * nextScale;
      const nextY = pointerY - graphY * nextScale;
      return {
        x: nextX,
        y: nextY,
        scale: nextScale
      };
    });
  };

  const handleZoom = (delta) => {
    setViewport((prev) => ({
      ...prev,
      scale: clampScale(prev.scale + delta)
    }));
  };

  const handlePointerDown = (event) => {
    if (event.button !== 0) return;
    const target = event.target;
    if (target?.closest?.('[data-node-id]')) return;
    pointerStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: viewport.x,
      originY: viewport.y
    };
    setIsPanning(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    const state = pointerStateRef.current;
    if (!state || state.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - state.startX;
    const deltaY = event.clientY - state.startY;
    setViewport((prev) => ({
      ...prev,
      x: state.originX + deltaX,
      y: state.originY + deltaY
    }));
  };

  const handlePointerEnd = (event) => {
    const state = pointerStateRef.current;
    if (!state || state.pointerId !== event.pointerId) return;
    pointerStateRef.current = null;
    setIsPanning(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  if (!relationCount || graph.edges.length === 0 || graph.nodes.length === 0) {
    return <p className="helper-text">当前范围暂无可渲染的关系图谱数据。</p>;
  }

  return (
    <div className="relation-graph-card">
      <div className="relation-graph-toolbar">
        <p className="relation-graph-tip">拖拽平移 · 滚轮缩放 · 点击节点高亮</p>
        <div className="relation-graph-controls">
          <button type="button" className="btn-inline btn-inline-secondary" onClick={() => handleZoom(-0.15)}>
            缩小
          </button>
          <button type="button" className="btn-inline btn-inline-secondary" onClick={handleReset}>
            重置
          </button>
          <button type="button" className="btn-inline btn-inline-secondary" onClick={() => handleZoom(0.15)}>
            放大
          </button>
        </div>
      </div>

      <div className="relation-graph-viewport">
        <svg
          ref={svgRef}
          className={`relation-graph-svg ${isPanning ? 'relation-graph-svg-panning' : ''}`}
          viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
        >
          <rect x="0" y="0" width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="relation-graph-bg" />

          <g transform={`translate(${viewport.x} ${viewport.y}) scale(${viewport.scale})`}>
            {graph.edges.map((edge) => {
              const isActive = activeNodeId ? connectedEdgeIds.has(edge.id) : true;
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

            {graph.nodes.map((node) => {
              const isActive = activeNodeId ? connectedNodeIds.has(node.id) : true;
              const isFocus = activeNodeId === node.id;
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
                    setActiveNodeId((prev) => (prev === node.id ? '' : node.id));
                  }}
                >
                  <circle r={node.radius} />
                  <text dy="0.32em">{formatNodeLabel(node.name)}</text>
                  <title>{`${node.name} · 关联度 ${node.degree}`}</title>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {activeNodeId ? (
        <div className="relation-graph-focus-panel">
          <p className="relation-graph-focus-title">
            焦点节点：{activeNodeName}（{selectedEdgeRows.length} 条关系）
          </p>
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
            <p className="helper-text">当前节点暂无可展示关系。</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default RelationGraphPreviewCard;
