import axios from 'axios';
import { getHttpConfig } from './config';
import { setupRequestInterceptor, setupResponseInterceptor } from './interceptors';
import type { ApiResponse } from './types';

// 创建 axios 实例
const createAxiosInstance = () => {
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
export const request = async <T = any>(
  config: any
): Promise<ApiResponse<T>> => {
  const response = await axiosClient(config);
  return response.data;
};

// 导出常用请求方法
export const http = {
  get: <T = any>(url: string, params?: any, config?: any) => {
    return request<T>({
      method: 'GET',
      url,
      params,
      ...config,
    });
  },

  post: <T = any>(url: string, data?: any, config?: any) => {
    return request<T>({
      method: 'POST',
      url,
      data,
      ...config,
    });
  },

  put: <T = any>(url: string, data?: any, config?: any) => {
    return request<T>({
      method: 'PUT',
      url,
      data,
      ...config,
    });
  },

  delete: <T = any>(url: string, config?: any) => {
    return request<T>({
      method: 'DELETE',
      url,
      ...config,
    });
  },

  patch: <T = any>(url: string, data?: any, config?: any) => {
    return request<T>({
      method: 'PATCH',
      url,
      data,
      ...config,
    });
  },
};
