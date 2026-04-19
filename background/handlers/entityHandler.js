// 实体相关的消息处理器

const EntityService = require('../services/entityService');

class EntityHandler {
  constructor(dataRepository) {
    this.entityService = new EntityService(dataRepository);
  }

  async handleSaveEntity(data) {
    return this.entityService.saveEntityFromCapture(data);
  }

  async handleSaveEntityFromSidepanel(data) {
    return this.entityService.saveEntityFromSidepanel(data);
  }

  async handleCheckEntityConflict(data) {
    return this.entityService.checkEntityConflict(data);
  }

  validateSaveEntityPayload(payload) {
    if (!this.isPlainObject(payload)) {
      return this.createValidationResult('SAVE_ENTITY 参数必须是对象');
    }
    if (!this.safeName(payload.worldId)) {
      return this.createValidationResult('SAVE_ENTITY 缺少 worldId');
    }
    if (!this.safeName(payload.name)) {
      return this.createValidationResult('SAVE_ENTITY 缺少 name');
    }

    const selectedBooks = payload.selectedBooks;
    if (selectedBooks !== undefined && !Array.isArray(selectedBooks)) {
      return this.createValidationResult('SAVE_ENTITY.selectedBooks 必须是数组');
    }

    if (Array.isArray(selectedBooks) && selectedBooks.some((bookId) => !this.safeName(bookId))) {
      return this.createValidationResult('SAVE_ENTITY.selectedBooks 含非法 bookId');
    }

    return null;
  }

  validateSaveEntityFromSidepanelPayload(payload) {
    if (!this.isPlainObject(payload)) {
      return this.createValidationResult('SAVE_ENTITY_FROM_SIDEPANEL 参数必须是对象');
    }
    if (!this.isPlainObject(payload.entity)) {
      return this.createValidationResult('SAVE_ENTITY_FROM_SIDEPANEL 缺少 entity');
    }

    if (!this.safeName(payload.entity.worldId)) {
      return this.createValidationResult('SAVE_ENTITY_FROM_SIDEPANEL.entity 缺少 worldId');
    }

    if (!this.safeName(payload.entity.name)) {
      return this.createValidationResult('SAVE_ENTITY_FROM_SIDEPANEL.entity 缺少 name');
    }

    if (payload.entity.relations !== undefined && !Array.isArray(payload.entity.relations)) {
      return this.createValidationResult('SAVE_ENTITY_FROM_SIDEPANEL.entity.relations 必须是数组');
    }

    if (Array.isArray(payload.entity.relations)) {
      const hasInvalidRelation = payload.entity.relations.some((relation) => {
        if (!this.isPlainObject(relation)) return true;
        return !this.safeName(relation.toEntityId || relation.targetEntityId || relation.entityId);
      });
      if (hasInvalidRelation) {
        return this.createValidationResult('SAVE_ENTITY_FROM_SIDEPANEL.entity.relations 包含非法关系项');
      }
    }

    if (payload.selectedBookId !== undefined && typeof payload.selectedBookId !== 'string') {
      return this.createValidationResult('SAVE_ENTITY_FROM_SIDEPANEL.selectedBookId 必须是字符串');
    }

    return null;
  }

  validateCheckEntityConflictPayload(payload) {
    if (!this.isPlainObject(payload)) {
      return this.createValidationResult('CHECK_ENTITY_CONFLICT 参数必须是对象');
    }

    if (!this.safeName(payload.worldId)) {
      return this.createValidationResult('CHECK_ENTITY_CONFLICT 缺少 worldId');
    }

    if (!this.isPlainObject(payload.draftEntity)) {
      return this.createValidationResult('CHECK_ENTITY_CONFLICT 缺少 draftEntity');
    }

    if (!this.safeName(payload.draftEntity.name)) {
      return this.createValidationResult('CHECK_ENTITY_CONFLICT.draftEntity.name 不能为空');
    }

    return null;
  }

  safeName(value) {
    return String(value || '').trim();
  }

  isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  createValidationResult(error, details = {}) {
    return {
      success: false,
      error,
      errorType: 'validation',
      details
    };
  }
}

module.exports = EntityHandler;
