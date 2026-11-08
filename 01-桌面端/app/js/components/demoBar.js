/* 智析 AI · 演示控制条与讲解面板
   只被 core/demo.js 使用；所有样式限定在 .demo-bar / .demo-narration 内。 */

import { h, icon } from '../core/ui.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function pauseIcon(size = 16) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.8');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = '<path d="M9 5v14"/><path d="M15 5v14"/>';
  return svg;
}

function iconButton(name, label, onClick, extraClass) {
  const btn = h(
    'button',
    {
      className: `demo-btn ${extraClass || ''}`.trim(),
      type: 'button',
      title: label,
      'aria-label': label,
      onClick
    },
    icon(name, 16)
  );
  return btn;
}

export function createDemoBar({ acts = [], handlers = {} } = {}) {
  let currentActs = Array.isArray(acts) ? acts.slice() : [];

  const refs = {
    meta: h('span', { className: 'demo-bar-meta' }, '演示 · 待开始'),
    title: h('span', { className: 'demo-bar-title' }, ''),
    dots: [],
    speed: [],
    play: null,
    prev: null,
    next: null,
    narrationLabel: h('span', { className: 'demo-narration-label' }, '讲解'),
    narrationText: h('p', { className: 'demo-narration-text' }, ''),
    narrationToggle: null
  };

  const prev = iconButton('arrow-left', '上一幕', handlers.onPrev, 'demo-nav-btn');
  prev.dataset.prev = '1';
  refs.prev = prev;

  const play = h(
    'button',
    {
      className: 'demo-btn demo-play-btn',
      type: 'button',
      title: '播放演示',
      'aria-label': '播放演示',
      onClick: handlers.onTogglePlay
    },
    icon('play', 18)
  );
  refs.play = play;

  const next = iconButton('arrow-right', '下一幕', handlers.onNext, 'demo-nav-btn');
  next.dataset.next = '1';
  refs.next = next;

  const dotsWrap = h('div', { className: 'demo-dots', role: 'group', 'aria-label': '幕次进度' });

  function renderDots() {
    refs.dots = [];
    dotsWrap.replaceChildren(
      ...currentActs.map((act, index) => {
        const dot = h('button', {
          className: 'demo-dot',
          type: 'button',
          title: `第 ${index + 1} 幕 · ${act.title}`,
          'aria-label': `跳转到第 ${index + 1} 幕：${act.title}`,
          'aria-current': 'false',
          onClick: () => handlers.onSeek && handlers.onSeek(index)
        });
        refs.dots.push(dot);
        return dot;
      })
    );
  }

  renderDots();

  const speedWrap = h('div', { className: 'demo-speed', role: 'group', 'aria-label': '播放速度' });
  [0.8, 1, 1.2].forEach((value) => {
    const btn = h(
      'button',
      {
        className: 'demo-speed-btn',
        type: 'button',
        title: `播放速度 ${value}x`,
        'aria-label': `播放速度 ${value}x`,
        'aria-pressed': value === 1 ? 'true' : 'false',
        onClick: () => handlers.onSpeed && handlers.onSpeed(value)
      },
      `${value}x`
    );
    refs.speed.push({ value, btn });
    speedWrap.appendChild(btn);
  });

  const resetBtn = h(
    'button',
    {
      className: 'demo-text-btn',
      type: 'button',
      title: '重置演示并回到封面',
      'aria-label': '重置演示并回到封面',
      onClick: handlers.onReset
    },
    icon('refresh', 14),
    h('span', null, '重置')
  );

  const coverBtn = h(
    'button',
    {
      className: 'demo-text-btn',
      type: 'button',
      title: '回到演示封面（Esc）',
      'aria-label': '回到演示封面',
      onClick: handlers.onCover
    },
    icon('home', 14),
    h('span', null, '回封面')
  );

  const bar = h(
    'div',
    { className: 'demo-bar', role: 'region', 'aria-label': '演示控制条' },
    h(
      'div',
      { className: 'demo-bar-left' },
      h('span', { className: 'demo-bar-mark', 'aria-hidden': 'true' }, icon('sparkles', 16)),
      h('div', { className: 'demo-bar-labels' }, refs.meta, refs.title)
    ),
    h(
      'div',
      { className: 'demo-bar-center' },
      prev,
      play,
      next,
      dotsWrap
    ),
    h(
      'div',
      { className: 'demo-bar-right' },
      speedWrap,
      h('span', { className: 'demo-bar-sep', 'aria-hidden': 'true' }),
      resetBtn,
      coverBtn
    )
  );
  bar.hidden = true;

  const toggle = h(
    'button',
    {
      className: 'demo-narration-toggle',
      type: 'button',
      title: '折叠讲解面板',
      'aria-label': '折叠讲解面板',
      'aria-expanded': 'true',
      onClick: () => {
        const collapsed = narration.classList.toggle('is-collapsed');
        toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
        toggle.title = collapsed ? '展开讲解面板' : '折叠讲解面板';
        toggle.setAttribute('aria-label', toggle.title);
        toggle.replaceChildren(icon(collapsed ? 'chevron-right' : 'chevron-down', 15));
      }
    },
    icon('chevron-down', 15)
  );
  refs.narrationToggle = toggle;

  const narration = h(
    'div',
    { className: 'demo-narration', role: 'status', 'aria-live': 'polite' },
    h(
      'div',
      { className: 'demo-narration-head' },
      h('span', { className: 'demo-narration-dot', 'aria-hidden': 'true' }),
      refs.narrationLabel,
      h('span', { className: 'demo-narration-keys' }, h('span', { className: 'demo-kbd' }, '→'), h('span', { className: 'demo-kbd' }, '←'), '切换'),
      h('span', { className: 'spacer' }),
      toggle
    ),
    refs.narrationText
  );
  narration.hidden = true;

  function update(view) {
    const total = currentActs.length;
    const index = Number.isInteger(view.index) ? view.index : -1;
    const act = index >= 0 && index < total ? currentActs[index] : null;

    if (act) {
      refs.meta.textContent = `演示 ${index + 1}/${total}`;
      refs.title.textContent = `· ${act.title}`;
      refs.narrationLabel.textContent = `讲解 · ${index + 1}/${total}`;
      refs.narrationText.textContent = act.narration || '';
    } else {
      refs.meta.textContent = '演示 · 自由浏览';
      refs.title.textContent = '· 选择一个幕次开始';
      refs.narrationLabel.textContent = '讲解';
      refs.narrationText.textContent = `演示脚本共 ${total} 幕。可点击播放从头开始，或选择任意进度点跳转。`;
    }

    refs.prev.disabled = index <= 0;
    refs.next.disabled = index < 0 || index >= total - 1;
    refs.dots.forEach((dot, i) => {
      dot.classList.toggle('is-active', i === index);
      dot.classList.toggle('is-done', i < index);
      dot.setAttribute('aria-current', i === index ? 'step' : 'false');
    });

    const playing = !!view.playing;
    refs.play.replaceChildren(playing ? pauseIcon(18) : icon('play', 18));
    refs.play.title = playing ? '暂停自动播放' : '开始自动播放';
    refs.play.setAttribute('aria-label', refs.play.title);
    refs.play.classList.toggle('is-playing', playing);

    refs.speed.forEach((entry) => {
      const active = Number(view.speed) === entry.value;
      entry.btn.classList.toggle('is-active', active);
      entry.btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function setActs(nextActs) {
    currentActs = Array.isArray(nextActs) ? nextActs.slice() : [];
    renderDots();
  }

  function setVisible(visible) {
    bar.hidden = !visible;
    narration.hidden = !visible;
  }

  function destroy() {
    bar.remove();
    narration.remove();
  }

  return { bar, narration, update, setActs, setVisible, destroy };
}
