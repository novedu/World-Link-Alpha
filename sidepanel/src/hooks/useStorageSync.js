/* global chrome */

import { useCallback, useEffect, useRef, useState } from 'react';
import { worldService } from '../services/world.service.ts';
import { captureService } from '../services/capture.service.ts';
import { bookService } from '../services/book.service.ts';
import { entityService } from '../services/entity.service.ts';
import { getToken } from '../lib/http/token';

function isAuthError(error) {
  const status = Number(error?.status || 0);
  const code = String(error?.code || '').trim().toUpperCase();
  const message = String(error?.message || '').toLowerCase();
  return (
    status === 401 ||
    code === 'MISSING_TOKEN' ||
    code === 'INVALID_TOKEN' ||
    code === 'AUTH_ERROR' ||
    message.includes('未提供认证令牌') ||
    message.includes('令牌无效') ||
    message.includes('401')
  );
}

function mapCaptureRecord(capture) {
  return {
    id: capture.id,
    text: capture.text,
    timestamp: new Date(capture.createdAt).getTime(),
    sourceUrl: capture.sourceUrl || '',
    sourceTitle: capture.sourceTitle || '',
    count: 1,
    isPinned: false,
    status: capture.status || 'inbox',
    statusUpdatedAt: new Date(capture.updatedAt).getTime(),
    entityId: capture.entityId || ''
  };
}

function extractBookEntityUsages(entities) {
  const result = [];
  const seen = new Set();
  (Array.isArray(entities) ? entities : []).forEach((entity) => {
    const entityId = String(entity?.id || '').trim();
    if (!entityId) return;

    const usages = Array.isArray(entity?.usages) ? entity.usages : [];
    usages.forEach((usage) => {
      const usageId = String(usage?.id || '').trim();
      const bookId = String(usage?.bookId || usage?.book?.id || '').trim();
      if (!bookId) return;
      const dedupKey = `${bookId}::${entityId}`;
      if (seen.has(dedupKey)) return;
      seen.add(dedupKey);
      result.push({
        id: usageId || dedupKey,
        bookId,
        entityId,
        createdAt: usage?.createdAt ? new Date(usage.createdAt).getTime() : Date.now()
      });
    });
  });

  return result;
}

