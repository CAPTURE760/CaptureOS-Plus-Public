/**
 * 全局共享的颜色和选项常量
 * FilterBar、列表页 columns、表单 fields 共用，避免重复定义
 */

// ─── 状态 ────────────────────────────────────────────

export interface StatusOption {
  value: string;
  label: string;
}

// 列表/筛选栏用的 Tailwind class
export const statusBgClass: Record<string, string> = {
  // Issues
  open:         'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
  in_progress:  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200',
  resolved:     'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
  closed:       'bg-slate-200 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300',
  // Projects
  active:       'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
  completed:    'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  paused:       'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  cancelled:    'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  // Decisions
  pending:      'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200',
  deprecated:   'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
  // Knowledge
  unverified:   'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200',
  verified:     'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
  outdated:     'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200',
  // Solutions（pending/deprecated 与 Decisions 撞名，加前缀区分，查询时同样加前缀）
  'solution.pending':    'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200',
  'solution.adopted':    'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  'solution.deprecated': 'bg-slate-200 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300',
};

// 筛选栏 chip 用的 active/idle 颜色
export const statusChipColor: Record<string, { active: string; idle: string }> = {
  open:         { active: 'bg-red-600 text-white border-red-600',    idle: 'border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/30' },
  in_progress:  { active: 'bg-yellow-500 text-white border-yellow-500', idle: 'border-yellow-300 text-yellow-700 hover:bg-yellow-50 dark:border-yellow-700 dark:text-yellow-300 dark:hover:bg-yellow-900/30' },
  resolved:     { active: 'bg-green-600 text-white border-green-600', idle: 'border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-300 dark:hover:bg-green-900/30' },
  closed:       { active: 'bg-slate-600 text-white border-slate-600', idle: 'border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700/30' },
  active:       { active: 'bg-green-600 text-white border-green-600', idle: 'border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-300 dark:hover:bg-green-900/30' },
  completed:    { active: 'bg-blue-600 text-white border-blue-600',   idle: 'border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900/30' },
  paused:       { active: 'bg-amber-500 text-white border-amber-500', idle: 'border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/30' },
  cancelled:    { active: 'bg-pink-600 text-white border-pink-600',   idle: 'border-pink-300 text-pink-700 hover:bg-pink-50 dark:border-pink-700 dark:text-pink-300 dark:hover:bg-pink-900/30' },
  pending:      { active: 'bg-amber-600 text-white border-amber-600', idle: 'border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/30' },
  deprecated:   { active: 'bg-red-600 text-white border-red-600',     idle: 'border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/30' },
  unverified:   { active: 'bg-violet-600 text-white border-violet-600', idle: 'border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-300 dark:hover:bg-violet-900/30' },
  verified:     { active: 'bg-green-600 text-white border-green-600', idle: 'border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-300 dark:hover:bg-green-900/30' },
  outdated:     { active: 'bg-yellow-500 text-white border-yellow-500', idle: 'border-yellow-300 text-yellow-700 hover:bg-yellow-50 dark:border-yellow-700 dark:text-yellow-300 dark:hover:bg-yellow-900/30' },
  // Solutions（同上，加前缀避免覆盖 Decisions 的 pending/deprecated）
  'solution.pending':    { active: 'bg-cyan-600 text-white border-cyan-600', idle: 'border-cyan-300 text-cyan-700 hover:bg-cyan-50 dark:border-cyan-700 dark:text-cyan-300 dark:hover:bg-cyan-900/30' },
  'solution.adopted':    { active: 'bg-emerald-600 text-white border-emerald-600', idle: 'border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-900/30' },
  'solution.deprecated': { active: 'bg-slate-600 text-white border-slate-600', idle: 'border-slate-400 text-slate-700 hover:bg-slate-100 dark:border-slate-500 dark:text-slate-300 dark:hover:bg-slate-700/30' },
};

