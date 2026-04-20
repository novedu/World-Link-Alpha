import { http } from '../lib/http/client';

interface ContextEntity {
  id: string;
  name: string;
  type: string;
  summary?: string;
}

interface ParseManuscriptParams {
  worldId: string;
  bookId?: string;
  text: string;
}

class AiService {
  async entityAssist(params: {
    text: string;
    mode: 'summarize' | 'expand';
    assistProfile?: {
      style?: string;
      targetLength?: number;
    };
    contextEntities?: ContextEntity[];
  }) {
    return http.post('/ai/entity-assist', params);
  }

  async entityConflict(params: {
    targetEntity: {
      id: string;
      name: string;
      type: string;
      summary: string;
    };
    contextEntities?: ContextEntity[];
    worldContext?: {
      worldId: string;
      worldName: string;
    };
  }) {
    return http.post('/ai/entity-conflict', params);
  }

  async reportFeedback(params: {
    type: 'assist' | 'conflict';
    feedback: {
      isPositive: boolean;
      traceId?: string;
      comment?: string;
    };
  }) {
    return http.post('/ai/report-feedback', params);
  }

  async generateImage(params: {
    prompt: string;
    entityType: 'character' | 'location' | 'item';
    style?: string;
  }) {
    return http.post('/ai/generate-image', params);
  }

  async parseManuscript(params: ParseManuscriptParams) {
    return http.post('/ai/parse-manuscript', params);
  }
}

export const aiService = new AiService();
