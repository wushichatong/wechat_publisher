/**
 * Markdown 转 Section 数据结构
 * 将 Markdown 文本转换为 wechat-renderer 可用的 Section 数组
 */

/**
 * 解析 Markdown 为 Section 数组
 * @param {string} markdown - Markdown 文本
 * @param {object} options - 选项
 * @param {string} options.coverImage - 封面图路径（可选）
 * @returns {Array} Section 数组
 */
export function markdownToSections(markdown, options = {}) {
  const sections = [];
  
  // 如果有封面图，添加到开头
  if (options.coverImage) {
    sections.push({
      type: 'image',
      src: options.coverImage,
      alt: '封面图'
    });
  }
  
  const lines = markdown.split('\n');
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i].trim();
    
    // 空行
    if (!line) {
      i++;
      continue;
    }
    
    // H1 标题（跳过，通常是文章标题）
    if (line.startsWith('# ')) {
      i++;
      continue;
    }
    
    // H2 标题
    if (line.startsWith('## ')) {
      const text = line.substring(3).trim();
      if (options.theme === 'magazine') {
        sections.push({ type: 'heading', level: 2, text });
      } else {
        sections.push({
          type: 'card',
          bgColor: '#f8f8f8',
          borderColor: '#3b82f6',
          children: [
            { type: 'heading', level: 2, text }
          ]
        });
      }
      i++;
      continue;
    }
    
    // H3–H6 标题
    if (line.startsWith('### ')) {
      const text = line.substring(4).trim();
      sections.push({
        type: 'heading',
        level: 3,
        text,
      });
      i++;
      continue;
    }
    if (line.startsWith('#### ')) {
      const text = line.substring(5).trim();
      sections.push({ type: 'heading', level: 4, text });
      i++;
      continue;
    }
    if (line.startsWith('##### ')) {
      const text = line.substring(6).trim();
      sections.push({ type: 'heading', level: 5, text });
      i++;
      continue;
    }
    if (line.startsWith('###### ')) {
      const text = line.substring(7).trim();
      sections.push({ type: 'heading', level: 6, text });
      i++;
      continue;
    }

    // 公式块 $$...$$（支持跨多行）
    if (line.includes('$$')) {
      const mathLines = [];
      let mathLine = line;
      // 如果是结束 $$
      if (mathLine.match(/^\$\$/)) {
        // 单行 $$...$$
        const m = mathLine.match(/^\$\$(.*)\$\$\s*$/);
        if (m) {
          sections.push({ type: 'math', text: m[1], block: true });
          i++;
          continue;
        }
      }
      // 多行 $$...\n...\n$$
      if (mathLine.startsWith('$$')) {
        mathLine = mathLine.substring(2); // 去掉开头的 $$
        if (mathLine.includes('$$')) {
          // 同一行内有开始和结束
          const m = mathLine.match(/^(.*)\$\$/);
          if (m) {
            sections.push({ type: 'math', text: m[1], block: true });
            i++;
            continue;
          }
        }
        // 收集多行直到找到 $$
        mathLines.push(mathLine);
        i++;
        while (i < lines.length) {
          const nextLine = lines[i];
          if (nextLine.includes('$$')) {
            const endIdx = nextLine.indexOf('$$');
            mathLines.push(nextLine.substring(0, endIdx));
            sections.push({ type: 'math', text: mathLines.join('\n'), block: true });
            i++;
            break;
          }
          mathLines.push(nextLine);
          i++;
        }
        continue;
      }
    }

    // 行内公式 $...$（在段落/普通文本中处理）
    // 标记行中含公式，后续在段落中统一提取
    
    // 引用块
    if (line.startsWith('> ')) {
      let quoteText = line.substring(2);
      i++;
      while (i < lines.length && lines[i].trim().startsWith('> ')) {
        quoteText += '\n' + lines[i].trim().substring(2);
        i++;
      }
      sections.push({
        type: 'blockquote',
        text: quoteText,
        borderColor: '#60a5fa'
      });
      continue;
    }
    
    // 代码块
    if (line.startsWith('```')) {
      const language = line.substring(3).trim() || 'text';
      i++;
      let codeText = '';
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeText += (codeText ? '\n' : '') + lines[i];
        i++;
      }
      i++; // 跳过结束的 ```
      if (language === 'mermaid') {
        sections.push({ type: 'mermaid', text: codeText });
      } else {
        sections.push({ type: 'code', language, text: codeText });
      }
      continue;
    }
    
    // 无序列表
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const items = [];
      while (i < lines.length && (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))) {
        const item = lines[i].trim().substring(2);
        items.push(item);
        i++;
      }
      sections.push({
        type: 'list',
        ordered: false,
        items
      });
      continue;
    }
    
    // 有序列表
    if (/^\d+\.\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        const item = lines[i].trim().replace(/^\d+\.\s/, '');
        items.push(item);
        i++;
      }
      sections.push({
        type: 'list',
        ordered: true,
        items
      });
      continue;
    }
    
    // 表格（以 | 开头的行，且下一行是分隔行 |---|）
    if (line.startsWith('|') && i + 1 < lines.length && /^\|[\s:]*-+[\s:]*\|/.test(lines[i + 1].trim())) {
      const headerCells = parseTableRow(line);
      const sepLine = lines[i + 1].trim();
      const aligns = parseTableAligns(sepLine);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(parseTableRow(lines[i].trim()));
        i++;
      }
      sections.push({ type: 'table', headers: headerCells, aligns, rows });
      continue;
    }

    // 独立的图片或视频行 ![alt](src)
    const mediaMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (mediaMatch) {
      const alt = mediaMatch[1];
      const src = mediaMatch[2];
      const ext = src.split('.').pop().toLowerCase();
      if (['mp4', 'mov', 'avi', 'wmv', 'webm'].includes(ext)) {
        sections.push({ type: 'video', src, alt });
      } else {
        sections.push({ type: 'image', src, alt });
      }
      i++;
      continue;
    }

    // 分隔线
    if (line === '---' || line === '***' || line === '___') {
      sections.push({ type: 'divider' });
      i++;
      continue;
    }
    
    // 普通段落
    let paragraph = line;
    i++;
    while (i < lines.length && lines[i].trim() && !isSpecialLine(lines[i])) {
      paragraph += '\n' + lines[i].trim();
      i++;
    }
    
    // 检查是否是粗体段落
    const isBold = paragraph.startsWith('**') && paragraph.endsWith('**');
    
    sections.push({
      type: 'paragraph',
      text: paragraph,
      bold: isBold
    });
  }
  
  // 添加 footer
  if (options.theme === 'magazine') {
    sections.push({
      type: 'footer',
      text: 'THANKS FOR READING',
      subtext: options.footerSubtext || '🦐 龙虾 · OpenClaw 技术分享'
    });
  } else {
    sections.push({
      type: 'footer',
      text: '— END —',
      subtext: '🦐 龙虾 · OpenClaw 技术分享'
    });
  }
  
  return sections;
}

/**
 * 检查是否是特殊行（标题、列表、代码块等）
 */
function isSpecialLine(line) {
  const trimmed = line.trim();
  return (
    /^#{1,6}\s/.test(trimmed) ||
    trimmed.startsWith('- ') ||
    trimmed.startsWith('* ') ||
    trimmed.startsWith('> ') ||
    trimmed.startsWith('```') ||
    trimmed.startsWith('|') ||
    /^\d+\.\s/.test(trimmed) ||
    trimmed === '---' ||
    trimmed === '***' ||
    trimmed === '___'
  );
}

function parseTableRow(line) {
  return line
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map(cell => cell.trim());
}

function parseTableAligns(sepLine) {
  return sepLine
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map(cell => {
      const t = cell.trim();
      if (t.startsWith(':') && t.endsWith(':')) return 'center';
      if (t.endsWith(':')) return 'right';
      return 'left';
    });
}
