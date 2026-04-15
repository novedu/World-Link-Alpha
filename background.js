function createId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

const STORAGE_KEYS = ['capturedList', 'worlds', 'books', 'entities', 'bookEntityUsages'];
const AUTH_SESSION_KEY = 'authSession';
const ENTITLEMENTS_KEY = 'entitlements';
const USAGE_METER_KEY = 'usageMeter';
const RUNTIME_CONFIG_KEY = 'runtimeConfig';

const CAPTURE_STATUS = {
  INBOX: 'inbox',
  ORGANIZED: 'organized',
  CONVERTED: 'converted'
};
const CAPTURE_STATUS_VALUES = new Set(Object.values(CAPTURE_STATUS));

const USAGE_ACTION = {
  CAPTURE_CREATE: 'capture_create',
  EXPORT_MARKDOWN: 'export_markdown',
  EXPORT_JSON: 'export_json'
};

const DEFAULT_RUNTIME_CONFIG = {
  repositoryMode: 'local',
  cloudApiBaseUrl: '',
  cloudTimeoutMs: 12000
};

const CLOUD_API_ENDPOINTS = {
  STORE: '/v1/store',
  STORE_IMPORT: '/v1/store/import',
  ENTITLEMENTS: '/v1/entitlements',
  AUTH_LOGIN: '/v1/auth/login',
  AUTH_REFRESH: '/v1/auth/refresh'
};
const MOCK_CLOUD_SCHEME = 'mock://';

function createSeedWorlds() {
  return [
    { id: 'world_seed_1', name: '星环纪元', createdAt: Date.now() },
    { id: 'world_seed_2', name: '古堡调查', createdAt: Date.now() }
  ];
}

function createSeedBooks() {
  return [
    { id: 'book_seed_1', worldId: 'world_seed_1', title: '夜宴疑云', createdAt: Date.now() },
    { id: 'book_seed_2', worldId: 'world_seed_1', title: '葬钟回响', createdAt: Date.now() },
    { id: 'book_seed_3', worldId: 'world_seed_2', title: '古堡谜案', createdAt: Date.now() }
  ];
}

function safeName(value) {
  return String(value || '').trim();
}

function normalizeTags(input) {
  if (!input) return [];
  const source = Array.isArray(input) ? input : String(input).replace(/，/g, ',').split(',');
  return [...new Set(source.map((tag) => String(tag || '').trim()).filter(Boolean))];
}

function normalizeStoreShape(data) {
  return {
    capturedList: Array.isArray(data?.capturedList) ? data.capturedList : [],
    worlds: Array.isArray(data?.worlds) ? data.worlds : [],
    books: Array.isArray(data?.books) ? data.books : [],
    entities: Array.isArray(data?.entities) ? data.entities : [],
    bookEntityUsages: Array.isArray(data?.bookEntityUsages) ? data.bookEntityUsages : []
  };
}

function cloneData(value) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

function isMockCloudBaseUrl(baseUrl) {
  return safeName(baseUrl).toLowerCase().startsWith(MOCK_CLOUD_SCHEME);
}

function mergeUniqueByKey(existing, incoming, keyResolver) {
  const output = [];
  const seen = new Set();
  [...existing, ...incoming].forEach((item) => {
    const key = keyResolver(item);
    if (!key || seen.has(key)) return;
    seen.add(key);
    output.push(item);
  });
  return output;
}

function mergeStoreShape(target, incoming) {
  const base = normalizeStoreShape(target);
  const patch = normalizeStoreShape(incoming);
  return {
    worlds: mergeUniqueByKey(base.worlds, patch.worlds, (item) => safeName(item?.id) || safeName(item?.name)),
    books: mergeUniqueByKey(base.books, patch.books, (item) => safeName(item?.id)),
    entities: mergeUniqueByKey(base.entities, patch.entities, (item) => safeName(item?.id)),
    bookEntityUsages: mergeUniqueByKey(base.bookEntityUsages, patch.bookEntityUsages, (item) => safeName(item?.id)),
    capturedList: mergeUniqueByKey(
      base.capturedList,
      patch.capturedList,
      (item) => `${safeName(item?.text)}#${Number(item?.timestamp || 0)}`
    )
  };
}

function resolveCaptureStatus(value, fallback = CAPTURE_STATUS.INBOX) {
  return CAPTURE_STATUS_VALUES.has(value) ? value : fallback;
}

function normalizeEntityRecordForStorage(entity) {
  return {
    ...entity,
    tags: normalizeTags(entity?.tags)
  };
}

function normalizeCaptureRecordForStorage(item) {
  const fallbackTimestamp = Number(item?.timestamp || Date.now());
  const status = resolveCaptureStatus(item?.status, CAPTURE_STATUS.INBOX);
  const statusUpdatedAt = Number(item?.statusUpdatedAt || fallbackTimestamp);
  const next = {
    ...item,
    status,
    statusUpdatedAt
  };

  if (status === CAPTURE_STATUS.ORGANIZED && !next.organizedAt) {
    next.organizedAt = statusUpdatedAt;
  }
  if (status === CAPTURE_STATUS.CONVERTED && !next.convertedAt) {
    next.convertedAt = statusUpdatedAt;
  }

  return next;
}

function applyCaptureStatus(item, status, now) {
  const nextStatus = resolveCaptureStatus(status, CAPTURE_STATUS.INBOX);
  const next = {
    ...item,
    status: nextStatus,
    statusUpdatedAt: now
  };

  if (nextStatus === CAPTURE_STATUS.ORGANIZED && !item.organizedAt) {
    next.organizedAt = now;
  }

  if (nextStatus === CAPTURE_STATUS.CONVERTED && !item.convertedAt) {
    next.convertedAt = now;
  }

  return next;
}

function normalizeRuntimeConfig(input) {
  const rawMode = safeName(input?.repositoryMode).toLowerCase();
  const mode = rawMode === 'cloud' ? 'cloud' : 'local';
  const baseUrl = safeName(input?.cloudApiBaseUrl).replace(/\/+$/g, '');
  const timeoutRaw = Number(input?.cloudTimeoutMs ?? DEFAULT_RUNTIME_CONFIG.cloudTimeoutMs);
  const cloudTimeoutMs = Number.isFinite(timeoutRaw)
    ? Math.max(3000, Math.min(60000, Math.floor(timeoutRaw)))
    : DEFAULT_RUNTIME_CONFIG.cloudTimeoutMs;
  return {
    repositoryMode: mode,
    cloudApiBaseUrl: baseUrl,
    cloudTimeoutMs
  };
}

function normalizeLimit(value, fallback) {
  if (value === null || value === undefined) return fallback;
  if (value === 'unlimited') return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  if (numeric < 0) return null;
  return Math.floor(numeric);
}

function buildDefaultEntitlements(plan = 'free') {
  const isPro = plan === 'pro';
  return {
    plan: isPro ? 'pro' : 'free',
    source: isPro ? 'plan-pro' : 'plan-free',
    updatedAt: Date.now(),
    features: {
      exportMarkdown: true,
      exportJson: isPro,
      aiSummary: isPro,
      conflictCheck: isPro,
      graphEditor: isPro
    },
    limits: {
      maxWorlds: isPro ? null : 1,
      maxBooksPerWorld: isPro ? null : 3,
      maxEntities: isPro ? null : 500,
      maxCapturesPerDay: isPro ? null : 200,
      maxMarkdownExportsPerDay: isPro ? null : 5
    }
  };
}

