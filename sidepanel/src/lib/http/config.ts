import type { HttpConfig } from './types';

// 获取 HTTP 配置
export const getHttpConfig = (): HttpConfig => {
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
