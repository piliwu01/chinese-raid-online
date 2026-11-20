import test from 'node:test';
import assert from 'node:assert/strict';
import {LUCKY,noteCorrect,addChest,drawFortune,openChest,pullLantern,publicLucky,isRare,luckyOf} from '../shared/lucky.js';
import {featuredId} from '../shared/schedule.js';
import {bagOf} from '../shared/items.js';
const seq=(...v)=>{let i=0;return ()=>v[i++%v.length];};

test('山海籤一天只能抽一次，隔天可再抽', ()=>{
  const s={food:0};
  const r=drawFortune(s,'2026-11-19','u1',seq(0.01,0.5));
  assert.equal(r.level,'上上籤');assert.ok(r.beast.quote);assert.ok(r.item);
  assert.equal(s.food,2);assert.equal(s.lucky.jade,1);
  assert.throws(()=>drawFortune(s,'2026-11-19','u1'),/已經抽過/);
  assert.ok(publicLucky(s,'2026-11-19').fortuneToday);
  assert.equal(publicLucky(s,'2026-11-20').fortuneToday,false);
  drawFortune(s,'2026-11-20','u1',seq(0.99));
  assert.equal(s.lucky.lastFortune.level,'小吉');
});

test('同一天同一人籤面固定、不同人可能不同', ()=>{
  const a=drawFortune({},'2026-11-19','u1',seq(0.5)),b=drawFortune({},'2026-11-19','u1',seq(0.5));
  assert.equal(a.beast.id,b.beast.id);assert.equal(a.advice,b.advice);
});

test('玉符：每答對 20 題 1 枚，每天最多 3 枚', ()=>{
  const s={};let got=0;
  for(let i=0;i<100;i++)if(noteCorrect(s,'d1'))got++;
  assert.equal(got,3);assert.equal(s.lucky.jade,3);
  for(let i=0;i<20;i++)if(noteCorrect(s,'d2'))got++;
  assert.equal(got,4);assert.equal(publicLucky(s,'d2').jadeToday,1);
});

test('寶箱上限 10 個，開箱扣 1 並給獎勵', ()=>{
  const s={food:0};
  for(let i=0;i<12;i++)addChest(s,'test');
  assert.equal(s.lucky.chests,LUCKY.chestMax);
  const food=openChest(s,seq(0.1,0.5));assert.equal(food.kind,'food');assert.ok(s.food>0);
  const item=openChest(s,seq(0.6,0.2));assert.equal(item.kind,'item');
  const bag=bagOf(s);assert.equal(Object.values(bag).reduce((a,b)=>a+b,0),1);
  const big=openChest(s,seq(0.99,0.1,0.9));assert.equal(big.kind,'jackpot');assert.ok(big.item&&big.item2);
  assert.equal(s.lucky.chests,7);
  const empty={};assert.throws(()=>openChest(empty),/沒有可以打開/);
});

test('天燈：需要玉符，10 次內保底稀有，得到副本卡', ()=>{
  const s={captured:[]};luckyOf(s).jade=10;
  const now=Date.parse('2026-11-19T04:00:00Z');
  const results=[];for(let i=0;i<10;i++)results.push(pullLantern(s,now,seq(0.99,0.99,0.3)));
  assert.equal(results.filter(r=>r.rare).length,1);
  assert.ok(results[9].rare&&results[9].pityHit);assert.ok(isRare(results[9].id));
  assert.equal(s.lucky.pity,0);assert.equal(s.lucky.jade,0);
  assert.equal(Object.values(s.dupes).reduce((a,b)=>a+b,0),10);
  assert.throws(()=>pullLantern(s,now),/玉符不足/);
});

test('天燈：本週神獸機率提高；稀有直接抽中', ()=>{
  const now=Date.parse('2026-11-19T04:00:00Z'),feat=featuredId(now);
  const s={};luckyOf(s).jade=2;
  const r=pullLantern(s,now,seq(0.5,0.01));
  if(!isRare(feat))assert.equal(r.id,feat);
  const r2=pullLantern(s,now,seq(0.01,0));assert.ok(r2.rare);assert.equal(r2.pityHit,false);
});

test('公開資訊不改動原本狀態', ()=>{
  const s={};const before=JSON.stringify(s);publicLucky(s,'d');assert.equal(JSON.stringify(s),before);
});

import {freshState,applyAction} from '../shared/game.js';
test('單人答題：答完一輪得寶箱、答對累計玉符進度；路由可抽籤開箱', ()=>{
  const s=freshState();applyAction(s,'/starter',{id:2010},1);
  let chestEvent=null,n=0;
  for(let i=0;i<40&&!chestEvent;i++){
    if(!s.battle||s.battle.status!=='ready')applyAction(s,'/battle/start',{},1);
    if(s.battle){s.battle.hp=99999;s.battle.maxHp=99999;}
    applyAction(s,'/question',{move:'quick'},1);const q=s.pending;
    const e=applyAction(s,'/answer',{questionId:q.id,choice:q.answer},1);n++;
    if(e.chest)chestEvent=e.chest;
  }
  assert.ok(chestEvent,'一輪結束應掉寶箱');assert.ok(s.lucky.chests>=1);assert.equal(s.lucky.correct,n%20);
  const f=applyAction(s,'/fortune/draw',{userKey:'u'},Date.parse('2026-11-19T04:00:00Z'));assert.ok(f.level);
  const c=applyAction(s,'/chest/open',{},1);assert.ok(c.kind);
});
