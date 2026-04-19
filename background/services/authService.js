// 认证服务模块

const { normalizeAuthSessionPayload, safeName, createId } = require('../utils/helpers');

class AuthService {
  constructor(dataRepository) {
    this.dataRepository = dataRepository;
  }

  async getAuthSession() {
    try {
      const session = await this.dataRepository.getAuthSession();
      if (!session) {
        return { success: false, error: '未登录' };
      }

      const now = Date.now();
      if (session.expiresAt && session.expiresAt < now) {
        await this.dataRepository.clearAuthSession();
        return {
          success: false,
          type: 'auth_expired',
          message: '登录已过期，请重新登录'
        };
      }

      if (session.subscriptionExpiresAt && session.subscriptionExpiresAt < now) {
        const downgraded = {
          ...session,
          plan: 'free',
          subscriptionExpiresAt: null,
          updatedAt: now
        };
        await this.dataRepository.setAuthSession(downgraded);
        return {
          success: false,
          type: 'subscription_expired',
          message: 'Pro 订阅已过期，已自动降级到 Free 版本'
        };
      }

      if (session.updatedAt && (now - session.updatedAt) > 30 * 24 * 60 * 60 * 1000) {
        await this.dataRepository.clearAuthSession();
        return {
          success: false,
          type: 'session_expired',
          message: '为保护账号安全，您已自动登出'
        };
      }

      return { success: true, session };
    } catch (error) {
      console.error('[AuthService] getAuthSession error:', error);
      return { success: false, error: error?.message || '获取会话失败' };
    }
  }

  async setAuthSession(payload) {
    try {
      const session = normalizeAuthSessionPayload(payload);
      if (!session) {
        return { success: false, error: '无效的会话数据' };
      }
      await this.dataRepository.setAuthSession(session);
      return { success: true, session };
    } catch (error) {
      console.error('[AuthService] setAuthSession error:', error);
      return { success: false, error: error?.message || '设置会话失败' };
    }
  }

  async clearAuthSession() {
    try {
      await this.dataRepository.clearAuthSession();
      return { success: true };
    } catch (error) {
      console.error('[AuthService] clearAuthSession error:', error);
      return { success: false, error: error?.message || '清除会话失败' };
    }
  }

  async signInWithPassword(payload) {
    try {
      const email = safeName(payload.email).toLowerCase();
      const password = safeName(payload.password);
      
      if (!email || !password) {
        return { success: false, error: '邮箱和密码不能为空' };
      }

      const mockSession = {
        userId: createId('user'),
        email,
        plan: 'free',
        provider: 'local-dev',
        accessToken: createId('token'),
        refreshToken: createId('refresh'),
        tokenType: 'Bearer',
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      await this.dataRepository.setAuthSession(mockSession);
      return { success: true, session: mockSession };
    } catch (error) {
      console.error('[AuthService] signInWithPassword error:', error);
      return { success: false, error: error?.message || '登录失败' };
    }
  }

  async registerWithPassword(payload) {
    try {
      const email = safeName(payload.email).toLowerCase();
      const password = safeName(payload.password);
      
      if (!email || !password) {
        return { success: false, error: '邮箱和密码不能为空' };
      }

      const mockSession = {
        userId: createId('user'),
        email,
        plan: 'free',
        provider: 'local-dev',
        accessToken: createId('token'),
        refreshToken: createId('refresh'),
        tokenType: 'Bearer',
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      await this.dataRepository.setAuthSession(mockSession);
      return { success: true, session: mockSession };
    } catch (error) {
      console.error('[AuthService] registerWithPassword error:', error);
      return { success: false, error: error?.message || '注册失败' };
    }
  }
}

module.exports = AuthService;
