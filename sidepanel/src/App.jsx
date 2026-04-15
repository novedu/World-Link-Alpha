/* global chrome */

import { useEffect, useRef, useState } from 'react';
import './App.css';
import WorldBookSection from './components/WorldBookSection';
import WorldSummaryCard from './components/WorldSummaryCard';
import EntitySection from './components/EntitySection';
import CaptureSection from './components/CaptureSection';
import PrimaryTabBar from './components/PrimaryTabBar';
import BrandHeader from './components/BrandHeader';
import AccountSyncModal from './components/AccountSyncModal';
import ActionDialog from './components/ActionDialog';
import {
  BASE_TAG_OPTIONS,
  CAPTURE_STATUS,
  CAPTURE_STATUS_OPTIONS,
  CAPTURE_TIME_FILTER_OPTIONS,
  TYPE_LABELS
} from './constants/worldLink';
import { parseTags } from './utils/entityUtils';
import { getCaptureDomain, getCaptureStatus, matchCaptureTime } from './utils/captureUtils';
import {
  createDefaultRuntimeConfig,
  createDefaultRuntimeContext,
  formatRuntimeError,
  normalizeRuntimeConfig,
  normalizeRuntimeContext,
  sendRuntimeMessage
} from './services/runtimeApi';
import {
  buildExportFilename,
  buildJsonExportPayload,
  buildMarkdownExport,
  downloadTextFile
} from './services/exportService';
import { useEntityFilters } from './hooks/useEntityFilters';
import { useCaptureFilters } from './hooks/useCaptureFilters';

