/**
 * WeChat Article Renderer - Browser version
 * 渲染为微信兼容 HTML（纯内联样式，无 CSS class）。
 * 所有布局用 table + inline-block 实现。
 */

// ============ 样式常量 ============
const WX_STYLES = {
  body: 'font-size:17px;line-height:1.75;color:#333;word-break:break-word;letter-spacing:0.5px',
  h2: 'font-size:20px;font-weight:700;color:#1a1a1a;margin:24px 0 14px;line-height:1.4',
  h3: 'font-size:18px;font-weight:600;color:#1a1a1a;margin:24px 0 12px;line-height:1.4',
  p: 'margin:0 0 20px;line-height:1.75;letter-spacing:0.5px',
  ul: 'margin:0 0 20px;padding-left:24px;list-style-type:disc',
  ol: 'margin:0 0 20px;padding-left:24px;list-style-type:decimal',
  li: 'margin-bottom:10px;line-height:1.75;letter-spacing:0.5px',
  blockquote: 'margin:0 0 20px;padding:16px 20px;border-left:4px solid #60a5fa;background-color:#f7f8fa;border-radius:0 8px 8px 0',
  code: 'background-color:#f0f1f3;padding:2px 6px;border-radius:4px;font-size:15px;color:#c7254e;font-family:Menlo,Monaco,Consolas,monospace',
  // 微信公众号代码块：外层 section 负责横向滚动，内层 pre 保持格式不换行
  // 注意：<pre> 本身加 overflow-x:auto 在微信里无效（会直接换行），必须用 section 包裹
  // 代码块：外层 div 负责 overflow，内层 pre 负责内容
  codeBlockWrap: 'margin:20px 0;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.15);background:#282c34;overflow:hidden;',
  codeBlockHeader: 'display:flex;align-items:center;padding:10px 12px;background:#21252b;',
  codeBlockDot: 'display:inline-block;width:12px;height:12px;border-radius:50%;margin-right:8px;',
  // 代码区：明确设置 width:100% 确保继承父级宽度约束
  codeBlockBody: 'width:100%;box-sizing:border-box;padding:16px 20px;color:#abb2bf;background:#282c34;font-family:"SF Mono",Consolas,Monaco,"Courier New",monospace;font-size:14px;line-height:1.6;overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;',
  // pre 只负责保留格式
  codeBlockPre: 'margin:0;white-space:pre;display:inline-block;min-width:100%;',
  img: 'max-width:100%;height:auto;border-radius:8px;margin:0 0 20px;display:block',
  imgCaption: 'text-align:center;font-size:14px;color:#999;margin:-12px 0 20px',
  hr: 'border:none;border-top:1px solid #eaeaea;margin:32px 0',
  footer: 'text-align:center;font-size:14px;color:#8c8c8c;margin-top:48px;padding-top:24px;border-top:1px solid #eaeaea',
  footerSub: 'margin-top:8px;font-size:13px;color:#b2b2b2',
  card: 'margin:0 0 20px;padding:20px;border-radius:8px',
  strong: 'font-weight:700;color:#1a1a1a',
};

function wxEsc(text: string): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 专门用于代码块的转义函数，保留空格缩进（用 &nbsp; 确保微信公众号兼容）
function wxEscCode(text: string): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/ /g, '&nbsp;'); // 微信公众号需要用 &nbsp; 保留缩进
}

