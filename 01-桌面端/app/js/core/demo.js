/* 智析 AI · 正式演示模式（动作注册表 + 默认脚本 + 封面 + 控制条 + 聚光灯）
   入口：index.html?mode=demo；由 main.js 在 router.start() 之后调用 bootDemo()。
   所有状态动作都通过 store.actions 与 router 完成；不直接点击视图 DOM。
   外部脚本通过 window.ZhixiDemo 或 WebView2 消息驱动，见开发说明 17.2。 */

import { h, icon } from './ui.js';
import { state, actions, getSession, getTopic } from './store.js';
import { navigate, rerenderActive } from './router.js';
import { createDemoBar } from '../components/demoBar.js';

const QUESTION = '为什么沿闭合回路一周，电压的代数和为零？';
const TOPIC_ID = 'circuit-kvl';
const NORMAL_KEY = 'zhixi.state.v1';
const DEMO_KEY = 'zhixi.demo.state.v1';
const ACT_MS = 14000;
const MIN_ACT_MS = 3000;
const MAX_ACT_MS = 60000;
const MAX_SCENES = 30;
const MAX_SCRIPT_BYTES = 2 * 1024 * 1024;

/* 动作注册表：脚本里的 action 只引用这里的键，函数本身不暴露给外部。 */
const ACT_REGISTRY = {
  intro: runIntro,
  expand: runExpand,
  confirm: runConfirm,
  quiz: runQuiz,
  path: runPath,
  retest: runRetest,
  graph: runGraph,
  teacher: runTeacher,
  outro: runOutro
};

const DEFAULT_SCENES = [
  {
    id: 'intro',
    action: 'intro',
    title: '提出一个概念问题',
    narration: '入口不是聊天框，也不是错题本，而是一次概念性提问。',
    focus: ['.home-composer', '.home-hero', '.home'],
    duration: ACT_MS
  },
  {
    id: 'expand',
    action: 'expand',
    title: '展开前置假设',
    narration: '系统先假设：理解 KVL 可能需要电压、电势差、闭合回路与参考方向，每条关系都带依据。',
    focus: ['.dx-stream', '.dx-layout', '.dx-main'],
    duration: ACT_MS
  },
  {
    id: 'confirm',
    action: 'confirm',
    title: '在第 2 层停一下',
    narration: '默认只展开两层，把依据摊开等你确认，避免递归错误一路放大。',
    focus: ['.dx-confirm', '.dx-stream'],
    duration: ACT_MS
  },
  {
    id: 'quiz',
    action: 'quiz',
    title: '两道短测确认',
    narration: '只问两道判别题。答错的位置，才被标成疑似断点。',
    focus: ['.dx-review', '.dx-stream'],
    duration: ACT_MS
  },
  {
    id: 'path',
    action: 'path',
    title: '生成可执行路径',
    narration: '路径按前置关系排序，每一步给出概念、例子和微练习，而不是甩一段答案。',
    focus: ['.path-summary', '.path-page', '.v-page'],
    duration: ACT_MS
  },
  {
    id: 'retest',
    action: 'retest',
    title: '完成三步并复测',
    narration: '复测用不同的题。这里只对照两次作答，不宣称能力提升。',
    focus: ['.path-compare', '.path-page', '.v-page'],
    duration: ACT_MS
  },
  {
    id: 'graph',
    action: 'graph',
    title: '人工覆写与重算',
    narration: '每条边都有依据和置信度。你可以覆写；覆写后下游标记为过期，提醒重算。',
    focus: ['.graph-banner', '.graph-page', '.graph-split'],
    duration: ACT_MS
  },
  {
    id: 'teacher',
    action: 'teacher',
    title: '教师看见共性断点',
    narration: '同一个断点超过 40% 的学生，才会被聚合为班级共性断点。',
    focus: ['.teacher-weak', '.teacher-chart', '.teacher-break', '.teacher-page'],
    duration: ACT_MS
  },
  {
    id: 'outro',
    action: 'outro',
    title: '收尾',
    narration: '多标签、命令面板、本地保存。不止于答案，更接近理解。',
    focus: ['.tabbar', '.home-composer'],
    duration: ACT_MS
  }
];

