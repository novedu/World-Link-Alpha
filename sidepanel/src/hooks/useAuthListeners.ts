/* global chrome */

import { useCallback, useEffect, useRef } from 'react';
import { setOnAuthExpired } from '../lib/http/client';
import { buildSubscriptionRecoveryMessage } from '../utils/accessRecovery.js';

type AuthStatusType = 'auth_expired' | 'subscription_expired' | 'session_expired' | string;
type UiMessageType = 'success' | 'error' | 'warning' | 'info';

type AuthRuntimeMessage =
  | {
      type: 'AUTH_EXPIRED';
    }
  | {
      type: 'AUTH_STATUS_CHANGED';
      data?: {
        type?: AuthStatusType;
        message?: string;
      };
    }
  | {
      type?: string;
      data?: {
        type?: string;
        message?: string;
      };
    };

type AccountNotice = {
  type: UiMessageType;
  text: string;
  title?: string;
  actions?: Array<{
    label: string;
    variant?: 'primary' | 'secondary';
    onClick: () => void;
  }>;
  durationMs?: number;
  at?: number;
};

function buildAuthStatusNotice(statusType: AuthStatusType, message?: string) {
  switch (statusType) {
    case 'subscription_expired':
      return buildSubscriptionRecoveryMessage(statusType, { message });
    case 'auth_expired':
    case 'session_expired':
    default:
      return {
        signature: statusType || 'auth_expired',
        type: 'warning' as const,
        text: '登录状态已失效，已切回访客模式，请重新登录后继续同步。',
        shouldResetAuth: true
      };
  }
}

export function useAuthListeners({
  showUiMessage,
  isAccountModalOpen,
  setAccountNotice,
  onAuthExpiredStateChange,
  openAccountModal
}: {
  showUiMessage: (message: string | AccountNotice, type?: 'success' | 'error' | 'warning' | 'info') => void;
  isAccountModalOpen: boolean;
  setAccountNotice: (notice: AccountNotice | null) => void;
  onAuthExpiredStateChange?: () => Promise<void> | void;
  openAccountModal?: () => void;
}) {
  const lastNoticeRef = useRef<{ signature: string; at: number }>({
    signature: '',
    at: 0
  });
  const isHandlingAuthExpiryRef = useRef(false);

  const publishNotice = useCallback((notice: AccountNotice) => {
    if (!notice?.text) return;
    if (isAccountModalOpen) {
      setAccountNotice({
        ...notice,
        actions: [],
        at: Date.now()
      });
      return;
    }
    showUiMessage(notice);
  }, [isAccountModalOpen, setAccountNotice, showUiMessage]);

  const handleStatus = useCallback(async (statusType: AuthStatusType, message?: string) => {
    const notice =
      statusType === 'subscription_expired'
        ? buildSubscriptionRecoveryMessage(statusType, {
            message,
            openAccountModal
          }) || buildAuthStatusNotice(statusType, message)
        : buildAuthStatusNotice(statusType, message);
    const now = Date.now();
    const isDuplicate =
      notice.signature === lastNoticeRef.current.signature &&
      now - lastNoticeRef.current.at < 1800;

    if (isDuplicate) return;

    lastNoticeRef.current = {
      signature: notice.signature,
      at: now
    };

    if (notice.shouldResetAuth && !isHandlingAuthExpiryRef.current) {
      isHandlingAuthExpiryRef.current = true;
      try {
        await onAuthExpiredStateChange?.();
      } finally {
        isHandlingAuthExpiryRef.current = false;
      }
    }

    publishNotice(notice);
  }, [onAuthExpiredStateChange, publishNotice]);

  // 注册认证过期回调
  useEffect(() => {
    // 设置 axios 401 回调
    setOnAuthExpired(async () => {
      await handleStatus('auth_expired');
    });
    return () => {
      setOnAuthExpired(() => {});
    };
  }, [handleStatus]);

  // 监听认证过期消息
  useEffect(() => {
    const handleAuthExpired = (message: AuthRuntimeMessage) => {
      if (message.type === 'AUTH_EXPIRED') {
        void handleStatus('auth_expired');
      }
    };

    // 监听认证状态变化
    const handleAuthStatusChanged = (message: AuthRuntimeMessage) => {
      if (message.type === 'AUTH_STATUS_CHANGED') {
        const type = message.data?.type || '';
        const statusMessage = message.data?.message;
        switch (type) {
          case 'auth_expired':
            void handleStatus(type, statusMessage);
            break;
          case 'subscription_expired':
            void handleStatus(type, statusMessage);
            break;
          case 'session_expired':
            void handleStatus(type, statusMessage);
            break;
          default:
            break;
        }
      }
    };

    chrome.runtime.onMessage.addListener(handleAuthExpired);
    chrome.runtime.onMessage.addListener(handleAuthStatusChanged);

    return () => {
      chrome.runtime.onMessage.removeListener(handleAuthExpired);
      chrome.runtime.onMessage.removeListener(handleAuthStatusChanged);
    };
  }, [handleStatus]);
}
