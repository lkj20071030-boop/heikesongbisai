import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { createApp } from '../server/index.mjs';

const profile = { role: '大学生', field: '物理' };

const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const close = server => new Promise(resolve => server.close(resolve));
const mockUrl = server => `http://127.0.0.1:${server.address().port}`;

function detectStage(messages = []) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const content = typeof messages[i]?.content === 'string' ? messages[i].content : '';
    const match = content.match(/\[STAGE:([a-z]+)(?::repair)?\]/i);
    if (match) return match[1].toLowerCase();
  }
  return '';
}

function validResponse(stage) {
  if (stage === 'intent') return { topicId: 'circuit-kvl', confidence: 0.9, reason: '问题命中基尔霍夫电压定律', matchedAlias: 'KVL' };
  if (stage === 'diagnose') {
    return {
      summary: '围绕电压定义与符号规则确认前置概念。',
      questions: [
        { stem: '若已知 U_AB = 4 V，那么 U_BA 等于多少？', options: ['−4 V', '4 V', '0 V', '8 V'], answerIndex: 0, explain: '交换下标等于把参考极性反过来，数值取相反数。', tests: ['voltage'] },
        { stem: '沿绕行方向从理想电压源的负极走到正极，该段电压降应记为？', options: ['+E', '−E', '0', '由外电路电阻决定'], answerIndex: 1, explain: '从负极到正极电势升高，按降低记正的规则应记为 −E。', tests: ['drop'] },
      ],
    };
  }
  if (stage === 'grade') {
    return {
      weakPoints: [
        { id: 'voltage', reason: '电压与参考方向题选择了相反符号，说明参考极性理解不稳。' },
        { id: 'drop', reason: '电压降符号规则题答错，沿绕行方向的升降判断需要巩固。' },
      ],
      advice: '先复习电势差定义与参考方向，再做一次完整回路列式自检。',
    };
  }
  if (stage === 'plan') {
    return {
      steps: [
        { id: 'p1', title: '先把电压还原成电势差', duration: '8 分钟', description: '复习 U_AB = φ_A − φ_B 并用电池例子判断正负。', relatedNodeIds: ['voltage'] },
        { id: 'p2', title: '把每一段写成电压降', duration: '9 分钟', description: '练习电阻与电源的 +IR、−IR、+E、−E 四种写法。', relatedNodeIds: ['drop'] },
        { id: 'p3', title: '为什么一圈下来必须为零', duration: '8 分钟', description: '完成一次完整列式并用功率平衡校验。', relatedNodeIds: ['sumzero'] },
      ],
    };
  }
  if (stage === 'explain') {
    return { explanation: '电压是两点之间的电势差：先约定参考极性，再比较两点电势高低，实际方向与假设相反时取负号。沿闭合回路绕行一周回到起点，电势与出发时相同，因此各段电压降的代数和为零。你可以先自检：若 U_AB = 3 V，那么 U_BA 等于多少？这个自检能帮你检查参考方向是否真的理解。' };
  }
  if (stage === 'retest') {
    return {
      summary: '用不同情境确认电压定义与符号规则是否已经补齐。',
      questions: [
        { stem: '某段电路两端的电压为 2 V，这句话的物理含义是？', options: ['该段电路每秒通过 2 C 电荷', '该段电路电阻为 2 Ω', '该段电路消耗功率为 2 W', '把 1 C 正电荷从高电势端移到低电势端，电场力做 2 J 的功'], answerIndex: 3, explain: '由 W = qU 得 2 J，且正电荷由高电势移向低电势时电场力做正功。', tests: ['voltage'] },
        { stem: '列 KVL 方程时，若某元件电压降的参考方向与绕行方向相反，应如何处理？', options: ['取负号，因为沿绕行方向实际是电势升高', '取正号，参考方向可以忽略', '删去不影响方程', '取绝对值，符号由结果决定'], answerIndex: 0, explain: '参考方向与绕行方向相反时，沿绕行方向实际是电势升高，因此该项取负。', tests: ['drop'] },
      ],
    };
  }
  if (stage === 'tutor') return { reply: '我们先把电压理解成两点之间的电势差，再一起检查绕行方向的符号规则。' };
  return { reply: '收到。' };
}

