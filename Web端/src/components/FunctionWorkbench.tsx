import { useEffect, useRef, useState } from 'react';
import functionPlot from 'function-plot';
import { Download, FileText, LineChart, LoaderCircle, Play } from 'lucide-react';
import { requestJson } from '../services/api';

type NumericDomain = [number, number];

interface FunctionArtifact {
  kind: 'function';
  expression: string;
  domain: NumericDomain;
}

interface FunctionPlotResult {
  artifact: FunctionArtifact;
  svg: string;
  text: string;
}

const EXAMPLES = ['sin(x)', 'x^2', '1/x', 'exp(-x^2)', 'log(x)'];
const INVALID_RESULT = '后端返回的绘图结果格式不符合接口约定。';

function unwrapResult(value: unknown): FunctionPlotResult {
  if (!value || typeof value !== 'object') throw new Error(INVALID_RESULT);
  const outer = value as { ok?: unknown; result?: unknown };
  const raw = outer.ok === true ? outer.result : undefined;
  if (!raw || typeof raw !== 'object') throw new Error(INVALID_RESULT);
  const record = raw as Record<string, unknown>;
  const artifact = record.artifact as Record<string, unknown> | undefined;
  if (!artifact || artifact.kind !== 'function' || typeof artifact.expression !== 'string' || !Array.isArray(artifact.domain) || artifact.domain.length !== 2) {
    throw new Error(INVALID_RESULT);
  }
  const [low, high] = artifact.domain;
  if (typeof low !== 'number' || typeof high !== 'number' || !Number.isFinite(low) || !Number.isFinite(high)) throw new Error(INVALID_RESULT);
  if (typeof record.svg !== 'string' || !record.svg.includes('<svg') || typeof record.text !== 'string') throw new Error(INVALID_RESULT);
  return {
    artifact: { kind: 'function', expression: artifact.expression, domain: [low, high] },
    svg: record.svg,
    text: record.text,
  };
}

