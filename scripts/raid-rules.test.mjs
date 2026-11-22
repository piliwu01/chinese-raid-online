import test from 'node:test';import assert from 'node:assert/strict';import {RAID,PHASE2,newRoom,startRoom,advanceRoom,pauseRoom,resumeRoom,recordHit,useSkill,finishRoom,rank,RAID_BREAK,breakActive} from '../shared/raid-rules.js';
const now=1000000;const member=(id='s1')=>({id,name:id,partner:{id:2010,zhName:'夔'},nickname:'搭檔',joinOrder:Number(id.replace(/\D/g,''))||0,damage:0,heal:0,charges:0,energy:0,correct:0,answered:0,damageOrder:0,healOrder:0,question:null});
const room=()=>{const s=newRoom({code:'ABC234',hostId:'teacher',className:'313',duration:RAID.duration,customHp:10000},now);s.members.s1=member();startRoom(s,now);return s;};
test('specified ten-minute and forty-second defaults',()=>{const automatic=newRoom({duration:RAID.duration},now);for(let i=0;i<30;i++)automatic.members['s'+i]=member('s'+i);startRoom(automatic,now);assert.equal(automatic.hp,9000);assert.equal(automatic.maxHp,9000);const s=room();assert.equal(s.hp,10000);assert.equal(s.endsAt,now+600000);advanceRoom(s,now+39999);assert.equal(s.shield,100);advanceRoom(s,now+40000);assert.equal(s.shield,90);assert.equal(s.events[0].type,'boss');});
test('five correct answers grant charge, stored at most two',()=>{const s=room(),m=s.members.s1;s.comboCooldownUntil=Infinity;for(let i=0;i<4;i++)(m.combo=0,recordHit)(s,m,true,now);assert.equal(m.charges,0);(m.combo=0,recordHit)(s,m,true,now);assert.equal(m.charges,1);for(let i=0;i<20;i++)(m.combo=0,recordHit)(s,m,true,now);assert.equal(m.charges,2);assert.equal(m.energy,0);assert.equal(m.damage,250);});
test('wrong answer does not hit shield or grant energy',()=>{const s=room(),m=s.members.s1;recordHit(s,m,false,now);assert.equal(m.answered,1);assert.equal(m.correct,0);assert.equal(m.energy,0);assert.equal(s.shield,100);});
test('strong hit consumes charge and credits actual capped damage',()=>{const s=room(),m=s.members.s1;m.charges=1;s.hp=20;useSkill(s,m,'strong',now);assert.equal(s.hp,0);assert.equal(m.damage,20);assert.equal(m.charges,0);assert.equal(s.status,'won');assert.throws(()=>useSkill(s,m,'strong',now));});
test('repair only credits actual amount and full shield consumes nothing',()=>{const s=room(),m=s.members.s1;m.charges=2;assert.throws(()=>useSkill(s,m,'heal',now));assert.equal(m.charges,2);s.shield=97;useSkill(s,m,'heal',now);assert.equal(s.shield,100);assert.equal(m.heal,3);assert.equal(m.charges,1);});
test('pause freezes attacks and shifts both countdown and question expiry',()=>{const s=room();s.members.s1.question={expires:now+30000};pauseRoom(s,now+10000);advanceRoom(s,now+300000);assert.equal(s.shield,100);resumeRoom(s,now+300000);assert.equal(s.endsAt,now+890000);assert.equal(s.nextAttackAt,now+330000);assert.equal(s.members.s1.question.expires,now+320000);});
test('late alarm catches up strikes and loss is irreversible',()=>{const s=room();advanceRoom(s,now+500000);assert.equal(s.shield,0);assert.equal(s.status,'lost');assert.equal(s.finishedAt,now+400000);const n=s.outbox.length;advanceRoom(s,now+700000);finishRoom(s,'won',now+700000);assert.equal(s.status,'lost');assert.equal(s.outbox.length,n);});
test('deadline prevents late hits even when shield remains',()=>{const s=room();s.duration=1000;s.endsAt=now+1000;advanceRoom(s,now+1000);assert.equal(s.status,'timeout');assert.equal(s.shield,100);});
test('top tens exclude zero and use stable event ordering for ties',()=>{const s=room();for(let i=1;i<=12;i++){const m=member('s'+i);m.damage=10;m.damageOrder=i;s.members[m.id]=m;}s.members.zero=member('zero');const ranks=rank(s,'damage');assert.equal(ranks.length,10);assert.equal(ranks[0].id,'s1');assert.equal(ranks[9].id,'s10');assert.equal(rank(s,'heal').length,0);});
test('dual top ten awards both badges plus six food only once',()=>{const s=room(),m=s.members.s1;m.damage=100;m.heal=10;finishRoom(s,'won',now);assert.equal(s.outbox[0].summary.food,6);assert.deepEqual(s.outbox[0].summary.badges,['破陣先鋒','守護之星']);finishRoom(s,'lost',now);assert.equal(s.outbox.length,1);});
test('normal loss awards contributions but teacher cancellation grants none',()=>{for(const outcome of ['lost','timeout','cancelled']){const s=room();s.members.s1.damage=10;finishRoom(s,outcome,now);assert.equal(s.outbox[0].summary.food,outcome==='cancelled'?0:3);}});
test('correct-answer damage follows question difficulty, drum still adds five',async()=>{const {DIFF_DAMAGE}=await import('../shared/raid-rules.js');assert.deepEqual(DIFF_DAMAGE,{easy:8,medium:10,hard:20});const s=room(),m=s.members.s1;s.comboCooldownUntil=Infinity;(m.combo=0,recordHit)(s,m,true,now,'easy');(m.combo=0,recordHit)(s,m,true,now,'medium');(m.combo=0,recordHit)(s,m,true,now,'hard');assert.equal(m.damage,38);assert.equal(s.hp,10000-38);(m.combo=0,recordHit)(s,m,true,now);assert.equal(m.damage,48);s.drumUntil=now+1;(m.combo=0,recordHit)(s,m,true,now,'hard');assert.equal(m.damage,73);assert.match(s.events[0].text,/^難題命中！/);assert.equal(s.events[0].hard,true);});
test('enraged boss (phase 2) hits the shield 1.5x harder; guard still reduces 5',()=>{
 const s=room();s.phase=2;s.attackEvery=PHASE2.attackEvery;s.nextAttackAt=now+1;const before=s.shield;advanceRoom(s,now+2);assert.equal(before-s.shield,15);
 const g=room();g.phase=2;g.attackEvery=PHASE2.attackEvery;g.nextAttackAt=now+1;g.guardCharges=1;const b2=g.shield;advanceRoom(g,now+2);assert.equal(b2-g.shield,10);
 const n=room();n.nextAttackAt=now+1;const b3=n.shield;advanceRoom(n,now+2);assert.equal(b3-n.shield,10);});
