import { prisma } from '../config/database';
import { Prisma } from '@prisma/client';

export interface CreateEntityInput {
  worldId: string;
  name: string;
  type: string;
  summary?: string;
  tags?: string;
  sourceUrl?: string;
  sourceTitle?: string;
}

export interface UpdateEntityInput {
  name?: string;
  type?: string;
  summary?: string;
  tags?: string;
  sourceUrl?: string;
  sourceTitle?: string;
}

export async function getEntitiesByWorld(worldId: string, userId: string) {
  const world = await prisma.world.findFirst({
    where: { id: worldId, userId },
    select: { id: true },
  });

  if (!world) {
    throw new Error('世界不存在');
  }

  return prisma.entity.findMany({
    where: { worldId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      worldId: true,
      name: true,
      type: true,
      summary: true,
      tags: true,
      sourceUrl: true,
      sourceTitle: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function getEntityById(entityId: string, userId: string) {
  const entity = await prisma.entity.findFirst({
    where: { id: entityId, world: { userId } },
    select: {
      id: true,
      worldId: true,
      name: true,
      type: true,
      summary: true,
      tags: true,
      sourceUrl: true,
      sourceTitle: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!entity) {
    return null;
  }

  const [usages, relationsFrom, relationsTo] = await Promise.all([
    prisma.bookEntityUsage.findMany({
      where: { entityId },
      include: {
        book: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    }),
    prisma.entityRelation.findMany({
      where: { fromEntityId: entityId },
      include: {
        toEntity: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    }),
    prisma.entityRelation.findMany({
      where: { toEntityId: entityId },
      include: {
        fromEntity: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    }),
  ]);

  return {
    ...entity,
    usages,
    relationsFrom,
    relationsTo,
  };
}

export async function createEntity(userId: string, input: CreateEntityInput) {
  const world = await prisma.world.findFirst({
    where: { id: input.worldId, userId },
  });

  if (!world) {
    throw new Error('世界不存在');
  }

  const entity = await prisma.entity.create({
    data: {
      worldId: input.worldId,
      name: input.name,
      type: input.type,
      summary: input.summary,
      tags: input.tags,
      sourceUrl: input.sourceUrl,
      sourceTitle: input.sourceTitle,
    },
  });

  return entity;
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
    data: input,
  });
}

export async function deleteEntity(entityId: string, userId: string) {
  const entity = await prisma.entity.findFirst({
    where: { id: entityId, world: { userId } },
  });

  if (!entity) {
    throw new Error('实体不存在');
  }

  await prisma.entity.delete({
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
    where.OR = tags.map(tag => ({
      tags: {
        contains: tag,
      },
    }));
  }

  if (query) {
    const searchConditions = [
      { name: { contains: query } },
      { summary: { contains: query } },
    ];

    if (where.OR) {
      where.OR = [...where.OR, ...searchConditions];
    } else {
      where.OR = searchConditions;
    }
  }

  return prisma.entity.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      worldId: true,
      name: true,
      type: true,
      summary: true,
      tags: true,
      sourceUrl: true,
      sourceTitle: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function bindEntityToBook(
  entityId: string,
  bookId: string,
  userId: string
) {
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
    throw new Error('书籍不存在');
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
  const entity = await prisma.entity.findFirst({
    where: { id: entityId, world: { userId } },
  });

  if (!entity) {
    throw new Error('实体不存在');
  }

  await prisma.bookEntityUsage.deleteMany({
    where: {
      bookId,
      entityId,
    },
  });
}