function wxRichText(text: string): string {
  if (!text) return '';
  let html = wxEsc(text);
  html = html.replace(/\*\*([^*]+)\*\*/g, `<strong style="${WX_STYLES.strong}">$1</strong>`);
  html = html.replace(/`([^`]+)`/g, `<code style="${WX_STYLES.code}">$1</code>`);
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a style="color:#576b95;text-decoration:none;border-bottom:1px solid #576b95" href="$2">$1</a>');
  html = html.replace(/\n/g, '<br/>');
  return html;
}

// ============ Section 类型 ============
interface WxSection {
  type: string;
  [key: string]: any;
}

function wxRenderSection(s: WxSection): string {
  if (!s || !s.type) return '';
  switch (s.type) {
    case 'heading': {
      const level = s.level || 2;
      const tag = level === 2 ? 'h2' : 'h3';
      const emoji = s.emoji ? `${s.emoji} ` : '';
      if (level === 2) {
        return `<${tag} style="${WX_STYLES.h2}">${emoji}${wxRichText(s.text)}</${tag}>`;
      }
      return `<${tag} style="${WX_STYLES.h3}">${emoji}${wxRichText(s.text)}</${tag}>`;
    }
    case 'paragraph': case 'p': {
      let style = WX_STYLES.p;
      if (s.color) style += `;color:${s.color}`;
      if (s.fontSize) style += `;font-size:${s.fontSize}`;
      if (s.align) style += `;text-align:${s.align}`;
      if (s.bold) style += `;font-weight:700`;
      if (s.indent) style += `;text-indent:2em`;
      return `<p style="${style}">${wxRichText(s.text)}</p>`;
    }
    case 'list': {
      const tag = s.ordered ? 'ol' : 'ul';
      const listStyle = s.ordered ? WX_STYLES.ol : WX_STYLES.ul;
      const items = (s.items || []).map((item: any) => {
        const text = typeof item === 'string' ? item : item.text;
        let li = `<li style="${WX_STYLES.li}">${wxRichText(text)}`;
        if (item.children?.length) {
          li += `<${tag} style="${listStyle};margin-top:8px">`;
          li += item.children.map((c: string) => `<li style="${WX_STYLES.li}">${wxRichText(c)}</li>`).join('');
          li += `</${tag}>`;
        }
        return li + '</li>';
      }).join('');
      let ulStyle = listStyle;
      if (s.indent) ulStyle += `;margin-left:${s.indent}px`;
      return `<${tag} style="${ulStyle}">${items}</${tag}>`;
    }
    case 'blockquote': case 'quote': {
      let style = WX_STYLES.blockquote;
      if (s.borderColor) style = style.replace('#60a5fa', s.borderColor);
      if (s.bgColor) style = style.replace('#f7f8fa', s.bgColor);
      if (s.children) {
        return `<section style="${style}">${s.children.map(wxRenderSection).join('')}</section>`;
      }
      return `<section style="${style}">${wxRichText(s.text)}</section>`;
    }
    case 'code': {
      if (s.inline) return `<code style="${WX_STYLES.code}">${wxEsc(s.text)}</code>`;
      // 使用 &nbsp; 保留缩进（微信公众号兼容），去掉空行避免 hydration 错误
      const lines = s.text.split('\n');
      while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
      
      // 每行的样式
      const lineStyle = 'margin:0;padding:0;white-space:nowrap;overflow:visible;width:max-content;min-width:100%;line-height:1.6;';
      
      // 生成代码行（使用 &nbsp; 保留空格）
      const codeLines = lines.map((line: string) => 
        `<p style="${lineStyle}"><span>${wxEscCode(line)}</span><span style="display:inline-block;width:20px;"> </span></p>`
      ).join('');
      
      // 代码内容区域
      const codeSection = `<section style="padding:16px 0 0 20px;color:#abb2bf;background:#282c34;font-family:'SF Mono',Consolas,Monaco,'Courier New',monospace;font-size:14px;line-height:1.6;margin:0;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;overflow-x:auto;overflow-y:hidden;">${codeLines}</section>`;
      
      // 外层用 div
      return `<div style="border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.15);text-align:left;margin:20px 0;padding:0;background:#282c34;overflow:hidden;">${codeSection}</div>`;
    }
    case 'image': case 'img':
      return `<img src="${wxEsc(s.src)}" alt="${wxEsc(s.alt || '')}" style="${WX_STYLES.img}" />` +
        (s.caption ? `<p style="${WX_STYLES.imgCaption}">${wxEsc(s.caption)}</p>` : '');
    case 'grid': {
      const cols = s.cols || 2;
      const items = s.items || [];
      const bgColor = s.bgColor || '#f7f8fa';
      let wrapStyle = `margin:0 0 24px;padding:20px 16px;border-radius:12px;background-color:${bgColor}`;
      let titleHtml = '';
      if (s.title) {
        titleHtml = `<p style="margin:0 0 16px;font-size:18px;font-weight:700;color:#1a1a1a;text-align:center">${s.emoji ? s.emoji + ' ' : ''}${wxRichText(s.title)}</p>`;
      }
      let table = '<table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:separate;border-spacing:8px">';
      for (let r = 0; r < items.length; r += cols) {
        table += '<tr>';
        for (let c = 0; c < cols; c++) {
          const item = items[r + c];
          if (!item) { table += '<td></td>'; continue; }
          const cellBg = item.bgColor || '#ffffff';
          const valColor = item.color || '#333';
          table += `<td style="width:${Math.floor(100/cols)}%;background-color:${cellBg};border-radius:10px;padding:14px 10px;text-align:center;vertical-align:middle">`;
          table += `<p style="margin:0;font-size:26px;font-weight:800;color:${valColor};line-height:1.3">${wxEsc(item.value)}</p>`;
          table += `<p style="margin:4px 0 0;font-size:12px;color:#999">${wxEsc(item.label)}</p>`;
          table += '</td>';
        }
        table += '</tr>';
      }
      table += '</table>';
      return `<section style="${wrapStyle}">${titleHtml}${table}</section>`;
    }
    case 'card': {
      let style = WX_STYLES.card;
      if (s.bgColor) style += `;background-color:${s.bgColor}`;
      if (s.borderColor) style += `;border-left:4px solid ${s.borderColor}`;
      const childrenHtml = (s.children || []).map(wxRenderSection).join('');
      return `<section style="${style}">${childrenHtml}</section>`
        .replace(/(margin:)(?:28px|32px)( 0 16px)/, '$10$2');
    }
    case 'toolCards': case 'tool-cards': {
      const items = s.items || [];
      const cols = s.cols || 1;
      let html = '';
      if (cols > 1) {
        // Multi-column: clean cards, no left border
        html = '<table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:separate;border-spacing:8px;margin:0 0 20px">';
        for (let r = 0; r < items.length; r += cols) {
          html += '<tr>';
          for (let c = 0; c < cols; c++) {
            const item = items[r + c];
            if (!item) { html += '<td></td>'; continue; }
            const bgColor = item.bgColor || '#f7f8fa';
            html += `<td style="width:${Math.floor(100/cols)}%;padding:10px 12px;background-color:${bgColor};border-radius:8px;vertical-align:top">`;
            if (item.emoji) html += `<span style="font-size:15px">${item.emoji}</span> `;
            if (item.title) html += `<strong style="font-size:13px;font-weight:700;color:#1a1a1a">${wxEsc(item.title)}</strong>`;
            if (item.desc) html += `<p style="margin:3px 0 0;font-size:11px;color:#999;line-height:1.5">${wxRichText(item.desc)}</p>`;
            html += '</td>';
          }
          html += '</tr>';
        }
        html += '</table>';
      } else {
        // Single column: clean stacked cards, no left border
        for (const item of items) {
          const bgColor = item.bgColor || '#f7f8fa';
          html += `<section style="margin:0 0 10px;padding:12px 16px;background-color:${bgColor};border-radius:8px">`;
          html += '<table cellpadding="0" cellspacing="0" style="width:100%"><tr>';
          if (item.emoji) {
            html += `<td style="width:32px;vertical-align:top;padding-right:10px"><span style="font-size:20px">${item.emoji}</span></td>`;
          }
          html += '<td style="vertical-align:top">';
          if (item.title) html += `<strong style="font-size:15px;font-weight:700;color:#1a1a1a">${wxEsc(item.title)}</strong>`;
          if (item.desc) html += `<p style="margin:4px 0 0;font-size:13px;color:#888;line-height:1.5">${wxRichText(item.desc)}</p>`;
          html += '</td></tr></table>';
          html += '</section>';
        }
        html = `<section style="margin:0 0 20px">${html}</section>`;
      }
      return html;
    }
    case 'divider': case 'hr':
      return `<hr style="${WX_STYLES.hr}" />`;
    case 'footer':
      return `<section style="${WX_STYLES.footer}"><p style="margin:0;letter-spacing:2px">${wxRichText(s.text)}</p>` +
        (s.subtext ? `<p style="${WX_STYLES.footerSub}">${wxRichText(s.subtext)}</p>` : '') + '</section>';
    case 'raw':
      return s.html || '';
    default:
      return '';
  }
}

function renderWechatHtml(sections: WxSection[]): string {
  return `<section style="${WX_STYLES.body}">\n${sections.map(wxRenderSection).join('\n')}\n</section>`;
}
export { wxRenderSections };
