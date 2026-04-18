import { http } from '../lib/http/client';

// 世界服务
class WorldService {
  // 获取所有世界
  async getWorlds() {
    return http.get('/worlds');
  }

  // 创建世界
  async createWorld(name: string, description: string) {
    return http.post('/worlds', { name, description });
  }

  // 获取世界详情
  async getWorld(id: string) {
    return http.get(`/worlds/${id}`);
  }

  // 更新世界
  async updateWorld(id: string, updates: { name?: string; description?: string }) {
    return http.put(`/worlds/${id}`, updates);
  }

  // 删除世界
  async deleteWorld(id: string) {
    return http.delete(`/worlds/${id}`);
  }

  // 获取世界统计
  async getWorldStats(id: string) {
    return http.get(`/worlds/${id}/stats`);
  }
}

export const worldService = new WorldService();
