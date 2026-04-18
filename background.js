function createId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

const API_BASE_URL = 'http://localhost:3001/api';

const STORAGE_KEYS = ['capturedList', 'worlds', 'books', 'entities', 'bookEntityUsages', 'entityRelations'];
const AUTH_SESSION_KEY = 'authSession';
const ENTITLEMENTS_KEY = 'entitlements';
const USAGE_METER_KEY = 'usageMeter';
const RUNTIME_CONFIG_KEY = 'runtimeConfig';
const AUTH_TOKEN_KEY = 'authToken';

const CAPTURE_STATUS = {
  INBOX: 'inbox',
  ORGANIZED: 'organized',
  CONVERTED: 'converted'
};
const CAPTURE_STATUS_VALUES = new Set(Object.values(CAPTURE_STATUS));
const ENTITY_RELATION_TYPES = new Set(['belongs_to', 'hostile_to', 'kinship', 'uses', 'originates_from', 'related_to']);
const CONFLICT_REASON_CODES = new Set([
  'exact_type_mismatch',
  'exact_name_duplicate',
  'life_status_conflict',
  'name_and_summary_similar',
  'name_similar',
  'summary_similar',
  'potential_conflict'
]);
const AI_FEEDBACK_SCOPES = new Set(['assist', 'conflict']);
const AI_FEEDBACK_DECISIONS = new Set(['positive', 'negative']);
const CONFLICT_STRATEGY_VERSION = 'v1.2';
const CONFLICT_CALIBRATION = {
  similarity: {
    name: 0.72,
    summary: 0.62
  },
  risk: {
    high: 0.9,
    medium: 0.75
  },
  rowLimit: 6
};
const AI_ASSIST_STRATEGY_VERSION = 'v1.1';

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
  AUTH_REFRESH: '/v1/auth/refresh',
  AI_ENTITY_ASSIST: '/v1/ai/entity-assist',
  AI_ENTITY_CONFLICT: '/v1/ai/entity-conflict',
  AI_MANUSCRIPT_PARSE: '/v1/ai/manuscript-parse',
  AI_FEEDBACK: '/v1/ai/feedback'
};
const MOCK_CLOUD_SCHEME = 'mock://';

async function apiRequest(endpoint, options = {}) {
  const token = await getAuthToken();
  
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('[API Client] Request failed:', error);
    throw error;
  }
}

async function getAuthToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get([AUTH_SESSION_KEY], (result) => {
      const authSession = result[AUTH_SESSION_KEY];
      resolve(authSession?.token || null);
    });
  });
}

async function setAuthToken(token) {
  return new Promise((resolve) => {
    chrome.storage.local.get([AUTH_SESSION_KEY], (result) => {
      const authSession = result[AUTH_SESSION_KEY] || {};
      authSession.token = token;
      chrome.storage.local.set({ [AUTH_SESSION_KEY]: authSession }, resolve);
    });
  });
}

async function clearAuthToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get([AUTH_SESSION_KEY], (result) => {
      const authSession = result[AUTH_SESSION_KEY] || {};
      delete authSession.token;
      chrome.storage.local.set({ [AUTH_SESSION_KEY]: authSession }, resolve);
    });
  });
}

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
    bookEntityUsages: Array.isArray(data?.bookEntityUsages) ? data.bookEntityUsages : [],
    entityRelations: Array.isArray(data?.entityRelations) ? data.entityRelations : []
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
    entityRelations: mergeUniqueByKey(base.entityRelations, patch.entityRelations, (item) => safeName(item?.id)),
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

function normalizeRelationType(value) {
  const type = safeName(value).toLowerCase();
  return ENTITY_RELATION_TYPES.has(type) ? type : 'related_to';
}

