import { useMemo } from 'react';

export function useWorldBookMeta({ worlds, books, selectedWorldId, booksInWorld }) {
  const worldBookHeaderMeta = useMemo(() => {
    if (!selectedWorldId) {
      return `共 ${worlds.length} 个世界 · ${books.length} 个书项目`;
    }
    return `共 ${worlds.length} 个世界 · 当前世界 ${booksInWorld.length} 个书项目`;
  }, [books.length, booksInWorld.length, selectedWorldId, worlds.length]);

  return {
    worldBookHeaderMeta
  };
}
