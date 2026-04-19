import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

function normalizeIncomingRequestId(value: unknown): string {
  const raw = String(value || '').trim();
  if (!raw) return '';
  // 仅保留常见安全字符，避免日志污染
  if (!/^[A-Za-z0-9._:-]{6,128}$/.test(raw)) return '';
  return raw;
}

export function requestContextMiddleware(req: Request, res: Response, next: NextFunction) {
  const incomingRequestId = normalizeIncomingRequestId(req.headers['x-request-id']);
  const requestId = incomingRequestId || randomUUID();

  req.requestId = requestId;
  req.requestStartTimeMs = Date.now();

  res.setHeader('x-request-id', requestId);
  next();
}
