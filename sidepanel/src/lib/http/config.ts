import { Environment, HttpConfig } from './types';

// 环境配置
const envConfigs: Record<Environment, HttpConfig> = {
  local: {
    baseURL: 'http://localhost:3001/api',
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
    withCredentials: true,
  },
  development: {
    baseURL: 'http://localhost:3001/api',
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
    withCredentials: true,
  },
  test: {
    baseURL: 'http://localhost:3001/api',
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
    withCredentials: true,
  },
  staging: {
    baseURL: 'http://localhost:3001/api',
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
    withCredentials: true,
  },
  production: {
    baseURL: 'http://localhost:3001/api',
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
    withCredentials: true,
  },
};

// 获取当前环境
export const getCurrentEnvironment = (): Environment => {
  const env = import.meta.env.VITE_ENV as Environment || 'local';
  return env in envConfigs ? env : 'local';
};

// 获取当前环境配置
export const getHttpConfig = (): HttpConfig => {
  const env = getCurrentEnvironment();
  return envConfigs[env];
};
