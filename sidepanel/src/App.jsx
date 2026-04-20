import './App.css';
import WorldBookSection from './components/WorldBookSection';
import { OverviewTabSection } from './components/AppSections/OverviewTabSection';
import { EntitiesTabSection } from './components/AppSections/EntitiesTabSection';
import { CapturesTabSection } from './components/AppSections/CapturesTabSection';
import { TimelineTabSection } from './components/AppSections/TimelineTabSection';
import PrimaryTabBar from './components/PrimaryTabBar';
import BrandHeader from './components/BrandHeader';
import AccountSyncModal from './components/AccountSyncModal';
import ActionDialog from './components/ActionDialog';
import InlineMessage from './components/InlineMessage';
import WorkspaceLaunchStateCard from './components/WorkspaceLaunchStateCard';
import ActivationChecklistCard from './components/ActivationChecklistCard';
import OnboardingTourOverlay from './components/OnboardingTourOverlay';
import {
  BASE_TAG_OPTIONS,
  CAPTURE_STATUS_OPTIONS,
  CAPTURE_TIME_FILTER_OPTIONS,
  ENTITY_RELATION_LABELS,
  ENTITY_RELATION_OPTIONS
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
    distributionRows,
    recentEntities,
    relationsInWorld,
    worldRelationRows,
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
    onGenerateEntityImage,
    onApplyImageAsset,
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
    onUpgradePlan,
    onRefreshEntitlements,
    onToggleActivationDebug,
    onRefreshActivationDebug,
    onClearActivationDebug,
    onExportActivationDebug,
    onRelationScopeChange,
    onOverviewBookGraphChange,
    onQuickJumpWorld,
    isEntityUsedInCurrentBook,
    onDismissActivationGuide,
    onStartOnboardingTour,
    onCloseOnboardingTour,
    onNextOnboardingTourStep,
    onPrevOnboardingTourStep,
    onRunOnboardingTourStepAction
  } = props;

  const hasWorkspaceData = worlds.length > 0 || capturedList.length > 0;
  const shouldShowStartupLoading = loading && !authRequired && !hasWorkspaceData;
  const shouldShowGuestLaunch = authRequired && !loading;
  const shouldShowBlockingError = Boolean(error) && !authRequired && !loading && !hasWorkspaceData;
  const shouldShowWorkspaceShell = !shouldShowStartupLoading && !shouldShowGuestLaunch && !shouldShowBlockingError;
  const shouldShowHeaderRefresh = shouldShowWorkspaceShell;
  const shouldShowTopUiMessage = Boolean(uiMessage) && !actionDialog?.open;

  const workspaceErrorMessage = error && hasWorkspaceData
    ? {
        type: 'error',
        title: '加载失败',
        text: error || '数据暂时没加载出来，请重试。',
        actions: [{ label: '重新加载', onClick: onRefresh }]
      }
    : null;

  const handleAccountSignOut = async () => {
    const signedOut = await onSignOut?.();
    if (signedOut) {
      onCloseAccountModal?.();
    }
  };

  const handleAccountSignIn = async () => {
    onCloseAccountModal?.();
    await onSignIn?.();
  };

  const handleAccountRegister = async () => {
    onCloseAccountModal?.();
    await onRegister?.();
  };

  return (
    <div className="app-shell min-h-screen">
      <div className="section-stack">
        <BrandHeader
          accountDisplayName={accountDisplayName}
          accountTriggerStatus={accountTriggerStatus}
          subscriptionStatus={subscriptionStatus}
          onOpenAccount={onOpenAccountModal}
          onRefresh={shouldShowHeaderRefresh ? onRefresh : undefined}
          isRefreshing={isRefreshing}
          isGuestView={shouldShowGuestLaunch}
        />

        {shouldShowTopUiMessage ? <InlineMessage message={uiMessage} onClose={onClearUiMessage} /> : null}

        {shouldShowStartupLoading && (
          <div className="status-card status-card-loading">
            <div className="status-card-icon" aria-hidden="true">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-sky-600"></div>
            </div>
            <div className="status-card-body">
              <p className="status-card-title">正在加载数据</p>
              <p className="status-card-description">正在同步世界、作品和设定，请稍候。</p>
            </div>
          </div>
        )}

        {workspaceErrorMessage ? <InlineMessage message={workspaceErrorMessage} /> : null}

        {shouldShowGuestLaunch ? (
          <WorkspaceLaunchStateCard variant="guest" onSignIn={onSignIn} onRegister={onRegister} />
        ) : null}

        {shouldShowBlockingError ? (
          <WorkspaceLaunchStateCard variant="error" onRetry={onRefresh} />
        ) : null}

        {shouldShowWorkspaceShell ? (
          <>
            <div className="section-card">
              <div className="card-header">
                <h2>当前范围</h2>
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

            {activationGuide?.visible ? (
              <ActivationChecklistCard
                checklist={activationGuide}
                onDismiss={onDismissActivationGuide}
                onStartTour={onStartOnboardingTour}
              />
            ) : null}

            <PrimaryTabBar activeTab={activeTab} onTabChange={onTabChange} captureCount={capturedList.length} />

            {activeTab === 'overview' ? (
              <OverviewTabSection
                overviewStats={overviewStats}
                currentWorld={currentWorld}
                currentBook={currentBook}
                distributionRows={distributionRows}
                recentEntities={recentEntities}
                recentCaptures={recentCaptures}
                selectedBookId={selectedBookId}
                booksInWorld={booksInWorld}
                resolvedOverviewRelationScope={resolvedOverviewRelationScope}
                onRelationScopeChange={onRelationScopeChange}
                resolvedOverviewBookGraphId={resolvedOverviewBookGraphId}
                onOverviewBookGraphChange={onOverviewBookGraphChange}
                relationsInWorld={relationsInWorld}
                worldRelationRows={worldRelationRows}
                scopedBookRelationRows={scopedBookRelationRows}
                selectedWorldId={selectedWorldId}
                worldQuickRows={worldQuickRows}
                onQuickJumpWorld={onQuickJumpWorld}
                onGoToTimelineTab={() => onTabChange('timeline')}
              />
            ) : null}

            {activeTab === 'entities' ? (
              <EntitiesTabSection
                selectedWorldId={selectedWorldId}
                selectedBookId={selectedBookId}
                entitiesForView={entitiesForView}
                editingEntity={editingEntity}
                entitySearchQuery={entitySearchQuery}
                entityTypeFilter={entityTypeFilter}
                entityTagFilter={entityTagFilter}
                availableTagOptions={availableTagOptions}
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
                onEntityFieldChange={onEntityFieldChange}
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
                isMarkdownExportDisabled={isMarkdownExportDisabled}
                isJsonExportDisabled={isJsonExportDisabled}
                jsonExportDisabledReason={jsonExportDisabledReason}
                isSavingEntity={isSavingEntity}
                isAiAssisting={isAiAssisting}
                isCheckingConflict={isCheckingConflict}
                isGeneratingImage={isGeneratingImage}
                isSubmittingAiFeedback={isSubmittingAiFeedback}
                aiAssistMeta={aiAssistMeta}
                aiAssistProfile={aiAssistProfile}
                onAiAssistProfileChange={onAiAssistProfileChange}
                conflictCheckMeta={conflictCheckMeta}
                onGenerateEntityImage={onGenerateEntityImage}
                onApplyImageAsset={onApplyImageAsset}
                onSubmitAiFeedback={onSubmitAiFeedback}
                isEntityUsedInCurrentBook={isEntityUsedInCurrentBook}
                entitiesInContext={entitiesInContext}
                onGoToCaptureTab={onGoToCaptureTab}
                onClearBookSelection={onClearBookSelection}
                onAddWorld={onAddWorld}
              />
            ) : null}

            {activeTab === 'captures' ? (
              <CapturesTabSection
                capturesForView={capturesForView}
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
                capturedList={capturedList}
              />
            ) : null}

            {activeTab === 'timeline' ? (
              <TimelineTabSection
                currentWorld={currentWorld}
                editingEntity={editingEntity}
                entitiesInWorld={entitiesInWorld}
                onEntityFieldChange={onEntityFieldChange}
                relationOptions={ENTITY_RELATION_OPTIONS}
                relationLabels={ENTITY_RELATION_LABELS}
              />
            ) : null}
          </>
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
          onUpgradePlan={onUpgradePlan}
          canUpgradePlan={canUpgradePlan}
          activationDebugAvailable={activationDebugAvailable}
          activationDebugOpen={isActivationDebugOpen}
          activationDebugSnapshot={activationDebugSnapshot}
          isActivationDebugLoading={isActivationDebugLoading}
          isActivationDebugExporting={isActivationDebugExporting}
          onToggleActivationDebug={onToggleActivationDebug}
          onRefreshActivationDebug={onRefreshActivationDebug}
          onClearActivationDebug={onClearActivationDebug}
          onExportActivationDebug={onExportActivationDebug}
          onSignOut={handleAccountSignOut}
          onSignIn={handleAccountSignIn}
          onRegister={handleAccountRegister}
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

        <OnboardingTourOverlay
          open={Boolean(onboardingTour?.open)}
          steps={onboardingTour?.steps || []}
          currentStepIndex={onboardingTour?.currentStepIndex || 0}
          onClose={onCloseOnboardingTour}
          onNext={onNextOnboardingTourStep}
          onPrev={onPrevOnboardingTourStep}
          onRunStepAction={onRunOnboardingTourStepAction}
        />
      </div>
    </div>
  );
}

export default App;
