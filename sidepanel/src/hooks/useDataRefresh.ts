import { useState } from 'react';

export function useDataRefresh({
  showUiMessage,
  onRefreshData
}: {
  showUiMessage: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onRefreshData: () => Promise<void>;
}) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefreshData();
      showUiMessage('数据已刷新', 'success');
    } catch {
      showUiMessage('刷新失败', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  return { isRefreshing, handleRefresh };
}
