export interface RouteMetric {
  count: number;
  errorCount: number;
  totalLatencyMs: number;
  maxLatencyMs: number;
  lastStatus: number;
  lastSeenAt: string;
}

type StatusBucket = '2xx' | '3xx' | '4xx' | '5xx';

interface MetricsStore {
  startedAt: number;
  totalRequests: number;
  statusBuckets: Record<StatusBucket, number>;
  routeMetrics: Map<string, RouteMetric>;
}

const metricsStore: MetricsStore = {
  startedAt: Date.now(),
  totalRequests: 0,
  statusBuckets: {
    '2xx': 0,
    '3xx': 0,
    '4xx': 0,
    '5xx': 0,
  },
  routeMetrics: new Map<string, RouteMetric>(),
};

function getStatusBucket(statusCode: number): StatusBucket {
  if (statusCode >= 500) return '5xx';
  if (statusCode >= 400) return '4xx';
  if (statusCode >= 300) return '3xx';
  return '2xx';
}

export function recordHttpMetric(routeKey: string, statusCode: number, latencyMs: number) {
  metricsStore.totalRequests += 1;
  metricsStore.statusBuckets[getStatusBucket(statusCode)] += 1;

  const key = routeKey || 'unknown';
  const previous = metricsStore.routeMetrics.get(key);
  const current: RouteMetric = previous || {
    count: 0,
    errorCount: 0,
    totalLatencyMs: 0,
    maxLatencyMs: 0,
    lastStatus: statusCode,
    lastSeenAt: new Date().toISOString(),
  };

  current.count += 1;
  current.errorCount += statusCode >= 500 ? 1 : 0;
  current.totalLatencyMs += latencyMs;
  current.maxLatencyMs = Math.max(current.maxLatencyMs, latencyMs);
  current.lastStatus = statusCode;
  current.lastSeenAt = new Date().toISOString();

  metricsStore.routeMetrics.set(key, current);
}

export function getMetricsSnapshot() {
  const now = Date.now();
  const routeRows = [...metricsStore.routeMetrics.entries()]
    .map(([route, metric]) => ({
      route,
      count: metric.count,
      errorCount: metric.errorCount,
      avgLatencyMs: metric.count > 0 ? Number((metric.totalLatencyMs / metric.count).toFixed(2)) : 0,
      maxLatencyMs: metric.maxLatencyMs,
      lastStatus: metric.lastStatus,
      lastSeenAt: metric.lastSeenAt,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    startedAt: new Date(metricsStore.startedAt).toISOString(),
    uptimeSeconds: Math.floor((now - metricsStore.startedAt) / 1000),
    totalRequests: metricsStore.totalRequests,
    statusBuckets: metricsStore.statusBuckets,
    routes: routeRows,
  };
}
