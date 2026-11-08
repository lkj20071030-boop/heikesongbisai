/* 智析 AI · 本次记录导出
   生成 Markdown 文本并交给桌面桥保存（浏览器环境降级为下载）。
   内容只陈述本次作答与自报完成情况，不做能力或掌握度结论。 */

import { fmtDate } from './ui.js';
import { exportMarkdown } from './bridge.js';
import { stageProfile, courseInfo } from './generate.js';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

const DISCLAIMER =
  '本记录仅陈述本次作答与自报完成情况，不宣称掌握程度或能力提升。' +
  '内容来自本地知识库数据，全部计算在本机完成，不代表真实测评、教学结论或权威结论。';

function oneLine(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/\s+/g, ' ')
    .trim();
}

function optionText(question, index) {
  const options = Array.isArray(question.options) ? question.options : [];
  const text = options[index];
  if (text === undefined || text === null) return '（该选项缺失）';
  return LETTERS[index] + '. ' + oneLine(text);
}

function nodeOf(topic, nodeId) {
  return (topic.nodes || []).find((node) => node.id === nodeId) || null;
}

function quizBlock(session, topic, stage) {
  const isRetest = stage === 'retest';
  const questions = isRetest ? topic.retest : topic.quiz;
  const answers = (isRetest ? session.retestAnswers : session.answers) || {};
  const submitted = isRetest ? session.retestSubmitted : session.quizSubmitted;
  const heading = isRetest ? '## 复测（2 道新题）' : '## 首测（2 道判别题）';

  if (!Array.isArray(questions) || !questions.length) {
    return heading + '\n\n当前主题没有可导出的题目。';
  }
  if (!submitted) {
    return heading + '\n\n尚未提交，暂无逐题作答记录。';
  }

  const blocks = questions.map((question, index) => {
    const picked = answers[question.id];
    const answered = typeof picked === 'number';
    const correct = answered && picked === question.answer;
    const lines = [
      '### 第 ' + (index + 1) + ' 题',
      '',
      oneLine(question.stem),
      '',
      '- 你的作答：' + (answered ? optionText(question, picked) : '未作答'),
      '- 正确答案：' + optionText(question, question.answer),
      '- 结果：' + (correct ? '本次答对' : '本次答错')
    ];
    if (question.explain) lines.push('- 解析：' + oneLine(question.explain));
    return lines.join('\n');
  });

  return heading + '\n\n' + blocks.join('\n\n');
}

function weakPointsBlock(session, topic) {
  const ids = session.quizResult && Array.isArray(session.quizResult.weak)
    ? session.quizResult.weak
    : [];

  if (!session.quizSubmitted) {
    return '## 疑似断点\n\n首测尚未提交，暂未定位疑似断点。';
  }
  if (!ids.length) {
    return '## 疑似断点\n\n本次未定位明确断点。';
  }

  const rows = ids.map((id) => {
    const node = nodeOf(topic, id);
    const label = node && node.label ? node.label : id;
    const desc = node && node.desc ? '：' + oneLine(node.desc) : '';
    return '- ' + oneLine(label) + desc;
  });
  return '## 疑似断点\n\n' + rows.join('\n');
}

function pathBlock(session, topic) {
  const steps = Array.isArray(topic.path) ? topic.path : [];
  const completed = Array.isArray(session.completedSteps) ? session.completedSteps : [];
  if (!steps.length) {
    return '## 学习路径完成情况\n\n当前主题没有学习路径。';
  }

  const doneCount = steps.filter((step) => completed.indexOf(step.id) !== -1).length;
  const rows = steps.map((step, index) => {
    const done = completed.indexOf(step.id) !== -1;
    const meta = [
      oneLine(step.kind || '学习'),
      (Number(step.minutes) || 0) + ' 分钟'
    ].join(' · ');
    return '- [' + (done ? 'x' : ' ') + '] ' + (index + 1) + '. '
      + oneLine(step.title || ('步骤 ' + (index + 1))) + '（' + meta + '）';
  });

  return '## 学习路径完成情况\n\n'
    + '完成 ' + doneCount + ' / ' + steps.length + '（自报进度，不代表已掌握）\n\n'
    + rows.join('\n');
}

