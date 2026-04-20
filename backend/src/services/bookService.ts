import { prisma } from '../config/database';
import * as entitlementService from './entitlementService';

export interface CreateBookInput {
  worldId: string;
  title: string;
  description?: string;
}

export interface UpdateBookInput {
  title?: string;
  description?: string;
  status?: string;
}

export async function getBooksByWorld(worldId: string, userId: string) {
  // 验证世界归属
  const world = await prisma.world.findFirst({
    where: { id: worldId, userId },
  });

  if (!world) {
    throw new Error('世界不存在');
  }

  return prisma.book.findMany({
    where: { worldId },
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: {
        select: {
          usages: true,
        },
      },
    },
  });
}

export async function getBookById(bookId: string, userId: string) {
  return prisma.book.findFirst({
    where: { id: bookId, world: { userId } },
    include: {
      usages: {
        include: {
          entity: true,
        },
      },
      _count: {
        select: {
          usages: true,
        },
      },
    },
  });
}

export async function createBook(userId: string, input: CreateBookInput) {
  // 验证世界归属
  const world = await prisma.world.findFirst({
    where: { id: input.worldId, userId },
  });

  if (!world) {
    throw new Error('世界不存在');
  }

  await entitlementService.ensureBookQuota(userId, input.worldId);

  return prisma.book.create({
    data: {
      worldId: input.worldId,
      title: input.title,
      description: input.description,
    },
  });
}

export async function updateBook(
  bookId: string,
  userId: string,
  input: UpdateBookInput
) {
  const book = await prisma.book.findFirst({
    where: { id: bookId, world: { userId } },
  });

  if (!book) {
    throw new Error('书项目不存在');
  }

  return prisma.book.update({
    where: { id: bookId },
    data: input,
  });
}

export async function deleteBook(bookId: string, userId: string) {
  const book = await prisma.book.findFirst({
    where: { id: bookId, world: { userId } },
  });

  if (!book) {
    throw new Error('书项目不存在');
  }

  return prisma.book.delete({
    where: { id: bookId },
  });
}

export async function getBookEntities(bookId: string, userId: string) {
  const book = await prisma.book.findFirst({
    where: { id: bookId, world: { userId } },
  });

  if (!book) {
    throw new Error('书项目不存在');
  }

  const usages = await prisma.bookEntityUsage.findMany({
    where: { bookId },
    include: {
      entity: true,
    },
  });

  return usages.map((usage) => usage.entity);
}
