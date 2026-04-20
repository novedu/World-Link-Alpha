import { useEffect, useState } from 'react';
import { createDefaultRuntimeConfig, createDefaultRuntimeContext } from '../services/runtimeApi';
import { authService } from '../services/auth.service';
import { entitlementService } from '../services/entitlement.service';
import { getToken } from '../lib/http/token';

function buildUnauthedRuntimeContext() {
  // 当前版本默认“云端优先”：未登录也保持 cloud 模式，
  // 区别仅在于权限和可用能力（free + 未鉴权），而不是切到 local 模式。
  const base = createDefaultRuntimeContext();
  return {
    ...base,
    repositoryMode: 'cloud',
    cloudEnabled: true,
    runtimeConfig: {
      ...createDefaultRuntimeConfig(),
      repositoryMode: 'cloud'
    },
    entitlements: {
      plan: 'free',
      features: {
        exportMarkdown: false,
        exportJson: false
      },
      limits: {
        maxWorlds: 0,
        maxEntities: 0,
        maxCapturesPerDay: 0
      }
    },
    usage: {
      captureCreate: { used: 0, limit: 0 },
      exportMarkdown: { used: 0, limit: 0 },
      exportJson: { used: 0, limit: 0 }
    },
    cloudDiagnostics: null
  };
}

function mapEntitlementToRuntimeContext(snapshot) {
  const limits = snapshot?.limits || {};
  const usage = snapshot?.usage || {};
  const exportsUsage = snapshot?.exports || {};
  const canExportMarkdown =
    typeof snapshot?.features?.canExportMarkdown === 'boolean'
      ? snapshot.features.canExportMarkdown
      : snapshot?.features?.canExport !== false;
  const canExportJson = Boolean(snapshot?.features?.canExportJson);
  const canUseAI = Boolean(snapshot?.features?.canUseAI);

  return {
    repositoryMode: 'cloud',
    cloudEnabled: true,
    runtimeConfig: {
      ...createDefaultRuntimeConfig(),
      repositoryMode: 'cloud'
    },
    entitlements: {
      plan: snapshot?.plan || 'free',
      features: {
        exportMarkdown: canExportMarkdown,
        exportJson: canExportJson,
        aiAssist: canUseAI,
        conflictCheck: canUseAI
      },
      limits: {
        maxWorlds: Number(limits.maxWorlds ?? 0),
        maxEntities: Number(limits.maxEntities ?? 0),
        maxCapturesPerDay: Number(limits.maxCaptures ?? 0)
      }
    },
    usage: {
      captureCreate: {
        used: Number(usage.captures ?? 0),
        limit: Number(limits.maxCaptures ?? 0)
      },
      exportMarkdown: {
        used: Number(exportsUsage.markdown ?? 0),
        limit: null
      },
      exportJson: {
        used: Number(exportsUsage.json ?? 0),
        limit: null
      }
    },
    cloudDiagnostics: null
  };
}

export function useRuntimeContext({ onAuthStateChange }) {
  const [runtimeContext, setRuntimeContext] = useState(() => buildUnauthedRuntimeContext());
  const [authSession, setAuthSession] = useState(null);
  const [runtimeConfigDraft] = useState(() => ({
    ...createDefaultRuntimeConfig(),
    repositoryMode: 'cloud'
  }));
  const [isRefreshingEntitlements, setIsRefreshingEntitlements] = useState(false);
  const [accountNotice, setAccountNotice] = useState(null);

  const refreshAuthSession = async () => {
    const token = await getToken();
    if (!token) {
      setAuthSession(null);
      return null;
    }

    try {
      const result = await authService.getCurrentUser();
      if (!result?.success || !result?.data) {
        setAuthSession(null);
        return null;
      }
      const nextSession = {
        userId: result.data.id,
        email: result.data.email,
        plan: result.data.plan || 'free'
      };
      setAuthSession(nextSession);
      return nextSession;
    } catch {
      setAuthSession(null);
      return null;
    }
  };

  const refreshRuntimeContext = async () => {
    const token = await getToken();
    if (!token) {
      setRuntimeContext(buildUnauthedRuntimeContext());
      return;
    }

    try {
      const result = await entitlementService.getEntitlements();
      if (!result?.success || !result?.data) {
        setRuntimeContext(buildUnauthedRuntimeContext());
        return;
      }
      setRuntimeContext((prev) => ({
        ...prev,
        ...mapEntitlementToRuntimeContext(result.data)
      }));
    } catch (error) {
      setRuntimeContext((prev) => ({
        ...prev,
        ...buildUnauthedRuntimeContext(),
        cloudDiagnostics: {
          lastError: {
            message: String(error?.message || '套餐信息刷新失败'),
            traceId: ''
          }
        }
      }));
    }
  };

  useEffect(() => {
    void refreshAuthSession();
    void refreshRuntimeContext();
  }, []);

  useEffect(() => {
    if (!accountNotice) return undefined;
    const timer = window.setTimeout(() => {
      setAccountNotice(null);
    }, 2400);
    return () => window.clearTimeout(timer);
  }, [accountNotice]);

  const handleSignOut = async () => {
    try {
      setAccountNotice({
        type: 'info',
        text: '正在退出登录...'
      });
      await authService.logout();
      setAuthSession(null);
      await refreshRuntimeContext();
      await onAuthStateChange?.();
      setAccountNotice({
        type: 'success',
        text: '已退出登录'
      });
      return true;
    } catch {
      setAccountNotice({
        type: 'error',
        text: '退出失败，请稍后重试'
      });
      return false;
    }
  };

  const handleUpgradeLocalPlan = async () => {
    if (!authSession?.email) return;
    setAccountNotice({
      type: 'info',
      text: '请在账号面板里管理套餐'
    });
  };

  const handleRefreshEntitlements = async () => {
    if (isRefreshingEntitlements) return;
    if (!authSession?.email) {
      setAccountNotice({
        type: 'info',
        text: '登录后可查看并刷新权益'
      });
      return false;
    }
    setAccountNotice({
      type: 'info',
      text: '正在刷新权益...'
    });
    setIsRefreshingEntitlements(true);
    try {
      await refreshAuthSession();
      await refreshRuntimeContext();
      setAccountNotice({
        type: 'success',
        text: '权益已刷新'
      });
      return true;
    } catch {
      setAccountNotice({
        type: 'error',
        text: '刷新失败，请稍后再试'
      });
      return false;
    } finally {
      setIsRefreshingEntitlements(false);
    }
  };

  const ensureCloudRuntimeReady = async () => true;

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
