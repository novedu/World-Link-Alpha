// 导出相关的消息处理器

const ExportService = require('../services/exportService');
const { safeName } = require('../utils/helpers');

class ExportHandler {
  constructor(dataRepository) {
    this.dataRepository = dataRepository;
    this.exportService = new ExportService(dataRepository);
  }

  async handleRequestExport(data) {
    try {
      const format = safeName(data.format).toLowerCase();
      const worldId = data.worldId ? safeName(data.worldId) : null;

      if (format !== 'json' && format !== 'markdown') {
        return { success: false, error: '无效的导出格式' };
      }

      // 先调用服务端进行配额校验和计量
      const consumeResult = await this.exportService.consumeExport(format);
      if (!consumeResult.success) {
        return { success: false, error: consumeResult.error, errorType: 'quota' };
      }

      // 从本地存储获取数据用于导出（因为服务端没有批量导出 API）
      const store = await this.dataRepository.readData();

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
