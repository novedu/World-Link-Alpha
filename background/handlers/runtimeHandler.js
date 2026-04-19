// 运行时相关的消息处理器

class RuntimeHandler {
  constructor(dataRepository) {
    this.dataRepository = dataRepository;
  }

  async handleRefreshData() {
    return this.dataRepository.readData();
  }

  async handleGetRuntimeContext() {
    try {
      const data = await this.dataRepository.readData();
      const config = await this.dataRepository.getRuntimeConfig();
      const session = await this.dataRepository.getAuthSession();
      return {
        data,
        config,
        session,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('[RuntimeHandler] handleGetRuntimeContext error:', error);
      return { success: false, error: error?.message || '获取运行时上下文失败' };
    }
  }

  async handleGetRuntimeConfig() {
    return this.dataRepository.getRuntimeConfig();
  }

  async handleSetRuntimeConfig(data) {
    return this.dataRepository.setRuntimeConfig(data);
  }

  validateSetRuntimeConfigPayload(payload) {
    if (!this.isPlainObject(payload)) {
      return this.createValidationResult('SET_RUNTIME_CONFIG 参数必须是对象');
    }

    if (payload.repositoryMode !== undefined) {
      const mode = this.safeName(payload.repositoryMode).toLowerCase();
      if (mode !== 'local' && mode !== 'cloud') {
        return this.createValidationResult('SET_RUNTIME_CONFIG.repositoryMode 非法');
      }
    }

    if (payload.cloudApiBaseUrl !== undefined && typeof payload.cloudApiBaseUrl !== 'string') {
      return this.createValidationResult('SET_RUNTIME_CONFIG.cloudApiBaseUrl 必须是字符串');
    }

    if (payload.cloudTimeoutMs !== undefined) {
      const timeout = Number(payload.cloudTimeoutMs);
      if (!Number.isFinite(timeout) || timeout <= 0) {
        return this.createValidationResult('SET_RUNTIME_CONFIG.cloudTimeoutMs 非法');
      }
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

module.exports = RuntimeHandler;
