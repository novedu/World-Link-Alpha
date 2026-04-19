import { Request, Response, NextFunction } from 'express';
import { validateToken } from '../services/authService';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    plan: string;
  };
}

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: '未提供认证令牌',
          details: {},
          fieldErrors: {}
        },
      });
      return;
    }

    const token = authHeader.substring(7);
    const decoded = await validateToken(token);

    if (!decoded) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: '令牌无效或已过期',
          details: {},
          fieldErrors: {}
        },
      });
      return;
    }

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: '认证失败',
        details: {},
        fieldErrors: {}
      },
    });
  }
}

export function optionalAuthMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = authHeader.substring(7);
  validateToken(token)
    .then((decoded) => {
      if (decoded) {
        req.user = decoded;
      }
      next();
    })
    .catch(() => {
      next();
    });
}