function retestBlock(session, topic) {
  const quiz = session.quizResult;
  const retest = session.retestResult;
  const line = '首测：' + (quiz ? quiz.correct + ' / ' + quiz.total : '未记录')
    + '　→　复测：' + (retest ? retest.correct + ' / ' + retest.total : '未记录');

  if (!session.retestSubmitted) {
    return '## 复测对照\n\n' + line + '\n\n尚未提交复测。完成路径全部步骤后，可用与首测不同的题目复测。';
  }

  const detail = quizBlock(session, topic, 'retest');
  return '## 复测对照\n\n' + line + '\n\n' + detail;
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function stamp(iso) {
  const date = new Date(iso || Date.now());
  if (Number.isNaN(date.getTime())) return '';
  return date.getFullYear()
    + pad2(date.getMonth() + 1)
    + pad2(date.getDate())
    + '-' + pad2(date.getHours())
    + pad2(date.getMinutes());
}

function safeFileName(text) {
  const value = oneLine(text || '记录')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  return (value || '记录').slice(0, 60);
}

function buildSessionMarkdown(session, topic) {
  const title = oneLine(topic.title || topic.shortTitle || '学习诊断');
  const domain = oneLine(topic.domain || '当前主题');
  const date = fmtDate(session.createdAt);

  return [
    '# 智析 AI · 学习诊断记录',
    '',
    '> 本地模式 · 内容来自内置知识库，全部计算在本机完成。',
    '',
    '- 问题：' + oneLine(session.question || '（未记录）'),
    '- 主题：' + domain + ' · ' + title,
    '- 日期：' + date,
    '- 会话编号：' + oneLine(session.id || '（未记录）'),
    '',
    quizBlock(session, topic, 'quiz'),
    '',
    weakPointsBlock(session, topic),
    '',
    pathBlock(session, topic),
    '',
    retestBlock(session, topic),
    '',
    '## 说明',
    '',
    DISCLAIMER
  ].join('\n');
}

export async function exportSessionMarkdown(session, topic) {
  if (!session || !topic) {
    return { ok: false, error: '缺少会话或主题数据' };
  }

  let content = '';
  try {
    content = buildSessionMarkdown(session, topic);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }

  const name = safeFileName(topic.shortTitle || topic.title);
  const filename = '智析AI-' + name + '-' + (stamp(session.createdAt) || stamp()) + '.md';

  try {
    return await exportMarkdown(filename, content);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : '导出失败' };
  }
}

/* ------------------------------------------------------------------ */
/* 教学方案导出                                                        */
/* ------------------------------------------------------------------ */

function sourceLabel(plan, id) {
  const sources = Array.isArray(plan && plan.sources) ? plan.sources : [];
  const found = sources.find((item) => item && item.id === id);
  if (!found) return '';
  const locator = found.locator ? ' · ' + oneLine(found.locator) : '';
  return '《' + oneLine(found.title || '资料') + '》' + locator;
}

function citeLine(plan, ids) {
  const list = Array.isArray(ids) ? ids.map((id) => sourceLabel(plan, id)).filter(Boolean) : [];
  return list.length ? list.join('；') : '未标注来源';
}

