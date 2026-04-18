import { PrismaClient, TimelineEvent } from '@prisma/client';
import { CreateTimelineEventInput, UpdateTimelineEventInput } from '../types/timeline';

const prisma = new PrismaClient();

export async function createTimelineEvent(data: CreateTimelineEventInput): Promise<TimelineEvent> {
  return prisma.timelineEvent.create({
    data: {
      worldId: data.worldId,
      entityId: data.entityId,
      eventType: data.eventType,
      title: data.title,
      description: data.description,
      timestamp: data.timestamp,
      metadata: data.metadata
    }
  });
}

export async function getTimelineEventsByEntity(entityId: string): Promise<TimelineEvent[]> {
  return prisma.timelineEvent.findMany({
    where: { entityId },
    orderBy: { timestamp: 'asc' }
  });
}

export async function getTimelineEventsByWorld(worldId: string): Promise<TimelineEvent[]> {
  return prisma.timelineEvent.findMany({
    where: { worldId },
    orderBy: { timestamp: 'asc' }
  });
}

export async function updateTimelineEvent(eventId: string, data: UpdateTimelineEventInput): Promise<TimelineEvent> {
  return prisma.timelineEvent.update({
    where: { id: eventId },
    data: {
      eventType: data.eventType,
      title: data.title,
      description: data.description,
      timestamp: data.timestamp,
      metadata: data.metadata
    }
  });
}

export async function deleteTimelineEvent(eventId: string): Promise<TimelineEvent> {
  return prisma.timelineEvent.delete({
    where: { id: eventId }
  });
}

export async function getTimelineEventById(eventId: string): Promise<TimelineEvent | null> {
  return prisma.timelineEvent.findUnique({
    where: { id: eventId }
  });
}