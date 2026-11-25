import test from 'node:test';import assert from 'node:assert/strict';
import {freshState,applyAction,publicState,taipeiDate} from '../shared/game.js';
import {categorize,weaknessPool,comboMultiplier,classComboNeed,questsFor,QUESTS,SETS,setProgress,earnedTitles,addInk,INK} from '../shared/play.js';
import {newRoom,startRoom,recordHit,advanceRoom,pauseRoom,resumeRoom,currentWeakness,classComboStatus,PHASE2} from '../shared/raid-rules.js';
import {CATALOG} from '../shared/catalog.js';

const now=Date.parse('2026-11-18T03:00:00Z'),tomorrow=now+86400000;
const bank={bankId:'fixture',title:'測',timeLimitSeconds:45,questions:[
 {id:'r1',stem:'下列何者使用了譬喻修辭？',options:{A:'對',B:'錯',C:'錯',D:'錯'},answer:'A',explanation:'解',status:'active',difficulty:'medium',unit:'基礎語文知識'},
 {id:'c1',stem:'下列成語何者使用正確？',options:{A:'對',B:'錯',C:'錯',D:'錯'},answer:'A',explanation:'解',status:'active',difficulty:'easy',unit:'基礎語文知識'},
 {id:'t1',stem:'根據本文，作者的觀點為何？',options:{A:'對',B:'錯',C:'錯',D:'錯'},answer:'A',explanation:'解',status:'active',difficulty:'hard',unit:'課文文意理解'}]};
const student=()=>{const s=freshState();applyAction(s,'/starter',{id:2001},now);return s;};
const member=id=>({id,name:id,partner:{id:2001,zhName:'畢方',type:'fire'},nickname:'',answered:0,correct:0,damage:0,heal:0,charges:0,energy:0,combo:0});
const room=(n=20,hp=1000)=>{const s=newRoom({code:'ABC234',duration:600000,className:'313'},now);for(let i=0;i<n;i++)s.members['s'+i]=member('s'+i);startRoom(s,now);s.maxHp=s.hp=hp;return s;};

test('questions are categorised by keywords, explicit category wins, reading falls back by unit',()=>{
 assert.equal(categorize(bank.questions[0]),'修辭');assert.equal(categorize(bank.questions[1]),'成語');assert.equal(categorize(bank.questions[2]),'文意理解');
 assert.equal(categorize({stem:'隨便',category:'對聯'}),'對聯');assert.deepEqual(weaknessPool(bank,1),['修辭','成語','文意理解'].sort());
});
test('combo multiplier starts at three and caps at 1.6',()=>{assert.equal(comboMultiplier(2),1);assert.equal(comboMultiplier(3),1.1);assert.equal(Number(comboMultiplier(5).toFixed(2)),1.3);assert.equal(Number(comboMultiplier(20).toFixed(2)),1.6);});

test('solo combo grows on correct answers, multiplies damage and resets on a miss',()=>{
 const s=student();applyAction(s,'/battle/start',{},now);s.battle.hp=s.battle.maxHp=100000;s.battle.enemy={...s.battle.enemy,type:'normal'};let last;
 for(let i=1;i<=4;i++){applyAction(s,'/question',{move:'quick',bankId:'fixture'},now,bank);last=applyAction(s,'/answer',{questionId:s.pending.id,choice:s.pending.answer},now,bank);assert.equal(last.combo,i);}
 assert.equal(last.multiplier,1.2);assert(last.combat.damage>=Math.round(22*1.2));
 applyAction(s,'/question',{move:'quick'},now,bank);const miss=applyAction(s,'/answer',{questionId:s.pending.id,choice:s.pending.answer==='A'?'B':'A'},now,bank);assert.equal(miss.combo,0);assert.equal(s.combo,0);
});

