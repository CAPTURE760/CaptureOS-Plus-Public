'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getAuthConfig, getToken } from '@/lib/api';

/**
 * 路由守卫：多用户模式下，未登录用户跳转登录页。
 * 认证模式运行时从后端获取（/api/auth/config）。
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const config = await getAuthConfig();
      if (cancelled) return;

      // 单用户模式：免登录直接放行
      if (config.single_user_mode) {
        setChecked(true);
        return;
      }

      const token = getToken();
      if (!token) {
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
        return;
      }
      setChecked(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  // 未检查完成时不渲染内容（避免闪烁）
  if (!checked) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
      </div>
    );
  }

  return <>{children}</>;
}
