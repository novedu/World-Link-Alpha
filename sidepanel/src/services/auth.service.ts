import { http } from '../lib/http/client';
import { setToken, clearToken } from '../lib/http/token';

// 认证服务
class AuthService {
  // 注册
  async register(email: string, password: string) {
    const response = await http.post('/auth/register', { email, password });
    if (response.success && response.data.token) {
      await setToken(response.data.token);
    }
    return response;
  }

  // 登录
  async login(email: string, password: string) {
    const response = await http.post('/auth/login', { email, password });
    if (response.success && response.data.token) {
      await setToken(response.data.token);
    }
    return response;
  }

  // 登出
  async logout() {
    try {
      await http.post('/auth/logout');
    } finally {
      await clearToken();
    }
  }

  // 获取当前用户
  async getCurrentUser() {
    return http.get('/auth/me');
  }
}

export const authService = new AuthService();
