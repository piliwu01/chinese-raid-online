import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {build} from 'esbuild';import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {hashPassword} from '../server/auth.js';import {freshState,applyAction} from '../shared/game.js';
import {HERO,weekStart,previousWeek,weekDays,weekStats,rankBoard,rewardFor,claimHero} from '../shared/hero.js';import {recordStudy} from '../shared/learning.js';import {settle} from '../server/hero.js';
test('week boundaries follow Taipei Monday',()=>{assert.equal(weekStart(Date.parse('2026-11-22T23:59:00+08:00')),'2026-11-16');assert.equal(weekStart(Date.parse('2026-11-23T00:00:00+08:00')),'2026-11-23');assert.equal(previousWeek(Date.parse('2026-11-23T08:00:00+08:00')),'2026-11-16');});
test('daily correct/answered are recorded and summed per week',()=>{const s={};const t=Date.parse('2026-11-18T10:00:00+08:00');recordStudy(s,'修辭',true,t);recordStudy(s,'修辭',false,t);recordStudy(s,'成語',true,t+86400000);recordStudy(s,'成語',true,Date.parse('2026-11-24T10:00:00+08:00'));
 assert.deepEqual(weekStats(s,'2026-11-16'),{answered:3,correct:2});assert.deepEqual(weekStats(s,'2026-11-23'),{answered:1,correct:1});});
test('ranking: ties share rank, accuracy board needs minimum answers, rewards 5,5,4,4,...',()=>{
 const rows=[['A',50,40],['B',50,40],['C',40,30],['D',10,10],['E',0,0]].map(([name,answered,correct])=>({id:name,name,stats:{answered,correct}}));
 const c=rankBoard(rows,'correct');assert.deepEqual(c.map(r=>[r.name,r.rank]),[['A',1],['B',1],['C',3],['D',4]]);
 const a=rankBoard(rows,'accuracy',HERO.weeklyMin);assert.deepEqual(a.map(r=>r.name),['A','B','C']);
 assert.deepEqual([1,2,3,4,5,6,7,8,9,10,11].map(rewardFor),[5,5,4,4,3,3,2,2,1,1,0]);});
test('claim adds jade once per award key',()=>{const s={};const aw=[{key:'2026-11-16:weekCorrect',jade:5,board:'weekCorrect',rank:1}];assert.equal(claimHero(s,aw).length,1);assert.equal(s.lucky.jade,5);assert.equal(claimHero(s,aw).length,0);assert.equal(s.lucky.jade,5);
 const g=freshState();applyAction(g,'/starter',{id:2010},1);assert.throws(()=>applyAction(g,'/hero/claim',{awards:[]},1),/沒有可領取/);});
