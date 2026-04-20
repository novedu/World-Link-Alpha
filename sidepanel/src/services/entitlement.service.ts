import { http } from '../lib/http/client';

export interface EntitlementSnapshot {
  plan: string;
  limits: {
    maxWorlds: number;
    maxBooksPerWorld?: number;
    maxEntities: number;
    maxCaptures: number;
  };
  usage: {
    worlds: number;
    entities: number;
    captures: number;
  };
  features: {
    canExport: boolean;
    canExportMarkdown?: boolean;
    canExportJson?: boolean;
    canUseAI: boolean;
  };
  exports: {
    markdown: number;
    json: number;
  };
  subscriptionStatus: string;
  isActive: boolean;
}

class EntitlementService {
  async getEntitlements() {
    return http.get<EntitlementSnapshot>('/entitlements');
  }

  async consumeExport(format: 'markdown' | 'json') {
    return http.post('/entitlements/exports/consume', { format });
  }
}

export const entitlementService = new EntitlementService();
