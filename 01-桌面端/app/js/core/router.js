/* 智析 AI · 路由、应用骨架与多标签 */

import { h, icon, fmtDate } from './ui.js';
import {
  state,
  subscribe,
  persist,
  getSession,
  getTopic,
  getActiveSession,
  actions,
  PHASE_LABELS
} from './store.js';
import { toast } from './feedback.js';

const ZONE_HOME = { id: 'home', label: '工作台', icon: 'home', shortcut: 'Ctrl+1' };
const ZONE_DIAGNOSIS = { id: 'diagnosis', label: '知识诊断', icon: 'activity', shortcut: 'Ctrl+2' };
const ZONE_GRAPH = { id: 'graph', label: '知识图谱', icon: 'git-branch', shortcut: 'Ctrl+3' };
const ZONE_PATH = { id: 'path', label: '学习路径', icon: 'layers', shortcut: 'Ctrl+4' };
const ZONE_HISTORY = { id: 'history', label: '探索记录', icon: 'clock', shortcut: 'Ctrl+5' };
const ZONE_TEACHER = { id: 'teacher', label: '班级与学情', icon: 'users', shortcut: 'Ctrl+5' };
const ZONE_SETTINGS = { id: 'settings', label: '设置', icon: 'settings', shortcut: 'Ctrl+6' };
const ZONE_WORKBENCH = { id: 'teacher-workbench', label: '工作台', icon: 'home', shortcut: 'Ctrl+1' };
const ZONE_PLANS = { id: 'plans', label: '我的方案', icon: 'layers', shortcut: 'Ctrl+2' };
const ZONE_TEACHER_GRAPH = { id: 'teacher-graph', label: '知识图谱', icon: 'git-branch', shortcut: 'Ctrl+3' };
const ZONE_LIBRARY = { id: 'library', label: '资料库', icon: 'book-open', shortcut: 'Ctrl+4' };

const STUDENT_ZONES = [
  ZONE_HOME,
  ZONE_DIAGNOSIS,
  ZONE_GRAPH,
  ZONE_PATH,
  ZONE_HISTORY,
  ZONE_SETTINGS
];

const TEACHER_ZONES = [
  ZONE_WORKBENCH,
  ZONE_PLANS,
  ZONE_TEACHER_GRAPH,
  ZONE_LIBRARY,
  ZONE_TEACHER,
  ZONE_SETTINGS
];

// 全部区域（含学生模式不展示的教师视图，供演示脚本 navigate('teacher') 使用）
const ALL_ZONES = [
  ZONE_HOME,
  ZONE_DIAGNOSIS,
  ZONE_GRAPH,
  ZONE_PATH,
  ZONE_TEACHER,
  ZONE_HISTORY,
  ZONE_SETTINGS,
  ZONE_WORKBENCH,
  ZONE_PLANS,
  ZONE_TEACHER_GRAPH,
  ZONE_LIBRARY
];

const ZONE_BY_ID = new Map(ALL_ZONES.map((zone) => [zone.id, zone]));

function currentRole() {
  return state.settings.role === 'student' ? 'student' : 'teacher';
}

function roleZones() {
  return currentRole() === 'teacher' ? TEACHER_ZONES : STUDENT_ZONES;
}

// 供命令面板等模块读取的当前角色导航（ES Module 实时绑定）
export let ZONES = roleZones();

function refreshZones() {
  ZONES = roleZones();
}

function defaultZone() {
  return currentRole() === 'teacher' ? 'teacher-workbench' : 'home';
}

const loadTeacherWorkbench = () => import('../views/teacherWorkbench.js');

const LOADERS = {
  home: () => import('../views/home.js'),
  diagnosis: () => import('../views/diagnosis.js'),
  graph: () => import('../views/graph.js'),
  path: () => import('../views/path.js'),
  teacher: () => import('../views/teacher.js'),
  history: () => import('../views/history.js'),
  settings: () => import('../views/settings.js'),
  'teacher-workbench': loadTeacherWorkbench,
  'teacher-graph': loadTeacherWorkbench,
  plans: () => import('../views/plans.js'),
  library: () => import('../views/library.js')
};

