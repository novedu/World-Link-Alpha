// 世界和书籍相关的消息处理器

const WorldBookService = require('../services/worldBookService');

class WorldBookHandler {
  constructor(dataRepository) {
    this.worldBookService = new WorldBookService(dataRepository);
  }

  async handleCreateWorld(data) {
    return this.worldBookService.createWorld(data?.name);
  }

  async handleCreateBook(data) {
    return this.worldBookService.createBook(data?.worldId, data?.title);
  }

  async handleGetWorldsAndBooks() {
    return this.worldBookService.getWorldsAndBooks();
  }
}

module.exports = WorldBookHandler;
