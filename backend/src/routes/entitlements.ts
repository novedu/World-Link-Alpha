import { Router, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import * as entitlementService from '../services/entitlementService';
import { getFieldErrors } from '../utils/validation';

const router = Router();

// 获取用户配额
router.get('/', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await entitlementService.getEntitlementWithUsage(req.user!.userId);
    
    res.json({
      success: true,
      data: data,
    });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/exports/consume',
  authMiddleware,
  [body('format').isIn(['markdown', 'json']).withMessage('导出格式必须是 markdown 或 json')],
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

      const result = await entitlementService.consumeExport(
        req.user!.userId,
        req.body.format as 'markdown' | 'json'
      );

      return res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
