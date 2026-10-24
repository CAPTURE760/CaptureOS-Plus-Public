'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { SINGLE_USER_MODE, getToken } from '@/lib/api';

/**
 * 路由守卫：非单用户模式下，未登录用户跳转登录页。
 * login 页面本身不需要守卫。
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // 单用户模式或 login 页面：无需守卫
    if (SINGLE_USER_MODE || pathname.startsWith('/login')) {
      setChecked(true);
      return;
    }

    const token = getToken();
    if (!token) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    setChecked(true);
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
