/* 智析 AI · 分环节 Agent 提示词
 *
 * 四个环节各自独立的提示词：
 *   1. outline  生成方案骨架（目标、重难点、前概念、流程时间轴）
 *   2. compose  基于骨架生成完整方案
 *   3. revise   按质检提醒修订完整方案
 *   4. repair   模型输出未通过校验时的一次性修复
 * 所有提示词均为中文，并复用 llm.js 的完整方案 schema 约束。
 */

import { buildPlanMessages } from './llm.js';
import { stageProfile } from './generate.js';

export const PROMPT_VERSION = 'desktop-agent-v1';

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

const OUTLINE_SCHEMA_HINT = `{
  "title": "方案标题",
  "objectives": [{"text": "学段目标（学习目标/课程目标）", "level": "基础|理解|应用|分析|迁移", "sourceIds": ["资料 id"]}],
  "keyPoints": ["重点"],
  "difficulties": ["难点"],
  "prerequisites": [{"nodeId": "图谱节点 id", "label": "前概念", "misconception": "常见误解", "sourceIds": ["资料 id"]}],
  "flow": [{"phase": "按学段流程的阶段名", "minutes": 5, "focus": "该阶段的核心任务", "sourceIds": ["资料 id"]}]
}`;

const STAGE_LABELS = {
  outline: '生成方案骨架',
  compose: '生成完整方案',
  check: '质量检查',
  revise: '按质检修订'
};

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

function profileOf(request, scenario) {
  return stageProfile((request && request.stage) || (scenario && scenario.stage));
}

function durationOf(request, profile) {
  const value = Math.round(Number(request && request.duration));
  return Number.isFinite(value) && value > 0 ? value : profile.defaultDuration;
}

function ruleBlock(profile, duration) {
  const isUniversity = profile.id === 'university';
  return [
    `1. ${profile.outcomeLabel} 3–4 条，覆盖基础到迁移，每条必须带 sourceIds。`,
    isUniversity
      ? `2. 教学流程必须为 7 段，包含课前阅读、问题导入、讲授/推导、案例/讨论、练习、小结与课后任务；minutes 之和必须等于 ${duration} 分钟（${profile.durationLabel}）。`
      : `2. 教学流程 4–6 段，minutes 之和必须等于 ${duration} 分钟（${profile.durationLabel}）。`,
    '3. sourceIds 只能使用给定场景资料中出现的 id，禁止编造来源、页码、作者、数据或链接。',
    '4. 不得虚构班级人数、学生成绩、测评结果或学校信息。',
    isUniversity
      ? '5. 大学语言：使用「课程目标 / 毕业要求 / 学时 / 考核」，禁止使用「课标 / 核心素养」等 K12 表述。'
      : '5. K12 语言：使用「学习目标 / 课标 / 课时」，目标与活动要能落到课堂。',
    '6. 内容必须准确、可执行，避免空泛口号。'
  ].join('\n');
}

function requestBlock(request, profile) {
  const duration = durationOf(request, profile);
  const constraints = Array.isArray(request && request.constraints) && request.constraints.length
    ? request.constraints.join('、')
    : '无特别约束';
  return [
    `教师需求：${(request && request.need) || `按场景生成一次${profile.stage}教学方案`}`,
    `学段：${profile.stage}`,
    `目标名称：${profile.outcomeLabel}`,
    `课型：${(request && request.lessonType) || profile.defaultLessonType}`,
    `时长：${duration} 分钟（${profile.durationLabel}）`,
    `学情：${(request && request.level) || '混合'}`,
    `课堂约束：${constraints}`,
    request && request.tune ? `微调要求：${request.tune}` : ''
  ].filter(Boolean).join('\n');
}

function compactPlan(plan) {
  return {
    title: plan.title,
    duration: plan.duration,
    objectives: plan.objectives,
    keyPoints: plan.keyPoints,
    difficulties: plan.difficulties,
    prerequisites: plan.prerequisites,
    flow: plan.flow,
    assessment: plan.assessment,
    homework: plan.homework,
    differentiation: plan.differentiation,
    risks: plan.risks
  };
}

function issueBlock(issues) {
  return (Array.isArray(issues) ? issues : []).map((item, index) => {
    return `${index + 1}. [${item.key || 'warn'}] ${item.label || '质检提醒'}：${item.detail || ''}`;
  }).join('\n');
}

/** 环节 1：生成方案骨架 */
export function buildOutlineMessages({ request, scenario, retrieved, profile } = {}) {
  const stage = profileOf(request, scenario);
  const duration = durationOf(request, stage);
  const sourceCount = retrieved && retrieved.sources ? retrieved.sources.length : 0;

  const system = [
    `你是面向${stage.stage}教师的方案设计助手，当前只执行「生成方案骨架」环节。`,
    '只输出一个 JSON 对象，不要输出 Markdown 代码块、解释或多余文字。',
    `JSON 结构必须符合：${OUTLINE_SCHEMA_HINT}`,
    '硬性要求：',
    ruleBlock(stage, duration),
    '7. prerequisites 的 nodeId 必须来自场景图谱节点 id，不得新造节点。',
    '8. title 为 4–64 个字符，能直接用于课堂。'
  ].join('\n');

  const user = [
    requestBlock(request, stage),
    '',
    `场景资料（共 ${sourceCount} 条，只能引用这些 id）：`,
    JSON.stringify(compactScenario(scenario), null, 2),
    '',
    '请生成方案骨架，只返回 JSON。'
  ].join('\n');

  return [
    { role: 'system', content: system },
    { role: 'user', content: user }
  ];
}

