/* 智析 AI · 工作台 */

import { h, icon, fmtRelative } from '../core/ui.js';
import {
  state,
  getTopics,
  getDataError,
  matchTopic,
  actions,
  PHASE_LABELS
} from '../core/store.js';
import { navigate } from '../core/router.js';
import { openDialog } from '../core/feedback.js';

function topicPicker(textarea, inputHint) {
  const topics = getTopics();
  let dialog = null;

  const body = h(
    'div',
    { className: 'topic-picker' },
    h(
      'p',
      { className: 'topic-picker-note' },
      '当前知识库覆盖 3 个主题。请选择一个示例主题填入问题，或改写你的问题后重试。'
    )
  );

  if (!topics.length) {
    body.appendChild(
      h(
        'div',
        { className: 'notice notice-warn' },
        icon('alert-triangle', 16),
        h('span', null, '主题数据尚未加载，无法列出示例主题。请确认 data/topics.js 已就绪后刷新页面。')
      )
    );
  } else {
    const list = h('div', { className: 'topic-picker-list' });
    for (const topic of topics) {
      list.appendChild(
        h(
          'button',
          {
            className: 'topic-option',
            type: 'button',
            onClick: () => {
              textarea.value = topic.question;
              textarea.dispatchEvent(new Event('input', { bubbles: true }));
              textarea.focus();
              if (inputHint) inputHint.textContent = `已填入示例：${topic.title}`;
              if (dialog) dialog.close();
            }
          },
          h('span', { className: 'topic-option-icon' }, icon('book-open', 16)),
          h(
            'span',
            { className: 'topic-option-text' },
            h('span', { className: 'topic-option-title' }, topic.title),
            h('span', { className: 'topic-option-meta' }, `${topic.domain} · ${topic.shortTitle}`)
          ),
          icon('chevron-right', 16)
        )
      );
    }
    body.appendChild(list);
  }

  dialog = openDialog({
    title: '没有匹配到主题',
    body,
    actions: [{ label: '返回修改', variant: 'secondary' }]
  });
}

function buildOverview() {
  const sessions = state.sessions;
  const completed = sessions.filter((session) => {
    const topic = getTopics().find((item) => item.id === session.topicId);
    return !!(topic && Array.isArray(topic.path) && topic.path.length > 0 && session.completedSteps.length >= topic.path.length);
  }).length;
  const bookmarks = sessions.filter((session) => session.bookmarked).length;
  const latest = sessions[0];

  return h(
    'section',
    { className: 'card home-overview', 'aria-labelledby': 'overview-title' },
    h(
      'div',
      { className: 'overview-head' },
      h('h2', { className: 'section-title', id: 'overview-title' }, '本地学习概览'),
      h('span', { className: 'badge badge-neutral' }, icon('lock', 11), '只存本机')
    ),
    h(
      'div',
      { className: 'stat-grid' },
      h(
        'div',
        { className: 'stat' },
        h('div', { className: 'stat-num' }, String(sessions.length)),
        h('div', { className: 'stat-label' }, '探索记录')
      ),
      h(
        'div',
        { className: 'stat' },
        h('div', { className: 'stat-num' }, String(completed)),
        h('div', { className: 'stat-label' }, '已走完路径')
      ),
      h(
        'div',
        { className: 'stat' },
        h('div', { className: 'stat-num' }, String(bookmarks)),
        h('div', { className: 'stat-label' }, '收藏')
      )
    ),
    h(
      'div',
      { className: 'overview-foot' },
      icon('clock', 14),
      h('span', null, latest ? `最近一次 · ${fmtRelative(latest.createdAt)}` : '还没有探索记录')
    ),
    h('p', { className: 'overview-note' }, '这里不显示虚构的掌握度百分比，只记录本机上的探索与完成情况。')
  );
}

