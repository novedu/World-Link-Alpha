import { useMemo, useState, useCallback } from 'react';
import EmptyStateCard from '../EmptyStateCard';
import { EntityToolbar, EntityFilters } from './EntityToolbar';
import { ManuscriptPanel } from './ManuscriptPanel';
import { EntityList } from './EntityList';
import { EntityEditor } from './EntityEditor';

function EntitySection({
  selectedWorldId,
  selectedBookId,
  entitiesForView,
  editingEntity,
  entitySearchQuery,
  entityTypeFilter,
  entityTagFilter,
  tagOptions,
  baseTagOptions,
  entitiesInWorld,
  relationOptions,
  relationLabels,
  manuscriptText,
  manuscriptSuggestions,
  manuscriptRelationSuggestions,
  manuscriptParseMeta,
  isParsingManuscript,
  onSearchChange,
  onTypeFilterChange,
  onTagFilterChange,
  onClearEntityFilters,
  onStartNewEntity,
  onEditEntity,
  onChangeField,
  onToggleEditorTag,
  onAiAssist,
  onCheckConflict,
  onManuscriptTextChange,
  onParseManuscript,
  onApplyManuscriptSuggestion,
  onClearManuscriptSuggestions,
  onBatchApplyRelations,
  onSaveEntity,
  onCancelEdit,
  onExportJson,
  onExportMarkdown,
  isExportDisabled,
  isMarkdownExportDisabled,
  isJsonExportDisabled,
  jsonExportDisabledReason,
  isSavingEntity,
  isAiAssisting,
  isCheckingConflict,
  isGeneratingImage,
  isSubmittingAiFeedback,
  aiAssistMeta,
  aiAssistProfile,
  onAiAssistProfileChange,
  conflictCheckMeta,
  onGenerateEntityImage,
  onApplyImageAsset,
  onSubmitAiFeedback,
  isEntityUsedInCurrentBook,
  totalEntitiesInContext,
  onGoToCaptureTab,
  onClearBookSelection,
  onAddWorld
}) {
  const [relationDraftState, setRelationDraftState] = useState({
    editorId: '',
    toEntityId: '',
    type: 'related_to',
    note: ''
  });

  const hasActiveEntityFilters = useMemo(
    () => Boolean(entitySearchQuery || entityTagFilter || entityTypeFilter !== 'all'),
    [entitySearchQuery, entityTagFilter, entityTypeFilter]
  );

  const currentEditorId = editingEntity?.id || '__new__';

  const handleUpdateRelationDraft = useCallback((updates) => {
    setRelationDraftState((prev) => ({
      editorId: currentEditorId,
      ...prev,
      ...updates
    }));
  }, [currentEditorId]);

  const handleAddRelation = useCallback((toEntityId, type, note) => {
    if (!editingEntity) return;
    const editorRelations = Array.isArray(editingEntity.relations) ? editingEntity.relations : [];
    onChangeField('relations', [...editorRelations, { id: '', toEntityId, type, note }]);
    setRelationDraftState({
      editorId: currentEditorId,
      toEntityId: '',
      type: 'related_to',
      note: ''
    });
  }, [editingEntity, onChangeField, currentEditorId]);

  if (!selectedWorldId) {
    return (
      <div className="section-body">
        <EmptyStateCard
          icon="世"
          title="先创建世界"
          description="先建世界，再开始整理设定。"
          actions={[
            { label: '+ 新建世界', onClick: onAddWorld, variant: 'primary' },
            { label: '去灵感箱', onClick: onGoToCaptureTab }
          ]}
        />
      </div>
    );
  }

  return (
    <div className="section-body">
      <EntityToolbar
        onStartNewEntity={onStartNewEntity}
        onExportJson={onExportJson}
        onExportMarkdown={onExportMarkdown}
        isExportDisabled={isExportDisabled}
        isMarkdownExportDisabled={isMarkdownExportDisabled}
        isJsonExportDisabled={isJsonExportDisabled}
        jsonExportDisabledReason={jsonExportDisabledReason}
      />

      {jsonExportDisabledReason ? <p className="helper-text">{jsonExportDisabledReason}</p> : null}

      <EntityFilters
        entitySearchQuery={entitySearchQuery}
        entityTypeFilter={entityTypeFilter}
        entityTagFilter={entityTagFilter}
        tagOptions={tagOptions}
        baseTagOptions={baseTagOptions}
        onSearchChange={onSearchChange}
        onTypeFilterChange={onTypeFilterChange}
        onTagFilterChange={onTagFilterChange}
        onClearEntityFilters={onClearEntityFilters}
      />

      <ManuscriptPanel
        manuscriptText={manuscriptText}
        manuscriptSuggestions={manuscriptSuggestions}
        manuscriptRelationSuggestions={manuscriptRelationSuggestions}
        manuscriptParseMeta={manuscriptParseMeta}
        isParsingManuscript={isParsingManuscript}
        onManuscriptTextChange={onManuscriptTextChange}
        onParseManuscript={onParseManuscript}
        onApplyManuscriptSuggestion={onApplyManuscriptSuggestion}
        onClearManuscriptSuggestions={onClearManuscriptSuggestions}
        onBatchApplyRelations={onBatchApplyRelations}
        editingEntity={editingEntity}
        entitiesInWorld={entitiesInWorld}
        editorRelations={Array.isArray(editingEntity?.relations) ? editingEntity.relations : []}
        relationLabels={relationLabels}
        relationDraftState={relationDraftState}
        currentEditorId={currentEditorId}
        onUpdateRelationDraft={handleUpdateRelationDraft}
        onAddRelation={handleAddRelation}
        onRemoveRelation={(index) => {
          if (!editingEntity) return;
          const editorRelations = Array.isArray(editingEntity.relations) ? editingEntity.relations : [];
          const next = editorRelations.filter((_, itemIndex) => itemIndex !== index);
          onChangeField('relations', next);
        }}
      />

      <div className="entity-layout">
        <EntityList
          entitiesForView={entitiesForView}
          editingEntity={editingEntity}
          selectedBookId={selectedBookId}
          hasActiveEntityFilters={hasActiveEntityFilters}
          totalEntitiesInContext={totalEntitiesInContext}
          isEntityUsedInCurrentBook={isEntityUsedInCurrentBook}
          onEditEntity={onEditEntity}
          onStartNewEntity={onStartNewEntity}
          onClearEntityFilters={onClearEntityFilters}
          onClearBookSelection={onClearBookSelection}
          onGoToCaptureTab={onGoToCaptureTab}
        />

        {editingEntity && (
          <EntityEditor
            editingEntity={editingEntity}
            aiAssistMeta={aiAssistMeta}
            aiAssistProfile={aiAssistProfile}
            conflictCheckMeta={conflictCheckMeta}
            baseTagOptions={baseTagOptions}
            entitiesInWorld={entitiesInWorld}
            relationOptions={relationOptions}
            relationLabels={relationLabels}
            onChangeField={onChangeField}
            onToggleEditorTag={onToggleEditorTag}
            onAiAssist={onAiAssist}
            onCheckConflict={onCheckConflict}
            onAiAssistProfileChange={onAiAssistProfileChange}
            onSubmitAiFeedback={onSubmitAiFeedback}
            isAiAssisting={isAiAssisting}
            isCheckingConflict={isCheckingConflict}
            isGeneratingImage={isGeneratingImage}
            isSubmittingAiFeedback={isSubmittingAiFeedback}
            onGenerateImage={onGenerateEntityImage}
            onRetryImage={onGenerateEntityImage}
            onApplyImageAsset={onApplyImageAsset}
            isSavingEntity={isSavingEntity}
            onSaveEntity={onSaveEntity}
            onCancelEdit={onCancelEdit}
          />
        )}
      </div>
    </div>
  );
}

export default EntitySection;
