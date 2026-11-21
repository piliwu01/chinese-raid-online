import test from 'node:test';import assert from 'node:assert/strict';
import {newRoom,startRoom,advanceRoom,recordHit,useSkill,pauseRoom,resumeRoom,RAID} from '../shared/raid-rules.js';
import {BOSS_SKILL,BOSS_SKILLS,publicSkill} from '../shared/raid-skills.js';
const now=1_000_000;
const member=id=>({id,name:id,partner:{zhName:'夔'},combo:0,charges:0,energy:0,damage:0,heal:0,answered:0,correct:0,joinOrder:1});
function room(n=28){const s=newRoom({duration:RAID.duration,code:'T'},now);for(let i=0;i<n;i++)s.members['s'+i]=member('s'+i);startRoom(s,now);return s;}
const castAt=(s,t,id)=>{s.skillNextAt=t;s.lastSkill=null;const orig=Math.random;const want=Object.keys(BOSS_SKILLS).indexOf(id);advanceRoom(s,t);// force chosen skill
 s.skill.id=id;return s;};
test('default boss HP is 300 per player; first skill comes 60s after start with a 3s warning',()=>{const s=room();assert.equal(s.maxHp,8400);assert.equal(s.skillNextAt,now+60000);
 advanceRoom(s,now+59000);assert.equal(s.skill,null);advanceRoom(s,now+60000);assert.equal(s.skill.stage,'warn');assert.equal(s.skill.until,now+63000);
 advanceRoom(s,now+63000);assert.equal(s.skill.stage,'active');assert.ok(s.events.some(e=>e.type==='skill-warn'));});
test('ward absorbs damage until enough correct answers break it, then boss is stunned',()=>{const s=room(10);castAt(s,now+60000,'ward');advanceRoom(s,now+63000);s.skill.wardNeed=s.skill.wardLeft=6;
 const hp=s.hp;for(let i=0;i<5;i++)recordHit(s,s.members['s'+i],true,now+64000,'medium');assert.equal(s.hp,hp);assert.equal(s.skill.wardLeft,1);
 const atk=s.nextAttackAt;recordHit(s,s.members.s5,true,now+64500,'medium');assert.equal(s.skill,null);assert.equal(s.nextAttackAt,atk+10000);assert.ok(s.events.some(e=>e.text.includes('擊碎了墨甲')));
 recordHit(s,s.members.s6,true,now+65000,'medium');assert.ok(s.hp<hp);});
test('strong skill hits the ward for 3 instead of the boss',()=>{const s=room(10);castAt(s,now+60000,'ward');advanceRoom(s,now+63000);const left=s.skill.wardLeft,hp=s.hp;const m=s.members.s0;m.charges=1;useSkill(s,m,'strong',now+64000);assert.equal(s.hp,hp);assert.equal(s.skill.wardLeft,left-3);});
test('curse: wrong answers cost the class shield 2 each while active',()=>{const s=room();castAt(s,now+60000,'curse');advanceRoom(s,now+63000);const before=s.shield;recordHit(s,s.members.s0,false,now+64000,'easy');recordHit(s,s.members.s1,false,now+64000,'easy');assert.equal(s.shield,before-4);
 advanceRoom(s,now+63000+20000);assert.equal(s.skill,null);const sh=s.shield;s.nextAttackAt=now+999999;recordHit(s,s.members.s2,false,now+84000,'easy');assert.equal(s.shield,sh);});
test('fog picks a quarter of the class and only tells each student about themselves',()=>{const s=room(28);castAt(s,now+60000,'fog');advanceRoom(s,now+63000);assert.equal(s.skill.targets.length,7);const t=s.skill.targets[0];
 assert.equal(publicSkill(s,t).fogMe,true);assert.equal(publicSkill(s,'nobody').fogMe,false);assert.equal(publicSkill(s,t).targets,undefined);});
test('class ultimate interrupts a warning or active skill',()=>{const s=room(15);castAt(s,now+60000,'shuffle');assert.equal(s.skill.stage,'warn');for(let i=0;i<15;i++)recordHit(s,s.members['s'+i],true,now+61000,'easy');assert.equal(s.skill,null);assert.ok(s.events.some(e=>e.type==='skill-break'));});
// 時間軸固定：第一招改成 10 秒的亂序咒，避免隨機抽到長短不同的技能，造成「第幾招」對不上（舊版約 1/10 機率誤判失敗）。
test('skills come every 60s before enrage and every 45s after; never the same twice in a row; pause shifts timers',()=>{
 const s=room();s.nextAttackAt=Infinity;advanceRoom(s,now+60000);assert.equal(s.skill.stage,'warn');s.skill.id='shuffle';
 advanceRoom(s,now+60000+BOSS_SKILL.warn+BOSS_SKILLS.shuffle.duration);assert.equal(s.skill,null);assert.equal(s.lastSkill,'shuffle');
 assert.equal(s.skillNextAt,now+120000,'暴走前：上一招出招後 60 秒');
 advanceRoom(s,now+120000);assert.equal(s.skill.stage,'warn');assert.notEqual(s.skill.id,'shuffle','不會連續出同一招');
 const e=room();e.nextAttackAt=Infinity;e.phase=2;advanceRoom(e,now+60000);e.skill.id='shuffle';advanceRoom(e,now+60000+BOSS_SKILL.warn+BOSS_SKILLS.shuffle.duration);
 assert.equal(e.skillNextAt,now+105000,'暴走後：上一招出招後 45 秒');
 // 整場連續出招：相鄰兩招一定不同（不論隨機抽到什麼）
 const all=room();all.nextAttackAt=Infinity;const seq=[];
 for(let t=now;t<now+RAID.duration-10000;t+=1000){advanceRoom(all,t);if(all.skill&&seq.at(-1)?.at!==all.skill.at&&all.skill.stage==='warn')seq.push({id:all.skill.id,at:all.skill.at});}
 assert.ok(seq.length>=5,'整場至少出招 5 次');for(let i=1;i<seq.length;i++)assert.notEqual(seq[i].id,seq[i-1].id);
 const s2=room();pauseRoom(s2,now+30000);resumeRoom(s2,now+50000);assert.equal(s2.skillNextAt,now+80000);});
