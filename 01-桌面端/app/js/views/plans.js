/* plans.js · 我的方案
 * 列出已保存的教学方案记录，支持搜索、打开、导出当前版本与删除。
 * 版本数据由 core/generate.js 的 activeVersionOf / planVersionCount 读取。
 */

import { state, actions } from '../core/store.js';
import { navigate } from '../core/router.js';
import { h, icon, fmtDate, fmtRelative } from '../core/ui.js';
import { toast, confirmDialog } from '../core/feedback.js';
import { activeVersionOf, planVersionCount, courseInfo } from '../core/generate.js';
import { exportPlanMarkdown } from '../core/export.js';

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
  if (iconName) btn.appendChild(icon(iconName, options.size === 'sm' ? 14 : 16));
  btn.appendChild(el('span', 'btn-label', label));
  if (onClick) btn.addEventListener('click', onClick);
  return btn;
}

function planInfo(record) {
  const data = activeVersionOf(record) || {};
  const versions = planVersionCount(record);
  const title = data.title || record.title || '未命名方案';
  const course = courseInfo(data.course || record.course);
  const meta = [
    data.stage || record.stage,
    data.subject || record.subject,
    data.textbook || record.textbook,
    data.grade || record.grade,
    course.code,
    course.credits ? `${course.credits} 学分` : '',
    course.hours ? `${course.hours} 学时` : ''
  ].filter(Boolean).join(' · ');
  const detail = [
    data.lessonType,
    Number(data.duration) ? `${Number(data.duration)} 分钟` : ''
  ].filter(Boolean).join(' · ');
  const latest = Array.isArray(record.versions) && record.versions.length
    ? record.versions[record.versions.length - 1]
    : null;
  const updatedAt = record.updatedAt
    || (latest && latest.createdAt)
    || data.createdAt
    || record.createdAt
    || '';
  return {
    data,
    versions,
    title,
    meta,
    detail,
    course,
    note: (latest && latest.note) || data.__versionNote || '',
    updatedAt,
    need: data.need || record.need || ''
  };
}

function matches(info, query) {
  if (!query) return true;
  const haystack = [info.title, info.meta, info.detail, info.need, info.note].join(' ').toLowerCase();
  return haystack.indexOf(query.toLowerCase()) !== -1;
}

