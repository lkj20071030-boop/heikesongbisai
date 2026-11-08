/* 智析 AI · 教学方案生成引擎
 *
 * 纯本地模板引擎：按课型 / 课时 / 学情 / 约束组装完整方案。
 * 配置模型 Key 时优先调用模型，失败或超时回退本地引擎。
 * 所有引用都限定在场景 sources 内，不编造来源。
 */

import { state, actions, persist } from './store.js';

const STAGE_IDS = ['retrieve', 'graph', 'compose', 'check'];

export const PLAN_STAGES = [
  { id: 'retrieve', label: '检索资料', hint: '筛选教材、课标、解读与校本资料' },
  { id: 'graph', label: '构建图谱', hint: '按前置关系组织概念与易错点' },
  { id: 'compose', label: '生成方案', hint: '组装目标、流程、评价与分层作业' },
  { id: 'check', label: '质量检查', hint: '核对来源覆盖、时间预算与活动多样性' }
];

export const PLAN_TUNES = [
  { key: 'simpler', label: '更基础', title: '降低目标层级，补充前概念补偿与基础作业' },
  { key: 'harder', label: '更挑战', title: '增加迁移任务与开放探究' },
  { key: 'compress', label: '压缩到 40 分钟', title: '重排时间轴，删减非核心活动' },
  { key: 'hands-on', label: '增加动手活动', title: '替换为动手活动，并补充材料替代方案' }
];

export const LESSON_TYPES = ['新授课', '复习课', '单元设计', '项目式学习', '分层辅导'];
export const LEVELS = ['基础薄弱', '混合', '拔尖'];
export const CONSTRAINTS = ['无实验器材', '只有投影', '大班额', '需要分层作业'];

const TUNE_IDS = PLAN_TUNES.map((item) => item.key);

const K12_CONSTRAINTS = ['无实验器材', '只有投影', '大班额', '需要分层作业'];

const K12_QUALITY = [
  { key: 'objective-source', label: '目标来源覆盖' },
  { key: 'standard', label: '课标对齐' },
  { key: 'time', label: '时间预算' },
  { key: 'misconception', label: '易错点覆盖' },
  { key: 'activity', label: '活动多样性' }
];

const UNIVERSITY_QUALITY = [
  { key: 'objective-source', label: '目标来源覆盖' },
  { key: 'syllabus', label: '大纲对齐' },
  { key: 'duration', label: '学时匹配' },
  { key: 'misconception', label: '易错点覆盖' },
  { key: 'assessment', label: '考核对应' },
  { key: 'reading', label: '阅读量' },
  { key: 'integrity', label: '学术诚信' }
];

/* 学段剖面：UI 与引擎的唯一学段差异来源。
 * durations 用于时长分段，durationRange 用于引擎校验（兼容历史 40 分钟高中课时），
 * compressDuration 是「压缩」微调的目标时长。 */
export const STAGE_PROFILES = {
  小学: {
    id: 'primary',
    stage: '小学',
    durations: [40],
    defaultDuration: 40,
    compressDuration: 30,
    durationRange: [30, 40],
    lessonTypes: ['新授课', '活动课', '复习课', '单元设计', '分层辅导'],
    defaultLessonType: '新授课',
    levels: LEVELS,
    constraints: K12_CONSTRAINTS,
    flowPhases: ['导入', '活动', '建构', '应用', '总结'],
    outcomeLabel: '学习目标',
    durationLabel: '分钟',
    maxPhases: 5,
    handsOnIndex: 1,
    homeworkTitle: '分层作业',
    homeworkSub: '基础 / 提高 / 补偿',
    homeworkLabels: { basic: '基础', advanced: '提高', remedial: '补偿' },
    quality: K12_QUALITY
  },
  初中: {
    id: 'junior',
    stage: '初中',
    durations: [40, 45],
    defaultDuration: 40,
    compressDuration: 35,
    durationRange: [35, 45],
    lessonTypes: ['新授课', '复习课', '实验课', '单元设计', '分层辅导'],
    defaultLessonType: '新授课',
    levels: LEVELS,
    constraints: K12_CONSTRAINTS,
    flowPhases: ['导入', '探究', '建构', '训练', '总结'],
    outcomeLabel: '学习目标',
    durationLabel: '分钟',
    maxPhases: 5,
    handsOnIndex: 1,
    homeworkTitle: '分层作业',
    homeworkSub: '基础 / 提高 / 补偿',
    homeworkLabels: { basic: '基础', advanced: '提高', remedial: '补偿' },
    quality: K12_QUALITY
  },
  高中: {
    id: 'senior',
    stage: '高中',
    durations: [45, 90],
    defaultDuration: 45,
    compressDuration: 40,
    durationRange: [40, 90],
    lessonTypes: ['新授课', '复习课', '实验课', '专题复习', '项目式学习'],
    defaultLessonType: '新授课',
    levels: LEVELS,
    constraints: K12_CONSTRAINTS.concat('实验室排期'),
    flowPhases: ['情境', '探究', '建构', '变式', '总结'],
    outcomeLabel: '学习目标',
    durationLabel: '分钟',
    maxPhases: 5,
    handsOnIndex: 1,
    homeworkTitle: '分层作业',
    homeworkSub: '基础 / 提高 / 补偿',
    homeworkLabels: { basic: '基础', advanced: '提高', remedial: '补偿' },
    quality: K12_QUALITY
  },
  大学: {
    id: 'university',
    stage: '大学',
    durations: [45, 90, 120],
    defaultDuration: 90,
    compressDuration: 60,
    durationRange: [45, 120],
    lessonTypes: ['讲授', '研讨', '实验', '上机', '课程大纲', '复习'],
    defaultLessonType: '讲授',
    levels: LEVELS,
    constraints: ['无助教', '机房不足', '大班额', '双语教学', '课程思政', '需要阅读材料'],
    flowPhases: ['课前阅读', '问题导入', '讲授/推导', '案例/讨论', '课堂练习', '小结', '课后任务'],
    outcomeLabel: '课程目标',
    durationLabel: '学时',
    maxPhases: 7,
    handsOnIndex: 3,
    preReadingPhase: '课前阅读',
    homeworkTitle: '课后作业与阅读',
    homeworkSub: 'Problem Set / 报告 / 阅读',
    homeworkLabels: { basic: 'Problem Set', advanced: 'Project / 报告', remedial: 'Reading' },
    quality: UNIVERSITY_QUALITY
  }
};

export function stageProfile(stage) {
  return STAGE_PROFILES[textOf(stage)] || STAGE_PROFILES['小学'];
}

export function planTunes(stage) {
  const profile = stageProfile(stage);
  return PLAN_TUNES.map((item) => {
    if (item.key === 'compress') {
      return {
        ...item,
        label: `压缩到 ${profile.compressDuration} 分钟`,
        title: `重排时间轴到 ${profile.compressDuration} 分钟，删减非核心活动`
      };
    }
    if (item.key === 'hands-on' && profile.outcomeLabel === '课程目标') {
      return {
        ...item,
        label: '增加实践环节',
        title: '替换为推导、实验或上机等实践环节，并补充环境与安全说明'
      };
    }
    return item;
  });
}

const TYPE_PHASES = {
  小学: {
    活动课: ['任务导入', '动手活动', '交流建构', '应用迁移', '总结评价']
  },
  初中: {
    复习课: ['知识回顾', '错因诊断', '结构梳理', '变式训练', '复测反馈'],
    实验课: ['问题提出', '实验设计', '分组实验', '数据处理', '结论交流'],
    单元设计: ['单元导览', '核心探究', '知识建构', '综合应用', '单元总结'],
    分层辅导: ['学情诊断', '分层任务', '针对讲解', '独立练习', '反馈订正']
  },
  高中: {
    复习课: ['知识回顾', '错因诊断', '结构梳理', '变式训练', '复测反馈'],
    实验课: ['实验目标', '方案设计', '分组实验', '数据分析', '误差与结论'],
    专题复习: ['专题定位', '典例剖析', '方法建构', '限时训练', '讲评提升'],
    项目式学习: ['项目导入', '任务分解', '协作探究', '成果展示', '反思总结']
  },
  大学: {
    讲授: ['课前阅读', '问题导入', '概念讲授', '推导演示', '案例讨论', '课堂练习', '小结与课后'],
    研讨: ['课前阅读', '问题聚焦', '小组研讨', '观点汇报', '教师点评', '共识梳理', '课后写作'],
    实验: ['课前阅读', '原理回顾', '操作演示', '分组实验', '数据处理', '误差讨论', '实验报告'],
    上机: ['课前阅读', '任务说明', '代码讲解', '结对编程', '调试与测试', '提交检查', '课后练习'],
    课程大纲: ['课程定位', '目标与毕业要求', '内容与进度', '学时分配', '考核与评分', '资源与阅读', '学术规范'],
    复习: ['知识回顾', '疑难诊断', '结构梳理', '综合练习', '讲评', '小结', '课后巩固']
  }
};

/* ------------------------------------------------------------------ */
/* 内置最小场景（data/teacherTopics.js 就绪后以其为准）                  */
/* ------------------------------------------------------------------ */

