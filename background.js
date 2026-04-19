// Background Service Worker - 模块化入口
// 按消息域分 handler，保持入口清晰

DataRepository = require('./background/repositories/dataRepository');
AuthHandler = require('./background/handlers/authHandler');
EntityHandler = require('./background/handlers/entityHandler');
WorldBookHandler = require('./background/handlers/worldBookHandler');
RuntimeHandler = require('./background/handlers/runtimeHandler');
CaptureHandler = require('./background/handlers/captureHandler');
AiHandler = require('./background/handlers/aiHandler');
ExportHandler = require('./background/handlers/exportHandler');
EntitlementHandler = require('./background/handlers/entitlementHandler');
MigrateHandler = require('./background/handlers/migrateHandler');

const { safeName } = require('./background/utils/helpers');
const { createId } = require('./background/utils/helpers');

const dataRepository = new DataRepository();

const authHandler = new AuthHandler(dataRepository);
const entityHandler = new EntityHandler(dataRepository);
const worldBookHandler = new WorldBookHandler(dataRepository);
const runtimeHandler = new RuntimeHandler(dataRepository);
const captureHandler = new CaptureHandler(dataRepository);
const aiHandler = new AiHandler(dataRepository);
const exportHandler = new ExportHandler(dataRepository);
const entitlementHandler = new EntitlementHandler(dataRepository);
const migrateHandler = new MigrateHandler(dataRepository);

const runtimeReadyPromise = dataRepository.getRuntimeConfig().then((config) => {
  dataRepository.mode = config.repositoryMode;
  dataRepository.cloudApiBaseUrl = config.cloudApiBaseUrl;
  dataRepository.cloudTimeoutMs = config.cloudTimeoutMs;
  return config;
});

async function ensureRuntimeReady() {
  return runtimeReadyPromise;
}

async function migrateLocalDataIfNeeded() {
  try {
    const config = await dataRepository.getRuntimeConfig();
    if (config.repositoryMode !== 'cloud') return;

    const { mergeStoreShape } = require('./background/utils/helpers');
    const localData = await dataRepository.readData();

    if (localData.worlds.length === 0 && localData.books.length === 0 && localData.entities.length === 0) {
      return;
    }

    const apiData = await migrateHandler.getCloudDataFromApi();
    const merged = mergeStoreShape(localData, apiData);
    await dataRepository.writeData(merged);
  } catch (error) {
    console.warn('[Background] migrateLocalDataIfNeeded skipped:', error?.message || error);
  }
}

async function getEffectiveEntitlements() {
  const EntitlementService = require('./background/services/entitlementService');
  const entitlementService = new EntitlementService(dataRepository);
  return entitlementService.refreshEntitlements();
}

async function bootstrapAfterReady() {
  await ensureRuntimeReady();
  if (dataRepository.mode === 'local') {
    await dataRepository.ensureSeedData();
    await migrateLocalDataIfNeeded();
  }
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

chrome.runtime.onInstalled.addListener(() => {
  try {
    chrome.contextMenus.create({
      id: 'captureText',
      title: '存入 World-Link',
      contexts: ['selection']
    });
  } catch (error) {
    console.log('[Background] contextMenus create skipped:', error?.message || error);
  }

  try {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } catch (error) {
    console.log('[Background] setPanelBehavior skipped:', error?.message || error);
  }

  bootstrapAfterReady().catch((error) => {
    console.error('[Background] bootstrapAfterReady error:', error);
  });
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
    withResponse(() => entityHandler.handleSaveEntity(message.data), sendResponse);
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

  if (type === 'SAVE_ENTITY_FROM_SIDEPANEL') {
    const validationError = entityHandler.validateSaveEntityFromSidepanelPayload(message?.data);
    if (validationError) {
      sendResponse(validationError);
      return true;
    }
    withResponse(() => entityHandler.handleSaveEntityFromSidepanel(message?.data), sendResponse);
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

  if (type === 'AI_ENTITY_ASSIST') {
    const validationError = aiHandler.validateAiEntityAssistPayload(message?.data);
    if (validationError) {
      sendResponse(validationError);
      return true;
    }
    withResponse(() => aiHandler.handleAiEntityAssist(message?.data), sendResponse);
    return true;
  }

  if (type === 'REPORT_AI_FEEDBACK') {
    const validationError = aiHandler.validateReportAiFeedbackPayload(message?.data);
    if (validationError) {
      sendResponse(validationError);
      return true;
    }
    withResponse(() => aiHandler.handleReportAiFeedback(message?.data), sendResponse);
    return true;
  }

  if (type === 'CHECK_ENTITY_CONFLICT') {
    const validationError = entityHandler.validateCheckEntityConflictPayload(message?.data);
    if (validationError) {
      sendResponse(validationError);
      return true;
    }
    withResponse(() => entityHandler.handleCheckEntityConflict(message?.data), sendResponse);
    return true;
  }

  if (type === 'PARSE_MANUSCRIPT') {
    const validationError = aiHandler.validateParseManuscriptPayload(message?.data);
    if (validationError) {
      sendResponse(validationError);
      return true;
    }
    withResponse(() => aiHandler.handleParseManuscript(message?.data), sendResponse);
    return true;
  }

  if (type === 'MIGRATE_LOCAL_TO_CLOUD') {
    const validationError = migrateHandler.validateMigrateLocalToCloudPayload(message?.data);
    if (validationError) {
      sendResponse(validationError);
      return true;
    }
    withResponse(() => migrateHandler.handleMigrateLocalToCloud(message?.data), sendResponse);
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
  bootstrapAfterReady().catch((error) => {
    console.error('[Background] bootstrapAfterReady error:', error);
  });
});

console.log('[Background] background.js loaded');
runtimeReadyPromise.then(() => {
  console.log(`[Background] DataRepository mode: ${dataRepository?.mode || 'local'}`);
});
