/**
 * LaTeX 公式转 SVG 工具
 * 使用 MathJax 3 SVG 模式，生成完全独立的 SVG（字体路径嵌入 defs）
 */

import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// 使用 CommonJS require 加载 mathjax-full
const mathjax = require('mathjax-full/js/mathjax.js').mathjax;
const TeX = require('mathjax-full/js/input/tex.js').TeX;
const SVG = require('mathjax-full/js/output/svg.js').SVG;
const liteAdaptorMod = require('mathjax-full/js/adaptors/liteAdaptor.js');
const { RegisterHTMLHandler } = require('mathjax-full/js/handlers/html.js');

const adaptor = liteAdaptorMod.liteAdaptor
  ? liteAdaptorMod.liteAdaptor()
  : liteAdaptorMod.default();
RegisterHTMLHandler(adaptor);

// 可用包：base, ams, all, noerrors, noundefined, configmacros, bussproofs, cite, html, mhchem, physics, requiring
const tex = new TeX({ packages: ['base', 'ams', 'noerrors', 'noundefined'] });
const svg = new SVG({ fontCache: 'local' });
const html = mathjax.document('', { InputJax: tex, OutputJax: svg });

/**
 * 将 LaTeX 公式渲染为独立 SVG
 * MathJax SVG 模式字体路径已嵌入 defs，完全独立无需外部资源
 * @param {string} latex - LaTeX 公式
 * @param {object} options
 * @param {boolean} options.display - 是否为 display 数学（块级）
 * @returns {string} SVG 字符串
 */
export function latexToSVG(latex, options = {}) {
  const { display = false } = options;
  const node = html.convert(latex, { display });
  return adaptor.innerHTML(node);
}

/**
 * LaTeX 公式转独立 SVG 文件
 */
export function latexToSVGFile(latex, outputPath, options = {}) {
  const svg = latexToSVG(latex, options);
  fs.writeFileSync(outputPath, svg, 'utf8');
  return outputPath;
}
