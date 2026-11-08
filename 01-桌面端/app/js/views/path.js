/* path.js · 学习路径
 * 依赖 core/store.js：getSession、getTopic、subscribe、
 *   actions.toggleStep、actions.answerCheck、actions.answerQuestion、actions.submitRetest
 * 依赖 core/router.js：navigate
 * 依赖 core/ui.js：h、icon
 * 依赖 core/feedback.js：toast
 *
 * 自报完成进度 ≠ 掌握；复测只陈述本次作答表现。
 */

import { actions, getSession, getTopic, subscribe } from '../core/store.js';
import { navigate } from '../core/router.js';
import { h, icon } from '../core/ui.js';
import { toast } from '../core/feedback.js';
import { exportSessionMarkdown } from '../core/export.js';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

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

function safeTopic(topicId) {
  if (!topicId) return null;
  try {
    return getTopic(topicId) || null;
  } catch (err) {
    return null;
  }
}

function nodeLabel(topic, nodeId) {
  const node = (topic.nodes || []).find((item) => item.id === nodeId);
  return node ? (node.label || node.id) : nodeId;
}

function weakNames(topic, ids) {
  if (!Array.isArray(ids) || !ids.length) return '无';
  return ids.map((id) => nodeLabel(topic, id)).join('、');
}

