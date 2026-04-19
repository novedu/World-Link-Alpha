import React, { createContext, useContext, useState, useCallback } from 'react';

// 定义 WorldBookContext 的类型
const WorldBookContext = createContext({
  // 状态
  worlds: [],
  books: [],
  selectedWorldId: '',
  selectedBookId: '',
  currentWorld: null,
  currentBook: null,
  booksInWorld: [],
  
  // 操作
  selectWorld: (worldId) => {},
  selectBook: (bookId) => {},
  addWorld: (world) => {},
  addBook: (book) => {},
  setSelectedWorldId: (worldId) => {},
  setSelectedBookId: (bookId) => {},
});

// 提供者组件
export function WorldBookProvider({ children, initialWorlds = [], initialBooks = [], initialSelectedWorldId = '', initialSelectedBookId = '' }) {
  // 状态
  const [worlds, setWorlds] = useState(initialWorlds);
  const [books, setBooks] = useState(initialBooks);
  const [selectedWorldId, setSelectedWorldId] = useState(initialSelectedWorldId);
  const [selectedBookId, setSelectedBookId] = useState(initialSelectedBookId);

  // 计算当前选中的 world 和 book
  const currentWorld = worlds.find(world => world.id === selectedWorldId) || null;
  const currentBook = books.find(book => book.id === selectedBookId) || null;
  const booksInWorld = books.filter(book => book.worldId === selectedWorldId);

  // 操作函数
  const selectWorld = useCallback((worldId) => {
    setSelectedWorldId(worldId);
    setSelectedBookId(''); // 切换世界时清空选中的书籍
  }, []);

  const selectBook = useCallback((bookId) => {
    setSelectedBookId(bookId);
  }, []);

  const addWorld = useCallback((world) => {
    setWorlds(prevWorlds => [...prevWorlds, world]);
    setSelectedWorldId(world.id);
  }, []);

  const addBook = useCallback((book) => {
    setBooks(prevBooks => [...prevBooks, book]);
    setSelectedBookId(book.id);
  }, []);

  // 上下文值
  const contextValue = {
    worlds,
    books,
    selectedWorldId,
    selectedBookId,
    currentWorld,
    currentBook,
    booksInWorld,
    selectWorld,
    selectBook,
    addWorld,
    addBook,
    setSelectedWorldId,
    setSelectedBookId,
  };

  return (
    <WorldBookContext.Provider value={contextValue}>
      {children}
    </WorldBookContext.Provider>
  );
}

// 自定义 hook，用于使用 WorldBookContext
export function useWorldBook() {
  const context = useContext(WorldBookContext);
  if (!context) {
    throw new Error('useWorldBook must be used within a WorldBookProvider');
  }
  return context;
}

export default WorldBookContext;