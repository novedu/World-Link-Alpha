import { createContext, useContext, ReactNode } from 'react';

interface ToastOptions {
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

interface ToastContextType {
  show: (options: ToastOptions) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const show = ({ message, type = 'info', duration = 3000 }: ToastOptions) => {
    // 创建 toast 元素
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 16px;
      border-radius: 8px;
      color: white;
      font-size: 14px;
      font-weight: 500;
      z-index: 9999;
      animation: slideIn 0.3s ease-out;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    `;

    // 设置背景色
    switch (type) {
      case 'success':
        toast.style.backgroundColor = '#52c41a';
        break;
      case 'error':
        toast.style.backgroundColor = '#ff4d4f';
        break;
      case 'warning':
        toast.style.backgroundColor = '#faad14';
        break;
      default:
        toast.style.backgroundColor = '#1890ff';
    }

    toast.textContent = message;
    document.body.appendChild(toast);

    // 动画效果
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);

    // 自动移除
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
        if (document.head.contains(style)) {
          document.head.removeChild(style);
        }
      }, 300);
    }, duration);
  };

  const success = (message: string, duration?: number) => {
    show({ message, type: 'success', duration });
  };

  const error = (message: string, duration?: number) => {
    show({ message, type: 'error', duration });
  };

  const info = (message: string, duration?: number) => {
    show({ message, type: 'info', duration });
  };

  const warning = (message: string, duration?: number) => {
    show({ message, type: 'warning', duration });
  };

  return (
    <ToastContext.Provider value={{ show, success, error, info, warning }}>
      {children}
    </ToastContext.Provider>
  );
};
