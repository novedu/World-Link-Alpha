export function getAiProviderLabel(provider) {
  const value = String(provider || '').trim();
  if (value === 'cloud-model') return '云端模型';
  if (value === 'local-fallback') return '本地兜底';
  if (value === 'local-heuristic') return '本地规则';
  return 'AI 引擎';
}

export function formatAiProvider(provider, model) {
  const label = getAiProviderLabel(provider);
  const modelName = String(model || '').trim();
  return modelName ? `${label} · ${modelName}` : label;
}

export function normalizeAiQualityScore(value) {
  const raw = Number(value);
  if (!Number.isFinite(raw)) return null;
  const normalized = raw > 1 && raw <= 100 ? raw / 100 : raw;
  if (normalized < 0 || normalized > 1) return null;
  return Number(normalized.toFixed(2));
}

function normalizeAiQualityTier(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'high' || raw === 'medium' || raw === 'low') return raw;
  return '';
}

function resolveAiQualityLabel(tier, score, label) {
  const customLabel = String(label || '').trim();
  if (customLabel) return customLabel;
  if (tier === 'high') return '高';
  if (tier === 'medium') return '中';
  if (tier === 'low') return '低';
  if (score !== null) {
    if (score >= 0.85) return '高';
    if (score >= 0.65) return '中';
    return '低';
  }
  return '';
}

export function formatAiQualityMeta(meta) {
  const score = normalizeAiQualityScore(meta?.qualityScore);
  const tier = normalizeAiQualityTier(meta?.qualityTier);
  const label = resolveAiQualityLabel(tier, score, meta?.qualityLabel);
  if (!label && score === null) return '';
  const scoreText = score === null ? '' : ` ${Math.round(score * 100)}%`;
  return `质量 ${label}${scoreText}`.trim();
}

function normalizeFallbackType(type, status) {
  const value = String(type || '').trim();
  if (value) return value;
  const numericStatus = Number(status || 0);
  if (numericStatus === 401) return 'auth';
  if (numericStatus === 403) return 'forbidden';
  if (numericStatus === 404) return 'not_found';
  if (numericStatus === 409) return 'conflict';
  if (numericStatus === 429) return 'rate_limited';
  if (numericStatus >= 500) return 'server';
  return '';
}

function getFallbackCauseLabel(type) {
  if (type === 'timeout') return '云端响应超时';
  if (type === 'network') return '网络连接异常';
  if (type === 'auth') return '登录状态已失效';
  if (type === 'forbidden') return '当前账号暂无权限';
  if (type === 'rate_limited') return '请求过于频繁';
  if (type === 'server') return '云端服务暂不可用';
  if (type === 'not_found') return '云端接口暂不可用';
  if (type === 'validation') return '云端请求参数异常';
  if (type === 'conflict') return '云端数据状态冲突';
  return '';
}

export function formatAiFallbackReason(meta) {
  const fallbackReason = String(meta?.fallbackReason || '').trim();
  const fallbackType = normalizeFallbackType(meta?.fallbackType, meta?.fallbackStatus);
  const fallbackRetriable = Boolean(meta?.fallbackRetriable);
  const fallbackLabel = getFallbackCauseLabel(fallbackType);

  if (fallbackLabel) {
    if (fallbackType === 'auth') return `${fallbackLabel}，请重新登录`;
    if (fallbackRetriable || ['timeout', 'network', 'rate_limited', 'server'].includes(fallbackType)) {
      return `${fallbackLabel}，建议稍后重试`;
    }
    return fallbackLabel;
  }

  if (!fallbackReason) return '';
  return fallbackReason;
}

export function formatAiFallbackHint(meta, actionLabel = '云端能力') {
  const reason = formatAiFallbackReason(meta);
  if (!reason) return `${actionLabel}暂不可用，已自动切换本地处理`;
  return `${actionLabel}暂不可用，已自动切换本地：${reason}`;
}
