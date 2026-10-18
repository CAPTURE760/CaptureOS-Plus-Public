/**
 * 骨架屏列表 — 加载占位，模拟列表行结构（标题 + 次行 + 状态胶囊）
 * 用于列表页/搜索页/时间线页的 isLoading 分支，替代转圈 Loading
 */
export default function SkeletonList({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-gray-900 rounded-lg shadow p-4 animate-pulse">
          <div className="flex items-center justify-between mb-2.5">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
            <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full shrink-0" />
          </div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
        </div>
      ))}
    </div>
  );
}
