/* global chrome */

import { useEffect } from 'react';
import { setOnAuthExpired } from '../lib/http/client';

export function useAuthListeners({ showUiMessage, setIsAccountModalOpen }: {
  showUiMessage: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  setIsAccountModalOpen: (open: boolean) => void;
}) {
  // 注册认证过期回调
  useEffect(() => {
    // 设置 axios 401 回调
    setOnAuthExpired(() => {
      showUiMessage('登录已过期，请重新登录', 'warning');
      setIsAccountModalOpen(true);
    });
  }, [showUiMessage, setIsAccountModalOpen]);

  // 监听认证过期消息
  useEffect(() => {
    const handleAuthExpired = (message: any) => {
      if (message.type === 'AUTH_EXPIRED') {
        showUiMessage('登录已过期，请重新登录', 'warning');
        setIsAccountModalOpen(true);
      }
    };

    // 监听认证状态变化
    const handleAuthStatusChanged = (message: any) => {
      if (message.type === 'AUTH_STATUS_CHANGED') {
        const { type, message: statusMessage } = message.data;
        switch (type) {
          case 'auth_expired':
            showUiMessage(statusMessage, 'warning');
            setIsAccountModalOpen(true);
            break;
          case 'subscription_expired':
            showUiMessage(statusMessage, 'info');
            break;
          case 'session_expired':
            showUiMessage(statusMessage, 'info');
            setIsAccountModalOpen(true);
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
  }, [showUiMessage, setIsAccountModalOpen]);
}
