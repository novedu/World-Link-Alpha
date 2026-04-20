import { http } from '../lib/http/client';

type EntityFilters = Record<string, string | number | boolean | undefined>;

interface EntityPayload {
  worldId: string;
  name: string;
  type: string;
  summary?: string;
  tags?: string[];
  sourceUrl?: string;
  sourceTitle?: string;
}

type EntityUpdatePayload = Partial<Omit<EntityPayload, 'worldId'>>;
type EntityRelationPayload = {
  toEntityId: string;
  type: string;
  note?: string;
};

// 实体服务
class EntityService {
  // 获取世界下的实体列表
  async getEntities(worldId: string, filters: EntityFilters = {}) {
    return http.get('/entities', { worldId, ...filters });
  }

  // 创建实体
  async createEntity(entityData: EntityPayload) {
    return http.post('/entities', entityData);
  }

  // 获取实体详情
  async getEntity(id: string) {
    return http.get(`/entities/${id}`);
  }

  // 更新实体
  async updateEntity(id: string, updates: EntityUpdatePayload) {
    return http.put(`/entities/${id}`, updates);
  }

  // 删除实体
  async deleteEntity(id: string) {
    return http.delete(`/entities/${id}`);
  }

  // 绑定实体到书项目
  async bindEntityToBook(entityId: string, bookId: string) {
    return http.post(`/entities/${entityId}/bind`, { bookId });
  }

  // 解绑实体从书项目
  async unbindEntityFromBook(entityId: string, bookId: string) {
    return http.post(`/entities/${entityId}/unbind`, { bookId });
  }

  async getRelations(worldId: string) {
    return http.get('/entities/relations', { worldId });
  }

  async replaceRelations(entityId: string, worldId: string, relations: EntityRelationPayload[]) {
    return http.put(`/entities/${entityId}/relations`, {
      worldId,
      relations
    });
  }
}

export const entityService = new EntityService();