function normalizeEntitlements(input, fallbackPlan = 'free') {
  const plan = input?.plan === 'pro' ? 'pro' : fallbackPlan === 'pro' ? 'pro' : 'free';
  const base = buildDefaultEntitlements(plan);
  const candidateFeatures = input?.features && typeof input.features === 'object' ? input.features : {};
  const candidateLimits = input?.limits && typeof input.limits === 'object' ? input.limits : {};

  return {
    plan: base.plan,
    source: safeName(input?.source) || base.source,
    updatedAt: Number(input?.updatedAt || Date.now()),
    features: {
      ...base.features,
      exportMarkdown: candidateFeatures.exportMarkdown ?? base.features.exportMarkdown,
      exportJson: candidateFeatures.exportJson ?? base.features.exportJson,
      aiSummary: candidateFeatures.aiSummary ?? base.features.aiSummary,
      conflictCheck: candidateFeatures.conflictCheck ?? base.features.conflictCheck,
      graphEditor: candidateFeatures.graphEditor ?? base.features.graphEditor
    },
    limits: {
      maxWorlds: normalizeLimit(candidateLimits.maxWorlds, base.limits.maxWorlds),
      maxBooksPerWorld: normalizeLimit(candidateLimits.maxBooksPerWorld, base.limits.maxBooksPerWorld),
      maxEntities: normalizeLimit(candidateLimits.maxEntities, base.limits.maxEntities),
      maxCapturesPerDay: normalizeLimit(candidateLimits.maxCapturesPerDay, base.limits.maxCapturesPerDay),
      maxMarkdownExportsPerDay: normalizeLimit(
        candidateLimits.maxMarkdownExportsPerDay,
        base.limits.maxMarkdownExportsPerDay
      )
    }
  };
}

function isLimited(limit) {
  return Number.isFinite(limit);
}

function formatTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeUsageMeter(input) {
  if (!input || typeof input !== 'object') return {};
  const output = {};
  Object.entries(input).forEach(([dateKey, usage]) => {
    if (!usage || typeof usage !== 'object') return;
    output[dateKey] = {
      [USAGE_ACTION.CAPTURE_CREATE]: Number(usage[USAGE_ACTION.CAPTURE_CREATE] || 0),
      [USAGE_ACTION.EXPORT_MARKDOWN]: Number(usage[USAGE_ACTION.EXPORT_MARKDOWN] || 0),
      [USAGE_ACTION.EXPORT_JSON]: Number(usage[USAGE_ACTION.EXPORT_JSON] || 0)
    };
  });
  return output;
}

function trimUsageMeter(usageMeter, keepDays = 10) {
  const keys = Object.keys(usageMeter).sort((a, b) => b.localeCompare(a));
  const retained = {};
  keys.slice(0, keepDays).forEach((key) => {
    retained[key] = usageMeter[key];
  });
  return retained;
}

function normalizeAuthSessionPayload(payload, fallbackSession = null) {
  const email = safeName(payload?.email || fallbackSession?.email).toLowerCase();
  if (!email) return null;
  const now = Date.now();
  const plan = payload?.plan === 'pro' ? 'pro' : fallbackSession?.plan === 'pro' ? 'pro' : 'free';
  const expiresAtRaw = Number(payload?.expiresAt || fallbackSession?.expiresAt || 0);
  const expiresAt = Number.isFinite(expiresAtRaw) && expiresAtRaw > 0 ? expiresAtRaw : null;

  return {
    userId: safeName(payload?.userId || fallbackSession?.userId) || createId('user'),
    email,
    plan,
    provider: safeName(payload?.provider || fallbackSession?.provider || 'local-dev'),
    accessToken: safeName(payload?.accessToken || fallbackSession?.accessToken),
    refreshToken: safeName(payload?.refreshToken || fallbackSession?.refreshToken),
    tokenType: safeName(payload?.tokenType || fallbackSession?.tokenType || 'Bearer'),
    expiresAt,
    createdAt: Number(fallbackSession?.createdAt || now),
    updatedAt: now
  };
}

async function readAuthSessionRecord() {
  const result = await chrome.storage.local.get([AUTH_SESSION_KEY]);
  return result?.[AUTH_SESSION_KEY] || null;
}

async function writeAuthSessionRecord(session) {
  await chrome.storage.local.set({ [AUTH_SESSION_KEY]: session });
}

async function readRuntimeConfigRecord() {
  const result = await chrome.storage.local.get([RUNTIME_CONFIG_KEY]);
  return normalizeRuntimeConfig(result?.[RUNTIME_CONFIG_KEY] || DEFAULT_RUNTIME_CONFIG);
}

async function writeRuntimeConfigRecord(config) {
  await chrome.storage.local.set({ [RUNTIME_CONFIG_KEY]: config });
}

async function readEntitlementsRecord() {
  const result = await chrome.storage.local.get([ENTITLEMENTS_KEY]);
  return result?.[ENTITLEMENTS_KEY] || null;
}

async function writeEntitlementsRecord(entitlements) {
  await chrome.storage.local.set({ [ENTITLEMENTS_KEY]: entitlements });
}

async function readUsageMeterRecord() {
  const result = await chrome.storage.local.get([USAGE_METER_KEY]);
  return normalizeUsageMeter(result?.[USAGE_METER_KEY]);
}

async function writeUsageMeterRecord(usageMeter) {
  await chrome.storage.local.set({ [USAGE_METER_KEY]: trimUsageMeter(usageMeter) });
}

let runtimeConfig = { ...DEFAULT_RUNTIME_CONFIG };
let dataRepository = null;
let cloudDiagnostics = {
  lastRequest: null,
  lastSuccess: null,
  lastError: null
};
let mockCloudState = {
  usersByEmail: {},
  usersById: {},
  accessTokens: {},
  refreshTokens: {},
  storesByUserId: {},
  entitlementsByUserId: {}
};

function resolveMockPlanByEmail(email) {
  const value = safeName(email).toLowerCase();
  if (!value) return 'free';
  if (value.includes('+pro') || value.startsWith('pro@') || value.endsWith('@pro.local')) {
    return 'pro';
  }
  return 'free';
}

function createMockUser(email, password = '123456') {
  const normalizedEmail = safeName(email).toLowerCase();
  const plan = resolveMockPlanByEmail(normalizedEmail);
  const user = {
    userId: createId('mock_user'),
    email: normalizedEmail,
    password: String(password || '123456'),
    plan
  };
  mockCloudState.usersByEmail[normalizedEmail] = user;
  mockCloudState.usersById[user.userId] = user;
  mockCloudState.storesByUserId[user.userId] = normalizeStoreShape({
    worlds: cloneData(createSeedWorlds()),
    books: cloneData(createSeedBooks())
  });
  mockCloudState.entitlementsByUserId[user.userId] = buildDefaultEntitlements(plan);
  return user;
}

function issueMockTokensForUser(user) {
  const accessToken = createId('mock_at');
  const refreshToken = createId('mock_rt');
  mockCloudState.accessTokens[accessToken] = user.userId;
  mockCloudState.refreshTokens[refreshToken] = user.userId;
  return {
    accessToken,
    refreshToken
  };
}

function resolveMockUserByAccessToken(accessToken) {
  const userId = mockCloudState.accessTokens[safeName(accessToken)];
  if (!userId) return null;
  return mockCloudState.usersById[userId] || null;
}

