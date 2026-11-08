/* 智析 AI · 桌面桥
   桌面端走 WebView2 postMessage 协议；浏览器环境降级到 localStorage / Blob。 */

const LOCAL_KEY = 'zhixi.state.v1';
const pending = new Map();
let seq = 0;

function hasDesktopBridge() {
  return !!(
    typeof window !== 'undefined' &&
    window.chrome &&
    window.chrome.webview &&
    typeof window.chrome.webview.postMessage === 'function'
  );
}

if (hasDesktopBridge()) {
  window.chrome.webview.addEventListener('message', (event) => {
    let msg = event && event.data;
    if (typeof msg === 'string') {
      try {
        msg = JSON.parse(msg);
      } catch {
        return;
      }
    }
    if (!msg || !msg.id) return;
    const entry = pending.get(msg.id);
    if (!entry) return;
    pending.delete(msg.id);
    clearTimeout(entry.timer);
    if (msg.ok) entry.resolve(msg.data === undefined ? null : msg.data);
    else entry.reject(new Error(msg.error || '桌面命令执行失败'));
  });
}

function callDesktop(cmd, args, timeout = 6000) {
  return new Promise((resolve, reject) => {
    if (!hasDesktopBridge()) {
      reject(new Error('非桌面环境'));
      return;
    }
    const id = `req-${Date.now().toString(36)}-${++seq}`;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error('桌面命令超时'));
    }, timeout);
    pending.set(id, { resolve, reject, timer });
    try {
      window.chrome.webview.postMessage(JSON.stringify({ id, cmd, args: args || {} }));
    } catch (err) {
      pending.delete(id);
      clearTimeout(timer);
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

function readLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function writeLocal(value) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function isDesktop() {
  return hasDesktopBridge();
}

export async function loadState() {
  if (hasDesktopBridge()) {
    try {
      const data = await callDesktop('state.load');
      if (data && typeof data === 'object') return data;
    } catch {
      /* 宿主失败时用本地缓存兜底 */
    }
  }
  return readLocal();
}

export async function saveState(state) {
  let ok = false;
  if (hasDesktopBridge()) {
    try {
      await callDesktop('state.save', { state });
      ok = true;
    } catch {
      /* 落到 localStorage */
    }
  }
  const localOk = writeLocal(state);
  return ok || localOk;
}

function downloadBlob(filename, content, mime) {
  try {
    const blob = new Blob([content], { type: mime || 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'zhixi-export.md';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return true;
  } catch {
    return false;
  }
}

export async function exportMarkdown(filename, content) {
  if (hasDesktopBridge()) {
    try {
      const data = await callDesktop('export.markdown', { filename, content });
      return { ok: !!(data && data.ok !== false), path: data && data.path };
    } catch {
      /* 降级为浏览器下载 */
    }
  }
  const ok = downloadBlob(filename, content, 'text/markdown;charset=utf-8');
  return { ok, path: ok ? filename : undefined };
}

export async function openDataFolder() {
  if (hasDesktopBridge()) {
    try {
      await callDesktop('app.openDataFolder');
    } catch {
      /* 忽略 */
    }
  }
}

export async function appInfo() {
  if (hasDesktopBridge()) {
    try {
      const data = await callDesktop('app.info');
      if (data && typeof data === 'object') return data;
    } catch {
      /* 忽略 */
    }
  }
  return {
    version: '1.0.0',
    dataDir: isDesktop() ? '本机应用数据目录' : '浏览器本地存储'
  };
}

function normalizeLlmResult(data) {
  const src = data && typeof data === 'object' ? data : {};
  return {
    ok: !!src.ok,
    status: Number(src.status) || 0,
    content: typeof src.content === 'string' ? src.content : '',
    error: src.error ? String(src.error) : ''
  };
}

/**
 * 调用大模型 Chat Completions。
 * 桌面端通过 WebView2 壳层代理（llm.request），避免 CORS / CSP；
 * 浏览器端直接 fetch，失败时提示桌面端支持跨域代理。
 * 返回 { ok, status, content, error }，不抛异常。
 */
export async function llmRequest(payload) {
  const src = payload && typeof payload === 'object' ? payload : {};
  const baseUrl = typeof src.baseUrl === 'string' ? src.baseUrl.trim() : '';
  const apiKey = typeof src.apiKey === 'string' ? src.apiKey.trim() : '';
  const model = typeof src.model === 'string' ? src.model.trim() : '';
  const messages = Array.isArray(src.messages) ? src.messages : [];
  const temperature = Number.isFinite(Number(src.temperature)) ? Number(src.temperature) : 0.4;
  const maxTokens = Number.isFinite(Number(src.maxTokens)) ? Number(src.maxTokens) : 512;

  if (!baseUrl) {
    return { ok: false, status: 0, content: '', error: '缺少 Base URL' };
  }
  if (!model) {
    return { ok: false, status: 0, content: '', error: '缺少模型名' };
  }

  if (hasDesktopBridge()) {
    const timeout = Number.isFinite(Number(src.timeoutMs))
      ? Math.max(5000, Number(src.timeoutMs))
      : 35000;
    try {
      const data = await callDesktop('llm.request', {
        baseUrl,
        apiKey,
        model,
        messages,
        temperature,
        maxTokens
      }, timeout);
      return normalizeLlmResult(data);
    } catch (err) {
      const message = err && err.message ? err.message : String(err || '');
      return {
        ok: false,
        status: 0,
        content: '',
        error: message.indexOf('超时') >= 0 ? '请求超时（30 秒）' : '桌面代理请求失败：' + message
      };
    }
  }

  const url = /\/chat\/completions\/?$/i.test(baseUrl)
    ? baseUrl
    : baseUrl.replace(/\/+$/, '') + '/chat/completions';
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers.Authorization = 'Bearer ' + apiKey;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens
      })
    });
    const text = await response.text();
    let content = '';
    try {
      const json = JSON.parse(text);
      content = json && json.choices && json.choices[0] && json.choices[0].message
        ? String(json.choices[0].message.content || '')
        : '';
    } catch {
      content = '';
    }
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        content,
        error: '请求失败（HTTP ' + response.status + '）'
      };
    }
    return { ok: true, status: response.status, content, error: '' };
  } catch {
    return {
      ok: false,
      status: 0,
      content: '',
      error: '浏览器端跨域请求失败；桌面端支持跨域代理。'
    };
  }
}
