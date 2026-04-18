import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiError, ApiResponse } from './types';
import { getToken, setToken, clearToken } from './token';

// 请求拦截器
export const setupRequestInterceptor = (axiosInstance: AxiosInstance) => {
  axiosInstance.interceptors.request.use(
    async (config: AxiosRequestConfig) => {
      // 自动注入 token
      const token = await getToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // 添加 traceId
      config.headers = {
        ...config.headers,
        'X-Trace-Id': generateTraceId(),
      };

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
    (response: AxiosResponse<ApiResponse>) => {
      // 处理业务成功码
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
        // 401 处理
        if (error.response.status === 401) {
          try {
            // 尝试刷新 token
            // 这里可以实现 token 刷新逻辑
            // const newToken = await refreshToken();
            // if (newToken) {
            //   await setToken(newToken);
            //   // 重新发送请求
            //   const originalRequest = error.config;
            //   originalRequest.headers.Authorization = `Bearer ${newToken}`;
            //   return axiosInstance(originalRequest);
            // }
            // 暂时直接清除 token
            await clearToken();
            // 可以在这里触发登录跳转逻辑
          } catch (refreshError) {
            // 刷新失败，清除 token
            await clearToken();
            // 可以在这里触发登录跳转逻辑
          }
        }

        // 其他错误
        const errorData = error.response.data?.error;
        const errorMessage = errorData?.message || error.message || '网络错误';
        const errorCode = errorData?.code || 'HTTP_ERROR';
        throw new ApiError(
          errorMessage,
          errorCode,
          error.response.status,
          error.response.data
        );
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

// 生成 traceId
const generateTraceId = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};
