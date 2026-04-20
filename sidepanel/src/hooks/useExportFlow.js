import {
  buildExportFilename,
  buildJsonExportPayload,
  buildMarkdownExport,
  downloadTextFile
} from '../services/exportService';
import { entitlementService } from '../services/entitlement.service.ts';

export function useExportFlow({
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
  refreshRuntimeContext,
  typeLabels,
  relationLabels,
  parseTags,
  onUiMessage
}) {
  const canExportMarkdown = runtimeContext.entitlements?.features?.exportMarkdown !== false;
  const canExportJson = Boolean(runtimeContext.entitlements?.features?.exportJson);
  const isJsonExportDisabled = !selectedWorldId || entitiesForView.length === 0 || !canExportJson;
  const isMarkdownExportDisabled = !selectedWorldId || entitiesForView.length === 0 || !canExportMarkdown;
  const jsonExportDisabledReason = !canExportJson ? 'JSON 导出仅 Pro 可用' : '';

  const handleExport = async (format) => {
    if (!selectedWorldId) {
      onUiMessage?.('请先选择世界', 'warning');
      return;
    }
    if (entitiesForView.length === 0) {
      onUiMessage?.('当前范围没有可导出内容', 'warning');
      return;
    }

    const worldName = (currentWorld?.name || 'world').replace(/\s+/g, '-');
    const scopeLabel = selectedBookId ? `书项目：${currentBook?.title || selectedBookId}` : `世界：${currentWorld?.name || ''}`;
    const timestamp = new Date().toISOString().slice(0, 10);
    const entityIdSet = new Set(entitiesForView.map((entity) => String(entity.id || '').trim()).filter(Boolean));
    const scopedRelations = (Array.isArray(entityRelations) ? entityRelations : []).filter((relation) => {
      const relationWorldId = String(relation?.worldId || '').trim();
      const fromEntityId = String(relation?.fromEntityId || '').trim();
      const toEntityId = String(relation?.toEntityId || '').trim();
      if (!fromEntityId || !toEntityId) return false;
      if (relationWorldId && relationWorldId !== selectedWorldId) return false;
      return entityIdSet.has(fromEntityId) && entityIdSet.has(toEntityId);
    });

    if (format === 'json' && !canExportJson) {
      onUiMessage?.('当前套餐不支持 JSON 导出', 'warning');
      return;
    }

    if (format === 'markdown' && !canExportMarkdown) {
      onUiMessage?.('当前套餐不支持 Markdown 导出', 'warning');
      return;
    }

    if (format === 'json') {
      try {
        await entitlementService.consumeExport('json');
      } catch (error) {
        onUiMessage?.(error?.message || '当前套餐不支持 JSON 导出', 'warning');
        return;
      }

      const payload = buildJsonExportPayload({
        selectedWorldId,
        currentWorld,
        selectedBookId,
        currentBook,
        normalizedQuery,
        entityTypeFilter,
        entityTagFilter,
        entities: entitiesForView,
        scopedRelations,
        typeLabels
      });
      downloadTextFile(
        buildExportFilename({ worldName, selectedBookId, timestamp, format: 'json' }),
        JSON.stringify(payload, null, 2),
        'application/json;charset=utf-8'
      );
      await refreshRuntimeContext();
      return;
    }

    try {
      await entitlementService.consumeExport('markdown');
    } catch (error) {
      onUiMessage?.(error?.message || '当前套餐不支持 Markdown 导出', 'warning');
      return;
    }

    const markdown = buildMarkdownExport({
      entities: entitiesForView,
      scopeLabel,
      typeLabels,
      parseTags,
      relationLabels,
      scopedRelations,
      isBookScoped: Boolean(selectedBookId)
    });
    downloadTextFile(
      buildExportFilename({ worldName, selectedBookId, timestamp, format: 'markdown' }),
      markdown,
      'text/markdown;charset=utf-8'
    );
    await refreshRuntimeContext();
  };

  return {
    handleExport,
    isJsonExportDisabled,
    isMarkdownExportDisabled,
    jsonExportDisabledReason
  };
}
