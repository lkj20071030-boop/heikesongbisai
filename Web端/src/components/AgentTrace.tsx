import { CircleCheck, Cpu, Database, Sparkles, TriangleAlert } from 'lucide-react';
import type { AgentMeta } from '../types';

export default function AgentTrace({ agent, title = 'Agent 运行轨迹' }: { agent?: AgentMeta; title?: string }) {
  if (!agent) return null;
  const orchestrated = agent.mode === 'agent';
  return <section className="panel glass agent-trace">
    <div className="panel-title">
      <span><Sparkles size={17}/>{title}</span>
      <span className="agent-mode">
        <span className="subtle-pill">{orchestrated ? <Sparkles size={10}/> : <Cpu size={10}/>}{orchestrated ? 'LLM 编排' : '本地规则'}</span>
        {agent.model && <span className="subtle-pill agent-model" title={agent.promptVersion ? `Prompt ${agent.promptVersion}` : undefined}>{agent.model}</span>}
      </span>
    </div>
    <div className="agent-stages">
      {agent.stages.map((trace, index) => <div key={`${trace.stage}-${index}`} className={'agent-stage' + (trace.status === 'fallback' ? ' fallback' : '')} title={trace.error}>
        <span className="agent-stage-label">{trace.label}</span>
        <span className={'agent-engine ' + trace.engine}>{trace.engine === 'llm' ? <Sparkles size={10}/> : <Database size={10}/>}{trace.engine === 'llm' ? '模型' : '规则'}</span>
        <span className="agent-status">{trace.status === 'ok' ? <CircleCheck size={12}/> : <TriangleAlert size={12}/>}{trace.status === 'ok' ? '正常' : '已回退'}</span>
        <span className="agent-latency">{trace.latencyMs} ms</span>
      </div>)}
    </div>
    {agent.degraded && <p className="agent-degraded"><TriangleAlert size={12}/>部分环节已回退本地规则，结果仍可用</p>}
  </section>;
}