function App() {
  const [capturedList, setCapturedList] = useState([]);
  const [worlds, setWorlds] = useState([]);
  const [books, setBooks] = useState([]);
  const [entities, setEntities] = useState([]);
  const [bookEntityUsages, setBookEntityUsages] = useState([]);
  const [runtimeContext, setRuntimeContext] = useState(() => createDefaultRuntimeContext());
  const [authSession, setAuthSession] = useState(null);
  const [runtimeConfigDraft, setRuntimeConfigDraft] = useState(() => createDefaultRuntimeConfig());

  const [selectedWorldId, setSelectedWorldId] = useState('');
  const [selectedBookId, setSelectedBookId] = useState('');

  const [editingEntity, setEditingEntity] = useState(null);
  const [entitySearchQuery, setEntitySearchQuery] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('all');
  const [entityTagFilter, setEntityTagFilter] = useState('');
  const [activeTab, setActiveTab] = useState('entities');
  const [captureStatusFilter, setCaptureStatusFilter] = useState('all');
  const [captureSourceFilter, setCaptureSourceFilter] = useState('all');
  const [captureTimeFilter, setCaptureTimeFilter] = useState('all');

  const [highlightedCaptureId, setHighlightedCaptureId] = useState(null);
  const [isSavingEntity, setIsSavingEntity] = useState(false);
  const [isMigratingLocalData, setIsMigratingLocalData] = useState(false);
  const [isRefreshingEntitlements, setIsRefreshingEntitlements] = useState(false);
  const [accountNotice, setAccountNotice] = useState(null);
  const [uiMessage, setUiMessage] = useState(null);
  const [dialogSubmitting, setDialogSubmitting] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [actionDialog, setActionDialog] = useState({
    open: false,
    type: '',
    title: '',
    message: '',
    fields: [],
    confirmText: '确定',
    cancelText: '取消'
  });
  const [actionDialogValues, setActionDialogValues] = useState({});
  const highlightedTimeoutRef = useRef(null);

  const applyRuntimeContext = (result) => {
    const nextContext = normalizeRuntimeContext(result);
    setRuntimeContext(nextContext);
    setRuntimeConfigDraft(normalizeRuntimeConfig(result?.runtimeConfig, nextContext.repositoryMode));
  };

  useEffect(() => {
    const loadInitial = () => {
      try {
        chrome.storage.local.get(['capturedList', 'worlds', 'books', 'entities', 'bookEntityUsages', 'authSession'], (result) => {
          if (Array.isArray(result.capturedList)) setCapturedList(result.capturedList);
          if (Array.isArray(result.worlds)) {
            setWorlds(result.worlds);
            if (result.worlds.length > 0) {
              setSelectedWorldId((prev) => prev || result.worlds[0].id);
            }
          }
          if (Array.isArray(result.books)) setBooks(result.books);
          if (Array.isArray(result.entities)) setEntities(result.entities);
          if (Array.isArray(result.bookEntityUsages)) setBookEntityUsages(result.bookEntityUsages);
          setAuthSession(result.authSession || null);
        });
      } catch (error) {
        console.error('[Sidepanel] 初始加载失败:', error);
      }
    };

    loadInitial();
    sendRuntimeMessage('GET_RUNTIME_CONTEXT').then((result) => {
      if (!result?.success) return;
      applyRuntimeContext(result);
    });
    sendRuntimeMessage('GET_AUTH_SESSION').then((result) => {
      if (!result?.success) return;
      setAuthSession(result.session || null);
    });

    const handler = (changes, areaName) => {
      if (areaName !== 'local') return;

      if (changes.capturedList) {
        const nextList = changes.capturedList.newValue;
        if (Array.isArray(nextList)) {
          const oldList = Array.isArray(changes.capturedList.oldValue) ? changes.capturedList.oldValue : [];
          const nextFirst = nextList[0];
          const oldFirst = oldList[0];
          if (nextFirst && (!oldFirst || oldFirst.text !== nextFirst.text || oldFirst.timestamp !== nextFirst.timestamp)) {
            setHighlightedCaptureId(nextFirst.text);
            if (highlightedTimeoutRef.current) clearTimeout(highlightedTimeoutRef.current);
            highlightedTimeoutRef.current = setTimeout(() => setHighlightedCaptureId(null), 1800);
          }
          setCapturedList(nextList);
        }
      }

      if (changes.worlds) {
        const nextWorlds = Array.isArray(changes.worlds.newValue) ? changes.worlds.newValue : [];
        setWorlds(nextWorlds);
        if (nextWorlds.length > 0) setSelectedWorldId((prev) => prev || nextWorlds[0].id);
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

      if (changes.authSession) {
        setAuthSession(changes.authSession.newValue || null);
      }

      if (changes.entitlements) {
        void sendRuntimeMessage('GET_RUNTIME_CONTEXT').then((result) => {
          if (!result?.success) return;
          applyRuntimeContext(result);
        });
      }

      if (changes.runtimeConfig) {
        const nextRuntimeConfig = normalizeRuntimeConfig(changes.runtimeConfig.newValue, 'local');
        setRuntimeContext((prev) => ({
          ...prev,
          repositoryMode: nextRuntimeConfig.repositoryMode,
          cloudEnabled: nextRuntimeConfig.repositoryMode === 'cloud',
          runtimeConfig: nextRuntimeConfig
        }));
        setRuntimeConfigDraft(nextRuntimeConfig);
      }

      if (changes.usageMeter) {
        void sendRuntimeMessage('GET_RUNTIME_CONTEXT').then((result) => {
          if (!result?.success) return;
          applyRuntimeContext(result);
        });
      }
    };

    chrome.storage.onChanged.addListener(handler);
    return () => {
      chrome.storage.onChanged.removeListener(handler);
      if (highlightedTimeoutRef.current) clearTimeout(highlightedTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!uiMessage) return undefined;
    const timer = window.setTimeout(() => {
      setUiMessage(null);
    }, 3200);
    return () => window.clearTimeout(timer);
  }, [uiMessage]);

  useEffect(() => {
    if (!accountNotice) return undefined;
    const timer = window.setTimeout(() => {
      setAccountNotice(null);
    }, 2400);
    return () => window.clearTimeout(timer);
  }, [accountNotice]);

  const {
    currentWorld,
    currentBook,
    booksInWorld,
    entitiesInContext,
    entitiesForView,
    availableTagOptions,
    normalizedQuery,
    entityIdsUsedInCurrentBook,
    distributionRows,
    recentEntities
  } = useEntityFilters({
    worlds,
    books,
    entities,
    bookEntityUsages,
    selectedWorldId,
    selectedBookId,
    entitySearchQuery,
    entityTypeFilter,
    entityTagFilter,
    baseTagOptions: BASE_TAG_OPTIONS,
    typeLabels: TYPE_LABELS,
    parseTags
  });

  const { captureSourceOptions, capturesForView, recentCaptures } = useCaptureFilters({
    capturedList,
    captureStatusFilter,
    captureSourceFilter,
    captureTimeFilter,
    getCaptureDomain,
    getCaptureStatus,
    matchCaptureTime
  });

  const refreshRuntimeContext = async () => {
    const result = await sendRuntimeMessage('GET_RUNTIME_CONTEXT');
    if (!result?.success) return;
    applyRuntimeContext(result);
  };

  const showUiMessage = (text, type = 'info') => {
    if (!text) return;
    setUiMessage({
      type,
      text,
      at: Date.now()
    });
  };

  const openActionDialog = (config) => {
    const safeFields = Array.isArray(config?.fields) ? config.fields : [];
    const nextValues = {};
    safeFields.forEach((field) => {
      nextValues[field.key] = String(field.defaultValue || '');
    });
    setActionDialog({
      open: true,
      type: config?.type || '',
      title: config?.title || '操作确认',
      message: config?.message || '',
      fields: safeFields,
      confirmText: config?.confirmText || '确定',
      cancelText: config?.cancelText || '取消'
    });
    setActionDialogValues(nextValues);
  };

  const closeActionDialog = () => {
    setActionDialog((prev) => ({ ...prev, open: false }));
    setActionDialogValues({});
    setDialogSubmitting(false);
  };

  const updateDialogField = (key, value) => {
    setActionDialogValues((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSubmitActionDialog = async () => {
    if (dialogSubmitting) return;
    setDialogSubmitting(true);

    try {
      if (actionDialog.type === 'create_world') {
        const name = String(actionDialogValues.name || '').trim();
        if (!name) {
          showUiMessage('世界名称不能为空', 'warning');
          setDialogSubmitting(false);
          return;
        }
        const result = await sendRuntimeMessage('CREATE_WORLD', { name });
        if (!result?.success) {
          showUiMessage(formatRuntimeError(result, '创建世界失败'), 'error');
          setDialogSubmitting(false);
          return;
        }
        setSelectedWorldId(result.world.id);
        setSelectedBookId('');
        showUiMessage('世界创建成功', 'success');
        closeActionDialog();
        return;
      }

      if (actionDialog.type === 'create_book') {
        if (!selectedWorldId) {
          showUiMessage('请先选择或创建一个世界', 'warning');
          setDialogSubmitting(false);
          return;
        }
        const title = String(actionDialogValues.title || '').trim();
        if (!title) {
          showUiMessage('书项目名称不能为空', 'warning');
          setDialogSubmitting(false);
          return;
        }
        const result = await sendRuntimeMessage('CREATE_BOOK', {
          worldId: selectedWorldId,
          title
        });
        if (!result?.success) {
          showUiMessage(formatRuntimeError(result, '创建书项目失败'), 'error');
          setDialogSubmitting(false);
          return;
        }
        setSelectedBookId(result.book.id);
        showUiMessage('书项目创建成功', 'success');
        closeActionDialog();
        return;
      }

      if (actionDialog.type === 'login_cloud') {
        const email = String(actionDialogValues.email || '').trim();
        const password = String(actionDialogValues.password || '');
        if (!email || !password) {
          showUiMessage('邮箱和密码不能为空', 'warning');
          setDialogSubmitting(false);
          return;
        }
        const result = await sendRuntimeMessage('SIGN_IN_WITH_PASSWORD', {
          email,
          password
        });
        if (!result?.success) {
          showUiMessage(formatRuntimeError(result, '云端登录失败'), 'error');
          setDialogSubmitting(false);
          return;
        }
        setAuthSession(result.session || null);
        await refreshRuntimeContext();
        showUiMessage('云端登录成功', 'success');
        closeActionDialog();
        return;
      }

      if (actionDialog.type === 'migrate_local_to_cloud') {
        setIsMigratingLocalData(true);
        const result = await sendRuntimeMessage('MIGRATE_LOCAL_TO_CLOUD', {
          strategy: 'merge',
          clearLocalAfterImport: false
        });
        setIsMigratingLocalData(false);
        if (!result?.success) {
          showUiMessage(formatRuntimeError(result, '迁移失败'), 'error');
          setDialogSubmitting(false);
          return;
        }
        const migrated = result.migrated || {};
        showUiMessage(
          `迁移完成：世界 ${migrated.worlds || 0}，书 ${migrated.books || 0}，实体 ${migrated.entities || 0}，捕获 ${
            migrated.captures || 0
          }`,
          'success'
        );
        await refreshRuntimeContext();
        closeActionDialog();
        return;
      }

      setDialogSubmitting(false);
    } catch (error) {
      console.error('[Sidepanel] handleSubmitActionDialog error:', error);
      showUiMessage('操作失败，请稍后重试', 'error');
      setDialogSubmitting(false);
    }
  };

  const handleAddWorld = () => {
    openActionDialog({
      type: 'create_world',
      title: '新建世界',
      message: '创建一个新的世界容器，用于承载书项目与实体。',
      fields: [
        {
          key: 'name',
          label: '世界名称',
          placeholder: '例如：星环纪元'
        }
      ],
      confirmText: '创建世界'
    });
  };

  const handleAddBook = () => {
    if (!selectedWorldId) {
      showUiMessage('请先选择或创建一个世界', 'warning');
      return;
    }
    openActionDialog({
      type: 'create_book',
      title: '新建书项目',
      message: '书项目用于组织当前世界下的创作视图。',
      fields: [
        {
          key: 'title',
          label: '书项目名称',
          placeholder: '例如：夜宴疑云'
        }
      ],
      confirmText: '创建书项目'
    });
  };

  const ensureCloudRuntimeReady = async () => {
    const payload = {
      repositoryMode: 'cloud',
      cloudApiBaseUrl: String(runtimeConfigDraft.cloudApiBaseUrl || '').trim(),
      cloudTimeoutMs: Number(runtimeConfigDraft.cloudTimeoutMs || 12000)
    };
    const result = await sendRuntimeMessage('SET_RUNTIME_CONFIG', payload);
    if (!result?.success) {
      showUiMessage(formatRuntimeError(result, '初始化同步服务失败'), 'error');
      return false;
    }
    await refreshRuntimeContext();
    return true;
  };

  const handleSignIn = async () => {
    const ready = await ensureCloudRuntimeReady();
    if (!ready) return;
    openActionDialog({
      type: 'login_cloud',
      title: '登录账号',
      message: '登录后自动开启云端同步，可跨设备访问你的世界资产。',
      fields: [
        {
          key: 'email',
          label: '邮箱',
          placeholder: 'name@example.com'
        },
        {
          key: 'password',
          label: '密码',
          type: 'password',
          placeholder: '请输入密码'
        }
      ],
      confirmText: '登录'
    });
  };

  const handleSignOut = async () => {
    const result = await sendRuntimeMessage('CLEAR_AUTH_SESSION');
    if (!result?.success) {
      showUiMessage(formatRuntimeError(result, '退出失败'), 'error');
      return;
    }
    setAuthSession(null);
    await refreshRuntimeContext();
    showUiMessage('已退出登录', 'success');
  };

  const handleUpgradeLocalPlan = async () => {
    if (!authSession?.email) return;
    showUiMessage('订阅中心即将上线，当前可先使用 Free 版功能', 'info');
  };

  const handleRefreshEntitlements = async () => {
    if (isRefreshingEntitlements) return;
    setAccountNotice({
      type: 'info',
      text: '正在刷新套餐...'
    });
    setIsRefreshingEntitlements(true);
    const result = await sendRuntimeMessage('REFRESH_ENTITLEMENTS');
    setIsRefreshingEntitlements(false);
    if (!result?.success) {
      setAccountNotice({
        type: 'error',
        text: '刷新失败，请稍后重试'
      });
      showUiMessage(formatRuntimeError(result, '刷新套餐信息失败'), 'error');
      return;
    }
    await refreshRuntimeContext();
    setAccountNotice({
      type: 'success',
      text: '当前刷新完成'
    });
  };

  const closeAccountModal = () => {
    setIsAccountModalOpen(false);
    setAccountNotice(null);
  };

  const handleMigrateLocalToCloud = async () => {
    if (isMigratingLocalData) return;
    if (!authSession?.email) {
      showUiMessage('请先登录账号，再执行数据迁移', 'warning');
      return;
    }
    const ready = await ensureCloudRuntimeReady();
    if (!ready) return;
    openActionDialog({
      type: 'migrate_local_to_cloud',
      title: '迁移本机数据到云端',
      message:
        '将把当前本机世界/书/实体/捕获数据合并迁移到云端。此操作不会清空本机数据，可重复执行。',
      fields: [],
      confirmText: '开始迁移',
      cancelText: '取消'
    });
  };

  const handleSelectWorld = (worldId) => {
    setSelectedWorldId(worldId);
    setSelectedBookId('');
    setEditingEntity(null);
    setEntityTagFilter('');
    setEntitySearchQuery('');
  };

  const handleSelectBook = (bookId) => {
    setSelectedBookId(bookId);
    setEditingEntity(null);
  };

  const handleStartNewEntity = () => {
    if (!selectedWorldId) {
      showUiMessage('请先选择或创建一个世界', 'warning');
      return;
    }
    setActiveTab('entities');
    setEditingEntity({
      id: '',
      worldId: selectedWorldId,
      name: '',
      type: 'other',
      summary: '',
      tags: '',
      selectedText: '',
      sourceUrl: '',
      sourceTitle: '',
      usedInCurrentBook: Boolean(selectedBookId)
    });
  };

  const handleEditEntity = (entity) => {
    const usedInCurrentBook = selectedBookId
      ? bookEntityUsages.some((usage) => usage.bookId === selectedBookId && usage.entityId === entity.id)
      : false;
    setActiveTab('entities');
    setEditingEntity({
      ...entity,
      tags: parseTags(entity.tags).join(', '),
      usedInCurrentBook
    });
  };

  const handleCreateFromCapture = (item) => {
    if (!selectedWorldId) {
      showUiMessage('请先在上方选择一个世界，再从捕获内容创建实体', 'warning');
      return;
    }
    if (getCaptureStatus(item) === CAPTURE_STATUS.INBOX) {
      void sendRuntimeMessage('UPDATE_CAPTURE_STATUS', {
        text: item.text,
        timestamp: item.timestamp,
        status: CAPTURE_STATUS.ORGANIZED
      });
    }
    const fallbackName = item.text.length <= 20 ? item.text : `${item.text.slice(0, 20)}...`;
    setActiveTab('entities');
    setEditingEntity({
      id: '',
      worldId: selectedWorldId,
      name: fallbackName,
      type: 'other',
      summary: item.text.slice(0, 220),
      tags: '',
      selectedText: item.text,
      sourceUrl: item.sourceUrl || '',
      sourceTitle: item.sourceTitle || '',
      usedInCurrentBook: Boolean(selectedBookId)
    });
  };

  const handleUpdateCaptureStatus = async (item, status) => {
    if (!item?.text) return;
    const result = await sendRuntimeMessage('UPDATE_CAPTURE_STATUS', {
      text: item.text,
      timestamp: item.timestamp,
      status
    });
    if (!result?.success) {
      console.warn('[Sidepanel] update capture status failed:', formatRuntimeError(result, 'unknown'));
    }
  };

  const handleEntityFieldChange = (field, value) => {
    setEditingEntity((prev) => ({ ...(prev || {}), [field]: value }));
  };

  const handleToggleEditorTag = (tag) => {
    if (!editingEntity) return;
    const currentTags = parseTags(editingEntity.tags);
    const nextTags = currentTags.includes(tag)
      ? currentTags.filter((item) => item !== tag)
      : [...currentTags, tag];
    setEditingEntity((prev) => ({ ...(prev || {}), tags: nextTags.join(', ') }));
  };

  const handleCancelEdit = () => setEditingEntity(null);

  const handleSaveEntity = async () => {
    if (!editingEntity || isSavingEntity) return;
    const name = String(editingEntity.name || '').trim();
    if (!name) {
      showUiMessage('实体名称不能为空', 'warning');
      return;
    }

    setIsSavingEntity(true);
    const payload = {
      entity: {
        id: editingEntity.id || '',
        worldId: selectedWorldId,
        name,
        type: editingEntity.type || 'other',
        summary: editingEntity.summary || '',
        tags: parseTags(editingEntity.tags),
        selectedText: editingEntity.selectedText || '',
        sourceUrl: editingEntity.sourceUrl || '',
        sourceTitle: editingEntity.sourceTitle || '',
        usedInCurrentBook: Boolean(editingEntity.usedInCurrentBook)
      },
      selectedBookId
    };
    const result = await sendRuntimeMessage('SAVE_ENTITY_FROM_SIDEPANEL', payload);
    setIsSavingEntity(false);

    if (!result?.success) {
      showUiMessage(formatRuntimeError(result, '保存失败'), 'error');
      return;
    }

    setEditingEntity({
      ...result.entity,
      tags: parseTags(result.entity.tags).join(', '),
      usedInCurrentBook: Boolean(editingEntity.usedInCurrentBook)
    });
  };

  const handleExport = async (format) => {
    if (!selectedWorldId) {
      showUiMessage('请先选择世界', 'warning');
      return;
    }
    const exportEntities = entitiesForView;
    if (exportEntities.length === 0) {
      showUiMessage('当前范围没有可导出的实体', 'warning');
      return;
    }

    const worldName = (currentWorld?.name || 'world').replace(/\s+/g, '-');
    const scopeLabel = selectedBookId ? `书项目：${currentBook?.title || selectedBookId}` : `世界：${currentWorld?.name || ''}`;
    const timestamp = new Date().toISOString().slice(0, 10);

    const authorizeResult = await sendRuntimeMessage('REQUEST_EXPORT', { format });
    if (!authorizeResult?.success) {
      showUiMessage(formatRuntimeError(authorizeResult, '当前套餐暂不支持该导出操作'), 'error');
      return;
    }
    setRuntimeContext((prev) => ({
      ...prev,
      usage: authorizeResult?.usage || prev.usage
    }));

    if (format === 'json') {
      const payload = buildJsonExportPayload({
        selectedWorldId,
        currentWorld,
        selectedBookId,
        currentBook,
        normalizedQuery,
        entityTypeFilter,
        entityTagFilter,
        entities: exportEntities
      });
      downloadTextFile(
        buildExportFilename({ worldName, selectedBookId, timestamp, format: 'json' }),
        JSON.stringify(payload, null, 2),
        'application/json;charset=utf-8'
      );
      await refreshRuntimeContext();
      return;
    }

    const markdown = buildMarkdownExport(exportEntities, scopeLabel, TYPE_LABELS, parseTags);
    downloadTextFile(
      buildExportFilename({ worldName, selectedBookId, timestamp, format: 'markdown' }),
      markdown,
      'text/markdown;charset=utf-8'
    );
    await refreshRuntimeContext();
  };

  const isEntityUsedInCurrentBook = (entityId) => {
    if (!selectedBookId) return false;
    return entityIdsUsedInCurrentBook.has(entityId);
  };

  const overviewStats = [
    { id: 'worlds', label: '世界数量', value: worlds.length },
    { id: 'books', label: selectedWorldId ? '当前世界书数' : '书项目总数', value: selectedWorldId ? booksInWorld.length : books.length },
    { id: 'entities', label: selectedBookId ? '本书实体' : '世界实体', value: entitiesInContext.length },
    { id: 'captures', label: '捕获记录', value: capturedList.length }
  ];
  const effectivePlan = runtimeContext.entitlements?.plan === 'pro' || authSession?.plan === 'pro' ? 'Pro' : 'Free';
  const canExportMarkdown = runtimeContext.entitlements?.features?.exportMarkdown !== false;
  const canExportJson = Boolean(runtimeContext.entitlements?.features?.exportJson);
  const isJsonExportDisabled = !selectedWorldId || entitiesForView.length === 0 || !canExportJson;
  const isMarkdownExportDisabled = !selectedWorldId || entitiesForView.length === 0 || !canExportMarkdown;
  const jsonExportDisabledReason = !canExportJson ? 'JSON 导出为 Pro 功能' : '';
  const formatQuotaLabel = (block) => {
    if (!block) return '--';
    if (block.limit === null) return `${block.used || 0} / ∞`;
    return `${block.used || 0} / ${block.limit || 0}`;
  };
  const captureQuotaLabel =
    formatQuotaLabel(runtimeContext.usage?.captureCreate);
  const markdownExportQuotaLabel = formatQuotaLabel(runtimeContext.usage?.exportMarkdown);
  const cloudLastError = runtimeContext.cloudDiagnostics?.lastError;
  const cloudLastErrorHint =
    cloudLastError?.message
      ? `最近一次同步错误：${cloudLastError.message}${cloudLastError.traceId ? `（trace: ${cloudLastError.traceId}）` : ''}`
      : '';
  const accountDisplayName = authSession?.email ? authSession.email.split('@')[0] || authSession.email : '未登录';
  const accountIdentityLabel = authSession?.email || '登录后自动开启云端同步';
  const accountTriggerStatus = authSession?.email ? `${effectivePlan} · 已同步` : `${effectivePlan} · 点击登录`;
  const uiMessageClassName = uiMessage ? `inline-message inline-message-${uiMessage.type || 'info'}` : 'inline-message';

  return (
    <div className="app-shell min-h-screen">
      <div className="section-stack">
        <BrandHeader
          accountDisplayName={accountDisplayName}
          accountTriggerStatus={accountTriggerStatus}
          onOpenAccount={() => setIsAccountModalOpen(true)}
        />

        {uiMessage ? (
          <div className={uiMessageClassName} role="status">
            <span className="inline-message-text">{uiMessage.text}</span>
            <button type="button" className="inline-message-close" onClick={() => setUiMessage(null)} aria-label="关闭提示">
              ×
            </button>
          </div>
        ) : null}

        <div className="section-card">
          <div className="card-header">
            <h2>世界与书管理</h2>
            <div className="text-sm card-header-meta" style={{ color: 'var(--text-secondary)' }}>
              共 {worlds.length} 个世界 · {books.length} 个书项目
            </div>
          </div>
          <WorldBookSection
            worlds={worlds}
            booksInWorld={booksInWorld}
            selectedWorldId={selectedWorldId}
            selectedBookId={selectedBookId}
            currentWorld={currentWorld}
            onSelectWorld={handleSelectWorld}
            onSelectBook={handleSelectBook}
            onAddWorld={handleAddWorld}
            onAddBook={handleAddBook}
          />
        </div>

        <PrimaryTabBar activeTab={activeTab} onTabChange={setActiveTab} captureCount={capturedList.length} />

        {activeTab === 'overview' ? (
          <div className="section-card fade-in">
            <div className="card-header">
              <h2>世界概览</h2>
              <div className="text-sm card-header-meta" style={{ color: 'var(--text-secondary)' }}>
                当前上下文的摘要信息
              </div>
            </div>
            <div className="metrics-grid">
              {overviewStats.map((item) => (
                <div key={item.id} className="metric-card">
                  <div className="metric-label">{item.label}</div>
                  <div className="metric-value">{item.value}</div>
                </div>
              ))}
            </div>
            <div className="section-divider" />
            <WorldSummaryCard
              currentWorld={currentWorld}
              currentBook={currentBook}
              distributionRows={distributionRows}
              recentEntities={recentEntities}
              recentCaptures={recentCaptures}
            />
          </div>
        ) : null}

        {activeTab === 'entities' ? (
          <div className="section-card fade-in">
            <div className="card-header">
              <h2>实体管理</h2>
              <div className="text-sm card-header-meta" style={{ color: 'var(--text-secondary)' }}>
                共 {entitiesForView.length} 个实体
              </div>
            </div>
            <EntitySection
              selectedWorldId={selectedWorldId}
              selectedBookId={selectedBookId}
              entitiesForView={entitiesForView}
              editingEntity={editingEntity}
              entitySearchQuery={entitySearchQuery}
              entityTypeFilter={entityTypeFilter}
              entityTagFilter={entityTagFilter}
              tagOptions={availableTagOptions}
              baseTagOptions={BASE_TAG_OPTIONS}
              onSearchChange={setEntitySearchQuery}
              onTypeFilterChange={setEntityTypeFilter}
              onTagFilterChange={setEntityTagFilter}
              onClearSearch={() => setEntitySearchQuery('')}
              onClearTypeFilter={() => setEntityTypeFilter('all')}
              onClearTagFilter={() => setEntityTagFilter('')}
              onStartNewEntity={handleStartNewEntity}
              onEditEntity={handleEditEntity}
              onChangeField={handleEntityFieldChange}
              onToggleEditorTag={handleToggleEditorTag}
              onSaveEntity={handleSaveEntity}
              onCancelEdit={handleCancelEdit}
              onExportJson={() => handleExport('json')}
              onExportMarkdown={() => handleExport('markdown')}
              isExportDisabled={!selectedWorldId || entitiesForView.length === 0}
              isMarkdownExportDisabled={isMarkdownExportDisabled}
              isJsonExportDisabled={isJsonExportDisabled}
              jsonExportDisabledReason={jsonExportDisabledReason}
              isSavingEntity={isSavingEntity}
              isEntityUsedInCurrentBook={isEntityUsedInCurrentBook}
            />
          </div>
        ) : null}

        {activeTab === 'captures' ? (
          <div className="section-card fade-in">
            <div className="card-header">
              <h2>捕获记录</h2>
              <div className="text-sm card-header-meta" style={{ color: 'var(--text-secondary)' }}>
                显示 {capturesForView.length} / 共 {capturedList.length} 条
              </div>
            </div>
            <CaptureSection
              capturedList={capturesForView}
              highlightedCaptureId={highlightedCaptureId}
              captureStatusFilter={captureStatusFilter}
              captureSourceFilter={captureSourceFilter}
              captureTimeFilter={captureTimeFilter}
              captureStatusOptions={CAPTURE_STATUS_OPTIONS}
              captureTimeOptions={CAPTURE_TIME_FILTER_OPTIONS}
              captureSourceOptions={captureSourceOptions}
              onCaptureStatusFilterChange={setCaptureStatusFilter}
              onCaptureSourceFilterChange={setCaptureSourceFilter}
              onCaptureTimeFilterChange={setCaptureTimeFilter}
              onClearCaptureFilters={() => {
                setCaptureStatusFilter('all');
                setCaptureSourceFilter('all');
                setCaptureTimeFilter('all');
              }}
              onMarkCaptureStatus={handleUpdateCaptureStatus}
              onCreateFromCapture={handleCreateFromCapture}
            />
          </div>
        ) : null}

        <AccountSyncModal
          open={isAccountModalOpen}
          onClose={closeAccountModal}
          accountIdentityLabel={accountIdentityLabel}
          authEmail={authSession?.email || ''}
          effectivePlan={effectivePlan}
          captureQuotaLabel={captureQuotaLabel}
          markdownExportQuotaLabel={markdownExportQuotaLabel}
          accountNotice={accountNotice}
          onRefreshEntitlements={handleRefreshEntitlements}
          isRefreshingEntitlements={isRefreshingEntitlements}
          onMigrateLocalToCloud={handleMigrateLocalToCloud}
          isMigratingLocalData={isMigratingLocalData}
          canMigrate={Boolean(authSession?.email)}
          onUpgradePlan={handleUpgradeLocalPlan}
          canUpgradePlan={Boolean(authSession?.email && authSession.plan !== 'pro')}
          onSignOut={handleSignOut}
          onSignIn={handleSignIn}
          helperText={authSession?.email ? '已登录账号，数据将自动云端同步。' : '登录后自动开启云端同步与跨设备访问。'}
          cloudLastErrorHint={cloudLastErrorHint}
        />

        <ActionDialog
          actionDialog={actionDialog}
          actionDialogValues={actionDialogValues}
          dialogSubmitting={dialogSubmitting}
          onClose={closeActionDialog}
          onSubmit={handleSubmitActionDialog}
          onFieldChange={updateDialogField}
        />
      </div>
    </div>
  );
}

export default App;