const DEFAULT_SCRIPT = {
  version: 1,
  title: '智析 AI · 默认演示',
  autoPlay: true,
  scenes: DEFAULT_SCENES
};

/* ---------- 运行时 ---------- */

let booted = false;
let started = false;
let autoplay = true;
let speed = 1;
let current = -1;
let sessionId = null;
let previousSpeed = null;
let timer = null;
let navToken = 0;
let currentFocus = [];
let spotlight = null;
let cover = null;
let appEl = null;
let bar = null;
let scriptTitle = DEFAULT_SCRIPT.title;
let scenes = toRuntimeScenes(DEFAULT_SCENES);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function settle(ms = 140) {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(resolve, ms);
      });
    });
  });
}

function findTarget(selectors) {
  const list = Array.isArray(selectors) ? selectors : [];
  for (const selector of list) {
    let el = null;
    try {
      el = document.querySelector(selector);
    } catch {
      el = null;
    }
    if (!el) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return el;
  }
  return null;
}

async function waitFor(selectors, timeout = 1800) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (findTarget(selectors)) return true;
    await sleep(60);
  }
  return false;
}

/* ---------- 脚本解析与校验 ---------- */

function fail(error) {
  return { ok: false, error };
}

function clampDuration(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return ACT_MS;
  return Math.max(MIN_ACT_MS, Math.min(MAX_ACT_MS, Math.round(value)));
}

function normalizeFocus(value) {
  if (typeof value === 'string') return value ? [value] : [];
  if (!Array.isArray(value)) return [];
  return value.filter((item) => typeof item === 'string' && item);
}

// 把校验后的脚本转成运行期幕次：附加动作函数，外部脚本无法指定任意函数。
function toRuntimeScenes(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((scene, index) => {
      const action = scene && typeof scene.action === 'string' ? scene.action : '';
      const run = ACT_REGISTRY[action];
      if (!run) return null;
      return {
        id: typeof scene.id === 'string' && scene.id ? scene.id : `scene-${index + 1}`,
        action,
        title: typeof scene.title === 'string' && scene.title.trim() ? scene.title.trim() : `第 ${index + 1} 幕`,
        narration: typeof scene.narration === 'string' ? scene.narration : '',
        focus: normalizeFocus(scene.focus),
        duration: clampDuration(scene.duration),
        run
      };
    })
    .filter(Boolean);
}

