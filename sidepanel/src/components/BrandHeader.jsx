function BrandHeader({ accountDisplayName, accountTriggerStatus, onOpenAccount }) {
  return (
    <header className="brand-header">
      <div className="brand-main">
        <div className="brand-mark" aria-hidden="true">
          WL
        </div>
        <div className="min-w-0">
          <h1 className="brand-title">World-Link Alpha</h1>
          <p className="brand-subtitle">设定采集 · 世界管理 · 实体同步</p>
        </div>
      </div>
      <button type="button" className="account-trigger" onClick={onOpenAccount}>
        <span className="account-trigger-name">{accountDisplayName}</span>
        <span className="account-trigger-meta">{accountTriggerStatus}</span>
      </button>
    </header>
  );
}

export default BrandHeader;
