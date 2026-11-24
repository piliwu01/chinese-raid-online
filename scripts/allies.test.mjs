import test from 'node:test';import assert from 'node:assert/strict';
import {allyPlan,grantAllies,allyPending,publicAllies,ALLY_LINES} from '../shared/allies.js';
import {freshState,applyAction,publicState} from '../shared/game.js';
import {passiveFor} from '../shared/passives.js';

const withStarter=id=>{const s=freshState();applyAction(s,'/starter',{id},Date.now());return s;};

test('allies: the three unchosen starters join at chapters 2, 4, 6 in 山海經 order',()=>{
 assert.deepEqual(allyPlan(withStarter(2001)).map(a=>[a.id,a.chapter]),[[2004,2],[2007,4],[2010,6]]);
 assert.deepEqual(allyPlan(withStarter(2004)).map(a=>a.id),[2001,2007,2010]);
 assert.deepEqual(allyPlan(withStarter(2010)).map(a=>a.id),[2004,2001,2007]);
 assert.deepEqual(allyPlan(freshState()),[]);
 for(const id of [2001,2004,2007,2010])assert.ok(ALLY_LINES[id]);
});
test('allies: join only after the chapter is cleared, once, as first stage with a passive',()=>{
 const s=withStarter(2007);
 s.chapterWins={1:3,2:2};assert.deepEqual(grantAllies(s),[]);assert.equal(allyPending(s),false);
 s.chapterWins={1:3,2:3};assert.equal(allyPending(s),true);
 const j=grantAllies(s);assert.equal(j.length,1);assert.equal(j[0].id,2004);assert.match(j[0].line,/旋龜/);
 assert.ok(s.captured.some(p=>p.id===2004));assert.deepEqual(grantAllies(s),[]);
 assert.equal(passiveFor(2004).stage,0);
 assert.deepEqual(publicAllies(s).map(a=>a.joined),[true,false,false]);
});
test('allies: students who already cleared chapters get everyone back on the next action',()=>{
 const s=withStarter(2010);s.chapterWins={1:3,2:3,3:3,4:3,5:3,6:3};
 assert.equal(publicState(s).allyPending,true);
 const e=applyAction(s,'/ally/sync',{},Date.now());
 assert.deepEqual(e.allies.map(a=>a.id),[2004,2001,2007]);
 assert.equal(publicState(s).allyPending,false);
 assert.equal(applyAction(s,'/ally/sync',{},Date.now()).allies,undefined);
});
test('allies: without a partner nothing joins and sync is refused',()=>{
 const s=freshState();s.chapterWins={2:3};assert.throws(()=>applyAction(s,'/ally/sync',{},Date.now()),/夥伴/);
 assert.equal(publicState(s).allyPending,false);
});
