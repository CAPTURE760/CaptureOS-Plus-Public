'use client';

import { useState } from 'react';
import { useToast } from './Toast';
import { authHeaders } from '@/lib/api';

const ENTITY_OPTIONS = [
  { key: 'projects', label: '📁 项目', icon: '📁' },
  { key: 'experiences', label: '💡 经验', icon: '💡' },
  { key: 'issues', label: '⚠️ 问题', icon: '⚠️' },
  { key: 'solutions', label: '🔧 解决方案', icon: '🔧' },
  { key: 'knowledge', label: '📚 知识', icon: '📚' },
  { key: 'decisions', label: '🎯 决策', icon: '🎯' },
  { key: 'reviews', label: '🔄 复盘', icon: '🔄' },
];

interface ExportButtonProps {
  /** 导出类型：不传则弹出选择弹窗，传模块名如 'projects' 则直接导出该模块 */
  entityType?: string;
  /** 按钮样式变体：'primary' 蓝色大按钮，'small' 小巧灰色按钮 */
  variant?: 'primary' | 'small';
  className?: string;
}

export default function ExportButton({ entityType, variant = 'small', className = '' }: ExportButtonProps) {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [format, setFormat] = useState<'word' | 'json'>('word');
  const [selected, setSelected] = useState<Set<string>>(
    new Set(ENTITY_OPTIONS.map(e => e.key))
  );

  const toggle = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === ENTITY_OPTIONS.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(ENTITY_OPTIONS.map(e => e.key)));
    }
  };

  const doExport = async (types?: string[]) => {
    setExporting(true);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';
      let url: string;
      let filename: string;
      const today = new Date().toISOString().slice(0, 10);

      if (format === 'json') {
        url = (types && types.length > 0 && types.length < ENTITY_OPTIONS.length)
          ? `${API_BASE}/export/?types=${types.join(',')}`
          : `${API_BASE}/export/`;
        filename = `captureos-export-${today}.json`;
      } else if (entityType) {
        url = `${API_BASE}/export/word/${entityType}`;
        filename = `captureos-${entityType}-${today}.docx`;
      } else if (types && types.length > 0 && types.length < ENTITY_OPTIONS.length) {
        url = `${API_BASE}/export/word/?types=${types.join(',')}`;
        filename = `captureos-export-${today}.docx`;
      } else {
        url = `${API_BASE}/export/word/`;
        filename = `captureos-export-${today}.docx`;
      }

      const res = await fetch(url, { headers: authHeaders() });
      if (!res.ok) throw new Error('导出失败');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      toast('导出成功', 'success');
    } catch (e) {
      toast('导出失败，请重试', 'error');
    } finally {
      setExporting(false);
      setShowModal(false);
    }
  };

  const handleExport = () => {
    if (entityType) {
      doExport();
    } else {
      setShowModal(true);
    }
  };

  // 小按钮（模块页用）— 直接导出
  if (variant === 'small') {
    return (
      <button
        onClick={handleExport}
        disabled={exporting}
        className={`px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1 ${className}`}
      >
        <span>📄</span>
        <span>{exporting ? '导出中...' : '导出 Word'}</span>
      </button>
    );
  }

  // 主按钮（仪表盘用）— 弹出选择弹窗
  return (
    <>
      <button
        onClick={handleExport}
        disabled={exporting}
        className={`px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
      >
        {exporting ? '导出中...' : '📄 导出 Word'}
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-sm w-full mx-4 p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">📄 选择导出内容</h3>

            {/* 格式选择 */}
            <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden mb-4">
              <button
                onClick={() => setFormat('word')}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  format === 'word' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                📝 Word 报告
              </button>
              <button
                onClick={() => setFormat('json')}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  format === 'json' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                💾 JSON 数据
              </button>
            </div>

            {format === 'json' && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                JSON 导出包含所选模块数据（自动附带标签、关联、附件记录），可通过首页「导入数据」恢复。附件文件本体需另外备份 uploads 目录。
              </p>
            )}

            {/* 全选/全不选 */}
            <label className="flex items-center gap-2 py-2 px-3 rounded-lg mb-2 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.size === ENTITY_OPTIONS.length}
                onChange={toggleAll}
                className="w-4 h-4 rounded text-blue-600 dark:text-blue-400"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {selected.size === ENTITY_OPTIONS.length ? '取消全选' : '全选'}
              </span>
            </label>

            {/* 各模块选项 */}
            <div className="space-y-1 mb-5">
              {ENTITY_OPTIONS.map(opt => (
                <label
                  key={opt.key}
                  className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(opt.key)}
                    onChange={() => toggle(opt.key)}
                    className="w-4 h-4 rounded text-blue-600 dark:text-blue-400"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{opt.label}</span>
                </label>
              ))}
            </div>

            {/* 按钮 */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => doExport(Array.from(selected))}
                disabled={selected.size === 0 || exporting}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exporting ? '导出中...' : format === 'json' ? '导出 JSON' : `导出 (${selected.size})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
