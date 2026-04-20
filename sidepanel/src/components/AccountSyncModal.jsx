import { useId } from 'react';
import SubscriptionManager from './SubscriptionManager.tsx';
import { useDialogA11y } from '../hooks/useDialogA11y.js';

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
  onUpgradePlan,
  canUpgradePlan,
  onSignOut,
  onSignIn,
  onRegister,
  helperText,
  cloudLastErrorHint,
  activationDebugAvailable,
  activationDebugOpen,
  activationDebugSnapshot,
  isActivationDebugLoading,
  isActivationDebugExporting,
  onToggleActivationDebug,
  onRefreshActivationDebug,
  onClearActivationDebug,
  onExportActivationDebug
}) {
  const isOpen = Boolean(open);
  const titleId = useId();
  const descriptionId = useId();
  const { panelRef, initialFocusRef } = useDialogA11y({
    open: isOpen,
    onClose
  });

  if (!isOpen) return null;

  const isAuthActionsSingle = !authEmail || !canUpgradePlan;
  const debugEvents = Array.isArray(activationDebugSnapshot?.recentEvents) ? activationDebugSnapshot.recentEvents : [];

  // 订阅更新回调
  const handleSubscriptionUpdated = () => {
    // 刷新套餐信息
    onRefreshEntitlements();
  };

  return (
    <div className="overlay-backdrop" role="presentation" onClick={onClose}>
      <section
        ref={panelRef}
        className="overlay-panel account-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="overlay-header">
          <div className="min-w-0">
            <h2 id={titleId} className="overlay-title">账号与同步</h2>
            <p id={descriptionId} className="overlay-subtitle">{accountIdentityLabel}</p>
          </div>
          <button ref={initialFocusRef} type="button" className="btn-icon" onClick={onClose} aria-label="关闭弹窗">
            ×
          </button>
        </div>

        <div className="section-body">
          <div className="summary-grid">
            <div className="summary-item">
              <div className="summary-item-label">账号</div>
              <div className="summary-item-value">{authEmail || '未登录'}</div>
            </div>
            <div className="summary-item">
              <div className="summary-item-label">套餐</div>
              <div className="summary-item-value">{effectivePlan}</div>
            </div>
          </div>

          <div className="summary-grid">
            <div className="summary-item">
              <div className="summary-item-label">今日灵感</div>
              <div className="summary-item-value">{captureQuotaLabel}</div>
            </div>
            <div className="summary-item">
              <div className="summary-item-label">今日导出</div>
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
              {isRefreshingEntitlements ? '刷新中...' : '刷新权益'}
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

          {activationDebugAvailable ? (
            <div className="account-debug-panel">
              <button
                type="button"
                className="btn-secondary btn-mini account-debug-toggle"
                onClick={onToggleActivationDebug}
                aria-expanded={Boolean(activationDebugOpen)}
              >
                {activationDebugOpen ? '收起激活埋点调试' : '开发：查看激活埋点'}
              </button>

              {activationDebugOpen ? (
                <div className="account-debug-body">
                  <div className="summary-grid account-debug-metrics">
                    <div className="summary-item">
                      <div className="summary-item-label">事件总数</div>
                      <div className="summary-item-value">{activationDebugSnapshot?.total ?? 0}</div>
                    </div>
                    <div className="summary-item">
                      <div className="summary-item-label">最后事件</div>
                      <div className="summary-item-value">
                        {activationDebugSnapshot?.lastEvent?.name || '暂无'}
                      </div>
                    </div>
                  </div>

                  <div className="account-actions-grid account-debug-actions">
                    <button type="button" className="btn-secondary btn-mini" onClick={onRefreshActivationDebug} disabled={isActivationDebugLoading}>
                      {isActivationDebugLoading ? '刷新中...' : '刷新快照'}
                    </button>
                    <button type="button" className="btn-secondary btn-mini" onClick={onClearActivationDebug} disabled={isActivationDebugLoading}>
                      清空事件
                    </button>
                    <button
                      type="button"
                      className="btn-secondary btn-mini"
                      onClick={onExportActivationDebug}
                      disabled={isActivationDebugExporting}
                    >
                      {isActivationDebugExporting ? '导出中...' : '导出 JSON'}
                    </button>
                  </div>

                  <div className="account-debug-list">
                    {debugEvents.length ? (
                      debugEvents.map((event) => (
                        <div key={event.id} className="account-debug-item">
                          <div className="account-debug-item-head">
                            <span className="account-debug-event-name">{event.name}</span>
                            <span className="account-debug-event-time">{event.isoTime}</span>
                          </div>
                          <pre className="account-debug-payload">
                            {JSON.stringify(event.payload || {}, null, 2)}
                          </pre>
                        </div>
                      ))
                    ) : (
                      <p className="helper-text">暂无激活埋点记录。</p>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

export default AccountSyncModal;
