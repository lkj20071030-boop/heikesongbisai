/* history.js · 探索记录
 * 依赖 core/store.js：state、actions.toggleBookmark、actions.deleteSession、getTopic、subscribe
 * 依赖 core/router.js：navigate、openTab
 * 依赖 core/ui.js：h、icon、fmtDate、fmtRelative
 * 依赖 core/feedback.js：toast、confirmDialog
 */

import { state, actions, getTopic, subscribe } from '../core/store.js';
import { navigate, openTab } from '../core/router.js';
import { h, icon, fmtDate, fmtRelative } from '../core/ui.js';
import { toast, confirmDialog } from '../core/feedback.js';

const PHASES = {
  idle: { label: '未开始', badge: 'neutral' },
  parsing: { label: '解析问题', badge: 'info' },
  expanding: { label: '展开前置', badge: 'info' },
  confirming: { label: '待确认', badge: 'warning' },
  quizzing: { label: '短测中', badge: 'warning' },
  'path-ready': { label: '路径已生成', badge: 'accent' },
  executing: { label: '学习中', badge: 'accent' },
  're-diagnosing': { label: '复测中', badge: 'accent' }
};

const FILTERS = [
  { id: 'all', label: '全部' },
  { id: 'active', label: '进行中' },
  { id: 'done', label: '已完成' },
  { id: 'starred', label: '已收藏' }
];

