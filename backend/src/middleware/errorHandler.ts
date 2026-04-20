import { Request, Response, NextFunction } from 'express';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: Record<string, unknown>;
  fieldErrors?: Record<string, string>;
}

export function errorHandler(
  err: ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error('[Error]', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || '服务器内部错误';

  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: message,
      details: err.details || {},
      fieldErrors: err.fieldErrors || {}
    },
    meta: {
      requestId: req.requestId || '',
      timestamp: new Date().toISOString()
    }
  });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: '接口不存在',
      details: {},
      fieldErrors: {}
    },
    meta: {
      requestId: req.requestId || '',
      timestamp: new Date().toISOString()
    }
  });
}
