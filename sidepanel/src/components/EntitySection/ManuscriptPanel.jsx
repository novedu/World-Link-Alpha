import { useMemo } from 'react';
import EmptyStateCard from '../EmptyStateCard';
import { formatAiFallbackHint, formatAiProvider } from '../utils/aiUtils';

export function ManuscriptPanel({
  manuscriptText,
  manuscriptSuggestions,
  manuscriptRelationSuggestions,
  manuscriptParseMeta,
  isParsingManuscript,
  onManuscriptTextChange,
  onParseManuscript,
  onApplyManuscriptSuggestion,
  onClearManuscriptSuggestions,
  onBatchApplyRelations,
  editingEntity,
  entitiesInWorld,
  editorRelations,
  relationLabels,
  onUpdateRelationDraft,
  onAddRelation
}) {
  const manuscriptRows = Array.isArray(manuscriptSuggestions) ? manuscriptSuggestions : [];
  const manuscriptRelationRows = Array.isArray(manuscriptRelationSuggestions) ? manuscriptRelationSuggestions : [];
  const hasManuscriptResults = manuscriptRows.length > 0 || manuscriptRelationRows.length > 0;

  const formatTime = (timestamp) => {
    const value = Number(timestamp || 0);
    if (!value) return '';
    return new Date(value).toLocaleTimeString('zh-CN', { hour12: false });
  };

  const manuscriptFallbackHint =
    manuscriptParseMeta?.provider === 'local-fallback' ? formatAiFallbackHint(manuscriptParseMeta, '云端书稿解析') : '';

  const relationTargetOptions = (entitiesInWorld || []).filter((entity) => {
    const id = String(entity?.id || '');
    return id && id !== editingEntity?.id;
  });

  const relationTargetIdByName = useMemo(() => {
    const output = new Map();
    relationTargetOptions.forEach((entity) => {
      const key = String(entity?.name || '').trim();
      if (!key || output.has(key)) return;
      output.set(key, entity.id);
    });
    return output;
  }, [relationTargetOptions]);

  const canEditRelations = Boolean(editingEntity && editingEntity.id);

  const normalizeRelationType = (value) => {
    const relationType = String(value || '').trim();
    const safeRelationOptions = [{ value: 'related_to', label: '关联' }];
    return safeRelationOptions.some((item) => item.value === relationType) ? relationType : 'related_to';
  };

  const buildInferredRelationNote = (suggestion) => {
    const evidence = String(suggestion?.evidence || '').trim();
    const hitCount = Number(suggestion?.count || 0);
    const evidencePart = evidence ? `书稿推断：${evidence.slice(0, 60)}${evidence.length > 60 ? '…' : ''}` : '';
    const countPart = hitCount > 1 ? `命中 ${hitCount} 处` : '';
    return [evidencePart, countPart].filter(Boolean).join('；').slice(0, 120);
  };

  const getRelationSuggestionApplyState = (suggestion) => {
    if (!canEditRelations) {
      return { canApply: false, reason: '请先保存设定后再应用关系推断' };
    }

    const editorName = String(editingEntity?.name || '').trim();
    if (!editorName) {
      return { canApply: false, reason: '请先填写当前设定名称' };
    }

    const fromName = String(suggestion?.fromName || '').trim();
    const toName = String(suggestion?.toName || '').trim();
    if (!fromName || !toName) {
      return { canApply: false, reason: '关系推断结果缺少名称，暂不可用' };
    }

    if (fromName !== editorName) {
      return { canApply: false, reason: `请切换到设定「${fromName}」后再应用` };
    }

    const targetId = relationTargetIdByName.get(toName);
    if (!targetId) {
      return { canApply: false, reason: `未找到目标设定「${toName}」` };
    }

    const relationType = normalizeRelationType(suggestion?.type);
    const existed = editorRelations.some((relation) => relation.toEntityId === targetId && relation.type === relationType);
    if (existed) {
      return { canApply: false, reason: '该关系已存在，无需重复添加' };
    }

    return { canApply: true, targetId, relationType };
  };

  const handleApplyRelationSuggestion = (suggestion, mode = 'append') => {
    if (!editingEntity) return;
    const applyState = getRelationSuggestionApplyState(suggestion);
    if (!applyState.canApply) return;
    const relationType = applyState.relationType || 'related_to';
    const targetId = applyState.targetId;
    const note = buildInferredRelationNote(suggestion);

    if (mode === 'draft') {
      onUpdateRelationDraft({
        toEntityId: targetId,
        type: relationType,
        note
      });
      return;
    }

    onAddRelation(targetId, relationType, note);
  };

  return (
    <div className="manuscript-panel">
      <div className="field-header">
        <label className="field-label">书稿自动解析（v0）</label>
        <div className="toolbar-wrap toolbar-inline-actions">
          <button
            type="button"
            className="btn-inline btn-inline-secondary"
            onClick={onParseManuscript}
            disabled={isParsingManuscript}
          >
            {isParsingManuscript ? '解析中...' : '解析书稿'}
          </button>
          {manuscriptRelationSuggestions.length > 0 ? (
            <button type="button" className="btn-inline btn-inline-secondary" onClick={onBatchApplyRelations}>
              批量应用关系
            </button>
          ) : null}
          {hasManuscriptResults ? (
            <button type="button" className="btn-inline btn-inline-secondary" onClick={onClearManuscriptSuggestions}>
              清空结果
            </button>
          ) : null}
        </div>
      </div>
      <textarea
        className="field-input w-full manuscript-input"
        value={String(manuscriptText || '')}
        onChange={(event) => onManuscriptTextChange?.(event.target.value)}
        placeholder="粘贴章节或书稿片段，自动提取候选设定（人物/地点/势力等）"
      />
      {manuscriptRows.length > 0 ? (
        <div className="manuscript-suggestion-list">
          {manuscriptRows.map((item, index) => (
            <div key={`${item.name}-${index}`} className="manuscript-suggestion-item">
              <div className="manuscript-suggestion-main">
                <span className="manuscript-suggestion-name">{item.name}</span>
                <span className="tag tag-primary">{item.type || 'other'}</span>
                <span className="manuscript-suggestion-meta">
                  频次 {item.frequency || 0} · 置信 {Math.round(Number(item.confidence || 0) * 100)}%
                </span>
              </div>
              {item.summary ? <p className="manuscript-suggestion-summary">{item.summary}</p> : null}
              <div className="manuscript-suggestion-actions">
                <button
                  type="button"
                  className="btn-inline btn-inline-primary"
                  onClick={() => onApplyManuscriptSuggestion?.(item)}
                >
                  填充到设定编辑
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {manuscriptParseMeta ? (
        <p className="helper-text ai-meta-row">
          最近解析：{formatAiProvider(manuscriptParseMeta.provider, manuscriptParseMeta.model)} · {formatTime(manuscriptParseMeta.updatedAt)}
        </p>
      ) : null}
      {manuscriptFallbackHint ? <p className="helper-text ai-fallback-reason">{manuscriptFallbackHint}</p> : null}
      {manuscriptRelationRows.length > 0 ? (
        <div className="manuscript-relation-list">
          {manuscriptRelationRows.map((item, index) => {
            const applyState = getRelationSuggestionApplyState(item);
            const relationType = normalizeRelationType(item.type);
            return (
              <div key={`${item.fromName}-${item.toName}-${relationType}-${index}`} className="manuscript-relation-item">
                <div className="manuscript-relation-main">
                  <span className="manuscript-relation-node">{item.fromName || '未知设定'}</span>
                  <span className="tag tag-primary">{relationLabels[relationType] || relationType}</span>
                  <span className="manuscript-relation-node">{item.toName || '未知设定'}</span>
                  <span className="manuscript-suggestion-meta">
                    命中 {Number(item.count || 1)} · 置信 {Math.round(Number(item.confidence || 0) * 100)}%
                  </span>
                </div>
                {item.evidence ? <p className="manuscript-relation-evidence">证据：{item.evidence}</p> : null}
                <div className="manuscript-suggestion-actions">
                  <button
                    type="button"
                    className="btn-inline btn-inline-primary"
                    onClick={() => handleApplyRelationSuggestion(item, 'append')}
                    disabled={!applyState.canApply}
                    title={!applyState.canApply ? applyState.reason : ''}
                  >
                    一键添加关系
                  </button>
                  <button
                    type="button"
                    className="btn-inline btn-inline-secondary"
                    onClick={() => handleApplyRelationSuggestion(item, 'draft')}
                    disabled={!applyState.canApply}
                    title={!applyState.canApply ? applyState.reason : ''}
                  >
                    填充关系草稿
                  </button>
                  {!applyState.canApply ? <span className="helper-text">{applyState.reason}</span> : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
