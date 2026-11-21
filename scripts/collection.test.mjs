import test from 'node:test';import assert from 'node:assert/strict';
import {freshState,applyAction,publicState} from '../shared/game.js';
import {SETS,MASTER,earnedTitles} from '../shared/play.js';
import {rewardText} from '../shared/collection.js';
import {CATALOG} from '../shared/catalog.js';
import {migrateState} from '../shared/migrate.js';

const now=Date.parse('2026-11-21T03:00:00Z');
const student=()=>{const s=freshState();applyAction(s,'/starter',{id:2001},now);return s;};
const give=(s,ids)=>{for(const id of ids)if(!s.captured.some(p=>p.id===id))s.captured.push(CATALOG.find(p=>p.id===id));};
const claim=(s,id)=>applyAction(s,'/collection/claim',{id},now);

test('a set reward can be claimed exactly once, only after the set is complete',()=>{
 const s=student(),set=SETS.find(x=>x.id==='flood');
 give(s,set.ids.slice(0,3));assert.throws(()=>claim(s,'flood'),/還沒集齊（3 \/ 4）/);
 give(s,set.ids);const food=s.food,jade=s.lucky?.jade||0;
 const e=claim(s,'flood');
 assert.equal(s.food,food+5);assert.equal(s.lucky.jade,jade+2);assert.match(e.message,/洪水之兆.*食物 ×5、玉符 ×2/);
 assert.throws(()=>claim(s,'flood'),/已經領過/);assert.equal(s.food,food+5);
 const p=publicState(s,now).sets.find(x=>x.id==='flood');assert.equal(p.done,true);assert.equal(p.claimed,true);
});

test('rare sets give double rewards; unknown ids are rejected',()=>{
 for(const id of ['auspice','fiends'])assert.deepEqual(SETS.find(x=>x.id===id).reward,{food:10,jade:4});
 for(const x of SETS.filter(x=>!x.rare))assert.deepEqual(x.reward,{food:5,jade:2});
 const s=student();give(s,SETS.find(x=>x.id==='fiends').ids);claim(s,'fiends');assert.equal(s.food,10);assert.equal(s.lucky.jade,4);
 assert.throws(()=>claim(s,'nope'),e=>e.status===404);
});

test('神獸至尊 needs every wild spirit (starter lines excluded) and is wearable once earned',()=>{
 assert.equal(MASTER.ids.length,CATALOG.length);assert.ok(MASTER.ids.every(id=>id>=2013));
 const s=student();give(s,CATALOG.slice(1).map(p=>p.id));
 assert.equal(publicState(s,now).master.have,CATALOG.length-1);
 assert.throws(()=>claim(s,'master'),/還差 1 隻/);assert.ok(!earnedTitles(s.captured).includes('神獸至尊'));
 assert.throws(()=>applyAction(s,'/title',{title:'神獸至尊'},now),/還沒有/);
 give(s,[CATALOG[0].id]);
 assert.ok(earnedTitles(s.captured).includes('神獸至尊'));
 applyAction(s,'/title',{title:'神獸至尊'},now);migrateState(s);assert.equal(s.title,'神獸至尊');
 const bag=s.bag?.potion||0,food=s.food;claim(s,'master');
 assert.equal(s.food,food+30);assert.equal(s.lucky.jade,10);assert.equal(s.bag.potion,bag+5);
 assert.throws(()=>claim(s,'master'),/已經領過/);
 const m=publicState(s,now).master;assert.deepEqual([m.have,m.total,m.done,m.claimed],[CATALOG.length,CATALOG.length,true,true]);
 // 全收集也代表六個套組都集齊，各自仍可領一次。
 for(const x of SETS)claim(s,x.id);assert.equal(publicState(s,now).sets.every(x=>x.claimed),true);
});

test('claiming requires a chosen partner, and reward text lists every prize',()=>{
 const s=freshState();give(s,SETS[0].ids);assert.throws(()=>claim(s,SETS[0].id),/專屬夥伴/);
 assert.equal(rewardText(MASTER.reward),'食物 ×30、玉符 ×10、傷藥 ×5');
});
