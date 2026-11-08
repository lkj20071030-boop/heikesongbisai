import type {
  KnowledgeGraph, StartDiagnosisRequest, StartDiagnosisResponse,
  SubmitDiagnosisRequest, SubmitDiagnosisResponse
} from '../types';

export const demoGraph: KnowledgeGraph = {
  nodes: [
    { id: 'current', label: '电流与电荷', description: '理解电流和电荷的关系', status: 'prerequisite', x: 20, y: 35 },
    { id: 'voltage', label: '电压与电势差', description: '理解两点之间的电势差', status: 'prerequisite', x: 20, y: 165 },
    { id: 'resistance', label: '电阻与欧姆定律', description: '理解 U=IR 与基本电阻关系', status: 'prerequisite', x: 20, y: 295 },
    { id: 'loop', label: '闭合回路', description: '认识回路、支路与节点', status: 'prerequisite', x: 310, y: 80 },
    { id: 'direction', label: '电压参考方向', description: '识别电压变化的符号', status: 'prerequisite', x: 310, y: 245 },
    { id: 'kvl', label: '基尔霍夫电压定律', description: '闭合回路的电压代数和', status: 'target', x: 610, y: 155 },
  ],
  edges: [
    { source: 'current', target: 'loop' },
    { source: 'voltage', target: 'direction' },
    { source: 'resistance', target: 'direction' },
    { source: 'loop', target: 'kvl' },
    { source: 'direction', target: 'kvl' },
  ],
};

// 演示来源：不是通过实时搜索获得的，仅用于布局与数据契约联调。
const demoSources = [
  {
    id: 'demo-source-1',
    title: '电路基础知识卡：电压与电势差',
    organization: '项目示例资料库（非权威引用）',
    excerpt: '电压是电路中两点间的电势差。理解电压有助于理解回路中的电压变化。',
    verified: false,
  },
  {
    id: 'demo-source-2',
    title: '电路基础知识卡：基尔霍夫定律',
    organization: '项目示例资料库（非权威引用）',
    excerpt: '在适用条件下，沿闭合回路一周，电压变化的代数和为零。',
    verified: false,
  },
];

export async function mockStartDiagnosis(req: StartDiagnosisRequest): Promise<StartDiagnosisResponse> {
  await new Promise(resolve => setTimeout(resolve, 450));
  return {
    sessionId: 'demo-session-01',
    summary: `已收到“${req.question}”。下面演示如何围绕前置知识构建可解释的诊断。当前模拟数据仅覆盖「电路基本定律」，尚不具备全学科自动搜索能力。`,
    graph: demoGraph,
    sources: demoSources,
    quiz: [
      { id: 'q1', prompt: '电压主要描述什么？', options: [
        { value: 'a', label: '电荷运动的速度' },
        { value: 'b', label: '两点之间的电势差' },
        { value: 'c', label: '导线中电荷的总数量' },
      ] },
      { id: 'q2', prompt: '沿闭合回路绕行一周，各段电压变化的代数和通常为多少？', options: [
        { value: 'a', label: '始终等于电源的标称电压' },
        { value: 'b', label: '零' },
        { value: 'c', label: '取决于电路中元件的个数' },
      ] },
    ],
  };
}

export async function mockSubmitDiagnosis(req: SubmitDiagnosisRequest): Promise<SubmitDiagnosisResponse> {
  await new Promise(resolve => setTimeout(resolve, 300));
  const retest = req.sessionId.startsWith('retest-');
  const correct = retest ? Number(req.answers.r1 === 'b') + Number(req.answers.r2 === 'c') : Number(req.answers.q1 === 'b') + Number(req.answers.q2 === 'b');
  const voltageWeak = retest ? req.answers.r1 !== 'b' : req.answers.q1 !== 'b';
  const kvlWeak = retest ? req.answers.r2 !== 'c' : req.answers.q2 !== 'b';
  const weakPoints = [
    ...(voltageWeak ? [{ id: 'voltage', title: '电压与电势差', reason: '诊断题中电压基本概念回答不准确，需要进一步确认。' }] : []),
    ...(kvlWeak ? [{ id: 'kvl', title: 'KVL 基本定义', reason: '闭合回路的电压变化规律有待巩固。' }] : []),
  ];
  return {
    accuracyText: `${correct}/2 道回答正确`,
    weakPoints,
    advice: weakPoints.length ? '以下为“疑似薄弱点”，不是正式学习能力评定；需要通过进一步练习和复测确认。' : '两题均正确，可以继续尝试更复杂的回路计算和迁移练习。',
    learningPath: [
      ...(voltageWeak ? [{ id: 's1', title: '重新理解电压与电势差', duration: '5 分钟', description: '结合两点电势差的示意图解释电压，再做一道识别练习。', relatedNodeIds: ['voltage'] }] : []),
      { id: 's2', title: '学习回路与参考方向', duration: '8 分钟', description: '区分闭合回路、正负参考方向与电压升降。', relatedNodeIds: ['loop', 'direction'] },
      { id: 's3', title: 'KVL 例题与复测', duration: '10 分钟', description: '从简单单回路入手，写出电压代数和并检查正负号。', relatedNodeIds: ['kvl'] },
    ],
  };
}

// 二轮题目与首轮不同，避免“把原题再做一遍”被误当成复测。
export async function mockStartRetest(sessionId: string): Promise<StartDiagnosisResponse> {
  await new Promise(resolve => setTimeout(resolve, 250));
  return {
    sessionId: `retest-${sessionId}`,
    summary: '已切换到复测题。题目与第一轮不同，重点检查是否能够迁移相关知识。本次仍然是演示题库，不代表正式的掌握度测量。',
    graph: demoGraph,
    sources: demoSources,
    quiz: [
      { id: 'r1', prompt: '一个 10Ω 电阻两端电压为 20V，通过它的电流是多少？', options: [
        { value: 'a', label: '0.5A' }, { value: 'b', label: '2A' }, { value: 'c', label: '200A' }
      ] },
      { id: 'r2', prompt: '简单单回路中，电源提供 12V，两个电阻上的电压降分别为 5V 与多少？', options: [
        { value: 'a', label: '17V' }, { value: 'b', label: '12V' }, { value: 'c', label: '7V' }
      ] }
    ]
  };
}
