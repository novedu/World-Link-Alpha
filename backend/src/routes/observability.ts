import { Router, Response, NextFunction } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { getMetricsSnapshot } from '../observability/metrics';

const router = Router();

router.get('/metrics', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    res.json({
      success: true,
      data: getMetricsSnapshot(),
      meta: {
        requestId: req.requestId || '',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
