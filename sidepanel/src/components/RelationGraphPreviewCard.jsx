import { useEffect, useMemo, useRef, useState } from 'react';
import EmptyStateCard from './EmptyStateCard';

const CANVAS_WIDTH = 320;
const CANVAS_HEIGHT = 220;
const MIN_SCALE = 0.75;
const MAX_SCALE = 2.4;
const DEFAULT_VIEWPORT = { x: 0, y: 0, scale: 1 };
const GRAPH_CACHE_LIMIT = 24;
const graphLayoutCache = new Map();

function cleanupCache() {
  if (graphLayoutCache.size > GRAPH_CACHE_LIMIT) {
    const entries = Array.from(graphLayoutCache.entries());
    entries.sort((a, b) => {
      const aTime = a[1].cachedAt || 0;
      const bTime = b[1].cachedAt || 0;
      return aTime - bTime;
    });
    const toRemove = entries.slice(0, graphLayoutCache.size - GRAPH_CACHE_LIMIT);
    toRemove.forEach(([key]) => graphLayoutCache.delete(key));
  }
}
const GRAPH_PROFILE_PRESET = {
  standard: {
    key: 'standard',
    label: '标准',
    nodeLimit: 18,
    edgeLimit: 42,
    iterations: 70
  },
  performance: {
    key: 'performance',
    label: '轻量',
    nodeLimit: 14,
    edgeLimit: 28,
    iterations: 52
  }
};
const EDGE_BATCH_PRESET = {
  standard: {
    initial: 20,
    step: 10
  },
  performance: {
    initial: 12,
    step: 8
  }
};

function clampScale(value) {
  return Math.max(MIN_SCALE, Math.min(MAX_SCALE, value));
}

function formatNodeLabel(name) {
  const raw = String(name || '');
  if (raw.length <= 5) return raw;
  return `${raw.slice(0, 5)}…`;
}

function resolveGraphProfile(detailMode, relationCount) {
  if (detailMode === 'performance') return GRAPH_PROFILE_PRESET.performance;
  if (detailMode === 'standard') return GRAPH_PROFILE_PRESET.standard;
  if (Number(relationCount || 0) >= 70) return GRAPH_PROFILE_PRESET.performance;
  return GRAPH_PROFILE_PRESET.standard;
}

function buildGraphCacheKey(edges, profileKey) {
  const sourceEdges = Array.isArray(edges) ? edges : [];
  if (sourceEdges.length === 0) return 'empty';
  const signature = sourceEdges
    .slice(0, 60)
    .map((edge) => `${edge?.fromEntityId || ''}|${edge?.type || ''}|${edge?.toEntityId || ''}`)
    .join(';');
  return `${profileKey || 'default'}#${sourceEdges.length}#${signature}`;
}

function getCachedGraph(edges, profile) {
  const key = buildGraphCacheKey(edges, profile?.key);
  if (graphLayoutCache.has(key)) {
    const cached = graphLayoutCache.get(key);
    const updatedCache = {
      ...cached,
      cachedAt: Date.now()
    };
    graphLayoutCache.delete(key);
    graphLayoutCache.set(key, updatedCache);
    return updatedCache;
  }
  const next = buildGraph(edges, profile);
  const cacheEntry = {
    ...next,
    cachedAt: Date.now()
  };
  graphLayoutCache.set(key, cacheEntry);
  cleanupCache();
  return next;
}

