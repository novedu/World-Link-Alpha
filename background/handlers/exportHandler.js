// 导出相关的消息处理器

const { safeName, mergeUniqueByKey, formatTodayKey, normalizeUsageMeter, trimUsageMeter } = require('../utils/helpers');

class ExportHandler {
  constructor(dataRepository) {
    this.dataRepository = dataRepository;
  }

  async handleRequestExport(data) {
    try {
      const format = safeName(data.format).toLowerCase();
      const worldId = data.worldId ? safeName(data.worldId) : null;

      if (format !== 'json' && format !== 'markdown') {
        return { success: false, error: '无效的导出格式' };
      }

      const store = await this.dataRepository.readData();
      const usageCheck = await this.checkExportQuota();
      if (!usageCheck.success) {
        return usageCheck;
      }

      let exportData = store;
      if (worldId) {
        exportData = {
          worlds: store.worlds.filter((w) => w.id === worldId),
          books: store.books.filter((b) => b.worldId === worldId),
          entities: store.entities.filter((e) => e.worldId === worldId),
          capturedList: store.capturedList,
          bookEntityUsages: store.bookEntityUsages.filter((usage) => {
            const book = store.books.find((b) => b.id === usage.bookId);
            return book && book.worldId === worldId;
          }),
          entityRelations: store.entityRelations.filter((r) => r.worldId === worldId)
        };
      }

      const action = format === 'markdown' ? 'export_markdown' : 'export_json';
      await this.incrementUsage(action);

      return {
        success: true,
        format,
        data: exportData,
        exportedAt: Date.now()
      };
    } catch (error) {
      console.error('[ExportHandler] handleRequestExport error:', error);
      return { success: false, error: error?.message || '导出失败' };
    }
  }

  async checkExportQuota() {
    try {
      const entitlements = await this.dataRepository.getEntitlements();
      const isPro = entitlements?.plan === 'pro';

      if (isPro) {
        return { success: true };
      }

      const usageMeter = await this.dataRepository.getUsageMeter();
      const todayKey = formatTodayKey();
      const todayUsage = normalizeUsageMeter(usageMeter)[todayKey] || {};
      const markdownCount = todayUsage.export_markdown || 0;
      const limit = 5;

      if (markdownCount >= limit) {
        return {
          success: false,
          error: '今日导出次数已用完，请升级到 Pro 版本',
          errorType: 'quota',
          limit
        };
      }

      return { success: true };
    } catch (error) {
      console.warn('[ExportHandler] checkExportQuota error:', error?.message || error);
      return { success: true };
    }
  }

  async incrementUsage(action) {
    try {
      const usageMeter = await this.dataRepository.getUsageMeter();
      const todayKey = formatTodayKey();
      const normalized = normalizeUsageMeter(usageMeter);

      if (!normalized[todayKey]) {
        normalized[todayKey] = {
          capture_create: 0,
          export_markdown: 0,
          export_json: 0
        };
      }

      normalized[todayKey][action] = (normalized[todayKey][action] || 0) + 1;
      const trimmed = trimUsageMeter(normalized, 10);

      await this.dataRepository.setUsageMeter(trimmed);
    } catch (error) {
      console.warn('[ExportHandler] incrementUsage error:', error?.message || error);
    }
  }

  validateRequestExportPayload(payload) {
    if (!this.isPlainObject(payload)) {
      return this.createValidationResult('REQUEST_EXPORT 参数必须是对象');
    }

    const format = safeName(payload.format).toLowerCase();
    if (format !== 'json' && format !== 'markdown') {
      return this.createValidationResult('REQUEST_EXPORT.format 非法');
    }

    return null;
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

module.exports = ExportHandler;
