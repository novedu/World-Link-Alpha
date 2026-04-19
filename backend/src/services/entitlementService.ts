import { prisma } from '../config/database';
import * as subscriptionService from './subscriptionService';
import type { Entitlement } from '@prisma/client';

export interface EntitlementData {
  userId: string;
  maxWorlds?: number;
  maxEntities?: number;
  maxCaptures?: number;
  canExport?: boolean;
  canUseAI?: boolean;
  markdownExports?: number;
  jsonExports?: number;
}

export async function getOrCreateEntitlement(userId: string): Promise<Entitlement> {
  let entitlement = await prisma.entitlement.findUnique({
    where: { userId },
  });

  if (!entitlement) {
    // 创建默认的 entitlement
    entitlement = await prisma.entitlement.create({
      data: {
        userId,
        maxWorlds: 3,
        maxEntities: 100,
        maxCaptures: 50,
        canExport: false,
        canUseAI: false,
        markdownExports: 0,
        jsonExports: 0,
      },
    });
  }

  return entitlement;
}

export async function checkWorldQuota(userId: string): Promise<boolean> {
  // 检查订阅状态
  const subscriptionStatus = await subscriptionService.checkSubscriptionStatus(userId);
  
  // 根据订阅状态确定配额
  let maxWorlds;
  if (subscriptionStatus.isActive) {
    const subscription = await subscriptionService.getUserSubscription(userId);
    maxWorlds = subscription?.planId === 'free' ? 2 : 0; // 0 表示无限
  } else {
    maxWorlds = 2; // 未订阅或过期，使用免费版配额
  }
  
  if (maxWorlds === 0) {
    return true; // 无限配额
  }

  const worldCount = await prisma.world.count({
    where: { userId },
  });

  return worldCount < maxWorlds;
}

export async function checkEntityQuota(userId: string): Promise<boolean> {
  // 检查订阅状态
  const subscriptionStatus = await subscriptionService.checkSubscriptionStatus(userId);
  
  // 根据订阅状态确定配额
  let maxEntities;
  if (subscriptionStatus.isActive) {
    const subscription = await subscriptionService.getUserSubscription(userId);
    if (subscription?.planId === 'pro') {
      maxEntities = 1000;
    } else if (subscription?.planId === 'team') {
      maxEntities = 5000;
    } else {
      maxEntities = 100;
    }
  } else {
    maxEntities = 100; // 未订阅或过期，使用免费版配额
  }

  const entityCount = await prisma.entity.count({
    where: { world: { userId } },
  });

  return entityCount < maxEntities;
}

export async function checkCaptureQuota(userId: string): Promise<boolean> {
  // 检查订阅状态
  const subscriptionStatus = await subscriptionService.checkSubscriptionStatus(userId);
  
  // 根据订阅状态确定配额
  let maxCaptures;
  if (subscriptionStatus.isActive) {
    const subscription = await subscriptionService.getUserSubscription(userId);
    if (subscription?.planId === 'pro') {
      maxCaptures = 100;
    } else if (subscription?.planId === 'team') {
      maxCaptures = 500;
    } else {
      maxCaptures = 10;
    }
  } else {
    maxCaptures = 10; // 未订阅或过期，使用免费版配额
  }

  const captureCount = await prisma.capture.count({
    where: { userId },
  });

  return captureCount < maxCaptures;
}

export async function checkFeatureAccess(userId: string, feature: 'export' | 'ai'): Promise<boolean> {
  // 检查订阅状态
  const subscriptionStatus = await subscriptionService.checkSubscriptionStatus(userId);
  
  if (!subscriptionStatus.isActive) {
    // 未订阅或过期，只有基础功能
    return feature === 'export'; // 免费版也可以导出
  }
  
  const subscription = await subscriptionService.getUserSubscription(userId);
  
  // Pro 和 Team 版本都可以使用所有功能
  return true;
}

export async function updateEntitlement(userId: string, data: Partial<EntitlementData>): Promise<Entitlement> {
  const entitlement = await getOrCreateEntitlement(userId);

  return prisma.entitlement.update({
    where: { userId },
    data: data,
  });
}

export async function getEntitlementWithUsage(userId: string): Promise<{
  plan: string;
  limits: {
    maxWorlds: number;
    maxEntities: number;
    maxCaptures: number;
  };
  usage: {
    worlds: number;
    entities: number;
    captures: number;
  };
  features: {
    canExport: boolean;
    canUseAI: boolean;
  };
  exports: {
    markdown: number;
    json: number;
  };
  subscriptionStatus: string;
  isActive: boolean;
}> {
  // 检查订阅状态
  const subscriptionStatus = await subscriptionService.checkSubscriptionStatus(userId);
  const subscription = await subscriptionService.getUserSubscription(userId);
  
  // 根据订阅状态确定配额
  let maxWorlds, maxEntities, maxCaptures;
  if (subscriptionStatus.isActive) {
    if (subscription?.planId === 'pro') {
      maxWorlds = 0; // 0 表示无限
      maxEntities = 1000;
      maxCaptures = 100;
    } else if (subscription?.planId === 'team') {
      maxWorlds = 0;
      maxEntities = 5000;
      maxCaptures = 500;
    } else {
      maxWorlds = 2;
      maxEntities = 100;
      maxCaptures = 10;
    }
  } else {
    // 未订阅或过期，使用免费版配额
    maxWorlds = 2;
    maxEntities = 100;
    maxCaptures = 10;
  }

  // 获取当前使用量
  const worldCount = await prisma.world.count({
    where: { userId },
  });

  const entityCount = await prisma.entity.count({
    where: { world: { userId } },
  });

  const captureCount = await prisma.capture.count({
    where: { userId },
  });

  return {
    plan: subscription?.planId || 'free',
    limits: {
      maxWorlds,
      maxEntities,
      maxCaptures,
    },
    usage: {
      worlds: worldCount,
      entities: entityCount,
      captures: captureCount,
    },
    features: {
      canExport: true, // 所有版本都可以导出
      canUseAI: subscriptionStatus.isActive, // 只有订阅用户可以使用 AI
    },
    exports: {
      markdown: 0, // 暂时返回 0
      json: 0, // 暂时返回 0
    },
    subscriptionStatus: subscriptionStatus.status,
    isActive: subscriptionStatus.isActive,
  };
}