'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetchAPI, setToken, SINGLE_USER_MODE } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [captchaCode, setCaptchaCode] = useState('');
  const [captchaId, setCaptchaId] = useState('');
  const [captchaSrc, setCaptchaSrc] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const imgRef = useRef<HTMLImageElement>(null);

  // 单用户模式直接跳转首页
  useEffect(() => {
    if (SINGLE_USER_MODE) {
      router.replace('/');
    }
  }, [router]);

  // 加载验证码
  const loadCaptcha = async () => {
    try {
      const res = await fetch('/api/auth/captcha');
      const id = res.headers.get('X-Captcha-Id') || '';
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        setCaptchaSrc(reader.result as string);
        setCaptchaId(id);
      };
      reader.readAsDataURL(blob);
    } catch {
      setError('验证码加载失败，请刷新重试');
    }
  };

  useEffect(() => {
    if (!SINGLE_USER_MODE) {
      loadCaptcha();
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !password || !captchaCode) {
      setError('请填写所有字段');
      return;
    }

    setLoading(true);
    try {
      const data = await fetchAPI<{ access_token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password, captcha_id: captchaId, captcha_code: captchaCode }),
      });
      setToken(data.access_token);
      router.replace(redirect);
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
      loadCaptcha(); // 刷新验证码
      setCaptchaCode('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-950 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">CaptureOS</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">个人资产管理系统</p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-xl dark:bg-gray-800">
          <h2 className="mb-6 text-xl font-semibold text-gray-900 dark:text-white">登录</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                用户名
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="请输入用户名"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                密码
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="请输入密码"
                autoComplete="current-password"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                验证码
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={captchaCode}
                  onChange={(e) => setCaptchaCode(e.target.value.toUpperCase())}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="请输入验证码"
                  maxLength={4}
                />
                <button
                  type="button"
                  onClick={loadCaptcha}
                  className="flex-shrink-0 overflow-hidden rounded-lg border border-gray-300 dark:border-gray-600"
                  title="点击刷新验证码"
                >
                  {captchaSrc ? (
                    <img
                      ref={imgRef}
                      src={captchaSrc}
                      alt="验证码"
                      className="h-10 w-28 cursor-pointer object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-28 items-center justify-center bg-gray-100 text-xs text-gray-500 dark:bg-gray-700">
                      加载中...
                    </div>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-gray-800"
            >
              {loading ? '登录中...' : '登录'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
