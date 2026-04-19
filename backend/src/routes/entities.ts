import { Router, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { getFieldErrors } from '../utils/validation';
import * as entityService from '../services/entityService';

const router = Router();

// 获取世界下的实体列表
router.get(
  '/',
  authMiddleware,
  [
    query('worldId').isUUID().withMessage('无效的世界ID'),
    query('type').optional().trim(),
    query('tags').optional().trim(),
    query('search').optional().trim(),
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

      const { worldId, type, tags, search } = req.query;
      
      let entities;
      if (search) {
        entities = await entityService.searchEntities(
          req.user!.userId,
          search as string,
          worldId as string,
          type as string,
          tags ? (tags as string).split(',') : undefined
        );
      } else {
        entities = await entityService.getEntitiesByWorld(worldId as string, req.user!.userId);
      }

      res.json({
        success: true,
        data: entities,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 创建实体
router.post(
  '/',
  authMiddleware,
  [
    body('worldId').isUUID().withMessage('无效的世界ID'),
    body('name').trim().notEmpty().withMessage('实体名称不能为空'),
    body('type').trim().notEmpty().withMessage('实体类型不能为空'),
    body('summary').optional().trim(),
    body('tags').optional().isArray(),
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

      const entity = await entityService.createEntity(req.user!.userId, {
        worldId: req.body.worldId,
        name: req.body.name,
        type: req.body.type,
        summary: req.body.summary,
        tags: req.body.tags,
        sourceUrl: req.body.sourceUrl,
        sourceTitle: req.body.sourceTitle,
      });

      res.json({
        success: true,
        data: entity,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 获取实体详情
router.get(
  '/:id',
  authMiddleware,
  [param('id').isUUID().withMessage('无效的实体ID')],
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

      const entity = await entityService.getEntityById(req.params.id, req.user!.userId);
      if (!entity) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '实体不存在',
            details: {},
          },
          meta: {
            requestId: req.headers['x-request-id'] as string || '',
            timestamp: new Date().toISOString(),
          },
        });
      }

      res.json({
        success: true,
        data: entity,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 更新实体
router.put(
  '/:id',
  authMiddleware,
  [
    param('id').isUUID().withMessage('无效的实体ID'),
    body('name').optional().trim().notEmpty().withMessage('实体名称不能为空'),
    body('type').optional().trim(),
    body('summary').optional().trim(),
    body('tags').optional().isArray(),
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

      const entity = await entityService.updateEntity(req.params.id, req.user!.userId, {
        name: req.body.name,
        type: req.body.type,
        summary: req.body.summary,
        tags: req.body.tags,
        sourceUrl: req.body.sourceUrl,
        sourceTitle: req.body.sourceTitle,
      });

      res.json({
        success: true,
        data: entity,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 删除实体
router.delete(
  '/:id',
  authMiddleware,
  [param('id').isUUID().withMessage('无效的实体ID')],
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

      await entityService.deleteEntity(req.params.id, req.user!.userId);
      res.json({
        success: true,
        data: null,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 绑定实体到书项目
router.post(
  '/:id/bind',
  authMiddleware,
  [
    param('id').isUUID().withMessage('无效的实体ID'),
    body('bookId').isUUID().withMessage('无效的书项目ID'),
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

      const usage = await entityService.bindEntityToBook(
        req.params.id,
        req.body.bookId,
        req.user!.userId
      );

      res.json({
        success: true,
        data: usage,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 解绑实体从书项目
router.post(
  '/:id/unbind',
  authMiddleware,
  [
    param('id').isUUID().withMessage('无效的实体ID'),
    body('bookId').isUUID().withMessage('无效的书项目ID'),
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

      await entityService.unbindEntityFromBook(
        req.params.id,
        req.body.bookId,
        req.user!.userId
      );

      res.json({
        success: true,
        data: null,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