const FALLBACK_SCENARIOS = [
  {
    id: 'science-circuit',
    stage: '小学',
    subject: '科学',
    grade: '六年级上册',
    textbook: '教科版',
    unit: '第一单元《电》',
    title: '简单电路',
    summary: '从点亮一个小灯泡出发，理解电源、用电器、导线与开关如何组成通路。',
    needExamples: [
      '把「简单电路」上成一节 40 分钟的新授课，学生动手经验少，只有投影可用。',
      '复习课：学生分不清通路和短路，需要 40 分钟梳理并做变式练习。',
      '没有实验器材，用生活物品设计一节电路探究课。'
    ],
    sources: [
      {
        id: 'sc-s1',
        type: '教材',
        title: '义务教育教科书·科学 六年级上册',
        locator: '第一单元《电》· 第 3 课 简易电路',
        excerpt: '用导线把电池、小灯泡和开关连接起来，形成电流通路，小灯泡就会发光。',
        confidence: 0.95
      },
      {
        id: 'sc-s2',
        type: '课标',
        title: '义务教育科学课程标准（2022 年版）',
        locator: '物质科学 · 电与磁',
        excerpt: '通过实验认识简单电路，能连接简易电路并描述电流的通路。',
        confidence: 0.93
      },
      {
        id: 'sc-s3',
        type: '解读',
        title: '科学六年级上册教师教学用书',
        locator: '第一单元 教学建议',
        excerpt: '教学应先让学生尝试连接，再由「亮与不亮」归纳通路、断路与短路。',
        confidence: 0.88
      },
      {
        id: 'sc-s4',
        type: '校本',
        title: '校本实验记录单：点亮小灯泡',
        locator: '六年级科学 · 实验 1',
        excerpt: '记录连接方式、灯泡亮度与故障原因，用作课堂评价证据。',
        confidence: 0.82
      }
    ],
    graph: {
      nodes: [
        { id: 'battery', label: '电源', layer: 0, kind: 'concept', desc: '为电路提供持续电流的装置。', sourceIds: ['sc-s1'] },
        { id: 'bulb', label: '用电器', layer: 0, kind: 'concept', desc: '把电能转化为光能等其它形式的装置。', sourceIds: ['sc-s1'] },
        { id: 'wire', label: '导线与连接', layer: 1, kind: 'skill', desc: '用导线把各元件连成闭合回路。', sourceIds: ['sc-s1', 'sc-s4'] },
        { id: 'path', label: '通路与断路', layer: 2, kind: 'concept', desc: '电流能通过的路径叫通路，断开处叫断路。', sourceIds: ['sc-s1', 'sc-s3'] },
        { id: 'switch', label: '开关的作用', layer: 2, kind: 'concept', desc: '开关控制电路的通与断，不改变电源电压。', sourceIds: ['sc-s2', 'sc-s3'] },
        { id: 'circuit', label: '简单电路', layer: 3, kind: 'concept', desc: '由电源、用电器、导线和开关组成的闭合电路。', sourceIds: ['sc-s1', 'sc-s2'] }
      ],
      edges: [
        { from: 'battery', to: 'path', relation: '提供电流', confidence: 0.94, basis: '没有电源就没有持续电流，通路概念依赖电源。', sourceIds: ['sc-s1'] },
        { from: 'bulb', to: 'path', relation: '显示通路', confidence: 0.9, basis: '灯泡亮灭是判断通路最直接的观察证据。', sourceIds: ['sc-s1', 'sc-s4'] },
        { from: 'wire', to: 'path', relation: '构成回路', confidence: 0.92, basis: '导线连接形成闭合路径，是通路成立的条件。', sourceIds: ['sc-s1'] },
        { from: 'switch', to: 'circuit', relation: '控制通断', confidence: 0.86, basis: '开关是简单电路的标准组成部分。', sourceIds: ['sc-s2', 'sc-s3'] },
        { from: 'path', to: 'circuit', relation: '核心条件', confidence: 0.95, basis: '只有形成通路，简单电路才真正工作。', sourceIds: ['sc-s1', 'sc-s3'] }
      ]
    },
    objectives: [
      { text: '能说出简单电路由电源、用电器、导线和开关组成，并指认各元件。', level: '理解', sourceIds: ['sc-s1', 'sc-s2'] },
      { text: '能连接一个能点亮小灯泡的简单电路，并说明电流的通路。', level: '应用', sourceIds: ['sc-s1', 'sc-s4'] },
      { text: '能根据灯泡亮灭判断通路、断路与短路，并提出排查思路。', level: '分析', sourceIds: ['sc-s3', 'sc-s4'] }
    ],
    keyPoints: ['简单电路的四个组成部分', '通路与断路的区别', '开关控制电路通断'],
    difficulties: ['连接时形成闭合回路', '区分断路与短路'],
    misconceptions: [
      { nodeId: 'path', label: '通路与断路', misconception: '认为只要导线碰到灯泡就一定有电流，忽略回路是否闭合。', sourceIds: ['sc-s3', 'sc-s4'] },
      { nodeId: 'switch', label: '开关的作用', misconception: '认为开关会改变灯泡亮度或消耗电流。', sourceIds: ['sc-s2'] },
      { nodeId: 'battery', label: '电源', misconception: '认为电池越多灯泡一定越亮，忽略额定电压。', sourceIds: ['sc-s1'] }
    ],
    flowTemplate: [
      { phase: '导入', minutes: 5, teacher: '出示不亮的小灯泡，请学生猜测原因并记录三种猜想。', student: '观察灯泡与电池，提出「没电、没接好、开关没开」等猜想。', evidence: '学生能说出至少两种可能原因。', sourceIds: ['sc-s3'] },
      { phase: '探究', minutes: 12, teacher: '分组发放电池、导线、灯泡，示范连接要点，巡视并提示回路要闭合。', student: '按记录单尝试连接，观察灯泡亮灭并画出连接图。', evidence: '实验记录单上的连接图与亮灭记录。', sourceIds: ['sc-s1', 'sc-s4'] },
      { phase: '建构', minutes: 10, teacher: '用投影对比亮与不亮的连接图，归纳通路、断路与短路。', student: '修正自己的连接图，用「闭合回路」解释灯泡发亮。', evidence: '学生能用通路概念解释本组结果。', sourceIds: ['sc-s1', 'sc-s3'] },
      { phase: '应用', minutes: 9, teacher: '给出三个故障电路图，请学生判断故障并说明排查顺序。', student: '同桌讨论后上台指认故障点，说明先查电源再查连接。', evidence: '故障判断正确率与排查顺序说明。', sourceIds: ['sc-s3', 'sc-s4'] },
      { phase: '总结', minutes: 4, teacher: '引导学生用一句话概括简单电路的工作条件。', student: '完成出口条：写出简单电路的组成与通路条件。', evidence: '出口条能覆盖组成与通路两个要点。', sourceIds: ['sc-s2'] }
    ],
    activities: {
      basic: ['按图示连接一个简单电路并点亮灯泡。', '判断三个电路图是否形成通路。'],
      advanced: ['设计两种让灯泡熄灭的方法并说明原因。', '用替换法排查一个故障电路。'],
      'hands-on': ['用电池、导线、小灯泡和回形针制作一个简易开关并测试。']
    },
    assessment: [
      { type: '过程观察', text: '观察小组连接过程，记录是否形成闭合回路。', criteria: '能独立完成连接且灯泡点亮。' },
      { type: '记录单', text: '检查实验记录单上的连接图与故障判断。', criteria: '连接图完整，能标出断路位置。' },
      { type: '出口条', text: '用一句话写出简单电路的工作条件。', criteria: '同时提到组成与通路。' }
    ],
    homework: {
      basic: ['画出简单电路图并标出电源、用电器、导线、开关。', '完成练习册第 12 页第 1–3 题。'],
      advanced: ['在家中找两件用电器，画出它们的电路连接示意图。'],
      remedial: ['用箭头在电路图上标出电流路径。', '向同伴口述通路与断路的区别。']
    },
    differentiation: {
      support: ['提供带编号的连接图示，降低动手门槛。', '用「亮/不亮」二选一记录单替代开放描述。'],
      extension: ['尝试用两个灯泡设计串联电路并预测亮度。', '为教室设计一个双开关控制方案。']
    },
    risks: [
      { risk: '实验器材不足，无法分组操作。', fallback: '改用电池盒与发光二极管做示范，学生用连接图表示。' },
      { risk: '学生把短路当作通路。', fallback: '用投影对比短路与通路的电流路径，增加一题辨析。' }
    ],
    classProfile: {
      className: '六年级（2）班',
      sampleSize: 38,
      term: '2026 秋季学期',
      weakPoints: [
        { label: '通路与断路', ratio: 0.47, trend: 'up' },
        { label: '开关的作用', ratio: 0.39, trend: 'flat' },
        { label: '导线与连接', ratio: 0.28, trend: 'down' }
      ]
    }
  },
  {
    id: 'math-linear',
    stage: '初中',
    subject: '数学',
    grade: '八年级上册',
    textbook: '北师大版',
    unit: '第四章 一次函数',
    title: '一次函数',
    summary: '从变量关系出发，理解一次函数 y = kx + b 的图象、斜率与截距。',
    needExamples: [
      '把「一次函数」上成一节 40 分钟的新授课，学生基础中等，需要分层作业。',
      '复习课：学生分不清 k 和 b 对图象的影响，安排 40 分钟变式训练。',
      '大班额条件下设计一次函数图象探究课。'
    ],
    sources: [
      {
        id: 'ml-s1',
        type: '教材',
        title: '义务教育教科书·数学 八年级上册',
        locator: '第四章 一次函数 · 第 2 节 一次函数',
        excerpt: '若两个变量 x、y 之间的关系可以表示成 y = kx + b（k、b 为常数，k ≠ 0），则称 y 是 x 的一次函数。',
        confidence: 0.96
      },
      {
        id: 'ml-s2',
        type: '课标',
        title: '义务教育数学课程标准（2022 年版）',
        locator: '函数 · 一次函数',
        excerpt: '结合具体情境理解一次函数的意义，能画出图象并利用图象解决简单问题。',
        confidence: 0.94
      },
      {
        id: 'ml-s3',
        type: '解读',
        title: '数学八年级上册教师教学用书',
        locator: '第四章 教学建议',
        excerpt: '应通过列表、描点、连线让学生经历图象形成过程，避免直接记忆性质。',
        confidence: 0.89
      },
      {
        id: 'ml-s4',
        type: '校本',
        title: '校本错题归因卡：一次函数',
        locator: '八年级数学 · 单元 4',
        excerpt: '常见错误是把 b 的变化误认为斜率变化，或忽略 k ≠ 0 的条件。',
        confidence: 0.84
      }
    ],
    graph: {
      nodes: [
        { id: 'variable', label: '变量与函数', layer: 0, kind: 'concept', desc: '在一个变化过程中，数值发生变化的量叫变量。', sourceIds: ['ml-s1'] },
        { id: 'proportion', label: '正比例函数', layer: 1, kind: 'concept', desc: '形如 y = kx（k ≠ 0）的函数，图象过原点。', sourceIds: ['ml-s1', 'ml-s2'] },
        { id: 'definition', label: '一次函数的定义', layer: 2, kind: 'concept', desc: 'y = kx + b（k ≠ 0）的函数叫一次函数。', sourceIds: ['ml-s1'] },
        { id: 'slope', label: 'k 的几何意义', layer: 2, kind: 'skill', desc: 'k 决定直线的倾斜方向与增减性。', sourceIds: ['ml-s1', 'ml-s3'] },
        { id: 'intercept', label: 'b 的几何意义', layer: 2, kind: 'skill', desc: 'b 是直线与 y 轴交点的纵坐标。', sourceIds: ['ml-s1', 'ml-s3'] },
        { id: 'linear', label: '一次函数的图象与性质', layer: 3, kind: 'concept', desc: '一次函数的图象是一条直线，由 k 与 b 共同确定。', sourceIds: ['ml-s1', 'ml-s2', 'ml-s4'] }
      ],
      edges: [
        { from: 'variable', to: 'proportion', relation: '函数特例', confidence: 0.93, basis: '正比例函数是变量关系的一种特殊形式。', sourceIds: ['ml-s1'] },
        { from: 'proportion', to: 'definition', relation: '推广', confidence: 0.9, basis: '把 y = kx 推广到 y = kx + b 即得一次函数。', sourceIds: ['ml-s1', 'ml-s3'] },
        { from: 'slope', to: 'linear', relation: '决定增减', confidence: 0.92, basis: 'k 的符号决定图象上升或下降。', sourceIds: ['ml-s1', 'ml-s3'] },
        { from: 'intercept', to: 'linear', relation: '决定截距', confidence: 0.91, basis: 'b 决定直线与 y 轴的交点位置。', sourceIds: ['ml-s1', 'ml-s3'] },
        { from: 'definition', to: 'linear', relation: '解析式基础', confidence: 0.95, basis: '先识别解析式，才能研究图象与性质。', sourceIds: ['ml-s1', 'ml-s2'] }
      ]
    },
    objectives: [
      { text: '能识别一次函数解析式，说明 k ≠ 0 与 b 为常数的条件。', level: '理解', sourceIds: ['ml-s1', 'ml-s2'] },
      { text: '能列表、描点、连线画出一 次函数的图象，并说出 k、b 对图象的影响。', level: '应用', sourceIds: ['ml-s1', 'ml-s3'] },
      { text: '能根据图象判断函数的增减性，并解决简单的实际情境问题。', level: '分析', sourceIds: ['ml-s2', 'ml-s4'] }
    ],
    keyPoints: ['一次函数的定义与条件', 'k 决定增减性', 'b 决定与 y 轴的交点'],
    difficulties: ['k 与 b 对图象影响的区分', '从图象反推解析式'],
    misconceptions: [
      { nodeId: 'slope', label: 'k 的几何意义', misconception: '把 b 的变化当成斜率变化，认为 b 越大直线越陡。', sourceIds: ['ml-s4'] },
      { nodeId: 'definition', label: '一次函数的定义', misconception: '忽略 k ≠ 0，把常函数也当作一次函数。', sourceIds: ['ml-s1', 'ml-s4'] },
      { nodeId: 'intercept', label: 'b 的几何意义', misconception: '认为 b 是直线与 x 轴的交点。', sourceIds: ['ml-s3', 'ml-s4'] }
    ],
    flowTemplate: [
      { phase: '导入', minutes: 5, teacher: '给出出租车计费情境，请学生写出费用与里程的关系式。', student: '尝试用含字母的式子表示费用，比较不同写法的差异。', evidence: '学生能写出形如 y = kx + b 的关系式。', sourceIds: ['ml-s1'] },
      { phase: '探究', minutes: 12, teacher: '组织列表、描点、连线，比较 k 相同 b 不同与 b 相同 k 不同的两组图象。', student: '分组画图并在坐标系中比较多条直线的位置。', evidence: '图象绘制正确，能指出直线变化。', sourceIds: ['ml-s1', 'ml-s3'] },
      { phase: '建构', minutes: 10, teacher: '引导学生归纳 k 决定增减、b 决定截距，并强调 k ≠ 0。', student: '用自己的话填写「k、b 作用」对照表。', evidence: '对照表能正确区分 k 与 b。', sourceIds: ['ml-s1', 'ml-s2'] },
      { phase: '应用', minutes: 9, teacher: '给出图象与解析式互推的三道变式题，巡视并收集典型错误。', student: '独立完成变式题，同桌交换检查并说明理由。', evidence: '变式题正确率与错误说明。', sourceIds: ['ml-s3', 'ml-s4'] },
      { phase: '总结', minutes: 4, teacher: '用一道出口题检测「k、b 作用」是否混淆。', student: '完成出口题并自评易错点。', evidence: '出口题能正确判断图象变化。', sourceIds: ['ml-s2'] }
    ],
    activities: {
      basic: ['给出解析式，判断是否为一次函数并说明理由。', '在方格纸上画出给定一次函数的图象。'],
      advanced: ['根据两条直线的位置关系反推 k、b 的符号。', '设计一个可用一次函数描述的生活情境。'],
      'hands-on': ['用坐标纸和透明片叠加比较不同 k、b 的直线。']
    },
    assessment: [
      { type: '课堂练习', text: '完成图象与解析式互推的变式题。', criteria: '能正确写出解析式并说明 k、b 的作用。' },
      { type: '同伴互评', text: '交换检查图象绘制与对照表。', criteria: '能指出对方的一处错误并给出修正。' },
      { type: '出口条', text: '判断两条直线 k、b 的变化。', criteria: '判断正确且理由完整。' }
    ],
    homework: {
      basic: ['完成教材第 79 页练习第 1–3 题。', '写出三个一次函数并标出 k、b。'],
      advanced: ['根据图象信息求一次函数解析式。', '比较两个一次函数图象的交点意义。'],
      remedial: ['用表格整理 k > 0、k < 0 时图象的走向。', '在坐标系中描出 y = 2x 与 y = 2x + 3 的三组点。']
    },
    differentiation: {
      support: ['提供带坐标网格的半成品图象。', '用颜色标注 k 与 b 对应的变化。'],
      extension: ['研究一次函数与二元一次方程的联系。', '用一次函数模型解释分段计费问题。']
    },
    risks: [
      { risk: '学生把 b 当作斜率，图象判断失误。', fallback: '用透明片叠加同一 k 不同 b 的直线，直观对比。' },
      { risk: '大班额下个别指导不足。', fallback: '设置同桌互评与错例投影讲评，集中处理共性错误。' }
    ],
    classProfile: {
      className: '八年级（5）班',
      sampleSize: 45,
      term: '2026 秋季学期',
      weakPoints: [
        { label: 'k 的几何意义', ratio: 0.51, trend: 'up' },
        { label: '一次函数的定义', ratio: 0.42, trend: 'flat' },
        { label: 'b 的几何意义', ratio: 0.33, trend: 'down' }
      ]
    }
  },
  {
    id: 'physics-newton2',
    stage: '高中',
    subject: '物理',
    grade: '高一',
    textbook: '人教版',
    unit: '必修第一册 · 第四章 运动和力的关系',
    title: '牛顿第二定律',
    summary: '理解合力、质量与加速度的定量关系，分清加速度方向与速度方向。',
    needExamples: [
      '把「牛顿第二定律」上成一节 40 分钟的新授课，学生基础中等，实验室不可用。',
      '复习课：学生总把加速度方向当成速度方向，安排 40 分钟错因诊断。',
      '大班额、只有投影，设计一节牛顿第二定律应用课。'
    ],
    sources: [
      {
        id: 'nw-s1',
        type: '教材',
        title: '普通高中教科书·物理 必修第一册',
        locator: '第四章 运动和力的关系 · 第 3 节 牛顿第二定律',
        excerpt: '物体加速度的大小跟它受到的作用力成正比、跟它的质量成反比，加速度的方向跟作用力的方向相同。',
        confidence: 0.97
      },
      {
        id: 'nw-s2',
        type: '课标',
        title: '普通高中物理课程标准（2017 年版 2020 年修订）',
        locator: '必修课程 · 相互作用与运动规律',
        excerpt: '通过实验探究加速度与物体受力、物体质量的关系，理解牛顿运动定律。',
        confidence: 0.95
      },
      {
        id: 'nw-s3',
        type: '解读',
        title: '物理必修第一册教师教学用书',
        locator: '第四章 教学建议 · 牛顿第二定律',
        excerpt: '教学应突出 F 指合力、加速度方向与合力方向一致，并与速度方向明确区分。',
        confidence: 0.91
      },
      {
        id: 'nw-s4',
        type: '校本',
        title: '校本学情卡：力学前概念',
        locator: '高一年级 · 力学起点测',
        excerpt: '约四成学生把加速度方向与速度方向混同，或在代入公式时使用单个力。',
        confidence: 0.84
      }
    ],
    graph: {
      nodes: [
        { id: 'force', label: '力与合力', layer: 0, kind: 'concept', desc: '力是物体间的相互作用，多个力可按矢量法则合成一个合力。', sourceIds: ['nw-s1'] },
        { id: 'mass', label: '质量与惯性', layer: 0, kind: 'concept', desc: '质量是惯性大小的量度，在经典力学中与运动状态无关。', sourceIds: ['nw-s1', 'nw-s3'] },
        { id: 'velocity', label: '速度与加速度的区别', layer: 1, kind: 'concept', desc: '速度描述位置变化快慢，加速度描述速度变化快慢。', sourceIds: ['nw-s3', 'nw-s4'] },
        { id: 'vector', label: '矢量的合成与分解', layer: 1, kind: 'skill', desc: '力、速度、加速度都是矢量，按平行四边形法则或正交分解运算。', sourceIds: ['nw-s1'] },
        { id: 'fma', label: '合力与加速度的定量关系', layer: 2, kind: 'skill', desc: '加速度与合力成正比、与质量成反比。', sourceIds: ['nw-s1', 'nw-s2'] },
        { id: 'direction', label: '加速度方向由合力决定', layer: 2, kind: 'concept', desc: '加速度方向始终与合力方向相同，与速度方向无必然联系。', sourceIds: ['nw-s2', 'nw-s3'] },
        { id: 'newton2', label: '牛顿第二定律', layer: 3, kind: 'concept', desc: 'F合 = ma，加速度方向与合力方向相同。', sourceIds: ['nw-s1', 'nw-s3'] }
      ],
      edges: [
        { from: 'force', to: 'fma', relation: '合力前提', confidence: 0.95, basis: '定律中的 F 指合力，不会求合力就无法代入公式。', sourceIds: ['nw-s1'] },
        { from: 'mass', to: 'fma', relation: '比例关系', confidence: 0.93, basis: '质量出现在定律的分母位置，是加速度差异的原因。', sourceIds: ['nw-s1', 'nw-s3'] },
        { from: 'velocity', to: 'direction', relation: '概念辨析', confidence: 0.74, basis: '混淆速度方向与加速度方向是本主题最常见的错误前提。', sourceIds: ['nw-s4'] },
        { from: 'vector', to: 'force', relation: '工具支撑', confidence: 0.88, basis: '求合力需要矢量合成或正交分解。', sourceIds: ['nw-s1'] },
        { from: 'fma', to: 'newton2', relation: '定量表述', confidence: 0.96, basis: '定量关系是牛顿第二定律的核心内容。', sourceIds: ['nw-s1'] },
        { from: 'direction', to: 'newton2', relation: '方向条件', confidence: 0.95, basis: '方向关系是定律不可分割的一部分。', sourceIds: ['nw-s2', 'nw-s3'] }
      ]
    },
    objectives: [
      { text: '能说出牛顿第二定律的内容，写出 F合 = ma，并说明各量的单位。', level: '理解', sourceIds: ['nw-s1', 'nw-s2'] },
      { text: '能对水平面上的物体做受力分析，求出合力并计算加速度。', level: '应用', sourceIds: ['nw-s1', 'nw-s3'] },
      { text: '能解释「加速度方向由合力决定」，区分加速度方向与速度方向。', level: '分析', sourceIds: ['nw-s2', 'nw-s3'] },
      { text: '能用牛顿第二定律解释生活中的加速与减速现象。', level: '迁移', sourceIds: ['nw-s1', 'nw-s4'] }
    ],
    keyPoints: ['F合 = ma 的定量关系', '合力方向决定加速度方向', '单位 N = kg·m/s²'],
    difficulties: ['合力的求解与方向判断', '加速度方向与速度方向的区分'],
    misconceptions: [
      { nodeId: 'velocity', label: '速度与加速度的区别', misconception: '认为速度不为零就一定有加速度，或加速度方向总与速度同向。', sourceIds: ['nw-s3', 'nw-s4'] },
      { nodeId: 'force', label: '力与合力', misconception: '把某一个力直接当作合力代入公式。', sourceIds: ['nw-s1', 'nw-s3'] },
      { nodeId: 'mass', label: '质量与惯性', misconception: '认为速度越大惯性越大，或质量随运动状态改变。', sourceIds: ['nw-s1', 'nw-s4'] }
    ],
    flowTemplate: [
      { phase: '导入', minutes: 5, teacher: '播放汽车加速与刹车短片，追问「加速度方向由什么决定」，收集学生直觉判断。', student: '观察并判断加速、刹车时加速度方向，写下理由。', evidence: '学生能说出至少一种判断依据，暴露方向混淆。', sourceIds: ['nw-s4'] },
      { phase: '探究', minutes: 12, teacher: '用小车、钩码与投影展示，改变拉力与质量，引导记录 a 与 F、m 的关系。', student: '记录实验数据，尝试用比值描述 a 与 F、m 的关系。', evidence: '数据表能体现 a 随 F 增大、随 m 减小。', sourceIds: ['nw-s1', 'nw-s2'] },
      { phase: '建构', minutes: 10, teacher: '结合数据归纳 F合 = ma，强调 F 是合力、方向与加速度一致。', student: '用自己的话复述定律，标出公式中各量的单位。', evidence: '能正确写出公式并说明合力与方向。', sourceIds: ['nw-s1', 'nw-s3'] },
      { phase: '应用', minutes: 9, teacher: '给出水平面推箱子与刹车两题，要求先画受力图再求合力。', student: '独立画受力图、求合力、计算加速度，同桌互查方向。', evidence: '受力图完整，加速度方向判断正确。', sourceIds: ['nw-s3', 'nw-s4'] },
      { phase: '总结', minutes: 4, teacher: '用「速度向左、合力向右」的辨析题收尾，强调两者方向可以不同。', student: '完成出口题并说明加速度方向。', evidence: '出口题能正确判断加速度方向。', sourceIds: ['nw-s2', 'nw-s4'] }
    ],
    activities: {
      basic: ['根据受力图求合力并计算加速度。', '判断给定情境中加速度方向。'],
      advanced: ['设计实验方案验证 a 与 F、m 的定量关系。', '分析斜面上物体的合力与加速度。'],
      'hands-on': ['用小车、钩码和刻度尺做加速度与拉力关系的定性实验。', '用手机慢动作视频观察小车启动时的运动变化。']
    },
    assessment: [
      { type: '课堂观察', text: '观察学生画受力图与求合力的过程。', criteria: '受力分析完整，合力方向标注正确。' },
      { type: '变式练习', text: '完成推箱子与刹车两道计算题。', criteria: '公式、单位与方向均正确。' },
      { type: '出口条', text: '判断「速度向左、合力向右」时加速度方向。', criteria: '能指出加速度与合力同向。' }
    ],
    homework: {
      basic: ['完成教材第四章第 3 节课后练习第 1–3 题。', '写出牛顿第二定律的公式并标注单位。'],
      advanced: ['分析传送带上物体的合力与加速度方向。', '用牛顿第二定律解释电梯启动与制动时的受力。'],
      remedial: ['用箭头标出三个情境中的合力与加速度方向。', '复述「F 指合力」并各举一例。']
    },
    differentiation: {
      support: ['提供受力分析步骤卡：定对象—画力—求合力—定方向。', '把计算题拆成「求合力」与「求加速度」两小问。'],
      extension: ['讨论非惯性参考系中定律的适用条件。', '设计一个测量动摩擦因数的实验方案。']
    },
    risks: [
      { risk: '实验室器材不可用，无法完成定量探究。', fallback: '改用生活器材做定性示范，配合投影播放数据表，重点放在合力与方向。' },
      { risk: '学生把单个力当作合力代入公式。', fallback: '增加一道「先求合力再代入」的板演，要求写出受力图。' },
      { risk: '大班额下动手机会不足。', fallback: '采用教师示范 + 同桌互评受力图，保证每人都完成一次判断。' }
    ],
    classProfile: {
      className: '高一（3）班',
      sampleSize: 42,
      term: '2026 秋季学期',
      weakPoints: [
        { label: '速度与加速度的区别', ratio: 0.55, trend: 'up' },
        { label: '力与合力', ratio: 0.45, trend: 'up' },
        { label: '加速度方向由合力决定', ratio: 0.38, trend: 'flat' },
        { label: '质量与惯性', ratio: 0.24, trend: 'down' }
      ]
    }
  }
];

let scenarioCache = null;

export function getFallbackScenarios() {
  return FALLBACK_SCENARIOS.slice();
}

export async function loadScenarios() {
  if (scenarioCache) return scenarioCache;
  try {
    const mod = await import('../../data/teacherTopics.js');
    const list = mod && Array.isArray(mod.teacherTopics) ? mod.teacherTopics.filter(Boolean) : [];
    if (list.length) {
      scenarioCache = list;
      return scenarioCache;
    }
  } catch (err) {
    /* 数据文件尚未就绪时使用内置场景 */
  }
  scenarioCache = FALLBACK_SCENARIOS;
  return scenarioCache;
}

/* ------------------------------------------------------------------ */
/* 场景匹配                                                            */
/* ------------------------------------------------------------------ */

function sameText(a, b) {
  const left = String(a || '').trim().toLowerCase();
  const right = String(b || '').trim().toLowerCase();
  if (!left || !right) return false;
  return left === right || left.indexOf(right) !== -1 || right.indexOf(left) !== -1;
}

export function scenarioLabel(scenario) {
  if (!scenario) return '未选择场景';
  return [scenario.stage, scenario.subject, scenario.textbook].filter(Boolean).join(' · ');
}

/* 大学自定义学科：没有内置场景时给一个「结构模板」，不伪造学科内容。
   方案只提供大学讲授的通用骨架，来源明确标为待补充。 */
