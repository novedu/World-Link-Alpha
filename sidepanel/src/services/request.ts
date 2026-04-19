import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { getToken, clearToken } from '../lib/http/token';

// 统一返回格式
export interface ApiResponse<T = unknown> {
  code: number;
  data: T;
  message: string;
}

// 错误类型
export class ApiError extends Error {
  public code: number;
  public status: number;
  public data?: unknown;

  constructor(message: string, code: number = 500, status: number = 500, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.data = data;
  }
}

// HTTP 配置
export interface HttpConfig {
  baseURL: string;
  timeout: number;
  headers: Record<string, string>;
  withCredentials: boolean;
}

// 请求选项
interface RequestOptions {
  showLoading?: boolean;
  showError?: boolean;
  showSuccess?: boolean;
  successMessage?: string;
  debounce?: number;
}

// 获取 HTTP 配置
const getHttpConfig = (): HttpConfig => {
  const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

  return {
    baseURL,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
    withCredentials: true,
  };
};

// 全局认证过期回调
let onAuthExpiredCallback: (() => void | Promise<void>) = () => {};

// 设置认证过期回调
export const setOnAuthExpired = (callback: () => void | Promise<void>) => {
  onAuthExpiredCallback = callback;
};

// 正在进行的请求缓存
const pendingRequests = new Map<string, Promise<any>>();
// 防抖定时器
const debounceTimers = new Map<string, NodeJS.Timeout>();

// 创建 axios 实例
const createAxiosInstance = (): AxiosInstance => {
  const config = getHttpConfig();

  const instance = axios.create({
    baseURL: config.baseURL,
    timeout: config.timeout,
    headers: config.headers,
    withCredentials: config.withCredentials,
  });

  // 请求拦截器
  instance.interceptors.request.use(
    async (config: AxiosRequestConfig) => {
      // 确保 headers 存在
      config.headers = config.headers || {};

      // 自动注入 token
      const token = await getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // 添加统一请求追踪头 x-request-id
      config.headers['x-request-id'] = generateRequestId();

      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // 响应拦截器
  instance.interceptors.response.use(
    (response: AxiosResponse<ApiResponse<unknown>>) => {
      // 统一处理响应格式
      const { data } = response;
      return {
        ...response,
        data: {
          code: data.code || 200,
          data: data.data,
          message: data.message || 'success'
        }
      };
    },
    async (error) => {
      // 处理 HTTP 错误
      if (error.response) {
        const { status, data } = error.response;

        // 401 处理
        if (status === 401) {
          try {
            // 清除 token
            await clearToken();
            // 触发认证过期回调
            if (onAuthExpiredCallback) {
              await Promise.resolve(onAuthExpiredCallback());
            }
          } catch (clearError) {
            console.error('Error handling 401:', clearError);
          }
        }

        // 构造错误信息
        const errorData = data as ApiResponse;
        const errorMessage = errorData?.message || error.message || '网络错误';
        const errorCode = errorData?.code || 500;
        throw new ApiError(errorMessage, errorCode, status, data);
      }

      // 网络错误
      if (error.message) {
        throw new ApiError(
          error.message.includes('timeout') ? '请求超时' : '网络异常',
          500,
          0
        );
      }

      // 其他错误
      throw new ApiError('未知错误', 500, 0);
    }
  );

  return instance;
};

// 生成 requestId
const generateRequestId = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// 生成请求 key
const generateRequestKey = (config: AxiosRequestConfig): string => {
  const { method = 'GET', url = '', params, data } = config;
  return `${method}:${url}:${JSON.stringify(params || {})}:${JSON.stringify(data || {})}`;
};

// 导出 axios 实例
const axiosClient = createAxiosInstance();

// 封装 request 方法
export const request = async <T = unknown>(config: AxiosRequestConfig): Promise<ApiResponse<T>> => {
  const requestKey = generateRequestKey(config);

  // 检查是否有相同的请求正在进行
  if (pendingRequests.has(requestKey)) {
    return pendingRequests.get(requestKey) as Promise<ApiResponse<T>>;
  }

  const requestPromise = (async (): Promise<ApiResponse<T>> => {
    try {
      const response = await axiosClient(config);
      return response.data as ApiResponse<T>;
    } finally {
      pendingRequests.delete(requestKey);
    }
  })();

  pendingRequests.set(requestKey, requestPromise);
  return requestPromise;
};

// 带防抖的请求
const debouncedRequest = <T = unknown>(config: AxiosRequestConfig, debounce: number): Promise<ApiResponse<T>> => {
  const requestKey = generateRequestKey(config);

  // 清除之前的防抖定时器
  if (debounceTimers.has(requestKey)) {
    clearTimeout(debounceTimers.get(requestKey)!);
  }

  return new Promise<ApiResponse<T>>((resolve, reject) => {
    const timer = setTimeout(async () => {
      try {
        const response = await request<T>(config);
        resolve(response);
      } catch (error) {
        reject(error);
      } finally {
        debounceTimers.delete(requestKey);
      }
    }, debounce);

    debounceTimers.set(requestKey, timer);
  });
};

// 导出常用请求方法
export const http = {
  get: <T = unknown>(url: string, params?: unknown, config?: AxiosRequestConfig & { debounce?: number }) => {
    const { debounce, ...requestConfig } = config || {};
    const requestParams = {
      method: 'GET' as const,
      url,
      params,
      ...requestConfig,
    };

    if (debounce && debounce > 0) {
      return debouncedRequest<T>(requestParams, debounce);
    }
    return request<T>(requestParams);
  },

  post: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig & { debounce?: number }) => {
    const { debounce, ...requestConfig } = config || {};
    const requestParams = {
      method: 'POST' as const,
      url,
      data,
      ...requestConfig,
    };

    if (debounce && debounce > 0) {
      return debouncedRequest<T>(requestParams, debounce);
    }
    return request<T>(requestParams);
  },

  put: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig & { debounce?: number }) => {
    const { debounce, ...requestConfig } = config || {};
    const requestParams = {
      method: 'PUT' as const,
      url,
      data,
      ...requestConfig,
    };

    if (debounce && debounce > 0) {
      return debouncedRequest<T>(requestParams, debounce);
    }
    return request<T>(requestParams);
  },

  delete: <T = unknown>(url: string, config?: AxiosRequestConfig & { debounce?: number }) => {
    const { debounce, ...requestConfig } = config || {};
    const requestParams = {
      method: 'DELETE' as const,
      url,
      ...requestConfig,
    };

    if (debounce && debounce > 0) {
      return debouncedRequest<T>(requestParams, debounce);
    }
    return request<T>(requestParams);
  },

  patch: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig & { debounce?: number }) => {
    const { debounce, ...requestConfig } = config || {};
    const requestParams = {
      method: 'PATCH' as const,
      url,
      data,
      ...requestConfig,
    };

    if (debounce && debounce > 0) {
      return debouncedRequest<T>(requestParams, debounce);
    }
    return request<T>(requestParams);
  },
};

// 取消所有请求
export const cancelAllRequests = () => {
  // 清除所有防抖定时器
  debounceTimers.forEach(timer => clearTimeout(timer));
  debounceTimers.clear();
  
  // 注意：axios 的取消需要通过 AbortController 实现
  // 这里我们只是清理缓存，实际取消需要在请求时使用 AbortController
  pendingRequests.clear();
};

// 检查是否有请求正在进行
export const hasPendingRequests = (): boolean => {
  return pendingRequests.size > 0 || debounceTimers.size > 0;
};

export type { RequestOptions };