import { Router, Response, NextFunction } from 'express';
import { entityAssist, entityConflict, reportAiFeedback, generateImage, parseManuscript, semanticSearch } from '../services/aiService';
import { authMiddleware, type AuthRequest } from '../middleware/auth';
import { checkFeatureAccess } from '../services/entitlementService';

const router = Router();

async function ensureAiAccess(req: AuthRequest, res: Response): Promise<boolean> {
  const userId = String(req.user?.userId || '').trim();
  if (!userId) {
    res.status(401).json({
      success: false,
      error: {
        code: 'MISSING_TOKEN',
        message: '未提供认证令牌',
        details: {},
        fieldErrors: {}
      },
      meta: {
        requestId: req.headers['x-request-id'] as string || '',
        timestamp: new Date().toISOString()
      }
    });
    return false;
  }

  const allowed = await checkFeatureAccess(userId, 'ai');
  if (!allowed) {
    res.status(403).json({
      success: false,
      error: {
        code: 'AI_FEATURE_DISABLED',
        message: '当前套餐暂不支持 AI 功能，请升级后继续使用',
        details: {},
        fieldErrors: {}
      },
      meta: {
        requestId: req.headers['x-request-id'] as string || '',
        timestamp: new Date().toISOString()
      }
    });
    return false;
  }

  return true;
}

router.post('/entity-assist', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!(await ensureAiAccess(req, res))) return;
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
          requestId: req.requestId || '',
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
          requestId: req.requestId || '',
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

router.post('/entity-conflict', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!(await ensureAiAccess(req, res))) return;
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
          requestId: req.requestId || '',
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

router.post('/report-feedback', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!(await ensureAiAccess(req, res))) return;
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
          requestId: req.requestId || '',
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

router.post('/generate-image', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!(await ensureAiAccess(req, res))) return;
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
          requestId: req.requestId || '',
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
          requestId: req.requestId || '',
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

router.post('/parse-manuscript', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!(await ensureAiAccess(req, res))) return;
    const { worldId, bookId, text } = req.body;

    if (!worldId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'worldId 不能为空',
          details: {},
          fieldErrors: { worldId: 'worldId 不能为空' }
        },
        meta: {
          requestId: req.headers['x-request-id'] as string || '',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (!text) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '书稿内容不能为空',
          details: {},
          fieldErrors: { text: '书稿内容不能为空' }
        },
        meta: {
          requestId: req.headers['x-request-id'] as string || '',
          timestamp: new Date().toISOString()
        }
      });
    }

    const result = await parseManuscript({ worldId, bookId, text });

    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

router.post('/semantic-search', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!(await ensureAiAccess(req, res))) return;
    const { query, entities, limit } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '搜索查询不能为空',
          details: {},
          fieldErrors: { query: '搜索查询不能为空' }
        },
        meta: {
          requestId: req.requestId || '',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (!entities || !Array.isArray(entities)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '实体列表不能为空',
          details: {},
          fieldErrors: { entities: '实体列表不能为空' }
        },
        meta: {
          requestId: req.requestId || '',
          timestamp: new Date().toISOString()
        }
      });
    }

    const result = await semanticSearch({ query, entities, limit });

    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

export default router;
