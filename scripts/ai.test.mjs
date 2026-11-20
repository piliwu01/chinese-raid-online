import test from 'node:test';import assert from 'node:assert/strict';
import {chooseModel,cleanText,summarizeStats,explainPrompt,explain,taunt} from '../server/ai.js';
import {taipeiDate} from '../shared/game.js';

test('chooseModel prefers known chat models and skips audio/guard',()=>{
 assert.equal(chooseModel(['whisper-large-v3','llama-guard-4','llama-3.3-70b-versatile','openai/gpt-oss-120b']),'openai/gpt-oss-120b');
 assert.equal(chooseModel(['whisper-large-v3','meta-llama/llama-4-scout']),'meta-llama/llama-4-scout');
 assert.equal(chooseModel(['whisper-large-v3']),null);
});
test('cleanText strips think blocks and markdown',()=>{assert.equal(cleanText('<think>x</think>## 標題\n**重點**'),'標題\n重點');});
test('summarizeStats ranks categories and hardest questions',()=>{
 const s=summarizeStats({a:{stem:'甲',category:'修辭',right:1,wrong:3},b:{stem:'乙',category:'成語',right:4,wrong:0},c:{stem:'丙',category:'修辭',right:2,wrong:1}});
 assert.equal(s.answered,11);assert.equal(s.correct,7);assert.equal(s.categories[0].category,'修辭');assert.deepEqual(s.hardest.map(q=>q.id),['a','c']);
});
test('explainPrompt includes answer and options',()=>{const m=explainPrompt({stem:'題',options:{A:'甲',B:'乙',C:'丙',D:'丁'},answer:'B',explanation:'因為'});assert.match(m[1].content,/正確答案：B/);assert.match(m[1].content,/D\. 丁/);});

function fakeEnv(state,{bank,cache={}}={}){
 const usage={};let calls=0;
 const DB={prepare(sql){return {bind(...a){return {
  first:async()=>{if(sql.startsWith('SELECT data FROM progress'))return {data:JSON.stringify(state)};if(sql.startsWith('SELECT text FROM ai_cache'))return cache[a[0]]?{text:cache[a[0]]}:null;if(sql.startsWith('INSERT INTO ai_usage')){const k=a[0]+a[1];usage[k]=(usage[k]||0)+1;return {count:usage[k]};}if(sql.startsWith('SELECT data FROM banks'))return bank?{data:JSON.stringify(bank)}:null;return null;},
  run:async()=>{if(sql.startsWith('INSERT OR REPLACE INTO ai_cache'))cache[a[0]]=a[1];}}}}}};
 globalThis.fetch=async(url)=>{calls++;if(String(url).endsWith('/models'))return new Response(JSON.stringify({data:[{id:'llama-3.3-70b-versatile'}]}));return new Response(JSON.stringify({choices:[{message:{content:'1. 這題考修辭。'}}]}));};
 return {env:{DB,GROQ_KEY:{get:async()=>'k'}},cache,calls:()=>calls};
}
const bank={bankId:'b1',questions:[{id:'q1',stem:'題目',options:{A:'1',B:'2',C:'3',D:'4'},answer:'A',explanation:'解'}]};
const today=taipeiDate(Date.now());
test('explain only for today\'s ink monsters, then caches',async()=>{
 const student={id:'u1',role:'student'};
 let f=fakeEnv({inkNest:[]},{bank});await assert.rejects(explain(f.env,student,{bankId:'b1',questionId:'q1'}),/墨漬怪巢穴/);
 f=fakeEnv({inkNest:[{bankId:'b1',questionId:'q1',day:'2000-01-01'}]},{bank});await assert.rejects(explain(f.env,student,{bankId:'b1',questionId:'q1'}),/醒來/);
 f=fakeEnv({inkNest:[{bankId:'b1',questionId:'q1',day:today}]},{bank});const r=await explain(f.env,student,{bankId:'b1',questionId:'q1'});assert.equal(r.text,'1. 這題考修辭。');assert.equal(r.cached,false);
 const again=await explain(f.env,student,{bankId:'b1',questionId:'q1'});assert.equal(again.cached,true);
 await assert.rejects(explain(f.env,student,{bankId:'math-auto',questionId:'x'}),/沒有可以說明/);
});
test('explain enforces daily limit for students',async()=>{
 const f=fakeEnv({inkNest:[...Array(20)].map((_,i)=>({bankId:'b1',questionId:'q'+i,day:today}))},{bank:{bankId:'b1',questionId:'q1',questions:[...Array(20)].map((_,i)=>({...bank.questions[0],id:'q'+i}))}});
 for(let i=0;i<15;i++)await explain(f.env,{id:'u2',role:'student'},{bankId:'b1',questionId:'q'+i});
 await assert.rejects(explain(f.env,{id:'u2',role:'student'},{bankId:'b1',questionId:'q15'}),/15 次/);
});
test('taunt rejects unknown kinds and strips quotes',async()=>{
 const f=fakeEnv({});await assert.rejects(taunt(f.env,'hack'),/沒有這種/);
 globalThis.fetch=async u=>String(u).endsWith('/models')?new Response(JSON.stringify({data:[{id:'llama-3.3-70b-versatile'}]})):new Response(JSON.stringify({choices:[{message:{content:'「本座無敵！」'}}]}));
 assert.equal((await taunt(f.env,'phase')).text,'本座無敵！');
});
