// 实体服务模块

const { createId, safeName, normalizeEntityRecordForStorage, normalizeEntityRelationsPayload } = require('../utils/helpers');

class EntityService {
  constructor(dataRepository) {
    this.dataRepository = dataRepository;
  }

  async saveEntityFromCapture(payload) {
    const input = payload || {};
    const selectedBooks = Array.isArray(input.selectedBooks) ? input.selectedBooks.map(safeName).filter(Boolean) : [];
    const name = safeName(input.name);
    const worldId = safeName(input.worldId);

    if (!name) return { success: false, error: '实体名称不能为空' };
    if (!worldId) return { success: false, error: '请先选择世界' };

    const store = await this.dataRepository.readData();
    const existingIndex = input.id ? store.entities.findIndex((item) => item.id === input.id) : -1;
    const existing = existingIndex >= 0 ? store.entities[existingIndex] : null;

    const entityQuota = await this.ensureEntityCreationQuota(store, existingIndex < 0);
    if (!entityQuota.success) {
      return entityQuota;
    }

    const entity = this.buildEntityRecord(input, existing);

    if (existingIndex >= 0) {
      store.entities[existingIndex] = entity;
    } else {
      store.entities.unshift(entity);
    }

    const bookEntityUsages = this.updateBookEntityUsages(store.bookEntityUsages, entity.id, selectedBooks);

    await this.dataRepository.writeData({
      entities: store.entities,
      bookEntityUsages
    });

    return { success: true, entity };
  }

  async saveEntityFromSidepanel(payload) {
    const input = payload?.entity || {};
    const selectedBookId = safeName(payload?.selectedBookId);
    const usedInCurrentBook = Boolean(input.usedInCurrentBook);
    const name = safeName(input.name);
    const worldId = safeName(input.worldId);

    if (!name) return { success: false, error: '实体名称不能为空' };
    if (!worldId) return { success: false, error: '请先选择世界' };

    const store = await this.dataRepository.readData();
    const existingIndex = input.id ? store.entities.findIndex((item) => item.id === input.id) : -1;
    const existing = existingIndex >= 0 ? store.entities[existingIndex] : null;

    const entityQuota = await this.ensureEntityCreationQuota(store, existingIndex < 0);
    if (!entityQuota.success) {
      return entityQuota;
    }

    const entity = this.buildEntityRecord(input, existing);

    if (existingIndex >= 0) {
      store.entities[existingIndex] = entity;
    } else {
      store.entities.unshift(entity);
    }

    let bookEntityUsages = store.bookEntityUsages;
    if (selectedBookId) {
      const usageIndex = store.bookEntityUsages.findIndex(
        (usage) => usage.bookId === selectedBookId && usage.entityId === entity.id
      );
      if (usedInCurrentBook && usageIndex === -1) {
        bookEntityUsages.unshift({
          id: createId('usage'),
          bookId: selectedBookId,
          entityId: entity.id,
          createdAt: Date.now()
        });
      } else if (!usedInCurrentBook && usageIndex !== -1) {
        bookEntityUsages.splice(usageIndex, 1);
      }
    }

    let entityRelations = store.entityRelations;
    if (Array.isArray(input.relations)) {
      const validTargetEntityIds = new Set(
        store.entities
          .filter((item) => safeName(item.worldId) === entity.worldId)
          .map((item) => safeName(item.id))
          .filter(Boolean)
      );
      validTargetEntityIds.add(entity.id);

      const normalizedRelations = normalizeEntityRelationsPayload(input.relations, {
        worldId: entity.worldId,
        fromEntityId: entity.id,
        validTargetEntityIds
      });

      entityRelations = [
        ...normalizedRelations,
        ...store.entityRelations.filter((relation) => {
          return !(
            safeName(relation?.worldId) === entity.worldId &&
            safeName(relation?.fromEntityId) === entity.id
          );
        })
      ];
    }

    await this.dataRepository.writeData({
      entities: store.entities,
      bookEntityUsages,
      entityRelations
    });

    return {
      success: true,
      entity,
      relations: entityRelations.filter(
        (relation) => safeName(relation?.worldId) === entity.worldId && safeName(relation?.fromEntityId) === entity.id
      )
    };
  }

  async ensureEntityCreationQuota(store, isNew) {
    if (!isNew) return { success: true };
    const existingCount = store.entities.length;
    const limit = 500; // Free 版本限制
    if (existingCount >= limit) {
      return {
        success: false,
        error: '达到实体数量上限，请升级到 Pro 版本',
        errorType: 'quota',
        limit
      };
    }
    return { success: true };
  }

  buildEntityRecord(input, existing) {
    const now = Date.now();
    const base = existing || {};
    const entity = {
      id: safeName(input.id) || base.id || createId('entity'),
      worldId: safeName(input.worldId) || base.worldId || '',
      name: safeName(input.name) || base.name || '',
      type: safeName(input.type) || base.type || 'other',
      summary: String(input.summary || base.summary || '').trim(),
      description: String(input.description || base.description || '').trim(),
      tags: input.tags || base.tags || [],
      attributes: input.attributes || base.attributes || {},
      selectedText: String(input.selectedText || base.selectedText || '').trim(),
      createdAt: Number(base.createdAt || now),
      updatedAt: now
    };
    return normalizeEntityRecordForStorage(entity);
  }

  updateBookEntityUsages(existing, entityId, selectedBookIds) {
    const validBookIds = new Set(selectedBookIds);
    const now = Date.now();
    const kept = existing.filter((usage) => {
      if (usage.entityId !== entityId) return true;
      return validBookIds.has(usage.bookId);
    });
    const existingBookIds = new Set(kept.map((usage) => usage.bookId));
    const added = selectedBookIds
      .filter((bookId) => !existingBookIds.has(bookId))
      .map((bookId) => ({
        id: createId('usage'),
        bookId,
        entityId,
        createdAt: now
      }));
    return [...added, ...kept];
  }

  async checkEntityConflict(payload) {
    try {
      const worldId = safeName(payload.worldId);
      const draftEntity = payload.draftEntity;
      const draftName = safeName(draftEntity?.name);
      const draftSummary = String(draftEntity?.summary || '').trim();

      if (!worldId || !draftName) {
        return { success: false, error: '缺少必要参数' };
      }

      const store = await this.dataRepository.readData();
      const worldEntities = store.entities.filter(
        (item) => safeName(item.worldId) === worldId && safeName(item.id) !== safeName(draftEntity?.id)
      );

      const conflicts = [];
      for (const existing of worldEntities) {
        const existingName = safeName(existing.name);
        const existingSummary = String(existing.summary || '').trim();

        if (existingName === draftName) {
          conflicts.push({
            existingId: existing.id,
            existingName,
            reason: 'exact_name_duplicate',
            severity: 'high'
          });
        } else if (this.calculateSimilarity(existingName, draftName) > 0.7) {
          conflicts.push({
            existingId: existing.id,
            existingName,
            reason: 'name_similar',
            severity: 'medium'
          });
        }
      }

      return { success: true, conflicts };
    } catch (error) {
      console.error('[EntityService] checkEntityConflict error:', error);
      return { success: false, error: error?.message || '冲突检查失败' };
    }
  }

  calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    const longerLength = longer.length;

    if (longerLength === 0) return 1.0;

    let matches = 0;
    for (let i = 0; i < shorter.length; i++) {
      if (longer.includes(shorter[i])) {
        matches++;
      }
    }

    return matches / longerLength;
  }
}

module.exports = EntityService;
