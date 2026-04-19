// 认证相关的消息处理器

const AuthService = require('../services/authService');

class AuthHandler {
  constructor(dataRepository) {
    this.authService = new AuthService(dataRepository);
  }

  async handleGetAuthSession() {
    return this.authService.getAuthSession();
  }

  async handleSetAuthSession(data) {
    return this.authService.setAuthSession(data);
  }

  async handleClearAuthSession() {
    return this.authService.clearAuthSession();
  }

  async handleSignInWithPassword(data) {
    return this.authService.signInWithPassword(data);
  }

  async handleRegisterWithPassword(data) {
    return this.authService.registerWithPassword(data);
  }

  validateSignInWithPasswordPayload(payload) {
    if (!this.isPlainObject(payload)) {
      return this.createValidationResult('SIGN_IN_WITH_PASSWORD 参数必须是对象');
    }

    if (typeof payload.email !== 'string' || !payload.email.trim()) {
      return this.createValidationResult('SIGN_IN_WITH_PASSWORD.email 必填');
    }

    if (typeof payload.password !== 'string' || !payload.password) {
      return this.createValidationResult('SIGN_IN_WITH_PASSWORD.password 必填');
    }

    return null;
  }

  validateRegisterWithPasswordPayload(payload) {
    if (!this.isPlainObject(payload)) {
      return this.createValidationResult('REGISTER_WITH_PASSWORD 参数必须是对象');
    }

    if (typeof payload.email !== 'string' || !payload.email.trim()) {
      return this.createValidationResult('REGISTER_WITH_PASSWORD.email 必填');
    }

    if (typeof payload.password !== 'string' || !payload.password) {
      return this.createValidationResult('REGISTER_WITH_PASSWORD.password 必填');
    }

    return null;
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

module.exports = AuthHandler;
