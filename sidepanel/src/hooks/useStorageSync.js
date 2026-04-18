/* global chrome */

import { useEffect, useRef, useState } from 'react';
import { worldService } from '../services/world.service';
import { captureService } from '../services/capture.service';
import { bookService } from '../services/book.service';
import { entityService } from '../services/entity.service';

export function useStorageSync({ setSelectedWorldId }) {
  const [capturedList, setCapturedList] = useState([]);
  const [worlds, setWorlds] = useState([]);
  const [books, setBooks] = useState([]);
  const [entities, setEntities] = useState([]);
  const [bookEntityUsages, setBookEntityUsages] = useState([]);
  const [entityRelations, setEntityRelations] = useState([]);
  const [highlightedCaptureId, setHighlightedCaptureId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const highlightedTimeoutRef = useRef(null);
  const refreshIntervalRef = useRef(null);

  useEffect(() => {
    const syncWorlds = (nextWorlds) => {
      setWorlds(nextWorlds);
      if (nextWorlds.length > 0) {
        setSelectedWorldId((prev) => prev || nextWorlds[0].id);
      }
    };

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // 从 API 获取数据
        const worldsResponse = await worldService.getWorlds();
        
        if (worldsResponse.success) {
          syncWorlds(worldsResponse.data);
        }
        
        // 获取捕获列表
        const capturesResponse = await captureService.getCaptures();
        if (capturesResponse.success) {
          // 转换后端返回的捕获记录格式为前端期望的格式
          const formattedCaptures = capturesResponse.data.map(capture => ({
            id: capture.id,
            text: capture.text,
            timestamp: new Date(capture.createdAt).getTime(),
            sourceUrl: capture.sourceUrl || '',
            sourceTitle: capture.sourceTitle || '',
            count: 1,
            isPinned: false,
            status: capture.status || 'inbox',
            statusUpdatedAt: new Date(capture.updatedAt).getTime()
          }));
          setCapturedList(formattedCaptures);
        }
        
        // 只有当有世界时才获取书籍和实体
        if (worldsResponse.success && worldsResponse.data.length > 0) {
          const firstWorldId = worldsResponse.data[0].id;
          
          // 获取书籍列表
          const booksResponse = await bookService.getBooks(firstWorldId);
          if (booksResponse.success) {
            setBooks(booksResponse.data);
          }
          
          // 获取实体列表
          const entitiesResponse = await entityService.getEntities(firstWorldId);
          if (entitiesResponse.success) {
            setEntities(entitiesResponse.data);
          }
        }
      } catch (err) {
        console.error('[Sidepanel] API 加载失败:', err);
        
        // 检查错误类型，如果是认证错误或网络错误，不显示错误信息，直接回退到本地存储
        const isAuthError = err.message?.includes('未提供认证令牌') || err.message?.includes('401');
        const isNetworkError = err.message?.includes('网络异常') || err.message?.includes('timeout');
        
        if (!isAuthError && !isNetworkError) {
          setError('加载数据失败，请刷新页面重试');
        }
        
        // 回退到本地存储
        try {
          const STORAGE_KEYS = ['capturedList', 'worlds', 'books', 'entities', 'bookEntityUsages', 'entityRelations'];
          chrome.storage.local.get(STORAGE_KEYS, (result) => {
            if (Array.isArray(result.capturedList)) setCapturedList(result.capturedList);
            if (Array.isArray(result.worlds)) syncWorlds(result.worlds);
            if (Array.isArray(result.books)) setBooks(result.books);
            if (Array.isArray(result.entities)) setEntities(result.entities);
            if (Array.isArray(result.bookEntityUsages)) setBookEntityUsages(result.bookEntityUsages);
            if (Array.isArray(result.entityRelations)) setEntityRelations(result.entityRelations);
          });
        } catch (localError) {
          console.error('[Sidepanel] 本地存储加载失败:', localError);
          // 只有当本地存储也失败时才显示错误信息
          setError('加载数据失败，请刷新页面重试');
        }
      } finally {
        setLoading(false);
      }
    };

    const resetRefreshInterval = () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      // 重置 30 秒自动刷新
      refreshIntervalRef.current = setInterval(loadData, 30000);
    };

    const maybeHighlightLatestCapture = (newCapture) => {
      if (!newCapture) return;
      setHighlightedCaptureId(newCapture.text);
      if (highlightedTimeoutRef.current) clearTimeout(highlightedTimeoutRef.current);
      highlightedTimeoutRef.current = setTimeout(() => setHighlightedCaptureId(null), 1800);
    };

    // 初始加载
    loadData();

    // 定期刷新数据
    resetRefreshInterval();

    // 监听消息，当有新的捕获时刷新数据
    const messageHandler = (message) => {
      if (message.type === 'CAPTURE_ADDED') {
        loadData();
        maybeHighlightLatestCapture(message.data);
        // 创建捕获后重置自动刷新时间
        resetRefreshInterval();
      } else if (message.type === 'DATA_UPDATED') {
        loadData();
        // 数据更新后重置自动刷新时间
        resetRefreshInterval();
      }
    };

    chrome.runtime.onMessage.addListener(messageHandler);

    return () => {
      chrome.runtime.onMessage.removeListener(messageHandler);
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
      if (highlightedTimeoutRef.current) clearTimeout(highlightedTimeoutRef.current);
    };
  }, [setSelectedWorldId]);

  return {
    capturedList,
    worlds,
    books,
    entities,
    bookEntityUsages,
    entityRelations,
    highlightedCaptureId,
    loading,
    error
  };
}