test('wrong bank answers hatch one ink monster per question; it sleeps until tomorrow and purifies for food and XP',()=>{
 const s=student();applyAction(s,'/battle/start',{},now);s.battle.hp=s.battle.maxHp=100000;
 for(let i=0;i<3;i++){applyAction(s,'/question',{move:'special'},now,bank);applyAction(s,'/answer',{questionId:s.pending.id,choice:null},now,bank);}
 const nest=publicState(s,now).inkNest;assert(nest.length>=1&&nest.length<=3);assert(nest.every(m=>!m.ready));assert.equal(new Set(nest.map(m=>m.id)).size,nest.length);
 const target=nest[0];assert.throws(()=>applyAction(s,'/ink/start',{inkId:target.id,bankId:'fixture'},now,bank),/沉睡/);
 const food=s.food,xp=s.growth.xp;const start=applyAction(s,'/ink/start',{inkId:target.id,bankId:'fixture'},tomorrow,bank);assert(start.question.question);
 const wrong=applyAction(s,'/ink/answer',{questionId:s.inkFight.id,choice:s.inkFight.answer==='A'?'B':'A'},tomorrow,bank);assert.equal(wrong.correct,false);assert(s.inkNest.some(m=>m.id===target.id));assert.equal(publicState(s,tomorrow).inkNest.find(m=>m.id===target.id).ready,false);
 const later=tomorrow+86400000;applyAction(s,'/ink/start',{inkId:target.id,bankId:'fixture'},later,bank);const ok=applyAction(s,'/ink/answer',{questionId:s.inkFight.id,choice:s.inkFight.answer},later,bank);
 assert.equal(ok.correct,true);assert(!s.inkNest.some(m=>m.id===target.id));assert.equal(s.food,food+INK.food);assert.equal(s.growth.xp,xp+INK.xp);
 const x={};assert.equal(addInk(x,'math-auto','q','s','d'),false);assert.equal(x.inkNest,undefined);
});

test('daily quests: three per day, progress from play, claim once for food and an item',()=>{
 const day=taipeiDate(now);const ids=questsFor(day);assert.equal(ids.length,3);assert.equal(ids[0],'correct10');assert.equal(new Set(ids).size,3);
 const s=student();applyAction(s,'/battle/start',{},now);s.battle.hp=s.battle.maxHp=100000;
 assert.throws(()=>applyAction(s,'/quest/claim',{questId:'correct10'},now),/還沒完成/);
 for(let i=0;i<10;i++){applyAction(s,'/question',{move:'quick'},now,bank);applyAction(s,'/answer',{questionId:s.pending.id,choice:s.pending.answer},now,bank);s.battle.playerHp=185;s.battle.status='ready';}
 const q=publicState(s,now).quests.find(x=>x.id==='correct10');assert.equal(q.ready,true);
 const food=s.food,potions=publicState(s,now).bag.potion;applyAction(s,'/quest/claim',{questId:'correct10'},now);assert.equal(s.food,food+QUESTS.correct10.food);assert.equal(publicState(s,now).bag.potion,potions+1);
 assert.throws(()=>applyAction(s,'/quest/claim',{questId:'correct10'},now),/已領取/);
 assert.equal(publicState(s,tomorrow).quests.find(x=>x.id==='correct10').progress,0);
});

test('shiny encounters happen and a shiny capture upgrades the dex entry',()=>{
 const s=student(),random=Math.random;let shiny=0;
 try{Math.random=()=>0.001;applyAction(s,'/battle/start',{},now);assert.equal(s.battle.enemy.shiny,true);}finally{Math.random=random;}
 s.captured.push({...s.battle.enemy,shiny:false});s.battle.hp=1;s.battle.maxHp=100;applyAction(s,'/question',{move:'catch'},now,bank);
 try{Math.random=()=>0;applyAction(s,'/answer',{questionId:s.pending.id,choice:s.pending.answer},now,bank);}finally{Math.random=random;}
 assert.equal(s.captured.filter(p=>p.id===s.battle.enemy.id).length,1);assert.equal(s.captured.find(p=>p.id===s.battle.enemy.id).shiny,true);
 for(let i=0;i<4000;i++){const t=student();applyAction(t,'/battle/start',{},now);if(t.battle.enemy.shiny)shiny++;}
 assert(shiny>20&&shiny<160,'about 2% shiny: '+shiny);
});

