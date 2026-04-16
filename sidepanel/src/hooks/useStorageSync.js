/* global chrome */

import { useEffect, useRef, useState } from 'react';

const STORAGE_KEYS = ['capturedList', 'worlds', 'books', 'entities', 'bookEntityUsages', 'entityRelations'];

export function useStorageSync({ setSelectedWorldId }) {
  const [capturedList, setCapturedList] = useState([]);
  const [worlds, setWorlds] = useState([]);
  const [books, setBooks] = useState([]);
  const [entities, setEntities] = useState([]);
  const [bookEntityUsages, setBookEntityUsages] = useState([]);
  const [entityRelations, setEntityRelations] = useState([]);
  const [highlightedCaptureId, setHighlightedCaptureId] = useState(null);
  const highlightedTimeoutRef = useRef(null);

  useEffect(() => {
    const syncWorlds = (nextWorlds) => {
      setWorlds(nextWorlds);
      if (nextWorlds.length > 0) {
        setSelectedWorldId((prev) => prev || nextWorlds[0].id);
      }
    };

    const loadInitial = () => {
      try {
        chrome.storage.local.get(STORAGE_KEYS, (result) => {
          if (Array.isArray(result.capturedList)) setCapturedList(result.capturedList);
          if (Array.isArray(result.worlds)) syncWorlds(result.worlds);
          if (Array.isArray(result.books)) setBooks(result.books);
          if (Array.isArray(result.entities)) setEntities(result.entities);
          if (Array.isArray(result.bookEntityUsages)) setBookEntityUsages(result.bookEntityUsages);
          if (Array.isArray(result.entityRelations)) setEntityRelations(result.entityRelations);
        });
      } catch (error) {
        console.error('[Sidepanel] 初始加载失败:', error);
      }
    };

    const maybeHighlightLatestCapture = (changeRecord) => {
      const nextList = changeRecord?.newValue;
      if (!Array.isArray(nextList)) return;
      const oldList = Array.isArray(changeRecord.oldValue) ? changeRecord.oldValue : [];
      const nextFirst = nextList[0];
      const oldFirst = oldList[0];
      if (!nextFirst || (oldFirst && oldFirst.text === nextFirst.text && oldFirst.timestamp === nextFirst.timestamp)) {
        return;
      }
      setHighlightedCaptureId(nextFirst.text);
      if (highlightedTimeoutRef.current) clearTimeout(highlightedTimeoutRef.current);
      highlightedTimeoutRef.current = setTimeout(() => setHighlightedCaptureId(null), 1800);
    };

    loadInitial();

    const handler = (changes, areaName) => {
      if (areaName !== 'local') return;

      if (changes.capturedList) {
        maybeHighlightLatestCapture(changes.capturedList);
        setCapturedList(Array.isArray(changes.capturedList.newValue) ? changes.capturedList.newValue : []);
      }
      if (changes.worlds) {
        syncWorlds(Array.isArray(changes.worlds.newValue) ? changes.worlds.newValue : []);
      }
      if (changes.books) {
        setBooks(Array.isArray(changes.books.newValue) ? changes.books.newValue : []);
      }
      if (changes.entities) {
        setEntities(Array.isArray(changes.entities.newValue) ? changes.entities.newValue : []);
      }
      if (changes.bookEntityUsages) {
        setBookEntityUsages(Array.isArray(changes.bookEntityUsages.newValue) ? changes.bookEntityUsages.newValue : []);
      }
      if (changes.entityRelations) {
        setEntityRelations(Array.isArray(changes.entityRelations.newValue) ? changes.entityRelations.newValue : []);
      }
    };

    chrome.storage.onChanged.addListener(handler);
    return () => {
      chrome.storage.onChanged.removeListener(handler);
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
    highlightedCaptureId
  };
}