function loadScript(raw) {
  let data = raw;
  if (typeof data === 'string') {
    if (data.length > MAX_SCRIPT_BYTES) return fail('脚本超过 2MB 限制');
    try {
      data = JSON.parse(data);
    } catch {
      return fail('脚本不是合法的 JSON');
    }
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return fail('脚本必须是 JSON 对象');

  try {
    if (JSON.stringify(data).length > MAX_SCRIPT_BYTES) return fail('脚本超过 2MB 限制');
  } catch {
    return fail('脚本无法序列化');
  }

  if (data.version !== 1) return fail('仅支持 version=1 的脚本');
  if (data.title !== undefined && typeof data.title !== 'string') return fail('title 必须是字符串');
  if (data.autoPlay !== undefined && typeof data.autoPlay !== 'boolean') return fail('autoPlay 必须是布尔值');
  if (!Array.isArray(data.scenes)) return fail('scenes 必须是数组');
  if (data.scenes.length < 1 || data.scenes.length > MAX_SCENES) {
    return fail(`scenes 数量必须在 1–${MAX_SCENES} 之间`);
  }

  const result = [];
  data.scenes.forEach((scene, index) => {
    if (!scene || typeof scene !== 'object' || Array.isArray(scene)) {
      console.warn(`[demo] 第 ${index + 1} 幕格式非法，已跳过`);
      return;
    }
    const action = typeof scene.action === 'string' ? scene.action.trim() : '';
    if (!ACT_REGISTRY[action]) {
      console.warn(`[demo] 第 ${index + 1} 幕的未知 action「${action || '空'}」，已跳过`);
      return;
    }
    result.push({
      id: typeof scene.id === 'string' && scene.id ? scene.id : `scene-${index + 1}`,
      action,
      title: typeof scene.title === 'string' && scene.title.trim() ? scene.title.trim() : `第 ${index + 1} 幕`,
      narration: typeof scene.narration === 'string' ? scene.narration : '',
      focus: normalizeFocus(scene.focus),
      duration: clampDuration(scene.duration)
    });
  });

  if (!result.length) return fail('没有可执行的幕次（action 均无效）');

  const title = typeof data.title === 'string' && data.title.trim() ? data.title.trim() : '外部演示脚本';
  return {
    ok: true,
    script: {
      version: 1,
      title,
      autoPlay: data.autoPlay !== false,
      scenes: result
    }
  };
}

/* ---------- 状态隔离 ---------- */

// bridge.js 在浏览器环境固定写入普通命名空间；演示页在启动时把该写入重定向到 demo key，
// 从源头保证演示记录不会出现在普通模式的探索记录里。
function isolateStorage() {
  try {
    if (window.__zhixiDemoStorageIsolated) return;
    window.__zhixiDemoStorageIsolated = true;
    const proto = window.Storage && window.Storage.prototype;
    if (!proto || typeof proto.setItem !== 'function') return;
    const original = proto.setItem;
    proto.setItem = function patchedSetItem(key, value) {
      try {
        if (this === window.localStorage && String(key) === NORMAL_KEY) {
          return original.call(this, DEMO_KEY, value);
        }
      } catch {
        /* 忽略 */
      }
      return original.call(this, key, value);
    };
  } catch {
    /* 隔离失败时不影响演示运行 */
  }
}

function resetDemoState() {
  sessionId = null;
  state.sessions.length = 0;
  state.activeSessionId = null;
  state.tabs = [{ id: 'main', title: '工作台', zone: 'home', sessionId: null, params: {} }];
  state.activeTabId = 'main';
  try {
    localStorage.removeItem(DEMO_KEY);
  } catch {
    /* 忽略 */
  }
}

function enterDemoSpeed() {
  if (previousSpeed === null) previousSpeed = state.settings.speed;
  actions.setSettings({ speed: 'instant' });
}

function restoreSpeed() {
  if (previousSpeed === null) return;
  const value = previousSpeed;
  previousSpeed = null;
  actions.setSettings({ speed: value });
}

/* ---------- 聚光灯 ---------- */

function hideSpotlight() {
  if (spotlight) spotlight.hidden = true;
}

function refreshSpotlight() {
  if (!currentFocus.length) {
    hideSpotlight();
    return;
  }
  const target = findTarget(currentFocus);
  if (!target) {
    hideSpotlight();
    return;
  }
  const rect = target.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    hideSpotlight();
    return;
  }
  if (!spotlight) {
    spotlight = h('div', { className: 'demo-spotlight', 'aria-hidden': 'true' });
    document.body.appendChild(spotlight);
  }
  spotlight.hidden = false;
  spotlight.style.top = `${Math.round(rect.top)}px`;
  spotlight.style.left = `${Math.round(rect.left)}px`;
  spotlight.style.width = `${Math.round(rect.width)}px`;
  spotlight.style.height = `${Math.round(rect.height)}px`;
}

function applyFocus(selectors) {
  currentFocus = Array.isArray(selectors) ? selectors.slice() : [];
  const target = findTarget(currentFocus);
  if (!target) {
    hideSpotlight();
    return;
  }
  try {
    target.scrollIntoView({
      block: 'center',
      inline: 'nearest',
      behavior: state.settings.reduceMotion ? 'auto' : 'smooth'
    });
  } catch {
    /* 忽略 */
  }
  requestAnimationFrame(() => {
    requestAnimationFrame(refreshSpotlight);
  });
  setTimeout(refreshSpotlight, 280);
}

function onScrollOrResize() {
  if (currentFocus.length) refreshSpotlight();
}

/* ---------- 幕次动作 ---------- */

function ensureSession() {
  let session = sessionId ? getSession(sessionId) : null;
  if (!session) {
    session = actions.startSession(TOPIC_ID, QUESTION);
    if (!session) session = getSession();
  }
  if (session) sessionId = session.id;
  return session;
}

async function runIntro() {
  resetDemoState();
  navigate('home');
  rerenderActive();
  await waitFor(['.home-composer'], 1200);
  await settle(120);
  const textarea = document.querySelector('.home-composer textarea');
  if (textarea) {
    textarea.value = QUESTION;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    // 视图挂载后会自动聚焦输入框；演示中让出焦点，保证方向键/空格可用。
    textarea.blur();
  }
}

