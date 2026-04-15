import { describe, expect, it } from 'vitest';
import { parseTags } from './entityUtils';

describe('parseTags', () => {
  it('returns empty array for empty input', () => {
    expect(parseTags('')).toEqual([]);
    expect(parseTags(null)).toEqual([]);
  });

  it('normalizes comma and chinese comma separators', () => {
    expect(parseTags('人物， 地点,势力')).toEqual(['人物', '地点', '势力']);
  });

  it('trims values and removes duplicates', () => {
    expect(parseTags(['  矿石 ', '矿石', '  生物  ', '', '事件'])).toEqual(['矿石', '生物', '事件']);
  });
});
