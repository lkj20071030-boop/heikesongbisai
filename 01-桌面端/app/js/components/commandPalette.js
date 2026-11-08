/* 智析 AI · 命令面板（Ctrl+K） */

import { h, icon, fmtRelative } from '../core/ui.js';
import { state, actions, getTopic } from '../core/store.js';
import { ZONES, navigate, openTab } from '../core/router.js';
import { toast, openDialog } from '../core/feedback.js';

let currentDialog = null;

function fuzzyScore(text, query) {
  const target = String(text || '').toLowerCase();
  const q = String(query || '').toLowerCase().trim();
  if (!q) return 1;
  const direct = target.indexOf(q);
  if (direct >= 0) return 1000 - direct;
  let cursor = 0;
  let score = 0;
  let streak = 0;
  for (const ch of q) {
    const index = target.indexOf(ch, cursor);
    if (index < 0) return -1;
    score += 1 + streak;
    streak = index === cursor ? streak + 1 : 0;
    cursor = index + 1;
  }
  return score;
}

function currentRole() {
  return state.settings.role === 'teacher' ? 'teacher' : 'student';
}

function buildItems() {
  const items = [];
  const itemsPush = (item) => items.push(item);
  const role = currentRole();
  const isTeacher = role === 'teacher';

  if (isTeacher) {
    itemsPush({
      id: 'new-plan',
      group: '操作',
      title: '新建教学方案',
      hint: '回到教师工作台，输入本次教学需求',
      icon: 'sparkles',
      shortcut: 'Ctrl+1',
      keywords: '生成 方案 教学 新建 开始',
      run: () => navigate('teacher-workbench')
    });
  } else {
    itemsPush({
      id: 'new-diagnosis',
      group: '操作',
      title: '新建诊断',
      hint: '回到工作台，从一个概念问题开始',
      icon: 'sparkles',
      shortcut: 'Ctrl+1',
      keywords: '提问 新建 开始',
      run: () => {
        navigate('home');
        setTimeout(() => {
          const input = document.querySelector('.home-composer textarea');
          if (input) input.focus();
        }, 120);
      }
    });
  }

  itemsPush({
    id: 'new-tab',
    group: '操作',
    title: '新建工作台标签',
    hint: '最多同时打开 8 个标签',
    icon: 'plus',
    shortcut: 'Ctrl+T',
    keywords: '标签 tab',
    run: () => openTab({ title: '工作台', zone: isTeacher ? 'teacher-workbench' : 'home' })
  });
  itemsPush({
    id: 'toggle-theme',
    group: '操作',
    title: state.settings.theme === 'dark' ? '切换到亮色主题' : '切换到暗色主题',
    hint: '外观设置即时生效',
    icon: state.settings.theme === 'dark' ? 'sun' : 'moon',
    keywords: '主题 外观 dark light',
    run: () => {
      const next = state.settings.theme === 'dark' ? 'light' : 'dark';
      actions.setSettings({ theme: next });
      toast(`已切换到${next === 'dark' ? '暗色' : '亮色'}主题`, 'success');
    }
  });
  itemsPush({
    id: 'shortcuts',
    group: '操作',
    title: '显示快捷键',
    hint: '查看全局键盘操作',
    icon: 'command',
    keywords: '键盘 帮助 快捷键',
    run: () => showShortcuts()
  });

  for (const zone of ZONES) {
    itemsPush({
      id: `zone-${zone.id}`,
      group: '页面',
      title: zone.label,
      hint: `切换到${zone.label}`,
      icon: zone.icon,
      shortcut: zone.shortcut,
      keywords: `${zone.id} 页面 导航`,
      run: () => navigate(zone.id)
    });
  }

  if (isTeacher) {
    const plans = (state.plans || []).slice(0, 5);
    for (const plan of plans) {
      itemsPush({
        id: `plan-${plan.id}`,
        group: '最近方案',
        title: `打开：${plan.title}`,
        hint: `${(plan.versions || []).length} 个版本 · ${fmtRelative(plan.updatedAt || plan.createdAt)}`,
        icon: 'layers',
        keywords: '方案 最近 继续',
        run: () => {
          actions.setActivePlan(plan.id);
          navigate('plans');
        }
      });
    }
    return items;
  }

  const recent = state.sessions.slice(0, 5);
  for (const session of recent) {
    const topic = getTopic(session.topicId);
    const title = session.question.length > 34 ? `${session.question.slice(0, 34)}…` : session.question;
    itemsPush({
      id: `session-${session.id}`,
      group: '最近记录',
      title: `继续：${title}`,
      hint: `${topic ? topic.shortTitle || topic.title : session.topicId} · ${fmtRelative(session.createdAt)}`,
      icon: 'clock',
      keywords: `${session.topicId} ${session.question}`,
      run: () => {
        const tabId = openTab({
          title: topic ? topic.shortTitle || '知识诊断' : '知识诊断',
          zone: 'diagnosis',
          sessionId: session.id
        });
        if (!tabId) navigate('diagnosis', { sessionId: session.id });
      }
    });
  }

  return items;
}

