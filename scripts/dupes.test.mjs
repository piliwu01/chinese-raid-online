import test from 'node:test';import assert from 'node:assert/strict';
import {convertDupe,convertAmount} from '../shared/dupes.js';import {freshState,applyAction,publicState} from '../shared/game.js';
test('convert a duplicate card into food or potions; rare beasts give double',()=>{
 const s={food:0,dupes:{'2014':2,'2097':1}};
 assert.equal(convertDupe(s,2014,'food').amount,3);assert.equal(s.food,3);assert.equal(s.dupes['2014'],1);
 assert.equal(convertDupe(s,2014,'potion').amount,1);assert.equal(s.bag.potion,1);assert.equal(s.dupes['2014'],undefined);
 assert.equal(convertAmount(2097,'food'),6);assert.equal(convertDupe(s,2097,'food').rare,true);assert.equal(s.food,9);
 assert.throws(()=>convertDupe(s,2014,'food'),/沒有這張副本卡/);assert.throws(()=>convertDupe({dupes:{'2014':1}},2014,'gold'),/不支援/);assert.throws(()=>convertDupe({dupes:{'2010':1}},2010,'food'),/野外神獸/);});
test('route /dupe/convert updates public dupes list',()=>{const s=freshState();applyAction(s,'/starter',{id:2010},1);s.dupes={'2014':1};const e=applyAction(s,'/dupe/convert',{id:2014,to:'food'},1);assert.equal(e.convert.amount,3);assert.deepEqual(publicState(s).dupes,[]);});
