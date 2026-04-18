import { useState } from 'react';
import { formatAiProvider } from '../utils/aiUtils';
import { formatRuntimeError, sendRuntimeMessage } from '../services/runtimeApi';

export function useManuscriptFlow({
  selectedWorldId,
  selectedBookId,
  setActiveTab,
  setEditingEntity,
  onUiMessage
}) {
  const [manuscriptText, setManuscriptText] = useState('');
  const [manuscriptSuggestions, setManuscriptSuggestions] = useState([]);
  const [manuscriptRelationSuggestions, setManuscriptRelationSuggestions] = useState([]);
  const [manuscriptParseMeta, setManuscriptParseMeta] = useState(null);
  const [isParsingManuscript, setIsParsingManuscript] = useState(false);

  const handleParseManuscript = async () => {
    if (!selectedWorldId) {
      onUiMessage?.('请先选择世界观库后再解析书稿', 'warning');
      return;
    }
    const sourceText = String(manuscriptText || '').trim();
    if (!sourceText) {
      onUiMessage?.('请先粘贴书稿内容', 'warning');
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
      onUiMessage?.(formatRuntimeError(result, '书稿解析失败'), 'error');
      return;
    }

    const suggestions = Array.isArray(result.suggestions) ? result.suggestions : [];
    const relationSuggestions = Array.isArray(result.relationSuggestions) ? result.relationSuggestions : [];
    setManuscriptSuggestions(suggestions);
    setManuscriptRelationSuggestions(relationSuggestions);
    const provider = result.provider || 'local-heuristic';
    const model = result.model || '';
    setManuscriptParseMeta({
      provider,
      model,
      fallbackReason: result.fallbackReason || '',
      fallbackType: result.fallbackType || '',
      fallbackStatus: result.fallbackStatus,
      fallbackRetriable: Boolean(result.fallbackRetriable),
      fallbackTraceId: result.fallbackTraceId || '',
      updatedAt: Date.now()
    });
    onUiMessage?.(
      `解析完成，提取到 ${suggestions.length} 个候选设定，推断 ${relationSuggestions.length} 条关系（${formatAiProvider(
        provider,
        model
      )}）`,
      'success'
    );
  };

  const handleClearManuscriptSuggestions = () => {
    setManuscriptSuggestions([]);
    setManuscriptRelationSuggestions([]);
    setManuscriptParseMeta(null);
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
    onUiMessage?.(`已将「${suggestion.name || '候选设定'}」填充到设定编辑器`, 'success');
  };

  const handleBatchApplyRelations = async () => {
    if (!selectedWorldId || manuscriptRelationSuggestions.length === 0) {
      onUiMessage?.('没有可批量应用的关系推断结果', 'warning');
      return;
    }
    
    const result = await sendRuntimeMessage('BATCH_APPLY_MANUSCRIPT_RELATIONS', {
      worldId: selectedWorldId,
      bookId: selectedBookId,
      relations: manuscriptRelationSuggestions
    });
    
    if (!result?.success) {
      onUiMessage?.(formatRuntimeError(result, '批量应用关系失败'), 'error');
      return;
    }
    
    onUiMessage?.(`成功批量应用 ${result.appliedCount || 0} 条关系`, 'success');
  };

  return {
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
  };
}
