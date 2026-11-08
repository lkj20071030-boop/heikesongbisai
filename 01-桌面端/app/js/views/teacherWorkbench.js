/* teacherWorkbench.js · 教师工作台（三栏）与教师知识图谱（view='graph'）
 *
 * 左：需求 → 中：方案 → 右：依据。
 * 方案由 core/generate.js 的本地知识引擎生成；配置模型后优先调用模型，失败回退本地。
 * 所有来源均取自场景资料与教师资料库，不编造页码或结论。
 */

import { state } from '../core/store.js';
import { navigate } from '../core/router.js';
import { h, icon, fmtDate } from '../core/ui.js';
import { toast } from '../core/feedback.js';
import {
  PLAN_STAGES,
  stageProfile,
  planTunes,
  loadScenarios,
  selectScenario,
  generatePlan,
  librarySourcesOf,
  activeVersionOf,
  planVersionCount,
  savePlanVersion,
  courseInfo
} from '../core/generate.js';
import { exportPlanMarkdown } from '../core/export.js';

const LAYER_NAMES = ['基础层', '前置层', '邻近层', '目标层'];

const TYPE_BADGE = {
  教材: 'badge-accent',
  课标: 'badge-success',
  解读: 'badge-info',
  校本: 'badge-warning',
  外部: 'badge-neutral',
  资料: 'badge-neutral'
};

// 右栏一次只呈现一个依据面板，避免四张卡片竖向堆叠造成空板与拼图感。
const RAIL_TABS = [
  { id: 'graph', label: '图谱', icon: 'git-branch' },
  { id: 'sources', label: '资料', icon: 'book-open' },
  { id: 'quality', label: '质检', icon: 'check-circle' },
  { id: 'class', label: '学情', icon: 'users' }
];

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
  if (options.disabled) btn.disabled = true;
  if (iconName) btn.appendChild(icon(iconName, options.size === 'sm' ? 14 : 16));
  btn.appendChild(el('span', 'btn-label', label));
  if (onClick) btn.addEventListener('click', onClick);
  return btn;
}

function iconButton(label, iconName, onClick) {
  const btn = el('button', 'icon-btn');
  btn.type = 'button';
  btn.title = label;
  btn.setAttribute('aria-label', label);
  btn.appendChild(icon(iconName, 17));
  btn.addEventListener('click', onClick);
  return btn;
}

function short(text, max) {
  const chars = Array.from(String(text || ''));
  const limit = max || 20;
  return chars.length > limit ? `${chars.slice(0, limit).join('')}…` : chars.join('');
}

function totalMinutes(flow) {
  return (Array.isArray(flow) ? flow : []).reduce((sum, item) => sum + (Number(item.minutes) || 0), 0);
}

function percent(value) {
  return `${Math.round((Number(value) || 0) * 100)}%`;
}

function layerOf(node) {
  const layer = Number(node && node.layer);
  return Number.isFinite(layer) ? Math.max(0, Math.min(3, layer)) : 0;
}

function svgEl(tag, attrs, text) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  if (attrs) {
    Object.keys(attrs).forEach((key) => {
      const value = attrs[key];
      if (value === undefined || value === null || value === false) return;
      node.setAttribute(key, String(value));
    });
  }
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

let svgSeq = 0;

// 未保存方案的会话内缓存：切到图谱模式或资料库再回来时不丢失当前草稿。
// 「新建方案」会通过 params.fresh 显式清空。
const draftCache = {
  plan: null,
  recordId: null,
  scenarioId: '',
  request: null
};

function buildGraphSvg(graph, options, onSelect) {
  const opts = options || {};
  const nodes = Array.isArray(graph && graph.nodes) ? graph.nodes : [];
  const edges = Array.isArray(graph && graph.edges) ? graph.edges : [];
  const large = !!opts.large;

  // 放大页横向 4 列；右栏窄，改为竖向 4 层，避免缩略图字号过小。
  const vertical = !large;
  const nodeWidth = large ? 158 : 96;
  const nodeHeight = large ? 44 : 32;
  const colWidth = large ? 208 : 118;
  const rowHeight = large ? 66 : 54;
  const padX = large ? 26 : 8;
  const padY = large ? 24 : 8;

  const byLayer = [0, 1, 2, 3].map((layer) => nodes.filter((node) => layerOf(node) === layer));
  const maxRows = Math.max(1, ...byLayer.map((list) => list.length));
  const columns = vertical ? Math.max(2, maxRows) : maxRows;
  const width = vertical
    ? padX * 2 + (columns - 1) * colWidth + nodeWidth
    : padX * 2 + colWidth * 3 + nodeWidth;
  const height = vertical
    ? padY * 2 + rowHeight * 3 + nodeHeight
    : padY * 2 + maxRows * rowHeight;

  const svg = svgEl('svg', {
    viewBox: `0 0 ${width} ${height}`,
    class: `tw-graph-svg${large ? ' is-large' : ' is-compact'}`,
    role: 'img',
    'aria-label': `知识图谱，共 ${nodes.length} 个节点、${edges.length} 条关系`
  });

  const markerId = `tw-arrow-${++svgSeq}`;
  const defs = svgEl('defs');
  const marker = svgEl('marker', {
    id: markerId,
    viewBox: '0 0 10 10',
    refX: '8',
    refY: '5',
    markerWidth: large ? '6' : '5',
    markerHeight: large ? '6' : '5',
    orient: 'auto-start-reverse'
  });
  marker.appendChild(svgEl('path', { d: 'M 0 0 L 10 5 L 0 10 z', class: 'tw-arrow-head' }));
  defs.appendChild(marker);
  svg.appendChild(defs);

  const positions = new Map();
  byLayer.forEach((list, layerIndex) => {
    const offset = (columns - list.length) / 2;
    list.forEach((node, rowIndex) => {
      positions.set(node.id, vertical
        ? {
            x: padX + (rowIndex + offset) * colWidth,
            y: padY + layerIndex * rowHeight,
            w: nodeWidth,
            h: nodeHeight
          }
        : {
            x: padX + layerIndex * colWidth,
            y: padY + (rowIndex + offset) * rowHeight,
            w: nodeWidth,
            h: nodeHeight
          });
    });
  });

  const labelOf = (id) => {
    const node = nodes.find((item) => item.id === id);
    return node ? (node.label || node.id) : id;
  };

  edges.forEach((edge) => {
    const from = positions.get(edge.from);
    const to = positions.get(edge.to);
    if (!from || !to) return;
    let d;
    if (vertical) {
      const x1 = from.x + from.w / 2;
      const y1 = from.y + from.h;
      const x2 = to.x + to.w / 2;
      const y2 = to.y;
      const midY = (y1 + y2) / 2;
      d = `M${x1},${y1} C${x1},${midY} ${x2},${midY} ${x2},${y2}`;
    } else {
      const x1 = from.x + from.w;
      const y1 = from.y + from.h / 2;
      const x2 = to.x;
      const y2 = to.y + to.h / 2;
      const mid = (x1 + x2) / 2;
      d = `M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2},${y2}`;
    }
    const confidence = Number(edge.confidence);
    const review = Number.isFinite(confidence) && confidence < 0.85;
    const path = svgEl('path', {
      d,
      class: `tw-edge${review ? ' is-review' : ''}`,
      'marker-end': `url(#${markerId})`
    });
    path.appendChild(svgEl('title', {},
      `${labelOf(edge.from)} → ${labelOf(edge.to)} · 置信度 ${percent(confidence)}${edge.relation ? ` · ${edge.relation}` : ''}`));
    svg.appendChild(path);
  });

  nodes.forEach((node) => {
    const pos = positions.get(node.id);
    if (!pos) return;
    const selected = node.id === opts.selectedId;
    const isTarget = layerOf(node) === 3 || node.kind === 'target';
    const group = svgEl('g', {
      class: `tw-node${selected ? ' is-selected' : ''}${isTarget ? ' is-target' : ''}`,
      tabindex: '0',
      role: 'button',
      'aria-label': `${node.label || node.id}，${LAYER_NAMES[layerOf(node)]}，点击查看来源`
    });
    group.appendChild(svgEl('title', {},
      `${node.label || node.id} · ${LAYER_NAMES[layerOf(node)]}${node.desc ? ` · ${node.desc}` : ''}`));
    group.appendChild(svgEl('rect', {
      x: pos.x,
      y: pos.y,
      width: pos.w,
      height: pos.h,
      rx: large ? 9 : 7,
      class: 'tw-node-box'
    }));
    group.appendChild(svgEl('text', {
      x: pos.x + pos.w / 2,
      y: pos.y + pos.h / 2 + (large ? 4 : 3),
      class: 'tw-node-label',
      'text-anchor': 'middle'
    }, short(node.label || node.id, large ? 12 : 7)));
    if (onSelect) {
      group.addEventListener('click', () => onSelect(node.id));
      group.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(node.id);
        }
      });
    }
    svg.appendChild(group);
  });

  return svg;
}

function sourceBadge(type) {
  return el('span', `badge ${TYPE_BADGE[type] || 'badge-neutral'}`, type || '资料');
}