function buildGraph(edges, profile) {
  const sourceEdges = Array.isArray(edges) ? edges : [];
  if (sourceEdges.length === 0) {
    return {
      nodes: [],
      edges: [],
      meta: {
        profileKey: profile?.key || 'standard',
        sourceEdgeCount: 0,
        renderedEdgeCount: 0,
        renderedNodeCount: 0,
        edgeLimit: profile?.edgeLimit || GRAPH_PROFILE_PRESET.standard.edgeLimit,
        nodeLimit: profile?.nodeLimit || GRAPH_PROFILE_PRESET.standard.nodeLimit
      }
    };
  }

  const resolvedProfile = profile || GRAPH_PROFILE_PRESET.standard;
  const nodeLimit = resolvedProfile.nodeLimit;
  const edgeLimit = resolvedProfile.edgeLimit;
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

  const iterations = Math.max(
    30,
    Math.round((resolvedProfile.iterations || 60) * (nodeCount <= 10 ? 1 : nodeCount <= 14 ? 0.85 : 0.75))
  );
  const repulsion = 750;
  const springLength = 70;
  const springStrength = 0.025;
  const centerPull = 0.01;
  const damping = 0.85;

  for (let step = 0; step < iterations; step += 1) {
    let totalRepulsionForce = 0;
    for (let i = 0; i < layoutNodes.length; i += 1) {
      const nodeA = layoutNodes[i];
      for (let j = i + 1; j < layoutNodes.length; j += 1) {
        const nodeB = layoutNodes[j];
        const dx = nodeB.x - nodeA.x;
        const dy = nodeB.y - nodeA.y;
        const distanceSq = dx * dx + dy * dy;
        if (distanceSq < 0.01) continue;
        const distance = Math.sqrt(distanceSq);
        if (distance > 150) continue;
        const force = repulsion / distanceSq;
        const fx = (force * dx) / distance;
        const fy = (force * dy) / distance;
        nodeA.vx -= fx;
        nodeA.vy -= fy;
        nodeB.vx += fx;
        nodeB.vy += fy;
        totalRepulsionForce += Math.abs(fx) + Math.abs(fy);
      }
    }

    edgePairs.forEach(({ from, to }) => {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const distanceSq = dx * dx + dy * dy;
      const distance = Math.sqrt(distanceSq) || 1;
      const stretch = distance - springLength;
      const force = stretch * springStrength;
      const fx = (force * dx) / distance;
      const fy = (force * dy) / distance;
      from.vx += fx;
      from.vy += fy;
      to.vx -= fx;
      to.vy -= fy;
    });

    let totalVelocity = 0;
    layoutNodes.forEach((node) => {
      node.vx += (centerX - node.x) * centerPull;
      node.vy += (centerY - node.y) * centerPull;
      node.vx *= damping;
      node.vy *= damping;
      node.x = Math.max(minX, Math.min(maxX, node.x + node.vx));
      node.y = Math.max(minY, Math.min(maxY, node.y + node.vy));
      totalVelocity += Math.abs(node.vx) + Math.abs(node.vy);
    });

    if (totalVelocity / Math.max(layoutNodes.length, 1) < 0.05 || totalRepulsionForce < 0.1) {
      break;
    }
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

  return {
    nodes: nodeWithPos,
    edges: edgeWithPos,
    meta: {
      profileKey: resolvedProfile.key,
      sourceEdgeCount: sourceEdges.length,
      renderedEdgeCount: edgeWithPos.length,
      renderedNodeCount: nodeWithPos.length,
      edgeLimit,
      nodeLimit
    }
  };
}

function RelationGraphPreviewCard({ edges, relationCount }) {
  const [detailMode, setDetailMode] = useState('auto');
  const [focusDirection, setFocusDirection] = useState('all');
  const [viewport, setViewport] = useState(DEFAULT_VIEWPORT);
  const [activeNodeId, setActiveNodeId] = useState('');
  const [edgeCursorByGraphKey, setEdgeCursorByGraphKey] = useState({});
  const [isPanning, setIsPanning] = useState(false);
  const pointerStateRef = useRef(null);
  const pendingPanRef = useRef(null);
  const panRafRef = useRef(0);
  const svgRef = useRef(null);

  useEffect(() => () => {
    if (panRafRef.current) {
      cancelAnimationFrame(panRafRef.current);
    }
  }, []);

  const graphProfile = useMemo(
    () => resolveGraphProfile(detailMode, relationCount),
    [detailMode, relationCount]
  );
  const graph = useMemo(() => getCachedGraph(edges, graphProfile), [edges, graphProfile]);
  const nodeNameMap = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node.name])), [graph.nodes]);
  const resolvedActiveNodeId = activeNodeId && nodeNameMap.has(activeNodeId) ? activeNodeId : '';
  const activeNodeName = resolvedActiveNodeId ? nodeNameMap.get(resolvedActiveNodeId) || '未知设定' : '';
  const graphBatchKey = `${graphProfile.key}-${graph.meta?.sourceEdgeCount || 0}-${graph.meta?.renderedEdgeCount || 0}-${graph.meta?.renderedNodeCount || 0}`;
  const batchPreset = EDGE_BATCH_PRESET[graphProfile.key] || EDGE_BATCH_PRESET.standard;
  const defaultEdgeLimit = Math.min(batchPreset.initial, graph.edges.length);
  const currentEdgeLimit = Math.min(
    graph.edges.length,
    edgeCursorByGraphKey[graphBatchKey] == null ? defaultEdgeLimit : edgeCursorByGraphKey[graphBatchKey]
  );
  const isAutoPerformanceMode = detailMode === 'auto' && graphProfile.key === 'performance';
  const shouldShowSimplifyTip =
    graph.meta &&
    (graph.meta.sourceEdgeCount > graph.meta.renderedEdgeCount || graphProfile.key === 'performance');
  const limitedGraphEdges = useMemo(
    () => graph.edges.slice(0, currentEdgeLimit),
    [graph.edges, currentEdgeLimit]
  );
  const visibleGraphEdges = useMemo(() => {
    if (!resolvedActiveNodeId) return limitedGraphEdges;
    const activeEdges = graph.edges.filter(
      (edge) => edge.fromEntityId === resolvedActiveNodeId || edge.toEntityId === resolvedActiveNodeId
    );
    const edgeMap = new Map();
    [...limitedGraphEdges, ...activeEdges].forEach((edge) => {
      edgeMap.set(edge.id, edge);
    });
    return [...edgeMap.values()];
  }, [limitedGraphEdges, graph.edges, resolvedActiveNodeId]);
  const visibleNodeIds = useMemo(() => {
    const ids = new Set();
    visibleGraphEdges.forEach((edge) => {
      ids.add(edge.fromEntityId);
      ids.add(edge.toEntityId);
    });
    if (resolvedActiveNodeId) {
      ids.add(resolvedActiveNodeId);
    }
    if (ids.size === 0) {
      graph.nodes.slice(0, 8).forEach((node) => ids.add(node.id));
    }
    return ids;
  }, [visibleGraphEdges, resolvedActiveNodeId, graph.nodes]);
  const visibleGraphNodes = useMemo(
    () => graph.nodes.filter((node) => visibleNodeIds.has(node.id)),
    [graph.nodes, visibleNodeIds]
  );
  const canLoadMoreEdges = currentEdgeLimit < graph.edges.length;
  const hiddenEdgeCount = Math.max(0, graph.edges.length - currentEdgeLimit);
  const graphStatusTips = [];
  if (detailMode === 'performance') {
    graphStatusTips.push('当前已固定为轻量模式，优先保证交互流畅性');
  } else if (isAutoPerformanceMode) {
    graphStatusTips.push('关系规模较大，系统已自动切换为轻量模式');
  }
  if (graph.meta?.sourceEdgeCount > graph.meta?.renderedEdgeCount) {
    graphStatusTips.push(
      `为保证首帧性能，仅渲染 ${graph.meta.renderedEdgeCount}/${Math.max(
        graph.meta.sourceEdgeCount,
        relationCount || 0
      )} 条关系`
    );
  }
  if (hiddenEdgeCount > 0) {
    graphStatusTips.push(`还有 ${hiddenEdgeCount} 条关系可通过“加载更多”继续查看`);
  }

  const connectedEdgeIds = useMemo(() => {
    if (!resolvedActiveNodeId) return new Set();
    return new Set(
      graph.edges
        .filter((edge) => edge.fromEntityId === resolvedActiveNodeId || edge.toEntityId === resolvedActiveNodeId)
        .map((edge) => edge.id)
    );
  }, [graph.edges, resolvedActiveNodeId]);

  const connectedNodeIds = useMemo(() => {
    if (!resolvedActiveNodeId) return new Set();
    const ids = new Set([resolvedActiveNodeId]);
    graph.edges.forEach((edge) => {
      if (edge.fromEntityId === resolvedActiveNodeId) ids.add(edge.toEntityId);
      if (edge.toEntityId === resolvedActiveNodeId) ids.add(edge.fromEntityId);
    });
    return ids;
  }, [graph.edges, resolvedActiveNodeId]);

  const selectedEdgeRows = useMemo(() => {
    if (!resolvedActiveNodeId) return [];
    return graph.edges
      .filter((edge) => {
        if (!connectedEdgeIds.has(edge.id)) return false;
        if (focusDirection === 'out') return edge.fromEntityId === resolvedActiveNodeId;
        if (focusDirection === 'in') return edge.toEntityId === resolvedActiveNodeId;
        return true;
      })
      .slice(0, 6)
      .map((edge) => ({
        ...edge,
        fromName: nodeNameMap.get(edge.fromEntityId) || '未知设定',
        toName: nodeNameMap.get(edge.toEntityId) || '未知设定'
      }));
  }, [resolvedActiveNodeId, connectedEdgeIds, graph.edges, nodeNameMap, focusDirection]);

  const handleReset = () => {
    setViewport(DEFAULT_VIEWPORT);
    setIsPanning(false);
  };
  const handleLoadMoreEdges = () => {
    setEdgeCursorByGraphKey((prev) => {
      const current = prev[graphBatchKey] == null ? defaultEdgeLimit : prev[graphBatchKey];
      return {
        ...prev,
        [graphBatchKey]: Math.min(graph.edges.length, current + batchPreset.step)
      };
    });
  };
  const handleClearFocus = () => {
    setActiveNodeId('');
    setFocusDirection('all');
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
    pendingPanRef.current = {
      x: state.originX + deltaX,
      y: state.originY + deltaY
    };
    if (!panRafRef.current) {
      panRafRef.current = requestAnimationFrame(() => {
        const pending = pendingPanRef.current;
        if (pending) {
          setViewport((prev) => ({
            ...prev,
            x: pending.x,
            y: pending.y
          }));
        }
        panRafRef.current = 0;
      });
    }
  };

  const handlePointerEnd = (event) => {
    const state = pointerStateRef.current;
    if (!state || state.pointerId !== event.pointerId) return;
    const pending = pendingPanRef.current;
    if (pending) {
      setViewport((prev) => ({
        ...prev,
        x: pending.x,
        y: pending.y
      }));
    }
    pendingPanRef.current = null;
    if (panRafRef.current) {
      cancelAnimationFrame(panRafRef.current);
      panRafRef.current = 0;
    }
    pointerStateRef.current = null;
    setIsPanning(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  if (!relationCount || graph.edges.length === 0 || graph.nodes.length === 0) {
    return (
      <EmptyStateCard
        compact
        icon="图"
        title="当前范围暂无可渲染的关系图谱数据"
        description="补充设定关系后可查看图谱。"
      />
    );
  }

  return (
    <div className="relation-graph-card">
      <div className="relation-graph-toolbar">
        <p className="relation-graph-tip">拖拽平移 · 滚轮缩放 · 点击节点高亮</p>
        <div className="relation-graph-controls">
          <select
            className="field-input relation-graph-mode-select"
            value={detailMode}
            onChange={(event) => setDetailMode(event.target.value)}
            title="渲染模式"
          >
            <option value="auto">自动</option>
            <option value="standard">标准</option>
            <option value="performance">轻量</option>
          </select>
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
      {shouldShowSimplifyTip ? (
        <p className="relation-graph-perf-tip">
          {isAutoPerformanceMode ? '已自动切换轻量渲染' : `当前渲染模式：${graphProfile.label}`} ·
          显示 {graph.meta.renderedEdgeCount}/{Math.max(graph.meta.sourceEdgeCount, relationCount || 0)} 条关系
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
          当前渲染 {visibleGraphEdges.length}/{graph.edges.length} 条图谱边
        </span>
        {canLoadMoreEdges ? (
          <button type="button" className="btn-inline btn-inline-secondary" onClick={handleLoadMoreEdges}>
            加载更多（+{Math.min(hiddenEdgeCount, batchPreset.step)}）
          </button>
        ) : null}
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

      {resolvedActiveNodeId ? (
        <div className="relation-graph-focus-panel">
          <div className="relation-graph-focus-head">
            <p className="relation-graph-focus-title">
              焦点节点：{activeNodeName}（{selectedEdgeRows.length} 条关系）
            </p>
            <div className="relation-graph-focus-filters">
              <button
                type="button"
                className={`focus-filter-btn ${focusDirection === 'all' ? 'focus-filter-btn-active' : ''}`}
                onClick={() => setFocusDirection('all')}
              >
                全部
              </button>
              <button
                type="button"
                className={`focus-filter-btn ${focusDirection === 'out' ? 'focus-filter-btn-active' : ''}`}
                onClick={() => setFocusDirection('out')}
              >
                发出
              </button>
              <button
                type="button"
                className={`focus-filter-btn ${focusDirection === 'in' ? 'focus-filter-btn-active' : ''}`}
                onClick={() => setFocusDirection('in')}
              >
                指向
              </button>
              <button type="button" className="focus-filter-btn focus-filter-btn-clear" onClick={handleClearFocus}>
                清除焦点
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
              title="当前节点暂无可展示关系"
              description="可切换方向过滤，或清除焦点后回到全图浏览。"
              actions={
                focusDirection !== 'all'
                  ? [
                      { label: '切回全部方向', onClick: () => setFocusDirection('all') },
                      { label: '清除焦点', onClick: handleClearFocus }
                    ]
                  : [{ label: '清除焦点', onClick: handleClearFocus }]
              }
            />
          )}
        </div>
      ) : null}
    </div>
  );
}

export default RelationGraphPreviewCard;