function showShortcuts() {
  const rows = [
    ['Ctrl+K', '打开命令面板'],
    ['Ctrl+T', '新建工作台标签'],
    ['Ctrl+W', '关闭当前标签（主标签除外）'],
    ['Ctrl+1 – Ctrl+7', '切换侧栏页面'],
    ['Enter', '在问题输入框中提交诊断'],
    ['Shift+Enter', '在输入框中换行'],
    ['Esc', '关闭对话框或命令面板']
  ];
  const body = h(
    'div',
    { className: 'shortcut-list' },
    rows.map(([keys, label]) =>
      h(
        'div',
        { className: 'shortcut-row' },
        h('span', { className: 'kbd shortcut-kbd' }, keys),
        h('span', { className: 'shortcut-label' }, label)
      )
    )
  );
  openDialog({ title: '键盘快捷键', body, actions: [{ label: '知道了', variant: 'secondary' }] });
}

export function openCommandPalette() {
  if (currentDialog && currentDialog.isConnected) {
    const input = currentDialog.querySelector('.palette-input');
    if (input) input.focus();
    return;
  }

  const items = buildItems();
  let filtered = items.slice();
  let activeIndex = 0;
  let closed = false;

  const input = h('input', {
    className: 'palette-input',
    type: 'text',
    placeholder: '搜索命令、页面或最近记录…',
    'aria-label': '搜索命令',
    autocomplete: 'off',
    spellcheck: 'false'
  });
  const list = h('div', { className: 'palette-list', role: 'listbox', 'aria-label': '命令列表' });
  const empty = h('div', { className: 'palette-empty' }, '没有匹配的命令，换个关键词试试。');
  empty.hidden = true;

  const dialog = h('dialog', { className: 'palette', 'aria-label': '命令面板' });

  function closePalette() {
    if (closed) return;
    closed = true;
    currentDialog = null;
    try {
      dialog.close();
    } catch {
      dialog.remove();
    }
  }

  function run(item) {
    closePalette();
    try {
      item.run();
    } catch (err) {
      console.warn('[palette] 命令执行失败', err);
      toast('命令执行失败，请重试。', 'error');
    }
  }

  function render() {
    const query = input.value;
    filtered = items
      .map((item) => ({
        item,
        score: Math.max(
          fuzzyScore(item.title, query),
          fuzzyScore(item.hint || '', query) - 30,
          item.keywords ? fuzzyScore(item.keywords, query) - 60 : -1
        )
      }))
      .filter((entry) => entry.score >= 0)
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.item);

    activeIndex = Math.min(activeIndex, Math.max(0, filtered.length - 1));
    list.replaceChildren();

    if (!filtered.length) {
      empty.hidden = false;
      list.setAttribute('aria-activedescendant', '');
      return;
    }
    empty.hidden = true;

    let currentGroup = null;
    filtered.forEach((item, index) => {
      if (item.group && item.group !== currentGroup) {
        currentGroup = item.group;
        list.appendChild(h('div', { className: 'palette-group' }, item.group));
      }
      const row = h(
        'div',
        {
          className: `palette-item${index === activeIndex ? ' active' : ''}`,
          role: 'option',
          id: `palette-opt-${index}`,
          'aria-selected': index === activeIndex ? 'true' : 'false',
          onMouseenter: () => {
            activeIndex = index;
            updateActive();
          },
          onClick: () => run(item)
        },
        h('span', { className: 'palette-item-icon' }, icon(item.icon || 'command', 16)),
        h(
          'span',
          { className: 'palette-item-text' },
          h('span', { className: 'palette-item-title' }, item.title),
          item.hint ? h('span', { className: 'palette-item-hint' }, item.hint) : null
        ),
        item.shortcut ? h('span', { className: 'kbd' }, item.shortcut) : null
      );
      list.appendChild(row);
    });
    updateActive();
  }

  function updateActive() {
    const rows = list.querySelectorAll('.palette-item');
    rows.forEach((row, index) => {
      const active = index === activeIndex;
      row.classList.toggle('active', active);
      row.setAttribute('aria-selected', active ? 'true' : 'false');
      if (active) row.scrollIntoView({ block: 'nearest' });
    });
    const activeRow = rows[activeIndex];
    if (activeRow) input.setAttribute('aria-activedescendant', activeRow.id);
  }

  input.addEventListener('input', () => {
    activeIndex = 0;
    render();
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      activeIndex = filtered.length ? (activeIndex + 1) % filtered.length : 0;
      updateActive();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      activeIndex = filtered.length ? (activeIndex - 1 + filtered.length) % filtered.length : 0;
      updateActive();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const item = filtered[activeIndex];
      if (item) run(item);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closePalette();
    }
  });

  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closePalette();
  });
  dialog.addEventListener('close', () => {
    closed = true;
    if (currentDialog === dialog) currentDialog = null;
    dialog.remove();
  });

  dialog.append(
    h(
      'div',
      { className: 'palette-head' },
      icon('search', 17),
      input,
      h('span', { className: 'palette-esc' }, h('span', { className: 'kbd' }, 'Esc'))
    ),
    list,
    empty,
    h(
      'div',
      { className: 'palette-foot' },
      h('span', null, h('span', { className: 'kbd' }, '↑↓'), ' 选择'),
      h('span', null, h('span', { className: 'kbd' }, 'Enter'), ' 执行'),
      h('span', { className: 'palette-foot-note' }, '本地模式 · 本地操作')
    )
  );

  document.body.appendChild(dialog);
  currentDialog = dialog;

  try {
    dialog.showModal();
  } catch {
    dialog.setAttribute('open', '');
  }
  render();
  setTimeout(() => input.focus(), 20);
}
