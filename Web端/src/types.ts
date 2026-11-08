export type Role = '小学生' | '中学生' | '大学生' | '小学教师' | '中学教师' | '大学教师';
export type KnowledgeStatus = 'target' | 'prerequisite' | 'mastered' | 'weak';

export interface Profile {
  role: Role;
  field: string;
}

export interface KnowledgeNode {
  id: string;
  label: string;
  description: string;
  status: KnowledgeStatus;
  x: number;
  y: number;
}
export interface KnowledgeEdge { source: string; target: string }
export interface KnowledgeGraph { nodes: KnowledgeNode[]; edges: KnowledgeEdge[] }

export interface Source {
  id: string;
  title: string;
  organization: string;
  excerpt: string;
  url?: string;
  verified?: boolean;
}
export interface QuizQuestion {
  id: string;
  prompt: string;
  options: { value: string; label: string }[];
}
export interface AgentStageTrace {
  stage: string;
  label: string;
  engine: 'llm' | 'local';
  status: 'ok' | 'fallback';
  latencyMs: number;
  error?: string;
}
export interface AgentMeta {
  mode: 'agent' | 'local';
  enabled: boolean;
  model?: string | null;
  promptVersion?: string;
  degraded: boolean;
  stages: AgentStageTrace[];
}
export interface StartDiagnosisRequest { profile: Profile; question: string }
export interface StartDiagnosisResponse {
  sessionId: string;
  summary: string;
  graph: KnowledgeGraph;
  sources: Source[];
  quiz: QuizQuestion[];
  agent?: AgentMeta;
}
export interface WeakPoint { id: string; title: string; reason: string }
export interface LearningStep {
  id: string;
  title: string;
  duration: string;
  description: string;
  relatedNodeIds: string[];
}
export interface SubmitDiagnosisRequest {
  sessionId: string;
  answers: Record<string, string>;
}
export interface SubmitDiagnosisResponse {
  accuracyText: string;
  weakPoints: WeakPoint[];
  learningPath: LearningStep[];
  advice: string;
  agent?: AgentMeta;
}
