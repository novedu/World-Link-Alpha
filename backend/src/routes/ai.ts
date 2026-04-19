import { Router, Request, Response, NextFunction } from 'express';
import { entityAssist, entityConflict, reportAiFeedback, generateImage } from '../services/aiService';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/entity-assist', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { text, mode, assistProfile, contextEntities } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '文本内容不能为空',
          details: {},
          fieldErrors: { text: '文本内容不能为空' }
        },
        meta: {
          requestId: req.headers['x-request-id'] as string || '',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (!['summarize', 'expand'].includes(mode)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '模式必须是 summarize 或 expand',
          details: {},
          fieldErrors: { mode: '模式必须是 summarize 或 expand' }
        },
        meta: {
          requestId: req.headers['x-request-id'] as string || '',
          timestamp: new Date().toISOString()
        }
      });
    }

    const result = await entityAssist({ text, mode, assistProfile, contextEntities });

    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

router.post('/entity-conflict', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { targetEntity, contextEntities, worldContext } = req.body;

    if (!targetEntity?.name) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '目标实体名称不能为空',
          details: {},
          fieldErrors: { targetEntity: '目标实体名称不能为空' }
        },
        meta: {
          requestId: req.headers['x-request-id'] as string || '',
          timestamp: new Date().toISOString()
        }
      });
    }

    const result = await entityConflict({ targetEntity, contextEntities, worldContext });

    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

router.post('/report-feedback', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, feedback } = req.body;

    if (!['assist', 'conflict'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '反馈类型必须是 assist 或 conflict',
          details: {},
          fieldErrors: { type: '反馈类型必须是 assist 或 conflict' }
        },
        meta: {
          requestId: req.headers['x-request-id'] as string || '',
          timestamp: new Date().toISOString()
        }
      });
    }

    const result = await reportAiFeedback(type, feedback);

    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

router.post('/generate-image', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { prompt, entityType, style } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '生成图片的提示词不能为空',
          details: {},
          fieldErrors: { prompt: '生成图片的提示词不能为空' }
        },
        meta: {
          requestId: req.headers['x-request-id'] as string || '',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (!['character', 'location', 'item'].includes(entityType)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '实体类型必须是 character、location 或 item',
          details: {},
          fieldErrors: { entityType: '实体类型必须是 character、location 或 item' }
        },
        meta: {
          requestId: req.headers['x-request-id'] as string || '',
          timestamp: new Date().toISOString()
        }
      });
    }

    const result = await generateImage({ prompt, entityType, style });

    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

export default router;