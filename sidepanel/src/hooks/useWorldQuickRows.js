import { useMemo } from 'react';

export function useWorldQuickRows({ worlds, books, entities, entityRelations }) {
  return useMemo(() => {
    const booksByWorldId = books.reduce((acc, book) => {
      const key = String(book.worldId || '');
      if (!key) return acc;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const entitiesByWorldId = entities.reduce((acc, entity) => {
      const key = String(entity.worldId || '');
      if (!key) return acc;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const relationsByWorldId = entityRelations.reduce((acc, relation) => {
      const key = String(relation.worldId || '');
      if (!key) return acc;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return worlds
      .map((world) => ({
        worldId: world.id,
        worldName: world.name || '未命名世界',
        books: booksByWorldId[world.id] || 0,
        entities: entitiesByWorldId[world.id] || 0,
        relations: relationsByWorldId[world.id] || 0
      }))
      .sort((a, b) => b.relations - a.relations || b.entities - a.entities || b.books - a.books)
      .slice(0, 6);
  }, [books, entities, entityRelations, worlds]);
}
