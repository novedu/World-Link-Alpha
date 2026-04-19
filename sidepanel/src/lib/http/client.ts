import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig } from 'axios';
import { getHttpConfig } from './config';
import { setupRequestInterceptor, setupResponseInterceptor, setOnAuthExpired } from './interceptors';
import type { ApiResponse } from './types';

// 创建 axios 实例
const createAxiosInstance = (): AxiosInstance => {
  const config = getHttpConfig();

  const instance = axios.create({
    baseURL: config.baseURL,
    timeout: config.timeout,
    headers: config.headers,
    withCredentials: config.withCredentials,
  });

  // 设置拦截器
  setupRequestInterceptor(instance);
  setupResponseInterceptor(instance);

  return instance;
};

// 导出 axios 实例
export const axiosClient = createAxiosInstance();

// 封装请求方法
export const request = async <T = unknown>(config: AxiosRequestConfig): Promise<ApiResponse<T>> => {
  const response = await axiosClient(config);
  return response.data as ApiResponse<T>;
};

// 导出常用请求方法
export const http = {
  get: <T = unknown>(url: string, params?: unknown, config?: AxiosRequestConfig) => {
    return request<T>({
      method: 'GET',
      url,
      params,
      ...config,
    });
  },

  post: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig) => {
    return request<T>({
      method: 'POST',
      url,
      data,
      ...config,
    });
  },

  put: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig) => {
    return request<T>({
      method: 'PUT',
      url,
      data,
      ...config,
    });
  },

  delete: <T = unknown>(url: string, config?: AxiosRequestConfig) => {
    return request<T>({
      method: 'DELETE',
      url,
      ...config,
    });
  },

  patch: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig) => {
    return request<T>({
      method: 'PATCH',
      url,
      data,
      ...config,
    });
  },
};

// 导出设置认证过期回调的方法
export { setOnAuthExpired };