export default function FunctionWorkbench() {
  const [expression, setExpression] = useState('sin(x)');
  const [lower, setLower] = useState('-10');
  const [upper, setUpper] = useState('10');
  const [result, setResult] = useState<FunctionPlotResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showText, setShowText] = useState(false);
  const runId = useRef(0);
  const abort = useRef<AbortController | null>(null);
  const canvas = useRef<HTMLDivElement>(null);

  useEffect(() => () => abort.current?.abort(), []);

  useEffect(() => {
    const target = canvas.current;
    if (!result || !target) return;
    target.replaceChildren();
    try {
      const domain = result.artifact.domain;
      functionPlot({
        target,
        width: Math.max(target.clientWidth || 0, 320),
        height: 360,
        title: `y = ${result.artifact.expression}`,
        grid: true,
        xAxis: { domain },
        tip: { xLine: true, yLine: true },
        data: [{
          fn: result.artifact.expression.replace(/\bln\b/g, 'log'),
          fnType: 'linear',
          graphType: 'polyline',
          sampler: 'builtIn',
          nSamples: 240,
          color: '#6366f1',
          scope: { pi: Math.PI, e: Math.E },
        }],
      });
    } catch {
      /* 交互图渲染失败时保留空容器，服务端 SVG 仍可下载。 */
      target.replaceChildren();
    }
    return () => target.replaceChildren();
  }, [result]);

  async function plot() {
    const source = expression.trim();
    const start = Number(lower);
    const end = Number(upper);
    if (!source) {
      setError('请输入函数表达式。');
      return;
    }
    if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
      setError('定义域起止必须是有限数值，且下限小于上限。');
      return;
    }
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    const id = ++runId.current;
    setBusy(true);
    setError('');
    setResult(null);
    setShowText(false);
    try {
      const data = unwrapResult(await requestJson('/tools/function.plot/invoke', { expression: source, domain: [start, end] }, { signal: controller.signal }));
      if (id !== runId.current) return;
      setResult(data);
    } catch (cause) {
      if (id !== runId.current) return;
      setError(cause instanceof Error ? cause.message : '绘图失败，请稍后重试。');
    } finally {
      if (id === runId.current) {
        setBusy(false);
        abort.current = null;
      }
    }
  }

  return (
    <div className="plot-workbench">
      <section className="plot-controls panel glass">
        <div className="plot-controls-heading">
          <div>
            <p className="eyebrow">DETERMINISTIC TOOL</p>
            <h2>表达式 → 图像</h2>
          </div>
          <span className="plot-badge"><i />确定性工具调用 · 无需模型</span>
        </div>

        <div className="plot-form">
          <div className="field-heading"><label htmlFor="plot-expression">函数表达式</label><span>自变量 x</span></div>
          <input
            id="plot-expression"
            className="plot-expression"
            value={expression}
            onChange={event => setExpression(event.target.value)}
            onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); void plot(); } }}
            placeholder="例如 sin(x)"
            spellCheck={false}
            disabled={busy}
          />
          <div className="plot-chips" role="group" aria-label="示例表达式">
            {EXAMPLES.map(item => (
              <button
                key={item}
                type="button"
                className={expression.trim() === item ? 'chosen' : ''}
                disabled={busy}
                onClick={() => setExpression(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <p className="hint">支持数字、x、+ - * / ^ ( )，以及 sin/cos/tan/log/ln/sqrt/abs/exp/pi/e。由服务端确定性采样，无需模型 Key。</p>

          <div className="domain-fields">
            <div>
              <label htmlFor="domain-min">定义域下限</label>
              <input id="domain-min" type="number" step="any" value={lower} onChange={event => setLower(event.target.value)} disabled={busy} />
            </div>
            <div>
              <label htmlFor="domain-max">定义域上限</label>
              <input id="domain-max" type="number" step="any" value={upper} onChange={event => setUpper(event.target.value)} disabled={busy} />
            </div>
          </div>

          {error && <p className="plot-error" role="alert">{error}</p>}

          <div className="plot-submit-row">
            <button className="primary-button plot-submit" disabled={busy || !expression.trim()} onClick={() => void plot()}>
              {busy ? <LoaderCircle className="spin" size={17} /> : <Play size={17} />}
              {busy ? '正在绘图…' : '快速绘图'}
            </button>
            <span className="plot-meta">服务端采样 241 点 · SVG + 交互图</span>
          </div>
        </div>
      </section>

      <section className="plot-stage panel glass" aria-live="polite">
        <div className="plot-stage-heading">
          <div>
            <p className="eyebrow">DETERMINISTIC CANVAS</p>
            <h2>{result ? `y = ${result.artifact.expression}` : '函数画布'}</h2>
          </div>
          <span className="render-badge">交互图 + SVG + 文本</span>
        </div>

        {result ? (
          <div className="function-plot" aria-label={`y = ${result.artifact.expression}`}>
            <div ref={canvas} className="function-plot-canvas" role="img" aria-label={result.text} />
            <div className="function-plot-actions">
              <button
                type="button"
                className={'outline-button ' + (showText ? 'chosen' : '')}
                aria-expanded={showText}
                onClick={() => setShowText(current => !current)}
              >
                <FileText size={15} />{showText ? '收起纯文本版' : '纯文本版'}
              </button>
              <a
                className="outline-button"
                href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(result.svg)}`}
                download="function-plot.svg"
              >
                <Download size={15} />下载服务端 SVG
              </a>
            </div>
            {showText && <pre className="function-plot-text">{result.text}</pre>}
          </div>
        ) : (
          <div className="plot-empty">
            <span><LineChart size={34} /></span>
            <h3>{busy ? '正在准备函数图像' : '表达式会在这里变成图像'}</h3>
            <p>{busy ? '请稍候，确定性工具正在采样 241 个点。' : '输入表达式与定义域后点击「快速绘图」，全程不需要模型 Key。'}</p>
          </div>
        )}
      </section>
    </div>
  );
}
