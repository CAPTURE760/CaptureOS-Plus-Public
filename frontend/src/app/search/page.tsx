'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { fetchAPI } from '@/lib/api';
import { formatBeijingTime } from '@/lib/time';
import { entityTypeLabels as entityLabels, entityTypeColors as entityColors, entityTypeRoutes as entityRoutes } from '@/lib/constants';
import Pagination from '@/components/Pagination';
import SkeletonList from '@/components/SkeletonList';

interface Tag {
  id: number;
  name: string;
  color: string | null;
  level: number;
}

interface SearchResult {
  entity_type: string;
  entity_id: number;
  title: string;
  snippet: string;
  created_at: string | null;
}

interface SearchResponse {
  query: string;
  results: SearchResult[];
  total: number;
  type_counts?: Record<string, number>;
  min_date?: string | null;
}

// sessionStorage key：侧边栏无参进入 /search 时从此恢复上次搜索状态
const SEARCH_STATE_KEY = 'captureos-search-params';

// 关键词高亮组件
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim() || !text) return <>{text}</>;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-200 px-0.5 rounded">{part}</mark>
        ) : (
          part
        )
      )}
    </>
  );
}

function SearchPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL 是搜索状态的唯一来源，跳转详情再返回时随 URL 恢复
  const queryParam = searchParams.get('q') || '';
  const entityFilter = searchParams.get('entity_type') || '';
  const tagFilter = searchParams.get('tag_id') || '';
  const startDate = searchParams.get('start_date') || '';
  const endDate = searchParams.get('end_date') || '';

  // 输入框本地 state：输入过程不触发请求，点搜索才写入 URL
  const [queryInput, setQueryInput] = useState(queryParam);

  // 浏览器前进/后退导致 URL 变化时，同步输入框显示
  useEffect(() => {
    setQueryInput(queryParam);
  }, [queryParam]);

  // 侧边栏无参进入时，从 sessionStorage 恢复上次搜索状态
  useEffect(() => {
    if (!searchParams.toString()) {
      const saved = sessionStorage.getItem(SEARCH_STATE_KEY);
      if (saved) router.replace(`/search?${saved}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 有参数时持久化到 sessionStorage
  useEffect(() => {
    const qs = searchParams.toString();
    if (qs) sessionStorage.setItem(SEARCH_STATE_KEY, qs);
  }, [searchParams]);

  const updateParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    const qs = params.toString();
    router.replace(qs ? `/search?${qs}` : '/search');
  };

  // 获取所有标签
  const { data: tags } = useSWR<Tag[]>('/tags/', fetchAPI);

  const hasConditions = !!(queryParam || entityFilter || tagFilter || startDate || endDate);

  // 数据最早日期（供"全部时间"填充实际日期范围）：挂载即轻量获取
  const { data: tlMeta } = useSWR<{ min_date?: string | null }>('/timeline/?limit=1', fetchAPI);
  const minDate = tlMeta?.min_date || '2020-01-01';
  const today = fmtDate(new Date());

  // 单类型视图分页（每页 20 条），筛选变化时回到第 1 页
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [entityFilter, queryParam, tagFilter, startDate, endDate]);
  const { data, error, isLoading } = useSWR<SearchResponse>(
    hasConditions ? `/search/?${searchParams.toString()}${entityFilter ? `&limit=20&offset=${(page - 1) * 20}` : ''}` : null,
    fetchAPI
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = queryInput.trim();
    if (q) {
      updateParams({ q });
    } else if (!entityFilter && !tagFilter && !startDate && !endDate) {
      // 空关键词且无条件：等价"全部时间"，直接填实际日期范围
      updateParams({ q: '', start_date: minDate, end_date: today });
    } else {
      updateParams({ q: '' });
    }
  };

  // 按类型分组结果
  const grouped = data?.results.reduce((acc, r) => {
    acc[r.entity_type] = acc[r.entity_type] || [];
    acc[r.entity_type].push(r);
    return acc;
  }, {} as Record<string, SearchResult[]>) || {};

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">搜索</h1>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex gap-3 mb-3">
          <input
            type="text"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder="输入关键词，或直接选择类型/标签筛选"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <select
            value={entityFilter}
            onChange={(e) => updateParams({ entity_type: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">全部类型</option>
            {Object.entries(entityLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <select
            value={tagFilter}
            onChange={(e) => updateParams({ tag_id: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">全部标签</option>
            {tags?.map((tag) => (
              <option key={tag.id} value={tag.id}>{tag.name}</option>
            ))}
          </select>
          <button type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
            搜索
          </button>
        </div>
        <div className="flex gap-3 items-center text-sm">
          <div className="flex gap-1.5">
            <DateQuickBtn label="今天" startDate={startDate} endDate={endDate} preset="today"
              onChange={(s, e) => updateParams({ start_date: s, end_date: e })} />
            <DateQuickBtn label="本周" startDate={startDate} endDate={endDate} preset="week"
              onChange={(s, e) => updateParams({ start_date: s, end_date: e })} />
            <DateQuickBtn label="本月" startDate={startDate} endDate={endDate} preset="month"
              onChange={(s, e) => updateParams({ start_date: s, end_date: e })} />
            <DateQuickBtn label="全部时间" startDate={startDate} endDate={endDate} preset="all" minDate={minDate}
              onChange={(s, e) => updateParams({ start_date: s, end_date: e })} />
          </div>
          <span className="text-gray-400">|</span>
          <input type="date" value={startDate}
            onChange={(e) => updateParams({ start_date: e.target.value })}
            className="px-2 py-1.5 border border-gray-300 rounded text-sm" />
          <span className="text-gray-400">~</span>
          <input type="date" value={endDate}
            onChange={(e) => updateParams({ end_date: e.target.value })}
            className="px-2 py-1.5 border border-gray-300 rounded text-sm" />
        </div>
      </form>

      {/* Results */}
      {isLoading ? (
        <SkeletonList rows={5} />
      ) : error ? (
        <div className="text-center py-8 text-red-600">搜索失败</div>
      ) : data ? (
        <div>
          <p className="text-gray-500 mb-4">找到 {data.total} 个结果</p>
          {data.results.length === 0 ? (
            <div className="text-center py-8 text-gray-500">没有找到相关结果</div>
          ) : entityFilter ? (
            // 已筛选类型：平铺展示 + 分页
            <div className="space-y-2">
              {data.results.map((result) => (
                <SearchResultItem key={`${result.entity_type}-${result.entity_id}`} result={result} query={data.query} />
              ))}
              <Pagination
                page={page}
                total={data.type_counts?.[entityFilter] ?? 0}
                pageSize={20}
                onPageChange={setPage}
              />
            </div>
          ) : (
            // 全局搜索：按类型分组展示
            <div className="space-y-6">
              {Object.entries(grouped).map(([type, items]) => {
                const typeTotal = data.type_counts?.[type] ?? items.length;
                return (
                <div key={type}>
                  <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${entityColors[type]}`}>
                      {entityLabels[type]}
                    </span>
                    <span>({typeTotal})</span>
                  </h3>
                  <div className="space-y-2">
                    {items.map((result) => (
                      <SearchResultItem key={`${result.entity_type}-${result.entity_id}`} result={result} query={data.query} />
                    ))}
                  </div>
                  {typeTotal > items.length && (
                    <button
                      type="button"
                      onClick={() => updateParams({ entity_type: type })}
                      className="mt-2 text-sm text-blue-600 hover:underline"
                    >
                      还有 {typeTotal - items.length} 条，点击查看全部{entityLabels[type]} →
                    </button>
                  )}
                </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400">输入关键词或选择筛选条件开始搜索，点"全部时间"浏览全部记录</div>
      )}
    </div>
  );
}

