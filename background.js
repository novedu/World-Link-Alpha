// Background Service Worker - 模块化入口
// 按消息域分 handler，保持入口清晰

const __cjsCache = new Map();

function resolveModulePath(request, parentPath) {
  const input = String(request || '').trim();
  if (!input) {
    throw new Error('require path is empty');
  }
  const withExt = input.endsWith('.js') ? input : `${input}.js`;
  if (withExt.startsWith('./') || withExt.startsWith('../')) {
    const baseUrl = new URL(parentPath, 'https://world-link.local/');
    return new URL(withExt, baseUrl).pathname.replace(/^\/+/, '');
  }
  return withExt.replace(/^\/+/, '');
}

function require(request, parentPath = 'background.js') {
  const modulePath = resolveModulePath(request, parentPath);
  if (__cjsCache.has(modulePath)) {
    return __cjsCache.get(modulePath).exports;
  }

  const module = { exports: {} };
  __cjsCache.set(modulePath, module);

  const prevModule = globalThis.module;
  const prevExports = globalThis.exports;
  const prevRequire = globalThis.require;

  globalThis.module = module;
  globalThis.exports = module.exports;
  globalThis.require = (nextRequest) => require(nextRequest, modulePath);

  try {
    importScripts(chrome.runtime.getURL(modulePath));
    return module.exports;
  } finally {
    globalThis.module = prevModule;
    globalThis.exports = prevExports;
    globalThis.require = prevRequire;
  }
}

const DataRepository = require('./background/repositories/dataRepository');
const AuthHandler = require('./background/handlers/authHandler');
const EntityHandler = require('./background/handlers/entityHandler');
const WorldBookHandler = require('./background/handlers/worldBookHandler');
const RuntimeHandler = require('./background/handlers/runtimeHandler');
const CaptureHandler = require('./background/handlers/captureHandler');
const ExportHandler = require('./background/handlers/exportHandler');
const EntitlementHandler = require('./background/handlers/entitlementHandler');

const { safeName } = require('./background/utils/helpers');

const dataRepository = new DataRepository();

const authHandler = new AuthHandler(dataRepository);
const entityHandler = new EntityHandler(dataRepository);
const worldBookHandler = new WorldBookHandler(dataRepository);
const runtimeHandler = new RuntimeHandler(dataRepository);
const captureHandler = new CaptureHandler(dataRepository);
const exportHandler = new ExportHandler(dataRepository);
const entitlementHandler = new EntitlementHandler(dataRepository);

const runtimeReadyPromise = dataRepository.getRuntimeConfig().then((config) => {
  dataRepository.mode = config.repositoryMode;
  dataRepository.cloudApiBaseUrl = config.cloudApiBaseUrl;
  dataRepository.cloudTimeoutMs = config.cloudTimeoutMs;
  return config;
});

async function ensureRuntimeReady() {
  return runtimeReadyPromise;
}

async function getEffectiveEntitlements() {
  const EntitlementService = require('./background/services/entitlementService');
  const entitlementService = new EntitlementService(dataRepository);
  return entitlementService.refreshEntitlements();
}

async function bootstrapAfterReady() {
  await ensureRuntimeReady();
  await getEffectiveEntitlements().catch((error) => {
    console.warn('[Background] getEffectiveEntitlements skipped:', error?.message || error);
  });
}

function getCloudErrorSummary(error) {
  const message = safeName(error?.message);
  const status = Number(error?.status || 0);
  const code = safeName(error?.code);
  const retriable = Boolean(error?.retriable);
  const traceId = safeName(error?.traceId);
  return { type: error?.type || 'unknown', status, code, retriable, traceId, message };
}

function withResponse(handler, sendResponse) {
  Promise.resolve()
    .then(handler)
    .then((result) => sendResponse(result || { success: false, error: '空响应' }))
    .catch((error) => {
      console.error('[Background] handler error:', error);
      const cloudError = getCloudErrorSummary(error);
      sendResponse({
        success: false,
        error: error?.message || '后台处理失败',
        errorType: cloudError.type || '',
        errorCode: cloudError.code || '',
        status: Number(cloudError.status || 0) || undefined,
        retriable: cloudError.retriable || false,
        traceId: cloudError.traceId || ''
      });
    });
}

