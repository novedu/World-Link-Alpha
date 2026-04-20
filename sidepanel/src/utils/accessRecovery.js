function getErrorCode(error) {
  return String(
    error?.code ||
      error?.data?.error?.code ||
      error?.response?.data?.error?.code ||
      ''
  )
    .trim()
    .toUpperCase();
}

function getErrorMessage(error) {
  return String(
    error?.message ||
      error?.data?.error?.message ||
      error?.response?.data?.error?.message ||
      ''
  ).trim();
}

function createAccountAction(openAccountModal, label = '查看套餐') {
  if (typeof openAccountModal !== 'function') return [];
  return [
    {
      label,
      variant: 'primary',
      onClick: openAccountModal
    }
  ];
}

export function buildAccessRecoveryMessage(error, options = {}) {
  const code = getErrorCode(error);
  const status = Number(error?.status || error?.response?.status || 0);
  const message = getErrorMessage(error);
  const actions = createAccountAction(options.openAccountModal, options.actionLabel);

  const presetByCode = {
    AI_FEATURE_DISABLED: {
      title: '需要升级后继续',
      text: '当前套餐暂不支持 AI 功能，可在账号面板升级到 Pro 后继续使用。'
    },
    EXPORT_JSON_FORBIDDEN: {
      title: '需要升级后继续',
      text: 'JSON 导出为 Pro 功能，可在账号面板升级后继续导出。'
    },
    EXPORT_MARKDOWN_FORBIDDEN: {
      title: '导出暂不可用',
      text: '当前套餐暂不支持 Markdown 导出，可在账号面板查看权益或升级后继续使用。'
    },
    WORLD_QUOTA_EXCEEDED: {
      title: '数量已达上限',
      text: '当前套餐的世界观库数量已达上限，可在账号面板升级后继续创建。'
    },
    BOOK_QUOTA_EXCEEDED: {
      title: '数量已达上限',
      text: '当前世界下的作品数量已达上限，可在账号面板升级后继续创建。'
    },
    ENTITY_QUOTA_EXCEEDED: {
      title: '数量已达上限',
      text: '当前套餐的设定数量已达上限，可在账号面板升级后继续创建。'
    },
    CAPTURE_QUOTA_EXCEEDED: {
      title: '今日额度已用完',
      text: '今日灵感捕获次数已达上限，可在账号面板升级后继续使用。'
    }
  };

  const preset = presetByCode[code];
  if (preset) {
    return {
      type: 'warning',
      title: preset.title,
      text: preset.text,
      actions,
      durationMs: 4800
    };
  }

  if (status === 403 && message) {
    if (message.includes('升级')) {
      return {
        type: 'warning',
        title: '需要升级后继续',
        text: `${message}，可在账号面板继续处理。`,
        actions,
        durationMs: 4800
      };
    }
    if (message.includes('当前套餐') || message.includes('权限') || message.includes('额度')) {
      return {
        type: 'warning',
        title: '当前权限不足',
        text: `${message}，可在账号面板查看当前权益。`,
        actions,
        durationMs: 4800
      };
    }
  }

  return null;
}

export function buildSubscriptionRecoveryMessage(statusType, options = {}) {
  const actions = createAccountAction(options.openAccountModal, options.actionLabel);

  if (statusType === 'subscription_expired') {
    return {
      type: 'info',
      title: '套餐状态已变化',
      text: options.message || '当前 Pro 已到期，可在账号面板续费或查看当前权益。',
      actions,
      durationMs: 4800
    };
  }

  return null;
}
