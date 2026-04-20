import { CAPTURE_STATUS } from '../constants/worldLink';
import { getCaptureStatus } from '../utils/captureUtils';
import { captureService } from '../services/capture.service.ts';

export function useCaptureInboxFlow({
  selectedWorldId,
  selectedBookId,
  setActiveTab,
  setEditingEntity,
  onDataChanged,
  onUiMessage
}) {
  const handleCreateFromCapture = (item) => {
    if (!selectedWorldId) {
      onUiMessage?.('请先选择世界，再把灵感转成设定', 'warning');
      return;
    }
    if (getCaptureStatus(item) === CAPTURE_STATUS.INBOX) {
      void captureService
        .updateCapture(item.id, {
          status: CAPTURE_STATUS.ORGANIZED
        })
        .then(() => onDataChanged?.())
        .catch(() => undefined);
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
      captureId: item.id || '',
      usedInCurrentBook: Boolean(selectedBookId)
    });
  };

  const handleUpdateCaptureStatus = async (item, status) => {
    if (!item?.id) return;
    try {
      await captureService.updateCapture(item.id, { status });
      await onDataChanged?.();
    } catch (error) {
      console.warn('[Sidepanel] update capture status failed:', error);
    }
  };

  return {
    handleCreateFromCapture,
    handleUpdateCaptureStatus
  };
}
