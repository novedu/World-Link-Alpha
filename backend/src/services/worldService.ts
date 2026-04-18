import { prisma } from '../config/database';
import * as entitlementService from './entitlementService';

export interface CreateWorldInput {
  userId: string;
  name: string;
  description?: string;
}

export interface UpdateWorldInput {
  name?: string;
  description?: string;
}

export async function getWorldsByUser(userId: string) {
  return prisma.world.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: {
        select: {
          books: true,
          entities: true,
        },
      },
    },
  });
}

export async function getWorldById(worldId: string, userId: string) {
  return prisma.world.findFirst({
    where: { id: worldId, userId },
    include: {
      books: {
        orderBy: { updatedAt: 'desc' },
      },
      entities: {
        orderBy: { updatedAt: 'desc' },
      },
      _count: {
        select: {
          books: true,
          entities: true,
        },
      },
    },
  });
}

export async function createWorld(input: CreateWorldInput) {
  // 检查用户配额
  const hasQuota = await entitlementService.checkWorldQuota(input.userId);
  if (!hasQuota) {
    throw new Error('已达到世界数量上限，请升级套餐');
  }

  return prisma.world.create({
    data: {
      userId: input.userId,
      name: input.name,
      description: input.description,
    },
  });
}

export async function updateWorld(
  worldId: string,
  userId: string,
  input: UpdateWorldInput
) {
  const world = await prisma.world.findFirst({
    where: { id: worldId, userId },
  });

  if (!world) {
    throw new Error('世界不存在');
  }

  return prisma.world.update({
    where: { id: worldId },
    data: input,
  });
}

export async function deleteWorld(worldId: string, userId: string) {
  const world = await prisma.world.findFirst({
    where: { id: worldId, userId },
  });

  if (!world) {
    throw new Error('世界不存在');
  }

  return prisma.world.delete({
    where: { id: worldId },
  });
}

export async function getWorldStats(worldId: string, userId: string) {
  const world = await prisma.world.findFirst({
    where: { id: worldId, userId },
    include: {
      _count: {
        select: {
          books: true,
          entities: true,
          relations: true,
        },
      },
      entities: {
        select: {
          type: true,
        },
      },
    },
  });

  if (!world) {
    throw new Error('世界不存在');
  }

  // 计算类型分布
  const typeDistribution: Record<string, number> = {};
  world.entities.forEach((entity) => {
    typeDistribution[entity.type] = (typeDistribution[entity.type] || 0) + 1;
  });

  return {
    bookCount: world._count.books,
    entityCount: world._count.entities,
    relationCount: world._count.relations,
    typeDistribution,
  };
}
