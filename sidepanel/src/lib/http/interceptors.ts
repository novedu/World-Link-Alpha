import type { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiError, type ApiResponse, type OnAuthExpiredCallback } from './types';
import { getToken, clearToken } from './token';

// 全局认证过期回调
let onAuthExpiredCallback: OnAuthExpiredCallback = () => {};

// 设置认证过期回调
export const setOnAuthExpired = (callback: OnAuthExpiredCallback) => {
  onAuthExpiredCallback = callback;
};

// 请求拦截器
export const setupRequestInterceptor = (axiosInstance: AxiosInstance) => {
  axiosInstance.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
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
};

// 响应拦截器
export const setupResponseInterceptor = (axiosInstance: AxiosInstance) => {
  axiosInstance.interceptors.response.use(
    (response: AxiosResponse<ApiResponse<unknown>>) => {
      // 处理业务失败
      if (response.data && !response.data.success) {
        const errorData = response.data.error;
        throw new ApiError(
          errorData?.message || '请求失败',
          errorData?.code || 'BUSINESS_ERROR',
          response.status,
          response.data
        );
      }

      return response;
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
        const errorData = data?.error;
        const errorMessage = errorData?.message || error.message || '网络错误';
        const errorCode = errorData?.code || 'HTTP_ERROR';
        throw new ApiError(errorMessage, errorCode, status, data);
      }

      // 网络错误
      if (error.message) {
        throw new ApiError(
          error.message.includes('timeout') ? '请求超时' : '网络异常',
          'NETWORK_ERROR',
          0
        );
      }

      // 其他错误
      throw new ApiError('未知错误', 'UNKNOWN_ERROR', 0);
    }
  );
};

// 生成 requestId
const generateRequestId = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};
