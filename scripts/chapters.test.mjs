import test from 'node:test';import assert from 'node:assert/strict';
import {freshState,applyAction,publicState} from '../shared/game.js';import {CHAPTERS,poolFor,CHAPTER_NEED} from '../shared/chapters.js';import {CATALOG} from '../shared/catalog.js';
import {atmosphere,timeOfDay,omenFor} from '../src/atmosphere.js';
const student=()=>{const s=freshState();applyAction(s,'/starter',{id:2010},1);return s;};
test('every wild spirit belongs to exactly one chapter pool',()=>{const all=CHAPTERS.flatMap(c=>poolFor(c.id).map(p=>p.id));assert.equal(all.length,CATALOG.length);assert.equal(new Set(all).size,CATALOG.length);for(const c of CHAPTERS)assert(poolFor(c.id).length>=5,c.name);});
test('battles draw only from the chosen unlocked chapter and record scene',()=>{const s=student();for(let i=0;i<40;i++){applyAction(s,'/battle/start',{chapter:1},1);assert(poolFor(1).some(p=>p.id===s.battle.enemy.id));assert.equal(s.battle.chapter,1);assert.equal(s.battle.scene,'r1');}
 assert.throws(()=>applyAction(s,'/battle/start',{chapter:2},1),/還沒解鎖/);assert.throws(()=>applyAction(s,'/battle/start',{chapter:9},1),/沒有這個篇章/);});
test('three wins or captures unlock the next chapter, sequentially',()=>{const s=student();let unlocked=null;
 for(let i=0;i<CHAPTER_NEED;i++){applyAction(s,'/battle/start',{chapter:1},1);s.battle.hp=1;applyAction(s,'/question',{move:'quick'},1);const q=s.pending;const r=applyAction(s,'/answer',{questionId:q.id,choice:q.answer},1);if(r.unlocked)unlocked=r.unlocked;}
 assert.equal(unlocked?.id,2);const v=publicState(s);assert.deepEqual(v.chapters.map(c=>c.unlocked),[true,true,false,false,false,false]);applyAction(s,'/battle/start',{chapter:2},1);assert(poolFor(2).some(p=>p.id===s.battle.enemy.id));});
test('atmosphere: omen weather and Taipei time of day',()=>{assert.equal(atmosphere({enemyId:2021,battleId:'a',chapter:1}).weather,'rain');assert.equal(atmosphere({enemyId:2025,battleId:'a',chapter:2}).weather,'heat');assert.equal(omenFor(2013),null);
 assert.equal(timeOfDay(Date.parse('2026-11-19T03:00:00Z')),'day');assert.equal(timeOfDay(Date.parse('2026-11-19T13:00:00Z')),'night');assert.equal(timeOfDay(Date.parse('2026-11-19T08:30:00Z')),'dusk');assert.equal(timeOfDay(Date.parse('2026-11-18T21:30:00Z')),'dawn');});
