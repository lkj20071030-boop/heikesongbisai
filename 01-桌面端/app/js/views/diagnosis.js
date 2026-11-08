/* 智析 AI · 知识诊断 */

import { h, icon, pct } from '../core/ui.js';
import { state, getTopic, actions, subscribe, PHASE_LABELS } from '../core/store.js';
import { runDiagnosis } from '../core/simulate.js';
import { navigate } from '../core/router.js';
import { toast } from '../core/feedback.js';
import { exportSessionMarkdown } from '../core/export.js';

const STAGES = [
  { key: 'discover', label: '发现前置' },
  { key: 'quiz', label: '短测确认' },
  { key: 'path', label: '生成路径' },
  { key: 'learn', label: '学习与复测' }
];

const PHASE_HINT = {
  idle: '准备开始诊断。',
  parsing: '正在解析问题，并匹配到当前知识库中的学科主题。',
  expanding: '正在沿前置关系逐层展开假设，每条关系都带依据、来源与置信度。',
  confirming: '已展开到第 2 层前置假设。可以继续展开，也可以直接进入短测。',
  quizzing: '短测只问 2 道判别题，全部作答后才能提交，不提前泄露答案。',
  'path-ready': '已生成学习路径，可以查看路径并开始学习。',
  executing: '学习中：完成路径步骤后，可以用不同题目复测。',
  're-diagnosing': '复测只陈述本次表现，不做能力提升或掌握度承诺。'
};

function stageIndexOf(phase) {
  if (phase === 'quizzing') return 1;
  if (phase === 'path-ready') return 2;
  if (phase === 'executing' || phase === 're-diagnosing') return 3;
  return 0;
}

function confidenceBadge(confidence) {
  if (confidence === null || confidence === undefined) {
    return h('span', { className: 'badge badge-neutral' }, '基础节点');
  }
  const value = Number(confidence);
  if (!Number.isFinite(value)) return h('span', { className: 'badge badge-neutral' }, '基础节点');
  if (value >= 0.85) return h('span', { className: 'badge badge-success' }, `生效 · ${pct(value)}`);
  if (value >= 0.5) return h('span', { className: 'badge badge-warning' }, `待校准 · ${pct(value)}`);
  return h('span', { className: 'badge badge-neutral' }, `已丢弃 · ${pct(value)}`);
}

function overrideBadge(status) {
  if (status === 'understood') return h('span', { className: 'badge badge-success' }, '人工确认 · 已理解');
  if (status === 'needs-work') return h('span', { className: 'badge badge-warning' }, '人工确认 · 需巩固');
  return null;
}

function cardShell({ iconName = 'activity', title, sub, extra = null, tone = '' }) {
  const card = h('section', { className: `card dx-card ${tone}`.trim() });
  const head = h(
    'div',
    { className: 'dx-card-head' },
    h('span', { className: 'dx-card-icon' }, icon(iconName, 18)),
    h(
      'div',
      { className: 'dx-card-head-text' },
      h('div', { className: 'dx-card-title' }, title),
      sub ? h('div', { className: 'dx-card-sub' }, sub) : null
    ),
    extra ? h('div', { className: 'dx-card-extra' }, extra) : null
  );
  const body = h('div', { className: 'dx-card-body' });
  card.append(head, body);
  return { card, body, head };
}

