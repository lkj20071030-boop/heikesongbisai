/* 智析 AI · 大模型接入
 *
 * 构造教学方案请求消息，桌面端走 bridge.llmRequest，浏览器直接 fetch。
 * 只负责请求与 JSON 解析校验；失败时返回 { ok:false }，由生成引擎回退本地模板。
 */

import { stageProfile, courseInfo } from './generate.js';

const SCHEMA_HINT = `{
  "title": "方案标题",
  "objectives": [{"text": "学段目标（学习目标/课程目标）", "level": "基础|理解|应用|分析|迁移", "sourceIds": ["资料 id"]}],
  "keyPoints": ["重点"],
  "difficulties": ["难点"],
  "prerequisites": [{"nodeId": "图谱节点 id", "label": "前概念", "misconception": "常见误解", "sourceIds": ["资料 id"]}],
  "flow": [{"phase": "按学段流程的阶段名", "minutes": 5, "teacher": "教师活动", "student": "学生活动", "evidence": "评价证据", "sourceIds": ["资料 id"]}],
  "assessment": [{"type": "评价/考核类型", "text": "评价任务", "criteria": "达成标准"}],
  "homework": {"basic": ["基础作业"], "advanced": ["提高作业"], "remedial": ["补偿作业"]},
  "differentiation": {"support": ["支持策略"], "extension": ["拓展任务"]},
  "risks": [{"risk": "风险", "fallback": "替代方案"}]
}`;

function compactScenario(scenario) {
  return {
    stage: scenario.stage,
    subject: scenario.subject,
    grade: scenario.grade,
    textbook: scenario.textbook,
    unit: scenario.unit,
    title: scenario.title,
    summary: scenario.summary,
    course: scenario.course || null,
    sources: (scenario.sources || []).map((source) => ({
      id: source.id,
      type: source.type,
      title: source.title,
      locator: source.locator,
      excerpt: source.excerpt
    })),
    graph: {
      nodes: (scenario.graph && scenario.graph.nodes ? scenario.graph.nodes : []).map((node) => ({
        id: node.id,
        label: node.label,
        layer: node.layer,
        kind: node.kind,
        desc: node.desc
      })),
      edges: (scenario.graph && scenario.graph.edges ? scenario.graph.edges : []).map((edge) => ({
        from: edge.from,
        to: edge.to,
        relation: edge.relation,
        basis: edge.basis
      }))
    },
    objectives: scenario.objectives || [],
    keyPoints: scenario.keyPoints || [],
    difficulties: scenario.difficulties || [],
    misconceptions: scenario.misconceptions || [],
    flowTemplate: scenario.flowTemplate || [],
    homework: scenario.homework || {},
    differentiation: scenario.differentiation || {},
    risks: scenario.risks || [],
    classProfile: scenario.classProfile || null
  };
}

export function buildPlanMessages(request, scenario, retrieved) {
  const profile = stageProfile(request.stage || scenario.stage);
  const course = courseInfo(scenario.course);
  const isUniversity = profile.id === 'university';
  const flowRule = isUniversity
    ? `2. 教学流程必须为 ${profile.maxPhases} 段，包含课前阅读、问题导入、讲授/推导、案例/讨论、练习、小结与课后任务；minutes 之和必须等于 ${request.duration} 分钟。`
    : `2. 教学流程 4–6 段，minutes 之和必须等于 ${request.duration} 分钟。`;

  const system = [
    `你是面向${profile.stage}教师的教学方案设计助手。`,
    '请严格输出一个 JSON 对象，不要输出 Markdown、解释或多余文字。',
    `JSON 结构必须符合：${SCHEMA_HINT}`,
    `学段剖面：${profile.stage}；目标名称：${profile.outcomeLabel}；时长单位：${profile.durationLabel}；流程段数上限：${profile.maxPhases}。`,
    '硬性要求：',
    `1. ${profile.outcomeLabel} 3–4 条，覆盖基础到迁移，必须带 sourceIds。`,
    flowRule,
    '3. sourceIds 只能使用给定资料中出现的 id，禁止编造来源、页码或数据。',
    '4. 不得虚构班级数据、学生人数或测评结果。',
    '5. 内容必须准确、可执行，避免空泛口号。',
    isUniversity
      ? '6. 大学语言：使用「课程目标 / 毕业要求 / 学时 / 考核」，禁止使用「课标 / 核心素养」等 K12 表述。'
      : '6. K12 语言：使用「学习目标 / 课标 / 课时」，目标与活动要能落到课堂。',
    isUniversity
      ? '7. 大学作业必须区分 problem set、reading response、lab report、project、论文阅读中的适用类型，并体现引用规范与独立完成要求。'
      : '7. 作业按基础、提高、补偿分层，给出可直接布置的题目或任务。',
    course.reading.length
      ? `8. 课程阅读材料：${course.reading.join('；')}。`
      : '',
    profile.constraints.length
      ? `9. 可用约束：${profile.constraints.join('、')}；必须让约束真实改变流程与替代方案。`
      : ''
  ].filter(Boolean).join('\n');

  const constraints = Array.isArray(request.constraints) && request.constraints.length
    ? request.constraints.join('、')
    : '无特别约束';
  const sourceCount = retrieved && retrieved.sources ? retrieved.sources.length : 0;
  const courseLine = [
    course.code ? `课程代码 ${course.code}` : '',
    course.credits ? `${course.credits} 学分` : '',
    course.hours ? `${course.hours} 学时` : '',
    course.audience ? `授课对象 ${course.audience}` : '',
    course.assessment
      ? `考核 ${Array.isArray(course.assessment) ? course.assessment.join('、') : course.assessment}`
      : ''
  ].filter(Boolean).join(' · ');

  const user = [
    `教师需求：${request.need || `按场景生成一次${profile.stage}教学方案`}`,
    `学段：${profile.stage}`,
    `目标名称：${profile.outcomeLabel}`,
    `课型：${request.lessonType || profile.defaultLessonType}`,
    `时长：${request.duration || profile.defaultDuration} 分钟（${profile.durationLabel}）`,
    `学情：${request.level || '混合'}`,
    `课堂约束：${constraints}`,
    isUniversity ? `课程信息：${courseLine || '未提供，按场景资料组织'}` : '',
    request.tune ? `微调要求：${request.tune}` : '',
    '',
    `场景资料（共 ${sourceCount} 条，只能引用这些 id）：`,
    JSON.stringify(compactScenario(scenario), null, 2),
    '',
    '请基于以上资料生成完整方案，只返回 JSON。'
  ].filter((line) => line !== '').join('\n');

  return [
    { role: 'system', content: system },
    { role: 'user', content: user }
  ];
}

