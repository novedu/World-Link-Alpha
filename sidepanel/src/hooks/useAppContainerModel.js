import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BASE_TAG_OPTIONS,
  ENTITY_RELATION_LABELS,
  TYPE_LABELS
} from '../constants/worldLink';
import { parseTags } from '../utils/entityUtils';
import { getCaptureDomain, getCaptureStatus, matchCaptureTime } from '../utils/captureUtils';
import { useEntityFilters } from './useEntityFilters';
import { useCaptureFilters } from './useCaptureFilters';
import { useRuntimeContext } from './useRuntimeContext';
import { useActionDialogFlow } from './useActionDialogFlow';
import { useEntityEditorFlow } from './useEntityEditorFlow';
import { useCaptureInboxFlow } from './useCaptureInboxFlow';
import { useStorageSync } from './useStorageSync';
import { useExportFlow } from './useExportFlow';
import { useOverviewStats } from './useOverviewStats';
import { useAccountViewModel } from './useAccountViewModel';
import { useUiMessage } from './useUiMessage';
import { useSelectionState } from './useSelectionState';
import { useWorldBookMeta } from './useWorldBookMeta';
import { useWorldBookSelectionHandlers } from './useWorldBookSelectionHandlers';
import { useManuscriptFlow } from './useManuscriptFlow';
import { useAuthListeners } from './useAuthListeners.ts';
import { useDataRefresh } from './useDataRefresh.ts';
import { useWorldQuickRows } from './useWorldQuickRows';
import { buildAppProps } from '../viewmodels/buildAppProps';
import {
  clearActivationAnalyticsEvents,
  getActivationAnalyticsSnapshot,
  trackActivationEvent
} from '../services/activationAnalytics.service.ts';

function findFirstIncompleteStepIndex(steps) {
  if (!Array.isArray(steps) || steps.length === 0) return 0;
  const index = steps.findIndex((step) => !step?.done);
  return index >= 0 ? index : 0;
}

function findNextIncompleteStepIndex(steps, fromIndex) {
  if (!Array.isArray(steps) || steps.length === 0) return -1;
  for (let index = Math.max(0, fromIndex + 1); index < steps.length; index += 1) {
    if (!steps[index]?.done) return index;
  }
  return -1;
}

