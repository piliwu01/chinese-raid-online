import test from 'node:test';import assert from 'node:assert/strict';
import {shuffleQuestion,canShuffle,remapLetters} from '../shared/option-shuffle.js';
import {freshState,applyAction} from '../shared/game.js';

const base={question:'題',answer:'B',options:['A','B','C','D'],optionTexts:{A:'甲',B:'乙',C:'丙',D:'丁'},explanation:'(A)錯：甲。(B)正確：乙。選項C與（D）都不對，故選B。'};
const seq=(...xs)=>{let i=0;return ()=>xs[i++%xs.length];};

test('shuffling keeps the correct option text and rewrites letters in the explanation',()=>{
 for(let k=0;k<50;k++){const q=shuffleQuestion(base);assert.equal(q.optionTexts[q.answer],'乙');assert.deepEqual(Object.values(q.optionTexts).sort(),['丁','丙','乙','甲']);
  const map={};[...q.shuffled].forEach((old,i)=>{map[old]='ABCD'[i];});
  assert.ok(q.explanation.includes(`(${map.A})錯：甲`));assert.ok(q.explanation.includes(`(${map.B})正確：乙`));assert.ok(q.explanation.includes(`故選${map.B}`));assert.ok(q.explanation.includes(`選項${map.C}`));assert.ok(q.explanation.includes(`（${map.D}）`));}
 assert.notEqual(new Set(Array.from({length:40},()=>shuffleQuestion(base).shuffled)).size,1,'順序會變');
 assert.equal(base.answer,'B','不改原題');
});

test('letters are swapped all at once, not chained',()=>{
 assert.equal(remapLetters('(A)與(B)',{A:'B',B:'A'}),'(B)與(A)');
 assert.equal(remapLetters('A4 紙、ABC',{A:'D'}),'A4 紙、ABC','一般英文字不動');
});

test('questions whose options refer to each other keep the original order; math questions are untouched',()=>{
 for(const t of ['以上皆是','(A)(B)皆對','A與B','以上皆非']){const q={...base,optionTexts:{...base.optionTexts,D:t}};assert.equal(canShuffle(q),false);assert.equal(shuffleQuestion(q),q);}
 const math={question:'1+1',answer:2,options:[1,2,3,4]};assert.equal(shuffleQuestion(math),math);
});

test('a bank question in battle is shuffled on the server and still graded by its text',()=>{
 const bank={bankId:'sh',title:'t',questions:Array.from({length:12},(_,i)=>({id:'q'+i,status:'active',difficulty:'easy',stem:'題'+i,answer:'A',options:{A:'正確',B:'錯一',C:'錯二',D:'錯三'},explanation:'(A)正確'}))};
 const s=freshState();applyAction(s,'/starter',{id:2001},Date.now());applyAction(s,'/battle/start',{chapter:1,heal:true},Date.now(),bank);
 const orders=new Set();for(let i=0;i<10;i++){const q=applyAction(s,'/question',{move:'quick'},Date.now(),bank).question;const key=Object.keys(q.optionTexts).find(k=>q.optionTexts[k]==='正確');orders.add(key);
  const e=applyAction(s,'/answer',{questionId:q.id,choice:key},Date.now()+500,bank);assert.equal(e.correct,true);assert.ok(e.explanation.includes(`(${key})正確`));assert.equal(e.order.length,4);if(s.battle.status!=='ready')applyAction(s,'/battle/start',{chapter:1,heal:true},Date.now(),bank);}
 assert.ok(orders.size>1,'正確答案不會永遠在同一個位置');
});
