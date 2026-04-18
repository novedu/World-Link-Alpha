import { describe, expect, it } from 'vitest';
import { formatAssistProfile, normalizeAssistProfile } from './assistUtils';

describe('assistUtils', () => {
  it('normalizes assist profile with default values', () => {
    expect(normalizeAssistProfile(undefined)).toEqual({ style: 'balanced', targetLength: 'medium' });
    expect(normalizeAssistProfile({ style: 'unknown', targetLength: 'oops' })).toEqual({
      style: 'balanced',
      targetLength: 'medium'
    });
  });

  it('keeps valid profile values', () => {
    expect(normalizeAssistProfile({ style: 'detailed', targetLength: 'long' })).toEqual({
      style: 'detailed',
      targetLength: 'long'
    });
  });

  it('formats assist profile label', () => {
    expect(formatAssistProfile({ style: 'concise', targetLength: 'short' })).toBe('简洁 · 短');
    expect(formatAssistProfile({ style: 'balanced', targetLength: 'medium' })).toBe('平衡 · 中');
  });
});

