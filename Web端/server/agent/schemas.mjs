/** 纯函数校验与归一化：不依赖第三方库，错误文本用于 repair prompt。 */

const isObj = v => typeof v === 'object' && v !== null && !Array.isArray(v);
const isText = v => typeof v === 'string' && v.trim().length > 0;
const err = error => ({ ok: false, error });
const ok = value => ({ ok: true, value });
const stemKey = s => String(s).trim().replace(/\s+/g, '');

/** 解析模型输出为 JSON 对象，容忍 Markdown 代码围栏。 */
export function parseJsonObject(raw) {
  if (typeof raw !== 'string' || !raw.trim()) throw new Error('模型输出为空');
  let text = raw.trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) text = fenced[1].trim();
  let value;
  try {
    value = JSON.parse(text);
  } catch (error) {
    throw new Error(`模型输出不是合法 JSON 对象：${error.message}`);
  }
  if (!isObj(value)) throw new Error('模型输出必须是 JSON 对象');
  return value;
}

/** 意图识别：topicId 可为空（表示不匹配），非空时必须属于候选主题。 */
export function validateIntent(value, topicIds = []) {
  if (!isObj(value)) return err('输出必须是 JSON 对象');
  if (value.topicId !== undefined && typeof value.topicId !== 'string') return err('topicId 必须是字符串');
  const topicId = typeof value.topicId === 'string' ? value.topicId.trim() : '';
  if (topicId && !topicIds.includes(topicId)) return err(`topicId 必须属于候选主题：${topicIds.join('、')}`);
  const confidence = Number(value.confidence);
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) return err('confidence 必须是 0 到 1 之间的数字');
  const reason = typeof value.reason === 'string' ? value.reason.trim() : '';
  if (!reason) return err('reason 不能为空');
  return ok({
    topicId,
    confidence,
    reason,
    matchedAlias: typeof value.matchedAlias === 'string' ? value.matchedAlias.trim() : '',
  });
}

/** 诊断/复测题：恰好 2 题、4 个非空选项、答案下标合法、tests 属于知识库节点。 */
export function validateQuiz(value, { nodeIds = [], previousStems = [] } = {}) {
  if (!isObj(value)) return err('输出必须是 JSON 对象');
  if (!Array.isArray(value.questions)) return err('questions 必须是数组');
  if (value.questions.length !== 2) return err('必须恰好生成 2 道题');

  const previous = new Set(previousStems.map(stemKey));
  const questions = [];
  for (let i = 0; i < 2; i += 1) {
    const q = value.questions[i];
    const at = `第 ${i + 1} 题`;
    if (!isObj(q)) return err(`${at}必须是对象`);
    const stem = typeof q.stem === 'string' ? q.stem.trim() : '';
    if (!stem) return err(`${at}缺少题干`);
    if (previous.has(stemKey(stem))) return err(`${at}题干与已有题目重复，需要换一个角度出题`);
    if (questions.some(item => stemKey(item.stem) === stemKey(stem))) return err('两道题题干不能相同');
    if (!Array.isArray(q.options) || q.options.length !== 4) return err(`${at}必须恰好 4 个选项`);
    const options = q.options.map(option => (typeof option === 'string' ? option.trim() : ''));
    if (options.some(option => !option)) return err(`${at}选项不能为空`);
    if (new Set(options).size !== 4) return err(`${at}选项不能重复`);
    const answerIndex = Number(q.answerIndex);
    if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex > 3) return err(`${at}answerIndex 必须是 0-3 的整数`);
    const tests = Array.isArray(q.tests) ? [...new Set(q.tests.filter(isText).map(id => id.trim()))] : [];
    if (!tests.length) return err(`${at}tests 不能为空`);
    const unknown = tests.filter(id => !nodeIds.includes(id));
    if (unknown.length) return err(`${at}tests 包含未知节点：${unknown.join('、')}`);
    const explain = typeof q.explain === 'string' ? q.explain.trim() : '';
    questions.push({ id: `llm${i + 1}`, stem, options, answerIndex, explain, tests, source: 'llm' });
  }

  const [first, second] = questions;
  if (first.tests.length === second.tests.length && first.tests.every((id, index) => id === second.tests[index])) {
    return err('两道题不能考查完全相同的节点');
  }
  return ok(questions);
}