function makeMock(responder) {
  return http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    let body = {};
    try {
      body = JSON.parse(Buffer.concat(chunks).toString() || '{}');
    } catch {
      body = {};
    }
    const stage = detectStage(body.messages);
    const content = await responder(stage);
    const payload = {
      model: 'mock-model',
      choices: [{ message: { role: 'assistant', content: typeof content === 'string' ? content : JSON.stringify(content) } }],
      usage: { prompt_tokens: 10, completion_tokens: 20 },
    };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
  });
}

async function startApp({ storePath = null, llm } = {}) {
  const server = createApp({ storePath, llm });
  await listen(server);
  return { server, base: `http://127.0.0.1:${server.address().port}/api/v1` };
}

async function post(base, route, body) {
  const response = await fetch(base + route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { status: response.status, data: await response.json() };
}

async function getJson(base, route) {
  const response = await fetch(base + route);
  return { status: response.status, data: await response.json() };
}

const wrongAnswers = quiz => Object.fromEntries(quiz.map((question, index) => [question.id, index === 0 ? 'b' : 'a']));

test('Agent 模式完整闭环：intent/diagnose/grade/plan/retest/explain/tutor', async () => {
  const mock = makeMock(stage => validResponse(stage));
  await listen(mock);
  const app = await startApp({ llm: { baseUrl: mockUrl(mock), model: 'mock-model', apiKey: 'test', timeoutMs: 2000, maxRetries: 0 } });
  try {
    const started = await post(app.base, '/diagnose/start', { question: '基尔霍夫电压定律', profile });
    assert.equal(started.status, 200);
    const start = started.data;
    assert.equal(start.agent.mode, 'agent');
    assert.equal(start.agent.degraded, false);
    assert.deepEqual(start.agent.stages.map(item => item.stage), ['intent', 'diagnose']);
    assert.equal(start.quiz.length, 2);
    const leaked = JSON.stringify(start);
    for (const token of ['"answer"', 'answerIndex', '"explain"', '"tests"']) assert.ok(!leaked.includes(token), `start 响应泄露 ${token}`);

    const submitted = await post(app.base, '/diagnose/submit', { sessionId: start.sessionId, answers: wrongAnswers(start.quiz) });
    assert.equal(submitted.status, 200);
    assert.equal(submitted.data.accuracyText, '0/2 道回答正确');
    assert.equal(submitted.data.weakPoints.length, 2);
    assert.equal(submitted.data.learningPath.length, 3);
    assert.equal(submitted.data.agent.degraded, false);
    assert.deepEqual(submitted.data.agent.stages.map(item => item.stage), ['grade', 'plan']);

    const retested = await post(app.base, '/diagnose/retest', { sessionId: start.sessionId });
    assert.equal(retested.status, 200);
    assert.notEqual(retested.data.sessionId, start.sessionId);
    assert.notEqual(retested.data.quiz[0].prompt, start.quiz[0].prompt);
    assert.equal(retested.data.agent.stages[0].stage, 'retest');
    assert.equal(retested.data.agent.degraded, false);

    const explained = await post(app.base, '/learn/explain', { sessionId: start.sessionId, nodeId: 'voltage' });
    assert.equal(explained.status, 200);
    assert.ok(explained.data.explanation.length >= 60);
    assert.equal(explained.data.agent.stages[0].stage, 'explain');

    const chatted = await post(app.base, '/chat', { message: '为什么电压沿回路为零？', history: [], profile, sessionId: start.sessionId });
    assert.equal(chatted.status, 200);
    assert.ok(chatted.data.reply.length > 0);
    assert.equal(chatted.data.agent.stages[0].stage, 'tutor');
  } finally {
    await close(app.server);
    await close(mock);
  }
});

test('模型输出非法 JSON 时整链路回退本地并标记 degraded', async () => {
  const mock = makeMock(() => '这不是合法的 JSON');
  await listen(mock);
  const app = await startApp({ llm: { baseUrl: mockUrl(mock), model: 'mock-model', timeoutMs: 2000, maxRetries: 0 } });
  try {
    const started = await post(app.base, '/diagnose/start', { question: '基尔霍夫电压定律', profile });
    assert.equal(started.status, 200);
    const start = started.data;
    assert.equal(start.agent.mode, 'agent');
    assert.equal(start.agent.degraded, true);
    assert.ok(start.agent.stages.every(item => item.engine === 'local' && item.status === 'fallback'));
    assert.equal(start.quiz.length, 2);
    assert.ok(!JSON.stringify(start).includes('answerIndex'));

    const submitted = await post(app.base, '/diagnose/submit', { sessionId: start.sessionId, answers: wrongAnswers(start.quiz) });
    assert.equal(submitted.status, 200);
    assert.equal(submitted.data.accuracyText, '0/2 道回答正确');
    assert.ok(submitted.data.weakPoints.length > 0);
    assert.ok(submitted.data.learningPath.length > 0);
    assert.equal(submitted.data.agent.degraded, true);
    assert.ok(submitted.data.agent.stages.every(item => item.status === 'fallback'));
  } finally {
    await close(app.server);
    await close(mock);
  }
});

test('无 LLM 配置时保持本地模式与既有契约', async () => {
  const saved = { LLM_BASE_URL: process.env.LLM_BASE_URL, LLM_MODEL: process.env.LLM_MODEL, LLM_API_KEY: process.env.LLM_API_KEY, AGENT_ENABLED: process.env.AGENT_ENABLED };
  for (const key of Object.keys(saved)) delete process.env[key];
  const app = await startApp({});
  try {
    const status = await getJson(app.base, '/agent/status');
    assert.equal(status.status, 200);
    assert.equal(status.data.mode, 'local');
    assert.equal(status.data.enabled, false);
    assert.equal(status.data.stages.length, 7);

    const health = await getJson(app.base, '/health');
    assert.equal(health.data.status, 'ok');
    assert.equal(health.data.agent.mode, 'local');

    const started = await post(app.base, '/diagnose/start', { question: '牛顿第二定律', profile });
    assert.equal(started.status, 200);
    const start = started.data;
    assert.equal(start.agent.mode, 'local');
    assert.ok(start.agent.stages.every(item => item.engine === 'local' && item.status === 'ok'));
    assert.ok(start.summary.includes('已匹配「牛顿第二定律」'));
    assert.equal(start.quiz.length, 2);

    const unknown = await post(app.base, '/diagnose/start', { question: '一个资料库不支持的主题', profile });
    assert.equal(unknown.status, 422);
    assert.match(unknown.data.detail, /当前资料库支持/);

    const submitted = await post(app.base, '/diagnose/submit', { sessionId: start.sessionId, answers: wrongAnswers(start.quiz) });
    assert.equal(submitted.status, 200);
    assert.match(submitted.data.accuracyText, /^0\//);
    assert.ok(submitted.data.weakPoints.length > 0);
    assert.ok(submitted.data.learningPath.length > 0);
    assert.equal(submitted.data.agent.mode, 'local');

    const retested = await post(app.base, '/diagnose/retest', { sessionId: start.sessionId });
    assert.equal(retested.status, 200);
    assert.notEqual(retested.data.quiz[0].prompt, start.quiz[0].prompt);

    const chatted = await post(app.base, '/chat', { message: '你好' });
    assert.equal(chatted.status, 503);
    assert.match(chatted.data.detail, /未配置服务端模型/);
  } finally {
    await close(app.server);
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test('持久化 LLM 生成题目后重启仍可提交', async () => {
  const mock = makeMock(stage => validResponse(stage));
  await listen(mock);
  const temp = await mkdtemp(path.join(tmpdir(), 'zhixi-agent-'));
  const storePath = path.join(temp, 'sessions.json');
  let first;
  let second;
  try {
    const llm = { baseUrl: mockUrl(mock), model: 'mock-model', timeoutMs: 2000, maxRetries: 0 };
    first = await startApp({ storePath, llm });
    const started = await post(first.base, '/diagnose/start', { question: '基尔霍夫电压定律', profile });
    assert.equal(started.status, 200);
    await close(first.server);
    first = null;

    second = await startApp({ storePath, llm });
    const submitted = await post(second.base, '/diagnose/submit', { sessionId: started.data.sessionId, answers: wrongAnswers(started.data.quiz) });
    assert.equal(submitted.status, 200);
    assert.equal(submitted.data.accuracyText, '0/2 道回答正确');
    assert.equal(submitted.data.agent.mode, 'agent');
  } finally {
    if (first) await close(first.server);
    if (second) await close(second.server);
    await close(mock);
    await rm(temp, { recursive: true, force: true });
  }
});
