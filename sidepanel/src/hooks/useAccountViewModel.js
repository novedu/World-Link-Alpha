import { formatQuotaLabel } from '../utils/quotaUtils';

export function useAccountViewModel({ runtimeContext, authSession }) {
  const effectivePlan = runtimeContext.entitlements?.plan === 'pro' || authSession?.plan === 'pro' ? 'Pro' : 'Free';
  const captureQuotaLabel = formatQuotaLabel(runtimeContext.usage?.captureCreate);
  const markdownExportQuotaLabel = formatQuotaLabel(runtimeContext.usage?.exportMarkdown);
  const cloudLastError = runtimeContext.cloudDiagnostics?.lastError;
  const cloudLastErrorHint =
    cloudLastError?.message
      ? `最近同步失败：${cloudLastError.message}${cloudLastError.traceId ? `（${cloudLastError.traceId}）` : ''}`
      : '';
  const accountDisplayName = authSession?.email ? authSession.email.split('@')[0] || authSession.email : '未登录';
  const accountIdentityLabel = authSession?.email || '登录后开启云同步';
  const accountTriggerStatus = authSession?.email ? `${effectivePlan} · 已同步` : '未同步 · 未登录';
  const helperText = authSession?.email ? '数据会自动同步到云端。' : '登录后可开启云同步。';
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
