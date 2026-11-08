import type {Profile, StartDiagnosisResponse, SubmitDiagnosisResponse} from '../types';
export type Preferences={theme:'light'|'dark';reducedMotion:boolean;speed:'slow'|'normal'|'fast'|'instant'};
export type LearningRecord={id:string;question:string;date:string;data:StartDiagnosisResponse;result?:SubmitDiagnosisResponse;completed:string[]};
export const defaults:Preferences={theme:'light',reducedMotion:false,speed:'normal'};
export const speeds=[{id:'slow',label:'慢速',hint:'适合逐步讲解'},{id:'normal',label:'标准',hint:'默认节奏'},{id:'fast',label:'快速',hint:'减少展示等待'},{id:'instant',label:'立即',hint:'直接显示结果'}] as const;
export function loadPreferences():Preferences{try{return validatePreferences(JSON.parse(localStorage.getItem('zhixi-preferences')||'null'));}catch{return {...defaults};}}
export function validatePreferences(v:unknown):Preferences{const p=v as Preferences;if(!p||!['light','dark'].includes(p.theme)||typeof p.reducedMotion!=='boolean'||!speeds.some(s=>s.id===p.speed))throw new Error('外观或节奏设置格式无效');return {theme:p.theme,reducedMotion:p.reducedMotion,speed:p.speed};}
export function presentationDelay(p:Preferences){return p.reducedMotion?0:{slow:700,normal:350,fast:100,instant:0}[p.speed];}
type Obj=Record<string,unknown>;
const obj=(x:unknown):x is Obj=>!!x&&typeof x==='object'&&!Array.isArray(x);
const str=(x:unknown):x is string=>typeof x==='string';
const list=(x:unknown):x is string[]=>Array.isArray(x)&&x.every(str);
function validRecord(r:unknown):r is LearningRecord{
 if(!obj(r)||!str(r.id)||!str(r.question)||!str(r.date)||!list(r.completed)||!obj(r.data))return false;
 const d=r.data,g=d.graph;
 if(!str(d.sessionId)||!str(d.summary)||!obj(g)||!Array.isArray(g.nodes)||!Array.isArray(g.edges)||!Array.isArray(d.sources)||!Array.isArray(d.quiz)||!d.quiz.length)return false;
 if(!g.nodes.every(n=>obj(n)&&str(n.id)&&str(n.label)&&str(n.description)&&['target','prerequisite','mastered','weak'].includes(String(n.status))&&Number.isFinite(n.x)&&Number.isFinite(n.y)))return false;
 const ids=new Set(g.nodes.map(n=>(n as Obj).id));
 if(!g.edges.every(e=>obj(e)&&ids.has(e.source)&&ids.has(e.target)))return false;
 if(!d.sources.every(s=>obj(s)&&str(s.id)&&str(s.title)&&str(s.organization)&&str(s.excerpt)&&(s.verified===undefined||typeof s.verified==='boolean')&&(s.url===undefined||str(s.url))))return false;
 if(!d.quiz.every(q=>obj(q)&&str(q.id)&&str(q.prompt)&&Array.isArray(q.options)&&q.options.length>=2&&q.options.every(o=>obj(o)&&str(o.value)&&str(o.label))))return false;
 if(r.result!==undefined){const a=r.result;if(!obj(a)||!str(a.accuracyText)||!str(a.advice)||!Array.isArray(a.weakPoints)||!a.weakPoints.every(w=>obj(w)&&str(w.id)&&str(w.title)&&str(w.reason))||!Array.isArray(a.learningPath)||!a.learningPath.every(p=>obj(p)&&str(p.id)&&str(p.title)&&str(p.duration)&&str(p.description)&&list(p.relatedNodeIds)))return false;}
 return true;
}
export type Backup={format:'zhixi-web-backup';version:1;exportedAt:string;preferences:Preferences;profile:Profile;records:LearningRecord[];saved:string[]};
export function parseBackup(text:string):Backup{
 if(text.length>5*1024*1024)throw new Error('备份文件不能超过 5 MB');
 let b:unknown;try{b=JSON.parse(text);}catch{throw new Error('文件不是有效的 JSON');}
 if(!obj(b)||b.format!=='zhixi-web-backup'||b.version!==1||!str(b.exportedAt)||!Array.isArray(b.records)||b.records.length>50||!b.records.every(validRecord)||!list(b.saved))throw new Error('备份结构无效；请选择 Web 版导出的备份（最多 50 条记录）');
 if(new Set(b.records.map(r=>r.id)).size!==b.records.length)throw new Error('备份中存在重复记录');
 if(!obj(b.profile)||!['小学生','中学生','大学生','小学教师','中学教师','大学教师'].includes(String(b.profile.role))||!str(b.profile.field)||!b.profile.field.trim())throw new Error('备份中的学习档案无效');
 const ids=new Set(b.records.map(r=>r.id));
 // Whitelist fields: connection information and model keys never enter backups.
 return {format:'zhixi-web-backup',version:1,exportedAt:b.exportedAt,preferences:validatePreferences(b.preferences),profile:{role:b.profile.role as Profile['role'],field:b.profile.field},records:b.records,saved:b.saved.filter(id=>ids.has(id))};
}
