import { describe, expect, it } from 'vitest';
import {
  buildConflictSignalsText,
  formatConflictReason,
  getConflictResolutionSuggestion,
  getConflictRiskKey,
  getConflictRiskMeta
} from './conflictUtils';

describe('conflictUtils', () => {
  it('maps risk key by confidence', () => {
    expect(getConflictRiskKey(0.93)).toBe('high');
    expect(getConflictRiskKey(0.82)).toBe('medium');
    expect(getConflictRiskKey(0.44)).toBe('low');
  });

  it('maps risk level by confidence', () => {
    expect(getConflictRiskMeta(0.93)).toEqual({ key: 'high', label: '高风险', tagClassName: 'tag-warning' });
    expect(getConflictRiskMeta(0.82)).toEqual({ key: 'medium', label: '中风险', tagClassName: 'tag-primary' });
    expect(getConflictRiskMeta(0.44)).toEqual({ key: 'low', label: '低风险', tagClassName: 'tag-secondary' });
  });

  it('formats reason with reasonCode first', () => {
    expect(formatConflictReason({ reasonCode: 'exact_type_mismatch' })).toBe('同名但类型不一致');
    expect(formatConflictReason({ reasonCode: 'summary_similar' })).toBe('描述高度相似');
    expect(formatConflictReason({ reason: '自定义原因' })).toBe('自定义原因');
  });

  it('returns resolution suggestions by reasonCode', () => {
    expect(getConflictResolutionSuggestion({ reasonCode: 'exact_name_duplicate' })).toContain('建议合并为同一设定');
    expect(getConflictResolutionSuggestion({ reasonCode: 'life_status_conflict' })).toContain('核对时间线');
    expect(getConflictResolutionSuggestion({ reasonCode: 'unknown_code' })).toContain('建议检查名称、类型与时间线');
  });

  it('builds human-friendly signal summary', () => {
    const text = buildConflictSignalsText({
      signals: {
        exactName: true,
        typeMismatch: true,
        nameSimilarity: 0.78,
        summarySimilarity: 0.63
      }
    });
    expect(text).toContain('同名命中');
    expect(text).toContain('类型冲突');
    expect(text).toContain('名称相似 78%');
    expect(text).toContain('描述相似 63%');
  });
});
