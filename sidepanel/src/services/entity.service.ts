import { http } from '../lib/http/client';

// 实体服务
class EntityService {
  // 获取世界下的实体列表
  async getEntities(worldId: string, filters: { [key: string]: any } = {}) {
    return http.get('/entities', { worldId, ...filters });
  }

  // 创建实体
  async createEntity(entityData: any) {
    return http.post('/entities', entityData);
  }

  // 获取实体详情
  async getEntity(id: string) {
    return http.get(`/entities/${id}`);
  }

  // 更新实体
  async updateEntity(id: string, updates: any) {
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
}

export const entityService = new EntityService();
