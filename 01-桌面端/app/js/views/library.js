/* library.js · 资料库
 * 合并三个教学场景的内置资料与教师添加的资料；
 * 支持搜索、类型筛选、文本粘贴与 .txt/.md/.json 文件读取。
 */

import { state, actions, persist } from '../core/store.js';
import { h, icon, fmtDate } from '../core/ui.js';
import { toast, confirmDialog, openDialog } from '../core/feedback.js';
import { loadScenarios } from '../core/generate.js';

const TYPES = ['全部', '教材', '课标', '解读', '校本', '外部'];
const ADD_TYPES = ['教材', '课标', '解读', '校本', '外部'];
const TYPE_BADGE = {
  教材: 'badge-accent',
  课标: 'badge-success',
  解读: 'badge-info',
  校本: 'badge-warning',
  外部: 'badge-neutral'
};
const MAX_TEXT = 200 * 1024;

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

function short(text, max) {
  const chars = Array.from(String(text || ''));
  const limit = max || 120;
  return chars.length > limit ? `${chars.slice(0, limit).join('')}…` : chars.join('');
}

function percent(value) {
  return `${Math.round((Number(value) || 0) * 100)}%`;
}

function userSources() {
  return Array.isArray(state.library) ? state.library.slice() : [];
}

function newId() {
  return `lib-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function mount(root) {
  let mounted = true;
  let scenarios = [];
  let loading = true;
  let query = '';
  let typeFilter = '全部';
  let listHost = null;

  function scenarioLabelOf(id) {
    if (!id || id === 'all') return '全部场景';
    const scenario = scenarios.find((item) => item.id === id);
    if (!scenario) return '未关联场景';
    return [scenario.stage, scenario.subject, scenario.title].filter(Boolean).join(' · ');
  }

  function allItems() {
    const items = [];
    scenarios.forEach((scenario) => {
      (scenario.sources || []).forEach((source) => {
        items.push({
          id: source.id,
          type: source.type || '资料',
          title: source.title || '未命名资料',
          locator: source.locator || '',
          excerpt: source.excerpt || '',
          confidence: source.confidence,
          scenarioId: scenario.id,
          scenarioLabel: scenarioLabelOf(scenario.id),
          user: false
        });
      });
    });
    userSources().forEach((source) => {
      items.push({
        id: source.id,
        type: source.type || '外部',
        title: source.title || '我的资料',
        locator: source.locator || '资料库 · 我的资料',
        excerpt: source.excerpt || '',
        confidence: source.confidence,
        scenarioId: source.scenarioId || 'all',
        scenarioLabel: scenarioLabelOf(source.scenarioId),
        addedAt: source.addedAt,
        user: true
      });
    });
    // 教师自己添加的资料排在前面，便于核对与删除
    return items.sort((a, b) => (b.user ? 1 : 0) - (a.user ? 1 : 0));
  }

  function matches(item) {
    if (typeFilter !== '全部' && item.type !== typeFilter) return false;
    if (!query) return true;
    const hay = [item.title, item.locator, item.excerpt, item.scenarioLabel, item.type]
      .join(' ')
      .toLowerCase();
    return hay.indexOf(query.toLowerCase()) !== -1;
  }

  function addSource(source) {
    if (!source || !source.title || !source.excerpt) return false;
    if (actions && typeof actions.addLibrarySource === 'function') {
      actions.addLibrarySource(source);
      return true;
    }
    if (!Array.isArray(state.library)) state.library = [];
    state.library.unshift(source);
    try {
      persist();
    } catch (err) {
      /* 内存中仍保留 */
    }
    return true;
  }

  function deleteSource(id) {
    if (actions && typeof actions.deleteLibrarySource === 'function') {
      actions.deleteLibrarySource(id);
      return true;
    }
    if (!Array.isArray(state.library)) return false;
    const index = state.library.findIndex((item) => item.id === id);
    if (index < 0) return false;
    state.library.splice(index, 1);
    try {
      persist();
    } catch (err) {
      /* 忽略 */
    }
    return true;
  }

  async function removeSource(item) {
    const ok = await confirmDialog({
      title: '删除这条资料？',
      body: `将删除「${item.title}」。已保存方案中的引用不会被改写，但之后生成的新方案不再使用它。`,
      okText: '删除',
      danger: true
    });
    if (!ok || !mounted) return;
    deleteSource(item.id);
    render();
    toast('已删除资料', 'success');
  }

  /* ---------- 添加资料 ---------- */

  function openAddDialog() {
    const body = el('div', 'lib-form');

    const titleField = el('div', 'field');
    titleField.appendChild(el('label', 'label', '资料标题'));
    const titleInput = h('input', {
      className: 'input',
      type: 'text',
      placeholder: '例如：校本学情卡 · 牛顿第二定律前测'
    });
    titleInput.setAttribute('aria-label', '资料标题');
    titleField.appendChild(titleInput);
    body.appendChild(titleField);

    const row = el('div', 'lib-form-row');

    const typeField = el('div', 'field');
    typeField.appendChild(el('label', 'label', '资料类型'));
    const typeSelect = el('select', 'select');
    typeSelect.setAttribute('aria-label', '资料类型');
    ADD_TYPES.forEach((type) => {
      const option = document.createElement('option');
      option.value = type;
      option.textContent = type;
      typeSelect.appendChild(option);
    });
    typeField.appendChild(typeSelect);
    row.appendChild(typeField);

    const scenarioField = el('div', 'field');
    scenarioField.appendChild(el('label', 'label', '关联场景'));
    const scenarioSelect = el('select', 'select');
    scenarioSelect.setAttribute('aria-label', '关联教学场景');
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = '全部场景通用';
    scenarioSelect.appendChild(allOption);
    scenarios.forEach((scenario) => {
      const option = document.createElement('option');
      option.value = scenario.id;
      option.textContent = [scenario.stage, scenario.subject, scenario.title].filter(Boolean).join(' · ');
      scenarioSelect.appendChild(option);
    });
    scenarioField.appendChild(scenarioSelect);
    row.appendChild(scenarioField);
    body.appendChild(row);

    const locatorField = el('div', 'field');
    locatorField.appendChild(el('label', 'label', '位置说明（可选）'));
    const locatorInput = h('input', {
      className: 'input',
      type: 'text',
      placeholder: '例如：备课组共享 · 第 2 页'
    });
    locatorInput.setAttribute('aria-label', '资料位置说明');
    locatorField.appendChild(locatorInput);
    body.appendChild(locatorField);

    const contentField = el('div', 'field');
    contentField.appendChild(el('label', 'label', '资料正文'));
    const textarea = h('textarea', {
      className: 'textarea lib-textarea',
      rows: '7',
      placeholder: '粘贴资料正文。生成方案时会从匹配场景的资料中检索并引用原句。'
    });
    textarea.setAttribute('aria-label', '资料正文');
    contentField.appendChild(textarea);
    body.appendChild(contentField);

    const fileRow = el('div', 'lib-file-row');
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.txt,.md,.markdown,.json,.text,text/plain,application/json';
    fileInput.className = 'sr-only';
    fileInput.tabIndex = -1;
    fileInput.setAttribute('aria-hidden', 'true');
    const fileHint = el('span', 'hint', '支持 .txt / .md / .json；PDF 与 Word 暂不支持，请先转为文本。');
    fileRow.appendChild(fileInput);
    fileRow.appendChild(actionBtn('secondary', '选择文本文件', 'upload', () => fileInput.click(), {
      size: 'sm',
      title: '从本机读取 .txt / .md / .json 文件'
    }));
    fileRow.appendChild(fileHint);
    body.appendChild(fileRow);

    fileInput.addEventListener('change', async () => {
      const file = fileInput.files && fileInput.files[0];
      fileInput.value = '';
      if (!file) return;
      const name = String(file.name || '');
      const ext = name.indexOf('.') >= 0 ? name.slice(name.lastIndexOf('.') + 1).toLowerCase() : '';
      if (['pdf', 'doc', 'docx', 'ppt', 'pptx'].indexOf(ext) !== -1) {
        toast('PDF / Word 暂不支持，请先转为 .txt 或 .md 文本', 'warning', 3600);
        return;
      }
      if (['txt', 'md', 'markdown', 'json', 'text'].indexOf(ext) === -1) {
        toast('仅支持 .txt / .md / .json 文本文件', 'warning');
        return;
      }
      try {
        let text = await file.text();
        if (text.length > MAX_TEXT) {
          text = text.slice(0, MAX_TEXT);
          toast('文件较大，已截取前 200KB', 'warning');
        }
        if (ext === 'json') {
          try {
            const parsed = JSON.parse(text);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
              if (!titleInput.value.trim() && parsed.title) titleInput.value = String(parsed.title);
              text = String(parsed.content || parsed.text || parsed.excerpt || text);
            }
          } catch (err) {
            /* JSON 解析失败时按纯文本处理 */
          }
        }
        textarea.value = text.trim();
        if (!titleInput.value.trim()) {
          titleInput.value = name.replace(/\.[^.]+$/, '');
        }
        fileHint.textContent = `已读取：${name}`;
      } catch (err) {
        toast('文件读取失败，请重试', 'error');
      }
    });

    const errorNode = el('p', 'lib-form-error');
    errorNode.setAttribute('role', 'alert');
    body.appendChild(errorNode);

    openDialog({
      title: '添加资料',
      className: 'lib-dialog',
      body,
      actions: [
        { label: '取消', variant: 'secondary' },
        {
          label: '添加',
          variant: 'primary',
          onClick: () => {
            const title = titleInput.value.trim();
            const excerpt = textarea.value.trim();
            if (!title) {
              errorNode.textContent = '请填写资料标题。';
              titleInput.focus();
              return false;
            }
            if (!excerpt) {
              errorNode.textContent = '请粘贴资料正文或选择文本文件。';
              textarea.focus();
              return false;
            }
            const source = {
              id: newId(),
              type: typeSelect.value,
              title,
              locator: locatorInput.value.trim() || '资料库 · 我的资料',
              excerpt: excerpt.slice(0, 4000),
              confidence: 0.6,
              scenarioId: scenarioSelect.value,
              addedAt: new Date().toISOString()
            };
            if (!addSource(source)) {
              errorNode.textContent = '资料保存失败，请重试。';
              return false;
            }
            toast('已添加资料，生成方案时会参与检索', 'success');
            setTimeout(() => {
              if (mounted) render();
            }, 30);
            return true;
          }
        }
      ]
    });
    setTimeout(() => titleInput.focus(), 40);
  }

  /* ---------- 渲染 ---------- */

  function buildHeader() {
    const head = el('header', 'v-head');
    const main = el('div', 'v-head-main');
    main.appendChild(el('h1', 'v-title', '资料库'));
    main.appendChild(el('p', 'v-sub', '教材、课标、解读、校本与外部资料的统一入口；与场景匹配的补充资料会参与方案生成。'));
    head.appendChild(main);
    const actionsBox = el('div', 'v-head-actions');
    actionsBox.appendChild(actionBtn('primary', '添加资料', 'plus', openAddDialog, {
      title: '添加文本资料或读取 .txt / .md / .json 文件'
    }));
    head.appendChild(actionsBox);
    return head;
  }

  function buildStats() {
    const items = allItems();
    const builtin = items.filter((item) => !item.user).length;
    const mine = items.filter((item) => item.user).length;
    const wrap = el('div', 'lib-stats');
    [
      { label: '内置资料', value: builtin, hint: `${scenarios.length} 个教学场景` },
      { label: '我的资料', value: mine, hint: mine ? '参与匹配场景的检索' : '可添加文本或文件' }
    ].forEach((item) => {
      const box = el('div', 'card lib-stat');
      box.appendChild(el('span', 'lib-stat-label', item.label));
      box.appendChild(el('strong', 'lib-stat-value', String(item.value)));
      box.appendChild(el('span', 'lib-stat-hint', item.hint));
      wrap.appendChild(box);
    });
    return wrap;
  }

  function buildToolbar() {
    const bar = el('div', 'card page-toolbar');
    const field = el('div', 'search-field');
    field.appendChild(icon('search', 16));
    const input = h('input', {
      className: 'input search-input',
      type: 'search',
      placeholder: '搜索标题、位置、正文或场景'
    });
    input.value = query;
    input.setAttribute('aria-label', '搜索资料');
    input.addEventListener('input', () => {
      query = input.value.trim();
      renderList();
    });
    field.appendChild(input);
    bar.appendChild(field);

    const seg = el('div', 'segmented lib-filter');
    seg.setAttribute('role', 'group');
    seg.setAttribute('aria-label', '按资料类型筛选');
    TYPES.forEach((type) => {
      const btn = el('button', '', type);
      btn.type = 'button';
      btn.setAttribute('aria-pressed', typeFilter === type ? 'true' : 'false');
      btn.addEventListener('click', () => {
        if (typeFilter === type) return;
        typeFilter = type;
        seg.querySelectorAll('button').forEach((other) => other.setAttribute('aria-pressed', 'false'));
        btn.setAttribute('aria-pressed', 'true');
        renderList();
      });
      seg.appendChild(btn);
    });
    bar.appendChild(seg);
    return bar;
  }

  function buildRow(item) {
    const row = el('div', 'lib-row');
    const main = el('div', 'lib-main');

    const titleRow = el('div', 'lib-title-row');
    titleRow.appendChild(el('span', `badge ${TYPE_BADGE[item.type] || 'badge-neutral'}`, item.type));
    if (item.user) titleRow.appendChild(el('span', 'badge badge-accent', '我的资料'));
    titleRow.appendChild(el('h3', 'lib-title', item.title));
    titleRow.appendChild(el('span', 'lib-scene', item.scenarioLabel));
    main.appendChild(titleRow);

    main.appendChild(el('p', 'lib-loc', item.locator || '未标注位置'));
    if (item.excerpt) main.appendChild(el('p', 'lib-excerpt', short(item.excerpt, 160)));

    const foot = el('div', 'lib-foot');
    foot.appendChild(el('span', '', `可信度 ${percent(item.confidence)}`));
    if (item.user) {
      foot.appendChild(el('span', '', '添加于 ' + fmtDate(item.addedAt)));
    } else {
      foot.appendChild(el('span', '', '内置资料 · 来自场景知识库'));
    }
    main.appendChild(foot);
    row.appendChild(main);

    if (item.user) {
      const actionsBox = el('div', 'lib-actions');
      actionsBox.appendChild(actionBtn('ghost', '删除', 'trash', () => removeSource(item), {
        size: 'sm',
        title: '删除这条我的资料'
      }));
      row.appendChild(actionsBox);
    }
    return row;
  }

  function renderList() {
    if (!listHost) return;
    const items = allItems().filter(matches);
    listHost.replaceChildren();
    if (!items.length) {
      const card = el('div', 'card');
      const empty = el('div', 'empty');
      empty.appendChild(el('span', 'empty-icon')).appendChild(icon('book-open', 24));
      empty.appendChild(el('h3', '', query || typeFilter !== '全部' ? '没有匹配的资料' : '资料库还是空的'));
      empty.appendChild(el('p', '', query || typeFilter !== '全部'
        ? '换一个关键词或切换类型筛选，也可以添加一条自己的资料。'
        : '添加教材摘录、校本材料或备课笔记，生成方案时会按场景检索。'));
      empty.appendChild(actionBtn('secondary', '添加资料', 'plus', openAddDialog, {
        size: 'sm',
        title: '添加文本资料'
      }));
      card.appendChild(empty);
      listHost.appendChild(card);
      return;
    }
    const card = el('div', 'card lib-list');
    items.forEach((item) => card.appendChild(buildRow(item)));
    listHost.appendChild(card);
  }

  function render() {
    if (!mounted) return;
    const page = el('div', 'v-page library-page');
    page.appendChild(buildHeader());
    if (loading) {
      page.appendChild(el('div', 'tw-loading skeleton sk-block'));
      root.textContent = '';
      root.appendChild(page);
      return;
    }
    page.appendChild(buildStats());
    page.appendChild(buildToolbar());
    listHost = el('div', 'lib-host');
    page.appendChild(listHost);
    root.textContent = '';
    root.appendChild(page);
    renderList();
  }

  (async function init() {
    try {
      scenarios = await loadScenarios();
    } catch (err) {
      scenarios = [];
    }
    loading = false;
    if (mounted) render();
  })();

  return function cleanup() {
    mounted = false;
    root.textContent = '';
  };
}