const SESSION_ZONES = new Set(['diagnosis', 'graph', 'path']);

let started = false;
let shellEl = null;
let navEl = null;
let navRefs = new Map();
let tabsEl = null;
let viewRoot = null;
let savedDot = null;
let savedTopText = null;
let savedBottomText = null;
let phaseBadge = null;
let collapseBtn = null;
let collapseLabel = null;
let demoNoteText = null;
let brandSubEl = null;
let renderedRole = null;

let cleanup = null;
let mountedTabId = null;
let mountedZone = null;
let mountToken = 0;
let savePending = false;
let unsubscribeStore = null;

const routeListeners = new Set();

export function activeTab() {
  return state.tabs.find((tab) => tab.id === state.activeTabId) || state.tabs[0] || null;
}

function zoneOf(id) {
  return ZONE_BY_ID.get(id) || (ZONE_BY_ID.get(defaultZone()) || ZONE_HOME);
}

function roleSubtitle() {
  return currentRole() === 'teacher' ? '教师教学方案工作台' : '学习诊断工作台';
}

function buildNavItems() {
  if (!navEl) return;
  navEl.replaceChildren();
  navRefs = new Map();
  for (const zone of ZONES) {
    const item = h(
      'button',
      {
        className: 'rail-item',
        type: 'button',
        dataset: { zone: zone.id, tip: `${zone.label} · ${zone.shortcut}` },
        title: `${zone.label}（${zone.shortcut}）`,
        'aria-label': `${zone.label}（${zone.shortcut}）`,
        onClick: () => navigate(zone.id)
      },
      icon(zone.icon, 18),
      h('span', { className: 'rail-label' }, zone.label)
    );
    navRefs.set(zone.id, item);
    navEl.appendChild(item);
  }
}

function applyRoleChrome() {
  refreshZones();
  renderedRole = currentRole();
  if (brandSubEl) brandSubEl.textContent = roleSubtitle();
  buildNavItems();
  syncNav();
}

function tabSessionId(tab) {
  if (!tab) return null;
  if (SESSION_ZONES.has(tab.zone)) return tab.sessionId || state.activeSessionId || null;
  return null;
}

function timeLabel(iso) {
  const formatted = fmtDate(iso);
  return formatted === '—' ? '' : formatted.slice(5);
}

/* ---------- 骨架 ---------- */

function buildSidebar() {
  refreshZones();
  renderedRole = currentRole();
  navEl = h('nav', { className: 'rail', 'aria-label': '主要导航' });
  buildNavItems();

  brandSubEl = h('span', { className: 'brand-sub' }, roleSubtitle());
  const brand = h(
    'div',
    { className: 'brand' },
    h('span', { className: 'brand-mark', 'aria-hidden': 'true' }, icon('sparkles', 18)),
    h(
      'span',
      { className: 'brand-text' },
      h('span', { className: 'brand-name' }, '智析 AI'),
      brandSubEl
    )
  );

  demoNoteText = h('span', { className: 'demo-note-text' }, '本地模式 · 课程知识库');
  const demoNote = h(
    'div',
    { className: 'demo-note', title: '全部计算在本机完成，数据只存本机' },
    icon('cpu', 16),
    demoNoteText
  );

  collapseLabel = h('span', { className: 'collapse-label' }, '收起侧栏');
  collapseBtn = h(
    'button',
    {
      className: 'collapse-btn',
      type: 'button',
      title: '收起侧栏',
      'aria-label': '收起侧栏',
      onClick: () => actions.setSidebar(!state.settings.sidebarCollapsed)
    },
    icon('panel-left', 16),
    collapseLabel
  );

  return h(
    'aside',
    { className: 'sidebar', 'aria-label': '侧栏' },
    brand,
    navEl,
    h('div', { className: 'sidebar-foot' }, demoNote, collapseBtn)
  );
}

