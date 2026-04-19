import { Router, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { getFieldErrors } from '../utils/validation';
import * as bookService from '../services/bookService';

const router = Router();

// 获取世界下的书项目列表
router.get(
  '/',
  authMiddleware,
  [query('worldId').isUUID().withMessage('无效的世界ID')],
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

      const books = await bookService.getBooksByWorld(
        req.query.worldId as string,
        req.user!.userId
      );

      res.json({
        success: true,
        data: books,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 创建书项目
router.post(
  '/',
  authMiddleware,
  [
    body('worldId').isUUID().withMessage('无效的世界ID'),
    body('title').trim().notEmpty().withMessage('书项目标题不能为空'),
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

      const book = await bookService.createBook(req.user!.userId, {
        worldId: req.body.worldId,
        title: req.body.title,
        description: req.body.description,
      });

      res.json({
        success: true,
        data: book,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 获取书项目详情
router.get(
  '/:id',
  authMiddleware,
  [param('id').isUUID().withMessage('无效的书项目ID')],
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

      const book = await bookService.getBookById(req.params.id, req.user!.userId);
      if (!book) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '书项目不存在',
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
        data: book,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 更新书项目
router.put(
  '/:id',
  authMiddleware,
  [
    param('id').isUUID().withMessage('无效的书项目ID'),
    body('title').optional().trim().notEmpty().withMessage('书项目标题不能为空'),
    body('description').optional().trim(),
    body('status').optional().isIn(['active', 'archived']),
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

      const book = await bookService.updateBook(req.params.id, req.user!.userId, {
        title: req.body.title,
        description: req.body.description,
        status: req.body.status,
      });

      res.json({
        success: true,
        data: book,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 删除书项目
router.delete(
  '/:id',
  authMiddleware,
  [param('id').isUUID().withMessage('无效的书项目ID')],
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

      await bookService.deleteBook(req.params.id, req.user!.userId);
      res.json({
        success: true,
        data: null,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 获取书项目的实体列表
router.get(
  '/:id/entities',
  authMiddleware,
  [param('id').isUUID().withMessage('无效的书项目ID')],
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

      const entities = await bookService.getBookEntities(req.params.id, req.user!.userId);
      res.json({
        success: true,
        data: entities,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
