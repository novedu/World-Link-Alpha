const CANVAS_WIDTH = 320;
const CANVAS_HEIGHT = 220;
const MIN_SCALE = 0.75;
const MAX_SCALE = 2.4;
const GRAPH_CACHE_LIMIT = 24;

const graphLayoutCache = new Map();

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

export const EDGE_BATCH_PRESET = {
  standard: {
    initial: 20,
    step: 10
  },
  performance: {
    initial: 12,
    step: 8
  }
};

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

export function clampScale(value) {
  return Math.max(MIN_SCALE, Math.min(MAX_SCALE, value));
}

export function formatNodeLabel(name) {
  const raw = String(name || '');
  if (raw.length <= 5) return raw;
  return `${raw.slice(0, 5)}…`;
}

export function resolveGraphProfile(detailMode, relationCount) {
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

export function getCachedGraph(edges, profile) {
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

export { CANVAS_WIDTH, CANVAS_HEIGHT };
