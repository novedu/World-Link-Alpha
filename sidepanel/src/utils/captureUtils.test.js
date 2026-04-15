import { describe, expect, it } from 'vitest';
import { CAPTURE_STATUS } from '../constants/worldLink';
import { getCaptureStatus, matchCaptureTime } from './captureUtils';

describe('captureUtils', () => {
  it('falls back to inbox when status is invalid', () => {
    expect(getCaptureStatus({ status: 'unknown' })).toBe(CAPTURE_STATUS.INBOX);
    expect(getCaptureStatus({})).toBe(CAPTURE_STATUS.INBOX);
  });

  it('matches capture time ranges correctly', () => {
    const now = Date.now();
    expect(matchCaptureTime({ timestamp: now - 30 * 60 * 1000 }, '24h')).toBe(true);
    expect(matchCaptureTime({ timestamp: now - 8 * 24 * 60 * 60 * 1000 }, '7d')).toBe(false);
    expect(matchCaptureTime({ timestamp: now - 20 * 24 * 60 * 60 * 1000 }, '30d')).toBe(true);
  });
});
