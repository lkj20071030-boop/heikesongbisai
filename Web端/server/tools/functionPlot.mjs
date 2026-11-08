import { compile } from 'mathjs';

/* 确定性函数绘图工具：纯函数、无副作用，相同输入必定得到相同 SVG 与文本。 */

export const FUNCTION_PLOT_TOOL = {
  name: 'function.plot',
  title: '函数绘图',
  description: '根据数学表达式在给定定义域内采样 241 点，返回服务端 SVG 与纯文本；数据点由服务端计算，不接受客户端提交。',
  render: 'svg+text',
};

const MAX_EXPRESSION_LENGTH = 200;
const MAX_DOMAIN_VALUE = 1e6;
const SAMPLES = 240; // 240 段 → 241 个采样点
const COLOR = '#6366f1';
const DEFAULT_DOMAIN = [-10, 10];

const IDENTIFIER = /sin|cos|tan|log|ln|sqrt|abs|exp|pi|e|x/g;

export class ToolInputError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ToolInputError';
    this.status = 422;
  }
}

function readExpression(source) {
  if (typeof source !== 'string') throw new ToolInputError('expression 必须是字符串');
  const expression = source.trim();
  if (!expression) throw new ToolInputError('表达式不能为空');
  if (expression.length > MAX_EXPRESSION_LENGTH) throw new ToolInputError(`表达式不能超过 ${MAX_EXPRESSION_LENGTH} 个字符`);
  const rest = expression.replace(IDENTIFIER, ' ');
  if (!/^[0-9+\-*/^().\s]*$/.test(rest)) {
    throw new ToolInputError('表达式仅允许数字、x、+ - * / ^ ( )、空格，以及 sin/cos/tan/log/ln/sqrt/abs/exp/pi/e');
  }
  return expression;
}

function readDomain(source) {
  if (source === undefined) return [...DEFAULT_DOMAIN];
  if (!Array.isArray(source) || source.length !== 2) throw new ToolInputError('domain 必须包含两个数值');
  if (source.some(value => typeof value !== 'number' || !Number.isFinite(value))) {
    throw new ToolInputError('domain 必须是两个有限数值');
  }
  const [start, end] = source;
  if (Math.abs(start) > MAX_DOMAIN_VALUE || Math.abs(end) > MAX_DOMAIN_VALUE) {
    throw new ToolInputError(`domain 的绝对值不能超过 ${MAX_DOMAIN_VALUE}`);
  }
  if (start >= end) throw new ToolInputError('domain 下限必须小于上限');
  return [start, end];
}

/* mathjs 的 ln 不是内置函数：统一改写为自然对数 log。 */
function toMathJs(expression) {
  return expression.replace(/\bln\b/g, 'log');
}

function evaluateExpression(expression) {
  try {
    return compile(toMathJs(expression));
  } catch {
    throw new ToolInputError('表达式无法解析，请检查括号、运算符与函数名');
  }
}

function sample(compiled, [start, end]) {
  const points = [];
  for (let index = 0; index <= SAMPLES; index += 1) {
    const x = start + ((end - start) * index) / SAMPLES;
    let y = null;
    try {
      const value = Number(compiled.evaluate({ x }));
      y = Number.isFinite(value) ? value : null;
    } catch {
      y = null;
    }
    points.push({ x, y });
  }
  return points;
}

function escapeXml(value) {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]);
}

function tick(value) {
  return Math.abs(value) < 1e-12 ? '0' : Number(value.toPrecision(5)).toString();
}

function renderSvg(expression, domain, points) {
  const width = 800;
  const height = 420;
  const margin = { top: 50, right: 28, bottom: 48, left: 66 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const finiteValues = points.flatMap(point => point.y === null ? [] : [point.y]);
  if (!finiteValues.length) throw new ToolInputError('表达式在给定定义域内没有可绘制的有限实数值');

  let [yMin, yMax] = [Math.min(...finiteValues), Math.max(...finiteValues)];
  if (yMin === yMax) {
    const padding = Math.max(1, Math.abs(yMin) * 0.1);
    yMin -= padding;
    yMax += padding;
  }
  const [xMin, xMax] = domain;
  const sx = x => margin.left + ((x - xMin) / (xMax - xMin)) * plotWidth;
  const sy = y => margin.top + ((yMax - y) / (yMax - yMin)) * plotHeight;

  const title = `y = ${expression}`;
  const parts = [
    `<rect width="${width}" height="${height}" rx="16" fill="#ffffff"/>`,
    `<text x="${margin.left}" y="29" fill="#273450" font-family="sans-serif" font-size="18">${escapeXml(title)}</text>`,
  ];
  for (let index = 0; index <= 5; index += 1) {
    const x = xMin + ((xMax - xMin) * index) / 5;
    const y = yMin + ((yMax - yMin) * index) / 5;
    parts.push(`<line x1="${sx(x)}" y1="${margin.top}" x2="${sx(x)}" y2="${height - margin.bottom}" stroke="#e5e7eb"/>`);
    parts.push(`<text x="${sx(x)}" y="${height - 25}" text-anchor="middle" fill="#64748b" font-size="11" font-family="sans-serif">${tick(x)}</text>`);
    parts.push(`<line x1="${margin.left}" y1="${sy(y)}" x2="${width - margin.right}" y2="${sy(y)}" stroke="#e5e7eb"/>`);
    parts.push(`<text x="${margin.left - 10}" y="${sy(y) + 4}" text-anchor="end" fill="#64748b" font-size="11" font-family="sans-serif">${tick(y)}</text>`);
  }
  if (xMin <= 0 && xMax >= 0) {
    parts.push(`<line x1="${sx(0)}" y1="${margin.top}" x2="${sx(0)}" y2="${height - margin.bottom}" stroke="#94a3b8" stroke-width="1.2"/>`);
  }
  if (yMin <= 0 && yMax >= 0) {
    parts.push(`<line x1="${margin.left}" y1="${sy(0)}" x2="${width - margin.right}" y2="${sy(0)}" stroke="#94a3b8" stroke-width="1.2"/>`);
  }

  let drawing = false;
  let path = '';
  for (const point of points) {
    if (point.y === null || point.y < yMin - (yMax - yMin) || point.y > yMax + (yMax - yMin)) {
      drawing = false;
      continue;
    }
    path += `${drawing ? 'L' : 'M'}${sx(point.x).toFixed(2)},${sy(point.y).toFixed(2)} `;
    drawing = true;
  }
  if (!path.trim()) throw new ToolInputError('表达式在给定定义域内没有可绘制的有限实数值');
  parts.push(`<path d="${path.trim()}" fill="none" stroke="${COLOR}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(title)}">${parts.join('')}</svg>`;
}

function buildText(expression, domain) {
  return [`y = ${expression}`, `x ∈ [${domain[0]}, ${domain[1]}]`, `采样 ${SAMPLES + 1} 点 · 非有限值断开`].join('\n');
}

export function plotFunction(input = {}) {
  const expression = readExpression(input.expression);
  const domain = readDomain(input.domain);
  const compiled = evaluateExpression(expression);
  const points = sample(compiled, domain);
  const svg = renderSvg(expression, domain, points);
  return {
    artifact: { kind: 'function', expression, domain },
    svg,
    text: buildText(expression, domain),
  };
}
