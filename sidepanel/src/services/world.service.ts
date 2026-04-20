import { http } from '../lib/http/client';

/**
 * 世界(World)数据结构接口
 * @description 代表一个创作世界的顶层容器
 */
interface World {
  id: string;
  name: string;
  description?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 世界服务类
 * @description 处理世界的CRUD操作和统计信息
 * @example
 * // 获取所有世界
 * const worlds = await worldService.getWorlds();
 * // 创建新世界
 * const newWorld = await worldService.createWorld('我的世界', '这是一个奇幻世界');
 */
class WorldService {
  /**
   * 获取当前用户的所有世界
   * @returns Promise<ApiResponse<World[]>> - 世界列表
   * @remarks
   * 返回当前登录用户创建的所有世界，按更新时间倒序排列
   */
  async getWorlds() {
    return http.get('/worlds');
  }

  /**
   * 创建新世界
   * @param name - 世界名称（必填）
   * @param description - 世界描述（可选）
   * @returns Promise<ApiResponse<World>> - 创建的世界信息
   * @remarks
   * 创建一个新的世界作为创作容器，可以包含多个书籍和实体
   */
  async createWorld(name: string, description: string) {
    return http.post('/worlds', { name, description });
  }

  /**
   * 获取世界详情
   * @param id - 世界ID
   * @returns Promise<ApiResponse<World>> - 世界详细信息
   * @remarks
   * 返回指定世界的完整信息，包括所有关联数据
   */
  async getWorld(id: string) {
    return http.get(`/worlds/${id}`);
  }

  /**
   * 更新世界信息
   * @param id - 世界ID
   * @param updates - 要更新的字段
   * @param updates.name - 世界名称（可选）
   * @param updates.description - 世界描述（可选）
   * @returns Promise<ApiResponse<World>> - 更新后的世界信息
   */
  async updateWorld(id: string, updates: { name?: string; description?: string }) {
    return http.put(`/worlds/${id}`, updates);
  }

  /**
   * 删除世界
   * @param id - 世界ID
   * @returns Promise<ApiResponse<void>> - 删除操作结果
   * @remarks
   * 删除世界及其所有关联的书籍、实体和关系。此操作不可恢复
   */
  async deleteWorld(id: string) {
    return http.delete(`/worlds/${id}`);
  }

  /**
   * 获取世界统计信息
   * @param id - 世界ID
   * @returns Promise<ApiResponse<WorldStats>> - 世界统计数据
   * @remarks
   * 返回世界内的实体数量、书籍数量、关系数量等统计信息
   */
  async getWorldStats(id: string) {
    return http.get(`/worlds/${id}/stats`);
  }
}

export const worldService = new WorldService();