function resolveMockUserByRefreshToken(refreshToken) {
  const userId = mockCloudState.refreshTokens[safeName(refreshToken)];
  if (!userId) return null;
  return mockCloudState.usersById[userId] || null;
}

function buildMockSessionPayload(user, tokens) {
  return {
    userId: user.userId,
    email: user.email,
    plan: user.plan,
    provider: 'mock-cloud',
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    tokenType: 'Bearer',
    expiresAt: Date.now() + 60 * 60 * 1000
  };
}

function createLocalRepository() {
  return {
    mode: 'local',
    async readAll() {
      const data = await chrome.storage.local.get(STORAGE_KEYS);
      return normalizeStoreShape(data);
    },
    async writePartial(partial) {
      await chrome.storage.local.set(partial);
    },
    async ensureSeedData() {
      const store = await this.readAll();
      const seedPayload = {};

      if (store.worlds.length === 0) {
        seedPayload.worlds = createSeedWorlds();
      }
      if (store.books.length === 0) {
        seedPayload.books = createSeedBooks();
      }

      if (Object.keys(seedPayload).length > 0) {
        await this.writePartial(seedPayload);
      }
    }
  };
}

function resolveCloudResponseData(payload) {
  if (!payload || typeof payload !== 'object') return {};
  if (payload.data && typeof payload.data === 'object') return payload.data;
  if (payload.store && typeof payload.store === 'object') return payload.store;
  return payload;
}

async function parseResponsePayload(response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json().catch(() => ({}));
  }
  const text = await response.text().catch(() => '');
  return text ? { message: text } : {};
}

function resolveCloudEndpoint(endpointOrPath) {
  if (!endpointOrPath) return '';
  if (endpointOrPath.startsWith('/')) return endpointOrPath;
  return CLOUD_API_ENDPOINTS[endpointOrPath] || endpointOrPath;
}

function normalizeCloudErrorType(status, rawCode = '') {
  const code = safeName(rawCode).toLowerCase();
  if (code === 'timeout') return 'timeout';
  if (code === 'network_error') return 'network';
  if (code === 'auth_required' || status === 401) return 'auth';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 409) return 'conflict';
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'server';
  if (status >= 400) return 'validation';
  return 'unknown';
}

function normalizeCloudErrorMessage(type, fallbackMessage, status) {
  if (fallbackMessage) return fallbackMessage;
  if (type === 'timeout') return '云端请求超时，请稍后重试';
  if (type === 'network') return '网络异常，暂时无法连接云端';
  if (type === 'auth') return '登录状态已失效，请重新登录';
  if (type === 'forbidden') return '当前账号暂无该操作权限';
  if (type === 'rate_limited') return '请求过于频繁，请稍后再试';
  if (type === 'server') return '云端服务暂时不可用，请稍后重试';
  if (type === 'not_found') return '云端资源不存在或已被删除';
  return status ? `云端请求失败（${status}）` : '云端请求失败';
}

function createCloudRequestError({
  message,
  status = 0,
  code = '',
  type = 'unknown',
  retriable = false,
  requestId = '',
  traceId = '',
  endpoint = '',
  method = 'GET'
}) {
  const error = new Error(message);
  error.name = 'CloudRequestError';
  error.meta = {
    status,
    code,
    type,
    retriable,
    requestId,
    traceId,
    endpoint,
    method
  };
  return error;
}

function getCloudErrorSummary(error) {
  if (!error) return {};
  const meta = error?.meta || {};
  return {
    name: error.name || 'Error',
    message: error.message || '',
    status: Number(meta.status || 0),
    type: safeName(meta.type),
    code: safeName(meta.code),
    retriable: Boolean(meta.retriable),
    requestId: safeName(meta.requestId),
    traceId: safeName(meta.traceId),
    endpoint: safeName(meta.endpoint),
    method: safeName(meta.method || 'GET')
  };
}

function getCloudDiagnosticsSnapshot() {
  const normalizeRequest = (record) => {
    if (!record || typeof record !== 'object') return null;
    return {
      at: Number(record.at || 0),
      endpoint: safeName(record.endpoint),
      method: safeName(record.method || 'GET'),
      traceId: safeName(record.traceId),
      requestId: safeName(record.requestId),
      mode: safeName(record.mode),
      status: Number(record.status || 0),
      durationMs: Number(record.durationMs || 0),
      attempt: Number(record.attempt || 1)
    };
  };

  const normalizeError = (record) => {
    if (!record || typeof record !== 'object') return null;
    return {
      at: Number(record.at || 0),
      name: safeName(record.name),
      message: safeName(record.message),
      status: Number(record.status || 0),
      type: safeName(record.type),
      code: safeName(record.code),
      retriable: Boolean(record.retriable),
      requestId: safeName(record.requestId),
      traceId: safeName(record.traceId),
      endpoint: safeName(record.endpoint),
      method: safeName(record.method || 'GET')
    };
  };

  return {
    lastRequest: normalizeRequest(cloudDiagnostics.lastRequest),
    lastSuccess: normalizeRequest(cloudDiagnostics.lastSuccess),
    lastError: normalizeError(cloudDiagnostics.lastError)
  };
}

function resolveCloudSessionFromPayload(payload, fallbackEmail = '') {
  const source = payload?.session || payload?.data?.session || payload?.data || payload || {};
  const email = safeName(source.email || fallbackEmail).toLowerCase();
  if (!email) return null;
  const expiresAtRaw = Number(source.expiresAt || source.expires_at || source.exp || 0);
  const expiresAt = Number.isFinite(expiresAtRaw) && expiresAtRaw > 0 ? expiresAtRaw : null;
  return {
    userId: safeName(source.userId || source.user_id || source.id),
    email,
    plan: source.plan === 'pro' ? 'pro' : 'free',
    provider: safeName(source.provider || 'cloud'),
    accessToken: safeName(source.accessToken || source.access_token || source.token),
    refreshToken: safeName(source.refreshToken || source.refresh_token),
    tokenType: safeName(source.tokenType || source.token_type || 'Bearer'),
    expiresAt
  };
}

function resolveCloudEntitlementsFromPayload(payload, fallbackPlan) {
  const source = payload?.entitlements || payload?.data?.entitlements || payload?.data || null;
  return normalizeEntitlements(source, fallbackPlan);
}

async function refreshCloudSession(currentSession) {
  if (!currentSession?.refreshToken) {
    throw new Error('登录信息已过期，请重新登录');
  }
  const payload = await cloudRequest('AUTH_REFRESH', {
    method: 'POST',
    requireAuth: false,
    body: { refreshToken: currentSession.refreshToken }
  });
  const partialSession = resolveCloudSessionFromPayload(payload, currentSession.email);
  if (!partialSession?.accessToken) {
    throw new Error('刷新登录态失败，请重新登录');
  }
  const nextSession = normalizeAuthSessionPayload(
    {
      ...currentSession,
      ...partialSession,
      plan: partialSession.plan || currentSession.plan
    },
    currentSession
  );
  await writeAuthSessionRecord(nextSession);
  return nextSession;
}

