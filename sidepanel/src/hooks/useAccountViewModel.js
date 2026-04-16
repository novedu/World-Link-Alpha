import { formatQuotaLabel } from '../utils/quotaUtils';

export function useAccountViewModel({ runtimeContext, authSession }) {
  const effectivePlan = runtimeContext.entitlements?.plan === 'pro' || authSession?.plan === 'pro' ? 'Pro' : 'Free';
  const captureQuotaLabel = formatQuotaLabel(runtimeContext.usage?.captureCreate);
  const markdownExportQuotaLabel = formatQuotaLabel(runtimeContext.usage?.exportMarkdown);
  const cloudLastError = runtimeContext.cloudDiagnostics?.lastError;
  const cloudLastErrorHint =
    cloudLastError?.message
      ? `最近一次同步错误：${cloudLastError.message}${cloudLastError.traceId ? `（trace: ${cloudLastError.traceId}）` : ''}`
      : '';
  const accountDisplayName = authSession?.email ? authSession.email.split('@')[0] || authSession.email : '未登录';
  const accountIdentityLabel = authSession?.email || '登录后自动开启云端同步';
  const accountTriggerStatus = authSession?.email ? `${effectivePlan} · 已同步` : `${effectivePlan} · 点击登录`;
  const helperText = authSession?.email ? '已登录账号，数据将自动云端同步。' : '登录后自动开启云端同步与跨设备访问。';
  const canMigrate = Boolean(authSession?.email);
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
    canMigrate,
    canUpgradePlan
  };
}