export function mount(root, ctx) {
  let disposed = false;
  const timers = new Set();
  let unsubscribe = null;
  let sim = null;
  let topObserver = null;
  let topic = ctx.topic || null;
  const session = ctx.session || null;

  function after(fn, ms = 0) {
    if (disposed) return;
    const id = setTimeout(() => {
      timers.delete(id);
      if (!disposed) fn();
    }, ms);
    timers.add(id);
  }

  function cleanup() {
    disposed = true;
    if (sim) {
      try {
        sim.cancel();
      } catch {
        /* 忽略 */
      }
      sim = null;
    }
    for (const id of timers) clearTimeout(id);
    timers.clear();
    if (topObserver) {
      topObserver.disconnect();
      topObserver = null;
    }
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  }

  if (!session) {
    root.appendChild(
      h(
        'div',
        { className: 'dx-empty-wrap' },
        h(
          'div',
          { className: 'card' },
          h(
            'div',
            { className: 'empty' },
            h('span', { className: 'empty-icon' }, icon('activity', 24)),
            h('h3', null, '还没有正在进行的诊断'),
            h('p', null, '先在工作台提出一个概念问题。诊断会从问题出发，逐层展开前置假设，再用两道题确认断点。'),
            h(
              'button',
              { className: 'btn btn-primary', type: 'button', onClick: () => navigate('home') },
              icon('arrow-left', 16),
              '回到工作台'
            )
          )
        )
      )
    );
    return cleanup;
  }

  if (!topic) {
    root.appendChild(
      h(
        'div',
        { className: 'dx-empty-wrap' },
        h(
          'div',
          { className: 'card' },
          h(
            'div',
            { className: 'empty' },
            h('span', { className: 'empty-icon' }, icon('alert-triangle', 24)),
            h('h3', null, '主题数据尚未加载'),
            h('p', null, '当前会话所属的主题内容暂不可用。请确认 data/topics.js 已就绪后刷新，或回到工作台重新开始。'),
            h(
              'div',
              { className: 'row gap-2' },
              h(
                'button',
                { className: 'btn btn-secondary', type: 'button', onClick: () => window.location.reload() },
                icon('refresh', 15),
                '刷新页面'
              ),
              h(
                'button',
                { className: 'btn btn-primary', type: 'button', onClick: () => navigate('home') },
                icon('arrow-left', 15),
                '回到工作台'
              )
            )
          )
        )
      )
    );
    return cleanup;
  }

  const nodes = Array.isArray(topic.nodes) ? topic.nodes : [];
  const edges = Array.isArray(topic.edges) ? topic.edges : [];
  const sources = Array.isArray(topic.sources) ? topic.sources : [];
  const maxLayer = nodes.length ? Math.max(...nodes.map((node) => Number(node.layer) || 0)) : 0;

  function nodeLabel(id) {
    const node = nodes.find((item) => item.id === id);
    return node ? node.label : id;
  }

  function sourceLabel(id) {
    const source = sources.find((item) => item.id === id);
    if (!source) return id;
    return `${source.org || '示例资料'} · ${source.title}`;
  }

  function incomingEdge(nodeId) {
    return edges.find((edge) => edge.to === nodeId) || null;
  }

  /* ---------- 页面头部 ---------- */

  const skipBtn = h(
    'button',
    {
      className: 'btn btn-secondary btn-sm',
      type: 'button',
      title: '跳过逐层推断动画，直接进入短测',
      'aria-label': '跳过推断动画',
      onClick: () => handleSkip()
    },
    icon('play', 14),
    '跳过推断动画'
  );

  const exportBtn = h(
    'button',
    {
      className: 'btn btn-secondary btn-sm',
      type: 'button',
      title: '导出本次记录为 Markdown',
      'aria-label': '导出本次记录',
      onClick: () => handleExport()
    },
    icon('download', 14),
    '导出本次记录'
  );

  async function handleExport() {
    if (exportBtn.disabled) return;
    exportBtn.disabled = true;
    try {
      const result = await exportSessionMarkdown(session, topic);
      if (result && result.ok) {
        toast(result.path ? `已导出本次记录：${result.path}` : '已导出本次记录。', 'success');
      } else {
        toast('导出未完成，请稍后重试。', 'warning');
      }
    } catch {
      toast('导出失败，请稍后重试。', 'error');
    } finally {
      if (!disposed) exportBtn.disabled = false;
    }
  }

  const pageHead = h(
    'header',
    { className: 'page-head dx-head' },
    h(
      'div',
      { className: 'page-head-main' },
      h(
        'div',
        { className: 'row gap-2 wrap dx-meta' },
        h('span', { className: 'badge badge-accent' }, topic.domain || '当前主题'),
        h('span', { className: 'badge badge-neutral' }, icon('cpu', 11), '知识库数据'),
        h('span', { className: 'badge badge-neutral' }, topic.title)
      ),
      h('h1', { className: 'page-title dx-question' }, session.question),
      h(
        'p',
        { className: 'page-sub' },
        '先找出真正卡住你的前置知识，用两道题确认，再给一条能执行、能复测的路径。'
      )
    ),
    h('div', { className: 'page-actions' }, exportBtn, skipBtn)
  );

  /* ---------- 阶段条 ---------- */

  const stageRefs = [];
  const stageBar = h('div', { className: 'stage-bar', 'aria-label': '诊断阶段' });
  STAGES.forEach((stage, index) => {
    const ref = h(
      'div',
      { className: 'stage-item' },
      h('span', { className: 'stage-num' }, String(index + 1)),
      h('span', { className: 'stage-label' }, stage.label)
    );
    stageRefs.push(ref);
    stageBar.appendChild(ref);
    if (index < STAGES.length - 1) stageBar.appendChild(h('span', { className: 'stage-line' }));
  });

  /* ---------- 主列与右栏 ---------- */

  const stream = h('div', { className: 'dx-stream', 'aria-live': 'polite' });
  const rail = h('aside', { className: 'dx-rail', 'aria-label': '诊断依据与校准' });

  const layout = h(
    'div',
    { className: 'split dx-layout' },
    h('div', { className: 'dx-main' }, stream),
    rail
  );

  const topBar = h('div', { className: 'dx-top' }, pageHead, stageBar);
  root.append(topBar, layout);

  // 吸顶后右栏也需要让开顶栏高度，避免卡片标题被永久遮住。
  function syncTopOffset() {
    if (disposed) return;
    layout.style.setProperty('--dx-top-offset', `${Math.round(topBar.offsetHeight)}px`);
  }
  syncTopOffset();
  if (typeof ResizeObserver === 'function') {
    topObserver = new ResizeObserver(() => syncTopOffset());
    topObserver.observe(topBar);
  }

  /* ---------- 阶段卡 ---------- */

  const phaseBadge = h('span', { className: 'badge badge-accent' }, PHASE_LABELS[session.phase] || session.phase);
  const phaseCard = cardShell({
    iconName: 'activity',
    title: '当前阶段',
    sub: `${topic.title} · 本地模式 · 本地知识库`,
    extra: phaseBadge,
    tone: 'dx-phase-card'
  });
  const phaseHint = h('p', { className: 'dx-phase-hint' }, PHASE_HINT[session.phase] || PHASE_HINT.idle);
  const miniSteps = h(
    'div',
    { className: 'dx-mini-steps', 'aria-hidden': 'true' },
    STAGES.map(() => h('span', { className: 'dx-mini-step' }))
  );
  phaseCard.body.append(phaseHint, miniSteps);

  let renderedLayersSig = new Set();
  let judgementRendered = false;
  let confirmCard = null;
  let quizHost = null;
  let quizRendered = false;
  let conclusionRendered = false;
  let initialRestore = true;

  function addCard(card, { scroll = true } = {}) {
    if (disposed) return;
    if (!initialRestore) card.classList.add('dx-enter');
    stream.appendChild(card);
    if (scroll && !initialRestore) {
      const behavior = state.settings.reduceMotion ? 'auto' : 'smooth';
      after(() => {
        try {
          card.scrollIntoView({ block: 'nearest', behavior });
        } catch {
          /* 忽略 */
        }
      }, 40);
    }
  }

  function addLayerCard(layer, options = {}) {
    const layerNumber = Number(layer);
    if (renderedLayersSig.has(layerNumber)) return;
    renderedLayersSig.add(layerNumber);
    const layerNodes = nodes.filter((node) => (Number(node.layer) || 0) === layerNumber);
    if (!layerNodes.length) return;

    const isTarget = layerNumber === maxLayer;
    const title = isTarget
      ? `第 ${layerNumber + 1} 层 · 目标概念`
      : layerNumber === 0
        ? '第 1 层 · 基础前置'
        : `第 ${layerNumber + 1} 层 · 前置假设`;
    const card = cardShell({
      iconName: isTarget ? 'target' : 'git-branch',
      title,
      sub: `${layerNodes.length} 个节点 · 每条关系都有依据、来源与置信度`,
      tone: layerNumber === 2 ? 'dx-layer-card dx-layer-key' : 'dx-layer-card'
    });

    const list = h('div', { className: 'layer-list' });
    for (const node of layerNodes) {
      const edge = incomingEdge(node.id);
      const status = session.overrides[node.id];
      const stale = Array.isArray(session.stale) && session.stale.includes(node.id);
      const badges = h(
        'div',
        { className: 'layer-node-badges' },
        h('span', { className: 'badge badge-neutral' }, node.kind === 'skill' ? '技能' : '概念'),
        stale ? h('span', { className: 'badge badge-danger' }, '需重算') : null,
        status ? overrideBadge(status) : edge ? confidenceBadge(edge.confidence) : confidenceBadge(null)
      );

      list.appendChild(
        h(
          'div',
          { className: `layer-node${stale ? ' is-stale' : ''}` },
          h('span', { className: 'node-status-dot', 'aria-hidden': 'true' }),
          h(
            'div',
            { className: 'layer-node-main' },
            h('div', { className: 'layer-node-title' }, node.label),
            h('p', { className: 'layer-node-desc' }, node.desc || '该节点暂无描述。'),
            node.evidence ? h('p', { className: 'layer-node-evidence' }, node.evidence) : null
          ),
          badges
        )
      );
    }
    card.body.appendChild(list);
    addCard(card.card, options);
  }

  function addJudgementCard(payload) {
    if (judgementRendered || disposed) return;
    judgementRendered = true;
    const card = cardShell({
      iconName: 'target',
      title: '模型判断 · 待短测确认',
      sub: '这是基于知识库数据的推断，不是能力结论',
      extra: h(
        'div',
        { className: 'row gap-2 wrap' },
        h('span', { className: 'badge badge-neutral' }, `初步置信度 ${pct(payload.confidence)}`),
        h(
          'span',
          { className: `badge ${payload.needsConfirm === false ? 'badge-neutral' : 'badge-warning'}` },
          payload.needsConfirm === false ? '已进入短测' : '需要确认'
        )
      ),
      tone: 'dx-judgement'
    });

    const candidates = Array.isArray(payload.weakPoints) ? payload.weakPoints : [];
    card.body.append(
      h(
        'p',
        { className: 'dx-lead' },
        '第 2 层前置假设已展开。接下来用 2 道判别题确认真正卡住你的节点；答错只会指向需要补的前置，不做能力标签。'
      ),
      candidates.length
        ? h(
            'div',
            { className: 'row gap-2 wrap' },
            candidates.map((id) => h('span', { className: 'badge badge-warning' }, nodeLabel(id)))
          )
        : h('p', { className: 'dx-muted' }, '候选断点将在短测提交后列出。')
    );
    addCard(card.card);
  }

  function removeConfirm() {
    if (confirmCard) {
      confirmCard.remove();
      confirmCard = null;
    }
  }

  function addConfirmCard() {
    if (confirmCard || disposed) return;
    const shell = cardShell({
      iconName: 'help-circle',
      title: '先停在这里，是否继续展开？',
      sub: '按流程在第 2 层暂停，等待你的确认',
      tone: 'dx-confirm'
    });
    const continueBtn = h(
      'button',
      {
        className: 'btn btn-primary',
        type: 'button',
        title: '继续展开目标概念层，然后进入短测',
        onClick: () => handleConfirm('continue')
      },
      '继续展开',
      icon('arrow-right', 15)
    );
    const stopBtn = h(
      'button',
      {
        className: 'btn btn-secondary',
        type: 'button',
        title: '不再展开目标概念层，直接进入短测',
        onClick: () => handleConfirm('stop')
      },
      '就到这里'
    );
    shell.body.append(
      h(
        'p',
        { className: 'dx-lead' },
        '已展开到第 2 层前置假设。继续展开会显示目标概念层；也可以直接进入 2 道短测，避免不必要的阅读。'
      ),
      h('div', { className: 'dx-confirm-actions' }, continueBtn, stopBtn)
    );
    addCard(shell.card);
    confirmCard = shell.card;
  }

  function handleConfirm(choice) {
    if (disposed) return;
    removeConfirm();
    if (sim) {
      sim.resume(choice);
      return;
    }
    if (choice === 'continue') addLayerCard(maxLayer);
    if (!judgementRendered) {
      addJudgementCard({ weakPoints: [], confidence: 0.82, needsConfirm: false });
    }
    actions.setPhase(session.id, 'quizzing');
    addQuizCard();
  }

  function handleSkip() {
    if (disposed) return;
    if (sim) {
      sim.skip();
      return;
    }
    for (let layer = session.layer + 1; layer <= maxLayer; layer += 1) addLayerCard(layer);
    if (!judgementRendered) {
      addJudgementCard({ weakPoints: [], confidence: 0.82, needsConfirm: false });
    }
    actions.setPhase(session.id, 'quizzing');
    addQuizCard();
  }

  /* ---------- 短测 ---------- */

  function buildQuizCard() {
    const shell = cardShell({
      iconName: 'check-circle',
      title: '短测确认',
      sub: '两道判别题 · 全部作答后才能提交',
      tone: 'dx-quiz'
    });
    const questionsWrap = h('div', { className: 'quiz-questions' });
    const foot = h('div', { className: 'quiz-foot' });

    shell.body.append(
      h(
        'p',
        { className: 'dx-lead' },
        '短测只用来确认前置断点，不做题海，也不在提交前显示答案解析。'
      ),
      questionsWrap,
      foot
    );

    function answeredCount() {
      return (topic.quiz || []).filter((q) => session.answers[q.id] !== undefined).length;
    }

    function renderQuestions() {
      questionsWrap.replaceChildren();
      (topic.quiz || []).forEach((question, qi) => {
        const options = h('div', {
          className: 'quiz-options',
          role: 'radiogroup',
          'aria-label': `第 ${qi + 1} 题选项`
        });
        (question.options || []).forEach((option, oi) => {
          const checked = session.answers[question.id] === oi;
          options.appendChild(
            h(
              'button',
              {
                className: `quiz-option${checked ? ' selected' : ''}`,
                type: 'button',
                role: 'radio',
                'aria-checked': checked ? 'true' : 'false',
                onClick: () => {
                  if (session.quizSubmitted) return;
                  actions.answerQuestion(session.id, 'quiz', question.id, oi);
                  renderQuestions();
                  renderFoot();
                }
              },
              h('span', { className: 'opt-letter' }, String.fromCharCode(65 + oi)),
              h('span', { className: 'opt-text' }, option)
            )
          );
        });

        questionsWrap.appendChild(
          h(
            'div',
            { className: 'quiz-q' },
            h(
              'div',
              { className: 'quiz-q-head' },
              h('span', { className: 'quiz-q-index' }, `第 ${qi + 1} 题`),
              question.difficulty
                ? h('span', { className: 'badge badge-neutral' }, question.difficulty)
                : null
            ),
            h('p', { className: 'quiz-stem' }, question.stem),
            options
          )
        );
      });
    }

    function renderFoot() {
      const total = (topic.quiz || []).length;
      const answered = answeredCount();
      const enabled = answered >= total && total > 0;
      foot.replaceChildren(
        h(
          'div',
          { className: 'quiz-progress' },
          h('span', { className: 'badge badge-neutral' }, `${answered}/${total} 已作答`),
          h('div', { className: 'progress quiz-progress-bar' }, h('i', { style: { width: `${(answered / Math.max(1, total)) * 100}%` } }))
        ),
        h(
          'button',
          {
            className: 'btn btn-primary',
            type: 'button',
            disabled: !enabled,
            title: enabled ? '提交答案并查看解析' : '请先完成全部题目',
            'aria-label': '提交短测答案',
            onClick: () => submitQuiz()
          },
          '提交答案',
          icon('arrow-right', 15)
        )
      );
    }

    renderQuestions();
    renderFoot();
    return shell.card;
  }

  function addQuizCard() {
    if (quizRendered || disposed) return;
    quizRendered = true;
    quizHost = buildQuizCard();
    addCard(quizHost);
  }

  function buildQuizReview() {
    const result = session.quizResult || { correct: 0, total: (topic.quiz || []).length, weak: [] };
    const shell = cardShell({
      iconName: 'check-circle',
      title: '短测结果 · 本次表现',
      sub: '解析已展开 · 只陈述本次表现，不代表能力评价',
      tone: 'dx-review'
    });

    shell.body.appendChild(
      h(
        'div',
        { className: 'review-summary' },
        h(
          'div',
          { className: 'review-score' },
          h('span', { className: 'stat-num' }, `${result.correct}/${result.total}`),
          h('span', { className: 'stat-label' }, '本次答对')
        ),
        h(
          'p',
          null,
          '本次表现只用于确认疑似断点。答对不代表已掌握，答错也不代表能力不足；可以沿学习路径补齐前置后再复测。'
        )
      )
    );

    (topic.quiz || []).forEach((question, qi) => {
      const picked = session.answers[question.id];
      const correct = picked === question.answer;
      const optionList = h('div', { className: 'review-options' });
      (question.options || []).forEach((option, oi) => {
        const isAnswer = oi === question.answer;
        const isPicked = oi === picked;
        const classes = ['review-option'];
        if (isAnswer) classes.push('correct');
        if (isPicked && !correct) classes.push('wrong');
        optionList.appendChild(
          h(
            'div',
            { className: classes.join(' ') },
            h('span', { className: 'opt-letter' }, String.fromCharCode(65 + oi)),
            h('span', { className: 'opt-text' }, option),
            isAnswer
              ? h('span', { className: 'badge badge-success' }, '正确答案')
              : isPicked
                ? h('span', { className: 'badge badge-danger' }, '你的选择')
                : null
          )
        );
      });

      shell.body.appendChild(
        h(
          'div',
          { className: 'review-q' },
          h(
            'div',
            { className: 'review-q-head' },
            h('span', { className: 'quiz-q-index' }, `第 ${qi + 1} 题`),
            h(
              'span',
              { className: `badge ${correct ? 'badge-success' : 'badge-danger'}` },
              correct ? '本次答对' : '本次答错'
            )
          ),
          h('p', { className: 'quiz-stem' }, question.stem),
          optionList,
          h(
            'p',
            { className: 'review-explain' },
            h('span', { className: 'review-explain-label' }, '解析：'),
            question.explain || '暂无解析。'
          )
        )
      );
    });

    return shell.card;
  }

  function submitQuiz() {
    if (session.quizSubmitted) return;
    const result = actions.submitQuiz(session.id);
    if (!result) {
      toast('请先完成全部题目再提交。', 'warning');
      return;
    }
    const review = buildQuizReview();
    review.classList.add('dx-enter');
    if (quizHost && quizHost.parentNode) quizHost.replaceWith(review);
    else addCard(review);
    quizHost = review;
    toast('短测已提交，逐题解析已展开。', 'success');

    if (sim) {
      sim.conclude();
    } else {
      renderConclusion();
    }
    updateAll();
  }

  /* ---------- 结论 ---------- */

  function addConclusionCard() {
    if (conclusionRendered || disposed) return;
    conclusionRendered = true;
    const weak = (session.quizResult && session.quizResult.weak) || [];
    const shell = cardShell({
      iconName: 'flag',
      title: '结论 · 疑似断点',
      sub: '基于本次两道判别题，需结合学习与复测继续确认',
      tone: 'dx-conclusion'
    });

    if (weak.length) {
      const list = h('div', { className: 'conclusion-list' });
      for (const id of weak) {
        const node = nodes.find((item) => item.id === id);
        list.appendChild(
          h(
            'div',
            { className: 'conclusion-node' },
            h('span', { className: 'conclusion-dot', 'aria-hidden': 'true' }),
            h(
              'div',
              null,
              h('div', { className: 'conclusion-node-title' }, node ? node.label : id),
              h('p', { className: 'conclusion-node-desc' }, node && node.desc ? node.desc : '该前置节点在本次短测中被指向。')
            ),
            h('span', { className: 'badge badge-warning' }, '疑似断点')
          )
        );
      }
      shell.body.append(
        h('p', { className: 'dx-lead' }, '以下节点在本次短测中被指向，作为疑似断点，可进入路径逐步补齐：'),
        list
      );
    } else {
      shell.body.appendChild(
        h(
          'p',
          { className: 'dx-lead' },
          '本次两题均答对，暂未定位明确断点。你仍可以查看学习路径做一次巩固，或用不同题目复测。'
        )
      );
    }

    const pathSteps = Array.isArray(topic.path) ? topic.path : [];
    if (pathSteps.length) {
      const preview = h('ol', { className: 'path-preview' });
      pathSteps.forEach((step, index) => {
        preview.appendChild(
          h(
            'li',
            { className: 'path-preview-item' },
            h('span', { className: 'path-preview-num' }, String(index + 1)),
            h(
              'span',
              { className: 'path-preview-text' },
              h('span', { className: 'path-preview-title' }, step.title),
              h('span', { className: 'path-preview-meta' }, `${step.kind || '学习'} · 约 ${step.minutes || 8} 分钟`)
            )
          )
        );
      });
      shell.body.append(h('div', { className: 'dx-subhead' }, icon('layers', 15), '学习路径预览'), preview);
    }

    const actionsRow = h(
      'div',
      { className: 'dx-conclusion-actions' },
      h(
        'button',
        {
          className: 'btn btn-primary',
          type: 'button',
          title: '打开学习路径',
          onClick: () => navigate('path', { sessionId: session.id })
        },
        '查看学习路径',
        icon('arrow-right', 16)
      ),
      h(
        'button',
        {
          className: 'btn btn-ghost',
          type: 'button',
          onClick: () => navigate('home')
        },
        '回到工作台'
      )
    );
    shell.body.appendChild(actionsRow);

    addCard(shell.card);
  }

  function renderConclusion() {
    if (!session.quizSubmitted) return;
    addConclusionCard();
  }

  /* ---------- 右栏 ---------- */

  let railSignature = '';

  function buildWhyCard() {
    const currentLayer = Math.max(0, Math.min(maxLayer, Number(session.layer) || 0));
    const layerNodes = nodes.filter((node) => (Number(node.layer) || 0) === currentLayer);
    const card = h(
      'section',
      { className: 'card dx-rail-card', 'aria-labelledby': 'why-title' },
      h(
        'div',
        { className: 'card-head dx-rail-head' },
        h('h2', { className: 'card-title', id: 'why-title' }, '为什么问这些'),
        h('span', { className: 'badge badge-neutral' }, `第 ${currentLayer + 1} 层`)
      ),
      h(
        'div',
        { className: 'card-body dx-rail-body' },
        h(
          'p',
          { className: 'rail-lead' },
          '每条前置关系都带依据、来源与置信度。低置信关系会进入校准队列，由你决定是否采纳。'
        ),
        layerNodes.length
          ? h(
              'div',
              { className: 'evidence-list' },
              layerNodes.map((node) => {
                const edge = incomingEdge(node.id);
                const status = session.overrides[node.id];
                return h(
                  'div',
                  { className: 'evidence-row' },
                  h(
                    'div',
                    { className: 'evidence-top' },
                    h('span', { className: 'evidence-name' }, node.label),
                    status ? overrideBadge(status) : confidenceBadge(edge ? edge.confidence : null)
                  ),
                  h(
                    'p',
                    { className: 'evidence-basis' },
                    node.evidence || (edge && edge.basis) || '该节点的推断依据尚未提供。'
                  ),
                  h(
                    'div',
                    { className: 'evidence-meta' },
                    icon('book-open', 12),
                    h('span', null, (node.sourceIds || (edge ? edge.sourceIds : []) || []).map(sourceLabel).join('、') || '示例资料')
                  )
                );
              })
            )
          : h('p', { className: 'dx-muted' }, '该层暂无可列出的前置节点。')
      )
    );
    return card;
  }

  function buildCalibrationCard() {
    const reviewEdges = edges
      .filter((edge) => Number(edge.confidence) >= 0.5 && Number(edge.confidence) < 0.85)
      .sort((a, b) => Number(a.confidence) - Number(b.confidence));

    const card = h(
      'section',
      { className: 'card dx-rail-card', 'aria-labelledby': 'calib-title' },
      h(
        'div',
        { className: 'card-head dx-rail-head' },
        h('h2', { className: 'card-title', id: 'calib-title' }, '校准队列'),
        h('span', { className: 'badge badge-warning' }, `${reviewEdges.length} 条待校准`)
      ),
      h(
        'div',
        { className: 'card-body dx-rail-body' },
        h(
          'p',
          { className: 'rail-lead' },
          '置信度 0.5–0.85 的边需要人工判断。采纳或否定后，下游节点会标记「需重算」。'
        ),
        reviewEdges.length
          ? h(
              'div',
              { className: 'calib-list' },
              reviewEdges.map((edge) => {
                const status = session.overrides[edge.to];
                return h(
                  'div',
                  { className: 'calib-row' },
                  h(
                    'div',
                    { className: 'calib-title' },
                    h('span', null, nodeLabel(edge.from)),
                    h('span', { className: 'calib-arrow' }, '→'),
                    h('span', null, nodeLabel(edge.to))
                  ),
                  h('div', { className: 'calib-meta' }, confidenceBadge(edge.confidence)),
                  edge.basis ? h('p', { className: 'calib-basis' }, edge.basis) : null,
                  status
                    ? h(
                        'div',
                        { className: 'calib-actions' },
                        h(
                          'button',
                          {
                            className: 'btn btn-ghost btn-sm',
                            type: 'button',
                            title: '撤回人工判断，恢复模型结果',
                            onClick: () => {
                              actions.setOverride(session.id, edge.to, 'cleared');
                              toast('已撤回人工判断。', 'info');
                            }
                          },
                          '撤回判断'
                        )
                      )
                    : h(
                        'div',
                        { className: 'calib-actions' },
                        h(
                          'button',
                          {
                            className: 'btn btn-secondary btn-sm',
                            type: 'button',
                            title: `采纳前置关系：${nodeLabel(edge.from)} → ${nodeLabel(edge.to)}`,
                            'aria-label': `采纳前置关系 ${nodeLabel(edge.from)} 到 ${nodeLabel(edge.to)}`,
                            onClick: () => {
                              actions.setOverride(session.id, edge.to, 'understood');
                              toast('已采纳该前置关系，人工判断已记录在本机。', 'success');
                            }
                          },
                          '采纳'
                        ),
                        h(
                          'button',
                          {
                            className: 'btn btn-ghost btn-sm',
                            type: 'button',
                            title: `否定前置关系：${nodeLabel(edge.from)} → ${nodeLabel(edge.to)}`,
                            'aria-label': `否定前置关系 ${nodeLabel(edge.from)} 到 ${nodeLabel(edge.to)}`,
                            onClick: () => {
                              actions.setOverride(session.id, edge.to, 'cleared');
                              toast('已否定该前置关系，已恢复模型判断。', 'info');
                            }
                          },
                          '否定'
                        )
                      )
                );
              })
            )
          : h('p', { className: 'dx-muted' }, '当前没有待校准的低置信关系。')
      )
    );
    return card;
  }

  function buildLegendCard() {
    const rows = [
      ['生效关系', 'solid', '置信度 ≥ 0.85，正常参与推断'],
      ['待校准', 'dashed', '置信度 0.5–0.85，进入校准队列'],
      ['疑似断点', 'danger', '短测后被指向的前置节点'],
      ['人工确认', 'accent', '你已采纳或否定该节点'],
      ['过期需重算', 'stale', '覆写后下游节点标记 stale']
    ];
    return h(
      'section',
      { className: 'card dx-rail-card dx-legend-card', 'aria-labelledby': 'legend-title' },
      h('div', { className: 'card-head dx-rail-head' }, h('h2', { className: 'card-title', id: 'legend-title' }, '图例')),
      h(
        'div',
        { className: 'card-body dx-rail-body' },
        h(
          'div',
          { className: 'legend-list' },
          rows.map(([label, kind, desc]) =>
            h(
              'div',
              { className: 'legend-row' },
              h(
                'span',
                { className: `legend-glyph legend-${kind}`, 'aria-hidden': 'true' },
                h('span', { className: 'legend-glyph-inner' })
              ),
              h(
                'span',
                { className: 'legend-text' },
                h('span', { className: 'legend-label' }, label),
                h('span', { className: 'legend-desc' }, desc)
              )
            )
          )
        ),
        h(
          'p',
          { className: 'legend-note' },
          icon('info', 13),
          '推断来自内置知识库；所有覆写只保存在本机。'
        )
      )
    );
  }

  function updateRail(force = false) {
    if (disposed) return;
    const signature = [
      session.layer,
      session.phase,
      Object.keys(session.overrides || {}).sort().join(','),
      Object.values(session.overrides || {}).join(','),
      (session.stale || []).join(',')
    ].join('|');
    if (!force && signature === railSignature) return;
    railSignature = signature;
    rail.replaceChildren(buildWhyCard(), buildCalibrationCard(), buildLegendCard());
  }

  /* ---------- 头部与阶段 ---------- */

  function updateStage() {
    const index = stageIndexOf(session.phase);
    stageRefs.forEach((ref, i) => {
      ref.classList.toggle('active', i === index);
      ref.classList.toggle('done', i < index);
      if (i === index) ref.setAttribute('aria-current', 'step');
      else ref.removeAttribute('aria-current');
    });
    miniSteps.querySelectorAll('.dx-mini-step').forEach((step, i) => {
      step.classList.toggle('active', i === index);
      step.classList.toggle('done', i < index);
    });
  }

  function updatePhaseCard() {
    phaseBadge.textContent = PHASE_LABELS[session.phase] || session.phase;
    phaseHint.textContent = PHASE_HINT[session.phase] || '';
    updateStage();
  }

  function updateSkip() {
    const busy = ['quizzing', 'path-ready', 'executing', 're-diagnosing'].includes(session.phase);
    skipBtn.hidden = busy || session.quizSubmitted;
  }

  function updateAll() {
    updatePhaseCard();
    updateSkip();
    updateRail();
  }

  /* ---------- 启动模拟或恢复 ---------- */

  addCard(phaseCard.card, { scroll: false });

  const restoreLayers = !['idle', 'parsing'].includes(session.phase);
  if (restoreLayers) {
    const upTo = Math.min(maxLayer, Math.max(0, Number(session.layer) || 0));
    for (let layer = 0; layer <= upTo; layer += 1) addLayerCard(layer, { scroll: false });
  }

  const laterPhases = ['confirming', 'quizzing', 'path-ready', 'executing', 're-diagnosing'];
  if (laterPhases.includes(session.phase)) {
    addJudgementCard({ weakPoints: [], confidence: 0.82, needsConfirm: session.phase === 'confirming' });
  }
  if (session.phase === 'confirming') addConfirmCard();
  if (session.phase === 'quizzing') addQuizCard();

  if (session.quizSubmitted) {
    if (!quizRendered) {
      const review = buildQuizReview();
      addCard(review, { scroll: false });
      quizHost = review;
      quizRendered = true;
    }
    renderConclusion();
  } else if (['path-ready', 'executing', 're-diagnosing'].includes(session.phase)) {
    addQuizCard();
  }

  updateAll();
  initialRestore = false;

  const canAnimate = !session.quizSubmitted && ['idle', 'parsing', 'expanding'].includes(session.phase);
  if (canAnimate) {
    sim = runDiagnosis({
      session,
      topic,
      speed: state.settings.speed,
      resume: { phase: session.phase, layer: session.layer },
      handlers: {
        onPhase(phase) {
          actions.setPhase(session.id, phase);
          if (phase === 'confirming') addConfirmCard();
          if (phase === 'quizzing') removeConfirm();
          updatePhaseCard();
          updateSkip();
          updateRail();
        },
        onLayer(layer) {
          actions.setLayer(session.id, layer);
          addLayerCard(layer);
          updateRail();
        },
        onJudgement(payload) {
          addJudgementCard(payload);
        },
        onQuiz() {
          addQuizCard();
        },
        onConclusion() {
          renderConclusion();
        },
        onDone() {
          updateAll();
        }
      }
    });
  }

  unsubscribe = subscribe((_state, event) => {
    if (disposed || event !== 'sessions') return;
    updatePhaseCard();
    updateSkip();
    updateRail();
  });

  if (laterPhases.includes(session.phase) || session.quizSubmitted) {
    after(() => {
      const last = stream.lastElementChild;
      if (last) {
        try {
          last.scrollIntoView({ block: 'start', behavior: 'auto' });
        } catch {
          /* 忽略 */
        }
      }
    }, 80);
  }

  return cleanup;
}
