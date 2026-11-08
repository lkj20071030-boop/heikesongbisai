/* 智析 AI · 应用入口
   启动顺序：加载主题数据（可缺失）→ 恢复持久化状态 → 应用主题 → 启动路由 */

import { hydrate, initData, state, subscribe } from './core/store.js';
import { start } from './core/router.js';
import { h, icon } from './core/ui.js';

function applyAppearance() {
  const root = document.documentElement;
  root.dataset.theme = state.settings.theme === 'dark' ? 'dark' : 'light';
  root.dataset.reduceMotion = state.settings.reduceMotion ? 'true' : 'false';
}

function renderFatal(error) {
  const app = document.getElementById('app');
  if (!app) return;
  const message = error && error.message ? error.message : String(error || '未知错误');
  app.replaceChildren(
    h(
      'div',
      { className: 'fatal-screen' },
      h(
        'div',
        { className: 'card card-pad fatal-card' },
        h('span', { className: 'empty-icon' }, icon('alert-triangle', 24)),
        h('h1', { className: 'fatal-title' }, '界面启动失败'),
        h('p', { className: 'fatal-text' }, '本地资源加载异常，请刷新重试。你的数据仍保存在本机。'),
        h('p', { className: 'view-missing-path' }, message),
        h(
          'button',
          { className: 'btn btn-primary', type: 'button', onClick: () => window.location.reload() },
          icon('refresh', 16),
          '刷新页面'
        )
      )
    )
  );
}

function isDemoMode() {
  try {
    return new URLSearchParams(window.location.search).get('mode') === 'demo';
  } catch {
    return false;
  }
}

async function startDemo() {
  try {
    const mod = await import('./core/demo.js');
    mod.bootDemo();
  } catch (err) {
    console.error('[main] 演示模式启动失败', err);
  }
}

async function boot() {
  // 内容数据稍后由并行代理提供；缺失时不应阻塞应用启动
  await initData();

  try {
    await hydrate();
  } catch (err) {
    console.warn('[main] 状态恢复失败，使用默认状态', err);
  }

  applyAppearance();
  subscribe((_state, event) => {
    if (event === 'settings') applyAppearance();
  });

  const demo = isDemoMode();

  if (demo) {
    // 演示模式强制学生身份，保证现有 9 幕学习诊断演示不受影响
    state.settings.role = 'student';
    state.settings.onboarded = true;
    state.tabs = [{ id: 'main', title: '工作台', zone: 'home', sessionId: null, params: {} }];
    state.activeTabId = 'main';
    start();
    startDemo();
    return;
  }

  const ready = state.settings.onboarded === true
    && (state.settings.role === 'teacher' || state.settings.role === 'student');

  if (!ready) {
    // 未完成首次引导：不启动 router，只渲染全屏引导，避免闪现错误角色
    try {
      const mod = await import('./components/onboarding.js');
      mod.startOnboarding({ onComplete: () => start() });
    } catch (err) {
      console.error('[main] 首次引导加载失败', err);
      renderFatal(err);
    }
    return;
  }

  start();
}

boot().catch((err) => {
  console.error('[main] 启动失败', err);
  renderFatal(err);
});
