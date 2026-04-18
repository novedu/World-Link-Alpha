// API 响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  error?: string;
  code?: string;
}

// API 错误类型
export class ApiError extends Error {
  public code: string;
  public status: number;
  public data?: any;

  constructor(message: string, code: string = 'UNKNOWN', status: number = 500, data?: any) {
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
