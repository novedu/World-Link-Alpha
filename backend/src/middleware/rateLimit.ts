import type { NextFunction, Request, Response } from 'express';

interface Bucket {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  name: string;
  windowMs: number;
  maxRequests: number;
}

const buckets = new Map<string, Bucket>();

function getClientKey(req: Request): string {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const ip = forwarded || req.ip || req.socket.remoteAddress || 'unknown';
  return `${ip}:${req.baseUrl || ''}`;
}

function setRateLimitHeaders(res: Response, maxRequests: number, remaining: number, resetAt: number) {
  res.setHeader('x-ratelimit-limit', String(maxRequests));
  res.setHeader('x-ratelimit-remaining', String(Math.max(remaining, 0)));
  res.setHeader('x-ratelimit-reset', String(Math.floor(resetAt / 1000)));
}

export function createRateLimiter(options: RateLimitOptions) {
  const { name, windowMs, maxRequests } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${name}:${getClientKey(req)}`;
    const now = Date.now();
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      const resetAt = now + windowMs;
      buckets.set(key, { count: 1, resetAt });
      setRateLimitHeaders(res, maxRequests, maxRequests - 1, resetAt);
      next();
      return;
    }

    current.count += 1;
    const remaining = maxRequests - current.count;
    setRateLimitHeaders(res, maxRequests, remaining, current.resetAt);

    if (current.count > maxRequests) {
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: '请求过于频繁，请稍后重试',
          details: {},
          fieldErrors: {},
        },
        meta: {
          requestId: req.requestId || '',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    next();
  };
}

// 避免 Map 无限膨胀，定时清理已过期桶
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of buckets.entries()) {
    if (value.resetAt <= now) {
      buckets.delete(key);
    }
  }
}, 60_000).unref();
