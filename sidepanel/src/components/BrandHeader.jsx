function BrandHeader({ accountDisplayName, accountTriggerStatus, subscriptionStatus, onOpenAccount, onRefresh, isRefreshing }) {
  return (
    <header className="brand-header">
      <div className="brand-main">
        <div className="brand-mark" aria-hidden="true">
          WL
        </div>
        <div className="min-w-0">
          <h1 className="brand-title">World-Link Alpha</h1>
          <p className="brand-subtitle">设定采集 · 世界管理 · 设定同步</p>
        </div>
      </div>
      <div className="header-actions">
        {onRefresh && (
          <button 
            type="button" 
            className="refresh-button" 
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            ) : (
              '刷新'
            )}
          </button>
        )}
        <div className="account-section">
          <button type="button" className="account-trigger" onClick={onOpenAccount}>
            <span className="account-trigger-name">{accountDisplayName}</span>
            <span className="account-trigger-meta">{accountTriggerStatus}</span>
          </button>
          {subscriptionStatus && (
            <div className={`subscription-status subscription-${subscriptionStatus.status}`}>
              {subscriptionStatus.message}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default BrandHeader;
