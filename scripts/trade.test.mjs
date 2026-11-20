import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {hashPassword} from '../server/auth.js';import {freshState,applyAction} from '../shared/game.js';
import {swapCards,addDupe,TRADE} from '../shared/trade.js';import {CATALOG} from '../shared/catalog.js';
const A=CATALOG[0].id,B=CATALOG[1].id,C=CATALOG[2].id;
const ref=id=>{const p=CATALOG.find(x=>x.id===id);return {id,name:p.name,zhName:p.zhName,type:p.type,gen:p.gen};};
test('capturing an owned spirit yields a duplicate card instead of a second entry',()=>{
 const s=freshState();applyAction(s,'/starter',{id:2010},1000);s.captured.push(ref(A));
 s.battle={id:'x',status:'ready',enemy:ref(A),hp:5,maxHp:100,playerHp:185,playerMaxHp:185};applyAction(s,'/question',{move:'catch'},1000);const q=s.pending,r=Math.random;
 try{Math.random=()=>0;const out=applyAction(s,'/answer',{questionId:q.id,choice:q.answer},1000);assert.equal(out.combat.caught,true);assert.equal(out.event?.dupe??s.dupes[A],1);}finally{Math.random=r;}
 assert.equal(s.captured.filter(p=>p.id===A).length,1);assert.equal(s.dupes[A],1);
});
test('swap moves only duplicates; new species join collection; titles re-checked',()=>{
 const a=freshState(),b=freshState();a.captured=[ref(A)];b.captured=[ref(B),ref(A)];addDupe(a,A);addDupe(b,B);
 const r=swapCards(a,b,A,B);assert.deepEqual(r,{from:'new',to:'dupe'});
 assert.equal(a.dupes[A],undefined);assert(a.captured.some(p=>p.id===B));assert.equal(b.dupes[A],1);assert.equal(b.dupes[B],undefined);
 assert.equal(a.captured.filter(p=>p.id===A).length,1);
 assert.throws(()=>swapCards(a,b,A,B),/沒有這張副本卡/);
 assert.throws(()=>swapCards(a,b,2001,B),/野外神獸/);
});
test('D1 trade flow: same class only, atomic swap, limits, teacher log',async t=>{
 const bundle=await build({entryPoints:['server/worker.js'],bundle:true,format:'esm',platform:'browser',external:['cloudflare:workers'],write:false});
 const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-10-20',d1Databases:['DB']}));
 try{
  const db=await mf.getD1Database('DB');for(const f of ['0001.sql','0002_raid.sql','0007_trade.sql'])await db.exec((await readFile('migrations/'+f,'utf8')).replaceAll('\n',' '));
  const pw='Trade-Test-2026',hash=await hashPassword(pw);
  for(const [id,role,cls] of [['t','teacher',''],['amy','student','313'],['ben','student','313'],['cat','student','314']]){const s=freshState();if(role==='student'){applyAction(s,'/starter',{id:2010},1);s.captured.push(ref(A),ref(B),ref(C));s.dupes={[A]:2,[B]:1,[C]:1};}
   await db.prepare('INSERT INTO users(id,username,display_name,class_name,role,password,must_change,created_at) VALUES(?,?,?,?,?,?,0,?)').bind(id,id,id.toUpperCase(),cls,role,hash,1).run();await db.prepare('INSERT INTO progress(user_id,data) VALUES(?,?)').bind(id,JSON.stringify(s)).run();}
  // ben owns no C entry? give ben a species amy lacks
  {const r=await db.prepare('SELECT data FROM progress WHERE user_id=?').bind('ben').first();const s=JSON.parse(r.data);const D=CATALOG[5].id;s.captured.push(ref(D));s.dupes[D]=1;await db.prepare('UPDATE progress SET data=? WHERE user_id=?').bind(JSON.stringify(s),'ben').run();}
  const D=CATALOG[5].id;
  async function call(path,body,cookie=''){const r=await mf.dispatchFetch('http://localhost/api'+path,{method:'POST',headers:{cookie,'X-QuizSpirit':'1',Origin:'http://localhost','Content-Type':'application/json'},body:JSON.stringify(body||{})});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
  const login=async u=>(await call('/login',{username:u,password:pw})).cookie;const amy=await login('amy'),ben=await login('ben'),cat=await login('cat'),teacher=await login('t');
  const board=await call('/trade/board',{},amy);assert.equal(board.status,200);assert.deepEqual(board.data.classmates.map(m=>m.id),['ben']);
  assert.equal((await call('/trade/offer',{toId:'cat',give:A,want:B},amy)).status,403);
  assert.equal((await call('/trade/offer',{toId:'ben',give:C,want:CATALOG[9].id},amy)).status,400);
  const offer=await call('/trade/offer',{toId:'ben',give:A,want:D},amy);assert.equal(offer.status,200,JSON.stringify(offer.data));
  assert.equal((await call('/trade/accept',{id:offer.data.id},amy)).status,403);
  assert.equal((await call('/trade/accept',{id:offer.data.id},cat)).status,403);
  const [x,y]=await Promise.all([call('/trade/accept',{id:offer.data.id},ben),call('/trade/accept',{id:offer.data.id},ben)]);
  assert.deepEqual([x.status,y.status].sort(),[200,409]);
  const sa=JSON.parse((await db.prepare('SELECT data FROM progress WHERE user_id=?').bind('amy').first()).data),sb=JSON.parse((await db.prepare('SELECT data FROM progress WHERE user_id=?').bind('ben').first()).data);
  assert.equal(sa.dupes[A],1);assert(sa.captured.some(p=>p.id===D));assert.equal(sb.dupes[D],undefined);assert.equal(sb.dupes[A],3);
  const dec=await call('/trade/offer',{toId:'ben',give:A,want:B},amy);assert.equal((await call('/trade/decline',{id:dec.data.id},ben)).status,200);assert.equal((await call('/trade/accept',{id:dec.data.id},ben)).status,409);
  const can=await call('/trade/offer',{toId:'ben',give:B,want:A},amy);assert.equal((await call('/trade/cancel',{id:can.data.id},ben)).status,403);assert.equal((await call('/trade/cancel',{id:can.data.id},amy)).status,200);
  // daily limit: refill duplicates, two more accepted trades -> third blocked
  for(const u of ['amy','ben']){const r=await db.prepare('SELECT data FROM progress WHERE user_id=?').bind(u).first();const st=JSON.parse(r.data);st.dupes={[A]:5,[B]:5,[C]:5};await db.prepare('UPDATE progress SET data=?,version=version+1 WHERE user_id=?').bind(JSON.stringify(st),u).run();}
  for(let i=0;i<2;i++){const o=await call('/trade/offer',{toId:'ben',give:C,want:B},amy);assert.equal(o.status,200,JSON.stringify(o.data));const acc=await call('/trade/accept',{id:o.data.id},ben);assert.equal(acc.status,200,JSON.stringify(acc.data));}
  const over=await call('/trade/offer',{toId:'ben',give:A,want:B},amy);assert.equal(over.status,429);
  const log=await call('/admin/trades',{className:'313'},teacher);assert.equal(log.status,200);assert(log.data.trades.length>=5);assert(log.data.trades.some(t=>t.status==='accepted'&&t.from==='AMY'));
  assert.equal((await call('/admin/trades',{},amy)).status,403);
 }finally{await mf.dispose();}
});
