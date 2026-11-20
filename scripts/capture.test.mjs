import test from 'node:test';
import assert from 'node:assert/strict';
import {canCapture,captureSucceeds} from '../src/capture.js';
test('capture is blocked above 15 percent even with a winning random draw',()=>{
  for(const hp of [100,35,16,15.01]){assert.equal(canCapture(hp,100),false);assert.equal(captureSucceeds(hp,100,()=>0),false);}
});
test('exactly 15 percent and lower are eligible but fainted enemies are not',()=>{
  for(const hp of [15,10,5,1])assert.equal(canCapture(hp,100),true);
  for(const [hp,max] of [[0,100],[-1,100],[1,0],[NaN,100],[1,Infinity]])assert.equal(canCapture(hp,max),false);
});
test('integer HP uses precise ratio against non-round max HP',()=>{
  assert.equal(canCapture(27,180),true);assert.equal(canCapture(28,180),false);
  assert.equal(canCapture(28,188),true);assert.equal(canCapture(29,188),false);
});
test('eligible capture retains original 92 percent success rate',()=>{
  assert.equal(captureSucceeds(5,100,()=>.9199),true);assert.equal(captureSucceeds(5,100,()=>.92),false);
});
test('idle animation pace differs between player and enemy sides',async()=>{
  const {idleDuration,idleStyle}=await import('../src/fx.js');
  for(const id of [2010,2018,2001,2050]){assert.notEqual(idleDuration(id,'player'),idleDuration(id,'enemy'));assert.ok(idleDuration(id,'enemy')>idleDuration(id,'player'));}
  assert.notEqual(idleDuration(2010,'ally'),idleDuration(2018,'ally'));assert.match(idleStyle(2010,'enemy').animationDuration,/s$/);
});
