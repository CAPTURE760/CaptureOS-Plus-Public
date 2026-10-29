'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { fetchAPI, clearToken, getAuthConfig } from '@/lib/api';
import {
  entityTypeLabels as entityLabels,
  entityTypeColors as entityColors,
  entityTypeRoutes as entityRoutes,
} from '@/lib/constants';
import BeijingTime from './BeijingTime';

interface CountsData {
  issues: number;
  decisions: number;
  knowledge: number;
}

interface CurrentUser {
  username: string;
  display_name: string | null;
  is_admin: boolean;
}

interface GlobalSearchResult {
  entity_type: string;
  entity_id: number;
  title: string;
  snippet: string;
  created_at: string | null;
}

const menuItems = [
  { href: '/', label: '仪表盘', icon: '📊' },
  { href: '/projects', label: '项目', icon: '📁' },
  { href: '/experiences', label: '经验', icon: '💡' },
  { href: '/issues', label: '问题', icon: '⚠️', badge: 'issues' as const },
  { href: '/solutions', label: '解决方案', icon: '🔧' },
  { href: '/knowledge', label: '知识', icon: '📚', badge: 'knowledge' as const },
  { href: '/decisions', label: '决策', icon: '🎯', badge: 'decisions' as const },
  { href: '/reviews', label: '复盘', icon: '📝' },
  { href: '/tags', label: '标签', icon: '🏷️' },
  { href: '/timeline', label: '时间线', icon: '📅' },
  { href: '/search', label: '搜索', icon: '🔍' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // ─── 认证模式（运行时从后端获取；默认多用户，获取后单用户模式隐藏退出按钮） ───
  const [multiUserMode, setMultiUserMode] = useState(true);
  useEffect(() => {
    getAuthConfig().then((c) => setMultiUserMode(!c.single_user_mode));
  }, []);
  // 当前用户（单用户模式后端直接返回默认用户，多用户模式靠 token）
  const { data: currentUser } = useSWR<CurrentUser>('/auth/me', fetchAPI);

  // ─── 主题切换（null 表示尚未读取客户端主题，避免 SSR 文案不一致） ───
  const [isDark, setIsDark] = useState<boolean | null>(null);
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);
  const toggleTheme = () => {
    const next = !(isDark ?? false);
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('captureos-theme', next ? 'dark' : 'light');
    } catch {
      /* localStorage 不可用时忽略 */
    }
  };

  const { data: counts } = useSWR<CountsData>('/dashboard/counts', fetchAPI, {
    refreshInterval: 60000,
  });

  // ─── 全局搜索 ─────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GlobalSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 输入防抖 300ms 后请求搜索接口
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    let ignore = false;
    const timer = setTimeout(async () => {
      try {
        const data = await fetchAPI<{ results: GlobalSearchResult[] }>(
          `/search/?q=${encodeURIComponent(q)}&limit=5`
        );
        if (!ignore) {
          setSearchResults(data.results);
          setSearchLoading(false);
        }
      } catch {
        if (!ignore) setSearchLoading(false);
      }
    }, 300);
    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  // 点击搜索框外部关闭下拉
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Ctrl/Cmd+K 聚焦搜索框
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setShowSearchDropdown(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const groupedSearchResults = searchResults.reduce((acc, r) => {
    (acc[r.entity_type] = acc[r.entity_type] || []).push(r);
    return acc;
  }, {} as Record<string, GlobalSearchResult[]>);

  const goFullSearch = () => {
    const q = searchQuery.trim();
    if (!q) return;
    setShowSearchDropdown(false);
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  const badges: Record<string, number> = {};
  if (counts) {
    badges.issues = counts.issues;
    badges.decisions = counts.decisions;
    badges.knowledge = counts.knowledge;
  }

  // 路由变化时自动收起移动端侧边栏
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    clearToken();
    router.push('/login');
  };

  return (
    <>
      {/* 汉堡按钮 — 仅手机端显示 */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-4 left-4 z-50 md:hidden bg-gray-900 text-white p-2 rounded-lg shadow-lg"
        aria-label="菜单"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {open ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* 遮罩 — 仅手机端侧边栏打开时显示 */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* 侧边栏 */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-gray-900 text-white flex flex-col transform transition-transform duration-200 ease-in-out
        md:static md:translate-x-0
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-xl font-bold">CaptureOS</h1>
          <p className="text-sm text-gray-400">个人资产管理系统</p>
        </div>

        {/* 全局搜索 */}
        <div ref={searchBoxRef} className="relative px-4 pt-3">
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none">🔍</span>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setShowSearchDropdown(true); }}
              onFocus={() => setShowSearchDropdown(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') goFullSearch();
                if (e.key === 'Escape') setShowSearchDropdown(false);
              }}
              placeholder="全局搜索（Ctrl+K）"
              className="w-full bg-gray-800 text-white text-sm rounded-lg pl-8 pr-3 py-2 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {showSearchDropdown && searchQuery.trim() && (
            <div className="absolute top-full left-4 right-4 mt-1 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
              {searchLoading ? (
                <div className="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">搜索中...</div>
              ) : searchResults.length === 0 ? (
                <div className="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">没有匹配结果</div>
              ) : (
                <>
                  {Object.entries(groupedSearchResults).map(([type, items]) => (
                    <div key={type} className="py-1">
                      <div className="px-3 pt-1 pb-0.5">
                        <span className={`px-1.5 py-0.5 rounded text-xs ${entityColors[type]}`}>
                          {entityLabels[type]}
                        </span>
                      </div>
                      {items.map((r) => (
                        <button
                          key={`${r.entity_type}-${r.entity_id}`}
                          onClick={() => {
                            setShowSearchDropdown(false);
                            setSearchQuery('');
                            router.push(`${entityRoutes[r.entity_type]}/${r.entity_id}`);
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 truncate"
                          title={r.title}
                        >
                          {r.title}
                        </button>
                      ))}
                    </div>
                  ))}
                  <button
                    onClick={goFullSearch}
                    className="w-full text-center px-3 py-2.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 border-t border-gray-100 dark:border-gray-700"
                  >
                    查看全部搜索结果 →
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <BeijingTime />

        <nav className="flex-1 p-4 overflow-y-auto">
          {menuItems.map((item) => {
            const count = item.badge ? badges[item.badge] || 0 : 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition-colors ${
                  item.href === '/'
                    ? pathname === '/'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800'
                    : pathname === item.href || pathname.startsWith(item.href + '/')
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <span>{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {count > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* 当前用户 + 主题切换 + 退出登录 */}
        <div className="p-4 border-t border-gray-700 space-y-1">
          {currentUser && (
            <div className="mb-2 flex items-center gap-2 px-2 py-2 rounded-lg bg-gray-800/60">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                {(currentUser.display_name || currentUser.username).slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-gray-200" title={currentUser.username}>
                  {currentUser.display_name || currentUser.username}
                </span>
                <span className="block text-[11px] text-gray-500">
                  {multiUserMode ? (currentUser.is_admin ? '管理员' : '成员') : '本地单用户'}
                </span>
              </span>
            </div>
          )}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
          >
            {isDark === null ? '🌓 主题切换' : isDark ? '☀️ 切换亮色' : '🌙 切换暗色'}
          </button>
          {multiUserMode && (
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-red-600 hover:text-white transition-colors"
            >
              🚪 退出登录
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
