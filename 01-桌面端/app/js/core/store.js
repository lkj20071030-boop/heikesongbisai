/* 智析 AI · 单一状态树与领域动作 */

import { loadState, saveState } from './bridge.js';

// 演示模式使用独立命名空间，避免演示数据污染普通模式的记录
const IS_DEMO = typeof window !== 'undefined'
  && new URLSearchParams(window.location.search).get('mode') === 'demo';
const LOCAL_KEY = IS_DEMO ? 'zhixi.demo.state.v1' : 'zhixi.state.v1';
const MAX_SESSIONS = 50;

export const DEFAULT_LLM = {
  provider: 'openai',
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o-mini',
  temperature: 0.4
};

const LLM_PROVIDERS = ['openai', 'deepseek', 'zhipu', 'qwen', 'custom'];

export const PHASES = [
  'idle',
  'parsing',
  'expanding',
  'confirming',
  'quizzing',
  'path-ready',
  'executing',
  're-diagnosing'
];

export const PHASE_LABELS = {
  idle: '等待开始',
  parsing: '解析问题',
  expanding: '展开前置假设',
  confirming: '等待确认',
  quizzing: '短测确认',
  'path-ready': '生成路径',
  executing: '学习中',
  're-diagnosing': '复测'
};

export const state = {
  version: 1,
  sessions: [],
  activeSessionId: null,
  plans: [],
  activePlanId: null,
  library: [],
  tabs: [{
    id: 'main',
    title: '工作台',
    zone: IS_DEMO ? 'home' : 'teacher-workbench',
    sessionId: null,
    params: {}
  }],
  activeTabId: 'main',
  settings: {
    theme: 'light',
    speed: 'normal',
    reduceMotion: false,
    sidebarCollapsed: false,
    demoMode: true,
    apiBase: 'http://127.0.0.1:8000',
    role: IS_DEMO ? 'student' : '',
    onboarded: IS_DEMO,
    stage: '',
    subject: '',
    textbook: '',
    className: '',
    llm: Object.assign({}, DEFAULT_LLM)
  },
  savedAt: null
};

/* ---------- 主题数据（延迟加载，缺失时不崩溃） ---------- */

let topics = [];
let dataError = null;

export function getTopics() {
  return topics;
}

export function getDataError() {
  return dataError;
}

export async function initData() {
  try {
    const mod = await import('../../data/topics.js');
    const list = mod && mod.topics;
    if (Array.isArray(list) && list.length > 0) {
      topics = list;
      dataError = null;
    } else {
      topics = [];
      dataError = new Error('主题数据为空');
    }
  } catch (err) {
    topics = [];
    dataError = err instanceof Error ? err : new Error(String(err));
  }
  return topics;
}

export function getTopic(topicId) {
  if (!topicId) return undefined;
  return topics.find((t) => t.id === topicId);
}

export function matchTopic(text) {
  const query = String(text || '').toLowerCase().trim();
  if (!query) return null;
  let best = null;
  let bestLen = 0;
  for (const topic of topics) {
    const candidates = [topic.id, topic.title, topic.shortTitle, topic.domain, ...(topic.aliases || [])];
    for (const candidate of candidates) {
      if (!candidate) continue;
      const needle = String(candidate).toLowerCase().trim();
      if (needle.length < 2) continue;
      if (query.includes(needle) && needle.length > bestLen) {
        best = topic;
        bestLen = needle.length;
      }
    }
  }
  return best;
}

/* ---------- 订阅与持久化 ---------- */

const listeners = new Set();

export function subscribe(fn) {
  if (typeof fn !== 'function') return () => {};
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(event, detail) {
  for (const fn of Array.from(listeners)) {
    try {
      fn(state, event, detail);
    } catch (err) {
      console.warn('[store] 订阅回调失败', err);
    }
  }
}

let saveTimer = null;
let saveWaiters = [];
let savePendingNotified = false;

export function persist() {
  if (!savePendingNotified) {
    savePendingNotified = true;
    emit('save:pending');
  }
  if (saveTimer) clearTimeout(saveTimer);
  return new Promise((resolve) => {
    saveWaiters.push(resolve);
    saveTimer = setTimeout(async () => {
      saveTimer = null;
      state.savedAt = new Date().toISOString();
      let ok = false;
      try {
        ok = await saveState(state);
      } catch {
        ok = false;
      }
      savePendingNotified = false;
      const waiters = saveWaiters;
      saveWaiters = [];
      emit('save:done', ok);
      waiters.forEach((fn) => fn());
    }, 300);
  });
}

/* ---------- 读取 ---------- */

export function getSession(sessionId) {
  const id = sessionId === undefined || sessionId === null ? state.activeSessionId : sessionId;
  if (!id) return null;
  return state.sessions.find((s) => s.id === id) || null;
}

export function getActiveSession() {
  return getSession(state.activeSessionId);
}

/* ---------- 内部工具 ---------- */

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function trimSessions() {
  if (state.sessions.length > MAX_SESSIONS) {
    state.sessions = state.sessions
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, MAX_SESSIONS);
  }
}

