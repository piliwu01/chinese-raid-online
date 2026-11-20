// 英雄榜 API：同班排名、每週結算（冪等）、查詢待領獎勵。
import {HERO,BOARDS,weekStart,previousWeek,weekStats,totalStats,rankBoard,rewardFor} from '../shared/hero.js';
const err=(message,status=400)=>{throw Object.assign(Error(message),{status});};
async function classRows(db,className){
 const {results}=await db.prepare("SELECT u.id,u.display_name name,p.data FROM users u JOIN progress p ON p.user_id=u.id WHERE u.role='student' AND u.class_name=?").bind(className).all();
 return results.map(r=>({id:r.id,name:r.name,state:JSON.parse(r.data)}));
}
const boardsFor=(rows,monday)=>{
 const week=rows.map(r=>({id:r.id,name:r.name,stats:weekStats(r.state,monday)})),total=rows.map(r=>({id:r.id,name:r.name,stats:totalStats(r.state)}));
 return {weekCorrect:rankBoard(week,'correct'),weekAccuracy:rankBoard(week,'accuracy',HERO.weeklyMin),totalCorrect:rankBoard(total,'correct'),totalAccuracy:rankBoard(total,'accuracy',HERO.totalMin)};
};
// 結算上週（同一週同一班只會成功一次；重複呼叫無副作用）
export async function settle(db,className,now=Date.now(),rows=null){
 const week=previousWeek(now);if(!className||week<HERO.launchWeek)return;
 if(await db.prepare('SELECT 1 FROM hero_settled WHERE week=? AND class_name=?').bind(week,className).first())return;
 rows||=await classRows(db,className);const b=boardsFor(rows,week),stmts=[];
 for(const board of ['weekCorrect','weekAccuracy'])for(const r of b[board].filter(x=>x.rank<=HERO.top)){const jade=rewardFor(r.rank);if(!jade)continue;
  stmts.push(db.prepare('INSERT OR IGNORE INTO hero_awards(week,class_name,board,rank,user_id,value,jade,claimed,created_at) VALUES(?,?,?,?,?,?,?,0,?)').bind(week,className,board,r.rank,r.id,board==='weekCorrect'?r.stats.correct:r.accuracy,jade,now));}
 stmts.push(db.prepare('INSERT OR IGNORE INTO hero_settled(week,class_name,created_at) VALUES(?,?,?)').bind(week,className,now));
 await db.batch(stmts);
}
export async function pendingAwards(db,user,now=Date.now()){
 if(user.role!=='student'||!user.class_name)return [];await settle(db,user.class_name,now);
 const {results}=await db.prepare('SELECT week,board,rank,jade FROM hero_awards WHERE user_id=? AND claimed=0 ORDER BY week,board').bind(user.id).all();
 return results.map(r=>({key:`${r.week}:${r.board}`,week:r.week,board:r.board,boardName:BOARDS[r.board],rank:r.rank,jade:r.jade}));
}
export async function markClaimed(db,user,awards){
 if(!awards.length)return;await db.batch(awards.map(a=>{const [week,board]=a.key.split(':');return db.prepare('UPDATE hero_awards SET claimed=1 WHERE user_id=? AND week=? AND board=?').bind(user.id,week,board);}));
}
const view=(list,me)=>({top:list.filter(r=>r.rank<=HERO.top).map(r=>({rank:r.rank,name:r.name,correct:r.stats.correct,answered:r.stats.answered,accuracy:r.accuracy,me:r.id===me})),
 me:(()=>{const r=list.find(x=>x.id===me);return r?{rank:r.rank,correct:r.stats.correct,answered:r.stats.answered,accuracy:r.accuracy}:null;})(),count:list.length});
export async function handleHero(env,user,path){
 const db=env.DB,now=Date.now();
 if(user.role!=='student')err('英雄榜只開放學生查看。',403);if(!user.class_name)err('還沒有班級，無法排名。',403);
 if(path==='/hero/pending')return {awards:await pendingAwards(db,user,now)};
 if(path==='/hero/board'){
  const rows=await classRows(db,user.class_name);await settle(db,user.class_name,now,rows);
  const monday=weekStart(now),b=boardsFor(rows,monday),me=rows.find(r=>r.id===user.id);
  const {results:last}=await db.prepare('SELECT a.board,a.rank,a.jade,a.value,u.display_name name FROM hero_awards a JOIN users u ON u.id=a.user_id WHERE a.class_name=? AND a.week=? ORDER BY a.board,a.rank').bind(user.class_name,previousWeek(now)).all();
  return {className:user.class_name,week:monday,boards:Object.fromEntries(Object.keys(BOARDS).map(k=>[k,{title:BOARDS[k],...view(b[k],user.id)}])),
   rules:{weeklyMin:HERO.weeklyMin,totalMin:HERO.totalMin,rewards:HERO.rewards},lastWeek:{week:previousWeek(now),winners:last},myWeek:me?weekStats(me.state,monday):null};
 }
 err('找不到這個功能。',404);
}
