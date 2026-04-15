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
  { value: CAPTURE_STATUS.CONVERTED, label: '已转实体' }
];

export const CAPTURE_TIME_FILTER_OPTIONS = [
  { value: 'all', label: '全部时间' },
  { value: '24h', label: '最近 24 小时' },
  { value: '7d', label: '最近 7 天' },
  { value: '30d', label: '最近 30 天' }
];

export const MESSAGE_TYPES = {
  OPEN_CAPTURE_PANEL: 'OPEN_CAPTURE_PANEL',
  SAVE_ENTITY: 'SAVE_ENTITY',
  CREATE_WORLD: 'CREATE_WORLD',
  CREATE_BOOK: 'CREATE_BOOK',
  SAVE_ENTITY_FROM_SIDEPANEL: 'SAVE_ENTITY_FROM_SIDEPANEL',
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
