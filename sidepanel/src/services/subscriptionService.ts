import { http } from '../lib/http/client';
import type { SubscriptionPlanId, SubscriptionStatus as SharedSubscriptionStatus } from '../../../shared/types';

// 订阅计划接口
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

// 复用共享订阅状态（扩展前端所需状态）
export type SubscriptionStatus = SharedSubscriptionStatus | 'canceled' | 'trialing';

// 订阅信息（扩展前端所需字段）
export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string;
  nextBillingDate: string | null;
  cancelAtPeriodEnd: boolean;
  plan: SubscriptionPlan;
}

// 订阅 API 服务
export const subscriptionService = {
  // 获取订阅计划
  getPlans: async (): Promise<SubscriptionPlan[]> => {
    try {
      const response = await http.get<{ plans: SubscriptionPlan[] }>('/api/subscriptions/plans');
      return response.data.plans;
    } catch (error) {
      console.error('Error getting subscription plans:', error);
      throw error;
    }
  },

  // 获取用户订阅信息
  getSubscription: async (): Promise<Subscription | null> => {
    try {
      const response = await http.get<{ data: Subscription }>('/api/subscriptions');
      return response.data;
    } catch (error) {
      console.error('Error getting user subscription:', error);
      throw error;
    }
  },

  // 创建订阅
  createSubscription: async (planId: string, paymentMethod: string): Promise<Subscription> => {
    try {
      const response = await http.post<{ data: Subscription }>('/api/subscriptions/create', {
        plan: planId,
        paymentMethod
      });
      return response.data;
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
  },

  // 取消订阅
  cancelSubscription: async (): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await http.post<{ data: { success: boolean; message: string } }>('/api/subscriptions/cancel');
      return response.data;
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw error;
    }
  },

  // 续费订阅
  renewSubscription: async (paymentMethod: string): Promise<Subscription> => {
    try {
      const response = await http.post<{ data: Subscription }>('/api/subscriptions/renew', {
        paymentMethod
      });
      return response.data;
    } catch (error) {
      console.error('Error renewing subscription:', error);
      throw error;
    }
  },

  // 计算订阅剩余天数
  calculateDaysRemaining: (endDate: string): number => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
    return diffDays;
  },

  // 获取订阅状态文本
  getStatusText: (status: SubscriptionStatus): string => {
    const statusMap: Record<SubscriptionStatus, string> = {
      active: '活跃',
      canceled: '已取消',
      expired: '已过期',
      trialing: '试用中'
    };
    return statusMap[status] || '未知';
  },

  // 获取订阅状态颜色
  getStatusColor: (status: SubscriptionStatus): string => {
    const colorMap: Record<SubscriptionStatus, string> = {
      active: 'text-green-600',
      canceled: 'text-orange-600',
      expired: 'text-red-600',
      trialing: 'text-blue-600'
    };
    return colorMap[status] || 'text-gray-600';
  }
};