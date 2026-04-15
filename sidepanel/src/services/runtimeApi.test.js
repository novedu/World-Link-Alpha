import { describe, expect, it } from 'vitest';
import {
  formatRuntimeError,
  normalizeRuntimeConfig,
  normalizeRuntimeContext
} from './runtimeApi';

describe('runtimeApi normalization', () => {
  it('normalizes runtime config fields', () => {
    expect(
      normalizeRuntimeConfig(
        {
          repositoryMode: ' CLOUD ',
          cloudApiBaseUrl: ' https://api.world-link.test/// ',
          cloudTimeoutMs: 999999
        },
        'local'
      )
    ).toEqual({
      repositoryMode: 'cloud',
      cloudApiBaseUrl: 'https://api.world-link.test',
      cloudTimeoutMs: 60000
    });
  });

  it('uses fallback mode and default timeout for invalid input', () => {
    expect(
      normalizeRuntimeConfig(
        {
          repositoryMode: 'invalid',
          cloudApiBaseUrl: '',
          cloudTimeoutMs: 'bad-timeout'
        },
        'cloud'
      )
    ).toEqual({
      repositoryMode: 'cloud',
      cloudApiBaseUrl: '',
      cloudTimeoutMs: 12000
    });
  });

  it('derives cloudEnabled from repository mode when omitted', () => {
    const context = normalizeRuntimeContext({
      authEnabled: 1,
      runtimeConfig: {
        repositoryMode: 'cloud',
        cloudApiBaseUrl: 'https://api.world-link.test/',
        cloudTimeoutMs: 1800
      }
    });

    expect(context.repositoryMode).toBe('cloud');
    expect(context.cloudEnabled).toBe(true);
    expect(context.authEnabled).toBe(true);
    expect(context.runtimeConfig).toEqual({
      repositoryMode: 'cloud',
      cloudApiBaseUrl: 'https://api.world-link.test',
      cloudTimeoutMs: 3000
    });
  });
});

describe('formatRuntimeError', () => {
  it('appends trace id when present', () => {
    expect(formatRuntimeError({ error: '请求失败', traceId: 'trace-abc' })).toBe('请求失败（trace: trace-abc）');
  });

  it('returns fallback message when error is missing', () => {
    expect(formatRuntimeError({}, '操作失败')).toBe('操作失败');
  });
});