export function createCustomUniversityScenario(settings) {
  const profile = settings || {};
  const subject = textOf(profile.subject) || '自定义学科';
  const textbook = textOf(profile.textbook) || '自编讲义';
  const title = `${subject} · 自定义主题`;
  return {
    id: 'university-custom',
    custom: true,
    stage: '大学',
    subject,
    grade: '本科',
    textbook,
    unit: '自定义课程',
    title,
    summary: '当前学科暂无内置课程知识库；这份方案提供大学课堂的通用结构，请补充教材、大纲或讲义后再生成。',
    customNotice: '当前学科暂无内置课程知识库。方案按大学通用讲授结构生成，来源标记为待补充；请先在资料库添加本课程的教材/大纲/讲义，再重新生成。',
    needExamples: [
      `把这节「${subject}」课程上成 90 分钟讲授，大班、无助教，需要有推导/案例和课堂练习。`,
      `学生先修基础不齐，帮我设计一次 90 分钟的研讨课，含课前阅读和讨论问题。`,
      `机房不足，如何用自带设备或仿真完成一次 90 分钟的实验/上机课？`
    ],
    sources: [
      {
        id: 'custom-outline',
        type: '大纲',
        title: '课程大纲（待补充）',
        locator: '资料库 · 自建课程',
        excerpt: '请补充本课程的目标、学时分配、考核方式与阅读材料；当前方案只提供通用结构。',
        confidence: 0.5
      },
      {
        id: 'custom-textbook',
        type: '教材',
        title: '教材或讲义（待指定）',
        locator: '资料库 · 自建课程',
        excerpt: '请补充教材章节、讲义或案例；当前方案不引用具体学科内容。',
        confidence: 0.5
      }
    ],
    graph: {
      nodes: [
        { id: 'target', label: '本节目标概念', layer: 3, kind: 'target', desc: '本节要建立的核心概念或能力。', sourceIds: ['custom-outline'] },
        { id: 'prior', label: '先修概念', layer: 0, kind: 'prior', desc: '学习本节前需要具备的概念或技能。', sourceIds: ['custom-outline'] },
        { id: 'core', label: '核心概念', layer: 2, kind: 'concept', desc: '支撑目标概念的关键中间概念。', sourceIds: ['custom-outline'] },
        { id: 'misconception', label: '常见误解', layer: 1, kind: 'misconception', desc: '学生容易混淆或过度简化的理解。', sourceIds: ['custom-textbook'] },
        { id: 'application', label: '应用/案例', layer: 2, kind: 'skill', desc: '把概念用于案例、推导、实验或代码。', sourceIds: ['custom-textbook'] },
        { id: 'assessment', label: '评价证据', layer: 3, kind: 'concept', desc: '判断学生是否达标的课堂证据。', sourceIds: ['custom-outline'] }
      ],
      edges: [
        { from: 'prior', to: 'core', relation: '先修支撑', confidence: 0.6, basis: '先修概念是理解核心概念的前提。', sourceIds: ['custom-outline'] },
        { from: 'core', to: 'target', relation: '构成目标', confidence: 0.6, basis: '核心概念构成目标概念的基础。', sourceIds: ['custom-outline'] },
        { from: 'misconception', to: 'target', relation: '需要辨析', confidence: 0.55, basis: '常见误解会阻碍目标概念建立。', sourceIds: ['custom-textbook'] },
        { from: 'application', to: 'target', relation: '应用检验', confidence: 0.6, basis: '应用任务检验概念是否真正可用。', sourceIds: ['custom-textbook'] },
        { from: 'target', to: 'assessment', relation: '证据对应', confidence: 0.65, basis: '评价证据对应目标达成。', sourceIds: ['custom-outline'] }
      ]
    },
    objectives: [
      { text: `能用自己的话解释「${subject}」本节的核心概念，并说明它与先修概念的关系。`, level: '理解', sourceIds: ['custom-outline'] },
      { text: '能在案例、推导或任务中应用本节概念，写出关键步骤与依据。', level: '应用', sourceIds: ['custom-outline'] },
      { text: '能辨析一个常见误解，并说明为什么它不成立。', level: '分析', sourceIds: ['custom-textbook'] }
    ],
    keyPoints: ['本节核心概念', '概念之间的关系', '应用步骤与依据'],
    difficulties: ['先修基础不齐', '把概念当成公式记忆', '应用时缺少条件判断'],
    misconceptions: [
      { nodeId: 'misconception', label: '常见误解', misconception: '把本节概念当成孤立结论记忆，忽略它成立的前提条件。', sourceIds: ['custom-textbook'] }
    ],
    flowTemplate: [
      { phase: '问题导入', minutes: 10, teacher: '用一个与本学科相关的真实问题或案例引出本节目标。', student: '尝试用已有知识解释，暴露先修缺口。', evidence: '能说出自己的初步解释与卡点。', sourceIds: ['custom-outline'] },
      { phase: '概念讲授', minutes: 20, teacher: '给出核心概念的定义、条件与反例，标出关键术语。', student: '记录定义与条件，标出不懂的位置。', evidence: '能复述定义并指出一个条件。', sourceIds: ['custom-outline'] },
      { phase: '推导/证明', minutes: 20, teacher: '示范关键推导或论证，解释每一步的依据。', student: '跟随推导，尝试补全一步。', evidence: '能写出关键步骤与依据。', sourceIds: ['custom-textbook'] },
      { phase: '案例应用', minutes: 15, teacher: '用一个案例/实验/代码展示概念如何应用。', student: '在给定情境中应用概念，记录结果。', evidence: '能完成任务并解释结果。', sourceIds: ['custom-textbook'] },
      { phase: '小组讨论', minutes: 10, teacher: '给出一个易错点或开放问题，组织同伴讨论。', student: '小组讨论并给出理由。', evidence: '能说出一个不同观点并回应。', sourceIds: ['custom-outline'] },
      { phase: '课堂练习', minutes: 10, teacher: '布置 1–2 道课堂练习，巡视并收集共性问题。', student: '独立完成，标出不确定处。', evidence: '练习正确率与错误类型。', sourceIds: ['custom-outline'] },
      { phase: '总结与作业', minutes: 5, teacher: '总结本节结构，布置阅读、作业与下次预习。', student: '记录作业与阅读任务。', evidence: '能复述本节结构。', sourceIds: ['custom-outline'] }
    ],
    activities: {
      basic: ['用概念图整理本节的核心概念与先修关系。'],
      advanced: ['找一个本学科的新案例，说明本节概念的适用条件。'],
      'hands-on': ['用仿真、代码或小组任务完成一次应用练习。']
    },
    assessment: [
      { type: '课堂练习', text: '1–2 道应用概念的基础题。', criteria: '步骤完整，能说明依据。' },
      { type: '课后作业', text: '一道应用题 + 一道辨析题。', criteria: '能区分条件与结论。' }
    ],
    homework: {
      basic: [`完成本节概念图，并标注一个容易混淆的点。`],
      advanced: [`阅读一份与本学科相关的材料，写 3 句回应。`],
      remedial: [`用自己的话复述本节定义，并请同伴指出遗漏。`]
    },
    differentiation: {
      support: ['提供定义卡、步骤卡与一个 worked example。'],
      extension: ['提供一个开放案例，要求说明适用条件与反例。']
    },
    risks: [
      { risk: '学科内容与教材版本不匹配', fallback: '先在资料库补充本课程教材/大纲，再重新生成。' },
      { risk: '大班互动不足', fallback: '用同伴互评、随堂投票或小组代表发言替代全班问答。' }
    ],
    classProfile: {
      className: `${subject} · 示例班级`,
      sampleSize: 60,
      term: '2026 秋季学期',
      weakPoints: [
        { label: '先修概念不牢', ratio: 0.42, trend: 'flat' },
        { label: '概念条件混淆', ratio: 0.35, trend: 'up' },
        { label: '应用步骤缺失', ratio: 0.28, trend: 'down' }
      ]
    },
    course: {
      audience: '本科生（示例班级）',
      assessment: '形成性评价 + 期末考核（待确认）'
    }
  };
}

export function selectScenario(settings, list) {
  const scenarios = Array.isArray(list) && list.length
    ? list
    : scenarioCache && scenarioCache.length
      ? scenarioCache
      : FALLBACK_SCENARIOS;
  const profile = settings || {};
  // 大学自定义学科：有内置学科就匹配，没有则返回通用结构模板。
  if (sameText(profile.stage, '大学') && textOf(profile.subject)) {
    const subjectMatch = scenarios.find((scenario) => sameText(scenario.subject, profile.subject));
    if (!subjectMatch) return createCustomUniversityScenario(profile);
  }
  let best = null;
  let bestScore = -1;
  for (const scenario of scenarios) {
    let score = 0;
    if (sameText(scenario.stage, profile.stage)) score += 4;
    if (sameText(scenario.subject, profile.subject)) score += 4;
    if (sameText(scenario.textbook, profile.textbook)) score += 3;
    if (score > bestScore) {
      best = scenario;
      bestScore = score;
    }
  }
  if (best && bestScore > 0) return best;
  return scenarios[0] || null;
}

/* ------------------------------------------------------------------ */
/* 工具                                                                */
/* ------------------------------------------------------------------ */

function uniqueId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function textOf(value) {
  return String(value === null || value === undefined ? '' : value).trim();
}

function charCount(text) {
  return Array.from(text || '').length;
}

function truncate(text, max) {
  const chars = Array.from(text || '');
  return chars.length > max ? chars.slice(0, max).join('') + '…' : chars.join('');
}

function normalizeRequest(request, scenario) {
  const raw = request || {};
  const profile = stageProfile(raw.stage || (scenario && scenario.stage));
  const lessonType = profile.lessonTypes.indexOf(raw.lessonType) !== -1
    ? raw.lessonType
    : profile.defaultLessonType;
  const tune = TUNE_IDS.indexOf(raw.tune) !== -1 ? raw.tune : null;
  // 「压缩到 X 分钟」由学段剖面决定，真实改变课时与时间轴
  const bounds = profile.durationRange;
  let requested = Math.round(Number(raw.duration));
  if (!Number.isFinite(requested) || requested <= 0) requested = profile.defaultDuration;
  requested = clamp(requested, bounds[0], bounds[1]);
  const duration = tune === 'compress' ? profile.compressDuration : requested;
  const level = profile.levels.indexOf(raw.level) !== -1 ? raw.level : '混合';
  const constraints = asArray(raw.constraints).filter((item) => profile.constraints.indexOf(item) !== -1);
  const need = textOf(raw.need);
  return {
    need: need || `把「${scenario.title}」上成一节 ${duration} 分钟的${lessonType}`,
    stage: profile.stage,
    profile,
    lessonType,
    duration,
    level,
    constraints,
    tune
  };
}

/* ------------------------------------------------------------------ */
/* 检索                                                                */
/* ------------------------------------------------------------------ */

function userLibraryOf(scenario) {
  const list = state && Array.isArray(state.library) ? state.library : [];
  return list.filter((item) => {
    if (!item || typeof item !== 'object' || !item.id) return false;
    if (!item.scenarioId || item.scenarioId === 'all') return true;
    return item.scenarioId === scenario.id;
  });
}

export function librarySourcesOf(scenario) {
  return userLibraryOf(scenario).map((item, index) => ({
    id: item.id,
    type: item.type || '外部',
    title: textOf(item.title) || '我的资料',
    locator: textOf(item.locator) || '资料库 · 我的资料',
    excerpt: textOf(item.excerpt),
    confidence: Number.isFinite(Number(item.confidence)) ? clamp(Number(item.confidence), 0, 1) : 0.6,
    order: 1000 + index,
    user: true
  }));
}