async function runExpand() {
  const session = ensureSession();
  if (!session) return;
  actions.setPhase(session.id, 'expanding');
  actions.setLayer(session.id, 1);
  navigate('diagnosis', { sessionId: session.id });
  await waitFor(['.dx-stream'], 1800);
  await settle(160);
}

async function runConfirm() {
  const session = sessionId ? getSession(sessionId) : null;
  if (!session) return;
  actions.setPhase(session.id, 'confirming');
  actions.setLayer(session.id, 2);
  navigate('diagnosis', { sessionId: session.id });
  rerenderActive();
  await waitFor(['.dx-confirm', '.dx-stream'], 1600);
  await settle(140);
}

async function runQuiz() {
  const session = sessionId ? getSession(sessionId) : null;
  if (!session) return;
  const topic = getTopic(session.topicId);
  if (!topic || !Array.isArray(topic.quiz)) return;
  actions.setPhase(session.id, 'quizzing');
  topic.quiz.forEach((question) => {
    actions.answerQuestion(session.id, 'quiz', question.id, (Number(question.answer) + 1) % 4);
  });
  actions.submitQuiz(session.id);
  actions.setPhase(session.id, 'path-ready');
  rerenderActive();
  await waitFor(['.dx-review', '.dx-stream'], 1600);
  await settle(160);
}

async function runPath() {
  const session = sessionId ? getSession(sessionId) : null;
  if (!session) return;
  navigate('path', { sessionId: session.id });
  await waitFor(['.path-summary', '.path-page'], 1800);
  await settle(140);
}

async function runRetest() {
  const session = sessionId ? getSession(sessionId) : null;
  if (!session) return;
  const topic = getTopic(session.topicId);
  if (!topic) return;
  const steps = Array.isArray(topic.path) ? topic.path : [];
  steps.forEach((step) => {
    if (!session.completedSteps.includes(step.id)) actions.toggleStep(session.id, step.id);
  });
  const retest = Array.isArray(topic.retest) ? topic.retest : [];
  retest.forEach((question) => {
    actions.answerQuestion(session.id, 'retest', question.id, Number(question.answer));
  });
  actions.submitRetest(session.id);
  navigate('path', { sessionId: session.id });
  rerenderActive();
  await waitFor(['.path-compare', '.path-page'], 1800);
  await settle(140);
}

async function runGraph() {
  const session = sessionId ? getSession(sessionId) : null;
  if (!session) return;
  const topic = getTopic(session.topicId);
  navigate('graph', { sessionId: session.id });
  await waitFor(['.graph-canvas', '.graph-page'], 1800);
  if (topic) {
    const outgoing = new Set((topic.edges || []).map((edge) => edge.from));
    const preferred = ['voltage', 'drop'];
    let nodeId = preferred.find((id) => outgoing.has(id)) || null;
    if (!nodeId) {
      const node = (topic.nodes || []).find((item) => outgoing.has(item.id));
      nodeId = node ? node.id : null;
    }
    if (nodeId) actions.setOverride(session.id, nodeId, 'needs-work');
  }
  rerenderActive();
  await waitFor(['.graph-banner', '.graph-page'], 1600);
  await settle(140);
}

async function runTeacher() {
  navigate('teacher');
  await waitFor(['.teacher-weak', '.teacher-chart', '.teacher-break', '.teacher-page'], 1800);
  await settle(160);
}

async function runOutro() {
  navigate('home');
  await waitFor(['.home-composer', '.home-hero'], 1600);
  await settle(120);
  try {
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'k',
        code: 'KeyK',
        ctrlKey: true,
        bubbles: true,
        cancelable: true
      })
    );
  } catch {
    /* 命令面板不可用时仍可继续 */
  }
  await sleep(1100);
  const palette = document.querySelector('dialog.palette');
  if (palette && palette.open) {
    try {
      palette.close();
    } catch {
      palette.remove();
    }
  }
  const active = document.activeElement;
  if (active && typeof active.blur === 'function') active.blur();
  await settle(120);
}

/* ---------- 封面 ---------- */

