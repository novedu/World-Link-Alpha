import { http } from '../lib/http/client';

interface TimelineEventPayload {
  worldId: string;
  entityId: string;
  eventType: string;
  title: string;
  description?: string;
  timestamp?: string;
  metadata?: string;
}

class TimelineService {
  async createEvent(eventData: TimelineEventPayload) {
    return http.post('/timeline/events', {
      ...eventData,
      timestamp: eventData.timestamp || new Date().toISOString(),
    });
  }

  async getEntityEvents(entityId: string) {
    return http.get(`/timeline/entities/${entityId}/events`);
  }
}

export const timelineService = new TimelineService();