function downstreamOf(topic, startId) {
  const result = new Set();
  if (!topic || !Array.isArray(topic.edges)) return result;
  const queue = [startId];
  const visited = new Set([startId]);
  while (queue.length) {
    const current = queue.shift();
    for (const edge of topic.edges) {
      if (edge.from !== current) continue;
      if (!visited.has(edge.to)) {
        visited.add(edge.to);
        result.add(edge.to);
        queue.push(edge.to);
      }
    }
  }
  return result;
}

function computeStale(session, topic) {
  const stale = new Set();
  for (const [nodeId, status] of Object.entries(session.overrides || {})) {
    if (!status || status === 'cleared') continue;
    for (const id of downstreamOf(topic, nodeId)) stale.add(id);
  }
  return Array.from(stale);
}

function normalizeSession(raw) {
  if (!raw || typeof raw !== 'object' || !raw.id || !raw.topicId) return null;
  return {
    id: String(raw.id),
    topicId: String(raw.topicId),
    question: String(raw.question || ''),
    createdAt: raw.createdAt || new Date().toISOString(),
    phase: PHASES.includes(raw.phase) ? raw.phase : 'idle',
    layer: Number.isFinite(raw.layer) ? Math.max(0, Math.min(3, raw.layer)) : 0,
    answers: raw.answers && typeof raw.answers === 'object' ? raw.answers : {},
    quizSubmitted: !!raw.quizSubmitted,
    quizResult: raw.quizResult || null,
    completedSteps: Array.isArray(raw.completedSteps) ? raw.completedSteps.slice() : [],
    checks: raw.checks && typeof raw.checks === 'object' ? raw.checks : {},
    retestAnswers: raw.retestAnswers && typeof raw.retestAnswers === 'object' ? raw.retestAnswers : {},
    retestSubmitted: !!raw.retestSubmitted,
    retestResult: raw.retestResult || null,
    overrides: raw.overrides && typeof raw.overrides === 'object' ? raw.overrides : {},
    stale: Array.isArray(raw.stale) ? raw.stale.slice() : [],
    bookmarked: !!raw.bookmarked
  };
}

function textOf(value, fallback) {
  if (typeof value === 'string') return value;
  return typeof fallback === 'string' ? fallback : '';
}

function normalizeLlm(raw, fallback) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const fb = fallback && typeof fallback === 'object' ? fallback : DEFAULT_LLM;
  const provider = LLM_PROVIDERS.includes(src.provider)
    ? src.provider
    : (LLM_PROVIDERS.includes(fb.provider) ? fb.provider : DEFAULT_LLM.provider);
  const temperature = Number(src.temperature);
  const fallbackTemperature = Number(fb.temperature);
  return {
    provider,
    baseUrl: textOf(src.baseUrl, textOf(fb.baseUrl, DEFAULT_LLM.baseUrl)),
    apiKey: textOf(src.apiKey, textOf(fb.apiKey, '')),
    model: textOf(src.model, textOf(fb.model, DEFAULT_LLM.model)),
    temperature: Number.isFinite(temperature)
      ? Math.max(0, Math.min(2, temperature))
      : (Number.isFinite(fallbackTemperature)
        ? Math.max(0, Math.min(2, fallbackTemperature))
        : DEFAULT_LLM.temperature)
  };
}

