import React, { useState, useEffect } from 'react';
import { subscriptionService, SubscriptionPlan, Subscription } from '../services/subscriptionService';

interface SubscriptionManagerProps {
  onSubscriptionUpdated: () => void;
}

const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({ onSubscriptionUpdated }) => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [isRenewing, setIsRenewing] = useState(false);

  // 加载订阅计划和用户订阅信息
  useEffect(() => {
    loadData();
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
      setError('加载订阅信息失败');
      console.error('Error loading subscription data:', err);
    } finally {
      setLoading(false);
    }
  };

  // 选择订阅计划
  const handleSelectPlan = async (planId: string) => {
    if (isCreating) return;
    
    setIsCreating(true);
    try {
      // 这里应该弹出支付界面，暂时模拟支付成功
      await subscriptionService.createSubscription(planId, 'mock_payment');
      await loadData();
      onSubscriptionUpdated();
    } catch (err) {
      setError('创建订阅失败');
      console.error('Error creating subscription:', err);
    } finally {
      setIsCreating(false);
    }
  };

  // 取消订阅
  const handleCancelSubscription = async () => {
    if (isCanceling) return;
    
    if (!confirm('确定要取消订阅吗？取消后将失去高级功能。')) {
      return;
    }
    
    setIsCanceling(true);
    try {
      await subscriptionService.cancelSubscription();
      await loadData();
      onSubscriptionUpdated();
    } catch (err) {
      setError('取消订阅失败');
      console.error('Error canceling subscription:', err);
    } finally {
      setIsCanceling(false);
    }
  };

  // 续费订阅
  const handleRenewSubscription = async () => {
    if (isRenewing) return;
    
    setIsRenewing(true);
    try {
      // 这里应该弹出支付界面，暂时模拟支付成功
      await subscriptionService.renewSubscription('mock_payment');
      await loadData();
      onSubscriptionUpdated();
    } catch (err) {
      setError('续费失败');
      console.error('Error renewing subscription:', err);
    } finally {
      setIsRenewing(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-center">加载中...</div>;
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-600">
        {error}
        <button 
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          onClick={loadData}
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="subscription-manager">
      <h3 className="text-lg font-semibold mb-4">订阅管理</h3>
      
      {/* 当前订阅状态 */}
      {subscription ? (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="font-medium mb-2">当前订阅</h4>
          <div className="flex justify-between items-center">
            <div>
              <p className="font-semibold">{subscription.plan.name}</p>
              <p className={`text-sm ${subscriptionService.getStatusColor(subscription.status)}`}>
                {subscriptionService.getStatusText(subscription.status)}
              </p>
              {subscription.endDate && (
                <p className="text-sm text-gray-600 mt-1">
                  到期时间: {new Date(subscription.endDate).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="font-semibold">
                ¥{subscription.plan.price}/{subscription.plan.billingCycle === 'monthly' ? '月' : '年'}
              </p>
            </div>
          </div>
          
          <div className="mt-4 space-x-2">
            {subscription.status === 'active' && (
              <button
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                onClick={handleCancelSubscription}
                disabled={isCanceling}
              >
                {isCanceling ? '取消中...' : '取消订阅'}
              </button>
            )}
            {(subscription.status === 'expired' || subscription.status === 'canceled') && (
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                onClick={handleRenewSubscription}
                disabled={isRenewing}
              >
                {isRenewing ? '续费中...' : '重新订阅'}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="font-medium mb-2">当前订阅</h4>
          <p className="text-gray-600">您目前使用的是 Free 版本</p>
        </div>
      )}
      
      {/* 订阅计划选择 */}
      <div className="mb-4">
        <h4 className="font-medium mb-3">选择订阅计划</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div 
              key={plan.id} 
              className={`p-4 rounded-lg border ${subscription?.planId === plan.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
            >
              <h5 className="font-semibold text-lg mb-2">{plan.name}</h5>
              <p className="text-2xl font-bold mb-4">
                ¥{plan.price}/{plan.billingCycle === 'monthly' ? '月' : '年'}
              </p>
              <ul className="space-y-2 mb-4">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4">
                <button
                  className={`w-full px-4 py-2 rounded-md transition-colors ${subscription?.planId === plan.id ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={subscription?.planId === plan.id || isCreating}
                >
                  {subscription?.planId === plan.id ? '当前计划' : isCreating ? '处理中...' : '选择'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* 功能限制说明 */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="font-medium mb-2">功能限制说明</h4>
        <div className="space-y-2 text-sm text-gray-600">
          <p><strong>Free 版本</strong>：2个世界观，100个实体，10次/天捕获</p>
          <p><strong>Pro 版本</strong>：无限世界观，1000个实体，100次/天捕获</p>
          <p><strong>Team 版本</strong>：无限世界观，5000个实体，500次/天捕获</p>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionManager;