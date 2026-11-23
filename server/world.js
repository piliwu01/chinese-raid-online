// 本週山海魔王 API：每班每週一隻、全班傷害累積、週日 22:00 後冪等結算、領獎。
import {WORLD,worldWeek,worldWindow,bossFor,worldMaxHp,pickWeak,settleWorld} from '../shared/world-boss.js';
import {weaknessPool} from '../shared/play.js';
const err=(message,status=400)=>{throw Object.assign(Error(message),{status});};
const DEFAULT_BANK='chinese-115-review-v1';

async function studentCount(db,className){return (await db.prepare("SELECT COUNT(*) n FROM users WHERE role='student' AND class_name=?").bind(className).first())?.n||0;}
async function weakPool(db){
 const row=await db.prepare('SELECT data FROM banks WHERE id=?').bind(DEFAULT_BANK).first()||await db.prepare('SELECT data FROM banks ORDER BY created_at DESC LIMIT 1').first();
 return row?weaknessPool(JSON.parse(row.data)):[];
}
// 取得（必要時建立）本週這班的山海魔王。血量以第一次出現時的班級人數計算。
export async function ensureBoss(db,className,week,now=Date.now()){
 let row=await db.prepare('SELECT * FROM world_bosses WHERE week=? AND class_name=?').bind(week,className).first();
 if(row)return row;
 const max=worldMaxHp(await studentCount(db,className)),boss=bossFor(week).id,weak=pickWeak(await weakPool(db),week,className);
 await db.prepare('INSERT OR IGNORE INTO world_bosses(week,class_name,max_hp,boss,weak,created_at) VALUES(?,?,?,?,?,?)').bind(week,className,max,boss,weak,now).run();
 return db.prepare('SELECT * FROM world_bosses WHERE week=? AND class_name=?').bind(week,className).first();
}
export async function totalDamage(db,className,week){return (await db.prepare('SELECT COALESCE(SUM(damage),0) t FROM world_hits WHERE week=? AND class_name=?').bind(week,className).first())?.t||0;}

// 結算這班所有已結束、尚未結算的週次（重複呼叫無副作用）。
export async function settleClass(db,className,now=Date.now()){
 const {results}=await db.prepare('SELECT b.week,b.max_hp FROM world_bosses b LEFT JOIN world_settled s ON s.week=b.week AND s.class_name=b.class_name WHERE b.class_name=? AND s.week IS NULL').bind(className).all();
 for(const b of results){
  if(now<worldWindow(b.week).end)continue;
  const {results:hits}=await db.prepare('SELECT user_id,damage,correct,updated_at FROM world_hits WHERE week=? AND class_name=?').bind(b.week,className).all();
  const r=settleWorld(b.max_hp,hits.map(h=>({userId:h.user_id,damage:h.damage,correct:h.correct,at:h.updated_at})));
  const stmts=r.awards.map(a=>db.prepare('INSERT OR IGNORE INTO world_awards(week,class_name,user_id,won,top,damage,correct,claimed,created_at) VALUES(?,?,?,?,?,?,?,0,?)').bind(b.week,className,a.userId,a.won?1:0,a.top?1:0,a.damage,a.correct,now));
  stmts.push(db.prepare('INSERT OR IGNORE INTO world_settled(week,class_name,won,total,created_at) VALUES(?,?,?,?,?)').bind(b.week,className,r.won?1:0,r.total,now));
  await db.batch(stmts);
 }
}
export async function pendingWorld(db,user,now=Date.now()){
 if(user.role!=='student'||!user.class_name)return [];await settleClass(db,user.class_name,now);
 const {results}=await db.prepare('SELECT week,won,top,damage,correct FROM world_awards WHERE user_id=? AND claimed=0 ORDER BY week').bind(user.id).all();
 return results.map(r=>({week:r.week,won:!!r.won,top:!!r.top,damage:r.damage,correct:r.correct}));
}
export async function markWorldClaimed(db,user,awards){
 if(awards.length)await db.batch(awards.map(a=>db.prepare('UPDATE world_awards SET claimed=1 WHERE user_id=? AND week=?').bind(user.id,a.week)));
}