export function retrieve(request, scenario) {
  const req = normalizeRequest(request, scenario);
  const sources = asArray(scenario.sources).map((source, index) => ({
    id: source.id,
    type: source.type || '资料',
    title: source.title || '未命名资料',
    locator: source.locator || '',
    excerpt: source.excerpt || '',
    confidence: Number.isFinite(Number(source.confidence)) ? clamp(Number(source.confidence), 0, 1) : 0.8,
    order: index
  }));
  const typeWeight = {
    课标: 4, 大纲: 4, 教材: 3, 解读: 2, 校本: 1, 论文: 2, 阅读: 2, 外部: 1, 讲义: 2
  };
  const query = `${req.need} ${scenario.title} ${scenario.unit || ''} ${req.lessonType}`;
  sources.sort((a, b) => {
    const wa = (typeWeight[a.type] || 0) + (query.indexOf(a.title) !== -1 ? 2 : 0);
    const wb = (typeWeight[b.type] || 0) + (query.indexOf(b.title) !== -1 ? 2 : 0);
    return wb - wa || a.order - b.order;
  });
  // 用户资料库中与当前场景匹配的文本，直接参与检索与引用
  const userSources = librarySourcesOf(scenario);
  const merged = sources.concat(userSources);
  const nodes = asArray(scenario.graph && scenario.graph.nodes).map((node) => ({ ...node }));
  const edges = asArray(scenario.graph && scenario.graph.edges).map((edge) => ({ ...edge }));
  const focusNodeIds = nodes
    .filter((node) => (Number(node.layer) || 0) >= 2 || node.kind === 'skill')
    .map((node) => node.id);
  return { sources: merged, userSources, nodes, edges, focusNodeIds, request: req };
}

/* ------------------------------------------------------------------ */
/* 方案构建                                                            */
/* ------------------------------------------------------------------ */

const TYPE_TEACHER_CLAUSE = {
  活动课: '（活动课：先说明任务与安全边界，再让学生动手。）',
  复习课: '（复习课：先用课前错题暴露问题，再回到概念结构。）',
  实验课: '（实验课：先明确安全规范与误差要求，再分组操作。）',
  专题复习: '（专题复习：先定位专题在考试与课程中的位置，再典例剖析。）',
  单元设计: '（单元设计：说明本课时在单元结构中的位置。）',
  项目式学习: '（项目式学习：把任务拆成可交付的小组产物。）',
  分层辅导: '（分层辅导：先诊断层次，再按层分配任务。）',
  讲授: '（讲授：先说明本节在课程与毕业要求中的位置，再展开推导。）',
  研讨: '（研讨：用问题清单组织讨论，教师只做追问与归纳。）',
  实验: '（实验：说明安全规范、数据记录与误差分析要求。）',
  上机: '（上机：先讲接口与验收标准，再结对实现。）',
  课程大纲: '（课程大纲：对齐毕业要求、学时分配与考核权重。）',
  复习: '（复习：先诊断疑难，再梳理课程结构。）'
};

const TYPE_STUDENT_CLAUSE = {
  活动课: '按任务单完成活动并记录发现。',
  复习课: '结合自己的错题说明理由。',
  实验课: '按操作规范完成实验并记录数据。',
  专题复习: '先独立完成典例，再对照方法卡修正。',
  单元设计: '在单元学习单上记录本节与前后课的联系。',
  项目式学习: '在小组内分工完成本阶段任务。',
  分层辅导: '按自己的层次完成对应任务，遇到卡点举手。',
  讲授: '跟随推导记录关键步骤，标出未理解处。',
  研讨: '带着阅读笔记参与讨论，引用原文支撑观点。',
  实验: '按实验手册操作并记录原始数据。',
  上机: '结对编写并运行代码，记录测试结果。',
  课程大纲: '对照毕业要求核对课程目标与学时。',
  复习: '整理疑难清单并完成综合练习。'
};

function copyHomework(homework) {
  const source = homework || {};
  return {
    basic: asArray(source.basic).map(textOf).filter(Boolean),
    advanced: asArray(source.advanced).map(textOf).filter(Boolean),
    remedial: asArray(source.remedial).map(textOf).filter(Boolean)
  };
}

function addUnique(list, value) {
  const text = textOf(value);
  if (!text) return;
  if (list.indexOf(text) === -1) list.push(text);
}

function normalizeAssessment(raw, scenario, profile) {
  const list = asArray(raw).map((item, index) => {
    if (typeof item === 'string') {
      return {
        type: index === 0 ? '过程评价' : '课堂评价',
        text: item,
        criteria: '能完成任务并说明理由。'
      };
    }
    return {
      type: textOf(item && item.type) || '课堂评价',
      text: textOf(item && item.text) || textOf(item && item.title),
      criteria: textOf(item && item.criteria) || '能完成任务并说明理由。'
    };
  }).filter((item) => item.text);

  if (list.length < 2) {
    const fallback = profile && profile.id === 'university'
      ? [
          { type: 'Problem Set', text: `完成「${scenario.title}」的课后 problem set 并按时提交。`, criteria: '步骤完整，结果与单位正确，引用规范。' },
          { type: '课堂练习', text: '在课堂上完成一道推导或编程练习。', criteria: '能独立完成并说明关键步骤。' },
          { type: '项目/考试', text: '以 project 或闭卷考试检验综合应用。', criteria: '能迁移方法解决新情境问题。' }
        ]
      : [
          { type: '过程观察', text: `观察学生完成「${scenario.title}」核心任务的过程。`, criteria: '能按步骤完成任务并记录关键结论。' },
          { type: '出口条', text: '用一句话概括本节的核心结论并说明适用条件。', criteria: '结论正确，能指出一个易错点。' }
        ];
    for (const item of fallback) {
      if (list.length >= 3) break;
      list.push(item);
    }
  }
  return list.slice(0, 4);
}

function normalizeRisks(raw) {
  return asArray(raw).map((item) => {
    if (typeof item === 'string') return { risk: item, fallback: '准备替代活动并保留核心目标。' };
    return {
      risk: textOf(item && item.risk) || textOf(item && item.title),
      fallback: textOf(item && item.fallback) || textOf(item && item.alternative) || '准备替代活动并保留核心目标。'
    };
  }).filter((item) => item.risk);
}

function allocation(template, duration, tune) {
  const templateMinutes = template.map((item) => Math.max(1, Number(item.minutes) || 8));
  const total = templateMinutes.reduce((sum, value) => sum + value, 0) || templateMinutes.length;
  let minutes = templateMinutes.map((value) => Math.max(1, Math.round(value / total * duration)));
  let diff = duration - minutes.reduce((sum, value) => sum + value, 0);
  let guard = 0;
  while (diff !== 0 && guard < 200) {
    guard += 1;
    const step = diff > 0 ? 1 : -1;
    const pool = minutes
      .map((value, index) => ({ value, index }))
      .filter((item) => (step > 0 ? true : item.value > 1));
    if (!pool.length) break;
    const target = step > 0
      ? pool.reduce((max, item) => (item.value > max.value ? item : max), pool[0])
      : pool.reduce((max, item) => (item.value > max.value ? item : max), pool[0]);
    minutes[target.index] += step;
    diff -= step;
  }
  if (tune === 'simpler') {
    minutes[0] = Math.min(duration - 4, minutes[0] + 2);
    minutes[minutes.length - 1] = Math.max(3, minutes[minutes.length - 1] - 2);
  } else if (tune === 'hands-on') {
    if (minutes.length > 2) {
      minutes[1] = Math.min(duration - 6, minutes[1] + 3);
      minutes[minutes.length - 1] = Math.max(3, minutes[minutes.length - 1] - 3);
    }
  }
  // 时间轴严格等于课时：四舍五入后把差额补回最长的一段
  let rest = duration - minutes.reduce((sum, value) => sum + value, 0);
  let guard2 = 0;
  while (rest !== 0 && guard2 < 200) {
    guard2 += 1;
    const step = rest > 0 ? 1 : -1;
    const pool = minutes
      .map((value, index) => ({ value, index }))
      .filter((item) => (step > 0 ? true : item.value > 1));
    if (!pool.length) break;
    const target = pool.reduce((max, item) => (item.value > max.value ? item : max), pool[0]);
    minutes[target.index] += step;
    rest -= step;
  }
  return minutes;
}

function activityLine(activity) {
  if (!activity) return '';
  if (typeof activity === 'string') return activity;
  return textOf(activity.title) || textOf(activity.text) || textOf(activity.name) || '';
}

function objectivePrefix(lessonType) {
  if (lessonType === '复习课') return '【复习】';
  if (lessonType === '单元设计') return '【单元】';
  if (lessonType === '项目式学习') return '【项目】';
  if (lessonType === '分层辅导') return '【分层】';
  return '';
}

function buildObjectives(scenario, req, validSources) {
  const prefix = objectivePrefix(req.lessonType);
  let list = asArray(scenario.objectives).map((objective, index) => {
    const text = (typeof objective === 'string' ? objective : textOf(objective && objective.text)) || '';
    return {
      id: `o${index + 1}`,
      text: prefix ? prefix + text : text,
      level: (objective && objective.level) || '理解',
      sourceIds: validSources(objective && objective.sourceIds)
    };
  }).filter((item) => item.text);

  const isSimpler = req.tune === 'simpler' || req.level === '基础薄弱';
  const isHarder = req.tune === 'harder' || (req.level === '拔尖' && req.tune !== 'simpler');

  if (isSimpler) {
    list = list.map((item) => ({
      ...item,
      level: item.level === '迁移' || item.level === '分析' ? '应用' : item.level === '应用' ? '理解' : '基础'
    }));
    const first = asArray(scenario.misconceptions)[0];
    const label = textOf(first && first.label);
    const misconception = textOf(first && first.misconception);
    const exists = list.some((item) => item.text.indexOf(label) !== -1 && label);
    if (first && label && !exists) {
      list.unshift({
        id: 'o0',
        text: `能说出「${label}」的常见误判，并用自己的话改正：${truncate(misconception, 40)}`,
        level: '基础',
        sourceIds: validSources(first.sourceIds)
      });
    }
  } else if (isHarder) {
    const harder = {
      id: 'o-adv',
      text: `能在新情境中迁移「${scenario.title}」，提出一个可检验的解释或方案。`,
      level: '迁移',
      sourceIds: validSources([asArray(scenario.sources)[0] && asArray(scenario.sources)[0].id])
    };
    // 保证「更挑战」一定替换掉一条目标，而不是被截断
    if (list.length >= 4) list[list.length - 1] = harder;
    else list.push(harder);
  }

  if (!isSimpler && req.level === '基础薄弱' && list.length < 3) {
    list.push({
      id: `o${list.length + 1}`,
      text: `能在教师示范下复述「${scenario.title}」的核心步骤。`,
      level: '基础',
      sourceIds: validSources([asArray(scenario.sources)[0] && asArray(scenario.sources)[0].id])
    });
  }

  return list.slice(0, 4).map((item, index) => ({ ...item, id: `o${index + 1}` }));
}

function buildPrerequisites(scenario, req, validSources) {
  return asArray(scenario.misconceptions).map((item, index) => {
    const node = asArray(scenario.graph && scenario.graph.nodes).find((candidate) => candidate.id === item.nodeId);
    return {
      nodeId: item.nodeId || (node && node.id) || `m${index + 1}`,
      label: item.label || (node && node.label) || '前概念',
      misconception: textOf(item.misconception) || '存在与本节概念相关的模糊理解。',
      sourceIds: validSources(item.sourceIds)
    };
  });
}