// 中文标签 → Tailwind class（列表列用）
export const statusLabelClass: Record<string, string> = {
  '待解决':   'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
  '处理中':   'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200',
  '已解决':   'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
  '已关闭':   'bg-gray-100 text-gray-800 dark:bg-gray-700/40 dark:text-gray-300',
  '进行中':   'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
  '已完成':   'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  '暂停':     'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200',
  '已取消':   'bg-gray-100 text-gray-800 dark:bg-gray-700/40 dark:text-gray-300',
  '待执行':   'bg-gray-100 text-gray-800 dark:bg-gray-700/40 dark:text-gray-300',
  '执行中':   'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  '已废弃':   'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
  '待确认':   'bg-gray-100 text-gray-800 dark:bg-gray-700/40 dark:text-gray-300',
  '已验证':   'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
  '已过时':   'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200',
  '待采用':   'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200',
  '已采用':   'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
};

// ─── 优先级 ──────────────────────────────────────────

export const priorityOptions: StatusOption[] = [
  { value: '紧急', label: '🔴 紧急' },
  { value: '高',   label: '🟠 高' },
  { value: '中',   label: '🟡 中' },
  { value: '低',   label: '🟢 低' },
];

export const priorityBgClass: Record<string, string> = {
  '紧急': 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
  '高':   'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200',
  '中':   'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200',
  '低':   'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
};

export const priorityChipColor: Record<string, { active: string; idle: string }> = {
  '紧急': { active: 'bg-red-600 text-white border-red-600', idle: 'border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/30' },
  '高':   { active: 'bg-orange-500 text-white border-orange-500', idle: 'border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-900/30' },
  '中':   { active: 'bg-yellow-500 text-white border-yellow-500', idle: 'border-yellow-300 text-yellow-700 hover:bg-yellow-50 dark:border-yellow-700 dark:text-yellow-300 dark:hover:bg-yellow-900/30' },
  '低':   { active: 'bg-green-600 text-white border-green-600', idle: 'border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-300 dark:hover:bg-green-900/30' },
};

// ─── 各模块的选项列表 ────────────────────────────────

export const issueStatusOptions: StatusOption[] = [
  { value: 'open',        label: '待解决' },
  { value: 'in_progress', label: '处理中' },
  { value: 'resolved',    label: '已解决' },
  { value: 'closed',      label: '已关闭' },
];

export const projectStatusOptions: StatusOption[] = [
  { value: 'active',    label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'paused',    label: '暂停' },
  { value: 'cancelled', label: '已取消' },
];

export const decisionStatusOptions: StatusOption[] = [
  { value: 'pending',     label: '待执行' },
  { value: 'in_progress', label: '执行中' },
  { value: 'completed',   label: '已完成' },
  { value: 'deprecated',  label: '已废弃' },
];

export const knowledgeStatusOptions: StatusOption[] = [
  { value: 'unverified', label: '待确认' },
  { value: 'verified',   label: '已验证' },
  { value: 'outdated',   label: '已过时' },
];

export const solutionStatusOptions: StatusOption[] = [
  { value: 'pending',    label: '待采用' },
  { value: 'adopted',    label: '已采用' },
  { value: 'deprecated', label: '已废弃' },
];

// ─── 实体类型映射（搜索页 + 侧边栏全局搜索共用） ─────

export const entityTypeLabels: Record<string, string> = {
  project: '项目', experience: '经验', issue: '问题',
  solution: '解决方案', knowledge: '知识', decision: '决策', review: '复盘',
};

export const entityTypeColors: Record<string, string> = {
  project: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200', experience: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200',
  issue: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200', solution: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
  knowledge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200', decision: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200',
  review: 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-200',
};

export const entityTypeRoutes: Record<string, string> = {
  project: '/projects', experience: '/experiences', issue: '/issues',
  solution: '/solutions', knowledge: '/knowledge', decision: '/decisions', review: '/reviews',
};