test('backend: weekly settlement is idempotent, awards are claimed once, board hides others beyond top 10',async()=>{
 const bundle=await build({stdin:{contents:"export {default} from './server/worker.js';export {RaidRoom,PvpRoom} from './server/worker.js';",resolveDir:process.cwd()},bundle:true,format:'esm',platform:'browser',external:['cloudflare:workers'],write:false});
 const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-10-20',d1Databases:['DB'],durableObjects:{RAIDS:{className:'RaidRoom',useSQLite:true},PVPS:{className:'PvpRoom',useSQLite:true}}}));
 try{const db=await mf.getD1Database('DB');for(const f of ['0001.sql','0008_hero.sql'])await db.exec((await readFile('migrations/'+f,'utf8')).replaceAll('\n',' '));
  const password='Hero-Test-pw-2026',hash=await hashPassword(password);const lastMon='2026-11-16',days=weekDays(lastMon);
  const people=Array.from({length:13},(_,i)=>['s'+i,'313',i]);people.push(['other','999',50]);
  for(const [id,cls,n] of people){const s=freshState();applyAction(s,'/starter',{id:2010},1);s.study={total:{r:n*2,w:n},da:{[days[2]]:n*3},dr:{[days[2]]:n*2},days:{},cats:{}};
   await db.batch([db.prepare('INSERT INTO users(id,username,display_name,class_name,role,password,must_change,created_at) VALUES(?,?,?,?,?,?,0,?)').bind(id,id,'同學'+id,cls,'student',hash,1),db.prepare('INSERT INTO progress(user_id,data) VALUES(?,?)').bind(id,JSON.stringify(s))]);}
  const monday=Date.parse('2026-11-23T08:00:00+08:00');await settle(db,'313',monday);await settle(db,'313',monday);
  const {results}=await db.prepare("SELECT board,rank,user_id,jade FROM hero_awards WHERE class_name='313' ORDER BY board,rank").all();
  const wc=results.filter(r=>r.board==='weekCorrect');assert.equal(wc.length,10);assert.equal(wc[0].user_id,'s12');assert.equal(wc[0].jade,5);assert.equal(wc[2].jade,4);assert.equal(wc[9].jade,1);
  assert(results.every(r=>r.user_id!=='other'));const wa=results.filter(r=>r.board==='weekAccuracy');assert.deepEqual(wa.map(r=>[r.user_id,r.rank,r.jade]),[['s12',1,5],['s11',2,5],['s10',3,4]],'same accuracy: more correct ranks higher; under 30 answered excluded');
  const call=async(path,body,cookie='')=>{const r=await mf.dispatchFetch('http://localhost/api'+path,{method:'POST',headers:{cookie,Origin:'http://localhost','X-QuizSpirit':'1','Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};};
  const who=(await call('/login',{username:'s12',password})).cookie;
  const pend=(await call('/hero/pending',{},who)).data.awards;assert.equal(pend.length,2);
  const rid=crypto.randomUUID();const c1=await call('/hero/claim',{requestId:rid,awards:[{key:'fake:x',jade:99}]},who);assert.equal(c1.status,200);assert.equal(c1.data.event.jade,10);assert.equal(c1.data.state.lucky.jade,10);
  assert.equal((await call('/hero/claim',{requestId:crypto.randomUUID()},who)).status,400);assert.equal((await call('/hero/pending',{},who)).data.awards.length,0);
  const board=(await call('/hero/board',{},who)).data;assert.equal(board.boards.totalCorrect.top.length,10);assert.equal(board.boards.totalCorrect.top[0].me,true);assert(!JSON.stringify(board).includes('other'));
  const low=(await call('/login',{username:'s0',password})).cookie;const b0=(await call('/hero/board',{},low)).data;assert.equal(b0.boards.totalCorrect.me,null);
  // 老師可選班級查看（只讀）：學生想指定別班會被忽略；老師沒選班級 400、空班 404；/hero/pending 一律空。
  const sneak=(await call('/hero/board',{className:'999'},low)).data;assert.equal(sneak.className,'313');
  const tid='t1';const ts=freshState();await db.batch([db.prepare('INSERT INTO users(id,username,display_name,class_name,role,password,must_change,created_at) VALUES(?,?,?,?,?,?,0,?)').bind(tid,tid,'老師','','teacher',hash,1),db.prepare('INSERT INTO progress(user_id,data) VALUES(?,?)').bind(tid,JSON.stringify(ts))]);
  const tc=(await call('/login',{username:'t1',password})).cookie;
  assert.equal((await call('/hero/board',{},tc)).status,400);assert.equal((await call('/hero/board',{className:'888'},tc)).status,404);
  const tb=await call('/hero/board',{className:'313'},tc);assert.equal(tb.status,200);assert.equal(tb.data.teacher,true);assert.equal(tb.data.className,'313');assert.equal(tb.data.boards.totalCorrect.top.length,10);assert.equal(tb.data.boards.totalCorrect.me,null);assert(tb.data.boards.totalCorrect.top.every(r=>!r.me));assert(!JSON.stringify(tb.data).includes('同學other'));
  const other=(await call('/hero/board',{className:'999'},tc)).data;assert.equal(other.boards.totalCorrect.top[0].name,'同學other');
  assert.deepEqual((await call('/hero/pending',{},tc)).data.awards,[]);
 }finally{await mf.dispose();}
});