export function mount(root, ctx) {
  const params = (ctx && ctx.params) || {};
  let mounted = true;
  let scenarios = [];
  let scenario = null;
  let plan = null;
  let recordId = null;
  let loading = true;
  let generating = false;
  let stageIndex = -1;
  let view = params.view === 'graph' ? 'graph' : 'workbench';
  let selectedNodeId = params.nodeId || null;
  let advancedOpen = false;
  let riskOpen = false;
  let railTab = 'graph';
  let railRefresh = null;
  let request = {
    need: '',
    lessonType: '新授课',
    duration: 40,
    level: '混合',
    constraints: []
  };

  function profileNow() {
    return stageProfile(scenario && scenario.stage);
  }

  function requestForScenario(next, previous) {
    const profile = stageProfile(next && next.stage);
    const bounds = profile.durationRange || [20, 180];
    const prevDuration = previous ? Number(previous.duration) : NaN;
    const duration = Number.isFinite(prevDuration) && prevDuration >= bounds[0] && prevDuration <= bounds[1]
      ? Math.round(prevDuration)
      : profile.defaultDuration;
    return {
      need: '',
      lessonType: profile.defaultLessonType,
      duration,
      level: '混合',
      constraints: []
    };
  }

  function effectiveSettings() {
    // 折叠只是收起面板，不应丢弃用户已选的学情与约束；左栏摘要始终与生成参数一致。
    return { level: request.level, constraints: request.constraints.slice() };
  }

  /* ---------- 数据 ---------- */

  function findScenarioForPlan(savedPlan) {
    if (!savedPlan) return null;
    if (savedPlan.scenarioId) {
      const exact = scenarios.find((item) => item.id === savedPlan.scenarioId);
      if (exact) return exact;
    }
    const title = String(savedPlan.title || '');
    return scenarios.find((item) => {
      if (!item.title || title.indexOf(item.title) === -1) return false;
      if (savedPlan.subject && item.subject !== savedPlan.subject) return false;
      return true;
    }) || null;
  }

  function readActivePlan() {
    const id = state.activePlanId;
    if (!id) return false;
    const record = (state.plans || []).find((item) => item.id === id);
    const data = record ? activeVersionOf(record) : null;
    if (!data) return false;
    plan = data;
    plan.id = record.id;
    recordId = record.id;
    const matched = findScenarioForPlan(plan);
    if (matched) scenario = matched;
    const profile = stageProfile(plan.stage || (scenario && scenario.stage));
    request = {
      need: plan.need || '',
      lessonType: profile.lessonTypes.indexOf(plan.lessonType) !== -1 ? plan.lessonType : profile.defaultLessonType,
      duration: Math.max(20, Number(plan.duration) || profile.defaultDuration),
      level: profile.levels.indexOf(plan.level) !== -1 ? plan.level : '混合',
      constraints: Array.isArray(plan.constraints)
        ? plan.constraints.filter((item) => profile.constraints.indexOf(item) !== -1)
        : []
    };
    riskOpen = false;
    cacheDraft();
    return true;
  }

  function currentRecord() {
    if (!recordId) return null;
    return (state.plans || []).find((item) => item.id === recordId) || null;
  }

  function cacheDraft() {
    draftCache.plan = plan || null;
    draftCache.recordId = recordId;
    draftCache.scenarioId = scenario ? scenario.id : '';
    draftCache.request = { ...request, constraints: request.constraints.slice() };
  }

  function clearDraftCache() {
    draftCache.plan = null;
    draftCache.recordId = null;
    draftCache.scenarioId = '';
    draftCache.request = null;
  }

  function versionCount() {
    return planVersionCount(currentRecord());
  }

  function sources() {
    if (plan && Array.isArray(plan.sources) && plan.sources.length) return plan.sources;
    return (scenario && scenario.sources) || [];
  }

  function graphData() {
    if (plan && plan.graph && Array.isArray(plan.graph.nodes) && plan.graph.nodes.length) return plan.graph;
    return (scenario && scenario.graph) || { nodes: [], edges: [] };
  }

  function sourceOf(id) {
    return sources().find((item) => item.id === id) || null;
  }

  function selectedNode() {
    if (!selectedNodeId) return null;
    const graph = graphData();
    return (graph.nodes || []).find((node) => node.id === selectedNodeId) || null;
  }

  function ensureSelectedNode() {
    if (selectedNodeId) return;
    const nodes = graphData().nodes || [];
    const target = nodes.find((node) => layerOf(node) === 3) || nodes[0];
    if (target) selectedNodeId = target.id;
  }

  /* ---------- 交互 ---------- */

  function applyScenario(next) {
    if (!next || next === scenario) return;
    const previous = request;
    scenario = next;
    plan = null;
    recordId = null;
    selectedNodeId = null;
    request = requestForScenario(next, previous);
    advancedOpen = false;
    riskOpen = false;
    clearDraftCache();
    render();
  }

  function applyExample(text) {
    request.need = String(text || '');
    const area = root.querySelector('.tw-need');
    if (area) {
      area.value = request.need;
      area.focus();
      area.setSelectionRange(area.value.length, area.value.length);
    }
  }

  function flashSource(id) {
    const items = root.querySelectorAll('[data-source-id]');
    for (const item of items) {
      if (item.getAttribute('data-source-id') !== id) continue;
      item.classList.add('is-flash');
      try {
        item.scrollIntoView({ block: 'center', behavior: 'smooth' });
      } catch (err) {
        item.scrollIntoView();
      }
      window.setTimeout(() => item.classList.remove('is-flash'), 1300);
      return;
    }
    toast('该来源不在当前方案的资料列表中', 'info');
  }

  function selectNode(id) {
    selectedNodeId = id;
    // 工作台内点选节点只刷新右栏，避免整页重绘把方案滚动位置带回顶部。
    if (view === 'workbench' && typeof railRefresh === 'function') {
      railRefresh();
      return;
    }
    render();
  }

  async function runGenerate(tuneKey) {
    if (!scenario || generating) return;
    const need = request.need.trim();
    if (!need) {
      toast('请先写下本次需求，例如课时、学情与课堂限制', 'warning');
      const area = root.querySelector('.tw-need');
      if (area) area.focus();
      return;
    }
    const baseId = recordId;
    generating = true;
    stageIndex = 0;
    render();

    const eff = effectiveSettings();
    const payload = {
      need,
      lessonType: request.lessonType,
      duration: request.duration,
      level: eff.level,
      constraints: eff.constraints,
      tune: tuneKey || ''
    };

    try {
      const result = await generatePlan({
        request: payload,
        scenario,
        settings: state.settings,
        onStage: (stage) => {
          if (!mounted) return;
          const index = PLAN_STAGES.findIndex((item) => item.id === stage);
          if (index >= 0) {
            stageIndex = index;
            render();
          }
        }
      });
      if (!mounted) return;
      if (!result) throw new Error('生成结果为空');
      plan = result;
      if (baseId) plan.id = baseId;
      if (tuneKey) {
        const tune = planTunes(profileNow().stage).find((item) => item.key === tuneKey);
        plan.tune = tuneKey;
        plan.tuneLabel = tune ? tune.label : '';
      }
      selectedNodeId = null;
      stageIndex = PLAN_STAGES.length;
      riskOpen = false;
      cacheDraft();
      toast(
        plan.source === 'llm'
          ? `方案已由模型「${plan.model || '已配置模型'}」生成`
          : '方案已由本地知识引擎生成',
        'success'
      );
    } catch (err) {
      toast('生成失败：' + (err && err.message ? err.message : '请重试'), 'error');
    } finally {
      if (mounted) {
        generating = false;
        render();
      }
    }
  }

  async function doSave() {
    if (!plan) return;
    const existed = !!currentRecord();
    const note = plan.tune
      ? '微调 · ' + (plan.tuneLabel || plan.tune)
      : existed
        ? '重新生成'
        : '初版';
    const record = savePlanVersion(plan, note);
    if (!record) {
      toast('保存失败，请重试', 'error');
      return;
    }
    recordId = record.id;
    plan.id = record.id;
    cacheDraft();
    render();
    toast('已保存 · 第 ' + planVersionCount(record) + ' 版', 'success');
  }

  async function doExport() {
    if (!plan) return;
    const result = await exportPlanMarkdown(plan);
    if (result && result.ok) {
      toast('方案已导出' + (result.path ? '：' + result.path : ''), 'success');
    } else {
      toast('导出失败：' + ((result && result.error) || '桌面桥不可用'), 'error');
    }
  }

  function openGraph() {
    if (!scenario) return;
    navigate('teacher-graph', selectedNodeId ? { nodeId: selectedNodeId } : {});
  }

  function scenarioSelect(cls) {
    const select = el('select', `select ${cls || 'tw-scenario'}`);
    select.setAttribute('aria-label', '切换教学场景');
    select.title = '切换学段、学科与教材场景';
    scenarios.forEach((item) => {
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = item.custom
        ? `${item.stage} · ${item.subject} · 通用结构`
        : `${item.stage} · ${item.subject} · ${item.textbook} · ${item.title}`;
      if (scenario && item.id === scenario.id) option.selected = true;
      select.appendChild(option);
    });
    select.addEventListener('change', () => {
      applyScenario(scenarios.find((item) => item.id === select.value) || scenario);
    });
    return select;
  }

  /* ---------- 顶部身份条 ---------- */

  function buildTop() {
    const top = el('header', 'tw-top card');

    const main = el('div', 'tw-top-main');
    const titleRow = el('div', 'tw-title-row');
    titleRow.appendChild(el('h1', 'tw-title', view === 'graph' ? '教师知识图谱' : '教师工作台'));
    titleRow.appendChild(el('span', 'badge badge-accent', view === 'graph' ? '图谱模式' : '教学方案'));
    main.appendChild(titleRow);
    main.appendChild(el('p', 'tw-sub', view === 'graph'
      ? '左侧查看完整概念关系，右侧核对节点说明与资料来源。'
      : '选课程、说需求，生成可追溯来源的教学方案；右侧按标签核对图谱、资料与质检。'));

    const identity = el('div', 'tw-id-row');
    const profile = scenario
      ? [scenario.stage, scenario.subject, scenario.textbook].filter(Boolean)
      : [state.settings.stage, state.settings.subject, state.settings.textbook].filter(Boolean);
    profile.forEach((text) => identity.appendChild(el('span', 'tw-id-chip', text)));
    const className = (scenario && scenario.classProfile && scenario.classProfile.className)
      || state.settings.className;
    if (className) identity.appendChild(el('span', 'tw-id-chip', className));
    const course = courseInfo(scenario && scenario.course);
    if (course.code) identity.appendChild(el('span', 'tw-id-chip', `课程 ${course.code}`));
    main.appendChild(identity);
    top.appendChild(main);

    const side = el('div', 'tw-top-side');
    const engineRow = el('div', 'tw-engine-row');
    const llm = (state.settings && state.settings.llm) || {};
    const connected = !!(llm.apiKey && llm.model);
    const engine = el(
      'span',
      `badge ${connected ? 'badge-success' : 'badge-neutral'} tw-engine`,
      connected ? `已连接 · ${llm.model}` : '本地知识引擎'
    );
    engine.title = connected
      ? '已配置 API Key；生成时优先调用模型，失败自动回退本地引擎'
      : '未配置 API Key；使用本地知识引擎生成方案';
    engineRow.appendChild(icon('cpu', 14));
    engineRow.appendChild(engine);
    side.appendChild(engineRow);

    const controls = el('div', 'tw-top-controls');
    if (scenarios.length) controls.appendChild(scenarioSelect());
    side.appendChild(controls);

    // 顶部只保留「新建方案」与图谱返回；我的方案 / 资料库 / 班级学情 / 设置均在侧栏与右栏标签内。
    const actions = el('div', 'tw-top-actions');
    actions.appendChild(actionBtn('secondary', '新建方案', 'plus', () => {
      clearDraftCache();
      state.activePlanId = null;
      navigate('teacher-workbench', { fresh: true });
    }, { size: 'sm', title: '清空当前草稿，按当前教师档案重新开始' }));
    if (view === 'graph') {
      actions.appendChild(actionBtn('primary', '返回方案', 'arrow-left', () => navigate('teacher-workbench'), {
        size: 'sm',
        title: '返回教学方案工作台'
      }));
    }
    actions.appendChild(iconButton('打开设置', 'settings', () => navigate('settings')));
    side.appendChild(actions);
    top.appendChild(side);
    return top;
  }

  /* ---------- 左栏：需求 ---------- */

  function segmented(options, current, onPick, label) {
    const wrap = el('div', 'segmented tw-segmented');
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', label || '选择');
    options.forEach((item) => {
      const active = String(item.value) === String(current);
      const btn = el('button', '', item.label);
      btn.type = 'button';
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      if (item.title) btn.title = item.title;
      btn.addEventListener('click', () => {
        if (btn.getAttribute('aria-pressed') === 'true') return;
        wrap.querySelectorAll('button').forEach((other) => other.setAttribute('aria-pressed', 'false'));
        btn.setAttribute('aria-pressed', 'true');
        onPick(item.value);
      });
      wrap.appendChild(btn);
    });
    return wrap;
  }

  function buildCustomNotice() {
    const wrap = el('div', 'tw-custom-notice');
    wrap.setAttribute('role', 'status');
    wrap.appendChild(icon('alert-triangle', 15));
    const main = el('div', 'tw-custom-body');
    main.appendChild(el('p', 'tw-custom-title', '大学通用结构 · 来源待补充'));
    main.appendChild(el('p', 'tw-custom-text', scenario.customNotice
      || '当前学科暂无内置课程知识库。方案按大学通用讲授结构生成，来源待补充；补充教材/大纲后依据会更准确。'));
    wrap.appendChild(main);
    wrap.appendChild(actionBtn('secondary', '去资料库', 'book-open', () => navigate('library'), {
      size: 'sm',
      title: '打开资料库，补充本课程的教材、大纲或讲义'
    }));
    return wrap;
  }

  function buildRecentPlans() {
    const all = (state.plans || []).slice().sort((a, b) => {
      const left = String(b.updatedAt || b.createdAt || '');
      const right = String(a.updatedAt || a.createdAt || '');
      return left.localeCompare(right);
    });
    const records = all.slice(0, 3);
    const wrap = el('div', 'tw-recent');
    const head = el('div', 'tw-recent-head');
    head.appendChild(el('h3', 'tw-recent-title', '最近方案'));
    head.appendChild(el('span', 'spacer'));
    if (all.length) {
      head.appendChild(actionBtn('ghost', '全部', 'arrow-right', () => navigate('plans'), {
        size: 'sm',
        title: '打开我的方案，继续修改或复盘'
      }));
    }
    wrap.appendChild(head);

    if (!records.length) {
      wrap.appendChild(el('p', 'tw-recent-empty', '保存后可继续修改或复盘。'));
      return wrap;
    }

    records.forEach((record) => {
      const data = activeVersionOf(record) || {};
      const title = record.title || data.title || '未命名方案';
      const item = el('button', 'tw-recent-item');
      item.type = 'button';
      item.title = `打开方案：${title}`;
      item.setAttribute('aria-label', item.title);
      const main = el('span', 'tw-recent-main');
      main.appendChild(el('span', 'tw-recent-name', title));
      const meta = [data.stage, data.subject].filter(Boolean).join(' · ');
      if (meta) main.appendChild(el('span', 'tw-recent-meta', meta));
      item.appendChild(main);
      item.appendChild(el('span', 'tw-recent-ver', `${planVersionCount(record)} 版`));
      item.addEventListener('click', () => {
        state.activePlanId = record.id;
        navigate('teacher-workbench');
      });
      wrap.appendChild(item);
    });
    return wrap;
  }

  function buildLeft() {
    const card = el('section', 'card tw-left');
    const head = el('div', 'card-head tw-left-head');
    head.appendChild(el('h2', 'card-title', '本次需求'));
    head.appendChild(el('span', 'spacer'));
    head.appendChild(el(
      'span',
      `badge ${plan ? 'badge-accent' : 'badge-neutral'}`,
      plan ? (recordId ? `已保存 · 第 ${versionCount()} 版` : '已生成 · 未保存') : '待生成'
    ));
    card.appendChild(head);

    const body = el('div', 'card-body tw-left-body');

    const profile = profileNow();
    const isUniversity = profile.id === 'university';
    const needField = el('div', 'field tw-field-need');
    needField.appendChild(el('label', 'label', '需求描述'));
    const area = h('textarea', {
      className: 'textarea tw-need',
      rows: '4',
      placeholder: isUniversity
        ? '例如：把「导数的概念」上成一次 90 分钟的讲授，大班授课、无助教，需要阅读材料。'
        : '例如：把「牛顿第二定律」上成一节 40 分钟的新授课，学生基础中等，实验室不可用。'
    });
    area.value = request.need;
    area.setAttribute('aria-label', '本次教学需求');
    area.addEventListener('input', () => {
      request.need = area.value;
    });
    needField.appendChild(area);
    needField.appendChild(el('span', 'hint', '写清课时、学情与限制。'));
    body.appendChild(needField);

    // 课型 / 时长 / 学情 / 约束统一折叠进「更多设置」，默认路径只保留需求与生成。
    const typeField = el('div', 'field tw-field-type');
    typeField.appendChild(el('label', 'label', '课型'));
    const typeSelect = el('select', 'select');
    typeSelect.setAttribute('aria-label', '选择课型');
    profile.lessonTypes.forEach((type) => {
      const option = document.createElement('option');
      option.value = type;
      option.textContent = type;
      if (type === request.lessonType) option.selected = true;
      typeSelect.appendChild(option);
    });
    typeSelect.addEventListener('change', () => {
      request.lessonType = typeSelect.value;
      refreshSummary();
    });
    typeField.appendChild(typeSelect);

    const hoursField = el('div', 'field tw-field-hours');
    hoursField.appendChild(el('label', 'label', isUniversity ? '学时与时长' : '课时'));
    const presets = profile.durations.slice();
    if (presets.indexOf(request.duration) === -1) presets.push(request.duration);
    presets.sort((a, b) => a - b);
    hoursField.appendChild(segmented(
      presets.map((value) => ({ value, label: `${value} 分钟`, title: `${value} 分钟` })),
      request.duration,
      (value) => {
        request.duration = Number(value);
        refreshSummary();
      },
      '选择时长'
    ));

    const levelField = el('div', 'field');
    levelField.appendChild(el('label', 'label', '学情'));
    levelField.appendChild(segmented(
      profile.levels.map((level) => ({ value: level, label: level })),
      request.level,
      (value) => {
        request.level = value;
        refreshSummary();
      },
      '选择学情'
    ));

    const chipField = el('div', 'field');
    chipField.appendChild(el('label', 'label', '课堂约束'));
    const chipWrap = el('div', 'tw-constraints');
    profile.constraints.forEach((name) => {
      const active = request.constraints.indexOf(name) !== -1;
      const chip = el('button', `tw-chip${active ? ' is-on' : ''}`, name);
      chip.type = 'button';
      chip.setAttribute('aria-pressed', active ? 'true' : 'false');
      chip.title = `${active ? '取消' : '添加'}约束：${name}`;
      chip.addEventListener('click', () => {
        const index = request.constraints.indexOf(name);
        if (index >= 0) request.constraints.splice(index, 1);
        else request.constraints.push(name);
        const on = request.constraints.indexOf(name) !== -1;
        chip.classList.toggle('is-on', on);
        chip.setAttribute('aria-pressed', on ? 'true' : 'false');
        chip.title = `${on ? '取消' : '添加'}约束：${name}`;
        refreshSummary();
      });
      chipWrap.appendChild(chip);
    });
    chipField.appendChild(chipWrap);

    const advanced = el('div', `tw-advanced${advancedOpen ? ' is-open' : ''}`);
    const toggle = el('button', 'tw-advanced-toggle');
    toggle.type = 'button';
    toggle.setAttribute('aria-expanded', advancedOpen ? 'true' : 'false');
    const toggleMain = el('span', 'tw-advanced-main');
    const toggleIcon = el('span', 'tw-advanced-icon');
    toggleIcon.appendChild(icon(advancedOpen ? 'chevron-down' : 'chevron-right', 15));
    toggleMain.appendChild(toggleIcon);
    toggleMain.appendChild(el('span', 'tw-advanced-label', '更多设置'));
    toggle.appendChild(toggleMain);
    const summaryEl = el('span', 'tw-advanced-summary');
    function refreshSummary() {
      summaryEl.textContent = `${request.lessonType} · ${request.duration} 分钟 · ${request.level}`
        + (request.constraints.length ? ` · ${request.constraints.join('、')}` : '');
    }
    refreshSummary();
    toggle.appendChild(summaryEl);
    advanced.appendChild(toggle);

    const panel = el('div', 'tw-advanced-body');
    panel.hidden = !advancedOpen;
    panel.appendChild(typeField);
    panel.appendChild(hoursField);
    panel.appendChild(levelField);
    panel.appendChild(chipField);
    advanced.appendChild(panel);

    // 就地展开/收起，避免整页重绘把中栏滚动位置带回顶部。
    toggle.addEventListener('click', () => {
      advancedOpen = !advancedOpen;
      advanced.classList.toggle('is-open', advancedOpen);
      panel.hidden = !advancedOpen;
      toggle.setAttribute('aria-expanded', advancedOpen ? 'true' : 'false');
      toggleIcon.replaceChildren(icon(advancedOpen ? 'chevron-down' : 'chevron-right', 15));
    });
    body.appendChild(advanced);

    const generateBtn = actionBtn(
      'primary',
      generating ? '生成中…' : '生成教学方案',
      'sparkles',
      () => runGenerate(''),
      {
        size: 'lg',
        disabled: generating,
        title: '按当前需求生成教学方案（检索资料 → 构建图谱 → 生成方案 → 质量检查）'
      }
    );
    generateBtn.classList.add('tw-generate');

    // 生成按钮固定在左栏底部，表单较长时也不会被滚动带出视野。
    body.appendChild(buildRecentPlans());
    card.appendChild(body);

    const foot = el('div', 'tw-left-foot');
    foot.appendChild(generateBtn);

    const engine = el('p', 'tw-left-note');
    const llm = (state.settings && state.settings.llm) || {};
    const engineText = llm.apiKey && llm.model
      ? `已连接 · ${llm.model}`
      : '本地知识引擎';
    const libraryCount = scenario ? librarySourcesOf(scenario).length : 0;
    const libText = libraryCount
      ? `资料库 ${libraryCount} 条资料参与检索`
      : '资料库无匹配资料，可在资料库补充';
    engine.textContent = `当前引擎：${engineText} · ${libText}`;
    engine.title = engine.textContent;
    foot.appendChild(engine);
    card.appendChild(foot);
    return card;
  }

  /* ---------- 中栏：进度与空态 ---------- */

  function buildProgress() {
    const card = el('section', 'card tw-progress');
    const head = el('div', 'card-head');
    head.appendChild(el('h2', 'card-title', '正在生成方案'));
    head.appendChild(el('span', 'spacer'));
    head.appendChild(el('span', 'badge badge-accent', `${Math.min(stageIndex + 1, PLAN_STAGES.length)} / ${PLAN_STAGES.length}`));
    card.appendChild(head);

    const body = el('div', 'card-body');
    const bar = el('div', 'progress tw-progress-bar');
    const fill = el('i', '');
    fill.style.width = `${Math.max(4, Math.round(((stageIndex + 1) / PLAN_STAGES.length) * 100))}%`;
    bar.appendChild(fill);
    body.appendChild(bar);

    const steps = el('div', 'tw-steps');
    PLAN_STAGES.forEach((stage, index) => {
      const stateCls = index < stageIndex ? 'is-done' : index === stageIndex ? 'is-active' : '';
      const item = el('div', `tw-step-item ${stateCls}`);
      const mark = el('span', 'tw-step-mark');
      mark.appendChild(icon(index < stageIndex ? 'check' : index === stageIndex ? 'activity' : 'circle', 15));
      item.appendChild(mark);
      const text = el('div', 'tw-step-text');
      text.appendChild(el('strong', '', stage.label));
      text.appendChild(el('span', '', stage.hint || ''));
      item.appendChild(text);
      steps.appendChild(item);
    });
    body.appendChild(steps);

    const skeleton = el('div', 'tw-skeleton');
    [46, 88, 72, 94, 64].forEach((width) => {
      const line = el('div', 'skeleton sk-line');
      line.style.width = `${width}%`;
      skeleton.appendChild(line);
    });
    body.appendChild(skeleton);

    card.appendChild(body);
    return card;
  }

  function buildEmpty() {
    const card = el('section', 'card tw-empty-card');
    const profile = profileNow();
    const empty = el('div', 'empty tw-empty');
    empty.appendChild(el('span', 'empty-icon')).appendChild(icon('layers', 24));
    empty.appendChild(el('h3', '', '三步生成第一版教学方案'));
    empty.appendChild(el('p', '',
      `先在左上角确认场景，再写下课时、学情与课堂限制。生成后会完成 ${profile.quality.length} 项质量检查，可逐条核对。`));

    const steps = el('div', 'tw-empty-steps');
    [
      ['1', '确认场景', '学段、学科与教材版本决定课标、术语和难度'],
      ['2', '写清需求', '课时、学情、课堂限制各一句，避免只写课题名'],
      ['3', '核对依据', '看来源、时间分配、分层作业与质检结果']
    ].forEach(([num, title, desc]) => {
      const row = el('div', 'tw-empty-step');
      row.appendChild(el('span', 'tw-empty-num', num));
      const main = el('span', 'tw-empty-step-main');
      main.appendChild(el('strong', '', title));
      main.appendChild(el('span', '', desc));
      row.appendChild(main);
      steps.appendChild(row);
    });
    empty.appendChild(steps);

    const list = ((scenario && scenario.needExamples) || []).slice(0, 2);
    if (list.length) {
      const examples = el('div', 'tw-examples tw-examples-center');
      examples.appendChild(el('span', 'tw-examples-title', '试试示例需求'));
      list.forEach((text) => {
        const btn = el('button', 'tw-example', text);
        btn.type = 'button';
        btn.title = '填入需求描述';
        btn.setAttribute('aria-label', '使用示例需求：' + short(text, 24));
        btn.addEventListener('click', () => applyExample(text));
        examples.appendChild(btn);
      });
      empty.appendChild(examples);
    }

    if (state.activePlanId) {
      empty.appendChild(actionBtn('secondary', '打开最近保存的方案', 'layers', () => {
        readActivePlan();
        render();
      }, { size: 'sm', title: '读取上次保存并激活的方案版本' }));
    }
    card.appendChild(empty);
    return card;
  }

  /* ---------- 中栏：方案 ---------- */

  function sourceChips(ids) {
    const wrap = el('div', 'tw-source-chips');
    const list = Array.isArray(ids) ? ids : [];
    if (!list.length) {
      wrap.appendChild(el('span', 'tw-chip-muted', '未标注来源'));
      return wrap;
    }
    list.forEach((id) => {
      const source = sourceOf(id);
      if (!source) return;
      const chip = el('button', 'tw-source-chip');
      chip.type = 'button';
      chip.title = `${source.title}${source.locator ? ' · ' + source.locator : ''}\n${source.excerpt || ''}`;
      chip.setAttribute('aria-label', `查看来源：${source.title}`);
      chip.appendChild(icon('book-open', 12));
      chip.appendChild(el('span', '', short(source.title, 14)));
      chip.addEventListener('click', () => flashSource(id));
      wrap.appendChild(chip);
    });
    if (!wrap.children.length) wrap.appendChild(el('span', 'tw-chip-muted', '来源不在当前资料列表'));
    return wrap;
  }

  function citedSourceCount() {
    return sources().filter((item) => Number(item.cited) > 0).length;
  }

  function buildPlanOverview() {
    const card = el('section', 'card tw-overview');
    card.setAttribute('data-section', 'overview');
    const objectives = Array.isArray(plan.objectives) ? plan.objectives : [];
    const flow = Array.isArray(plan.flow) ? plan.flow : [];
    const quality = Array.isArray(plan.quality) ? plan.quality : [];
    const pass = quality.filter((item) => item.status === 'pass').length;
    const profile = stageProfile(plan.stage);
    const minutes = totalMinutes(flow);
    const isUniversity = profile.id === 'university';
    const durationText = plan.lessonType === '课程大纲' && isUniversity
      ? '课程大纲'
      : `${minutes || plan.duration} 分钟`;

    const top = el('div', 'tw-ov-top');
    const needBox = el('div', 'tw-ov-need');
    needBox.appendChild(el('span', 'tw-ov-label', '本课要解决'));
    needBox.appendChild(el('p', 'tw-ov-need-text', plan.need || '未填写需求说明'));
    top.appendChild(needBox);

    const stats = el('div', 'tw-ov-stats');
    [
      { label: '目标', value: `${objectives.length} 条` },
      { label: '流程', value: minutes ? `${minutes} 分钟` : '—' },
      { label: '引用来源', value: `${citedSourceCount()} 条` },
      { label: '质检通过', value: quality.length ? `${pass}/${quality.length}` : '—' }
    ].forEach((item) => {
      const box = el('div', 'tw-ov-stat');
      box.appendChild(el('strong', 'tw-ov-stat-value', item.value));
      box.appendChild(el('span', 'tw-ov-stat-label', item.label));
      stats.appendChild(box);
    });
    top.appendChild(stats);
    card.appendChild(top);

    const apply = [
      '适用',
      [plan.stage, plan.subject, plan.textbook, durationText].filter(Boolean).join(' · ')
    ].filter(Boolean).join('：');
    card.appendChild(el('p', 'tw-ov-apply', apply));
    return card;
  }

  function buildPlanOutline() {
    const card = el('nav', 'card tw-outline');
    card.setAttribute('aria-label', '方案目录');
    const head = el('div', 'tw-outline-head');
    head.appendChild(el('span', 'tw-outline-heading', '方案目录'));
    head.appendChild(el('span', 'tw-outline-count', '01–05 · 点击跳转'));
    card.appendChild(head);

    [
      { id: 'sec-objectives', num: '01', title: '目标', desc: '这节课学生要学会什么，对应哪条课程目标' },
      { id: 'sec-foundation', num: '02', title: '学情与重难点', desc: '学生可能卡在哪，前概念与易错点是什么' },
      { id: 'sec-flow', num: '03', title: '教学流程', desc: '每一段时间怎么分配，教师/学生做什么，证据是什么' },
      { id: 'sec-assess', num: '04', title: '评价与作业', desc: '怎么知道学会了，课后分层做什么' },
      { id: 'sec-diff', num: '05', title: '分层与风险', desc: '基础弱/拔尖怎么办，出问题怎么替代' }
    ].forEach((item) => {
      const btn = el('button', 'tw-outline-item');
      btn.type = 'button';
      btn.setAttribute('data-target', item.id);
      btn.setAttribute('aria-label', `跳到 ${item.num} ${item.title}`);
      if (item.id === 'sec-diff') btn.setAttribute('data-collapsed', riskOpen ? 'false' : 'true');
      btn.appendChild(el('span', 'tw-outline-num', item.num));
      const main = el('span', 'tw-outline-main');
      main.appendChild(el('span', 'tw-outline-title', item.title));
      main.appendChild(el('span', 'tw-outline-desc', item.desc));
      btn.appendChild(main);
      btn.appendChild(icon('arrow-right', 14));
      btn.addEventListener('click', () => scrollToSection(item.id));
      card.appendChild(btn);
    });
    return card;
  }

  function scrollToSection(id) {
    const target = root.querySelector(`[data-section="${id}"]`);
    if (!target) return;
    if (id === 'sec-diff' && !riskOpen && typeof target.__openSection === 'function') {
      target.__openSection();
    }
    try {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      target.scrollIntoView();
    }
    target.classList.add('is-flash');
    window.setTimeout(() => target.classList.remove('is-flash'), 1200);
  }

  function buildPlanHead() {
    const profile = stageProfile(plan.stage);
    const course = courseInfo(plan.course);
    const isUniversity = profile.id === 'university';
    const card = el('section', 'card tw-plan-head');
    const top = el('div', 'tw-plan-head-top');
    const main = el('div', 'tw-plan-head-main');
    const titleRow = el('div', 'tw-plan-title-row');
    titleRow.appendChild(el('h2', 'tw-plan-title', plan.title));
    titleRow.appendChild(el(
      'span',
      `badge ${plan.source === 'llm' ? 'badge-success' : 'badge-neutral'}`,
      plan.source === 'llm' ? `模型 · ${plan.model || '已配置'}` : '本地知识引擎'
    ));
    if (plan.tuneLabel) titleRow.appendChild(el('span', 'badge badge-warning', '微调 · ' + plan.tuneLabel));
    if (plan.scenarioId === 'university-custom') {
      titleRow.appendChild(el('span', 'badge badge-warning', '通用结构 · 来源待补充'));
    }
    if (recordId) titleRow.appendChild(el('span', 'badge badge-accent', `第 ${versionCount()} 版`));
    main.appendChild(titleRow);

    const meta = el('div', 'tw-plan-meta');
    const minutes = totalMinutes(plan.flow) || plan.duration;
    const durationMeta = isUniversity
      ? (plan.lessonType === '课程大纲' ? '课程大纲' : `${minutes} 分钟${plan.lessonType || ''}`)
      : `${minutes} 分钟`;
    const items = [
      [plan.stage, plan.subject, plan.textbook, plan.grade].filter(Boolean).join(' · '),
      isUniversity ? '' : plan.lessonType,
      durationMeta,
      fmtDate(plan.createdAt)
    ].filter(Boolean);
    items.forEach((text, index) => {
      if (index) meta.appendChild(el('span', 'tw-meta-dot', '·'));
      meta.appendChild(el('span', 'tw-meta-item', text));
    });
    main.appendChild(meta);

    const courseItems = [];
    if (course.code) courseItems.push(['课程代码', course.code]);
    if (course.credits) courseItems.push(['学分', course.credits]);
    if (course.hours) courseItems.push(['学时', course.hours]);
    else if (isUniversity) courseItems.push(['学时', `${plan.duration} 分钟`]);
    if (course.audience) courseItems.push(['授课对象', course.audience]);
    if (course.assessment) {
      courseItems.push([
        '考核',
        Array.isArray(course.assessment) ? course.assessment.join('、') : course.assessment
      ]);
    }
    if (courseItems.length) {
      const bar = el('div', 'tw-course-bar');
      courseItems.forEach(([label, value]) => {
        const item = el('span', 'tw-course-item');
        item.appendChild(el('span', 'tw-course-label', label));
        item.appendChild(el('span', 'tw-course-value', value));
        bar.appendChild(item);
      });
      main.appendChild(bar);
    }
    top.appendChild(main);

    const actions = el('div', 'tw-plan-actions');
    actions.appendChild(actionBtn('primary', recordId ? '保存新版本' : '保存', 'bookmark', doSave, {
      size: 'sm',
      title: recordId ? '保存为新的方案版本' : '保存方案到「我的方案」'
    }));
    actions.appendChild(actionBtn('secondary', '导出 Markdown', 'download', doExport, {
      size: 'sm',
      title: '导出当前方案为 Markdown 文件'
    }));
    actions.appendChild(actionBtn('ghost', '重新生成', 'refresh', () => runGenerate(plan.tune || ''), {
      size: 'sm',
      title: '按当前需求重新生成方案'
    }));
    top.appendChild(actions);
    card.appendChild(top);
    return card;
  }

  function buildAgentTraceCard() {
    const agent = plan && plan.agent;
    if (!agent || !Array.isArray(agent.stages) || !agent.stages.length) return null;
    const card = el('section', 'card tw-agent-card');
    const head = el('div', 'card-head tw-agent-head');
    head.appendChild(el('h3', 'card-title', 'Agent 运行轨迹'));
    head.appendChild(el('span', 'spacer'));
    head.appendChild(el(
      'span',
      `badge ${agent.mode === 'agent' ? 'badge-accent' : 'badge-neutral'}`,
      agent.mode === 'agent' ? 'LLM 编排' : '本地规则'
    ));
    if (agent.mode === 'agent' && agent.model) head.appendChild(el('span', 'badge badge-neutral', agent.model));
    card.appendChild(head);

    const body = el('div', 'card-body tw-agent-body');
    const list = el('div', 'tw-agent-stages');
    agent.stages.forEach((stage) => {
      const ok = stage.status === 'ok';
      const row = el('div', `tw-agent-stage ${ok ? 'is-ok' : 'is-fallback'}`);
      const top = el('div', 'tw-agent-stage-top');
      top.appendChild(el('span', 'tw-agent-stage-label', stage.label || stage.stage || ''));
      top.appendChild(el('span', `badge ${stage.engine === 'llm' ? 'badge-accent' : 'badge-neutral'}`, stage.engine === 'llm' ? '模型' : '本地'));
      top.appendChild(el('span', `badge ${ok ? 'badge-success' : 'badge-warning'}`, ok ? '完成' : '回退'));
      const ms = Number(stage.latencyMs) || 0;
      top.appendChild(el('span', 'tw-agent-latency', ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`));
      row.appendChild(top);
      if (stage.error) row.appendChild(el('p', 'tw-agent-error', stage.error));
      list.appendChild(row);
    });
    body.appendChild(list);
    if (agent.degraded) {
      body.appendChild(el('p', 'tw-agent-note', '部分环节已回退本地引擎，方案仍按本地规则补全。'));
    }
    body.appendChild(el('p', 'tw-agent-meta', `提示词版本 ${agent.promptVersion || '—'}`));
    card.appendChild(body);
    return card;
  }

  function buildTuneBar() {
    const card = el('section', 'card tw-tune');
    const toggle = el('button', 'tw-tune-toggle');
    toggle.type = 'button';
    toggle.setAttribute('aria-expanded', 'false');
    const main = el('span', 'tw-tune-toggle-main');
    main.appendChild(icon('settings', 15));
    main.appendChild(el('span', '', '调整方案（会重新生成）'));
    toggle.appendChild(main);
    toggle.appendChild(el('span', 'tw-tune-toggle-note', '更基础 / 更挑战 / 压缩 / 增加实践'));
    const arrow = el('span', 'tw-tune-toggle-arrow');
    arrow.appendChild(icon('chevron-right', 14));
    toggle.appendChild(arrow);
    card.appendChild(toggle);

    const panel = el('div', 'tw-tune-body');
    panel.hidden = true;
    panel.appendChild(el('p', 'tw-tune-sub', '点击后会立即重新生成，并真实改变目标层级、活动、时间或作业；建议先保存当前版本。'));
    const row = el('div', 'tw-tune-row');
    planTunes(plan.stage).forEach((tune) => {
      const btn = el(
        'button',
        `tw-tune-btn${plan.tune === tune.key ? ' is-active' : ''}`,
        tune.label
      );
      btn.type = 'button';
      btn.title = tune.title;
      btn.setAttribute('aria-label', `微调：${tune.label}`);
      if (generating) btn.disabled = true;
      btn.addEventListener('click', () => runGenerate(tune.key));
      row.appendChild(btn);
    });
    panel.appendChild(row);
    card.appendChild(panel);

    let open = false;
    toggle.addEventListener('click', () => {
      open = !open;
      panel.hidden = !open;
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      arrow.replaceChildren(icon(open ? 'chevron-down' : 'chevron-right', 14));
    });
    return card;
  }

  function sectionCard(opts) {
    const cfg = opts || {};
    const card = el('section', `card tw-section${cfg.className ? ` ${cfg.className}` : ''}`);
    if (cfg.id) {
      card.id = cfg.id;
      card.setAttribute('data-section', cfg.id);
    }
    const head = el('div', 'card-head tw-section-head');
    const num = el('span', 'tw-section-num', cfg.num || '');
    num.setAttribute('aria-hidden', 'true');
    head.appendChild(num);
    const titles = el('div', 'tw-section-titles');
    const titleRow = el('div', 'tw-section-title-row');
    titleRow.appendChild(el('h3', 'card-title', cfg.title || ''));
    if (cfg.sub) titleRow.appendChild(el('span', 'card-sub', cfg.sub));
    titles.appendChild(titleRow);
    if (cfg.desc) titles.appendChild(el('p', 'tw-section-desc', cfg.desc));
    head.appendChild(titles);
    if (cfg.actions) head.appendChild(cfg.actions);
    card.appendChild(head);
    return card;
  }

  function buildObjectives() {
    const list = Array.isArray(plan.objectives) ? plan.objectives : [];
    const profile = stageProfile(plan.stage);
    const label = plan.outcomeLabel || profile.outcomeLabel;
    const card = sectionCard({
      num: '01',
      id: 'sec-objectives',
      title: label,
      sub: `${list.length} 条 · 带来源`,
      desc: '这节课学生要学会什么：每条目标对应哪条课程目标或学习目标。'
    });
    const body = el('div', 'card-body tw-obj-list');
    list.forEach((item, index) => {
      const row = el('div', 'tw-obj');
      row.appendChild(el('span', 'tw-obj-index', String(index + 1)));
      const main = el('div', 'tw-obj-main');
      const top = el('div', 'tw-obj-top');
      top.appendChild(el('span', 'badge badge-neutral', item.level || '理解'));
      top.appendChild(el('p', 'tw-obj-text', item.text));
      main.appendChild(top);
      main.appendChild(sourceChips(item.sourceIds));
      row.appendChild(main);
      body.appendChild(row);
    });
    if (!list.length) body.appendChild(el('p', 'tw-muted', `当前方案没有${label}。`));
    card.appendChild(body);
    return card;
  }

  function buildFoundation() {
    const prereqs = Array.isArray(plan.prerequisites) ? plan.prerequisites : [];
    const keyPoints = Array.isArray(plan.keyPoints) ? plan.keyPoints : [];
    const difficulties = Array.isArray(plan.difficulties) ? plan.difficulties : [];
    const card = sectionCard({
      num: '02',
      id: 'sec-foundation',
      title: '学情与重难点',
      sub: `重点 ${keyPoints.length} · 难点 ${difficulties.length} · 前概念 ${prereqs.length}`,
      desc: '学生可能卡在哪：本课重点、难点，以及必须先具备的前概念与常见误解。'
    });
    const body = el('div', 'card-body tw-foundation');

    const kd = el('div', 'tw-kd');
    [
      { label: '重点', items: keyPoints, cls: 'is-key' },
      { label: '难点', items: difficulties, cls: 'is-diff' }
    ].forEach((group) => {
      const col = el('div', `tw-kd-col ${group.cls}`);
      col.appendChild(el('h4', 'tw-kd-title', group.label));
      const ul = el('ul', 'tw-kd-list');
      (group.items || []).forEach((text) => ul.appendChild(el('li', '', text)));
      if (!ul.children.length) ul.appendChild(el('li', 'tw-muted', '未标注'));
      col.appendChild(ul);
      kd.appendChild(col);
    });
    body.appendChild(kd);

    const pre = el('div', 'tw-foundation-pre');
    pre.appendChild(el('h4', 'tw-foundation-title', '前概念 / 易错点'));
    const list = el('div', 'tw-prereq-list is-plain');
    prereqs.forEach((item) => {
      const row = el('div', 'tw-prereq');
      const head = el('div', 'tw-prereq-head');
      head.appendChild(el('span', 'badge badge-warning', item.label));
      head.appendChild(icon('arrow-right', 13));
      head.appendChild(el('span', 'tw-prereq-mis', '可能误解'));
      row.appendChild(head);
      row.appendChild(el('p', 'tw-prereq-text', item.misconception));
      row.appendChild(sourceChips(item.sourceIds));
      list.appendChild(row);
    });
    if (!list.children.length) list.appendChild(el('p', 'tw-muted', '当前场景没有前概念数据。'));
    pre.appendChild(list);
    body.appendChild(pre);
    card.appendChild(body);
    return card;
  }

  function buildFlow() {
    const flow = Array.isArray(plan.flow) ? plan.flow : [];
    const card = sectionCard({
      num: '03',
      id: 'sec-flow',
      title: '教学流程',
      sub: `${flow.length} 段 · 共 ${totalMinutes(flow)} 分钟`,
      desc: '每一段时间怎么分配，教师和学生做什么，评价证据是什么。'
    });
    card.classList.add('tw-flow-card');
    const body = el('div', `card-body tw-timeline${flow.length > 5 ? ' is-many' : ''}`);
    flow.forEach((item, index) => {
      const step = el('div', 'tw-step');
      const time = el('div', 'tw-step-time');
      time.appendChild(el('strong', '', String(Number(item.minutes) || 0)));
      time.appendChild(el('span', '', '分钟'));
      step.appendChild(time);

      const rail = el('div', 'tw-step-rail');
      rail.appendChild(el('span', 'tw-step-dot'));
      step.appendChild(rail);

      const main = el('div', 'tw-step-body');
      const head = el('div', 'tw-step-head');
      head.appendChild(el('span', 'tw-phase', item.phase || `阶段 ${index + 1}`));
      head.appendChild(el('span', 'tw-step-min', `${Number(item.minutes) || 0} 分钟`));
      main.appendChild(head);

      [
        { label: '教师活动', value: item.teacher },
        { label: '学生活动', value: item.student },
        { label: '评价证据', value: item.evidence }
      ].forEach((field) => {
        const p = el('p', 'tw-field');
        p.appendChild(el('span', 'tw-field-label', field.label));
        p.appendChild(el('span', 'tw-field-text', field.value || '—'));
        main.appendChild(p);
      });
      main.appendChild(sourceChips(item.sourceIds));
      step.appendChild(main);
      body.appendChild(step);
    });
    if (!flow.length) body.appendChild(el('p', 'tw-muted', '当前方案没有教学流程。'));
    card.appendChild(body);
    return card;
  }

  function assessmentRows() {
    const list = Array.isArray(plan.assessment) ? plan.assessment : [];
    const wrap = el('div', 'tw-assess-list is-plain');
    list.forEach((item) => {
      const row = el('div', 'tw-assess');
      row.appendChild(el('span', 'badge badge-info', item.type || '课堂评价'));
      const main = el('div', 'tw-assess-main');
      main.appendChild(el('p', 'tw-assess-text', item.text));
      main.appendChild(el('p', 'tw-assess-criteria', '达成标准：' + (item.criteria || '未标注')));
      row.appendChild(main);
      wrap.appendChild(row);
    });
    if (!list.length) wrap.appendChild(el('p', 'tw-muted', '当前方案没有评价证据。'));
    return wrap;
  }

  function homeworkGrid() {
    const homework = plan.homework || {};
    const profile = stageProfile(plan.stage);
    const labels = profile.homeworkLabels || { basic: '基础', advanced: '提高', remedial: '补偿' };
    const notes = profile.id === 'university'
      ? { basic: 'problem set', advanced: 'project / 报告', remedial: '阅读与回应' }
      : { basic: '全体必做', advanced: '学有余力', remedial: '需要支持' };
    const grid = el('div', 'tw-hw-grid');
    [
      { key: 'basic', cls: 'is-basic' },
      { key: 'advanced', cls: 'is-advanced' },
      { key: 'remedial', cls: 'is-remedial' }
    ].forEach((group) => {
      const box = el('div', `tw-hw ${group.cls}`);
      box.appendChild(el('h4', 'tw-hw-title', labels[group.key]));
      box.appendChild(el('span', 'tw-hw-note', notes[group.key]));
      const ul = el('ul', 'tw-hw-list');
      (homework[group.key] || []).forEach((text) => ul.appendChild(el('li', '', text)));
      if (!ul.children.length) ul.appendChild(el('li', 'tw-muted', '未布置'));
      box.appendChild(ul);
      grid.appendChild(box);
    });
    return grid;
  }

  function buildEval() {
    const list = Array.isArray(plan.assessment) ? plan.assessment : [];
    const profile = stageProfile(plan.stage);
    const card = sectionCard({
      num: '04',
      id: 'sec-assess',
      title: '评价与作业',
      sub: `${list.length} 项评价 · 分层作业`,
      desc: '怎么知道学生学会了：课堂评价证据与课后分层任务。'
    });
    const body = el('div', 'card-body tw-eval');

    const part1 = el('div', 'tw-eval-part');
    const head1 = el('div', 'tw-eval-head');
    head1.appendChild(el('h4', 'tw-eval-title', profile.id === 'university' ? '考核与评价' : '课堂评价证据'));
    head1.appendChild(el('span', 'tw-eval-hint', '达成标准写在每条后面'));
    part1.appendChild(head1);
    part1.appendChild(assessmentRows());
    body.appendChild(part1);

    const part2 = el('div', 'tw-eval-part');
    const head2 = el('div', 'tw-eval-head');
    head2.appendChild(el('h4', 'tw-eval-title', profile.homeworkTitle || '分层作业'));
    if (profile.homeworkSub) head2.appendChild(el('span', 'tw-eval-hint', profile.homeworkSub));
    part2.appendChild(head2);
    part2.appendChild(homeworkGrid());
    body.appendChild(part2);

    card.appendChild(body);
    return card;
  }

  function buildSupport() {
    const risks = Array.isArray(plan.risks) ? plan.risks : [];
    const diff = plan.differentiation || {};
    const label = el('span', '', riskOpen ? '收起' : '展开');
    const arrow = el('span', 'tw-section-toggle-arrow');
    arrow.appendChild(icon(riskOpen ? 'chevron-down' : 'chevron-right', 14));
    const toggle = el('button', 'tw-section-toggle');
    toggle.type = 'button';
    toggle.setAttribute('aria-expanded', riskOpen ? 'true' : 'false');
    toggle.appendChild(label);
    toggle.appendChild(arrow);

    const card = sectionCard({
      num: '05',
      id: 'sec-diff',
      title: '分层与风险',
      sub: `${risks.length} 条风险`,
      desc: '基础弱/拔尖学生怎么办，器材、机房或时间出问题怎么替代。',
      actions: toggle
    });
    const body = el('div', 'card-body tw-support');
    body.hidden = !riskOpen;

    const diffBox = el('div', 'tw-diff');
    [
      { label: '学习支持', items: diff.support || [] },
      { label: '拓展任务', items: diff.extension || [] }
    ].forEach((group) => {
      const col = el('div', 'tw-diff-col');
      col.appendChild(el('h4', 'tw-diff-title', group.label));
      const ul = el('ul', 'tw-diff-list');
      group.items.forEach((text) => ul.appendChild(el('li', '', text)));
      if (!ul.children.length) ul.appendChild(el('li', 'tw-muted', '未标注'));
      col.appendChild(ul);
      diffBox.appendChild(col);
    });
    body.appendChild(diffBox);

    body.appendChild(el('h4', 'tw-support-title', '风险与替代方案'));
    const riskList = el('div', 'tw-risk-list is-plain');
    risks.forEach((item) => {
      const row = el('div', 'tw-risk');
      const risk = el('div', 'tw-risk-line');
      risk.appendChild(icon('alert-triangle', 15));
      risk.appendChild(el('span', '', item.risk));
      row.appendChild(risk);
      const fallback = el('div', 'tw-risk-line is-fallback');
      fallback.appendChild(icon('corner-down-left', 15));
      fallback.appendChild(el('span', '', item.fallback));
      row.appendChild(fallback);
      riskList.appendChild(row);
    });
    if (!risks.length) riskList.appendChild(el('p', 'tw-muted', '当前方案没有列出风险。'));
    body.appendChild(riskList);
    card.appendChild(body);

    function apply(open) {
      riskOpen = open;
      body.hidden = !open;
      label.textContent = open ? '收起' : '展开';
      arrow.replaceChildren(icon(open ? 'chevron-down' : 'chevron-right', 14));
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    toggle.addEventListener('click', () => apply(!riskOpen));
    card.__openSection = () => apply(true);
    return card;
  }

  function buildPlanFooter() {
    const foot = el('section', 'card tw-plan-footer');
    const status = el('div', `tw-plan-status${recordId ? ' is-saved' : ''}`);
    status.appendChild(icon(recordId ? 'check-circle' : 'bookmark', 16));
    status.appendChild(el('span', '', recordId
      ? `已保存第 ${versionCount()} 版；继续修改后可保存新版本，旧版本会保留。`
      : '尚未保存：保存后可继续修改，版本会保留。'));
    foot.appendChild(status);

    const actions = el('div', 'tw-plan-footer-actions');
    actions.appendChild(actionBtn('primary', recordId ? '保存新版本' : '保存方案', 'bookmark', doSave, {
      size: 'sm',
      title: recordId ? '保存为新的方案版本' : '保存方案到「我的方案」'
    }));
    actions.appendChild(actionBtn('secondary', '导出 Markdown', 'download', doExport, {
      size: 'sm',
      title: '导出当前方案为 Markdown 文件'
    }));
    actions.appendChild(actionBtn('ghost', '去我的方案', 'arrow-right', () => navigate('plans'), {
      size: 'sm',
      title: '打开我的方案列表，继续修改或复盘'
    }));
    foot.appendChild(actions);
    return foot;
  }

  function buildPlanView() {
    const wrap = el('div', 'tw-plan');
    wrap.appendChild(buildPlanHead());
    const agentTrace = buildAgentTraceCard();
    if (agentTrace) wrap.appendChild(agentTrace);
    wrap.appendChild(buildPlanOverview());
    wrap.appendChild(buildPlanOutline());
    wrap.appendChild(buildObjectives());
    wrap.appendChild(buildFoundation());
    wrap.appendChild(buildFlow());
    wrap.appendChild(buildEval());
    wrap.appendChild(buildSupport());
    wrap.appendChild(buildTuneBar());
    wrap.appendChild(buildPlanFooter());
    return wrap;
  }

  /* ---------- 右栏：依据 ---------- */

  function buildGraphCard() {
    ensureSelectedNode();
    const graph = graphData();
    const nodeCount = (graph.nodes || []).length;
    const edgeCount = (graph.edges || []).length;
    const card = el('section', 'card tw-rail-card tw-graph-card');
    const head = el('div', 'card-head tw-rail-head');
    head.appendChild(el('h3', 'card-title', '知识图谱'));
    head.appendChild(el('span', 'badge badge-neutral', `${nodeCount} 节点`));
    head.appendChild(el('span', 'spacer'));
    head.appendChild(actionBtn('ghost', '放大', 'maximize', openGraph, {
      size: 'sm',
      title: '在知识图谱页查看完整节点与来源'
    }));
    card.appendChild(head);

    const body = el('div', 'card-body tw-graph-body');
    if (nodeCount) {
      body.appendChild(buildGraphSvg(graph, { selectedId: selectedNodeId }, selectNode));
    } else {
      body.appendChild(el('p', 'tw-muted', '当前场景没有图谱数据。'));
    }
    body.appendChild(el('p', 'tw-graph-legend', `实线为高置信关系 · 虚线为待校准关系 · 共 ${edgeCount} 条`));

    const node = selectedNode();
    if (node) {
      const detail = el('div', 'tw-node-detail');
      const head2 = el('div', 'tw-node-detail-head');
      head2.appendChild(el('span', 'badge badge-accent', LAYER_NAMES[layerOf(node)]));
      head2.appendChild(el('strong', '', node.label || node.id));
      detail.appendChild(head2);
      detail.appendChild(el('p', 'tw-node-desc', node.desc || '暂无说明'));
      if (Array.isArray(node.sourceIds) && node.sourceIds.length) {
        detail.appendChild(sourceChips(node.sourceIds));
      }
      body.appendChild(detail);
    }
    card.appendChild(body);
    return card;
  }

  function buildSourcesCard() {
    const list = sources();
    const cited = list.filter((item) => Number(item.cited) > 0).length;
    const card = el('section', 'card tw-rail-card tw-sources-card');
    const head = el('div', 'card-head tw-rail-head');
    head.appendChild(el('h3', 'card-title', '资料源'));
    head.appendChild(el(
      'span',
      'badge badge-neutral',
      plan ? `${list.length} 条 · ${cited} 条被引用` : `${list.length} 条`
    ));
    head.appendChild(el('span', 'spacer'));
    head.appendChild(actionBtn('ghost', '资料库', 'book-open', () => navigate('library'), {
      size: 'sm',
      title: '打开资料库管理资料'
    }));
    card.appendChild(head);

    const body = el('div', 'card-body tw-source-list');
    list.forEach((source) => {
      const item = el('div', 'tw-source');
      item.setAttribute('data-source-id', source.id);
      const top = el('div', 'tw-source-top');
      top.appendChild(sourceBadge(source.type));
      if (source.user) top.appendChild(el('span', 'badge badge-accent', '我的资料'));
      top.appendChild(el('span', 'tw-source-title', source.title));
      item.appendChild(top);
      item.appendChild(el('p', 'tw-source-loc', source.locator || '未标注位置'));
      if (source.excerpt) item.appendChild(el('p', 'tw-source-excerpt', short(source.excerpt, 96)));
      const foot = el('div', 'tw-source-foot');
      foot.appendChild(el('span', '', `可信度 ${percent(source.confidence)}`));
      foot.appendChild(el('span', '', plan ? `引用 ${Number(source.cited) || 0} 次` : '生成后统计引用'));
      item.appendChild(foot);
      body.appendChild(item);
    });
    if (!list.length) body.appendChild(el('p', 'tw-muted', '当前场景没有资料源。'));
    card.appendChild(body);
    return card;
  }

  function buildQualityCard() {
    const results = Array.isArray(plan && plan.quality) ? plan.quality : [];
    const profile = stageProfile((plan && plan.stage) || (scenario && scenario.stage));
    const card = el('section', 'card tw-rail-card tw-quality-card');
    const head = el('div', 'card-head tw-rail-head');
    head.appendChild(el('h3', 'card-title', '质量检查'));
    head.appendChild(el('span', 'spacer'));
    if (results.length) {
      const pass = results.filter((item) => item.status === 'pass').length;
      head.appendChild(el(
        'span',
        `badge ${pass === results.length ? 'badge-success' : 'badge-warning'}`,
        `${pass} / ${results.length} 通过`
      ));
    } else {
      head.appendChild(el('span', 'badge badge-neutral', `${profile.quality.length} 项 · 生成后检查`));
    }
    card.appendChild(head);

    const body = el('div', 'card-body tw-quality-list');
    if (!results.length) {
      profile.quality.forEach((item) => {
        const row = el('div', 'tw-quality tw-quality-idle');
        row.appendChild(el('span', 'tw-quality-mark')).appendChild(icon('circle', 14));
        const main = el('div', 'tw-quality-main');
        main.appendChild(el('span', 'tw-quality-label', item.label));
        main.appendChild(el('span', 'tw-quality-detail', '生成方案后自动检查'));
        row.appendChild(main);
        body.appendChild(row);
      });
    } else {
      results.forEach((item) => {
        const pass = item.status === 'pass';
        const row = el('div', `tw-quality ${pass ? 'is-pass' : 'is-warn'}`);
        row.appendChild(el('span', 'tw-quality-mark')).appendChild(icon(pass ? 'check-circle' : 'alert-triangle', 15));
        const main = el('div', 'tw-quality-main');
        const top = el('div', 'tw-quality-top');
        top.appendChild(el('span', 'tw-quality-label', item.label));
        top.appendChild(el('span', `badge ${pass ? 'badge-success' : 'badge-warning'}`, pass ? '通过' : '提醒'));
        main.appendChild(top);
        main.appendChild(el('span', 'tw-quality-detail', item.detail || ''));
        row.appendChild(main);
        body.appendChild(row);
      });
    }
    card.appendChild(body);
    return card;
  }

  function buildClassCard() {
    const profile = (scenario && scenario.classProfile) || null;
    const points = profile && Array.isArray(profile.weakPoints) ? profile.weakPoints.slice() : [];
    points.sort((a, b) => (Number(b.ratio) || 0) - (Number(a.ratio) || 0));
    const card = el('section', 'card tw-rail-card tw-class-card');
    const head = el('div', 'card-head tw-rail-head');
    head.appendChild(el('h3', 'card-title', '班级学情'));
    head.appendChild(el('span', 'spacer'));
    head.appendChild(actionBtn('ghost', '详情', 'users', () => navigate('teacher'), {
      size: 'sm',
      title: '打开班级与学情页'
    }));
    card.appendChild(head);

    const body = el('div', 'card-body');
    body.appendChild(el('p', 'tw-class-name', profile
      ? `${profile.className} · 样本 ${profile.sampleSize} 人 · ${profile.term || '2026 秋季学期'}`
      : '示例班级 · 暂无学情数据'));
    body.appendChild(el('p', 'tw-class-note', '共性断点 Top 3（阈值 40%）'));
    points.slice(0, 3).forEach((point, index) => {
      const row = el('div', 'tw-class-row');
      const top = el('div', 'tw-class-top');
      const label = el('span', 'tw-class-label');
      label.appendChild(el('span', 'tw-class-rank', String(index + 1)));
      label.appendChild(el('span', '', point.label));
      top.appendChild(label);
      top.appendChild(el('span', 'tw-class-ratio', percent(point.ratio)));
      row.appendChild(top);
      const bar = el('div', 'tw-class-bar');
      const fill = el('i', '');
      fill.style.width = `${Math.max(2, Math.round((Number(point.ratio) || 0) * 100))}%`;
      bar.appendChild(fill);
      const threshold = el('span', 'tw-class-threshold');
      threshold.title = '共性断点阈值 40%';
      bar.appendChild(threshold);
      row.appendChild(bar);
      if (Number(point.ratio) > 0.4) {
        row.appendChild(el('span', 'badge badge-danger tw-class-badge', '共性断点'));
      }
      body.appendChild(row);
    });
    if (!points.length) body.appendChild(el('p', 'tw-muted', '当前场景没有班级学情数据。'));
    card.appendChild(body);
    return card;
  }

  function buildRail() {
    const rail = el('aside', 'tw-rail');
    const tabs = el('div', 'tw-rail-tabs');
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', '方案依据');
    const body = el('div', 'tw-rail-body');
    body.id = 'tw-rail-panel';
    body.setAttribute('role', 'tabpanel');
    const buttons = {};

    function tabCount(id) {
      if (id === 'graph') return String((graphData().nodes || []).length);
      if (id === 'sources') return String(sources().length);
      if (id === 'quality') {
        const results = Array.isArray(plan && plan.quality) ? plan.quality : [];
        if (results.length) {
          return `${results.filter((item) => item.status === 'pass').length}/${results.length}`;
        }
        return String(stageProfile((plan && plan.stage) || (scenario && scenario.stage)).quality.length);
      }
      const points = scenario && scenario.classProfile && Array.isArray(scenario.classProfile.weakPoints)
        ? scenario.classProfile.weakPoints
        : [];
      return points.length ? String(points.length) : '—';
    }

    function panelFor(id) {
      if (id === 'sources') return buildSourcesCard();
      if (id === 'quality') return buildQualityCard();
      if (id === 'class') return buildClassCard();
      return buildGraphCard();
    }

    function paint() {
      RAIL_TABS.forEach((tab) => {
        const active = tab.id === railTab;
        const btn = buttons[tab.id];
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-selected', active ? 'true' : 'false');
        btn.querySelector('.tw-rail-tab-count').textContent = tabCount(tab.id);
      });
    }

    function show(id) {
      railTab = id;
      paint();
      body.replaceChildren(panelFor(id));
      body.scrollTop = 0;
    }

    RAIL_TABS.forEach((tab) => {
      const btn = el('button', 'tw-rail-tab');
      btn.type = 'button';
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-controls', 'tw-rail-panel');
      btn.setAttribute('aria-selected', tab.id === railTab ? 'true' : 'false');
      btn.appendChild(icon(tab.icon, 14));
      btn.appendChild(el('span', '', tab.label));
      btn.appendChild(el('span', 'tw-rail-tab-count', tabCount(tab.id)));
      btn.addEventListener('click', () => {
        if (railTab === tab.id) return;
        show(tab.id);
      });
      buttons[tab.id] = btn;
      tabs.appendChild(btn);
    });

    rail.appendChild(tabs);
    rail.appendChild(body);
    show(railTab);

    // 图谱节点被点选时只重绘当前标签面板，保留面板滚动位置。
    railRefresh = () => {
      const top = body.scrollTop;
      paint();
      body.replaceChildren(panelFor(railTab));
      body.scrollTop = top;
    };
    return rail;
  }

  /* ---------- 图谱模式 ---------- */

  function relatedEdges(nodeId) {
    const graph = graphData();
    const edges = Array.isArray(graph.edges) ? graph.edges : [];
    return edges.filter((edge) => edge.from === nodeId || edge.to === nodeId);
  }

  function nodeLabel(id) {
    const graph = graphData();
    const node = (graph.nodes || []).find((item) => item.id === id);
    return node ? (node.label || node.id) : id;
  }

  function buildNodeCard() {
    const node = selectedNode();
    const card = el('section', 'card tg-rail-card');
    const head = el('div', 'card-head tw-rail-head');
    head.appendChild(el('h3', 'card-title', '节点详情'));
    head.appendChild(el('span', 'spacer'));
    if (node) head.appendChild(el('span', 'badge badge-accent', LAYER_NAMES[layerOf(node)]));
    card.appendChild(head);

    const body = el('div', 'card-body');
    if (!node) {
      const empty = el('div', 'empty tg-empty');
      empty.appendChild(el('span', 'empty-icon')).appendChild(icon('git-branch', 22));
      empty.appendChild(el('h3', '', '选择一个节点'));
      empty.appendChild(el('p', '', '点击左侧图谱中的节点，查看概念说明、关系依据与资料来源。'));
      body.appendChild(empty);
      card.appendChild(body);
      return card;
    }

    body.appendChild(el('h4', 'tg-node-title', node.label || node.id));
    body.appendChild(el('p', 'tg-node-desc', node.desc || '暂无说明'));

    const meta = el('div', 'tg-node-meta');
    meta.appendChild(el('span', 'badge badge-neutral', node.kind === 'skill' ? '技能' : node.kind === 'target' ? '目标概念' : '概念'));
    meta.appendChild(el('span', 'badge badge-neutral', LAYER_NAMES[layerOf(node)]));
    if (Array.isArray(node.sourceIds)) {
      meta.appendChild(el('span', 'badge badge-info', `${node.sourceIds.length} 条来源`));
    }
    body.appendChild(meta);

    const edges = relatedEdges(node.id);
    body.appendChild(el('h5', 'tg-sub-title', `相关关系（${edges.length}）`));
    if (!edges.length) {
      body.appendChild(el('p', 'tw-muted', '该节点没有记录在案的关系。'));
    } else {
      const list = el('div', 'tg-edge-list');
      edges.forEach((edge) => {
        const row = el('div', 'tg-edge');
        const top = el('div', 'tg-edge-top');
        top.appendChild(el('span', 'tg-edge-path', `${nodeLabel(edge.from)} → ${nodeLabel(edge.to)}`));
        top.appendChild(el('span', 'badge badge-neutral', percent(edge.confidence)));
        row.appendChild(top);
        row.appendChild(el('p', 'tg-edge-basis', (edge.relation ? edge.relation + '：' : '') + (edge.basis || '未记录依据')));
        list.appendChild(row);
      });
      body.appendChild(list);
    }
    card.appendChild(body);
    return card;
  }

  function buildNodeSourcesCard() {
    const node = selectedNode();
    const ids = node && Array.isArray(node.sourceIds) ? node.sourceIds : [];
    const list = ids.map((id) => sourceOf(id)).filter(Boolean);
    const card = el('section', 'card tg-rail-card');
    const head = el('div', 'card-head tw-rail-head');
    head.appendChild(el('h3', 'card-title', '节点来源'));
    head.appendChild(el('span', 'spacer'));
    head.appendChild(el('span', 'badge badge-neutral', `${list.length} 条`));
    card.appendChild(head);

    const body = el('div', 'card-body tw-source-list');
    if (!list.length) {
      body.appendChild(el('p', 'tw-muted', '该节点没有标注来源，建议人工核对。'));
    }
    list.forEach((source) => {
      const item = el('div', 'tw-source');
      item.setAttribute('data-source-id', source.id);
      const top = el('div', 'tw-source-top');
      top.appendChild(sourceBadge(source.type));
      top.appendChild(el('span', 'tw-source-title', source.title));
      item.appendChild(top);
      item.appendChild(el('p', 'tw-source-loc', source.locator || '未标注位置'));
      if (source.excerpt) item.appendChild(el('p', 'tw-source-excerpt', source.excerpt));
      item.appendChild(el('div', 'tw-source-foot'))
        .appendChild(el('span', '', `可信度 ${percent(source.confidence)}`));
      body.appendChild(item);
    });
    card.appendChild(body);
    return card;
  }

  function buildScenarioSourcesCard() {
    const list = sources();
    const card = el('section', 'card tg-rail-card');
    const head = el('div', 'card-head tw-rail-head');
    head.appendChild(el('h3', 'card-title', '场景资料'));
    head.appendChild(el('span', 'spacer'));
    head.appendChild(actionBtn('ghost', '资料库', 'book-open', () => navigate('library'), {
      size: 'sm',
      title: '打开资料库'
    }));
    card.appendChild(head);
    const body = el('div', 'card-body tw-source-list');
    list.slice(0, 8).forEach((source) => {
      const item = el('div', 'tw-source');
      const top = el('div', 'tw-source-top');
      top.appendChild(sourceBadge(source.type));
      top.appendChild(el('span', 'tw-source-title', source.title));
      item.appendChild(top);
      item.appendChild(el('p', 'tw-source-loc', source.locator || '未标注位置'));
      body.appendChild(item);
    });
    if (!list.length) body.appendChild(el('p', 'tw-muted', '当前场景没有资料源。'));
    card.appendChild(body);
    return card;
  }

  function buildGraphMode() {
    ensureSelectedNode();
    const wrap = el('div', 'tg-mode');

    const bar = el('div', 'tg-scenario-bar card');
    bar.appendChild(el('span', 'tg-scenario-label', '当前场景'));
    if (scenarios.length) bar.appendChild(scenarioSelect('tg-scenario-select'));
    bar.appendChild(el('span', 'spacer'));
    const graph = graphData();
    bar.appendChild(el('span', 'badge badge-neutral', `${(graph.nodes || []).length} 个节点`));
    bar.appendChild(el('span', 'badge badge-neutral', `${(graph.edges || []).length} 条关系`));
    bar.appendChild(actionBtn('secondary', '返回方案', 'arrow-left', () => navigate('teacher-workbench'), {
      size: 'sm',
      title: '返回教学方案工作台'
    }));
    wrap.appendChild(bar);

    const split = el('div', 'tg-split');

    const canvasCard = el('section', 'card tg-canvas-card');
    const head = el('div', 'card-head');
    head.appendChild(el('h3', 'card-title', '知识图谱'));
    head.appendChild(el('span', 'card-sub', scenario ? scenario.unit || scenario.title : '当前场景'));
    head.appendChild(el('span', 'spacer'));
    if (scenario) head.appendChild(el('span', 'badge badge-accent', scenario.subject));
    canvasCard.appendChild(head);

    const canvas = el('div', 'tg-canvas');
    canvas.appendChild(buildGraphSvg(graph, { large: true, selectedId: selectedNodeId }, selectNode));
    canvasCard.appendChild(canvas);

    const legend = el('div', 'tg-legend');
    [
      { label: '高置信关系', cls: 'is-solid' },
      { label: '待校准关系', cls: 'is-dashed' },
      { label: '选中节点', cls: 'is-selected' }
    ].forEach((item) => {
      const box = el('span', 'tg-legend-item');
      box.appendChild(el('i', `tg-legend-key ${item.cls}`));
      box.appendChild(el('span', '', item.label));
      legend.appendChild(box);
    });
    canvasCard.appendChild(legend);
    split.appendChild(canvasCard);

    const rail = el('aside', 'tg-rail');
    rail.appendChild(buildNodeCard());
    rail.appendChild(buildNodeSourcesCard());
    rail.appendChild(buildScenarioSourcesCard());
    split.appendChild(rail);
    wrap.appendChild(split);
    return wrap;
  }

  /* ---------- 渲染 ---------- */

  function currentStepIndex() {
    if (generating) return 2;
    if (plan) return recordId ? 4 : 3;
    return 1;
  }

  function buildFlowSteps() {
    const labels = ['选课程', '说需求', '生成方案', '核对依据', '保存/复盘'];
    const hints = [
      '选择学段、学科与教材场景，确定这次要解决哪节课。',
      '写一句需求：课时、学情与课堂限制，再生成方案。',
      '正在检索资料、构建图谱、生成方案并做质量检查。',
      '方案已生成，请核对来源、时间分配与质量检查结果。',
      recordId ? `已保存第 ${versionCount()} 版，可去「我的方案」继续修改或写复盘。` : '保存后会保留版本，可在「我的方案」继续修改。'
    ];
    const current = currentStepIndex();
    const card = el('nav', 'tw-flow-steps');
    card.setAttribute('aria-label', '使用步骤');
    const list = el('ol', 'tw-flow-list');
    labels.forEach((label, index) => {
      const done = index < current;
      const active = index === current;
      const item = el('li', `tw-flow-step${done ? ' is-done' : ''}${active ? ' is-active' : ''}${!done && !active ? ' is-todo' : ''}`);
      item.setAttribute('data-step', String(index + 1));
      if (active) item.setAttribute('aria-current', 'step');
      const dot = el('span', 'tw-flow-dot');
      dot.appendChild(done ? icon('check', 12) : active ? icon('activity', 12) : el('span', '', String(index + 1)));
      item.appendChild(dot);
      item.appendChild(el('span', 'tw-flow-label', label));
      list.appendChild(item);
    });
    card.appendChild(list);
    card.appendChild(el('p', 'tw-flow-hint', hints[current]));
    return card;
  }

  function buildProfileMismatch() {
    if (!plan) return null;
    const settings = state.settings || {};
    const planStage = String(plan.stage || '');
    const planSubject = String(plan.subject || '');
    const curStage = String(settings.stage || '');
    const curSubject = String(settings.subject || '');
    if (planStage === curStage && planSubject === curSubject) return null;
    const box = el('div', 'notice notice-warn tw-profile-mismatch');
    box.appendChild(icon('alert-triangle', 16));
    const text = el('div', 'tw-mismatch-text');
    text.appendChild(el('strong', '', '教师档案已变更'));
    text.appendChild(
      el('span', '', `当前打开的是「${planStage || '未设置'} · ${planSubject || '未设置'}」的旧方案；你的档案是「${curStage || '未设置'} · ${curSubject || '未设置'}」。新建方案会按新档案选择场景。`)
    );
    box.appendChild(text);
    box.appendChild(
      actionBtn('secondary', '新建方案', 'plus', () => {
        clearDraftCache();
        state.activePlanId = null;
        navigate('teacher-workbench', { fresh: true });
      }, { size: 'sm', title: '按当前教师档案新建方案' })
    );
    return box;
  }

  function buildWorkbench() {
    const wrap = el('div', 'tw-workbench');
    const shell = el('div', 'tw-shell');

    // 步骤条、档案变更提示与三栏共用同一个工作区表面，不再各自悬浮成独立卡片。
    const head = el('div', 'tw-shell-head');
    head.appendChild(buildFlowSteps());
    // 场景级提示放在工作区顶部横带，避免占用左栏表单高度。
    if (scenario && scenario.custom) head.appendChild(buildCustomNotice());
    const mismatch = buildProfileMismatch();
    if (mismatch) head.appendChild(mismatch);
    shell.appendChild(head);

    const body = el('div', 'tw-body');
    body.appendChild(buildLeft());
    const center = el('div', 'tw-center');
    if (generating) center.appendChild(buildProgress());
    else if (!plan) center.appendChild(buildEmpty());
    else center.appendChild(buildPlanView());
    body.appendChild(center);
    body.appendChild(buildRail());
    shell.appendChild(body);
    wrap.appendChild(shell);
    return wrap;
  }

  function render() {
    if (!mounted) return;
    const page = el('div', `v-page tw-page${view === 'graph' ? ' tg-page' : ''}`);
    if (loading) {
      page.appendChild(el('div', 'tw-loading skeleton sk-block'));
      root.textContent = '';
      root.appendChild(page);
      return;
    }
    if (scenario) page.appendChild(buildTop());
    if (view === 'graph') page.appendChild(buildGraphMode());
    else page.appendChild(buildWorkbench());
    root.textContent = '';
    root.appendChild(page);
  }

  /* ---------- 初始化 ---------- */

  (async function init() {
    try {
      scenarios = await loadScenarios();
    } catch (err) {
      scenarios = [];
    }
    if (!mounted) return;
    scenario = selectScenario(state.settings, scenarios);
    if (scenario && scenario.custom && !scenarios.some((item) => item.id === scenario.id)) {
      scenarios = [scenario].concat(scenarios);
    }
    const fresh = params.fresh === true || params.fresh === 'true';
    if (fresh) clearDraftCache();
    const restored = readActivePlan();
    if (!restored && draftCache.plan) {
      plan = draftCache.plan;
      recordId = draftCache.recordId;
      const cachedScenario = scenarios.find((item) => item.id === draftCache.scenarioId);
      if (cachedScenario) scenario = cachedScenario;
      if (draftCache.request) {
        request = {
          ...draftCache.request,
          constraints: Array.isArray(draftCache.request.constraints)
            ? draftCache.request.constraints.slice()
            : []
        };
      }
    } else if (!restored) {
      request = requestForScenario(scenario, request);
    }
    loading = false;
    render();
  })();

  return function cleanup() {
    mounted = false;
    railRefresh = null;
    root.textContent = '';
  };
}