export function useStorageSync({ setSelectedWorldId, setSelectedBookId }) {
  const [capturedList, setCapturedList] = useState([]);
  const [worlds, setWorlds] = useState([]);
  const [books, setBooks] = useState([]);
  const [entities, setEntities] = useState([]);
  const [bookEntityUsages, setBookEntityUsages] = useState([]);
  const [entityRelations, setEntityRelations] = useState([]);
  const [highlightedCaptureId, setHighlightedCaptureId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authRequired, setAuthRequired] = useState(false);

  const highlightedTimeoutRef = useRef(null);
  const refreshIntervalRef = useRef(null);
  const loadSeqRef = useRef(0);

  const syncWorlds = useCallback((nextWorlds) => {
    const safeWorlds = Array.isArray(nextWorlds) ? nextWorlds : [];
    setWorlds(safeWorlds);
    setSelectedWorldId((prev) => {
      if (!safeWorlds.length) {
        setSelectedBookId('');
        return '';
      }
      if (safeWorlds.some((world) => world.id === prev)) return prev;
      setSelectedBookId('');
      return safeWorlds[0].id;
    });
  }, [setSelectedBookId, setSelectedWorldId]);

  const loadData = useCallback(async () => {
    const seq = ++loadSeqRef.current;
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();

      if (!token) {
        if (seq !== loadSeqRef.current) return;
        syncWorlds([]);
        setCapturedList([]);
        setBooks([]);
        setEntities([]);
        setBookEntityUsages([]);
        setEntityRelations([]);
        setAuthRequired(true);
        return { status: 'auth_required' };
      }

      const [worldsResponse, capturesResponse] = await Promise.all([
        worldService.getWorlds(),
        captureService.getCaptures()
      ]);

      const nextWorlds = worldsResponse?.success && Array.isArray(worldsResponse.data) ? worldsResponse.data : [];
      const nextCaptures =
        capturesResponse?.success && Array.isArray(capturesResponse.data)
          ? capturesResponse.data.map(mapCaptureRecord)
          : [];

      const worldIds = nextWorlds.map((world) => String(world.id || '').trim()).filter(Boolean);
      const [bookBuckets, entityBuckets, relationBuckets] = await Promise.all([
        Promise.all(
          worldIds.map(async (worldId) => {
            try {
              const result = await bookService.getBooks(worldId);
              return result?.success && Array.isArray(result.data) ? result.data : [];
            } catch {
              return [];
            }
          })
        ),
        Promise.all(
          worldIds.map(async (worldId) => {
            try {
              const result = await entityService.getEntities(worldId);
              return result?.success && Array.isArray(result.data) ? result.data : [];
            } catch {
              return [];
            }
          })
        ),
        Promise.all(
          worldIds.map(async (worldId) => {
            try {
              const result = await entityService.getRelations(worldId);
              return result?.success && Array.isArray(result.data) ? result.data : [];
            } catch {
              return [];
            }
          })
        )
      ]);

      if (seq !== loadSeqRef.current) return { status: 'ignored' };

      syncWorlds(nextWorlds);
      setCapturedList(nextCaptures);

      const mergedBooks = bookBuckets.flat();
      const mergedEntities = entityBuckets.flat();
      const mergedRelations = relationBuckets.flat();
      setBooks(mergedBooks);
      setEntities(mergedEntities);
      setBookEntityUsages(extractBookEntityUsages(mergedEntities));
      setEntityRelations(mergedRelations);
      setError(null);
      setAuthRequired(false);
      return { status: 'success' };
    } catch (err) {
      if (seq !== loadSeqRef.current) return { status: 'ignored' };
      console.error('[Sidepanel] API 加载失败:', err);
      if (isAuthError(err)) {
        syncWorlds([]);
        setCapturedList([]);
        setBooks([]);
        setEntities([]);
        setBookEntityUsages([]);
        setEntityRelations([]);
        setAuthRequired(true);
        setError(null);
        return { status: 'auth_required' };
      } else {
        setAuthRequired(false);
        const message = '加载数据失败，请稍后重试';
        setError(message);
        return { status: 'error', message };
      }
    } finally {
      if (seq === loadSeqRef.current) {
        setLoading(false);
      }
    }
  }, [syncWorlds]);

  useEffect(() => {
    const resetRefreshInterval = () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      refreshIntervalRef.current = setInterval(() => {
        void loadData();
      }, 30000);
    };

    const maybeHighlightLatestCapture = (newCapture) => {
      const captureId = String(newCapture?.id || '').trim();
      if (!captureId) return;
      setHighlightedCaptureId(captureId);
      if (highlightedTimeoutRef.current) clearTimeout(highlightedTimeoutRef.current);
      highlightedTimeoutRef.current = setTimeout(() => setHighlightedCaptureId(null), 1800);
    };

    void loadData();
    resetRefreshInterval();

    const messageHandler = (message) => {
      if (message.type === 'CAPTURE_ADDED') {
        void loadData();
        maybeHighlightLatestCapture(message.data);
        resetRefreshInterval();
      } else if (message.type === 'DATA_UPDATED' || message.type === 'SYNC_DATA') {
        void loadData();
        resetRefreshInterval();
      }
    };

    chrome.runtime.onMessage.addListener(messageHandler);

    return () => {
      chrome.runtime.onMessage.removeListener(messageHandler);
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
      if (highlightedTimeoutRef.current) clearTimeout(highlightedTimeoutRef.current);
    };
  }, [loadData]);

  return {
    capturedList,
    worlds,
    books,
    entities,
    bookEntityUsages,
    entityRelations,
    highlightedCaptureId,
    loading,
    error,
    authRequired,
    reloadData: loadData
  };
}
