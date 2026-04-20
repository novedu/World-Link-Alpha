function BrandHeader({ accountDisplayName, accountTriggerStatus, subscriptionStatus, onOpenAccount, onRefresh, isRefreshing, isGuestView = false }) {
  const accountPlanLabel = String(accountTriggerStatus || '').split('·')[0].trim() || '账号';
  const isGuestAccount = accountDisplayName === '未登录';
  const accountStateLabel = isGuestAccount ? '访客' : '云端';
  const brandSubtitle = isGuestView ? '' : '灵感整理 · 设定管理';
  const accountTriggerTitle = isGuestView ? '访客 / 登录同步' : `${accountDisplayName} · ${accountTriggerStatus}`;
  const accountTriggerAriaLabel = isGuestView
    ? '打开账号与同步，当前为访客模式，可登录后同步'
    : `打开账号与同步，当前${accountDisplayName}，${accountTriggerStatus}`;

  return (
    <header className={`brand-header ${isGuestView ? 'brand-header-guest' : ''}`}>
      <div className="brand-main">
        <div className={`brand-mark ${isGuestView ? 'brand-mark-guest' : ''}`} aria-hidden="true">
          WL
        </div>
        <div className="min-w-0">
          <h1 className="brand-title">World-Link Alpha</h1>
          {brandSubtitle ? <p className={`brand-subtitle ${isGuestView ? 'brand-subtitle-guest' : ''}`}>{brandSubtitle}</p> : null}
        </div>
      </div>
      <div className="header-actions">
        <div className="account-section">
          <button
            type="button"
            className="account-trigger"
            onClick={onOpenAccount}
            title={accountTriggerTitle}
            aria-label={accountTriggerAriaLabel}
          >
            {isGuestView ? (
              <span className="account-trigger-guest-inline">
                <span className={`account-trigger-state ${isGuestAccount ? 'account-trigger-state-guest' : 'account-trigger-state-ready'}`}>
                  {accountStateLabel}
                </span>
                <span className="account-trigger-guest-action">登录同步</span>
              </span>
            ) : (
              <>
                <span className="account-trigger-top">
                  <span className="account-trigger-name" title={accountDisplayName}>{accountDisplayName}</span>
                </span>
                <span className="account-trigger-meta-row">
                  <span className={`account-trigger-state ${isGuestAccount ? 'account-trigger-state-guest' : 'account-trigger-state-ready'}`}>
                    {accountStateLabel}
                  </span>
                  <span className="account-trigger-plan" title={accountPlanLabel}>{accountPlanLabel}</span>
                </span>
              </>
            )}
          </button>
          {subscriptionStatus && (
            <div className={`subscription-status subscription-${subscriptionStatus.status}`} role="status" aria-live="polite">
              {subscriptionStatus.message}
            </div>
          )}
        </div>
        {onRefresh && (
          <button
            type="button"
            className="refresh-button"
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label={isRefreshing ? '正在刷新工作区数据' : '刷新工作区数据'}
            aria-busy={isRefreshing}
          >
            <span className="refresh-button-inner">
              {isRefreshing ? (
                <span className="refresh-button-spinner" aria-hidden="true">
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-sky-600"></span>
                </span>
              ) : null}
              <span>{isRefreshing ? '刷新中' : '刷新'}</span>
            </span>
          </button>
        )}
      </div>
    </header>
  );
}

export default BrandHeader;
