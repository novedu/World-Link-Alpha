import { prisma } from '../config/database';

export interface ReplaceEntityRelationsInput {
  userId: string;
  worldId: string;
  fromEntityId: string;
  relations: Array<{
    toEntityId: string;
    type: string;
    note?: string;
  }>;
}

export async function getRelationsByWorld(worldId: string, userId: string) {
  const world = await prisma.world.findFirst({
    where: { id: worldId, userId },
    select: { id: true }
  });

  if (!world) {
    throw new Error('世界不存在');
  }

  return prisma.entityRelation.findMany({
    where: { worldId },
    orderBy: { createdAt: 'desc' }
  });
}

export async function replaceEntityRelations(input: ReplaceEntityRelationsInput) {
  const { userId, worldId, fromEntityId } = input;
  const rawRelations = Array.isArray(input.relations) ? input.relations : [];

  const world = await prisma.world.findFirst({
    where: { id: worldId, userId },
    select: { id: true }
  });
  if (!world) {
    throw new Error('世界不存在');
  }

  const sourceEntity = await prisma.entity.findFirst({
    where: { id: fromEntityId, worldId },
    select: { id: true }
  });
  if (!sourceEntity) {
    throw new Error('源实体不存在');
  }

  const worldEntities = await prisma.entity.findMany({
    where: { worldId },
    select: { id: true }
  });
  const validEntityIdSet = new Set(worldEntities.map((item) => item.id));

  const dedupMap = new Map<
    string,
    {
      worldId: string;
      fromEntityId: string;
      toEntityId: string;
      type: string;
      note?: string;
    }
  >();

  rawRelations.forEach((relation) => {
    const toEntityId = String(relation?.toEntityId || '').trim();
    const type = String(relation?.type || '').trim() || 'related_to';
    const note = String(relation?.note || '').trim();

    if (!toEntityId || toEntityId === fromEntityId) return;
    if (!validEntityIdSet.has(toEntityId)) return;

    const key = `${toEntityId}::${type}::${note}`;
    dedupMap.set(key, {
      worldId,
      fromEntityId,
      toEntityId,
      type,
      note: note || undefined
    });
  });

  const rows = Array.from(dedupMap.values());

  await prisma.$transaction(async (tx) => {
    await tx.entityRelation.deleteMany({
      where: {
        worldId,
        fromEntityId
      }
    });

    for (const row of rows) {
      await tx.entityRelation.create({ data: row });
    }
  });

  return prisma.entityRelation.findMany({
    where: {
      worldId,
      fromEntityId
    },
    orderBy: { createdAt: 'desc' }
  });
}
