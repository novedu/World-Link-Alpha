import { CAPTURE_STATUS } from '../constants/worldLink';
import { getCaptureStatus } from '../utils/captureUtils';
import { formatRuntimeError, sendRuntimeMessage } from '../services/runtimeApi';

export function useCaptureInboxFlow({
  selectedWorldId,
  selectedBookId,
  setActiveTab,
  setEditingEntity,
  onUiMessage
}) {
  const handleCreateFromCapture = (item) => {
    if (!selectedWorldId) {
      onUiMessage?.('请先在上方选择一个世界，再从捕获内容创建实体', 'warning');
      return;
    }
    if (getCaptureStatus(item) === CAPTURE_STATUS.INBOX) {
      void sendRuntimeMessage('UPDATE_CAPTURE_STATUS', {
        text: item.text,
        timestamp: item.timestamp,
        status: CAPTURE_STATUS.ORGANIZED
      });
    }
    const fallbackName = item.text.length <= 20 ? item.text : `${item.text.slice(0, 20)}...`;
    setActiveTab('entities');
    setEditingEntity({
      id: '',
      worldId: selectedWorldId,
      name: fallbackName,
      type: 'other',
      summary: item.text.slice(0, 220),
      tags: '',
      selectedText: item.text,
      sourceUrl: item.sourceUrl || '',
      sourceTitle: item.sourceTitle || '',
      usedInCurrentBook: Boolean(selectedBookId)
    });
  };

  const handleUpdateCaptureStatus = async (item, status) => {
    if (!item?.text) return;
    const result = await sendRuntimeMessage('UPDATE_CAPTURE_STATUS', {
      text: item.text,
      timestamp: item.timestamp,
      status
    });
    if (!result?.success) {
      console.warn('[Sidepanel] update capture status failed:', formatRuntimeError(result, 'unknown'));
    }
  };

  return {
    handleCreateFromCapture,
    handleUpdateCaptureStatus
  };
}
