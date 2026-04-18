import React from 'react';
import SubscriptionManager from './SubscriptionManager';

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
  onRegister,
  helperText,
  cloudLastErrorHint
}) {
  if (!open) return null;
  const isAuthActionsSingle = !authEmail || !canUpgradePlan;

  // 订阅更新回调
  const handleSubscriptionUpdated = () => {
    // 刷新套餐信息
    onRefreshEntitlements();
  };

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
              <div className="summary-item-label">今日灵感收集额度</div>
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

          {/* 订阅管理 */}
          {authEmail && (
            <div className="mt-6 border-t border-gray-200 pt-6">
              <SubscriptionManager onSubscriptionUpdated={handleSubscriptionUpdated} />
            </div>
          )}

          <div className="account-actions-grid">
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
          </div>
          <div className={`account-actions-grid account-actions-auth ${isAuthActionsSingle ? 'account-actions-auth-single' : ''}`}>
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
              <>
                <button type="button" className="btn-primary" onClick={onSignIn}>
                  登录
                </button>
                <button type="button" className="btn-secondary" onClick={onRegister}>
                  注册
                </button>
              </>
            )}
          </div>

          <div className="account-helper-stack">
            <p className="helper-text">{helperText}</p>
            {cloudLastErrorHint ? <p className="helper-text account-helper-error">{cloudLastErrorHint}</p> : null}
          </div>
        </div>
      </section>
    </div>
  );
}

export default AccountSyncModal;