export function mount(root) {
  let mounted = true;
  let query = '';

  function openPlan(record) {
    actions.setActivePlan(record.id);
    navigate('teacher-workbench');
    toast('已打开方案：' + planInfo(record).title, 'success');
  }

  async function exportPlan(record) {
    const info = planInfo(record);
    if (!info.data || !Array.isArray(info.data.objectives)) {
      toast('该方案没有可导出的版本数据', 'error');
      return;
    }
    const result = await exportPlanMarkdown(info.data);
    if (result && result.ok) {
      toast('已导出' + (result.path ? '：' + result.path : ''), 'success');
    } else {
      toast('导出失败：' + ((result && result.error) || '桌面桥不可用'), 'error');
    }
  }

  async function removePlan(record) {
    const info = planInfo(record);
    const ok = await confirmDialog({
      title: '删除方案？',
      body: `将删除「${info.title}」及其 ${info.versions} 个版本，此操作不可恢复。`,
      okText: '删除',
      danger: true
    });
    if (!ok || !mounted) return;
    actions.deletePlan(record.id);
    render();
    toast('已删除方案', 'success');
  }

  function buildHeader() {
    const head = el('header', 'v-head');
    const main = el('div', 'v-head-main');
    main.appendChild(el('h1', 'v-title', '我的方案'));
    main.appendChild(el('p', 'v-sub', '已保存的教学方案与版本记录；继续修改后保存会追加新版本，旧版本保留。'));
    head.appendChild(main);
    const actionsBox = el('div', 'v-head-actions');
    actionsBox.appendChild(actionBtn('primary', '新建方案', 'plus', () => {
      actions.setActivePlan(null);
      navigate('teacher-workbench', { fresh: true });
    }, { title: '回到教师工作台生成新方案' }));
    head.appendChild(actionsBox);
    return head;
  }

  function buildToolbar(listNode) {
    const bar = el('div', 'card page-toolbar');
    const field = el('div', 'search-field');
    field.appendChild(icon('search', 16));
    const input = h('input', {
      className: 'input search-input',
      type: 'search',
      placeholder: '搜索方案标题、学科、教材或需求'
    });
    input.value = query;
    input.setAttribute('aria-label', '搜索我的方案');
    input.addEventListener('input', () => {
      query = input.value.trim();
      renderList(listNode);
    });
    field.appendChild(input);
    bar.appendChild(field);
    bar.appendChild(el('span', 'spacer'));
    bar.appendChild(el('span', 'badge badge-neutral', `${(state.plans || []).length} 个方案`));
    return bar;
  }

  function buildRow(record) {
    const info = planInfo(record);
    const row = el('div', 'plans-row');

    const main = el('div', 'plans-main');
    const titleRow = el('div', 'plans-title-row');
    titleRow.appendChild(el('h3', 'plans-title', info.title));
    titleRow.appendChild(el('span', 'badge badge-accent', `${info.versions} 版`));
    if (info.course.code) titleRow.appendChild(el('span', 'badge badge-info', info.course.code));
    if (info.course.credits) {
      titleRow.appendChild(el('span', 'badge badge-neutral', `${info.course.credits} 学分`));
    }
    if (info.data.source === 'llm') {
      titleRow.appendChild(el('span', 'badge badge-success', info.data.model || '模型生成'));
    } else {
      titleRow.appendChild(el('span', 'badge badge-neutral', '本地知识引擎'));
    }
    main.appendChild(titleRow);

    const metaParts = [info.meta, info.detail].filter(Boolean);
    if (metaParts.length) main.appendChild(el('p', 'plans-meta', metaParts.join(' · ')));
    if (info.need) main.appendChild(el('p', 'plans-need', info.need));

    const foot = el('div', 'plans-foot');
    foot.appendChild(el('span', '', `更新于 ${fmtDate(info.updatedAt)}`));
    foot.appendChild(el('span', '', fmtRelative(info.updatedAt)));
    if (info.note) foot.appendChild(el('span', 'plans-note', `最近版本：${info.note}`));
    main.appendChild(foot);
    row.appendChild(main);

    const actions = el('div', 'plans-actions');
    actions.appendChild(actionBtn('primary', '继续修改', 'arrow-right', () => openPlan(record), {
      size: 'sm',
      title: '打开该方案，回到教师工作台继续修改'
    }));
    actions.appendChild(actionBtn('secondary', '导出', 'download', () => exportPlan(record), {
      size: 'sm',
      title: '导出当前版本的 Markdown'
    }));
    actions.appendChild(actionBtn('ghost', '删除', 'trash', () => removePlan(record), {
      size: 'sm',
      title: '删除该方案及全部版本'
    }));
    row.appendChild(actions);
    return row;
  }

  function renderList(host) {
    host.replaceChildren();
    const plans = (state.plans || []).slice().sort((a, b) => {
      const left = planInfo(a).updatedAt || '';
      const right = planInfo(b).updatedAt || '';
      return String(right).localeCompare(String(left));
    });
    const filtered = plans.filter((record) => matches(planInfo(record), query));

    if (!plans.length) {
      const card = el('div', 'card');
      const empty = el('div', 'empty');
      empty.appendChild(el('span', 'empty-icon')).appendChild(icon('layers', 24));
      empty.appendChild(el('h3', '', '还没有保存的方案'));
      empty.appendChild(el('p', '', '在教师工作台写下需求并生成方案，点击「保存」后会出现在这里，每次保存都会保留一个版本。'));
      empty.appendChild(actionBtn('primary', '去生成方案', 'sparkles', () => navigate('teacher-workbench')));
      card.appendChild(empty);
      host.appendChild(card);
      return;
    }

    if (!filtered.length) {
      const card = el('div', 'card');
      const empty = el('div', 'empty');
      empty.appendChild(el('span', 'empty-icon')).appendChild(icon('search', 22));
      empty.appendChild(el('h3', '', '没有匹配的方案'));
      empty.appendChild(el('p', '', '换一个关键词试试，或清空搜索查看全部方案。'));
      empty.appendChild(actionBtn('secondary', '清空搜索', 'x', () => {
        query = '';
        render();
      }, { size: 'sm', title: '清空搜索关键词' }));
      card.appendChild(empty);
      host.appendChild(card);
      return;
    }

    const card = el('div', 'card plans-list');
    filtered.forEach((record) => card.appendChild(buildRow(record)));
    host.appendChild(card);
  }

  function render() {
    if (!mounted) return;
    const page = el('div', 'v-page plans-page');
    page.appendChild(buildHeader());
    const listHost = el('div', 'plans-host');
    page.appendChild(buildToolbar(listHost));
    page.appendChild(listHost);
    root.textContent = '';
    root.appendChild(page);
    renderList(listHost);
  }

  render();

  return function cleanup() {
    mounted = false;
    root.textContent = '';
  };
}
