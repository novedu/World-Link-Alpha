import React, { useEffect, useState } from 'react';
import ActionDialog from './ActionDialog';
import InlineMessage from './InlineMessage';
import { subscriptionService, SubscriptionPlan, Subscription } from '../services/subscriptionService';

interface SubscriptionManagerProps {
  onSubscriptionUpdated: () => void;
}

type UiMessage = {
  text: string;
  type?: 'info' | 'success' | 'warning' | 'error';
};

const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({ onSubscriptionUpdated }) => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [isRenewing, setIsRenewing] = useState(false);
  const [uiMessage, setUiMessage] = useState<UiMessage | null>(null);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [plansData, subscriptionData] = await Promise.all([
        subscriptionService.getPlans(),
        subscriptionService.getSubscription()
      ]);
      setPlans(plansData);
      setSubscription(subscriptionData);
    } catch (err) {
      setError('套餐暂时不可用');
      console.error('Error loading subscription data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (planId: string) => {
    if (isCreating) return;

    setIsCreating(true);
    setUiMessage(null);
    try {
      await subscriptionService.createSubscription(planId, 'mock_payment');
      await loadData();
      onSubscriptionUpdated();
      setUiMessage({ text: '套餐已更新。', type: 'success' });
    } catch (err) {
      setError('开通失败');
      console.error('Error creating subscription:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (isCanceling) return;

    setIsCanceling(true);
    setUiMessage(null);
    try {
      await subscriptionService.cancelSubscription();
      await loadData();
      onSubscriptionUpdated();
      setUiMessage({ text: '已取消订阅。', type: 'success' });
    } catch (err) {
      setError('取消失败');
      console.error('Error canceling subscription:', err);
    } finally {
      setIsCanceling(false);
      setIsCancelDialogOpen(false);
    }
  };

  const handleRenewSubscription = async () => {
    if (isRenewing) return;

    setIsRenewing(true);
    setUiMessage(null);
    try {
      await subscriptionService.renewSubscription('mock_payment');
      await loadData();
      onSubscriptionUpdated();
      setUiMessage({ text: '已续费，套餐已刷新。', type: 'success' });
    } catch (err) {
      setError('续费失败');
      console.error('Error renewing subscription:', err);
    } finally {
      setIsRenewing(false);
    }
  };

  if (loading) {
    return (
      <div className="status-card status-card-loading">
        <div className="status-card-icon" aria-hidden="true">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-sky-600"></div>
        </div>
        <div className="status-card-body">
          <p className="status-card-title">正在加载套餐</p>
          <p className="status-card-description">正在同步套餐和可用权益。</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="status-card status-card-error">
        <div className="status-card-icon" aria-hidden="true">
          <span>!</span>
        </div>
        <div className="status-card-body">
          <p className="status-card-title">加载失败</p>
          <p className="status-card-description">{error}</p>
          <div className="status-card-actions">
            <button className="btn-secondary btn-mini" onClick={() => void loadData()}>
              重试
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="subscription-manager">
      <div className="subscription-manager-header">
        <h3 className="subscription-manager-title">套餐管理</h3>
        <p className="subscription-manager-subtitle">查看版本、升级和续费。</p>
      </div>

      <InlineMessage message={uiMessage} onClose={() => setUiMessage(null)} />

      {subscription ? (
        <div className="subscription-summary-card">
          <div className="subscription-summary-header">
            <h4 className="subscription-summary-title">当前套餐</h4>
          </div>
          <div className="subscription-summary-row">
            <div className="subscription-summary-main">
              <p className="subscription-summary-plan">{subscription.plan.name}</p>
              <p className={`subscription-status-text subscription-status-text-${subscription.status}`}>
                {subscriptionService.getStatusText(subscription.status)}
              </p>
              {subscription.endDate ? (
                <p className="subscription-summary-meta">
                  到期：{new Date(subscription.endDate).toLocaleDateString()}
                </p>
              ) : null}
            </div>
            <div className="subscription-summary-price">
              <p className="subscription-summary-amount">
                ¥{subscription.plan.price}/{subscription.plan.billingCycle === 'monthly' ? '月' : '年'}
              </p>
            </div>
          </div>

          <div className="subscription-summary-actions">
            {subscription.status === 'active' ? (
              <button
                className="btn-secondary"
                onClick={() => setIsCancelDialogOpen(true)}
                disabled={isCanceling}
              >
                {isCanceling ? '取消中...' : '取消订阅'}
              </button>
            ) : null}
            {(subscription.status === 'expired' || subscription.status === 'canceled') ? (
              <button
                className="btn-primary"
                onClick={handleRenewSubscription}
                disabled={isRenewing}
              >
                {isRenewing ? '恢复中...' : '恢复订阅'}
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="subscription-summary-card">
          <div className="subscription-summary-header">
            <h4 className="subscription-summary-title">当前套餐</h4>
          </div>
          <p className="subscription-summary-meta">当前为 Free 版。</p>
        </div>
      )}

      <div className="subscription-section">
        <h4 className="subscription-summary-title">选择套餐</h4>
        <div className="subscription-plan-grid">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`subscription-plan-card ${subscription?.planId === plan.id ? 'subscription-plan-card-active' : ''}`}
            >
              <h5 className="subscription-plan-title">{plan.name}</h5>
              <p className="subscription-plan-price">
                ¥{plan.price}/{plan.billingCycle === 'monthly' ? '月' : '年'}
              </p>
              <ul className="subscription-feature-list">
                {plan.features.map((feature, index) => (
                  <li key={index} className="subscription-feature-item">
                    <span className="subscription-feature-mark" aria-hidden="true">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="subscription-plan-actions">
                <button
                  className={subscription?.planId === plan.id ? 'btn-secondary subscription-plan-button-current' : 'btn-primary'}
                  onClick={() => void handleSelectPlan(plan.id)}
                  disabled={subscription?.planId === plan.id || isCreating}
                >
                  {subscription?.planId === plan.id ? '当前套餐' : isCreating ? '处理中...' : '选择'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="subscription-help-card">
        <h4 className="subscription-summary-title">版本说明</h4>
        <div className="subscription-help-list">
          <p><strong>Free</strong>：2 个世界观 / 100 个设定 / 10 次/天灵感</p>
          <p><strong>Pro</strong>：不限世界观 / 1000 个设定 / 100 次/天灵感</p>
          <p><strong>Team</strong>：不限世界观 / 5000 个设定 / 500 次/天灵感</p>
        </div>
      </div>

      <ActionDialog
        actionDialog={{
          open: isCancelDialogOpen,
          title: '取消订阅？',
          message: '取消后将按服务端规则结束当前权益。',
          confirmText: '确认取消',
          cancelText: '先保留',
          fields: []
        }}
        actionDialogValues={{}}
        dialogSubmitting={isCanceling}
        onClose={() => {
          if (!isCanceling) {
            setIsCancelDialogOpen(false);
          }
        }}
        onSubmit={handleCancelSubscription}
        onFieldChange={() => {}}
      />
    </div>
  );
};

export default SubscriptionManager;
