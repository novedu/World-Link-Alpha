import { useMemo, useState } from 'react';
import App from './App';
import WorldBookSection from './components/WorldBookSection';
import WorldSummaryCard from './components/WorldSummaryCard';
import EntitySection from './components/EntitySection';
import CaptureSection from './components/CaptureSection';
import TimelineSection from './components/TimelineSection';
import PrimaryTabBar from './components/PrimaryTabBar';
import BrandHeader from './components/BrandHeader';
import AccountSyncModal from './components/AccountSyncModal';
import ActionDialog from './components/ActionDialog';
import InlineMessage from './components/InlineMessage';
import {
  BASE_TAG_OPTIONS,
  CAPTURE_STATUS_OPTIONS,
  CAPTURE_TIME_FILTER_OPTIONS,
  ENTITY_RELATION_LABELS,
  ENTITY_RELATION_OPTIONS,
  TYPE_LABELS
} from './constants/worldLink';
import { parseTags } from './utils/entityUtils';
import { getCaptureDomain, getCaptureStatus, matchCaptureTime } from './utils/captureUtils';
import { useEntityFilters } from './hooks/useEntityFilters';
import { useCaptureFilters } from './hooks/useCaptureFilters';
import { useRuntimeContext } from './hooks/useRuntimeContext';
import { useActionDialogFlow } from './hooks/useActionDialogFlow';
import { useEntityEditorFlow } from './hooks/useEntityEditorFlow';
import { useCaptureInboxFlow } from './hooks/useCaptureInboxFlow';
import { useStorageSync } from './hooks/useStorageSync';
import { useExportFlow } from './hooks/useExportFlow';
import { useOverviewStats } from './hooks/useOverviewStats';
import { useAccountViewModel } from './hooks/useAccountViewModel';
import { useUiMessage } from './hooks/useUiMessage';
import { useSelectionState } from './hooks/useSelectionState';
import { useWorldBookMeta } from './hooks/useWorldBookMeta';
import { useWorldBookSelectionHandlers } from './hooks/useWorldBookSelectionHandlers';
import { useManuscriptFlow } from './hooks/useManuscriptFlow';
import { useAuthListeners } from './hooks/useAuthListeners';
import { useDataRefresh } from './hooks/useDataRefresh';

