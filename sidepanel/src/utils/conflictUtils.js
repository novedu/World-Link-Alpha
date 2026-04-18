import { CONFLICT_REASON_TEMPLATES, CONFLICT_RISK_THRESHOLDS } from '../constants/worldLink';

function normalizeConfidence(value) {
  const raw = Number(value || 0);
  if (!Number.isFinite(raw)) return 0;
  return Math.max(0, Math.min(0.99, raw));
}

export function getConflictRiskKey(confidence) {
  const score = normalizeConfidence(confidence);
  if (score >= CONFLICT_RISK_THRESHOLDS.high) return 'high';
  if (score >= CONFLICT_RISK_THRESHOLDS.medium) return 'medium';
  return 'low';
}

function getConflictReasonTemplate(reasonCode) {
  const code = String(reasonCode || '').trim().toLowerCase();
  return CONFLICT_REASON_TEMPLATES[code] || null;
}

export function getConflictRiskMeta(confidence) {
  const riskKey = getConflictRiskKey(confidence);
  if (riskKey === 'high') return { key: riskKey, label: '高风险', tagClassName: 'tag-warning' };
  if (riskKey === 'medium') return { key: riskKey, label: '中风险', tagClassName: 'tag-primary' };
  return { key: riskKey, label: '低风险', tagClassName: 'tag-secondary' };
}

export function formatConflictReason(hint) {
  const template = getConflictReasonTemplate(hint?.reasonCode);
  if (template?.label) return template.label;
  return String(hint?.reason || '存在潜在冲突').trim();
}

export function getConflictResolutionSuggestion(hint) {
  const template = getConflictReasonTemplate(hint?.reasonCode);
  if (template?.suggestion) return template.suggestion;
  return CONFLICT_REASON_TEMPLATES.potential_conflict.suggestion;
}

export function buildConflictSignalsText(hint) {
  const signals = hint?.signals || {};
  const output = [];
  if (signals.exactName) output.push('同名命中');
  if (signals.typeMismatch) output.push('类型冲突');
  if (signals.lifeConflict) output.push('生死状态冲突');
  const nameSimilarity = Number(signals.nameSimilarity || 0);
  const summarySimilarity = Number(signals.summarySimilarity || 0);
  if (nameSimilarity > 0) output.push(`名称相似 ${Math.round(nameSimilarity * 100)}%`);
  if (summarySimilarity > 0) output.push(`描述相似 ${Math.round(summarySimilarity * 100)}%`);
  return output.join(' · ');
}
