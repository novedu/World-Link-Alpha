import { useState } from 'react';

type RefreshResult = {
  status?: 'success' | 'error' | 'auth_required' | 'ignored';
  message?: string;
};

export function useDataRefresh({
  showUiMessage,
  onRefreshData
}: {
  showUiMessage: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onRefreshData: () => Promise<RefreshResult | undefined>;
}) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const result = await onRefreshData();
      if (result?.status === 'ignored') {
        return;
      }
      if (result?.status === 'auth_required') {
        showUiMessage('登录状态已失效，请重新登录', 'warning');
        return;
      }
      if (result?.status === 'error') {
        showUiMessage(result.message || '刷新失败', 'error');
        return;
      }
      showUiMessage('数据已刷新', 'success');
    } catch {
      showUiMessage('刷新失败', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  return { isRefreshing, handleRefresh };
}
