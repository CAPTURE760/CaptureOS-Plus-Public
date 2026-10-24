import useSWR from 'swr';

// 动态获取 API 地址：优先用环境变量，否则用相对路径 /api
// 相对路径 /api 在本地经 Next.js rewrite 代理到 backend，在生产经 nginx 反代到 backend
function getApiBase(): string {
  if (typeof window === 'undefined') return process.env.NEXT_PUBLIC_API_URL || '/api';
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl) return envUrl;
  return '/api';
}

const API_BASE = getApiBase();

const TOKEN_KEY = 'captureos_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// ── 认证模式（运行时从后端获取，不能用 NEXT_PUBLIC_ 构建期变量）──
let authConfigCache: { single_user_mode: boolean } | null = null;
let authConfigPromise: Promise<{ single_user_mode: boolean }> | null = null;

/** 获取认证模式配置（带缓存）。失败时按多用户模式处理（更安全）。 */
export function getAuthConfig(): Promise<{ single_user_mode: boolean }> {
  if (authConfigCache) return Promise.resolve(authConfigCache);
  if (!authConfigPromise) {
    authConfigPromise = fetch(`${API_BASE}/auth/config`)
      .then((res) => res.json())
      .then((data) => {
        authConfigCache = data;
        return data;
      })
      .catch(() => {
        authConfigPromise = null; // 失败允许重试
        return { single_user_mode: false };
      });
  }
  return authConfigPromise;
}

export async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  // 如果path以/api开头，则不要重复添加API_BASE
  const url = path.startsWith('/api')
    ? path
    : `${API_BASE}${path}`;

  const headers: Record<string, string> = {
    // 对于文件上传，让浏览器自动设置 Content-Type (multipart/form-data)
    ...(options && options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options?.headers as Record<string, string> | undefined),
  };

  // 有 token 就带上（单用户模式下后端会忽略，无副作用）
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  // 401：清除 token 并跳转登录页
  // （单用户模式下后端不会返回 401，所以无需区分模式）
  if (res.status === 401) {
    let detail = '';
    try {
      const err = await res.json();
      detail = err?.detail || '';
    } catch { /* ignore */ }
    console.error(`[401] ${url}`, detail || res.statusText);
    clearToken();
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
    }
    throw new Error('未登录或登录已过期');
  }

  if (!res.ok) {
    let message = `API error: ${res.status} ${res.statusText}`;
    try {
      const err = await res.json();
      if (err?.detail) message = err.detail;
    } catch {
      // ignore parse error
    }
    throw new Error(message);
  }

  if (res.status === 204) {
    return null as T;
  }

  return res.json();
}

export function useAPI<T>(path: string) {
  const fetcher = (url: string) => fetchAPI<T>(url);
  return useSWR<T>(path, fetcher);
}
