export function useWorldBookSelectionHandlers({
  selectWorld,
  selectBook,
  setEditingEntity,
  setEntityTagFilter,
  setEntitySearchQuery
}) {
  const handleSelectWorld = (worldId) => {
    selectWorld(worldId);
    setEditingEntity(null);
    setEntityTagFilter('');
    setEntitySearchQuery('');
  };

  const handleSelectBook = (bookId) => {
    selectBook(bookId);
    setEditingEntity(null);
  };

  return {
    handleSelectWorld,
    handleSelectBook
  };
}
