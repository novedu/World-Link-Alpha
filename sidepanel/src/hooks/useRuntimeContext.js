/* global chrome */

import { useEffect, useState } from 'react';
import {
  createDefaultRuntimeConfig,
  createDefaultRuntimeContext,
  formatRuntimeError,
  normalizeRuntimeConfig,
  normalizeRuntimeContext,
  sendRuntimeMessage
} from '../services/runtimeApi';

export function useRuntimeContext({ onUiMessage }) {
  const [runtimeContext, setRuntimeContext] = useState(() => createDefaultRuntimeContext());
  const [authSession, setAuthSession] = useState(null);
  const [runtimeConfigDraft, setRuntimeConfigDraft] = useState(() => createDefaultRuntimeConfig());
  const [isRefreshingEntitlements, setIsRefreshingEntitlements] = useState(false);
  const [accountNotice, setAccountNotice] = useState(null);

  const applyRuntimeContext = (result) => {
    const nextContext = normalizeRuntimeContext(result);
    setRuntimeContext(nextContext);
    setRuntimeConfigDraft(normalizeRuntimeConfig(result?.runtimeConfig, nextContext.repositoryMode));
  };

  const refreshRuntimeContext = async () => {
    const result = await sendRuntimeMessage('GET_RUNTIME_CONTEXT');
    if (!result?.success) return;
    applyRuntimeContext(result);
  };

  useEffect(() => {
    sendRuntimeMessage('GET_RUNTIME_CONTEXT').then((result) => {
      if (!result?.success) return;
      applyRuntimeContext(result);
    });

    sendRuntimeMessage('GET_AUTH_SESSION').then((result) => {
      if (!result?.success) return;
      setAuthSession(result.session || null);
    });

    const handler = (changes, areaName) => {
      if (areaName !== 'local') return;

      if (changes.authSession) {
        setAuthSession(changes.authSession.newValue || null);
      }

      if (changes.entitlements || changes.usageMeter) {
        void sendRuntimeMessage('GET_RUNTIME_CONTEXT').then((result) => {
          if (!result?.success) return;
          applyRuntimeContext(result);
        });
      }

      if (changes.runtimeConfig) {
        const nextRuntimeConfig = normalizeRuntimeConfig(changes.runtimeConfig.newValue, 'local');
        setRuntimeContext((prev) => ({
          ...prev,
          repositoryMode: nextRuntimeConfig.repositoryMode,
          cloudEnabled: nextRuntimeConfig.repositoryMode === 'cloud',
          runtimeConfig: nextRuntimeConfig
        }));
        setRuntimeConfigDraft(nextRuntimeConfig);
      }
    };

    chrome.storage.onChanged.addListener(handler);
    return () => {
      chrome.storage.onChanged.removeListener(handler);
    };
  }, []);

  useEffect(() => {
    if (!accountNotice) return undefined;
    const timer = window.setTimeout(() => {
      setAccountNotice(null);
    }, 2400);
    return () => window.clearTimeout(timer);
  }, [accountNotice]);

  const handleSignOut = async () => {
    const result = await sendRuntimeMessage('CLEAR_AUTH_SESSION');
    if (!result?.success) {
      onUiMessage?.(formatRuntimeError(result, '退出失败'), 'error');
      return;
    }
    setAuthSession(null);
    await refreshRuntimeContext();
    onUiMessage?.('已退出登录', 'success');
  };

  const handleUpgradeLocalPlan = async () => {
    if (!authSession?.email) return;
    // 打开账号模态框，用户可以在其中管理订阅
    // 这里可以通过回调函数通知父组件打开模态框
    onUiMessage?.('请在账号设置中管理您的订阅', 'info');
  };

  const handleRefreshEntitlements = async () => {
    if (isRefreshingEntitlements) return;
    setAccountNotice({
      type: 'info',
      text: '正在刷新套餐...'
    });
    setIsRefreshingEntitlements(true);
    const result = await sendRuntimeMessage('REFRESH_ENTITLEMENTS');
    setIsRefreshingEntitlements(false);
    if (!result?.success) {
      setAccountNotice({
        type: 'error',
        text: '刷新失败，请稍后重试'
      });
      onUiMessage?.(formatRuntimeError(result, '刷新套餐信息失败'), 'error');
      return;
    }
    await refreshRuntimeContext();
    setAccountNotice({
      type: 'success',
      text: '当前刷新完成'
    });
  };

  const ensureCloudRuntimeReady = async () => {
    const payload = {
      repositoryMode: 'cloud',
      cloudApiBaseUrl: String(runtimeConfigDraft.cloudApiBaseUrl || '').trim(),
      cloudTimeoutMs: Number(runtimeConfigDraft.cloudTimeoutMs || 12000)
    };
    const result = await sendRuntimeMessage('SET_RUNTIME_CONFIG', payload);
    if (!result?.success) {
      onUiMessage?.(formatRuntimeError(result, '初始化同步服务失败'), 'error');
      return false;
    }
    await refreshRuntimeContext();
    return true;
  };

  return {
    runtimeContext,
    setRuntimeContext,
    authSession,
    setAuthSession,
    runtimeConfigDraft,
    refreshRuntimeContext,
    ensureCloudRuntimeReady,
    isRefreshingEntitlements,
    accountNotice,
    setAccountNotice,
    handleSignOut,
    handleUpgradeLocalPlan,
    handleRefreshEntitlements
  };
}
