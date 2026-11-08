/** 学习诊断 Agent 编排：每个环节独立提示词、校验、重试与本地降级。 */

import { topics as defaultTopics } from '../data/topics.mjs';
import { PROMPT_VERSION, STAGE_LABELS, buildIntentPrompt, buildDiagnosePrompt, buildGradePrompt, buildPlanPrompt, buildExplainPrompt, buildRetestPrompt, buildTutorPrompt, buildRepairPrompt } from './prompts.mjs';
import { createLlmClient } from './llm.mjs';
import * as S from './schemas.mjs';
import * as K from './knowledge.mjs';

const fail = (status, message) => {
  const error = new Error(message);
  error.status = status;
  throw error;
};
const INVALID_ANSWERS = '请完成所有题目，并提交有效选项';
const FALLBACK_NOTE = '模型输出未通过校验，已回退本地规则';

function traceOf(stage, engine, status, latencyMs, error) {
  const trace = { stage, label: STAGE_LABELS[stage], engine, status, latencyMs };
  if (error) trace.error = error;
  return trace;
}

function parseAndValidate(raw, validate) {
  let parsed;
  try {
    parsed = S.parseJsonObject(raw);
  } catch (error) {
    error.raw = raw;
    throw error;
  }
  const checked = validate(parsed);
  if (!checked.ok) {
    const error = new Error(checked.error);
    error.raw = raw;
    throw error;
  }
  return checked.value;
}

const localSummary = (topic, retest) => `${retest ? '复测使用不同题目。' : ''}已匹配「${topic.title}」。${topic.summary} 以下图谱和题目来自 app 自带资料库，并非实时模型推断。`;

const promptSources = topic => K.publicSources(topic).map(source => ({ id: source.id, title: source.title, org: source.organization, excerpt: source.excerpt }));

function quizValidator({ nodeIds, previousStems }) {
  return value => {
    const checked = S.validateQuiz(value, { nodeIds, previousStems });
    if (!checked.ok) return checked;
    const summary = typeof value.summary === 'string' ? value.summary.trim() : '';
    if (!summary) return { ok: false, error: 'summary 不能为空' };
    return { ok: true, value: { questions: checked.value, summary } };
  };
}

function localGrade(topic, questions, wrong, candidates, nodeMap) {
  return {
    weakPoints: candidates.map(id => ({
      id,
      label: nodeMap[id]?.label || id,
      reason:
        wrong
          .filter(question => (question.tests?.length ? question.tests : topic.weakMap?.[question.id] || []).includes(id))
          .map(question => question.explain)
          .filter(Boolean)
          .join('\n') || '相关诊断题未通过，需要巩固。',
    })),
    advice: candidates.length
      ? '根据本次短测生成疑似薄弱点；请学习相关概念，再以不同题目复测。'
      : '本次短测全部正确，可继续完成巩固路径与迁移复测。短测结果不代表完整能力认证。',
  };
}

function localPlan(topic, weak) {
  const steps = topic.path.filter(step => !weak.length || weak.includes(step.nodeId) || step.kind === '迁移练习');
  return {
    steps: (steps.length ? steps : topic.path).map(step => ({
      id: step.id,
      title: step.title,
      duration: `${step.minutes} 分钟`,
      description: step.intro,
      relatedNodeIds: [step.nodeId],
    })),
  };
}

