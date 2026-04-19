// 常量定义

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

module.exports = {
  API_BASE_URL,
  STORAGE_KEYS,
  AUTH_SESSION_KEY,
  ENTITLEMENTS_KEY,
  USAGE_METER_KEY,
  RUNTIME_CONFIG_KEY,
  AUTH_TOKEN_KEY,
  CAPTURE_STATUS,
  CAPTURE_STATUS_VALUES,
  ENTITY_RELATION_TYPES,
  CONFLICT_REASON_CODES,
  AI_FEEDBACK_SCOPES,
  AI_FEEDBACK_DECISIONS,
  CONFLICT_STRATEGY_VERSION,
  CONFLICT_CALIBRATION,
  AI_ASSIST_STRATEGY_VERSION,
  USAGE_ACTION,
  DEFAULT_RUNTIME_CONFIG,
  CLOUD_API_ENDPOINTS,
  MOCK_CLOUD_SCHEME
};
