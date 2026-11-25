import {staleGuard} from './guard.js';import {recordAnswer} from '../src/growth.js';import {addInk,bumpQuest,categorize} from '../shared/play.js';import {recordStudy} from '../shared/learning.js';import {noteCorrect,addChest} from '../shared/lucky.js';import {taipeiDate} from '../shared/game.js';import {sha} from './auth.js';
export async function settleRaidAward(db,entry){
 const fingerprint=await sha(JSON.stringify(entry));
 for(let retry=0;retry<6;retry++){
  const done=await db.prepare('SELECT route FROM operations WHERE user_id=? AND request_id=?').bind(entry.userId,entry.id).first();if(done){if(done.route!==fingerprint)throw Error('獎勵識別衝突');return;}
  const row=await db.prepare('SELECT data,version FROM progress WHERE user_id=?').bind(entry.userId).first();if(!row)throw Error('找不到學生進度');const state=JSON.parse(row.data);
  if(entry.kind==='answer'){
   const r=recordAnswer(state.growth,entry.bankId,entry.question,entry.correct);state.growth=r.state;
   const day=taipeiDate(entry.at);recordStudy(state,entry.bankId==='math-auto'?'':categorize(entry.question),entry.correct,entry.at);
   if(r.reward?.complete){state.food++;if(!state.roundDays.includes(day))state.roundDays.push(day);addChest(state,'round');}
   if(entry.correct)noteCorrect(state,day);
   if(entry.correct){bumpQuest(state,'correct10',day);if(entry.mode!=='pvp')bumpQuest(state,'raidCorrect5',day);}
   else addInk(state,entry.bankId,entry.question?.questionId,entry.question?.question,day);
  }else if(entry.kind==='pvpResult'){
   state.pvpHistory=[entry.summary,...(state.pvpHistory||[]).filter(x=>x.roomCode!==entry.summary.roomCode)].slice(0,40);
  }else{
   if(entry.summary.heal>0)bumpQuest(state,'raidHeal1',taipeiDate(entry.at));
   if(entry.summary.outcome!=='cancelled'&&(entry.summary.damageRank===1||entry.summary.healRank===1))addChest(state,'mvp');
   state.food+=entry.summary.food;state.raidHistory=[entry.summary,...(state.raidHistory||[]).filter(x=>x.roomCode!==entry.roomCode)].slice(0,40);
   state.badges=[...new Set([...(state.badges||[]),...entry.summary.badges])];
  }
  try{await db.batch([
   db.prepare('UPDATE progress SET data=?,version=version+1 WHERE user_id=? AND version=?').bind(JSON.stringify(state),entry.userId,row.version),
   staleGuard(db),
   db.prepare('INSERT INTO operations(user_id,request_id,route,result,created_at) VALUES(?,?,?,?,?)').bind(entry.userId,entry.id,fingerprint,'{}',entry.at)
  ]);return;}catch(e){if(retry===5)throw e;}
 }
}
