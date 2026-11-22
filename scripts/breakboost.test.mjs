import test from 'node:test';import assert from 'node:assert/strict';
import {freshState,applyAction} from '../shared/game.js';
import {BREAK,dealCards,startBreak,resolveBreak,cardCategories,bankForCard} from '../shared/breakboost.js';
import {categorize} from '../shared/play.js';

const T0=Date.parse('2026-11-21T03:00:00Z');
const mk=(cat,i,difficulty)=>({id:`${cat}-${difficulty}-${i}`,status:'active',difficulty,stem:`${cat}題 ${i}`,category:cat,answer:'A',options:{A:'對',B:'錯',C:'錯',D:'錯'}});
const bank={bankId:'bb-test',title:'測試',questions:['成語','修辭','對聯','字音字形'].flatMap(c=>['easy','medium','hard'].flatMap(d=>Array.from({length:4},(_,i)=>mk(c,i,d)))).concat(Array.from({length:3},(_,i)=>mk('冷門',i,'medium')))};
const seq=(...xs)=>{let i=0;return ()=>xs[i++%xs.length];};
const student=()=>{const s=freshState();applyAction(s,'/starter',{id:2001},T0);return s;};
const start=s=>applyAction(s,'/battle/start',{chapter:1,heal:true},T0,bank);
const ask=(s,move,boost=0)=>applyAction(s,'/question',{move,boost},T0,bank).question;
const answer=(s,right)=>{const q=s.pending;return applyAction(s,'/answer',{questionId:q.id,choice:right?q.answer:(q.answer==='A'?'B':'A')},T0+1000,bank);};

test('only categories with at least 10 questions can be weaknesses or appear on cards',()=>{
 assert.deepEqual(cardCategories(bank).sort(),['修辭','字音字形','對聯','成語'].sort());
 assert.deepEqual(cardCategories(null),[]);
 for(let i=0;i<30;i++){const cards=dealCards(cardCategories(bank),['成語','修辭']);
  assert.deepEqual(cards.map(c=>c.move),['quick','special','critical']);
  assert.ok(cards.some(c=>['成語','修辭'].includes(c.category)),'至少 1 張弱點卡');
  assert.equal(new Set(cards.map(c=>c.category)).size,3,'三張卡題型不同');
  assert.ok(cards.every(c=>c.category!=='冷門'));}
 const f=bankForCard(bank,{category:'修辭'});assert.ok(f.questions.every(x=>categorize(x)==='修辭'));
});

test('a battle starts with 2 weaknesses, 4 shield points and 1 orb; math practice has no shield',()=>{
 const s=student();start(s);const b=s.battle;
 assert.equal(b.weak.length,2);assert.equal(b.shield,4);assert.equal(b.maxShield,4);assert.equal(b.orbs,1);assert.equal(b.broken,false);assert.equal(b.cards.length,3);
 const m=startBreak({},null);assert.deepEqual(m.weak,[]);assert.equal(m.maxShield,0);assert.equal(m.orbs,1);assert.ok(m.cards.every(c=>c.category===null));
});

test('the question drawn for a card matches the card category',()=>{
 const s=student();start(s);
 for(let i=0;i<8;i++){const card=s.battle.cards.find(c=>c.move==='special');ask(s,'special');assert.equal(s.pending.category,card.category);answer(s,true);if(s.battle.status!=='ready')start(s);}
});

test('weak hits drop the shield; at 0 the enemy breaks, next hit doubles and a wrong answer is not countered',()=>{
 const b={cats:cardCategories(bank),weak:['成語','修辭'],shield:4,maxShield:4,broken:false,orbs:1,cards:[]};
 assert.equal(resolveBreak(b,{correct:true,category:'對聯'}).shieldHit,false);assert.equal(b.shield,4);
 for(let i=0;i<3;i++)resolveBreak(b,{correct:true,category:'成語'});assert.equal(b.shield,1);
 assert.equal(resolveBreak(b,{correct:false,category:'成語'}).shieldHit,false,'答錯不減盾');
 const r=resolveBreak(b,{correct:true,category:'修辭'});assert.equal(r.breakNow,true);assert.equal(b.broken,true);assert.equal(b.shield,0);
 const hit=resolveBreak(b,{correct:true,category:'對聯'});assert.equal(hit.mult,BREAK.breakMult);assert.equal(b.broken,false);assert.equal(b.shield,4,'破盾一題後回滿');
 for(let i=0;i<4;i++)resolveBreak(b,{correct:true,category:'成語'});assert.equal(b.broken,true);
 const miss=resolveBreak(b,{correct:false,category:'成語'});assert.equal(miss.noCounter,true);assert.equal(miss.mult,1);assert.equal(b.broken,false);assert.equal(b.shield,4);
});

test('orbs: +1 per correct answer up to 5; boosting multiplies damage and is spent either way',()=>{
 const b={weak:[],shield:0,maxShield:0,broken:false,orbs:1,cards:[]};
 for(let i=0;i<9;i++)resolveBreak(b,{correct:true});assert.equal(b.orbs,BREAK.orbsMax);
 assert.equal(resolveBreak(b,{correct:true,boost:3}).mult,2.5);assert.equal(b.orbs,3);
 assert.equal(resolveBreak(b,{correct:false,boost:2}).mult,1);assert.equal(b.orbs,1,'答錯也用掉靈氣');
 const c={weak:['成語'],shield:1,maxShield:4,broken:true,orbs:3,cards:[]};
 assert.equal(resolveBreak(c,{correct:true,boost:3}).mult,BREAK.boostMult[3]*BREAK.breakMult,'破盾時蓄滿 ×5');
});