function buildPlanMarkdown(plan) {
  const engine = plan.source === 'llm'
    ? '模型生成 · ' + (plan.model || '已配置模型')
    : '本地知识引擎';
  const profile = stageProfile(plan.stage);
  const course = courseInfo(plan.course);
  const isUniversity = profile.id === 'university';
  const outcomeLabel = oneLine(plan.outcomeLabel || profile.outcomeLabel);
  const lines = [];
  lines.push('# 智析 AI · 教学方案');
  lines.push('');
  lines.push('> ' + engine + ' · 方案内容基于资料库来源生成，供教学准备参考。');
  lines.push('');
  lines.push('- 方案标题：' + oneLine(plan.title));
  lines.push('- 学段 / 学科：' + oneLine([plan.stage, plan.subject].filter(Boolean).join(' · ')));
  lines.push('- 教材 / 年级：' + oneLine([plan.textbook, plan.grade].filter(Boolean).join(' · ')));
  lines.push('- 课型 / 时长：' + oneLine(plan.lessonType) + ' · ' + (Number(plan.duration) || 40) + ' 分钟');
  const courseMeta = [
    course.code ? '课程代码 ' + course.code : '',
    course.credits ? course.credits + ' 学分' : '',
    course.hours ? course.hours + ' 学时' : ''
  ].filter(Boolean);
  if (courseMeta.length) lines.push('- 课程信息：' + courseMeta.join(' · '));
  if (course.audience) lines.push('- 授课对象：' + course.audience);
  if (course.assessment) {
    lines.push('- 考核方式：' + oneLine(Array.isArray(course.assessment) ? course.assessment.join('；') : course.assessment));
  }
  lines.push('- 生成时间：' + fmtDate(plan.createdAt || new Date().toISOString()));
  if (plan.tuneLabel) lines.push('- 微调：' + oneLine(plan.tuneLabel));
  if (plan.need) lines.push('- 教师需求：' + oneLine(plan.need));
  lines.push('');
  lines.push('## ' + outcomeLabel);
  lines.push('');
  (Array.isArray(plan.objectives) ? plan.objectives : []).forEach((item, index) => {
    lines.push((index + 1) + '. [' + oneLine(item.level || '理解') + '] ' + oneLine(item.text));
    lines.push('   - 来源：' + citeLine(plan, item.sourceIds));
  });
  lines.push('');
  lines.push('## 重点与难点');
  lines.push('');
  lines.push('- 重点：' + ((plan.keyPoints || []).map(oneLine).join('；') || '未标注'));
  lines.push('- 难点：' + ((plan.difficulties || []).map(oneLine).join('；') || '未标注'));
  lines.push('');
  lines.push('## 前概念与易错点');
  lines.push('');
  (Array.isArray(plan.prerequisites) ? plan.prerequisites : []).forEach((item) => {
    lines.push('- ' + oneLine(item.label) + '：' + oneLine(item.misconception));
    lines.push('  - 来源：' + citeLine(plan, item.sourceIds));
  });
  if (!(plan.prerequisites || []).length) lines.push('- 当前场景未提供前概念数据。');
  lines.push('');
  const total = (plan.flow || []).reduce((sum, item) => sum + (Number(item.minutes) || 0), 0);
  lines.push('## 教学流程（共 ' + total + ' 分钟）');
  lines.push('');
  (Array.isArray(plan.flow) ? plan.flow : []).forEach((item, index) => {
    lines.push('### ' + (index + 1) + '. ' + oneLine(item.phase) + ' · ' + (Number(item.minutes) || 0) + ' 分钟');
    lines.push('');
    lines.push('- 教师活动：' + oneLine(item.teacher));
    lines.push('- 学生活动：' + oneLine(item.student));
    lines.push('- 评价证据：' + oneLine(item.evidence));
    lines.push('- 来源：' + citeLine(plan, item.sourceIds));
    lines.push('');
  });
  lines.push('## ' + (isUniversity ? '考核与评价' : '评价证据'));
  lines.push('');
  (Array.isArray(plan.assessment) ? plan.assessment : []).forEach((item) => {
    lines.push('- [' + oneLine(item.type || '课堂评价') + '] ' + oneLine(item.text));
    lines.push('  - 达成标准：' + oneLine(item.criteria));
  });
  lines.push('');
  const labels = profile.homeworkLabels || { basic: '基础', advanced: '提高', remedial: '补偿' };
  lines.push('## ' + (profile.homeworkTitle || '分层作业'));
  lines.push('');
  lines.push('### ' + labels.basic);
  lines.push('');
  const homework = plan.homework || {};
  (homework.basic || []).forEach((text) => lines.push('- ' + oneLine(text)));
  lines.push('');
  lines.push('### ' + labels.advanced);
  lines.push('');
  (homework.advanced || []).forEach((text) => lines.push('- ' + oneLine(text)));
  lines.push('');
  lines.push('### ' + labels.remedial);
  lines.push('');
  (homework.remedial || []).forEach((text) => lines.push('- ' + oneLine(text)));
  lines.push('');
  if (isUniversity) {
    const readingList = course.reading.length
      ? course.reading
      : (Array.isArray(plan.sources) ? plan.sources : [])
          .filter((source) => ['论文', '阅读', '外部', '讲义'].indexOf(source.type) !== -1)
          .map((source) => '《' + oneLine(source.title) + '》' + (source.locator ? ' · ' + oneLine(source.locator) : ''));
    lines.push('## 阅读材料');
    lines.push('');
    if (readingList.length) readingList.forEach((text) => lines.push('- ' + oneLine(text)));
    else lines.push('- 按课程大纲指定的教材章节与阅读材料完成课前 reading。');
    lines.push('');
  }
  const differentiation = plan.differentiation || {};
  lines.push('## 差异化支持');
  lines.push('');
  lines.push('- 学习支持：' + ((differentiation.support || []).map(oneLine).join('；') || '未标注'));
  lines.push('- 拓展任务：' + ((differentiation.extension || []).map(oneLine).join('；') || '未标注'));
  lines.push('');
  if (isUniversity) {
    lines.push('## 学术诚信');
    lines.push('');
    lines.push('- 独立完成作业与考试，不抄袭、不代写。');
    lines.push('- 引用他人观点、数据与代码须标注出处，并按课程规定的引用格式著录。');
    lines.push('- 小组项目需注明个人分工与贡献，禁止将他人成果据为己有。');
    lines.push('');
  }
  lines.push('## 风险与替代方案');
  lines.push('');
  (Array.isArray(plan.risks) ? plan.risks : []).forEach((item) => {
    lines.push('- 风险：' + oneLine(item.risk));
    lines.push('  - 替代方案：' + oneLine(item.fallback));
  });
  lines.push('');
  lines.push('## 资料来源');
  lines.push('');
  lines.push('| 类型 | 标题 | 位置 | 可信度 | 引用次数 |');
  lines.push('| --- | --- | --- | --- | --- |');
  (Array.isArray(plan.sources) ? plan.sources : []).forEach((source) => {
    lines.push('| ' + oneLine(source.type || '资料') + ' | ' + oneLine(source.title)
      + ' | ' + oneLine(source.locator) + ' | '
      + Math.round((Number(source.confidence) || 0) * 100) + '% | '
      + (Number(source.cited) || 0) + ' |');
  });
  if (!(plan.sources || []).length) lines.push('| — | 当前方案未提供资料源 | — | — | 0 |');
  lines.push('');
  lines.push('## 质量检查');
  lines.push('');
  (Array.isArray(plan.quality) ? plan.quality : []).forEach((item) => {
    lines.push('- [' + (item.status === 'pass' ? '通过' : '提醒') + '] ' + oneLine(item.label) + '：' + oneLine(item.detail));
  });
  if (!(plan.quality || []).length) lines.push('- 尚未运行质量检查。');
  lines.push('');
  lines.push('## 免责声明');
  lines.push('');
  lines.push('本方案由' + (plan.source === 'llm' ? '教师配置的模型' : '本地知识引擎')
    + '基于资料库来源生成，仅供教学准备参考，不替代教师的专业判断，也不代表真实课堂效果或学生数据。'
    + '引用内容请以' + (isUniversity ? '教材、课程大纲' : '教材、课标') + '原文为准。');
  return lines.join('\n');
}

/**
 * 导出教学方案 Markdown。
 * 桌面端写入 Documents，浏览器降级为下载。
 */
export async function exportPlanMarkdown(plan) {
  if (!plan || typeof plan !== 'object') {
    return { ok: false, error: '缺少方案数据' };
  }
  let content = '';
  try {
    content = buildPlanMarkdown(plan);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
  const name = safeFileName(plan.title || '教学方案');
  const filename = '智析AI-教学方案-' + name + '-' + (stamp(plan.createdAt) || stamp()) + '.md';
  try {
    return await exportMarkdown(filename, content);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : '导出失败' };
  }
}
