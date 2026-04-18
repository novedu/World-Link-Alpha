import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 订阅计划定义
export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  features: string[];
  limits: {
    maxWorlds: number;
    maxEntities: number;
    maxCapturesPerDay: number;
  };
}

// 订阅状态
export type SubscriptionStatus = 'active' | 'canceled' | 'expired' | 'trialing';

// 订阅信息
export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: SubscriptionStatus;
  startDate: Date;
  endDate: Date;
  nextBillingDate: Date | null;
  cancelAtPeriodEnd: boolean;
  plan: SubscriptionPlan;
}

// 订阅计划列表
const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    currency: 'CNY',
    billingCycle: 'monthly',
    features: [
      '基础世界观管理',
      '本地存储',
      '基础 AI 辅助',
      'Markdown 导出'
    ],
    limits: {
      maxWorlds: 2,
      maxEntities: 100,
      maxCapturesPerDay: 10
    }
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 9.9,
    currency: 'CNY',
    billingCycle: 'monthly',
    features: [
      '无限世界观',
      '1000 个实体',
      '100 次/天捕获',
      '云端同步',
      '跨设备访问',
      '高级 AI 辅助',
      'JSON 导出'
    ],
    limits: {
      maxWorlds: 0, // 0 表示无限
      maxEntities: 1000,
      maxCapturesPerDay: 100
    }
  },
  {
    id: 'team',
    name: 'Team',
    price: 29.9,
    currency: 'CNY',
    billingCycle: 'monthly',
    features: [
      '无限世界观',
      '5000 个实体',
      '500 次/天捕获',
      '云端同步',
      '跨设备访问',
      '高级 AI 辅助',
      '全部格式导出',
      '团队协作',
      '角色权限',
      '高级分析'
    ],
    limits: {
      maxWorlds: 0,
      maxEntities: 5000,
      maxCapturesPerDay: 500
    }
  }
];

// 获取订阅计划
export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  return SUBSCRIPTION_PLANS;
}

// 获取用户订阅信息
export async function getUserSubscription(userId: string): Promise<Subscription | null> {
  try {
    // 这里应该从数据库获取订阅信息
    // 暂时返回模拟数据
    const mockSubscription: Subscription = {
      id: 'sub_123',
      userId,
      planId: 'pro',
      status: 'active',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      nextBillingDate: new Date('2026-05-01'),
      cancelAtPeriodEnd: false,
      plan: SUBSCRIPTION_PLANS.find(p => p.id === 'pro')!
    };
    
    return mockSubscription;
  } catch (error) {
    console.error('Error getting user subscription:', error);
    throw error;
  }
}

// 创建订阅
export async function createSubscription(userId: string, planId: string, paymentMethod: string): Promise<Subscription> {
  try {
    const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
    if (!plan) {
      throw new Error('Invalid plan ID');
    }
    
    // 这里应该处理支付和创建订阅记录
    // 暂时返回模拟数据
    const subscription: Subscription = {
      id: `sub_${Date.now()}`,
      userId,
      planId,
      status: 'active',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30天后
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      cancelAtPeriodEnd: false,
      plan
    };
    
    return subscription;
  } catch (error) {
    console.error('Error creating subscription:', error);
    throw error;
  }
}

// 取消订阅
export async function cancelSubscription(userId: string): Promise<{ success: boolean; message: string }> {
  try {
    // 这里应该处理取消订阅的逻辑
    // 暂时返回成功
    return {
      success: true,
      message: '订阅已成功取消'
    };
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }
}

// 续费订阅
export async function renewSubscription(userId: string, paymentMethod: string): Promise<Subscription> {
  try {
    // 这里应该处理续费逻辑
    // 暂时返回模拟数据
    const subscription: Subscription = {
      id: `sub_${Date.now()}`,
      userId,
      planId: 'pro',
      status: 'active',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      cancelAtPeriodEnd: false,
      plan: SUBSCRIPTION_PLANS.find(p => p.id === 'pro')!
    };
    
    return subscription;
  } catch (error) {
    console.error('Error renewing subscription:', error);
    throw error;
  }
}

// 检查订阅状态
export async function checkSubscriptionStatus(userId: string): Promise<{ status: SubscriptionStatus; isActive: boolean }> {
  try {
    const subscription = await getUserSubscription(userId);
    
    if (!subscription) {
      return {
        status: 'expired',
        isActive: false
      };
    }
    
    const now = new Date();
    if (subscription.endDate < now) {
      return {
        status: 'expired',
        isActive: false
      };
    }
    
    return {
      status: subscription.status,
      isActive: subscription.status === 'active' || subscription.status === 'trialing'
    };
  } catch (error) {
    console.error('Error checking subscription status:', error);
    throw error;
  }
}

// 获取订阅期限
export async function getSubscriptionPeriod(userId: string): Promise<{ startDate: Date; endDate: Date; daysRemaining: number } | null> {
  try {
    const subscription = await getUserSubscription(userId);
    
    if (!subscription) {
      return null;
    }
    
    const now = new Date();
    const daysRemaining = Math.max(0, Math.floor((subscription.endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
    
    return {
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      daysRemaining
    };
  } catch (error) {
    console.error('Error getting subscription period:', error);
    throw error;
  }
}