function AppContainer() {
  // 状态管理
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

  // 自定义 hooks
  const { selectedWorldId, setSelectedWorldId, selectedBookId, setSelectedBookId, selectWorld, selectBook } = useSelectionState();
  const { uiMessage, showUiMessage, clearUiMessage } = useUiMessage();
  const { capturedList, worlds, books, entities, bookEntityUsages, entityRelations, highlightedCaptureId, loading, error } = useStorageSync({ setSelectedWorldId });
  
  // 使用数据刷新 hook
  const { isRefreshing, handleRefresh } = useDataRefresh({ showUiMessage });
  
  // 使用认证监听 hook
  useAuthListeners({ showUiMessage, setIsAccountModalOpen });

  // 处理标签切换
  const handleTabChange = async (newTab) => {
    setActiveTab(newTab);
    // 切换 Tab 时刷新数据
    await handleRefresh();
  };

  const {
    runtimeContext,
    setRuntimeContext,
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
  } = useRuntimeContext({ onUiMessage: showUiMessage });

  // 计算订阅状态
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
        message: 'Pro 订阅已过期'
      };
    }

    if (daysUntilExpiry <= 7) {
      return {
        status: 'warning',
        message: `Pro 订阅将在 ${daysUntilExpiry} 天后过期`
      };
    }

    if (daysUntilExpiry <= 30) {
      return {
        status: 'info',
        message: `Pro 订阅将在 ${daysUntilExpiry} 天后过期`
      };
    }

    return null;
  }, [authSession]);

  const {
    actionDialog,
    actionDialogValues,
    dialogSubmitting,
    isMigratingLocalData,
    closeActionDialog,
    updateDialogField,
    handleSubmitActionDialog,
    handleAddWorld,
    handleAddBook,
    handleSignIn,
    handleRegister,
    handleMigrateLocalToCloud
  } = useActionDialogFlow({
    selectedWorldId,
    setSelectedWorldId,
    setSelectedBookId,
    authSession,
    setAuthSession,
    ensureCloudRuntimeReady,
    refreshRuntimeContext,
    onUiMessage: showUiMessage
  });

  const {
    editingEntity,
    setEditingEntity,
    isSavingEntity,
    isAiAssisting,
    isCheckingConflict,
    isSubmittingAiFeedback,
    handleStartNewEntity,
    handleEditEntity,
    handleEntityFieldChange,
    handleToggleEditorTag,
    handleAiAssist,
    handleCheckConflict,
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
    onUiMessage: showUiMessage
  });

  const { handleCreateFromCapture, handleUpdateCaptureStatus } = useCaptureInboxFlow({
    selectedWorldId,
    selectedBookId,
    setActiveTab,
    setEditingEntity,
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
    setRuntimeContext,
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

  const { effectivePlan, captureQuotaLabel, markdownExportQuotaLabel, cloudLastErrorHint, accountDisplayName, accountIdentityLabel, accountTriggerStatus, helperText, canMigrate, canUpgradePlan } = useAccountViewModel({ runtimeContext, authSession });

  const openAccountModal = () => {
    setIsAccountModalOpen(true);
  };

  const closeAccountModal = () => {
    setIsAccountModalOpen(false);
    setAccountNotice(null);
  };

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

  const openCaptureTab = () => {
    setActiveTab('captures');
  };

  const openEntityTab = () => {
    setActiveTab('entities');
  };

  const clearSelectedBook = () => {
    setSelectedBookId('');
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

  const resolvedOverviewRelationScope = selectedBookId ? overviewRelationScope : 'world';
  const resolvedOverviewBookGraphId = booksInWorld.some((book) => book.id === overviewBookGraphId)
    ? overviewBookGraphId
    : booksInWorld.some((book) => book.id === selectedBookId)
      ? selectedBookId
      : booksInWorld[0]?.id || '';
  const scopedBookRelationRows = bookRelationRowsByBookId[resolvedOverviewBookGraphId] || emptyRelationRows;

  const worldQuickRows = useMemo(() => {
    const booksByWorldId = books.reduce((acc, book) => {
      const key = String(book.worldId || '');
      if (!key) return acc;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const entitiesByWorldId = entities.reduce((acc, entity) => {
      const key = String(entity.worldId || '');
      if (!key) return acc;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const relationsByWorldId = entityRelations.reduce((acc, relation) => {
      const key = String(relation.worldId || '');
      if (!key) return acc;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return worlds
      .map((world) => ({
        worldId: world.id,
        worldName: world.name || '未命名世界',
        books: booksByWorldId[world.id] || 0,
        entities: entitiesByWorldId[world.id] || 0,
        relations: relationsByWorldId[world.id] || 0
      }))
      .sort((a, b) => b.relations - a.relations || b.entities - a.entities || b.books - a.books)
      .slice(0, 6);
  }, [books, entities, entityRelations, worlds]);

  const handleQuickJumpWorld = (worldId) => {
    if (!worldId) return;
    handleSelectWorld(worldId);
    setActiveTab('overview');
    showUiMessage('已切换到目标世界观库', 'success');
  };

  // 构建传递给 App 组件的 props
  const appProps = {
    // 状态
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
    isRefreshing,
    subscriptionStatus,
    actionDialog,
    actionDialogValues,
    dialogSubmitting,
    isMigratingLocalData,
    editingEntity,
    isSavingEntity,
    isAiAssisting,
    isCheckingConflict,
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
    canMigrate,
    canUpgradePlan,
    authSession,
    capturedList,
    highlightedCaptureId,
    resolvedOverviewRelationScope,
    resolvedOverviewBookGraphId,
    scopedBookRelationRows,
    worldQuickRows,
    worlds,
    books,
    entities,
    bookEntityUsages,
    entityRelations,

    // 事件处理函数
    onTabChange: handleTabChange,
    onRefresh: handleRefresh,
    onClearUiMessage: clearUiMessage,
    onSelectWorld: handleSelectWorld,
    onSelectBook: handleSelectBook,
    onAddWorld: handleAddWorld,
    onAddBook: handleAddBook,
    onCloseActionDialog: closeActionDialog,
    onSubmitActionDialog: handleSubmitActionDialog,
    onUpdateDialogField: updateDialogField,
    onStartNewEntity: handleStartNewEntity,
    onEditEntity: handleEditEntity,
    onEntityFieldChange: handleEntityFieldChange,
    onToggleEditorTag: handleToggleEditorTag,
    onAiAssist: handleAiAssist,
    onCheckConflict: handleCheckConflict,
    onSubmitAiFeedback: handleSubmitAiFeedback,
    onCancelEdit: handleCancelEdit,
    onSaveEntity: handleSaveEntity,
    onAiAssistProfileChange: setAiAssistProfile,
    onManuscriptTextChange: setManuscriptText,
    onParseManuscript: handleParseManuscript,
    onApplyManuscriptSuggestion: handleApplyManuscriptSuggestion,
    onClearManuscriptSuggestions: handleClearManuscriptSuggestions,
    onBatchApplyRelations: handleBatchApplyRelations,
    onExportJson: handleExportJson,
    onExportMarkdown: handleExportMarkdown,
    onClearEntityFilters: handleClearEntityFilters,
    onSearchChange: setEntitySearchQuery,
    onTypeFilterChange: setEntityTypeFilter,
    onTagFilterChange: setEntityTagFilter,
    onCaptureStatusFilterChange: setCaptureStatusFilter,
    onCaptureSourceFilterChange: setCaptureSourceFilter,
    onCaptureTimeFilterChange: setCaptureTimeFilter,
    onClearCaptureFilters: handleClearCaptureFilters,
    onMarkCaptureStatus: handleUpdateCaptureStatus,
    onCreateFromCapture: handleCreateFromCapture,
    onGoToEntityTab: openEntityTab,
    onGoToCaptureTab: openCaptureTab,
    onClearBookSelection: clearSelectedBook,
    onOpenAccountModal: openAccountModal,
    onCloseAccountModal: closeAccountModal,
    onSignOut: handleSignOut,
    onSignIn: handleSignIn,
    onRegister: handleRegister,
    onMigrateLocalToCloud: handleMigrateLocalToCloud,
    onUpgradePlan: handleUpgradeLocalPlan,
    onRefreshEntitlements: handleRefreshEntitlements,
    onRelationScopeChange: setOverviewRelationScope,
    onOverviewBookGraphChange: setOverviewBookGraphId,
    onQuickJumpWorld: handleQuickJumpWorld,
    isEntityUsedInCurrentBook
  };

  return <App {...appProps} />;
}

export default AppContainer;