function buildCover() {
  const total = DEFAULT_SCENES.length;
  const acts = h(
    'ol',
    { className: 'demo-cover-acts', 'aria-label': '演示幕次' },
    DEFAULT_SCENES.map((act, index) =>
      h(
        'li',
        { className: 'demo-cover-act' },
        h('span', { className: 'demo-cover-act-num' }, String(index + 1).padStart(2, '0')),
        h('span', { className: 'demo-cover-act-title' }, act.title)
      )
    )
  );

  const startBtn = h(
    'button',
    {
      className: 'demo-cover-start',
      type: 'button',
      title: `开始 ${total} 幕自动演示`,
      'aria-label': '开始演示',
      onClick: startDemo
    },
    icon('play', 18),
    h('span', null, '开始演示')
  );

  const browseBtn = h(
    'button',
    {
      className: 'demo-cover-browse',
      type: 'button',
      title: '不播放脚本，直接进入工作台',
      'aria-label': '直接进入工作台',
      onClick: enterWorkspace
    },
    h('span', null, '直接进入工作台'),
    icon('arrow-right', 16)
  );

  return h(
    'div',
    { className: 'demo-cover', role: 'dialog', 'aria-modal': 'true', 'aria-label': '智析 AI 演示封面' },
    h(
      'div',
      { className: 'demo-cover-glow', 'aria-hidden': 'true' },
      h('span', { className: 'demo-cover-orb demo-cover-orb-a' }),
      h('span', { className: 'demo-cover-orb demo-cover-orb-b' })
    ),
    h(
      'div',
      { className: 'demo-cover-inner' },
      h(
        'div',
        { className: 'demo-cover-main' },
        h(
          'div',
          { className: 'demo-cover-brand' },
          h('span', { className: 'demo-cover-star', 'aria-hidden': 'true' }, icon('sparkles', 22)),
          h('span', { className: 'demo-cover-brand-name' }, '智析 AI'),
          h('span', { className: 'demo-cover-brand-tag' }, '演示模式')
        ),
        h('h1', { className: 'demo-cover-title' }, '不止于答案，更接近理解。'),
        h('p', { className: 'demo-cover-sub' }, '从一个概念问题，到一条能执行、可复测的路径。'),
        h('div', { className: 'demo-cover-actions' }, startBtn, browseBtn),
        h(
          'p',
          { className: 'demo-cover-meta' },
          h('span', { className: 'demo-cover-version' }, 'v1.0.0'),
          h('span', { className: 'demo-cover-dot', 'aria-hidden': 'true' }),
          h('span', null, `${total} 幕 · 约 3 分钟`),
          h('span', { className: 'demo-cover-dot', 'aria-hidden': 'true' }),
          h('span', null, '自动播放，可随时暂停')
        )
      ),
      h(
        'div',
        { className: 'demo-cover-side' },
        h(
          'div',
          { className: 'demo-cover-side-head' },
          h('span', null, '演示脚本'),
          h('span', { className: 'demo-cover-side-note' }, `${total} 个幕次`)
        ),
        acts
      )
    ),
    h(
      'p',
      { className: 'demo-cover-foot' },
      icon('cpu', 14),
      '全部为本地数据，不调用外部服务'
    )
  );
}

/* ---------- 控制与导航 ---------- */

function stopTimer() {
  if (timer) clearTimeout(timer);
  timer = null;
}

function schedule() {
  stopTimer();
  if (!started || !autoplay || current < 0 || current >= scenes.length - 1) return;
  const duration = scenes[current].duration || ACT_MS;
  const delay = Math.round(duration / speed);
  timer = setTimeout(() => {
    timer = null;
    goTo(current + 1);
  }, delay);
}

function updateChrome() {
  if (!bar) return;
  bar.update({
    index: current,
    total: scenes.length,
    title: current >= 0 && current < scenes.length ? scenes[current].title : '',
    playing: autoplay,
    speed
  });
}

