/* 智析 AI · 诊断事件流模拟（本地，无真实模型）
   与开发说明第 4 节事件时序一致：parsing → layer0/1/2 → confirming 暂停 → quizzing */

const SPEED_FACTOR = { slow: 1.7, normal: 1, fast: 0.45, instant: 0 };

function buildLayerMap(topic) {
  const map = new Map();
  const nodes = Array.isArray(topic && topic.nodes) ? topic.nodes : [];
  const edges = Array.isArray(topic && topic.edges) ? topic.edges : [];
  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  for (const node of nodes) {
    const layer = Number(node.layer) || 0;
    if (!map.has(layer)) map.set(layer, { nodes: [], edges: [] });
    map.get(layer).nodes.push(node.id);
  }
  for (const edge of edges) {
    const toNode = nodeById.get(edge.to);
    if (!toNode) continue;
    const layer = Number(toNode.layer) || 0;
    if (!map.has(layer)) map.set(layer, { nodes: [], edges: [] });
    map.get(layer).edges.push(edge.id);
  }
  return map;
}

/**
 * @param {object} options
 * @param {object} options.session 当前会话
 * @param {object} options.topic 当前主题
 * @param {'slow'|'normal'|'fast'|'instant'} [options.speed]
 * @param {object} [options.handlers] onPhase/onLayer/onJudgement/onQuiz/onConclusion/onDone
 * @param {object} [options.resume] 恢复点 { phase, layer }，用于离开页面后继续
 * @returns {{cancel:Function, skip:Function, resume:Function, conclude:Function}}
 */
export function runDiagnosis({ session, topic, speed = 'normal', handlers = {}, resume = null } = {}) {
  let cancelled = false;
  const timers = new Set();
  const factor = SPEED_FACTOR[speed] === undefined ? 1 : SPEED_FACTOR[speed];
  const layerMap = buildLayerMap(topic);
  const maxLayer = Array.isArray(topic && topic.nodes) && topic.nodes.length
    ? Math.max(...topic.nodes.map((n) => Number(n.layer) || 0))
    : 0;
  const quizIds = Array.isArray(topic && topic.quiz) ? topic.quiz.map((q) => q.id) : [];

  const startPhase = (resume && resume.phase) || (session && session.phase) || 'idle';
  const resumeLayer = resume && Number.isFinite(resume.layer) ? resume.layer : (session && session.layer) || 0;

  // phase=expanding 时，之前的层视为已经展示过，不再重播
  let lastEmitted = startPhase === 'expanding' ? Math.max(0, Math.min(maxLayer, resumeLayer)) : -1;
  let paused = false;
  let confirmed = false;

  function safeCall(name, ...args) {
    if (cancelled) return;
    const fn = handlers[name];
    if (typeof fn !== 'function') return;
    try {
      fn(...args);
    } catch (err) {
      console.warn(`[simulate] ${name} 处理失败`, err);
    }
  }

  function later(ms, fn) {
    if (cancelled) return;
    if (factor <= 0) {
      fn();
      return;
    }
    const id = setTimeout(() => {
      timers.delete(id);
      if (!cancelled) fn();
    }, Math.max(0, Math.round(ms * factor)));
    timers.add(id);
  }

  function clearTimers() {
    for (const id of timers) clearTimeout(id);
    timers.clear();
  }

  function emitLayer(layer) {
    if (cancelled || layer < 0 || layer > maxLayer) return;
    const data = layerMap.get(layer);
    if (!data) {
      lastEmitted = Math.max(lastEmitted, layer);
      return;
    }
    lastEmitted = Math.max(lastEmitted, layer);
    safeCall('onLayer', layer, data.nodes.slice(), data.edges.slice());
  }

  function pauseAtConfirm() {
    if (cancelled || paused) return;
    paused = true;
    safeCall('onJudgement', { weakPoints: [], confidence: 0.82, needsConfirm: true });
    safeCall('onPhase', 'confirming', '等待确认');
  }

  function expand(layer) {
    if (cancelled) return;
    if (layer > 2 || layer > maxLayer) {
      pauseAtConfirm();
      return;
    }
    emitLayer(layer);
    later(700, () => expand(layer + 1));
  }

  function advanceToQuiz(choice) {
    if (cancelled || confirmed) return;
    confirmed = true;
    paused = false;
    if (choice === 'continue') {
      const target = Math.min(3, maxLayer);
      for (let layer = lastEmitted + 1; layer <= target; layer += 1) emitLayer(layer);
    }
    later(180, () => {
      safeCall('onPhase', 'quizzing', '短测确认');
      safeCall('onQuiz', quizIds.slice());
    });
  }

  // 启动
  if (startPhase === 'idle') {
    safeCall('onPhase', 'parsing', '解析问题');
    later(500, () => {
      safeCall('onPhase', 'expanding', '展开前置假设');
      expand(0);
    });
  } else if (startPhase === 'parsing' || startPhase === 'expanding') {
    safeCall('onPhase', 'expanding', '展开前置假设');
    const start = Math.max(0, lastEmitted + 1);
    later(0, () => expand(start));
  }

  function skip() {
    if (cancelled) return;
    clearTimers();
    const target = Math.min(3, maxLayer);
    for (let layer = lastEmitted + 1; layer <= target; layer += 1) emitLayer(layer);
    if (session && session.quizSubmitted) {
      conclude();
      return;
    }
    safeCall('onJudgement', { weakPoints: [], confidence: 0.82, needsConfirm: false });
    safeCall('onPhase', 'quizzing', '短测确认');
    safeCall('onQuiz', quizIds.slice());
  }

  function conclude() {
    if (cancelled) return;
    clearTimers();
    const weak = (session && session.quizResult && session.quizResult.weak) || [];
    const pathStepIds = Array.isArray(topic && topic.path) ? topic.path.map((step) => step.id) : [];
    safeCall('onPhase', 'path-ready', '生成路径');
    safeCall('onConclusion', { weakPoints: weak, pathStepIds });
    safeCall('onDone');
  }

  function cancel() {
    cancelled = true;
    clearTimers();
  }

  return {
    cancel,
    skip,
    resume: advanceToQuiz,
    conclude
  };
}
