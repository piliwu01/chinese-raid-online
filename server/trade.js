// 卡牌交易 API：同班學生之間交換副本卡。所有交換在一個 D1 batch（交易）內完成，任一方狀態變動就整筆失敗。
import {publicState,taipeiDate} from '../shared/game.js';
import {TRADE,isTradeable,dupesOf,swapCards,publicDupes} from '../shared/trade.js';
import {SPIRIT_BY_ID} from '../shared/catalog.js';

const err=(message,status=400)=>{throw Object.assign(Error(message),{status});};
const nameOf=id=>SPIRIT_BY_ID.get(Number(id))?.zhName||String(id);
const dayStart=now=>{const d=taipeiDate(now);return Date.parse(d+'T00:00:00+08:00');};
async function loadState(db,id){const row=await db.prepare('SELECT data,version FROM progress WHERE user_id=?').bind(id).first();if(!row)err('找不到同學的進度。',404);return {row,state:JSON.parse(row.data)};}
async function doneToday(db,id,now){return (await db.prepare("SELECT count(*) n FROM trades WHERE status='accepted' AND decided_at>=? AND (from_id=? OR to_id=?)").bind(dayStart(now),id,id).first()).n;}
async function expire(db,now){await db.prepare("UPDATE trades SET status='expired',decided_at=? WHERE status='pending' AND created_at<?").bind(now,now-TRADE.expireMs).run();}
const view=(t,me,names)=>({id:t.id,status:t.status,give:{id:t.give_id,zhName:nameOf(t.give_id)},want:{id:t.want_id,zhName:nameOf(t.want_id)},from:{id:t.from_id,name:names[t.from_id]||'同學'},to:{id:t.to_id,name:names[t.to_id]||'同學'},mine:t.from_id===me,createdAt:t.created_at,decidedAt:t.decided_at});

