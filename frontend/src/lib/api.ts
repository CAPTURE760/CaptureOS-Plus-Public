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

// 是否单用户模式（本地免登录）
export const SINGLE_USER_MODE = process.env.NEXT_PUBLIC_SINGLE_USER_MODE !== 'false';

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

export async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  // 如果path以/api开头，则不要重复添加API_BASE
  const url = path.startsWith('/api')
    ? path
    : `${API_BASE}${path}`;

  const headers: Record<string, string> = {
    // 对于文件上传，让浏览器自动设置 Content-Type (multipart/form-data)
    ...(options && options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...options?.headers,
  };

  // 非单用户模式下自动携带 JWT
  if (!SINGLE_USER_MODE) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const res = await fetch(url, {
    headers,
    ...options,
  });

  // 401：清除 token 并跳转登录页
  if (res.status === 401 && !SINGLE_USER_MODE) {
    clearToken();
    if (typeof window !== 'undefined') {
      const loginUrl = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = loginUrl;
      }
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
