import { prisma } from '../config/database';
import * as entitlementService from './entitlementService';
import type { Prisma } from '@prisma/client';

export interface CreateEntityInput {
  worldId: string;
  name: string;
  type: string;
  summary?: string;
  tags?: string[];
  sourceUrl?: string;
  sourceTitle?: string;
}

export interface UpdateEntityInput {
  name?: string;
  type?: string;
  summary?: string;
  tags?: string[];
  sourceUrl?: string;
  sourceTitle?: string;
}

export async function getEntitiesByWorld(worldId: string, userId: string) {
  // 验证世界归属
  const world = await prisma.world.findFirst({
    where: { id: worldId, userId },
  });

  if (!world) {
    throw new Error('世界不存在');
  }

  return prisma.entity.findMany({
    where: { worldId },
    orderBy: { updatedAt: 'desc' },
    include: {
      usages: {
        include: {
          book: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
    },
  });
}

export async function getEntityById(entityId: string, userId: string) {
  return prisma.entity.findFirst({
    where: { id: entityId, world: { userId } },
    include: {
      usages: {
        include: {
          book: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
      relationsFrom: {
        include: {
          toEntity: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
      },
      relationsTo: {
        include: {
          fromEntity: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
      },
    },
  });
}

export async function createEntity(userId: string, input: CreateEntityInput) {
  // 验证世界归属
  const world = await prisma.world.findFirst({
    where: { id: input.worldId, userId },
  });

  if (!world) {
    throw new Error('世界不存在');
  }

  await entitlementService.ensureEntityQuota(userId);

  return prisma.entity.create({
    data: {
      worldId: input.worldId,
      name: input.name,
      type: input.type,
      summary: input.summary,
      tags: input.tags ? input.tags.join(',') : null,
      sourceUrl: input.sourceUrl,
      sourceTitle: input.sourceTitle,
    },
  });
}

export async function updateEntity(
  entityId: string,
  userId: string,
  input: UpdateEntityInput
) {
  const entity = await prisma.entity.findFirst({
    where: { id: entityId, world: { userId } },
  });

  if (!entity) {
    throw new Error('实体不存在');
  }

  return prisma.entity.update({
    where: { id: entityId },
    data: {
      ...input,
      tags: input.tags ? input.tags.join(',') : undefined,
    },
  });
}

export async function deleteEntity(entityId: string, userId: string) {
  const entity = await prisma.entity.findFirst({
    where: { id: entityId, world: { userId } },
  });

  if (!entity) {
    throw new Error('实体不存在');
  }

  return prisma.entity.delete({
    where: { id: entityId },
  });
}

export async function searchEntities(
  userId: string,
  query: string,
  worldId?: string,
  type?: string,
  tags?: string[]
) {
  const where: Prisma.EntityWhereInput = {
    world: { userId },
  };

  if (worldId) {
    where.worldId = worldId;
  }

  if (type) {
    where.type = type;
  }

  if (tags && tags.length > 0) {
    // 由于 tags 是逗号分隔的字符串，用 contains 查找
    where.tags = {
      contains: tags.join(','),
    };
  }

  if (query) {
    where.OR = [
      { name: { contains: query } },
      { summary: { contains: query } },
    ];
  }

  return prisma.entity.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    include: {
      usages: {
        include: {
          book: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
    },
  });
}

export async function bindEntityToBook(
  entityId: string,
  bookId: string,
  userId: string
) {
  // 验证实体和书的归属
  const entity = await prisma.entity.findFirst({
    where: { id: entityId, world: { userId } },
  });

  if (!entity) {
    throw new Error('实体不存在');
  }

  const book = await prisma.book.findFirst({
    where: { id: bookId, world: { userId } },
  });

  if (!book) {
    throw new Error('书项目不存在');
  }

  // 检查是否已绑定
  const existing = await prisma.bookEntityUsage.findUnique({
    where: {
      bookId_entityId: {
        bookId,
        entityId,
      },
    },
  });

  if (existing) {
    return existing;
  }

  return prisma.bookEntityUsage.create({
    data: {
      bookId,
      entityId,
    },
  });
}

export async function unbindEntityFromBook(
  entityId: string,
  bookId: string,
  userId: string
) {
  return prisma.bookEntityUsage.deleteMany({
    where: {
      bookId,
      entityId,
      book: {
        world: { userId },
      },
    },
  });
}