function normalizeSettings(raw) {
  const base = state.settings;
  if (!raw || typeof raw !== 'object') return base;
  const speeds = ['slow', 'normal', 'fast', 'instant'];
  // 旧状态没有 role：迁移为空角色并强制重新引导，不预设教师/学生
  const role = raw.role === 'student' || raw.role === 'teacher' ? raw.role : '';
  return {
    theme: raw.theme === 'dark' ? 'dark' : 'light',
    speed: speeds.includes(raw.speed) ? raw.speed : base.speed,
    reduceMotion: !!raw.reduceMotion,
    sidebarCollapsed: !!raw.sidebarCollapsed,
    demoMode: true,
    apiBase: typeof raw.apiBase === 'string' && raw.apiBase ? raw.apiBase : base.apiBase,
    // 演示模式强制学生身份，保证 9 幕学习诊断演示不受影响
    role: IS_DEMO ? 'student' : role,
    onboarded: IS_DEMO ? true : (role ? !!raw.onboarded : false),
    stage: textOf(raw.stage, ''),
    subject: textOf(raw.subject, ''),
    textbook: textOf(raw.textbook, ''),
    className: textOf(raw.className, ''),
    llm: normalizeLlm(raw.llm, base && base.llm)
  };
}

function normalizeVersion(raw) {
  if (!raw || typeof raw !== 'object' || !raw.data || typeof raw.data !== 'object') return null;
  return {
    id: String(raw.id || uid('v')),
    createdAt: raw.createdAt || new Date().toISOString(),
    note: typeof raw.note === 'string' ? raw.note : '',
    data: raw.data
  };
}

function normalizePlan(raw) {
  if (!raw || typeof raw !== 'object' || !raw.id) return null;
  let versions = Array.isArray(raw.versions) ? raw.versions.map(normalizeVersion).filter(Boolean) : [];
  if (!versions.length) {
    // 兼容早期扁平方案：整条记录即第 1 版数据
    const data = Object.assign({}, raw);
    ['versions', 'activeVersionId', 'updatedAt', 'status'].forEach((key) => delete data[key]);
    versions = [{
      id: uid('v'),
      createdAt: raw.createdAt || new Date().toISOString(),
      note: '',
      data
    }];
  }
  if (!versions.length) return null;
  const activeVersionId = versions.some((version) => version.id === raw.activeVersionId)
    ? raw.activeVersionId
    : versions[versions.length - 1].id;
  const latest = versions.find((version) => version.id === activeVersionId) || versions[versions.length - 1];
  return {
    id: String(raw.id),
    title: String(raw.title || (latest.data && latest.data.title) || '未命名方案'),
    createdAt: raw.createdAt || versions[0].createdAt,
    updatedAt: raw.updatedAt || versions[versions.length - 1].createdAt,
    activeVersionId,
    status: typeof raw.status === 'string' ? raw.status : '',
    versions
  };
}

function normalizeLibraryItem(raw) {
  if (!raw || typeof raw !== 'object' || !raw.title) return null;
  const confidence = Number(raw.confidence);
  return {
    id: String(raw.id || uid('src')),
    type: String(raw.type || '外部资料'),
    title: String(raw.title),
    locator: String(raw.locator || ''),
    excerpt: String(raw.excerpt || ''),
    confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0.7,
    scenarioId: String(raw.scenarioId || ''),
    addedAt: raw.addedAt || new Date().toISOString()
  };
}

const ZONE_IDS = [
  'home',
  'diagnosis',
  'graph',
  'path',
  'teacher',
  'history',
  'settings',
  'teacher-workbench',
  'teacher-graph',
  'plans',
  'library'
];

function normalizeTab(raw) {
  if (!raw || typeof raw !== 'object' || !raw.id) return null;
  const zone = ZONE_IDS.includes(raw.zone) ? raw.zone : 'home';
  return {
    id: String(raw.id),
    title: String(raw.title || '工作台'),
    zone,
    sessionId: raw.sessionId ? String(raw.sessionId) : null,
    params: raw.params && typeof raw.params === 'object' ? raw.params : {}
  };
}

/* ---------- 启动恢复 ---------- */

