import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {hashPassword} from '../server/auth.js';import {freshState,applyAction} from '../shared/game.js';
import {worldWeek,bossFor} from '../shared/world-boss.js';import {restartRound} from '../server/world.js';
const right=q=>Object.keys(q?.optionTexts||{}).find(k=>q.optionTexts[k]==='正確')||'A';

test('world boss integration: class-wide damage, teacher view, idempotent settlement and claim',async t=>{
 const bundle=await build({entryPoints:['server/worker.js'],bundle:true,format:'esm',platform:'browser',external:['cloudflare:workers'],write:false});
 const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-10-20',d1Databases:['DB']}));
 try{
  const db=await mf.getD1Database('DB');for(const f of ['migrations/0001.sql','migrations/0009_world_boss.sql'])await db.exec((await readFile(f,'utf8')).replaceAll('\n',' '));
  const bank={schemaVersion:1,bankId:'chinese-115-review-v1',title:'測試',questions:Array.from({length:24},(_,i)=>({id:'q'+i,status:'active',stem:'題目 '+i,unit:'u',category:i<12?'成語':'修辭',options:{A:'正確',B:'其他一',C:'其他二',D:'其他三'},answer:'A',explanation:'(A)正確',sourceRef:'s'}))};
  await db.prepare('INSERT INTO banks(id,title,data,created_at) VALUES(?,?,?,?)').bind(bank.bankId,bank.title,JSON.stringify(bank),Date.now()).run();
  const pw='World-Boss-Pass-2026',hash=await hashPassword(pw);
  for(const [id,role,cls] of [['t1','teacher',''],['s1','student','313'],['s2','student','313'],['s3','student','313'],['x1','student','314']]){const s=freshState();if(role==='student')applyAction(s,'/starter',{id:2001},Date.now());await db.prepare('INSERT INTO users(id,username,display_name,class_name,role,password,must_change,created_at) VALUES(?,?,?,?,?,?,0,?)').bind(id,id,id,cls,role,hash,Date.now()).run();await db.prepare('INSERT INTO progress(user_id,data) VALUES(?,?)').bind(id,JSON.stringify(s)).run();}
  async function call(path,body,cookie=''){const r=await mf.dispatchFetch('http://localhost/api'+path,{method:'POST',headers:{cookie,'X-QuizSpirit':'1',Origin:'http://localhost','Content-Type':'application/json'},body:JSON.stringify(body||{})});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
  const login=async id=>(await call('/login',{username:id,password:pw})).cookie;const [t1,s1,s2,x1]=await Promise.all(['t1','s1','s2','x1'].map(login));
  const week=worldWeek();
  await t.test('boss HP = class size × 2300; adventure damage is shared at 50% (x2 on weak) and replays count once',async()=>{
   const v=await call('/world/view',{},s1);assert.equal(v.status,200);assert.equal(v.data.maxHp,6900);assert.equal(v.data.hp,6900);assert.ok(['成語','修辭'].includes(v.data.weak));assert.equal(v.data.rules.share,0.5);
   await call('/battle/start',{chapter:1,heal:true,bankId:bank.bankId,requestId:crypto.randomUUID()},s1);
   const q=(await call('/question',{move:'critical',bankId:bank.bankId,requestId:crypto.randomUUID()},s1)).data.event.question;
   const body={questionId:q.id,choice:right(q),bankId:bank.bankId,requestId:crypto.randomUUID()};const a=await call('/answer',body,s1);assert.equal(a.status,200);
   const e=a.data.event,dmg=e.world.damage;assert.equal(dmg,Math.min(6900,Math.max(1,Math.round(e.combat.damage*0.5*(e.world.weak?2:1)))));
   const again=await call('/answer',body,s1);assert.equal(again.data.replayed,true);
   const v2=await call('/world/view',{},s2);assert.equal(v2.data.damage,dmg,'重送不重複計傷害，同班看得到');assert.equal(v2.data.participants,1);
   const other=await call('/world/view',{},x1);assert.equal(other.data.damage,0,'別班看不到');
   assert.equal((await call('/world/question',{bankId:bank.bankId,requestId:crypto.randomUUID()},s1)).status,404,'不再另外答題');
  });
  await t.test('teacher views a class with every contributor',async()=>{
   const v=await call('/world/view',{className:'313'},t1);assert.equal(v.status,200);assert.equal(v.data.top.length,1);assert.equal(v.data.top[0].id,'s1');
  });
  await t.test('math-auto is retired: battles without a bank or with math-auto use the default Chinese bank',async()=>{
   for(const bankId of [undefined,'math-auto']){const st=await call('/battle/start',{chapter:1,heal:true,bankId,requestId:crypto.randomUUID()},s2);assert.equal(st.status,200);
    const q=(await call('/question',{move:'quick',bankId,requestId:crypto.randomUUID()},s2)).data.event.question;assert.ok(q.optionTexts,'出國文題');assert.ok(Object.values(q.optionTexts).includes('正確'));}
  });
  await t.test('a finished past week settles once; 20+ correct students claim once',async()=>{
   const past='2026-11-16';await db.prepare('INSERT INTO world_bosses(week,class_name,max_hp,boss,weak,created_at) VALUES(?,?,?,?,?,?)').bind(past,'313',900,'taotie','成語',1).run();
   await db.batch([['s1',600,30],['s2',300,20],['s3',100,5]].map(([u,d,c])=>db.prepare('INSERT INTO world_hits(week,class_name,user_id,damage,correct,answered,updated_at) VALUES(?,?,?,?,?,?,?)').bind(past,'313',u,d,c,c,1)));
   const p=await call('/world/pending',{},s1);assert.equal(p.data.awards.length,1);assert.equal(p.data.awards[0].won,true);assert.equal(p.data.awards[0].top,true);
   await call('/world/pending',{},s2);const {results}=await db.prepare('SELECT user_id FROM world_awards WHERE week=?').bind(past).all();assert.deepEqual(results.map(r=>r.user_id).sort(),['s1','s2'],'答對未滿 20 題不發獎');
   const c=await call('/world/claim',{requestId:crypto.randomUUID()},s1);assert.equal(c.status,200);assert.ok(c.data.state.titles.includes('山海魔王勇者'));
   assert.equal((await call('/world/claim',{requestId:crypto.randomUUID()},s1)).status,400,'不能重複領');
   const v=await call('/world/view',{},s2);assert.equal(v.data.lastWeek.week,past);assert.equal(v.data.lastWeek.won,true);
  });
  await t.test('teacher settles early and restarts: awards go out now, a second boss with custom HP takes new damage',async()=>{
   await db.prepare('UPDATE world_hits SET correct=25 WHERE week=? AND user_id=?').bind(week,'s1').run();
   const r=await restartRound(db,'313',67000);assert.equal(r.settled,week);assert.equal(r.next,week+'#2');
   const v=await call('/world/view',{},s1);assert.equal(v.data.maxHp,67000);assert.equal(v.data.hp,67000);assert.equal(v.data.round,2);assert.equal(v.data.boss.id,bossFor(week+'#2').id);assert.notEqual(v.data.boss.id,bossFor(week).id,'換一種神獸');
   assert.equal(v.data.lastWeek.week,week);assert.equal(v.data.lastWeek.sameWeek,true);assert.equal(v.data.open,true);
   const p=await call('/world/pending',{},s1);assert.deepEqual(p.data.awards.map(a=>a.week),[week],'第一隻的獎勵立刻可以領');
   const c=await call('/world/claim',{requestId:crypto.randomUUID()},s1);assert.equal(c.status,200);assert.match(c.data.event.message,/食物 2/);
   await call('/battle/start',{chapter:1,heal:true,bankId:bank.bankId,requestId:crypto.randomUUID()},s2);
   const q=(await call('/question',{move:'critical',bankId:bank.bankId,requestId:crypto.randomUUID()},s2)).data.event.question;
   const a=await call('/answer',{questionId:q.id,choice:right(q),bankId:bank.bankId,requestId:crypto.randomUUID()},s2);assert.equal(a.data.event.world.week,week+'#2');
   const v2=await call('/world/view',{},s2);assert.equal(v2.data.damage,a.data.event.world.damage,'傷害打到第二隻');assert.equal(v2.data.participants,1);
   const old=await db.prepare('SELECT COALESCE(SUM(damage),0) t FROM world_hits WHERE week=?').bind(week).first();assert.equal(v.data.lastWeek.total,old.t,'第一隻的傷害不變');
   assert.equal((await restartRound(db,'313',5000)).next,week+'#3');
  });
  await t.test('teacher restart button API: teachers only, valid HP, and a stale screen cannot settle the new boss',async()=>{
   const v=await call('/world/view',{className:'313'},t1);assert.equal(v.data.week,week+'#3');assert.equal(v.data.rules.hpPerStudent,2300);
   assert.equal((await call('/world/restart',{className:'313',maxHp:67000,expect:v.data.week},s1)).status,403,'學生不能按');
   assert.equal((await call('/world/restart',{className:'313',maxHp:50,expect:v.data.week},t1)).status,400,'血量太少');
   assert.equal((await call('/world/restart',{className:'999',maxHp:67000,expect:v.data.week},t1)).status,404,'沒有這班');
   const ok=await call('/world/restart',{className:'313',maxHp:67000,expect:v.data.week},t1);assert.equal(ok.status,200);assert.equal(ok.data.next,week+'#4');assert.equal(ok.data.maxHp,67000);
   const again=await call('/world/restart',{className:'313',maxHp:67000,expect:v.data.week},t1);assert.equal(again.status,409,'重複按不會把新的一隻也結算');
   const v2=await call('/world/view',{className:'313'},t1);assert.equal(v2.data.week,week+'#4');assert.equal(v2.data.maxHp,67000);assert.equal(v2.data.open,true);
   const other=await call('/world/view',{},x1);assert.equal(other.data.round,1,'別班不受影響');
  });
 }finally{await mf.dispose();}
});
