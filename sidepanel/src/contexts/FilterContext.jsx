import React, { createContext, useContext, useState, useCallback } from 'react';

// 定义 FilterContext 的类型
const FilterContext = createContext({
  // 实体过滤状态
  entitySearchQuery: '',
  entityTypeFilter: 'all',
  entityTagFilter: '',
  
  // 捕获过滤状态
  captureStatusFilter: 'all',
  captureSourceFilter: 'all',
  captureTimeFilter: 'all',
  
  // 概览过滤状态
  overviewRelationScope: 'book',
  overviewBookGraphId: '',
  
  // 操作
  setEntitySearchQuery: (query) => {},
  setEntityTypeFilter: (filter) => {},
  setEntityTagFilter: (filter) => {},
  clearEntityFilters: () => {},
  setCaptureStatusFilter: (filter) => {},
  setCaptureSourceFilter: (filter) => {},
  setCaptureTimeFilter: (filter) => {},
  clearCaptureFilters: () => {},
  setOverviewRelationScope: (scope) => {},
  setOverviewBookGraphId: (bookId) => {},
});

// 提供者组件
export function FilterProvider({ children, initialFilters = {} }) {
  // 实体过滤状态
  const [entitySearchQuery, setEntitySearchQuery] = useState(initialFilters.entitySearchQuery || '');
  const [entityTypeFilter, setEntityTypeFilter] = useState(initialFilters.entityTypeFilter || 'all');
  const [entityTagFilter, setEntityTagFilter] = useState(initialFilters.entityTagFilter || '');
  
  // 捕获过滤状态
  const [captureStatusFilter, setCaptureStatusFilter] = useState(initialFilters.captureStatusFilter || 'all');
  const [captureSourceFilter, setCaptureSourceFilter] = useState(initialFilters.captureSourceFilter || 'all');
  const [captureTimeFilter, setCaptureTimeFilter] = useState(initialFilters.captureTimeFilter || 'all');
  
  // 概览过滤状态
  const [overviewRelationScope, setOverviewRelationScope] = useState(initialFilters.overviewRelationScope || 'book');
  const [overviewBookGraphId, setOverviewBookGraphId] = useState(initialFilters.overviewBookGraphId || '');

  // 操作函数
  const clearEntityFilters = useCallback(() => {
    setEntitySearchQuery('');
    setEntityTypeFilter('all');
    setEntityTagFilter('');
  }, []);

  const clearCaptureFilters = useCallback(() => {
    setCaptureStatusFilter('all');
    setCaptureSourceFilter('all');
    setCaptureTimeFilter('all');
  }, []);

  // 上下文值
  const contextValue = {
    // 实体过滤状态
    entitySearchQuery,
    entityTypeFilter,
    entityTagFilter,
    
    // 捕获过滤状态
    captureStatusFilter,
    captureSourceFilter,
    captureTimeFilter,
    
    // 概览过滤状态
    overviewRelationScope,
    overviewBookGraphId,
    
    // 操作
    setEntitySearchQuery,
    setEntityTypeFilter,
    setEntityTagFilter,
    clearEntityFilters,
    setCaptureStatusFilter,
    setCaptureSourceFilter,
    setCaptureTimeFilter,
    clearCaptureFilters,
    setOverviewRelationScope,
    setOverviewBookGraphId,
  };

  return (
    <FilterContext.Provider value={contextValue}>
      {children}
    </FilterContext.Provider>
  );
}

// 自定义 hook，用于使用 FilterContext
export function useFilter() {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilter must be used within a FilterProvider');
  }
  return context;
}

export default FilterContext;