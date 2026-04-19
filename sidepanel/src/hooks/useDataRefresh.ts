/* global chrome */

import { useState } from 'react';

export function useDataRefresh({ showUiMessage }: {
  showUiMessage: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // 手动触发数据刷新
      chrome.runtime.sendMessage({ type: 'REFRESH_DATA' });
      showUiMessage('数据已刷新', 'success');
    } catch {
      showUiMessage('刷新失败', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  return { isRefreshing, handleRefresh };
}
