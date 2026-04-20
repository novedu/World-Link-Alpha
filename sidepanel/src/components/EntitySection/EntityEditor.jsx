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
  entitiesInWorld,
  relationOptions,
  relationLabels,
  onChangeField,
  onToggleEditorTag,
  onAiAssist,
  onCheckConflict,
  onAiAssistProfileChange,
  onSubmitAiFeedback,
  onGenerateImage,
  onRetryImage,
  onApplyImageAsset,
  isAiAssisting,
  isCheckingConflict,
  isGeneratingImage,
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
  const editorRelationCount = Array.isArray(editingEntity?.relations) ? editingEntity.relations.length : 0;
  const editorTypeLabel = EDITOR_TYPE_OPTIONS.find((item) => item.value === editingEntity?.type)?.label || '其他';
  const editorSummaryName = String(editingEntity?.name || '').trim() || '未命名设定';
  const imageAssets = Array.isArray(editingEntity?.imageAssets) ? editingEntity.imageAssets : [];
  const filteredConflictHints = [...conflictHints]
    .sort((a, b) => Number(b?.confidence || 0) - Number(a?.confidence || 0))
    .filter((hint) => conflictRiskFilter === 'all' || getConflictRiskKey(hint?.confidence) === conflictRiskFilter);
  const usageBooks = (() => {
    const rows = Array.isArray(editingEntity?.usages) ? editingEntity.usages : [];
    const map = new Map();
    rows.forEach((usage) => {
      const bookId = String(usage?.book?.id || usage?.bookId || '').trim();
      const bookTitle = String(usage?.book?.title || '').trim();
      if (!bookId) return;
      if (!map.has(bookId)) {
        map.set(bookId, {
          id: bookId,
          title: bookTitle || '未命名作品'
        });
      }
    });
    return Array.from(map.values());
  })();

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

  const handleAddTagsFromInput = useCallback((rawTag) => {
    const quickTag = String(rawTag || '').trim();
    if (quickTag) {
      appendEditorTag(quickTag);
      return;
    }
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
  const formatAssetTime = (value) => {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toLocaleString('zh-CN', {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  return (
    <div className="editor-panel">
      <div className="editor-shell-top">
        <div>
          <h3 className="editor-title">设定编辑</h3>
          <p className="editor-shell-caption">补齐名称、标签和关系，方便检索。</p>
        </div>
        <div className="editor-summary-strip">
          <div className="editor-summary-main">
            <div className="editor-summary-name-row">
              <p className="editor-summary-name">{editorSummaryName}</p>
              <span className="tag tag-secondary">{editorTypeLabel}</span>
            </div>
            <p className="editor-summary-note">
              {editingEntity.summary?.trim() || '先写一句摘要。'}
            </p>
          </div>
          <div className="editor-summary-tags">
            <span className="editor-summary-pill">标签 {editorTags.length}</span>
            <span className="editor-summary-pill">关系 {editorRelationCount}</span>
            <span className="editor-summary-pill">{editingEntity.imageUrl ? '已配图' : '未配图'}</span>
          </div>
        </div>
      </div>
      <div className="form-stack">
        <section className="editor-section">
          <div className="editor-section-header">
            <div className="editor-section-copy">
              <h4 className="editor-section-title">基础信息</h4>
              <p className="editor-section-note">名称、类型和摘要会影响检索。</p>
            </div>
          </div>
          <div className="editor-section-body editor-core-grid">
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

            <div className="field-stack editor-core-summary">
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
              <div className="entity-image-assets">
                <div className="entity-image-assets-header">
                  <span className="editor-section-inline-note">配图资产 {imageAssets.length}</span>
                  {editingEntity.pendingImageAsset ? <span className="tag tag-warning">待保存</span> : null}
                </div>
                {imageAssets.length > 0 ? (
                  <div className="entity-image-asset-list">
                    {imageAssets.slice(0, 4).map((asset) => (
                      <div key={asset.id || asset.imageUrl} className="entity-image-asset-item">
                        <button
                          type="button"
                          className="entity-image-asset-thumb"
                          onClick={() => onApplyImageAsset?.(asset)}
                          title="设为当前图片"
                        >
                          <img src={asset.imageUrl} alt="asset" className="entity-image-asset-thumb-img" />
                        </button>
                        <div className="entity-image-asset-main">
                          <p className="entity-image-asset-meta">
                            {asset.style || 'realistic'}
                            {formatAssetTime(asset.generatedAt) ? ` · ${formatAssetTime(asset.generatedAt)}` : ''}
                          </p>
                          <p className="entity-image-asset-prompt">
                            {asset.prompt || '自动生成提示词'}
                          </p>
                          <div className="entity-image-asset-actions">
                            <button
                              type="button"
                              className="btn-inline btn-inline-secondary"
                              onClick={() => onApplyImageAsset?.(asset)}
                            >
                              设为当前
                            </button>
                            <button
                              type="button"
                              className="btn-inline btn-inline-secondary"
                              onClick={() => onRetryImage?.(asset)}
                              disabled={isGeneratingImage}
                            >
                              {isGeneratingImage ? '重试中...' : '重试生成'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="editor-section-inline-note">暂无历史配图，点击“AI 生成图片”即可创建。</p>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="editor-section">
          <div className="editor-section-header">
            <div className="editor-section-copy">
              <h4 className="editor-section-title">来源与使用</h4>
              <p className="editor-section-note">记录来源，查看这条设定已被哪些作品引用。</p>
            </div>
          </div>
          <div className="editor-section-body editor-section-body-tight">
            <div className="editor-source-grid">
              <div className="field-stack">
                <label className="field-label">来源标题</label>
                <input
                  className="field-input w-full"
                  value={editingEntity.sourceTitle || ''}
                  onChange={(event) => onChangeField('sourceTitle', event.target.value)}
                  placeholder="例如：维基词条、历史资料、网页标题"
                />
              </div>
              <div className="field-stack">
                <label className="field-label">来源链接</label>
                <input
                  className="field-input w-full"
                  value={editingEntity.sourceUrl || ''}
                  onChange={(event) => onChangeField('sourceUrl', event.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>
            {usageBooks.length > 0 ? (
              <div className="editor-usage-wrap">
                <p className="editor-section-inline-note">已被 {usageBooks.length} 个作品使用：</p>
                <div className="editor-usage-list">
                  {usageBooks.map((book) => (
                    <span key={book.id} className="tag tag-success">
                      {book.title}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="editor-section-inline-note">当前还没有被作品引用。</p>
            )}
          </div>
        </section>

        <section className="editor-section editor-section-emphasis">
          <div className="editor-section-header">
            <div className="editor-section-copy">
              <h4 className="editor-section-title">AI 辅助</h4>
              <p className="editor-section-note">先写摘要，再用 AI 扩写或查冲突。</p>
            </div>
          </div>
          <p className="editor-section-inline-note">当前模式：{formatAssistProfile(normalizedAssistProfile)}</p>
          <div className="editor-section-body">
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
                onClick={() => onGenerateImage?.()}
                disabled={isGeneratingImage}
              >
                {isGeneratingImage ? '生成中...' : 'AI 生成图片'}
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
        </section>

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
          entitiesInWorld={entitiesInWorld}
          relationOptions={relationOptions}
          relationLabels={relationLabels}
          onChangeField={onChangeField}
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
    <section className="editor-section">
        <div className="editor-section-header">
          <div className="editor-section-copy">
            <h4 className="editor-section-title">标签管理</h4>
            <p className="editor-section-note">标签越准，越好筛选。</p>
          </div>
        </div>
      <div className="editor-section-body editor-section-body-tight">
        <p className="editor-section-inline-note">
          {editorTags.length > 0 ? `已选 ${editorTags.length} 个标签。` : '还没有标签，可先加几个。'}
        </p>
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
        ) : null}

        <div className="editor-tag-input-row">
          <input
            className="field-input editor-tag-input"
            value={tagInput}
            onChange={(event) => onTagInputChange(event.target.value)}
            onKeyDown={onTagInputKeyDown}
            placeholder="输入标签后按 Enter"
            list={tagSuggestionId}
          />
          <button
            type="button"
            className="btn-secondary"
            onClick={() => onAddTags()}
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

        {baseTagOptions.length > 0 ? (
          <div className="tag-filter-row">
            {baseTagOptions.map((tag) => {
              const isSelected = editorTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  className={`tag-chip ${isSelected ? 'tag-chip-active' : ''}`}
                  onClick={() => onAddTags(tag)}
                  disabled={isSelected}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function RelationEditor({ editingEntity, entitiesInWorld = [], relationOptions = [], relationLabels = {}, onChangeField }) {
  const [relationDraftState, setRelationDraftState] = useState({
    toEntityId: '',
    type: 'related_to',
    note: ''
  });

  const editorRelations = Array.isArray(editingEntity?.relations) ? editingEntity.relations : [];
  const safeRelationOptions = useMemo(
    () =>
      Array.isArray(relationOptions) && relationOptions.length > 0
        ? relationOptions
        : [{ value: 'related_to', label: '关联' }],
    [relationOptions]
  );
  const targetOptions = (Array.isArray(entitiesInWorld) ? entitiesInWorld : [])
    .filter((entity) => String(entity?.id || '').trim() && String(entity?.id || '').trim() !== String(editingEntity?.id || '').trim())
    .map((entity) => ({
      id: String(entity.id || '').trim(),
      name: String(entity.name || '').trim() || '未命名设定'
    }));
  const entityNameById = useMemo(
    () =>
      targetOptions.reduce((acc, item) => {
        acc[item.id] = item.name;
        return acc;
      }, {}),
    [targetOptions]
  );
  const activeRelationDraftType = safeRelationOptions.some((option) => option.value === relationDraftState.type)
    ? relationDraftState.type
    : safeRelationOptions[0].value;

  const updateRelationDraft = (field, value) => {
    setRelationDraftState((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddRelation = () => {
    if (!editingEntity || !onChangeField) return;
    const toEntityId = String(relationDraftState.toEntityId || '').trim();
    if (!toEntityId || toEntityId === editingEntity.id) return;
    const type = String(activeRelationDraftType || 'related_to').trim() || 'related_to';
    const note = String(relationDraftState.note || '').trim();
    const existed = editorRelations.some((relation) => relation.toEntityId === toEntityId && relation.type === type);
    if (existed) return;
    onChangeField('relations', [...editorRelations, { id: '', toEntityId, type, note }]);
    setRelationDraftState({ toEntityId: '', type: 'related_to', note: '' });
  };

  const handleRemoveRelation = (index) => {
    if (!editingEntity || !onChangeField) return;
    const next = editorRelations.filter((_, itemIndex) => itemIndex !== index);
    onChangeField('relations', next);
  };

  if (!editingEntity) return null;

  return (
    <section className="editor-section">
      <div className="editor-section-header">
        <div className="editor-section-copy">
          <h4 className="editor-section-title">关系管理</h4>
          <p className="editor-section-note">关系补齐后，图谱会更清楚。</p>
        </div>
      </div>
      <div className="editor-section-body editor-section-body-tight">
        <p className="editor-section-inline-note">
          {editorRelations.length > 0
            ? `已建立 ${editorRelations.length} 条关系。`
            : '还没有关系，可先补一条。'}
        </p>
        {editorRelations.length > 0 ? (
          <div className="relation-list">
            {editorRelations.map((relation, index) => {
              const relationLabel = relationLabels[relation.type] || safeRelationOptions.find((item) => item.value === relation.type)?.label || relation.type;
              return (
                <div key={`${relation.toEntityId}-${relation.type}-${index}`} className="relation-item">
                  <div className="relation-main">
                    <span className="relation-target">{entityNameById[relation.toEntityId] || relation.toEntityId}</span>
                    <span className="tag tag-secondary">{relationLabel}</span>
                  </div>
                  <button
                    type="button"
                    className="btn-inline btn-inline-secondary"
                    onClick={() => handleRemoveRelation(index)}
                  >
                    移除
                  </button>
                  {relation.note ? <p className="relation-note">备注：{relation.note}</p> : null}
                </div>
              );
            })}
          </div>
        ) : null}
        <div className="editor-relation-input-row">
          <select
            className="field-input editor-relation-target"
            value={relationDraftState.toEntityId}
            onChange={(event) => updateRelationDraft('toEntityId', event.target.value)}
          >
            <option value="">选择目标设定</option>
            {targetOptions.map((entity) => (
              <option key={entity.id} value={entity.id}>
                {entity.name}
              </option>
            ))}
          </select>
          <select
            className="field-input editor-relation-type"
            value={activeRelationDraftType}
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
            className="btn-secondary editor-relation-submit"
            onClick={handleAddRelation}
            disabled={!relationDraftState.toEntityId.trim() || targetOptions.length === 0}
          >
            添加关系
          </button>
          <input
            className="field-input editor-relation-note-input"
            value={relationDraftState.note}
            onChange={(event) => updateRelationDraft('note', event.target.value)}
            placeholder="备注（可选）"
          />
        </div>
        {targetOptions.length === 0 ? <p className="helper-text">当前世界还没有可关联的设定。</p> : null}
      </div>
    </section>
  );
}
