import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { http, type ApiResponse } from './request';
import { useToast } from './toast.service';

interface UseRequestOptions<T = unknown> {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url?: string;
  params?: unknown;
  data?: unknown;
  config?: any;
  manual?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  showLoading?: boolean;
  showError?: boolean;
  showSuccess?: boolean;
  successMessage?: string;
  refreshDeps?: any[];
  cacheKey?: string;
  cacheTime?: number;
  debounce?: number;
}

interface UseRequestReturn<T = unknown> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  execute: (...args: any[]) => Promise<T>;
  refresh: () => Promise<T>;
  cancel: () => void;
  reset: () => void;
}

// 简单的内存缓存
const cache = new Map<string, { data: any; timestamp: number }>();
// 正在进行的请求缓存
const pendingRequests = new Map<string, Promise<any>>();

function useRequest<T = unknown>(options: UseRequestOptions<T>): UseRequestReturn<T> {
  const toast = useToast();
  
  const { 
    method = 'GET',
    url = '',
    params,
    data,
    config,
    manual = false,
    onSuccess,
    onError,
    showLoading = true,
    showError = true,
    showSuccess = false,
    successMessage = '操作成功',
    refreshDeps = [],
    cacheKey,
    cacheTime = 5 * 60 * 1000, // 5分钟
    debounce = 0
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const latestArgsRef = useRef<any[]>([]);

  // 生成请求 key
  const requestKey = useMemo(() => {
    return `${method}:${url}:${JSON.stringify(params || {})}:${JSON.stringify(data || {})}`;
  }, [method, url, params, data]);

  // 从缓存获取数据
  useEffect(() => {
    if (cacheKey) {
      const cached = cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < cacheTime) {
        setData(cached.data);
      }
    }
  }, [cacheKey, cacheTime]);

  // 执行请求
  const execute = useCallback(async (...args: any[]): Promise<T> => {
    // 保存最新参数
    latestArgsRef.current = args;

    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // 检查是否有相同的请求正在进行
    if (pendingRequests.has(requestKey)) {
      return pendingRequests.get(requestKey) as Promise<T>;
    }

    // 创建新的 AbortController
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setLoading(true);
    setError(null);

    const requestPromise = (async (): Promise<T> => {
      try {
        let response: ApiResponse<T>;
        const requestConfig = {
          ...config,
          signal: abortController.signal,
          debounce: debounce > 0 ? debounce : undefined
        };

        switch (method) {
          case 'GET':
            response = await http.get<T>(url, params, requestConfig);
            break;
          case 'POST':
            response = await http.post<T>(url, data, requestConfig);
            break;
          case 'PUT':
            response = await http.put<T>(url, data, requestConfig);
            break;
          case 'DELETE':
            response = await http.delete<T>(url, requestConfig);
            break;
          case 'PATCH':
            response = await http.patch<T>(url, data, requestConfig);
            break;
          default:
            response = await http.get<T>(url, params, requestConfig);
        }

        setData(response.data);

        // 缓存数据
        if (cacheKey) {
          cache.set(cacheKey, {
            data: response.data,
            timestamp: Date.now()
          });
        }

        // 显示成功提示
        if (showSuccess) {
          toast.success(successMessage);
        }

        // 调用成功回调
        if (onSuccess) {
          onSuccess(response.data);
        }

        return response.data;
      } catch (err) {
        const error = err as Error;
        setError(error);

        // 显示错误提示
        if (showError) {
          toast.error(error.message);
        }

        // 调用错误回调
        if (onError) {
          onError(error);
        }

        throw error;
      } finally {
        setLoading(false);
        abortControllerRef.current = null;
        pendingRequests.delete(requestKey);
      }
    })();

    pendingRequests.set(requestKey, requestPromise);
    return requestPromise;
  }, [method, url, params, data, config, showError, showSuccess, successMessage, onSuccess, onError, cacheKey, toast, requestKey, debounce]);

  // 带防抖的执行
  const executeWithDebounce = useCallback((...args: any[]) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    return new Promise<T>((resolve, reject) => {
      debounceTimerRef.current = setTimeout(async () => {
        try {
          const result = await execute(...args);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, debounce);
    });
  }, [execute, debounce]);

  // 刷新请求
  const refresh = useCallback(() => {
    return execute(...latestArgsRef.current);
  }, [execute]);

  // 取消请求
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setLoading(false);
    }
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    pendingRequests.delete(requestKey);
  }, [requestKey]);

  // 重置状态
  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  // 自动执行
  useEffect(() => {
    if (!manual && url) {
      execute();
    }
  }, [manual, url, execute, ...refreshDeps]);

  // 清理
  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  return {
    data,
    loading,
    error,
    execute: debounce > 0 ? executeWithDebounce : execute,
    refresh,
    cancel,
    reset
  };
}

// 示例：useUserList hook
export function useUserList(params?: {
  page?: number;
  pageSize?: number;
  keyword?: string;
}) {
  return useRequest<{
    list: Array<{
      id: string;
      name: string;
      email: string;
      role: string;
      createdAt: string;
    }>;
    total: number;
    page: number;
    pageSize: number;
  }>({
    method: 'GET',
    url: '/users',
    params: params || { page: 1, pageSize: 10 },
    cacheKey: `users_${params?.page || 1}_${params?.pageSize || 10}_${params?.keyword || ''}`,
    refreshDeps: [params?.page, params?.pageSize, params?.keyword],
    showError: true,
    showSuccess: false,
    debounce: 300 // 添加防抖
  });
}

// 抽离 CRUD hooks
export function useCreate<T = unknown>(url: string, options?: Partial<UseRequestOptions<T>>) {
  return useRequest<T>({
    method: 'POST',
    url,
    manual: true,
    showSuccess: true,
    successMessage: '创建成功',
    ...options,
  });
}

export function useUpdate<T = unknown>(url: string, options?: Partial<UseRequestOptions<T>>) {
  return useRequest<T>({
    method: 'PUT',
    url,
    manual: true,
    showSuccess: true,
    successMessage: '更新成功',
    ...options,
  });
}

export function useDelete<T = unknown>(url: string, options?: Partial<UseRequestOptions<T>>) {
  return useRequest<T>({
    method: 'DELETE',
    url,
    manual: true,
    showSuccess: true,
    successMessage: '删除成功',
    ...options,
  });
}

export function useQuery<T = unknown>(url: string, params?: unknown, options?: Partial<UseRequestOptions<T>>) {
  return useRequest<T>({
    method: 'GET',
    url,
    params,
    ...options,
  });
}

export default useRequest;