export function createDiagnosisAgent({ llm, topics } = {}) {
  const catalogTopics = Array.isArray(topics) && topics.length ? topics : defaultTopics;
  const model = llm?.model || '';
  const enabled = !!(llm && llm.enabled !== false && llm.baseUrl && llm.model);
  const client = enabled ? createLlmClient(llm) : null;
  const supportText = () => `当前资料库支持：${catalogTopics.map(topic => topic.title).join('、')}。请输入其中一个具体概念。`;

  function meta(traces) {
    return {
      mode: enabled ? 'agent' : 'local',
      enabled,
      model,
      promptVersion: PROMPT_VERSION,
      degraded: traces.some(trace => trace.status === 'fallback'),
      stages: traces,
    };
  }

  /** 单环节执行：LLM → 校验 → repair 一次 → 本地降级，业务错误继续上抛。 */
  async function runStage(stage, messages, validate, fallback) {
    if (!client) return { value: fallback(), trace: traceOf(stage, 'local', 'ok', 0) };
    const started = Date.now();
    let raw = '';
    try {
      const result = await client.complete(messages);
      raw = result.content;
      return { value: parseAndValidate(raw, validate), trace: traceOf(stage, 'llm', 'ok', Date.now() - started) };
    } catch (error) {
      const firstError = error?.message || '模型输出不合规';
      try {
        const repaired = await client.complete(buildRepairPrompt({ stage, raw: raw || error?.raw || '', error: firstError }));
        return { value: parseAndValidate(repaired.content, validate), trace: traceOf(stage, 'llm', 'ok', Date.now() - started) };
      } catch {
        return { value: fallback(), trace: traceOf(stage, 'local', 'fallback', Date.now() - started, FALLBACK_NOTE) };
      }
    }
  }

  async function resolveTopic(question, profile) {
    const catalog = K.topicCatalog(catalogTopics);
    const run = await runStage(
      'intent',
      buildIntentPrompt({ question, profile, catalog }),
      value => S.validateIntent(value, catalog.map(item => item.id)),
      () => {
        const topic = K.matchTopicLocal(question, catalogTopics);
        return { topicId: topic.id, confidence: 1, reason: '本地别名匹配', matchedAlias: '' };
      },
    );
    let topic = run.value.topicId ? K.getTopic(run.value.topicId, catalogTopics) : null;
    let trace = run.trace;
    // 模型选了主题但置信度不足时，先尝试本地别名匹配，避免误判 422。
    if (!topic || run.value.confidence < 0.3) {
      try {
        topic = K.matchTopicLocal(question, catalogTopics);
        trace = traceOf('intent', 'local', 'fallback', trace.latencyMs, '模型未确定主题，已回退本地匹配');
      } catch {
        fail(422, supportText());
      }
    }
    return { topic, trace };
  }

  async function start({ question, profile }) {
    const { topic, trace: intentTrace } = await resolveTopic(question, profile);
    const graph = K.graphOf(topic);
    const validation = quizValidator({ nodeIds: topic.nodes.map(node => node.id), previousStems: topic.quiz.map(item => item.stem) });
    const { value, trace: diagnoseTrace } = await runStage(
      'diagnose',
      buildDiagnosePrompt({ topic, question, profile, graph, sources: promptSources(topic), candidateQuiz: topic.quiz }),
      validation,
      () => ({ questions: K.normalizeQuestions(topic.quiz), summary: localSummary(topic, false) }),
    );
    const summary = diagnoseTrace.engine === 'llm' ? `已匹配「${topic.title}」。${value.summary}` : value.summary;
    return {
      topic,
      question,
      profile,
      retest: false,
      questions: value.questions,
      summary,
      graph,
      sources: K.publicSources(topic),
      publicQuiz: K.publicQuiz(topic, value.questions),
      agent: meta([intentTrace, diagnoseTrace]),
    };
  }

  async function submit({ session, answers }) {
    const topic = session.topic;
    const questions = session.questions || [];
    const nodeMap = K.nodeMapOf(topic);
    if (!answers || Array.isArray(answers) || typeof answers !== 'object') fail(422, INVALID_ANSWERS);

    const selected = {};
    for (const question of questions) {
      const index = K.normalizeAnswerToIndex(question, answers[question.id]);
      if (index < 0) fail(422, INVALID_ANSWERS);
      selected[question.id] = index;
    }

    const wrong = questions.filter(question => selected[question.id] !== K.answerIndexOf(question));
    const candidates = [...new Set(wrong.flatMap(question => (question.tests?.length ? question.tests : topic.weakMap?.[question.id] || [])))];

    const gradeRun = await runStage(
      'grade',
      buildGradePrompt({ topic, questions, answers: selected, candidates, nodeMap }),
      value => S.validateGrade(value, { candidateIds: candidates, nodeMap }),
      () => localGrade(topic, questions, wrong, candidates, nodeMap),
    );
    const grade = gradeRun.value;
    const weakIds = grade.weakPoints.map(item => item.id);
    const planCandidates = K.pathCandidates(topic, weakIds);

    const planRun = await runStage(
      'plan',
      buildPlanPrompt({
        topic,
        weakPoints: grade.weakPoints.map(item => ({ id: item.id, title: item.label || nodeMap[item.id]?.label || item.id, reason: item.reason })),
        candidates: planCandidates,
        profile: session.profile,
      }),
      value => S.validatePlan(value, { candidates: planCandidates }),
      () => localPlan(topic, weakIds),
    );

    const result = {
      accuracyText: `${questions.length - wrong.length}/${questions.length} 道回答正确`,
      weakPoints: grade.weakPoints.map(item => ({ id: item.id, title: item.label || nodeMap[item.id]?.label || item.id, reason: item.reason })),
      learningPath: planRun.value.steps,
      advice: grade.advice,
    };

    session.weak = result.weakPoints.map(item => item.id);
    session.answers = answers;
    session.graded = true;
    return { result, agent: meta([gradeRun.trace, planRun.trace]) };
  }

  async function retest({ session }) {
    if (!session.graded) fail(409, '请先提交当前诊断答案');
    if (session.retest) fail(409, '本主题复测题已完成，请重新开始探索；当前题库不提供第三套题目。');

    const topic = session.topic;
    const previousQuestions = session.questions || [];
    let focusNodeIds = [...new Set(session.weak || [])];
    if (!focusNodeIds.length) focusNodeIds = [...new Set(previousQuestions.flatMap(question => question.tests || []))];
    const nodeIds = focusNodeIds.length ? focusNodeIds : topic.nodes.map(node => node.id);
    const graph = K.graphOf(topic, []);

    const { value, trace } = await runStage(
      'retest',
      buildRetestPrompt({ topic, previousQuestions, focusNodeIds, profile: session.profile, graph, sources: promptSources(topic) }),
      quizValidator({ nodeIds, previousStems: previousQuestions.map(question => question.stem) }),
      () => ({ questions: K.normalizeQuestions(topic.retest), summary: localSummary(topic, true) }),
    );
    const summary = trace.engine === 'llm' ? `复测使用不同题目。已匹配「${topic.title}」。${value.summary}` : value.summary;

    return {
      topic,
      question: session.question,
      profile: session.profile,
      retest: true,
      questions: value.questions,
      summary,
      graph,
      sources: K.publicSources(topic),
      publicQuiz: K.publicQuiz(topic, value.questions),
      agent: meta([trace]),
    };
  }

  async function explain({ session, nodeId }) {
    const topic = session.topic;
    const node = topic.nodes.find(item => item.id === nodeId);
    if (!node) fail(404, '该会话中不存在此概念');
    const pathStep = topic.path.find(item => item.nodeId === node.id);
    const related = topic.sources.filter(source => (node.sourceIds || []).includes(source.id));
    const sources = related.length ? related : topic.sources;

    const { value, trace } = await runStage(
      'explain',
      buildExplainPrompt({ topic, node, sources: sources.map(source => ({ title: source.title, org: source.org, excerpt: source.excerpt })), pathStep, profile: session.profile }),
      S.validateExplain,
      () => ({ explanation: K.explainFallback(topic, node) }),
    );
    return { explanation: value.explanation, agent: meta([trace]) };
  }

  function tutorContext(topic, sessionId) {
    if (!topic) return { sessionId: sessionId || null, matched: false, note: '未命中当前资料库主题，请说明具体学科与概念。' };
    return {
      sessionId: sessionId || null,
      topicId: topic.id,
      title: topic.title,
      summary: topic.summary,
      nodes: topic.nodes.map(node => ({ id: node.id, label: node.label, desc: node.desc })),
      sources: K.publicSources(topic),
      path: topic.path.map(step => ({ id: step.id, title: step.title, kind: step.kind, intro: step.intro })),
    };
  }

  async function chat({ message, history, profile, sessionId, session }) {
    if (!enabled) fail(503, '未配置服务端模型；知识诊断与学习资料功能仍可使用。');
    let topic = session?.topic || null;
    if (!topic) {
      try {
        topic = K.matchTopicLocal(message, catalogTopics);
      } catch {
        topic = null;
      }
    }

    const safeHistory = Array.isArray(history) ? history.filter(item => item && ['user', 'assistant'].includes(item.role) && typeof item.content === 'string').slice(-20) : [];
    const messages = buildTutorPrompt({ message, history: safeHistory, profile, context: tutorContext(topic, sessionId) });
    const started = Date.now();
    let raw = '';
    try {
      const result = await client.complete(messages);
      raw = result.content;
      const value = parseAndValidate(raw, S.validateTutor);
      return { reply: value.reply, agent: meta([traceOf('tutor', 'llm', 'ok', Date.now() - started)]) };
    } catch (error) {
      try {
        const repaired = await client.complete(buildRepairPrompt({ stage: 'tutor', raw: raw || error?.raw || '', error: error?.message || '模型输出不合规' }));
        const value = parseAndValidate(repaired.content, S.validateTutor);
        return { reply: value.reply, agent: meta([traceOf('tutor', 'llm', 'ok', Date.now() - started)]) };
      } catch (repairError) {
        const failure = new Error(`模型服务暂时不可用：${repairError?.message || '返回格式不符合要求'}`);
        failure.status = 502;
        throw failure;
      }
    }
  }

  function status() {
    return {
      enabled,
      mode: enabled ? 'agent' : 'local',
      model,
      promptVersion: PROMPT_VERSION,
      stages: Object.entries(STAGE_LABELS).map(([stage, label]) => ({ stage, label })),
    };
  }

  return { status, start, submit, retest, explain, chat };
}
