import { useMemo } from 'react';

function buildRelationRows(relations, relationLabels, entityNameById, previewLimit = 10, graphLimit = 48) {
  const scopedRelations = Array.isArray(relations) ? relations : [];
  const typeCounter = scopedRelations.reduce((acc, relation) => {
    const type = relation.type || 'related_to';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const typeRows = Object.entries(typeCounter)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({
      type,
      count,
      label: relationLabels[type] || type
    }));

  const sortedRelations = [...scopedRelations].sort(
    (a, b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0)
  );

  const previewRows = sortedRelations.slice(0, previewLimit).map((relation) => ({
    ...relation,
    fromName: entityNameById.get(relation.fromEntityId) || '未知设定',
    toName: entityNameById.get(relation.toEntityId) || '未知设定',
    typeLabel: relationLabels[relation.type] || relation.type || '关联'
  }));

  const graphEdges = sortedRelations.slice(0, graphLimit).map((relation) => ({
    ...relation,
    fromName: entityNameById.get(relation.fromEntityId) || '未知设定',
    toName: entityNameById.get(relation.toEntityId) || '未知设定',
    typeLabel: relationLabels[relation.type] || relation.type || '关联'
  }));

  return {
    relationCount: scopedRelations.length,
    relationTypeRows: typeRows,
    relationPreviewRows: previewRows,
    relationGraphEdges: graphEdges
  };
}

const EMPTY_RELATION_ROWS = {
  relationCount: 0,
  relationTypeRows: [],
  relationPreviewRows: [],
  relationGraphEdges: []
};

export function useEntityFilters({
  worlds,
  books,
  entities,
  bookEntityUsages,
  entityRelations,
  selectedWorldId,
  selectedBookId,
  entitySearchQuery,
  entityTypeFilter,
  entityTagFilter,
  baseTagOptions,
  typeLabels,
  relationLabels,
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

  const entityNameById = useMemo(() => {
    const map = new Map();
    entitiesInWorld.forEach((entity) => {
      map.set(entity.id, entity.name || '未命名设定');
    });
    return map;
  }, [entitiesInWorld]);

  const relationsInWorld = useMemo(() => {
    if (!selectedWorldId) return [];
    return entityRelations.filter((relation) => relation.worldId === selectedWorldId);
  }, [entityRelations, selectedWorldId]);

  const relationsInBook = useMemo(() => {
    if (!selectedBookId) return [];
    return relationsInWorld.filter(
      (relation) => entityIdsUsedInCurrentBook.has(relation.fromEntityId) && entityIdsUsedInCurrentBook.has(relation.toEntityId)
    );
  }, [relationsInWorld, selectedBookId, entityIdsUsedInCurrentBook]);

  const worldRelationRows = useMemo(
    () => buildRelationRows(relationsInWorld, relationLabels, entityNameById),
    [relationsInWorld, relationLabels, entityNameById]
  );
  const bookRelationRows = useMemo(
    () => buildRelationRows(relationsInBook, relationLabels, entityNameById),
    [relationsInBook, relationLabels, entityNameById]
  );

  const relationsInContext = selectedBookId ? relationsInBook : relationsInWorld;
  const relationTypeRows = selectedBookId ? bookRelationRows.relationTypeRows : worldRelationRows.relationTypeRows;
  const relationPreviewRows = selectedBookId ? bookRelationRows.relationPreviewRows : worldRelationRows.relationPreviewRows;
  const relationGraphEdges = selectedBookId ? bookRelationRows.relationGraphEdges : worldRelationRows.relationGraphEdges;
  const relationCount = selectedBookId ? bookRelationRows.relationCount : worldRelationRows.relationCount;

  const bookRelationRowsByBookId = useMemo(() => {
    if (!selectedWorldId || booksInWorld.length === 0) return {};

    const usageEntityIdsByBookId = {};
    booksInWorld.forEach((book) => {
      usageEntityIdsByBookId[book.id] = new Set();
    });

    bookEntityUsages.forEach((usage) => {
      const set = usageEntityIdsByBookId[usage.bookId];
      if (set) {
        set.add(usage.entityId);
      }
    });

    return booksInWorld.reduce((acc, book) => {
      const targetIds = usageEntityIdsByBookId[book.id] || new Set();
      const scopedRelations = relationsInWorld.filter(
        (relation) => targetIds.has(relation.fromEntityId) && targetIds.has(relation.toEntityId)
      );
      acc[book.id] = buildRelationRows(scopedRelations, relationLabels, entityNameById);
      return acc;
    }, {});
  }, [selectedWorldId, booksInWorld, bookEntityUsages, relationsInWorld, relationLabels, entityNameById]);

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
    recentEntities,
    relationsInContext,
    relationsInWorld,
    relationsInBook,
    relationCount,
    relationTypeRows,
    relationPreviewRows,
    relationGraphEdges,
    worldRelationRows,
    bookRelationRows,
    bookRelationRowsByBookId,
    emptyRelationRows: EMPTY_RELATION_ROWS
  };
}
