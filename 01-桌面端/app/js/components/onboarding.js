/* 智析 AI · 首次引导（全屏三步：身份 → 学段学科教材 → 模型连接）
 * 首次启动时由 main.js 在 router.start() 之前挂载；设置页可重新运行。
 */

import { state, actions } from '../core/store.js';
import { h, icon } from '../core/ui.js';
import { llmRequest } from '../core/bridge.js';

const STAGES = ['小学', '初中', '高中', '大学'];
const SUBJECTS = ['语文', '数学', '英语', '物理', '化学', '生物', '政治', '历史', '地理', '科学', '信息技术', '计算机', '专业课'];
const TEXTBOOKS = ['人教版', '北师大版', '苏教版', '教科版', '外研版', '沪科版', '同济版', '马文蔚版', '自编讲义', '其他'];

const PROVIDERS = [
  { id: 'openai', label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  { id: 'deepseek', label: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  { id: 'zhipu', label: '智谱', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash' },
  { id: 'qwen', label: '通义', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
  { id: 'custom', label: '自定义', baseUrl: '', model: '' }
];

let overlay = null;
let cleanupFns = [];

function clearChildren(node) {
  if (node) node.replaceChildren();
}

function labelText(text) {
  return h('span', { className: 'label' }, text);
}

function field(label, control, hint) {
  return h(
    'div',
    { className: 'field' },
    labelText(label),
    control,
    hint ? h('p', { className: 'hint' }, hint) : null
  );
}

function select(options, value, placeholder, onchange, label) {
  const el = h('select', { className: 'select', 'aria-label': label || '选择' });
  const empty = document.createElement('option');
  empty.value = '';
  empty.textContent = placeholder || '请选择';
  el.appendChild(empty);
  const list = options.slice();
  if (value && list.indexOf(value) < 0) list.push(value);
  list.forEach((item) => {
    const option = document.createElement('option');
    option.value = item;
    option.textContent = item;
    el.appendChild(option);
  });
  el.value = value || '';
  el.addEventListener('change', () => onchange(el.value));
  return el;
}

function textInput(value, placeholder, oninput, type) {
  const el = h('input', {
    className: 'input',
    type: type || 'text',
    placeholder: placeholder || '',
    autocomplete: 'off',
    spellcheck: 'false'
  });
  el.value = value || '';
  el.addEventListener('input', () => oninput(el.value));
  return el;
}

function primaryButton(label, onClick, disabled) {
  const btn = h(
    'button',
    { className: 'btn btn-primary', type: 'button', onClick },
    h('span', { className: 'btn-label' }, label),
    icon('arrow-right', 16)
  );
  if (disabled) btn.disabled = true;
  return btn;
}

function secondaryButton(label, onClick) {
  return h(
    'button',
    { className: 'btn btn-secondary', type: 'button', onClick },
    h('span', { className: 'btn-label' }, label)
  );
}

function stepPill(index, title, current) {
  const active = index === current;
  const done = index < current;
  return h(
    'div',
    {
      style: 'display:flex;align-items:center;gap:8px;padding:6px 12px;border-radius:999px;'
        + 'background:' + (active ? 'var(--accent-soft)' : 'transparent') + ';'
        + 'border:1px solid ' + (active ? 'var(--accent-border)' : 'transparent') + ';'
        + 'color:' + (active ? 'var(--accent)' : (done ? 'var(--success)' : 'var(--text-3)')) + ';'
        + 'font-size:12px;font-weight:600;'
    },
    h(
      'span',
      {
        style: 'width:18px;height:18px;border-radius:50%;display:inline-flex;align-items:center;'
          + 'justify-content:center;font-size:11px;border:1px solid currentColor;'
      },
      done ? icon('check', 11) : String(index)
    ),
    h('span', null, title)
  );
}

function closeOverlay() {
  cleanupFns.forEach((fn) => {
    try {
      fn();
    } catch (err) {
      /* 忽略 */
    }
  });
  cleanupFns = [];
  if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
  overlay = null;
  document.documentElement.removeAttribute('data-onboarding');
}

export function startOnboarding(options) {
  const opts = options || {};
  if (overlay && overlay.parentNode) {
    overlay.focus();
    return;
  }

  const currentLlm = (state.settings && state.settings.llm) || {};
  const draft = {
    role: '',
    stage: (state.settings && state.settings.stage) || '',
    subject: (state.settings && state.settings.subject) || '',
    textbook: (state.settings && state.settings.textbook) || '',
    className: (state.settings && state.settings.className) || '',
    provider: currentLlm.provider || 'openai',
    baseUrl: currentLlm.baseUrl || '',
    apiKey: currentLlm.apiKey || '',
    model: currentLlm.model || '',
    temperature: Number.isFinite(Number(currentLlm.temperature)) ? Number(currentLlm.temperature) : 0.4
  };
  let step = 1;
  let showKey = false;
  let testState = '';
  let errorText = '';

  overlay = h('div', {
    role: 'dialog',
    'aria-modal': 'true',
    'aria-label': '首次引导',
    tabindex: '-1',
    style: 'position:fixed;inset:0;z-index:12000;background:var(--bg);overflow:auto;'
      + 'display:flex;align-items:flex-start;justify-content:center;padding:28px 24px;'
  });
  document.documentElement.setAttribute('data-onboarding', 'true');

  function rerender() {
    clearChildren(overlay);
    const canClose = !!(opts.force && state.settings.onboarded);

    const brand = h(
      'div',
      { style: 'display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:16px;' },
      h(
        'span',
        {
          style: 'width:44px;height:44px;border-radius:14px;background:var(--accent-soft);'
            + 'color:var(--accent);display:flex;align-items:center;justify-content:center;'
            + 'border:1px solid var(--accent-border);flex-shrink:0;'
        },
        icon('sparkles', 22)
      ),
      h(
        'div',
        { style: 'display:flex;flex-direction:column;gap:2px;' },
        h('span', { style: 'font-size:20px;font-weight:700;letter-spacing:.2px;' }, '智析 AI'),
        h('span', { style: 'font-size:12px;color:var(--text-2);' }, '教师教学方案工作台 · 学习诊断工作台')
      )
    );

    const steps = h(
      'div',
      { style: 'display:flex;align-items:center;justify-content:center;gap:4px;flex-wrap:wrap;margin-bottom:14px;' },
      stepPill(1, '身份', step),
      h('span', { style: 'color:var(--text-3);font-size:12px;' }, '→'),
      stepPill(2, '学段学科', step),
      h('span', { style: 'color:var(--text-3);font-size:12px;' }, '→'),
      stepPill(3, '模型连接', step)
    );

    const card = h('section', { className: 'card', style: 'padding:22px 24px;' });
    const head = h(
      'div',
      { style: 'display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px;' },
      h(
        'div',
        null,
        h('h1', { style: 'font-size:18px;font-weight:650;line-height:1.4;' }, stepTitle(step)),
        h('p', { style: 'font-size:13px;color:var(--text-2);line-height:1.6;margin-top:4px;' }, stepSubtitle(step))
      ),
      canClose
        ? h(
            'button',
            {
              className: 'icon-btn',
              type: 'button',
              title: '关闭引导',
              'aria-label': '关闭引导',
              onClick: () => closeOverlay()
            },
            icon('x', 16)
          )
        : null
    );
    card.appendChild(head);
    card.appendChild(h('div', { style: 'height:1px;background:var(--border);margin:0 0 16px;' }));
    card.appendChild(buildStepBody());
    card.appendChild(buildFooter());

    const wrap = h(
      'div',
      { style: 'width:100%;max-width:680px;margin:auto;display:flex;flex-direction:column;' },
      brand,
      steps,
      card,
      h(
        'p',
        {
          style: 'margin-top:12px;text-align:center;font-size:12px;line-height:1.6;color:var(--text-3);'
        },
        '完成前不会进入工作台。所有设置只保存在本机，可随时在「设置」中修改。'
      )
    );
    overlay.appendChild(wrap);
  }

  function stepTitle(value) {
    if (value === 1) return '你是如何使用智析 AI 的？';
    if (value === 2) return '填写你的学段、学科与教材';
    return '连接你的大模型（可跳过）';
  }

  function stepSubtitle(value) {
    if (value === 1) return '身份决定工作台、侧栏与默认页面，第一版必须选择，不能跳过。';
    if (value === 2) return draft.role === 'teacher'
      ? '学段与教材版本决定课标、术语和难度；学科可直接填写任意名称，没有内置场景时会生成通用结构模板。'
      : '学段用于匹配知识库难度；学科可直接填写任意名称，不必从列表中选择。';
    return '填写 API Key 后调用你自己的模型；不填写则使用本地知识引擎生成可运行方案。';
  }

  function buildStepBody() {
    if (step === 1) return buildRoleStep();
    if (step === 2) return buildProfileStep();
    return buildLlmStep();
  }

  function buildRoleStep() {
    const wrap = h('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:12px;' });
    const items = [
      { id: 'teacher', title: '教师', desc: '生成教学方案、管理资料与班级学情', iconName: 'users' },
      { id: 'student', title: '学生', desc: '从一个概念问题开始，诊断前置知识', iconName: 'book-open' }
    ];
    items.forEach((item) => {
      const selected = draft.role === item.id;
      const btn = h(
        'button',
        {
          type: 'button',
          'aria-pressed': selected ? 'true' : 'false',
          'aria-label': item.title,
          style: 'text-align:left;padding:16px;border-radius:12px;border:1.5px solid '
            + (selected ? 'var(--accent)' : 'var(--border-strong)') + ';background:'
            + (selected ? 'var(--accent-soft)' : 'var(--surface)') + ';display:flex;flex-direction:column;'
            + 'gap:8px;min-height:132px;cursor:pointer;',
          onClick: () => {
            draft.role = item.id;
            errorText = '';
            rerender();
          }
        },
        h(
          'span',
          {
            style: 'display:flex;align-items:center;justify-content:space-between;width:100%;'
              + 'color:' + (selected ? 'var(--accent)' : 'var(--text-2)') + ';'
          },
          icon(item.iconName, 22),
          selected ? icon('check-circle', 18) : null
        ),
        h('span', { style: 'font-size:15px;font-weight:650;color:var(--text);' }, item.title),
        h('span', { style: 'font-size:12px;line-height:1.6;color:var(--text-2);' }, item.desc)
      );
      wrap.appendChild(btn);
    });
    return wrap;
  }

  function buildProfileStep() {
    const isTeacher = draft.role === 'teacher';
    const wrap = h('div', { style: 'display:flex;flex-direction:column;gap:14px;' });
    wrap.appendChild(
      field(
        '学段（必填）',
        select(STAGES, draft.stage, '请选择学段', (value) => {
          draft.stage = value;
          errorText = '';
          rerender();
        }, '选择学段')
      )
    );
    const subjectSuggestions = Array.from(new Set(
      (isTeacher && draft.stage === '大学'
        ? ['高等数学', '大学物理', '计算机科学', '医学', '经济学', '管理学', '外语', '专业课']
        : SUBJECTS
      ).concat(SUBJECTS)
    ));
    const listId = 'onb-subject-list';
    const subjectInput = textInput(
      draft.subject,
      isTeacher && draft.stage === '大学'
        ? '例如：高等数学、医学统计学、专业英语'
        : '例如：数学、物理、语文、科学',
      (value) => {
        draft.subject = value;
        errorText = '';
      }
    );
    subjectInput.setAttribute('list', listId);
    const datalist = h(
      'datalist',
      { id: listId },
      ...subjectSuggestions.map((item) => h('option', { value: item }))
    );
    wrap.appendChild(
      field(
        '学科（必填，可自定义）',
        h(
          'div',
          { style: 'display:flex;flex-direction:column;gap:6px;' },
          subjectInput,
          datalist
        ),
        '可直接填写任教学科，也可以从建议中选择；没有内置场景时会生成对应学段的通用结构模板。'
      )
    );
    if (isTeacher) {
      wrap.appendChild(
        field(
          '教材版本（必填）',
          select(TEXTBOOKS, draft.textbook, '请选择教材版本', (value) => {
            draft.textbook = value;
            errorText = '';
            rerender();
          }, '选择教材版本'),
          '方案中的教材页码与条目会按此版本引用。'
        )
      );
      wrap.appendChild(
        field(
          '任课班级（可选）',
          textInput(draft.className, '例如：高二（3）班', (value) => {
            draft.className = value;
          }),
          '仅保存在本机，用于方案头部与班级学情卡片。'
        )
      );
    }
    return wrap;
  }

  function buildLlmStep() {
    const wrap = h('div', { style: 'display:flex;flex-direction:column;gap:14px;' });
    const providerRow = h(
      'div',
      { style: 'display:grid;grid-template-columns:1fr 1fr;gap:12px;' },
      field(
        '服务商',
        select(
          PROVIDERS.map((item) => item.label),
          (PROVIDERS.find((item) => item.id === draft.provider) || PROVIDERS[0]).label,
          '请选择服务商',
          (value) => {
            const preset = PROVIDERS.find((item) => item.label === value);
            if (!preset) return;
            draft.provider = preset.id;
            if (preset.baseUrl) draft.baseUrl = preset.baseUrl;
            if (preset.model) draft.model = preset.model;
            errorText = '';
            rerender();
          },
          '选择服务商'
        )
      ),
      field('模型名', textInput(draft.model, '例如 gpt-4o-mini', (value) => {
        draft.model = value;
      }))
    );
    wrap.appendChild(providerRow);
    wrap.appendChild(
      field(
        'Base URL',
        textInput(draft.baseUrl, 'https://api.example.com/v1', (value) => {
          draft.baseUrl = value;
        }),
        '兼容 OpenAI Chat Completions；可填写到 /v1。'
      )
    );

    const keyInput = textInput(draft.apiKey, 'sk-...（可跳过）', (value) => {
      draft.apiKey = value;
    }, showKey ? 'text' : 'password');
    const toggle = secondaryButton(showKey ? '隐藏' : '显示', () => {
      showKey = !showKey;
      rerender();
    });
    const testBtn = secondaryButton('测试连接', async () => {
      if (!draft.apiKey) {
        testState = '请先填写 API Key；不填写时使用本地知识引擎。';
        rerender();
        return;
      }
      if (!draft.baseUrl || !draft.model) {
        testState = '请填写 Base URL 与模型名。';
        rerender();
        return;
      }
      testState = 'testing';
      rerender();
      let result = { ok: false, error: '请求失败' };
      try {
        result = await llmRequest({
          baseUrl: draft.baseUrl,
          apiKey: draft.apiKey,
          model: draft.model,
          messages: [{ role: 'user', content: '只回复 OK' }],
          temperature: 0,
          maxTokens: 16
        });
      } catch (err) {
        result = { ok: false, error: '请求失败，请检查配置' };
      }
      testState = result && result.ok
        ? 'ok'
        : '连接失败：' + ((result && result.error) || '请检查 Base URL、Key 与模型名');
      if (overlay) rerender();
    });
    wrap.appendChild(
      field(
        'API Key（可跳过）',
        h('div', { style: 'display:flex;gap:8px;align-items:center;' },
          h('div', { style: 'flex:1;min-width:0;' }, keyInput),
          toggle,
          testBtn
        ),
        '仅保存在本机状态文件；测试连接时由桌面壳代理请求，不写入日志。'
      )
    );
    if (testState) {
      const testing = testState === 'testing';
      wrap.appendChild(
        h(
          'p',
          {
            style: 'font-size:12px;line-height:1.6;color:'
              + (testing ? 'var(--text-2)' : (testState === 'ok' ? 'var(--success)' : 'var(--danger)')) + ';'
          },
          testing ? '正在测试连接…' : (testState === 'ok' ? '连接成功 · ' + draft.model : testState)
        )
      );
    }
    wrap.appendChild(
      h(
        'div',
        {
          style: 'display:flex;gap:8px;align-items:flex-start;padding:10px 12px;border-radius:10px;'
            + 'background:var(--surface-subtle);border:1px solid var(--border);font-size:12px;'
            + 'line-height:1.6;color:var(--text-2);'
        },
        icon('lock', 15),
        h('span', null, '不配置 API Key 也能完成引导；生成方案时使用本地知识引擎，界面不会出现「演示/模拟」。')
      )
    );
    return wrap;
  }

  function buildFooter() {
    const foot = h(
      'div',
      {
        style: 'display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:18px;'
          + 'padding-top:14px;border-top:1px solid var(--border);'
      }
    );
    const left = h('div', { style: 'display:flex;align-items:center;gap:8px;' });
    if (step > 1) {
      left.appendChild(
        secondaryButton('上一步', () => {
          step -= 1;
          errorText = '';
          testState = '';
          rerender();
        })
      );
    }
    if (errorText) {
      left.appendChild(
        h('span', { style: 'font-size:12px;color:var(--danger);line-height:1.5;' }, errorText)
      );
    }
    foot.appendChild(left);

    const right = h('div', { style: 'display:flex;align-items:center;gap:8px;' });
    if (step < 3) {
      right.appendChild(primaryButton(step === 1 ? '下一步' : '下一步', () => goNext()));
    } else {
      right.appendChild(
        secondaryButton('跳过，使用本地知识引擎', () => {
          draft.apiKey = '';
          finish();
        })
      );
      right.appendChild(
        primaryButton('完成设置', () => {
          finish();
        })
      );
    }
    foot.appendChild(right);
    return foot;
  }

  function goNext() {
    if (step === 1) {
      if (draft.role !== 'teacher' && draft.role !== 'student') {
        errorText = '请先选择教师或学生身份。';
        rerender();
        return;
      }
      errorText = '';
      step = 2;
      rerender();
      return;
    }
    if (step === 2) {
      if (!draft.stage || !String(draft.subject || '').trim()) {
        errorText = '请选择学段并填写学科。';
        rerender();
        return;
      }
      if (draft.role === 'teacher' && !draft.textbook) {
        errorText = '教师身份必须选择教材版本。';
        rerender();
        return;
      }
      errorText = '';
      step = 3;
      rerender();
    }
  }

  function finish() {
    const role = draft.role;
    if (role !== 'teacher' && role !== 'student') {
      step = 1;
      errorText = '请先选择教师或学生身份。';
      rerender();
      return;
    }
    if (!draft.stage || !String(draft.subject || '').trim() || (role === 'teacher' && !draft.textbook)) {
      step = 2;
      errorText = '请补齐学段、学科与教材版本（学科可自行填写）。';
      rerender();
      return;
    }

    actions.setRole(role);
    actions.setProfile({
      stage: draft.stage,
      subject: String(draft.subject || '').trim(),
      textbook: role === 'teacher' ? draft.textbook : '',
      className: role === 'teacher' ? draft.className : ''
    });
    actions.setLlm({
      provider: draft.provider,
      baseUrl: draft.baseUrl,
      apiKey: draft.apiKey,
      model: draft.model,
      temperature: draft.temperature
    });
    actions.completeOnboarding();

    const hasShell = !!document.querySelector('.app-shell');
    closeOverlay();

    if (hasShell) {
      import('../core/router.js')
        .then((mod) => {
          if (mod && typeof mod.navigate === 'function') {
            mod.navigate(role === 'teacher' ? 'teacher-workbench' : 'home');
          }
        })
        .catch(() => {});
    } else if (typeof opts.onComplete === 'function') {
      opts.onComplete();
    }
  }

  function onKeydown(event) {
    if (event.key !== 'Escape') return;
    if (opts.force && state.settings.onboarded) {
      event.preventDefault();
      closeOverlay();
    }
  }
  window.addEventListener('keydown', onKeydown);
  cleanupFns.push(() => window.removeEventListener('keydown', onKeydown));

  document.body.appendChild(overlay);
  rerender();
  overlay.focus();
}

export function isOnboardingOpen() {
  return !!(overlay && overlay.parentNode);
}

export function stopOnboarding() {
  closeOverlay();
}
