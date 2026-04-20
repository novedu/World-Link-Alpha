import { timelineService } from '../services/timeline.service.ts';
import { aiService } from '../services/ai.service.ts';
import { buildAccessRecoveryMessage } from '../utils/accessRecovery.js';

function normalizeIsoTimestamp(value) {
  const input = String(value || '').trim();
  if (!input) return new Date().toISOString();
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
  return parsed.toISOString();
}

function parseTimelineMetadata(rawMetadata) {
  if (!rawMetadata) return null;
  if (typeof rawMetadata === 'object') return rawMetadata;
  if (typeof rawMetadata !== 'string') return null;
  try {
    return JSON.parse(rawMetadata);
  } catch {
    return null;
  }
}

function normalizeImageAsset(item) {
  const imageUrl = String(item?.imageUrl || '').trim();
  if (!imageUrl) return null;
  return {
    id: String(item?.id || '').trim() || `image-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    imageUrl,
    prompt: String(item?.prompt || '').trim(),
    style: String(item?.style || 'realistic').trim() || 'realistic',
    entityType: String(item?.entityType || 'character').trim() || 'character',
    generatedAt: normalizeIsoTimestamp(item?.generatedAt || item?.timestamp || item?.createdAt)
  };
}

const IMAGE_ENTITY_TYPE_MAP = {
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

export function useEntityEditorImageFlow({
  editingEntity,
  setEditingEntity,
  selectedWorldId,
  isGeneratingImage,
  setIsGeneratingImage,
  onUiMessage,
  openAccountModal
}) {
  const fetchEntityImageAssets = async (entityId) => {
    const normalizedEntityId = String(entityId || '').trim();
    if (!normalizedEntityId) return [];
    try {
      const result = await timelineService.getEntityEvents(normalizedEntityId);
      if (!result?.success || !Array.isArray(result?.data)) return [];
      const imageAssets = result.data
        .filter((event) => String(event?.eventType || '').trim() === 'image_generated')
        .map((event) => {
          const metadata = parseTimelineMetadata(event?.metadata);
          const normalized = normalizeImageAsset({
            id: event?.id,
            imageUrl: metadata?.imageUrl,
            prompt: metadata?.prompt,
            style: metadata?.style,
            entityType: metadata?.entityType,
            generatedAt: metadata?.generatedAt || event?.timestamp || event?.createdAt
          });
          if (!normalized) return null;
          return {
            ...normalized,
            timelineEventId: String(event?.id || '').trim()
          };
        })
        .filter(Boolean)
        .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
      return imageAssets;
    } catch {
      return [];
    }
  };

  const persistImageAssetEvent = async ({ worldId, entityId, entityName, summary, asset }) => {
    const normalizedWorldId = String(worldId || '').trim();
    const normalizedEntityId = String(entityId || '').trim();
    const normalizedAsset = normalizeImageAsset(asset);
    if (!normalizedWorldId || !normalizedEntityId || !normalizedAsset) return false;
    try {
      const result = await timelineService.createEvent({
        worldId: normalizedWorldId,
        entityId: normalizedEntityId,
        eventType: 'image_generated',
        title: '生成设定配图',
        description: String(entityName || '').trim() || '未命名设定',
        timestamp: normalizedAsset.generatedAt,
        metadata: JSON.stringify({
          imageUrl: normalizedAsset.imageUrl,
          prompt: normalizedAsset.prompt,
          style: normalizedAsset.style,
          entityType: normalizedAsset.entityType,
          generatedAt: normalizedAsset.generatedAt,
          summary: String(summary || '').trim()
        })
      });
      return Boolean(result?.success && result?.data);
    } catch {
      return false;
    }
  };

  const applyImageAssetsToEditor = (assets, targetEntityId = '') => {
    setEditingEntity((prev) => {
      if (!prev) return prev;
      if (targetEntityId && String(prev.id || '').trim() !== String(targetEntityId || '').trim()) return prev;
      const normalizedAssets = Array.isArray(assets) ? assets : [];
      const currentImageUrl = String(prev.imageUrl || '').trim();
      const fallbackImageUrl = String(normalizedAssets[0]?.imageUrl || '').trim();
      return {
        ...(prev || {}),
        imageAssets: normalizedAssets,
        imageUrl: currentImageUrl || fallbackImageUrl
      };
    });
  };

  const handleApplyImageAsset = (asset) => {
    const normalizedAsset = normalizeImageAsset(asset);
    if (!normalizedAsset) return;
    setEditingEntity((prev) => {
      if (!prev) return prev;
      const existingAssets = Array.isArray(prev.imageAssets) ? prev.imageAssets : [];
      const hasExisting = existingAssets.some((item) => item.imageUrl === normalizedAsset.imageUrl);
      const nextAssets = hasExisting ? existingAssets : [normalizedAsset, ...existingAssets];
      return {
        ...(prev || {}),
        imageUrl: normalizedAsset.imageUrl,
        imageAssets: nextAssets
      };
    });
  };

  const handleGenerateEntityImage = async (seedAsset) => {
    if (!editingEntity || isGeneratingImage) return;
    const entityName = String(editingEntity.name || '').trim();
    if (!entityName) {
      onUiMessage?.('请先输入设定名称，再生成配图', 'warning');
      return;
    }

    setIsGeneratingImage(true);
    try {
      const preferredType = String(seedAsset?.entityType || IMAGE_ENTITY_TYPE_MAP[editingEntity.type] || 'character').trim();
      const preferredStyle = String(seedAsset?.style || 'realistic').trim() || 'realistic';
      const prompt =
        String(seedAsset?.prompt || '').trim() ||
        `A detailed ${preferredType} named ${entityName}. ${String(editingEntity.summary || '').trim()}`;

      const result = await aiService.generateImage({
        prompt,
        entityType: preferredType,
        style: preferredStyle
      });

      if (!result?.success || !result?.data?.imageUrl) {
        onUiMessage?.('配图生成失败，请稍后重试', 'error');
        return;
      }

      const generatedAsset = normalizeImageAsset({
        imageUrl: result.data.imageUrl,
        prompt,
        style: preferredStyle,
        entityType: preferredType,
        generatedAt: new Date().toISOString()
      });

      if (!generatedAsset) {
        onUiMessage?.('配图生成失败，请稍后重试', 'error');
        return;
      }

      const editorEntityId = String(editingEntity.id || '').trim();
      const editorWorldId = String(editingEntity.worldId || selectedWorldId || '').trim();
      const canPersistToTimeline = Boolean(editorEntityId && editorWorldId);
      let persisted = false;

      if (canPersistToTimeline) {
        persisted = await persistImageAssetEvent({
          worldId: editorWorldId,
          entityId: editorEntityId,
          entityName,
          summary: editingEntity.summary,
          asset: generatedAsset
        });
      }

      if (persisted && editorEntityId) {
        const latestAssets = await fetchEntityImageAssets(editorEntityId);
        if (latestAssets.length > 0) {
          applyImageAssetsToEditor(latestAssets, editorEntityId);
        } else {
          handleApplyImageAsset(generatedAsset);
        }
        setEditingEntity((prev) => ({
          ...(prev || {}),
          pendingImageAsset: null
        }));
        onUiMessage?.('配图已生成并写入时间轴', 'success');
        return;
      }

      setEditingEntity((prev) => {
        if (!prev) return prev;
        if (editorEntityId && String(prev.id || '').trim() !== editorEntityId) return prev;
        const existingAssets = Array.isArray(prev.imageAssets) ? prev.imageAssets : [];
        const nextAssets = [generatedAsset, ...existingAssets.filter((item) => item.imageUrl !== generatedAsset.imageUrl)];
        return {
          ...(prev || {}),
          imageUrl: generatedAsset.imageUrl,
          imageAssets: nextAssets,
          pendingImageAsset: generatedAsset
        };
      });

      if (canPersistToTimeline) {
        onUiMessage?.('配图已生成，时间轴写入失败（可重试）', 'warning');
      } else {
        onUiMessage?.('配图已生成，保存设定后会写入时间轴', 'success');
      }
    } catch (error) {
      console.error('[Sidepanel] handleGenerateEntityImage error:', error);
      const accessRecovery = buildAccessRecoveryMessage(error, {
        openAccountModal
      });
      onUiMessage?.(accessRecovery || {
        type: 'error',
        text: error?.message || '配图生成失败，请稍后重试'
      });
    } finally {
      setIsGeneratingImage(false);
    }
  };

  return {
    fetchEntityImageAssets,
    handleApplyImageAsset,
    handleGenerateEntityImage
  };
}
