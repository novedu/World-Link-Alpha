function AccountSyncModal({
  open,
  onClose,
  accountIdentityLabel,
  authEmail,
  effectivePlan,
  captureQuotaLabel,
  markdownExportQuotaLabel,
  accountNotice,
  onRefreshEntitlements,
  isRefreshingEntitlements,
  onMigrateLocalToCloud,
  isMigratingLocalData,
  canMigrate,
  onUpgradePlan,
  canUpgradePlan,
  onSignOut,
  onSignIn,
  helperText,
  cloudLastErrorHint
}) {
  if (!open) return null;

  return (
    <div className="overlay-backdrop" role="presentation" onClick={onClose}>
      <section
        className="overlay-panel account-panel"
        role="dialog"
        aria-modal="true"
        aria-label="账号与同步"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="overlay-header">
          <div className="min-w-0">
            <h2 className="overlay-title">账号与同步</h2>
            <p className="overlay-subtitle">{accountIdentityLabel}</p>
          </div>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="关闭弹窗">
            ×
          </button>
        </div>

        <div className="section-body">
          <div className="summary-grid">
            <div className="summary-item">
              <div className="summary-item-label">账号状态</div>
              <div className="summary-item-value">{authEmail || '未登录'}</div>
            </div>
            <div className="summary-item">
              <div className="summary-item-label">当前套餐</div>
              <div className="summary-item-value">{effectivePlan}</div>
            </div>
          </div>

          <div className="summary-grid">
            <div className="summary-item">
              <div className="summary-item-label">今日捕获额度</div>
              <div className="summary-item-value">{captureQuotaLabel}</div>
            </div>
            <div className="summary-item">
              <div className="summary-item-label">今日 Markdown 导出</div>
              <div className="summary-item-value">{markdownExportQuotaLabel}</div>
            </div>
          </div>

          {accountNotice ? (
            <div className={`account-inline-notice account-inline-notice-${accountNotice.type || 'info'}`}>{accountNotice.text}</div>
          ) : null}

          <div className="toolbar-wrap">
            <button type="button" className="btn-secondary" onClick={onRefreshEntitlements} disabled={isRefreshingEntitlements}>
              {isRefreshingEntitlements ? '刷新中...' : '刷新套餐'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={onMigrateLocalToCloud}
              disabled={!canMigrate || isMigratingLocalData}
              title={!canMigrate ? '请先登录账号' : ''}
            >
              {isMigratingLocalData ? '迁移中...' : '迁移本机数据到云端'}
            </button>
            {authEmail ? (
              <>
                {canUpgradePlan ? (
                  <button type="button" className="btn-primary" onClick={onUpgradePlan}>
                    升级到 Pro
                  </button>
                ) : null}
                <button type="button" className="btn-secondary" onClick={onSignOut}>
                  退出登录
                </button>
              </>
            ) : (
              <button type="button" className="btn-primary" onClick={onSignIn}>
                注册 / 登录
              </button>
            )}
          </div>

          <p className="helper-text">{helperText}</p>
          {cloudLastErrorHint ? <p className="helper-text">{cloudLastErrorHint}</p> : null}
        </div>
      </section>
    </div>
  );
}

export default AccountSyncModal;