export async function handleTrade(env,user,path,body){
 const db=env.DB,now=Date.now();
 if(user.role!=='student')err('只有學生可以交易。',403);
 if(!user.class_name)err('還沒有班級，不能交易。',403);
 await expire(db,now);
 if(path==='/trade/board'){
  const {results:mates}=await db.prepare("SELECT u.id,u.display_name,p.data FROM users u JOIN progress p ON p.user_id=u.id WHERE u.role='student' AND u.class_name=? AND u.id<>? ORDER BY u.username").bind(user.class_name,user.id).all();
  const names=Object.fromEntries(mates.map(m=>[m.id,m.display_name]));names[user.id]=user.display_name;
  const {results:trades}=await db.prepare("SELECT * FROM trades WHERE (from_id=? OR to_id=?) ORDER BY created_at DESC LIMIT 30").bind(user.id,user.id).all();
  const me=JSON.parse((await db.prepare('SELECT data FROM progress WHERE user_id=?').bind(user.id).first()).data);
  return {classmates:mates.map(m=>{const s=JSON.parse(m.data);return {id:m.id,name:m.display_name,dupes:publicDupes(s),owned:(s.captured||[]).map(p=>p.id)};}),
   myDupes:publicDupes(me),myOwned:(me.captured||[]).map(p=>p.id),trades:trades.map(t=>view(t,user.id,names)),
   todayDone:await doneToday(db,user.id,now),dailyLimit:TRADE.dailyLimit};
 }
 if(path==='/trade/offer'){
  const toId=String(body.toId||''),give=Number(body.give),want=Number(body.want);
  if(!isTradeable(give)||!isTradeable(want))err('只能交換野外神獸的副本卡。');
  if(give===want)err('不能用同一隻神獸交換。');
  const to=await db.prepare("SELECT id,class_name,role FROM users WHERE id=?").bind(toId).first();
  if(!to||to.role!=='student'||to.class_name!==user.class_name||to.id===user.id)err('只能和同班同學交易。',403);
  if(await doneToday(db,user.id,now)>=TRADE.dailyLimit)err(`今天已經完成 ${TRADE.dailyLimit} 次交易，明天再來吧！`,429);
  const pending=(await db.prepare("SELECT count(*) n FROM trades WHERE status='pending' AND from_id=?").bind(user.id).first()).n;
  if(pending>=TRADE.pendingLimit)err(`最多同時提出 ${TRADE.pendingLimit} 個交易邀請，請先等對方回覆或取消。`,429);
  const mine=(await loadState(db,user.id)).state,theirs=(await loadState(db,to.id)).state;
  if(!(dupesOf(mine)[give]>0))err(`你沒有「${nameOf(give)}」的副本卡。`);
  if(!(dupesOf(theirs)[want]>0))err(`對方沒有「${nameOf(want)}」的副本卡。`);
  const dup=await db.prepare("SELECT id FROM trades WHERE status='pending' AND from_id=? AND to_id=? AND give_id=? AND want_id=?").bind(user.id,to.id,give,want).first();
  if(dup)err('已經送出相同的交易邀請了。',409);
  const id=crypto.randomUUID();
  await db.prepare("INSERT INTO trades(id,class_name,from_id,to_id,give_id,want_id,status,created_at) VALUES(?,?,?,?,?,?,'pending',?)").bind(id,user.class_name,user.id,to.id,give,want,now).run();
  return {ok:true,id,message:`已送出邀請：用「${nameOf(give)}」換「${nameOf(want)}」，等待對方回覆（24 小時內有效）。`};
 }
 const t=await db.prepare('SELECT * FROM trades WHERE id=?').bind(String(body.id||'')).first();
 if(!t)err('找不到這筆交易。',404);
 if(t.status!=='pending')err('這筆交易已經結束了。',409);
 if(path==='/trade/cancel'){
  if(t.from_id!==user.id)err('只能取消自己送出的邀請。',403);
  await db.prepare("UPDATE trades SET status='cancelled',decided_at=? WHERE id=? AND status='pending'").bind(now,t.id).run();return {ok:true,message:'已取消交易邀請。'};
 }
 if(path==='/trade/decline'){
  if(t.to_id!==user.id)err('這不是給你的邀請。',403);
  await db.prepare("UPDATE trades SET status='declined',decided_at=? WHERE id=? AND status='pending'").bind(now,t.id).run();return {ok:true,message:'已婉拒交易。'};
 }
 if(path==='/trade/accept'){
  if(t.to_id!==user.id)err('這不是給你的邀請。',403);
  if(await doneToday(db,user.id,now)>=TRADE.dailyLimit)err(`你今天已經完成 ${TRADE.dailyLimit} 次交易，明天再接受吧！`,429);
  if(await doneToday(db,t.from_id,now)>=TRADE.dailyLimit)err('對方今天的交易次數已用完，請明天再試。',429);
  for(let retry=0;retry<4;retry++){
   const A=await loadState(db,t.from_id),B=await loadState(db,t.to_id);
   const result=swapCards(A.state,B.state,t.give_id,t.want_id);
   const g1=crypto.randomUUID(),g2=crypto.randomUUID(),g3=crypto.randomUUID();
   try{
    await db.batch([
     db.prepare('UPDATE progress SET data=?,version=version+1 WHERE user_id=? AND version=?').bind(JSON.stringify(A.state),t.from_id,A.row.version),
     db.prepare('INSERT INTO state_guards(id,ok) VALUES(?,changes())').bind(g1),
     db.prepare('UPDATE progress SET data=?,version=version+1 WHERE user_id=? AND version=?').bind(JSON.stringify(B.state),t.to_id,B.row.version),
     db.prepare('INSERT INTO state_guards(id,ok) VALUES(?,changes())').bind(g2),
     db.prepare("UPDATE trades SET status='accepted',decided_at=? WHERE id=? AND status='pending'").bind(now,t.id),
     db.prepare('INSERT INTO state_guards(id,ok) VALUES(?,changes())').bind(g3),
     db.prepare('DELETE FROM state_guards WHERE id IN (?,?,?)').bind(g1,g2,g3)
    ]);
    const got=result.to==='new'?`「${nameOf(t.give_id)}」已加入你的圖鑑！`:`收到「${nameOf(t.give_id)}」副本卡。`;
    return {ok:true,state:publicState(B.state,now),message:`交易成功！你送出「${nameOf(t.want_id)}」，${got}`};
   }catch(e){
    const again=await db.prepare('SELECT status FROM trades WHERE id=?').bind(t.id).first();if(again?.status!=='pending')err('這筆交易已經結束了。',409);
    if(retry===3)err('同學的資料正在更新，請稍後再試一次。',409);
   }
  }
 }
 err('不支援這個交易操作。',404);
}

// 老師：查看某班交易紀錄。
export async function tradeLog(env,className,limit=200){
 const db=env.DB;
 const {results}=await db.prepare("SELECT t.*,a.display_name fn,b.display_name tn FROM trades t LEFT JOIN users a ON a.id=t.from_id LEFT JOIN users b ON b.id=t.to_id WHERE (?='' OR t.class_name=?) ORDER BY t.created_at DESC LIMIT ?").bind(className,className,limit).all();
 return results.map(t=>({id:t.id,className:t.class_name,from:t.fn||'（已刪除）',to:t.tn||'（已刪除）',give:nameOf(t.give_id),want:nameOf(t.want_id),status:t.status,createdAt:t.created_at,decidedAt:t.decided_at}));
}