function buildSteps() {
  const steps = [
    ['提问', '用一句概念问题描述卡点，不必先整理错题。'],
    ['短测', '只做 1–2 道判别题，用来确认真正的前置断点。'],
    ['路径', '按步骤学习、标记完成，再用不同题目复测。']
  ];
  return h(
    'div',
    { className: 'home-steps', 'aria-labelledby': 'steps-title' },
    h('h3', { className: 'home-steps-title', id: 'steps-title' }, '这不是聊天框'),
    h(
      'ol',
      { className: 'step-list' },
      steps.map(([title, desc], index) =>
        h(
          'li',
          { className: 'step-item' },
          h('span', { className: 'step-num' }, String(index + 1)),
          h(
            'span',
            { className: 'step-text' },
            h('strong', null, title),
            h('span', null, desc)
          )
        )
      )
    )
  );
}

function buildRecent() {
  const sessions = state.sessions
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);

  const section = h(
    'section',
    { className: 'home-recent', 'aria-labelledby': 'recent-title' },
    h(
      'div',
      { className: 'section-head' },
      h(
        'div',
        null,
        h('h2', { className: 'section-title', id: 'recent-title' }, '最近探索'),
        h('p', { className: 'section-sub' }, '最多显示最近 3 条，完整记录在「探索记录」中。')
      ),
      sessions.length
        ? h(
            'button',
            { className: 'btn btn-ghost btn-sm', type: 'button', onClick: () => navigate('history') },
            '全部记录',
            icon('arrow-right', 14)
          )
        : null
    )
  );

  if (!sessions.length) {
    section.appendChild(
      h(
        'div',
        { className: 'card home-empty-card' },
        h(
          'div',
          { className: 'home-empty-intro' },
          h('span', { className: 'empty-icon' }, icon('clock', 20)),
          h(
            'div',
            { className: 'home-empty-copy' },
            h('h3', null, '还没有探索记录'),
            h('p', null, '从上面的输入框提一个概念问题，第一条记录会保存在本机。')
          )
        ),
        buildSteps(),
        h(
          'div',
          { className: 'home-empty-foot' },
          h(
            'span',
            { className: 'home-empty-note' },
            icon('info', 13),
            '本地模式 · 数据来自内置知识库，全部计算在本机完成'
          ),
          h(
            'button',
            { className: 'btn btn-secondary btn-sm', type: 'button', onClick: () => {
              const input = document.querySelector('.home-composer textarea');
              if (input) input.focus();
            } },
            '从第一个问题开始',
            icon('arrow-right', 14)
          )
        )
      )
    );
    return section;
  }

  const list = h('div', { className: 'card recent-list' });
  sessions.forEach((session, index) => {
    const topic = getTopics().find((item) => item.id === session.topicId);
    const total = topic && Array.isArray(topic.path) ? topic.path.length : 0;
    const done = session.completedSteps.length;
    const progress = total ? Math.min(100, Math.round((done / total) * 100)) : 0;
    const row = h(
      'button',
      {
        className: 'recent-row',
        type: 'button',
        title: '继续这次诊断',
        onClick: () => navigate('diagnosis', { sessionId: session.id })
      },
      h(
        'span',
        { className: 'recent-icon' },
        icon(session.bookmarked ? 'bookmark' : 'activity', 17)
      ),
      h(
        'span',
        { className: 'recent-main' },
        h('span', { className: 'recent-q' }, session.question),
        h(
          'span',
          { className: 'recent-meta' },
          topic ? topic.shortTitle || topic.title : '主题数据缺失',
          ' · ',
          fmtRelative(session.createdAt)
        )
      ),
      h(
        'span',
        { className: 'recent-side' },
        h('span', { className: 'badge badge-neutral recent-phase' }, PHASE_LABELS[session.phase] || session.phase),
        h(
          'span',
          { className: 'recent-progress' },
          h('span', { className: 'progress' }, h('i', { style: { width: `${progress}%` } })),
          h('span', { className: 'recent-progress-text' }, total ? `${done}/${total}` : '—')
        )
      )
    );
    list.appendChild(row);
    if (index < sessions.length - 1) list.appendChild(h('div', { className: 'divider' }));
  });
  section.appendChild(list);
  return section;
}

