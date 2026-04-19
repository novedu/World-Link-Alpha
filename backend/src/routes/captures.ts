import { Router, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { getFieldErrors } from '../utils/validation';
import * as captureService from '../services/captureService';

const router = Router();

// 获取捕获记录列表
router.get(
  '/',
  authMiddleware,
  [
    query('status').optional().isIn(['inbox', 'organized', 'converted']),
    query('source').optional().trim(),
    query('timeRange').optional().isIn(['24h', '7d', '30d', 'all']),
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
            requestId: req.headers['x-request-id'] as string || '',
            timestamp: new Date().toISOString()
          }
        });
      }

      const captures = await captureService.getCapturesByUser(req.user!.userId, {
        status: req.query.status as string,
        sourceDomain: req.query.source as string,
        timeRange: req.query.timeRange as string,
      });

      res.json({
        success: true,
        data: captures,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 创建捕获记录
router.post(
  '/',
  authMiddleware,
  [
    body('text').trim().notEmpty().withMessage('捕获文本不能为空'),
    body('sourceUrl').optional().trim(),
    body('sourceTitle').optional().trim(),
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
            requestId: req.headers['x-request-id'] as string || '',
            timestamp: new Date().toISOString()
          }
        });
      }

      const capture = await captureService.createCapture({
        userId: req.user!.userId,
        text: req.body.text,
        sourceUrl: req.body.sourceUrl,
        sourceTitle: req.body.sourceTitle,
      });

      res.json({
        success: true,
        data: capture,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 获取捕获记录详情
router.get(
  '/:id',
  authMiddleware,
  [param('id').isUUID().withMessage('无效的捕获记录ID')],
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
            requestId: req.headers['x-request-id'] as string || '',
            timestamp: new Date().toISOString()
          }
        });
      }

      const capture = await captureService.getCaptureById(req.params.id, req.user!.userId);
      if (!capture) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '捕获记录不存在',
            details: {},
            fieldErrors: {}
          },
          meta: {
            requestId: req.headers['x-request-id'] as string || '',
            timestamp: new Date().toISOString()
          }
        });
      }

      res.json({
        success: true,
        data: capture,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 更新捕获记录
router.put(
  '/:id',
  authMiddleware,
  [
    param('id').isUUID().withMessage('无效的捕获记录ID'),
    body('status').optional().isIn(['inbox', 'organized', 'converted']),
    body('entityId').optional().isUUID(),
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
            requestId: req.headers['x-request-id'] as string || '',
            timestamp: new Date().toISOString()
          }
        });
      }

      const capture = await captureService.updateCapture(
        req.params.id,
        req.user!.userId,
        {
          status: req.body.status,
          entityId: req.body.entityId,
        }
      );

      res.json({
        success: true,
        data: capture,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 删除捕获记录
router.delete(
  '/:id',
  authMiddleware,
  [param('id').isUUID().withMessage('无效的捕获记录ID')],
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
            requestId: req.headers['x-request-id'] as string || '',
            timestamp: new Date().toISOString()
          }
        });
      }

      await captureService.deleteCapture(req.params.id, req.user!.userId);
      res.json({
        success: true,
        data: null,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 标记捕获记录为已转换
router.post(
  '/:id/convert',
  authMiddleware,
  [
    param('id').isUUID().withMessage('无效的捕获记录ID'),
    body('entityId').isUUID().withMessage('无效的实体ID'),
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
            requestId: req.headers['x-request-id'] as string || '',
            timestamp: new Date().toISOString()
          }
        });
      }

      const capture = await captureService.markCaptureAsConverted(
        req.params.id,
        req.body.entityId,
        req.user!.userId
      );

      res.json({
        success: true,
        data: capture,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 获取捕获统计
router.get(
  '/stats/overview',
  authMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const stats = await captureService.getCaptureStats(req.user!.userId);
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