function buildTabbar() {
  tabsEl = h('div', { className: 'tab-scroll', role: 'tablist', 'aria-label': '打开的标签' });

  savedDot = h('span', { className: 'status-dot', 'aria-hidden': 'true' });
  savedTopText = h('span', { className: 'status-text' }, '本地已保存');
  const savedPill = h(
    'span',
    { className: 'status-pill', title: '状态自动保存在本机（防抖 300ms）' },
    savedDot,
    savedTopText
  );
  const demoPill = h(
    'span',
    { className: 'badge badge-accent demo-pill', title: '本地模式 · 全部计算在本机完成' },
    icon('cpu', 12),
    '本地模式'
  );
  const version = h('span', { className: 'status-version' }, 'v1.0.0');

  return h(
    'div',
    { className: 'tabbar' },
    tabsEl,
    h('div', { className: 'tabbar-status' }, savedPill, demoPill, version)
  );
}

function buildStatusbar() {
  phaseBadge = h('span', { className: 'badge badge-neutral status-phase' }, '阶段 · 等待开始');
  savedBottomText = h('span', { className: 'status-save-text' }, '尚未保存');

  return h(
    'footer',
    { className: 'statusbar' },
    phaseBadge,
    h(
      'span',
      { className: 'status-hints', title: '全局快捷键' },
      h('span', { className: 'status-hint' }, h('span', { className: 'kbd' }, 'Ctrl+K'), ' 命令面板'),
      h('span', { className: 'status-hint' }, h('span', { className: 'kbd' }, 'Ctrl+T'), ' 新标签'),
      h('span', { className: 'status-hint' }, h('span', { className: 'kbd' }, 'Ctrl+1–7'), ' 切换页面')
    ),
    h('span', { className: 'status-item' }, icon('database', 13), savedBottomText)
  );
}

function buildShell(app) {
  const sidebar = buildSidebar();
  const tabbar = buildTabbar();

  viewRoot = h('div', { className: 'page', id: 'view-root' });
  const scroll = h('main', { className: 'page-scroll', id: 'page-scroll', tabindex: '-1' }, viewRoot);

  shellEl = h(
    'div',
    { className: 'app-shell' },
    sidebar,
    h('div', { className: 'main-col' }, tabbar, scroll, buildStatusbar())
  );
  app.replaceChildren(shellEl);
  applyShellSettings();
}

/* ---------- 外壳刷新 ---------- */

function applyShellSettings() {
  if (!shellEl) return;
  const collapsed = !!state.settings.sidebarCollapsed;
  shellEl.classList.toggle('sidebar-collapsed', collapsed);
  if (collapseLabel) collapseLabel.textContent = collapsed ? '展开侧栏' : '收起侧栏';
  if (collapseBtn) {
    const label = collapsed ? '展开侧栏' : '收起侧栏';
    collapseBtn.title = label;
    collapseBtn.setAttribute('aria-label', label);
    collapseBtn.dataset.tip = label;
  }
  if (demoNoteText) demoNoteText.textContent = collapsed ? '' : '本地模式 · 课程知识库';
  if (brandSubEl) brandSubEl.textContent = roleSubtitle();
}

function syncNav() {
  const tab = activeTab();
  const zoneId = tab ? tab.zone : defaultZone();
  for (const [id, item] of navRefs) {
    const active = id === zoneId;
    item.classList.toggle('active', active);
    if (active) item.setAttribute('aria-current', 'page');
    else item.removeAttribute('aria-current');
  }
}

function syncTabs() {
  if (!tabsEl) return;
  tabsEl.replaceChildren();
  for (const tab of state.tabs) {
    const zone = zoneOf(tab.zone);
    const isActive = tab.id === state.activeTabId;
    const title = tab.title || zone.label;
    const tabEl = h(
      'div',
      {
        className: `tab${isActive ? ' active' : ''}`,
        role: 'tab',
        tabindex: isActive ? '0' : '-1',
        'aria-selected': isActive ? 'true' : 'false',
        title: `${title}（${zone.label}）`,
        dataset: { tabId: tab.id },
        onClick: () => activateTab(tab.id),
        onKeydown: (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            activateTab(tab.id);
          }
        }
      },
      icon(zone.icon, 14),
      h('span', { className: 'tab-title' }, title),
      tab.id === 'main'
        ? h('span', { className: 'tab-pin', title: '主标签固定，不可关闭' }, icon('lock', 11))
        : h(
            'button',
            {
              className: 'tab-close',
              type: 'button',
              title: `关闭标签 ${title}（Ctrl+W）`,
              'aria-label': `关闭标签 ${title}`,
              onClick: (event) => {
                event.stopPropagation();
                closeTab(tab.id);
              }
            },
            icon('x', 12)
          )
    );
    tabsEl.appendChild(tabEl);
  }
}