test('collection sets grant titles that can be worn; sets only use wild catalog spirits',()=>{
 for(const set of SETS)for(const id of set.ids)assert(CATALOG.some(p=>p.id===id),set.name+id);
 const s=student();assert.deepEqual(earnedTitles(s.captured),[]);assert.throws(()=>applyAction(s,'/title',{title:'治水使者'},now),/還沒有/);
 for(const id of SETS[0].ids)s.captured.push(CATALOG.find(p=>p.id===id));
 assert.deepEqual(earnedTitles(s.captured),['治水使者']);assert.equal(setProgress(s.captured)[0].have,4);applyAction(s,'/title',{title:'治水使者'},now);assert.equal(publicState(s,now).title,'治水使者');
});

test('raid combo multiplies damage and resets on a miss',()=>{
 const s=room(40,100000);s.comboCooldownUntil=Infinity;const m=s.members.s0;
 for(let i=0;i<3;i++)recordHit(s,m,true,now,'medium');assert.equal(m.combo,3);assert.equal(m.damage,10+10+11);
 recordHit(s,m,false,now,'medium');assert.equal(m.combo,0);
});

test('class combo: threshold scales to class size, fires one ultimate (3% HP + 5s stun) then cools down',()=>{
 assert.equal(classComboNeed(2),3);assert.equal(classComboNeed(8),8);assert.equal(classComboNeed(28),15);
 const s=room(28,2000),list=Object.values(s.members);
 for(let i=0;i<14;i++)recordHit(s,list[i],true,now+i*500,'medium');assert.equal(classComboStatus(s,now+7000).count,14);assert(!s.events.some(e=>e.type==='ultimate'));
 const attack=s.nextAttackAt;recordHit(s,list[14],true,now+7100,'medium');const ult=s.events.find(e=>e.type==='ultimate');assert(ult);assert.equal(ult.value,60);
 assert(s.stunUntil>=now+7100+5000);assert.equal(s.nextAttackAt,attack+5000);assert.equal(classComboStatus(s,now+7200).count,0);
 for(let i=15;i<28;i++)recordHit(s,list[i],true,now+7200,'medium');assert.equal(s.events.filter(e=>e.type==='ultimate').length,1);
 const slow=room(28,100000),ms=Object.values(slow.members);for(let i=0;i<20;i++)recordHit(slow,ms[i],true,now+i*1000,'medium');assert(!slow.events.some(e=>e.type==='ultimate'));
});

test('boss phase two at half HP: faster counters and a rotating weakness that doubles matching damage',()=>{
 const s=room(40,1000);s.comboCooldownUntil=Infinity;s.weakPool=['修辭','成語'];const m=s.members.s0;
 s.hp=505;recordHit(s,m,true,now,'medium','修辭');assert.equal(s.phase,2);assert(s.events.some(e=>e.type==='phase'));assert.equal(s.attackEvery,PHASE2.attackEvery);assert(s.nextAttackAt<=now+PHASE2.attackEvery);
 const weak=currentWeakness(s,now);assert(['修辭','成語'].includes(weak.category));
 const other=weak.category==='修辭'?'成語':'修辭';m.combo=0;const before=s.hp;recordHit(s,m,true,now+1,'medium',weak.category);assert.equal(before-s.hp,20);
 m.combo=0;const before2=s.hp;recordHit(s,m,true,now+2,'medium',other);assert.equal(before2-s.hp,10);
 assert.notEqual(currentWeakness(s,now+PHASE2.weakEvery+5).category,weak.category);
 pauseRoom(s,now+1000);resumeRoom(s,now+61000);assert.equal(currentWeakness(s,now+61000+10).category,weak.category);
 const t=room(5,1000);t.weakPool=[];t.hp=400;recordHit(t,t.members.s0,true,now,'medium','修辭');assert.equal(t.phase,2);assert.equal(currentWeakness(t,now),null);
 const shield=s.shield;advanceRoom(s,s.nextAttackAt+1);assert(s.shield<shield);
});
