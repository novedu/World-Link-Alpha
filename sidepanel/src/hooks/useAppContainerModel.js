import { useCallback, useMemo, useEffect } from 'react';
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
import { useAppContainerState } from './useAppContainerState';
import { useActivationFlow } from './useActivationFlow';
import { useOnboardingTour } from './useOnboardingTour';

export function useAppContainerModel() {
  const state = useAppContainerState();

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

  useAuthListeners({ showUiMessage, setIsAccountModalOpen: state.setIsAccountModalOpen });

  const trackActivation = useCallback((eventName, payload = {}) => {
    const safeEventName = String(eventName || '').trim();
    if (!safeEventName) return;
    const sessionId = String(state.activationSessionIdRef.current || '').trim();
    void trackActivationEvent(safeEventName, {
      sessionId,
      ...payload
    });
  }, [state.activationSessionIdRef]);

  // 激活会话初始化
  useEffect(() => {
    if (!authRequired && !loading && worlds.length >= 0 && !state.activationMetricsReadyRef.current) {
      // 生成会话 ID
      const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      state.activationSessionIdRef.current = sessionId;
      state.activationMetricsReadyRef.current = true;
      
      // 发送激活会话开始事件
      trackActivation('activation_session_start', {
        completedCount: 0,
        totalCount: 5 // 五步激活
      });
    }
  }, [authRequired, loading, worlds.length, trackActivation, state]);

  const activationDebugAvailable = Boolean(import.meta?.env?.DEV);

  const handleTabChange = async (newTab) => {
    state.setActiveTab(newTab);
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
    setActiveTab: state.setActiveTab,
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
    setActiveTab: state.setActiveTab,
    setEditingEntity,
    onDataChanged: reloadData,
    onUiMessage: showUiMessage
  });

  const { handleCreateFromCapture, handleUpdateCaptureStatus } = useCaptureInboxFlow({
    selectedWorldId,
    selectedBookId,
    setActiveTab: state.setActiveTab,
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
    entitySearchQuery: state.entitySearchQuery,
    entityTypeFilter: state.entityTypeFilter,
    entityTagFilter: state.entityTagFilter,
    baseTagOptions: BASE_TAG_OPTIONS,
    typeLabels: TYPE_LABELS,
    relationLabels: ENTITY_RELATION_LABELS,
    parseTags
  });

  const { captureSourceOptions, capturesForView, recentCaptures } = useCaptureFilters({
    capturedList,
    captureStatusFilter: state.captureStatusFilter,
    captureSourceFilter: state.captureSourceFilter,
    captureTimeFilter: state.captureTimeFilter,
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
    entityTypeFilter: state.entityTypeFilter,
    entityTagFilter: state.entityTagFilter,
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

  const { handleSelectWorld, handleSelectBook } = useWorldBookSelectionHandlers({
    selectWorld,
    selectBook,
    setEditingEntity,
    setEntityTagFilter: state.setEntityTagFilter,
    setEntitySearchQuery: state.setEntitySearchQuery
  });

  const handleExportJson = () => {
    void handleExport('json');
  };

  const handleExportMarkdown = () => {
    void handleExport('markdown');
  };

  const handleClearEntityFilters = () => {
    state.setEntitySearchQuery('');
    state.setEntityTypeFilter('all');
    state.setEntityTagFilter('');
  };

  const openCaptureTab = useCallback(() => {
    state.setActiveTab('captures');
  }, [state]);

  const openEntityTab = useCallback(() => {
    state.setActiveTab('entities');
  }, [state]);

  const clearSelectedBook = () => {
    setSelectedBookId('');
  };

  const dismissActivationGuide = () => {
    state.setIsActivationGuideDismissed(true);
  };

  const handleClearCaptureFilters = () => {
    state.setCaptureStatusFilter('all');
    state.setCaptureSourceFilter('all');
    state.setCaptureTimeFilter('all');
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

  const activationFlow = useActivationFlow({
    worlds,
    books,
    entities,
    capturedList,
    bookEntityUsages,
    selectedWorldId,
    selectedBookId,
    handleAddWorld,
    handleAddBook,
    handleStartNewEntity,
    openEntityTab,
    openCaptureTab,
    selectFirstWorld,
    selectFirstBook,
    showUiMessage,
    activationMetricsReadyRef: state.activationMetricsReadyRef,
    activationPrevDoneMapRef: state.activationPrevDoneMapRef,
    activationPrevCompletedRef: state.activationPrevCompletedRef,
    activationCompletedTrackedRef: state.activationCompletedTrackedRef,
    trackActivation
  });

  const activationGuide = useMemo(() => ({
    visible: !authRequired && !loading && !state.isActivationGuideDismissed && activationFlow.activationCompletedCount < activationFlow.activationTotalCount,
    completedCount: activationFlow.activationCompletedCount,
    totalCount: activationFlow.activationTotalCount,
    progressPercent: activationFlow.activationProgressPercent,
    steps: activationFlow.activationSteps
  }), [
    authRequired,
    loading,
    state.isActivationGuideDismissed,
    activationFlow.activationCompletedCount,
    activationFlow.activationTotalCount,
    activationFlow.activationProgressPercent,
    activationFlow.activationSteps
  ]);

  const onboardingTour = useOnboardingTour({
    worlds,
    books,
    entities,
    selectedWorldId,
    handleAddWorld,
    handleAddBook,
    openEntityTab,
    selectFirstWorld,
    isOnboardingTourOpen: state.isOnboardingTourOpen,
    setIsOnboardingTourOpen: state.setIsOnboardingTourOpen,
    onboardingTourStepIndex: state.onboardingTourStepIndex,
    setOnboardingTourStepIndex: state.setOnboardingTourStepIndex,
    activationMetricsReadyRef: state.activationMetricsReadyRef,
    trackActivation,
    showUiMessage,
    findFirstIncompleteStepIndex: activationFlow.findFirstIncompleteStepIndex,
    findNextIncompleteStepIndex: activationFlow.findNextIncompleteStepIndex,
    tourOpenStateRef: state.tourOpenStateRef,
    tourViewedStepIdRef: state.tourViewedStepIdRef,
    tourAutoAdvanceSignatureRef: state.tourAutoAdvanceSignatureRef,
    tourCompletionNoticeRef: state.tourCompletionNoticeRef
  });

  const refreshActivationDebugSnapshot = useCallback(async () => {
    if (!activationDebugAvailable) return;
    state.setIsActivationDebugLoading(true);
    try {
      const snapshot = await getActivationAnalyticsSnapshot();
      state.setActivationDebugSnapshot(snapshot);
    } catch {
      state.setActivationDebugSnapshot(null);
      showUiMessage('读取激活埋点失败，请重试。', 'error');
    } finally {
      state.setIsActivationDebugLoading(false);
    }
  }, [activationDebugAvailable, state, showUiMessage]);

  const clearActivationDebugSnapshot = useCallback(async () => {
    if (!activationDebugAvailable) return;
    state.setIsActivationDebugLoading(true);
    try {
      await clearActivationAnalyticsEvents();
      const snapshot = await getActivationAnalyticsSnapshot();
      state.setActivationDebugSnapshot(snapshot);
      showUiMessage('激活埋点已清空。', 'success');
    } catch {
      showUiMessage('清空激活埋点失败，请重试。', 'error');
    } finally {
      state.setIsActivationDebugLoading(false);
    }
  }, [activationDebugAvailable, state, showUiMessage]);

  const exportActivationDebugSnapshot = useCallback(async () => {
    if (!activationDebugAvailable) return;
    state.setIsActivationDebugExporting(true);
    try {
      const snapshot = await getActivationAnalyticsSnapshot();
      state.setActivationDebugSnapshot(snapshot);

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
      state.setIsActivationDebugExporting(false);
    }
  }, [activationDebugAvailable, state, showUiMessage]);

  const toggleActivationDebugPanel = useCallback(() => {
    if (!activationDebugAvailable) return;
    state.setIsActivationDebugOpen((prev) => {
      const next = !prev;
      if (next) {
        void refreshActivationDebugSnapshot();
      }
      return next;
    });
  }, [activationDebugAvailable, state, refreshActivationDebugSnapshot]);

  const openAccountModal = () => {
    state.setIsAccountModalOpen(true);
  };

  const closeAccountModal = () => {
    state.setIsAccountModalOpen(false);
    setAccountNotice(null);
  };

  const resolvedOverviewRelationScope = selectedBookId ? state.overviewRelationScope : 'world';
  const resolvedOverviewBookGraphId = booksInWorld.some((book) => book.id === state.overviewBookGraphId)
    ? state.overviewBookGraphId
    : booksInWorld.some((book) => book.id === selectedBookId)
      ? selectedBookId
      : booksInWorld[0]?.id || '';
  const scopedBookRelationRows = bookRelationRowsByBookId[resolvedOverviewBookGraphId] || emptyRelationRows;

  const worldQuickRows = useWorldQuickRows({ worlds, books, entities, entityRelations });

  const handleQuickJumpWorld = (worldId) => {
    if (!worldId) return;
    handleSelectWorld(worldId);
    state.setActiveTab('overview');
    showUiMessage('已切换到目标世界观库', 'success');
  };

  return buildAppProps({
    activeTab: state.activeTab,
    selectedWorldId,
    selectedBookId,
    entitySearchQuery: state.entitySearchQuery,
    entityTypeFilter: state.entityTypeFilter,
    entityTagFilter: state.entityTagFilter,
    captureStatusFilter: state.captureStatusFilter,
    captureSourceFilter: state.captureSourceFilter,
    captureTimeFilter: state.captureTimeFilter,
    overviewRelationScope: state.overviewRelationScope,
    overviewBookGraphId: state.overviewBookGraphId,
    isAccountModalOpen: state.isAccountModalOpen,
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
    isActivationDebugOpen: state.isActivationDebugOpen,
    isActivationDebugLoading: state.isActivationDebugLoading,
    isActivationDebugExporting: state.isActivationDebugExporting,
    activationDebugSnapshot: state.activationDebugSnapshot,
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
    onboardingTour: onboardingTour.onboardingTour,
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
    setEntitySearchQuery: state.setEntitySearchQuery,
    setEntityTypeFilter: state.setEntityTypeFilter,
    setEntityTagFilter: state.setEntityTagFilter,
    setCaptureStatusFilter: state.setCaptureStatusFilter,
    setCaptureSourceFilter: state.setCaptureSourceFilter,
    setCaptureTimeFilter: state.setCaptureTimeFilter,
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
    setOverviewRelationScope: state.setOverviewRelationScope,
    setOverviewBookGraphId: state.setOverviewBookGraphId,
    handleQuickJumpWorld,
    isEntityUsedInCurrentBook,
    dismissActivationGuide,
    openOnboardingTour: onboardingTour.openOnboardingTour,
    closeOnboardingTour: onboardingTour.closeOnboardingTour,
    nextOnboardingTourStep: onboardingTour.nextOnboardingTourStep,
    prevOnboardingTourStep: onboardingTour.prevOnboardingTourStep,
    runOnboardingTourStepAction: onboardingTour.runOnboardingTourStepAction
  });
}