export const BASE_TAG_OPTIONS = ['人物', '地点', '势力', '物品', '矿石', '生物', '事件', '规则'];

export const TYPE_LABELS = {
  character: '人物',
  location: '地点',
  faction: '势力',
  item: '物品',
  mineral: '矿石',
  creature: '生物',
  event: '事件',
  law: '规则',
  other: '其他'
};

export const CAPTURE_STATUS = {
  INBOX: 'inbox',
  ORGANIZED: 'organized',
  CONVERTED: 'converted'
};

export const CAPTURE_STATUS_OPTIONS = [
  { value: 'all', label: '全部状态' },
  { value: CAPTURE_STATUS.INBOX, label: '未整理' },
  { value: CAPTURE_STATUS.ORGANIZED, label: '已整理' },
  { value: CAPTURE_STATUS.CONVERTED, label: '已转设定' }
];

export const CAPTURE_TIME_FILTER_OPTIONS = [
  { value: 'all', label: '全部时间' },
  { value: '24h', label: '最近 24 小时' },
  { value: '7d', label: '最近 7 天' },
  { value: '30d', label: '最近 30 天' }
];

export const ENTITY_RELATION_OPTIONS = [
  { value: 'belongs_to', label: '所属' },
  { value: 'hostile_to', label: '敌对' },
  { value: 'kinship', label: '亲属' },
  { value: 'uses', label: '使用' },
  { value: 'originates_from', label: '起源于' },
  { value: 'related_to', label: '关联' }
];

export const ENTITY_RELATION_LABELS = ENTITY_RELATION_OPTIONS.reduce((acc, item) => {
  acc[item.value] = item.label;
  return acc;
}, {});

export const MESSAGE_TYPES = {
  OPEN_CAPTURE_PANEL: 'OPEN_CAPTURE_PANEL',
  SAVE_ENTITY: 'SAVE_ENTITY',
  CREATE_WORLD: 'CREATE_WORLD',
  CREATE_BOOK: 'CREATE_BOOK',
  SAVE_ENTITY_FROM_SIDEPANEL: 'SAVE_ENTITY_FROM_SIDEPANEL',
  AI_ENTITY_ASSIST: 'AI_ENTITY_ASSIST',
  REPORT_AI_FEEDBACK: 'REPORT_AI_FEEDBACK',
  CHECK_ENTITY_CONFLICT: 'CHECK_ENTITY_CONFLICT',
  PARSE_MANUSCRIPT: 'PARSE_MANUSCRIPT',
  UPDATE_CAPTURE_STATUS: 'UPDATE_CAPTURE_STATUS',
  REQUEST_EXPORT: 'REQUEST_EXPORT',
  MIGRATE_LOCAL_TO_CLOUD: 'MIGRATE_LOCAL_TO_CLOUD',
  GET_RUNTIME_CONTEXT: 'GET_RUNTIME_CONTEXT',
  GET_RUNTIME_CONFIG: 'GET_RUNTIME_CONFIG',
  SET_RUNTIME_CONFIG: 'SET_RUNTIME_CONFIG',
  GET_ENTITLEMENTS: 'GET_ENTITLEMENTS',
  REFRESH_ENTITLEMENTS: 'REFRESH_ENTITLEMENTS',
  GET_AUTH_SESSION: 'GET_AUTH_SESSION',
  SET_AUTH_SESSION: 'SET_AUTH_SESSION',
  SIGN_IN_WITH_PASSWORD: 'SIGN_IN_WITH_PASSWORD',
  CLEAR_AUTH_SESSION: 'CLEAR_AUTH_SESSION'
};

export const CONFLICT_RISK_THRESHOLDS = {
  high: 0.9,
  medium: 0.75
};

export const CONFLICT_REASON_TEMPLATES = {
  exact_type_mismatch: {
    label: '同名但类型不一致',
    suggestion: '建议统一命名或调整类型，并在描述中补充明确区分点。'
  },
  exact_name_duplicate: {
    label: '与现有设定同名',
    suggestion: '建议合并为同一设定，或重命名并补充来源差异。'
  },
  life_status_conflict: {
    label: '生死状态可能冲突',
    suggestion: '建议核对时间线并统一角色状态，避免章节前后矛盾。'
  },
  name_and_summary_similar: {
    label: '名称与描述都高度相似',
    suggestion: '建议优先复用已有设定，避免同义重复创建。'
  },
  name_similar: {
    label: '名称高度相似',
    suggestion: '建议补充前后缀或身份信息，降低命名歧义。'
  },
  summary_similar: {
    label: '描述高度相似',
    suggestion: '建议补充能力边界或背景来源，提升可区分度。'
  },
  potential_conflict: {
    label: '存在潜在冲突',
    suggestion: '建议检查名称、类型与时间线，再决定是否新建。'
  }
};
