import { http } from '../lib/http/client';
import { setToken, clearToken } from '../lib/http/token';

/**
 * 认证数据接口
 * @description 包含JWT令牌和用户基本信息
 */
interface AuthData {
  /** JWT认证令牌 */
  token?: string;
  [key: string]: unknown;
}

/**
 * API统一响应格式
 * @description 后端API的标准响应结构
 */
interface ApiResponse<T> {
  /** 请求是否成功 */
  success: boolean;
  /** 响应数据 */
  data: T;
  /** 错误信息（如果请求失败） */
  error?: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string[]>;
  };
  /** 请求元信息 */
  meta?: {
    requestId?: string;
    timestamp?: string;
  };
}

/**
 * 认证服务类
 * @description 处理用户注册、登录、登出等认证相关功能
 * @example
 * // 登录
 * const response = await authService.login('user@example.com', 'password123');
 * if (response.success) {
 *   console.log('登录成功');
 * }
 */
class AuthService {
  /**
   * 用户注册
   * @param email - 用户邮箱地址
   * @param password - 用户密码（至少6位，需包含大小写字母和数字）
   * @returns Promise<ApiResponse<AuthData>> - 包含用户信息和JWT令牌
   * @remarks
   * 密码要求：
   * - 最少6位字符
   * - 至少包含一个大写字母
   * - 至少包含一个小写字母
   * - 至少包含一个数字
   */
  async register(email: string, password: string) {
    const response = await http.post<AuthData>('/auth/register', { email, password });
    const data = response.data;
    if (response.success && data?.token) {
      await setToken(data.token);
    }
    return response;
  }

  /**
   * 用户登录
   * @param email - 用户邮箱地址
   * @param password - 用户密码
   * @returns Promise<ApiResponse<AuthData>> - 包含用户信息和JWT令牌
   * @remarks
   * 登录成功后会自动保存JWT令牌到本地存储
   */
  async login(email: string, password: string) {
    const response = await http.post<AuthData>('/auth/login', { email, password });
    const data = response.data;
    if (response.success && data?.token) {
      await setToken(data.token);
    }
    return response;
  }

  /**
   * 用户登出
   * @returns Promise<void>
   * @remarks
   * 会调用后端登出接口清理服务端会话，然后清除本地存储的令牌
   */
  async logout() {
    try {
      await http.post('/auth/logout');
    } finally {
      await clearToken();
    }
  }

  /**
   * 获取当前登录用户信息
   * @returns Promise<ApiResponse<User>> - 当前用户信息
   * @remarks
   * 需要有效的JWT令牌，返回当前登录用户的基本信息
   */
  async getCurrentUser() {
    return http.get('/auth/me');
  }
}

export const authService = new AuthService();
