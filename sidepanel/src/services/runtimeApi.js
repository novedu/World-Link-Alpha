/* global chrome */

const DEFAULT_RUNTIME_CONFIG = {
  repositoryMode: 'local',
  cloudApiBaseUrl: '',
  cloudTimeoutMs: 12000
};

function normalizeRepositoryMode(value, fallbackMode = 'local') {
  const mode = String(value || '').trim().toLowerCase();
  if (mode === 'cloud' || mode === 'local') return mode;
  const fallback = String(fallbackMode || '').trim().toLowerCase();
  return fallback === 'cloud' ? 'cloud' : 'local';
}

function normalizeCloudTimeoutMs(value) {
  const timeoutRaw = Number(value ?? DEFAULT_RUNTIME_CONFIG.cloudTimeoutMs);
  if (!Number.isFinite(timeoutRaw)) return DEFAULT_RUNTIME_CONFIG.cloudTimeoutMs;
  return Math.max(3000, Math.min(60000, Math.floor(timeoutRaw)));
}

export function createDefaultRuntimeConfig() {
  return { ...DEFAULT_RUNTIME_CONFIG };
}

export function createDefaultRuntimeContext() {
  return {
    repositoryMode: 'local',
    cloudEnabled: false,
    authEnabled: true,
    runtimeConfig: createDefaultRuntimeConfig(),
    entitlements: null,
    usage: null,
    cloudDiagnostics: null
  };
}

export function sendRuntimeMessage(type, data) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type, data }, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ success: false, error: chrome.runtime.lastError.message });
        return;
      }
      resolve(response || { success: false, error: '后台无响应' });
    });
  });
}

export function formatRuntimeError(result, fallback = '操作失败，请稍后重试') {
  const message = String(result?.error || fallback);
  const traceId = String(result?.traceId || '').trim();
  if (!traceId) return message;
  return `${message}（trace: ${traceId}）`;
}

export function normalizeRuntimeConfig(rawConfig, fallbackRepositoryMode = 'local') {
  const repositoryMode = normalizeRepositoryMode(rawConfig?.repositoryMode, fallbackRepositoryMode);
  return {
    repositoryMode,
    cloudApiBaseUrl: String(rawConfig?.cloudApiBaseUrl || '')
      .trim()
      .replace(/\/+$/g, ''),
    cloudTimeoutMs: normalizeCloudTimeoutMs(rawConfig?.cloudTimeoutMs)
  };
}

export function normalizeRuntimeContext(result) {
  const repositoryMode = normalizeRepositoryMode(result?.repositoryMode || result?.runtimeConfig?.repositoryMode, 'local');
  const runtimeConfig = normalizeRuntimeConfig(result?.runtimeConfig, repositoryMode);
  return {
    repositoryMode,
    cloudEnabled: typeof result?.cloudEnabled === 'boolean' ? result.cloudEnabled : repositoryMode === 'cloud',
    authEnabled: Boolean(result?.authEnabled),
    runtimeConfig,
    entitlements: result?.entitlements || null,
    usage: result?.usage || null,
    cloudDiagnostics: result?.cloudDiagnostics || null
  };
}
