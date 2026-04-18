// Token 管理
const AUTH_SESSION_KEY = 'authSession';

// 获取 token
export const getToken = async (): Promise<string | null> => {
  return new Promise((resolve) => {
    chrome.storage.local.get([AUTH_SESSION_KEY], (result) => {
      const authSession = result[AUTH_SESSION_KEY];
      resolve(authSession?.token || null);
    });
  });
};

// 设置 token
export const setToken = async (token: string | null): Promise<void> => {
  return new Promise((resolve) => {
    if (token) {
      chrome.storage.local.get([AUTH_SESSION_KEY], (result) => {
        const authSession = result[AUTH_SESSION_KEY] || {};
        authSession.token = token;
        chrome.storage.local.set({ [AUTH_SESSION_KEY]: authSession }, resolve);
      });
    } else {
      chrome.storage.local.get([AUTH_SESSION_KEY], (result) => {
        const authSession = result[AUTH_SESSION_KEY] || {};
        delete authSession.token;
        chrome.storage.local.set({ [AUTH_SESSION_KEY]: authSession }, resolve);
      });
    }
  });
};

// 清除 token
export const clearToken = async (): Promise<void> => {
  return setToken(null);
};
