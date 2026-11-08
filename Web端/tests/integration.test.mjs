import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
import {createApp} from '../server/index.mjs';
import {topics} from '../server/data/topics.mjs';

test('前端真实 API → HTTP 后端 → app 三主题资料 → 评分/讲解/图谱/复测完整闭环',async()=>{
 const temp=await mkdtemp(tmpdir()+'/zhixi-integration-');
 const server=createApp({storePath:null});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${server.address().port}`;
 try{
  for(const source of ['services/api','services/config','data/mock']){
   await mkdir(`${temp}/${source.split('/')[0]}`,{recursive:true});
   const raw=(await readFile(`src/${source}.ts`,'utf8')).replaceAll('import.meta.env','({})');
   const output=ts.transpileModule(raw,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replace(/(from ['"])(\.{1,2}\/[^'"]+)(['"])/g,'$1$2.mjs$3');
   await writeFile(`${temp}/${source}.mjs`,output);
  }
  const cfg={mode:'real',baseUrl:base+'/api/v1',healthPath:'/health',chatPath:'/chat',timeoutMs:5000};
  globalThis.localStorage={getItem:()=>JSON.stringify(cfg),setItem:()=>{}};
  const {api}=await import(pathToFileURL(`${temp}/services/api.mjs`));
  const {getConfig}=await import(pathToFileURL(`${temp}/services/config.mjs`));
  assert.equal(getConfig().mode,'real');await api.health(cfg);
  const html=await fetch(base+'/');assert.equal(html.status,200);const page=await html.text();assert.ok(page.includes('id="root"'));
  const asset=page.match(/src="([^"]+\.js)"/)[1];assert.equal((await fetch(base+asset)).status,200);
  for(const topic of topics){
   const one=await api.startDiagnosis({profile:{role:'大学生',field:'综合'},question:topic.title});
   assert.equal(one.quiz.length,topic.quiz.length);assert.ok(one.summary.includes(topic.title));assert.ok(one.graph.nodes.length>3);
   assert.ok(!JSON.stringify(one.quiz).includes('"answer"'));
   const missing=await fetch(base+'/api/v1/diagnose/submit',{method:'POST',body:JSON.stringify({sessionId:one.sessionId,answers:{}})});assert.equal(missing.status,422);
   const answers=Object.fromEntries(topic.quiz.map(q=>[q.id,String.fromCharCode(97+(q.answer+1)%q.options.length)]));
   const result=await api.submitDiagnosis({sessionId:one.sessionId,answers});assert.ok(result.weakPoints.length);assert.ok(result.learningPath.length);assert.match(result.accuracyText,/^0\//);
   const explanation=await api.explain(one.sessionId,result.learningPath[0].relatedNodeIds[0]);assert.ok(explanation.length>30);
   assert.ok((await api.getGraph(one.sessionId)).nodes.some(n=>n.status==='weak'));assert.ok((await api.getSources(one.sessionId)).length);
   const two=await api.startRetest({sessionId:one.sessionId});assert.notEqual(two.sessionId,one.sessionId);assert.notEqual(two.quiz[0].prompt,one.quiz[0].prompt);
   const passed=await api.submitDiagnosis({sessionId:two.sessionId,answers:Object.fromEntries(topic.retest.map(q=>[q.id,String.fromCharCode(97+q.answer)]))});assert.equal(passed.weakPoints.length,0);
  }
  await assert.rejects(api.startDiagnosis({profile:{role:'大学生',field:'综合'},question:'测试一个不支持的主题'}),/当前资料库支持/);
  await assert.rejects(api.getGraph('missing-session'),/会话不存在/);
  const malformed=await fetch(base+'/api/v1/diagnose/start',{method:'POST',body:'{'});assert.equal(malformed.status,400);
  const cors=await fetch(base+'/api/v1/health',{headers:{Origin:'http://127.0.0.1:5173'}});assert.equal(cors.headers.get('Access-Control-Allow-Origin'),'http://127.0.0.1:5173');
  const unknown=await fetch(base+'/api/v1/missing');assert.equal(unknown.status,404);assert.match(unknown.headers.get('content-type'),/json/);
 }finally{await new Promise(r=>server.close(r));await rm(temp,{recursive:true,force:true});}
});
