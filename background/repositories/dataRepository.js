// 数据仓库模块

const { STORAGE_KEYS, DEFAULT_RUNTIME_CONFIG } = require('../utils/constants');
const { normalizeStoreShape, normalizeRuntimeConfig, createSeedWorlds, createSeedBooks } = require('../utils/helpers');

class DataRepository {
  constructor() {
    this.mode = 'local';
    this.cloudApiBaseUrl = '';
    this.cloudTimeoutMs = DEFAULT_RUNTIME_CONFIG.cloudTimeoutMs;
  }

  async readData() {
    try {
      const items = await chrome.storage.local.get(STORAGE_KEYS);
      return normalizeStoreShape(items);
    } catch (error) {
      console.warn('[DataRepository] readData fallback:', error?.message || error);
      return normalizeStoreShape({});
    }
  }

  async writeData(updates) {
    try {
      await chrome.storage.local.set(updates);
      return { success: true };
    } catch (error) {
      console.error('[DataRepository] writeData error:', error);
      return { success: false, error: error?.message || '数据写入失败' };
    }
  }

  async ensureSeedData() {
    try {
      const data = await this.readData();
      if (data.worlds.length === 0) {
        const seedWorlds = createSeedWorlds();
        const seedBooks = createSeedBooks();
        await this.writeData({ worlds: seedWorlds, books: seedBooks });
      }
    } catch (error) {
      console.warn('[DataRepository] ensureSeedData skipped:', error?.message || error);
    }
  }

  async getRuntimeConfig() {
    try {
      const { runtimeConfig } = await chrome.storage.local.get('runtimeConfig');
      return normalizeRuntimeConfig(runtimeConfig);
    } catch (error) {
      console.warn('[DataRepository] getRuntimeConfig fallback:', error?.message || error);
      return DEFAULT_RUNTIME_CONFIG;
    }
  }

  async setRuntimeConfig(config) {
    try {
      const normalized = normalizeRuntimeConfig(config);
      await chrome.storage.local.set({ runtimeConfig: normalized });
      this.mode = normalized.repositoryMode;
      this.cloudApiBaseUrl = normalized.cloudApiBaseUrl;
      this.cloudTimeoutMs = normalized.cloudTimeoutMs;
      return { success: true, config: normalized };
    } catch (error) {
      console.error('[DataRepository] setRuntimeConfig error:', error);
      return { success: false, error: error?.message || '配置更新失败' };
    }
  }

  async getAuthSession() {
    try {
      const { authSession } = await chrome.storage.local.get('authSession');
      return authSession || null;
    } catch (error) {
      console.warn('[DataRepository] getAuthSession fallback:', error?.message || error);
      return null;
    }
  }

  async setAuthSession(session) {
    try {
      await chrome.storage.local.set({ authSession: session });
      return { success: true };
    } catch (error) {
      console.error('[DataRepository] setAuthSession error:', error);
      return { success: false, error: error?.message || '会话更新失败' };
    }
  }

  async clearAuthSession() {
    try {
      await chrome.storage.local.remove('authSession');
      return { success: true };
    } catch (error) {
      console.error('[DataRepository] clearAuthSession error:', error);
      return { success: false, error: error?.message || '会话清除失败' };
    }
  }

  async getEntitlements() {
    try {
      const { entitlements } = await chrome.storage.local.get('entitlements');
      return entitlements || null;
    } catch (error) {
      console.warn('[DataRepository] getEntitlements fallback:', error?.message || error);
      return null;
    }
  }

  async setEntitlements(entitlements) {
    try {
      await chrome.storage.local.set({ entitlements });
      return { success: true };
    } catch (error) {
      console.error('[DataRepository] setEntitlements error:', error);
      return { success: false, error: error?.message || '权限更新失败' };
    }
  }

  async getUsageMeter() {
    try {
      const { usageMeter } = await chrome.storage.local.get('usageMeter');
      return usageMeter || {};
    } catch (error) {
      console.warn('[DataRepository] getUsageMeter fallback:', error?.message || error);
      return {};
    }
  }

  async setUsageMeter(usageMeter) {
    try {
      await chrome.storage.local.set({ usageMeter });
      return { success: true };
    } catch (error) {
      console.error('[DataRepository] setUsageMeter error:', error);
      return { success: false, error: error?.message || '用量更新失败' };
    }
  }
}

module.exports = DataRepository;
