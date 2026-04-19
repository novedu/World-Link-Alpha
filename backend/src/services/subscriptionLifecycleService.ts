import { PrismaClient } from '@prisma/client';
import * as subscriptionService from './subscriptionService';

const prisma = new PrismaClient();

export interface SubscriptionHistory {
  id: string;
  planId: string;
  startDate: Date;
  endDate: Date;
  status: string;
  amount: number;
}

// 订阅生命周期服务
export const subscriptionLifecycleService = {
  // 处理过期订阅
  handleExpiredSubscriptions: async (): Promise<{ expiredCount: number; downgradedCount: number }> => {
    try {
      console.log('开始处理过期订阅...');
      
      // 这里应该从数据库获取所有用户的订阅信息
      // 暂时模拟处理
      const expiredCount = 0;
      const downgradedCount = 0;
      
      // 实际实现时，应该：
      // 1. 查询所有订阅已过期的用户
      // 2. 对每个用户，将其套餐降级到 Free
      // 3. 发送通知给用户
      
      console.log(`处理完成：${expiredCount} 个订阅已过期，${downgradedCount} 个用户已降级`);
      return { expiredCount, downgradedCount };
    } catch (error) {
      console.error('处理过期订阅失败:', error);
      throw error;
    }
  },

  // 发送订阅过期提醒
  sendExpiryReminders: async (): Promise<{ sentCount: number }> => {
    try {
      console.log('开始发送订阅过期提醒...');
      
      // 这里应该从数据库获取即将过期的订阅
      // 暂时模拟处理
      const sentCount = 0;
      
      // 实际实现时，应该：
      // 1. 查询 7 天内即将过期的订阅
      // 2. 对每个用户发送提醒邮件或通知
      // 3. 记录提醒发送状态
      
      console.log(`提醒发送完成：已发送 ${sentCount} 个提醒`);
      return { sentCount };
    } catch (error) {
      console.error('发送过期提醒失败:', error);
      throw error;
    }
  },

  // 处理自动续费
  processAutoRenewals: async (): Promise<{ renewedCount: number; failedCount: number }> => {
    try {
      console.log('开始处理自动续费...');
      
      // 这里应该从数据库获取需要自动续费的订阅
      // 暂时模拟处理
      const renewedCount = 0;
      const failedCount = 0;
      
      // 实际实现时，应该：
      // 1. 查询今天需要续费的订阅
      // 2. 对每个订阅尝试自动续费
      // 3. 处理续费成功和失败的情况
      
      console.log(`自动续费处理完成：${renewedCount} 个订阅已续费，${failedCount} 个续费失败`);
      return { renewedCount, failedCount };
    } catch (error) {
      console.error('处理自动续费失败:', error);
      throw error;
    }
  },

  // 同步订阅状态
  syncSubscriptionStatus: async (userId: string): Promise<{ success: boolean; status: string }> => {
    try {
      // 检查订阅状态
      const status = await subscriptionService.checkSubscriptionStatus(userId);
      
      // 这里应该更新数据库中的订阅状态
      // 暂时返回模拟结果
      
      return {
        success: true,
        status: status.status
      };
    } catch (error) {
      console.error('同步订阅状态失败:', error);
      throw error;
    }
  },

  // 获取订阅历史
  getSubscriptionHistory: async (userId: string): Promise<SubscriptionHistory[]> => {
    try {
      // 这里应该从数据库获取用户的订阅历史
      // 暂时返回模拟数据
      return [
        {
          id: 'hist_1',
          planId: 'pro',
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-01-31'),
          status: 'completed',
          amount: 9.9
        },
        {
          id: 'hist_2',
          planId: 'pro',
          startDate: new Date('2026-02-01'),
          endDate: new Date('2026-02-29'),
          status: 'completed',
          amount: 9.9
        },
        {
          id: 'hist_3',
          planId: 'pro',
          startDate: new Date('2026-03-01'),
          endDate: new Date('2026-03-31'),
          status: 'active',
          amount: 9.9
        }
      ];
    } catch (error) {
      console.error('获取订阅历史失败:', error);
      throw error;
    }
  },

  // 计算订阅剩余天数
  calculateRemainingDays: (endDate: string): number => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
    return diffDays;
  },

  // 检查是否需要发送提醒
  shouldSendReminder: (endDate: string): boolean => {
    const remainingDays = subscriptionLifecycleService.calculateRemainingDays(endDate);
    // 在过期前 7 天、3 天和 1 天发送提醒
    return [7, 3, 1].includes(remainingDays);
  }
};

// 导出定时任务函数
export const subscriptionCronJobs = {
  // 每日任务：处理过期订阅和发送提醒
  dailyTask: async () => {
    try {
      console.log('执行订阅每日任务...');
      
      // 处理过期订阅
      await subscriptionLifecycleService.handleExpiredSubscriptions();
      
      // 发送过期提醒
      await subscriptionLifecycleService.sendExpiryReminders();
      
      // 处理自动续费
      await subscriptionLifecycleService.processAutoRenewals();
      
      console.log('订阅每日任务执行完成');
    } catch (error) {
      console.error('执行订阅每日任务失败:', error);
    }
  }
};