/* settings.js · 设置
 * 依赖 core/store.js：state、actions、subscribe（persist 通过动态 import 调用）
 * 依赖 core/ui.js：h、icon
 * 依赖 core/feedback.js：toast、confirmDialog
 * 依赖 core/bridge.js：openDataFolder、appInfo、isDesktop、llmRequest
 *
 * v2：新增使用身份、教师档案与模型连接（可选 API Key，未配置时使用本地知识引擎）。
 */

import { state, actions, subscribe } from '../core/store.js';
import { h, icon } from '../core/ui.js';
import { toast, confirmDialog } from '../core/feedback.js';
import { openDataFolder, appInfo, isDesktop, llmRequest } from '../core/bridge.js';

const DEFAULTS = {
  theme: 'light',
  speed: 'normal',
  reduceMotion: false,
  sidebarCollapsed: false,
  demoMode: true,
  apiBase: 'http://127.0.0.1:8000',
  role: '',
  onboarded: false,
  stage: '',
  subject: '',
  textbook: '',
  className: '',
  llm: {
    provider: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4o-mini',
    temperature: 0.4
  }
};

const SPEEDS = [
  { id: 'slow', label: '慢速', hint: '适合逐步讲解' },
  { id: 'normal', label: '标准', hint: '默认节奏' },
  { id: 'fast', label: '快速', hint: '减少等待' },
  { id: 'instant', label: '立即', hint: '跳过推断动画' }
];

