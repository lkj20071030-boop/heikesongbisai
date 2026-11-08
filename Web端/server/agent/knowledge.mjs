/** 知识库工具：所有读取与本地规则都集中在这里，topics.mjs 保持只读。 */

import { topics as defaultTopics } from '../data/topics.mjs';

export const optionValue = index => String.fromCharCode(97 + index);

export const normalizeText = value => String(value).toLowerCase().replace(/[\s，。？?！!、·]/g, '');

const fail = (status, message) => {
  const error = new Error(message);
  error.status = status;
  throw error;
};

export function topicCatalog(topics = defaultTopics) {
  return topics.map(topic => ({
    id: topic.id,
    title: topic.title,
    summary: topic.summary,
    aliases: topic.aliases || [],
  }));
}

/** 复用现有标题/别名包含匹配逻辑，未知主题保持原 422 文案。 */
export function matchTopicLocal(question, topics = defaultTopics) {
  const query = normalizeText(question);
  const ranked = topics
    .map(topic => ({
      topic,
      score: Math.max(0, ...[topic.title, ...(topic.aliases || [])].map(alias => (query.includes(normalizeText(alias)) ? normalizeText(alias).length : 0))),
    }))
    .sort((a, b) => b.score - a.score);
  if (!ranked[0]?.score) {
    fail(422, `当前资料库支持：${topics.map(topic => topic.title).join('、')}。请输入其中一个具体概念。`);
  }
  return ranked[0].topic;
}

export function getTopic(id, topics = defaultTopics) {
  return topics.find(topic => topic.id === id) || null;
}

export function graphOf(topic, weak = []) {
  const rows = new Map();
  return {
    nodes: topic.nodes.map(node => {
      const row = rows.get(node.layer) || 0;
      rows.set(node.layer, row + 1);
      return {
        id: node.id,
        label: node.label,
        description: node.desc,
        status: weak.includes(node.id) ? 'weak' : node.id === topic.targetId ? 'target' : 'prerequisite',
        x: Number(node.layer) * 245,
        y: row * 120,
      };
    }),
    edges: topic.edges.map(edge => ({ source: edge.from, target: edge.to })),
  };
}

export function publicSources(topic) {
  return topic.sources.map(source => ({
    id: source.id,
    title: source.title,
    organization: source.org || '项目资料库',
    excerpt: source.excerpt,
    verified: source.verified === true,
  }));
}

export function publicQuiz(topic, questions) {
  const list = Array.isArray(questions) ? questions : topic?.quiz || [];
  return list.map(question => ({
    id: question.id,
    prompt: question.stem,
    options: question.options.map((label, index) => ({ value: optionValue(index), label })),
  }));
}

export function nodeMapOf(topic) {
  return Object.fromEntries(topic.nodes.map(node => [node.id, node]));
}

/** 现有学习路径过滤规则：命中薄弱点或迁移练习步骤。 */
export function pathCandidates(topic, weak = []) {
  return topic.path.filter(step => !weak.length || weak.includes(step.nodeId) || step.kind === '迁移练习');
}

/** 与现有 /learn/explain 完全一致的本地降级文案。 */
export function explainFallback(topic, node) {
  const step = topic.path.find(item => item.nodeId === node.id);
  return [
    node.desc,
    `前置依据：${node.evidence || '来自 app 自带概念资料。'}`,
    ...(step?.sections || []).map(section => `${section.heading}\n${section.body}`),
  ].join('\n\n');
}

export function answerIndexOf(question) {
  const raw = Number.isInteger(question?.answerIndex) ? question.answerIndex : Number(question?.answer);
  return Number.isInteger(raw) ? raw : -1;
}

/** 前端提交的小写字母/数字统一转成 0-3 下标，非法返回 -1。 */
export function normalizeAnswerToIndex(question, value) {
  const options = Array.isArray(question?.options) ? question.options : [];
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const index = trimmed.length === 1 ? trimmed.toLowerCase().charCodeAt(0) - 97 : -1;
    if (index >= 0 && index < options.length) return index;
    if (/^\d+$/.test(trimmed)) {
      const numeric = Number(trimmed);
      if (numeric >= 0 && numeric < options.length) return numeric;
    }
    return -1;
  }
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < options.length) return value;
  return -1;
}

/** 题库统一为内部结构，兼容旧数据的 answer 字段。 */
export function normalizeQuestion(question) {
  return {
    id: question.id,
    stem: question.stem,
    options: Array.isArray(question.options) ? question.options.slice(0, 4) : [],
    answerIndex: answerIndexOf(question),
    explain: question.explain || '',
    tests: Array.isArray(question.tests) ? question.tests.slice() : [],
    source: question.source || 'local',
  };
}

export function normalizeQuestions(list = []) {
  return list.map(normalizeQuestion);
}
