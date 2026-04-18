import { Router, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import * as authService from '../services/authService';

const router = Router();

// 注册
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail().withMessage('请输入有效的邮箱'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('密码长度至少为6位'),
  ],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '请求参数校验失败',
            details: {},
            fieldErrors: errors.array().reduce((acc, err) => {
              acc[err.path || 'unknown'] = err.msg;
              return acc;
            }, {})
          },
          meta: {
            requestId: req.headers['x-request-id'] as string || '',
            timestamp: new Date().toISOString()
          }
        });
      }

      const result = await authService.registerUser(req.body);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 登录
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('请输入有效的邮箱'),
    body('password').notEmpty().withMessage('请输入密码'),
  ],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '请求参数校验失败',
            details: {},
            fieldErrors: errors.array().reduce((acc, err) => {
              acc[err.path || 'unknown'] = err.msg;
              return acc;
            }, {})
          },
          meta: {
            requestId: req.headers['x-request-id'] as string || '',
            timestamp: new Date().toISOString()
          }
        });
      }

      const result = await authService.loginUser(req.body);
      res.json({
        success: true,
        data: result,
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
