/**
 * 简易 Markdown 渲染器 — 纯正则，不依赖外部库。
 * 支持：标题、粗体、斜体、行内代码、代码块、列表、引用、链接、图片、分割线、换行
 */

export interface OutlineItem {
  level: number;
  text: string;
  id: string;
  /** 该标题行在原文中的字符偏移，用于把编辑光标定位到对应行 */
  offset: number;
}

/** 从 Markdown 中提取标题大纲（跳过代码块），id 与 renderMarkdown 输出的标题锚点一致 */
export function extractOutline(text: string): OutlineItem[] {
  if (!text) return [];
  const items: OutlineItem[] = [];
  let inCode = false;
  let offset = 0;

  for (const line of text.split('\n')) {
    if (/^```/.test(line.trim())) {
      inCode = !inCode;
    } else if (!inCode) {
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        items.push({
          level: match[1].length,
          text: match[2].trim(),
          id: `md-h-${items.length + 1}`,
          offset,
        });
      }
    }
    offset += line.length + 1;
  }

  return items;
}

const HEADING_CLASS: Record<number, string> = {
  1: 'text-2xl font-bold mt-4 mb-2',
  2: 'text-xl font-bold mt-4 mb-2',
  3: 'text-lg font-bold mt-4 mb-2',
  4: 'text-base font-bold mt-3 mb-1',
  5: 'text-base font-bold mt-3 mb-1',
  6: 'text-base font-bold mt-3 mb-1',
};

/** 给标题加锚点 id，编号规则与 extractOutline 保持一致 */
function replaceHeadings(html: string): string {
  const lines = html.split('\n');
  let inPre = false;
  let count = 0;

  const out = lines.map((line) => {
    if (inPre) {
      if (line.includes('</pre>')) inPre = false;
      return line;
    }
    if (line.includes('<pre')) {
      inPre = !line.includes('</pre>');
      return line;
    }
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (!match) return line;
    count += 1;
    const level = match[1].length;
    const id = `md-h-${count}`;
    return `<h${level} id="${id}" class="${HEADING_CLASS[level]}">${match[2]}</h${level}>`;
  });

  return out.join('\n');
}

export function renderMarkdown(text: string): string {
  if (!text) return '';

  let html = text;

  // 转义 HTML（防 XSS）
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 代码块 ```...```
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre class="bg-gray-100 dark:bg-gray-800 rounded p-3 my-2 text-sm overflow-x-auto"><code class="language-${lang}">${code.trim()}</code></pre>`;
  });

  // 表格（必须在换行处理之前，且跳过代码块内部）
  html = convertTables(html);

  // 行内代码
  html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm text-pink-600 dark:text-pink-400">$1</code>');

  // 标题 h1-h6（带 id 锚点，供大纲跳转）
  html = replaceHeadings(html);

  // 粗体和斜体
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // 删除线
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

  // 链接和图片
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="max-w-full rounded my-2" />');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 hover:underline">$1</a>');

  // 分割线
  html = html.replace(/^---+$/gm, '<hr class="border-gray-300 dark:border-gray-600 my-4" />');

  // 引用
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote class="border-l-4 border-gray-300 dark:border-gray-600 pl-4 py-1 my-2 text-gray-600 dark:text-gray-400 italic">$1</blockquote>');

  // 无序列表
  html = html.replace(/^[\-\*] (.+)$/gm, '<li class="ml-4 list-disc">$1</li>');

  // 有序列表
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>');

  // 连续的 li 包裹成 ul
  html = html.replace(/((?:<li class="ml-4 list-disc">.*<\/li>\n?)+)/g, '<ul class="my-2">$1</ul>');
  html = html.replace(/((?:<li class="ml-4 list-decimal">.*<\/li>\n?)+)/g, '<ol class="my-2">$1</ol>');

  // 换行 → <br>（连续两个换行变成段落间隔）
  html = html.replace(/\n\n+/g, '</p><p class="my-2">');
  html = html.replace(/\n/g, '<br />');

  // 包裹段落
  html = `<p>${html}</p>`;

  // 清理空段落
  html = html.replace(/<p>\s*<\/p>/g, '');

  return html;
}

/** 表格行：以 | 开头（结尾的 | 可省略） */
function isTableRow(line: string): boolean {
  return /^\s*\|.*$/.test(line);
}

/** 分隔行：| --- | :---: | ...（结尾的 | 可省略） */
function isTableSeparator(line: string): boolean {
  return /^\s*\|(?:\s*:?-{2,}:?\s*\|?)+\s*$/.test(line);
}

function splitTableRow(line: string): string[] {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
}

function renderTable(header: string[], body: string[][]): string {
  const th = header
    .map((cell) => `<th class="border border-gray-300 dark:border-gray-600 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 text-left font-medium whitespace-nowrap">${cell}</th>`)
    .join('');
  const trs = body
    .map((row) => {
      const tds = header
        .map((_, idx) => `<td class="border border-gray-300 dark:border-gray-600 px-3 py-1.5 align-top">${row[idx] ?? ''}</td>`)
        .join('');
      return `<tr>${tds}</tr>`;
    })
    .join('');
  return `<div class="my-3 overflow-x-auto"><table class="min-w-full text-sm border-collapse"><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table></div>`;
}

/** 把连续的 Markdown 表格行转成 HTML，代码块（pre）内部不做处理 */
function convertTables(html: string): string {
  const lines = html.split('\n');
  const out: string[] = [];
  let inPre = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (inPre) {
      out.push(line);
      if (line.includes('</pre>')) inPre = false;
      continue;
    }
    if (line.includes('<pre')) {
      inPre = !line.includes('</pre>');
      out.push(line);
      continue;
    }
    if (isTableRow(line) && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const header = splitTableRow(line);
      const body: string[][] = [];
      let j = i + 2;
      while (j < lines.length && isTableRow(lines[j]) && !isTableSeparator(lines[j])) {
        body.push(splitTableRow(lines[j]));
        j++;
      }
      out.push(renderTable(header, body));
      i = j - 1;
      continue;
    }
    out.push(line);
  }

  return out.join('\n');
}
