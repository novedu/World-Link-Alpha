import { Router, Response, NextFunction } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import * as subscriptionService from '../services/subscriptionService';

const router = Router();

// 获取用户订阅信息
router.get('/', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const subscription = await subscriptionService.getUserSubscription(req.user!.userId);
    
    res.json({
      success: true,
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
});

// 创建订阅
router.post('/create', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { plan, paymentMethod } = req.body;
    const subscription = await subscriptionService.createSubscription(req.user!.userId, plan, paymentMethod);
    
    res.json({
      success: true,
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
});

// 取消订阅
router.post('/cancel', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await subscriptionService.cancelSubscription(req.user!.userId);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// 续费订阅
router.post('/renew', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { paymentMethod } = req.body;
    const subscription = await subscriptionService.renewSubscription(req.user!.userId, paymentMethod);
    
    res.json({
      success: true,
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
});

// 获取订阅计划
router.get('/plans', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const plans = await subscriptionService.getSubscriptionPlans();
    
    res.json({
      success: true,
      data: plans,
    });
  } catch (error) {
    next(error);
  }
});

export default router;