const STYLE_VALUES = new Set(['concise', 'balanced', 'detailed']);
const LENGTH_VALUES = new Set(['short', 'medium', 'long']);

export const AI_ASSIST_STYLE_OPTIONS = [
  { value: 'concise', label: '简洁' },
  { value: 'balanced', label: '平衡' },
  { value: 'detailed', label: '详细' }
];

export const AI_ASSIST_LENGTH_OPTIONS = [
  { value: 'short', label: '短' },
  { value: 'medium', label: '中' },
  { value: 'long', label: '长' }
];

export function normalizeAssistProfile(input) {
  const source = input && typeof input === 'object' ? input : {};
  const style = STYLE_VALUES.has(source.style) ? source.style : 'balanced';
  const targetLength = LENGTH_VALUES.has(source.targetLength) ? source.targetLength : 'medium';
  return { style, targetLength };
}

function findLabel(options, value, fallback) {
  const found = options.find((item) => item.value === value);
  return found ? found.label : fallback;
}

export function formatAssistProfile(profile) {
  const normalized = normalizeAssistProfile(profile);
  const styleLabel = findLabel(AI_ASSIST_STYLE_OPTIONS, normalized.style, '平衡');
  const lengthLabel = findLabel(AI_ASSIST_LENGTH_OPTIONS, normalized.targetLength, '中');
  return `${styleLabel} · ${lengthLabel}`;
}