function updateStatus() {
  if (phaseBadge) {
    if (currentRole() === 'teacher') {
      const plan = state.activePlanId
        ? (state.plans || []).find((item) => item.id === state.activePlanId)
        : null;
      const status = plan
        ? (typeof plan.status === 'string' && plan.status
          ? plan.status
          : (Array.isArray(plan.versions) && plan.versions.length ? '已生成' : '待生成'))
        : '待生成';
      phaseBadge.textContent = `方案 · ${status}`;
      phaseBadge.className = `badge status-phase ${plan ? 'badge-accent' : 'badge-neutral'}`;
    } else {
      const session = getActiveSession();
      phaseBadge.textContent = `阶段 · ${session ? PHASE_LABELS[session.phase] || session.phase : '等待开始'}`;
      phaseBadge.className = `badge status-phase ${session && session.phase !== 'idle' ? 'badge-accent' : 'badge-neutral'}`;
    }
  }

  const savedAt = state.savedAt;
  if (savedDot) savedDot.classList.toggle('pending', savePending);
  if (savedTopText) savedTopText.textContent = savePending ? '保存中…' : '本地已保存';
  if (savedBottomText) {
    savedBottomText.textContent = savePending
      ? '保存中…'
      : savedAt
        ? `已保存 ${timeLabel(savedAt)}`
        : '本地存储就绪';
  }
}

function renderChrome() {
  applyShellSettings();
  syncNav();
  syncTabs();
  updateStatus();
}

/* ---------- 标签与导航 ---------- */