async function goTo(index) {
  if (!started) return;
  if (!scenes.length) return;
  const target = Math.max(0, Math.min(scenes.length - 1, Number(index)));
  const act = scenes[target];
  if (!act) return;
  const token = ++navToken;
  stopTimer();
  hideSpotlight();
  currentFocus = [];

  try {
    await act.run();
  } catch (err) {
    console.warn(`[demo] 第 ${target + 1} 幕执行失败`, err);
  }
  if (token !== navToken) return;

  await settle(140);
  if (token !== navToken) return;

  current = target;
  applyFocus(act.focus);
  if (target === scenes.length - 1) autoplay = false;
  updateChrome();
  if (autoplay) schedule();
  else stopTimer();
}

function goPrev() {
  if (!started || current <= 0) return;
  goTo(current - 1);
}

function goNext() {
  if (!started || current >= scenes.length - 1) return;
  goTo(current + 1);
}

function togglePlay() {
  if (!started) return;
  if (current < 0) {
    autoplay = true;
    goTo(0);
    return;
  }
  if (current >= scenes.length - 1 && !autoplay) {
    autoplay = true;
    goTo(0);
    return;
  }
  autoplay = !autoplay;
  updateChrome();
  if (autoplay) schedule();
  else stopTimer();
}

function seek(index) {
  if (!started) return;
  if (index === current) return;
  goTo(index);
}

function enterCover(options) {
  const opts = options || {};
  started = false;
  navToken += 1;
  stopTimer();
  current = -1;
  autoplay = false;
  currentFocus = [];
  hideSpotlight();
  restoreSpeed();
  if (opts.reset) {
    resetDemoState();
    navigate('home');
    rerenderActive();
  }
  if (appEl) appEl.inert = true;
  if (cover) cover.hidden = false;
  if (bar) bar.setVisible(false);
  updateChrome();
}

function applyScript(next) {
  scriptTitle = next.title;
  scenes = toRuntimeScenes(next.scenes);
  current = -1;
  if (bar) {
    bar.setActs(scenes);
    bar.setVisible(true);
  }
}

function applyDefaultScript() {
  applyScript(DEFAULT_SCRIPT);
}

function startDemo() {
  if (!started) {
    resetDemoState();
    navigate('home');
    rerenderActive();
  }
  applyDefaultScript();
  started = true;
  autoplay = true;
  speed = 1;
  current = -1;
  enterDemoSpeed();
  if (appEl) appEl.inert = false;
  if (cover) cover.hidden = true;
  if (bar) bar.setVisible(true);
  updateChrome();
  goTo(0);
}

function enterWorkspace() {
  resetDemoState();
  navigate('home');
  rerenderActive();
  applyDefaultScript();
  started = true;
  autoplay = false;
  current = -1;
  enterDemoSpeed();
  if (appEl) appEl.inert = false;
  if (cover) cover.hidden = true;
  if (bar) bar.setVisible(true);
  updateChrome();
}

function changeSpeed(value) {
  speed = Number(value) || 1;
  updateChrome();
  if (autoplay) schedule();
}

function onKeydown(event) {
  if (!started) return;
  if (event.altKey || event.metaKey || event.ctrlKey) return;
  const target = event.target;
  const tag = target && target.tagName ? String(target.tagName).toLowerCase() : '';
  if (tag === 'input' || tag === 'textarea' || tag === 'select' || (target && target.isContentEditable)) return;

  if (event.key === 'ArrowRight') {
    event.preventDefault();
    goNext();
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault();
    goPrev();
  } else if (event.key === ' ' || event.code === 'Space') {
    event.preventDefault();
    togglePlay();
  } else if (event.key === 'Escape') {
    event.preventDefault();
    const palette = document.querySelector('dialog.palette');
    if (palette && palette.open) {
      try {
        palette.close();
      } catch {
        palette.remove();
      }
      return;
    }
    enterCover({ reset: true });
  }
}

/* ---------- 外部脚本 API ---------- */

function getStatus() {
  return {
    index: current,
    total: scenes.length,
    title: current >= 0 && current < scenes.length ? scenes[current].title : '',
    playing: !!autoplay,
    scriptTitle
  };
}