function normalizeBaseUrl(baseUrl) {
  const raw = String(baseUrl || '').trim().replace(/\/+$/, '');
  if (!raw) return '';
  if (/\/chat\/completions$/i.test(raw)) return raw;
  return `${raw}/chat/completions`;
}

function contentOfChoice(data) {
  const choice = data && data.choices && data.choices[0];
  const message = choice && choice.message;
  if (!message) return '';
  const content = message.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map((part) => {
      if (typeof part === 'string') return part;
      return part && typeof part.text === 'string' ? part.text : '';
    }).join('');
  }
  return '';
}

async function callViaBridge(payload) {
  const bridge = await import('./bridge.js');
  if (!bridge || typeof bridge.llmRequest !== 'function') return null;
  try {
    const result = await bridge.llmRequest(payload);
    if (!result || typeof result !== 'object') {
      return { ok: false, error: '桌面端未返回有效响应' };
    }
    if (!result.ok) {
      return { ok: false, error: String(result.error || `模型请求失败（${result.status || '未知状态'}）`) };
    }
    const content = typeof result.content === 'string' ? result.content : '';
    if (!content) return { ok: false, error: '模型返回内容为空' };
    return { ok: true, content };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : '桌面端模型请求失败' };
  }
}

async function callViaFetch({ url, apiKey, model, messages, temperature, maxTokens, timeoutMs }) {
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: false
      }),
      signal: controller ? controller.signal : undefined
    });
    if (!response.ok) {
      let detail = '';
      try {
        detail = (await response.text()).slice(0, 200);
      } catch (err) {
        detail = '';
      }
      return {
        ok: false,
        error: `模型请求失败（HTTP ${response.status}）${detail ? '：' + detail : ''}`
      };
    }
    const data = await response.json();
    const content = contentOfChoice(data);
    if (!content) return { ok: false, error: '模型返回内容为空' };
    return { ok: true, content };
  } catch (err) {
    if (err && err.name === 'AbortError') {
      return { ok: false, error: '模型请求超时' };
    }
    return { ok: false, error: '浏览器直连失败，桌面端支持跨域代理' };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function callChat({ settings, messages, timeoutMs = 30000 } = {}) {
  const llm = (settings && settings.llm) || {};
  const apiKey = String(llm.apiKey || '').trim();
  const baseUrl = normalizeBaseUrl(llm.baseUrl);
  if (!apiKey || !baseUrl) {
    return { ok: false, error: '未配置模型连接' };
  }
  const model = String(llm.model || '').trim() || 'gpt-4o-mini';
  const temperature = Number.isFinite(Number(llm.temperature)) ? Math.max(0, Math.min(1.5, Number(llm.temperature))) : 0.4;
  const maxTokens = 2600;
  const boundedTimeout = Math.max(3000, Math.min(60000, Number(timeoutMs) || 30000));

  const payload = {
    baseUrl,
    apiKey,
    model,
    messages,
    temperature,
    maxTokens,
    timeoutMs: boundedTimeout
  };

  const bridged = await callViaBridge(payload);
  if (bridged) return bridged;

  return callViaFetch({
    url: baseUrl,
    apiKey,
    model,
    messages,
    temperature,
    maxTokens,
    timeoutMs: boundedTimeout
  });
}

export function parseJson(content) {
  let text = String(content || '').trim();
  if (!text) return null;
  text = text.replace(/^\uFEFF/, '').trim();
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  const candidates = [text];
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first !== -1 && last > first) candidates.push(text.slice(first, last + 1));
  for (const candidate of candidates) {
    try {
      const data = JSON.parse(candidate);
      if (data && typeof data === 'object' && !Array.isArray(data)) return data;
    } catch (err) {
      /* 尝试下一个候选 */
    }
  }
  return null;
}

export async function requestPlanDraft({ settings, request, scenario, retrieved, timeoutMs } = {}) {
  if (!scenario) return { ok: false, error: '缺少场景' };
  const messages = buildPlanMessages(request, scenario, retrieved);
  const result = await callChat({ settings, messages, timeoutMs });
  if (!result.ok) return result;
  const data = parseJson(result.content);
  if (!data) return { ok: false, error: '模型返回的内容不是合法 JSON' };
  if (!Array.isArray(data.objectives) || !Array.isArray(data.flow)) {
    return { ok: false, error: '模型返回的方案结构不完整' };
  }
  return { ok: true, data, content: result.content };
}
