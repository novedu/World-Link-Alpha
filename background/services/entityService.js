// 实体服务模块

const { safeName, normalizeEntityRecordForStorage } = require('../utils/helpers');
const { DEFAULT_RUNTIME_CONFIG } = require('../utils/constants');

class EntityService {
  constructor(dataRepository) {
    this.dataRepository = dataRepository;
  }

  async getAuthToken() {
    const session = await this.dataRepository.getAuthSession();
    return safeName(session?.accessToken);
  }

  async getRequestConfig() {
    const runtimeConfig = await this.dataRepository.getRuntimeConfig();
    const repositoryMode = safeName(runtimeConfig?.repositoryMode).toLowerCase() || 'cloud';
    const baseUrl = safeName(runtimeConfig?.cloudApiBaseUrl)
      .replace(/\/+$/g, '')
      .replace(/\/api$/i, '');
    const timeoutRaw = Number(runtimeConfig?.cloudTimeoutMs ?? DEFAULT_RUNTIME_CONFIG.cloudTimeoutMs);
    const timeoutMs = Number.isFinite(timeoutRaw)
      ? Math.max(3000, Math.min(60000, Math.floor(timeoutRaw)))
      : DEFAULT_RUNTIME_CONFIG.cloudTimeoutMs;
    return { baseUrl, timeoutMs, repositoryMode };
  }

  async request(path, config = {}) {
    const token = await this.getAuthToken();
    if (!token) {
      return { success: false, status: 401, error: '请先登录账号后再进行采集' };
    }

    const { baseUrl, timeoutMs, repositoryMode } = await this.getRequestConfig();
    if (repositoryMode === 'cloud' && !baseUrl) {
      return {
        success: false,
        status: 400,
        error: '云端 API 地址未配置，请先在 Sidepanel 完成账号初始化',
        errorCode: 'CLOUD_API_BASE_URL_REQUIRED'
      };
    }

    const resolvedBaseUrl = baseUrl || 'http://localhost:3001';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    let response;
    let payload = {};

    try {
      response = await fetch(`${resolvedBaseUrl}/api${path}`, {
        method: config.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(config.headers || {})
        },
        body: config.body ? JSON.stringify(config.body) : undefined,
        signal: controller.signal
      });
      payload = await response.json().catch(() => ({}));
    } catch (error) {
      const isTimeout = error?.name === 'AbortError';
      return {
        success: false,
        status: isTimeout ? 408 : 0,
        error: isTimeout ? `请求超时（>${timeoutMs}ms）` : (error?.message || '网络请求失败')
      };
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok || payload?.success === false) {
      return {
        success: false,
        status: response.status,
        error: payload?.error?.message || `请求失败（${response.status}）`
      };
    }

