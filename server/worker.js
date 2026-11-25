import {freshState,publicState,applyAction,fail} from '../shared/game.js';
import {hashPassword,checkPassword,validatePassword,newSession,getUser,visibleUser,sha,cookie,randomToken,tempPassword} from './auth.js';
import {validateBank} from '../src/question-bank.js';
import {handleRaid,currentMembership} from './raid-api.js';
import {handlePvp} from './pvp-api.js';
import {activeActivity} from './activity.js';
import {explain,studyCheck,classWeakAi} from './ai.js';
import {studySummary} from '../shared/learning.js';
import {categorize} from '../shared/play.js';
import {handleTrade,tradeLog} from './trade.js';
import {learningReport,classWeakness} from './report.js';
import {handleHero,pendingAwards,markClaimed} from './hero.js';
import {pickBankId} from './banks.js';
import {worldView,worldContext,hitStatement,pendingWorld,markWorldClaimed,restartRound} from './world.js';
export {RaidRoom} from './raid-room.js';
export {PvpRoom} from './pvp-room.js';

const json=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra}});
async function bodyOf(req){const reader=req.body?.getReader();if(!reader)return {};let size=0,chunks=[];for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>5*1024*1024){await reader.cancel();fail('內容超過 5 MB。',413);}chunks.push(value);}const bytes=new Uint8Array(size);let at=0;for(const c of chunks){bytes.set(c,at);at+=c.length;}try{return JSON.parse(new TextDecoder().decode(bytes));}catch{fail('資料格式不正確。');}}
async function stateOf(db,id){const row=await db.prepare('SELECT * FROM progress WHERE user_id=?').bind(id).first();if(!row)fail('找不到養成進度。',500);return row;}
// opts.inject：伺服器注入的欄位（不列入重送比對）；opts.extra(event)：與進度同一批寫入的額外資料。
async function mutate(db,user,route,body,bank,opts={}){
 const requestId=body.requestId;if(typeof requestId!=='string'||!/^[a-zA-Z0-9_-]{16,80}$/.test(requestId))fail('操作識別無效，請重新操作。');
 const fingerprint=await sha(route+JSON.stringify(body));
 for(let retry=0;retry<5;retry++){
  const previous=await db.prepare('SELECT route,result FROM operations WHERE user_id=? AND request_id=?').bind(user.id,requestId).first();
  if(previous){if(previous.route!==fingerprint)fail('操作識別重複，內容不一致。',409);return {state:publicState(JSON.parse((await stateOf(db,user.id)).data)),event:JSON.parse(previous.result),replayed:true};}
  const row=await stateOf(db,user.id),state=JSON.parse(row.data);const event=applyAction(state,route,route==="/fortune/draw"?{...body,userKey:user.id}:{...body,...(opts.inject||{})},Date.now(),bank);const guard=crypto.randomUUID();
  try{await db.batch([
   db.prepare('UPDATE progress SET data=?,version=version+1 WHERE user_id=? AND version=?').bind(JSON.stringify(state),user.id,row.version),
   db.prepare('INSERT INTO state_guards(id,ok) VALUES(?,changes())').bind(guard),
   ...(opts.extra?opts.extra(event):[]),
   db.prepare('INSERT INTO operations(user_id,request_id,route,result,created_at) VALUES(?,?,?,?,?)').bind(user.id,requestId,fingerprint,JSON.stringify(event),Date.now()),
   db.prepare('DELETE FROM state_guards WHERE id=?').bind(guard)
  ]);return {state:publicState(state),event};}catch(e){if(retry===4)throw Object.assign(Error('有另一台裝置正在更新，請重新載入後再試。'),{status:409});}
 }
}
// 新版角色圖：存在 D1 的 art_images（id 為角色編號或 boss），沒有時退回 public/assets 的原圖。
async function artImage(req,env,url){
 const m=url.pathname.match(/^\/assets\/(\d{1,4}|boss|bg-(?:forest|raid|pvp|r[1-7])|item-[a-z]{2,12})\.png$/);if(!m||req.method!=='GET')return null;
 const cache=globalThis.caches?.default,key=new Request(url.origin+url.pathname);
 const hit=cache&&await cache.match(key);if(hit)return hit;
 let row=null;try{row=await env.DB.prepare('SELECT mime,data FROM art_images WHERE id=?').bind(m[1]).first();}catch{return null;}
 if(!row)return null;
 const res=new Response(new Uint8Array(row.data),{headers:{'Content-Type':row.mime,'Cache-Control':'public, max-age=3600','X-Content-Type-Options':'nosniff'}});
 if(cache)await cache.put(key,res.clone());return res;
}
async function route(req,env){
 const url=new URL(req.url),path=url.pathname.replace(/^\/api/,'');const db=env.DB;
 if(!url.pathname.startsWith('/api/')){const art=await artImage(req,env,url);if(art)return art;const response=await env.ASSETS.fetch(req);const headers=new Headers(response.headers);headers.set('X-Content-Type-Options','nosniff');headers.set('Referrer-Policy','same-origin');return new Response(response.body,{status:response.status,headers});}
 if(!['GET','POST'].includes(req.method))fail('不支援此操作。',405);
 if(req.method==='POST'){
  if(req.headers.get('X-QuizSpirit')!=='1')fail('請從網站內操作。',403);
  const origin=req.headers.get('Origin');if(origin&&origin!==url.origin)fail('不允許跨網站操作。',403);
 }
 if(path==='/health')return json({ok:true});
 const body=req.method==='POST'?await bodyOf(req):{};
 if(path==='/login'&&req.method==='POST'){
  const username=String(body.username||'').trim().toLowerCase(),password=String(body.password||'');if(username.length>40||password.length>128)fail('帳號或密碼不正確。',401);
  const key=await sha((req.headers.get('CF-Connecting-IP')||'local')+':'+username);const window=Math.floor(Date.now()/900000);const id=key+':'+window;
  const limit=await db.prepare('INSERT INTO login_limits(id,attempts,expires) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET attempts=attempts+1 RETURNING attempts').bind(id,Date.now()+900000).first();
  if(limit.attempts>10)fail('嘗試次數過多，請稍後再試或請老師協助。',429);
  const user=await db.prepare('SELECT * FROM users WHERE username=?').bind(username).first();const valid=await checkPassword(password,user?.password);if(!valid)fail('帳號或密碼不正確。',401);
  return json({user:visibleUser(user)},200,{'Set-Cookie':await newSession(db,user.id,req.url)});
 }
 const user=await getUser(db,req);if(!user)fail('請先登入。',401);
 if(path==='/me'&&req.method==='GET')return json({user:visibleUser(user),state:publicState(JSON.parse((await stateOf(db,user.id)).data))});
 if(path==='/logout'&&req.method==='POST'){await db.prepare('DELETE FROM sessions WHERE token_hash=?').bind(user.token_hash).run();return json({ok:true},200,{'Set-Cookie':cookie('',req.url,true)});}
 if(path==='/password'&&req.method==='POST'){
  validatePassword(body.password,user.role);if(body.password===body.currentPassword)fail('新密碼不能與原密碼相同。');if(!await checkPassword(String(body.currentPassword||''),user.password))fail('目前密碼不正確。',403);
  const password=await hashPassword(body.password);await db.batch([db.prepare('UPDATE users SET password=?,must_change=0 WHERE id=? AND password=?').bind(password,user.id,user.password),db.prepare('DELETE FROM sessions WHERE user_id=?').bind(user.id)]);
  return json({ok:true},200,{'Set-Cookie':await newSession(db,user.id,req.url)});
 }
 if(user.must_change)fail('請先更改初始密碼。',403);
 if(path==='/ai/explain'&&req.method==='POST')return json(await explain(env,user,body));
 if(path==='/ai/study'&&req.method==='POST')return json(await studyCheck(env,user,{studySummary,categorize}));
 if(path==='/study/summary'&&req.method==='POST'){const row=await db.prepare('SELECT data FROM progress WHERE user_id=?').bind(user.id).first();return json({summary:studySummary(JSON.parse(row.data))});}
 if((path==='/hero/board'||path==='/hero/pending')&&req.method==='POST')return json(await handleHero(env,user,path));
 if(path==='/world/view'&&req.method==='POST')return json(await worldView(env,user,body));
 // 老師：提前結算這班目前的山海魔王，並重開一隻指定血量的新魔王（同一週）。
 if(path==='/world/restart'&&req.method==='POST'){if(user.role!=='teacher')fail('只有老師可以使用此功能。',403);return json(await restartRound(db,String(body.className||'').trim().slice(0,40),body.maxHp,Date.now(),String(body.expect||'')));}
 if(path==='/world/pending'&&req.method==='POST')return json({awards:await pendingWorld(db,user)});
 if(path.startsWith('/trade/')&&req.method==='POST'){if(!['/trade/board','/trade/offer','/trade/accept','/trade/decline','/trade/cancel'].includes(path))fail('找不到這個功能。',404);return json(await handleTrade(env,user,path,body));}
 if(path.startsWith('/pvp/'))return handlePvp(req,env,user,path,body);
 if(path.startsWith('/raid/'))return handleRaid(req,env,user,path,body);
 if(path==='/banks'&&req.method==='GET'){const {results}=await db.prepare('SELECT id,title,data FROM banks ORDER BY created_at').all();return json({banks:results.map(r=>({bankId:r.id,title:r.title,count:JSON.parse(r.data).questions.filter(q=>q.status==='active').length}))});}
 if(path.startsWith('/admin/')){
  if(user.role!=='teacher')fail('只有老師可以使用此功能。',403);
  if(path==='/admin/class-weak'&&req.method==='POST')return json({overview:await classWeakness(env,String(body.className||'').trim().slice(0,40))});
  if(path==='/admin/class-weak/ai'&&req.method==='POST'){const cls=String(body.className||'').trim().slice(0,40);return json(await classWeakAi(env,user,cls,await classWeakness(env,cls),{refresh:!!body.refresh}));}
  if(path==='/admin/report'&&req.method==='POST')return json({students:await learningReport(env,String(body.className||'').trim().slice(0,40))});
  if(path==='/admin/trades'&&req.method==='POST')return json({trades:await tradeLog(env,String(body.className||'').trim().slice(0,40))});
  if(path==='/admin/users'&&req.method==='GET'){const {results}=await db.prepare("SELECT id,username,display_name,class_name,must_change FROM users WHERE role='student' ORDER BY class_name,username").all();return json({users:results});}
  if(path==='/admin/users'&&req.method==='POST'){
   const rows=body.students;if(!Array.isArray(rows)||rows.length<1||rows.length>50)fail('每次請建立 1～50 個帳號。');const ids=new Set(),statements=[],credentials=[];
   for(const r of rows){const name=String(r.username||'').trim().toLowerCase(),display=String(r.displayName||name).trim(),className=String(r.className||'').trim();if(!/^[a-z0-9][a-z0-9_-]{2,31}$/.test(name)||ids.has(name)||display.length>40||className.length>30)fail('帳號需為 3～32 碼英文小寫、數字、底線或連字號，且不可重複。');ids.add(name);const id=crypto.randomUUID(),password=tempPassword();statements.push(db.prepare("INSERT INTO users(id,username,display_name,class_name,role,password,created_at) VALUES(?,?,?,?,'student',?,?)").bind(id,name,display,className,await hashPassword(password),Date.now()),db.prepare('INSERT INTO progress(user_id,data) VALUES(?,?)').bind(id,JSON.stringify(freshState())));credentials.push({username:name,displayName:display,className,password});}
   try{await db.batch(statements);}catch{fail('有帳號已存在，本批次未建立，請檢查後再試。',409);}return json({credentials});
  }
  if(path==='/admin/delete'&&req.method==='POST'){
   // 永久刪除學生帳號（含夥伴、養成進度與已結束的對戰紀錄）。正在討伐或 PVP 房間中的學生不能刪除。
   const ids=[...new Set((Array.isArray(body.userIds)?body.userIds:[]).map(String))];if(ids.length<1||ids.length>100)fail('每次請刪除 1～100 個帳號。');
   const deleted=[],skipped=[];
   for(const id of ids){
    const target=await db.prepare("SELECT id,display_name FROM users WHERE id=? AND role='student'").bind(id).first();if(!target){skipped.push({id,reason:'找不到學生帳號'});continue;}
    if(await db.prepare('SELECT 1 FROM activity_locks WHERE user_id=?').bind(id).first()){skipped.push({id,name:target.display_name,reason:'正在討伐或 PVP 房間中'});continue;}
    await db.batch([
     db.prepare('DELETE FROM sessions WHERE user_id=?').bind(id),db.prepare('DELETE FROM operations WHERE user_id=?').bind(id),
     db.prepare('DELETE FROM raid_members WHERE user_id=?').bind(id),db.prepare('DELETE FROM pvp_members WHERE user_id=?').bind(id),
     db.prepare("DELETE FROM pvp_members WHERE room_code IN (SELECT code FROM pvp_rooms WHERE host_id=?)").bind(id),
     db.prepare('DELETE FROM pvp_rooms WHERE host_id=?').bind(id),
     db.prepare('DELETE FROM progress WHERE user_id=?').bind(id),db.prepare("DELETE FROM users WHERE id=? AND role='student'").bind(id)]);
    deleted.push(id);
   }
   return json({deleted,skipped});
  }
  if(path==='/admin/reset'&&req.method==='POST'){
   const target=await db.prepare("SELECT id FROM users WHERE id=? AND role='student'").bind(String(body.userId)).first();if(!target)fail('找不到學生帳號。',404);const password=tempPassword();
   await db.batch([db.prepare('UPDATE users SET password=?,must_change=1 WHERE id=?').bind(await hashPassword(password),target.id),db.prepare('DELETE FROM sessions WHERE user_id=?').bind(target.id)]);return json({password});
  }
  if(path==='/admin/banks'&&req.method==='POST'){
   const bank=body.bank,result=validateBank(bank);if(!result.ok)fail(result.errors.slice(0,3).join('；'));if(bank.questions.length>2000)fail('每份題庫最多 2,000 題。');
   try{await db.prepare('INSERT INTO banks(id,title,data,created_at) VALUES(?,?,?,?)').bind(bank.bankId,bank.title,JSON.stringify(bank),Date.now()).run();}catch{fail('題庫 ID 已存在，請使用新的版本 ID。',409);}return json({ok:true,count:result.active});
  }
  fail('找不到此管理功能。',404);
 }
 if(req.method!=='POST')fail('找不到此功能。',404);
 const allowed=['/fortune/draw','/chest/open','/chest/openAll','/lantern/pull','/lantern/pull10','/starter','/nickname','/feed','/shop/buy','/bag/use','/battle/start','/question','/answer','/challenge/start','/challenge/answer','/challenge/next','/challenge/leave','/claim','/evolve','/bank/change','/ink/start','/ink/answer','/quest/claim','/title','/hero/claim','/dupe/convert','/collection/claim','/world/claim','/encounter/question','/encounter/answer','/encounter/skip','/encounter/close','/study/focus','/study/focus/clear','/talent/learn','/talent/reset','/ally/sync'];if(!allowed.includes(path))fail('找不到此操作。',404);
 if(env.RAIDS&&['/bag/use','/battle/start','/question','/answer','/challenge/start','/challenge/answer','/challenge/next','/evolve'].includes(path)){const member=await currentMembership(env,user);if(member&&['waiting','active','paused'].includes(member.status))fail('你正在共同討伐房間中，請先回到討伐。',409);}
 if(env.PVPS&&['/bag/use','/battle/start','/question','/answer','/challenge/start','/challenge/answer','/challenge/next','/evolve'].includes(path)){const activity=await activeActivity(env,user);if(activity?.mode==='pvp')fail('你正在 PVP 房間中，請先回到對決。',409);}
 if(['/battle/start','/question','/challenge/start','/encounter/question'].includes(path))body.bankId=await pickBankId(db,body.bankId);
 let bank=null;if(body.bankId&&body.bankId!=='math-auto'){const row=await db.prepare('SELECT data FROM banks WHERE id=?').bind(String(body.bankId)).first();if(!row)fail('找不到題庫，請重新選擇。',404);bank=JSON.parse(row.data);}
 // 本週山海魔王：冒險答題時把 50% 傷害同步打到魔王（老師、沒有班級或已結算時略過）。
 if(path==='/answer'){let ctx=null;try{ctx=await worldContext(db,user);}catch{}if(ctx)return json(await mutate(db,user,path,body,bank,{inject:{world:{week:ctx.week,weak:ctx.boss.weak,hpLeft:ctx.hpLeft}},extra:event=>event.world?[hitStatement(db,user,ctx.week,event)]:[]}));}
 if(path==='/world/claim'){const awards=await pendingWorld(db,user);if(!awards.length)fail('目前沒有可領取的山海魔王獎勵。');const result=await mutate(db,user,path,{requestId:body.requestId},bank,{inject:{awards}});await markWorldClaimed(db,user,awards);return json(result);}
 if(path==='/hero/claim'){const awards=await pendingAwards(db,user);if(!awards.length)fail('目前沒有可領取的英雄榜獎勵。');const result=await mutate(db,user,path,{requestId:body.requestId,awards},bank);await markClaimed(db,user,awards);return json(result);}
 return json(await mutate(db,user,path,body,bank));
}
export default {async fetch(req,env){try{return await route(req,env);}catch(error){return json({error:error.status?error.message:'服務暫時無法完成，請稍後再試。'},error.status||500);}}};
