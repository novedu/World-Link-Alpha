import { useMemo, useState, useCallback } from 'react';
import EmptyStateCard from '../EmptyStateCard';
import {
  AI_ASSIST_LENGTH_OPTIONS,
  AI_ASSIST_STYLE_OPTIONS,
  formatAssistProfile,
  normalizeAssistProfile
} from '../../utils/assistUtils';
import { parseTags } from '../../utils/entityUtils';
import { formatAiFallbackHint, formatAiProvider, formatAiQualityMeta } from '../../utils/aiUtils';
import {
  buildConflictSignalsText,
  formatConflictReason,
  getConflictResolutionSuggestion,
  getConflictRiskKey,
  getConflictRiskMeta
} from '../../utils/conflictUtils';
import { aiService } from '../../services/ai.service';

const EDITOR_TYPE_OPTIONS = [
  { value: 'character', label: '人物' },
  { value: 'location', label: '地点' },
  { value: 'faction', label: '势力/组织' },
  { value: 'item', label: '物品/武器' },
  { value: 'mineral', label: '矿石/资源' },
  { value: 'creature', label: '生物/怪物' },
  { value: 'event', label: '事件' },
  { value: 'law', label: '规则/法则' },
  { value: 'other', label: '其他' }
];

export function EntityEditor({
  editingEntity,
  aiAssistMeta,
  aiAssistProfile,
  conflictCheckMeta,
  baseTagOptions,
  onChangeField,
  onToggleEditorTag,
  onAiAssist,
  onCheckConflict,
  onAiAssistProfileChange,
  onSubmitAiFeedback,
  isAiAssisting,
  isCheckingConflict,
  isSubmittingAiFeedback,
  isSavingEntity,
  onSaveEntity,
  onCancelEdit
}) {
  const [tagInputState, setTagInputState] = useState({ editorId: '', value: '' });
  const [conflictRiskFilter, setConflictRiskFilter] = useState('all');

  const currentEditorId = editingEntity?.id || '__new__';
  const tagInput = tagInputState.editorId === currentEditorId ? tagInputState.value : '';
  const editorTags = parseTags(editingEntity?.tags);
  const editorTagSet = useMemo(() => new Set(editorTags), [editorTags]);
  const tagSuggestionId = 'wl-editor-tag-suggestions';
  const suggestionTagOptions = baseTagOptions.filter((tag) => !editorTagSet.has(tag));
  const normalizedAssistProfile = normalizeAssistProfile(aiAssistProfile);
  const conflictHints = Array.isArray(editingEntity?.conflictHints) ? editingEntity.conflictHints : [];
  const filteredConflictHints = useMemo(() => {
    return [...conflictHints]
      .sort((a, b) => Number(b?.confidence || 0) - Number(a?.confidence || 0))
      .filter((hint) => conflictRiskFilter === 'all' || getConflictRiskKey(hint?.confidence) === conflictRiskFilter);
  }, [conflictHints, conflictRiskFilter]);

  const updateTagInput = useCallback((value) => {
    setTagInputState({
      editorId: currentEditorId,
      value
    });
  }, [currentEditorId]);

  const clearTagInput = useCallback(() => {
    setTagInputState({
      editorId: currentEditorId,
      value: ''
    });
  }, [currentEditorId]);

  const appendEditorTag = useCallback((rawTag) => {
    const nextTag = String(rawTag || '').trim();
    if (!nextTag || editorTagSet.has(nextTag)) return false;
    onToggleEditorTag(nextTag);
    return true;
  }, [editorTagSet, onToggleEditorTag]);

  const removeEditorTag = useCallback((tag) => {
    if (!editorTagSet.has(tag)) return;
    onToggleEditorTag(tag);
  }, [editorTagSet, onToggleEditorTag]);

  const handleAddTagsFromInput = useCallback(() => {
    const nextTags = parseTags(tagInput);
    if (nextTags.length === 0) return;
    nextTags.forEach((tag) => appendEditorTag(tag));
    clearTagInput();
  }, [tagInput, appendEditorTag, clearTagInput]);

  const handleTagInputKeyDown = useCallback((event) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      handleAddTagsFromInput();
    }
  }, [handleAddTagsFromInput]);

  const handleGenerateImage = async () => {
    if (!editingEntity || !editingEntity.name) return;

    try {
      const entityTypeMap = {
        character: 'character',
        location: 'location',
        item: 'item',
        faction: 'character',
        creature: 'character',
        mineral: 'item',
        event: 'location',
        law: 'location',
        other: 'character'
      };

      const entityType = entityTypeMap[editingEntity.type] || 'character';
      const prompt = `A detailed ${entityType} named ${editingEntity.name}. ${editingEntity.summary || ''}`;

      const response = await aiService.generateImage({
        prompt,
        entityType,
        style: 'realistic'
      });

      if (response.success && response.data) {
        onChangeField('imageUrl', response.data.imageUrl);
      }
    } catch (error) {
      console.error('Error generating image:', error);
    }
  };

  const conflictSummaryMeta = conflictCheckMeta?.conflictMeta || null;
  const conflictCalibrationMeta = conflictCheckMeta?.calibration || null;
  const aiAssistFeedbackDecision = String(aiAssistMeta?.feedbackDecision || '');
  const conflictFeedbackDecision = String(conflictCheckMeta?.feedbackDecision || '');
  const aiAssistFallbackHint = aiAssistMeta?.provider === 'local-fallback' ? formatAiFallbackHint(aiAssistMeta, '云端文案') : '';
  const conflictFallbackHint = conflictCheckMeta?.provider === 'local-fallback' ? formatAiFallbackHint(conflictCheckMeta, '云端冲突检查') : '';

  const formatTime = (timestamp) => {
    const value = Number(timestamp || 0);
    if (!value) return '';
    return new Date(value).toLocaleTimeString('zh-CN', { hour12: false });
  };

  const formatThresholdPercent = (value) => `${Math.round(Number(value || 0) * 100)}%`;

  return (
    <div className="editor-panel">
      <h3 className="editor-title">设定编辑</h3>
      <div className="form-stack">
        <div className="field-stack">
          <label className="field-label">名称</label>
          <input
            className="field-input w-full"
            value={editingEntity.name}
            onChange={(event) => onChangeField('name', event.target.value)}
          />
        </div>

        <div className="field-stack">
          <label className="field-label">类型</label>
          <select
            className="field-input w-full"
            value={editingEntity.type}
            onChange={(event) => onChangeField('type', event.target.value)}
          >
            {EDITOR_TYPE_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field-stack">
          <label className="field-label">简要描述</label>
          <textarea
            className="field-input w-full min-h-[96px]"
            value={editingEntity.summary}
            onChange={(event) => onChangeField('summary', event.target.value)}
          />
          {editingEntity.imageUrl && (
            <div className="entity-image-preview">
              <img src={editingEntity.imageUrl} alt={editingEntity.name} className="entity-image" />
            </div>
          )}
          <div className="editor-ai-actions">
            <select
              className="field-input editor-ai-select"
              value={normalizedAssistProfile.style}
              onChange={(event) =>
                onAiAssistProfileChange?.({
                  ...normalizedAssistProfile,
                  style: event.target.value
                })
              }
              title="文案风格"
            >
              {AI_ASSIST_STYLE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  风格：{item.label}
                </option>
              ))}
            </select>
            <select
              className="field-input editor-ai-select"
              value={normalizedAssistProfile.targetLength}
              onChange={(event) =>
                onAiAssistProfileChange?.({
                  ...normalizedAssistProfile,
                  targetLength: event.target.value
                })
              }
              title="输出长度"
            >
              {AI_ASSIST_LENGTH_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  长度：{item.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn-inline btn-inline-secondary"
              onClick={() => onAiAssist?.('summarize', normalizedAssistProfile)}
              disabled={isAiAssisting}
            >
              {isAiAssisting ? '处理中...' : 'AI 总结'}
            </button>
            <button
              type="button"
              className="btn-inline btn-inline-secondary"
              onClick={() => onAiAssist?.('expand', normalizedAssistProfile)}
              disabled={isAiAssisting}
            >
              {isAiAssisting ? '处理中...' : 'AI 扩写'}
            </button>
            <button
              type="button"
              className="btn-inline btn-inline-secondary"
              onClick={() => onCheckConflict?.()}
              disabled={isCheckingConflict}
            >
              {isCheckingConflict ? '检测中...' : 'AI 冲突检查'}
            </button>
            <button
              type="button"
              className="btn-inline btn-inline-secondary"
              onClick={() => handleGenerateImage()}
              disabled={isAiAssisting}
            >
              {isAiAssisting ? '生成中...' : 'AI 生成图片'}
            </button>
          </div>

          <ConflictPanel
            conflictHints={conflictHints}
            filteredConflictHints={filteredConflictHints}
            conflictRiskFilter={conflictRiskFilter}
            onRiskFilterChange={setConflictRiskFilter}
            conflictSummaryMeta={conflictSummaryMeta}
            conflictCalibrationMeta={conflictCalibrationMeta}
            conflictCheckMeta={conflictCheckMeta}
            formatThresholdPercent={formatThresholdPercent}
          />

          <AiFeedbackRow
            aiMeta={aiAssistMeta}
            feedbackDecision={aiAssistFeedbackDecision}
            isSubmitting={isSubmittingAiFeedback}
            onSubmitFeedback={(type, decision) => onSubmitAiFeedback?.(type, decision)}
            type="assist"
            formatTime={formatTime}
          />

          {aiAssistFallbackHint ? <p className="helper-text ai-fallback-reason">{aiAssistFallbackHint}</p> : null}

          <AiFeedbackRow
            aiMeta={conflictCheckMeta}
            feedbackDecision={conflictFeedbackDecision}
            isSubmitting={isSubmittingAiFeedback}
            onSubmitFeedback={(type, decision) => onSubmitAiFeedback?.(type, decision)}
            type="conflict"
            formatTime={formatTime}
          />

          {conflictFallbackHint ? <p className="helper-text ai-fallback-reason">{conflictFallbackHint}</p> : null}
        </div>

        <TagEditor
          editorTags={editorTags}
          tagInput={tagInput}
          baseTagOptions={baseTagOptions}
          suggestionTagOptions={suggestionTagOptions}
          tagSuggestionId={tagSuggestionId}
          onTagInputChange={updateTagInput}
          onTagInputKeyDown={handleTagInputKeyDown}
          onAddTags={handleAddTagsFromInput}
          onRemoveTag={removeEditorTag}
        />

        <RelationEditor
          editingEntity={editingEntity}
        />

        <div className="editor-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={onSaveEntity}
            disabled={isSavingEntity}
          >
            {isSavingEntity ? '保存中...' : '保存'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={onCancelEdit}
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}

function ConflictPanel({
  conflictHints,
  filteredConflictHints,
  conflictRiskFilter,
  onRiskFilterChange,
  conflictSummaryMeta,
  conflictCalibrationMeta,
  conflictCheckMeta,
  formatThresholdPercent
}) {
  if (conflictHints.length === 0) return null;

  return (
    <>
      <div className="conflict-hint-toolbar">
        <p className="helper-text">
          冲突结果 {filteredConflictHints.length}/{conflictHints.length}
        </p>
        <select
          className="field-input conflict-filter-select"
          value={conflictRiskFilter}
          onChange={(event) => onRiskFilterChange(event.target.value)}
        >
          <option value="all">全部风险</option>
          <option value="high">高风险</option>
          <option value="medium">中风险</option>
          <option value="low">低风险</option>
        </select>
      </div>
      {conflictSummaryMeta ? (
        <>
          <div className="conflict-risk-summary">
            <span className="tag tag-warning">高风险 {conflictSummaryMeta.high || 0}</span>
            <span className="tag tag-primary">中风险 {conflictSummaryMeta.medium || 0}</span>
            <span className="tag tag-secondary">低风险 {conflictSummaryMeta.low || 0}</span>
            {conflictCheckMeta?.strategyVersion ? (
              <span className="helper-text">策略 {conflictCheckMeta.strategyVersion}</span>
            ) : null}
          </div>
          {conflictCalibrationMeta ? (
            <p className="helper-text conflict-calibration-text">
              阈值：名称≥{formatThresholdPercent(conflictCalibrationMeta.similarity?.name)} · 描述≥
              {formatThresholdPercent(conflictCalibrationMeta.similarity?.summary)} · 高风险≥
              {formatThresholdPercent(conflictCalibrationMeta.risk?.high)} · 中风险≥
              {formatThresholdPercent(conflictCalibrationMeta.risk?.medium)} · Top{' '}
              {Number(conflictCalibrationMeta.rowLimit || 0)}
            </p>
          ) : null}
        </>
      ) : null}
      {filteredConflictHints.length > 0 ? (
        <div className="conflict-hint-list">
          {filteredConflictHints.map((hint) => {
            const signalsText = buildConflictSignalsText(hint);
            const riskMeta = getConflictRiskMeta(hint?.confidence);
            const reasonLabel = formatConflictReason(hint);
            const suggestionText = getConflictResolutionSuggestion(hint);
            return (
              <div key={`${hint.entityId}-${reasonLabel}`} className="conflict-hint-block">
                <div className="conflict-hint-item">
                  <div className="conflict-hint-main">
                    <span className={`tag ${riskMeta.tagClassName}`}>{riskMeta.label}</span>
                    <span className="conflict-hint-name">{hint.name}</span>
                    <span className="conflict-hint-meta">{reasonLabel}</span>
                  </div>
                  <span className="conflict-hint-score">{Math.round(Number(hint.confidence || 0) * 100)}%</span>
                </div>
                <p className="conflict-hint-suggestion">建议：{suggestionText}</p>
                {signalsText ? <p className="conflict-hint-signals">{signalsText}</p> : null}
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyStateCard
          compact
          icon="筛"
          title="当前筛选下没有冲突结果"
          description="可切换风险筛选查看其他等级结果。"
          actions={conflictRiskFilter !== 'all' ? [{ label: '查看全部风险', onClick: () => onRiskFilterChange('all') }] : []}
        />
      )}
    </>
  );
}

function AiFeedbackRow({ aiMeta, feedbackDecision, isSubmitting, onSubmitFeedback, type, formatTime }) {
  if (!aiMeta) return null;

  const label = type === 'assist' ? 'AI 文案' : '冲突检查';
  const positiveLabel = type === 'assist' ? '结果有帮助' : '检测准确';
  const negativeLabel = type === 'assist' ? '需优化' : '需校准';
  const modeText = type === 'assist' ? (aiMeta.mode === 'expand' ? '扩写' : '总结') : '';
  const providerText = formatAiProvider(aiMeta.provider, aiMeta.model);
  const qualityText = type === 'assist' ? formatAiQualityMeta(aiMeta) : '';
  const strategyText = type === 'assist' ? `策略 ${formatAssistProfile(aiMeta.assistProfile)}` : '';
  const strategyVersionText = aiMeta.strategyVersion ? ` · 模型策略 ${aiMeta.strategyVersion}` : '';

  const metaParts = [modeText, providerText, strategyText, qualityText, strategyVersionText, formatTime(aiMeta.updatedAt)].filter(Boolean);

  return (
    <>
      <p className="helper-text ai-meta-row">
        最近 {label}：{metaParts.join(' · ')}
      </p>
      <div className="ai-feedback-row">
        <button
          type="button"
          className={`btn-inline ${feedbackDecision === 'positive' ? 'btn-inline-primary' : 'btn-inline-secondary'}`}
          disabled={isSubmitting}
          onClick={() => onSubmitFeedback(type, 'positive')}
        >
          {feedbackDecision === 'positive' ? `✓ ${positiveLabel}` : positiveLabel}
        </button>
        <button
          type="button"
          className={`btn-inline ${feedbackDecision === 'negative' ? 'btn-inline-primary' : 'btn-inline-secondary'}`}
          disabled={isSubmitting}
          onClick={() => onSubmitFeedback(type, 'negative')}
        >
          {feedbackDecision === 'negative' ? `✓ ${negativeLabel}` : negativeLabel}
        </button>
      </div>
    </>
  );
}

function TagEditor({
  editorTags,
  tagInput,
  baseTagOptions,
  suggestionTagOptions,
  tagSuggestionId,
  onTagInputChange,
  onTagInputKeyDown,
  onAddTags,
  onRemoveTag
}) {
  return (
    <div className="field-stack">
      <label className="field-label">标签</label>
      {editorTags.length > 0 ? (
        <div className="editor-tag-list">
          {editorTags.map((tag) => (
            <span key={tag} className="editor-tag-pill">
              <span className="editor-tag-text">{tag}</span>
              <button
                type="button"
                className="editor-tag-remove"
                onClick={() => onRemoveTag(tag)}
                aria-label={`移除标签 ${tag}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="helper-text">暂无标签，可通过下方输入框或常用标签添加。</p>
      )}

      <div className="editor-tag-input-row">
        <input
          className="field-input editor-tag-input"
          value={tagInput}
          onChange={(event) => onTagInputChange(event.target.value)}
          onKeyDown={onTagInputKeyDown}
          placeholder="输入标签，按 Enter 添加"
          list={tagSuggestionId}
        />
        <button
          type="button"
          className="btn-secondary"
          onClick={onAddTags}
          disabled={!tagInput.trim()}
        >
          添加
        </button>
      </div>

      <datalist id={tagSuggestionId}>
        {suggestionTagOptions.map((tag) => (
          <option key={tag} value={tag} />
        ))}
      </datalist>

      <div className="tag-filter-row">
        {baseTagOptions.map((tag) => (
          <button
            key={tag}
            type="button"
            className="tag-chip"
            onClick={() => onAddTags(tag)}
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
}

function RelationEditor({ editingEntity }) {
  const [relationDraftState, setRelationDraftState] = useState({
    toEntityId: '',
    type: 'related_to',
    note: ''
  });

  const editorRelations = Array.isArray(editingEntity?.relations) ? editingEntity.relations : [];

  const safeRelationOptions = [{ value: 'related_to', label: '关联' }];

  const updateRelationDraft = (field, value) => {
    setRelationDraftState((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddRelation = () => {
    if (!editingEntity) return;
    const toEntityId = String(relationDraftState.toEntityId || '').trim();
    if (!toEntityId || toEntityId === editingEntity.id) return;
    const type = String(relationDraftState.type || 'related_to').trim() || 'related_to';
    const note = String(relationDraftState.note || '').trim();
    const existed = editorRelations.some((relation) => relation.toEntityId === toEntityId && relation.type === type);
    if (existed) return;
    editingEntity.onChangeField?.('relations', [...editorRelations, { id: '', toEntityId, type, note }]);
    setRelationDraftState({ toEntityId: '', type: 'related_to', note: '' });
  };

  const handleRemoveRelation = (index) => {
    if (!editingEntity) return;
    const next = editorRelations.filter((_, itemIndex) => itemIndex !== index);
    editingEntity.onChangeField?.('relations', next);
  };

  if (!editingEntity || !editingEntity.id) return null;

  return (
    <div className="field-stack">
      <label className="field-label">关系</label>
      {editorRelations.length > 0 ? (
        <div className="relation-list">
          {editorRelations.map((relation, index) => (
            <div key={`${relation.toEntityId}-${relation.type}-${index}`} className="relation-item">
              <span className="relation-text">
                → {relation.toEntityId} ({safeRelationOptions.find((r) => r.value === relation.type)?.label || relation.type})
              </span>
              <button
                type="button"
                className="btn-inline btn-inline-secondary"
                onClick={() => handleRemoveRelation(index)}
              >
                移除
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <div className="editor-relation-input-row">
        <input
          className="field-input"
          value={relationDraftState.toEntityId}
          onChange={(event) => updateRelationDraft('toEntityId', event.target.value)}
          placeholder="目标设定名称"
        />
        <select
          className="field-input"
          value={relationDraftState.type}
          onChange={(event) => updateRelationDraft('type', event.target.value)}
        >
          {safeRelationOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn-secondary"
          onClick={handleAddRelation}
          disabled={!relationDraftState.toEntityId.trim()}
        >
          添加关系
        </button>
      </div>
    </div>
  );
}
