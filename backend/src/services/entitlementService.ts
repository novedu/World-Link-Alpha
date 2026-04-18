import { prisma } from '../config/database';

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

export async function getOrCreateEntitlement(userId: string): Promise<any> {
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
  const entitlement = await getOrCreateEntitlement(userId);
  const worldCount = await prisma.world.count({
    where: { userId },
  });

  return worldCount < entitlement.maxWorlds;
}

export async function checkEntityQuota(userId: string): Promise<boolean> {
  const entitlement = await getOrCreateEntitlement(userId);
  const entityCount = await prisma.entity.count({
    where: { world: { userId } },
  });

  return entityCount < entitlement.maxEntities;
}

export async function checkCaptureQuota(userId: string): Promise<boolean> {
  const entitlement = await getOrCreateEntitlement(userId);
  const captureCount = await prisma.capture.count({
    where: { userId },
  });

  return captureCount < entitlement.maxCaptures;
}

export async function checkFeatureAccess(userId: string, feature: 'export' | 'ai'): Promise<boolean> {
  const entitlement = await getOrCreateEntitlement(userId);

  switch (feature) {
    case 'export':
      return entitlement.canExport;
    case 'ai':
      return entitlement.canUseAI;
    default:
      return false;
  }
}

export async function updateEntitlement(userId: string, data: Partial<EntitlementData>): Promise<any> {
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
}> {
  const entitlement = await getOrCreateEntitlement(userId);
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

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
    plan: user?.plan || 'free',
    limits: {
      maxWorlds: entitlement.maxWorlds,
      maxEntities: entitlement.maxEntities,
      maxCaptures: entitlement.maxCaptures,
    },
    usage: {
      worlds: worldCount,
      entities: entityCount,
      captures: captureCount,
    },
    features: {
      canExport: entitlement.canExport,
      canUseAI: entitlement.canUseAI,
    },
    exports: {
      markdown: entitlement.markdownExports,
      json: entitlement.jsonExports,
    },
  };
}