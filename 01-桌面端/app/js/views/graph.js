/* graph.js · 知识图谱
 * 依赖 core/store.js：getSession、getTopic、subscribe、actions.setOverride、actions.recalcSession
 * 依赖 core/router.js：navigate
 * 依赖 core/ui.js：h、icon
 * 依赖 core/feedback.js：toast
 *
 * 说明：图谱为真实可交互 SVG；节点/边的数据全部来自 topic（演示数据）。
 * 本文件不持有持久状态，缩放/平移与选中状态只在视图内部保留。
 */

import { actions, getSession, getTopic, subscribe } from '../core/store.js';
import { navigate } from '../core/router.js';
import { h, icon } from '../core/ui.js';
import { toast } from '../core/feedback.js';

const NS = 'http://www.w3.org/2000/svg';
const CARD_W = 168;
const CARD_H = 76;
const GAP_X = 60;
const PAD = 24;

const LAYER_LABEL = ['第 0 层', '第 1 层', '第 2 层', '目标'];

function el(tag, cls, text) {
  const node = h(tag, cls ? { className: cls } : {});
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

function attr(node, map) {
  Object.keys(map).forEach((key) => {
    const value = map[key];
    if (value !== undefined && value !== null) node.setAttribute(key, String(value));
  });
  return node;
}

function svgNode(tag, attrs, text) {
  const node = document.createElementNS(NS, tag);
  if (attrs) attr(node, attrs);
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

function iconBtn(name, label, onClick) {
  const btn = el('button', 'icon-btn');
  btn.type = 'button';
  btn.setAttribute('aria-label', label);
  btn.title = label;
  btn.appendChild(icon(name, 17));
  btn.addEventListener('click', onClick);
  return btn;
}

function actionBtn(kind, label, iconName, onClick, opts) {
  const options = opts || {};
  const cls = 'btn btn-' + kind + (options.size ? ' btn-' + options.size : '');
  const btn = el('button', cls);
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

function confPct(confidence) {
  return Math.round((Number(confidence) || 0) * 100) + '%';
}

function basisSummary(edge) {
  const text = String((edge && edge.basis) || '').replace(/\s+/g, ' ').trim();
  if (!text) return '推断依据';
  return text.length > 36 ? text.slice(0, 36) + '…' : text;
}

function tierOf(confidence) {
  const value = Number(confidence) || 0;
  if (value >= 0.85) return { key: 'effective', label: '已确认' };
  if (value >= 0.5) return { key: 'review', label: '待校准' };
  return { key: 'discarded', label: '已丢弃' };
}

function labelLines(label) {
  const value = String(label || '未命名节点');
  if (value.length <= 8) return [value];
  return [value.slice(0, 8), value.length > 16 ? value.slice(8, 15) + '…' : value.slice(8)];
}

function nodeConfidence(node, edges) {
  const incoming = edges.filter((edge) => edge.to === node.id);
  const outgoing = edges.filter((edge) => edge.from === node.id);
  const pool = incoming.length ? incoming : outgoing;
  if (!pool.length) return 0.9;
  return pool.reduce((max, edge) => Math.max(max, Number(edge.confidence) || 0), 0);
}

function buildLayout(topic, mode) {
  const nodes = Array.isArray(topic.nodes) ? topic.nodes : [];
  const edges = Array.isArray(topic.edges) ? topic.edges : [];
  const maxLayer = nodes.reduce((max, node) => Math.max(max, Number(node.layer) || 0), 0);
  const columns = [];
  for (let layer = 0; layer <= maxLayer; layer += 1) {
    columns.push(nodes.filter((node) => (Number(node.layer) || 0) === layer));
  }

  if (mode === 'compact') {
    for (let i = 1; i < columns.length; i += 1) {
      const previous = new Map(columns[i - 1].map((node, index) => [node.id, index]));
      columns[i].sort((a, b) => {
        const pa = edges.filter((edge) => edge.to === a.id && previous.has(edge.from))
          .map((edge) => previous.get(edge.from));
        const pb = edges.filter((edge) => edge.to === b.id && previous.has(edge.from))
          .map((edge) => previous.get(edge.from));
        const va = pa.length ? pa.reduce((sum, n) => sum + n, 0) / pa.length : Number.MAX_SAFE_INTEGER;
        const vb = pb.length ? pb.reduce((sum, n) => sum + n, 0) / pb.length : Number.MAX_SAFE_INTEGER;
        return va - vb;
      });
    }
  }

  const rows = Math.max(1, ...columns.map((column) => column.length));
  const gapY = mode === 'compact' ? 16 : 28;
  const contentH = PAD * 2 + rows * CARD_H + (rows - 1) * gapY;
  const contentW = PAD * 2 + columns.length * CARD_W + (columns.length - 1) * GAP_X;
  const positions = new Map();

  columns.forEach((column, columnIndex) => {
    const columnH = column.length * CARD_H + (column.length - 1) * gapY;
    const startY = mode === 'compact' ? PAD : PAD + (contentH - PAD * 2 - columnH) / 2;
    column.forEach((node, rowIndex) => {
      positions.set(node.id, {
        x: PAD + columnIndex * (CARD_W + GAP_X),
        y: startY + rowIndex * (CARD_H + gapY),
        node,
        column: columnIndex
      });
    });
  });

  return { positions, edges, nodes, contentW, contentH, maxLayer };
}

function statusOf(node, session, confidence) {
  const overrides = session.overrides || {};
  const override = overrides[node.id];
  if (override === 'understood') {
    return { key: 'understood', dot: 'is-understood', label: '我已理解', badge: 'success' };
  }
  if (override === 'needs-work') {
    return { key: 'needs-work', dot: 'is-needs', label: '仍需巩固', badge: 'warning' };
  }
  if (override === 'cleared') {
    return { key: 'cleared', dot: 'is-model', label: '已撤回判断 · 恢复模型判断', badge: 'neutral' };
  }
  if (confidence >= 0.85) {
    return { key: 'effective', dot: 'is-model', label: '模型判断 · 已确认', badge: 'success' };
  }
  return { key: 'review', dot: 'is-review', label: '模型判断 · 待校准', badge: 'warning' };
}

export function mount(root, ctx) {
  const context = ctx || {};
  let sid = (context.session && context.session.id) || (context.params && context.params.sessionId) || null;
  let selectedId = null;
  let legendOpen = false;
  let layoutMode = 'balanced';
  let mounted = true;
  let unsubscribe = null;
  let rafId = 0;
  let focusNodeId = null;
  let searchQuery = '';
  let searchInput = null;
  let searchClear = null;
  let searchMeta = null;
  let searchMatches = new Set();
  let refocusSearch = false;

  let layout = null;
  let svgEl = null;
  let viewportG = null;
  let zoomLabel = null;
  const view = { scale: 1, tx: 0, ty: 0, ready: false };

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
    if (!topic && context.session && (!sid || context.session.id === sid)) {
      topic = safeTopic(context.session.topicId);
    }
    if (!topic) topic = context.topic || null;
    return { session, topic };
  }

  function applyView() {
    if (!viewportG) return;
    viewportG.setAttribute(
      'transform',
      'translate(' + view.tx.toFixed(2) + ' ' + view.ty.toFixed(2) + ') scale(' + view.scale.toFixed(4) + ')'
    );
    if (zoomLabel) zoomLabel.textContent = Math.round(view.scale * 100) + '%';
  }

  function fitView() {
    if (!svgEl || !layout) return;
    const width = svgEl.clientWidth || 800;
    const height = svgEl.clientHeight || 500;
    const nextScale = Math.min((width - 28) / layout.contentW, (height - 28) / layout.contentH, 1.08);
    view.scale = Math.max(0.38, Math.min(1.6, nextScale));
    view.tx = (width - layout.contentW * view.scale) / 2;
    view.ty = (height - layout.contentH * view.scale) / 2;
    view.ready = true;
    applyView();
  }

  function zoomAt(factor, pointX, pointY) {
    const nextScale = Math.max(0.38, Math.min(2.4, view.scale * factor));
    const ratio = nextScale / view.scale;
    view.tx = pointX - (pointX - view.tx) * ratio;
    view.ty = pointY - (pointY - view.ty) * ratio;
    view.scale = nextScale;
    view.ready = true;
    applyView();
  }

  function zoomBy(factor) {
    const width = svgEl ? svgEl.clientWidth : 800;
    const height = svgEl ? svgEl.clientHeight : 500;
    zoomAt(factor, width / 2, height / 2);
  }

  function applyOverride(session, nodeId, status) {
    let ok = false;
    try {
      if (actions && typeof actions.setOverride === 'function') {
        actions.setOverride(session.id, nodeId, status);
        ok = true;
      }
    } catch (err) {
      ok = false;
    }
    if (!ok) {
      if (!session.overrides || typeof session.overrides !== 'object') session.overrides = {};
      if (status === 'cleared') delete session.overrides[nodeId];
      else session.overrides[nodeId] = status;
      render();
    }
    return ok;
  }

  function recalcSession(session) {
    let ok = false;
    try {
      if (actions && typeof actions.recalcSession === 'function') {
        actions.recalcSession(session.id);
        ok = true;
      }
    } catch (err) {
      ok = false;
    }
    if (!ok) {
      session.stale = [];
      render();
    }
    toast('已重算路径：过期标记已清除（本地知识库）', 'success');
  }

  function openNode(node) {
    selectedId = node.id;
    focusNodeId = node.id;
    render();
  }

  function matchedNodeIds() {
    const query = searchQuery.trim().toLowerCase();
    const ids = new Set();
    if (!query || !layout) return ids;
    layout.nodes.forEach((node) => {
      if (String(node.label || '').toLowerCase().indexOf(query) !== -1) ids.add(node.id);
    });
    return ids;
  }

  function applySearch() {
    if (!svgEl) return;
    const query = searchQuery.trim();
    const groups = svgEl.querySelectorAll('.gnode');
    if (!query) {
      svgEl.classList.remove('is-searching');
      searchMatches = new Set();
      for (let i = 0; i < groups.length; i += 1) {
        groups[i].classList.remove('is-match', 'is-dim');
      }
      return;
    }
    searchMatches = matchedNodeIds();
    svgEl.classList.add('is-searching');
    for (let i = 0; i < groups.length; i += 1) {
      const id = groups[i].getAttribute('data-node-id');
      groups[i].classList.toggle('is-match', searchMatches.has(id));
      groups[i].classList.toggle('is-dim', !searchMatches.has(id));
    }
  }

  function syncSearchUi() {
    const query = searchQuery.trim();
    if (searchClear) searchClear.hidden = !query;
    if (!searchMeta) return;
    searchMeta.hidden = !query;
    searchMeta.textContent = query ? (searchMatches.size ? searchMatches.size + ' 个匹配' : '无匹配') : '';
  }

  function clearSearch(shouldFocus) {
    searchQuery = '';
    if (searchInput) {
      searchInput.value = '';
      if (shouldFocus) searchInput.focus({ preventScroll: true });
    }
    applySearch();
    syncSearchUi();
  }

  function selectFirstMatch() {
    const query = searchQuery.trim();
    if (!query) return;
    const ids = matchedNodeIds();
    if (!ids.size || !layout) {
      toast('没有匹配「' + query + '」的节点。', 'info');
      return;
    }
    const first = layout.nodes.find((node) => ids.has(node.id));
    if (!first) return;
    selectedId = first.id;
    refocusSearch = true;
    render();
  }

  function buildHeader(session, topic, staleCount) {
    const head = el('header', 'v-head');
    const main = el('div', 'v-head-main');
    main.appendChild(el('h1', 'v-title', '知识图谱'));
    main.appendChild(el('p', 'v-sub', (topic.domain || '当前主题') + ' · ' + (topic.title || '知识图谱') + ' · 分层前置假设，每条边都可追溯到依据与来源'));
    head.appendChild(main);

    const actionsBox = el('div', 'v-head-actions');
    if (staleCount > 0) {
      actionsBox.appendChild(actionBtn('primary', '重算路径', 'refresh', () => recalcSession(session), {
        title: '重新计算路径并清除过期标记'
      }));
    } else {
      actionsBox.appendChild(actionBtn('primary', '查看学习路径', 'arrow-right', () => {
        navigate('path', { sessionId: session.id });
      }));
    }
    head.appendChild(actionsBox);
    return head;
  }

  function buildLegend() {
    const panel = el('div', 'graph-legend');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', '图谱图例');
    panel.appendChild(el('div', 'graph-legend-title', '图例'));

    const rows = [
      ['legend-line solid', '生效边', '置信度 ≥ 85%，实线'],
      ['legend-line review', '待校准边', '置信度 50%–85%，虚线，进入校准队列'],
      ['legend-line stale', '过期需重算', '人工覆写后的下游节点与边'],
      ['legend-line dropped', '已丢弃', '置信度 < 50%，不绘制入主图']
    ];
    rows.forEach((row) => {
      const line = el('div', 'graph-legend-row');
      line.appendChild(el('span', row[0]));
      const text = el('div', 'graph-legend-text');
      text.appendChild(el('span', 'graph-legend-name', row[1]));
      text.appendChild(el('span', 'graph-legend-desc', row[2]));
      line.appendChild(text);
      panel.appendChild(line);
    });

    const dotRow = el('div', 'graph-legend-row graph-legend-dots');
    dotRow.appendChild(el('span', 'legend-dot is-understood'));
    dotRow.appendChild(el('span', 'legend-dot is-needs'));
    dotRow.appendChild(el('span', 'legend-dot is-review'));
    dotRow.appendChild(el('span', 'graph-legend-desc', '节点状态：我已理解 / 仍需巩固 / 待校准'));
    panel.appendChild(dotRow);
    return panel;
  }

  function buildToolbar(session) {
    const bar = el('div', 'graph-toolbar');

    const tools = el('div', 'graph-tools');
    tools.appendChild(iconBtn('zoom-in', '放大图谱', () => zoomBy(1.2)));
    tools.appendChild(iconBtn('zoom-out', '缩小图谱', () => zoomBy(1 / 1.2)));
    tools.appendChild(iconBtn('maximize', '适配画布', () => {
      view.ready = false;
      fitView();
    }));
    tools.appendChild(iconBtn('refresh', '重新布局', () => {
      layoutMode = layoutMode === 'balanced' ? 'compact' : 'balanced';
      view.ready = false;
      render();
      toast(layoutMode === 'compact' ? '已切换为紧凑布局' : '已切换为均衡布局', 'info');
    }));

    const legendBtn = el('button', 'btn btn-ghost btn-sm graph-legend-btn');
    legendBtn.type = 'button';
    legendBtn.setAttribute('aria-expanded', legendOpen ? 'true' : 'false');
    legendBtn.setAttribute('aria-label', '显示或隐藏图例');
    legendBtn.appendChild(icon('info', 16));
    legendBtn.appendChild(el('span', '', '图例'));
    legendBtn.addEventListener('click', () => {
      legendOpen = !legendOpen;
      render();
    });
    tools.appendChild(legendBtn);
    bar.appendChild(tools);

    const search = el('div', 'graph-search');
    const searchIcon = el('span', 'graph-search-icon');
    searchIcon.appendChild(icon('search', 15));
    search.appendChild(searchIcon);

    searchInput = el('input', 'input graph-search-input');
    searchInput.type = 'search';
    searchInput.placeholder = '搜索概念节点';
    searchInput.value = searchQuery;
    searchInput.setAttribute('aria-label', '搜索概念节点');
    searchInput.addEventListener('input', () => {
      searchQuery = searchInput.value;
      applySearch();
      syncSearchUi();
    });
    searchInput.addEventListener('keydown', (event) => {
      if (event.isComposing) return;
      if (event.key === 'Enter') {
        event.preventDefault();
        selectFirstMatch();
      } else if (event.key === 'Escape' && searchQuery) {
        event.preventDefault();
        event.stopPropagation();
        clearSearch(false);
      }
    });
    search.appendChild(searchInput);

    searchClear = el('button', 'graph-search-clear');
    searchClear.type = 'button';
    searchClear.hidden = !searchQuery;
    searchClear.title = '清空搜索';
    searchClear.setAttribute('aria-label', '清空搜索');
    searchClear.appendChild(icon('x', 13));
    searchClear.addEventListener('click', () => clearSearch(true));
    search.appendChild(searchClear);

    bar.appendChild(search);

    const right = el('div', 'graph-toolbar-right');
    searchMeta = el('span', 'graph-search-meta');
    searchMeta.hidden = !searchQuery;
    searchMeta.setAttribute('aria-live', 'polite');
    right.appendChild(searchMeta);
    right.appendChild(el('span', 'graph-toolbar-meta', '内置知识库 · 本地推断'));
    bar.appendChild(right);
    return bar;
  }

  function buildEdge(edge, positions, staleSet) {
    const from = positions.get(edge.from);
    const to = positions.get(edge.to);
    if (!from || !to) return null;
    const confidence = edge.confidence === undefined || edge.confidence === null ? 0.9 : (Number(edge.confidence) || 0);
    if (edge.tier === 'discarded' || (confidence < 0.5 && edge.tier !== 'review')) return null;

    const x1 = from.x + CARD_W;
    const y1 = from.y + CARD_H / 2;
    const x2 = to.x;
    const y2 = to.y + CARD_H / 2;
    const curve = Math.max(44, (x2 - x1) * 0.46);
    const d = 'M ' + x1 + ' ' + y1
      + ' C ' + (x1 + curve) + ' ' + y1
      + ', ' + (x2 - curve) + ' ' + y2
      + ', ' + x2 + ' ' + y2;
    const tier = edge.tier === 'review' || confidence < 0.85 ? 'review' : 'effective';
    const stale = staleSet.has(edge.to);
    const path = svgNode('path', {
      d,
      class: 'graph-edge ' + tier + (stale ? ' is-stale' : '')
    });
    path.appendChild(svgNode('title', {}, (from.node.label || from.node.id) + ' → ' + (to.node.label || to.node.id)
      + ' · 置信度 ' + confPct(confidence) + ' · ' + basisSummary(edge)));
    return path;
  }

  function buildNode(node, position, session, topic, edges, staleSet) {
    const confidence = nodeConfidence(node, edges);
    const status = statusOf(node, session, confidence);
    const stale = staleSet.has(node.id);
    const isTarget = node.id === topic.targetId || (Number(node.layer) || 0) === 3;
    const isSelected = node.id === selectedId;

    const group = svgNode('g', {
      class: 'gnode' + (isSelected ? ' is-selected' : '') + (isTarget ? ' is-target' : '') + (stale ? ' is-stale' : ''),
      transform: 'translate(' + position.x + ' ' + position.y + ')',
      tabindex: '0',
      role: 'button',
      'aria-label': (node.label || node.id) + '，' + status.label + '，置信度 ' + confPct(confidence)
        + (stale ? '，过期需重算' : '')
    });
    group.setAttribute('data-node-id', node.id);

    group.appendChild(svgNode('rect', {
      class: 'gnode-card',
      width: CARD_W,
      height: CARD_H,
      rx: 11
    }));
    group.appendChild(svgNode('circle', {
      cx: 17,
      cy: 27,
      r: 4.5,
      class: 'gnode-dot ' + status.dot
    }));

    const lines = labelLines(node.label);
    group.appendChild(svgNode('text', { x: 29, y: 27, class: 'gnode-label' }, lines[0]));
    if (lines[1]) group.appendChild(svgNode('text', { x: 29, y: 46, class: 'gnode-label' }, lines[1]));

    const layerText = LAYER_LABEL[Number(node.layer) || 0] || ('第 ' + (Number(node.layer) || 0) + ' 层');
    group.appendChild(svgNode('text', { x: 16, y: 65, class: 'gnode-meta' }, layerText));
    group.appendChild(svgNode('text', {
      x: CARD_W - 16,
      y: 65,
      class: 'gnode-meta gnode-conf',
      'text-anchor': 'end'
    }, '置信度 ' + confPct(confidence)));

    if (stale) {
      group.appendChild(svgNode('rect', {
        x: CARD_W - 68,
        y: -12,
        width: 68,
        height: 23,
        rx: 11,
        class: 'gnode-stale'
      }));
      group.appendChild(svgNode('text', {
        x: CARD_W - 34,
        y: 4,
        class: 'gnode-stale-text',
        'text-anchor': 'middle'
      }, '需重算'));
    }

    group.addEventListener('pointerdown', (event) => event.stopPropagation());
    group.addEventListener('click', (event) => {
      event.stopPropagation();
      openNode(node);
    });
    group.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openNode(node);
      }
    });
    return group;
  }

  function buildCanvas(session, topic, staleSet) {
    layout = buildLayout(topic, layoutMode);
    const wrap = el('div', 'graph-canvas-wrap');

    svgEl = document.createElementNS(NS, 'svg');
    svgEl.setAttribute('class', 'graph-canvas');
    svgEl.setAttribute('role', 'group');
    svgEl.setAttribute('aria-label', topic.title + ' 的前置知识图谱，可拖拽平移、滚轮缩放');

    const group = svgNode('g', { class: 'graph-viewport' });
    viewportG = group;

    const edgesLayer = svgNode('g', { class: 'graph-edge-layer' });
    const nodesLayer = svgNode('g', { class: 'graph-node-layer' });

    layout.edges.forEach((edge) => {
      const path = buildEdge(edge, layout.positions, staleSet);
      if (path) edgesLayer.appendChild(path);
    });
    layout.nodes.forEach((node) => {
      const position = layout.positions.get(node.id);
      if (position) nodesLayer.appendChild(buildNode(node, position, session, topic, layout.edges, staleSet));
    });

    group.appendChild(edgesLayer);
    group.appendChild(nodesLayer);
    svgEl.appendChild(group);

    const zoom = el('div', 'graph-zoom');
    zoom.setAttribute('aria-hidden', 'true');
    zoomLabel = el('span', 'graph-zoom-value', Math.round(view.scale * 100) + '%');
    zoom.appendChild(zoomLabel);
    zoom.appendChild(el('span', 'graph-zoom-hint', '拖动平移 · 滚轮缩放'));

    wrap.appendChild(svgEl);
    wrap.appendChild(zoom);
    if (legendOpen) wrap.appendChild(buildLegend());

    applyView();

    // 拖拽平移
    let drag = null;
    svgEl.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      drag = { x: event.clientX, y: event.clientY, tx: view.tx, ty: view.ty, id: event.pointerId };
      try {
        svgEl.setPointerCapture(event.pointerId);
      } catch (err) {
        /* 指针捕获失败时仍可拖动 */
      }
      svgEl.classList.add('is-panning');
    });
    svgEl.addEventListener('pointermove', (event) => {
      if (!drag || event.pointerId !== drag.id) return;
      view.tx = drag.tx + (event.clientX - drag.x);
      view.ty = drag.ty + (event.clientY - drag.y);
      view.ready = true;
      applyView();
    });
    const endDrag = () => {
      if (!drag) return;
      try {
        svgEl.releasePointerCapture(drag.id);
      } catch (err) {
        /* noop */
      }
      drag = null;
      svgEl.classList.remove('is-panning');
    };
    svgEl.addEventListener('pointerup', endDrag);
    svgEl.addEventListener('pointercancel', endDrag);
    svgEl.addEventListener('pointerleave', (event) => {
      if (drag && event.buttons === 0) endDrag();
    });

    // 滚轮缩放：必须非 passive 才能 preventDefault
    svgEl.addEventListener('wheel', (event) => {
      event.preventDefault();
      const rect = svgEl.getBoundingClientRect();
      const factor = Math.exp(-event.deltaY * 0.0014);
      zoomAt(factor, event.clientX - rect.left, event.clientY - rect.top);
    }, { passive: false });

    return wrap;
  }

  function buildNodeDetail(session, topic, staleSet) {
    const card = el('section', 'card graph-detail');
    const selected = (topic.nodes || []).find((node) => node.id === selectedId) || null;

    const head = el('div', 'card-head');
    head.appendChild(el('h2', 'card-title', '节点详情'));
    if (selected) {
      const confidence = nodeConfidence(selected, topic.edges || []);
      const status = statusOf(selected, session, confidence);
      head.appendChild(el('span', 'badge badge-' + status.badge, status.label));
    }
    card.appendChild(head);

    const body = el('div', 'card-body graph-detail-body');
    if (!selected) {
      const placeholder = el('div', 'graph-placeholder');
      placeholder.appendChild(icon('info', 22));
      placeholder.appendChild(el('p', '', '点击左侧图谱中的节点，查看描述、推断依据、来源与置信度。'));
      placeholder.appendChild(el('p', 'graph-placeholder-hint', '节点上的状态点表示模型判断或人工覆写结果。'));
      body.appendChild(placeholder);
      card.appendChild(body);
      return card;
    }

    const confidence = nodeConfidence(selected, topic.edges || []);
    const status = statusOf(selected, session, confidence);
    const stale = staleSet.has(selected.id);

    const titleRow = el('div', 'graph-detail-title-row');
    titleRow.appendChild(el('h3', 'graph-detail-title', selected.label || selected.id));
    titleRow.appendChild(el('span', 'badge badge-neutral', '第 ' + (Number(selected.layer) || 0) + ' 层'));
    if (selected.id === topic.targetId) titleRow.appendChild(el('span', 'badge badge-accent', '目标概念'));
    if (stale) titleRow.appendChild(el('span', 'badge badge-warning', '过期需重算'));
    body.appendChild(titleRow);
    body.appendChild(el('p', 'graph-detail-desc', selected.desc || '暂无描述（知识库数据）'));

    const evidence = el('div', 'graph-field');
    evidence.appendChild(el('span', 'graph-field-label', '推断依据'));
    evidence.appendChild(el('p', 'graph-field-body', selected.evidence || '示例资料 / 项目自建知识卡（知识库数据）'));
    body.appendChild(evidence);

    const sourceBox = el('div', 'graph-field');
    sourceBox.appendChild(el('span', 'graph-field-label', '来源'));
    const sourceList = (topic.sources || []).filter((source) => {
      return Array.isArray(selected.sourceIds) && selected.sourceIds.indexOf(source.id) !== -1;
    });
    if (sourceList.length) {
      const list = el('ul', 'graph-sources');
      sourceList.forEach((source) => {
        const item = el('li', 'graph-source');
        const line = el('div', 'graph-source-head');
        line.appendChild(el('span', 'graph-source-title', source.title));
        const tags = el('span', 'graph-source-tags');
        if (source.kind) tags.appendChild(el('span', 'badge badge-neutral', source.kind));
        if (source.org) tags.appendChild(el('span', 'badge badge-neutral', source.org));
        if (tags.childNodes.length) line.appendChild(tags);
        item.appendChild(line);
        if (source.excerpt) item.appendChild(el('p', 'graph-source-excerpt', source.excerpt));
        list.appendChild(item);
      });
      sourceBox.appendChild(list);
    } else {
      sourceBox.appendChild(el('p', 'graph-field-body', '示例资料 / 项目自建知识卡（知识库数据）'));
    }
    body.appendChild(sourceBox);

    const confBox = el('div', 'graph-field');
    const confHead = el('div', 'graph-confidence-head');
    confHead.appendChild(el('span', 'graph-field-label', '置信度'));
    confHead.appendChild(el('span', 'badge badge-' + (confidence >= 0.85 ? 'success' : 'warning'), tierOf(confidence).label + ' · ' + confPct(confidence)));
    confBox.appendChild(confHead);
    const meter = el('div', 'meter ' + (confidence >= 0.85 ? 'good' : 'warn'));
    const fill = el('i', '');
    fill.style.width = Math.round(confidence * 100) + '%';
    meter.appendChild(fill);
    confBox.appendChild(meter);
    confBox.appendChild(el('p', 'graph-field-note', '置信度来自前置边的模型判断；低置信边进入下方校准队列。'));
    body.appendChild(confBox);

    const overrideBox = el('div', 'graph-override');
    overrideBox.appendChild(el('span', 'graph-field-label', '人工覆写'));
    const buttons = el('div', 'graph-override-buttons');
    const options = [
      { key: 'understood', label: '我已理解' },
      { key: 'needs-work', label: '仍需巩固' },
      { key: 'cleared', label: '撤回判断' }
    ];
    options.forEach((option) => {
      const active = (session.overrides || {})[selected.id] === option.key;
      const btn = el('button', 'btn btn-sm btn-secondary graph-ov-btn' + (active ? ' is-active' : ''));
      btn.type = 'button';
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      btn.textContent = option.label;
      btn.addEventListener('click', () => {
        applyOverride(session, selected.id, option.key);
        if (option.key === 'cleared') toast('已撤回判断，恢复模型判断（下游过期标记将一并清除）', 'info');
        else toast('已记录人工覆写：' + option.label + '；下游节点标记为过期需重算', 'success');
      });
      buttons.appendChild(btn);
    });
    overrideBox.appendChild(buttons);
    overrideBox.appendChild(el('p', 'graph-field-note', '人工覆写只记录在本机知识库数据中，不改变模型本身。'));
    body.appendChild(overrideBox);

    card.appendChild(body);
    return card;
  }

  function buildCalibration(session, topic) {
    const card = el('section', 'card graph-calib');
    const edges = (topic.edges || []).filter((edge) => {
      const confidence = Number(edge.confidence) || 0;
      return edge.tier === 'review' || (confidence >= 0.5 && confidence < 0.85);
    });

    const head = el('div', 'card-head');
    head.appendChild(el('h2', 'card-title', '校准队列'));
    head.appendChild(el('span', 'badge ' + (edges.length ? 'badge-warning' : 'badge-neutral'), String(edges.length)));
    card.appendChild(head);

    const body = el('div', 'card-body graph-calib-body');
    body.appendChild(el('p', 'graph-calib-intro', '置信度 50%–85% 的边待人工确认。采纳或否定会把下游节点写入人工覆写状态；这是人工边校准。'));

    if (!edges.length) {
      body.appendChild(el('p', 'graph-empty-note', '当前没有待校准的边。'));
      card.appendChild(body);
      return card;
    }

    const labels = new Map((topic.nodes || []).map((node) => [node.id, node.label || node.id]));
    edges.forEach((edge) => {
      const item = el('div', 'graph-calib-item');
      const top = el('div', 'graph-calib-top');
      top.appendChild(el('span', 'graph-calib-path', (labels.get(edge.from) || edge.from) + ' → ' + (labels.get(edge.to) || edge.to)));
      top.appendChild(el('span', 'badge badge-warning', confPct(edge.confidence)));
      item.appendChild(top);
      item.appendChild(el('p', 'graph-calib-basis', edge.basis || '示例依据 / 项目自建知识卡'));
      const row = el('div', 'graph-calib-actions');
      row.appendChild(actionBtn('secondary', '采纳', 'check', () => {
        applyOverride(session, edge.to, 'understood');
        toast('人工边校准：已采纳，下游节点记为「我已理解」', 'success');
      }, { size: 'sm' }));
      row.appendChild(actionBtn('ghost', '否定', 'x', () => {
        applyOverride(session, edge.to, 'cleared');
        toast('人工边校准：已否定，下游节点恢复模型判断', 'info');
      }, { size: 'sm' }));
      item.appendChild(row);
      body.appendChild(item);
    });

    card.appendChild(body);
    return card;
  }

  function buildEmpty() {
    const page = el('div', 'v-page graph-page');
    const head = el('header', 'v-head');
    const main = el('div', 'v-head-main');
    main.appendChild(el('h1', 'v-title', '知识图谱'));
    main.appendChild(el('p', 'v-sub', '分层前置关系、推断依据与人工覆写'));
    head.appendChild(main);
    page.appendChild(head);

    const card = el('div', 'card');
    const empty = el('div', 'empty');
    const iconBox = el('div', 'empty-icon');
    iconBox.appendChild(icon('git-branch', 24));
    empty.appendChild(iconBox);
    empty.appendChild(el('h3', '', '还没有可查看的知识图谱'));
    empty.appendChild(el('p', '', '知识图谱会在一次概念诊断展开前置假设后生成。当前使用本地知识库，全部计算在本机完成。'));
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

    if (!session || !topic || !Array.isArray(topic.nodes) || !topic.nodes.length) {
      root.textContent = '';
      root.appendChild(buildEmpty());
      return;
    }
    if (sid !== session.id) sid = session.id;
    // 首次进入默认选中目标概念，让右侧详情栏有内容，避免大面积空面板。
    if (!selectedId && topic.targetId) selectedId = topic.targetId;

    const staleSet = new Set(Array.isArray(session.stale) ? session.stale : []);
    const page = el('div', 'v-page graph-page');
    page.appendChild(buildHeader(session, topic, staleSet.size));

    if (staleSet.size) {
      const banner = el('div', 'graph-banner');
      banner.appendChild(icon('alert-triangle', 18));
      const bannerText = el('div', 'graph-banner-text');
      bannerText.appendChild(el('strong', '', '有 ' + staleSet.size + ' 个节点因人工覆写被标记为过期需重算。'));
      bannerText.appendChild(el('span', '', '重算后才会作为学习路径的依据；当前显示仍基于上一次推断结果。'));
      banner.appendChild(bannerText);
      page.appendChild(banner);
    }

    const split = el('div', 'split graph-split');
    const mainCard = el('section', 'card graph-main');
    mainCard.appendChild(buildToolbar(session));
    mainCard.appendChild(buildCanvas(session, topic, staleSet));
    split.appendChild(mainCard);

    const rail = el('aside', 'graph-rail');
    rail.appendChild(buildNodeDetail(session, topic, staleSet));
    rail.appendChild(buildCalibration(session, topic));
    split.appendChild(rail);
    page.appendChild(split);

    root.textContent = '';
    root.appendChild(page);

    applySearch();
    syncSearchUi();

    if (refocusSearch) {
      refocusSearch = false;
      if (searchInput) {
        searchInput.focus({ preventScroll: true });
        try {
          searchInput.select();
        } catch (err) {
          /* 忽略 */
        }
      }
    }

    if (focusNodeId) {
      const targetId = focusNodeId;
      focusNodeId = null;
      const groups = svgEl ? svgEl.querySelectorAll('.gnode') : [];
      for (let i = 0; i < groups.length; i += 1) {
        if (groups[i].getAttribute('data-node-id') === targetId) {
          groups[i].focus({ preventScroll: true });
          break;
        }
      }
    }

    if (!view.ready) {
      rafId = window.requestAnimationFrame(() => {
        if (mounted && svgEl) fitView();
      });
    }
  }

  function onResize() {
    if (mounted && svgEl && view.ready) fitView();
  }

  window.addEventListener('resize', onResize);

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
    window.removeEventListener('resize', onResize);
    if (rafId) window.cancelAnimationFrame(rafId);
    if (typeof unsubscribe === 'function') unsubscribe();
    layout = null;
    svgEl = null;
    viewportG = null;
    zoomLabel = null;
    searchInput = null;
    searchClear = null;
    searchMeta = null;
    root.textContent = '';
  };
}
