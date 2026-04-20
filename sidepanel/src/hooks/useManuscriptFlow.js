import { useState } from 'react';
import { formatAiProvider } from '../utils/aiUtils';
import { entityService } from '../services/entity.service';
import { aiService } from '../services/ai.service.ts';

export function useManuscriptFlow({
  selectedWorldId,
  selectedBookId,
  setActiveTab,
  setEditingEntity,
  onDataChanged,
  onUiMessage
}) {
  const [manuscriptText, setManuscriptText] = useState('');
  const [manuscriptSuggestions, setManuscriptSuggestions] = useState([]);
  const [manuscriptRelationSuggestions, setManuscriptRelationSuggestions] = useState([]);
  const [manuscriptParseMeta, setManuscriptParseMeta] = useState(null);
  const [isParsingManuscript, setIsParsingManuscript] = useState(false);

  const handleParseManuscript = async () => {
    if (!selectedWorldId) {
      onUiMessage?.('请先选择世界，再解析书稿', 'warning');
      return;
    }
    const sourceText = String(manuscriptText || '').trim();
    if (!sourceText) {
      onUiMessage?.('请先粘贴书稿内容', 'warning');
      return;
    }
    if (isParsingManuscript) return;

    setIsParsingManuscript(true);
    try {
      const result = await aiService.parseManuscript({
        worldId: selectedWorldId,
        bookId: selectedBookId || undefined,
        text: sourceText
      });

      if (!result?.success || !result?.data) {
        onUiMessage?.('解析失败，请稍后重试', 'error');
        return;
      }

      const payload = result.data || {};
      const suggestions = Array.isArray(payload.suggestions)
        ? payload.suggestions
        : Array.isArray(payload.entities)
          ? payload.entities
          : [];
      const relationSuggestions = Array.isArray(payload.relationSuggestions) ? payload.relationSuggestions : [];
      setManuscriptSuggestions(suggestions);
      setManuscriptRelationSuggestions(relationSuggestions);
      const provider = payload.provider || 'local-heuristic';
      const model = payload.model || '';
      setManuscriptParseMeta({
        provider,
        model,
        fallbackReason: payload.fallbackReason || '',
        fallbackType: payload.fallbackType || '',
        fallbackStatus: payload.fallbackStatus,
        fallbackRetriable: Boolean(payload.fallbackRetriable),
        fallbackTraceId: payload.fallbackTraceId || '',
        strategyVersion: payload.strategyVersion || '',
        updatedAt: Date.now()
      });
      onUiMessage?.(
        `解析完成：${suggestions.length} 个设定，${relationSuggestions.length} 条关系（${formatAiProvider(
          provider,
          model
        )}）`,
        'success'
      );
    } catch (error) {
      console.error('[Sidepanel] parse manuscript error:', error);
      onUiMessage?.(error?.message || '解析失败，请稍后重试', 'error');
    } finally {
      setIsParsingManuscript(false);
    }
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
    onUiMessage?.(`已写入编辑器：${suggestion.name || '候选设定'}`, 'success');
  };

  const handleBatchApplyRelations = async () => {
    if (!selectedWorldId || manuscriptRelationSuggestions.length === 0) {
      onUiMessage?.('没有可写入的关系', 'warning');
      return;
    }

    try {
      const [entitiesResult, relationsResult] = await Promise.all([
        entityService.getEntities(selectedWorldId),
        entityService.getRelations(selectedWorldId)
      ]);

      if (!entitiesResult?.success || !Array.isArray(entitiesResult.data)) {
        onUiMessage?.('加载世界设定失败，无法写入关系', 'error');
        return;
      }

      const entities = entitiesResult.data;
      const existingRelations = relationsResult?.success && Array.isArray(relationsResult.data) ? relationsResult.data : [];

      const nameToEntityId = new Map();
      entities.forEach((entity) => {
        const name = String(entity?.name || '').trim();
        const id = String(entity?.id || '').trim();
        if (!name || !id) return;
        nameToEntityId.set(name, id);
      });

      const byFromEntityId = new Map();
      existingRelations.forEach((relation) => {
        const fromEntityId = String(relation?.fromEntityId || '').trim();
        if (!fromEntityId) return;
        if (!byFromEntityId.has(fromEntityId)) {
          byFromEntityId.set(fromEntityId, []);
        }
        byFromEntityId.get(fromEntityId).push({
          toEntityId: relation.toEntityId,
          type: relation.type || 'related_to',
          note: relation.note || ''
        });
      });

      let matchedCount = 0;
      manuscriptRelationSuggestions.forEach((suggestion) => {
        const fromName = String(
          suggestion?.fromName || suggestion?.from || suggestion?.sourceName || suggestion?.source || ''
        ).trim();
        const toName = String(
          suggestion?.toName || suggestion?.to || suggestion?.targetName || suggestion?.target || ''
        ).trim();
        const relationType = String(suggestion?.type || suggestion?.relationType || 'related_to').trim() || 'related_to';
        const note = String(suggestion?.note || suggestion?.evidence || '').trim();

        const fromEntityId = nameToEntityId.get(fromName);
        const toEntityId = nameToEntityId.get(toName);
        if (!fromEntityId || !toEntityId || fromEntityId === toEntityId) return;

        matchedCount += 1;
        if (!byFromEntityId.has(fromEntityId)) {
          byFromEntityId.set(fromEntityId, []);
        }
        byFromEntityId.get(fromEntityId).push({
          toEntityId,
          type: relationType,
          note
        });
      });

      if (matchedCount === 0) {
        onUiMessage?.('没有匹配关系，请先创建相关设定', 'warning');
        return;
      }

      for (const [fromEntityId, relations] of byFromEntityId.entries()) {
        const dedupMap = new Map();
        relations.forEach((relation) => {
          const key = `${relation.toEntityId}::${relation.type}::${relation.note || ''}`;
          dedupMap.set(key, relation);
        });

        const finalRelations = Array.from(dedupMap.values());
        const saveResult = await entityService.replaceRelations(fromEntityId, selectedWorldId, finalRelations);
        if (!saveResult?.success) continue;
      }

      await onDataChanged?.();
      onUiMessage?.(`已写入 ${matchedCount} 条关系`, 'success');
    } catch (error) {
      console.error('[Sidepanel] handleBatchApplyRelations error:', error);
      onUiMessage?.('批量写入失败，请稍后重试', 'error');
    }
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
