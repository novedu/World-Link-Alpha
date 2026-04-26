const { safeName } = require('../utils/helpers');
const { DEFAULT_RUNTIME_CONFIG } = require('../utils/constants');

class ExportService {
  constructor(dataRepository) {
    this.dataRepository = dataRepository;
  }

  async getAuthToken() {
    const session = await this.dataRepository.getAuthSession();
    return safeName(session?.accessToken);
  }

  async getRequestConfig() {
    const runtimeConfig = await this.dataRepository.getRuntimeConfig();
    const repositoryMode = safeName(runtimeConfig?.repositoryMode).toLowerCase() || 'cloud';
    const baseUrl = safeName(runtimeConfig?.cloudApiBaseUrl)
      .replace(/\/+$/g, '')
      .replace(/\/api$/i, '');
    const timeoutRaw = Number(runtimeConfig?.cloudTimeoutMs ?? DEFAULT_RUNTIME_CONFIG.cloudTimeoutMs);
    const timeoutMs = Number.isFinite(timeoutRaw)
      ? Math.max(3000, Math.min(60000, Math.floor(timeoutRaw)))
      : DEFAULT_RUNTIME_CONFIG.cloudTimeoutMs;
    return { baseUrl, timeoutMs, repositoryMode };
  }

  async request(path, config = {}) {
    const token = await this.getAuthToken();
    if (!token) {
      return { success: false, status: 401, error: '请先登录账号后再进行导出' };
    }

    const { baseUrl, timeoutMs } = await this.getRequestConfig();
    const resolvedBaseUrl = baseUrl || 'http://localhost:3001';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    let response;
    let payload = {};

    try {
      response = await fetch(`${resolvedBaseUrl}/api${path}`, {
        method: config.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(config.headers || {})
        },
        body: config.body ? JSON.stringify(config.body) : undefined,
        signal: controller.signal
      });
      payload = await response.json().catch(() => ({}));
    } catch (error) {
      const isTimeout = error?.name === 'AbortError';
      return {
        success: false,
        status: isTimeout ? 408 : 0,
        error: isTimeout ? `请求超时（>${timeoutMs}ms）` : (error?.message || '网络请求失败')
      };
    } finally {
      clearTimeout(timeoutId);
    }

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

  async consumeExport(format) {
    const result = await this.request('/entitlements/exports/consume', {
      method: 'POST',
      body: { format }
    });
    return result;
  }
}

module.exports = ExportService;