function normalizeEntityRelationsPayload(relations, context = {}) {
  const worldId = safeName(context.worldId);
  const fromEntityId = safeName(context.fromEntityId);
  const validTargetEntityIds = context.validTargetEntityIds instanceof Set ? context.validTargetEntityIds : null;
  if (!worldId || !fromEntityId || !Array.isArray(relations)) return [];

  const now = Date.now();
  const unique = [];
  const seen = new Set();

  relations.forEach((item) => {
    const toEntityId = safeName(item?.toEntityId || item?.targetEntityId || item?.entityId);
    if (!toEntityId || toEntityId === fromEntityId) return;
    if (validTargetEntityIds && !validTargetEntityIds.has(toEntityId)) return;
    const type = normalizeRelationType(item?.type);
    const uniqueKey = `${type}::${toEntityId}`;
    if (seen.has(uniqueKey)) return;
    seen.add(uniqueKey);

    unique.push({
      id: safeName(item?.id) || createId('relation'),
      worldId,
      fromEntityId,
      toEntityId,
      type,
      note: String(item?.note || '').trim(),
      createdAt: Number(item?.createdAt || now),
      updatedAt: now
    });
  });

  return unique;
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
  const subscriptionExpiresAtRaw = Number(payload?.subscriptionExpiresAt || fallbackSession?.subscriptionExpiresAt || 0);
  const subscriptionExpiresAt = Number.isFinite(subscriptionExpiresAtRaw) && subscriptionExpiresAtRaw > 0 ? subscriptionExpiresAtRaw : null;

  return {
    userId: safeName(payload?.userId || fallbackSession?.userId) || createId('user'),
    email,
    plan,
    provider: safeName(payload?.provider || fallbackSession?.provider || 'local-dev'),
    accessToken: safeName(payload?.accessToken || fallbackSession?.accessToken),
    refreshToken: safeName(payload?.refreshToken || fallbackSession?.refreshToken),
    tokenType: safeName(payload?.tokenType || fallbackSession?.tokenType || 'Bearer'),
    expiresAt,
    subscriptionExpiresAt,
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

function buildAiFallbackMeta(error) {
  const summary = getCloudErrorSummary(error);
  return {
    fallbackReason: summary.message || '云端不可用',
    fallbackType: summary.type || '',
    fallbackStatus: Number(summary.status || 0) || undefined,
    fallbackRetriable: Boolean(summary.retriable),
    fallbackTraceId: summary.traceId || ''
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
  // 本地模式下直接返回错误，避免使用 mock 协议
  if (runtimeConfig.repositoryMode === 'local') {
    throw createCloudRequestError({
      message: '当前处于本地模式，无法访问云端服务',
      type: 'local_mode',
      code: 'local_mode',
      endpoint: endpointOrPath,
      method: options.method || 'GET'
    });
  }

  const requireAuth = options.requireAuth !== false;
  const method = options.method || 'GET';
  const endpoint = resolveCloudEndpoint(endpointOrPath);
  const baseUrl = (() => {
    const url = safeName(runtimeConfig.cloudApiBaseUrl).replace(/\/+$/g, '');
    // 避免使用 mock 协议
    if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
      return API_BASE_URL;
    }
    return url || API_BASE_URL;
  })();
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
      try {
        const refreshed = await refreshCloudSession(session);
        accessToken = safeName(refreshed.accessToken);
        tokenType = safeName(refreshed.tokenType || tokenType || 'Bearer');
        requestResult = await performRequest(accessToken, 2);
      } catch (refreshError) {
        // 刷新失败，直接抛出错误
        throw refreshError;
      }
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
      try {
        const worldsResponse = await apiRequest('/worlds');
        const capturesResponse = await apiRequest('/captures');
        
        let allBooks = [];
        let allEntities = [];
        
        // 获取所有世界的书籍和实体
        if (worldsResponse.success && worldsResponse.data.length > 0) {
          for (const world of worldsResponse.data) {
            const booksResponse = await apiRequest(`/books?worldId=${world.id}`);
            if (booksResponse.success) {
              allBooks = [...allBooks, ...booksResponse.data];
            }
            
            const entitiesResponse = await apiRequest(`/entities?worldId=${world.id}`);
            if (entitiesResponse.success) {
              allEntities = [...allEntities, ...entitiesResponse.data];
            }
          }
        }

        return {
          capturedList: capturesResponse.success ? capturesResponse.data.map(capture => ({
            id: capture.id,
            text: capture.text,
            timestamp: new Date(capture.createdAt).getTime(),
            sourceUrl: capture.sourceUrl || '',
            sourceTitle: capture.sourceTitle || '',
            count: 1,
            isPinned: false,
            status: capture.status || CAPTURE_STATUS.INBOX,
            statusUpdatedAt: new Date(capture.updatedAt).getTime()
          })) : [],
          worlds: worldsResponse.success ? worldsResponse.data.map(world => ({
            id: world.id,
            name: world.name,
            description: world.description || '',
            createdAt: new Date(world.createdAt).getTime(),
            updatedAt: new Date(world.updatedAt).getTime()
          })) : [],
          books: allBooks.map(book => ({
            id: book.id,
            worldId: book.worldId,
            title: book.title,
            description: book.description || '',
            status: book.status || 'active',
            createdAt: new Date(book.createdAt).getTime(),
            updatedAt: new Date(book.updatedAt).getTime()
          })),
          entities: allEntities.map(entity => ({
            id: entity.id,
            worldId: entity.worldId,
            name: entity.name,
            type: entity.type,
            summary: entity.summary || '',
            tags: entity.tags ? entity.tags.split(',').filter(Boolean) : [],
            sourceUrl: entity.sourceUrl || '',
            sourceTitle: entity.sourceTitle || '',
            createdAt: new Date(entity.createdAt).getTime(),
            updatedAt: new Date(entity.updatedAt).getTime()
          }))
        };
      } catch (error) {
        console.error('[CloudRepository] readAll failed:', error);
        throw error;
      }
    },
    async writePartial(partial) {
      try {
        // 处理世界数据
        if (partial.worlds) {
          for (const world of partial.worlds) {
            if (world.id) {
              // 更新世界
              await apiRequest(`/worlds/${world.id}`, {
                method: 'PUT',
                body: {
                  name: world.name,
                  description: world.description
                }
              });
            } else {
              // 创建世界
              await apiRequest('/worlds', {
                method: 'POST',
                body: {
                  name: world.name,
                  description: world.description
                }
              });
            }
          }
        }

        // 处理书籍数据
        if (partial.books) {
          for (const book of partial.books) {
            if (book.id) {
              // 更新书籍
              await apiRequest(`/books/${book.id}`, {
                method: 'PUT',
                body: {
                  title: book.title,
                  description: book.description,
                  status: book.status
                }
              });
            } else {
              // 创建书籍
              await apiRequest('/books', {
                method: 'POST',
                body: {
                  worldId: book.worldId,
                  title: book.title,
                  description: book.description,
                  status: book.status
                }
              });
            }
          }
        }

        // 处理实体数据
        if (partial.entities) {
          for (const entity of partial.entities) {
            if (entity.id) {
              // 更新实体
              await apiRequest(`/entities/${entity.id}`, {
                method: 'PUT',
                body: {
                  name: entity.name,
                  type: entity.type,
                  summary: entity.summary,
                  tags: entity.tags.join(','),
                  sourceUrl: entity.sourceUrl,
                  sourceTitle: entity.sourceTitle
                }
              });
            } else {
              // 创建实体
              await apiRequest('/entities', {
                method: 'POST',
                body: {
                  worldId: entity.worldId,
                  name: entity.name,
                  type: entity.type,
                  summary: entity.summary,
                  tags: entity.tags.join(','),
                  sourceUrl: entity.sourceUrl,
                  sourceTitle: entity.sourceTitle
                }
              });
            }
          }
        }

        // 处理捕获记录数据
        if (partial.capturedList) {
          for (const capture of partial.capturedList) {
            if (capture.id) {
              // 更新捕获记录
              await apiRequest(`/captures/${capture.id}`, {
                method: 'PUT',
                body: {
                  status: capture.status
                }
              });
            } else {
              // 创建捕获记录
              await apiRequest('/captures', {
                method: 'POST',
                body: {
                  text: capture.text,
                  sourceUrl: capture.sourceUrl,
                  sourceTitle: capture.sourceTitle
                }
              });
            }
          }
        }
      } catch (error) {
        console.error('[CloudRepository] writePartial failed:', error);
        throw error;
      }
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
  
  try {
    const token = await getAuthToken();
    if (token) {
      // 从 API 获取数据
      const worldsResponse = await apiRequest('/worlds');
      const capturesResponse = await apiRequest('/captures');
      
      let booksResponse = { success: true, data: [] };
      let entitiesResponse = { success: true, data: [] };
      
      // 只有当有世界时才获取书籍和实体
      if (worldsResponse.success && worldsResponse.data.length > 0) {
        const firstWorldId = worldsResponse.data[0].id;
        booksResponse = await apiRequest(`/books?worldId=${firstWorldId}`);
        entitiesResponse = await apiRequest(`/entities?worldId=${firstWorldId}`);
      }

      return {
        capturedList: capturesResponse.success ? capturesResponse.data.map(capture => ({
          id: capture.id,
          text: capture.text,
          timestamp: new Date(capture.createdAt).getTime(),
          sourceUrl: capture.sourceUrl || '',
          sourceTitle: capture.sourceTitle || '',
          count: 1,
          isPinned: false,
          status: capture.status || CAPTURE_STATUS.INBOX,
          statusUpdatedAt: new Date(capture.updatedAt).getTime()
        })) : [],
        worlds: worldsResponse.success ? worldsResponse.data.map(world => ({
          id: world.id,
          name: world.name,
          description: world.description || '',
          createdAt: new Date(world.createdAt).getTime(),
          updatedAt: new Date(world.updatedAt).getTime()
        })) : [],
        books: booksResponse.success ? booksResponse.data.map(book => ({
          id: book.id,
          worldId: book.worldId,
          title: book.title,
          description: book.description || '',
          status: book.status || 'active',
          createdAt: new Date(book.createdAt).getTime(),
          updatedAt: new Date(book.updatedAt).getTime()
        })) : [],
        entities: entitiesResponse.success ? entitiesResponse.data.map(entity => ({
          id: entity.id,
          worldId: entity.worldId,
          name: entity.name,
          type: entity.type,
          summary: entity.summary || '',
          tags: entity.tags ? entity.tags.split(',').filter(Boolean) : [],
          sourceUrl: entity.sourceUrl || '',
          sourceTitle: entity.sourceTitle || '',
          createdAt: new Date(entity.createdAt).getTime(),
          updatedAt: new Date(entity.updatedAt).getTime()
        })) : [],
        bookEntityUsages: [],
        entityRelations: []
      };
    }
  } catch (error) {
    console.error('[Background] readData from API error:', error);
  }
  
  // 回退到本地存储
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
  const email = safeName(payload?.email).toLowerCase();
  const password = String(payload?.password || '');
  if (!email || !password) {
    return { success: false, error: '邮箱和密码不能为空' };
  }

  try {
    const response = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (!response.success) {
      return { success: false, error: response.error || '登录失败' };
    }

    const sessionData = {
      email: email,
      plan: response.data.user.plan,
      accessToken: response.data.token,
      refreshToken: response.data.token,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      provider: 'password'
    };
    
    const nextSession = normalizeAuthSessionPayload(sessionData, null);
    await writeAuthSessionRecord(nextSession);
    await setAuthToken(response.data.token);
    
    const entitlementsResponse = await apiRequest('/entitlements');
    let entitlements = null;
    if (entitlementsResponse.success) {
      entitlements = entitlementsResponse.data;
      await writeEntitlementsRecord(entitlements);
    }
    
    return {
      success: true,
      session: nextSession,
      entitlements
    };
  } catch (error) {
    console.error('[Background] signInWithPassword error:', error);
    return { success: false, error: error?.message || '登录失败' };
  }
}

function validateRegisterWithPasswordPayload(payload) {
  const email = safeName(payload?.email).toLowerCase();
  const password = String(payload?.password || '');
  const confirmPassword = String(payload?.confirmPassword || '');
  if (!email || !password || !confirmPassword) {
    return { success: false, error: '邮箱、密码和确认密码不能为空' };
  }
  if (password !== confirmPassword) {
    return { success: false, error: '两次输入的密码不一致' };
  }
  if (password.length < 6) {
    return { success: false, error: '密码长度至少为6位' };
  }
  return null;
}

async function registerWithPassword(payload) {
  await ensureRuntimeReady();
  const email = safeName(payload?.email).toLowerCase();
  const password = String(payload?.password || '');
  const confirmPassword = String(payload?.confirmPassword || '');
  
  const validation = validateRegisterWithPasswordPayload(payload);
  if (validation) {
    return validation;
  }

  try {
    const response = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (!response.success) {
      return { success: false, error: response.error || '注册失败' };
    }

    const sessionData = {
      email: email,
      plan: response.data.user.plan,
      accessToken: response.data.token,
      refreshToken: response.data.token,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      provider: 'password'
    };
    
    const nextSession = normalizeAuthSessionPayload(sessionData, null);
    await writeAuthSessionRecord(nextSession);
    await setAuthToken(response.data.token);
    
    const entitlementsResponse = await apiRequest('/entitlements');
    let entitlements = null;
    if (entitlementsResponse.success) {
      entitlements = entitlementsResponse.data;
      await writeEntitlementsRecord(entitlements);
    }
    
    return {
      success: true,
      session: nextSession,
      entitlements
    };
  } catch (error) {
    console.error('[Background] registerWithPassword error:', error);
    return { success: false, error: error?.message || '注册失败' };
  }
}

async function clearAuthSession() {
  await ensureRuntimeReady();
  
  try {
    const token = await getAuthToken();
    if (token) {
      await apiRequest('/auth/logout', { method: 'POST' });
    }
  } catch (error) {
    console.error('[Background] logout error:', error);
  } finally {
    await chrome.storage.local.remove([AUTH_SESSION_KEY]);
    await clearAuthToken();
    const fallback = normalizeEntitlements(null, 'free');
    await writeEntitlementsRecord(fallback);
  }
  
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
  try {
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
  } catch (error) {
    // 处理认证错误，直接返回成功，因为本地模式下也可以捕获
    if (error?.code === 'auth_required' || error?.message?.includes('请先登录')) {
      return { success: true };
    }
    // 其他错误也返回成功，确保捕获功能不会因为网络问题而失败
    console.warn('Error checking capture quota:', error);
    return { success: true };
  }
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

function normalizeAssistSourceText(value) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.slice(0, 2000);
}

function shouldUseCloudAiProvider() {
  return dataRepository?.mode === 'cloud';
}

function pickFirstNonEmptyString(candidates) {
  for (const candidate of candidates) {
    const value = String(candidate ?? '').trim();
    if (value) return value;
  }
  return '';
}

function pickFirstFiniteNumber(candidates) {
  for (const candidate of candidates) {
    const value = Number(candidate);
    if (Number.isFinite(value)) return value;
  }
  return null;
}

function normalizeRatio01(value, fallback = null) {
  const raw = Number(value);
  if (!Number.isFinite(raw)) return fallback;
  const normalized = raw > 1 && raw <= 100 ? raw / 100 : raw;
  if (normalized < 0 || normalized > 1) return fallback;
  return Number(normalized.toFixed(2));
}

function normalizeNonNegativeInteger(value, fallback = 0) {
  const raw = Number(value);
  if (!Number.isFinite(raw) || raw < 0) return fallback;
  return Math.max(0, Math.floor(raw));
}

function extractCloudAssistText(payload) {
  return pickFirstNonEmptyString([
    payload?.text,
    payload?.result?.text,
    payload?.data?.text,
    payload?.data?.result?.text,
    payload?.output?.text,
    payload?.message,
    payload?.choices?.[0]?.text,
    payload?.choices?.[0]?.message?.content
  ]);
}

function normalizeAssistQualityTier(value) {
  const raw = safeName(value).toLowerCase();
  if (!raw) return '';
  const aliases = {
    strong: 'high',
    excellent: 'high',
    good: 'high',
    medium: 'medium',
    mid: 'medium',
    normal: 'medium',
    weak: 'low',
    poor: 'low'
  };
  const normalized = aliases[raw] || raw;
  if (normalized === 'high' || normalized === 'medium' || normalized === 'low') return normalized;
  return '';
}

function getAssistQualityLabel(qualityTier, qualityScore, inputLabel = '') {
  const customLabel = safeName(inputLabel);
  if (customLabel) return customLabel;
  if (qualityTier === 'high') return '高';
  if (qualityTier === 'medium') return '中';
  if (qualityTier === 'low') return '低';
  if (Number.isFinite(qualityScore)) {
    if (qualityScore >= 0.85) return '高';
    if (qualityScore >= 0.65) return '中';
    return '低';
  }
  return '';
}

function extractCloudAssistMeta(payload) {
  const qualityScore = normalizeRatio01(
    pickFirstFiniteNumber([
      payload?.qualityScore,
      payload?.meta?.qualityScore,
      payload?.result?.qualityScore,
      payload?.data?.qualityScore,
      payload?.output?.qualityScore
    ]),
    null
  );
  const qualityTier = normalizeAssistQualityTier(
    pickFirstNonEmptyString([
      payload?.qualityTier,
      payload?.qualityLevel,
      payload?.qualityTag,
      payload?.meta?.qualityTier,
      payload?.result?.qualityTier,
      payload?.data?.qualityTier
    ])
  );
  const qualityLabel = getAssistQualityLabel(
    qualityTier,
    qualityScore,
    pickFirstNonEmptyString([
      payload?.qualityLabel,
      payload?.meta?.qualityLabel,
      payload?.result?.qualityLabel,
      payload?.data?.qualityLabel
    ])
  );
  const strategyVersion = pickFirstNonEmptyString([
    payload?.strategyVersion,
    payload?.promptVersion,
    payload?.meta?.strategyVersion,
    payload?.meta?.promptVersion,
    payload?.result?.strategyVersion,
    payload?.data?.strategyVersion
  ]);
  return {
    qualityScore,
    qualityTier,
    qualityLabel,
    strategyVersion: strategyVersion || AI_ASSIST_STRATEGY_VERSION
  };
}

function normalizeAiFeedbackScope(value) {
  const scope = safeName(value).toLowerCase();
  return AI_FEEDBACK_SCOPES.has(scope) ? scope : '';
}

function normalizeAiFeedbackDecision(value) {
  const raw = safeName(value).toLowerCase();
  const aliases = {
    helpful: 'positive',
    useful: 'positive',
    like: 'positive',
    thumbs_up: 'positive',
    up: 'positive',
    not_helpful: 'negative',
    unhelpful: 'negative',
    dislike: 'negative',
    thumbs_down: 'negative',
    down: 'negative'
  };
  const decision = aliases[raw] || raw;
  return AI_FEEDBACK_DECISIONS.has(decision) ? decision : '';
}

function normalizeAiFeedbackPayload(payload) {
  const source = payload && typeof payload === 'object' ? payload : {};
  const scope = normalizeAiFeedbackScope(source.scope);
  const decision = normalizeAiFeedbackDecision(source.decision);
  const feedbackAtRaw = Number(source.feedbackAt || source.timestamp || Date.now());
  const feedbackAt = Number.isFinite(feedbackAtRaw) && feedbackAtRaw > 0 ? Math.floor(feedbackAtRaw) : Date.now();
  const qualityScore = normalizeRatio01(source.qualityScore, null);
  const qualityTier = normalizeAssistQualityTier(source.qualityTier);
  const qualityLabel = getAssistQualityLabel(qualityTier, qualityScore, source.qualityLabel);
  const conflictCountRaw = Number(source.conflictCount);
  const conflictCount = Number.isFinite(conflictCountRaw) ? Math.max(0, Math.floor(conflictCountRaw)) : 0;
  const conflictMeta = normalizeConflictMetaPayload(source.conflictMeta);
  const assistProfile = normalizeAssistProfilePayload(source.assistProfile);
  const mode = safeName(source.mode).toLowerCase();

  return {
    scope,
    decision,
    feedbackAt,
    provider: safeName(source.provider),
    model: safeName(source.model),
    strategyVersion: safeName(source.strategyVersion),
    traceId: safeName(source.traceId),
    worldId: safeName(source.worldId),
    bookId: safeName(source.bookId),
    entityId: safeName(source.entityId),
    qualityScore,
    qualityTier,
    qualityLabel,
    conflictCount,
    conflictMeta,
    mode: mode === 'expand' ? 'expand' : mode === 'summarize' ? 'summarize' : '',
    assistProfile
  };
}

function normalizeConflictSignals(signals) {
  const source = signals && typeof signals === 'object' ? signals : {};
  return {
    exactName: Boolean(source.exactName),
    typeMismatch: Boolean(source.typeMismatch),
    lifeConflict: Boolean(source.lifeConflict),
    nameSimilarity: Number(Number(source.nameSimilarity || 0).toFixed(2)),
    summarySimilarity: Number(Number(source.summarySimilarity || 0).toFixed(2))
  };
}

function pickConflictReasonCode(flags) {
  if (flags.exactName && flags.typeMismatch) return 'exact_type_mismatch';
  if (flags.exactName) return 'exact_name_duplicate';
  if (flags.lifeConflict) return 'life_status_conflict';
  if (flags.nameSimilar && flags.summarySimilar) return 'name_and_summary_similar';
  if (flags.nameSimilar) return 'name_similar';
  if (flags.summarySimilar) return 'summary_similar';
  return 'potential_conflict';
}

function getConflictReasonLabel(reasonCode) {
  if (reasonCode === 'exact_type_mismatch') return '同名实体类型冲突';
  if (reasonCode === 'exact_name_duplicate') return '与现有实体同名';
  if (reasonCode === 'life_status_conflict') return '设定状态可能冲突（生死状态不一致）';
  if (reasonCode === 'name_and_summary_similar') return '名称与描述都高度相似';
  if (reasonCode === 'name_similar') return '名称高度相似';
  if (reasonCode === 'summary_similar') return '描述高度相似';
  return '存在潜在冲突';
}

function normalizeConflictReasonCode(value, signals) {
  const raw = safeName(value).toLowerCase();
  const aliases = {
    type_mismatch: 'exact_type_mismatch',
    exact_name: 'exact_name_duplicate',
    same_name: 'exact_name_duplicate',
    life_conflict: 'life_status_conflict',
    name_summary_similar: 'name_and_summary_similar',
    potential: 'potential_conflict'
  };
  const normalized = aliases[raw] || raw;
  if (CONFLICT_REASON_CODES.has(normalized)) return normalized;
  return pickConflictReasonCode({
    exactName: Boolean(signals?.exactName),
    typeMismatch: Boolean(signals?.typeMismatch),
    lifeConflict: Boolean(signals?.lifeConflict),
    nameSimilar: Number(signals?.nameSimilarity || 0) >= CONFLICT_CALIBRATION.similarity.name || Boolean(signals?.exactName),
    summarySimilar: Number(signals?.summarySimilarity || 0) >= CONFLICT_CALIBRATION.similarity.summary
  });
}

function getConflictRiskKey(confidence) {
  const score = Number(confidence || 0);
  if (score >= CONFLICT_CALIBRATION.risk.high) return 'high';
  if (score >= CONFLICT_CALIBRATION.risk.medium) return 'medium';
  return 'low';
}

function normalizeConflictRiskBucket(value) {
  const raw = safeName(value).toLowerCase();
  if (!raw) return '';
  const aliases = {
    critical: 'high',
    severe: 'high',
    strong: 'high',
    warn: 'medium',
    warning: 'medium',
    moderate: 'medium',
    normal: 'low',
    weak: 'low',
    minor: 'low'
  };
  const normalized = aliases[raw] || raw;
  if (normalized === 'high' || normalized === 'medium' || normalized === 'low') return normalized;
  return '';
}

function confidenceFromRiskBucket(bucket) {
  if (bucket === 'high') return CONFLICT_CALIBRATION.risk.high;
  if (bucket === 'medium') return CONFLICT_CALIBRATION.risk.medium;
  if (bucket === 'low') return 0.55;
  return 0;
}

function buildConflictCalibrationSnapshot(input) {
  const source = input && typeof input === 'object' ? input : {};
  const similaritySource = source.similarity && typeof source.similarity === 'object' ? source.similarity : {};
  const riskSource = source.risk && typeof source.risk === 'object' ? source.risk : {};

  const similarityName = normalizeRatio01(
    pickFirstFiniteNumber([similaritySource.name, source.nameSimilarity, source.nameThreshold]),
    CONFLICT_CALIBRATION.similarity.name
  );
  const similaritySummary = normalizeRatio01(
    pickFirstFiniteNumber([similaritySource.summary, source.summarySimilarity, source.summaryThreshold]),
    CONFLICT_CALIBRATION.similarity.summary
  );
  const riskHigh = normalizeRatio01(
    pickFirstFiniteNumber([riskSource.high, source.riskHigh, source.highRiskThreshold]),
    CONFLICT_CALIBRATION.risk.high
  );
  const riskMedium = normalizeRatio01(
    pickFirstFiniteNumber([riskSource.medium, source.riskMedium, source.mediumRiskThreshold]),
    CONFLICT_CALIBRATION.risk.medium
  );
  const rowLimit = Math.max(
    1,
    normalizeNonNegativeInteger(source.rowLimit, CONFLICT_CALIBRATION.rowLimit) || CONFLICT_CALIBRATION.rowLimit
  );

  return {
    similarity: {
      name: similarityName,
      summary: similaritySummary
    },
    risk: {
      high: riskHigh,
      medium: riskMedium
    },
    rowLimit
  };
}

function buildConflictMeta(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const summary = {
    total: list.length,
    high: 0,
    medium: 0,
    low: 0
  };
  list.forEach((row) => {
    const key = getConflictRiskKey(row?.confidence);
    if (key === 'high') summary.high += 1;
    else if (key === 'medium') summary.medium += 1;
    else summary.low += 1;
  });
  return summary;
}

function normalizeConflictRows(conflicts) {
  const rows = Array.isArray(conflicts) ? conflicts : [];
  return rows
    .map((item) => {
      const entityId = safeName(item?.entityId || item?.id);
      const name = safeName(item?.name || item?.entityName) || '未命名设定';
      const type = safeName(item?.type || item?.entityType || 'other') || 'other';
      const riskBucket = normalizeConflictRiskBucket(item?.riskLevel || item?.risk || item?.bucket);
      const confidenceRaw = pickFirstFiniteNumber([item?.confidence, item?.score]);
      const confidenceFallback = confidenceFromRiskBucket(riskBucket);
      const confidence = Number.isFinite(confidenceRaw)
        ? Math.max(0, Math.min(0.99, confidenceRaw))
        : Math.max(0, Math.min(0.99, confidenceFallback));
      const signals = normalizeConflictSignals(item?.signals);
      const reasonCode = normalizeConflictReasonCode(item?.reasonCode || item?.code, signals);
      const reason = safeName(item?.reason || item?.message) || getConflictReasonLabel(reasonCode);
      if (!name) return null;
      return {
        entityId,
        name,
        type,
        confidence: Number(confidence.toFixed(2)),
        reason,
        reasonCode,
        signals
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, CONFLICT_CALIBRATION.rowLimit);
}

function normalizeConflictMetaPayload(input) {
  const source = input && typeof input === 'object' ? input : null;
  if (!source) return null;
  const high = normalizeNonNegativeInteger(
    pickFirstFiniteNumber([source.high, source.highRisk, source.high_count, source.critical]),
    0
  );
  const medium = normalizeNonNegativeInteger(
    pickFirstFiniteNumber([source.medium, source.middle, source.mediumRisk, source.medium_count, source.warn]),
    0
  );
  const low = normalizeNonNegativeInteger(
    pickFirstFiniteNumber([source.low, source.lowRisk, source.low_count, source.normal, source.minor]),
    0
  );
  const totalCandidate = pickFirstFiniteNumber([source.total, source.count, source.totalCount]);
  const total = Number.isFinite(totalCandidate) ? normalizeNonNegativeInteger(totalCandidate, high + medium + low) : high + medium + low;
  if (high + medium + low <= 0 && total <= 0) return null;
  return {
    total: Math.max(total, high + medium + low),
    high,
    medium,
    low
  };
}

function extractCloudConflictPayload(payload) {
  if (!payload || typeof payload !== 'object') return { hasRows: false, rows: [], hasConflict: null };
  const conflictRowsRaw =
    payload?.conflicts ??
    payload?.result?.conflicts ??
    payload?.data?.conflicts ??
    payload?.output?.conflicts ??
    null;
  const hasRows = Array.isArray(conflictRowsRaw);
  const rows = normalizeConflictRows(conflictRowsRaw);
  const hasConflictRaw =
    payload?.hasConflict ??
    payload?.result?.hasConflict ??
    payload?.data?.hasConflict ??
    payload?.output?.hasConflict;
  const hasConflict = typeof hasConflictRaw === 'boolean' ? hasConflictRaw : null;
  const cloudConflictMeta = normalizeConflictMetaPayload(
    payload?.conflictMeta ||
      payload?.distribution ||
      payload?.result?.conflictMeta ||
      payload?.result?.distribution ||
      payload?.data?.conflictMeta ||
      payload?.data?.distribution ||
      payload?.output?.conflictMeta ||
      payload?.output?.distribution
  );
  const cloudConflictCalibration = buildConflictCalibrationSnapshot(
    payload?.calibration ||
      payload?.conflictCalibration ||
      payload?.meta?.calibration ||
      payload?.meta?.conflictCalibration ||
      payload?.result?.calibration ||
      payload?.data?.calibration ||
      payload?.output?.calibration
  );
  const strategyVersion =
    pickFirstNonEmptyString([
      payload?.strategyVersion,
      payload?.meta?.strategyVersion,
      payload?.result?.strategyVersion,
      payload?.data?.strategyVersion,
      payload?.output?.strategyVersion
    ]) || CONFLICT_STRATEGY_VERSION;
  return {
    hasRows,
    rows,
    hasConflict,
    strategyVersion,
    conflictMeta: cloudConflictMeta || buildConflictMeta(rows),
    calibration: cloudConflictCalibration
  };
}

function normalizeManuscriptSuggestionRows(rows) {
  const sourceRows = Array.isArray(rows) ? rows : [];
  return sourceRows
    .map((item) => {
      const name = safeName(item?.name);
      if (!name) return null;
      const confidenceRaw = Number(item?.confidence ?? item?.score ?? 0);
      return {
        name,
        type: safeName(item?.type || 'other') || 'other',
        summary: String(item?.summary || '').trim(),
        frequency: Math.max(0, Number(item?.frequency || item?.count || 1) || 1),
        confidence: Number(Math.max(0, Math.min(0.99, Number.isFinite(confidenceRaw) ? confidenceRaw : 0.42)).toFixed(2)),
        tags: normalizeTags(item?.tags || ['书稿提取'])
      };
    })
    .filter(Boolean)
    .slice(0, 24);
}

function normalizeManuscriptRelationRows(rows) {
  const sourceRows = Array.isArray(rows) ? rows : [];
  return sourceRows
    .map((item) => {
      const fromName = safeName(item?.fromName || item?.sourceName);
      const toName = safeName(item?.toName || item?.targetName);
      if (!fromName || !toName || fromName === toName) return null;
      const confidenceRaw = Number(item?.confidence ?? item?.score ?? 0);
      const countRaw = Number(item?.count || item?.frequency || 1);
      return {
        fromName,
        toName,
        type: ENTITY_RELATION_TYPES.has(item?.type) ? item.type : 'related_to',
        count: Number.isFinite(countRaw) ? Math.max(1, Math.floor(countRaw)) : 1,
        evidence: String(item?.evidence || item?.reason || '').trim(),
        confidence: Number(Math.max(0, Math.min(0.99, Number.isFinite(confidenceRaw) ? confidenceRaw : 0.42)).toFixed(2))
      };
    })
    .filter(Boolean)
    .slice(0, 20);
}

function extractCloudManuscriptPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return { hasSuggestionsArray: false, hasRelationArray: false, suggestions: [], relationSuggestions: [] };
  }
  const suggestionsRaw =
    payload?.suggestions ??
    payload?.result?.suggestions ??
    payload?.data?.suggestions ??
    payload?.output?.suggestions ??
    null;
  const relationRaw =
    payload?.relationSuggestions ??
    payload?.result?.relationSuggestions ??
    payload?.data?.relationSuggestions ??
    payload?.output?.relationSuggestions ??
    null;
  return {
    hasSuggestionsArray: Array.isArray(suggestionsRaw),
    hasRelationArray: Array.isArray(relationRaw),
    suggestions: normalizeManuscriptSuggestionRows(suggestionsRaw),
    relationSuggestions: normalizeManuscriptRelationRows(relationRaw)
  };
}

function normalizeAssistProfilePayload(input) {
  const source = input && typeof input === 'object' ? input : {};
  const style = source.style === 'concise' || source.style === 'balanced' || source.style === 'detailed' ? source.style : 'balanced';
  const targetLength = source.targetLength === 'short' || source.targetLength === 'medium' || source.targetLength === 'long'
    ? source.targetLength
    : 'medium';
  return { style, targetLength };
}

function summarizeTextHeuristically(text, assistProfile) {
  const cleaned = normalizeAssistSourceText(text);
  if (!cleaned) return '';
  const profile = normalizeAssistProfilePayload(assistProfile);
  const summaryLimit = profile.targetLength === 'short' ? 56 : profile.targetLength === 'long' ? 150 : 96;
  const sentenceParts = cleaned.split(/[。！？!?；;]+/).map((item) => item.trim()).filter(Boolean);
  if (sentenceParts.length > 0) {
    if (profile.targetLength === 'long' && sentenceParts.length > 1) {
      const merged = `${sentenceParts[0]}。${sentenceParts[1]}`.replace(/。+/g, '。');
      if (merged.length <= summaryLimit) {
        return `${merged}${merged.endsWith('。') ? '' : '。'}`;
      }
      return `${merged.slice(0, summaryLimit)}…`;
    }
    const first = sentenceParts[0];
    if (first.length <= summaryLimit) {
      return `${first}${first.endsWith('。') ? '' : '。'}`;
    }
    return `${first.slice(0, summaryLimit)}…`;
  }
  if (cleaned.length <= summaryLimit) return cleaned;
  return `${cleaned.slice(0, summaryLimit)}…`;
}

function expandTextHeuristically(text, assistProfile) {
  const cleaned = normalizeAssistSourceText(text);
  if (!cleaned) return '';
  const profile = normalizeAssistProfilePayload(assistProfile);
  const baseLimit = profile.targetLength === 'short' ? 140 : profile.targetLength === 'long' ? 320 : 220;
  const base = cleaned.length > baseLimit ? `${cleaned.slice(0, baseLimit)}…` : cleaned;
  const styleSentences = {
    concise: [
      '建议补充核心动机与关键限制，让后续剧情调用更直接。'
    ],
    balanced: [
      '该设定在当前世界观中具备较高辨识度，可作为剧情推进与人物动机的关键线索。',
      '建议补充其起源、限制条件与与其他实体的关系，以便后续图谱与冲突检测使用。'
    ],
    detailed: [
      '该设定在当前世界观中具备较高辨识度，可作为剧情推进与人物动机的关键线索。',
      '建议补充其起源、限制条件与与其他实体的关系，以便后续图谱与冲突检测使用。',
      '若用于当前作品，建议同步定义触发条件、阶段性变化与关键事件中的表现差异。'
    ]
  };
  return [base, ...styleSentences[profile.style]].join(' ');
}

async function assistEntityText(payload) {
  const mode = payload?.mode === 'expand' ? 'expand' : 'summarize';
  const assistProfile = normalizeAssistProfilePayload(payload?.assistProfile);
  const sourceText = normalizeAssistSourceText(payload?.text);
  if (!sourceText) {
    return { success: false, error: '请先输入或选择需要处理的文本' };
  }

  const entitlements = await getEffectiveEntitlements();
  if (!entitlements?.features?.aiSummary) {
    return {
      success: false,
      error: 'AI 总结/扩写为 Pro 功能，请升级后使用'
    };
  }

  const cloudPreferred = shouldUseCloudAiProvider();
  let fallbackMeta = null;
  if (shouldUseCloudAiProvider()) {
    try {
      const cloudPayload = await cloudRequest('AI_ENTITY_ASSIST', {
        method: 'POST',
        body: {
          mode,
          text: sourceText,
          worldId: safeName(payload?.worldId),
          entityId: safeName(payload?.entityId),
          assistProfile
        }
      });
      const cloudText = extractCloudAssistText(cloudPayload);
      if (cloudText) {
        const cloudAssistProfile = normalizeAssistProfilePayload(
          cloudPayload?.assistProfile || cloudPayload?.result?.assistProfile || cloudPayload?.data?.assistProfile || assistProfile
        );
        const cloudAssistMeta = extractCloudAssistMeta(cloudPayload);
        return {
          success: true,
          mode,
          text: cloudText,
          provider: pickFirstNonEmptyString([cloudPayload?.provider, cloudPayload?.modelProvider]) || 'cloud-model',
          model: pickFirstNonEmptyString([cloudPayload?.model, cloudPayload?.meta?.model, cloudPayload?.result?.model]),
          assistProfile: cloudAssistProfile,
          qualityScore: cloudAssistMeta.qualityScore,
          qualityTier: cloudAssistMeta.qualityTier,
          qualityLabel: cloudAssistMeta.qualityLabel,
          strategyVersion: cloudAssistMeta.strategyVersion
        };
      }
    } catch (error) {
      fallbackMeta = buildAiFallbackMeta(error);
      console.warn('[AI_ENTITY_ASSIST] cloud failed, fallback to local heuristic', fallbackMeta);
    }
  }

  const output = mode === 'expand' ? expandTextHeuristically(sourceText, assistProfile) : summarizeTextHeuristically(sourceText, assistProfile);
  if (!output) {
    return { success: false, error: 'AI 处理失败，请稍后再试' };
  }

  return {
    success: true,
    mode,
    text: output,
    provider: cloudPreferred ? 'local-fallback' : 'local-heuristic',
    fallbackReason: cloudPreferred ? fallbackMeta?.fallbackReason || '' : '',
    fallbackType: cloudPreferred ? fallbackMeta?.fallbackType || '' : '',
    fallbackStatus: cloudPreferred ? fallbackMeta?.fallbackStatus : undefined,
    fallbackRetriable: cloudPreferred ? Boolean(fallbackMeta?.fallbackRetriable) : false,
    fallbackTraceId: cloudPreferred ? fallbackMeta?.fallbackTraceId || '' : '',
    assistProfile,
    strategyVersion: AI_ASSIST_STRATEGY_VERSION
  };
}

function normalizeCompareText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[，。！？、,.!?;；:："“”"'`~\-_/\\()[\]{}<>]/g, '');
}

function createBigramSet(text) {
  const source = normalizeCompareText(text);
  const output = new Set();
  if (!source) return output;
  if (source.length === 1) {
    output.add(source);
    return output;
  }
  for (let i = 0; i < source.length - 1; i += 1) {
    output.add(source.slice(i, i + 2));
  }
  return output;
}

function calcSetSimilarity(setA, setB) {
  if (!setA.size || !setB.size) return 0;
  let intersection = 0;
  setA.forEach((token) => {
    if (setB.has(token)) intersection += 1;
  });
  const union = setA.size + setB.size - intersection;
  if (!union) return 0;
  return intersection / union;
}

function detectLifeStatusConflict(textA, textB) {
  const a = normalizeCompareText(textA);
  const b = normalizeCompareText(textB);
  if (!a || !b) return false;
  const deadWords = ['已死亡', '死亡', '身亡', '战死', '陨落', '亡故'];
  const aliveWords = ['存活', '活着', '在世', '幸存', '未死'];
  const aDead = deadWords.some((word) => a.includes(normalizeCompareText(word)));
  const bDead = deadWords.some((word) => b.includes(normalizeCompareText(word)));
  const aAlive = aliveWords.some((word) => a.includes(normalizeCompareText(word)));
  const bAlive = aliveWords.some((word) => b.includes(normalizeCompareText(word)));
  return (aDead && bAlive) || (aAlive && bDead);
}

function pickConflictReason(flags) {
  return getConflictReasonLabel(pickConflictReasonCode(flags));
}

function buildLocalConflictCandidates({ entities, worldId, targetId, draftName, draftType, draftSummary }) {
  const normalizedName = normalizeCompareText(draftName);
  const nameSet = createBigramSet(draftName);
  const summarySet = createBigramSet(draftSummary);
  return (Array.isArray(entities) ? entities : [])
    .filter((entity) => safeName(entity.worldId) === worldId && safeName(entity.id) !== targetId)
    .map((entity) => {
      const entityName = safeName(entity.name);
      const entitySummary = String(entity.summary || '');
      const entityType = safeName(entity.type || 'other');

      const normalizedEntityName = normalizeCompareText(entityName);
      const nameSimilarity = calcSetSimilarity(nameSet, createBigramSet(entityName));
      const summarySimilarity = calcSetSimilarity(summarySet, createBigramSet(entitySummary));
      const exactName = Boolean(normalizedName) && normalizedName === normalizedEntityName;
      const includeName =
        normalizedName.length >= 2 &&
        normalizedEntityName.length >= 2 &&
        (normalizedEntityName.includes(normalizedName) || normalizedName.includes(normalizedEntityName));
      const nameSimilar = exactName || nameSimilarity >= CONFLICT_CALIBRATION.similarity.name || includeName;
      const summarySimilar = summarySimilarity >= CONFLICT_CALIBRATION.similarity.summary;
      const typeMismatch = exactName && draftType && entityType && draftType !== entityType;
      const lifeConflict = detectLifeStatusConflict(draftSummary, entitySummary);

      const shouldKeep = nameSimilar || summarySimilar || typeMismatch || lifeConflict;
      if (!shouldKeep) return null;

      const confidence = Math.min(
        0.99,
        Math.max(
          exactName ? 0.95 : 0,
          typeMismatch ? 0.9 : 0,
          lifeConflict ? 0.86 : 0,
          nameSimilarity,
          summarySimilarity
        )
      );

      return {
        entityId: entity.id,
        name: entityName || '未命名实体',
        type: entityType || 'other',
        confidence: Number(confidence.toFixed(2)),
        reasonCode: pickConflictReasonCode({
          exactName,
          typeMismatch,
          lifeConflict,
          nameSimilar,
          summarySimilar
        }),
        reason: pickConflictReason({
          exactName,
          typeMismatch,
          lifeConflict,
          nameSimilar,
          summarySimilar
        }),
        signals: {
          exactName,
          typeMismatch,
          lifeConflict,
          nameSimilarity: Number(nameSimilarity.toFixed(2)),
          summarySimilarity: Number(summarySimilarity.toFixed(2))
        }
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, CONFLICT_CALIBRATION.rowLimit);
}

async function checkEntityConflict(payload) {
  const worldId = safeName(payload?.worldId);
  const draft = payload?.draftEntity || {};
  const draftName = safeName(draft?.name);
  if (!worldId) return { success: false, error: '缺少 worldId' };
  if (!draftName) return { success: false, error: '请先输入实体名称' };

  const entitlements = await getEffectiveEntitlements();
  if (!entitlements?.features?.conflictCheck) {
    return {
      success: false,
      error: 'AI 查重/冲突提醒为 Pro 功能，请升级后使用'
    };
  }

  const store = await readData();
  const targetId = safeName(draft?.id);
  const draftType = safeName(draft?.type || 'other');
  const draftSummary = String(draft?.summary || '');
  const localCandidates = buildLocalConflictCandidates({
    entities: store.entities,
    worldId,
    targetId,
    draftName,
    draftType,
    draftSummary
  });

  const cloudPreferred = shouldUseCloudAiProvider();
  let fallbackMeta = null;
  if (shouldUseCloudAiProvider()) {
    try {
      const cloudPayload = await cloudRequest('AI_ENTITY_CONFLICT', {
        method: 'POST',
        body: {
          worldId,
          draftEntity: {
            id: targetId,
            name: draftName,
            type: draftType || 'other',
            summary: draftSummary
          },
          contextEntities: store.entities
            .filter((entity) => safeName(entity.worldId) === worldId && safeName(entity.id) !== targetId)
            .slice(0, 120)
            .map((entity) => ({
              id: safeName(entity.id),
              name: safeName(entity.name),
              type: safeName(entity.type || 'other') || 'other',
              summary: String(entity.summary || '').slice(0, 360)
            }))
        }
      });

      const cloudConflictPayload = extractCloudConflictPayload(cloudPayload);
      if (cloudConflictPayload.hasRows || cloudConflictPayload.hasConflict !== null) {
        const rows = cloudConflictPayload.rows;
        return {
          success: true,
          conflicts: rows,
          hasConflict: cloudConflictPayload.hasConflict ?? rows.length > 0,
          strategyVersion: cloudConflictPayload.strategyVersion || CONFLICT_STRATEGY_VERSION,
          conflictMeta: cloudConflictPayload.conflictMeta || buildConflictMeta(rows),
          calibration: cloudConflictPayload.calibration || buildConflictCalibrationSnapshot(CONFLICT_CALIBRATION),
          provider: pickFirstNonEmptyString([cloudPayload?.provider, cloudPayload?.modelProvider]) || 'cloud-model',
          model: pickFirstNonEmptyString([cloudPayload?.model, cloudPayload?.meta?.model, cloudPayload?.result?.model])
        };
      }
    } catch (error) {
      fallbackMeta = buildAiFallbackMeta(error);
      console.warn('[CHECK_ENTITY_CONFLICT] cloud failed, fallback to local heuristic', fallbackMeta);
    }
  }

  return {
    success: true,
    conflicts: localCandidates,
    hasConflict: localCandidates.length > 0,
    strategyVersion: CONFLICT_STRATEGY_VERSION,
    conflictMeta: buildConflictMeta(localCandidates),
    calibration: buildConflictCalibrationSnapshot(CONFLICT_CALIBRATION),
    provider: cloudPreferred ? 'local-fallback' : 'local-heuristic',
    fallbackReason: cloudPreferred ? fallbackMeta?.fallbackReason || '' : '',
    fallbackType: cloudPreferred ? fallbackMeta?.fallbackType || '' : '',
    fallbackStatus: cloudPreferred ? fallbackMeta?.fallbackStatus : undefined,
    fallbackRetriable: cloudPreferred ? Boolean(fallbackMeta?.fallbackRetriable) : false,
    fallbackTraceId: cloudPreferred ? fallbackMeta?.fallbackTraceId || '' : ''
  };
}

async function reportAiFeedback(payload) {
  const normalized = normalizeAiFeedbackPayload(payload);
  const scopeLabel = normalized.scope === 'conflict' ? '冲突检查' : '文案处理';

  if (!normalized.scope || !normalized.decision) {
    return {
      success: false,
      error: '反馈参数不完整，请稍后重试'
    };
  }

  if (!shouldUseCloudAiProvider()) {
    return {
      success: true,
      recorded: false,
      scope: normalized.scope,
      decision: normalized.decision,
      provider: 'local-only',
      message: `当前未启用云端，已接收${scopeLabel}反馈`
    };
  }

  const requestBody = {
    scope: normalized.scope,
    decision: normalized.decision,
    feedbackAt: normalized.feedbackAt,
    provider: normalized.provider || 'cloud-model',
    model: normalized.model || '',
    strategyVersion: normalized.strategyVersion || '',
    traceId: normalized.traceId || '',
    worldId: normalized.worldId || '',
    bookId: normalized.bookId || '',
    entityId: normalized.entityId || '',
    qualityScore: normalized.qualityScore,
    qualityTier: normalized.qualityTier,
    qualityLabel: normalized.qualityLabel,
    conflictCount: normalized.conflictCount,
    conflictMeta: normalized.conflictMeta,
    mode: normalized.mode || '',
    assistProfile: normalized.assistProfile
  };

  try {
    const cloudPayload = await cloudRequest('AI_FEEDBACK', {
      method: 'POST',
      body: requestBody
    });
    return {
      success: true,
      recorded: true,
      scope: normalized.scope,
      decision: normalized.decision,
      provider: 'cloud-model',
      ticketId: pickFirstNonEmptyString([cloudPayload?.ticketId, cloudPayload?.id, cloudPayload?.requestId, cloudPayload?.traceId]),
      message: `${scopeLabel}反馈已同步云端`
    };
  } catch (error) {
    const fallbackMeta = buildAiFallbackMeta(error);
    return {
      success: true,
      recorded: false,
      scope: normalized.scope,
      decision: normalized.decision,
      provider: 'local-fallback',
      message: `${scopeLabel}反馈暂未同步云端`,
      fallbackReason: fallbackMeta?.fallbackReason || '',
      fallbackType: fallbackMeta?.fallbackType || '',
      fallbackStatus: fallbackMeta?.fallbackStatus,
      fallbackRetriable: Boolean(fallbackMeta?.fallbackRetriable),
      fallbackTraceId: fallbackMeta?.fallbackTraceId || ''
    };
  }
}

function inferEntityTypeFromToken(token) {
  const value = String(token || '');
  if (!value) return 'other';
  if (/(城|镇|国|洲|大陆|山|谷|海|湖|林|宫|殿|塔|门|府)$/.test(value)) return 'location';
  if (/(宗|门|会|盟|帮|团|派|教|阁|殿)$/.test(value)) return 'faction';
  if (/(矿|矿石|晶|晶石|灵石|源石)$/.test(value)) return 'mineral';
  if (/(剑|刀|枪|甲|丹|符|珠|卷|鼎|法器|神器)$/.test(value)) return 'item';
  if (/(兽|龙|虎|鸟|蛇|灵|妖|魔)$/.test(value)) return 'creature';
  if (/(法则|规则|禁忌|契约|天道)$/.test(value)) return 'law';
  if (/(之战|事件|浩劫|纪元|大会|暴动)$/.test(value)) return 'event';
  return 'character';
}

function extractContextSummary(text, token) {
  const source = String(text || '').replace(/\s+/g, ' ').trim();
  if (!source || !token) return '';
  const sentences = source.split(/[。！？!?；;]+/).map((item) => item.trim()).filter(Boolean);
  const hit = sentences.find((sentence) => sentence.includes(token));
  if (!hit) return '';
  if (hit.length <= 96) return `${hit}${hit.endsWith('。') ? '' : '。'}`;
  return `${hit.slice(0, 96)}…`;
}

function splitManuscriptSentences(text) {
  return String(text || '')
    .replace(/\r/g, '\n')
    .split(/[。！？!?；;\n]+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function inferRelationTypeFromSentence(sentence) {
  const value = String(sentence || '');
  if (!value) return 'related_to';
  if (/(属于|隶属|效忠|归于|加入|从属|麾下|附庸)/.test(value)) return 'belongs_to';
  if (/(敌对|仇敌|交战|对抗|围剿|追杀|争斗)/.test(value)) return 'hostile_to';
  if (/(父亲|母亲|兄长|姐姐|弟弟|妹妹|师父|徒弟|血脉|后裔|夫人|妻子|儿子|女儿)/.test(value)) return 'kinship';
  if (/(使用|持有|驾驭|操控|佩戴|执掌|施展)/.test(value)) return 'uses';
  if (/(来自|起源于|诞生于|出自|源于)/.test(value)) return 'originates_from';
  return 'related_to';
}

function extractManuscriptRelationSuggestions(text, suggestions) {
  const normalizedText = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 30000);
  if (!normalizedText) return [];
  const candidateNames = (Array.isArray(suggestions) ? suggestions : [])
    .map((item) => safeName(item?.name))
    .filter(Boolean)
    .slice(0, 24);
  if (candidateNames.length < 2) return [];

  const sentenceRows = splitManuscriptSentences(normalizedText);
  if (sentenceRows.length === 0) return [];

  const relationMap = {};
  sentenceRows.forEach((sentence) => {
    const hitNames = candidateNames
      .filter((name) => sentence.includes(name))
      .sort((a, b) => sentence.indexOf(a) - sentence.indexOf(b));
    if (hitNames.length < 2) return;

    const relationType = inferRelationTypeFromSentence(sentence);
    for (let index = 0; index < hitNames.length - 1; index += 1) {
      const fromName = hitNames[index];
      const toName = hitNames[index + 1];
      if (!fromName || !toName || fromName === toName) continue;
      const key = `${fromName}|${relationType}|${toName}`;
      if (!relationMap[key]) {
        relationMap[key] = {
          fromName,
          toName,
          type: relationType,
          count: 0,
          evidence: sentence
        };
      }
      relationMap[key].count += 1;
      if (relationMap[key].evidence.length < sentence.length) {
        relationMap[key].evidence = sentence;
      }
    }
  });

  return Object.values(relationMap)
    .map((relation) => ({
      ...relation,
      confidence: Number(Math.min(0.97, 0.42 + relation.count * 0.14).toFixed(2))
    }))
    .sort((a, b) => b.confidence - a.confidence || b.count - a.count || a.fromName.localeCompare(b.fromName, 'zh-Hans-CN'))
    .slice(0, 20);
}

function extractManuscriptSuggestions(text) {
  const rawText = String(text || '').replace(/\r/g, '\n');
  const normalizedText = rawText.replace(/\s+/g, ' ').trim().slice(0, 30000);
  if (!normalizedText) return [];

  const stopwords = new Set([
    '我们',
    '你们',
    '他们',
    '这个',
    '那个',
    '一种',
    '已经',
    '没有',
    '不是',
    '如果',
    '但是',
    '于是',
    '然后',
    '因为',
    '所以',
    '其中',
    '并且',
    '以及',
    '可以',
    '自己',
    '现在',
    '时候',
    '感觉',
    '世界',
    '故事',
    '角色'
  ]);

  const tokenStats = {};
  const quotedTokenBonus = new Set();
  const quotedMatches = normalizedText.matchAll(/《([^》]{2,20})》|“([^”]{2,20})”/g);
  for (const match of quotedMatches) {
    const token = safeName(match[1] || match[2]);
    if (!token) continue;
    quotedTokenBonus.add(token);
    tokenStats[token] = tokenStats[token] || { count: 0 };
    tokenStats[token].count += 2;
  }

  const tokenMatches = normalizedText.match(/[\u4e00-\u9fa5]{2,8}/g) || [];
  tokenMatches.forEach((token) => {
    const normalizedToken = safeName(token);
    if (!normalizedToken) return;
    if (stopwords.has(normalizedToken)) return;
    if (/^[一二三四五六七八九十百千万上下左右前后中内外大小多少新老真很又就都与及其并和而但则被向为从于了呢啊呀吗吧吗哇哦]/.test(normalizedToken)) {
      return;
    }
    tokenStats[normalizedToken] = tokenStats[normalizedToken] || { count: 0 };
    tokenStats[normalizedToken].count += 1;
  });

  return Object.entries(tokenStats)
    .filter(([, stat]) => stat.count >= 2)
    .map(([token, stat]) => {
      const type = inferEntityTypeFromToken(token);
      const summary = extractContextSummary(normalizedText, token);
      const confidenceBase = 0.36 + Math.min(stat.count, 8) * 0.07 + (quotedTokenBonus.has(token) ? 0.12 : 0);
      return {
        name: token,
        type,
        summary,
        frequency: stat.count,
        confidence: Number(Math.min(0.98, confidenceBase).toFixed(2)),
        tags: quotedTokenBonus.has(token) ? ['书稿提取', '引号实体'] : ['书稿提取']
      };
    })
    .sort((a, b) => b.confidence - a.confidence || b.frequency - a.frequency || a.name.localeCompare(b.name, 'zh-Hans-CN'))
    .slice(0, 24);
}

async function parseManuscript(payload) {
  const worldId = safeName(payload?.worldId);
  if (!worldId) {
    return { success: false, error: '缺少 worldId' };
  }

  const sourceText = String(payload?.text || '').trim();
  if (!sourceText) {
    return { success: false, error: '请先粘贴书稿内容' };
  }

  const entitlements = await getEffectiveEntitlements();
  if (!entitlements?.features?.aiSummary) {
    return {
      success: false,
      error: '书稿自动解析为 Pro 功能，请升级后使用'
    };
  }

  const cloudPreferred = shouldUseCloudAiProvider();
  let fallbackMeta = null;
  if (shouldUseCloudAiProvider()) {
    try {
      const cloudPayload = await cloudRequest('AI_MANUSCRIPT_PARSE', {
        method: 'POST',
        body: {
          worldId,
          bookId: safeName(payload?.bookId),
          text: sourceText
        }
      });
      const cloudParsed = extractCloudManuscriptPayload(cloudPayload);
      if (cloudParsed.hasSuggestionsArray || cloudParsed.hasRelationArray) {
        return {
          success: true,
          worldId,
          bookId: safeName(payload?.bookId),
          suggestions: cloudParsed.suggestions,
          relationSuggestions: cloudParsed.relationSuggestions,
          count: cloudParsed.suggestions.length,
          provider: pickFirstNonEmptyString([cloudPayload?.provider, cloudPayload?.modelProvider]) || 'cloud-model',
          model: pickFirstNonEmptyString([cloudPayload?.model, cloudPayload?.meta?.model, cloudPayload?.result?.model])
        };
      }
    } catch (error) {
      fallbackMeta = buildAiFallbackMeta(error);
      console.warn('[PARSE_MANUSCRIPT] cloud failed, fallback to local heuristic', fallbackMeta);
    }
  }

  const suggestions = normalizeManuscriptSuggestionRows(extractManuscriptSuggestions(sourceText));
  const relationSuggestions = normalizeManuscriptRelationRows(extractManuscriptRelationSuggestions(sourceText, suggestions));
  return {
    success: true,
    worldId,
    bookId: safeName(payload?.bookId),
    suggestions,
    relationSuggestions,
    count: suggestions.length,
    provider: cloudPreferred ? 'local-fallback' : 'local-heuristic',
    fallbackReason: cloudPreferred ? fallbackMeta?.fallbackReason || '' : '',
    fallbackType: cloudPreferred ? fallbackMeta?.fallbackType || '' : '',
    fallbackStatus: cloudPreferred ? fallbackMeta?.fallbackStatus : undefined,
    fallbackRetriable: cloudPreferred ? Boolean(fallbackMeta?.fallbackRetriable) : false,
    fallbackTraceId: cloudPreferred ? fallbackMeta?.fallbackTraceId || '' : ''
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
    usages: localStore.bookEntityUsages.length,
    relations: localStore.entityRelations.length
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
      bookEntityUsages: [],
      entityRelations: []
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

  try {
    const response = await apiRequest('/captures', {
      method: 'POST',
      body: JSON.stringify({ 
        text: trimmed, 
        sourceUrl, 
        sourceTitle 
      }),
    });

    if (response.success) {
      const capture = {
        id: response.data.id,
        text: response.data.text,
        timestamp: new Date(response.data.createdAt).getTime(),
        sourceUrl: response.data.sourceUrl || '',
        sourceTitle: response.data.sourceTitle || '',
        count: 1,
        isPinned: false,
        status: response.data.status || CAPTURE_STATUS.INBOX,
        statusUpdatedAt: new Date(response.data.updatedAt).getTime()
      };
      
      // 通知前端刷新数据
      chrome.runtime.sendMessage({ type: 'CAPTURE_ADDED', data: capture });
      
      return capture;
    }
    
    console.error('[Background] saveCapture API error:', response.error);
    return null;
  } catch (error) {
    console.error('[Background] saveCapture error:', error);
    return null;
  }
}

async function updateCaptureStatus(payload) {
  const text = safeName(payload?.text);
  const timestamp = Number(payload?.timestamp || 0);
  const status = payload?.status;
  const captureId = payload?.id;

  if (!captureId && !text) {
    return { success: false, error: '缺少捕获ID或文本' };
  }
  if (!CAPTURE_STATUS_VALUES.has(status)) {
    return { success: false, error: '非法状态' };
  }

  try {
    const response = await apiRequest(`/captures/${captureId}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });

    if (response.success) {
      return {
        success: true,
        capture: {
          id: response.data.id,
          text: response.data.text,
          timestamp: new Date(response.data.createdAt).getTime(),
          sourceUrl: response.data.sourceUrl || '',
          sourceTitle: response.data.sourceTitle || '',
          count: 1,
          isPinned: false,
          status: response.data.status,
          statusUpdatedAt: new Date(response.data.updatedAt).getTime()
        }
      };
    }
    
    return { success: false, error: response.error || '更新失败' };
  } catch (error) {
    console.error('[Background] updateCaptureStatus error:', error);
    return { success: false, error: error?.message || '更新失败' };
  }
}

async function markCaptureConvertedByText(text) {
  const captureText = safeName(text);
  if (!captureText) return null;

  try {
    // 先获取捕获列表，找到对应的捕获项
    const response = await apiRequest('/captures', {
      method: 'GET',
    });

    if (response.success) {
      const capture = response.data.find(item => item.text === captureText);
      if (capture) {
        // 更新状态为已转换
        const updateResponse = await apiRequest(`/captures/${capture.id}`, {
          method: 'PUT',
          body: JSON.stringify({ status: CAPTURE_STATUS.CONVERTED }),
        });

        if (updateResponse.success) {
          return {
            id: updateResponse.data.id,
            text: updateResponse.data.text,
            timestamp: new Date(updateResponse.data.createdAt).getTime(),
            sourceUrl: updateResponse.data.sourceUrl || '',
            sourceTitle: updateResponse.data.sourceTitle || '',
            count: 1,
            isPinned: false,
            status: updateResponse.data.status,
            statusUpdatedAt: new Date(updateResponse.data.updatedAt).getTime()
          };
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('[Background] markCaptureConvertedByText error:', error);
    return null;
  }
}

async function createWorld(name) {
  const trimmed = safeName(name);
  if (!trimmed) {
    return { success: false, error: '世界名称不能为空' };
  }

  try {
    const response = await apiRequest('/worlds', {
      method: 'POST',
      body: JSON.stringify({ name: trimmed, description: '' }),
    });

    if (response.success) {
      return {
        success: true,
        world: {
          id: response.data.id,
          name: response.data.name,
          description: response.data.description || '',
          createdAt: new Date(response.data.createdAt).getTime(),
          updatedAt: new Date(response.data.updatedAt).getTime()
        }
      };
    }
    
    return { success: false, error: response.error || '创建世界失败' };
  } catch (error) {
    console.error('[Background] createWorld error:', error);
    return { success: false, error: error?.message || '创建世界失败' };
  }
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

  try {
    const response = await apiRequest('/books', {
      method: 'POST',
      body: JSON.stringify({ 
        worldId: safeWorldId, 
        title: safeTitle, 
        description: '' 
      }),
    });

    if (response.success) {
      return {
        success: true,
        book: {
          id: response.data.id,
          worldId: response.data.worldId,
          title: response.data.title,
          description: response.data.description || '',
          status: response.data.status || 'active',
          createdAt: new Date(response.data.createdAt).getTime(),
          updatedAt: new Date(response.data.updatedAt).getTime()
        }
      };
    }
    
    return { success: false, error: response.error || '创建书项目失败' };
  } catch (error) {
    console.error('[Background] createBook error:', error);
    return { success: false, error: error?.message || '创建书项目失败' };
  }
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
  try {
    const entitlements = await getEffectiveEntitlements();
    const maxEntities = entitlements?.limits?.maxEntities;
    if (isLimited(maxEntities) && store.entities.length >= maxEntities) {
      return {
        success: false,
        error: `当前套餐最多可管理 ${maxEntities} 个实体，请升级 Pro`
      };
    }
    return { success: true };
  } catch (error) {
    // 处理认证错误，直接返回成功，因为本地模式下也可以创建实体
    if (error?.code === 'auth_required' || error?.message?.includes('请先登录')) {
      return { success: true };
    }
    // 其他错误也返回成功，确保创建功能不会因为网络问题而失败
    console.warn('Error checking entity creation quota:', error);
    return { success: true };
  }
}

async function saveEntityFromCapture(data) {
  // 检查认证和账号过期状态
  const statusCheck = await checkAuthAndAccountStatus();
  if (!statusCheck.success) {
    await notifyFrontendStatusChange(statusCheck.type, statusCheck.message);
    // 如果是认证过期，直接返回错误
    if (statusCheck.type === 'auth_expired') {
      return { success: false, error: statusCheck.message };
    }
  }

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
  
  // 通知所有侧边栏实例刷新数据
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { type: 'SYNC_DATA' }, (response) => {
          // 忽略错误，因为可能没有内容脚本在该标签页
        });
      }
    }
  } catch (err) {
    console.error('Error sending sync message:', err);
  }
  
  return { success: true, entity };
}

// 检查认证和账号过期状态
async function checkAuthAndAccountStatus() {
  const session = await readAuthSessionRecord();
  const now = Date.now();
  
  // 检查认证令牌过期
  if (session?.expiresAt && session.expiresAt < now) {
    // 认证过期，清除会话
    await writeAuthSessionRecord(null);
    return {
      success: false,
      type: 'auth_expired',
      message: '登录已过期，请重新登录'
    };
  }
  
  // 检查账号订阅过期（如果有订阅信息）
  if (session?.plan === 'pro' && session?.subscriptionExpiresAt && session.subscriptionExpiresAt < now) {
    // 订阅过期，降级到 free
    const updatedSession = {
      ...session,
      plan: 'free',
      updatedAt: now
    };
    await writeAuthSessionRecord(updatedSession);
    return {
      success: false,
      type: 'subscription_expired',
      message: 'Pro 订阅已过期，已自动降级到 Free 版本'
    };
  }
  
  // 检查登录状态过期（30天未活动）
  if (session?.updatedAt && (now - session.updatedAt) > 30 * 24 * 60 * 60 * 1000) {
    // 会话过期，清除会话
    await writeAuthSessionRecord(null);
    return {
      success: false,
      type: 'session_expired',
      message: '为保护账号安全，您已自动登出'
    };
  }
  
  return { success: true };
}

// 通知前端状态变化
async function notifyFrontendStatusChange(type, message) {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { 
          type: 'AUTH_STATUS_CHANGED',
          data: { type, message }
        }, (response) => {
          // 忽略错误，因为可能没有内容脚本在该标签页
        });
      }
    }
  } catch (err) {
    console.error('Error sending status change message:', err);
  }
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

  let entityRelations = store.entityRelations;
  if (Array.isArray(input.relations)) {
    const validTargetEntityIds = new Set(
      store.entities
        .filter((item) => safeName(item.worldId) === entity.worldId)
        .map((item) => safeName(item.id))
        .filter(Boolean)
    );
    validTargetEntityIds.add(entity.id);

    const normalizedRelations = normalizeEntityRelationsPayload(input.relations, {
      worldId: entity.worldId,
      fromEntityId: entity.id,
      validTargetEntityIds
    });

    entityRelations = [
      ...normalizedRelations,
      ...store.entityRelations.filter((relation) => {
        return !(
          safeName(relation?.worldId) === entity.worldId &&
          safeName(relation?.fromEntityId) === entity.id
        );
      })
    ];
  }

  await writeData({
    entities: store.entities,
    bookEntityUsages: store.bookEntityUsages,
    entityRelations
  });

  await markCaptureConvertedByText(entity.selectedText);

  return {
    success: true,
    entity,
    relations: entityRelations.filter(
      (relation) => safeName(relation?.worldId) === entity.worldId && safeName(relation?.fromEntityId) === entity.id
    )
  };
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

  if (payload.entity.relations !== undefined && !Array.isArray(payload.entity.relations)) {
    return createValidationResult('SAVE_ENTITY_FROM_SIDEPANEL.entity.relations 必须是数组');
  }

  if (Array.isArray(payload.entity.relations)) {
    const hasInvalidRelation = payload.entity.relations.some((relation) => {
      if (!isPlainObject(relation)) return true;
      return !safeName(relation.toEntityId || relation.targetEntityId || relation.entityId);
    });
    if (hasInvalidRelation) {
      return createValidationResult('SAVE_ENTITY_FROM_SIDEPANEL.entity.relations 包含非法关系项');
    }
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

function validateAiEntityAssistPayload(payload) {
  if (!isPlainObject(payload)) {
    return createValidationResult('AI_ENTITY_ASSIST 参数必须是对象');
  }

  const mode = safeName(payload.mode).toLowerCase();
  if (mode !== 'summarize' && mode !== 'expand') {
    return createValidationResult('AI_ENTITY_ASSIST.mode 非法');
  }

  const text = safeName(payload.text);
  if (!text) {
    return createValidationResult('AI_ENTITY_ASSIST.text 不能为空');
  }

  if (text.length > 6000) {
    return createValidationResult('AI_ENTITY_ASSIST.text 过长');
  }

  if (payload.assistProfile !== undefined) {
    if (!isPlainObject(payload.assistProfile)) {
      return createValidationResult('AI_ENTITY_ASSIST.assistProfile 必须是对象');
    }
    if (payload.assistProfile.style !== undefined) {
      const style = safeName(payload.assistProfile.style).toLowerCase();
      if (style !== 'concise' && style !== 'balanced' && style !== 'detailed') {
        return createValidationResult('AI_ENTITY_ASSIST.assistProfile.style 非法');
      }
    }
    if (payload.assistProfile.targetLength !== undefined) {
      const targetLength = safeName(payload.assistProfile.targetLength).toLowerCase();
      if (targetLength !== 'short' && targetLength !== 'medium' && targetLength !== 'long') {
        return createValidationResult('AI_ENTITY_ASSIST.assistProfile.targetLength 非法');
      }
    }
  }

  return null;
}

function validateReportAiFeedbackPayload(payload) {
  if (!isPlainObject(payload)) {
    return createValidationResult('REPORT_AI_FEEDBACK 参数必须是对象');
  }

  const scope = normalizeAiFeedbackScope(payload.scope);
  if (!scope) {
    return createValidationResult('REPORT_AI_FEEDBACK.scope 非法');
  }

  const decision = normalizeAiFeedbackDecision(payload.decision);
  if (!decision) {
    return createValidationResult('REPORT_AI_FEEDBACK.decision 非法');
  }

  if (payload.qualityScore !== undefined) {
    const normalized = normalizeRatio01(payload.qualityScore, null);
    if (normalized === null) {
      return createValidationResult('REPORT_AI_FEEDBACK.qualityScore 非法');
    }
  }

  if (payload.conflictCount !== undefined) {
    const conflictCount = Number(payload.conflictCount);
    if (!Number.isFinite(conflictCount) || conflictCount < 0) {
      return createValidationResult('REPORT_AI_FEEDBACK.conflictCount 非法');
    }
  }

  if (payload.feedbackAt !== undefined) {
    const feedbackAt = Number(payload.feedbackAt);
    if (!Number.isFinite(feedbackAt) || feedbackAt <= 0) {
      return createValidationResult('REPORT_AI_FEEDBACK.feedbackAt 非法');
    }
  }

  return null;
}

function validateCheckEntityConflictPayload(payload) {
  if (!isPlainObject(payload)) {
    return createValidationResult('CHECK_ENTITY_CONFLICT 参数必须是对象');
  }

  if (!safeName(payload.worldId)) {
    return createValidationResult('CHECK_ENTITY_CONFLICT 缺少 worldId');
  }

  if (!isPlainObject(payload.draftEntity)) {
    return createValidationResult('CHECK_ENTITY_CONFLICT 缺少 draftEntity');
  }

  if (!safeName(payload.draftEntity.name)) {
    return createValidationResult('CHECK_ENTITY_CONFLICT.draftEntity.name 不能为空');
  }

  return null;
}

function validateParseManuscriptPayload(payload) {
  if (!isPlainObject(payload)) {
    return createValidationResult('PARSE_MANUSCRIPT 参数必须是对象');
  }

  if (!safeName(payload.worldId)) {
    return createValidationResult('PARSE_MANUSCRIPT 缺少 worldId');
  }

  const text = String(payload.text || '').trim();
  if (!text) {
    return createValidationResult('PARSE_MANUSCRIPT.text 不能为空');
  }

  if (text.length > 120000) {
    return createValidationResult('PARSE_MANUSCRIPT.text 过长');
  }

  if (payload.bookId !== undefined && typeof payload.bookId !== 'string') {
    return createValidationResult('PARSE_MANUSCRIPT.bookId 必须是字符串');
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

  if (type === 'AI_ENTITY_ASSIST') {
    const validationError = validateAiEntityAssistPayload(message?.data);
    if (validationError) {
      sendResponse(validationError);
      return true;
    }
    withResponse(() => assistEntityText(message?.data), sendResponse);
    return true;
  }

  if (type === 'REPORT_AI_FEEDBACK') {
    const validationError = validateReportAiFeedbackPayload(message?.data);
    if (validationError) {
      sendResponse(validationError);
      return true;
    }
    withResponse(() => reportAiFeedback(message?.data), sendResponse);
    return true;
  }

  if (type === 'CHECK_ENTITY_CONFLICT') {
    const validationError = validateCheckEntityConflictPayload(message?.data);
    if (validationError) {
      sendResponse(validationError);
      return true;
    }
    withResponse(() => checkEntityConflict(message?.data), sendResponse);
    return true;
  }

  if (type === 'PARSE_MANUSCRIPT') {
    const validationError = validateParseManuscriptPayload(message?.data);
    if (validationError) {
      sendResponse(validationError);
      return true;
    }
    withResponse(() => parseManuscript(message?.data), sendResponse);
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

  if (type === 'REFRESH_DATA') {
    withResponse(() => readData(), sendResponse);
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

  if (type === 'REGISTER_WITH_PASSWORD') {
    const validationError = validateRegisterWithPasswordPayload(message?.data);
    if (validationError) {
      sendResponse(validationError);
      return true;
    }
    withResponse(() => registerWithPassword(message?.data), sendResponse);
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