/** 评分归因：weakPoints 必须是候选节点子集，reason 与 advice 非空。 */
export function validateGrade(value, { candidateIds = [], nodeMap = {} } = {}) {
  if (!isObj(value)) return err('输出必须是 JSON 对象');
  if (!Array.isArray(value.weakPoints)) return err('weakPoints 必须是数组');
  const allowed = new Set(candidateIds);
  const seen = new Set();
  const weakPoints = [];
  for (let i = 0; i < value.weakPoints.length; i += 1) {
    const item = value.weakPoints[i];
    const at = `weakPoints 第 ${i + 1} 项`;
    if (!isObj(item)) return err(`${at}必须是对象`);
    const id = typeof item.id === 'string' ? item.id.trim() : '';
    if (!allowed.has(id)) return err(`${at} id 必须来自候选节点：${candidateIds.join('、')}`);
    if (seen.has(id)) continue;
    seen.add(id);
    const reason = typeof item.reason === 'string' ? item.reason.trim() : '';
    if (!reason) return err(`${at} reason 不能为空`);
    weakPoints.push({ id, label: nodeMap[id]?.label || id, reason });
  }
  if (candidateIds.length && !weakPoints.length) return err('存在答错题目时 weakPoints 不能为空');
  const advice = typeof value.advice === 'string' ? value.advice.trim() : '';
  if (!advice) return err('advice 不能为空');
  return ok({ weakPoints, advice });
}

/** 学习路径：3-5 步，步骤 id 与关联节点都必须来自候选。 */
export function validatePlan(value, { candidates = [] } = {}) {
  if (!isObj(value)) return err('输出必须是 JSON 对象');
  if (!Array.isArray(value.steps)) return err('steps 必须是数组');
  const minimum = Math.min(3, candidates.length);
  if (value.steps.length < minimum || value.steps.length > 5) return err(`学习路径必须包含 ${minimum}-5 个步骤`);
  const byId = new Map(candidates.map(step => [step.id, step]));
  const allowedNodes = new Set(candidates.flatMap(step => [step.nodeId, ...(Array.isArray(step.relatedNodeIds) ? step.relatedNodeIds : [])]).filter(Boolean));
  const seen = new Set();
  const steps = [];
  for (let i = 0; i < value.steps.length; i += 1) {
    const item = value.steps[i];
    const at = `第 ${i + 1} 步`;
    if (!isObj(item)) return err(`${at}必须是对象`);
    const id = typeof item.id === 'string' ? item.id.trim() : '';
    if (!byId.has(id)) return err(`${at} id 必须来自候选步骤：${[...byId.keys()].join('、')}`);
    if (seen.has(id)) return err(`${at} id 重复`);
    seen.add(id);
    const title = typeof item.title === 'string' ? item.title.trim() : '';
    if (!title) return err(`${at}title 不能为空`);
    const duration = typeof item.duration === 'string' ? item.duration.trim() : '';
    if (!duration) return err(`${at}duration 不能为空`);
    const description = typeof item.description === 'string' ? item.description.trim() : '';
    if (!description) return err(`${at}description 不能为空`);
    if (!Array.isArray(item.relatedNodeIds) || !item.relatedNodeIds.every(isText)) return err(`${at}relatedNodeIds 必须是节点 id 数组`);
    const relatedNodeIds = [...new Set(item.relatedNodeIds.map(node => node.trim()))];
    const unknown = relatedNodeIds.filter(node => !allowedNodes.has(node));
    if (unknown.length) return err(`${at}relatedNodeIds 包含候选外节点：${unknown.join('、')}`);
    steps.push({ id, title, duration, description, relatedNodeIds });
  }
  return ok({ steps });
}

/** 概念讲解：正文至少 60 字，避免空泛回答。 */
export function validateExplain(value) {
  if (!isObj(value)) return err('输出必须是 JSON 对象');
  const explanation = typeof value.explanation === 'string' ? value.explanation.trim() : '';
  if (explanation.length < 60) return err('explanation 至少需要 60 个字符，请补充定义、直觉与自检问题');
  return ok({ explanation });
}

/** 引导式答疑：reply 非空。 */
export function validateTutor(value) {
  if (!isObj(value)) return err('输出必须是 JSON 对象');
  const reply = typeof value.reply === 'string' ? value.reply.trim() : '';
  if (!reply) return err('reply 不能为空');
  return ok({ reply });
}