    return {
      success: true,
      data: payload?.data
    };
  }

  async saveEntityFromCapture(payload) {
    try {
      const input = payload || {};
      const selectedBooks = Array.isArray(input.selectedBooks) ? input.selectedBooks.map(safeName).filter(Boolean) : [];
      const name = safeName(input.name);
      const worldId = safeName(input.worldId);

      if (!name) return { success: false, error: '实体名称不能为空' };
      if (!worldId) return { success: false, error: '请先选择世界' };

      const createResult = await this.request('/entities', {
        method: 'POST',
        body: {
          worldId,
          name,
          type: safeName(input.type) || 'other',
          summary: String(input.summary || '').trim(),
          tags: normalizeEntityRecordForStorage({ tags: input.tags || [] }).tags,
          sourceUrl: String(input.sourceUrl || '').trim(),
          sourceTitle: String(input.sourceTitle || '').trim()
        }
      });
      if (!createResult.success || !createResult.data) {
        return { success: false, error: createResult.error || '保存设定失败' };
      }

      const entity = createResult.data;
      const entityId = safeName(entity?.id);
      let failedBookBindings = [];
      if (entityId && selectedBooks.length > 0) {
        const bindingResults = await Promise.all(
          selectedBooks.map(async (bookId) => {
            const bindResult = await this.request(`/entities/${encodeURIComponent(entityId)}/bind`, {
              method: 'POST',
              body: { bookId }
            });
            return {
              bookId,
              success: Boolean(bindResult?.success),
              error: bindResult?.error || ''
            };
          })
        );
        failedBookBindings = bindingResults.filter((item) => !item.success);
      }

      const captureText = String(input.selectedText || input.summary || name).trim();
      if (captureText) {
        await this.request('/captures', {
          method: 'POST',
          body: {
            text: captureText,
            sourceUrl: String(input.sourceUrl || '').trim(),
            sourceTitle: String(input.sourceTitle || '').trim()
          }
        });
      }

      return {
        success: true,
        entity,
        partialSuccess: failedBookBindings.length > 0,
        failedBookBindings
      };
    } catch (error) {
      console.error('[EntityService] saveEntityFromCapture error:', error);
      return { success: false, error: error?.message || '保存失败' };
    }
  }

  async saveEntityFromSidepanel(payload) {
    try {
      const input = payload?.entity || {};
      const selectedBookId = safeName(payload?.selectedBookId);
      const usedInCurrentBook = Boolean(input.usedInCurrentBook);
      const name = safeName(input.name);
      const worldId = safeName(input.worldId);

      if (!name) return { success: false, error: '实体名称不能为空' };
      if (!worldId) return { success: false, error: '请先选择世界' };

      const isNew = !input.id;
      let entity;

      if (isNew) {
        // 创建新实体
        const createResult = await this.request('/entities', {
          method: 'POST',
          body: {
            worldId,
            name,
            type: safeName(input.type) || 'other',
            summary: String(input.summary || '').trim(),
            tags: normalizeEntityRecordForStorage({ tags: input.tags || [] }).tags,
            sourceUrl: String(input.sourceUrl || '').trim(),
            sourceTitle: String(input.sourceTitle || '').trim()
          }
        });
        if (!createResult.success || !createResult.data) {
          return { success: false, error: createResult.error || '保存实体失败' };
        }
        entity = createResult.data;
      } else {
        // 更新已有实体
        const updateResult = await this.request(`/entities/${encodeURIComponent(input.id)}`, {
          method: 'PUT',
          body: {
            name,
            type: safeName(input.type) || 'other',
            summary: String(input.summary || '').trim(),
            tags: normalizeEntityRecordForStorage({ tags: input.tags || [] }).tags,
            sourceUrl: String(input.sourceUrl || '').trim(),
            sourceTitle: String(input.sourceTitle || '').trim()
          }
        });
        if (!updateResult.success || !updateResult.data) {
          return { success: false, error: updateResult.error || '更新实体失败' };
        }
        entity = updateResult.data;
      }

      // 处理关系数据
      let relations = [];
      if (Array.isArray(input.relations) && input.relations.length > 0) {
        const relationsResult = await this.request(`/entities/${encodeURIComponent(entity.id)}/relations`, {
          method: 'PUT',
          body: {
            worldId,
            relations: input.relations.map(rel => ({
              toEntityId: safeName(rel.targetEntityId || rel.toEntityId || rel.entityId),
              type: safeName(rel.type),
              note: String(rel.note || '').trim()
            })).filter(rel => rel.toEntityId && rel.type)
          }
        });
        if (relationsResult.success && relationsResult.data) {
          relations = relationsResult.data;
        }
      } else if (!isNew) {
        // 清空关系
        await this.request(`/entities/${encodeURIComponent(entity.id)}/relations`, {
          method: 'PUT',
          body: {
            worldId,
            relations: []
          }
        });
      }

      // 处理书籍绑定
      if (selectedBookId) {
        if (usedInCurrentBook) {
          await this.request(`/entities/${encodeURIComponent(entity.id)}/bind`, {
            method: 'POST',
            body: { bookId: selectedBookId }
          });
        } else {
          await this.request(`/entities/${encodeURIComponent(entity.id)}/unbind`, {
            method: 'POST',
            body: { bookId: selectedBookId }
          });
        }
      }

      return {
        success: true,
        entity,
        relations
      };
    } catch (error) {
      console.error('[EntityService] saveEntityFromSidepanel error:', error);
      return { success: false, error: error?.message || '保存失败' };
    }
  }

  async checkEntityConflict(payload) {
    try {
      const worldId = safeName(payload.worldId);
      const draftEntity = payload.draftEntity;
      const draftName = safeName(draftEntity?.name);

      if (!worldId || !draftName) {
        return { success: false, error: '缺少必要参数' };
      }

      const result = await this.request('/ai/entity-conflict', {
        method: 'POST',
        body: {
          worldId,
          targetEntity: {
            id: draftEntity?.id,
            name: draftName,
            summary: String(draftEntity?.summary || '').trim(),
            type: draftEntity?.type
          }
        }
      });

      if (!result.success) {
        return { success: false, error: result.error || '冲突检查失败' };
      }

      return {
        success: true,
        conflicts: result.data?.conflicts || [],
        hasConflicts: result.data?.hasConflicts || false
      };
    } catch (error) {
      console.error('[EntityService] checkEntityConflict error:', error);
      return { success: false, error: error?.message || '冲突检查失败' };
    }
  }
}

module.exports = EntityService;