function buildFlow(scenario, req, validSources, prerequisites) {
  const profile = req.profile || stageProfile(req.stage || scenario.stage);
  const maxPhases = Math.max(1, Number(profile.maxPhases) || 5);
  const fallbackPhases = profile.flowPhases;
  const typePhases = (TYPE_PHASES[profile.stage] || {})[req.lessonType] || null;
  const template = asArray(scenario.flowTemplate).slice(0, maxPhases);
  const hasReadingPhase = template.some((item) => textOf(item.phase).indexOf('阅读') !== -1);
  const lead = [];
  if (profile.preReadingPhase && !hasReadingPhase && template.length < maxPhases) {
    lead.push({
      phase: profile.preReadingPhase,
      minutes: 8,
      teacher: `布置课前 reading：教材「${scenario.title}」相关章节 + 1 篇论文或讲义，并给出阅读问题。`,
      student: '课前完成阅读，提交 1 个问题与 1 处关键引用。',
      evidence: '阅读笔记与提问质量。',
      sourceIds: asArray(scenario.sources)[0] ? [asArray(scenario.sources)[0].id] : []
    });
  }
  const slots = lead.concat(template).slice(0, maxPhases);
  const items = [];
  for (let index = 0; index < maxPhases; index += 1) {
    if (slots[index]) {
      items.push(slots[index]);
    } else {
      const phase = fallbackPhases[index] || `阶段 ${index + 1}`;
      items.push({
        phase,
        minutes: 8,
        teacher: `围绕「${scenario.title}」组织${phase}。`,
        student: '参与活动并记录关键结论。',
        evidence: '能完成本阶段任务。',
        sourceIds: []
      });
    }
  }

  const minutes = allocation(items, req.duration, req.tune);
  const lastIndex = items.length - 1;
  const handsOnIndex = Math.min(Number(profile.handsOnIndex) || 1, lastIndex);
  const hasNoEquipment = req.constraints.indexOf('无实验器材') !== -1;
  const hasProjectorOnly = req.constraints.indexOf('只有投影') !== -1;
  const isLargeClass = req.constraints.indexOf('大班额') !== -1;
  const needsTieredHomework = req.constraints.indexOf('需要分层作业') !== -1;

  const flow = items.map((item, index) => {
    // 大学默认课型沿用数据自带流程；切换研讨/实验/上机等课型时用学段课型阶段。
    const preferTemplate = profile.id === 'university'
      && template.length > 0
      && req.lessonType === profile.defaultLessonType;
    let phase = preferTemplate
      ? item.phase || fallbackPhases[index] || `阶段 ${index + 1}`
      : typePhases
        ? typePhases[index] || item.phase
        : item.phase || fallbackPhases[index] || `阶段 ${index + 1}`;
    let teacher = textOf(item.teacher) || '';
    let student = textOf(item.student) || '';
    let evidence = textOf(item.evidence) || '';

    if (TYPE_TEACHER_CLAUSE[req.lessonType] && index === 0) {
      teacher += TYPE_TEACHER_CLAUSE[req.lessonType];
    }
    if (TYPE_STUDENT_CLAUSE[req.lessonType] && index >= 1 && index <= Math.min(3, lastIndex)) {
      student += TYPE_STUDENT_CLAUSE[req.lessonType];
    }

    if (hasNoEquipment && index === 1) {
      teacher += '（不使用实验室器材：改用生活物品或投影展示，保留变量控制。）';
      evidence = evidence || '观察记录能反映变量与结果的关系。';
    }
    if (hasProjectorOnly) {
      teacher = teacher.replace(/板书/g, '投影');
      if (index === 2) teacher += '（关键结构用投影分步呈现。）';
    }
    if (isLargeClass && (index === 1 || index === 3)) {
      student += '（大班额：同桌互评后由小组代表发言。）';
    }
    if (needsTieredHomework && index === lastIndex) {
      teacher += '（作业按基础、提高、补偿三层布置。）';
    }
    if (req.constraints.indexOf('实验室排期') !== -1 && index === 1) {
      teacher += '（实验室排期：如排不到实验室，改用演示或实验视频，保留数据记录与误差讨论。）';
      evidence = evidence || '记录表能反映变量控制与测量结果。';
    }

    if (req.tune === 'hands-on' && index === handsOnIndex) {
      const activity = activityLine(asArray(scenario.activities && scenario.activities['hands-on'])[0])
        || activityLine(asArray(scenario.activities && scenario.activities.basic)[0]);
      if (activity) {
        teacher = `组织动手活动：${activity}`;
        student = '按操作单完成任务，记录现象与数据，并在小组内说明结论。';
        evidence = '操作单记录完整，能结合现象解释结论。';
        phase = '动手实践';
      }
    }

    if (req.tune === 'harder' && index === Math.min(3, lastIndex)) {
      teacher += '（增加开放探究：允许学生提出不同方案并比较。）';
      student += '尝试提出一种替代方案并说明适用条件。';
    }

    if (req.tune === 'compress' && index === Math.min(3, lastIndex)) {
      teacher += `（压缩版：保留核心内容，其余改为课后完成。）`;
    }

    if (prerequisites.length && index === 2) {
      const names = prerequisites.slice(0, 2).map((entry) => entry.label).join('、');
      teacher += `（针对性处理前概念：${names}。）`;
    }

    return {
      phase,
      minutes: minutes[index] || 4,
      teacher,
      student,
      evidence,
      sourceIds: validSources(item.sourceIds)
    };
  });

  applyUniversityFlowConstraints(flow, req);
  return flow;
}

/* 大学约束真实改变流程：无助教 / 机房不足 / 双语 / 课程思政 / 阅读材料。 */
function applyUniversityFlowConstraints(flow, req) {
  if (!flow.length || !req.profile || req.profile.id !== 'university') return;
  const has = (name) => req.constraints.indexOf(name) !== -1;
  const last = flow.length - 1;
  const at = (index) => flow[Math.min(index, last)];

  at(last).teacher += '（学术诚信：作业须独立完成，引用他人观点与数据须标注出处。）';

  if (has('无助教')) {
    at(2).teacher += '（无助教：采用大班讲授，先给完整板书提纲，关键推导逐步停顿检查。）';
    at(3).student += '（同伴互评：两人交换推导或答案，按评分要点互评并记录分歧。）';
    at(last).teacher += '（课后答疑：固定答疑时间与线上提问区，集中回复共性问题。）';
  }
  if (has('机房不足')) {
    const target = at(4);
    target.teacher += '（机房不足：使用自带设备或在线仿真，两人一机轮换操作。）';
    target.student += '（两人一机时，一人操作一人记录，中途交换。）';
    target.evidence = target.evidence || '操作记录与运行结果可复核。';
    at(last).teacher += '（课后开放机房时段或提供云端环境。）';
  }
  if (has('双语教学')) {
    at(2).teacher += '（双语教学：关键术语中英对照，讲义与板书同时给出英文原词。）';
    at(3).evidence = at(3).evidence
      ? `${at(3).evidence}（能用中英文术语解释核心概念。）`
      : '能用中英文术语解释核心概念。';
  }
  if (has('课程思政')) {
    at(3).teacher += '（课程思政：结合学科史、技术伦理与国家需求案例，讨论知识的责任边界。）';
  }
  if (has('需要阅读材料')) {
    flow[0].teacher = `布置课前 reading：教材章节 + 1 篇论文或讲义，并给出阅读问题。${flow[0].teacher}`;
    flow[0].student += '课前完成 reading，提交 1 个问题与 1 处关键引用。';
    at(1).teacher += '（课堂检查：用 2 分钟核对阅读笔记与提问，随机抽点回答。）';
  }
}

function buildHomework(scenario, req) {
  const profile = req.profile || stageProfile(req.stage || scenario.stage);
  const isUniversity = profile.id === 'university';
  const homework = copyHomework(scenario.homework);

  if (isUniversity) {
    if (!homework.basic.length) {
      homework.basic.push(`Problem Set：完成「${scenario.title}」对应章节习题 3–5 道，写出推导步骤与单位。`);
    }
    const advancedItem = req.lessonType === '实验'
      ? 'Lab Report：按实验报告模板记录目的、装置、原始数据、误差分析与结论。'
      : req.lessonType === '上机'
        ? 'Project：完成一个可运行的小项目或代码作业，附 README 与测试结果。'
        : req.lessonType === '研讨'
          ? 'Reading Response：针对指定论文写 500 字回应，引用原文并说明你的判断。'
          : req.lessonType === '课程大纲'
            ? '课程大纲草案：补齐课程目标、学时分配、考核权重与阅读材料。'
            : 'Project：选择一个应用案例，用本讲方法完成建模或实现，并写 1 页说明。';
    addUnique(homework.advanced, advancedItem);
    addUnique(homework.remedial, '论文阅读：阅读指定论文或讲义章节，写出 3 个关键概念与 1 个待探究问题。');
    if (req.constraints.indexOf('需要阅读材料') !== -1) {
      addUnique(homework.remedial, 'Reading Response：针对指定论文写 300–500 字回应，附 2 处原文引用。');
    }
    if (req.tune === 'simpler' || req.level === '基础薄弱') {
      addUnique(homework.basic, '先复习本讲依赖的前置概念与公式，再完成 problem set 的基础题。');
      addUnique(homework.remedial, '用「已知—求—公式—代入—检验」的格式写出解题步骤。');
    }
    if (req.tune === 'harder' || req.level === '拔尖') {
      addUnique(homework.advanced, '在 problem set 中增加一道开放题：比较两种方法并说明适用条件。');
    }
    if (req.tune === 'hands-on') {
      addUnique(homework.advanced, '补充一组实验或程序对照，记录数据并分析差异来源。');
    }
    return {
      basic: homework.basic.slice(0, 4),
      advanced: homework.advanced.slice(0, 4),
      remedial: homework.remedial.slice(0, 4)
    };
  }

  if (!homework.basic.length) homework.basic.push(`整理「${scenario.title}」的核心结论与一个例题。`);
  if (!homework.remedial.length) homework.remedial.push('向同伴口述本节最核心的一步，并请对方指出遗漏。');

  if (req.tune === 'simpler' || req.level === '基础薄弱') {
    addUnique(homework.basic, `先复习「${asArray(scenario.misconceptions)[0] ? asArray(scenario.misconceptions)[0].label : scenario.title}」，再完成上面的基础题。`);
    addUnique(homework.remedial, '用「先…再…」的句式写出解题步骤。');
  }
  if (req.tune === 'harder' || req.level === '拔尖') {
    addUnique(homework.advanced, '自选一个生活情境，用本节结论提出一个可检验的问题并给出解释。');
  }
  if (req.lessonType === '分层辅导') {
    addUnique(homework.remedial, '完成一份 10 分钟的基础补偿练习。');
  }
  if (req.tune === 'hands-on') {
    addUnique(homework.advanced, '记录一次家庭小实验的现象，并用本节概念解释。');
  }
  if (req.constraints.indexOf('需要分层作业') !== -1) {
    addUnique(homework.remedial, '选做一项基础补偿任务，第二天课堂上核对。');
  }
  return {
    basic: homework.basic.slice(0, 4),
    advanced: homework.advanced.slice(0, 4),
    remedial: homework.remedial.slice(0, 4)
  };
}

function buildDifferentiation(scenario, req) {
  const profile = req.profile || stageProfile(req.stage || scenario.stage);
  const isUniversity = profile.id === 'university';
  const source = scenario.differentiation || {};
  const support = asArray(source.support).map(textOf).filter(Boolean);
  const extension = asArray(source.extension).map(textOf).filter(Boolean);

  if (isUniversity) {
    if (!support.length) support.push('提供推导步骤卡、公式表与关键概念清单，降低起点难度。');
    if (!extension.length) extension.push('延伸阅读 1 篇期刊论文或教材进阶章节，并写出与课堂内容的联系。');
    if (req.constraints.indexOf('无助教') !== -1) {
      support.push('固定答疑时间与线上提问区，共性问题集中讲解。');
    }
    if (req.constraints.indexOf('双语教学') !== -1) {
      support.push('提供中英术语对照表，允许用中文或英文作答。');
    }
    if (req.tune === 'simpler') support.unshift('课前补充前置概念与数学工具的自学材料。');
    if (req.tune === 'harder') extension.unshift('增加一篇延伸论文或开放 project，要求给出方法比较。');
    if (req.tune === 'hands-on') support.push('提供实验/上机的操作清单与安全或环境说明。');
    if (req.level === '基础薄弱') support.push('把长推导拆成若干检查点，逐步核对。');
    if (req.level === '拔尖') extension.push('鼓励提出替代推导或实现方案，并做小规模验证。');
    return { support: support.slice(0, 4), extension: extension.slice(0, 4) };
  }

  if (!support.length) support.push('提供步骤卡与半成品记录单，降低起点难度。');
  if (!extension.length) extension.push('提供一道开放题，鼓励提出不同解法。');
  if (req.tune === 'simpler') {
    support.unshift('先补前概念：用 3 分钟复习本节依赖的核心概念。');
  }
  if (req.tune === 'harder') {
    extension.unshift('增加一道跨情境迁移题，要求说明适用条件。');
  }
  if (req.tune === 'hands-on') {
    support.push('提供材料替代方案与安全提示。');
  }
  if (req.level === '基础薄弱') support.push('把长任务拆成两个小步骤，逐步检查。');
  if (req.level === '拔尖') extension.push('鼓励用多种表征解释同一结论。');
  return { support: support.slice(0, 4), extension: extension.slice(0, 4) };
}