async function cloudRequest(endpointOrPath, options = {}) {
  const requireAuth = options.requireAuth !== false;
  const method = options.method || 'GET';
  const endpoint = resolveCloudEndpoint(endpointOrPath);
  const baseUrl = safeName(runtimeConfig.cloudApiBaseUrl).replace(/\/+$/g, '') || 'mock://local';
  const traceId = createId('cloudreq');
  const requestStartedAt = Date.now();

  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const session = await readAuthSessionRecord();
  let accessToken = safeName(options.accessToken || session?.accessToken);
  let tokenType = safeName(session?.tokenType || 'Bearer');

  if (requireAuth && !accessToken) {
    throw createCloudRequestError({
      message: '请先登录后再访问云端数据',
      type: 'auth',
      code: 'auth_required',
      endpoint,
      method,
      traceId
    });
  }

  const performRequest = async (token, attempt) => {
    const attemptStartedAt = Date.now();
    const headers = {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    };
    if (token) {
      headers.Authorization = `${tokenType || 'Bearer'} ${token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), runtimeConfig.cloudTimeoutMs);
    try {
      const response = await fetch(url, {
        method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal
      });
      const payload = await parseResponsePayload(response);
      const durationMs = Date.now() - attemptStartedAt;
      const requestId = safeName(
        response.headers.get('x-request-id') || response.headers.get('x-trace-id') || ''
      );

      if (!response.ok) {
        const status = Number(response.status || 0);
        const rawCode = safeName(
          payload?.code || payload?.error_code || payload?.errorCode || payload?.type
        );
        const type = normalizeCloudErrorType(status, rawCode);
        const message = normalizeCloudErrorMessage(
          type,
          safeName(payload?.error || payload?.message || payload?.detail),
          status
        );
        throw createCloudRequestError({
          message,
          status,
          code: rawCode,
          type,
          retriable: type === 'timeout' || type === 'network' || type === 'rate_limited' || type === 'server',
          requestId,
          traceId,
          endpoint,
          method
        });
      }

      return {
        response,
        payload,
        durationMs,
        requestId,
        attempt
      };
    } catch (error) {
      if (error?.name === 'CloudRequestError') {
        throw error;
      }
      if (error?.name === 'AbortError') {
        throw createCloudRequestError({
          message: '云端请求超时，请稍后重试',
          code: 'timeout',
          type: 'timeout',
          retriable: true,
          traceId,
          endpoint,
          method
        });
      }
      throw createCloudRequestError({
        message: '网络异常，暂时无法连接云端',
        code: 'network_error',
        type: 'network',
        retriable: true,
        traceId,
        endpoint,
        method
      });
    } finally {
      clearTimeout(timeoutId);
    }
  };

  let requestResult = null;
  try {
    requestResult = await performRequest(accessToken, 1);
  } catch (error) {
    const status = Number(error?.meta?.status || 0);
    if (status === 401 && requireAuth && session?.refreshToken && !options.skipAutoRefresh) {
      const refreshed = await refreshCloudSession(session);
      accessToken = safeName(refreshed.accessToken);
      tokenType = safeName(refreshed.tokenType || tokenType || 'Bearer');
      requestResult = await performRequest(accessToken, 2);
    } else {
      const errorSummary = getCloudErrorSummary(error);
      cloudDiagnostics.lastRequest = {
        at: Date.now(),
        endpoint,
        method,
        traceId,
        mode: runtimeConfig.repositoryMode,
        status: errorSummary.status || null,
        durationMs: Date.now() - requestStartedAt
      };
      cloudDiagnostics.lastError = {
        ...errorSummary,
        at: Date.now()
      };
      console.warn('[CloudAPI] error', {
        ...cloudDiagnostics.lastRequest,
        error: cloudDiagnostics.lastError
      });
      throw error;
    }
  }

  cloudDiagnostics.lastRequest = {
    at: Date.now(),
    endpoint,
    method,
    traceId,
    mode: runtimeConfig.repositoryMode,
    status: Number(requestResult?.response?.status || 200),
    requestId: requestResult?.requestId || '',
    durationMs: Number(requestResult?.durationMs || Date.now() - requestStartedAt),
    attempt: Number(requestResult?.attempt || 1)
  };
  cloudDiagnostics.lastSuccess = {
    ...cloudDiagnostics.lastRequest
  };
  console.info('[CloudAPI] success', cloudDiagnostics.lastRequest);

  return requestResult?.payload || {};
}

function createCloudRepository() {
  return {
    mode: 'cloud',
    async readAll() {
      const payload = await cloudRequest('STORE', { method: 'GET' });
      return normalizeStoreShape(resolveCloudResponseData(payload));
    },
    async writePartial(partial) {
      await cloudRequest('STORE', {
        method: 'PATCH',
        body: { partial }
      });
    },
    async ensureSeedData() {
      return null;
    }
  };
}

function createDataRepository(mode) {
  if (mode === 'cloud') {
    return createCloudRepository();
  }
  return createLocalRepository();
}

async function initializeRuntime() {
  runtimeConfig = await readRuntimeConfigRecord();
  dataRepository = createDataRepository(runtimeConfig.repositoryMode);
}

const runtimeReadyPromise = initializeRuntime().catch((error) => {
  console.error('[Background] runtime init failed:', error);
  runtimeConfig = { ...DEFAULT_RUNTIME_CONFIG };
  dataRepository = createLocalRepository();
});

async function ensureRuntimeReady() {
  await runtimeReadyPromise;
  if (!dataRepository) {
    dataRepository = createDataRepository(runtimeConfig.repositoryMode);
  }
}

async function readData() {
  await ensureRuntimeReady();
  return dataRepository.readAll();
}

async function writeData(partial) {
  await ensureRuntimeReady();
  await dataRepository.writePartial(partial);
}

async function getEffectiveEntitlements(options = {}) {
  await ensureRuntimeReady();
  const sessionRecord = await readAuthSessionRecord();
  const plan = sessionRecord?.plan === 'pro' ? 'pro' : 'free';
  const localRecord = await readEntitlementsRecord();

  if (dataRepository.mode === 'cloud' && sessionRecord?.accessToken && options.forceRefresh) {
    const payload = await cloudRequest('ENTITLEMENTS', { method: 'GET' });
    const cloudEntitlements = resolveCloudEntitlementsFromPayload(payload, plan);
    await writeEntitlementsRecord(cloudEntitlements);
    return cloudEntitlements;
  }

  if (!localRecord) {
    const fallback = normalizeEntitlements(null, plan);
    await writeEntitlementsRecord(fallback);
    return fallback;
  }

  const normalized = normalizeEntitlements(localRecord, plan);
  if (
    normalized.plan !== localRecord.plan ||
    JSON.stringify(normalized.features) !== JSON.stringify(localRecord.features) ||
    JSON.stringify(normalized.limits) !== JSON.stringify(localRecord.limits)
  ) {
    await writeEntitlementsRecord(normalized);
  }
  return normalized;
}

async function getAuthSession() {
  await ensureRuntimeReady();
  const session = (await readAuthSessionRecord()) || null;
  return { success: true, session };
}

async function setAuthSession(payload) {
  await ensureRuntimeReady();
  const currentSession = await readAuthSessionRecord();
  const nextSession = normalizeAuthSessionPayload(payload, currentSession);
  if (!nextSession) {
    return { success: false, error: '邮箱不能为空' };
  }

  await writeAuthSessionRecord(nextSession);
  const nextEntitlements = normalizeEntitlements(await readEntitlementsRecord(), nextSession.plan);
  await writeEntitlementsRecord(nextEntitlements);
  return { success: true, session: nextSession };
}

async function signInWithPassword(payload) {
  await ensureRuntimeReady();
  if (dataRepository.mode !== 'cloud') {
    runtimeConfig = normalizeRuntimeConfig({
      ...runtimeConfig,
      repositoryMode: 'cloud'
    });
    await writeRuntimeConfigRecord(runtimeConfig);
    dataRepository = createDataRepository(runtimeConfig.repositoryMode);
  }
  const email = safeName(payload?.email).toLowerCase();
  const password = String(payload?.password || '');
  if (!email || !password) {
    return { success: false, error: '邮箱和密码不能为空' };
  }

  const response = await cloudRequest('AUTH_LOGIN', {
    method: 'POST',
    requireAuth: false,
    body: { email, password }
  });
  const cloudSession = resolveCloudSessionFromPayload(response, email);
  const nextSession = normalizeAuthSessionPayload(
    {
      ...cloudSession,
      email,
      provider: 'cloud-password'
    },
    null
  );
  if (!nextSession?.accessToken) {
    return { success: false, error: '登录响应缺少 accessToken' };
  }
  await writeAuthSessionRecord(nextSession);

  const entitlements = resolveCloudEntitlementsFromPayload(response, nextSession.plan);
  await writeEntitlementsRecord(entitlements);

  return {
    success: true,
    session: nextSession,
    entitlements
  };
}

async function clearAuthSession() {
  await ensureRuntimeReady();
  await chrome.storage.local.remove([AUTH_SESSION_KEY]);
  const fallback = normalizeEntitlements(null, 'free');
  await writeEntitlementsRecord(fallback);
  return { success: true };
}

async function setRuntimeConfig(payload) {
  await ensureRuntimeReady();
  const nextConfig = normalizeRuntimeConfig({
    ...runtimeConfig,
    ...(payload || {})
  });
  runtimeConfig = nextConfig;
  await writeRuntimeConfigRecord(nextConfig);
  dataRepository = createDataRepository(nextConfig.repositoryMode);

  if (dataRepository.mode === 'local') {
    await dataRepository.ensureSeedData();
    await migrateLocalDataIfNeeded();
  }

  const entitlements = await getEffectiveEntitlements({
    forceRefresh: dataRepository.mode === 'cloud'
  }).catch(async () => {
    const fallbackPlan = (await readAuthSessionRecord())?.plan === 'pro' ? 'pro' : 'free';
    const fallback = normalizeEntitlements(null, fallbackPlan);
    await writeEntitlementsRecord(fallback);
    return fallback;
  });

  return {
    success: true,
    config: runtimeConfig,
    repositoryMode: dataRepository.mode,
    entitlements
  };
}

async function getRuntimeConfig() {
  await ensureRuntimeReady();
  return {
    success: true,
    config: runtimeConfig
  };
}

async function getUsageSnapshot(entitlements) {
  const usageMeter = await readUsageMeterRecord();
  const today = formatTodayKey();
  const todayUsage = usageMeter[today] || {};

  const captureUsed = Number(todayUsage[USAGE_ACTION.CAPTURE_CREATE] || 0);
  const mdExportUsed = Number(todayUsage[USAGE_ACTION.EXPORT_MARKDOWN] || 0);
  const jsonExportUsed = Number(todayUsage[USAGE_ACTION.EXPORT_JSON] || 0);

  const captureLimit = entitlements?.limits?.maxCapturesPerDay;
  const markdownLimit = entitlements?.limits?.maxMarkdownExportsPerDay;

  return {
    date: today,
    captureCreate: {
      used: captureUsed,
      limit: isLimited(captureLimit) ? captureLimit : null,
      remaining: isLimited(captureLimit) ? Math.max(captureLimit - captureUsed, 0) : null
    },
    exportMarkdown: {
      used: mdExportUsed,
      limit: isLimited(markdownLimit) ? markdownLimit : null,
      remaining: isLimited(markdownLimit) ? Math.max(markdownLimit - mdExportUsed, 0) : null
    },
    exportJson: {
      used: jsonExportUsed,
      limit: null,
      remaining: null
    }
  };
}

async function getRuntimeContext() {
  await ensureRuntimeReady();
  const entitlements = await getEffectiveEntitlements({
    forceRefresh: false
  });
  const usage = await getUsageSnapshot(entitlements);
  return {
    success: true,
    repositoryMode: dataRepository.mode,
    cloudEnabled: dataRepository.mode === 'cloud',
    authEnabled: true,
    runtimeConfig,
    entitlements,
    usage,
    cloudDiagnostics: getCloudDiagnosticsSnapshot()
  };
}

async function refreshEntitlements() {
  await ensureRuntimeReady();
  const entitlements = await getEffectiveEntitlements({
    forceRefresh: dataRepository.mode === 'cloud'
  });
  const usage = await getUsageSnapshot(entitlements);
  return { success: true, entitlements, usage };
}

async function incrementUsage(action, increment = 1) {
  const usageMeter = await readUsageMeterRecord();
  const dayKey = formatTodayKey();
  const dayUsage = usageMeter[dayKey] || {};
  dayUsage[action] = Number(dayUsage[action] || 0) + Math.max(1, increment);
  usageMeter[dayKey] = dayUsage;
  await writeUsageMeterRecord(usageMeter);
  return dayUsage[action];
}

async function authorizeCaptureQuota() {
  const entitlements = await getEffectiveEntitlements();
  const limit = entitlements?.limits?.maxCapturesPerDay;
  if (!isLimited(limit)) {
    return { success: true };
  }

  const usageMeter = await readUsageMeterRecord();
  const dayKey = formatTodayKey();
  const used = Number(usageMeter?.[dayKey]?.[USAGE_ACTION.CAPTURE_CREATE] || 0);
  if (used >= limit) {
    return {
      success: false,
      error: `今日捕获额度已用完（${limit} 次/天），请明日再试或升级 Pro`
    };
  }
  return { success: true };
}

async function authorizeExport(payload) {
  const format = payload?.format === 'json' ? 'json' : 'markdown';
  const entitlements = await getEffectiveEntitlements();

  if (format === 'json' && !entitlements?.features?.exportJson) {
    return {
      success: false,
      error: 'JSON 导出为 Pro 功能，请升级后使用'
    };
  }

  if (format === 'markdown') {
    const limit = entitlements?.limits?.maxMarkdownExportsPerDay;
    if (isLimited(limit)) {
      const usageMeter = await readUsageMeterRecord();
      const dayKey = formatTodayKey();
      const used = Number(usageMeter?.[dayKey]?.[USAGE_ACTION.EXPORT_MARKDOWN] || 0);
      if (used >= limit) {
        return {
          success: false,
          error: `今日 Markdown 导出次数已达上限（${limit} 次）`
        };
      }
    }
  }

  const action = format === 'json' ? USAGE_ACTION.EXPORT_JSON : USAGE_ACTION.EXPORT_MARKDOWN;
  const usedAfter = await incrementUsage(action);
  const usage = await getUsageSnapshot(entitlements);

  return {
    success: true,
    format,
    usedAfter,
    usage
  };
}

async function migrateLocalDataToCloud(payload = {}) {
  await ensureRuntimeReady();
  if (dataRepository.mode !== 'cloud') {
    return { success: false, error: '请先登录账号并启用同步后再迁移' };
  }

  const session = await readAuthSessionRecord();
  if (!session?.accessToken) {
    return { success: false, error: '请先登录账号后再迁移' };
  }

  const localRaw = await chrome.storage.local.get(STORAGE_KEYS);
  const localStore = normalizeStoreShape(localRaw);
  const stats = {
    worlds: localStore.worlds.length,
    books: localStore.books.length,
    entities: localStore.entities.length,
    captures: localStore.capturedList.length,
    usages: localStore.bookEntityUsages.length
  };
  const totalCount = Object.values(stats).reduce((sum, current) => sum + current, 0);
  if (totalCount === 0) {
    return {
      success: true,
      migrated: stats,
      message: '本机没有可迁移数据'
    };
  }

  const strategy = safeName(payload?.strategy) || 'merge';
  let fallbackPatch = false;
  try {
    await cloudRequest('STORE_IMPORT', {
      method: 'POST',
      body: {
        strategy,
        store: localStore
      }
    });
  } catch (error) {
    console.warn('[Background] /v1/store/import failed, fallback PATCH /v1/store:', error?.message || error);
    await cloudRequest('STORE', {
      method: 'PATCH',
      body: {
        partial: localStore
      }
    });
    fallbackPatch = true;
  }

  if (payload?.clearLocalAfterImport) {
    await chrome.storage.local.set({
      capturedList: [],
      worlds: [],
      books: [],
      entities: [],
      bookEntityUsages: []
    });
  }

  return {
    success: true,
    migrated: stats,
    fallbackPatch,
    strategy,
    message: '迁移完成'
  };
}

async function migrateLocalDataIfNeeded() {
  await ensureRuntimeReady();
  if (dataRepository.mode !== 'local') return { success: true, migrated: false };

  const store = await readData();
  let migrated = false;
  const patch = {};

  const normalizedEntities = store.entities.map((entity) => {
    const next = normalizeEntityRecordForStorage(entity);
    const currentTags = Array.isArray(entity?.tags) ? entity.tags : [];
    const changed =
      !Array.isArray(entity?.tags) ||
      currentTags.length !== next.tags.length ||
      currentTags.some((tag, index) => tag !== next.tags[index]);
    if (changed) migrated = true;
    return next;
  });

  if (migrated) {
    patch.entities = normalizedEntities;
  }

  let captureMigrated = false;
  const normalizedCaptures = store.capturedList.map((item) => {
    const next = normalizeCaptureRecordForStorage(item);
    const changed =
      item?.status !== next.status ||
      Number(item?.statusUpdatedAt || 0) !== Number(next.statusUpdatedAt || 0) ||
      Number(item?.organizedAt || 0) !== Number(next.organizedAt || 0) ||
      Number(item?.convertedAt || 0) !== Number(next.convertedAt || 0);
    if (changed) captureMigrated = true;
    return next;
  });

  if (captureMigrated) {
    patch.capturedList = normalizedCaptures;
    migrated = true;
  }

  if (migrated) {
    await writeData(patch);
  }

  return { success: true, migrated };
}

async function saveCapture(text, sourceUrl, sourceTitle, options = {}) {
  const trimmed = safeName(text);
  if (!trimmed) return null;

  const forcedStatus = CAPTURE_STATUS_VALUES.has(options.status) ? options.status : null;
  let { capturedList } = await readData();
  const existingIndex = capturedList.findIndex((item) => item.text === trimmed);
  const now = Date.now();
  let updated;

  if (existingIndex !== -1) {
    const existingStatus = resolveCaptureStatus(capturedList[existingIndex].status, CAPTURE_STATUS.INBOX);
    updated = {
      ...capturedList[existingIndex],
      timestamp: now,
      sourceUrl: sourceUrl || capturedList[existingIndex].sourceUrl || '',
      sourceTitle: sourceTitle || capturedList[existingIndex].sourceTitle || '',
      count: Number(capturedList[existingIndex].count || 1) + 1,
      status: existingStatus,
      statusUpdatedAt: capturedList[existingIndex].statusUpdatedAt || now
    };
    capturedList.splice(existingIndex, 1);
  } else {
    updated = {
      text: trimmed,
      timestamp: now,
      sourceUrl: sourceUrl || '',
      sourceTitle: sourceTitle || '',
      count: 1,
      isPinned: false,
      status: CAPTURE_STATUS.INBOX,
      statusUpdatedAt: now
    };
  }

  if (forcedStatus) {
    updated = applyCaptureStatus(updated, forcedStatus, now);
  }

  capturedList.unshift(updated);

  if (capturedList.length > 50) {
    const pinned = capturedList.filter((item) => item.isPinned);
    const nonPinned = capturedList.filter((item) => !item.isPinned).slice(0, 50 - pinned.length);
    capturedList = [...pinned, ...nonPinned];
  }

  await writeData({ capturedList });
  return updated;
}

async function updateCaptureStatus(payload) {
  const text = safeName(payload?.text);
  const timestamp = Number(payload?.timestamp || 0);
  const status = payload?.status;

  if (!text) {
    return { success: false, error: '缺少捕获文本' };
  }
  if (!CAPTURE_STATUS_VALUES.has(status)) {
    return { success: false, error: '非法状态' };
  }

  const store = await readData();
  const targetIndex = store.capturedList.findIndex((item) => {
    if (item.text !== text) return false;
    return timestamp ? Number(item.timestamp) === timestamp : true;
  });

  if (targetIndex === -1) {
    return { success: false, error: '未找到目标捕获项' };
  }

  const now = Date.now();
  const updated = applyCaptureStatus(store.capturedList[targetIndex], status, now);
  store.capturedList[targetIndex] = updated;

  await writeData({ capturedList: store.capturedList });
  return { success: true, capture: updated };
}

async function markCaptureConvertedByText(text) {
  const captureText = safeName(text);
  if (!captureText) return null;

  const store = await readData();
  const targetIndex = store.capturedList.findIndex((item) => item.text === captureText);
  if (targetIndex === -1) return null;

  const updated = applyCaptureStatus(store.capturedList[targetIndex], CAPTURE_STATUS.CONVERTED, Date.now());
  store.capturedList[targetIndex] = updated;
  await writeData({ capturedList: store.capturedList });
  return updated;
}

async function createWorld(name) {
  const trimmed = safeName(name);
  if (!trimmed) {
    return { success: false, error: '世界名称不能为空' };
  }

  const store = await readData();
  const entitlements = await getEffectiveEntitlements();
  const maxWorlds = entitlements?.limits?.maxWorlds;
  if (isLimited(maxWorlds) && store.worlds.length >= maxWorlds) {
    return {
      success: false,
      error: `当前套餐最多可创建 ${maxWorlds} 个世界，请升级 Pro`
    };
  }

  const world = {
    id: createId('world'),
    name: trimmed,
    description: '',
    createdAt: Date.now()
  };

  const nextWorlds = [world, ...store.worlds];
  await writeData({ worlds: nextWorlds });
  return { success: true, world };
}

async function createBook(worldId, title) {
  const safeWorldId = safeName(worldId);
  const safeTitle = safeName(title);

  if (!safeWorldId) {
    return { success: false, error: '缺少 worldId' };
  }
  if (!safeTitle) {
    return { success: false, error: '书项目名称不能为空' };
  }

  const store = await readData();
  const entitlements = await getEffectiveEntitlements();
  const maxBooksPerWorld = entitlements?.limits?.maxBooksPerWorld;
  const booksInWorldCount = store.books.filter((book) => book.worldId === safeWorldId).length;
  if (isLimited(maxBooksPerWorld) && booksInWorldCount >= maxBooksPerWorld) {
    return {
      success: false,
      error: `当前套餐每个世界最多创建 ${maxBooksPerWorld} 本书，请升级 Pro`
    };
  }

  const book = {
    id: createId('book'),
    worldId: safeWorldId,
    title: safeTitle,
    description: '',
    createdAt: Date.now()
  };

  const nextBooks = [book, ...store.books];
  await writeData({ books: nextBooks });
  return { success: true, book };
}

function buildEntityRecord(input, fallback) {
  const now = Date.now();
  const name = safeName(input.name);
  return {
    id: input.id || createId('entity'),
    worldId: safeName(input.worldId || fallback?.worldId),
    type: safeName(input.type || fallback?.type || 'other'),
    name,
    summary: String(input.summary || '').trim(),
    tags: normalizeTags(input.tags),
    sourceUrl: String(input.sourceUrl || fallback?.sourceUrl || ''),
    sourceTitle: String(input.sourceTitle || fallback?.sourceTitle || ''),
    selectedText: String(input.selectedText || fallback?.selectedText || ''),
    createdAt: fallback?.createdAt || now,
    updatedAt: now
  };
}

async function ensureEntityCreationQuota(store, isCreate) {
  if (!isCreate) return { success: true };
  const entitlements = await getEffectiveEntitlements();
  const maxEntities = entitlements?.limits?.maxEntities;
  if (isLimited(maxEntities) && store.entities.length >= maxEntities) {
    return {
      success: false,
      error: `当前套餐最多可管理 ${maxEntities} 个实体，请升级 Pro`
    };
  }
  return { success: true };
}

async function saveEntityFromCapture(data) {
  const payload = data || {};
  const worldId = safeName(payload.worldId);
  const name = safeName(payload.name);

  if (!worldId) return { success: false, error: '缺少 worldId' };
  if (!name) return { success: false, error: '实体名称不能为空' };

  const captureQuota = await authorizeCaptureQuota();
  if (!captureQuota.success) {
    return captureQuota;
  }

  const store = await readData();
  const entityQuota = await ensureEntityCreationQuota(store, true);
  if (!entityQuota.success) {
    return entityQuota;
  }

  const entity = buildEntityRecord(
    {
      worldId,
      type: payload.type,
      name,
      summary: payload.summary,
      tags: payload.tags,
      sourceUrl: payload.sourceUrl,
      sourceTitle: payload.sourceTitle,
      selectedText: payload.selectedText
    },
    null
  );

  store.entities.unshift(entity);

  const selectedBooks = [
    ...new Set((Array.isArray(payload.selectedBooks) ? payload.selectedBooks : []).map(safeName).filter(Boolean))
  ];
  if (selectedBooks.length > 0) {
    selectedBooks.forEach((bookId) => {
      const existed = store.bookEntityUsages.some((usage) => usage.bookId === bookId && usage.entityId === entity.id);
      if (!existed) {
        store.bookEntityUsages.unshift({
          id: createId('usage'),
          bookId,
          entityId: entity.id,
          note: '',
          createdAt: Date.now()
        });
      }
    });
  }

  await writeData({
    entities: store.entities,
    bookEntityUsages: store.bookEntityUsages
  });

  await saveCapture(payload.selectedText, payload.sourceUrl, payload.sourceTitle, {
    status: CAPTURE_STATUS.CONVERTED
  });
  await incrementUsage(USAGE_ACTION.CAPTURE_CREATE, 1);
  return { success: true, entity };
}

async function saveEntityFromSidepanel(payload) {
  const input = payload?.entity || {};
  const selectedBookId = safeName(payload?.selectedBookId);
  const usedInCurrentBook = Boolean(input.usedInCurrentBook);
  const name = safeName(input.name);
  const worldId = safeName(input.worldId);

  if (!name) return { success: false, error: '实体名称不能为空' };
  if (!worldId) return { success: false, error: '请先选择世界' };

  const store = await readData();
  const existingIndex = input.id ? store.entities.findIndex((item) => item.id === input.id) : -1;
  const existing = existingIndex >= 0 ? store.entities[existingIndex] : null;

  const entityQuota = await ensureEntityCreationQuota(store, existingIndex < 0);
  if (!entityQuota.success) {
    return entityQuota;
  }

  const entity = buildEntityRecord(input, existing);

  if (existingIndex >= 0) {
    store.entities[existingIndex] = entity;
  } else {
    store.entities.unshift(entity);
  }

  if (selectedBookId) {
    const usageIndex = store.bookEntityUsages.findIndex(
      (usage) => usage.bookId === selectedBookId && usage.entityId === entity.id
    );
    if (usedInCurrentBook && usageIndex === -1) {
      store.bookEntityUsages.unshift({
        id: createId('usage'),
        bookId: selectedBookId,
        entityId: entity.id,
        createdAt: Date.now()
      });
    } else if (!usedInCurrentBook && usageIndex !== -1) {
      store.bookEntityUsages.splice(usageIndex, 1);
    }
  }

  await writeData({
    entities: store.entities,
    bookEntityUsages: store.bookEntityUsages
  });

  await markCaptureConvertedByText(entity.selectedText);

  return { success: true, entity };
}

async function getWorldsAndBooks() {
  try {
    const { worlds, books } = await readData();
    return { worlds, books };
  } catch (error) {
    console.warn('[Background] getWorldsAndBooks fallback:', error?.message || error);
    return { worlds: [], books: [] };
  }
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

function createValidationResult(error, details = {}) {
  return {
    success: false,
    error,
    errorType: 'validation',
    details
  };
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function validateSaveEntityPayload(payload) {
  if (!isPlainObject(payload)) {
    return createValidationResult('SAVE_ENTITY 参数必须是对象');
  }
  if (!safeName(payload.worldId)) {
    return createValidationResult('SAVE_ENTITY 缺少 worldId');
  }
  if (!safeName(payload.name)) {
    return createValidationResult('SAVE_ENTITY 缺少 name');
  }

  const selectedBooks = payload.selectedBooks;
  if (selectedBooks !== undefined && !Array.isArray(selectedBooks)) {
    return createValidationResult('SAVE_ENTITY.selectedBooks 必须是数组');
  }

  if (Array.isArray(selectedBooks) && selectedBooks.some((bookId) => !safeName(bookId))) {
    return createValidationResult('SAVE_ENTITY.selectedBooks 含非法 bookId');
  }

  return null;
}

function validateSaveEntityFromSidepanelPayload(payload) {
  if (!isPlainObject(payload)) {
    return createValidationResult('SAVE_ENTITY_FROM_SIDEPANEL 参数必须是对象');
  }
  if (!isPlainObject(payload.entity)) {
    return createValidationResult('SAVE_ENTITY_FROM_SIDEPANEL 缺少 entity');
  }

  if (!safeName(payload.entity.worldId)) {
    return createValidationResult('SAVE_ENTITY_FROM_SIDEPANEL.entity 缺少 worldId');
  }

  if (!safeName(payload.entity.name)) {
    return createValidationResult('SAVE_ENTITY_FROM_SIDEPANEL.entity 缺少 name');
  }

  if (payload.selectedBookId !== undefined && typeof payload.selectedBookId !== 'string') {
    return createValidationResult('SAVE_ENTITY_FROM_SIDEPANEL.selectedBookId 必须是字符串');
  }

  return null;
}

function validateUpdateCaptureStatusPayload(payload) {
  if (!isPlainObject(payload)) {
    return createValidationResult('UPDATE_CAPTURE_STATUS 参数必须是对象');
  }

  if (!safeName(payload.text)) {
    return createValidationResult('UPDATE_CAPTURE_STATUS 缺少 text');
  }

  if (!CAPTURE_STATUS_VALUES.has(payload.status)) {
    return createValidationResult('UPDATE_CAPTURE_STATUS.status 非法');
  }

  if (payload.timestamp !== undefined) {
    const timestamp = Number(payload.timestamp);
    if (!Number.isFinite(timestamp) || timestamp < 0) {
      return createValidationResult('UPDATE_CAPTURE_STATUS.timestamp 非法');
    }
  }

  return null;
}

function validateSetRuntimeConfigPayload(payload) {
  if (!isPlainObject(payload)) {
    return createValidationResult('SET_RUNTIME_CONFIG 参数必须是对象');
  }

  if (payload.repositoryMode !== undefined) {
    const mode = safeName(payload.repositoryMode).toLowerCase();
    if (mode !== 'local' && mode !== 'cloud') {
      return createValidationResult('SET_RUNTIME_CONFIG.repositoryMode 非法');
    }
  }

  if (payload.cloudApiBaseUrl !== undefined && typeof payload.cloudApiBaseUrl !== 'string') {
    return createValidationResult('SET_RUNTIME_CONFIG.cloudApiBaseUrl 必须是字符串');
  }

  if (payload.cloudTimeoutMs !== undefined) {
    const timeout = Number(payload.cloudTimeoutMs);
    if (!Number.isFinite(timeout) || timeout <= 0) {
      return createValidationResult('SET_RUNTIME_CONFIG.cloudTimeoutMs 非法');
    }
  }

  return null;
}

function validateSignInWithPasswordPayload(payload) {
  if (!isPlainObject(payload)) {
    return createValidationResult('SIGN_IN_WITH_PASSWORD 参数必须是对象');
  }

  if (typeof payload.email !== 'string' || !payload.email.trim()) {
    return createValidationResult('SIGN_IN_WITH_PASSWORD.email 必填');
  }

  if (typeof payload.password !== 'string' || !payload.password) {
    return createValidationResult('SIGN_IN_WITH_PASSWORD.password 必填');
  }

  return null;
}

function validateRequestExportPayload(payload) {
  if (!isPlainObject(payload)) {
    return createValidationResult('REQUEST_EXPORT 参数必须是对象');
  }

  const format = safeName(payload.format).toLowerCase();
  if (format !== 'json' && format !== 'markdown') {
    return createValidationResult('REQUEST_EXPORT.format 非法');
  }

  return null;
}

function validateMigrateLocalToCloudPayload(payload) {
  if (payload === undefined || payload === null) return null;
  if (!isPlainObject(payload)) {
    return createValidationResult('MIGRATE_LOCAL_TO_CLOUD 参数必须是对象');
  }

  if (payload.strategy !== undefined) {
    const strategy = safeName(payload.strategy).toLowerCase();
    if (strategy !== 'merge' && strategy !== 'overwrite') {
      return createValidationResult('MIGRATE_LOCAL_TO_CLOUD.strategy 非法');
    }
  }

  if (payload.clearLocalAfterImport !== undefined && typeof payload.clearLocalAfterImport !== 'boolean') {
    return createValidationResult('MIGRATE_LOCAL_TO_CLOUD.clearLocalAfterImport 必须是布尔值');
  }

  return null;
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

  chrome.tabs.sendMessage(
    tab.id,
    {
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
    },
    () => {
      if (chrome.runtime.lastError) {
        console.log('[Background] open panel skipped:', chrome.runtime.lastError.message);
      }
    }
  );
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const type = message?.type;

  if (type === 'SAVE_ENTITY') {
    const validationError = validateSaveEntityPayload(message?.data);
    if (validationError) {
      sendResponse(validationError);
      return true;
    }
    withResponse(() => saveEntityFromCapture(message.data), sendResponse);
    return true;
  }

  if (type === 'CREATE_WORLD') {
    withResponse(() => createWorld(message?.data?.name), sendResponse);
    return true;
  }

  if (type === 'CREATE_BOOK') {
    withResponse(() => createBook(message?.data?.worldId, message?.data?.title), sendResponse);
    return true;
  }

  if (type === 'SAVE_ENTITY_FROM_SIDEPANEL') {
    const validationError = validateSaveEntityFromSidepanelPayload(message?.data);
    if (validationError) {
      sendResponse(validationError);
      return true;
    }
    withResponse(() => saveEntityFromSidepanel(message?.data), sendResponse);
    return true;
  }

  if (type === 'UPDATE_CAPTURE_STATUS') {
    const validationError = validateUpdateCaptureStatusPayload(message?.data);
    if (validationError) {
      sendResponse(validationError);
      return true;
    }
    withResponse(() => updateCaptureStatus(message?.data), sendResponse);
    return true;
  }

  if (type === 'REQUEST_EXPORT') {
    const validationError = validateRequestExportPayload(message?.data);
    if (validationError) {
      sendResponse(validationError);
      return true;
    }
    withResponse(() => authorizeExport(message?.data), sendResponse);
    return true;
  }

  if (type === 'MIGRATE_LOCAL_TO_CLOUD') {
    const validationError = validateMigrateLocalToCloudPayload(message?.data);
    if (validationError) {
      sendResponse(validationError);
      return true;
    }
    withResponse(() => migrateLocalDataToCloud(message?.data), sendResponse);
    return true;
  }

  if (type === 'GET_RUNTIME_CONTEXT') {
    withResponse(() => getRuntimeContext(), sendResponse);
    return true;
  }

  if (type === 'GET_RUNTIME_CONFIG') {
    withResponse(() => getRuntimeConfig(), sendResponse);
    return true;
  }

  if (type === 'SET_RUNTIME_CONFIG') {
    const validationError = validateSetRuntimeConfigPayload(message?.data);
    if (validationError) {
      sendResponse(validationError);
      return true;
    }
    withResponse(() => setRuntimeConfig(message?.data), sendResponse);
    return true;
  }

  if (type === 'GET_ENTITLEMENTS') {
    withResponse(() => refreshEntitlements(), sendResponse);
    return true;
  }

  if (type === 'REFRESH_ENTITLEMENTS') {
    withResponse(() => refreshEntitlements(), sendResponse);
    return true;
  }

  if (type === 'GET_AUTH_SESSION') {
    withResponse(() => getAuthSession(), sendResponse);
    return true;
  }

  if (type === 'SET_AUTH_SESSION') {
    withResponse(() => setAuthSession(message?.data), sendResponse);
    return true;
  }

  if (type === 'SIGN_IN_WITH_PASSWORD') {
    const validationError = validateSignInWithPasswordPayload(message?.data);
    if (validationError) {
      sendResponse(validationError);
      return true;
    }
    withResponse(() => signInWithPassword(message?.data), sendResponse);
    return true;
  }

  if (type === 'CLEAR_AUTH_SESSION') {
    withResponse(() => clearAuthSession(), sendResponse);
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
