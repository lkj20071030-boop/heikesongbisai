/* 智析 AI · 反馈层：toast / 原生 dialog */

import { h, icon } from './ui.js';

let toastWrap = null;

function ensureToastWrap() {
  if (toastWrap && document.body.contains(toastWrap)) return toastWrap;
  toastWrap = h('div', { className: 'toast-wrap', role: 'status', 'aria-live': 'polite' });
  document.body.appendChild(toastWrap);
  return toastWrap;
}

const TOAST_ICON = {
  info: 'info',
  success: 'check-circle',
  warning: 'alert-triangle',
  error: 'x-circle'
};

export function toast(message, type = 'info', ms = 2600) {
  const wrap = ensureToastWrap();
  const kind = TOAST_ICON[type] ? type : 'info';
  const node = h(
    'div',
    { className: `toast ${kind}`, role: 'status' },
    h('span', { className: 't-icon' }, icon(TOAST_ICON[kind], 16)),
    h('span', { className: 't-text' }, String(message))
  );
  wrap.appendChild(node);
  while (wrap.children.length > 4) wrap.firstElementChild.remove();
  const timer = setTimeout(() => {
    node.remove();
    if (wrap.children.length === 0) {
      wrap.remove();
      toastWrap = null;
    }
  }, Math.max(800, ms));
  node.addEventListener('click', () => {
    clearTimeout(timer);
    node.remove();
  });
  return node;
}

/**
 * 通用对话框。body 可以是字符串或 DOM 节点。
 * actions: [{ label, variant, value, autofocus, onClick }]
 * 返回 dialog 元素；关闭后自动移除。
 */
export function openDialog({ title, body, actions = [], className = '' } = {}) {
  const dialog = h('dialog', { className: `app-dialog ${className}`.trim() });

  let settled = false;
  function closeWith(value) {
    if (settled) return;
    settled = true;
    try {
      dialog.close();
    } catch {
      /* 已关闭 */
    }
    dialog.remove();
    return value;
  }

  dialog.addEventListener('close', () => {
    if (!settled) {
      settled = true;
      dialog.remove();
    }
  });

  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeWith(null);
  });

  const head = h(
    'div',
    { className: 'dialog-head' },
    h('div', { style: { flex: '1', minWidth: '0' } }, h('div', { className: 'dialog-title' }, String(title || '')))
  );
  const closeBtn = h(
    'button',
    {
      className: 'icon-btn',
      type: 'button',
      'aria-label': '关闭对话框',
      title: '关闭（Esc）',
      onClick: () => closeWith(null)
    },
    icon('x', 16)
  );
  head.appendChild(closeBtn);

  const bodyEl = h('div', { className: 'dialog-body' });
  if (body instanceof Node) bodyEl.appendChild(body);
  else if (Array.isArray(body)) bodyEl.append(...body.filter((item) => item instanceof Node));
  else if (body !== undefined && body !== null) bodyEl.appendChild(h('p', null, String(body)));

  const foot = h('div', { className: 'dialog-foot' });
  const actionNodes = actions.length
    ? actions
    : [{ label: '关闭', variant: 'secondary', value: null }];

  const variantClass = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger',
    ghost: 'btn-ghost'
  };

  for (const action of actionNodes) {
    const btn = h(
      'button',
      {
        className: `btn ${variantClass[action.variant] || 'btn-secondary'}`,
        type: 'button',
        onClick: () => {
          if (typeof action.onClick === 'function') {
            const keep = action.onClick({ close: closeWith });
            if (keep === false) return;
          }
          closeWith(action.value === undefined ? null : action.value);
        }
      },
      String(action.label || '确定')
    );
    if (action.autofocus) {
      setTimeout(() => {
        try {
          btn.focus();
        } catch {
          /* 忽略 */
        }
      }, 30);
    }
    foot.appendChild(btn);
  }

  dialog.append(head, bodyEl, foot);
  document.body.appendChild(dialog);

  const actionPrimary = actionNodes.find((a) => a.variant === 'primary');
  if (!actionPrimary) setTimeout(() => closeBtn.focus(), 20);
  try {
    dialog.showModal();
  } catch {
    dialog.setAttribute('open', '');
  }

  return dialog;
}

export function confirmDialog({ title, body, okText = '确认', danger = false } = {}) {
  return new Promise((resolve) => {
    let done = false;
    let result = false;

    const settle = (value) => {
      if (done) return;
      done = true;
      resolve(value);
    };

    const dialog = openDialog({
      title: title || '请确认',
      body: body || '',
      className: 'confirm-dialog',
      actions: [
        {
          label: '取消',
          variant: 'secondary',
          onClick: () => {
            result = false;
          }
        },
        {
          label: okText,
          variant: danger ? 'danger' : 'primary',
          autofocus: true,
          onClick: () => {
            result = true;
          }
        }
      ]
    });

    dialog.addEventListener('close', () => settle(result));
  });
}
