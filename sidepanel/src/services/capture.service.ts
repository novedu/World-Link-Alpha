import { http } from '../lib/http/client';

// 捕获服务
class CaptureService {
  // 获取捕获记录列表
  async getCaptures(filters: { [key: string]: any } = {}) {
    return http.get('/captures', filters);
  }

  // 创建捕获记录
  async createCapture(text: string, sourceUrl: string, sourceTitle: string) {
    return http.post('/captures', { text, sourceUrl, sourceTitle });
  }

  // 获取捕获记录详情
  async getCapture(id: string) {
    return http.get(`/captures/${id}`);
  }

  // 更新捕获记录
  async updateCapture(id: string, updates: { status?: string; entityId?: string }) {
    return http.put(`/captures/${id}`, updates);
  }

  // 删除捕获记录
  async deleteCapture(id: string) {
    return http.delete(`/captures/${id}`);
  }

  // 标记捕获记录为已转换
  async markCaptureAsConverted(captureId: string, entityId: string) {
    return http.post(`/captures/${captureId}/convert`, { entityId });
  }

  // 获取捕获统计
  async getCaptureStats() {
    return http.get('/captures/stats/overview');
  }
}

export const captureService = new CaptureService();
