// 世界和书籍服务模块

const { safeName } = require('../utils/helpers');
const { DEFAULT_RUNTIME_CONFIG } = require('../utils/constants');

class WorldBookService {
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
      return { success: false, status: 401, error: '未登录账号，请先登录后再使用采集功能' };
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

  async createWorld(name) {
    try {
      const worldName = safeName(name);
      if (!worldName) {
        return { success: false, error: '世界名称不能为空' };
      }
      const result = await this.request('/worlds', {
        method: 'POST',
        body: {
          name: worldName,
          description: ''
        }
      });
      if (!result.success) {
        return { success: false, error: result.error };
      }
      return { success: true, world: result.data };
    } catch (error) {
      console.error('[WorldBookService] createWorld error:', error);
      return { success: false, error: error?.message || '创建世界失败' };
    }
  }

  async createBook(worldId, title) {
    try {
      const worldIdSafe = safeName(worldId);
      const bookTitle = safeName(title);

      if (!worldIdSafe) {
        return { success: false, error: '请选择世界' };
      }
      if (!bookTitle) {
        return { success: false, error: '书籍标题不能为空' };
      }
      const result = await this.request('/books', {
        method: 'POST',
        body: {
          worldId: worldIdSafe,
          title: bookTitle,
          description: ''
        }
      });
      if (!result.success) {
        return { success: false, error: result.error };
      }
      return { success: true, book: result.data };
    } catch (error) {
      console.error('[WorldBookService] createBook error:', error);
      return { success: false, error: error?.message || '创建书籍失败' };
    }
  }

  async getWorldsAndBooks() {
    try {
      const worldsResult = await this.request('/worlds');
      if (!worldsResult.success) {
        return { worlds: [], books: [], error: worldsResult.error };
      }
      const worlds = Array.isArray(worldsResult.data) ? worldsResult.data : [];
      const booksBuckets = await Promise.all(
        worlds.map(async (world) => {
          const worldId = safeName(world?.id);
          if (!worldId) return [];
          const booksResult = await this.request(`/books?worldId=${encodeURIComponent(worldId)}`);
          return booksResult.success && Array.isArray(booksResult.data) ? booksResult.data : [];
        })
      );
      const books = booksBuckets.flat();
      return { worlds, books };
    } catch (error) {
      console.warn('[WorldBookService] getWorldsAndBooks fallback:', error?.message || error);
      return { worlds: [], books: [] };
    }
  }
}

module.exports = WorldBookService;
