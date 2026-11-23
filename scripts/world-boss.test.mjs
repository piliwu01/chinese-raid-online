import test from 'node:test';import assert from 'node:assert/strict';
import {WORLD,worldWeek,worldWindow,worldOpen,bossFor,worldMaxHp,pickWeak,damageFor,settleWorld,claimWorld} from '../shared/world-boss.js';
import {freshState,applyAction,publicState} from '../shared/game.js';

const at=s=>Date.parse(s);
test('the window runs Monday 00:00 to Sunday 22:00 Taipei; bosses rotate every week',()=>{
 assert.equal(worldWeek(at('2026-11-23T08:00:00+08:00')),'2026-11-23');assert.equal(worldWeek(at('2026-11-29T21:59:00+08:00')),'2026-11-23');
 const w=worldWindow('2026-11-23');assert.equal(w.end,at('2026-11-29T22:00:00+08:00'));
 assert.equal(worldOpen(at('2026-11-29T21:59:00+08:00')),true);assert.equal(worldOpen(at('2026-11-29T22:00:00+08:00')),false);assert.equal(worldOpen(at('2026-11-30T00:00:00+08:00')),true);
 assert.deepEqual(['2026-11-23','2026-11-30','2026-12-07','2026-12-14','2026-12-21'].map(w=>bossFor(w).id),['taotie','qiongqi','taowu','hundun','taotie']);
 assert.equal(worldMaxHp(30),9000);assert.equal(worldMaxHp(0),300);
});
test('weak category is fixed per class and week; weak hits double the damage',()=>{
 const pool=['成語','修辭','對聯'];assert.equal(pickWeak(pool,'2026-11-23','313'),pickWeak(pool,'2026-11-23','313'));assert.equal(pickWeak([],'w','c'),null);
 assert.equal(damageFor('easy','成語','修辭'),8);assert.equal(damageFor('hard','修辭','修辭'),40);assert.equal(damageFor('?','x',null),10);
});
test('settlement: defeated pays everyone with 20+ correct, top 3 get the title; not defeated pays food only',()=>{
 const hits=[{userId:'a',damage:500,correct:40},{userId:'b',damage:300,correct:25},{userId:'c',damage:200,correct:20},{userId:'d',damage:150,correct:19},{userId:'e',damage:100,correct:30}];
 const win=settleWorld(1200,hits);assert.equal(win.won,true);assert.deepEqual(win.awards.map(a=>a.userId).sort(),['a','b','c','e']);assert.deepEqual(win.awards.filter(a=>a.top).map(a=>a.userId).sort(),['a','b','c']);
 const lose=settleWorld(99999,hits);assert.equal(lose.won,false);assert.ok(lose.awards.every(a=>!a.top));
 const s=freshState();const got=claimWorld(s,[{week:'2026-11-23',won:true,top:true}]);assert.equal(got[0].food,WORLD.win.food);assert.ok(s.extraTitles.includes(WORLD.title));
 assert.equal(claimWorld(s,[{week:'2026-11-23',won:true,top:true}]).length,0,'同一週只領一次');
 const t=freshState();claimWorld(t,[{week:'2026-11-30',won:false}]);assert.equal(t.food,(freshState().food||0)+WORLD.lose.food);
});
test('world question/answer: server-injected week and weak, damage capped by remaining HP, question hidden from public state',()=>{
 const bank={bankId:'wb',title:'t',questions:Array.from({length:12},(_,i)=>({id:'q'+i,status:'active',stem:'成語題'+i,answer:'A',category:'成語',options:{A:'對',B:'錯',C:'錯',D:'錯'}}))};
 const s=freshState();applyAction(s,'/starter',{id:2001},Date.now());
 const q=applyAction(s,'/world/question',{difficulty:'hard',week:'2026-11-23',weak:'成語'},Date.now(),bank).question;
 assert.equal(publicState(s).worldQ,undefined);assert.equal(publicState(s).worldQuestion.id,q.id);
 const key=Object.keys(q.optionTexts).find(k=>q.optionTexts[k]==='對');
 const e=applyAction(s,'/world/answer',{questionId:q.id,choice:key,week:'2026-11-23',hpLeft:15},Date.now()+500,bank);
 assert.equal(e.correct,true);assert.equal(e.world.raw,40);assert.equal(e.world.damage,15,'不超過剩餘血量');assert.equal(e.world.weak,true);
 const q2=applyAction(s,'/world/question',{difficulty:'easy',week:'2026-11-23',weak:'修辭'},Date.now(),bank).question;
 assert.throws(()=>applyAction(s,'/world/answer',{questionId:q2.id,choice:'A',week:'2026-11-30',hpLeft:100},Date.now(),bank),/結算/);
 const wrong=applyAction(s,'/world/answer',{questionId:q2.id,choice:Object.keys(q2.optionTexts).find(k=>q2.optionTexts[k]!=='對'),week:'2026-11-23',hpLeft:100},Date.now()+500,bank);assert.equal(wrong.world.damage,0);
});
