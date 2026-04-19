import { prisma } from '../config/database';
import * as entitlementService from './entitlementService';
import type { Prisma } from '@prisma/client';

export interface CreateCaptureInput {
  userId: string;
  text: string;
  sourceUrl?: string;
  sourceTitle?: string;
}

export interface UpdateCaptureInput {
  status?: 'inbox' | 'organized' | 'converted';
  entityId?: string;
}

export async function getCapturesByUser(userId: string, filters?: {
  status?: string;
  sourceDomain?: string;
  timeRange?: string;
}) {
  const where: Prisma.CaptureWhereInput = { userId };

  if (filters?.status) {
    where.status = filters.status;
  }

  if (filters?.sourceDomain && filters.sourceDomain !== 'all') {
    where.sourceUrl = {
      contains: filters.sourceDomain,
    };
  }

  if (filters?.timeRange && filters.timeRange !== 'all') {
    const now = new Date();
    let startDate: Date;

    switch (filters.timeRange) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(0);
    }

    where.createdAt = {
      gte: startDate,
    };
  }

  return prisma.capture.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
}

export async function getCaptureById(captureId: string, userId: string) {
  return prisma.capture.findFirst({
    where: { id: captureId, userId },
  });
}

export async function createCapture(input: CreateCaptureInput) {
  // 检查用户配额
  const hasQuota = await entitlementService.checkCaptureQuota(input.userId);
  if (!hasQuota) {
    throw new Error('已达到捕获记录数量上限，请升级套餐');
  }

  return prisma.capture.create({
    data: {
      userId: input.userId,
      text: input.text,
      sourceUrl: input.sourceUrl,
      sourceTitle: input.sourceTitle,
      status: 'inbox',
    },
  });
}

export async function updateCapture(
  captureId: string,
  userId: string,
  input: UpdateCaptureInput
) {
  const capture = await prisma.capture.findFirst({
    where: { id: captureId, userId },
  });

  if (!capture) {
    throw new Error('捕获记录不存在');
  }

  return prisma.capture.update({
    where: { id: captureId },
    data: input,
  });
}

export async function deleteCapture(captureId: string, userId: string) {
  const capture = await prisma.capture.findFirst({
    where: { id: captureId, userId },
  });

  if (!capture) {
    throw new Error('捕获记录不存在');
  }

  return prisma.capture.delete({
    where: { id: captureId },
  });
}

export async function markCaptureAsConverted(
  captureId: string,
  entityId: string,
  userId: string
) {
  const capture = await prisma.capture.findFirst({
    where: { id: captureId, userId },
  });

  if (!capture) {
    throw new Error('捕获记录不存在');
  }

  return prisma.capture.update({
    where: { id: captureId },
    data: {
      status: 'converted',
      entityId,
    },
  });
}

export async function getCaptureStats(userId: string) {
  const total = await prisma.capture.count({
    where: { userId },
  });

  const inbox = await prisma.capture.count({
    where: { userId, status: 'inbox' },
  });

  const organized = await prisma.capture.count({
    where: { userId, status: 'organized' },
  });

  const converted = await prisma.capture.count({
    where: { userId, status: 'converted' },
  });

  return {
    total,
    inbox,
    organized,
    converted,
  };
}
