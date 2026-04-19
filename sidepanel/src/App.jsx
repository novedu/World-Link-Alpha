import './App.css';
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

function App(props) {
  const {
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
    onTabChange,
    onRefresh,
    onClearUiMessage,
    onSelectWorld,
    onSelectBook,
    onAddWorld,
    onAddBook,
    onCloseActionDialog,
    onSubmitActionDialog,
    onUpdateDialogField,
    onStartNewEntity,
    onEditEntity,
    onEntityFieldChange,
    onToggleEditorTag,
    onAiAssist,
    onCheckConflict,
    onSubmitAiFeedback,
    onCancelEdit,
    onSaveEntity,
    onAiAssistProfileChange,
    onManuscriptTextChange,
    onParseManuscript,
    onApplyManuscriptSuggestion,
    onClearManuscriptSuggestions,
    onBatchApplyRelations,
    onExportJson,
    onExportMarkdown,
    onClearEntityFilters,
    onSearchChange,
    onTypeFilterChange,
    onTagFilterChange,
    onCaptureStatusFilterChange,
    onCaptureSourceFilterChange,
    onCaptureTimeFilterChange,
    onClearCaptureFilters,
    onMarkCaptureStatus,
    onCreateFromCapture,
    onGoToEntityTab,
    onGoToCaptureTab,
    onClearBookSelection,
    onOpenAccountModal,
    onCloseAccountModal,
    onSignOut,
    onSignIn,
    onRegister,
    onMigrateLocalToCloud,
    onUpgradePlan,
    onRefreshEntitlements,
    onRelationScopeChange,
    onOverviewBookGraphChange,
    onQuickJumpWorld,
    isEntityUsedInCurrentBook
  } = props;

  return (
    <div className="app-shell min-h-screen">
      <div className="section-stack">
        <BrandHeader
          accountDisplayName={accountDisplayName}
          accountTriggerStatus={accountTriggerStatus}
          subscriptionStatus={subscriptionStatus}
          onOpenAccount={onOpenAccountModal}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
        />

        <InlineMessage message={uiMessage} onClose={onClearUiMessage} />
        
        {loading && (
          <div className="section-card">
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-slate-600">加载数据中...</span>
            </div>
          </div>
        )}
        
        {error && (
          <div className="section-card">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <div className="text-red-500 mr-2">⚠️</div>
                <span className="text-red-700">{error}</span>
              </div>
              <button 
                onClick={onRefresh} 
                className="mt-2 text-sm text-blue-600 hover:underline"
              >
                重试
              </button>
            </div>
          </div>
        )}

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
            onSelectWorld={onSelectWorld}
            onSelectBook={onSelectBook}
            onAddWorld={onAddWorld}
            onAddBook={onAddBook}
          />
        </div>

        <PrimaryTabBar activeTab={activeTab} onTabChange={onTabChange} captureCount={capturedList.length} />

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
              onRelationScopeChange={onRelationScopeChange}
              overviewBookGraphId={resolvedOverviewBookGraphId}
              onOverviewBookGraphChange={onOverviewBookGraphChange}
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
              onQuickJumpWorld={onQuickJumpWorld}
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
              manuscriptRelationSuggestions={manuscriptRelationSuggestions}
              manuscriptParseMeta={manuscriptParseMeta}
              isParsingManuscript={isParsingManuscript}
              onSearchChange={onSearchChange}
              onTypeFilterChange={onTypeFilterChange}
              onTagFilterChange={onTagFilterChange}
              onClearEntityFilters={onClearEntityFilters}
              onStartNewEntity={onStartNewEntity}
              onEditEntity={onEditEntity}
              onChangeField={onEntityFieldChange}
              onToggleEditorTag={onToggleEditorTag}
              onAiAssist={onAiAssist}
              onCheckConflict={onCheckConflict}
              onManuscriptTextChange={onManuscriptTextChange}
              onParseManuscript={onParseManuscript}
              onApplyManuscriptSuggestion={onApplyManuscriptSuggestion}
              onClearManuscriptSuggestions={onClearManuscriptSuggestions}
              onBatchApplyRelations={onBatchApplyRelations}
              onSaveEntity={onSaveEntity}
              onCancelEdit={onCancelEdit}
              onExportJson={onExportJson}
              onExportMarkdown={onExportMarkdown}
              isExportDisabled={!selectedWorldId || entitiesForView.length === 0}
              isMarkdownExportDisabled={isMarkdownExportDisabled}
              isJsonExportDisabled={isJsonExportDisabled}
              jsonExportDisabledReason={jsonExportDisabledReason}
              isSavingEntity={isSavingEntity}
              isAiAssisting={isAiAssisting}
              isCheckingConflict={isCheckingConflict}
              isSubmittingAiFeedback={isSubmittingAiFeedback}
              aiAssistMeta={aiAssistMeta}
              aiAssistProfile={aiAssistProfile}
              onAiAssistProfileChange={onAiAssistProfileChange}
              conflictCheckMeta={conflictCheckMeta}
              onSubmitAiFeedback={onSubmitAiFeedback}
              isEntityUsedInCurrentBook={isEntityUsedInCurrentBook}
              totalEntitiesInContext={entitiesInContext.length}
              onGoToCaptureTab={onGoToCaptureTab}
              onClearBookSelection={onClearBookSelection}
              onAddWorld={onAddWorld}
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
              onCaptureStatusFilterChange={onCaptureStatusFilterChange}
              onCaptureSourceFilterChange={onCaptureSourceFilterChange}
              onCaptureTimeFilterChange={onCaptureTimeFilterChange}
              onClearCaptureFilters={onClearCaptureFilters}
              onMarkCaptureStatus={onMarkCaptureStatus}
              onCreateFromCapture={onCreateFromCapture}
              onGoToEntityTab={onGoToEntityTab}
              totalCaptureCount={capturedList.length}
            />
          </div>
        ) : null}

        {activeTab === 'timeline' ? (
          <div className="section-card fade-in">
            <TimelineSection
              currentWorld={currentWorld}
              currentEntity={editingEntity}
              entitiesInWorld={entitiesInWorld}
              onChangeField={onEntityFieldChange}
              relationOptions={ENTITY_RELATION_OPTIONS}
              relationLabels={ENTITY_RELATION_LABELS}
            />
          </div>
        ) : null}

        <AccountSyncModal
          open={isAccountModalOpen}
          onClose={onCloseAccountModal}
          accountIdentityLabel={accountIdentityLabel}
          authEmail={authSession?.email || ''}
          effectivePlan={effectivePlan}
          captureQuotaLabel={captureQuotaLabel}
          markdownExportQuotaLabel={markdownExportQuotaLabel}
          accountNotice={accountNotice}
          onRefreshEntitlements={onRefreshEntitlements}
          isRefreshingEntitlements={isRefreshingEntitlements}
          onMigrateLocalToCloud={onMigrateLocalToCloud}
          isMigratingLocalData={isMigratingLocalData}
          canMigrate={canMigrate}
          onUpgradePlan={onUpgradePlan}
          canUpgradePlan={canUpgradePlan}
          onSignOut={onSignOut}
          onSignIn={onSignIn}
          onRegister={onRegister}
          helperText={helperText}
          cloudLastErrorHint={cloudLastErrorHint}
        />

        <ActionDialog
          actionDialog={actionDialog}
          actionDialogValues={actionDialogValues}
          dialogSubmitting={dialogSubmitting}
          onClose={onCloseActionDialog}
          onSubmit={onSubmitActionDialog}
          onFieldChange={onUpdateDialogField}
        />
      </div>
    </div>
  );
}

export default App;