function isInjectableTabUrl(url) {
  const normalized = safeName(url).toLowerCase();
  return normalized.startsWith('http://') || normalized.startsWith('https://');
}

function sendMessageToTab(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message || '向页面发送消息失败'));
        return;
      }
      resolve(response || null);
    });
  });
}

function broadcastRuntimeMessage(message) {
  try {
    chrome.runtime.sendMessage(message, () => {
      if (chrome.runtime.lastError) {
        // 忽略无接收方场景（例如当前无 sidepanel 打开）
      }
    });
  } catch {
    // ignore
  }
}

function shouldRetryAfterInject(error) {
  const message = safeName(error?.message);
  return (
    message.includes('Receiving end does not exist') ||
    message.includes('Could not establish connection')
  );
}

async function openCapturePanelInTab(tab, payload) {
  const tabId = Number(tab?.id || 0);
  if (!tabId) {
    return { success: false, error: '缺少有效标签页' };
  }

  try {
    await sendMessageToTab(tabId, payload);
    return { success: true, injected: false };
  } catch (error) {
    if (!isInjectableTabUrl(tab?.url) || !shouldRetryAfterInject(error)) {
      return {
        success: false,
        error: error?.message || '打开采集面板失败'
      };
    }

    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js']
    });

    await sendMessageToTab(tabId, payload);
    return { success: true, injected: true };
  }
}

async function getWorldsAndBooks() {
  try {
    return await worldBookHandler.handleGetWorldsAndBooks();
  } catch (error) {
    console.warn('[Background] getWorldsAndBooks fallback:', error?.message || error);
    return { worlds: [], books: [] };
  }
}

function ensureCaptureContextMenu() {
  try {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create(
        {
          id: 'captureText',
          title: '存入 World-Link',
          contexts: ['selection']
        },
        () => {
          if (chrome.runtime.lastError) {
            console.warn('[Background] contextMenus create failed:', chrome.runtime.lastError.message);
          }
        }
      );
    });
  } catch (error) {
    console.warn('[Background] ensureCaptureContextMenu failed:', error?.message || error);
  }
}

function ensureSidePanelBehavior() {
  try {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } catch (error) {
    console.log('[Background] setPanelBehavior skipped:', error?.message || error);
  }
}

function bootstrapRuntime() {
  ensureCaptureContextMenu();
  ensureSidePanelBehavior();

  bootstrapAfterReady().catch((error) => {
    console.error('[Background] bootstrapAfterReady error:', error);
  });
}