export function mount(root, ctx) {
  const context = ctx || {};
  let sid = (context.session && context.session.id) || (context.params && context.params.sessionId) || null;
  let mounted = true;
  let unsubscribe = null;
  let openSteps = null;
  let retestOpen = false;
  let focusStepId = null;
  let rafId = 0;
  let lastTopicId = null;

  function resolveData() {
    let session = null;
    if (sid) {
      try {
        session = getSession(sid);
      } catch (err) {
        session = null;
      }
    } else if (context.session) {
      session = context.session;
    }
    let topic = null;
    if (session) topic = safeTopic(session.topicId);
    if (!topic) topic = context.topic || null;
    return { session, topic };
  }

  function stepDone(session, stepId) {
    return Array.isArray(session.completedSteps) && session.completedSteps.indexOf(stepId) !== -1;
  }

  function toggleStep(session, step) {
    const before = stepDone(session, step.id);
    let ok = false;
    try {
      if (actions && typeof actions.toggleStep === 'function') {
        actions.toggleStep(session.id, step.id);
        ok = true;
      }
    } catch (err) {
      ok = false;
    }
    if (!ok) {
      if (!Array.isArray(session.completedSteps)) session.completedSteps = [];
      const index = session.completedSteps.indexOf(step.id);
      if (index === -1) session.completedSteps.push(step.id);
      else session.completedSteps.splice(index, 1);
      render();
    }
    toast(before ? '已撤销完成标记（自报进度）' : '已标记完成 · 自报进度，不代表已掌握', before ? 'info' : 'success');
  }

  function answerCheck(session, step, optionIndex) {
    let ok = false;
    try {
      if (actions && typeof actions.answerCheck === 'function') {
        actions.answerCheck(session.id, step.id, optionIndex);
        ok = true;
      }
    } catch (err) {
      ok = false;
    }
    if (!ok) {
      if (!session.checks || typeof session.checks !== 'object') session.checks = {};
      session.checks[step.id] = optionIndex;
      render();
    }
  }

  function answerRetest(session, question, optionIndex) {
    let ok = false;
    try {
      if (actions && typeof actions.answerQuestion === 'function') {
        actions.answerQuestion(session.id, 'retest', question.id, optionIndex);
        ok = true;
      }
    } catch (err) {
      ok = false;
    }
    if (!ok) {
      if (!session.retestAnswers || typeof session.retestAnswers !== 'object') session.retestAnswers = {};
      session.retestAnswers[question.id] = optionIndex;
      render();
    }
  }

  function submitRetest(session, retest) {
    let ok = false;
    try {
      if (actions && typeof actions.submitRetest === 'function') {
        actions.submitRetest(session.id);
        ok = true;
      }
    } catch (err) {
      ok = false;
    }
    if (!ok) {
      const answers = session.retestAnswers || {};
      let correct = 0;
      const weak = [];
      retest.forEach((question) => {
        if (answers[question.id] === question.answer) {
          correct += 1;
        } else {
          (question.tests || []).forEach((test) => {
            if (weak.indexOf(test) === -1) weak.push(test);
          });
        }
      });
      session.retestSubmitted = true;
      session.retestResult = { correct, total: retest.length, weak };
      render();
    }
    toast('复测已提交：以下只反映本次作答表现', 'success');
  }

  function buildExportButton(session, topic) {
    const btn = actionBtn('secondary', '导出本次记录', 'download', async () => {
      if (btn.disabled) return;
      btn.disabled = true;
      try {
        const result = await exportSessionMarkdown(session, topic);
        if (result && result.ok) {
          toast(result.path ? '已导出本次记录：' + result.path : '已导出本次记录。', 'success');
        } else {
          toast('导出未完成，请稍后重试。', 'warning');
        }
      } catch (err) {
        toast('导出失败，请稍后重试。', 'error');
      } finally {
        btn.disabled = false;
      }
    }, { size: 'sm', title: '导出本次记录为 Markdown' });
    return btn;
  }

  function buildHeader(session, topic) {
    const head = el('header', 'v-head');
    const main = el('div', 'v-head-main');
    main.appendChild(el('h1', 'v-title', '学习路径'));
    main.appendChild(el('p', 'v-sub', (topic.domain || '当前主题') + ' · ' + (topic.title || '学习路径') + ' · 分步讲解、微练习与不同题目的复测'));
    head.appendChild(main);

    const actionsBox = el('div', 'v-head-actions');
    actionsBox.appendChild(buildExportButton(session, topic));
    if (session.quizSubmitted) {
      actionsBox.appendChild(actionBtn('secondary', '查看知识图谱', 'git-branch', () => {
        navigate('graph', { sessionId: session.id });
      }));
    }
    head.appendChild(actionsBox);
    return head;
  }

  function buildNotice(session) {
    const card = el('div', 'card path-notice');
    const box = el('div', 'path-notice-body');
    box.appendChild(icon('alert-triangle', 22));
    const text = el('div', 'path-notice-text');
    text.appendChild(el('strong', '', '学习路径会在短测提交后生成'));
    text.appendChild(el('span', '', '先完成知识诊断中的 2 道判别题，系统才会根据疑似断点生成 3 个步骤。当前使用本地知识库，全部计算在本机完成。'));
    box.appendChild(text);
    card.appendChild(box);
    const foot = el('div', 'path-notice-actions');
    foot.appendChild(actionBtn('primary', '去完成短测', 'arrow-right', () => {
      navigate('diagnosis', { sessionId: session.id });
    }));
    card.appendChild(foot);
    return card;
  }

  function buildSummary(session, topic, doneCount, totalMinutes, canRetest) {
    const card = el('section', 'card path-summary');
    const intro = el('div', 'path-summary-intro');
    const badgeRow = el('div', 'path-summary-badges');
    badgeRow.appendChild(el('span', 'badge badge-accent', '目标概念'));
    badgeRow.appendChild(el('span', 'badge badge-neutral', '学习路径'));
    badgeRow.appendChild(el('span', 'badge badge-neutral', '内置知识库'));
    intro.appendChild(badgeRow);
    intro.appendChild(el('h2', 'path-summary-title', topic.title || '目标概念'));
    intro.appendChild(el('p', 'path-summary-desc', topic.summary || '按步骤完成学习，再用不同题目复测。'));
    card.appendChild(intro);

    const metrics = el('div', 'path-metrics');
    const totalSteps = (topic.path || []).length;
    const ringPct = totalSteps ? Math.round((doneCount / totalSteps) * 100) : 0;
    const doneMetric = el('div', 'path-metric');
    doneMetric.appendChild(el('span', 'path-metric-label', '完成进度'));

    const ring = el('div', 'path-ring' + (totalSteps > 0 && doneCount >= totalSteps ? ' is-complete' : ''));
    ring.style.setProperty('--ring-p', ringPct + '%');
    ring.setAttribute('role', 'progressbar');
    ring.setAttribute('aria-valuemin', '0');
    ring.setAttribute('aria-valuemax', String(totalSteps));
    ring.setAttribute('aria-valuenow', String(doneCount));
    ring.setAttribute('aria-label', '完成进度 ' + doneCount + ' / ' + totalSteps);
    ring.appendChild(el('span', 'path-ring-value', doneCount + '/' + totalSteps));

    const doneInfo = el('div', 'path-done-info');
    doneInfo.appendChild(el('strong', 'path-metric-value', doneCount + ' / ' + totalSteps));
    const progress = el('div', 'progress path-summary-progress');
    const fill = el('i', '');
    fill.style.width = (totalSteps ? Math.round((doneCount / totalSteps) * 100) : 0) + '%';
    progress.appendChild(fill);
    doneInfo.appendChild(progress);

    const doneRow = el('div', 'path-done-row');
    doneRow.appendChild(ring);
    doneRow.appendChild(doneInfo);
    doneMetric.appendChild(doneRow);
    metrics.appendChild(doneMetric);

    const timeMetric = el('div', 'path-metric');
    timeMetric.appendChild(el('span', 'path-metric-label', '预计总时长'));
    timeMetric.appendChild(el('strong', 'path-metric-value', totalMinutes + ' 分钟'));
    timeMetric.appendChild(el('span', 'path-metric-sub', '按 3 个步骤累加'));
    metrics.appendChild(timeMetric);

    const retestMetric = el('div', 'path-metric');
    retestMetric.appendChild(el('span', 'path-metric-label', '复测'));
    retestMetric.appendChild(el('strong', 'path-metric-value', '2 道新题'));
    retestMetric.appendChild(el('span', 'path-metric-sub', session.retestSubmitted ? '已提交，可查看对照' : '与首测题目不同'));
    metrics.appendChild(retestMetric);
    card.appendChild(metrics);

    const ctaBox = el('div', 'path-summary-cta');
    let primaryLabel = '开始复测';
    let kind = 'primary';
    let disabled = false;
    let hint = '完成全部步骤后可复测';
    if (session.retestSubmitted) {
      primaryLabel = '查看复测结果';
      hint = '只陈述本次作答表现，不宣称掌握或提升';
    } else if (canRetest && retestOpen) {
      primaryLabel = '收起复测';
      kind = 'secondary';
      hint = '复测位于页面底部';
    } else if (canRetest) {
      hint = '题目与首测不同，共 2 道';
    } else {
      disabled = true;
      hint = '还差 ' + Math.max(0, (topic.path || []).length - doneCount) + ' 个步骤，完成 3 个步骤后可复测';
    }

    const cta = actionBtn(kind, primaryLabel, session.retestSubmitted ? 'refresh' : 'play', () => {
      if (disabled) return;
      if (session.retestSubmitted) {
        retestOpen = true;
        render();
        scrollToRetest();
        return;
      }
      if (canRetest && retestOpen) {
        retestOpen = false;
        render();
        return;
      }
      retestOpen = true;
      render();
      scrollToRetest();
    }, { title: disabled ? hint : primaryLabel });
    cta.disabled = disabled;
    ctaBox.appendChild(cta);
    ctaBox.appendChild(el('p', 'path-cta-hint', hint));
    card.appendChild(ctaBox);
    return card;
  }

  function scrollToRetest() {
    rafId = window.requestAnimationFrame(() => {
      if (!mounted) return;
      const section = root.querySelector('.path-retest');
      if (section && typeof section.scrollIntoView === 'function') {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  function buildOptions(question, selected, locked) {
    const list = el('div', 'path-options');
    (question.options || []).forEach((option, index) => {
      const chosen = selected === index;
      const correct = index === question.answer;
      let cls = 'path-option';
      if (chosen) cls += ' is-chosen';
      if (locked && correct) cls += ' is-correct';
      if (locked && chosen && !correct) cls += ' is-wrong';
      const btn = el('button', cls);
      btn.type = 'button';
      btn.disabled = !!locked;
      btn.setAttribute('aria-pressed', chosen ? 'true' : 'false');
      btn.setAttribute('aria-label', '选项 ' + (LETTERS[index] || index + 1) + '：' + option);
      btn.appendChild(el('span', 'path-option-key', LETTERS[index] || String(index + 1)));
      btn.appendChild(el('span', 'path-option-text', option));
      if (locked && correct) btn.appendChild(icon('check', 16));
      if (locked && chosen && !correct) btn.appendChild(icon('x', 16));
      list.appendChild(btn);
    });
    return list;
  }

  function buildCheck(session, step) {
    if (!step.check) return null;
    const box = el('div', 'path-check');
    const head = el('div', 'path-check-head');
    head.appendChild(icon('help-circle', 17));
    head.appendChild(el('span', 'path-check-title', '微练习'));
    head.appendChild(el('span', 'badge badge-neutral', '不计入完成条件'));
    box.appendChild(head);
    box.appendChild(el('p', 'path-check-stem', step.check.stem));

    const answers = session.checks || {};
    const answered = typeof answers[step.id] === 'number' ? answers[step.id] : null;
    const locked = answered !== null;
    const options = buildOptions(step.check, answered, locked);
    if (!locked) {
      Array.prototype.forEach.call(options.children, (btn, index) => {
        btn.addEventListener('click', () => answerCheck(session, step, index));
      });
    }
    box.appendChild(options);

    if (locked) {
      const correct = answered === step.check.answer;
      const result = el('div', 'path-check-result ' + (correct ? 'is-ok' : 'is-bad'));
      const resultHead = el('div', 'path-check-result-head');
      resultHead.appendChild(icon(correct ? 'check' : 'x', 16));
      resultHead.appendChild(el('strong', '', correct ? '回答正确' : '回答有误，正确答案是 ' + (LETTERS[step.check.answer] || String(step.check.answer + 1))));
      result.appendChild(resultHead);
      if (step.check.explain) result.appendChild(el('p', 'path-explain', step.check.explain));
      result.appendChild(el('p', 'path-field-note', '答错不会阻止完成：自报进度不等于掌握。'));
      box.appendChild(result);
    }
    return box;
  }

  function buildStep(session, topic, step, index) {
    const done = stepDone(session, step.id);
    const open = openSteps.has(step.id);
    const article = el('article', 'card path-step' + (done ? ' is-done' : '') + (open ? ' is-open' : ''));

    const head = el('button', 'path-step-head');
    head.type = 'button';
    head.setAttribute('aria-expanded', open ? 'true' : 'false');
    head.setAttribute('data-step-head', step.id);
    head.appendChild(el('span', 'path-step-index', String(index + 1)));

    const titles = el('span', 'path-step-titles');
    titles.appendChild(el('span', 'path-step-title', step.title || ('步骤 ' + (index + 1))));
    const sub = el('span', 'path-step-sub');
    sub.appendChild(el('span', '', step.kind || '概念学习'));
    sub.appendChild(el('span', 'path-dot-sep', '·'));
    sub.appendChild(el('span', '', (step.minutes || 0) + ' 分钟'));
    sub.appendChild(el('span', 'path-dot-sep', '·'));
    sub.appendChild(el('span', '', nodeLabel(topic, step.nodeId)));
    titles.appendChild(sub);
    head.appendChild(titles);

    head.appendChild(el('span', 'badge ' + (done ? 'badge-success' : 'badge-neutral'), done ? '已完成' : '未完成'));
    const chevron = el('span', 'path-step-chevron');
    chevron.appendChild(icon('chevron-down', 18));
    head.appendChild(chevron);

    head.addEventListener('click', () => {
      if (openSteps.has(step.id)) openSteps.delete(step.id);
      else openSteps.add(step.id);
      focusStepId = step.id;
      render();
    });
    article.appendChild(head);

    if (open) {
      const body = el('div', 'path-step-body');
      if (step.intro) body.appendChild(el('p', 'path-intro', step.intro));

      (step.sections || []).forEach((section) => {
        const block = el('div', 'path-section');
        block.appendChild(el('h4', '', section.heading || '讲解'));
        block.appendChild(el('p', '', section.body || ''));
        body.appendChild(block);
      });

      if (Array.isArray(step.keyPoints) && step.keyPoints.length) {
        const keyBox = el('div', 'path-keypoints');
        keyBox.appendChild(el('h4', 'path-section-title', '要点'));
        const list = el('ul', 'path-points');
        step.keyPoints.forEach((point) => {
          const item = el('li', '');
          const mark = el('span', 'path-point-mark');
          mark.appendChild(icon('check', 14));
          item.appendChild(mark);
          item.appendChild(el('span', '', point));
          list.appendChild(item);
        });
        keyBox.appendChild(list);
        body.appendChild(keyBox);
      }

      const check = buildCheck(session, step);
      if (check) body.appendChild(check);
      article.appendChild(body);
    }

    const foot = el('div', 'path-step-foot');
    foot.appendChild(el('span', 'path-step-foot-note', done ? '已记录完成（自报进度）' : '完成后可进入下一步；可随时撤销'));
    const toggle = actionBtn(done ? 'ghost' : 'secondary', done ? '撤销完成' : '标记完成', done ? 'x' : 'check', () => {
      toggleStep(session, step);
    }, { size: 'sm' });
    foot.appendChild(toggle);
    article.appendChild(foot);
    return article;
  }

  function buildRetestQuestion(session, question, index) {
    const answers = session.retestAnswers || {};
    const selected = typeof answers[question.id] === 'number' ? answers[question.id] : null;
    const locked = !!session.retestSubmitted;
    const box = el('div', 'path-retest-q');
    const head = el('div', 'path-retest-q-head');
    head.appendChild(el('span', 'path-retest-num', '第 ' + (index + 1) + ' 题'));
    head.appendChild(el('span', 'badge badge-neutral', question.difficulty || '进阶'));
    head.appendChild(el('span', 'badge badge-accent', '与首测不同'));
    box.appendChild(head);
    box.appendChild(el('p', 'path-retest-stem', question.stem));
    const options = buildOptions(question, selected, locked);
    if (!locked) {
      Array.prototype.forEach.call(options.children, (btn, optionIndex) => {
        btn.addEventListener('click', () => answerRetest(session, question, optionIndex));
      });
    }
    box.appendChild(options);
    if (locked) {
      const correct = selected === question.answer;
      const result = el('div', 'path-retest-explain ' + (correct ? 'is-ok' : 'is-bad'));
      result.appendChild(el('strong', '', correct ? '本题作答正确' : '本题作答有误 · 正确答案 ' + (LETTERS[question.answer] || String(question.answer + 1))));
      if (question.explain) result.appendChild(el('p', '', question.explain));
      box.appendChild(result);
    }
    return box;
  }

  function buildCompare(session, topic) {
    const quiz = session.quizResult;
    const retest = session.retestResult;
    const box = el('div', 'path-compare');

    const first = el('div', 'path-compare-col');
    first.appendChild(el('span', 'path-compare-label', '首测'));
    first.appendChild(el('strong', 'path-compare-value', quiz ? (quiz.correct + ' / ' + quiz.total) : '未记录'));
    first.appendChild(el('span', 'path-compare-sub', '疑似断点：' + weakNames(topic, quiz && quiz.weak)));
    box.appendChild(first);

    box.appendChild(el('span', 'path-compare-arrow', '→'));

    const second = el('div', 'path-compare-col is-retest');
    second.appendChild(el('span', 'path-compare-label', '复测'));
    second.appendChild(el('strong', 'path-compare-value', retest ? (retest.correct + ' / ' + retest.total) : '未记录'));
    second.appendChild(el('span', 'path-compare-sub', '本次仍涉及：' + weakNames(topic, retest && retest.weak)));
    box.appendChild(second);
    return box;
  }

  function buildRetest(session, topic) {
    const retest = Array.isArray(topic.retest) ? topic.retest : [];
    const card = el('section', 'card path-retest');
    const head = el('div', 'card-head');
    head.appendChild(el('h2', 'card-title', '复测 · 2 道新题'));
    head.appendChild(el('span', 'badge badge-neutral', '内置知识库'));
    head.appendChild(el('span', 'spacer'));
    head.appendChild(el('span', 'card-sub', '题目与首测不同'));
    card.appendChild(head);

    const body = el('div', 'card-body path-retest-body');
    if (!retest.length) {
      body.appendChild(el('p', 'graph-empty-note', '当前主题没有复测题目（知识库数据未加载）。'));
      card.appendChild(body);
      return card;
    }

    if (!session.retestSubmitted) {
      body.appendChild(el('p', 'path-retest-intro', '以下 2 道题与首测不同。提交后只对照本次作答表现，不据此宣称掌握或能力提升。'));
      retest.forEach((question, index) => body.appendChild(buildRetestQuestion(session, question, index)));

      const answers = session.retestAnswers || {};
      const answeredCount = retest.filter((question) => typeof answers[question.id] === 'number').length;
      const foot = el('div', 'path-retest-actions');
      foot.appendChild(el('span', 'path-cta-hint', '已作答 ' + answeredCount + ' / ' + retest.length + '；两题都作答后可提交'));
      const submit = actionBtn('primary', '提交复测', 'check', () => {
        submitRetest(session, retest);
      }, { size: 'sm', title: answeredCount === retest.length ? '提交复测' : '请先作答全部题目' });
      submit.disabled = answeredCount !== retest.length;
      foot.appendChild(submit);
      body.appendChild(foot);
    } else {
      body.appendChild(buildCompare(session, topic));
      body.appendChild(el('p', 'path-compare-note', '以上仅陈述首测与本次复测的作答结果，不宣称掌握程度或能力提升。'));
      retest.forEach((question, index) => body.appendChild(buildRetestQuestion(session, question, index)));
    }

    card.appendChild(body);
    return card;
  }

  function buildEmpty() {
    const page = el('div', 'v-page path-page');
    const head = el('header', 'v-head');
    const main = el('div', 'v-head-main');
    main.appendChild(el('h1', 'v-title', '学习路径'));
    main.appendChild(el('p', 'v-sub', '分步讲解、微练习与复测'));
    head.appendChild(main);
    page.appendChild(head);

    const card = el('div', 'card');
    const empty = el('div', 'empty');
    const iconBox = el('div', 'empty-icon');
    iconBox.appendChild(icon('layers', 24));
    empty.appendChild(iconBox);
    empty.appendChild(el('h3', '', '还没有学习路径'));
    empty.appendChild(el('p', '', '先从一个概念问题开始诊断，短测提交后会生成可执行、可复测的学习路径。'));
    empty.appendChild(actionBtn('primary', '回到工作台', 'home', () => navigate('home')));
    card.appendChild(empty);
    page.appendChild(card);
    return page;
  }

  function render() {
    if (!mounted) return;
    const data = resolveData();
    const session = data.session;
    const topic = data.topic;
    if (!session || !topic) {
      root.textContent = '';
      root.appendChild(buildEmpty());
      return;
    }
    if (sid !== session.id) sid = session.id;

    const steps = Array.isArray(topic.path) ? topic.path : [];
    if (lastTopicId !== topic.id) {
      lastTopicId = topic.id;
      openSteps = null;
    }
    if (!openSteps) {
      openSteps = new Set();
      const firstOpen = steps.find((step) => !stepDone(session, step.id)) || steps[0];
      if (firstOpen) openSteps.add(firstOpen.id);
    }
    if (!steps.length) {
      root.textContent = '';
      root.appendChild(buildEmpty());
      return;
    }

    const doneCount = steps.filter((step) => stepDone(session, step.id)).length;
    const totalMinutes = steps.reduce((sum, step) => sum + (Number(step.minutes) || 0), 0);
    const canRetest = doneCount === steps.length && steps.length > 0;

    const page = el('div', 'v-page path-page');
    page.appendChild(buildHeader(session, topic));

    if (!session.quizSubmitted) {
      page.appendChild(buildNotice(session));
    } else {
      page.appendChild(buildSummary(session, topic, doneCount, totalMinutes, canRetest));

      const list = el('div', 'path-steps');
      steps.forEach((step, index) => list.appendChild(buildStep(session, topic, step, index)));
      page.appendChild(list);

      if (retestOpen || session.retestSubmitted) {
        page.appendChild(buildRetest(session, topic));
      }
    }

    root.textContent = '';
    root.appendChild(page);

    if (focusStepId) {
      const targetId = focusStepId;
      focusStepId = null;
      const heads = root.querySelectorAll('[data-step-head]');
      for (let i = 0; i < heads.length; i += 1) {
        if (heads[i].getAttribute('data-step-head') === targetId) {
          heads[i].focus({ preventScroll: true });
          break;
        }
      }
    }
  }

  try {
    if (typeof subscribe === 'function') {
      unsubscribe = subscribe((_state, event) => {
        if (event === 'save:pending' || event === 'save:done') return;
        render();
      });
    }
  } catch (err) {
    unsubscribe = null;
  }

  render();

  return function cleanup() {
    mounted = false;
    if (rafId) window.cancelAnimationFrame(rafId);
    if (typeof unsubscribe === 'function') unsubscribe();
    root.textContent = '';
  };
}
