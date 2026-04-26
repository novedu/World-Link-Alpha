// 采集相关的消息处理器

const CaptureService = require('../services/captureService');
const { safeName } = require('../utils/helpers');

class CaptureHandler {
  constructor(dataRepository) {
    this.dataRepository = dataRepository;
    this.captureService = new CaptureService(dataRepository);
  }

  async handleUpdateCaptureStatus(data) {
    try {
      const captureId = safeName(data.captureId);
      const status = data.status;

      if (!captureId) {
        return { success: false, error: '缺少采集记录标识' };
      }

      const result = await this.captureService.updateCapture(captureId, { status });
      if (!result.success) {
        return { success: false, error: result.error };
      }

      return { success: true, item: result.data };
    } catch (error) {
      console.error('[CaptureHandler] handleUpdateCaptureStatus error:', error);
      return { success: false, error: error?.message || '更新采集状态失败' };
    }
  }

  async markCaptureConvertedByText(text, entityId) {
    try {
      if (!text || !entityId) return;
      
      // 注意：这个方法需要先找到 captureId，然后调用 markCaptureAsConverted
      // 由于这里没有完整的实现，我们暂时保持这个骨架
      console.warn('[CaptureHandler] markCaptureConvertedByText 需要 captureId 才能调用云端 API');
    } catch (error) {
      console.warn('[CaptureHandler] markCaptureConvertedByText error:', error?.message || error);
    }
  }

  validateUpdateCaptureStatusPayload(payload) {
    if (!this.isPlainObject(payload)) {
      return this.createValidationResult('UPDATE_CAPTURE_STATUS 参数必须是对象');
    }

    const captureId = safeName(payload.captureId);
    if (!captureId) {
      return this.createValidationResult('UPDATE_CAPTURE_STATUS 缺少 captureId');
    }

    const CAPTURE_STATUS_VALUES = new Set(['inbox', 'organized', 'converted']);
    if (!CAPTURE_STATUS_VALUES.has(payload.status)) {
      return this.createValidationResult('UPDATE_CAPTURE_STATUS.status 非法');
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

module.exports = CaptureHandler;
