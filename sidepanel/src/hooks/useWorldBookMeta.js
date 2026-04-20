import { useMemo } from 'react';

export function useWorldBookMeta({ worlds, books, selectedWorldId, booksInWorld }) {
  const worldBookHeaderMeta = useMemo(() => {
    if (!selectedWorldId) {
      return `世界 ${worlds.length} · 作品 ${books.length}`;
    }
    return `世界 ${worlds.length} · 当前 ${booksInWorld.length} 作品`;
  }, [books.length, booksInWorld.length, selectedWorldId, worlds.length]);

  return {
    worldBookHeaderMeta
  };
}
