import { useMemo, useState } from 'react';
import './App.css';
import WorldBookSection from './components/WorldBookSection';
import WorldSummaryCard from './components/WorldSummaryCard';
import EntitySection from './components/EntitySection';
import CaptureSection from './components/CaptureSection';
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
import { formatRuntimeError, sendRuntimeMessage } from './services/runtimeApi';

function App() {
  const [entitySearchQuery, setEntitySearchQuery] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('all');
  const [entityTagFilter, setEntityTagFilter] = useState('');
  const [activeTab, setActiveTab] = useState('entities');
  const [captureStatusFilter, setCaptureStatusFilter] = useState('all');
  const [captureSourceFilter, setCaptureSourceFilter] = useState('all');
  const [captureTimeFilter, setCaptureTimeFilter] = useState('all');
  const [overviewRelationScope, setOverviewRelationScope] = useState('book');
  const [overviewBookGraphId, setOverviewBookGraphId] = useState('');
  const [manuscriptText, setManuscriptText] = useState('');
  const [manuscriptSuggestions, setManuscriptSuggestions] = useState([]);
  const [isParsingManuscript, setIsParsingManuscript] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  const { selectedWorldId, setSelectedWorldId, selectedBookId, setSelectedBookId, selectWorld, selectBook } = useSelectionState();
  const { uiMessage, showUiMessage, clearUiMessage } = useUiMessage();
  const { capturedList, worlds, books, entities, bookEntityUsages, entityRelations, highlightedCaptureId } = useStorageSync({ setSelectedWorldId });

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
    handleStartNewEntity,
    handleEditEntity,
    handleEntityFieldChange,
    handleToggleEditorTag,
    handleAiAssist,
    handleCheckConflict,
    handleCancelEdit,
    handleSaveEntity
  } = useEntityEditorFlow({
    selectedWorldId,
    selectedBookId,
    bookEntityUsages,
    entityRelations,
    setActiveTab,
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
    runtimeContext,
    setRuntimeContext,
    refreshRuntimeContext,
    typeLabels: TYPE_LABELS,
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
  const { effectivePlan, captureQuotaLabel, markdownExportQuotaLabel, cloudLastErrorHint, accountDisplayName, accountIdentityLabel, accountTriggerStatus, helperText, canMigrate, canUpgradePlan } =
    useAccountViewModel({ runtimeContext, authSession });
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
  const handleParseManuscript = async () => {
    if (!selectedWorldId) {
      showUiMessage('请先选择世界观库后再解析书稿', 'warning');
      return;
    }
    const sourceText = String(manuscriptText || '').trim();
    if (!sourceText) {
      showUiMessage('请先粘贴书稿内容', 'warning');
      return;
    }
    if (isParsingManuscript) return;

    setIsParsingManuscript(true);
    const result = await sendRuntimeMessage('PARSE_MANUSCRIPT', {
      worldId: selectedWorldId,
      bookId: selectedBookId,
      text: sourceText
    });
    setIsParsingManuscript(false);

    if (!result?.success) {
      showUiMessage(formatRuntimeError(result, '书稿解析失败'), 'error');
      return;
    }

    const suggestions = Array.isArray(result.suggestions) ? result.suggestions : [];
    setManuscriptSuggestions(suggestions);
    showUiMessage(`解析完成，提取到 ${suggestions.length} 个候选设定`, 'success');
  };
  const handleClearManuscriptSuggestions = () => {
    setManuscriptSuggestions([]);
  };
  const handleApplyManuscriptSuggestion = (suggestion) => {
    if (!selectedWorldId || !suggestion) return;
    const nextTags = Array.isArray(suggestion.tags) && suggestion.tags.length > 0 ? suggestion.tags.join(', ') : '书稿提取';
    setActiveTab('entities');
    setEditingEntity({
      id: '',
      worldId: selectedWorldId,
      name: String(suggestion.name || '').trim(),
      type: suggestion.type || 'other',
      summary: suggestion.summary || '',
      tags: nextTags,
      relations: [],
      conflictHints: [],
      selectedText: suggestion.summary || '',
      sourceUrl: '',
      sourceTitle: selectedBookId ? '书稿解析（当前作品）' : '书稿解析',
      usedInCurrentBook: Boolean(selectedBookId)
    });
    showUiMessage(`已将「${suggestion.name || '候选设定'}」填充到设定编辑器`, 'success');
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

  return (
    <div className="app-shell min-h-screen">
      <div className="section-stack">
        <BrandHeader
          accountDisplayName={accountDisplayName}
          accountTriggerStatus={accountTriggerStatus}
          onOpenAccount={openAccountModal}
        />

        <InlineMessage message={uiMessage} onClose={clearUiMessage} />

        <div className="section-card">
          <div className="card-header">
            <h2>创作上下文</h2>
            <div className="text-sm card-header-meta card-header-meta-muted">
              {worldBookHeaderMeta}
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
              <h2>工作概览</h2>
              <div className="text-sm card-header-meta card-header-meta-muted">
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
              selectedBookId={selectedBookId}
              booksInWorld={booksInWorld}
              relationScope={resolvedOverviewRelationScope}
              onRelationScopeChange={setOverviewRelationScope}
              overviewBookGraphId={resolvedOverviewBookGraphId}
              onOverviewBookGraphChange={setOverviewBookGraphId}
              worldRelationCount={relationsInWorld.length}
              worldRelationTypeRows={worldRelationRows.relationTypeRows}
              worldRelationPreviewRows={worldRelationRows.relationPreviewRows}
              worldRelationGraphEdges={worldRelationRows.relationGraphEdges}
              bookRelationCount={scopedBookRelationRows.relationCount}
              bookRelationTypeRows={scopedBookRelationRows.relationTypeRows}
              bookRelationPreviewRows={scopedBookRelationRows.relationPreviewRows}
              bookRelationGraphEdges={scopedBookRelationRows.relationGraphEdges}
              selectedWorldId={selectedWorldId}
              worldQuickRows={worldQuickRows}
              onQuickJumpWorld={handleQuickJumpWorld}
            />
          </div>
        ) : null}

        {activeTab === 'entities' ? (
          <div className="section-card fade-in">
            <div className="card-header">
              <h2>设定库</h2>
              <div className="text-sm card-header-meta card-header-meta-muted">
                共 {entitiesForView.length} 条设定
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
              entitiesInWorld={entitiesInWorld}
              relationOptions={ENTITY_RELATION_OPTIONS}
              relationLabels={ENTITY_RELATION_LABELS}
              manuscriptText={manuscriptText}
              manuscriptSuggestions={manuscriptSuggestions}
              isParsingManuscript={isParsingManuscript}
              onSearchChange={setEntitySearchQuery}
              onTypeFilterChange={setEntityTypeFilter}
              onTagFilterChange={setEntityTagFilter}
              onClearEntityFilters={handleClearEntityFilters}
              onStartNewEntity={handleStartNewEntity}
              onEditEntity={handleEditEntity}
              onChangeField={handleEntityFieldChange}
              onToggleEditorTag={handleToggleEditorTag}
              onAiAssist={handleAiAssist}
              onCheckConflict={handleCheckConflict}
              onManuscriptTextChange={setManuscriptText}
              onParseManuscript={handleParseManuscript}
              onApplyManuscriptSuggestion={handleApplyManuscriptSuggestion}
              onClearManuscriptSuggestions={handleClearManuscriptSuggestions}
              onSaveEntity={handleSaveEntity}
              onCancelEdit={handleCancelEdit}
              onExportJson={handleExportJson}
              onExportMarkdown={handleExportMarkdown}
              isExportDisabled={!selectedWorldId || entitiesForView.length === 0}
              isMarkdownExportDisabled={isMarkdownExportDisabled}
              isJsonExportDisabled={isJsonExportDisabled}
              jsonExportDisabledReason={jsonExportDisabledReason}
              isSavingEntity={isSavingEntity}
              isAiAssisting={isAiAssisting}
              isCheckingConflict={isCheckingConflict}
              isEntityUsedInCurrentBook={isEntityUsedInCurrentBook}
              totalEntitiesInContext={entitiesInContext.length}
              onGoToCaptureTab={openCaptureTab}
              onClearBookSelection={clearSelectedBook}
              onAddWorld={handleAddWorld}
            />
          </div>
        ) : null}

        {activeTab === 'captures' ? (
          <div className="section-card fade-in">
            <div className="card-header">
              <h2>灵感收集箱</h2>
              <div className="text-sm card-header-meta card-header-meta-muted">
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
              onClearCaptureFilters={handleClearCaptureFilters}
              onMarkCaptureStatus={handleUpdateCaptureStatus}
              onCreateFromCapture={handleCreateFromCapture}
              onGoToEntityTab={openEntityTab}
              totalCaptureCount={capturedList.length}
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
          canMigrate={canMigrate}
          onUpgradePlan={handleUpgradeLocalPlan}
          canUpgradePlan={canUpgradePlan}
          onSignOut={handleSignOut}
          onSignIn={handleSignIn}
          helperText={helperText}
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
