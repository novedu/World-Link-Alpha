import { useMemo } from 'react';

export function useEntityFilters({
  worlds,
  books,
  entities,
  bookEntityUsages,
  selectedWorldId,
  selectedBookId,
  entitySearchQuery,
  entityTypeFilter,
  entityTagFilter,
  baseTagOptions,
  typeLabels,
  parseTags
}) {
  const currentWorld = useMemo(
    () => worlds.find((world) => world.id === selectedWorldId) || null,
    [worlds, selectedWorldId]
  );

  const currentBook = useMemo(
    () => books.find((book) => book.id === selectedBookId) || null,
    [books, selectedBookId]
  );

  const booksInWorld = useMemo(
    () => books.filter((book) => book.worldId === selectedWorldId),
    [books, selectedWorldId]
  );

  const entitiesInWorld = useMemo(
    () => entities.filter((entity) => entity.worldId === selectedWorldId),
    [entities, selectedWorldId]
  );

  const usagesForCurrentBook = useMemo(
    () => (selectedBookId ? bookEntityUsages.filter((usage) => usage.bookId === selectedBookId) : []),
    [bookEntityUsages, selectedBookId]
  );

  const entityIdsUsedInCurrentBook = useMemo(
    () => new Set(usagesForCurrentBook.map((usage) => usage.entityId)),
    [usagesForCurrentBook]
  );

  const entitiesInContext = useMemo(() => {
    if (!selectedWorldId) return [];
    if (!selectedBookId) return entitiesInWorld;
    return entitiesInWorld.filter((entity) => entityIdsUsedInCurrentBook.has(entity.id));
  }, [selectedWorldId, selectedBookId, entitiesInWorld, entityIdsUsedInCurrentBook]);

  const normalizedQuery = useMemo(() => entitySearchQuery.trim().toLowerCase(), [entitySearchQuery]);

  const entitiesForView = useMemo(() => {
    let scopedEntities = entitiesInContext;

    if (entityTypeFilter !== 'all') {
      scopedEntities = scopedEntities.filter((entity) => (entity.type || 'other') === entityTypeFilter);
    }

    if (entityTagFilter) {
      scopedEntities = scopedEntities.filter((entity) => parseTags(entity.tags).includes(entityTagFilter));
    }

    if (!normalizedQuery) return scopedEntities;
    return scopedEntities.filter((entity) => {
      const name = String(entity.name || '').toLowerCase();
      const summary = String(entity.summary || '').toLowerCase();
      return name.includes(normalizedQuery) || summary.includes(normalizedQuery);
    });
  }, [entitiesInContext, entityTypeFilter, entityTagFilter, normalizedQuery, parseTags]);

  const availableTagOptions = useMemo(() => {
    const dynamicTags = entitiesInContext.flatMap((entity) => parseTags(entity.tags));
    return [...new Set([...baseTagOptions, ...dynamicTags])].sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
  }, [entitiesInContext, baseTagOptions, parseTags]);

  const distributionRows = useMemo(() => {
    const typeDistribution = entitiesInContext.reduce((acc, entity) => {
      const key = entity.type || 'other';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(typeDistribution)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({ type, label: typeLabels[type] || typeLabels.other, count }));
  }, [entitiesInContext, typeLabels]);

  const recentEntities = useMemo(
    () =>
      [...entitiesInContext]
        .sort((a, b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0))
        .slice(0, 6),
    [entitiesInContext]
  );

  return {
    currentWorld,
    currentBook,
    booksInWorld,
    entitiesInWorld,
    entitiesInContext,
    entitiesForView,
    availableTagOptions,
    normalizedQuery,
    entityIdsUsedInCurrentBook,
    distributionRows,
    recentEntities
  };
}