function newTabId() {
  return `tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function activateTab(tabId) {
  if (!state.tabs.some((tab) => tab.id === tabId)) return;
  if (state.activeTabId !== tabId) {
    state.activeTabId = tabId;
    const tab = activeTab();
    const sessionId = tabSessionId(tab);
    if (sessionId) state.activeSessionId = sessionId;
  }
  persist();
  renderChrome();
  mountActive();
}

export function navigate(zone, params) {
  const target = ZONE_BY_ID.get(zone);
  if (!target) return;
  // 「工作台」是固定主标签：从会话标签点它时直接切回主标签，
  // 避免把会话标签也改成「工作台」而出现两个同名标签。
  const mainTab = state.tabs.find((item) => item.id === 'main');
  if (target.id === 'home' && currentRole() === 'student' && state.activeTabId !== 'main' && mainTab) {
    mainTab.zone = 'home';
    mainTab.params = {};
    mainTab.sessionId = null;
    mainTab.title = '工作台';
    state.activeTabId = 'main';
    persist();
    renderChrome();
    mountActive();
    return;
  }
  const tab = activeTab();
  if (!tab) return;

  const nextParams = params && typeof params === 'object' ? { ...params } : {};
  tab.zone = target.id;
  tab.params = nextParams;

  let sessionId = null;
  if (SESSION_ZONES.has(target.id)) {
    sessionId = nextParams.sessionId || state.activeSessionId || null;
    if (sessionId) state.activeSessionId = sessionId;
  }
  tab.sessionId = sessionId;

  if (target.id === 'diagnosis') {
    const session = sessionId ? getSession(sessionId) : null;
    const topic = session ? getTopic(session.topicId) : null;
    tab.title = topic && topic.shortTitle ? topic.shortTitle : target.label;
  } else {
    tab.title = target.label;
  }

  persist();
  renderChrome();
  mountActive();
}

export function openTab({ title, zone, sessionId } = {}) {
  const fallbackZone = defaultZone();
  const target = ZONE_BY_ID.get(zone || fallbackZone) || ZONE_BY_ID.get(fallbackZone) || ZONE_HOME;
  if (state.tabs.length >= 8) {
    toast('最多可打开 8 个标签，请先关闭一个标签。', 'warning');
    return '';
  }
  const id = newTabId();
  let resolvedSession = null;
  if (SESSION_ZONES.has(target.id)) {
    resolvedSession = sessionId || state.activeSessionId || null;
    if (resolvedSession) state.activeSessionId = resolvedSession;
  }
  const tabTitle = title || (target.id === 'diagnosis' && resolvedSession
    ? (getTopic((getSession(resolvedSession) || {}).topicId) || {}).shortTitle || target.label
    : target.label);

  state.tabs.push({
    id,
    title: tabTitle,
    zone: target.id,
    sessionId: resolvedSession,
    params: resolvedSession ? { sessionId: resolvedSession } : {}
  });
  state.activeTabId = id;
  persist();
  renderChrome();
  mountActive();
  return id;
}

export function closeTab(tabId) {
  if (tabId === 'main') {
    toast('主标签「工作台」固定不可关闭。', 'info');
    return;
  }
  const index = state.tabs.findIndex((tab) => tab.id === tabId);
  if (index < 0) return;
  if (state.tabs.length <= 1) return;
  state.tabs.splice(index, 1);
  if (state.activeTabId === tabId) {
    const next = state.tabs[Math.max(0, index - 1)] || state.tabs[0];
    state.activeTabId = next.id;
  }
  persist();
  renderChrome();
  mountActive();
}

export function onRoute(fn) {
  if (typeof fn !== 'function') return () => {};
  routeListeners.add(fn);
  return () => routeListeners.delete(fn);
}

/* ---------- 视图挂载 ---------- */

function loadingView(zone) {
  return h(
    'div',
    { className: 'view-loading', 'aria-busy': 'true', 'aria-label': `正在加载${zone.label}` },
    h('div', { className: 'skeleton sk-line', style: { width: '38%', height: '28px' } }),
    h('div', { className: 'skeleton sk-line', style: { width: '62%', height: '16px' } }),
    h('div', { className: 'skeleton sk-block' })
  );
}

function missingView(zone, error) {
  const retry = h(
    'button',
    { className: 'btn btn-secondary', type: 'button', onClick: () => mountActive() },
    icon('refresh', 15),
    '重试加载'
  );
  const home = h(
    'button',
    { className: 'btn btn-primary', type: 'button', onClick: () => navigate(defaultZone()) },
    icon('arrow-left', 15),
    '回到工作台'
  );
  return h(
    'div',
    { className: 'view-missing' },
    h(
      'div',
      { className: 'card card-pad view-missing-card' },
      h(
        'div',
        { className: 'empty' },
        h('span', { className: 'empty-icon' }, icon(zone.icon, 24)),
        h('h3', null, `${zone.label}视图尚未就绪`),
        h(
          'p',
          null,
          '该页面由并行开发中的视图模块提供，当前文件暂时无法加载。应用其他部分仍可正常使用。'
        ),
        h('p', { className: 'view-missing-path' }, `js/views/${zone.id}.js`),
        h(
          'p',
          { className: 'view-missing-error' },
          `错误信息：${error && error.message ? error.message : String(error || '未知错误')}`
        ),
        h('div', { className: 'row gap-2' }, retry, home)
      )
    )
  );
}

async function mountActive() {
  const tab = activeTab();
  if (!tab) return;
  const zone = zoneOf(tab.zone);
  const token = ++mountToken;
  mountedTabId = tab.id;
  mountedZone = zone.id;

  if (cleanup) {
    try {
      cleanup();
    } catch (err) {
      console.warn('[router] 视图清理失败', err);
    }
    cleanup = null;
  }

  const sessionId = tabSessionId(tab);
  const session = sessionId ? getSession(sessionId) : null;
  const topic = session ? getTopic(session.topicId) : null;
  let params = tab.params && typeof tab.params === 'object' ? { ...tab.params } : {};
  if (zone.id === 'teacher-workbench') params = { ...params, view: '' };
  else if (zone.id === 'teacher-graph') params = { ...params, view: 'graph' };
  const ctx = { params, session, topic };

  viewRoot.replaceChildren(loadingView(zone));

  let mod = null;
  try {
    mod = await LOADERS[zone.id]();
  } catch (err) {
    if (token !== mountToken) return;
    viewRoot.replaceChildren(missingView(zone, err));
    console.warn(`[router] 无法加载视图 ${zone.id}.js`, err);
    updateStatus();
    return;
  }

  if (token !== mountToken) return;

  try {
    viewRoot.replaceChildren();
    const result = mod && typeof mod.mount === 'function' ? mod.mount(viewRoot, ctx) : null;
    if (token !== mountToken) {
      if (typeof result === 'function') {
        try {
          result();
        } catch {
          /* 忽略 */
        }
      }
      return;
    }
    cleanup = typeof result === 'function' ? result : null;
    for (const fn of Array.from(routeListeners)) {
      try {
        fn({ zone: zone.id, tab, session, topic, params: ctx.params });
      } catch (err) {
        console.warn('[router] onRoute 回调失败', err);
      }
    }
  } catch (err) {
    if (token !== mountToken) return;
    viewRoot.replaceChildren(missingView(zone, err));
    console.warn(`[router] 视图 ${zone.id} 挂载失败`, err);
  }
  updateStatus();
}

/* ---------- 快捷键 ---------- */

function openCommandPalette() {
  import('../components/commandPalette.js')
    .then((mod) => mod.openCommandPalette())
    .catch((err) => {
      console.warn('[router] 命令面板加载失败', err);
      toast('命令面板暂时不可用。', 'error');
    });
}

function onKeydown(event) {
  if (!event.ctrlKey || event.altKey || event.metaKey) return;
  const key = String(event.key || '').toLowerCase();
  if (key === 'k') {
    event.preventDefault();
    openCommandPalette();
  } else if (key === 't') {
    event.preventDefault();
    openTab({ title: '工作台', zone: defaultZone() });
  } else if (key === 'w') {
    event.preventDefault();
    const tab = activeTab();
    if (!tab) return;
    if (tab.id === 'main') toast('主标签「工作台」固定不可关闭。', 'info');
    else closeTab(tab.id);
  } else if (/^[1-7]$/.test(key)) {
    event.preventDefault();
    const zone = ZONES[Number(key) - 1];
    if (zone) navigate(zone.id);
  }
}

/* ---------- 启动 ---------- */

export function start() {
  if (started) return;
  // 角色为空时绝不启动外壳：改为显示首次引导，避免空白/错误角色界面
  if (!state.settings.role) {
    import('../components/onboarding.js')
      .then((mod) => {
        if (mod && typeof mod.startOnboarding === 'function') {
          mod.startOnboarding({ onComplete: () => start() });
        }
      })
      .catch((err) => {
        console.warn('[router] 首次引导加载失败', err);
      });
    return;
  }
  started = true;
  const app = document.getElementById('app');
  if (!app) {
    console.error('[router] 找不到 #app');
    return;
  }
  buildShell(app);
  renderChrome();
  window.addEventListener('keydown', onKeydown);

  unsubscribeStore = subscribe((_state, event) => {
    if (event === 'save:pending') {
      savePending = true;
      updateStatus();
      return;
    }
    if (event === 'save:done') {
      savePending = false;
      updateStatus();
      return;
    }
    if (event === 'settings') {
      if (currentRole() !== renderedRole) applyRoleChrome();
      applyShellSettings();
      updateStatus();
      return;
    }
    syncNav();
    syncTabs();
    updateStatus();

    if (event === 'tabs') {
      const tab = activeTab();
      if (tab && (tab.id !== mountedTabId || tab.zone !== mountedZone)) {
        mountActive();
      }
    }
  });

  mountActive();
}

export function rerenderActive() {
  mountActive();
}
