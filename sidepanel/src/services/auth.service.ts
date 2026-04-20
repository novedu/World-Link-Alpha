import { http } from '../lib/http/client';
import { setToken, clearToken } from '../lib/http/token';

interface AuthData {
  token?: string;
  [key: string]: any;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: any;
  meta?: any;
}

// 认证服务
class AuthService {
  // 注册
  async register(email: string, password: string) {
    const response = await http.post<ApiResponse<AuthData>>('/auth/register', { email, password });
    const data = response.data as AuthData | undefined;
    if (response.success && data?.token) {
      await setToken(data.token);
    }
    return response;
  }

  // 登录
  async login(email: string, password: string) {
    const response = await http.post<ApiResponse<AuthData>>('/auth/login', { email, password });
    const data = response.data as AuthData | undefined;
    if (response.success && data?.token) {
      await setToken(data.token);
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
