// 世界和书籍服务模块

const { safeName } = require('../utils/helpers');

class WorldBookService {
  constructor(dataRepository) {
    this.dataRepository = dataRepository;
  }

  async getAuthToken() {
    const session = await this.dataRepository.getAuthSession();
    return safeName(session?.accessToken);
  }

  async request(path, config = {}) {
    const token = await this.getAuthToken();
    if (!token) {
      return { success: false, status: 401, error: '未登录账号，请先登录后再使用采集功能' };
    }

    const response = await fetch(`http://localhost:3001/api${path}`, {
      method: config.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(config.headers || {})
      },
      body: config.body ? JSON.stringify(config.body) : undefined
    });
    const payload = await response.json().catch(() => ({}));
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