export async function hydrate() {
  let saved = null;
  try {
    saved = await loadState();
  } catch {
    saved = null;
  }
  if (!saved) {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (raw) saved = JSON.parse(raw);
    } catch {
      saved = null;
    }
  }
  if (!saved || typeof saved !== 'object') return false;

  if (Array.isArray(saved.sessions)) {
    state.sessions = saved.sessions
      .map(normalizeSession)
      .filter(Boolean)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, MAX_SESSIONS);
  }
  state.activeSessionId = state.sessions.some((s) => s.id === saved.activeSessionId)
    ? saved.activeSessionId
    : state.sessions[0]
      ? state.sessions[0].id
      : null;

  state.settings = normalizeSettings(saved.settings);

  state.plans = Array.isArray(saved.plans)
    ? saved.plans.map(normalizePlan).filter(Boolean).slice(0, 200)
    : [];
  state.activePlanId = state.plans.some((plan) => plan.id === saved.activePlanId)
    ? saved.activePlanId
    : null;
  state.library = Array.isArray(saved.library)
    ? saved.library.map(normalizeLibraryItem).filter(Boolean).slice(0, 500)
    : [];

  const defaultZone = state.settings.role === 'teacher' ? 'teacher-workbench' : 'home';
  let tabs = Array.isArray(saved.tabs)
    ? saved.tabs.map(normalizeTab).filter(Boolean).slice(0, 8)
    : [];
  if (!tabs.length) {
    tabs = [{ id: 'main', title: '工作台', zone: defaultZone, sessionId: null, params: {} }];
  }
  if (!tabs.some((t) => t.id === 'main')) {
    tabs.unshift({ id: 'main', title: '工作台', zone: defaultZone, sessionId: null, params: {} });
  }
  tabs = tabs.slice(0, 8).map((tab) => {
    if (tab.sessionId && !state.sessions.some((session) => session.id === tab.sessionId)) {
      return { ...tab, sessionId: null, params: {} };
    }
    return tab;
  });
  state.tabs = tabs;
  state.activeTabId = tabs.some((t) => t.id === saved.activeTabId) ? saved.activeTabId : tabs[0].id;
  state.savedAt = saved.savedAt || null;
  return true;
}

/* ---------- 动作 ---------- */

function touch(event) {
  emit(event || 'sessions');
  persist();
}