/** 环节 2：基于骨架生成完整方案（复用现有完整方案提示词并追加骨架） */
export function buildComposeMessages({ request, scenario, retrieved, outline } = {}) {
  const messages = buildPlanMessages(request, scenario, retrieved);
  const skeleton = JSON.stringify(outline || {}, null, 2);
  return messages.concat([
    {
      role: 'user',
      content: [
        '【方案骨架（必须遵循，可补全不可推翻）】',
        skeleton,
        '',
        '请以该骨架为约束补全为完整方案 JSON：',
        '- 目标、重难点、前概念、流程阶段与时间轴必须与骨架一致，可补充细节但不可推翻或删除；',
        '- 补充教师活动、学生活动、评价证据、评价/考核、分层作业、差异化支持与风险预案；',
        '- 仍然只返回一个 JSON 对象；sourceIds 只能使用场景资料 id；不得编造来源、页码或班级数据。'
      ].join('\n')
    }
  ]);
}

/** 环节 4：按质检提醒修订完整方案 */
export function buildReviseMessages({ request, scenario, retrieved, plan, issues } = {}) {
  const stage = profileOf(request, scenario);
  const duration = durationOf(request, stage);
  const sourceCount = retrieved && retrieved.sources ? retrieved.sources.length : 0;

  const system = [
    `你是面向${stage.stage}教师的方案设计助手，当前只执行「按质检修订」环节。`,
    '只输出一个 JSON 对象，不要输出 Markdown 代码块、解释或多余文字。',
    `修订后的 JSON 结构必须符合：${SCHEMA_HINT}`,
    '修订要求：',
    '1. 只修复下列质检提醒（warn）涉及的问题，未被指出的内容保持不变。',
    '2. 不得删除或推翻已通过的目标与流程，不得改变方案标题与总时长。',
    '3. 必须输出完整方案 JSON（目标、流程、评价、作业等全部字段），便于直接替换。',
    '4. sourceIds 只能使用场景资料中出现的 id；禁止编造来源、页码、作者或数据。',
    '5. 不得虚构班级人数、学生成绩或测评结果。',
    `6. ${stage.outcomeLabel}保持 3–4 条；流程段数保持现有结构，minutes 之和必须等于 ${duration} 分钟。`,
    stage.id === 'university'
      ? '7. 大学语言：使用「课程目标 / 毕业要求 / 学时 / 考核」，禁止使用「课标 / 核心素养」等 K12 表述。'
      : '7. K12 语言：使用「学习目标 / 课标 / 课时」。'
  ].join('\n');

  const user = [
    requestBlock(request, stage),
    `场景资料共 ${sourceCount} 条，只能引用这些 id。`,
    '场景资料：',
    JSON.stringify(compactScenario(scenario), null, 2),
    '',
    '现有方案 JSON：',
    JSON.stringify(compactPlan(plan || {}), null, 2),
    '',
    '质检提醒（warn）：',
    issueBlock(issues) || '（无）',
    '',
    '请输出修订后的完整方案 JSON。'
  ].join('\n');

  return [
    { role: 'system', content: system },
    { role: 'user', content: user }
  ];
}

/** JSON 解析或 schema 校验失败时的一次性修复提示词 */
export function buildRepairMessages({ stage, raw, error } = {}) {
  const label = STAGE_LABELS[stage] || stage || '方案生成';
  const schemaHint = stage === 'outline' ? OUTLINE_SCHEMA_HINT : SCHEMA_HINT;
  const clipped = String(raw || '').slice(0, 4000);

  const system = [
    '你是 JSON 修复助手，负责把不符合要求的模型输出修复为合法 JSON。',
    '只输出一个 JSON 对象，不要输出 Markdown 代码块、解释或多余文字。',
    `目标结构：${schemaHint}`
  ].join('\n');

  const user = [
    `环节：${label}`,
    `校验错误：${error || '输出不是合法 JSON'}`,
    '',
    '修复要求：',
    '- 只输出修复后的一个 JSON 对象，字段完整且可被 JSON.parse 解析。',
    '- sourceIds 只能保留场景资料中已有的 id，不得新造来源、页码、作者或数据。',
    '- 目标 3–4 条；流程 4–6 段（大学 7 段）；流程 minutes 之和必须等于课时。',
    '- 不得虚构班级人数、学生成绩或测评结果。',
    '- 大学使用「课程目标 / 学时 / 考核」；K12 使用「学习目标 / 课标 / 课时」。',
    '',
    '待修复的原始输出（可能被截断）：',
    clipped || '（空）'
  ].join('\n');

  return [
    { role: 'system', content: system },
    { role: 'user', content: user }
  ];
}