test('finishing freezes the remaining time, including a cancel while paused',()=>{
 const a=room();finishRoom(a,'cancelled',now+100000);assert.equal(a.leftMs,RAID.duration-100000);
 const b=room();pauseRoom(b,now+60000);finishRoom(b,'cancelled',now+500000);assert.equal(b.leftMs,RAID.duration-60000,'暫停中結束：以暫停那一刻計算');
 const c=room();c.nextAttackAt=Infinity;c.skillNextAt=Infinity;advanceRoom(c,c.endsAt+5000);assert.equal(c.status,'timeout');assert.equal(c.leftMs,0);
 const w=newRoom({duration:RAID.duration},now);w.members.s1=member();finishRoom(w,'cancelled',now+1000);assert.equal(w.leftMs,RAID.duration,'還沒開戰就結束：顯示完整時間');
});
test('scoreboard data: per-difficulty record, best combo, event counts and the finishing blow',()=>{
 const s=room(),m=s.members.s1;s.comboCooldownUntil=Infinity;s.hp=25;
 recordHit(s,m,true,now,'easy');recordHit(s,m,false,now,'hard');recordHit(s,m,true,now,'medium');recordHit(s,m,true,now,'medium');
 assert.deepEqual(m.diff.easy,[1,1]);assert.deepEqual(m.diff.hard,[0,1]);assert.equal(m.bestCombo,2);
 assert.equal(s.status,'won');assert.equal(s.finisherId,'s1');assert.equal(s.stats.hit,3);assert.equal(s.stats.start,1);
});

test('class-wide boss shield: weak-category hits break it, broken window doubles damage, then it refills with new categories',()=>{
 const s=newRoom({code:'BRK234',hostId:'t',className:'313',duration:RAID.duration,customHp:100000},now);for(let i=1;i<=5;i++)s.members['s'+i]=member('s'+i);
 s.weakPool=['成語','修辭','對聯','字音字形'];startRoom(s,now);s.comboCooldownUntil=Infinity;s.nextAttackAt=Infinity;s.skillNextAt=Infinity;
 const b=s.bossShield;assert.equal(b.max,5);assert.equal(b.left,5);assert.equal(b.weak.length,2);
 const weak=b.weak[0],other=s.weakPool.find(c=>!b.weak.includes(c)),m=s.members.s1;
 recordHit(s,m,true,now,'medium',other);assert.equal(b.left,5,'非破盾題型不扣盾');
 recordHit(s,m,false,now,'medium',weak);assert.equal(b.left,5,'答錯不扣盾');
 for(let i=0;i<4;i++){m.combo=0;recordHit(s,s.members['s'+(i+1)],true,now,'medium',weak);}assert.equal(b.left,1);
 s.members.s5.combo=0;recordHit(s,s.members.s5,true,now,'medium',weak);assert.equal(b.left,0);assert.ok(breakActive(s,now));assert.equal(s.events[0].type,'break');assert.equal(s.members.s5.breaks,1);
 const before=s.members.s2.damage;s.members.s2.combo=0;recordHit(s,s.members.s2,true,now+1000,'medium',other);assert.equal(s.members.s2.damage-before,10*RAID_BREAK.mult,'破盾中全班傷害 ×2');assert.equal(b.left,0,'破盾中不再扣盾');
 const old=[...b.weak];advanceRoom(s,now+RAID_BREAK.window+1);assert.ok(!breakActive(s,now+RAID_BREAK.window+1));assert.equal(b.left,5,'時間到回滿');assert.notDeepEqual([...b.weak].sort(),old.sort(),'換一組破盾題型');
});
test('boss shield: none for banks without categories, size clamps, and pause extends the broken window',()=>{
 const a=room();assert.equal(a.bossShield,null);
 const s=newRoom({code:'BRK235',hostId:'t',className:'313',duration:RAID.duration,customHp:100000},now);s.members.s1=member();s.weakPool=['成語','修辭'];startRoom(s,now);assert.equal(s.bossShield.max,RAID_BREAK.min);
 s.bossShield.until=now+5000;pauseRoom(s,now+1000);resumeRoom(s,now+61000);assert.equal(s.bossShield.until,now+65000);
});