function buildRisks(scenario, req, retrieved) {
  const risks = normalizeRisks(scenario.risks);
  const has = (name) => req.constraints.indexOf(name) !== -1;
  if (has('无实验器材')) {
    addRisk(risks, '缺少实验器材，动手探究无法按原方案实施。', '用生活物品做替代示范，或播放实验记录视频，保留变量控制与数据记录环节。');
  }
  if (has('只有投影')) {
    addRisk(risks, '只有投影，学生看不清细小实验现象。', '把关键现象拍成近景照片分步投影，并配合学生手势比划。');
  }
  if (has('大班额')) {
    addRisk(risks, '大班额下个别指导时间不足。', '采用同桌互评、小组代表发言与错例集中讲评，个别问题课后跟进。');
  }
  if (has('实验室排期')) {
    addRisk(risks, '实验室排期冲突，实验课无法按计划进入实验室。', '改用演示实验或实验视频，保留变量控制、数据记录与误差讨论。');
  }
  if (has('无助教')) {
    addRisk(risks, '无助教时大班讲授与个别答疑难以兼顾。', '固定答疑时间与线上提问区，课堂用同伴互评和集中讲评替代个别辅导。');
  }
  if (has('机房不足')) {
    addRisk(risks, '机房机位不足，上机练习无法人人操作。', '使用自带设备或在线仿真，两人一机轮换，并开放课后机房时段。');
  }
  if (has('双语教学')) {
    addRisk(risks, '双语教学增加理解负担，部分学生跟不上。', '关键术语中英对照，讲义提供术语表，允许中文或英文作答。');
  }
  if (has('课程思政')) {
    addRisk(risks, '课程思政案例与专业知识脱节，流于口号。', '选择与学科史、技术伦理或国家需求直接相关的案例，并设置讨论问题。');
  }
  if (has('需要阅读材料')) {
    addRisk(risks, '课前阅读完成度不一，课堂讨论难以展开。', '课前发布阅读问题并在课堂开头检查笔记，未完成者用 5 分钟补读。');
  }
  if (req.tune === 'compress') {
    addRisk(risks, `压缩到 ${req.duration} 分钟后，部分活动被删减。`, '把非核心内容改为课后任务，课堂只保留目标—核心讲解—练习—小结。');
  }
  if (req.tune === 'hands-on') {
    addRisk(risks, '动手活动可能超时或材料不足。', '提前分组摆好材料，设置 3 分钟倒计时；材料不足时改为两人合作操作。');
  }
  if (!risks.length) {
    risks.push({ risk: '学生对前概念仍有混淆。', fallback: '用出口题快速检测，下一节课用 5 分钟补偿。' });
  }
  return risks.slice(0, 5);
}

function addRisk(risks, risk, fallback) {
  if (risks.some((item) => item.risk === risk)) return;
  risks.push({ risk, fallback });
}

function citedSourceIds(objectives, prerequisites, flow) {
  const counts = new Map();
  const bump = (ids) => {
    asArray(ids).forEach((id) => {
      if (!id) return;
      counts.set(id, (counts.get(id) || 0) + 1);
    });
  };
  objectives.forEach((item) => bump(item.sourceIds));
  prerequisites.forEach((item) => bump(item.sourceIds));
  flow.forEach((item) => bump(item.sourceIds));
  return counts;
}

/**
 * 让资料库中的用户资料真实参与方案：写入教学流程并附带可核对的原句。
 * 只在资料确实存在时引用，不虚构标题或页码。
 */
function applyUserSources(plan, retrieved) {
  const users = asArray(retrieved && retrieved.userSources);
  if (!users.length || !Array.isArray(plan.flow) || !plan.flow.length) return;
  const primary = users[0];
  const targetIndex = Math.min(2, plan.flow.length - 1);
  const target = plan.flow[targetIndex];
  if (!asArray(target.sourceIds).includes(primary.id)) {
    const excerpt = truncate(primary.excerpt, 60);
    const note = excerpt
      ? `参考《${primary.title}》：「${excerpt}」`
      : `参考资料库中的《${primary.title}》。`;
    target.teacher = target.teacher ? `${target.teacher} ${note}` : note;
    target.sourceIds = asArray(target.sourceIds).concat(primary.id);
  }
  if (asArray(plan.assessment).length < 4
    && !plan.assessment.some((item) => String(item && item.text || '').indexOf(primary.title) !== -1)) {
    plan.assessment.push({
      type: '资料核对',
      text: `依据《${primary.title}》核对「${asArray(plan.keyPoints)[0] || plan.title}」的表述是否准确。`,
      criteria: '能指出资料中的关键原句，并说明与课堂结论的一致或差异。'
    });
  }
}

function attachSources(plan, scenario, retrieved) {
  const counts = citedSourceIds(plan.objectives, plan.prerequisites, plan.flow);
  const pool = retrieved && retrieved.sources && retrieved.sources.length ? retrieved.sources : asArray(scenario.sources);
  plan.sources = pool.map((source) => ({
    id: source.id,
    type: source.type || '资料',
    title: source.title || '未命名资料',
    locator: source.locator || '',
    excerpt: source.excerpt || '',
    confidence: Number.isFinite(Number(source.confidence)) ? clamp(Number(source.confidence), 0, 1) : 0.8,
    cited: counts.get(source.id) || 0,
    user: !!source.user
  }));
}

function buildPlan(request, scenario, retrieved) {
  const req = normalizeRequest(request, scenario);
  const profile = req.profile;
  const scenarioSources = asArray(scenario.sources);
  const validIds = new Set(scenarioSources.map((source) => source.id));
  const validSources = (ids) => {
    const filtered = asArray(ids).filter((id) => validIds.has(id));
    if (filtered.length) return filtered;
    return scenarioSources[0] ? [scenarioSources[0].id] : [];
  };

  const objectives = buildObjectives(scenario, req, validSources);
  const prerequisites = buildPrerequisites(scenario, req, validSources);
  const flow = buildFlow(scenario, req, validSources, prerequisites);
  const homework = buildHomework(scenario, req);
  const differentiation = buildDifferentiation(scenario, req);
  const risks = buildRisks(scenario, req, retrieved);
  const assessment = normalizeAssessment(scenario.assessment, scenario, profile);
  const tuneLabel = (planTunes(profile.stage).find((item) => item.key === req.tune) || {}).label || '';

  const hours = Math.max(1, Math.round(req.duration / 40));
  const titleSuffix = req.lessonType === '课程大纲'
    ? '课程大纲'
    : req.lessonType === '单元设计' || req.lessonType === '项目式学习'
      ? `${req.lessonType}（${hours} 课时）`
      : `${req.duration} 分钟${req.lessonType}`;

  const plan = {
    id: uniqueId('plan'),
    title: `${scenario.title} · ${titleSuffix}`,
    scenarioId: scenario.id,
    stage: scenario.stage || '',
    subject: scenario.subject || '',
    textbook: scenario.textbook || '',
    grade: scenario.grade || '',
    lessonType: req.lessonType,
    duration: req.duration,
    durationLabel: profile.durationLabel,
    outcomeLabel: profile.outcomeLabel,
    stageProfile: profile.id,
    course: scenario.course || null,
    level: req.level,
    constraints: req.constraints.slice(),
    createdAt: new Date().toISOString(),
    source: 'local',
    model: '',
    need: req.need,
    objectives,
    keyPoints: asArray(scenario.keyPoints).map(textOf).filter(Boolean),
    difficulties: asArray(scenario.difficulties).map(textOf).filter(Boolean),
    prerequisites,
    flow,
    assessment,
    homework,
    differentiation,
    risks,
    sources: [],
    graph: {
      nodes: asArray(scenario.graph && scenario.graph.nodes).map((node) => ({ ...node })),
      edges: asArray(scenario.graph && scenario.graph.edges).map((edge) => ({ ...edge }))
    },
    quality: [],
    tune: req.tune || '',
    tuneLabel
  };

  applyUserSources(plan, retrieved);
  attachSources(plan, scenario, retrieved);
  plan.quality = qualityCheck(plan, scenario);
  return plan;
}

/* ------------------------------------------------------------------ */
/* 质量检查                                                            */
/* ------------------------------------------------------------------ */

/* 统一读取课程信息字段，兼容数据代理可能使用的别名。 */
export function courseInfo(course) {
  const source = course || {};
  const readingRaw = source.reading || source.readings || source.references || source.readingList;
  let reading = [];
  if (Array.isArray(readingRaw)) reading = readingRaw.map(textOf).filter(Boolean);
  else if (typeof readingRaw === 'string') reading = readingRaw.split(/[;；\n]/).map(textOf).filter(Boolean);
  const assessmentRaw = source.assessment || source.grading || source.evaluation || '';
  const assessment = Array.isArray(assessmentRaw)
    ? assessmentRaw.map(textOf).filter(Boolean)
    : textOf(assessmentRaw);
  return {
    code: textOf(source.code || source.courseCode),
    title: textOf(source.title || source.name),
    credits: textOf(source.credits || source.credit),
    hours: textOf(source.hours || source.totalHours || source.hoursTotal),
    audience: textOf(source.audience || source.target || source.students || source.grade),
    assessment,
    reading
  };
}

export function qualityCheck(plan, scenario) {
  const profile = stageProfile((plan && plan.stage) || (scenario && scenario.stage));
  const planSources = asArray(plan && plan.sources);
  const sourceMap = new Map();
  asArray(scenario && scenario.sources).forEach((source) => sourceMap.set(source.id, source));
  planSources.forEach((source) => {
    if (!sourceMap.has(source.id)) sourceMap.set(source.id, source);
  });
  const sourceIds = new Set(sourceMap.keys());
  const objectives = asArray(plan && plan.objectives);
  const flow = asArray(plan && plan.flow);
  const prerequisites = asArray(plan && plan.prerequisites);
  const assessment = asArray(plan && plan.assessment);

  const coveredObjectives = objectives.filter((item) => asArray(item.sourceIds).some((id) => sourceIds.has(id))).length;
  const objectiveOk = objectives.length > 0 && coveredObjectives === objectives.length;

  const standardIds = Array.from(sourceMap.values())
    .filter((source) => source.type === '课标')
    .map((source) => source.id);
  const standardSet = new Set(standardIds);
  const standardCited = standardIds.length > 0 && objectives.concat(flow).some((item) => {
    return asArray(item.sourceIds).some((id) => standardSet.has(id));
  });

  const syllabusIds = Array.from(sourceMap.values())
    .filter((source) => ['大纲', '课程大纲', '课标'].indexOf(source.type) !== -1)
    .map((source) => source.id);
  const syllabusSet = new Set(syllabusIds);
  const syllabusCited = syllabusIds.length > 0 && objectives.concat(flow).some((item) => {
    return asArray(item.sourceIds).some((id) => syllabusSet.has(id));
  });

  const totalMinutes = flow.reduce((sum, item) => sum + (Number(item.minutes) || 0), 0);
  const timeOk = flow.length > 0 && Math.abs(totalMinutes - (Number(plan && plan.duration) || 0)) <= 1;

  const corpus = objectives.map((item) => item.text).join(' ')
    + ' ' + flow.map((item) => `${item.teacher || ''} ${item.student || ''} ${item.evidence || ''}`).join(' ');
  const labels = prerequisites.map((item) => textOf(item.label)).filter(Boolean);
  const coveredLabels = labels.filter((label) => {
    if (corpus.indexOf(label) !== -1) return true;
    const short = Array.from(label).slice(0, 3).join('');
    return short.length >= 2 && corpus.indexOf(short) !== -1;
  }).length;
  const misconceptionOk = labels.length === 0 || coveredLabels / labels.length >= 0.6;

  const phases = new Set(flow.map((item) => item.phase).filter(Boolean));
  const completeActivities = flow.filter((item) => textOf(item.teacher) && textOf(item.student)).length;
  const activityOk = phases.size >= 4 && completeActivities >= 3;

  const assessmentOk = assessment.length >= 2 && assessment.every((item) => textOf(item && item.type));
  const course = courseInfo((plan && plan.course) || (scenario && scenario.course));
  const readingSourceCount = Array.from(sourceMap.values())
    .filter((source) => ['论文', '阅读', '外部', '讲义'].indexOf(source.type) !== -1).length;
  const readingOk = course.reading.length > 0 || readingSourceCount > 0;
  const integrityCorpus = corpus + ' ' + assessment.map((item) => `${item.type || ''} ${item.text || ''} ${item.criteria || ''}`).join(' ');
  const integrityOk = ['引用', '独立完成', '诚信', '学术规范', '抄袭'].some((word) => integrityCorpus.indexOf(word) !== -1);

  const checks = {
    'objective-source': {
      key: 'objective-source',
      label: '目标来源覆盖',
      status: objectiveOk ? 'pass' : 'warn',
      detail: objectiveOk
        ? `${objectives.length} 条目标均引用了资料源`
        : `${coveredObjectives}/${objectives.length} 条目标带有效来源`
    },
    standard: {
      key: 'standard',
      label: '课标对齐',
      status: standardCited ? 'pass' : 'warn',
      detail: standardCited
        ? '目标或流程直接引用了课标条目'
        : standardIds.length
          ? '课标条目尚未被目标或流程直接引用'
          : '当前场景未提供课标来源'
    },
    time: {
      key: 'time',
      label: '时间预算',
      status: timeOk ? 'pass' : 'warn',
      detail: timeOk
        ? `流程合计 ${totalMinutes} 分钟，与课时一致`
        : `流程合计 ${totalMinutes} 分钟，与 ${plan.duration} 分钟不一致`
    },
    syllabus: {
      key: 'syllabus',
      label: '大纲对齐',
      status: syllabusCited ? 'pass' : 'warn',
      detail: syllabusCited
        ? '目标或流程直接引用课程大纲/课标条目'
        : syllabusIds.length
          ? '大纲条目尚未被目标或流程直接引用'
          : '当前课程未提供大纲或课标来源'
    },
    duration: {
      key: 'duration',
      label: '学时匹配',
      status: timeOk ? 'pass' : 'warn',
      detail: timeOk
        ? `流程合计 ${totalMinutes} 分钟，与 ${plan.duration} 分钟（${profile.durationLabel}）一致`
        : `流程合计 ${totalMinutes} 分钟，与 ${plan.duration} 分钟（${profile.durationLabel}）不一致`
    },
    misconception: {
      key: 'misconception',
      label: '易错点覆盖',
      status: misconceptionOk ? 'pass' : 'warn',
      detail: labels.length
        ? `流程与目标覆盖 ${coveredLabels}/${labels.length} 个前概念`
        : '当前场景未提供前概念数据'
    },
    assessment: {
      key: 'assessment',
      label: '考核对应',
      status: assessmentOk ? 'pass' : 'warn',
      detail: assessmentOk
        ? `${assessment.length} 项考核均有类型与达成标准`
        : `当前 ${assessment.length} 项考核，建议至少 2 项并标注考核类型`
    },
    activity: {
      key: 'activity',
      label: '活动多样性',
      status: activityOk ? 'pass' : 'warn',
      detail: activityOk
        ? `${phases.size} 个阶段，${completeActivities} 段含师生双边活动`
        : `阶段 ${phases.size} 个，完整活动 ${completeActivities} 段，建议补充学生活动`
    },
    reading: {
      key: 'reading',
      label: '阅读量',
      status: readingOk ? 'pass' : 'warn',
      detail: readingOk
        ? `已提供 ${course.reading.length || readingSourceCount} 条阅读材料/论文`
        : '建议补充课程阅读清单或论文资料'
    },
    integrity: {
      key: 'integrity',
      label: '学术诚信',
      status: integrityOk ? 'pass' : 'warn',
      detail: integrityOk
        ? '流程或评价已包含引用规范与独立完成要求'
        : '建议在流程或评价中写入引用规范与独立完成要求'
    }
  };

  return profile.quality.map((item) => checks[item.key]).filter(Boolean);
}

