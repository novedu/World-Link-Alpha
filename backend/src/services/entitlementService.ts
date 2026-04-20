import { prisma } from '../config/database';
import * as subscriptionService from './subscriptionService';
import type { Entitlement } from '@prisma/client';
import { AppError } from '../utils/errors';

type PlanId = 'free' | 'pro' | 'team';
type FeatureKey = 'export' | 'export_json' | 'ai';

interface PlanPolicy {
  id: PlanId;
  limits: {
    maxWorlds: number;
    maxBooksPerWorld: number;
    maxEntities: number;
    maxCapturesPerDay: number;
  };
  features: {
    canExportMarkdown: boolean;
    canExportJson: boolean;
    canUseAI: boolean;
  };
}

interface UsageSnapshot {
  worlds: number;
  entities: number;
  capturesToday: number;
}

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

const PLAN_POLICIES: Record<PlanId, PlanPolicy> = {
  free: {
    id: 'free',
    limits: {
      maxWorlds: 2,
      maxBooksPerWorld: 3,
      maxEntities: 100,
      maxCapturesPerDay: 10
    },
    features: {
      canExportMarkdown: true,
      canExportJson: false,
      canUseAI: false
    }
  },
  pro: {
    id: 'pro',
    limits: {
      maxWorlds: 0,
      maxBooksPerWorld: 0,
      maxEntities: 1000,
      maxCapturesPerDay: 100
    },
    features: {
      canExportMarkdown: true,
      canExportJson: true,
      canUseAI: true
    }
  },
  team: {
    id: 'team',
    limits: {
      maxWorlds: 0,
      maxBooksPerWorld: 0,
      maxEntities: 5000,
      maxCapturesPerDay: 500
    },
    features: {
      canExportMarkdown: true,
      canExportJson: true,
      canUseAI: true
    }
  }
};

function isUnlimited(limit: number): boolean {
  return Number(limit) === 0;
}

function getTodayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

async function resolvePlanId(userId: string): Promise<{ planId: PlanId; status: string; isActive: boolean }> {
  const status = await subscriptionService.checkSubscriptionStatus(userId);
  if (!status.isActive) {
    return {
      planId: 'free',
      status: status.status,
      isActive: false
    };
  }

  const subscription = await subscriptionService.getUserSubscription(userId);
  const rawPlan = String(subscription?.planId || 'free').trim().toLowerCase();
  if (rawPlan === 'pro' || rawPlan === 'team' || rawPlan === 'free') {
    return {
      planId: rawPlan,
      status: status.status,
      isActive: true
    };
  }

  return {
    planId: 'free',
    status: status.status,
    isActive: false
  };
}

function getPolicy(planId: PlanId): PlanPolicy {
  return PLAN_POLICIES[planId] || PLAN_POLICIES.free;
}

async function getUsageSnapshot(userId: string): Promise<UsageSnapshot> {
  const { start, end } = getTodayRange();
  const [worlds, entities, capturesToday] = await Promise.all([
    prisma.world.count({ where: { userId } }),
    prisma.entity.count({ where: { world: { userId } } }),
    prisma.capture.count({
      where: {
        userId,
        createdAt: {
          gte: start,
          lt: end
        }
      }
    })
  ]);

  return {
    worlds,
    entities,
    capturesToday
  };
}

export async function getOrCreateEntitlement(userId: string): Promise<Entitlement> {
  let entitlement = await prisma.entitlement.findUnique({
    where: { userId }
  });

  if (!entitlement) {
    entitlement = await prisma.entitlement.create({
      data: {
        userId,
        maxWorlds: PLAN_POLICIES.free.limits.maxWorlds,
        maxEntities: PLAN_POLICIES.free.limits.maxEntities,
        maxCaptures: PLAN_POLICIES.free.limits.maxCapturesPerDay,
        canExport: PLAN_POLICIES.free.features.canExportMarkdown,
        canUseAI: PLAN_POLICIES.free.features.canUseAI,
        markdownExports: 0,
        jsonExports: 0
      }
    });
  }

  return entitlement;
}

export async function checkWorldQuota(userId: string): Promise<boolean> {
  const { planId } = await resolvePlanId(userId);
  const policy = getPolicy(planId);
  if (isUnlimited(policy.limits.maxWorlds)) return true;
  const worldCount = await prisma.world.count({ where: { userId } });
  return worldCount < policy.limits.maxWorlds;
}

export async function checkBookQuota(userId: string, worldId: string): Promise<boolean> {
  const { planId } = await resolvePlanId(userId);
  const policy = getPolicy(planId);
  if (isUnlimited(policy.limits.maxBooksPerWorld)) return true;
  const bookCount = await prisma.book.count({
    where: {
      worldId,
      world: {
        userId
      }
    }
  });
  return bookCount < policy.limits.maxBooksPerWorld;
}

