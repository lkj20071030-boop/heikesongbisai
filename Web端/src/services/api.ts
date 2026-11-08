import type { StartDiagnosisRequest, StartDiagnosisResponse, SubmitDiagnosisRequest, SubmitDiagnosisResponse, KnowledgeGraph, Source, Profile, AgentMeta, AgentStageTrace } from '../types';
import { mockStartDiagnosis, mockSubmitDiagnosis, mockStartRetest } from '../data/mock';
import { getConfig, validateConfig, type ApiConfig } from './config';
export interface ChatMessage { role: 'user' | 'assistant'; content: string }
export class ApiError extends Error { constructor(message: string, public status?: number) { super(message); this.name='ApiError'; } }
type Obj = Record<string, unknown>;
const obj=(v:unknown):v is Obj=>typeof v==='object' && v!==null && !Array.isArray(v);
const str=(v:unknown):v is string=>typeof v==='string';
const strings=(v:unknown)=>Array.isArray(v)&&v.every(str);
const fail=()=>{throw new ApiError('后端返回的数据格式不符合接口约定，请查看 API-CONTRACT.md。');};
function sources(v:unknown):Source[] { if(!Array.isArray(v)||!v.every(s=>obj(s)&&str(s.id)&&str(s.title)&&str(s.organization)&&str(s.excerpt)&&(s.url===undefined||str(s.url))&&(s.verified===undefined||typeof s.verified==='boolean')))return fail();return v as Source[]; }
function graph(v:unknown):KnowledgeGraph { if(!obj(v)||!Array.isArray(v.nodes)||!Array.isArray(v.edges)||!v.nodes.every(n=>obj(n)&&str(n.id)&&str(n.label)&&str(n.description)&&['target','prerequisite','mastered','weak'].includes(String(n.status))&&Number.isFinite(n.x)&&Number.isFinite(n.y))||!v.edges.every(e=>obj(e)&&str(e.source)&&str(e.target)))return fail();return v as unknown as KnowledgeGraph; }
function agentStage(v:unknown):AgentStageTrace|undefined {
  if(!obj(v)||!str(v.stage)||!str(v.label)||(v.engine!=='llm'&&v.engine!=='local')||(v.status!=='ok'&&v.status!=='fallback')||typeof v.latencyMs!=='number'||!Number.isFinite(v.latencyMs)||(v.error!==undefined&&!str(v.error)))return undefined;
  const trace:AgentStageTrace={stage:v.stage,label:v.label,engine:v.engine,status:v.status,latencyMs:v.latencyMs};
  if(str(v.error))trace.error=v.error;
  return trace;
}
function agentMeta(v:unknown):AgentMeta|undefined {
  if(!obj(v)||(v.mode!=='agent'&&v.mode!=='local')||typeof v.enabled!=='boolean'||typeof v.degraded!=='boolean'||!Array.isArray(v.stages))return undefined;
  const stages:AgentStageTrace[]=[];
  for(const item of v.stages){const trace=agentStage(item);if(!trace)return undefined;stages.push(trace);}
  const meta:AgentMeta={mode:v.mode,enabled:v.enabled,degraded:v.degraded,stages};
  if(str(v.model))meta.model=v.model;else if(v.model===null)meta.model=null;
  if(str(v.promptVersion))meta.promptVersion=v.promptVersion;
  return meta;
}
function diagnosis(v:unknown):StartDiagnosisResponse { if(!obj(v)||!str(v.sessionId)||!str(v.summary)||!Array.isArray(v.quiz)||!v.quiz.every(q=>obj(q)&&str(q.id)&&str(q.prompt)&&Array.isArray(q.options)&&q.options.length>=2&&q.options.every(o=>obj(o)&&str(o.value)&&str(o.label)))) return fail(); graph(v.graph);sources(v.sources);const out=v as unknown as StartDiagnosisResponse;const meta=agentMeta(out.agent);if(meta)out.agent=meta;else delete out.agent;return out; }
function result(v:unknown):SubmitDiagnosisResponse { if(!obj(v)||!str(v.accuracyText)||!str(v.advice)||!Array.isArray(v.weakPoints)||!v.weakPoints.every(p=>obj(p)&&str(p.id)&&str(p.title)&&str(p.reason))||!Array.isArray(v.learningPath)||!v.learningPath.every(p=>obj(p)&&str(p.id)&&str(p.title)&&str(p.duration)&&str(p.description)&&strings(p.relatedNodeIds)))return fail();const out=v as unknown as SubmitDiagnosisResponse;const meta=agentMeta(out.agent);if(meta)out.agent=meta;else delete out.agent;return out; }
export async function requestJson(path:string, body?:unknown, options:{signal?:AbortSignal;config?:ApiConfig}={}):Promise<unknown> {
  const c=validateConfig(options.config||getConfig());
  const controller=new AbortController();let timedOut=false;
  const abort=()=>controller.abort();
  options.signal?.addEventListener('abort',abort,{once:true}); if(options.signal?.aborted)controller.abort();
  const timer=setTimeout(()=>{timedOut=true;controller.abort();},c.timeoutMs);
  try {
    const response=await fetch(`${c.baseUrl}${path}`,{method:body===undefined?'GET':'POST',headers:body===undefined?{'Accept':'application/json'}:{'Content-Type':'application/json','Accept':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:controller.signal});
    const raw=await response.text();let data:unknown;
    try{data=JSON.parse(raw);}catch{throw new ApiError(`后端未返回 JSON（HTTP ${response.status}）。请检查接口地址与代理配置。`,response.status);}
    if(!response.ok){const detail=obj(data)?data.detail||data.message:undefined;throw new ApiError(str(detail)?detail:Array.isArray(detail)?'请求参数不符合后端要求（422），请核对接口约定。':`请求失败（HTTP ${response.status}）`,response.status);}
    return data;
  } catch(e) { if(controller.signal.aborted)throw new ApiError(timedOut?'请求超时，请检查后端或增加等待时间。':'请求已取消');if(e instanceof ApiError)throw e;throw new ApiError('无法连接后端，请检查服务是否启动、地址、HTTPS 与 CORS 设置。'); }
  finally{clearTimeout(timer);options.signal?.removeEventListener('abort',abort);}
}
export const api={
  async health(config:ApiConfig,signal?:AbortSignal){const started=performance.now();const data=await requestJson(config.healthPath,undefined,{config,signal});if(!obj(data)||!(data.status==='ok'||data.status==='healthy'||data.ok===true))throw new ApiError('服务有响应，但健康检查需返回 {"status":"ok"} 或 {"ok":true}。');return {latency:Math.round(performance.now()-started)};},
  async chat(message:string,history:ChatMessage[],profile:Profile,signal?:AbortSignal):Promise<string>{
    if(getConfig().mode==='mock'){await new Promise(r=>setTimeout(r,400));return `【演示回答】\n你问的是：${message}\n\n以电路基础为例：电压描述两点之间的电势差，电流描述电荷流动的速率。对于电阻元件，可以通过 U = IR 联系这两个量。\n\n这是固定的电路知识示例，并非模型实时生成。你可以切换到「知识诊断」完成两道练习，或在「连接设置」接入自己的后端。`;}
    const data=await requestJson(getConfig().chatPath,{message,history,profile},{signal});
    if(!obj(data))return fail();const content=data.reply??data.answer??data.response??(obj(data.message)?data.message.content:undefined);if(!str(content)||!content.trim())return fail();return content;
  },
  async startDiagnosis(body:StartDiagnosisRequest,signal?:AbortSignal):Promise<StartDiagnosisResponse>{return getConfig().mode==='mock'?mockStartDiagnosis(body):diagnosis(await requestJson('/diagnose/start',body,{signal}));},
  async submitDiagnosis(body:SubmitDiagnosisRequest,signal?:AbortSignal):Promise<SubmitDiagnosisResponse>{return getConfig().mode==='mock'?mockSubmitDiagnosis(body):result(await requestJson('/diagnose/submit',body,{signal}));},
  async startRetest(body:{sessionId:string},signal?:AbortSignal):Promise<StartDiagnosisResponse>{return getConfig().mode==='mock'?mockStartRetest(body.sessionId):diagnosis(await requestJson('/diagnose/retest',body,{signal}));},
  async explain(sessionId:string,nodeId:string,signal?:AbortSignal):Promise<string>{if(getConfig().mode==='mock')return '演示讲解：先理解概念的定义，再画出电路并标记参考方向，最后用一道例题检验理解。真实讲解需要连接后端。';const data=await requestJson('/learn/explain',{sessionId,nodeId},{signal});if(!obj(data)||!str(data.explanation))return fail();return data.explanation;},
  async getGraph(sessionId:string,signal?:AbortSignal){return graph(await requestJson(`/graph/${encodeURIComponent(sessionId)}`,undefined,{signal}));},
  async getSources(sessionId:string,signal?:AbortSignal){return sources(await requestJson(`/sources/${encodeURIComponent(sessionId)}`,undefined,{signal}));}
};