export const actions = {
  startSession(topicId, question) {
    const topic = getTopic(topicId);
    if (!topic) return null;
    const text = String(question || '').trim() || topic.question;
    const session = {
      id: uid('s'),
      topicId: topic.id,
      question: text,
      createdAt: new Date().toISOString(),
      phase: 'idle',
      layer: 0,
      answers: {},
      quizSubmitted: false,
      quizResult: null,
      completedSteps: [],
      checks: {},
      retestAnswers: {},
      retestSubmitted: false,
      retestResult: null,
      overrides: {},
      stale: [],
      bookmarked: false
    };
    state.sessions.unshift(session);
    trimSessions();
    state.activeSessionId = session.id;
    touch('sessions');

    // router 与 store 互相引用，使用动态导入避免顶层循环。
    // 新会话开独立标签，保留主标签「工作台」，符合桌面端多标签习惯。
    import('./router.js')
      .then((mod) => {
        const title = topic.shortTitle || topic.title || '知识诊断';
        const tabId = typeof mod.openTab === 'function'
          ? mod.openTab({ title, zone: 'diagnosis', sessionId: session.id })
          : '';
        if (!tabId && typeof mod.navigate === 'function') {
          mod.navigate('diagnosis', { sessionId: session.id });
        }
      })
      .catch(() => {});
    return session;
  },

  setPhase(sessionId, phase) {
    const session = getSession(sessionId);
    if (!session || !PHASES.includes(phase) || session.phase === phase) return session;
    session.phase = phase;
    touch('sessions');
    return session;
  },

  setLayer(sessionId, layer) {
    const session = getSession(sessionId);
    if (!session) return null;
    const next = Math.max(session.layer || 0, Math.min(3, Number(layer) || 0));
    if (next === session.layer) return session;
    session.layer = next;
    touch('sessions');
    return session;
  },

  answerQuestion(sessionId, stage, questionId, optionIndex) {
    const session = getSession(sessionId);
    if (!session || !questionId) return null;
    const target = stage === 'retest' ? session.retestAnswers : session.answers;
    const submitted = stage === 'retest' ? session.retestSubmitted : session.quizSubmitted;
    if (submitted) return session;
    target[questionId] = Number(optionIndex);
    touch('sessions');
    return session;
  },

  submitQuiz(sessionId) {
    const session = getSession(sessionId);
    if (!session) return null;
    const topic = getTopic(session.topicId);
    if (!topic || !Array.isArray(topic.quiz)) return null;
    if (session.quizSubmitted) return session.quizResult;
    const allAnswered = topic.quiz.every((q) => session.answers[q.id] !== undefined);
    if (!allAnswered) return null;

    let correct = 0;
    const weak = new Set();
    for (const q of topic.quiz) {
      const picked = session.answers[q.id];
      if (picked === q.answer) {
        correct += 1;
      } else {
        const mapped = topic.weakMap && topic.weakMap[q.id];
        const nodes = Array.isArray(mapped)
          ? mapped
          : Array.isArray(q.tests)
            ? q.tests
            : [];
        nodes.forEach((nodeId) => weak.add(nodeId));
      }
    }
    session.quizSubmitted = true;
    session.quizResult = { correct, total: topic.quiz.length, weak: Array.from(weak) };
    session.phase = 'path-ready';
    touch('sessions');
    return session.quizResult;
  },

  submitRetest(sessionId) {
    const session = getSession(sessionId);
    if (!session) return null;
    const topic = getTopic(session.topicId);
    if (!topic || !Array.isArray(topic.retest)) return null;
    if (session.retestSubmitted) return session.retestResult;
    const allAnswered = topic.retest.every((q) => session.retestAnswers[q.id] !== undefined);
    if (!allAnswered) return null;

    let correct = 0;
    const weak = new Set();
    for (const q of topic.retest) {
      if (session.retestAnswers[q.id] === q.answer) {
        correct += 1;
      } else {
        const mapped = topic.weakMap && topic.weakMap[q.id];
        const nodes = Array.isArray(mapped) ? mapped : Array.isArray(q.tests) ? q.tests : [];
        nodes.forEach((nodeId) => weak.add(nodeId));
      }
    }
    session.retestSubmitted = true;
    session.retestResult = { correct, total: topic.retest.length, weak: Array.from(weak) };
    session.phase = 're-diagnosing';
    touch('sessions');
    return session.retestResult;
  },

  toggleStep(sessionId, stepId) {
    const session = getSession(sessionId);
    if (!session || !stepId) return null;
    const index = session.completedSteps.indexOf(stepId);
    if (index >= 0) {
      session.completedSteps.splice(index, 1);
    } else {
      session.completedSteps.push(stepId);
      if (session.phase === 'path-ready') session.phase = 'executing';
    }
    if (session.completedSteps.length === 0 && session.phase === 'executing') {
      session.phase = 'path-ready';
    }
    touch('sessions');
    return session;
  },

  answerCheck(sessionId, stepId, optionIndex) {
    const session = getSession(sessionId);
    if (!session || !stepId) return null;
    session.checks[stepId] = Number(optionIndex);
    touch('sessions');
    return session;
  },

  setOverride(sessionId, nodeId, status) {
    const session = getSession(sessionId);
    if (!session || !nodeId) return null;
    if (!['understood', 'needs-work', 'cleared'].includes(status)) return session;
    if (status === 'cleared') delete session.overrides[nodeId];
    else session.overrides[nodeId] = status;
    const topic = getTopic(session.topicId);
    session.stale = computeStale(session, topic);
    touch('sessions');
    return session;
  },

  recalcSession(sessionId) {
    const session = getSession(sessionId);
    if (!session) return null;
    const cleared = session.stale.length;
    session.stale = [];
    touch('sessions');
    return cleared;
  },

  toggleBookmark(sessionId) {
    const session = getSession(sessionId);
    if (!session) return null;
    session.bookmarked = !session.bookmarked;
    touch('sessions');
    return session.bookmarked;
  },

  deleteSession(sessionId) {
    const index = state.sessions.findIndex((s) => s.id === sessionId);
    if (index < 0) return false;
    state.sessions.splice(index, 1);
    if (state.activeSessionId === sessionId) {
      state.activeSessionId = state.sessions[0] ? state.sessions[0].id : null;
    }
    // 移除指向该会话的标签；主标签回到工作台
    state.tabs = state.tabs.filter((tab) => tab.id === 'main' || tab.sessionId !== sessionId);
    const main = state.tabs.find((tab) => tab.id === 'main');
    if (main && main.sessionId === sessionId) {
      main.sessionId = null;
      main.params = {};
      if (main.zone === 'diagnosis') {
        main.zone = 'home';
        main.title = '工作台';
      }
    }
    if (!state.tabs.some((tab) => tab.id === state.activeTabId)) state.activeTabId = 'main';
    emit('sessions');
    emit('tabs');
    persist();
    return true;
  },

  setSettings(patch) {
    if (!patch || typeof patch !== 'object') return state.settings;
    const copy = Object.assign({}, patch);
    if (copy.llm && typeof copy.llm === 'object') {
      state.settings.llm = Object.assign({}, state.settings.llm, copy.llm);
      delete copy.llm;
    }
    Object.assign(state.settings, copy);
    state.settings.demoMode = true;
    state.settings = normalizeSettings(state.settings);
    emit('settings');
    persist();
    return state.settings;
  },

  setRole(role) {
    if (role !== 'teacher' && role !== 'student') return state.settings.role;
    const next = role;
    if (state.settings.role === next) return next;
    state.settings.role = next;
    // 角色切换后回到该角色的默认页，并重置为一个主标签
    state.tabs = [{
      id: 'main',
      title: '工作台',
      zone: next === 'teacher' ? 'teacher-workbench' : 'home',
      sessionId: null,
      params: {}
    }];
    state.activeTabId = 'main';
    emit('settings');
    emit('tabs');
    persist();
    return next;
  },

  setProfile(patch) {
    if (!patch || typeof patch !== 'object') return state.settings;
    const keys = ['stage', 'subject', 'textbook', 'className'];
    let changed = false;
    for (const key of keys) {
      if (typeof patch[key] === 'string' && state.settings[key] !== patch[key]) {
        state.settings[key] = patch[key];
        changed = true;
      }
    }
    if (!changed) return state.settings;
    emit('settings');
    persist();
    return state.settings;
  },

  setLlm(patch) {
    if (!patch || typeof patch !== 'object') return state.settings.llm;
    const next = Object.assign({}, state.settings.llm);
    for (const key of ['provider', 'baseUrl', 'model']) {
      if (typeof patch[key] === 'string') next[key] = patch[key].trim();
    }
    if (typeof patch.apiKey === 'string') next.apiKey = patch.apiKey.trim();
    if (patch.temperature !== undefined) {
      const value = Number(patch.temperature);
      if (Number.isFinite(value)) next.temperature = Math.max(0, Math.min(2, value));
    }
    state.settings.llm = normalizeLlm(next, state.settings.llm);
    emit('settings');
    persist();
    return state.settings.llm;
  },

  completeOnboarding() {
    if (state.settings.onboarded) return true;
    state.settings.onboarded = true;
    emit('settings');
    persist();
    return true;
  },

  savePlan(plan) {
    if (!plan || typeof plan !== 'object') return null;
    const now = new Date().toISOString();
    const data = Object.assign({}, plan);
    delete data.versions;
    delete data.activeVersionId;
    delete data.note;
    const existing = plan.id ? state.plans.find((item) => item.id === plan.id) : null;

    if (existing) {
      // 已有方案：追加新版本，保留历史版本
      const version = {
        id: uid('v'),
        createdAt: now,
        note: typeof plan.note === 'string' ? plan.note : '',
        data
      };
      existing.versions.push(version);
      existing.activeVersionId = version.id;
      existing.updatedAt = now;
      if (data.title) existing.title = String(data.title);
      state.activePlanId = existing.id;
      emit('plans');
      persist();
      return existing;
    }

    const id = plan.id ? String(plan.id) : uid('plan');
    data.id = id;
    if (!data.createdAt) data.createdAt = now;
    const version = {
      id: uid('v'),
      createdAt: now,
      note: '',
      data
    };
    const record = {
      id,
      title: String(data.title || '未命名方案'),
      createdAt: data.createdAt,
      updatedAt: now,
      activeVersionId: version.id,
      status: '',
      versions: [version]
    };
    state.plans.unshift(record);
    state.activePlanId = id;
    emit('plans');
    persist();
    return record;
  },

  deletePlan(id) {
    const index = state.plans.findIndex((item) => item.id === id);
    if (index < 0) return false;
    state.plans.splice(index, 1);
    if (state.activePlanId === id) state.activePlanId = null;
    emit('plans');
    persist();
    return true;
  },

  setActivePlan(id) {
    if (!id) {
      state.activePlanId = null;
      emit('plans');
      persist();
      return null;
    }
    const plan = state.plans.find((item) => item.id === id) || null;
    if (!plan) return null;
    state.activePlanId = plan.id;
    emit('plans');
    persist();
    return plan;
  },

  addLibrarySource(source) {
    if (!source || typeof source !== 'object') return null;
    const item = normalizeLibraryItem(source);
    if (!item) return null;
    state.library.unshift(item);
    if (state.library.length > 500) state.library = state.library.slice(0, 500);
    emit('library');
    persist();
    return item;
  },

  deleteLibrarySource(id) {
    const index = state.library.findIndex((item) => item.id === id);
    if (index < 0) return false;
    state.library.splice(index, 1);
    emit('library');
    persist();
    return true;
  },

  setSidebar(collapsed) {
    state.settings.sidebarCollapsed = !!collapsed;
    emit('settings');
    persist();
    return state.settings.sidebarCollapsed;
  }
};

export function getState() {
  return state;
}
