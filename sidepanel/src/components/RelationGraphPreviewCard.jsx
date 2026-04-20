import { useEffect, useMemo, useRef, useState } from 'react';
import EmptyStateCard from './EmptyStateCard';
import {
  EDGE_BATCH_PRESET,
  clampScale,
  getCachedGraph,
  resolveGraphProfile
} from './RelationGraphPreview/graphLayout';
import { RelationGraphToolbar } from './RelationGraphPreview/RelationGraphToolbar';
import { RelationGraphStatusPanel } from './RelationGraphPreview/RelationGraphStatusPanel';
import { RelationGraphViewport } from './RelationGraphPreview/RelationGraphViewport';
import { RelationGraphFocusPanel } from './RelationGraphPreview/RelationGraphFocusPanel';

const DEFAULT_VIEWPORT = { x: 0, y: 0, scale: 1 };

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
    graphStatusTips.push('已固定轻量模式');
  } else if (isAutoPerformanceMode) {
    graphStatusTips.push('关系较多，已切轻量模式');
  }
  if (graph.meta?.sourceEdgeCount > graph.meta?.renderedEdgeCount) {
    graphStatusTips.push(
      `首屏显示 ${graph.meta.renderedEdgeCount}/${Math.max(
        graph.meta.sourceEdgeCount,
        relationCount || 0
      )} 条关系`
    );
  }
  if (hiddenEdgeCount > 0) {
    graphStatusTips.push(`还可加载 ${hiddenEdgeCount} 条关系`);
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
        title="还没有可显示的图谱"
        description="先补充关系，再回来看图谱。"
      />
    );
  }

  return (
    <div className="relation-graph-card">
      <RelationGraphToolbar
        detailMode={detailMode}
        onModeChange={setDetailMode}
        onZoomOut={() => handleZoom(-0.15)}
        onReset={handleReset}
        onZoomIn={() => handleZoom(0.15)}
      />

      <RelationGraphStatusPanel
        shouldShowSimplifyTip={shouldShowSimplifyTip}
        isAutoPerformanceMode={isAutoPerformanceMode}
        graphProfile={graphProfile}
        graph={graph}
        relationCount={relationCount}
        graphStatusTips={graphStatusTips}
        visibleGraphEdges={visibleGraphEdges}
        canLoadMoreEdges={canLoadMoreEdges}
        hiddenEdgeCount={hiddenEdgeCount}
        batchPreset={batchPreset}
        onLoadMoreEdges={handleLoadMoreEdges}
      />

      <RelationGraphViewport
        svgRef={svgRef}
        isPanning={isPanning}
        viewport={viewport}
        visibleGraphEdges={visibleGraphEdges}
        resolvedActiveNodeId={resolvedActiveNodeId}
        connectedEdgeIds={connectedEdgeIds}
        visibleGraphNodes={visibleGraphNodes}
        connectedNodeIds={connectedNodeIds}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerEnd={handlePointerEnd}
        onToggleNode={(nodeId) => setActiveNodeId((prev) => (prev === nodeId ? '' : nodeId))}
      />

      {resolvedActiveNodeId ? (
        <RelationGraphFocusPanel
          activeNodeName={activeNodeName}
          selectedEdgeRows={selectedEdgeRows}
          focusDirection={focusDirection}
          onFocusDirectionChange={setFocusDirection}
          onClearFocus={handleClearFocus}
        />
      ) : null}
    </div>
  );
}

export default RelationGraphPreviewCard;
