import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../server/index.mjs';

let server;
let base;

before(async()=>{
 server=createApp({storePath:null});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 base=`http://127.0.0.1:${server.address().port}/api/v1`;
});
after(()=>new Promise(resolve=>server.close(resolve)));

const invoke=(body,method='POST')=>fetch(base+'/tools/function.plot/invoke',{method,headers:{'Content-Type':'application/json'},body:method==='POST'?JSON.stringify(body):undefined});

test('function.plot 合法表达式返回确定性 SVG 与纯文本',async()=>{
 const response=await invoke({expression:'sin(x)',domain:[-10,10]});
 assert.equal(response.status,200);
 const data=await response.json();
 assert.equal(data.ok,true);
 assert.ok(Number.isFinite(data.durationMs)&&data.durationMs>=0);
 assert.equal(data.result.artifact.kind,'function');
 assert.equal(data.result.artifact.expression,'sin(x)');
 assert.deepEqual(data.result.artifact.domain,[-10,10]);
 assert.match(data.result.svg,/^<svg[^>]*>/);
 assert.match(data.result.svg,/<path /);
 assert.match(data.result.svg,/stroke="#6366f1"/);
 assert.match(data.result.text,/y = sin\(x\)/);
 assert.match(data.result.text,/x ∈ \[-10, 10\]/);

 const again=await (await invoke({expression:'sin(x)',domain:[-10,10]})).json();
 assert.equal(again.result.svg,data.result.svg);
 assert.equal(again.result.text,data.result.text);
});

test('function.plot 非法字符与超长表达式返回 422',async()=>{
 for(const expression of ['alert(1)','x; 1','sin(x)!','x'.repeat(201)]){
  const response=await invoke({expression,domain:[-10,10]});
  assert.equal(response.status,422);
  const data=await response.json();
  assert.equal(typeof data.detail,'string');
  assert.ok(data.detail.length>0);
 }
});

test('function.plot 反向或越界定义域返回 422',async()=>{
 for(const domain of [[10,-10],[0,0],[-1e7,10],[-10,1e7],['a',1],[1,Infinity]]){
  const response=await invoke({expression:'x^2',domain});
  assert.equal(response.status,422);
  const data=await response.json();
  assert.equal(typeof data.detail,'string');
 }
});

test('function.plot 在极点处断开曲线',async()=>{
 const data=await (await invoke({expression:'1/x',domain:[-10,10]})).json();
 const path=data.result.svg.match(/<path d="([^"]+)"/)[1];
 assert.ok((path.match(/M/g)||[]).length>=2);
});

test('GET /tools 返回函数绘图工具元信息，错误方法返回 405',async()=>{
 const response=await fetch(base+'/tools');
 assert.equal(response.status,200);
 const data=await response.json();
 assert.ok(Array.isArray(data.tools));
 assert.equal(data.tools.length,1);
 assert.equal(data.tools[0].name,'function.plot');
 assert.equal(data.tools[0].title,'函数绘图');
 assert.equal(data.tools[0].render,'svg+text');
 assert.equal(typeof data.tools[0].description,'string');

 const wrongList=await fetch(base+'/tools',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
 assert.equal(wrongList.status,405);
 assert.equal(typeof (await wrongList.json()).detail,'string');

 const wrongInvoke=await fetch(base+'/tools/function.plot/invoke');
 assert.equal(wrongInvoke.status,405);
});