export function mount(root) {
  const topics = getTopics();
  const dataError = getDataError();

  const textarea = h('textarea', {
    id: 'home-question',
    className: 'composer-input',
    rows: '3',
    placeholder: '例如：为什么导数为正，函数就一定是递增的？',
    'aria-label': '描述你的概念问题'
  });

  const hint = h('span', { className: 'composer-hint-text' }, '当前知识库覆盖 3 个主题');
  const submitBtn = h(
    'button',
    {
      className: 'btn btn-primary btn-lg',
      type: 'button',
      disabled: true,
      onClick: () => submit()
    },
    '开始诊断',
    icon('arrow-right', 17)
  );

  function updateState() {
    const text = textarea.value.trim();
    submitBtn.disabled = !text || !topics.length;
    if (!text) {
      hint.textContent = '当前知识库覆盖 3 个主题';
      return;
    }
    const topic = matchTopic(text);
    if (topic) hint.textContent = `匹配主题：${topic.domain} · ${topic.title}`;
    else hint.textContent = '未匹配到主题，提交时可在 3 个示例主题中选择';
  }

  function submit() {
    const text = textarea.value.trim();
    if (!text) return;
    if (!topics.length) return;
    const topic = matchTopic(text);
    if (!topic) {
      topicPicker(textarea, hint);
      return;
    }
    actions.startSession(topic.id, text);
  }

  textarea.addEventListener('input', updateState);
  textarea.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      submit();
    }
  });

  const chips = h('div', { className: 'sample-chips', role: 'group', 'aria-label': '示例主题' });
  chips.appendChild(h('span', { className: 'sample-label' }, '试试：'));
  for (const topic of topics) {
    chips.appendChild(
      h(
        'button',
        {
          className: 'chip',
          type: 'button',
          title: topic.question,
          onClick: () => {
            textarea.value = topic.question;
            updateState();
            textarea.focus();
          }
        },
        icon('sparkles', 13),
        h('span', null, topic.shortTitle || topic.title)
      )
    );
  }

  const composer = h(
    'div',
    { className: 'composer home-composer card' },
    textarea,
    h(
      'div',
      { className: 'composer-foot' },
      h(
        'span',
        { className: 'composer-hint' },
        h('span', { className: 'composer-keys' },
          h('span', { className: 'kbd' }, 'Enter'),
          ' 提交',
          h('span', { className: 'composer-dot' }, '·'),
          h('span', { className: 'kbd' }, 'Shift+Enter'),
          ' 换行'
        ),
        hint
      ),
      submitBtn
    )
  );

  const notice = dataError || !topics.length
    ? h(
        'div',
        { className: 'notice notice-warn home-notice' },
        icon('alert-triangle', 17),
        h(
          'span',
          null,
          '主题内容尚未加载：data/topics.js 暂不可用。界面其他部分可正常使用，请确认数据文件存在后刷新页面。'
        ),
        h(
          'button',
          { className: 'btn btn-secondary btn-sm', type: 'button', onClick: () => window.location.reload() },
          '刷新页面'
        )
      )
    : null;

  const hero = h(
    'section',
    { className: 'home-hero' },
    h(
      'span',
      { className: 'hero-eyebrow' },
      icon('sparkles', 14),
      '概念级前置诊断'
    ),
    h('h1', { className: 'hero-title' }, '从一个问题出发，找到真正卡住你的那一块。'),
    h(
      'p',
      { className: 'hero-sub' },
      '先用一句概念问题描述卡点，再做两道判别题确认前置断点，最后拿到一条能执行、能复测的学习路径。'
    ),
    notice,
    composer,
    topics.length ? chips : null
  );

  root.appendChild(
    h(
      'div',
      { className: 'home' },
      hero,
      h(
        'div',
        { className: 'home-body' },
        h('div', { className: 'home-main' }, buildRecent()),
        h('aside', { className: 'home-rail' }, buildOverview())
      )
    )
  );

  updateState();
  const focusTimer = setTimeout(() => {
    try {
      textarea.focus();
    } catch {
      /* 忽略 */
    }
  }, 60);

  return () => clearTimeout(focusTimer);
}
