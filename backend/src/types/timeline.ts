export interface CreateTimelineEventInput {
  worldId: string;
  entityId: string;
  eventType: string;
  title: string;
  description?: string;
  timestamp: Date;
  metadata?: string;
}

export interface UpdateTimelineEventInput {
  eventType?: string;
  title?: string;
  description?: string;
  timestamp?: Date;
  metadata?: string;
}