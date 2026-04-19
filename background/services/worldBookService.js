// 世界和书籍服务模块

const { createId, safeName } = require('../utils/helpers');

class WorldBookService {
  constructor(dataRepository) {
    this.dataRepository = dataRepository;
  }

  async createWorld(name) {
    try {
      const worldName = safeName(name);
      if (!worldName) {
        return { success: false, error: '世界名称不能为空' };
      }

      const store = await this.dataRepository.readData();
      const existing = store.worlds.find((w) => safeName(w.name) === worldName);
      if (existing) {
        return { success: false, error: '世界名称已存在' };
      }

      const world = {
        id: createId('world'),
        name: worldName,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      store.worlds.unshift(world);
      await this.dataRepository.writeData({ worlds: store.worlds });
      return { success: true, world };
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

      const store = await this.dataRepository.readData();
      const worldExists = store.worlds.some((w) => w.id === worldIdSafe);
      if (!worldExists) {
        return { success: false, error: '世界不存在' };
      }

      const book = {
        id: createId('book'),
        worldId: worldIdSafe,
        title: bookTitle,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      store.books.unshift(book);
      await this.dataRepository.writeData({ books: store.books });
      return { success: true, book };
    } catch (error) {
      console.error('[WorldBookService] createBook error:', error);
      return { success: false, error: error?.message || '创建书籍失败' };
    }
  }

  async getWorldsAndBooks() {
    try {
      const { worlds, books } = await this.dataRepository.readData();
      return { worlds, books };
    } catch (error) {
      console.warn('[WorldBookService] getWorldsAndBooks fallback:', error?.message || error);
      return { worlds: [], books: [] };
    }
  }
}

module.exports = WorldBookService;
