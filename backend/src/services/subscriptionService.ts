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
    const subscription = await prisma.subscription.findUnique({
      where: { userId }
    });

    if (!subscription) {
      return null;
    }

    const plan = SUBSCRIPTION_PLANS.find(p => p.id === subscription.planId);
    
    return {
      id: subscription.id,
      userId: subscription.userId,
      planId: subscription.planId,
      status: subscription.status as SubscriptionStatus,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      nextBillingDate: subscription.nextBillingDate,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      plan: plan || SUBSCRIPTION_PLANS[0]
    };
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

    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    // 创建或更新订阅
    const subscription = await prisma.subscription.upsert({
      where: { userId },
      update: {
        planId,
        status: 'active',
        endDate,
        nextBillingDate: endDate,
        cancelAtPeriodEnd: false,
        price: plan.price,
        paymentMethod,
        updatedAt: new Date()
      },
      create: {
        userId,
        planId,
        status: 'active',
        endDate,
        nextBillingDate: endDate,
        price: plan.price,
        paymentMethod
      }
    });

    // 更新用户的 plan 字段
    await prisma.user.update({
      where: { id: userId },
      data: {
        plan: planId,
        updatedAt: new Date()
      }
    });

    // 更新用户的 entitlements
    await updateEntitlementsByPlan(userId, planId);

    return {
      id: subscription.id,
      userId: subscription.userId,
      planId: subscription.planId,
      status: subscription.status as SubscriptionStatus,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      nextBillingDate: subscription.nextBillingDate,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      plan
    };
  } catch (error) {
    console.error('Error creating subscription:', error);
    throw error;
  }
}

// 取消订阅
export async function cancelSubscription(userId: string): Promise<{ success: boolean; message: string }> {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { userId }
    });

    if (!subscription) {
      return {
        success: false,
        message: '未找到订阅'
      };
    }

    // 标记为取消（到期后自动降级）
    await prisma.subscription.update({
      where: { userId },
      data: {
        cancelAtPeriodEnd: true,
        updatedAt: new Date()
      }
    });

    return {
      success: true,
      message: '订阅已成功取消，将在到期后停止'
    };
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }
}

// 续费订阅
export async function renewSubscription(userId: string, paymentMethod: string): Promise<Subscription> {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { userId }
    });

    if (!subscription) {
      throw new Error('未找到订阅');
    }

    const plan = SUBSCRIPTION_PLANS.find(p => p.id === subscription.planId);
    if (!plan) {
      throw new Error('无效的订阅计划');
    }

    const endDate = new Date(subscription.endDate);
    endDate.setMonth(endDate.getMonth() + 1);

    const updatedSubscription = await prisma.subscription.update({
      where: { userId },
      data: {
        status: 'active',
        endDate,
        nextBillingDate: endDate,
        cancelAtPeriodEnd: false,
        paymentMethod,
        updatedAt: new Date()
      }
    });

    return {
      id: updatedSubscription.id,
      userId: updatedSubscription.userId,
      planId: updatedSubscription.planId,
      status: updatedSubscription.status as SubscriptionStatus,
      startDate: updatedSubscription.startDate,
      endDate: updatedSubscription.endDate,
      nextBillingDate: updatedSubscription.nextBillingDate,
      cancelAtPeriodEnd: updatedSubscription.cancelAtPeriodEnd,
      plan
    };
  } catch (error) {
    console.error('Error renewing subscription:', error);
    throw error;
  }
}

// 检查订阅状态
export async function checkSubscriptionStatus(userId: string): Promise<{ status: SubscriptionStatus; isActive: boolean }> {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { userId }
    });

    if (!subscription) {
      return {
        status: 'expired',
        isActive: false
      };
    }

    const now = new Date();
    if (subscription.endDate < now) {
      // 订阅已过期，降级到 Free
      await downgradeToFree(userId);
      return {
        status: 'expired',
        isActive: false
      };
    }

    if (subscription.status !== 'active') {
      return {
        status: subscription.status as SubscriptionStatus,
        isActive: false
      };
    }

    return {
      status: subscription.status as SubscriptionStatus,
      isActive: true
    };
  } catch (error) {
    console.error('Error checking subscription status:', error);
    throw error;
  }
}

// 降级到 Free
async function downgradeToFree(userId: string) {
  try {
    // 更新订阅状态
    await prisma.subscription.update({
      where: { userId },
      data: {
        status: 'expired',
        updatedAt: new Date()
      }
    });

    // 更新用户的 plan 字段
    await prisma.user.update({
      where: { id: userId },
      data: {
        plan: 'free',
        updatedAt: new Date()
      }
    });

    // 更新 entitlements
    await updateEntitlementsByPlan(userId, 'free');
  } catch (error) {
    console.error('Error downgrading to free:', error);
  }
}

// 根据订阅计划更新 entitlements
async function updateEntitlementsByPlan(userId: string, planId: string) {
  try {
    const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
    if (!plan) return;

    const canExport = planId !== 'free';
    const canUseAI = planId !== 'free';

    await prisma.entitlement.upsert({
      where: { userId },
      update: {
        maxWorlds: plan.limits.maxWorlds === 0 ? 99999 : plan.limits.maxWorlds,
        maxEntities: plan.limits.maxEntities,
        maxCaptures: plan.limits.maxCapturesPerDay,
        canExport,
        canUseAI,
        updatedAt: new Date()
      },
      create: {
        userId,
        maxWorlds: plan.limits.maxWorlds === 0 ? 99999 : plan.limits.maxWorlds,
        maxEntities: plan.limits.maxEntities,
        maxCaptures: plan.limits.maxCapturesPerDay,
        canExport,
        canUseAI
      }
    });
  } catch (error) {
    console.error('Error updating entitlements:', error);
  }
}

// 获取订阅期限
export async function getSubscriptionPeriod(userId: string): Promise<{ startDate: Date; endDate: Date; daysRemaining: number } | null> {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { userId }
    });

    if (!subscription) {
      return null;
    }

    const now = new Date();
    const daysRemaining = Math.max(0, Math.floor((subscription.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

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
