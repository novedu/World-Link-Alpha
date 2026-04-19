import type { ApiResponse as SharedApiResponse } from '../../../../shared/types';

// 复用共享的 ApiResponse 类型
export type ApiResponse<T = unknown> = SharedApiResponse<T>;

// API 错误类型
export class ApiError extends Error {
  public code: string;
  public status: number;
  public data?: unknown;

  constructor(message: string, code: string = 'UNKNOWN', status: number = 500, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.data = data;
  }
}

// 环境类型
export type Environment = 'local' | 'development' | 'test' | 'staging' | 'production';

// 配置类型
export interface HttpConfig {
  baseURL: string;
  timeout: number;
  headers: Record<string, string>;
  withCredentials: boolean;
}

// 认证过期回调类型
export type OnAuthExpiredCallback = () => void | Promise<void>;
