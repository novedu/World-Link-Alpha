import { Router, Response, NextFunction } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import * as entitlementService from '../services/entitlementService';

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

export default router;