test('server validates boost, applies it to damage, and skips the counter attack while broken',()=>{
 const s=student();start(s);
 assert.throws(()=>ask(s,'quick',2),/靈氣不夠/);assert.throws(()=>ask(s,'quick',4),/0～3/);assert.throws(()=>ask(s,'quick',1.5),/0～3/);
 ask(s,'quick',1);const e=answer(s,true);assert.equal(e.break.boost,1);assert.equal(e.break.mult,1.5);assert.equal(s.battle.orbs,1);
 s.battle.broken=true;s.battle.shield=0;const hp=s.battle.playerHp;ask(s,'special');const miss=answer(s,false);
 assert.equal(miss.combat.enemyDamage,0);assert.equal(s.battle.playerHp,hp);assert.equal(s.battle.shield,4);assert.equal(s.battle.broken,false);
 ask(s,'special');const hit=answer(s,false);if(s.battle.status==='ready')assert.ok(hit.combat.enemyDamage>0||hit.combat.blocked,'沒有破盾時答錯會被反擊');
});

test('battles saved before this feature get break state on their next question',()=>{
 const s=student();start(s);for(const k of ['weak','shield','maxShield','broken','orbs','cards'])delete s.battle[k];
 ask(s,'critical');assert.equal(s.battle.cards.length,3);assert.equal(s.battle.orbs,1);answer(s,true);
});

test('catching keeps orbs and shield, and math practice battles still work',()=>{
 const s=student();applyAction(s,'/battle/start',{chapter:1,heal:true},T0);assert.equal(s.battle.maxShield,0);
 applyAction(s,'/question',{move:'quick',boost:1},T0);const q=s.pending;applyAction(s,'/answer',{questionId:q.id,choice:q.answer},T0+1000);
 assert.equal(s.battle.orbs,1);assert.equal(s.battle.shield,0);
 s.battle.hp=10;s.battle.orbs=3;applyAction(s,'/question',{move:'catch',boost:3},T0);assert.equal(s.pending.boost,0);
 const c=s.pending;applyAction(s,'/answer',{questionId:c.id,choice:c.answer},T0+1000);assert.equal(s.battle.orbs,3);
});

test('cards dealt after an answer keep their categories even though /answer carries no bank',()=>{
 const s=student();start(s);ask(s,'quick');const q=s.pending;applyAction(s,'/answer',{questionId:q.id,choice:q.answer},T0+1000,null);
 assert.ok(s.battle.cards.every(c=>c.category),'每張卡都有題型');assert.ok(s.battle.cards.some(c=>s.battle.weak.includes(c.category)));
});

test('one weakness is shown at the start; the other is hidden until a correct answer in that category',async()=>{
 const {visibleWeak}=await import('../shared/breakboost.js');const {publicState}=await import('../shared/game.js');
 const s=student();start(s);const b=s.battle;assert.deepEqual(b.revealed,[b.weak[0]]);
 const pub=publicState(s).battle;assert.equal(pub.weak[0],b.weak[0]);assert.equal(pub.weak[1],null,'第二個弱點不外露');
 const hidden=b.weak[1];assert.equal(resolveBreak(b,{correct:false,category:hidden}).revealNow,null,'答錯不翻開');
 assert.equal(resolveBreak(b,{correct:true,category:hidden}).revealNow,hidden);assert.deepEqual(visibleWeak(b.weak,b.revealed),b.weak);
 assert.deepEqual(visibleWeak(['成語','修辭'],undefined),['成語','修辭'],'舊對戰全部公開');
});

test('latent power: counters and breaks fill it; awaken needs a full gauge, triples damage and blocks the counter',async()=>{
 const {LATENT}=await import('../shared/breakboost.js');
 const s=student();start(s);assert.equal(s.battle.latent,0);
 assert.throws(()=>applyAction(s,'/question',{move:'quick',awaken:true},T0,bank),/潛力還沒集滿/);
 s.battle.shell=0;ask(s,'special');const miss=answer(s,false);if(miss.combat.enemyDamage>0){assert.equal(miss.latent.gained,LATENT.hurt);assert.equal(s.battle.latent,LATENT.hurt);}
 s.battle.latent=LATENT.max;s.battle.orbs=3;s.battle.hp=s.battle.maxHp=100000;
 assert.throws(()=>applyAction(s,'/question',{move:'catch',awaken:true},T0,bank),/收服|HP/);
 ask(s,'quick',0);s.pending=null;
 const q1=applyAction(s,'/question',{move:'quick',awaken:true,boost:3},T0,bank).question;assert.equal(s.battle.latent,0,'發動就歸零');assert.equal(s.pending.awaken,true);assert.equal(s.pending.boost,0,'覺醒不用靈氣');
 const hp=s.battle.playerHp,wrong=answer(s,false);assert.equal(wrong.combat.enemyDamage,0,'覺醒答錯不被反擊');assert.equal(s.battle.playerHp,hp);assert.equal(s.battle.orbs,3);
 s.battle.latent=LATENT.max;s.combo=0;applyAction(s,'/question',{move:'quick',awaken:true},T0,bank);const hit=answer(s,true);assert.equal(hit.awaken,true);assert.ok(hit.combat.damage>=22*LATENT.mult*0.8,'傷害 ×3');
 const b={weak:['成語'],revealed:['成語'],shield:1,maxShield:4,broken:false,orbs:1,cards:[],cats:['成語'],latent:0};resolveBreak(b,{correct:true,category:'成語'});assert.equal(b.broken,true);
});
