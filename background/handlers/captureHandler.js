// 采集相关的消息处理器

const { applyCaptureStatus, safeName } = require('../utils/helpers');

class CaptureHandler {
  constructor(dataRepository) {
    this.dataRepository = dataRepository;
  }

  async handleUpdateCaptureStatus(data) {
    try {
      const captureId = safeName(data.captureId);
      const text = safeName(data.text);
      const status = data.status;
      const timestamp = Number(data.timestamp || Date.now());

      if (!captureId && !text) {
        return { success: false, error: '缺少采集记录标识' };
      }

      const store = await this.dataRepository.readData();
      let index = -1;
      if (captureId) {
        index = store.capturedList.findIndex((item) => safeName(item.id) === captureId);
      }

      if (index < 0 && text) {
        const matchedIndices = store.capturedList
          .map((item, itemIndex) => ({
            itemIndex,
            text: String(item.text || '').trim()
          }))
          .filter((item) => item.text === text)
          .map((item) => item.itemIndex);

        if (matchedIndices.length > 1) {
          return {
            success: false,
            error: '匹配到多条同文本采集记录，请使用 captureId 精准更新',
            errorType: 'ambiguous'
          };
        }

        index = matchedIndices[0] ?? -1;
      }

      if (index < 0) {
        return { success: false, error: '未找到对应的采集记录' };
      }

      const updated = applyCaptureStatus(store.capturedList[index], status, timestamp);
      store.capturedList[index] = updated;

      await this.dataRepository.writeData({ capturedList: store.capturedList });
      return { success: true, item: updated };
    } catch (error) {
      console.error('[CaptureHandler] handleUpdateCaptureStatus error:', error);
      return { success: false, error: error?.message || '更新采集状态失败' };
    }
  }

  async markCaptureConvertedByText(text) {
    try {
      if (!text) return;
      const store = await this.dataRepository.readData();
      const index = store.capturedList.findIndex(
        (item) => String(item.text || '').trim() === String(text || '').trim()
      );
      if (index < 0) return;

      const updated = applyCaptureStatus(store.capturedList[index], 'converted', Date.now());
      store.capturedList[index] = updated;
      await this.dataRepository.writeData({ capturedList: store.capturedList });
    } catch (error) {
      console.warn('[CaptureHandler] markCaptureConvertedByText error:', error?.message || error);
    }
  }

  validateUpdateCaptureStatusPayload(payload) {
    if (!this.isPlainObject(payload)) {
      return this.createValidationResult('UPDATE_CAPTURE_STATUS 参数必须是对象');
    }

    const captureId = safeName(payload.captureId);
    const text = safeName(payload.text);
    if (!captureId && !text) {
      return this.createValidationResult('UPDATE_CAPTURE_STATUS 缺少 captureId 或 text');
    }

    const CAPTURE_STATUS_VALUES = new Set(['inbox', 'organized', 'converted']);
    if (!CAPTURE_STATUS_VALUES.has(payload.status)) {
      return this.createValidationResult('UPDATE_CAPTURE_STATUS.status 非法');
    }

    if (payload.timestamp !== undefined) {
      const timestamp = Number(payload.timestamp);
      if (!Number.isFinite(timestamp) || timestamp < 0) {
        return this.createValidationResult('UPDATE_CAPTURE_STATUS.timestamp 非法');
      }
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
