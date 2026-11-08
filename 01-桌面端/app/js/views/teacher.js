/* teacher.js · 班级与学情
 * 依赖 core/generate.js：loadScenarios（教师场景知识库）
 * 依赖 core/ui.js：h、icon
 * 依赖 core/bridge.js：exportMarkdown
 * 依赖 core/feedback.js：toast
 *
 * 班级数据来自教师场景的 classProfile（示例班级），不代表真实学生。
 */

import { navigate } from '../core/router.js';
import { h, icon } from '../core/ui.js';
import { state } from '../core/store.js';
import { exportMarkdown } from '../core/bridge.js';
import { toast } from '../core/feedback.js';
import { loadScenarios, selectScenario } from '../core/generate.js';

const TREND = {
  up: { label: '上升', arrow: '↑', cls: 'is-up' },
  flat: { label: '持平', arrow: '→', cls: 'is-flat' },
  down: { label: '下降', arrow: '↓', cls: 'is-down' }
};

const THRESHOLD = 0.4;

function el(tag, cls, text) {
  const node = h(tag, cls ? { className: cls } : {});
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

function actionBtn(kind, label, iconName, onClick, opts) {
  const options = opts || {};
  const btn = el('button', `btn btn-${kind}${options.size ? ` btn-${options.size}` : ''}`);
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

function pctText(ratio) {
  return `${Math.round((Number(ratio) || 0) * 100)}%`;
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function dateStamp(date) {
  const value = date || new Date();
  return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;
}

function pointsOf(profile) {
  const list = profile && Array.isArray(profile.weakPoints) ? profile.weakPoints.slice() : [];
  const sampleSize = Number(profile && profile.sampleSize) || 40;
  return list.map((point) => {
    const ratio = Math.max(0, Math.min(1, Number(point.ratio) || 0));
    return {
      label: point.label || '未命名断点',
      ratio,
      students: Number(point.students) || Math.round(ratio * sampleSize),
      trend: TREND[point.trend] ? point.trend : 'flat'
    };
  }).sort((a, b) => b.ratio - a.ratio);
}

function buildSuggestions(points, scenario) {
  const suggestions = [];
  const [top, second, third] = points;

  if (top) {
    suggestions.push(`先处理「${top.label}」（${pctText(top.ratio)}，约 ${top.students} 人）：用 8–10 分钟回到该概念的基本定义，用一道辨析题确认学生没有把相邻概念混用。`);
  }
  if (second) {
    suggestions.push(`把「${second.label}」（${pctText(second.ratio)}，约 ${second.students} 人）与「${top ? top.label : '首要断点'}」放进同一组对比练习，先讲清两者的先后关系，再分别训练。`);
  }
  if (third) {
    suggestions.push(`对「${third.label}」（${pctText(third.ratio)}，约 ${third.students} 人）安排课后 5 分钟微练习；未超过阈值的断点做个别跟进。`);
  }
  while (suggestions.length < 3) {
    suggestions.push(`围绕「${scenario ? scenario.title : '本节内容'}」做一次出口题检测，根据当堂结果决定下一课时的补偿重点。`);
  }
  return suggestions.slice(0, 3);
}

function escapeCell(text) {
  return String(text === undefined || text === null ? '' : text)
    .replace(/\|/g, '\\|')
    .replace(/\n/g, ' ');
}

function buildMarkdown(scenario, profile, points) {
  const lines = [];
  lines.push('# 智析 AI · 班级学情报告');
  lines.push('');
  lines.push('> 示例班级数据，不代表真实学生。报告由本地知识库数据生成，全部计算在本机完成。');
  lines.push('');
  lines.push('- 教学场景：' + [scenario.stage, scenario.subject, scenario.textbook].filter(Boolean).join(' · '));
  lines.push('- 内容主题：' + scenario.title);
  lines.push('- 班级：' + (profile.className || '示例班级'));
  lines.push('- 学期：' + (profile.term || '2026 秋季学期'));
  lines.push('- 样本量：' + (Number(profile.sampleSize) || 0) + ' 人');
  lines.push('- 导出时间：' + dateStamp());
  lines.push('');
  lines.push('## 共性断点（阈值 40%）');
  lines.push('');
  lines.push('| 排名 | 前置概念 | 占比 | 涉及人数 | 趋势 | 判定 |');
  lines.push('| --- | --- | --- | --- | --- | --- |');
  points.forEach((point, index) => {
    const trend = TREND[point.trend] || TREND.flat;
    lines.push(`| ${index + 1} | ${escapeCell(point.label)} | ${pctText(point.ratio)} | ${point.students} 人 | ${trend.label} | ${point.ratio > THRESHOLD ? '共性断点' : '关注'} |`);
  });
  lines.push('');
  lines.push('## 讲评建议');
  lines.push('');
  buildSuggestions(points, scenario).forEach((text, index) => {
    lines.push(`${index + 1}. ${text}`);
  });
  lines.push('');
  lines.push('## 说明');
  lines.push('');
  lines.push('- 比例 = 该前置概念被判定为断点的学生数 / 样本量；趋势为与上一次快照的比较。');
  lines.push('- 班级数据来自教师场景的示例班级，用于展示共性断点的聚合方式。');
  lines.push('- 讲评建议由上方数据自动生成，仅供备课时参考。');
  return lines.join('\n');
}

export function mount(root) {
  let mounted = true;
  let scenarios = [];
  let scenario = null;
  let loading = true;

  function currentProfile() {
    return (scenario && scenario.classProfile) || {
      className: '示例班级',
      sampleSize: 40,
      term: '2026 秋季学期',
      weakPoints: []
    };
  }

  async function doExport() {
    if (!scenario) return;
    const profile = currentProfile();
    const points = pointsOf(profile);
    const filename = `智析AI-班级学情-${dateStamp()}.md`;
    try {
      const result = await exportMarkdown(filename, buildMarkdown(scenario, profile, points));
      if (result && result.ok) {
        toast('报告已导出' + (result.path ? '：' + result.path : ''), 'success');
      } else {
        toast('导出失败：' + ((result && result.error) || '桌面桥不可用'), 'error');
      }
    } catch (err) {
      toast('导出失败，请在桌面客户端中重试', 'error');
    }
  }

  function scenarioSelect() {
    const select = el('select', 'select teacher-class-select');
    select.id = 'teacher-class-select';
    select.setAttribute('aria-label', '选择教学场景');
    select.title = '切换学段、学科与教材场景';
    scenarios.forEach((item) => {
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = `${item.stage} · ${item.subject} · ${item.title}`;
      if (scenario && item.id === scenario.id) option.selected = true;
      select.appendChild(option);
    });
    select.addEventListener('change', () => {
      scenario = scenarios.find((item) => item.id === select.value) || scenario;
      render();
      const next = root.querySelector('#teacher-class-select');
      if (next) next.focus({ preventScroll: true });
    });
    return select;
  }

  function buildHeader() {
    const head = el('header', 'v-head');
    const main = el('div', 'v-head-main');
    main.appendChild(el('h1', 'v-title', '班级与学情'));
    main.appendChild(el('p', 'v-sub', scenario
      ? `${scenario.stage} · ${scenario.subject} · ${scenario.title} · 示例班级共性断点与讲评建议`
      : '示例班级共性断点与讲评建议'));
    head.appendChild(main);
    if (scenario) {
      const actionsBox = el('div', 'v-head-actions');
      actionsBox.appendChild(actionBtn('primary', '导出 Markdown 报告', 'download', doExport, {
        title: '导出当前场景的班级学情报告'
      }));
      head.appendChild(actionsBox);
    }
    return head;
  }

  function buildBanner() {
    const banner = el('div', 'teacher-demo');
    banner.appendChild(icon('info', 18));
    const box = el('div', 'teacher-demo-text');
    box.appendChild(el('strong', '', '示例班级数据，不代表真实学生。'));
    box.appendChild(el('span', '', '样本量、比例、趋势与讲评建议均来自教师场景知识库，未接入任何班级系统，也不会上传数据。'));
    banner.appendChild(box);
    return banner;
  }

  function buildMeta(profile) {
    const card = el('section', 'card teacher-meta');
    const field = el('div', 'field teacher-class-field');
    const label = el('label', 'label', '教学场景');
    label.setAttribute('for', 'teacher-class-select');
    field.appendChild(label);
    field.appendChild(scenarioSelect());
    field.appendChild(el('span', 'hint', '切换场景只改变当前知识库视图，不写入任何学生数据。'));
    card.appendChild(field);

    const sample = el('div', 'teacher-stat');
    sample.appendChild(el('span', 'teacher-stat-label', '样本量'));
    sample.appendChild(el('strong', 'teacher-stat-value', `${Number(profile.sampleSize) || 0} 人`));
    sample.appendChild(el('span', 'teacher-stat-sub', '示例样本'));
    card.appendChild(sample);

    const term = el('div', 'teacher-stat');
    term.appendChild(el('span', 'teacher-stat-label', '学期'));
    term.appendChild(el('strong', 'teacher-stat-value', profile.term || '2026 秋季学期'));
    term.appendChild(el('span', 'teacher-stat-sub', profile.className || '示例班级'));
    card.appendChild(term);

    return card;
  }

  function buildBreakRow(point, index) {
    const common = point.ratio > THRESHOLD;
    const row = el('div', `teacher-break${common ? ' is-common' : ''}`);

    const head = el('div', 'teacher-break-head');
    const titleBox = el('div', 'teacher-break-title');
    if (index < 3) titleBox.appendChild(el('span', 'badge badge-neutral', `Top ${index + 1}`));
    titleBox.appendChild(el('span', 'teacher-break-label', point.label));
    if (common) titleBox.appendChild(el('span', 'badge badge-danger', '共性断点'));
    head.appendChild(titleBox);
    head.appendChild(el('span', 'teacher-break-value', `${pctText(point.ratio)} · ${point.students} 人`));
    row.appendChild(head);

    const bar = el('div', 'teacher-bar');
    bar.setAttribute('role', 'img');
    bar.setAttribute('aria-label', `${point.label} 断点占比 ${pctText(point.ratio)}，涉及 ${point.students} 人`);
    const fill = el('i', '');
    fill.style.width = `${Math.max(2, Math.round(point.ratio * 100))}%`;
    bar.appendChild(fill);
    const threshold = el('span', 'teacher-threshold');
    threshold.setAttribute('aria-hidden', 'true');
    threshold.title = '共性断点阈值 40%';
    bar.appendChild(threshold);
    row.appendChild(bar);

    const foot = el('div', 'teacher-break-foot');
    foot.appendChild(el('span', 'teacher-break-layer', `排名 ${index + 1} / ${common ? '超过 40% 阈值' : '低于 40% 阈值'}`));
    const trend = TREND[point.trend] || TREND.flat;
    const trendEl = el('span', `teacher-trend ${trend.cls}`);
    trendEl.appendChild(el('span', 'teacher-trend-arrow', trend.arrow));
    trendEl.appendChild(el('span', '', trend.label));
    foot.appendChild(trendEl);
    row.appendChild(foot);
    return row;
  }

  function buildChart(points) {
    const card = el('section', 'card teacher-chart teacher-weak');
    const head = el('div', 'card-head');
    head.appendChild(el('h2', 'card-title', '共性断点'));
    head.appendChild(el('span', 'badge badge-neutral', '阈值 40%'));
    head.appendChild(el('span', 'spacer'));
    head.appendChild(el('span', 'card-sub', '按断点占比排序'));
    card.appendChild(head);

    const body = el('div', 'card-body teacher-chart-body');
    body.appendChild(el('p', 'teacher-chart-note', '条形长度 = 被判定为该前置断点的学生占比。超过 40% 标记为「共性断点」。'));

    if (!points.length) {
      body.appendChild(el('p', 'graph-empty-note', '当前场景没有提供班级断点数据。'));
    } else {
      points.forEach((point, index) => body.appendChild(buildBreakRow(point, index)));
    }
    card.appendChild(body);

    const foot = el('div', 'teacher-chart-foot');
    foot.appendChild(el('span', 'teacher-threshold-key'));
    foot.appendChild(el('span', '', '虚线为 40% 共性断点阈值 · 示例班级数据'));
    card.appendChild(foot);
    return card;
  }

  function buildAdvice(points) {
    const card = el('section', 'card teacher-advice');
    const head = el('div', 'card-head');
    head.appendChild(el('h2', 'card-title', '讲评建议'));
    head.appendChild(el('span', 'badge badge-warning', '基于断点生成'));
    card.appendChild(head);

    const body = el('div', 'card-body');
    body.appendChild(el('p', 'teacher-side-note', '基于上方数据自动生成的三条建议，供讲评参考。'));
    const list = el('ol', 'teacher-advice-list');
    buildSuggestions(points, scenario).forEach((text, index) => {
      const item = el('li', 'teacher-advice-item');
      item.appendChild(el('span', 'teacher-advice-num', String(index + 1)));
      item.appendChild(el('p', '', text));
      list.appendChild(item);
    });
    body.appendChild(list);
    card.appendChild(body);
    return card;
  }

  function buildSummary(points, profile) {
    const card = el('section', 'card teacher-layers');
    const head = el('div', 'card-head');
    head.appendChild(el('h2', 'card-title', '学情摘要'));
    head.appendChild(el('span', 'badge badge-neutral', '示例数据'));
    card.appendChild(head);

    const body = el('div', 'card-body');
    const over = points.filter((point) => point.ratio > THRESHOLD);
    const bandList = [
      { label: '高（≥ 50%）', min: 0.5, max: 1.01 },
      { label: '中（40%–50%）', min: 0.4, max: 0.5 },
      { label: '关注（< 40%）', min: 0, max: 0.4 }
    ];
    body.appendChild(el('p', 'teacher-side-note', `共 ${points.length} 个断点，其中 ${over.length} 个超过 40% 阈值，涉及约 ${over.reduce((sum, item) => sum + item.students, 0)} 人次。`));

    const list = el('div', 'teacher-layer-list');
    bandList.forEach((band) => {
      const hit = points.filter((point) => point.ratio >= band.min && point.ratio < band.max);
      const row = el('div', 'teacher-layer-row');
      const top = el('div', 'teacher-layer-head');
      top.appendChild(el('span', 'teacher-layer-label', band.label));
      top.appendChild(el('span', 'teacher-layer-value', `${hit.length} 个断点`));
      row.appendChild(top);
      const bar = el('div', 'teacher-layer-bar');
      const fill = el('i', '');
      fill.style.width = `${Math.max(3, Math.round(hit.length / Math.max(1, points.length) * 100))}%`;
      bar.appendChild(fill);
      row.appendChild(bar);
      list.appendChild(row);
    });
    body.appendChild(list);

    if (profile.className) {
      const note = el('p', 'teacher-summary-note', `${profile.className} · 样本 ${Number(profile.sampleSize) || 0} 人 · ${profile.term || '2026 秋季学期'}。数据来自教师场景知识库。`);
      body.appendChild(note);
    }
    card.appendChild(body);
    return card;
  }

  function buildEmpty() {
    const page = el('div', 'v-page teacher-page');
    page.appendChild(buildHeader());
    page.appendChild(buildBanner());
    const card = el('div', 'card');
    const empty = el('div', 'empty');
    empty.appendChild(el('span', 'empty-icon')).appendChild(icon('users', 24));
    empty.appendChild(el('h3', '', '还没有可展示的班级数据'));
    empty.appendChild(el('p', '', '班级与学情依赖教师场景知识库。请稍后重试，或先回到教师工作台。'));
    empty.appendChild(actionBtn('primary', '回到教师工作台', 'arrow-left', () => navigate('teacher-workbench')));
    card.appendChild(empty);
    page.appendChild(card);
    return page;
  }

  function render() {
    if (!mounted) return;
    if (loading) {
      const page = el('div', 'v-page teacher-page');
      page.appendChild(el('div', 'tw-loading skeleton sk-block'));
      root.textContent = '';
      root.appendChild(page);
      return;
    }
    if (!scenario) {
      root.textContent = '';
      root.appendChild(buildEmpty());
      return;
    }

    const profile = currentProfile();
    const points = pointsOf(profile);

    const page = el('div', 'v-page teacher-page');
    page.appendChild(buildHeader());
    page.appendChild(buildBanner());
    page.appendChild(buildMeta(profile));

    const split = el('div', 'split teacher-split');
    split.appendChild(buildChart(points));
    const rail = el('aside', 'teacher-rail');
    rail.appendChild(buildAdvice(points));
    rail.appendChild(buildSummary(points, profile));
    split.appendChild(rail);
    page.appendChild(split);

    root.textContent = '';
    root.appendChild(page);
  }

  (async function init() {
    try {
      scenarios = await loadScenarios();
    } catch (err) {
      scenarios = [];
    }
    scenario = selectScenario(state.settings, scenarios);
    if (!scenario && scenarios.length) scenario = scenarios[0];
    loading = false;
    render();
  })();

  return function cleanup() {
    mounted = false;
    root.textContent = '';
  };
}
