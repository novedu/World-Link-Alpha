import { Router, Response, NextFunction } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import * as authService from '../services/authService';
import { registerSchema, loginSchema } from '../schemas/auth';
import { getFieldErrors } from '../utils/validation';
import type { ZodError, ZodIssue } from 'zod';

const router = Router();

/**
 * @api {post} /api/auth/register 注册新用户
 * @apiName Register
 * @apiGroup Authentication
 * @apiDescription 注册新用户并返回JWT令牌
 * 
 * @apiParam {String} email 用户邮箱
 * @apiParam {String} password 用户密码（至少6位）
 * 
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 认证结果
 * @apiSuccess {Object} data.user 用户信息
 * @apiSuccess {String} data.user.id 用户ID
 * @apiSuccess {String} data.user.email 用户邮箱
 * @apiSuccess {String} data.user.plan 用户计划
 * @apiSuccess {String} data.token JWT令牌
 * 
 * @apiError {Object} error 错误信息
 * @apiError {String} error.code 错误代码
 * @apiError {String} error.message 错误信息
 * @apiError {Object} error.fieldErrors 字段错误
 */

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

/**
 * @api {post} /api/auth/login 用户登录
 * @apiName Login
 * @apiGroup Authentication
 * @apiDescription 用户登录并返回JWT令牌
 * 
 * @apiParam {String} email 用户邮箱
 * @apiParam {String} password 用户密码
 * 
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 认证结果
 * @apiSuccess {Object} data.user 用户信息
 * @apiSuccess {String} data.user.id 用户ID
 * @apiSuccess {String} data.user.email 用户邮箱
 * @apiSuccess {String} data.user.plan 用户计划
 * @apiSuccess {String} data.token JWT令牌
 * 
 * @apiError {Object} error 错误信息
 * @apiError {String} error.code 错误代码
 * @apiError {String} error.message 错误信息
 * @apiError {Object} error.fieldErrors 字段错误
 */

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

/**
 * @api {post} /api/auth/logout 用户登出
 * @apiName Logout
 * @apiGroup Authentication
 * @apiDescription 用户登出，使当前JWT令牌失效
 * 
 * @apiHeader {String} Authorization Bearer {token}
 * 
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 结果（null）
 * 
 * @apiError {Object} error 错误信息
 */

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

/**
 * @api {get} /api/auth/me 获取当前用户信息
 * @apiName GetCurrentUser
 * @apiGroup Authentication
 * @apiDescription 获取当前登录用户的详细信息
 * 
 * @apiHeader {String} Authorization Bearer {token}
 * 
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 用户信息
 * @apiSuccess {String} data.id 用户ID
 * @apiSuccess {String} data.email 用户邮箱
 * @apiSuccess {String} data.plan 用户计划
 * @apiSuccess {String} data.createdAt 创建时间
 * 
 * @apiError {Object} error 错误信息
 */

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
