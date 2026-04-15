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

export function buildMarkdownExport(entities, scopeLabel, typeLabels, parseTags) {
  const grouped = entities.reduce((acc, entity) => {
    const key = typeLabels[entity.type] || typeLabels.other;
    if (!acc[key]) acc[key] = [];
    acc[key].push(entity);
    return acc;
  }, {});

  const lines = [`# World-Link 导出`, '', `- 导出范围: ${scopeLabel}`, `- 实体总数: ${entities.length}`, ''];

  Object.keys(grouped).forEach((groupName) => {
    lines.push(`## ${groupName}`);
    grouped[groupName].forEach((entity) => {
      const tags = parseTags(entity.tags);
      lines.push(`### ${entity.name}`);
      if (entity.summary) lines.push(entity.summary);
      if (tags.length > 0) lines.push(`标签: ${tags.join(' / ')}`);
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
  selectedWorldId,
  currentWorld,
  selectedBookId,
  currentBook,
  normalizedQuery,
  entityTypeFilter,
  entityTagFilter,
  entities
}) {
  return {
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
    entities
  };
}
