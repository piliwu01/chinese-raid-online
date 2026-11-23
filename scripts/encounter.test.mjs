import test from 'node:test';import assert from 'node:assert/strict';
import {ENCOUNTER,rollEncounter} from '../shared/encounter.js';
import {freshState,applyAction,publicState} from '../shared/game.js';

const seq=(...xs)=>{let i=0;return ()=>xs[i++%xs.length];};
const bank={bankId:'enc',title:'t',questions:Array.from({length:12},(_,i)=>({id:'q'+i,status:'active',stem:'題'+i,answer:'A',category:'成語',options:{A:'對',B:'錯',C:'錯',D:'錯'}}))};
const student=()=>{const s=freshState();applyAction(s,'/starter',{id:2001},Date.now());return s;};
const right=q=>Object.keys(q.optionTexts).find(k=>q.optionTexts[k]==='對');
const wrong=q=>Object.keys(q.optionTexts).find(k=>q.optionTexts[k]!=='對');

test('10% chance, at most 3 per day, an unfinished encounter is never re-rolled',()=>{
 const s=freshState();assert.equal(rollEncounter(s,'2026-11-23',()=>0.5),null,'50% 以上不會出現');
 const e=rollEncounter(s,'2026-11-23',seq(0.05,0.1));assert.equal(e.kind,'shell');assert.equal(rollEncounter(s,'2026-11-23',()=>0),null,'未處理完不重抽');
 s.encounter.done=true;rollEncounter(s,'2026-11-23',()=>0);s.encounter.done=true;rollEncounter(s,'2026-11-23',()=>0);s.encounter.done=true;
 assert.equal(s.encounterDay.count,3);assert.equal(rollEncounter(s,'2026-11-23',()=>0),null,'一天最多 3 次');
 assert.ok(rollEncounter(s,'2026-11-24',()=>0),'隔天重新計算');
 const kinds=new Set();for(let i=0;i<200;i++){const t=freshState();const r=rollEncounter(t,'d',seq(0,Math.random()));kinds.add(r.kind);}assert.deepEqual([...kinds].sort(),['page','shell'],'山海貨郎已取消');
});
test('treasure shell: 3 correct opens a chest; a miss pays one food per lock opened',()=>{
 const s=student();s.encounter={id:'x',kind:'shell',opened:0,done:false,q:null};
 for(let i=0;i<3;i++){const q=applyAction(s,'/encounter/question',{},Date.now(),bank).question;const e=applyAction(s,'/encounter/answer',{questionId:q.id,choice:right(q)},Date.now()+300,bank);if(i<2)assert.equal(e.encounter.opened,i+1);else assert.equal(e.encounter.chest,1);}
 assert.equal(s.lucky.chests,1);assert.equal(s.encounter.done,true);assert.ok(publicState(s).encounter.done);
 applyAction(s,'/encounter/close',{},Date.now());assert.equal(s.encounter,null);
 const t=student();t.encounter={id:'y',kind:'shell',opened:0,done:false,q:null};const food=t.food||0;
 let q=applyAction(t,'/encounter/question',{},Date.now(),bank).question;applyAction(t,'/encounter/answer',{questionId:q.id,choice:right(q)},Date.now()+300,bank);
 q=applyAction(t,'/encounter/question',{},Date.now(),bank).question;const miss=applyAction(t,'/encounter/answer',{questionId:q.id,choice:wrong(q)},Date.now()+300,bank);
 assert.equal(miss.encounter.food,1);assert.equal(t.food,food+1);assert.equal(t.encounter.done,true);
});
test('ancient page doubles XP and adds food; skip ends the encounter; merchant route is gone',()=>{
 const s=student();s.encounter={id:'p',kind:'page',opened:0,done:false,q:null};const xp=s.growth.xp,food=s.food||0;
 const q=applyAction(s,'/encounter/question',{},Date.now(),bank).question;const e=applyAction(s,'/encounter/answer',{questionId:q.id,choice:right(q)},Date.now()+300,bank);
 assert.equal(s.growth.xp-xp,e.reward.gained*2);assert.equal(s.food,food+1+(e.reward.complete?1:0));
 const k=student();k.encounter={id:'k',kind:'page',opened:0,done:false,q:null};applyAction(k,'/encounter/skip',{},Date.now());assert.equal(k.encounter.done,true);
 assert.equal(publicState(k).encounterDay,undefined);
 assert.throws(()=>applyAction(k,'/encounter/trade',{offer:'jade'},Date.now()),/找不到|不支援|未知|Unknown|操作/);
});
test('battle start can roll an encounter; the answer is never in public state',()=>{
 const s=student();let hit=null;for(let i=0;i<200&&!hit;i++){s.encounter=null;s.encounterDay=null;const e=applyAction(s,'/battle/start',{chapter:1,heal:true},Date.now(),bank);if(e.encounter)hit=e.encounter;}
 assert.ok(hit,'200 次開戰至少遇到一次奇遇');
 s.encounter={id:'z',kind:'page',opened:0,done:false,q:null};applyAction(s,'/encounter/question',{},Date.now(),bank);
 const pub=publicState(s).encounter;assert.ok(pub.question);assert.equal(pub.question.answer,undefined);
});
