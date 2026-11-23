import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {hashPassword} from '../server/auth.js';import {freshState,applyAction} from '../shared/game.js';
import {worldWeek} from '../shared/world-boss.js';
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
  await t.test('boss HP = class size × 300; a correct hard answer deals 20 (40 on weak) and replays count once',async()=>{
   const v=await call('/world/view',{},s1);assert.equal(v.status,200);assert.equal(v.data.maxHp,900);assert.equal(v.data.hp,900);assert.ok(['成語','修辭'].includes(v.data.weak));
   const q=(await call('/world/question',{bankId:bank.bankId,difficulty:'hard',requestId:crypto.randomUUID()},s1)).data.event.question;
   const body={questionId:q.id,choice:right(q),bankId:bank.bankId,requestId:crypto.randomUUID()};const a=await call('/world/answer',body,s1);assert.equal(a.status,200);
   const dmg=a.data.event.world.damage;assert.ok(dmg===20||dmg===40);const again=await call('/world/answer',body,s1);assert.equal(again.data.replayed,true);
   const v2=await call('/world/view',{},s2);assert.equal(v2.data.damage,dmg,'重送不重複計傷害，同班看得到');assert.equal(v2.data.participants,1);
   const other=await call('/world/view',{},x1);assert.equal(other.data.damage,0,'別班看不到');
  });
  await t.test('teacher views a class with every contributor; teachers cannot attack',async()=>{
   const v=await call('/world/view',{className:'313'},t1);assert.equal(v.status,200);assert.equal(v.data.top.length,1);assert.equal(v.data.top[0].id,'s1');
   assert.equal((await call('/world/question',{bankId:bank.bankId,requestId:crypto.randomUUID()},t1)).status,403);
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
 }finally{await mf.dispose();}
});
