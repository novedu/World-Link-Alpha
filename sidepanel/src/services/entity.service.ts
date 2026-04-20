import { http } from '../lib/http/client';

/**
 * 实体过滤器类型
 * @description 用于过滤实体的查询参数
 */
type EntityFilters = Record<string, string | number | boolean | undefined>;

/**
 * 创建实体请求载荷
 * @description 创建新实体时需要提供的数据
 */
interface EntityPayload {
  /** 所属世界ID */
  worldId: string;
  /** 实体名称 */
  name: string;
  /** 实体类型（如：character, location, item等） */
  type: string;
  /** 实体摘要描述 */
  summary?: string;
  /** 实体标签列表 */
  tags?: string[];
  /** 来源URL */
  sourceUrl?: string;
  /** 来源标题 */
  sourceTitle?: string;
}

/**
 * 更新实体请求载荷
 * @description 更新实体时可更新的字段（不含worldId）
 */
type EntityUpdatePayload = Partial<Omit<EntityPayload, 'worldId'>>;

/**
 * 实体关系载荷
 * @description 用于创建或更新实体关系
 */
type EntityRelationPayload = {
  /** 目标实体ID */
  toEntityId: string;
  /** 关系类型 */
  type: string;
  /** 关系备注 */
  note?: string;
};

/**
 * 实体服务类
 * @description 处理实体的CRUD操作、关系管理和书项目绑定
 * @example
 * // 获取世界下的所有实体
 * const entities = await entityService.getEntities(worldId);
 * // 创建新实体
 * const entity = await entityService.createEntity({
 *   worldId: 'world-123',
 *   name: '张三',
 *   type: 'character',
 *   summary: '故事的主角'
 * });
 */
class EntityService {
  /**
   * 获取世界下的实体列表
   * @param worldId - 世界ID
   * @param filters - 可选的过滤条件
   * @returns Promise<ApiResponse<Entity[]>> - 实体列表
   * @remarks
   * 返回指定世界下的所有实体，支持按类型、标签等条件过滤
   */
  async getEntities(worldId: string, filters: EntityFilters = {}) {
    return http.get('/entities', { worldId, ...filters });
  }

  /**
   * 创建新实体
   * @param entityData - 实体数据
   * @returns Promise<ApiResponse<Entity>> - 创建的实体信息
   * @remarks
   * 在指定世界内创建一个新的实体记录
   */
  async createEntity(entityData: EntityPayload) {
    return http.post('/entities', entityData);
  }

  /**
   * 获取实体详情
   * @param id - 实体ID
   * @returns Promise<ApiResponse<EntityDetail>> - 实体详细信息
   * @remarks
   * 返回实体的完整信息，包括关联的书籍使用记录和关系
   */
  async getEntity(id: string) {
    return http.get(`/entities/${id}`);
  }

  /**
   * 更新实体信息
   * @param id - 实体ID
   * @param updates - 要更新的字段
   * @returns Promise<ApiResponse<Entity>> - 更新后的实体信息
   */
  async updateEntity(id: string, updates: EntityUpdatePayload) {
    return http.put(`/entities/${id}`, updates);
  }

  /**
   * 删除实体
   * @param id - 实体ID
   * @returns Promise<ApiResponse<void>> - 删除操作结果
   * @remarks
   * 删除实体及其所有关联的关系记录。此操作不可恢复
   */
  async deleteEntity(id: string) {
    return http.delete(`/entities/${id}`);
  }

  /**
   * 绑定实体到书项目
   * @param entityId - 实体ID
   * @param bookId - 书项目ID
   * @returns Promise<ApiResponse<BookEntityUsage>> - 绑定结果
   * @remarks
   * 将实体关联到指定的书籍，表示该书籍中使用了此实体
   */
  async bindEntityToBook(entityId: string, bookId: string) {
    return http.post(`/entities/${entityId}/bind`, { bookId });
  }

  /**
   * 从书项目解绑实体
   * @param entityId - 实体ID
   * @param bookId - 书项目ID
   * @returns Promise<ApiResponse<void>> - 解绑结果
   * @remarks
   * 移除实体与书籍之间的关联关系
   */
  async unbindEntityFromBook(entityId: string, bookId: string) {
    return http.post(`/entities/${entityId}/unbind`, { bookId });
  }

  /**
   * 获取世界下的所有实体关系
   * @param worldId - 世界ID
   * @returns Promise<ApiResponse<EntityRelation[]>> - 关系列表
   * @remarks
   * 返回指定世界内所有实体之间的关系
   */
  async getRelations(worldId: string) {
    return http.get('/entities/relations', { worldId });
  }

  /**
   * 替换实体的所有关系
   * @param entityId - 实体ID
   * @param worldId - 世界ID
   * @param relations - 新的关系列表
   * @returns Promise<ApiResponse<void>> - 更新结果
   * @remarks
   * 将实体的所有关系替换为提供的新列表（整体替换非增量）
   */
  async replaceRelations(entityId: string, worldId: string, relations: EntityRelationPayload[]) {
    return http.put(`/entities/${entityId}/relations`, {
      worldId,
      relations
    });
  }
}

export const entityService = new EntityService();
