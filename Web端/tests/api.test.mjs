import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
const dir=await mkdtemp(`${tmpdir()}/zhixi-test-`);
for(const source of ['services/api','services/config','data/mock']){
 await mkdir(`${dir}/${source.split('/')[0]}`,{recursive:true});
 const raw=(await readFile(`src/${source}.ts`,'utf8')).replaceAll('import.meta.env','({})');
 const output=ts.transpileModule(raw,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replace(/(from ['"])(\.{1,2}\/[^'"]+)(['"])/g,'$1$2.mjs$3');
 await writeFile(`${dir}/${source}.mjs`,output);
}
let stored=JSON.stringify({mode:'real',baseUrl:'/api/v1',healthPath:'/health',chatPath:'/chat',timeoutMs:1000});
globalThis.localStorage={getItem:()=>stored,setItem:(_,v)=>{stored=v;}};
const {api,requestJson}=await import(pathToFileURL(`${dir}/services/api.mjs`));
const {validateConfig}=await import(pathToFileURL(`${dir}/services/config.mjs`));
const config=()=>JSON.parse(stored);
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
after(()=>rm(dir,{recursive:true,force:true}));
test('chat sends agreed payload and accepts supported reply shapes',async()=>{
 for(const payload of [{reply:'ok'},{answer:'ok'},{response:'ok'},{message:{content:'ok'}}]){
 globalThis.fetch=async(url,opts)=>{assert.equal(url,'/api/v1/chat');assert.equal(opts.method,'POST');const b=JSON.parse(opts.body);assert.equal(b.message,'hello');assert.equal(b.history.length,0);return json(payload);};
 assert.equal(await api.chat('hello',[],{role:'大学生',field:'电子电路'}),'ok');}
});
test('health test checks real response even when config is mock',async()=>{globalThis.fetch=async()=>json({status:'ok'});assert.ok((await api.health({...config(),mode:'mock'})).latency>=0);globalThis.fetch=async()=>json({unexpected:true});await assert.rejects(api.health(config()),/健康检查/);});
test('HTML fallback and 404 JSON produce actionable errors',async()=>{globalThis.fetch=async()=>new Response('<html>SPA</html>');await assert.rejects(requestJson('/chat',{}),/未返回 JSON/);globalThis.fetch=async()=>json({detail:'Not Found'},404);await assert.rejects(requestJson('/chat',{}),/Not Found/);});
test('422 validation arrays and network errors are handled',async()=>{globalThis.fetch=async()=>json({detail:[{msg:'required'}]},422);await assert.rejects(requestJson('/chat',{}),/422/);globalThis.fetch=async()=>{throw new TypeError('Failed to fetch');};await assert.rejects(requestJson('/chat',{}),/无法连接后端/);});
test('malformed nested diagnosis data rejected before UI rendering',async()=>{globalThis.fetch=async()=>json({sessionId:'x',summary:'x',graph:{nodes:[{}],edges:[]},sources:[],quiz:[]});await assert.rejects(api.startDiagnosis({profile:{role:'大学生',field:'电路'},question:'x'}),/数据格式/);});
test('valid full diagnosis and grading contracts accepted',async()=>{const start={sessionId:'s1',summary:'test',graph:{nodes:[{id:'n',label:'n',description:'n',status:'target',x:0,y:0}],edges:[]},sources:[],quiz:[{id:'q',prompt:'?',options:[{value:'a',label:'A'},{value:'b',label:'B'}]}]};globalThis.fetch=async()=>json(start);assert.deepEqual(await api.startDiagnosis({profile:{role:'大学生',field:'电路'},question:'x'}),start);const grade={accuracyText:'1/1',weakPoints:[],learningPath:[{id:'s',title:'step',description:'learn',duration:'5 min',relatedNodeIds:['n']}],advice:'ok'};globalThis.fetch=async()=>json(grade);assert.deepEqual(await api.submitDiagnosis({sessionId:'s1',answers:{q:'a'}}),grade);});
test('timeout and explicit cancellation are distinct',async()=>{globalThis.fetch=async(_url,options)=>new Promise((resolve,reject)=>{if(options.signal.aborted)return reject(new Error('abort'));options.signal.addEventListener('abort',()=>reject(new Error('abort')),{once:true});});await assert.rejects(requestJson('/chat',{}),/超时/);const c=new AbortController();const p=requestJson('/chat',{}, {signal:c.signal});c.abort();await assert.rejects(p,/已取消/);});
test('config rejects credential URLs, invalid paths and invalid timeout',()=>{assert.throws(()=>validateConfig({...config(),baseUrl:'https://name:password@example.com'}),/凭据/);assert.throws(()=>validateConfig({...config(),chatPath:'//example.com'}),/路径/);assert.throws(()=>validateConfig({...config(),timeoutMs:0}),/超时/);});
test('mock diagnosis, grading and retest stay self contained',async()=>{stored=JSON.stringify({...config(),mode:'mock'});globalThis.fetch=async()=>{throw new Error('must not call network');};const one=await api.startDiagnosis({profile:{role:'大学生',field:'电子电路'},question:'KVL'});const score=await api.submitDiagnosis({sessionId:one.sessionId,answers:{q1:'b',q2:'b'}});assert.equal(score.accuracyText,'2/2 道回答正确');const two=await api.startRetest({sessionId:one.sessionId});assert.notEqual(two.sessionId,one.sessionId);assert.notEqual(two.quiz[0].id,one.quiz[0].id);});


