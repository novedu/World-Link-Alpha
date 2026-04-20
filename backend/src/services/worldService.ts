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
  // 先验证世界归属
  const world = await prisma.world.findFirst({
    where: { id: worldId, userId },
    select: {
      id: true,
      userId: true,
    },
  });

  if (!world) {
    return null;
  }

  // 分别查询书籍和实体，避免一次性加载过多数据
  const [books, entities, counts] = await Promise.all([
    prisma.book.findMany({
      where: { worldId },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.entity.findMany({
      where: { worldId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        type: true,
        updatedAt: true,
      },
    }),
    prisma.world.findFirst({
      where: { id: worldId },
      select: {
        _count: {
          select: {
            books: true,
            entities: true,
          },
        },
      },
    }),
  ]);

  return {
    ...world,
    books,
    entities,
    _count: counts?._count,
  };
}

export async function createWorld(input: CreateWorldInput) {
  await entitlementService.ensureWorldQuota(input.userId);

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