function el(tag, cls, text) {
  const node = h(tag, cls ? { className: cls } : {});
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

function iconBtn(name, label, onClick) {
  const btn = el('button', 'icon-btn');
  btn.type = 'button';
  btn.setAttribute('aria-label', label);
  btn.title = label;
  btn.appendChild(icon(name, 18));
  btn.addEventListener('click', onClick);
  return btn;
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

function safeTopic(topicId) {
  if (!topicId) return null;
  try {
    return getTopic(topicId) || null;
  } catch (err) {
    return null;
  }
}

function safeRelative(iso) {
  try {
    return fmtRelative(iso);
  } catch (err) {
    return '';
  }
}

function safeDate(iso) {
  try {
    return fmtDate(iso);
  } catch (err) {
    return String(iso || '');
  }
}

function topicName(topic, session) {
  if (topic) return topic.shortTitle || topic.title || topic.id;
  return session.topicId || '未知主题';
}

function phaseOf(session) {
  if (session.retestSubmitted) return { label: '已完成', badge: 'success' };
  return PHASES[session.phase] || { label: '进行中', badge: 'neutral' };
}

function progressOf(session, topic) {
  const steps = topic && Array.isArray(topic.path) ? topic.path : [];
  if (!steps.length) return { done: 0, total: 0, text: '—' };
  const completed = Array.isArray(session.completedSteps) ? session.completedSteps : [];
  const done = steps.filter((step) => completed.indexOf(step.id) !== -1).length;
  return { done, total: steps.length, text: done + ' / ' + steps.length };
}

export function mount(root, ctx) {
  const context = ctx || {};
  let query = '';
  let filter = 'all';
  let debounceTimer = 0;
  let mounted = true;
  let unsubscribe = null;

  const page = el('div', 'v-page history-page');
  const head = el('header', 'v-head');
  const headMain = el('div', 'v-head-main');
  headMain.appendChild(el('h1', 'v-title', '探索记录'));
  const subtitle = el('p', 'v-sub', '所有诊断与学习记录仅保存在本机 · 知识库数据');
  headMain.appendChild(subtitle);
  head.appendChild(headMain);

  const headActions = el('div', 'v-head-actions');
  headActions.appendChild(actionBtn('primary', '新建诊断', 'plus', () => navigate('home')));
  head.appendChild(headActions);
  page.appendChild(head);

  const toolbar = el('div', 'card history-toolbar');
  const searchBox = el('div', 'history-search');
  searchBox.appendChild(icon('search', 17));
  const searchInput = h('input', { className: 'input history-search-input' });
  searchInput.type = 'search';
  searchInput.placeholder = '搜索问题、主题或关键词';
  searchInput.setAttribute('aria-label', '搜索探索记录');
  searchBox.appendChild(searchInput);
  toolbar.appendChild(searchBox);

  const segmented = el('div', 'segmented history-filters');
  segmented.setAttribute('role', 'group');
  segmented.setAttribute('aria-label', '筛选探索记录');
  const filterButtons = [];
  FILTERS.forEach((item) => {
    const btn = el('button', '', item.label);
    btn.type = 'button';
    btn.setAttribute('aria-pressed', item.id === filter ? 'true' : 'false');
    btn.addEventListener('click', () => {
      filter = item.id;
      syncFilters();
      renderRows();
    });
    filterButtons.push({ id: item.id, btn });
    segmented.appendChild(btn);
  });
  toolbar.appendChild(segmented);

  const countLabel = el('span', 'history-count', '');
  toolbar.appendChild(countLabel);
  page.appendChild(toolbar);

  const listHost = el('div', 'history-list');
  page.appendChild(listHost);

  root.textContent = '';
  root.appendChild(page);

  function syncFilters() {
    filterButtons.forEach((item) => {
      item.btn.setAttribute('aria-pressed', item.id === filter ? 'true' : 'false');
    });
  }

  function allSessions() {
    const sessions = state && Array.isArray(state.sessions) ? state.sessions.slice() : [];
    return sessions.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  }

  function filteredSessions() {
    const total = allSessions();
    const needle = query.trim().toLowerCase();
    return total.filter((session) => {
      if (filter === 'active' && session.retestSubmitted) return false;
      if (filter === 'done' && !session.retestSubmitted) return false;
      if (filter === 'starred' && !session.bookmarked) return false;
      if (!needle) return true;
      const topic = safeTopic(session.topicId);
      const haystack = [
        session.question || '',
        topic ? (topic.title || '') : '',
        topic ? (topic.shortTitle || '') : '',
        topic ? (topic.domain || '') : '',
        phaseOf(session).label
      ].join(' ').toLowerCase();
      return haystack.indexOf(needle) !== -1;
    });
  }

  function updateCount() {
    const total = allSessions().length;
    const shown = filteredSessions().length;
    subtitle.textContent = total + ' 条本地记录 · 仅保存在本机 · 知识库数据';
    countLabel.textContent = shown === total ? ('共 ' + total + ' 条') : ('显示 ' + shown + ' / ' + total + ' 条');
  }

  async function removeSession(session) {
    let ok = false;
    try {
      ok = await confirmDialog({
        title: '删除这条探索记录？',
        body: '将删除该问题、短测结果、学习进度与复测记录。删除后不可恢复。',
        okText: '删除',
        danger: true
      });
    } catch (err) {
      ok = window.confirm('删除这条探索记录？删除后不可恢复。');
    }
    if (!ok || !mounted) return;

    let done = false;
    try {
      if (actions && typeof actions.deleteSession === 'function') {
        actions.deleteSession(session.id);
        done = true;
      }
    } catch (err) {
      done = false;
    }
    if (!done) {
      if (state && Array.isArray(state.sessions)) {
        state.sessions = state.sessions.filter((item) => item.id !== session.id);
      }
      renderRows();
    }
    toast('已删除该探索记录', 'success');
  }

  function toggleBookmark(session) {
    const next = !session.bookmarked;
    let done = false;
    try {
      if (actions && typeof actions.toggleBookmark === 'function') {
        actions.toggleBookmark(session.id);
        done = true;
      }
    } catch (err) {
      done = false;
    }
    if (!done) {
      session.bookmarked = next;
      renderRows();
    }
    toast(next ? '已加入收藏' : '已取消收藏', 'success');
  }

  function continueSession(session) {
    const topic = safeTopic(session.topicId);
    const title = topicName(topic, session);
    const learningPhases = ['path-ready', 'executing', 're-diagnosing'];
    const zone = session.retestSubmitted || learningPhases.indexOf(session.phase) !== -1 ? 'path' : 'diagnosis';
    let opened = false;
    try {
      const tabId = openTab({ title, zone, sessionId: session.id });
      opened = !!tabId;
    } catch (err) {
      opened = false;
    }
    if (!opened) {
      try {
        navigate(zone, { sessionId: session.id });
        opened = true;
      } catch (err2) {
        toast('无法打开该记录，请返回工作台重试', 'error');
        return;
      }
    }
    toast('已恢复「' + title + '」的本地会话', 'success');
  }

  function buildRow(session) {
    const topic = safeTopic(session.topicId);
    const phase = phaseOf(session);
    const progress = progressOf(session, topic);
    const row = el('li', 'history-row');

    const main = el('div', 'history-main');
    const titleRow = el('div', 'history-title-row');
    titleRow.appendChild(el('span', 'history-question', session.question || '未命名问题'));
    tagRowAppend(titleRow, topic, session);
    main.appendChild(titleRow);

    const meta = el('div', 'history-meta');
    const time = el('time', 'history-time', safeRelative(session.createdAt));
    time.setAttribute('datetime', session.createdAt || '');
    time.title = safeDate(session.createdAt);
    meta.appendChild(time);
    meta.appendChild(el('span', 'badge badge-' + phase.badge, phase.label));

    const progressBox = el('span', 'history-progress');
    progressBox.appendChild(el('span', 'history-progress-text', '路径 ' + progress.text));
    if (progress.total) {
      const bar = el('span', 'progress history-progress-bar');
      const fill = el('i', '');
      fill.style.width = Math.round(progress.done / progress.total * 100) + '%';
      bar.appendChild(fill);
      progressBox.appendChild(bar);
    }
    meta.appendChild(progressBox);
    main.appendChild(meta);
    row.appendChild(main);

    const rowActions = el('div', 'history-actions');
    const star = iconBtn('bookmark', session.bookmarked ? '取消收藏' : '收藏这条记录', () => toggleBookmark(session));
    star.classList.add('history-star');
    if (session.bookmarked) {
      star.classList.add('is-on');
      star.setAttribute('aria-pressed', 'true');
    } else {
      star.setAttribute('aria-pressed', 'false');
    }
    rowActions.appendChild(star);
    rowActions.appendChild(actionBtn('secondary', '继续', 'arrow-right', () => continueSession(session), {
      size: 'sm',
      title: '在标签中恢复该会话'
    }));
    rowActions.appendChild(iconBtn('trash', '删除这条记录', () => removeSession(session)));
    row.appendChild(rowActions);

    return row;
  }

  function tagRowAppend(titleRow, topic, session) {
    if (topic) {
      titleRow.appendChild(el('span', 'badge badge-accent history-topic', topic.shortTitle || topic.title || topic.id));
    } else {
      titleRow.appendChild(el('span', 'badge badge-neutral history-topic', session.topicId || '未知主题'));
    }
  }

  function buildEmpty() {
    const total = allSessions().length;
    const empty = el('div', 'empty history-empty');
    const iconBox = el('div', 'empty-icon');
    iconBox.appendChild(icon(total ? 'search' : 'sparkles', 24));
    empty.appendChild(iconBox);
    if (!total) {
      empty.appendChild(el('h3', '', '还没有探索记录'));
      empty.appendChild(el('p', '', '从一个概念问题开始。诊断过程、学习进度与复测结果都会保存在本机，刷新或切换标签不会丢失。'));
      empty.appendChild(actionBtn('secondary', '去工作台提问', 'arrow-right', () => navigate('home')));
    } else {
      empty.appendChild(el('h3', '', '没有匹配的记录'));
      empty.appendChild(el('p', '', '试试更换关键词，或切换筛选条件。当前筛选：' + (FILTERS.find((item) => item.id === filter) || FILTERS[0]).label + '。'));
      const clear = actionBtn('secondary', '清除筛选', 'refresh', () => {
        query = '';
        filter = 'all';
        searchInput.value = '';
        syncFilters();
        renderRows();
      });
      empty.appendChild(clear);
    }
    return empty;
  }

  function renderRows() {
    if (!mounted) return;
    updateCount();
    listHost.textContent = '';
    const sessions = filteredSessions();
    if (!sessions.length) {
      listHost.appendChild(buildEmpty());
      return;
    }
    const list = el('ul', 'history-rows');
    sessions.forEach((session) => list.appendChild(buildRow(session)));
    listHost.appendChild(list);
  }

  searchInput.addEventListener('input', () => {
    query = searchInput.value;
    if (debounceTimer) window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      debounceTimer = 0;
      renderRows();
    }, 180);
  });
  searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      if (debounceTimer) {
        window.clearTimeout(debounceTimer);
        debounceTimer = 0;
      }
      renderRows();
    }
  });

  try {
    if (typeof subscribe === 'function') {
      unsubscribe = subscribe((_state, event) => {
        if (event === 'save:pending' || event === 'save:done' || event === 'settings') return;
        if (mounted) renderRows();
      });
    }
  } catch (err) {
    unsubscribe = null;
  }

  renderRows();

  return function cleanup() {
    mounted = false;
    if (debounceTimer) window.clearTimeout(debounceTimer);
    if (typeof unsubscribe === 'function') unsubscribe();
    root.textContent = '';
  };
}
