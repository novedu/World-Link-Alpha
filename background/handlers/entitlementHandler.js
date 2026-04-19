// 权限相关的消息处理器

const EntitlementService = require('../services/entitlementService');

class EntitlementHandler {
  constructor(dataRepository) {
    this.dataRepository = dataRepository;
    this.entitlementService = new EntitlementService(dataRepository);
  }

  async handleGetEntitlements() {
    return this.entitlementService.refreshEntitlements();
  }

  async handleRefreshEntitlements() {
    return this.entitlementService.refreshEntitlements();
  }
}

module.exports = EntitlementHandler;
