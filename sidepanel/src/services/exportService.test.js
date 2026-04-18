import { describe, expect, it } from 'vitest';
import { buildJsonExportPayload, buildMarkdownExport } from './exportService';

const parseTags = (input) => {
  if (!input) return [];
  if (Array.isArray(input)) return input.filter(Boolean);
  return String(input)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

describe('exportService v2', () => {
  it('builds markdown export with relation and template blocks', () => {
    const markdown = buildMarkdownExport({
      entities: [
        { id: 'e1', name: '萧炎', type: 'character', summary: '主角', tags: ['人物'] },
        { id: 'e2', name: '药老', type: 'character', summary: '老师', tags: ['人物', '导师'] }
      ],
      scopeLabel: '书项目：斗破苍穹',
      typeLabels: { character: '人物', other: '其他' },
      parseTags,
      relationLabels: { kinship: '亲属', related_to: '关联' },
      scopedRelations: [{ fromEntityId: 'e1', toEntityId: 'e2', type: 'related_to', note: '师徒关系' }],
      isBookScoped: true
    });

    expect(markdown).toContain('World-Link 导出（v2）');
    expect(markdown).toContain('当前作品写作模板');
    expect(markdown).toContain('关系总数: 1');
    expect(markdown).toContain('关联 → 药老（师徒关系）');
  });

  it('builds json export payload with stats and relations', () => {
    const payload = buildJsonExportPayload({
      selectedWorldId: 'w1',
      currentWorld: { name: '斗气大陆' },
      selectedBookId: 'b1',
      currentBook: { title: '第一卷' },
      normalizedQuery: '药',
      entityTypeFilter: 'character',
      entityTagFilter: '人物',
      entities: [{ id: 'e1', name: '药老', type: 'character', tags: ['人物'] }],
      scopedRelations: [{ fromEntityId: 'e1', toEntityId: 'e1', type: 'related_to' }],
      typeLabels: { character: '人物', other: '其他' }
    });

    expect(payload.version).toBe('v2');
    expect(payload.stats.entityCount).toBe(1);
    expect(payload.stats.relationCount).toBe(1);
    expect(payload.relations).toHaveLength(1);
    expect(payload.scope.bookId).toBe('b1');
  });
});
