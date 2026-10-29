'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import { renderMarkdown, extractOutline, type OutlineItem } from '@/lib/markdown';
import { fetchAPI } from '@/lib/api';

interface PendingFile {
  file: File;
  name: string;
  size: number;
  type?: string;
}

interface Field {
  name: string;
  label: string;
  type?: 'text' | 'textarea' | 'select' | 'date' | 'datetime-local' | 'number' | 'attachments' | 'confidence';
  /** meta：收进表单顶部属性条，横向紧凑排列，不占正文纵向空间 */
  layout?: 'meta';
  options?: { value: string; label: string }[];
  required?: boolean;
  rows?: number;
  min?: number;
  max?: number;
  placeholder?: string;
}

interface EntityFormProps {
  fields: Field[];
  onSubmit: (data: Record<string, unknown>, pendingFiles?: PendingFile[]) => Promise<void> | void;
  onCancel?: () => void;
  initialData?: Record<string, unknown>;
  submitLabel?: string;
  cancelLabel?: string;
  title?: string;
  entityInfo?: {
    type?: string;
    id?: number;
  };
  onUploadComplete?: () => void;
}

export default function EntityForm({
  fields,
  onSubmit,
  onCancel,
  initialData = {},
  submitLabel = '保存',
  cancelLabel = '取消',
  title,
  entityInfo,
  onUploadComplete,
}: EntityFormProps) {
  // 新建时，date 类型字段默认填今天日期，datetime-local 默认填当前时间
  const getDefaultData = () => {
    const data = { ...initialData };
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const localNow = `${today}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    fields.forEach((field) => {
      if (field.type === 'date' && !data[field.name]) {
        data[field.name] = today;
      }
      if (field.type === 'datetime-local' && !data[field.name]) {
        data[field.name] = localNow;
      }
    });
    return data;
  };
  const [formData, setFormData] = useState<Record<string, unknown>>(getDefaultData);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [uploading, setUploading] = useState(false);
  // 弹窗全屏/还原切换
  const [maximized, setMaximized] = useState(false);

  // 放大时锁住页面滚动，避免右侧滚动条占位导致弹窗看起来没铺满
  useEffect(() => {
    if (!maximized) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [maximized]);

  const handleChange = (name: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddPendingFiles = (files: PendingFile[]) => {
    setPendingFiles((prev) => [...prev, ...files]);
  };

  const handleRemovePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // 上传待处理的附件到已创建的实体
  const uploadPendingFiles = async (entityType: string, entityId: number) => {
    if (pendingFiles.length === 0) return;

    setUploading(true);
    try {
      for (const pf of pendingFiles) {
        const formDataObj = new FormData();
        formDataObj.append('file', pf.file);
        formDataObj.append('entity_type', entityType);
        formDataObj.append('entity_id', entityId.toString());

        await fetchAPI('/upload/to-entity', {
          method: 'POST',
          headers: {},  // 让浏览器自动设置 Content-Type (multipart/form-data)
          body: formDataObj,
        });
      }
      setPendingFiles([]);
    } catch (err) {
      console.error('附件上传失败:', err);
      throw err;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData, pendingFiles);
  };

  // 没有 onCancel 时直接渲染表单（兼容旧用法）
  if (!onCancel) {
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormFields
          fields={fields}
          formData={formData}
          handleChange={handleChange}
          entityInfo={entityInfo}
          pendingFiles={pendingFiles}
          onAddPendingFiles={handleAddPendingFiles}
          onRemovePendingFile={handleRemovePendingFile}
          uploading={uploading}
          onUploadComplete={onUploadComplete}
        />
        <div className="flex gap-3 pt-2">
          <button type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
            <span>✅</span><span>{submitLabel}</span>
          </button>
        </div>
      </form>
    );
  }

  // 有 onCancel 时渲染弹窗
  return (
    <div
      className={`fixed inset-0 flex items-center justify-center z-50 ${
        maximized ? 'bg-white dark:bg-gray-900' : 'bg-black/50'
      }`}
      onClick={(e) => { if (!maximized && e.target === e.currentTarget) onCancel(); }}>
      <div
        className={`bg-white dark:bg-gray-900 flex flex-col ${
          maximized
            ? 'fixed inset-0 max-w-none max-h-none rounded-none'
            : 'w-full mx-4 md:mx-0 max-h-[90vh] rounded-lg shadow-xl max-w-lg md:max-w-2xl lg:max-w-[88vw] xl:max-w-[92vw]'
        }`}
      >
        {/* 标题栏 */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50 dark:bg-gray-800">
          <h3 className="text-lg font-semibold">{title || '新建'}</h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMaximized((v) => !v)}
              title={maximized ? '还原窗口' : '放大到全屏'}
              className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <span className="text-base leading-none">{maximized ? '⤡' : '⤢'}</span>
              <span>{maximized ? '还原' : '放大'}</span>
            </button>
            <button
              onClick={onCancel}
              aria-label="关闭"
              title="关闭"
              className="flex h-9 w-9 items-center justify-center rounded-md text-2xl leading-none text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        {/* 表单内容：放大时变成纵向 flex，让正文区撑满剩余高度 */}
        <form
          onSubmit={handleSubmit}
          className={`p-6 ${maximized ? 'flex-1 min-h-0 flex flex-col overflow-hidden' : 'flex-1 overflow-y-auto'}`}
        >
          <FormFields
            fields={fields}
            formData={formData}
            handleChange={handleChange}
            entityInfo={entityInfo}
            pendingFiles={pendingFiles}
            onAddPendingFiles={handleAddPendingFiles}
            onRemovePendingFile={handleRemovePendingFile}
            uploading={uploading}
            onUploadComplete={onUploadComplete}
            fill={maximized}
          />

          {/* 按钮固定在弹窗底部 */}
          <div className={`${maximized ? 'mt-4 shrink-0' : 'sticky bottom-0 -mx-6 -mb-6 mt-6'} px-6 py-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex gap-3`}>
            <button type="submit"
              disabled={uploading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50">
              <span>✅</span><span>{uploading ? '上传中...' : submitLabel}</span>
            </button>
            <button type="button" onClick={onCancel}
              className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-6 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center gap-2">
              <span>❌</span><span>{cancelLabel}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface FormFieldsProps {
  fields: Field[];
  formData: Record<string, unknown>;
  handleChange: (name: string, value: unknown) => void;
  entityInfo?: {
    type?: string;
    id?: number;
  };
  pendingFiles?: PendingFile[];
  onAddPendingFiles?: (files: PendingFile[]) => void;
  onRemovePendingFile?: (index: number) => void;
  uploading?: boolean;
  onUploadComplete?: () => void;
  /** 放大模式下撑满可用高度（正文区 flex-1） */
  fill?: boolean;
}

function FormFields({
  fields, formData, handleChange, entityInfo,
  pendingFiles, onAddPendingFiles, onRemovePendingFile, uploading, onUploadComplete, fill,
}: FormFieldsProps) {
  // meta 字段收进顶部属性条，其余字段保持纵向排列；标题（第一个主字段）永远在最上方
  const metaFields = fields.filter((f) => f.layout === 'meta');
  const mainFields = fields.filter((f) => f.layout !== 'meta');
  const [leadingField, ...restFields] = mainFields;

  const rows = (
    <>
      {leadingField && (
        <FieldRow
          field={leadingField}
          fill={fill}
          value={formData[leadingField.name]}
          handleChange={handleChange}
          entityInfo={entityInfo}
          pendingFiles={pendingFiles}
          onAddPendingFiles={onAddPendingFiles}
          onRemovePendingFile={onRemovePendingFile}
          uploading={uploading}
          onUploadComplete={onUploadComplete}
        />
      )}

      {metaFields.length > 0 && (
        <div className={`${fill ? 'shrink-0 ' : ''}flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/40 px-3 py-2`}>
          {metaFields.map((field) => (
            <MetaField
              key={field.name}
              field={field}
              value={formData[field.name]}
              onChange={handleChange}
            />
          ))}
        </div>
      )}

      {restFields.map((field) => (
        <FieldRow
          key={field.name}
          field={field}
          fill={fill}
          value={formData[field.name]}
          handleChange={handleChange}
          entityInfo={entityInfo}
          pendingFiles={pendingFiles}
          onAddPendingFiles={onAddPendingFiles}
          onRemovePendingFile={onRemovePendingFile}
          uploading={uploading}
          onUploadComplete={onUploadComplete}
        />
      ))}
    </>
  );

  // 放大模式：纵向 flex，正文行吃掉剩余空间；普通模式：常规间距堆叠
  return fill ? (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">{rows}</div>
  ) : (
    <div className="space-y-4">{rows}</div>
  );
}

interface FieldRowProps {
  field: Field;
  value: unknown;
  handleChange: (name: string, value: unknown) => void;
  entityInfo?: { type?: string; id?: number };
  pendingFiles?: PendingFile[];
  onAddPendingFiles?: (files: PendingFile[]) => void;
  onRemovePendingFile?: (index: number) => void;
  uploading?: boolean;
  onUploadComplete?: () => void;
  fill?: boolean;
}

/** 纵向排列的主字段（标题、正文、附件等） */
function FieldRow({
  field, value, handleChange, entityInfo,
  pendingFiles, onAddPendingFiles, onRemovePendingFile, uploading, onUploadComplete, fill,
}: FieldRowProps) {
  const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
  // 放大模式下只有正文（textarea）这一行撑满剩余高度，其他行保持自然高度
  const grows = Boolean(fill) && field.type === 'textarea';

  return (
    <div className={grows ? 'flex flex-1 flex-col min-h-[16rem]' : fill ? 'shrink-0' : undefined}>
      <label className={`block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 ${grows ? 'shrink-0' : ''}`}>
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {field.type === 'textarea' ? (
        <MarkdownField
          name={field.name}
          fill={grows}
          value={(value as string) || ''}
          onChange={handleChange}
          required={field.required}
          rows={field.rows || 4}
          placeholder={field.placeholder || `请输入${field.label}...`}
        />
      ) : field.type === 'attachments' ? (
        <AttachmentsField
          name={field.name}
          pendingFiles={pendingFiles || []}
          onAddPendingFiles={onAddPendingFiles || (() => {})}
          onRemovePendingFile={onRemovePendingFile || (() => {})}
          entityType={entityInfo?.type || 'project'}
          entityId={entityInfo?.id}
          uploading={uploading}
          onUploadComplete={onUploadComplete}
        />
      ) : field.type === 'select' ? (
        <select
          name={field.name}
          value={(value as string) || ''}
          onChange={(e) => handleChange(field.name, e.target.value)}
          required={field.required}
          className={inputClass}
        >
          <option value="">请选择</option>
          {field.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ) : field.type === 'date' ? (
        <input type="date" name={field.name}
          value={(value as string) || ''}
          onChange={(e) => handleChange(field.name, e.target.value)}
          required={field.required}
          className={inputClass}
        />
      ) : field.type === 'datetime-local' ? (
        <input type="datetime-local" name={field.name}
          value={(value as string) || ''}
          onChange={(e) => handleChange(field.name, e.target.value)}
          required={field.required}
          className={inputClass}
        />
      ) : field.type === 'number' ? (
        <input type="number" name={field.name}
          value={(value as number) || ''}
          onChange={(e) => handleChange(field.name, Number(e.target.value))}
          required={field.required}
          min={field.min}
          max={field.max}
          className={inputClass}
        />
      ) : (
        <input type="text" name={field.name}
          value={(value as string) || ''}
          onChange={(e) => handleChange(field.name, e.target.value)}
          required={field.required}
          className={inputClass}
          placeholder={field.placeholder || `请输入${field.label}...`}
        />
      )}
    </div>
  );
}

/** 属性条里的紧凑字段：小标签 + 控件同行，横向排布 */
function MetaField({
  field, value, onChange,
}: {
  field: Field;
  value: unknown;
  onChange: (name: string, value: unknown) => void;
}) {
  const compactClass = 'px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
  const val = value == null ? '' : String(value);

  const control = field.type === 'confidence' ? (
    // 0-10 胶囊快选：单击即选，悬停显示百分比
    <div className="flex flex-wrap items-center gap-0.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-0.5">
      {Array.from({ length: 11 }, (_, i) => (
        <button
          key={i}
          type="button"
          title={`${i * 10}%`}
          onClick={() => onChange(field.name, String(i))}
          className={`w-6 h-6 text-[11px] rounded tabular-nums transition-colors ${
            val === String(i)
              ? 'bg-blue-600 text-white font-semibold'
              : 'text-gray-500 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/40'
          }`}
        >
          {i}
        </button>
      ))}
      <span className="ml-1 pr-0.5 text-[11px] text-gray-400 dark:text-gray-500 tabular-nums">
        {val === '' ? '未设' : `${Number(val) * 10}%`}
      </span>
    </div>
  ) : field.type === 'select' ? (
    <select
      name={field.name}
      value={val}
      onChange={(e) => onChange(field.name, e.target.value)}
      className={`${compactClass} max-w-[11rem]`}
    >
      <option value="">请选择</option>
      {field.options?.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  ) : field.type === 'date' ? (
    <input type="date" name={field.name}
      value={val}
      onChange={(e) => onChange(field.name, e.target.value)}
      className={`${compactClass} w-[8.6rem]`}
    />
  ) : field.type === 'datetime-local' ? (
    <input type="datetime-local" name={field.name}
      value={val}
      onChange={(e) => onChange(field.name, e.target.value)}
      className={`${compactClass} w-[11.5rem]`}
    />
  ) : field.type === 'number' ? (
    <input type="number" name={field.name}
      value={val}
      onChange={(e) => onChange(field.name, Number(e.target.value))}
      min={field.min}
      max={field.max}
      className={`${compactClass} w-20`}
    />
  ) : (
    <input type="text" name={field.name}
      value={val}
      onChange={(e) => onChange(field.name, e.target.value)}
      className={`${compactClass} w-44`}
      placeholder={`请输入${field.label}...`}
    />
  );

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{field.label}</span>
      {control}
    </div>
  );
}

/** Markdown 文本域 — 支持编辑/预览切换，右上角可展开正文大纲 */
function MarkdownField({
  name, value, onChange, required, rows, placeholder, fill,
}: {
  name: string;
  value: string;
  onChange: (name: string, value: unknown) => void;
  required?: boolean;
  rows?: number;
  placeholder?: string;
  /** 放大模式下撑满剩余高度 */
  fill?: boolean;
}) {
  // 窄屏用「编辑/预览」切换，宽屏（lg+）左右分屏实时预览
  const [preview, setPreview] = useState(false);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const outline = useMemo(() => extractOutline(value), [value]);
  // 高度随 rows 增长，限制在 140~560px，长正文能展开更多内容
  const minHeight = `${Math.min(Math.max((rows || 4) * 28 + 20, 140), 560)}px`;

  // 点击大纲之外的区域收起浮层
  useEffect(() => {
    if (!outlineOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOutlineOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [outlineOpen]);

  // 点击大纲条目：预览区滚动到对应标题，同时把编辑光标移到该行
  const jumpTo = (item: OutlineItem) => {
    const pane = previewRef.current;
    const target = pane?.querySelector<HTMLElement>(`#${item.id}`);
    if (pane && target) {
      pane.scrollTo({
        top: pane.scrollTop + target.getBoundingClientRect().top - pane.getBoundingClientRect().top - 8,
      });
    }
    const textarea = textareaRef.current;
    if (textarea) {
      const line = value.slice(0, item.offset).split('\n').length - 1;
      const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight) || 20;
      textarea.focus();
      textarea.setSelectionRange(item.offset, item.offset);
      textarea.scrollTop = Math.max(0, line * lineHeight - textarea.clientHeight / 3);
    }
    setActiveId(item.id);
  };

  return (
    <div
      ref={containerRef}
      className={`relative border border-gray-300 dark:border-gray-600 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 ${
        fill ? 'flex min-h-0 flex-1 flex-col' : ''
      }`}
    >
      {/* 切换按钮栏（仅窄屏需要）+ 右上角大纲入口 */}
      <div className="shrink-0 flex items-center gap-1 px-2 py-1 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-1 lg:hidden">
          <button
            type="button"
            onClick={() => setPreview(false)}
            className={`px-2 py-0.5 text-xs rounded transition-colors ${
              !preview ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            编辑
          </button>
          <button
            type="button"
            onClick={() => setPreview(true)}
            className={`px-2 py-0.5 text-xs rounded transition-colors ${
              preview ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            预览
          </button>
        </div>
        <span className="hidden lg:inline text-xs text-gray-500 dark:text-gray-400">编辑</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden sm:inline text-[10px] text-gray-400 dark:text-gray-500">支持 Markdown</span>
          <button
            type="button"
            onClick={() => setOutlineOpen((open) => !open)}
            aria-expanded={outlineOpen}
            aria-haspopup="true"
            className={`flex items-center gap-1 px-2 py-0.5 text-xs rounded border transition-colors ${
              outlineOpen
                ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700'
            }`}
          >
            <span>☰</span>
            <span>大纲</span>
            {outline.length > 0 && <span className="tabular-nums text-gray-400 dark:text-gray-500">{outline.length}</span>}
          </button>
        </div>
      </div>

      {/* 编辑 + 预览 + 大纲：宽屏并排，窄屏按页签切换；展开大纲时宽屏让出独立一列，不遮挡正文 */}
      <div
        className={`relative grid grid-cols-1 rounded-b-lg overflow-hidden ${
          outlineOpen ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_11rem]' : 'lg:grid-cols-2'
        } ${fill ? 'min-h-0 flex-1' : 'resize-y min-h-[140px]'}`}
        style={fill ? undefined : { height: minHeight }}
      >
        <textarea
          ref={textareaRef}
          name={name}
          value={value}
          onChange={(e) => onChange(name, e.target.value)}
          required={required}
          rows={preview ? 2 : rows || 4}
          placeholder={placeholder}
          className={`w-full h-full px-3 py-2 border-0 focus:ring-0 resize-none overflow-y-auto ${preview ? 'hidden lg:block' : 'block'}`}
        />
        <div
          ref={previewRef}
          className={`px-3 py-2 h-full bg-white dark:bg-gray-900 prose prose-sm max-w-none text-sm lg:border-l border-gray-200 dark:border-gray-700 overflow-y-auto ${preview ? 'block' : 'hidden lg:block'}`}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(value) || '<span class="text-gray-400 dark:text-gray-500">暂无内容</span>' }}
        />
        {outlineOpen && (
          <aside className="absolute right-0 top-0 bottom-0 z-20 flex w-64 flex-col gap-1 overflow-y-auto border-l border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-900 lg:static lg:z-0 lg:w-auto">
            {outline.length === 0 ? (
              <p className="px-2 py-3 text-xs leading-relaxed text-gray-400 dark:text-gray-500">
                正文还没有标题。用 <code className="text-gray-600 dark:text-gray-300">#</code>、<code className="text-gray-600 dark:text-gray-300">##</code>、<code className="text-gray-600 dark:text-gray-300">###</code> 写章节，大纲会自动生成。
              </p>
            ) : (
              <>
                <p className="shrink-0 px-2 pb-1 text-[11px] text-gray-400 dark:text-gray-500">大纲 · {outline.length}</p>
                {outline.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => jumpTo(item)}
                    className={`w-full shrink-0 text-left pr-2 py-1 rounded text-xs truncate transition-colors ${
                      activeId === item.id
                        ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                    style={{ paddingLeft: `${6 + (item.level - 1) * 10}px` }}
                    title={item.text}
                  >
                    {item.text}
                  </button>
                ))}
              </>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

/** 附件上传字段 — 集成在表单中，支持即时上传或延迟上传 */
interface AttachmentsFieldProps {
  name: string;
  pendingFiles: PendingFile[];
  onAddPendingFiles: (files: PendingFile[]) => void;
  onRemovePendingFile: (index: number) => void;
  entityType: string;
  entityId?: number;
  uploading?: boolean;
  onUploadComplete?: () => void;
}

function AttachmentsField({
  name, pendingFiles, onAddPendingFiles, onRemovePendingFile,
  entityType, entityId, uploading, onUploadComplete,
}: AttachmentsFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [instantUploading, setInstantUploading] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // 立即上传文件
    if (entityId) {
      setInstantUploading(true);
      try {
        for (const file of Array.from(files)) {
          const formDataObj = new FormData();
          formDataObj.append('file', file);
          formDataObj.append('entity_type', entityType);
          formDataObj.append('entity_id', entityId.toString());

          await fetchAPI('/upload/to-entity', {
            method: 'POST',
            headers: {},
            body: formDataObj,
          });
        }
        // 上传完成后通知父组件刷新
        if (onUploadComplete) {
          onUploadComplete();
        }
      } catch (err) {
        console.error('上传失败:', err);
      } finally {
        setInstantUploading(false);
      }
    } else {
      // 没有 entityId，暂存文件（新增时使用）
      const newFiles: PendingFile[] = Array.from(files).map((file) => ({
        file,
        name: file.name,
        size: file.size,
        type: file.type,
      }));
      onAddPendingFiles(newFiles);
    }

    // 清空 input 以便重复选择同一文件
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const handleRemoveFile = async (index: number) => {
    const file = pendingFiles[index];
    if (!file) return;

    // 如果是已上传的文件（有 id），调用删除 API
    if ('id' in file && (file as any).id) {
      try {
        await fetchAPI(`/file-attachments/${(file as any).id}`, { method: 'DELETE' });
        // 删除成功后通知父组件刷新
        if (onUploadComplete) {
          onUploadComplete();
        }
      } catch (err) {
        console.error('删除文件失败:', err);
      }
    }

    // 从列表中移除
    onRemovePendingFile(index);
  };

  const getFileIcon = (type?: string, name?: string) => {
    if (type?.startsWith('image/')) return '🖼️';
    if (type?.includes('pdf') || name?.endsWith('.pdf')) return '📕';
    if (type?.includes('word') || type?.includes('document') || name?.endsWith('.docx') || name?.endsWith('.doc')) return '📘';
    if (type?.includes('excel') || type?.includes('spreadsheet') || name?.endsWith('.xlsx') || name?.endsWith('.xls')) return '📗';
    if (type?.includes('powerpoint') || type?.includes('presentation') || name?.endsWith('.pptx') || name?.endsWith('.ppt')) return '📙';
    if (type?.includes('zip') || type?.includes('rar') || type?.includes('gzip')) return '📦';
    return '📄';
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* 待上传的文件列表 */}
      {pendingFiles.length > 0 && (
        <div className="px-3 py-2 space-y-1">
          {pendingFiles.map((file, index) => (
            <div key={index} className="flex items-center gap-2 text-sm bg-gray-50 dark:bg-gray-800 rounded px-2 py-1.5">
              <span className="text-base">{getFileIcon(file.type, file.name)}</span>
              <span className="flex-1 truncate text-gray-800 dark:text-gray-200">
                {file.name}
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">{formatSize(file.size)}</span>
              <button
                type="button"
                onClick={() => onRemovePendingFile(index)}
                className="text-gray-400 dark:text-gray-500 hover:text-red-500 text-xs px-1"
                title="移除"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 上传按钮 */}
      <div className="border-t border-gray-100 dark:border-gray-800 px-3 py-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          id={`file-${name}`}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || instantUploading}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/40 rounded transition-colors"
        >
          {uploading || instantUploading ? (
            <>
              <span className="animate-spin">⏳</span>
              <span>上传中...</span>
            </>
          ) : (
            <>
              <span>📎</span>
              <span>添加附件</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
