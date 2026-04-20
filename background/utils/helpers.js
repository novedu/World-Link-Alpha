// 工具函数

function createId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
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

function resolveCaptureStatus(value, fallback = 'inbox') {
  const CAPTURE_STATUS_VALUES = new Set(['inbox', 'organized', 'converted']);
  return CAPTURE_STATUS_VALUES.has(value) ? value : fallback;
}

function normalizeEntityRecordForStorage(entity) {
  return {
    ...entity,
    tags: normalizeTags(entity?.tags)
  };
}

function normalizeRelationType(value) {
  const ENTITY_RELATION_TYPES = new Set(['belongs_to', 'hostile_to', 'kinship', 'uses', 'originates_from', 'related_to']);
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
  const status = resolveCaptureStatus(item?.status, 'inbox');
  const statusUpdatedAt = Number(item?.statusUpdatedAt || fallbackTimestamp);
  const next = {
    ...item,
    status,
    statusUpdatedAt
  };

  if (status === 'organized' && !next.organizedAt) {
    next.organizedAt = statusUpdatedAt;
  }
  if (status === 'converted' && !next.convertedAt) {
    next.convertedAt = statusUpdatedAt;
  }

  return next;
}

function applyCaptureStatus(item, status, now) {
  const nextStatus = resolveCaptureStatus(status, 'inbox');
  const next = {
    ...item,
    status: nextStatus,
    statusUpdatedAt: now
  };

  if (nextStatus === 'organized' && !item.organizedAt) {
    next.organizedAt = now;
  }

  if (nextStatus === 'converted' && !item.convertedAt) {
    next.convertedAt = now;
  }

  return next;
}

function normalizeRuntimeConfig(input) {
  const DEFAULT_RUNTIME_CONFIG = {
    repositoryMode: 'cloud',
    cloudApiBaseUrl: '',
    cloudTimeoutMs: 12000
  };
  const rawMode = safeName(input?.repositoryMode).toLowerCase();
  const mode = rawMode === 'local' ? 'local' : 'cloud';
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
      capture_create: Number(usage.capture_create || 0),
      export_markdown: Number(usage.export_markdown || 0),
      export_json: Number(usage.export_json || 0)
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

module.exports = {
  createId,
  safeName,
  normalizeTags,
  normalizeStoreShape,
  cloneData,
  mergeUniqueByKey,
  mergeStoreShape,
  resolveCaptureStatus,
  normalizeEntityRecordForStorage,
  normalizeRelationType,
  normalizeEntityRelationsPayload,
  normalizeCaptureRecordForStorage,
  applyCaptureStatus,
  normalizeRuntimeConfig,
  normalizeLimit,
  buildDefaultEntitlements,
  normalizeEntitlements,
  isLimited,
  formatTodayKey,
  normalizeUsageMeter,
  trimUsageMeter,
  normalizeAuthSessionPayload,
  createSeedWorlds,
  createSeedBooks
};
