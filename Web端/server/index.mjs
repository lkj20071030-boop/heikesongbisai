import http from 'node:http';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { topics } from './data/topics.mjs';
import { resolveAgentConfig } from './agent/config.mjs';
import { createDiagnosisAgent } from './agent/orchestrator.mjs';
import { graphOf, publicSources, normalizeQuestion } from './agent/knowledge.mjs';
import { FUNCTION_PLOT_TOOL, plotFunction } from './tools/functionPlot.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fail = (status, message) => { const e = new Error(message); e.status = status; throw e; };

export function createApp({storePath = path.join(root,'server/.data/sessions.json'), dist = path.join(root,'dist'), llm} = {}) {
  const agentConfig = resolveAgentConfig(process.env, llm);
  const agent = createDiagnosisAgent({llm: agentConfig, topics});
  const agentInfo = agent.status();
  const sessions = new Map();
  const reviveQuestions = (entry, topic) => (Array.isArray(entry.questions) && entry.questions.length ? entry.questions : entry.retest ? topic.retest : topic.quiz).map(normalizeQuestion);

  if(storePath && fs.existsSync(storePath)) {
    const entries = JSON.parse(fs.readFileSync(storePath,'utf8'));
    for(const entry of entries){
      const topic = topics.find(t => t.id === entry.topicId);
      if(topic) sessions.set(entry.id, {...entry, topic, questions: reviveQuestions(entry, topic)});
    }
  }
  function persist(){
    if(!storePath) return;
    fs.mkdirSync(path.dirname(storePath),{recursive:true});
    const data = [...sessions.values()].map(({topic,questions,...rest}) => ({...rest, topicId: topic.id, questions}));
    fs.writeFileSync(storePath+'.tmp', JSON.stringify(data));
    fs.renameSync(storePath+'.tmp', storePath);
  }
  function get(id){return sessions.get(id)||fail(404,'诊断会话不存在，请重新开始诊断。');}
  function newSession(prepared){
    const session = {id:randomUUID(), topic:prepared.topic, question:prepared.question, profile:prepared.profile, retest:!!prepared.retest, questions:prepared.questions, summary:prepared.summary, weak:[], createdAt:new Date().toISOString()};
    sessions.set(session.id, session);
    persist();
    return session;
  }
  const publicStart = (session, prepared) => ({sessionId:session.id, summary:prepared.summary, graph:prepared.graph, sources:prepared.sources, quiz:prepared.publicQuiz, agent:prepared.agent});

  const server = http.createServer(async(req,res)=>{
    const origin = req.headers.origin;
    const allowed = new Set((process.env.CORS_ORIGINS||'http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:4173,http://localhost:4173').split(',').map(s=>s.trim()));
    if(origin&&allowed.has(origin)){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Headers','Content-Type');res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');}
    const send=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
    try{
      if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
      const url = new URL(req.url,'http://localhost');
      const route = url.pathname.replace(/^\/api\/v1(?=\/|$)/,'')||'/';
      let body={};
      if(req.method==='POST'){
        const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>65536)fail(413,'请求过大');chunks.push(chunk);}
        try{body=JSON.parse(Buffer.concat(chunks).toString()||'{}');}catch{fail(400,'请求必须为合法 JSON');}
        if(!body||Array.isArray(body)||typeof body!=='object')fail(400,'请求必须为 JSON 对象');
      }
      if(req.method==='GET'&&route==='/health')return send(200,{status:'ok',engine:'app-local-knowledge',topics:topics.map(t=>({id:t.id,title:t.title})),llmConfigured:!!(agentConfig.baseUrl&&agentConfig.model),agent:{enabled:agentInfo.enabled,mode:agentInfo.mode,model:agentInfo.model,promptVersion:agentInfo.promptVersion}});
      if(req.method==='GET'&&route==='/agent/status')return send(200,agentInfo);
      if(route==='/tools'&&req.method!=='GET')fail(405,'不支持该请求方法');
      if(route==='/tools/function.plot/invoke'&&req.method!=='POST')fail(405,'不支持该请求方法');
      if(req.method==='GET'&&route==='/tools')return send(200,{tools:[FUNCTION_PLOT_TOOL]});
      if(req.method==='POST'&&route==='/tools/function.plot/invoke'){
        const started=performance.now();
        const result=plotFunction(body);
        return send(200,{ok:true,durationMs:Math.round(performance.now()-started),result});
      }
      if(req.method==='POST'&&route==='/diagnose/start'){
        if(typeof body.question!=='string'||!body.question.trim()||body.question.length>2000)fail(422,'问题需为 1–2000 个字符');
        if(!body.profile||typeof body.profile.role!=='string'||typeof body.profile.field!=='string')fail(422,'缺少学习身份或学科');
        const prepared = await agent.start({question:body.question, profile:body.profile});
        return send(200,publicStart(newSession(prepared), prepared));
      }
      if(req.method==='POST'&&route==='/diagnose/submit'){
        const session = get(body.sessionId);
        const {result,agent:agentMeta} = await agent.submit({session, answers:body.answers});
        persist();
        return send(200,{...result,agent:agentMeta});
      }
      if(req.method==='POST'&&route==='/diagnose/retest'){
        const session = get(body.sessionId);
        const prepared = await agent.retest({session});
        return send(200,publicStart(newSession(prepared), prepared));
      }
      if(req.method==='POST'&&route==='/learn/explain'){
        const session = get(body.sessionId);
        const {explanation,agent:agentMeta} = await agent.explain({session, nodeId:body.nodeId});
        return send(200,{explanation,agent:agentMeta});
      }
      if(req.method==='GET'&&(route.startsWith('/graph/')||route.startsWith('/sources/'))){
        const session = get(decodeURIComponent(route.split('/')[2]));
        return send(200,route.startsWith('/graph/')?graphOf(session.topic,session.weak):publicSources(session.topic));
      }
      if(req.method==='POST'&&route==='/chat'){
        if(!agentInfo.enabled)fail(503,'未配置服务端模型；知识诊断与学习资料功能仍可使用。');
        if(typeof body.message!=='string'||!body.message.trim())fail(422,'请输入消息');
        const session = body.sessionId ? sessions.get(body.sessionId) : undefined;
        const {reply,agent:agentMeta} = await agent.chat({message:body.message, history:body.history, profile:body.profile, sessionId:body.sessionId, session});
        return send(200,{reply,agent:agentMeta});
      }
      if(url.pathname.startsWith('/api/'))fail(404,'接口不存在');
      if(req.method!=='GET'&&req.method!=='HEAD')fail(405,'不支持该请求方法');
      const file=path.resolve(dist,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
      if(!file.startsWith(path.resolve(dist)+path.sep))fail(403,'访问被拒绝');
      if(!fs.existsSync(file)||!fs.statSync(file).isFile())fail(404,'文件不存在；请先运行 npm run build');
      const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
      res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);
    }catch(e){send(e.status||500,{detail:e.status?e.message:'服务器处理失败，请查看服务端日志。'});if(!e.status)console.error(e.message);}
  });
  return server;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const port=Number(process.env.PORT||8000);createApp().listen(port,'127.0.0.1',()=>console.log(`智析前后端已启动：http://127.0.0.1:${port}（知识库 + Agent 编排）`));
}