export function useAppContainerModel() {
  const [entitySearchQuery, setEntitySearchQuery] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('all');
  const [entityTagFilter, setEntityTagFilter] = useState('');
  const [activeTab, setActiveTab] = useState('entities');
  const [captureStatusFilter, setCaptureStatusFilter] = useState('all');
  const [captureSourceFilter, setCaptureSourceFilter] = useState('all');
  const [captureTimeFilter, setCaptureTimeFilter] = useState('all');
  const [overviewRelationScope, setOverviewRelationScope] = useState('book');
  const [overviewBookGraphId, setOverviewBookGraphId] = useState('');
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isActivationDebugOpen, setIsActivationDebugOpen] = useState(false);
  const [isActivationDebugLoading, setIsActivationDebugLoading] = useState(false);
  const [isActivationDebugExporting, setIsActivationDebugExporting] = useState(false);
  const [activationDebugSnapshot, setActivationDebugSnapshot] = useState(null);
  const [isActivationGuideDismissed, setIsActivationGuideDismissed] = useState(false);
  const [isOnboardingTourOpen, setIsOnboardingTourOpen] = useState(false);
  const [onboardingTourStepIndex, setOnboardingTourStepIndex] = useState(0);
  const activationSessionIdRef = useRef('');
  const activationMetricsReadyRef = useRef(false);
  const activationPrevDoneMapRef = useRef({});
  const activationPrevCompletedRef = useRef(0);
  const activationCompletedTrackedRef = useRef(false);
  const tourViewedStepIdRef = useRef('');
  const tourOpenStateRef = useRef(false);
  const tourAutoAdvanceSignatureRef = useRef('');
  const tourCompletionNoticeRef = useRef(false);

  const { selectedWorldId, setSelectedWorldId, selectedBookId, setSelectedBookId, selectWorld, selectBook } = useSelectionState();
  const { uiMessage, showUiMessage, clearUiMessage } = useUiMessage();
  const {
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
    reloadData
  } = useStorageSync({ setSelectedWorldId, setSelectedBookId });

  const { isRefreshing, handleRefresh } = useDataRefresh({
    showUiMessage,
    onRefreshData: reloadData
  });

  useAuthListeners({ showUiMessage, setIsAccountModalOpen });

  const trackActivation = useCallback((eventName, payload = {}) => {
    const safeEventName = String(eventName || '').trim();
    if (!safeEventName) return;
    const sessionId = String(activationSessionIdRef.current || '').trim();
    void trackActivationEvent(safeEventName, {
      sessionId,
      ...payload
    });
  }, []);
  const activationDebugAvailable = Boolean(import.meta?.env?.DEV);

  const handleTabChange = async (newTab) => {
    setActiveTab(newTab);
    await handleRefresh();
  };

  const {
    runtimeContext,
    authSession,
    setAuthSession,
    refreshRuntimeContext,
    ensureCloudRuntimeReady,
    isRefreshingEntitlements,
    accountNotice,
    setAccountNotice,
    handleSignOut,
    handleUpgradeLocalPlan,
    handleRefreshEntitlements
  } = useRuntimeContext({ onUiMessage: showUiMessage, onAuthStateChange: reloadData });

  const subscriptionStatus = useMemo(() => {
    if (!authSession || !authSession.subscriptionExpiresAt) {
      return null;
    }

    const now = new Date().getTime();
    const expiresAt = authSession.subscriptionExpiresAt;
    const daysUntilExpiry = Math.floor((expiresAt - now) / (24 * 60 * 60 * 1000));

    if (expiresAt < now) {
      return {
        status: 'expired',
        message: 'Pro 已过期'
      };
    }

    if (daysUntilExpiry <= 7) {
      return {
        status: 'warning',
        message: `Pro 将在 ${daysUntilExpiry} 天后到期`
      };
    }

    if (daysUntilExpiry <= 30) {
      return {
        status: 'info',
        message: `Pro 将在 ${daysUntilExpiry} 天后到期`
      };
    }

    return null;
  }, [authSession]);

  const {
    actionDialog,
    actionDialogValues,
    dialogSubmitting,
    closeActionDialog,
    updateDialogField,
    handleSubmitActionDialog,
    handleAddWorld,
    handleAddBook,
    handleSignIn,
    handleRegister
  } = useActionDialogFlow({
    selectedWorldId,
    setSelectedWorldId,
    setSelectedBookId,
    setAuthSession,
    ensureCloudRuntimeReady,
    refreshRuntimeContext,
    onDataChanged: reloadData,
    onUiMessage: showUiMessage
  });

  const {
    editingEntity,
    setEditingEntity,
    isSavingEntity,
    isAiAssisting,
    isCheckingConflict,
    isGeneratingImage,
    isSubmittingAiFeedback,
    handleStartNewEntity,
    handleEditEntity,
    handleEntityFieldChange,
    handleToggleEditorTag,
    handleAiAssist,
    handleCheckConflict,
    handleGenerateEntityImage,
    handleApplyImageAsset,
    handleSubmitAiFeedback,
    handleCancelEdit,
    handleSaveEntity,
    aiAssistMeta,
    aiAssistProfile,
    setAiAssistProfile,
    conflictCheckMeta
  } = useEntityEditorFlow({
    selectedWorldId,
    selectedBookId,
    bookEntityUsages,
    entityRelations,
    setActiveTab,
    onDataChanged: reloadData,
    onUiMessage: showUiMessage
  });

  const {
    manuscriptText,
    manuscriptSuggestions,
    manuscriptRelationSuggestions,
    manuscriptParseMeta,
    isParsingManuscript,
    setManuscriptText,
    handleParseManuscript,
    handleClearManuscriptSuggestions,
    handleApplyManuscriptSuggestion,
    handleBatchApplyRelations
  } = useManuscriptFlow({
    selectedWorldId,
    selectedBookId,
    setActiveTab,
    setEditingEntity,
    onDataChanged: reloadData,
    onUiMessage: showUiMessage
  });

  const { handleCreateFromCapture, handleUpdateCaptureStatus } = useCaptureInboxFlow({
    selectedWorldId,
    selectedBookId,
    setActiveTab,
    setEditingEntity,
    onDataChanged: reloadData,
    onUiMessage: showUiMessage
  });

  const {
    currentWorld,
    currentBook,
    booksInWorld,
    entitiesInWorld,
    entitiesInContext,
    entitiesForView,
    availableTagOptions,
    normalizedQuery,
    entityIdsUsedInCurrentBook,
    distributionRows,
    recentEntities,
    relationsInWorld,
    relationCount,
    worldRelationRows,
    bookRelationRowsByBookId,
    emptyRelationRows
  } = useEntityFilters({
    worlds,
    books,
    entities,
    bookEntityUsages,
    entityRelations,
    selectedWorldId,
    selectedBookId,
    entitySearchQuery,
    entityTypeFilter,
    entityTagFilter,
    baseTagOptions: BASE_TAG_OPTIONS,
    typeLabels: TYPE_LABELS,
    relationLabels: ENTITY_RELATION_LABELS,
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

  const { handleExport, isJsonExportDisabled, isMarkdownExportDisabled, jsonExportDisabledReason } = useExportFlow({
    selectedWorldId,
    selectedBookId,
    currentWorld,
    currentBook,
    normalizedQuery,
    entityTypeFilter,
    entityTagFilter,
    entitiesForView,
    entityRelations,
    runtimeContext,
    refreshRuntimeContext,
    typeLabels: TYPE_LABELS,
    relationLabels: ENTITY_RELATION_LABELS,
    parseTags,
    onUiMessage: showUiMessage
  });

  const { overviewStats } = useOverviewStats({
    worlds,
    books,
    booksInWorld,
    selectedWorldId,
    selectedBookId,
    entitiesInContext,
    capturedList,
    relationCount
  });

  const { worldBookHeaderMeta } = useWorldBookMeta({
    worlds,
    books,
    selectedWorldId,
    booksInWorld
  });

  const { effectivePlan, captureQuotaLabel, markdownExportQuotaLabel, cloudLastErrorHint, accountDisplayName, accountIdentityLabel, accountTriggerStatus, helperText, canUpgradePlan } = useAccountViewModel({ runtimeContext, authSession });

  const refreshActivationDebugSnapshot = useCallback(async () => {
    if (!activationDebugAvailable) return;
    setIsActivationDebugLoading(true);
    try {
      const snapshot = await getActivationAnalyticsSnapshot();
      setActivationDebugSnapshot(snapshot);
    } catch {
      setActivationDebugSnapshot(null);
      showUiMessage('读取激活埋点失败，请重试。', 'error');
    } finally {
      setIsActivationDebugLoading(false);
    }
  }, [activationDebugAvailable, showUiMessage]);

  const clearActivationDebugSnapshot = useCallback(async () => {
    if (!activationDebugAvailable) return;
    setIsActivationDebugLoading(true);
    try {
      await clearActivationAnalyticsEvents();
      const snapshot = await getActivationAnalyticsSnapshot();
      setActivationDebugSnapshot(snapshot);
      showUiMessage('激活埋点已清空。', 'success');
    } catch {
      showUiMessage('清空激活埋点失败，请重试。', 'error');
    } finally {
      setIsActivationDebugLoading(false);
    }
  }, [activationDebugAvailable, showUiMessage]);

  const exportActivationDebugSnapshot = useCallback(async () => {
    if (!activationDebugAvailable) return;
    setIsActivationDebugExporting(true);
    try {
      const snapshot = await getActivationAnalyticsSnapshot();
      setActivationDebugSnapshot(snapshot);

      const exportPayload = {
        exportedAt: new Date().toISOString(),
        snapshot
      };
      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
        type: 'application/json;charset=utf-8'
      });
      const url = URL.createObjectURL(blob);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `world-link-activation-events-${timestamp}.json`;

      if (typeof document !== 'undefined') {
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        anchor.style.display = 'none';
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
      }

      URL.revokeObjectURL(url);
      showUiMessage('激活埋点快照已导出。', 'success');
    } catch {
      showUiMessage('导出激活埋点失败，请重试。', 'error');
    } finally {
      setIsActivationDebugExporting(false);
    }
  }, [activationDebugAvailable, showUiMessage]);

  const toggleActivationDebugPanel = useCallback(() => {
    if (!activationDebugAvailable) return;
    setIsActivationDebugOpen((prev) => {
      const next = !prev;
      if (next) {
        void refreshActivationDebugSnapshot();
      }
      return next;
    });
  }, [activationDebugAvailable, refreshActivationDebugSnapshot]);

  const openAccountModal = () => {
    setIsAccountModalOpen(true);
  };

  const closeAccountModal = () => {
    setIsAccountModalOpen(false);
    setAccountNotice(null);
  };

  useEffect(() => {
    if (!activationDebugAvailable || !isAccountModalOpen || !isActivationDebugOpen) return;
    void refreshActivationDebugSnapshot();
  }, [activationDebugAvailable, isAccountModalOpen, isActivationDebugOpen, refreshActivationDebugSnapshot]);

  const { handleSelectWorld, handleSelectBook } = useWorldBookSelectionHandlers({
    selectWorld,
    selectBook,
    setEditingEntity,
    setEntityTagFilter,
    setEntitySearchQuery
  });

  const handleExportJson = () => {
    void handleExport('json');
  };

  const handleExportMarkdown = () => {
    void handleExport('markdown');
  };

  const handleClearEntityFilters = () => {
    setEntitySearchQuery('');
    setEntityTypeFilter('all');
    setEntityTagFilter('');
  };

  const openCaptureTab = useCallback(() => {
    setActiveTab('captures');
  }, []);

  const openEntityTab = useCallback(() => {
    setActiveTab('entities');
  }, []);

  const clearSelectedBook = () => {
    setSelectedBookId('');
  };

  const dismissActivationGuide = () => {
    setIsActivationGuideDismissed(true);
  };

  const handleClearCaptureFilters = () => {
    setCaptureStatusFilter('all');
    setCaptureSourceFilter('all');
    setCaptureTimeFilter('all');
  };

  const isEntityUsedInCurrentBook = (entityId) => {
    if (!selectedBookId) return false;
    return entityIdsUsedInCurrentBook.has(entityId);
  };

  const selectFirstWorld = useCallback(() => {
    const firstWorldId = String(worlds[0]?.id || '').trim();
    if (!firstWorldId) {
      handleAddWorld();
      return '';
    }
    if (firstWorldId !== selectedWorldId) {
      handleSelectWorld(firstWorldId);
      showUiMessage('已切换到首个世界观库', 'success');
    }
    return firstWorldId;
  }, [worlds, handleAddWorld, selectedWorldId, handleSelectWorld, showUiMessage]);

  const selectFirstBook = useCallback(() => {
    const firstBookId = String(booksInWorld[0]?.id || books[0]?.id || '').trim();
    if (!firstBookId) {
      handleAddBook();
      return '';
    }
    if (firstBookId !== selectedBookId) {
      handleSelectBook(firstBookId);
      showUiMessage('已切换到首个当前作品', 'success');
    }
    return firstBookId;
  }, [booksInWorld, books, handleAddBook, selectedBookId, handleSelectBook, showUiMessage]);

  const handleActivationCreateEntity = useCallback(() => {
    const worldId = String(selectedWorldId || '').trim() || selectFirstWorld();
    if (!worldId) return;
    openEntityTab();
    handleStartNewEntity();
  }, [selectedWorldId, selectFirstWorld, openEntityTab, handleStartNewEntity]);

  const handleActivationCollectCapture = useCallback(() => {
    openCaptureTab();
    showUiMessage('在任意网页划词后右键“存入 World-Link”，即可回到灵感记录查看。', 'info');
  }, [openCaptureTab, showUiMessage]);

  const handleActivationBindBookUsage = useCallback(() => {
    if (worlds.length === 0) {
      handleAddWorld();
      return;
    }
    const worldId = String(selectedWorldId || '').trim() || selectFirstWorld();
    if (!worldId) return;

    if (books.length === 0) {
      handleAddBook();
      return;
    }
    const bookId = String(selectedBookId || '').trim() || selectFirstBook();
    if (!bookId) return;

    openEntityTab();
    if (entities.length === 0) {
      handleStartNewEntity();
      return;
    }

    showUiMessage('打开任一设定，勾选“用于当前作品”并保存，即可完成绑定。', 'info');
  }, [
    worlds.length,
    selectedWorldId,
    selectFirstWorld,
    books.length,
    selectedBookId,
    selectFirstBook,
    openEntityTab,
    entities.length,
    handleStartNewEntity,
    handleAddWorld,
    handleAddBook,
    showUiMessage
  ]);

  const hasWorld = worlds.length > 0;
  const hasBook = books.length > 0;
  const hasEntity = entities.length > 0;
  const hasCapture = capturedList.length > 0;
  const hasBookUsage = bookEntityUsages.length > 0;
  const activationSteps = useMemo(() => ([
    {
      id: 'create-world',
      title: '创建第一个世界观库',
      description: '这是你所有设定的主容器。',
      done: hasWorld,
      actionLabel: '+ 新建世界',
      onAction: handleAddWorld
    },
    {
      id: 'create-book',
      title: '创建当前作品',
      description: '用于隔离本书正在使用的设定。',
      done: hasBook,
      actionLabel: hasWorld ? '+ 新建作品' : '先建世界',
      onAction: hasWorld ? handleAddBook : handleAddWorld
    },
    {
      id: 'create-entity',
      title: '创建第一条设定',
      description: '建议先建主角或主舞台，便于后续关联。',
      done: hasEntity,
      actionLabel: '去新建设定',
      onAction: handleActivationCreateEntity
    },
    {
      id: 'capture-inspiration',
      title: '采集一条灵感记录',
      description: '在网页划词右键“存入 World-Link”。',
      done: hasCapture,
      actionLabel: '查看灵感记录',
      onAction: handleActivationCollectCapture
    },
    {
      id: 'bind-book-usage',
      title: '完成设定与作品绑定',
      description: '让“只看本书用到的设定”筛选立即可用。',
      done: hasBookUsage,
      actionLabel: '去完成绑定',
      onAction: handleActivationBindBookUsage
    }
  ]), [
    hasWorld,
    hasBook,
    hasEntity,
    hasCapture,
    hasBookUsage,
    handleAddWorld,
    handleAddBook,
    handleActivationCreateEntity,
    handleActivationCollectCapture,
    handleActivationBindBookUsage
  ]);

  const activationCompletedCount = activationSteps.filter((step) => step.done).length;
  const activationTotalCount = activationSteps.length;
  const activationProgressPercent = activationTotalCount > 0
    ? Math.round((activationCompletedCount / activationTotalCount) * 100)
    : 0;

  const activationGuide = useMemo(() => ({
    visible: !authRequired && !loading && !isActivationGuideDismissed && activationCompletedCount < activationTotalCount,
    completedCount: activationCompletedCount,
    totalCount: activationTotalCount,
    progressPercent: activationProgressPercent,
    steps: activationSteps
  }), [
    authRequired,
    loading,
    isActivationGuideDismissed,
    activationCompletedCount,
    activationTotalCount,
    activationProgressPercent,
    activationSteps
  ]);

  const onboardingTourSteps = useMemo(() => ([
    {
      id: 'tour-world-selector',
      targetSelector: '[data-tour-id="world-selector"]',
      title: '先确定工作上下文',
      description: '这里决定“你现在在编辑哪个世界观库”和“当前作品”。',
      done: Boolean(selectedWorldId),
      actionLabel: !selectedWorldId && hasWorld ? '自动切到首个世界' : '',
      onAction: () => {
        if (!selectedWorldId && hasWorld) {
          selectFirstWorld();
        }
      }
    },
    {
      id: 'tour-add-world',
      targetSelector: '[data-tour-id="add-world-btn"]',
      title: '创建你的第一个世界观库',
      description: '先建一个世界，后续设定和作品都会归到这里。',
      done: hasWorld,
      actionLabel: '立即创建世界',
      onAction: handleAddWorld
    },
    {
      id: 'tour-add-book',
      targetSelector: '[data-tour-id="add-book-btn"]',
      title: '创建当前作品',
      description: '作品用于区分“这本书实际用到的设定”。',
      done: hasBook,
      actionLabel: hasWorld ? '立即创建作品' : '先创建世界',
      onAction: hasWorld ? handleAddBook : handleAddWorld
    },
    {
      id: 'tour-entity-tab',
      targetSelector: '[data-tour-id="tab-entities"]',
      title: '进入设定库开始整理',
      description: '设定库是你的核心工作台，支持检索、编辑、关系与导出。',
      done: activeTab === 'entities',
      actionLabel: '切到设定库',
      onAction: openEntityTab
    },
    {
      id: 'tour-create-entity',
      targetSelector: '[data-tour-id="create-entity-btn"]',
      title: '创建第一条设定',
      description: '建议先建主角或主舞台，后续关系搭建更顺。',
      done: hasEntity,
      actionLabel: '立即新建设定',
      onAction: handleActivationCreateEntity
    },
    {
      id: 'tour-captures-tab',
      targetSelector: '[data-tour-id="tab-captures"]',
      title: '回到灵感箱收集素材',
      description: '在网页划词后右键“存入 World-Link”，就会自动进入这里。',
      done: activeTab === 'captures' || hasCapture,
      actionLabel: '打开灵感箱',
      onAction: handleActivationCollectCapture
    }
  ]), [
    selectedWorldId,
    hasWorld,
    hasBook,
    hasEntity,
    hasCapture,
    activeTab,
    handleAddWorld,
    handleAddBook,
    openEntityTab,
    handleActivationCreateEntity,
    handleActivationCollectCapture,
    selectFirstWorld
  ]);

  useEffect(() => {
    if (authRequired || loading) {
      activationSessionIdRef.current = '';
      activationMetricsReadyRef.current = false;
      activationPrevDoneMapRef.current = {};
      activationPrevCompletedRef.current = 0;
      activationCompletedTrackedRef.current = false;
      tourViewedStepIdRef.current = '';
      tourOpenStateRef.current = false;
      tourAutoAdvanceSignatureRef.current = '';
      tourCompletionNoticeRef.current = false;
      return;
    }

    if (activationMetricsReadyRef.current) return;

    const sessionId = `activation-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    activationSessionIdRef.current = sessionId;
    activationMetricsReadyRef.current = true;
    activationCompletedTrackedRef.current = activationCompletedCount >= activationTotalCount && activationTotalCount > 0;
    activationPrevCompletedRef.current = activationCompletedCount;
    activationPrevDoneMapRef.current = activationSteps.reduce((acc, step) => {
      acc[step.id] = Boolean(step.done);
      return acc;
    }, {});

    trackActivation('activation_session_start', {
      completedCount: activationCompletedCount,
      totalCount: activationTotalCount
    });
  }, [authRequired, loading, activationSteps, activationCompletedCount, activationTotalCount, trackActivation]);

  useEffect(() => {
    if (!activationMetricsReadyRef.current) return;

    const previousDoneMap = activationPrevDoneMapRef.current || {};
    const previousCompleted = activationPrevCompletedRef.current || 0;

    activationSteps.forEach((step, index) => {
      const wasDone = Boolean(previousDoneMap[step.id]);
      const isDone = Boolean(step.done);
      if (!wasDone && isDone) {
        trackActivation('activation_step_completed', {
          stepId: step.id,
          stepTitle: step.title,
          stepIndex: index,
          completedCount: activationCompletedCount,
          totalCount: activationTotalCount,
          delta: activationCompletedCount - previousCompleted
        });
      }
    });

    activationPrevDoneMapRef.current = activationSteps.reduce((acc, step) => {
      acc[step.id] = Boolean(step.done);
      return acc;
    }, {});
    activationPrevCompletedRef.current = activationCompletedCount;

    if (!activationCompletedTrackedRef.current && activationTotalCount > 0 && activationCompletedCount >= activationTotalCount) {
      activationCompletedTrackedRef.current = true;
      trackActivation('activation_completed', {
        completedCount: activationCompletedCount,
        totalCount: activationTotalCount
      });
    }
  }, [activationSteps, activationCompletedCount, activationTotalCount, trackActivation]);

  const openOnboardingTour = () => {
    setIsActivationGuideDismissed(false);
    setOnboardingTourStepIndex(findFirstIncompleteStepIndex(onboardingTourSteps));
    setIsOnboardingTourOpen(true);
  };

  const closeOnboardingTour = () => {
    setIsOnboardingTourOpen(false);
  };

  const areAllOnboardingStepsDone = onboardingTourSteps.length > 0 && onboardingTourSteps.every((step) => step.done);
  const effectiveOnboardingTourStepIndex = useMemo(() => {
    if (onboardingTourSteps.length === 0) return 0;

    const maxIndex = onboardingTourSteps.length - 1;
    const safeIndex = Math.max(0, Math.min(onboardingTourStepIndex, maxIndex));
    if (!isOnboardingTourOpen) return safeIndex;

    const currentStep = onboardingTourSteps[safeIndex];
    if (!currentStep?.done) return safeIndex;

    const nextIncompleteIndex = findNextIncompleteStepIndex(onboardingTourSteps, safeIndex);
    if (nextIncompleteIndex >= 0) return nextIncompleteIndex;

    const firstIncompleteIndex = findFirstIncompleteStepIndex(onboardingTourSteps);
    if (!onboardingTourSteps[firstIncompleteIndex]?.done) return firstIncompleteIndex;

    return safeIndex;
  }, [isOnboardingTourOpen, onboardingTourStepIndex, onboardingTourSteps]);
  const isOnboardingTourVisible = isOnboardingTourOpen && !areAllOnboardingStepsDone;

  const nextOnboardingTourStep = () => {
    const maxIndex = Math.max(0, onboardingTourSteps.length - 1);
    const fromIndex = effectiveOnboardingTourStepIndex;
    const toIndex = Math.min(fromIndex + 1, maxIndex);
    if (toIndex === fromIndex) return;

    trackActivation('tour_next', {
      fromStepIndex: fromIndex,
      toStepIndex: toIndex,
      fromStepId: onboardingTourSteps[fromIndex]?.id || '',
      toStepId: onboardingTourSteps[toIndex]?.id || ''
    });
    setOnboardingTourStepIndex(toIndex);
  };

  const prevOnboardingTourStep = () => {
    const fromIndex = effectiveOnboardingTourStepIndex;
    const toIndex = Math.max(fromIndex - 1, 0);
    if (toIndex === fromIndex) return;

    trackActivation('tour_prev', {
      fromStepIndex: fromIndex,
      toStepIndex: toIndex,
      fromStepId: onboardingTourSteps[fromIndex]?.id || '',
      toStepId: onboardingTourSteps[toIndex]?.id || ''
    });
    setOnboardingTourStepIndex(toIndex);
  };

  const runOnboardingTourStepAction = (stepInput) => {
    const fallbackStep = onboardingTourSteps[effectiveOnboardingTourStepIndex];
    const step = stepInput || fallbackStep;
    if (!step || typeof step.onAction !== 'function') return;

    const stepIndex = onboardingTourSteps.findIndex((item) => item.id === step.id);
    trackActivation('tour_step_action', {
      stepId: step.id,
      stepTitle: step.title,
      stepIndex: stepIndex >= 0 ? stepIndex : effectiveOnboardingTourStepIndex
    });
    step.onAction();
  };

  useEffect(() => {
    if (!activationMetricsReadyRef.current) return;
    const wasOpen = tourOpenStateRef.current;

    if (!wasOpen && isOnboardingTourVisible) {
      const step = onboardingTourSteps[effectiveOnboardingTourStepIndex];
      trackActivation('tour_opened', {
        stepId: step?.id || '',
        stepIndex: effectiveOnboardingTourStepIndex
      });
    }

    if (wasOpen && !isOnboardingTourVisible) {
      trackActivation('tour_closed', {
        stepId: onboardingTourSteps[effectiveOnboardingTourStepIndex]?.id || '',
        stepIndex: effectiveOnboardingTourStepIndex
      });
      tourViewedStepIdRef.current = '';
    }

    tourOpenStateRef.current = isOnboardingTourVisible;
  }, [isOnboardingTourVisible, effectiveOnboardingTourStepIndex, onboardingTourSteps, trackActivation]);

  useEffect(() => {
    if (!activationMetricsReadyRef.current || !isOnboardingTourVisible) return;

    const step = onboardingTourSteps[effectiveOnboardingTourStepIndex];
    const stepId = String(step?.id || '');
    if (!stepId || tourViewedStepIdRef.current === stepId) return;

    tourViewedStepIdRef.current = stepId;
    trackActivation('tour_step_viewed', {
      stepId,
      stepTitle: step?.title || '',
      stepIndex: effectiveOnboardingTourStepIndex,
      done: Boolean(step?.done)
    });
  }, [isOnboardingTourVisible, effectiveOnboardingTourStepIndex, onboardingTourSteps, trackActivation]);

  useEffect(() => {
    if (!activationMetricsReadyRef.current || !isOnboardingTourVisible || onboardingTourSteps.length === 0) {
      tourAutoAdvanceSignatureRef.current = '';
      return;
    }

    const maxIndex = Math.max(0, onboardingTourSteps.length - 1);
    const fromStepIndex = Math.max(0, Math.min(onboardingTourStepIndex, maxIndex));
    const toStepIndex = Math.max(0, Math.min(effectiveOnboardingTourStepIndex, maxIndex));
    if (fromStepIndex === toStepIndex) {
      tourAutoAdvanceSignatureRef.current = '';
      return;
    }

    const signature = `${fromStepIndex}->${toStepIndex}|${onboardingTourSteps.map((step) => (step.done ? '1' : '0')).join('')}`;
    if (tourAutoAdvanceSignatureRef.current === signature) return;
    tourAutoAdvanceSignatureRef.current = signature;

    trackActivation('tour_auto_advance', {
      fromStepId: onboardingTourSteps[fromStepIndex]?.id || '',
      fromStepIndex,
      toStepId: onboardingTourSteps[toStepIndex]?.id || '',
      toStepIndex,
      reason: 'step_completed'
    });
  }, [
    isOnboardingTourVisible,
    onboardingTourStepIndex,
    effectiveOnboardingTourStepIndex,
    onboardingTourSteps,
    trackActivation
  ]);

  useEffect(() => {
    if (!activationMetricsReadyRef.current) return;
    if (!isOnboardingTourOpen) {
      tourCompletionNoticeRef.current = false;
      return;
    }
    if (!areAllOnboardingStepsDone || tourCompletionNoticeRef.current) return;

    tourCompletionNoticeRef.current = true;
    trackActivation('tour_auto_advance', {
      fromStepId: onboardingTourSteps[effectiveOnboardingTourStepIndex]?.id || '',
      fromStepIndex: effectiveOnboardingTourStepIndex,
      toStepId: '',
      toStepIndex: -1,
      reason: 'all_completed'
    });
    showUiMessage('引导已完成，你可以直接进入高频创作。', 'success');
  }, [
    isOnboardingTourOpen,
    areAllOnboardingStepsDone,
    onboardingTourSteps,
    effectiveOnboardingTourStepIndex,
    trackActivation,
    showUiMessage
  ]);

  const onboardingTour = {
    open: isOnboardingTourVisible,
    currentStepIndex: effectiveOnboardingTourStepIndex,
    steps: onboardingTourSteps
  };

  const resolvedOverviewRelationScope = selectedBookId ? overviewRelationScope : 'world';
  const resolvedOverviewBookGraphId = booksInWorld.some((book) => book.id === overviewBookGraphId)
    ? overviewBookGraphId
    : booksInWorld.some((book) => book.id === selectedBookId)
      ? selectedBookId
      : booksInWorld[0]?.id || '';
  const scopedBookRelationRows = bookRelationRowsByBookId[resolvedOverviewBookGraphId] || emptyRelationRows;

  const worldQuickRows = useWorldQuickRows({ worlds, books, entities, entityRelations });

  const handleQuickJumpWorld = (worldId) => {
    if (!worldId) return;
    handleSelectWorld(worldId);
    setActiveTab('overview');
    showUiMessage('已切换到目标世界观库', 'success');
  };

  return buildAppProps({
    activeTab,
    selectedWorldId,
    selectedBookId,
    entitySearchQuery,
    entityTypeFilter,
    entityTagFilter,
    captureStatusFilter,
    captureSourceFilter,
    captureTimeFilter,
    overviewRelationScope,
    overviewBookGraphId,
    isAccountModalOpen,
    uiMessage,
    loading,
    error,
    authRequired,
    isRefreshing,
    subscriptionStatus,
    actionDialog,
    actionDialogValues,
    dialogSubmitting,
    editingEntity,
    isSavingEntity,
    isAiAssisting,
    isCheckingConflict,
    isGeneratingImage,
    isSubmittingAiFeedback,
    manuscriptText,
    manuscriptSuggestions,
    manuscriptRelationSuggestions,
    manuscriptParseMeta,
    isParsingManuscript,
    currentWorld,
    currentBook,
    booksInWorld,
    entitiesInWorld,
    entitiesInContext,
    entitiesForView,
    availableTagOptions,
    normalizedQuery,
    entityIdsUsedInCurrentBook,
    distributionRows,
    recentEntities,
    relationsInWorld,
    relationCount,
    worldRelationRows,
    bookRelationRowsByBookId,
    emptyRelationRows,
    captureSourceOptions,
    capturesForView,
    recentCaptures,
    isJsonExportDisabled,
    isMarkdownExportDisabled,
    jsonExportDisabledReason,
    overviewStats,
    worldBookHeaderMeta,
    effectivePlan,
    captureQuotaLabel,
    markdownExportQuotaLabel,
    cloudLastErrorHint,
    accountDisplayName,
    accountIdentityLabel,
    accountTriggerStatus,
    helperText,
    canUpgradePlan,
    activationDebugAvailable,
    isActivationDebugOpen,
    isActivationDebugLoading,
    isActivationDebugExporting,
    activationDebugSnapshot,
    authSession,
    aiAssistMeta,
    aiAssistProfile,
    conflictCheckMeta,
    accountNotice,
    isRefreshingEntitlements,
    capturedList,
    highlightedCaptureId,
    resolvedOverviewRelationScope,
    resolvedOverviewBookGraphId,
    scopedBookRelationRows,
    worldQuickRows,
    activationGuide,
    onboardingTour,
    worlds,
    books,
    entities,
    bookEntityUsages,
    entityRelations,
    handleTabChange,
    handleRefresh,
    clearUiMessage,
    handleSelectWorld,
    handleSelectBook,
    handleAddWorld,
    handleAddBook,
    closeActionDialog,
    handleSubmitActionDialog,
    updateDialogField,
    handleStartNewEntity,
    handleEditEntity,
    handleEntityFieldChange,
    handleToggleEditorTag,
    handleAiAssist,
    handleCheckConflict,
    handleGenerateEntityImage,
    handleApplyImageAsset,
    handleSubmitAiFeedback,
    handleCancelEdit,
    handleSaveEntity,
    setAiAssistProfile,
    setManuscriptText,
    handleParseManuscript,
    handleApplyManuscriptSuggestion,
    handleClearManuscriptSuggestions,
    handleBatchApplyRelations,
    handleExportJson,
    handleExportMarkdown,
    handleClearEntityFilters,
    setEntitySearchQuery,
    setEntityTypeFilter,
    setEntityTagFilter,
    setCaptureStatusFilter,
    setCaptureSourceFilter,
    setCaptureTimeFilter,
    handleClearCaptureFilters,
    handleUpdateCaptureStatus,
    handleCreateFromCapture,
    openEntityTab,
    openCaptureTab,
    clearSelectedBook,
    openAccountModal,
    closeAccountModal,
    handleSignOut,
    handleSignIn,
    handleRegister,
    handleUpgradeLocalPlan,
    handleRefreshEntitlements,
    toggleActivationDebugPanel,
    refreshActivationDebugSnapshot,
    clearActivationDebugSnapshot,
    exportActivationDebugSnapshot,
    setOverviewRelationScope,
    setOverviewBookGraphId,
    handleQuickJumpWorld,
    isEntityUsedInCurrentBook,
    dismissActivationGuide,
    openOnboardingTour,
    closeOnboardingTour,
    nextOnboardingTourStep,
    prevOnboardingTourStep,
    runOnboardingTourStepAction
  });
}
