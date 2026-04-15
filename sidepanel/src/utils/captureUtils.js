import { CAPTURE_STATUS } from '../constants/worldLink';

export function getCaptureStatus(item) {
  const status = item?.status;
  if (status === CAPTURE_STATUS.ORGANIZED || status === CAPTURE_STATUS.CONVERTED || status === CAPTURE_STATUS.INBOX) {
    return status;
  }
  return CAPTURE_STATUS.INBOX;
}

export function getCaptureDomain(item) {
  try {
    if (!item?.sourceUrl) return '未知来源';
    return new URL(item.sourceUrl).hostname || '未知来源';
  } catch {
    return '未知来源';
  }
}

export function matchCaptureTime(item, filterValue) {
  if (filterValue === 'all') return true;
  const timestamp = Number(item?.timestamp || 0);
  if (!timestamp) return false;
  const now = Date.now();
  const diff = now - timestamp;
  if (filterValue === '24h') return diff <= 24 * 60 * 60 * 1000;
  if (filterValue === '7d') return diff <= 7 * 24 * 60 * 60 * 1000;
  if (filterValue === '30d') return diff <= 30 * 24 * 60 * 60 * 1000;
  return true;
}
