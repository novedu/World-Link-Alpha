import { describe, expect, it } from 'vitest';
import {
  formatAiFallbackHint,
  formatAiFallbackReason,
  formatAiProvider,
  formatAiQualityMeta,
  getAiProviderLabel,
  normalizeAiQualityScore
} from './aiUtils';

describe('aiUtils', () => {
  it('maps provider labels correctly', () => {
    expect(getAiProviderLabel('cloud-model')).toBe('云端模型');
    expect(getAiProviderLabel('local-fallback')).toBe('本地兜底');
    expect(getAiProviderLabel('local-heuristic')).toBe('本地规则');
  });

  it('formats provider with model', () => {
    expect(formatAiProvider('cloud-model', 'gpt-4.1-mini')).toBe('云端模型 · gpt-4.1-mini');
    expect(formatAiProvider('local-fallback', '')).toBe('本地兜底');
  });

  it('formats fallback reasons with typed mapping', () => {
    expect(
      formatAiFallbackReason({
        fallbackType: 'timeout'
      })
    ).toBe('云端响应超时，建议稍后重试');
    expect(
      formatAiFallbackReason({
        fallbackType: 'auth'
      })
    ).toBe('登录状态已失效，请重新登录');
    expect(
      formatAiFallbackReason({
        fallbackStatus: 500
      })
    ).toBe('云端服务暂不可用，建议稍后重试');
  });

  it('builds fallback hint text for UI', () => {
    expect(
      formatAiFallbackHint(
        {
          fallbackType: 'network'
        },
        '云端文案'
      )
    ).toBe('云端文案暂不可用，已自动切换本地：网络连接异常，建议稍后重试');
    expect(
      formatAiFallbackHint(
        {
          fallbackReason: '云端请求失败（502）'
        },
        '云端解析'
      )
    ).toBe('云端解析暂不可用，已自动切换本地：云端请求失败（502）');
  });

  it('normalizes quality score in 0-1 range', () => {
    expect(normalizeAiQualityScore(0.88)).toBe(0.88);
    expect(normalizeAiQualityScore(88)).toBe(0.88);
    expect(normalizeAiQualityScore(140)).toBeNull();
    expect(normalizeAiQualityScore('abc')).toBeNull();
  });

  it('formats quality meta for ui rendering', () => {
    expect(formatAiQualityMeta({ qualityTier: 'high', qualityScore: 0.92 })).toBe('质量 高 92%');
    expect(formatAiQualityMeta({ qualityLabel: '稳定', qualityScore: 0.81 })).toBe('质量 稳定 81%');
    expect(formatAiQualityMeta({ qualityScore: 0.62 })).toBe('质量 低 62%');
    expect(formatAiQualityMeta({})).toBe('');
  });
});
