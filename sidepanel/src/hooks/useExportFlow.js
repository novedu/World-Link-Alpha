import { formatRuntimeError, sendRuntimeMessage } from '../services/runtimeApi';
import {
  buildExportFilename,
  buildJsonExportPayload,
  buildMarkdownExport,
  downloadTextFile
} from '../services/exportService';

export function useExportFlow({
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
  typeLabels,
  parseTags,
  onUiMessage
}) {
  const canExportMarkdown = runtimeContext.entitlements?.features?.exportMarkdown !== false;
  const canExportJson = Boolean(runtimeContext.entitlements?.features?.exportJson);
  const isJsonExportDisabled = !selectedWorldId || entitiesForView.length === 0 || !canExportJson;
  const isMarkdownExportDisabled = !selectedWorldId || entitiesForView.length === 0 || !canExportMarkdown;
  const jsonExportDisabledReason = !canExportJson ? 'JSON 导出为 Pro 功能' : '';

  const handleExport = async (format) => {
    if (!selectedWorldId) {
      onUiMessage?.('请先选择世界', 'warning');
      return;
    }
    if (entitiesForView.length === 0) {
      onUiMessage?.('当前范围没有可导出的实体', 'warning');
      return;
    }

    const worldName = (currentWorld?.name || 'world').replace(/\s+/g, '-');
    const scopeLabel = selectedBookId ? `书项目：${currentBook?.title || selectedBookId}` : `世界：${currentWorld?.name || ''}`;
    const timestamp = new Date().toISOString().slice(0, 10);

    const authorizeResult = await sendRuntimeMessage('REQUEST_EXPORT', { format });
    if (!authorizeResult?.success) {
      onUiMessage?.(formatRuntimeError(authorizeResult, '当前套餐暂不支持该导出操作'), 'error');
      return;
    }
    setRuntimeContext((prev) => ({
      ...prev,
      usage: authorizeResult?.usage || prev.usage
    }));

    if (format === 'json') {
      const payload = buildJsonExportPayload({
        selectedWorldId,
        currentWorld,
        selectedBookId,
        currentBook,
        normalizedQuery,
        entityTypeFilter,
        entityTagFilter,
        entities: entitiesForView
      });
      downloadTextFile(
        buildExportFilename({ worldName, selectedBookId, timestamp, format: 'json' }),
        JSON.stringify(payload, null, 2),
        'application/json;charset=utf-8'
      );
      await refreshRuntimeContext();
      return;
    }

    const markdown = buildMarkdownExport(entitiesForView, scopeLabel, typeLabels, parseTags);
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