function SearchResultItem({ result, query }: { result: SearchResult; query: string }) {
  const router = useRouter();
  return (
    <div
      onClick={() => router.push(`${entityRoutes[result.entity_type]}/${result.entity_id}`)}
      className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-center justify-between mb-1">
        <span className={`px-2 py-0.5 rounded text-xs ${entityColors[result.entity_type]}`}>
          {entityLabels[result.entity_type]}
        </span>
        <span className="text-gray-500 text-xs whitespace-nowrap">
          🕐 {formatBeijingTime(result.created_at)}
        </span>
      </div>
      <h3 className="font-medium mb-1"><HighlightText text={result.title} query={query} /></h3>
      {result.snippet && (
        <p className="text-gray-600 text-sm"><HighlightText text={result.snippet} query={query} /></p>
      )}
    </div>
  );
}

const fmtDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function DateQuickBtn({ label, startDate, endDate, preset, minDate = '2020-01-01', onChange }: {
  label: string; startDate: string; endDate: string;
  preset: 'today' | 'week' | 'month' | 'all';
  minDate?: string;
  onChange: (start: string, end: string) => void;
}) {
  const now = new Date();
  const today = fmtDate(now);
  const weekday = now.getDay() || 7;
  const monday = new Date(now); monday.setDate(now.getDate() - weekday + 1);
  const thisWeekStart = fmtDate(monday);
  const thisMonthStart = fmtDate(new Date(now.getFullYear(), now.getMonth(), 1));

  const active = preset === 'all' ? startDate === minDate && endDate === today :
    preset === 'today' ? startDate === today && endDate === today :
    preset === 'week' ? startDate === thisWeekStart && endDate === today :
    startDate === thisMonthStart && endDate === today;

  const handleClick = () => {
    if (preset === 'today') onChange(today, today);
    else if (preset === 'week') onChange(thisWeekStart, today);
    else if (preset === 'month') onChange(thisMonthStart, today);
    else onChange(minDate, today);
  };

  return (
    <button type="button" onClick={handleClick}
      className={`px-2.5 py-1 rounded text-xs border transition-colors ${
        active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
      }`}>
      {label}
    </button>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="text-center py-8">加载中...</div>}>
      <SearchPageInner />
    </Suspense>
  );
}
