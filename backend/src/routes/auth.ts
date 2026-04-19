import { Router, Response, NextFunction } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import * as authService from '../services/authService';
import { registerSchema, loginSchema } from '../schemas/auth';
import { getFieldErrors } from '../utils/validation';
import type { ZodError, ZodIssue } from 'zod';

const router = Router();

// 注册（使用 Zod 验证）
router.post(
  '/register',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = registerSchema.safeParse(req.body);
      if (!result.success) {
        const fieldErrors = getFieldErrors(
          (result.error as ZodError).issues.map(
            (issue: ZodIssue) => ({
              path: issue.path.join('.'),
              msg: issue.message
            })
          )
        );
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '请求参数校验失败',
            details: {},
            fieldErrors
          },
          meta: {
            requestId: req.requestId || '',
            timestamp: new Date().toISOString()
          }
        });
      }

      const authResult = await authService.registerUser({
        email: result.data.email,
        password: result.data.password
      });
      res.json({
        success: true,
        data: authResult,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 登录（使用 Zod 验证）
router.post(
  '/login',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = loginSchema.safeParse(req.body);
      if (!result.success) {
        const fieldErrors = getFieldErrors(
          (result.error as ZodError).issues.map(
            (issue: ZodIssue) => ({
              path: issue.path.join('.'),
              msg: issue.message
            })
          )
        );
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '请求参数校验失败',
            details: {},
            fieldErrors
          },
          meta: {
            requestId: req.requestId || '',
            timestamp: new Date().toISOString()
          }
        });
      }

      const authResult = await authService.loginUser({
        email: result.data.email,
        password: result.data.password
      });
      res.json({
        success: true,
        data: authResult,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 登出
router.post('/logout', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.substring(7) || '';
    await authService.logoutUser(token);
    res.json({
      success: true,
      data: null,
    });
  } catch (error) {
    next(error);
  }
});

// 获取当前用户
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await authService.getUserById(req.user!.userId);
    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
