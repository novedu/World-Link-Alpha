import { formatQuotaLabel } from '../utils/quotaUtils';

export function useAccountViewModel({ runtimeContext, authSession }) {
  const isAuthenticated = Boolean(authSession?.email);
  const effectivePlan = isAuthenticated
    ? (runtimeContext.entitlements?.plan === 'pro' || authSession?.plan === 'pro' ? 'Pro' : 'Free')
    : '访客';
  const captureQuotaLabel = isAuthenticated ? formatQuotaLabel(runtimeContext.usage?.captureCreate) : '登录后查看';
  const markdownExportQuotaLabel = isAuthenticated ? formatQuotaLabel(runtimeContext.usage?.exportMarkdown) : '登录后查看';
  const cloudLastError = runtimeContext.cloudDiagnostics?.lastError;
  const cloudLastErrorHint =
    cloudLastError?.message
      ? `最近同步失败：${cloudLastError.message}${cloudLastError.traceId ? `（${cloudLastError.traceId}）` : ''}`
      : '';
  const accountDisplayName = authSession?.email ? authSession.email.split('@')[0] || authSession.email : '未登录';
  const accountIdentityLabel = authSession?.email || '登录后开启云同步';
  const accountTriggerStatus = authSession?.email ? `${effectivePlan} · 已同步` : '未同步 · 未登录';
  const helperText = authSession?.email ? '数据会自动同步到云端。' : '登录后即可同步你的世界观、作品和设定。';
  const canUpgradePlan = Boolean(authSession?.email && authSession.plan !== 'pro');

  return {
    effectivePlan,
    captureQuotaLabel,
    markdownExportQuotaLabel,
    cloudLastErrorHint,
    accountDisplayName,
    accountIdentityLabel,
    accountTriggerStatus,
    helperText,
    canUpgradePlan
  };
}
