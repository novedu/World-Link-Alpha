// 权限服务模块

const { buildDefaultEntitlements, normalizeEntitlements, isLimited } = require('../utils/helpers');

class EntitlementService {
  constructor(dataRepository) {
    this.dataRepository = dataRepository;
  }

  async getEffectiveEntitlements() {
    try {
      const stored = await this.dataRepository.getEntitlements();
      const session = await this.dataRepository.getAuthSession();
      const now = Date.now();

      if (stored && stored.plan === 'pro') {
        if (stored.expiresAt && stored.expiresAt < now) {
          const downgraded = this.downgradeEntitlements(stored);
          await this.dataRepository.setEntitlements(downgraded);
          return downgraded;
        }
        return stored;
      }

      if (session?.plan === 'pro') {
        const cloudEntitlements = this.buildProEntitlements(session);
        await this.dataRepository.setEntitlements(cloudEntitlements);
        return cloudEntitlements;
      }

      const defaultEntitlements = buildDefaultEntitlements('free');
      await this.dataRepository.setEntitlements(defaultEntitlements);
      return defaultEntitlements;
    } catch (error) {
      console.error('[EntitlementService] getEffectiveEntitlements error:', error);
      return buildDefaultEntitlements('free');
    }
  }

  async refreshEntitlements() {
    try {
      const session = await this.dataRepository.getAuthSession();
      if (!session || session.plan !== 'pro') {
        const freeEntitlements = buildDefaultEntitlements('free');
        await this.dataRepository.setEntitlements(freeEntitlements);
        return freeEntitlements;
      }

      const proEntitlements = this.buildProEntitlements(session);
      await this.dataRepository.setEntitlements(proEntitlements);
      return proEntitlements;
    } catch (error) {
      console.error('[EntitlementService] refreshEntitlements error:', error);
      return buildDefaultEntitlements('free');
    }
  }

  buildProEntitlements(session) {
    return {
      plan: 'pro',
      source: 'cloud-session',
      updatedAt: Date.now(),
      expiresAt: session.expiresAt || null,
      features: {
        exportMarkdown: true,
        exportJson: true,
        aiSummary: true,
        conflictCheck: true,
        graphEditor: true
      },
      limits: {
        maxWorlds: null,
        maxBooksPerWorld: null,
        maxEntities: null,
        maxCapturesPerDay: null,
        maxMarkdownExportsPerDay: null
      }
    };
  }

  downgradeEntitlements(entitlements) {
    return {
      ...entitlements,
      plan: 'free',
      source: 'downgrade',
      updatedAt: Date.now(),
      expiresAt: null,
      features: buildDefaultEntitlements('free').features,
      limits: buildDefaultEntitlements('free').limits
    };
  }

  checkWorldLimit(entitlements, currentCount) {
    const limit = entitlements?.limits?.maxWorlds;
    if (!isLimited(limit)) return { allowed: true };
    if (currentCount >= limit) {
      return {
        allowed: false,
        error: `世界数量已达上限（${limit}个），请升级到 Pro 版本`
      };
    }
    return { allowed: true };
  }

  checkBooksPerWorldLimit(entitlements, worldBooksCount) {
    const limit = entitlements?.limits?.maxBooksPerWorld;
    if (!isLimited(limit)) return { allowed: true };
    if (worldBooksCount >= limit) {
      return {
        allowed: false,
        error: `每个世界最多 ${limit} 本书，请升级到 Pro 版本`
      };
    }
    return { allowed: true };
  }

  checkEntityLimit(entitlements, currentCount) {
    const limit = entitlements?.limits?.maxEntities;
    if (!isLimited(limit)) return { allowed: true };
    if (currentCount >= limit) {
      return {
        allowed: false,
        error: `实体数量已达上限（${limit}个），请升级到 Pro 版本`
      };
    }
    return { allowed: true };
  }

  checkCaptureDailyLimit(entitlements, todayCount) {
    const limit = entitlements?.limits?.maxCapturesPerDay;
    if (!isLimited(limit)) return { allowed: true };
    if (todayCount >= limit) {
      return {
        allowed: false,
        error: `今日采集次数已用完（${limit}次），请升级到 Pro 版本`
      };
    }
    return { allowed: true };
  }

  checkExportLimit(entitlements, todayMarkdownCount) {
    const limit = entitlements?.limits?.maxMarkdownExportsPerDay;
    if (!isLimited(limit)) return { allowed: true };
    if (todayMarkdownCount >= limit) {
      return {
        allowed: false,
        error: `今日导出次数已用完（${limit}次），请升级到 Pro 版本`
      };
    }
    return { allowed: true };
  }
}

module.exports = EntitlementService;