export async function checkEntityQuota(userId: string): Promise<boolean> {
  const { planId } = await resolvePlanId(userId);
  const policy = getPolicy(planId);
  if (isUnlimited(policy.limits.maxEntities)) return true;
  const entityCount = await prisma.entity.count({
    where: { world: { userId } }
  });
  return entityCount < policy.limits.maxEntities;
}

export async function checkCaptureQuota(userId: string): Promise<boolean> {
  const { planId } = await resolvePlanId(userId);
  const policy = getPolicy(planId);
  if (isUnlimited(policy.limits.maxCapturesPerDay)) return true;
  const { start, end } = getTodayRange();
  const captureCountToday = await prisma.capture.count({
    where: {
      userId,
      createdAt: {
        gte: start,
        lt: end
      }
    }
  });
  return captureCountToday < policy.limits.maxCapturesPerDay;
}

export async function checkFeatureAccess(userId: string, feature: FeatureKey): Promise<boolean> {
  const { planId } = await resolvePlanId(userId);
  const policy = getPolicy(planId);

  if (feature === 'ai') return policy.features.canUseAI;
  if (feature === 'export_json') return policy.features.canExportJson;
  return policy.features.canExportMarkdown;
}

export async function ensureWorldQuota(userId: string): Promise<void> {
  const allowed = await checkWorldQuota(userId);
  if (!allowed) {
    throw new AppError('已达到世界数量上限，请升级套餐', 403, 'WORLD_QUOTA_EXCEEDED');
  }
}

export async function ensureBookQuota(userId: string, worldId: string): Promise<void> {
  const allowed = await checkBookQuota(userId, worldId);
  if (!allowed) {
    throw new AppError('当前世界的书项目数量已达上限，请升级套餐', 403, 'BOOK_QUOTA_EXCEEDED');
  }
}

export async function ensureEntityQuota(userId: string): Promise<void> {
  const allowed = await checkEntityQuota(userId);
  if (!allowed) {
    throw new AppError('已达到设定数量上限，请升级套餐', 403, 'ENTITY_QUOTA_EXCEEDED');
  }
}

export async function ensureCaptureQuota(userId: string): Promise<void> {
  const allowed = await checkCaptureQuota(userId);
  if (!allowed) {
    throw new AppError('今日灵感捕获次数已达上限，请升级套餐', 403, 'CAPTURE_QUOTA_EXCEEDED');
  }
}

export async function updateEntitlement(userId: string, data: Partial<EntitlementData>): Promise<Entitlement> {
  await getOrCreateEntitlement(userId);

  return prisma.entitlement.update({
    where: { userId },
    data: data
  });
}

export async function consumeExport(userId: string, format: 'markdown' | 'json') {
  const entitlement = await getOrCreateEntitlement(userId);
  const canExportMarkdown = await checkFeatureAccess(userId, 'export');
  const canExportJson = await checkFeatureAccess(userId, 'export_json');

  if (format === 'markdown' && !canExportMarkdown) {
    throw new AppError('当前套餐暂不支持 Markdown 导出', 403, 'EXPORT_MARKDOWN_FORBIDDEN');
  }
  if (format === 'json' && !canExportJson) {
    throw new AppError('JSON 导出为 Pro 功能', 403, 'EXPORT_JSON_FORBIDDEN');
  }

  const updated = await prisma.entitlement.update({
    where: { userId },
    data:
      format === 'json'
        ? { jsonExports: entitlement.jsonExports + 1 }
        : { markdownExports: entitlement.markdownExports + 1 }
  });

  return {
    format,
    markdown: updated.markdownExports,
    json: updated.jsonExports
  };
}

export async function getEntitlementWithUsage(userId: string): Promise<{
  plan: string;
  limits: {
    maxWorlds: number;
    maxBooksPerWorld: number;
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
    canExportMarkdown: boolean;
    canExportJson: boolean;
    canUseAI: boolean;
  };
  exports: {
    markdown: number;
    json: number;
  };
  subscriptionStatus: string;
  isActive: boolean;
}> {
  const entitlement = await getOrCreateEntitlement(userId);
  const resolved = await resolvePlanId(userId);
  const policy = getPolicy(resolved.planId);
  const usage = await getUsageSnapshot(userId);

  return {
    plan: resolved.planId,
    limits: {
      maxWorlds: policy.limits.maxWorlds,
      maxBooksPerWorld: policy.limits.maxBooksPerWorld,
      maxEntities: policy.limits.maxEntities,
      maxCaptures: policy.limits.maxCapturesPerDay
    },
    usage: {
      worlds: usage.worlds,
      entities: usage.entities,
      captures: usage.capturesToday
    },
    features: {
      canExport: policy.features.canExportMarkdown,
      canExportMarkdown: policy.features.canExportMarkdown,
      canExportJson: policy.features.canExportJson,
      canUseAI: policy.features.canUseAI
    },
    exports: {
      markdown: entitlement.markdownExports,
      json: entitlement.jsonExports
    },
    subscriptionStatus: resolved.status,
    isActive: resolved.isActive
  };
}
