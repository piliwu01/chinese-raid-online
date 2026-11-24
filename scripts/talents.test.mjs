import test from 'node:test';import assert from 'node:assert/strict';
import {totalPoints,freePoints,canLearn,learnTalent,talentFx,damageBonus,BRANCHES,NODES} from '../shared/talents.js';
import {freshState,applyAction} from '../shared/game.js';
import {pvpPlayer,newPvp,startPvp,pvpHit,pvpHeal,PVP} from '../shared/pvp-rules.js';
import {luckyOf} from '../shared/lucky.js';

const atLevel=(lv)=>{const s=freshState();applyAction(s,'/starter',{id:2001},Date.now());s.growth={...s.growth,xp:(lv-1)*100};return s;};
const bank={bankId:'t',title:'t',questions:['成語','修辭','字音'].flatMap(c=>Array.from({length:12},(_,i)=>({id:c+i,status:'active',stem:c+i,answer:'A',category:c,difficulty:['easy','medium','hard'][i%3],options:{A:'對',B:'錯一',C:'錯二',D:'錯三'}})))};

test('talent points: 1 point every 5 levels, 20 at Lv100; each branch has 8 points',()=>{
 assert.equal(totalPoints(0),0);assert.equal(totalPoints(399),0);assert.equal(totalPoints(400),1);assert.equal(totalPoints(9900),20);
 for(const b of BRANCHES)assert.equal(b.nodes.reduce((a,n)=>a+n.max,0),8);
});
test('learning order: previous node must be full, points are limited, reset costs 1 jade',()=>{
 const s=atLevel(20);assert.equal(freePoints(s),4);
 assert.match(canLearn(s,'a2'),/銳筆/);
 for(let i=0;i<3;i++)applyAction(s,'/talent/learn',{id:'a1'},Date.now());
 assert.throws(()=>applyAction(s,'/talent/learn',{id:'a1'},Date.now()),/點滿/);
 applyAction(s,'/talent/learn',{id:'a2'},Date.now());assert.equal(freePoints(s),0);
 assert.throws(()=>applyAction(s,'/talent/learn',{id:'d1'},Date.now()),/用完/);
 luckyOf(s).jade=0;assert.throws(()=>applyAction(s,'/talent/reset',{},Date.now()),/玉符/);
 luckyOf(s).jade=2;applyAction(s,'/talent/reset',{},Date.now());assert.equal(luckyOf(s).jade,1);assert.equal(freePoints(s),4);
 assert.match(canLearn(atLevel(3),'a1'),/Lv5/);
});
test('adventure: HP, revealed weakness, extra orb, stand at 1 HP, bigger potion',()=>{
 const s=atLevel(100);s.talents={d1:3,d2:2,d3:2,d4:1,w1:3,w2:2,w3:2};
 applyAction(s,'/battle/start',{chapter:1,heal:true},Date.now(),bank);s.encounter=null;
 assert.equal(s.battle.playerMaxHp,215);assert.equal(s.battle.playerHp,215);
 assert.deepEqual(s.battle.revealed,s.battle.weak);assert.equal(s.battle.orbs,2);
 s.battle.playerHp=1;const q=applyAction(s,'/question',{move:'quick'},Date.now(),bank).question;
 const wrong=Object.keys(q.optionTexts||{}).find(k=>!String(q.optionTexts[k]).startsWith('對'))||'B';
 const e=applyAction(s,'/answer',{questionId:q.id,choice:wrong},Date.now()+300,bank);
 if(!e.blocked){assert.equal(e.stand,true);assert.equal(s.battle.playerHp,1);assert.equal(s.battle.status,'ready');}
 s.bag={...(s.bag||{}),potion:1};const r=applyAction(s,'/bag/use',{itemId:'potion'},Date.now());assert.match(r.message,/50 HP/);
});
test('damage bonus: +4% per rank, combo bonus from 3 hits',()=>{
 const fx=talentFx({talents:{a1:3,a2:2,a3:2,a4:1}});
 assert.equal(+damageBonus(fx,1).toFixed(2),1.12);assert.equal(+damageBonus(fx,3).toFixed(2),1.22);assert.equal(fx.breakMult,2.5);
 assert.equal(talentFx({}).breakMult,2);assert.equal(damageBonus(talentFx({}),9),1);
});
test('PVP: more HP, more damage, stand once, bigger potion',()=>{
 const a={id:'a',name:'甲',partner:{id:1},talent:talentFx({talents:{a1:3}})},b={id:'b',name:'乙',partner:{id:2},talent:talentFx({talents:{d1:3,d2:2,d3:2,d4:1}})};
 const s=newPvp({code:'X',hostId:'a',className:'c',creator:a},0);s.players.b=pvpPlayer(b);
 assert.equal(s.players.b.hp,PVP.hp+30);assert.equal(s.players.b.maxHp,PVP.hp+30);
 s.players.a.ready=s.players.b.ready=true;startPvp(s,'a',1);
 assert.equal(pvpHit(s,'a',true,2,null),Math.round(PVP.hit*1.12));
 s.players.b.hp=5;assert.equal(pvpHit(s,'a',true,3,null),4);assert.equal(s.players.b.hp,1);assert.equal(s.status,'active');
 pvpHit(s,'a',true,4,null);assert.equal(s.players.b.hp,0);assert.equal(s.status,'finished');
 const t=newPvp({code:'Y',hostId:'b',className:'c',creator:b},0);t.players.b.hp=100;t.players.a=pvpPlayer(a);t.players.a.ready=t.players.b.ready=true;startPvp(t,'b',1);
 assert.equal(pvpHeal(t,'b',2),PVP.potion+20);
});
test('every node has a description and where it works',()=>{for(const n of Object.values(NODES)){assert.ok(n.text(1));assert.ok(n.where);}});
