import { useMemo } from 'react';

export function useOverviewStats({
  worlds,
  books,
  booksInWorld,
  selectedWorldId,
  selectedBookId,
  entitiesInContext,
  capturedList,
  relationCount
}) {
  const overviewStats = useMemo(
    () => [
      { id: 'worlds', label: '世界数量', value: worlds.length },
      { id: 'books', label: selectedWorldId ? '当前世界书数' : '书项目总数', value: selectedWorldId ? booksInWorld.length : books.length },
      { id: 'entities', label: selectedBookId ? '本书实体' : '世界实体', value: entitiesInContext.length },
      { id: 'captures', label: '捕获记录', value: capturedList.length },
      {
        id: 'relations',
        label: selectedBookId ? '本书关系' : selectedWorldId ? '世界关系' : '关系总数',
        value: relationCount
      }
    ],
    [
      books.length,
      booksInWorld.length,
      capturedList.length,
      entitiesInContext.length,
      relationCount,
      selectedBookId,
      selectedWorldId,
      worlds.length
    ]
  );

  return {
    overviewStats
  };
}
