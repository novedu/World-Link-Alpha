import { useState } from 'react';

export function useSelectionState() {
  const [selectedWorldId, setSelectedWorldId] = useState('');
  const [selectedBookId, setSelectedBookId] = useState('');

  const selectWorld = (worldId) => {
    setSelectedWorldId(worldId);
    setSelectedBookId('');
  };

  const selectBook = (bookId) => {
    setSelectedBookId(bookId);
  };

  return {
    selectedWorldId,
    setSelectedWorldId,
    selectedBookId,
    setSelectedBookId,
    selectWorld,
    selectBook
  };
}