/* ------------------------------------------------------------------ */
/* 模型草案合并                                                        */
/* ------------------------------------------------------------------ */

function normalizeFlowMinutes(items, duration) {
  const list = items.map((item) => ({ ...item, minutes: Math.max(1, Math.round(Number(item.minutes) || 1)) }));
  const total = list.reduce((sum, item) => sum + item.minutes, 0);
  if (!list.length || !duration) return list;
  if (total === duration) return list;
  const scaled = list.map((item) => Math.max(1, Math.round(item.minutes / total * duration)));
  let diff = duration - scaled.reduce((sum, value) => sum + value, 0);
  let guard = 0;
  while (diff !== 0 && guard < 100) {
    guard += 1;
    const index = diff > 0
      ? scaled.indexOf(Math.max(...scaled))
      : scaled.indexOf(Math.max(...scaled));
    if (scaled[index] + (diff > 0 ? 1 : -1) < 1) break;
    scaled[index] += diff > 0 ? 1 : -1;
    diff += diff > 0 ? -1 : 1;
  }
  return list.map((item, index) => ({ ...item, minutes: scaled[index] }));
}

function draftSourceIds(value, sourceIds, fallback) {
  const filtered = asArray(value).filter((id) => sourceIds.has(id));
  if (filtered.length) return filtered;
  return fallback ? [fallback] : [];
}

function applyDraft(base, draft, scenario, settings, retrieved) {
  if (!draft || typeof draft !== 'object') return base;
  const sourceIds = new Set(asArray(scenario.sources).map((source) => source.id));
  const fallbackSource = asArray(scenario.sources)[0] ? asArray(scenario.sources)[0].id : '';
  const plan = { ...base };

  if (textOf(draft.title) && charCount(textOf(draft.title)) >= 4 && charCount(textOf(draft.title)) <= 64) {
    plan.title = textOf(draft.title);
  }

  const draftObjectives = asArray(draft.objectives).map((item, index) => ({
    id: `o${index + 1}`,
    text: textOf(item && item.text),
    level: textOf(item && item.level) || '理解',
    sourceIds: draftSourceIds(item && item.sourceIds, sourceIds, fallbackSource)
  })).filter((item) => item.text && charCount(item.text) >= 4);
  if (draftObjectives.length >= 3) plan.objectives = draftObjectives.slice(0, 4);

  const draftFlow = asArray(draft.flow).map((item) => ({
    phase: textOf(item && item.phase) || '教学阶段',
    minutes: Number(item && item.minutes) || 1,
    teacher: textOf(item && item.teacher),
    student: textOf(item && item.student),
    evidence: textOf(item && item.evidence),
    sourceIds: draftSourceIds(item && item.sourceIds, sourceIds, fallbackSource)
  })).filter((item) => item.phase && item.teacher && item.student);
  if (draftFlow.length >= 4) {
    const maxPhases = Number(stageProfile(plan.stage).maxPhases) || 6;
    plan.flow = normalizeFlowMinutes(draftFlow.slice(0, maxPhases), plan.duration);
  }

  if (asArray(draft.keyPoints).length) plan.keyPoints = asArray(draft.keyPoints).map(textOf).filter(Boolean).slice(0, 5);
  if (asArray(draft.difficulties).length) plan.difficulties = asArray(draft.difficulties).map(textOf).filter(Boolean).slice(0, 5);

  const nodeIds = new Set(asArray(scenario.graph && scenario.graph.nodes).map((node) => node.id));
  const draftPrereqs = asArray(draft.prerequisites).map((item, index) => ({
    nodeId: textOf(item && item.nodeId) || `m${index + 1}`,
    label: textOf(item && item.label) || '前概念',
    misconception: textOf(item && item.misconception) || '存在相关模糊理解。',
    sourceIds: draftSourceIds(item && item.sourceIds, sourceIds, fallbackSource)
  })).filter((item) => nodeIds.has(item.nodeId) && item.label);
  if (draftPrereqs.length) plan.prerequisites = draftPrereqs.slice(0, 4);

  const draftAssessment = asArray(draft.assessment).map((item) => ({
    type: textOf(item && item.type) || '课堂评价',
    text: textOf(item && item.text),
    criteria: textOf(item && item.criteria) || '能完成任务并说明理由。'
  })).filter((item) => item.text);
  if (draftAssessment.length) plan.assessment = draftAssessment.slice(0, 4);

  const draftHomework = draft.homework || {};
  const basic = asArray(draftHomework.basic).map(textOf).filter(Boolean);
  const advanced = asArray(draftHomework.advanced).map(textOf).filter(Boolean);
  const remedial = asArray(draftHomework.remedial).map(textOf).filter(Boolean);
  if (basic.length || advanced.length || remedial.length) {
    plan.homework = {
      basic: basic.length ? basic.slice(0, 4) : plan.homework.basic,
      advanced: advanced.length ? advanced.slice(0, 4) : plan.homework.advanced,
      remedial: remedial.length ? remedial.slice(0, 4) : plan.homework.remedial
    };
  }

  const draftDiff = draft.differentiation || {};
  const support = asArray(draftDiff.support).map(textOf).filter(Boolean);
  const extension = asArray(draftDiff.extension).map(textOf).filter(Boolean);
  if (support.length || extension.length) {
    plan.differentiation = {
      support: support.length ? support.slice(0, 4) : plan.differentiation.support,
      extension: extension.length ? extension.slice(0, 4) : plan.differentiation.extension
    };
  }

  const draftRisks = normalizeRisks(draft.risks);
  if (draftRisks.length) plan.risks = draftRisks.slice(0, 5);

  plan.source = 'llm';
  plan.model = textOf(settings && settings.llm && settings.llm.model) || '模型';
  applyUserSources(plan, retrieved);
  attachSources(plan, scenario, retrieved);
  plan.quality = qualityCheck(plan, scenario);
  return plan;
}

/* ------------------------------------------------------------------ */
/* 对外入口                                                            */
/* ------------------------------------------------------------------ */

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generatePlan({ request, scenario, settings, onStage, tune } = {}) {
  if (!scenario) return null;
  const req = { ...(request || {}), tune: tune || (request && request.tune) || '' };
  const report = (stage) => {
    if (typeof onStage === 'function') {
      try {
        onStage(stage);
      } catch (err) {
        /* 回调失败不影响生成 */
      }
    }
  };

  report(STAGE_IDS[0]);
  await sleep(220);
  const retrieved = retrieve(req, scenario);

  report(STAGE_IDS[1]);
  await sleep(240);
  const localPlan = buildPlan(req, scenario, retrieved);

  report(STAGE_IDS[2]);
  let finalPlan = localPlan;
  const llm = settings && settings.llm;
  const hasKey = !!(llm && textOf(llm.apiKey));
  try {
    const { runPlanAgent } = await import('./agent.js');
    const result = await runPlanAgent({
      settings,
      request: req,
      scenario,
      retrieved,
      localPlan,
      applyDraft,
      qualityCheck,
      // Agent 轨迹只记录在 plan.agent，不改变 UI 的四阶段进度
      onTrace: () => {}
    });
    if (result && result.plan) finalPlan = result.plan;
  } catch (err) {
    finalPlan = localPlan;
  }
  if (!hasKey) await sleep(240);

  report(STAGE_IDS[3]);
  await sleep(220);
  finalPlan.quality = qualityCheck(finalPlan, scenario);
  return finalPlan;
}

export { buildPlan, buildFlow, normalizeRequest };

/* ------------------------------------------------------------------ */
/* 方案记录与版本                                                      */
/* ------------------------------------------------------------------ */

function clonePlan(plan) {
  try {
    return JSON.parse(JSON.stringify(plan, (key, value) => {
      if (key && key.indexOf('__') === 0) return undefined;
      return value;
    }));
  } catch (err) {
    return null;
  }
}

function versionId() {
  return `ver-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** 读取方案记录当前版本的数据；兼容「记录本身就是方案」的旧结构。 */
export function activeVersionOf(record) {
  if (!record || typeof record !== 'object') return null;
  const versions = Array.isArray(record.versions) ? record.versions : null;
  if (versions && versions.length) {
    const version = versions.find((item) => item && item.id === record.activeVersionId)
      || versions[versions.length - 1];
    if (!version || !version.data) return null;
    const data = clonePlan(Object.assign({}, version.data, {
      __versionId: version.id,
      __versionNote: version.note || '',
      __versionAt: version.createdAt || ''
    }));
    return data;
  }
  if (record.objectives || record.flow) return clonePlan(record);
  return null;
}

export function planVersionCount(record) {
  if (!record) return 0;
  if (Array.isArray(record.versions) && record.versions.length) return record.versions.length;
  return record.objectives || record.flow ? 1 : 0;
}

/**
 * 保存方案并按版本追加：新方案写入第 1 版，已有方案追加新版本。
 * 兼容商店层不同的 savePlan 实现（是否内建版本管理），不会重复写入。
 */
export function savePlanVersion(plan, note) {
  if (!plan) return null;
  const data = clonePlan(plan);
  if (!data) return null;
  const planId = data.id;
  const before = state.plans.find((item) => item.id === planId) || null;
  const beforeVersions = before && Array.isArray(before.versions) ? before.versions.slice() : null;

  let saved = null;
  try {
    // note 只用于版本说明，商店层会把它从版本数据中剥离
    saved = actions.savePlan(Object.assign({}, data, { note: note || '' }));
  } catch (err) {
    saved = null;
  }
  const record = state.plans.find((item) => item.id === planId) || saved;
  if (!record) return null;

  const now = new Date().toISOString();
  if (!Array.isArray(record.versions) || !record.versions.length) {
    const versions = [];
    if (before) {
      if (beforeVersions && beforeVersions.length) versions.push(...beforeVersions);
      else if (before.objectives || before.flow) {
        versions.push({
          id: versionId(),
          createdAt: before.createdAt || now,
          note: '初版',
          data: clonePlan(before)
        });
      }
    }
    const version = {
      id: versionId(),
      createdAt: now,
      note: note || (versions.length ? '修订' : '初版'),
      data: clonePlan(data)
    };
    versions.push(version);
    record.versions = versions;
    record.activeVersionId = version.id;
    record.updatedAt = now;
    record.status = '已生成';
    try {
      actions.savePlan(record);
    } catch (err) {
      /* 保留内存中的版本结构 */
    }
  } else {
    const latest = record.versions[record.versions.length - 1];
    if (latest && !latest.note) {
      latest.note = note || '修订';
      try {
        persist();
      } catch (err) {
        /* 忽略持久化失败 */
      }
    }
  }
  return record;
}
