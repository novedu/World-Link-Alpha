import { Router, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { getFieldErrors } from '../utils/validation';
import * as worldService from '../services/worldService';

const router = Router();

// 获取所有世界
router.get('/', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const worlds = await worldService.getWorldsByUser(req.user!.userId);
    res.json({
      success: true,
      data: worlds,
    });
  } catch (error) {
    next(error);
  }
});

// 创建世界
router.post(
  '/',
  authMiddleware,
  [
    body('name').trim().notEmpty().withMessage('世界名称不能为空'),
    body('description').optional().trim(),
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
            fieldErrors: getFieldErrors(errors.array())
          },
          meta: {
            requestId: req.requestId || '',
            timestamp: new Date().toISOString()
          }
        });
      }

      const world = await worldService.createWorld({
        userId: req.user!.userId,
        name: req.body.name,
        description: req.body.description,
      });

      res.json({
        success: true,
        data: world,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 获取世界详情
router.get(
  '/:id',
  authMiddleware,
  [param('id').isUUID().withMessage('无效的世界ID')],
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
            fieldErrors: getFieldErrors(errors.array())
          },
          meta: {
            requestId: req.requestId || '',
            timestamp: new Date().toISOString()
          }
        });
      }

      const world = await worldService.getWorldById(req.params.id, req.user!.userId);
      if (!world) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '世界不存在',
            details: {},
          },
          meta: {
            requestId: req.requestId || '',
            timestamp: new Date().toISOString(),
          },
        });
      }

      res.json({
        success: true,
        data: world,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 更新世界
router.put(
  '/:id',
  authMiddleware,
  [
    param('id').isUUID().withMessage('无效的世界ID'),
    body('name').optional().trim().notEmpty().withMessage('世界名称不能为空'),
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
            fieldErrors: getFieldErrors(errors.array())
          },
          meta: {
            requestId: req.requestId || '',
            timestamp: new Date().toISOString()
          }
        });
      }

      const world = await worldService.updateWorld(req.params.id, req.user!.userId, {
        name: req.body.name,
        description: req.body.description,
      });

      res.json({
        success: true,
        data: world,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 删除世界
router.delete(
  '/:id',
  authMiddleware,
  [param('id').isUUID().withMessage('无效的世界ID')],
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
            fieldErrors: getFieldErrors(errors.array())
          },
          meta: {
            requestId: req.requestId || '',
            timestamp: new Date().toISOString()
          }
        });
      }

      await worldService.deleteWorld(req.params.id, req.user!.userId);
      res.json({
        success: true,
        data: null,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 获取世界统计
router.get(
  '/:id/stats',
  authMiddleware,
  [param('id').isUUID().withMessage('无效的世界ID')],
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
            fieldErrors: getFieldErrors(errors.array())
          },
          meta: {
            requestId: req.requestId || '',
            timestamp: new Date().toISOString()
          }
        });
      }

      const stats = await worldService.getWorldStats(req.params.id, req.user!.userId);
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