// 出題／答題前：確認開放中，注入週次、弱點、剩餘血量；答題後的傷害寫入 world_hits（與進度同一批交易）。
export async function worldContext(db,user,now=Date.now()){
 if(user.role!=='student')err('山海魔王由學生出手，老師可以查看進度。',403);if(!user.class_name)err('還沒有班級，請找老師設定。',403);
 const week=worldWeek(now);if(now>=worldWindow(week).end)err('本週山海魔王已在週日 22:00 結算，下週一 00:00 再來挑戰！',409);
 const boss=await ensureBoss(db,user.class_name,week,now),total=await totalDamage(db,user.class_name,week);
 return {week,boss,hpLeft:Math.max(0,boss.max_hp-total)};
}
export function hitStatement(db,user,week,event,now=Date.now()){
 return db.prepare('INSERT INTO world_hits(week,class_name,user_id,damage,correct,answered,updated_at) VALUES(?,?,?,?,?,1,?) ON CONFLICT(week,user_id) DO UPDATE SET damage=damage+excluded.damage,correct=correct+excluded.correct,answered=answered+1,updated_at=excluded.updated_at')
  .bind(week,user.class_name,user.id,event.world?.damage||0,event.correct?1:0,now);
}

// 畫面資料：學生看自己班；老師可指定班級並看到全班貢獻。
export async function worldView(env,user,body={},now=Date.now()){
 const db=env.DB,className=user.role==='teacher'?String(body.className||user.class_name||''):user.class_name;
 if(!className)err(user.role==='teacher'?'請先選擇班級。':'還沒有班級，請找老師設定。',400);
 await settleClass(db,className,now);
 const week=worldWeek(now),win=worldWindow(week),open=now<win.end,boss=await ensureBoss(db,className,week,now),total=await totalDamage(db,className,week);
 const {results:rows}=await db.prepare("SELECT h.user_id,u.display_name name,h.damage,h.correct,h.answered FROM world_hits h JOIN users u ON u.id=h.user_id WHERE h.week=? AND h.class_name=? ORDER BY h.damage DESC,h.updated_at ASC").bind(week,className).all();
 const hitters=rows.filter(r=>r.damage>0),list=[...hitters,...(user.role==='teacher'?rows.filter(r=>r.damage<=0):[])].map((r,i)=>({rank:r.damage>0?i+1:null,id:r.user_id,name:r.name,damage:r.damage,correct:r.correct,answered:r.answered,me:r.user_id===user.id})),mine=rows.find(r=>r.user_id===user.id);
 const meRow=mine?{damage:mine.damage,correct:mine.correct,rank:mine.damage>0?hitters.findIndex(r=>r.user_id===user.id)+1:null}:null,info=WORLD.bosses.find(b=>b.id===boss.boss)||bossFor(week);
 const last=await db.prepare('SELECT s.week,s.won,s.total,b.max_hp,b.boss FROM world_settled s JOIN world_bosses b ON b.week=s.week AND b.class_name=s.class_name WHERE s.class_name=? ORDER BY s.week DESC LIMIT 1').bind(className).first();
 return {className,week,open,startsAt:win.start,endsAt:win.end,serverNow:now,boss:{id:info.id,name:info.name,line:info.line},maxHp:boss.max_hp,damage:Math.min(total,boss.max_hp),hp:Math.max(0,boss.max_hp-total),defeated:total>=boss.max_hp,weak:boss.weak,
  participants:rows.filter(r=>r.correct>0).length,classSize:await studentCount(db,className),me:meRow||{damage:0,correct:0,rank:null},
  top:user.role==='teacher'?list:list.slice(0,5),rules:{rewardMin:WORLD.rewardMin,share:WORLD.share,weakMult:WORLD.weakMult,win:WORLD.win,lose:WORLD.lose,top:WORLD.top,title:WORLD.title},
  lastWeek:last?{week:last.week,won:!!last.won,total:last.total,maxHp:last.max_hp,boss:(WORLD.bosses.find(b=>b.id===last.boss)||{}).name||''}:null};
}
