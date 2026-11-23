import test from 'node:test';import assert from 'node:assert/strict';
import {WORLD,worldWeek,worldWindow,worldOpen,bossFor,worldMaxHp,pickWeak,shareDamage,settleWorld,claimWorld} from '../shared/world-boss.js';
import {freshState,applyAction,publicState} from '../shared/game.js';

const at=s=>Date.parse(s);
test('the window runs Monday 00:00 to Sunday 22:00 Taipei; bosses rotate every week',()=>{
 assert.equal(worldWeek(at('2026-11-23T08:00:00+08:00')),'2026-11-23');assert.equal(worldWeek(at('2026-11-29T21:59:00+08:00')),'2026-11-23');
 const w=worldWindow('2026-11-23');assert.equal(w.end,at('2026-11-29T22:00:00+08:00'));
 assert.equal(worldOpen(at('2026-11-29T21:59:00+08:00')),true);assert.equal(worldOpen(at('2026-11-29T22:00:00+08:00')),false);assert.equal(worldOpen(at('2026-11-30T00:00:00+08:00')),true);
 assert.deepEqual(['2026-11-23','2026-11-30','2026-12-07','2026-12-14','2026-12-21'].map(w=>bossFor(w).id),['taotie','qiongqi','taowu','hundun','taotie']);
 assert.equal(worldMaxHp(30),9000);assert.equal(worldMaxHp(0),300);
});
test('weak category is fixed per class and week; adventure damage is shared at 50%, weak doubles it',()=>{
 const pool=['成語','修辭','對聯'];assert.equal(pickWeak(pool,'2026-11-23','313'),pickWeak(pool,'2026-11-23','313'));assert.equal(pickWeak([],'w','c'),null);
 assert.equal(shareDamage(40,'成語','修辭'),20);assert.equal(shareDamage(40,'修辭','修辭'),40);assert.equal(shareDamage(0,'x',null),0);assert.equal(shareDamage(1,'x',null),1);
});
test('settlement: defeated pays everyone with 20+ correct, top 3 get the title; not defeated pays food only',()=>{
 const hits=[{userId:'a',damage:500,correct:40},{userId:'b',damage:300,correct:25},{userId:'c',damage:200,correct:20},{userId:'d',damage:150,correct:19},{userId:'e',damage:100,correct:30}];
 const win=settleWorld(1200,hits);assert.equal(win.won,true);assert.deepEqual(win.awards.map(a=>a.userId).sort(),['a','b','c','e']);assert.deepEqual(win.awards.filter(a=>a.top).map(a=>a.userId).sort(),['a','b','c']);
 const lose=settleWorld(99999,hits);assert.equal(lose.won,false);assert.ok(lose.awards.every(a=>!a.top));
 const s=freshState();const got=claimWorld(s,[{week:'2026-11-23',won:true,top:true}]);assert.equal(got[0].food,WORLD.win.food);assert.ok(s.extraTitles.includes(WORLD.title));
 assert.equal(claimWorld(s,[{week:'2026-11-23',won:true,top:true}]).length,0,'同一週只領一次');
 const t=freshState();claimWorld(t,[{week:'2026-11-30',won:false}]);assert.equal(t.food,(freshState().food||0)+WORLD.lose.food);
});
test('adventure answer shares 50% of the battle damage with the boss, capped by remaining HP; no separate world questions',()=>{
 const bank={bankId:'wb',title:'t',questions:Array.from({length:12},(_,i)=>({id:'q'+i,status:'active',stem:'成語題'+i,answer:'A',category:'成語',options:{A:'對',B:'錯',C:'錯',D:'錯'}}))};
 const s=freshState();applyAction(s,'/starter',{id:2001},Date.now());applyAction(s,'/battle/start',{chapter:1,heal:true},Date.now(),bank);s.battle.hp=s.battle.maxHp=100000;
 const ask=()=>applyAction(s,'/question',{move:'special'},Date.now(),bank).question;
 let q=ask();let e=applyAction(s,'/answer',{questionId:q.id,choice:Object.keys(q.optionTexts).find(k=>q.optionTexts[k]==='對'),world:{week:'2026-11-23',weak:'修辭',hpLeft:9999}},Date.now()+500,bank);
 assert.equal(e.world.damage,Math.max(1,Math.round(e.combat.damage*0.5)));assert.equal(e.world.weak,false);
 q=ask();e=applyAction(s,'/answer',{questionId:q.id,choice:Object.keys(q.optionTexts).find(k=>q.optionTexts[k]==='對'),world:{week:'2026-11-23',weak:'成語',hpLeft:9999}},Date.now()+500,bank);
 assert.equal(e.world.damage,Math.round(e.combat.damage));assert.equal(e.world.weak,true,'弱點 ×2＝全額');
 q=ask();e=applyAction(s,'/answer',{questionId:q.id,choice:Object.keys(q.optionTexts).find(k=>q.optionTexts[k]==='對'),world:{week:'2026-11-23',weak:null,hpLeft:3}},Date.now()+500,bank);assert.equal(e.world.damage,3,'不超過剩餘血量');
 q=ask();e=applyAction(s,'/answer',{questionId:q.id,choice:Object.keys(q.optionTexts).find(k=>q.optionTexts[k]!=='對'),world:{week:'2026-11-23',weak:null,hpLeft:100}},Date.now()+500,bank);assert.equal(e.world.damage,0);
 q=ask();e=applyAction(s,'/answer',{questionId:q.id,choice:'A'},Date.now()+500,bank);assert.equal(e.world,undefined,'沒有注入就不算');
 assert.throws(()=>applyAction(s,'/world/question',{},Date.now(),bank),/找不到此操作/);
});
