'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { fetchAPI } from '@/lib/api';
import SkeletonList from '@/components/SkeletonList';
import Pagination from '@/components/Pagination';

interface TimelineEvent {
  entity_type: string;
  entity_id: number;
  title: string;
  date: string;
  datetime?: string;
  status?: string;
  rating?: number;
  effectiveness?: number;
}

interface ChainEvent {
  type: 'single' | 'chain';
  title: string;
  date: string;
  datetime?: string;
  entity?: TimelineEvent;
  entities?: TimelineEvent[];
  entity_count?: number;
}

interface FlatResponse {
  events: TimelineEvent[];
  total: number;
  min_date?: string | null;
}

interface ChainsResponse {
  chains: ChainEvent[];
  total: number;
  min_date?: string | null;
}

const entityLabels: Record<string, string> = {
  project: '项目', experience: '经验', issue: '问题',
  solution: '解决方案', knowledge: '知识', decision: '决策', review: '复盘',
};

const entityColors: Record<string, string> = {
  project: 'bg-blue-500', experience: 'bg-yellow-500',
  issue: 'bg-red-500', solution: 'bg-green-500',
  knowledge: 'bg-purple-500', decision: 'bg-indigo-500', review: 'bg-pink-500',
};

const entityRoutes: Record<string, string> = {
  project: '/projects', experience: '/experiences', issue: '/issues',
  solution: '/solutions', knowledge: '/knowledge', decision: '/decisions', review: '/reviews',
};

const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// sessionStorage key：侧边栏无参进入 /timeline 时从此恢复上次筛选状态
const TIMELINE_STATE_KEY = 'captureos-timeline-params';

function TimelinePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const today = fmt(new Date());

  // URL 是筛选状态的唯一来源：跳详情再返回时状态随 URL 恢复
  const startDate = searchParams.get('start_date') || '';
  const endDate = searchParams.get('end_date') || '';
  const entityType = searchParams.get('entity_type') || '';
  const viewMode = (searchParams.get('view') || 'chains') as 'flat' | 'chains';

  // 侧边栏无参进入时：优先从 sessionStorage 恢复上次筛选状态，无历史则默认今天
  useEffect(() => {
    if (!searchParams.toString()) {
      const saved = sessionStorage.getItem(TIMELINE_STATE_KEY);
      if (saved) {
        router.replace(`/timeline?${saved}`);
      } else {
        router.replace(`/timeline?start_date=${today}&end_date=${today}`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 有参数时持久化到 sessionStorage
  useEffect(() => {
    const qs = searchParams.toString();
    if (qs) sessionStorage.setItem(TIMELINE_STATE_KEY, qs);
  }, [searchParams]);

  const updateParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    const qs = params.toString();
    router.replace(qs ? `/timeline?${qs}` : '/timeline');
  };

  // 两种视图都用真实分页（每页 20：列表按事件切，链路按链切）
  const [page, setPage] = useState(1);
  const [minDate, setMinDate] = useState<string | null>(null);
  useEffect(() => { setPage(1); }, [viewMode, entityType, startDate, endDate]);

  const params = new URLSearchParams();
  if (startDate) params.set('start_date', startDate);
  if (endDate) params.set('end_date', endDate);
  if (viewMode === 'flat') {
    if (entityType) params.set('entity_type', entityType);
    params.set('limit', '20');
    params.set('offset', String((page - 1) * 20));
  } else {
    params.set('page', String(page));
    params.set('page_size', '20');
  }
  const baseUrl = viewMode === 'chains' ? '/timeline/chains' : '/timeline/';
  const url = `${baseUrl}?${params.toString()}`;

  // 首次进入（无 URL 参数）默认查今天；无日期参数视为查全部
  const shouldFetch = !!(startDate || endDate) || !searchParams.toString();
  const { data, error, isLoading } = useSWR<FlatResponse | ChainsResponse>(
    shouldFetch ? url : null,
    fetchAPI
  );

  // 记录数据最早日期，供"全部"快捷键填充明确日期范围（两种视图的响应都带 min_date）
  useEffect(() => {
    const md = viewMode === 'flat'
      ? (data as FlatResponse)?.min_date
      : (data as ChainsResponse)?.min_date;
    if (md) setMinDate(md);
  }, [data, viewMode]);

  // flat 模式响应为 {events, total}；chains 为 {chains, total, min_date}
  const events = viewMode === 'flat'
    ? (data as FlatResponse)?.events ?? []
    : (data as ChainsResponse)?.chains ?? [];
  const total = viewMode === 'flat'
    ? (data as FlatResponse)?.total ?? 0
    : (data as ChainsResponse)?.total ?? 0;

  // 快捷按钮 active 判断
  const now = new Date();
  const weekday = now.getDay() || 7;
  const monday = new Date(now); monday.setDate(now.getDate() - weekday + 1);
  const thisWeekStart = fmt(monday);
  const thisMonthStart = fmt(new Date(now.getFullYear(), now.getMonth(), 1));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">时间线</h1>
        <div className="flex gap-2">
          <button
            onClick={() => updateParams({ view: 'chains' })}
            className={`px-3 py-1.5 rounded-lg text-sm ${viewMode === 'chains' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            🔗 链路视图
          </button>
          <button
            onClick={() => updateParams({ view: 'flat' })}
            className={`px-3 py-1.5 rounded-lg text-sm ${viewMode === 'flat' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            📋 列表视图
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex gap-4 items-end">
          {/* 快捷按钮 */}
          <div className="flex gap-1.5">
            <QuickBtn label="今天" onClick={() => updateParams({ start_date: today, end_date: today })}
              active={startDate === today && endDate === today} />
            <QuickBtn label="本周" onClick={() => updateParams({ start_date: thisWeekStart, end_date: today })}
              active={startDate === thisWeekStart && endDate === today} />
            <QuickBtn label="本月" onClick={() => updateParams({ start_date: thisMonthStart, end_date: today })}
              active={startDate === thisMonthStart && endDate === today} />
            <QuickBtn label="全部"
              onClick={() => updateParams({ start_date: minDate || '2020-01-01', end_date: today })}
              active={startDate === (minDate || '2020-01-01') && endDate === today} />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">开始</label>
            <input type="date" value={startDate}
              onChange={(e) => updateParams({ start_date: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">结束</label>
            <input type="date" value={endDate}
              onChange={(e) => updateParams({ end_date: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          {viewMode === 'flat' && (
            <div>
              <label className="block text-xs text-gray-400 mb-1">类型</label>
              <select value={entityType}
                onChange={(e) => updateParams({ entity_type: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="">全部</option>
                {Object.entries(entityLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Timeline */}
      {isLoading ? (
        <SkeletonList rows={6} />
      ) : error ? (
        <div className="text-center py-8 text-red-600">加载失败</div>
      ) : !events.length ? (
        <div className="text-center py-8 text-gray-500">暂无数据</div>
      ) : (
        <div className="relative">
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-300" />
          <div className="space-y-4">
            {viewMode === 'chains'
              ? (events as ChainEvent[]).map((item, idx) => (
                  <ChainItem key={idx} item={item} router={router} />
                ))
              : (events as TimelineEvent[]).map((event, idx) => (
                  <FlatItem key={`${event.entity_type}-${event.entity_id}-${idx}`} event={event} router={router} />
                ))
            }
          </div>
          {/* 两种视图：真实分页（每页 20；列表按事件、链路按链） */}
          <div className="relative z-10 mt-4">
            <Pagination page={page} total={total} pageSize={20} onPageChange={setPage} />
          </div>
        </div>
      )}
    </div>
  );
}

function FlatItem({ event, router }: { event: TimelineEvent; router: ReturnType<typeof useRouter> }) {
  return (
    <div className="flex items-start gap-4">
      <div className={`w-4 h-4 rounded-full ${entityColors[event.entity_type]} mt-1.5 z-10`} />
      <div
        onClick={() => router.push(`${entityRoutes[event.entity_type]}/${event.entity_id}`)}
        className="bg-white p-4 rounded-lg shadow flex-1 cursor-pointer hover:shadow-md transition-shadow"
      >
        <div className="flex items-center gap-2 mb-1">
          <span className={`px-2 py-0.5 rounded text-xs text-white ${entityColors[event.entity_type]}`}>
            {entityLabels[event.entity_type]}
          </span>
          {event.status && <span className="text-xs text-gray-500">{event.status}</span>}
          {event.rating && <span className="text-xs">{'⭐'.repeat(event.rating)}</span>}
        </div>
        <h3 className="font-medium">{event.title}</h3>
        <p className="text-sm text-gray-500">
          {event.datetime
            ? new Date(event.datetime).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
            : event.date
              ? new Date(event.date).toLocaleDateString('zh-CN')
              : '-'}
        </p>
      </div>
    </div>
  );
}

function ChainItem({ item, router }: { item: ChainEvent; router: ReturnType<typeof useRouter> }) {
  const [expanded, setExpanded] = useState(false);

  if (item.type === 'single' && item.entity) {
    return <FlatItem event={item.entity} router={router} />;
  }

  // 链路
  const primaryType = item.entities?.[0]?.entity_type || 'issue';
  return (
    <div className="flex items-start gap-4">
      <div className={`w-4 h-4 rounded-full ${entityColors[primaryType]} mt-1.5 z-10 ring-2 ring-white`} />
      <div
        onClick={() => setExpanded(!expanded)}
        className="bg-white p-4 rounded-lg shadow flex-1 border-l-4 border-blue-400 cursor-pointer hover:shadow-md transition-shadow"
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800 font-medium">
            🔗 链路 ({item.entity_count}步)
          </span>
          <span className="text-xs text-gray-400">{expanded ? '▲ 收起' : '▼ 点击展开'}</span>
        </div>
        <h3 className="font-medium">{item.title}</h3>
        <p className="text-sm text-gray-500">
          {item.datetime
            ? new Date(item.datetime).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
            : item.date
              ? new Date(item.date + 'T00:00:00').toLocaleDateString('zh-CN')
              : '-'}
        </p>

        {expanded && item.entities && (
          <div className="mt-3 pt-3 border-t space-y-2">
            {item.entities.map((e, i) => (
              <div key={i}
                onClick={(ev) => { ev.stopPropagation(); router.push(`${entityRoutes[e.entity_type]}/${e.entity_id}`); }}
                className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 rounded px-2 py-1"
              >
                <span className={`w-2 h-2 rounded-full ${entityColors[e.entity_type]}`} />
                <span className={`px-1.5 py-0.5 rounded text-xs text-white ${entityColors[e.entity_type]}`}>
                  {entityLabels[e.entity_type]}
                </span>
                <span className="flex-1">{e.title}</span>
                <span className="text-xs text-gray-400 shrink-0">
                  {e.datetime
                    ? new Date(e.datetime).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
                    : '-'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function QuickBtn({ label, onClick, active }: { label: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
        active
          ? 'bg-blue-600 text-white border-blue-600'
          : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600'
      }`}
    >
      {label}
    </button>
  );
}

export default function TimelinePage() {
  return (
    <Suspense fallback={<div className="text-center py-8">加载中...</div>}>
      <TimelinePageInner />
    </Suspense>
  );
}
