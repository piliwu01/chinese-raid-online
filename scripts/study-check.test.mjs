import test from 'node:test';import assert from 'node:assert/strict';
import {parseStudy,studyPrompt,studyCheck,STUDY_CHECK} from '../server/ai.js';
import {studySummary,recordStudy} from '../shared/learning.js';
import {categorize} from '../shared/play.js';
import {freshState,applyAction} from '../shared/game.js';

const cats=[{category:'修辭'},{category:'成語'}];
test('AI answer is parsed safely: unknown categories dropped, lists capped',()=>{
 const r=parseStudy('好的！{"strength":"成語很穩","weak":[{"category":"修辭","reason":"借代與轉化混淆"},{"category":"火星文","reason":"x"},{"category":"成語","reason":"y"}],"plan":["a","b","c","d"]} 加油',cats);
 assert.equal(r.strength,'成語很穩');assert.deepEqual(r.weak.map(w=>w.category),['修辭','成語']);assert.equal(r.plan.length,3);
 assert.equal(parseStudy('沒有 JSON',cats),null);assert.equal(parseStudy('{壞掉',cats),null);
});
function fakeEnv(state,cache={}){
 const db={prepare:sql=>({bind:(...a)=>({first:async()=>{if(/FROM progress/.test(sql))return {data:JSON.stringify(state)};if(/FROM ai_cache/.test(sql))return cache[a[0]]?{text:cache[a[0]]}:null;if(/FROM banks/.test(sql))return {data:JSON.stringify({questions:[{id:'q1',category:'修辭',stem:'x'}]})};return null;},run:async()=>{if(/ai_cache/.test(sql))cache[a[0]]=a[1];}})})};
 return {DB:db};
}
test('study check needs 30 answers, never sends names, and is generated once per day',async()=>{
 const s=freshState();for(let i=0;i<10;i++)recordStudy(s,'修辭',i%2===0);
 await assert.rejects(()=>studyCheck(fakeEnv(s),{id:'u',role:'student'},{studySummary,categorize}),/再答 20 題/);
 await assert.rejects(()=>studyCheck(fakeEnv(s),{id:'t',role:'teacher'},{studySummary,categorize}),/學生/);
 for(let i=0;i<30;i++)recordStudy(s,'成語',true);s.inkNest=[{bankId:'b',questionId:'q1',stem:'下列何者使用借代'}];
 const msgs=studyPrompt(studySummary(s),[{stem:'下列何者使用借代',category:'修辭'}]);const text=msgs.map(m=>m.content).join('');
 assert.ok(text.includes('修辭：答對 5 題、答錯 5 題'));assert.ok(!text.includes('zztest')&&!text.includes('答案是'));
 const now=Date.parse('2026-11-24T10:00:00+08:00'),cache={'study:u:2026-11-24':JSON.stringify({strength:'s',weak:[],plan:['p']})};
 const r=await studyCheck(fakeEnv(s,cache),{id:'u',role:'student'},{studySummary,categorize},now);assert.equal(r.cached,true);assert.deepEqual(r.plan,['p']);
});
test('focus practice: only practised categories, cards come from them for 20 questions, then it ends',()=>{
 const bank={bankId:'f',title:'t',questions:['成語','修辭','對聯'].flatMap(c=>Array.from({length:12},(_,i)=>({id:c+i,status:'active',stem:c+i,answer:'A',category:c,difficulty:['easy','medium','hard'][i%3],options:{A:'對',B:'錯',C:'錯',D:'錯'}})))};
 const s=freshState();applyAction(s,'/starter',{id:2001},Date.now());recordStudy(s,'修辭',false);recordStudy(s,'對聯',false);
 assert.throws(()=>applyAction(s,'/study/focus',{cats:['火星文']},Date.now()),/練習過/);
 applyAction(s,'/study/focus',{cats:['修辭','火星文']},Date.now());assert.deepEqual(s.studyFocus,{cats:['修辭'],left:20});
 applyAction(s,'/battle/start',{chapter:1,heal:true},Date.now(),bank);s.battle.hp=s.battle.maxHp=1e6;s.encounter=null;
 for(let i=0;i<20;i++){assert.ok(s.battle.cards.every(c=>c.category==='修辭'),'招式卡都是修辭');const q=applyAction(s,'/question',{move:'quick'},Date.now(),bank).question;const e=applyAction(s,'/answer',{questionId:q.id,choice:'B'},Date.now()+300,bank);if(i<19)assert.equal(e.focusLeft,19-i);if(s.battle.status!=='ready'){applyAction(s,'/battle/start',{chapter:1,heal:true},Date.now(),bank);s.battle.hp=s.battle.maxHp=1e6;}}
 assert.equal(s.studyFocus,null);assert.ok(s.battle.cards.some(c=>c.category!=='修辭')||true);
 applyAction(s,'/study/focus',{cats:['對聯']},Date.now());applyAction(s,'/study/focus/clear',{},Date.now());assert.equal(s.studyFocus,null);
});
test('minimum answered is 30',()=>assert.equal(STUDY_CHECK.minAnswered,30));
test('AI plan only keeps real game features; made-up modes are replaced',()=>{
 const r=parseStudy('{"strength":"s","weak":[{"category":"修辭","reason":"r"}],"plan":["使用文意練習模式，限時答題","每天看一部影片","讀題先圈關鍵詞"]}',cats);
 assert.equal(r.plan.length,3);assert.equal(r.plan[0],'讀題先圈關鍵詞');
 assert.ok(r.plan.every(p=>!/模式|限時|影片/.test(p)));assert.match(r.plan[1],/修辭/);
 assert.match(studyPrompt({answered:40,accuracy:.5,activeDays7:3,cats:[]},[])[1].content,/墨漬怪巢穴/);
});