const PROVIDERS = [
  { id: 'openai', label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  { id: 'deepseek', label: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  { id: 'zhipu', label: '智谱', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash' },
  { id: 'qwen', label: '通义', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
  { id: 'custom', label: '自定义', baseUrl: '', model: '' }
];

const STAGES = ['小学', '初中', '高中', '大学'];
const SUBJECTS = ['语文', '数学', '英语', '物理', '化学', '生物', '政治', '历史', '地理', '科学', '信息技术', '计算机', '专业课'];
const TEXTBOOKS = ['人教版', '北师大版', '苏教版', '教科版', '外研版', '沪科版', '同济版', '马文蔚版', '自编讲义', '其他'];

function el(tag, cls, text) {
  const node = h(tag, cls ? { className: cls } : {});
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

function actionBtn(kind, label, iconName, onClick, opts) {
  const options = opts || {};
  const btn = el('button', 'btn btn-' + kind + (options.size ? ' btn-' + options.size : ''));
  btn.type = 'button';
  if (options.title) {
    btn.title = options.title;
    btn.setAttribute('aria-label', options.title);
  }
  if (iconName) btn.appendChild(icon(iconName, 16));
  btn.appendChild(el('span', 'btn-label', label));
  btn.addEventListener('click', onClick);
  return btn;
}

function dateStamp(date) {
  const value = date || new Date();
  const pad = (n) => (n < 10 ? '0' + n : String(n));
  return value.getFullYear() + '-' + pad(value.getMonth() + 1) + '-' + pad(value.getDate());
}

function currentSettings() {
  const base = Object.assign({}, DEFAULTS, (state && state.settings) || {});
  base.llm = Object.assign({}, DEFAULTS.llm, (state && state.settings && state.settings.llm) || {});
  return base;
}

function makeSelect(options, value, onChange, label) {
  const select = el('select', 'select settings-input');
  select.setAttribute('aria-label', label || '选择');
  const values = options.slice();
  if (value && values.indexOf(value) < 0) values.push(value);
  values.forEach((item) => {
    const option = document.createElement('option');
    option.value = item;
    option.textContent = item;
    select.appendChild(option);
  });
  select.value = value || '';
  select.addEventListener('change', () => onChange(select.value));
  return select;
}

export function mount(root, ctx) {
  const context = ctx || {};
  let mounted = true;
  let unsubscribe = null;
  let infoLoading = true;
  let dataDir = null;
  let desktop = false;
  let suppressRender = false;
  let showKey = false;
  const timers = new Set();

  function later(fn, ms) {
    const id = window.setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
    return id;
  }

  // 字段编辑时同步写入状态，但不触发整页重渲染，避免输入框失焦
  function quietly(fn) {
    suppressRender = true;
    try {
      fn();
    } finally {
      suppressRender = false;
    }
  }

  function setSetting(patch) {
    if (patch.theme === 'light' || patch.theme === 'dark') {
      document.documentElement.setAttribute('data-theme', patch.theme);
    }
    let ok = false;
    try {
      if (actions && typeof actions.setSettings === 'function') {
        actions.setSettings(patch);
        ok = true;
      }
    } catch (err) {
      ok = false;
    }
    if (!ok) {
      state.settings = Object.assign({}, currentSettings(), patch);
      render();
    }
  }

  async function persistNow() {
    try {
      const mod = await import('../core/store.js');
      if (mod && typeof mod.persist === 'function') await mod.persist();
    } catch (err) {
      /* 持久化失败时仍保留内存状态 */
    }
  }

  async function refreshInfo() {
    let desktopEnv = false;
    try {
      desktopEnv = typeof isDesktop === 'function' ? isDesktop() : false;
    } catch (err) {
      desktopEnv = false;
    }
    let dir = null;
    try {
      const info = await appInfo();
      if (info && info.dataDir && desktopEnv) dir = String(info.dataDir);
    } catch (err) {
      dir = null;
    }
    desktop = desktopEnv;
    dataDir = desktop ? (dir || '本机应用数据目录') : '浏览器 localStorage';
    infoLoading = false;
    if (mounted) render();
  }

  function exportJson() {
    const sessions = state && Array.isArray(state.sessions) ? state.sessions : [];
    const plans = state && Array.isArray(state.plans) ? state.plans : [];
    const library = state && Array.isArray(state.library) ? state.library : [];
    const settings = Object.assign({}, (state && state.settings) || {});
    // 备份文件不写入 API Key
    settings.llm = Object.assign({}, settings.llm || {}, { apiKey: '' });
    const payload = {
      app: '智析AI',
      exportVersion: 1,
      exportedAt: new Date().toISOString(),
      state: {
        version: (state && state.version) || 1,
        sessions,
        settings,
        activeSessionId: (state && state.activeSessionId) || null,
        plans,
        library,
        activePlanId: (state && state.activePlanId) || null
      }
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '智析AI-数据备份-' + dateStamp() + '.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    later(() => URL.revokeObjectURL(url), 1500);
    toast('已导出 JSON 备份（' + sessions.length + ' 条记录，' + plans.length + ' 个方案）', 'success');
  }

  function pickSettings(value) {
    const out = {};
    if (!value || typeof value !== 'object') return out;
    if (value.theme === 'light' || value.theme === 'dark') out.theme = value.theme;
    if (SPEEDS.some((item) => item.id === value.speed)) out.speed = value.speed;
    if (typeof value.reduceMotion === 'boolean') out.reduceMotion = value.reduceMotion;
    if (typeof value.sidebarCollapsed === 'boolean') out.sidebarCollapsed = value.sidebarCollapsed;
    if (typeof value.apiBase === 'string') out.apiBase = value.apiBase;
    out.demoMode = true;
    return out;
  }

  function pickPlans(value) {
    if (!Array.isArray(value)) return [];
    const now = new Date().toISOString();
    const out = [];
    for (const raw of value) {
      if (!raw || typeof raw !== 'object' || !raw.id || !Array.isArray(raw.versions)) continue;
      const versions = raw.versions
        .filter((version) => version && typeof version === 'object' && version.id && version.data)
        .map((version) => ({
          id: String(version.id),
          createdAt: version.createdAt || now,
          note: typeof version.note === 'string' ? version.note : '',
          data: version.data
        }));
      if (!versions.length) continue;
      out.push({
        id: String(raw.id),
        title: String(raw.title || '未命名方案'),
        createdAt: raw.createdAt || versions[0].createdAt,
        updatedAt: raw.updatedAt || versions[versions.length - 1].createdAt,
        activeVersionId: versions.some((version) => version.id === raw.activeVersionId)
          ? raw.activeVersionId
          : versions[versions.length - 1].id,
        status: typeof raw.status === 'string' ? raw.status : '',
        versions
      });
      if (out.length >= 200) break;
    }
    return out;
  }

  function pickLibrary(value) {
    if (!Array.isArray(value)) return [];
    return value
      .filter((item) => item && typeof item === 'object' && item.id && item.title)
      .slice(0, 500)
      .map((item) => ({
        id: String(item.id),
        type: String(item.type || '外部资料'),
        title: String(item.title),
        locator: String(item.locator || ''),
        excerpt: String(item.excerpt || ''),
        confidence: Number.isFinite(Number(item.confidence)) ? Number(item.confidence) : 0.7,
        scenarioId: String(item.scenarioId || ''),
        addedAt: item.addedAt || new Date().toISOString()
      }));
  }

  async function importFile(input) {
    const file = input.files && input.files[0];
    input.value = '';
    if (!file) return;

    let parsed = null;
    try {
      const text = await file.text();
      parsed = JSON.parse(text);
    } catch (err) {
      toast('导入失败：文件不是有效的 JSON', 'error');
      return;
    }

    const source = parsed && parsed.state && Array.isArray(parsed.state.sessions)
      ? parsed.state.sessions
      : (parsed && Array.isArray(parsed.sessions) ? parsed.sessions : null);
    if (!source) {
      toast('导入失败：文件中没有会话列表', 'error');
      return;
    }

    const incoming = source.filter((item) => item && typeof item === 'object' && item.id).slice(0, 50);
    if (!incoming.length) {
      toast('导入失败：没有可用的记录', 'error');
      return;
    }

    const importState = parsed && parsed.state ? parsed.state : parsed;
    const incomingPlans = pickPlans(importState && importState.plans);
    const incomingLibrary = pickLibrary(importState && importState.library);

    let ok = false;
    try {
      ok = await confirmDialog({
        title: '导入 JSON 数据？',
        body: '将用文件中的 ' + incoming.length + ' 条记录、' + incomingPlans.length + ' 个方案与 '
          + incomingLibrary.length + ' 条资料替换当前数据，并同步文件中的设置。此操作不可撤销。',
        okText: '导入',
        danger: true
      });
    } catch (err) {
      ok = window.confirm('导入将替换当前记录、方案与资料，是否继续？');
    }
    if (!ok || !mounted) return;

    state.sessions = incoming;
    state.activeSessionId = null;
    state.plans = incomingPlans;
    state.library = incomingLibrary;
    state.activePlanId = state.plans.some((plan) => plan.id === (importState && importState.activePlanId))
      ? importState.activePlanId
      : null;
    // 清理指向不存在会话的标签，避免悬挂引用
    state.tabs = state.tabs.filter((tab) => tab.id === 'main'
      || (tab.sessionId && incoming.some((session) => session.id === tab.sessionId)));
    if (!state.tabs.some((tab) => tab.id === 'main')) {
      const defaultZone = state.settings && state.settings.role === 'teacher' ? 'teacher-workbench' : 'home';
      state.tabs.unshift({ id: 'main', title: '工作台', zone: defaultZone, sessionId: null, params: {} });
    }
    const mainTab = state.tabs.find((tab) => tab.id === 'main');
    if (mainTab && mainTab.sessionId && !incoming.some((session) => session.id === mainTab.sessionId)) {
      mainTab.sessionId = null;
      mainTab.params = {};
    }
    if (!state.tabs.some((tab) => tab.id === state.activeTabId)) state.activeTabId = state.tabs[0].id;

    const settings = pickSettings(importState ? importState.settings : null);
    if (Object.keys(settings).length) setSetting(settings);
    await persistNow();
    if (!mounted) return;
    render();
    toast('已导入 ' + incoming.length + ' 条记录、' + incomingPlans.length + ' 个方案', 'success');
  }

  async function clearAll() {
    const sessions = state && Array.isArray(state.sessions) ? state.sessions.slice() : [];
    const planCount = state && Array.isArray(state.plans) ? state.plans.length : 0;
    const libraryCount = state && Array.isArray(state.library) ? state.library.length : 0;
    if (!sessions.length && !planCount && !libraryCount) {
      toast('当前没有可清空的记录', 'info');
      return;
    }
    let ok = false;
    try {
      ok = await confirmDialog({
        title: '清空全部记录？',
        body: '将删除本机保存的 ' + sessions.length + ' 条诊断记录、' + planCount + ' 个方案与 '
          + libraryCount + ' 条资料。此操作不可恢复。',
        okText: '清空全部',
        danger: true
      });
    } catch (err) {
      ok = window.confirm('确定清空全部记录、方案与资料？此操作不可恢复。');
    }
    if (!ok || !mounted) return;

    let done = false;
    try {
      if (actions && typeof actions.deleteSession === 'function') {
        sessions.forEach((session) => actions.deleteSession(session.id));
        done = true;
      }
    } catch (err) {
      done = false;
    }
    if (!done) {
      state.sessions = [];
      state.activeSessionId = null;
    }
    // 同步清理方案与资料，避免留下悬挂引用
    try {
      if (actions && typeof actions.deletePlan === 'function') {
        (state.plans || []).slice().forEach((plan) => actions.deletePlan(plan.id));
      }
      if (actions && typeof actions.deleteLibrarySource === 'function') {
        (state.library || []).slice().forEach((item) => actions.deleteLibrarySource(item.id));
      }
    } catch (err) {
      /* 单项清理失败时继续 */
    }
    state.plans = [];
    state.library = [];
    state.activePlanId = null;
    render();
    await persistNow();
    if (!mounted) return;
    render();
    toast('已清空全部记录、方案与资料', 'success');
  }

  async function openFolder() {
    if (!desktop) {
      toast('当前为浏览器环境，数据保存在 localStorage', 'info');
      return;
    }
    try {
      await openDataFolder();
      toast('已打开数据文件夹', 'success');
    } catch (err) {
      toast('无法打开文件夹，请在桌面客户端中重试', 'error');
    }
  }

  function buildHeader() {
    const head = el('header', 'v-head');
    const main = el('div', 'v-head-main');
    main.appendChild(el('h1', 'v-title', '设置'));
    main.appendChild(el('p', 'v-sub', '身份、教师档案、模型连接与本地数据管理'));
    head.appendChild(main);
    return head;
  }

  function buildSection(iconName, title, subtitle) {
    const card = el('section', 'card settings-card');
    const head = el('div', 'card-head');
    const iconBox = el('span', 'settings-section-icon');
    iconBox.appendChild(icon(iconName, 18));
    head.appendChild(iconBox);
    const text = el('div', 'settings-section-head-text');
    text.appendChild(el('h2', 'card-title', title));
    if (subtitle) text.appendChild(el('p', 'settings-section-sub', subtitle));
    head.appendChild(text);
    card.appendChild(head);
    const body = el('div', 'card-body settings-card-body');
    card.appendChild(body);
    return { card, body };
  }

  function makeRow(title, desc) {
    const row = el('div', 'settings-row');
    const main = el('div', 'settings-row-main');
    main.appendChild(el('div', 'settings-row-title', title));
    if (desc) main.appendChild(el('p', 'settings-row-desc', desc));
    row.appendChild(main);
    const control = el('div', 'settings-row-control');
    row.appendChild(control);
    return { row, control };
  }

  function switchButton(checked, label, onChange, disabled) {
    const btn = el('button', 'switch');
    btn.type = 'button';
    btn.setAttribute('role', 'switch');
    btn.setAttribute('aria-checked', checked ? 'true' : 'false');
    btn.setAttribute('aria-label', label);
    btn.title = label;
    if (disabled) {
      btn.disabled = true;
      btn.setAttribute('aria-disabled', 'true');
    } else {
      btn.addEventListener('click', onChange);
    }
    return btn;
  }

  function buildIdentity(s) {
    const section = buildSection('users', '使用身份', '教师侧生成教学方案，学生侧做学习诊断。');
    const body = section.body;

    const roleRow = makeRow('当前身份', '切换后侧栏与默认页会同步变化。');
    const roleSeg = el('div', 'segmented');
    roleSeg.setAttribute('role', 'group');
    roleSeg.setAttribute('aria-label', '选择使用身份');
    [
      { id: 'teacher', label: '教师' },
      { id: 'student', label: '学生' }
    ].forEach((item) => {
      const btn = el('button', '');
      btn.type = 'button';
      btn.textContent = item.label;
      btn.setAttribute('aria-pressed', s.role === item.id ? 'true' : 'false');
      btn.addEventListener('click', () => {
        if (state.settings.role === item.id) return;
        try {
          actions.setRole(item.id);
          toast('已切换为' + item.label + '身份', 'success');
        } catch (err) {
          toast('切换身份失败，请重试', 'error');
        }
      });
      roleSeg.appendChild(btn);
    });
    roleRow.control.appendChild(roleSeg);
    body.appendChild(roleRow.row);

    body.appendChild(el('div', 'settings-divider'));

    const guideRow = makeRow('首次引导', '重新选择身份、学段、学科与教材，并配置模型连接。已保存的数据不会丢失。');
    guideRow.control.appendChild(actionBtn('secondary', '重新运行首次引导', 'sparkles', async () => {
      try {
        const mod = await import('../components/onboarding.js');
        if (mod && typeof mod.startOnboarding === 'function') {
          mod.startOnboarding({ force: true });
        }
      } catch (err) {
        toast('引导加载失败，请刷新页面后重试', 'error');
      }
    }, { size: 'sm', title: '重新运行首次引导' }));
    body.appendChild(guideRow.row);

    return section.card;
  }

  function profileInput(key, value, placeholder) {
    const input = h('input', { className: 'input settings-input', type: 'text', placeholder: placeholder || '' });
    input.value = value || '';
    input.addEventListener('input', () => {
      const patch = {};
      patch[key] = input.value;
      quietly(() => actions.setProfile(patch));
    });
    input.addEventListener('blur', () => {
      actions.setProfile({ [key]: input.value });
    });
    return input;
  }

  function buildProfile(s) {
    const isTeacher = s.role !== 'student';
    const section = buildSection(
      'book-open',
      isTeacher ? '教师档案' : '学习档案',
      isTeacher
        ? '学段、学科与教材版本决定课标、术语与难度；修改后立即保存。'
        : '学段与学科用于匹配知识库内容；修改后立即保存。'
    );
    const body = section.body;

    const stageRow = makeRow('学段', '用于匹配课标要求与内容难度。');
    stageRow.control.appendChild(makeSelect(STAGES, s.stage, (value) => actions.setProfile({ stage: value })));
    body.appendChild(stageRow.row);

    body.appendChild(el('div', 'settings-divider'));

    const subjectRow = makeRow(
      '学科',
      '可直接填写任意学科；没有内置场景时会生成对应学段的通用结构模板，并提示补充课程资料。'
    );
    subjectRow.control.appendChild(profileInput('subject', s.subject, '例如：数学、物理、高等数学、医学统计学'));
    body.appendChild(subjectRow.row);

    if (isTeacher) {
      body.appendChild(el('div', 'settings-divider'));

      const textbookRow = makeRow('教材版本', '方案中的教材页码与条目会按此版本引用。');
      textbookRow.control.appendChild(makeSelect(TEXTBOOKS, s.textbook, (value) => actions.setProfile({ textbook: value })));
      body.appendChild(textbookRow.row);

      body.appendChild(el('div', 'settings-divider'));

      const classRow = makeRow('任课班级名', '用于方案头部与班级学情卡片，仅保存在本机。');
      classRow.control.appendChild(profileInput('className', s.className, '例如：高二（3）班'));
      body.appendChild(classRow.row);
    }

    return section.card;
  }

  function providerLabel(id) {
    const found = PROVIDERS.find((item) => item.id === id);
    return found ? found.label : '自定义';
  }

  function buildModel(s) {
    const section = buildSection('cpu', '模型连接', '配置你自己的 API Key；未配置时使用本地知识引擎生成可运行方案。');
    const body = section.body;
    const llm = s.llm || DEFAULTS.llm;
    const configured = !!(llm.apiKey && llm.model);

    const engineBadge = el(
      'span',
      'badge ' + (configured ? 'badge-success' : 'badge-neutral'),
      configured ? '已连接 · ' + llm.model : '本地知识引擎'
    );
    function refreshEngineBadge() {
      const current = (state.settings && state.settings.llm) || {};
      const ready = !!(current.apiKey && current.model);
      engineBadge.className = 'badge ' + (ready ? 'badge-success' : 'badge-neutral');
      engineBadge.textContent = ready ? '已连接 · ' + current.model : '本地知识引擎';
    }

    const engineRow = makeRow('当前引擎', 'API Key 仅保存在本机；未配置时不会发起任何网络请求。');
    engineRow.control.appendChild(engineBadge);
    body.appendChild(engineRow.row);

    body.appendChild(el('div', 'settings-divider'));

    const providerRow = makeRow('服务商', '选择预设会填入推荐的 Base URL 与模型名，仍可手动修改。');
    const providerSelect = makeSelect(
      PROVIDERS.map((item) => item.label),
      providerLabel(llm.provider),
      (value) => {
        const preset = PROVIDERS.find((item) => item.label === value);
        if (!preset) return;
        actions.setLlm({
          provider: preset.id,
          baseUrl: preset.baseUrl || llm.baseUrl,
          model: preset.model || llm.model
        });
      },
      '选择服务商'
    );
    providerRow.control.appendChild(providerSelect);
    body.appendChild(providerRow.row);

    body.appendChild(el('div', 'settings-divider'));

    const baseRow = makeRow('Base URL', '兼容 OpenAI Chat Completions；可填写到 /v1。');
    const baseInput = h('input', { className: 'input settings-input', type: 'text', placeholder: 'https://api.example.com/v1' });
    baseInput.value = llm.baseUrl || '';
    baseInput.addEventListener('input', () => {
      quietly(() => actions.setLlm({ baseUrl: baseInput.value }));
    });
    baseRow.control.appendChild(baseInput);
    body.appendChild(baseRow.row);

    body.appendChild(el('div', 'settings-divider'));

    const keyRow = makeRow('API Key', '仅保存在本机状态文件；测试连接时由桌面壳代理请求，不写入日志。');
    const keyWrap = el('div', 'settings-btnrow');
    const keyInput = h('input', { className: 'input settings-input', type: 'password', placeholder: 'sk-...' });
    keyInput.value = llm.apiKey || '';
    keyInput.addEventListener('input', () => {
      quietly(() => actions.setLlm({ apiKey: keyInput.value }));
      refreshEngineBadge();
    });
    const keyToggle = actionBtn('ghost', '显示', 'lock', () => {
      showKey = !showKey;
      keyInput.type = showKey ? 'text' : 'password';
      const labelNode = keyToggle.querySelector('.btn-label');
      if (labelNode) labelNode.textContent = showKey ? '隐藏' : '显示';
    }, { size: 'sm', title: showKey ? '隐藏 API Key' : '显示 API Key' });
    keyWrap.appendChild(keyInput);
    keyWrap.appendChild(keyToggle);
    keyRow.control.appendChild(keyWrap);
    body.appendChild(keyRow.row);

    body.appendChild(el('div', 'settings-divider'));

    const modelRow = makeRow('模型名', '填写服务商支持的模型标识，例如 gpt-4o-mini、deepseek-chat。');
    const modelInput = h('input', { className: 'input settings-input', type: 'text', placeholder: 'gpt-4o-mini' });
    modelInput.value = llm.model || '';
    modelInput.addEventListener('input', () => {
      quietly(() => actions.setLlm({ model: modelInput.value }));
      refreshEngineBadge();
    });
    modelRow.control.appendChild(modelInput);
    body.appendChild(modelRow.row);

    body.appendChild(el('div', 'settings-divider'));

    const tempRow = makeRow('温度', '数值越低越稳定，越高越发散；方案生成建议 0.3–0.6。');
    const tempWrap = el('div', 'settings-btnrow');
    const tempInput = h('input', { className: 'input', type: 'range', min: '0', max: '1.5', step: '0.1' });
    tempInput.value = String(llm.temperature);
    tempInput.style.width = '180px';
    tempInput.setAttribute('aria-label', '模型温度');
    const tempValue = el('span', 'badge badge-neutral', Number(llm.temperature).toFixed(1));
    tempInput.addEventListener('input', () => {
      const value = Number(tempInput.value);
      tempValue.textContent = value.toFixed(1);
      quietly(() => actions.setLlm({ temperature: value }));
    });
    tempWrap.appendChild(tempInput);
    tempWrap.appendChild(tempValue);
    tempRow.control.appendChild(tempWrap);
    body.appendChild(tempRow.row);

    body.appendChild(el('div', 'settings-divider'));

    const testRow = makeRow('连接检查', '发送一条「只回复 OK」的消息，确认 Base URL、Key 与模型名可用。');
    const testActions = el('div', 'settings-btnrow');
    const testBtn = actionBtn('primary', '测试连接', 'activity', () => testConnection(testBtn), { size: 'sm' });
    const clearBtn = actionBtn('secondary', '清除 Key', 'trash', () => {
      actions.setLlm({ apiKey: '' });
      toast('已清除 API Key，使用本地知识引擎', 'success');
    }, { size: 'sm', title: '清除本机保存的 API Key' });
    testActions.appendChild(testBtn);
    testActions.appendChild(clearBtn);
    testRow.control.appendChild(testActions);
    body.appendChild(testRow.row);

    const note = el('div', 'settings-lock-note');
    note.appendChild(icon('lock', 16));
    note.appendChild(el('span', '', '未配置 Key 时使用本地知识引擎；配置后方案头会标注模型来源。API Key 不会写入日志或导出备份。'));
    body.appendChild(note);

    return section.card;
  }

  async function testConnection(btn) {
    const llm = (state.settings && state.settings.llm) || {};
    if (!llm.apiKey) {
      toast('请先填写 API Key；未配置时使用本地知识引擎', 'warning');
      return;
    }
    if (!llm.baseUrl || !llm.model) {
      toast('请填写 Base URL 与模型名', 'warning');
      return;
    }

    const labelNode = btn.querySelector('.btn-label');
    const original = labelNode ? labelNode.textContent : '测试连接';
    btn.disabled = true;
    if (labelNode) labelNode.textContent = '测试中…';
    toast('正在测试连接…', 'info', 1600);

    let result = { ok: false, status: 0, content: '', error: '请求失败' };
    try {
      result = await llmRequest({
        baseUrl: llm.baseUrl,
        apiKey: llm.apiKey,
        model: llm.model,
        messages: [{ role: 'user', content: '只回复 OK' }],
        temperature: 0,
        maxTokens: 16
      });
    } catch (err) {
      result = { ok: false, status: 0, content: '', error: '请求失败，请检查配置' };
    }

    if (!mounted) return;
    btn.disabled = false;
    if (labelNode) labelNode.textContent = original;

    if (result && result.ok) {
      toast('连接成功 · ' + llm.model, 'success', 3200);
    } else {
      const detail = result && result.error ? result.error : ('HTTP ' + ((result && result.status) || 0));
      toast('连接失败：' + detail, 'error', 4000);
    }
  }

  function buildAppearance(s) {
    const section = buildSection('sun', '外观', '亮色 / 暗色与动效偏好，立即生效并保存到本机。');
    const body = section.body;

    const themeRow = makeRow('主题', '亮色适合投屏与日常阅读；暗色适合夜间阅读。');
    const themeSeg = el('div', 'segmented');
    themeSeg.setAttribute('role', 'group');
    themeSeg.setAttribute('aria-label', '选择主题');
    [
      { id: 'light', label: '亮色', icon: 'sun' },
      { id: 'dark', label: '暗色', icon: 'moon' }
    ].forEach((item) => {
      const btn = el('button', 'settings-theme-btn');
      btn.type = 'button';
      btn.setAttribute('aria-pressed', s.theme === item.id ? 'true' : 'false');
      btn.appendChild(icon(item.icon, 15));
      btn.appendChild(el('span', '', item.label));
      btn.addEventListener('click', () => setSetting({ theme: item.id }));
      themeSeg.appendChild(btn);
    });
    themeRow.control.appendChild(themeSeg);
    body.appendChild(themeRow.row);

    body.appendChild(el('div', 'settings-divider'));

    const motionRow = makeRow('减少动效', '关闭页面过渡与诊断推演的过渡动画，保留信息变化。');
    motionRow.control.appendChild(switchButton(!!s.reduceMotion, '减少动效', () => {
      setSetting({ reduceMotion: !s.reduceMotion });
    }));
    body.appendChild(motionRow.row);

    return section.card;
  }

  function buildDemo(s) {
    const section = buildSection('play', '推断节奏', '控制诊断推演的节奏；所有内容均来自本地知识库。');
    const body = section.body;

    const speedRow = makeRow('推断速度', '控制解析、展开与短测卡片的出现节奏。「立即」会直接落到最终状态。');
    const speedSeg = el('div', 'segmented settings-speed');
    speedSeg.setAttribute('role', 'group');
    speedSeg.setAttribute('aria-label', '选择推断速度');
    SPEEDS.forEach((item) => {
      const btn = el('button', '');
      btn.type = 'button';
      btn.textContent = item.label;
      btn.title = item.hint;
      btn.setAttribute('aria-pressed', s.speed === item.id ? 'true' : 'false');
      btn.addEventListener('click', () => setSetting({ speed: item.id }));
      speedSeg.appendChild(btn);
    });
    speedRow.control.appendChild(speedSeg);
    body.appendChild(speedRow.row);
    body.appendChild(el('p', 'settings-inline-note', '当前节奏：' + ((SPEEDS.find((item) => item.id === s.speed) || SPEEDS[1]).label)
      + ' · ' + ((SPEEDS.find((item) => item.id === s.speed) || SPEEDS[1]).hint)));

    body.appendChild(el('div', 'settings-divider'));

    const resetRow = makeRow('恢复默认设置', '恢复默认亮色主题、标准速度与完整动效，不会删除学习记录。');
    resetRow.control.appendChild(actionBtn('secondary', '重置', 'refresh', async () => {
      let ok = false;
      try {
        ok = await confirmDialog({
          title: '恢复默认设置？',
          body: '将恢复亮色主题、标准推断速度与完整动效。学习记录不会被删除。',
          okText: '重置'
        });
      } catch (err) {
        ok = true;
      }
      if (!ok) return;
      setSetting({ theme: 'light', speed: 'normal', reduceMotion: false });
      toast('已恢复默认设置', 'success');
    }, { size: 'sm' }));
    body.appendChild(resetRow.row);

    return section.card;
  }

  function buildData(s) {
    const section = buildSection('database', '数据管理', '状态保存在本机；桌面端写入应用数据目录，浏览器端使用 localStorage。');
    const body = section.body;

    const storage = makeRow('存储位置', '桌面客户端显示真实数据目录；浏览器中显示 localStorage。');
    const path = el('span', 'settings-path mono', infoLoading ? '正在读取…' : (dataDir || '浏览器 localStorage'));
    path.title = dataDir || '浏览器 localStorage';
    storage.control.appendChild(path);
    const folderBtn = actionBtn('secondary', '打开文件夹', 'database', openFolder, { size: 'sm' });
    if (!desktop) {
      folderBtn.disabled = true;
      folderBtn.title = '浏览器环境使用 localStorage，无法打开文件夹';
      folderBtn.setAttribute('aria-label', '浏览器环境不支持打开文件夹');
    }
    storage.control.appendChild(folderBtn);
    body.appendChild(storage.row);

    body.appendChild(el('div', 'settings-divider'));

    const countRow = makeRow('本地记录', '最多保留 50 条会话，超出后旧记录会被清理。');
    countRow.control.appendChild(el('span', 'badge badge-neutral', ((state && state.sessions && state.sessions.length) || 0) + ' 条'));
    body.appendChild(countRow.row);

    body.appendChild(el('div', 'settings-divider'));

    const backupRow = makeRow('备份与恢复', '导出为 JSON 文件；导入会用文件内容替换当前记录。');
    const backupActions = el('div', 'settings-btnrow');
    const importInput = document.createElement('input');
    importInput.type = 'file';
    importInput.accept = '.json,application/json';
    importInput.className = 'sr-only';
    importInput.tabIndex = -1;
    importInput.setAttribute('aria-hidden', 'true');
    importInput.addEventListener('change', () => {
      importFile(importInput);
    });
    backupActions.appendChild(importInput);
    backupActions.appendChild(actionBtn('primary', '导出 JSON', 'download', exportJson, { size: 'sm' }));
    backupActions.appendChild(actionBtn('secondary', '导入 JSON', 'upload', () => importInput.click(), { size: 'sm' }));
    backupRow.control.appendChild(backupActions);
    body.appendChild(backupRow.row);

    body.appendChild(el('div', 'settings-divider'));

    const dangerRow = makeRow('清空全部记录', '删除本机保存的全部诊断会话、路径进度与复测结果，二次确认后执行。');
    dangerRow.row.classList.add('settings-danger-row');
    dangerRow.control.appendChild(actionBtn('secondary', '清空全部', 'trash', clearAll, {
      size: 'sm',
      title: '清空全部本地记录（需要二次确认）'
    }));
    body.appendChild(dangerRow.row);

    return section.card;
  }

  function buildAbout() {
    const section = buildSection('info', '关于', '智析 AI · Windows 教学工作台');
    const body = section.body;

    const grid = el('div', 'settings-about');
    const items = [
      ['版本', '1.0.0'],
      ['技术栈', 'WinForms + WebView2 + 原生 ES Modules'],
      ['数据位置', '仅保存在本机，不上传服务器'],
      ['网络', '未配置模型时运行时不请求外部网络']
    ];
    items.forEach((item) => {
      const box = el('div', 'settings-about-item');
      box.appendChild(el('span', 'settings-about-label', item[0]));
      box.appendChild(el('strong', 'settings-about-value', item[1]));
      grid.appendChild(box);
    });
    body.appendChild(grid);

    const note = el('div', 'settings-about-note');
    note.appendChild(icon('sparkles', 16));
    note.appendChild(el('span', '', '本地知识引擎 · 数据只存本机'));
    body.appendChild(note);

    return section.card;
  }

  function render() {
    if (!mounted) return;
    const s = currentSettings();
    const page = el('div', 'v-page settings-page');
    page.appendChild(buildHeader());

    const stack = el('div', 'settings-stack');
    stack.appendChild(buildIdentity(s));
    stack.appendChild(buildProfile(s));
    stack.appendChild(buildModel(s));
    stack.appendChild(buildAppearance(s));
    stack.appendChild(buildDemo(s));
    stack.appendChild(buildData(s));
    stack.appendChild(buildAbout());
    page.appendChild(stack);

    root.textContent = '';
    root.appendChild(page);
  }

  try {
    if (typeof subscribe === 'function') {
      unsubscribe = subscribe((_state, event) => {
        if (event === 'save:pending' || event === 'save:done') return;
        if (suppressRender) return;
        if (mounted) render();
      });
    }
  } catch (err) {
    unsubscribe = null;
  }

  render();
  refreshInfo();

  return function cleanup() {
    mounted = false;
    timers.forEach((id) => window.clearTimeout(id));
    timers.clear();
    if (typeof unsubscribe === 'function') unsubscribe();
    root.textContent = '';
  };
}
