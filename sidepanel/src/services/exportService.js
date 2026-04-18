export function downloadTextFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function buildTypeDistribution(entities, typeLabels) {
  return entities.reduce((acc, entity) => {
    const key = typeLabels[entity.type] || typeLabels.other;
    acc[key] = Number(acc[key] || 0) + 1;
    return acc;
  }, {});
}

function normalizeScopedRelations(relations) {
  return (Array.isArray(relations) ? relations : [])
    .map((relation) => ({
      fromEntityId: String(relation?.fromEntityId || '').trim(),
      toEntityId: String(relation?.toEntityId || '').trim(),
      type: String(relation?.type || 'related_to').trim() || 'related_to',
      note: String(relation?.note || '').trim()
    }))
    .filter((relation) => relation.fromEntityId && relation.toEntityId);
}

export function buildMarkdownExport({
  entities,
  scopeLabel,
  typeLabels,
  parseTags,
  relationLabels = {},
  scopedRelations = [],
  isBookScoped = false
}) {
  const relationRows = normalizeScopedRelations(scopedRelations);
  const grouped = entities.reduce((acc, entity) => {
    const key = typeLabels[entity.type] || typeLabels.other;
    if (!acc[key]) acc[key] = [];
    acc[key].push(entity);
    return acc;
  }, {});

  const entityNameMap = new Map(entities.map((entity) => [entity.id, entity.name || '未命名设定']));
  const typeDistribution = buildTypeDistribution(entities, typeLabels);
  const relationTypeDistribution = relationRows.reduce((acc, relation) => {
    const label = relationLabels[relation.type] || relation.type;
    acc[label] = Number(acc[label] || 0) + 1;
    return acc;
  }, {});
  const nowLabel = new Date().toLocaleString('zh-CN', { hour12: false });

  const lines = [
    `# World-Link 导出（v2）`,
    '',
    `- 导出范围: ${scopeLabel}`,
    `- 导出时间: ${nowLabel}`,
    `- 设定总数: ${entities.length}`,
    `- 关系总数: ${relationRows.length}`,
    ''
  ];

  lines.push('## 结构概览');
  Object.entries(typeDistribution).forEach(([label, count]) => {
    lines.push(`- ${label}: ${count}`);
  });
  if (Object.keys(relationTypeDistribution).length > 0) {
    lines.push('- 关系分布:');
    Object.entries(relationTypeDistribution).forEach(([label, count]) => {
      lines.push(`  - ${label}: ${count}`);
    });
  }
  lines.push('');

  if (isBookScoped) {
    lines.push('## 当前作品写作模板');
    lines.push('- 关键设定清单：');
    entities.slice(0, 12).forEach((entity) => {
      lines.push(`  - [ ] ${entity.name || '未命名设定'}（${typeLabels[entity.type] || typeLabels.other}）`);
    });
    lines.push('- 关系核对清单：');
    lines.push('  - [ ] 主要人物关系与章节描写一致');
    lines.push('  - [ ] 势力归属与冲突线保持一致');
    lines.push('  - [ ] 关键道具/矿石前后状态一致');
    lines.push('');
  }

  Object.keys(grouped).forEach((groupName) => {
    lines.push(`## ${groupName}（${grouped[groupName].length}）`);
    grouped[groupName].forEach((entity) => {
      const tags = parseTags(entity.tags);
      const outboundRelations = relationRows.filter((relation) => relation.fromEntityId === entity.id).slice(0, 6);
      lines.push(`### ${entity.name}`);
      if (entity.summary) lines.push(entity.summary);
      if (tags.length > 0) lines.push(`标签: ${tags.join(' / ')}`);
      if (outboundRelations.length > 0) {
        lines.push('关系:');
        outboundRelations.forEach((relation) => {
          const targetName = entityNameMap.get(relation.toEntityId) || relation.toEntityId;
          const relationLabel = relationLabels[relation.type] || relation.type;
          const noteSuffix = relation.note ? `（${relation.note}）` : '';
          lines.push(`- ${relationLabel} → ${targetName}${noteSuffix}`);
        });
      }
      if (entity.sourceUrl) lines.push(`来源: ${entity.sourceUrl}`);
      lines.push('');
    });
  });

  return lines.join('\n');
}

export function buildExportFilename({ worldName, selectedBookId, timestamp, format }) {
  const scopePart = selectedBookId ? `book-${selectedBookId}` : 'world';
  const ext = format === 'json' ? 'json' : 'md';
  return `${worldName}-${scopePart}-${timestamp}.${ext}`;
}

export function buildJsonExportPayload({
  version = 'v2',
  selectedWorldId,
  currentWorld,
  selectedBookId,
  currentBook,
  normalizedQuery,
  entityTypeFilter,
  entityTagFilter,
  entities,
  scopedRelations = [],
  typeLabels = {}
}) {
  const relationRows = normalizeScopedRelations(scopedRelations);
  const typeDistribution = buildTypeDistribution(entities, typeLabels);
  const relationTypeDistribution = relationRows.reduce((acc, relation) => {
    const key = relation.type || 'related_to';
    acc[key] = Number(acc[key] || 0) + 1;
    return acc;
  }, {});

  return {
    version,
    exportedAt: new Date().toISOString(),
    scope: {
      worldId: selectedWorldId,
      worldName: currentWorld?.name || '',
      bookId: selectedBookId || null,
      bookTitle: currentBook?.title || null,
      filters: {
        search: normalizedQuery || null,
        type: entityTypeFilter === 'all' ? null : entityTypeFilter,
        tag: entityTagFilter || null
      }
    },
    stats: {
      entityCount: entities.length,
      relationCount: relationRows.length,
      typeDistribution,
      relationTypeDistribution
    },
    relations: relationRows,
    entities
  };
}
