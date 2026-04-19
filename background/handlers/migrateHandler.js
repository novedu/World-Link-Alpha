// 数据迁移相关的消息处理器

const { mergeStoreShape, cloneData } = require('../utils/helpers');

class MigrateHandler {
  constructor(dataRepository) {
    this.dataRepository = dataRepository;
  }

  async handleMigrateLocalToCloud(data) {
    try {
      const strategy = data?.strategy || 'merge';
      const clearLocalAfterImport = Boolean(data?.clearLocalAfterImport);

      const store = await this.dataRepository.readData();
      const cloudData = this.getCloudDataFromApi();

      let merged;
      if (strategy === 'overwrite') {
        merged = cloudData;
      } else {
        merged = mergeStoreShape(store, cloudData);
      }

      await this.dataRepository.writeData(merged);

      if (clearLocalAfterImport) {
        await this.clearLocalData();
      }

      return {
        success: true,
        strategy,
        merged: true,
        clearedLocal: clearLocalAfterImport,
        stats: {
          worlds: merged.worlds.length,
          books: merged.books.length,
          entities: merged.entities.length
        }
      };
    } catch (error) {
      console.error('[MigrateHandler] handleMigrateLocalToCloud error:', error);
      return { success: false, error: error?.message || '迁移失败' };
    }
  }

  async getCloudDataFromApi() {
    try {
      const response = await fetch('http://localhost:3001/api/v1/store/import', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      return cloneData(result.data || {});
    } catch (error) {
      console.warn('[MigrateHandler] getCloudDataFromApi fallback:', error?.message || error);
      return {
        worlds: [],
        books: [],
        entities: [],
        bookEntityUsages: [],
        entityRelations: [],
        capturedList: []
      };
    }
  }

  async clearLocalData() {
    try {
      await chrome.storage.local.remove([
        'capturedList',
        'worlds',
        'books',
        'entities',
        'bookEntityUsages',
        'entityRelations'
      ]);
      return { success: true };
    } catch (error) {
      console.error('[MigrateHandler] clearLocalData error:', error);
      return { success: false, error: error?.message || '清除本地数据失败' };
    }
  }

  validateMigrateLocalToCloudPayload(payload) {
    if (payload === undefined || payload === null) return null;
    if (!this.isPlainObject(payload)) {
      return this.createValidationResult('MIGRATE_LOCAL_TO_CLOUD 参数必须是对象');
    }

    if (payload.strategy !== undefined) {
      const strategy = this.safeName(payload.strategy).toLowerCase();
      if (strategy !== 'merge' && strategy !== 'overwrite') {
        return this.createValidationResult('MIGRATE_LOCAL_TO_CLOUD.strategy 非法');
      }
    }

    if (payload.clearLocalAfterImport !== undefined && typeof payload.clearLocalAfterImport !== 'boolean') {
      return this.createValidationResult('MIGRATE_LOCAL_TO_CLOUD.clearLocalAfterImport 必须是布尔值');
    }

    return null;
  }

  safeName(value) {
    return String(value || '').trim();
  }

  isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  createValidationResult(error, details = {}) {
    return {
      success: false,
      error,
      errorType: 'validation',
      details
    };
  }
}

module.exports = MigrateHandler;