function runScript(raw, options) {
  let result;
  try {
    result = loadScript(raw);
  } catch (err) {
    console.warn('[demo] 脚本解析失败', err);
    return { ok: false, error: '脚本解析失败' };
  }
  if (!result.ok) {
    console.warn(`[demo] 脚本无效：${result.error}`);
    return { ok: false, error: result.error };
  }

  const opts = options && typeof options === 'object' ? options : {};
  const next = result.script;
  const autoPlay = typeof opts.autoPlay === 'boolean' ? opts.autoPlay : next.autoPlay;
  let startAt = Number(opts.startAt);
  if (!Number.isFinite(startAt)) startAt = 0;
  startAt = Math.max(0, Math.min(next.scenes.length - 1, Math.floor(startAt)));

  started = false;
  navToken += 1;
  stopTimer();
  currentFocus = [];
  hideSpotlight();
  resetDemoState();
  navigate('home');
  rerenderActive();

  scriptTitle = next.title;
  scenes = toRuntimeScenes(next.scenes);
  current = -1;
  speed = 1;
  autoplay = autoPlay;
  started = true;
  enterDemoSpeed();
  if (appEl) appEl.inert = false;
  if (cover) cover.hidden = true;
  if (bar) {
    bar.setActs(scenes);
    bar.setVisible(true);
  }
  updateChrome();
  goTo(startAt);
  return { ok: true, status: getStatus() };
}

function command(action) {
  const name = typeof action === 'string' ? action.trim().toLowerCase() : '';
  switch (name) {
    case 'play': {
      if (!started) {
        started = true;
        speed = 1;
        current = -1;
        autoplay = true;
        enterDemoSpeed();
        if (appEl) appEl.inert = false;
        if (cover) cover.hidden = true;
        if (bar) bar.setVisible(true);
        updateChrome();
        goTo(0);
        break;
      }
      if (current < 0 || current >= scenes.length - 1) {
        autoplay = true;
        goTo(0);
        break;
      }
      autoplay = true;
      updateChrome();
      schedule();
      break;
    }
    case 'pause':
      autoplay = false;
      stopTimer();
      updateChrome();
      break;
    case 'toggle':
      togglePlay();
      break;
    case 'next':
      goNext();
      break;
    case 'prev':
      goPrev();
      break;
    case 'reset':
      enterCover({ reset: true });
      break;
    case 'cover':
      enterCover({ reset: false });
      break;
    default:
      console.warn(`[demo] 未知命令「${action}」`);
      return { ok: false, error: 'unknown command', status: getStatus() };
  }
  return { ok: true, status: getStatus() };
}

function onWebViewMessage(event) {
  try {
    let data = event ? event.data : null;
    if (typeof data === 'string') data = JSON.parse(data);
    if (!data || typeof data !== 'object') return;
    if (data.cmd === 'demo.runScript') {
      const options = typeof data.autoPlay === 'boolean' ? { autoPlay: data.autoPlay } : {};
      runScript(data.script, options);
    } else if (data.cmd === 'demo.command') {
      command(data.action);
    }
  } catch (err) {
    console.warn('[demo] WebView2 消息处理失败', err);
  }
}

function exposeApi() {
  window.ZhixiDemo = {
    runScript,
    command,
    getStatus
  };
  try {
    if (window.chrome && window.chrome.webview && typeof window.chrome.webview.addEventListener === 'function') {
      window.chrome.webview.addEventListener('message', onWebViewMessage);
    }
  } catch (err) {
    console.warn('[demo] WebView2 消息监听注册失败', err);
  }
}

/* ---------- 启动 ---------- */

export function bootDemo() {
  if (booted) return;
  booted = true;

  isolateStorage();
  document.documentElement.dataset.demo = 'true';
  appEl = document.getElementById('app');

  cover = buildCover();
  document.body.appendChild(cover);

  bar = createDemoBar({
    acts: scenes,
    handlers: {
      onPrev: goPrev,
      onNext: goNext,
      onTogglePlay: togglePlay,
      onSeek: seek,
      onSpeed: changeSpeed,
      onReset: () => enterCover({ reset: true }),
      onCover: () => enterCover({ reset: true })
    }
  });
  document.body.appendChild(bar.bar);
  document.body.appendChild(bar.narration);

  window.addEventListener('keydown', onKeydown);
  document.addEventListener('scroll', onScrollOrResize, true);
  window.addEventListener('resize', onScrollOrResize);

  exposeApi();

  // 演示启动永远回到封面，不恢复上次进度；背后的应用已挂载但不可交互。
  enterCover({ reset: true });
  updateChrome();
}
