import type { NextFunction, Request, Response } from 'express';
import { recordHttpMetric } from '../observability/metrics';

function resolveRouteKey(req: Request): string {
  const path = String(req.originalUrl || req.url || '/').split('?')[0] || '/';
  return `${req.method} ${path}`;
}

export function requestMetricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const routeKey = resolveRouteKey(req);
  const startedAt = req.requestStartTimeMs || Date.now();

  res.on('finish', () => {
    const elapsedMs = Date.now() - startedAt;
    recordHttpMetric(routeKey, res.statusCode, elapsedMs);

    // 输出结构化日志，便于后续接日志平台
    console.log(
      JSON.stringify({
        level: 'info',
        type: 'http_access',
        requestId: req.requestId || '',
        method: req.method,
        path: routeKey.replace(`${req.method} `, ''),
        status: res.statusCode,
        durationMs: elapsedMs,
        at: new Date().toISOString(),
      })
    );
  });

  next();
}