chrome.runtime.onInstalled.addListener(() => {
  bootstrapRuntime();
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'captureText' || !info.selectionText || !tab?.id) return;
  const { worlds, books } = await getWorldsAndBooks();

  const panelMessage = {
    type: 'OPEN_CAPTURE_PANEL',
    data: {
      selectedText: info.selectionText,
      worlds,
      books,
      lastUsedWorld: worlds[0]?.id || '',
      suggestedName: info.selectionText.length > 50 ? `${info.selectionText.slice(0, 50)}...` : info.selectionText,
      suggestedType: 'other',
      suggestedSummary: '',
      suggestedTags: []
    }
  };

  try {
    const result = await openCapturePanelInTab(tab, panelMessage);
    if (!result.success) {
      console.warn('[Background] open panel failed:', result.error);
      return;
    }
    if (result.injected) {
      console.info('[Background] content script reinjected before opening capture panel');
    }
  } catch (error) {
    console.warn('[Background] open panel failed:', error?.message || error);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const type = message?.type;

  if (type === 'SAVE_ENTITY') {
    const validationError = entityHandler.validateSaveEntityPayload(message?.data);
    if (validationError) {
      sendResponse(validationError);
      return true;
    }
    withResponse(async () => {
      const result = await entityHandler.handleSaveEntity(message.data);
      if (result?.success) {
        broadcastRuntimeMessage({
          type: 'DATA_UPDATED',
          data: {
            source: 'content_capture',
            timestamp: Date.now()
          }
        });
      }
      return result;
    }, sendResponse);
    return true;
  }

  if (type === 'CREATE_WORLD') {
    withResponse(() => worldBookHandler.handleCreateWorld(message?.data), sendResponse);
    return true;
  }

  if (type === 'CREATE_BOOK') {
    withResponse(() => worldBookHandler.handleCreateBook(message?.data), sendResponse);
    return true;
  }

  if (type === 'UPDATE_CAPTURE_STATUS') {
    const validationError = captureHandler.validateUpdateCaptureStatusPayload(message?.data);
    if (validationError) {
      sendResponse(validationError);
      return true;
    }
    withResponse(() => captureHandler.handleUpdateCaptureStatus(message?.data), sendResponse);
    return true;
  }

  if (type === 'REQUEST_EXPORT') {
    const validationError = exportHandler.validateRequestExportPayload(message?.data);
    if (validationError) {
      sendResponse(validationError);
      return true;
    }
    withResponse(() => exportHandler.handleRequestExport(message?.data), sendResponse);
    return true;
  }

  if (type === 'REFRESH_DATA') {
    withResponse(() => runtimeHandler.handleRefreshData(), sendResponse);
    return true;
  }

  if (type === 'GET_RUNTIME_CONTEXT') {
    withResponse(() => runtimeHandler.handleGetRuntimeContext(), sendResponse);
    return true;
  }

  if (type === 'GET_RUNTIME_CONFIG') {
    withResponse(() => runtimeHandler.handleGetRuntimeConfig(), sendResponse);
    return true;
  }

  if (type === 'SET_RUNTIME_CONFIG') {
    const validationError = runtimeHandler.validateSetRuntimeConfigPayload(message?.data);
    if (validationError) {
      sendResponse(validationError);
      return true;
    }
    withResponse(() => runtimeHandler.handleSetRuntimeConfig(message?.data), sendResponse);
    return true;
  }

  if (type === 'GET_ENTITLEMENTS') {
    withResponse(() => entitlementHandler.handleGetEntitlements(), sendResponse);
    return true;
  }

  if (type === 'REFRESH_ENTITLEMENTS') {
    withResponse(() => entitlementHandler.handleRefreshEntitlements(), sendResponse);
    return true;
  }

  if (type === 'GET_AUTH_SESSION') {
    withResponse(() => authHandler.handleGetAuthSession(), sendResponse);
    return true;
  }

  if (type === 'SET_AUTH_SESSION') {
    withResponse(() => authHandler.handleSetAuthSession(message?.data), sendResponse);
    return true;
  }

  if (type === 'SIGN_IN_WITH_PASSWORD') {
    const validationError = authHandler.validateSignInWithPasswordPayload(message?.data);
    if (validationError) {
      sendResponse(validationError);
      return true;
    }
    withResponse(() => authHandler.handleSignInWithPassword(message?.data), sendResponse);
    return true;
  }

  if (type === 'REGISTER_WITH_PASSWORD') {
    const validationError = authHandler.validateRegisterWithPasswordPayload(message?.data);
    if (validationError) {
      sendResponse(validationError);
      return true;
    }
    withResponse(() => authHandler.handleRegisterWithPassword(message?.data), sendResponse);
    return true;
  }

  if (type === 'CLEAR_AUTH_SESSION') {
    withResponse(() => authHandler.handleClearAuthSession(), sendResponse);
    return true;
  }

  return false;
});

chrome.runtime.onStartup.addListener(() => {
  console.log('[Background] onStartup');
  bootstrapRuntime();
});

console.log('[Background] background.js loaded');
bootstrapRuntime();
runtimeReadyPromise.then(() => {
  console.log(`[Background] DataRepository mode: ${dataRepository?.mode || 'local'}`);
});
