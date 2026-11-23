export const ENEMY_HP=500;
export const ENRAGE={at:0.5,mult:1.5};
import {claimHero} from './hero.js';
import {claimWorld,damageFor} from './world-boss.js';
import {rollEncounter,resolveEncounterAnswer,encounterDone,publicEncounter} from './encounter.js';
import {pickBankQuestion} from './qpick.js';
import {convertDupe} from './dupes.js';
import {passiveFor,PASSIVE_RATE,PASSIVE_NUM} from './passives.js';
import {noteCorrect,addChest,drawFortune,openChest,pullLantern,publicLucky,LUCKY} from './lucky.js';
import {effectiveness,CRIT_RATE,CRIT} from './typechart.js';
import {taipeiDate} from './game-date.js';
import {recordStudy,notePurified} from './learning.js';
import {chapterById,poolFor,isUnlocked,recordChapterWin,publicChapters,pickEnemy,chapterOf} from './chapters.js';
import {publicSchedule} from './schedule.js';
import {addDupe,publicDupes} from './trade.js';
import {migrateState,spiritRef,BESTIARY_VERSION} from './migrate.js';
import {freshGrowth, chooseStarter, partnerFor, nextEvolution, levelFor, recordAnswer, evolve} from '../src/growth.js';
import {generateMathProblem} from './questions.js';
import {CATALOG} from './catalog.js';
// 尚未選擇夥伴前的預設顯示角色（夔）；主角線不在野外名單中。
const DEFAULT_SELECTED={id:2010,name:'Kui',zhName:'夔',type:'electric',gen:7};
// 固定夥伴進化線一律不會在野外出現，避免捕獲到自己的夥伴。

import {canCapture} from '../src/capture.js';
import {itemById,bagOf} from './items.js';
import {ownedSpirit} from './ownership.js';
import {categorize,comboMultiplier,SHINY_RATE,bumpQuest,questState,publicQuests,QUESTS,addInk,inkReady,publicInk,INK,earnedTitles,setProgress} from './play.js';
import {MAX_XP} from '../src/growth.js';
import {claimCollection,publicCollection} from './collection.js';
import {shuffleQuestion} from './option-shuffle.js';
import {startBreak,ensureBreak,cardFor,checkBoost,bankForCard,resolveBreak,afterCatch,visibleWeak,LATENT,gainLatent,checkAwaken} from './breakboost.js';

export {taipeiDate};
export const freshState = () => ({bestiary:BESTIARY_VERSION,growth:freshGrowth(),nickname:'',food:0,bond:0,days:[],fed:[],roundDays:[],passes:{},claimed:{},items:{},captured:[],selected:DEFAULT_SELECTED,battle:null,pending:null,challenge:null});
export const milestone = s => s.growth.stage===1 ? 100 : 50;
export const itemName = (starter,at) => ({2010:['雷之徽章','雷霆之證'],2007:['草之徽章','盛放之證'],2001:['火之徽章','烈焰之證'],2004:['水之徽章','滄海之證']}[starter]?.[at===50?0:1]);
export const requiredDays = at => at===50?7:14;
export function fail(message,status=400){throw Object.assign(new Error(message),{status});}
export const publicQuestion = q => q ? {id:q.id,question:q.question,options:q.options,optionTexts:q.optionTexts,timeLimit:q.timeLimit,expires:q.expires,difficulty:q.difficulty,category:q.category} : null;
export function publicState(s,now=Date.now()){migrateState(s);const dupes=publicDupes(s);const {pending,challenge,inkNest,inkFight,seenQ,worldQ,encounter,encounterDay,...out}=s;const day=taipeiDate(now);return {...out,battle:out.battle?{...out.battle,weak:visibleWeak(out.battle.weak,out.battle.revealed)}:out.battle,dupes,chapters:publicChapters(s,now),lucky:publicLucky(s,day),schedule:publicSchedule(now,chapterOf),chapter:Number(s.chapter)||1,combo:s.combo||0,quests:publicQuests(s,day),inkNest:publicInk(s,day),inkFight:inkFight?publicQuestion(inkFight):null,titles:[...earnedTitles(s.captured),...(s.extraTitles||[])],worldQuestion:worldQ?publicQuestion(worldQ):null,encounter:publicEncounter(encounter,publicQuestion),...publicCollection(s),title:s.title||'',selected:s.growth.starter?(ownedSpirit(s,s.selected?.id)||partnerFor(s.growth)):s.selected,bag:bagOf(s),challenge:challenge?{at:challenge.at,index:challenge.index,total:challenge.questions.length,correct:challenge.correct,done:challenge.done,passed:challenge.passed,question:publicQuestion(challenge.questions[challenge.index])}:null};}
function needPartner(s){if(!s.growth.starter)fail('請先選擇專屬夥伴。');}
function questionFor(bank,diff,now,st=null){
 let q;
 if(bank){const pool=bank.questions.filter(x=>x.status==='active');if(!pool.length)fail('這份題庫沒有可使用的題目。'); const x=pickBankQuestion(st,bank,diff); q=shuffleQuestion({question:x.stem,answer:x.answer,options:['A','B','C','D'],optionTexts:x.options,explanation:x.explanation,sourceRef:x.sourceRef,questionId:x.id,category:categorize(x)});}
 else q=generateMathProblem(diff);
 return {...q,id:crypto.randomUUID(),bankId:bank?.bankId||'math-auto',timeLimit:bank?.timeLimitSeconds||({easy:10,medium:12,hard:15}[diff]||18),expires:now+(bank?.timeLimitSeconds||({easy:10,medium:12,hard:15}[diff]||18))*1000};
}
function resolve(q,choice,now){if(choice!==null&&!q.options.includes(choice))fail('答案不在選項中。');return {correct:choice!==null&&now<=q.expires&&choice===q.answer,question:q.question,answer:q.answer,answerText:q.optionTexts?.[q.answer]??String(q.answer),explanation:q.explanation||'仔細檢查運算步驟，再試一次。',sourceRef:q.sourceRef||'',bankId:q.bankId,sourceId:q.questionId,order:q.shuffled||null,timedOut:now>q.expires||choice===null};}
export function applyAction(s,route,b,now,bank=null){
 migrateState(s);
 const today=taipeiDate(now); let event={};
 if(route==='/starter'){
  if(s.growth.starter)fail('已選定專屬夥伴，不能重選。');
  s.growth=chooseStarter(s.growth,Number(b.id));needPartner(s);s.selected=partnerFor(s.growth);s.captured=[s.selected];
 }else if(route==='/nickname'){
  needPartner(s);const value=String(b.nickname||'').trim();if(!value||Array.from(value).length>12||/[\x00-\x1f]/.test(value))fail('暱稱請填寫 1～12 個字。');s.nickname=value;
 }else if(route==='/shop/buy'){
  needPartner(s);const item=itemById(b.itemId);if(!item)fail('找不到這個道具。');if(s.food<item.price+1)fail(`需要 ${item.price} 份食物，並保留 1 份給夥伴餵食。`);const bag=bagOf(s);if(!Number.isSafeInteger(bag[item.id]+1))fail('背包數量已超出可保存範圍。');s.food-=item.price;bag[item.id]++;s.bag=bag;event.message=`已購買 1 個${item.name}，放入背包。`;
 }else if(route==='/bag/use'){
  needPartner(s);if(b.itemId!=='potion')fail('請到共同討伐背包使用這個道具。');const bag=bagOf(s);if(!bag.potion)fail('背包沒有傷藥。');if(s.battle?.status!=='ready'||s.battle.playerHp<=0)fail('請在進行中的個人對戰使用傷藥。');const amount=Math.min(30,s.battle.playerMaxHp-s.battle.playerHp);if(amount<=0)fail('目前已滿血，不消耗傷藥。');s.battle.playerHp+=amount;bag.potion--;s.bag=bag;event.message=`已使用傷藥，回復 ${amount} HP。`;
 }else if(route==='/feed'){
  needPartner(s);if(s.food<1)fail('先完成一輪 10 題，取得食物。');if(!s.roundDays.includes(today))fail('今天先完成一輪 10 題，再餵食夥伴。');if(s.fed.includes(today))fail('今天已完成陪伴，明天再來吧！');
  s.food--;s.bond++;s.fed.push(today);s.days.push(today);event.message='今天的陪伴已保存！親密度 ＋1。';
 }else if(route==='/battle/start'){
  needPartner(s);if(s.challenge&&!s.challenge.done)fail('先完成或離開進化挑戰。');
  const selected=b.playerId===undefined?partnerFor(s.growth):ownedSpirit(s,b.playerId);if(!selected)fail('尚未成功收服這個角色，不能選擇出戰。',403);s.selected=selected;
  const chapter=b.chapter===undefined?(isUnlocked(s,s.chapter)?Number(s.chapter):1):Number(b.chapter);if(!chapterById(chapter))fail('沒有這個篇章。');if(!isUnlocked(s,chapter))fail('這個篇章還沒解鎖，先在前一章打倒或收服 3 隻神獸。',403);s.chapter=chapter;
  const picked=spiritRef(pickEnemy(chapter,now,selected.id)),enemy=Math.random()<SHINY_RATE?{...picked,shiny:true}:{...picked};const level=23+Math.floor(Math.random()*5);
  const playerHp=b.heal||!s.battle||s.battle.status==='lost'?185:s.battle.playerHp;
  const bgs=chapterById(chapter).bgs;s.battle={id:crypto.randomUUID(),enemy,level,maxHp:ENEMY_HP,hp:ENEMY_HP,playerMaxHp:185,playerHp,status:'ready',chapter,scene:bgs[Math.floor(Math.random()*bgs.length)]};startBreak(s.battle,bank);s.pending=null;
  const enc=rollEncounter(s,today);if(enc)event.encounter=enc.kind;
 }else if(route==='/question'){
  needPartner(s);if(!ownedSpirit(s,s.selected?.id))fail('這個角色尚未收服，請重新選擇自己的夥伴。',403);if(!s.battle||s.battle.status!=='ready')fail('請重新開始一場對戰。');
  const move=String(b.move);if(!['quick','special','critical','catch'].includes(move))fail('招式無效。');
  if(s.pending&&s.pending.expires>=now){event.question=publicQuestion(s.pending);return event;}
  if(move==='catch'&&!canCapture(s.battle.hp,s.battle.maxHp))fail('對手 HP 須剩 15% 以下且尚未倒下才能收服。');
  ensureBreak(s.battle,bank);const awaken=checkAwaken(s.battle,!!b.awaken,move),boost=move==='catch'||awaken?0:checkBoost(s.battle,b.boost),card=move==='catch'?null:cardFor(s.battle,move);if(awaken)s.battle.latent=0;
  s.pending={...questionFor(bankForCard(bank,card),move==='quick'||move==='catch'?'easy':move==='critical'?'hard':'medium',now,s),move,boost,awaken,cardCategory:card?.category||null,battleId:s.battle.id};event.question=publicQuestion(s.pending);
 }else if(route==='/answer'){
  if(!ownedSpirit(s,s.selected?.id))fail('這個角色尚未收服，請重新選擇自己的夥伴。',403);const q=s.pending;if(!q||q.id!==b.questionId||q.battleId!==s.battle?.id)fail('這題已結束，請重新取得題目。',409);
  event=resolve(q,b.choice,now);recordStudy(s,q.bankId==='math-auto'?'':q.category,event.correct,now);const result=recordAnswer(s.growth,q.bankId,q,event.correct);s.growth=result.state;event.reward=result.reward;
  if(result.reward.complete){s.food++;if(!s.roundDays.includes(today))s.roundDays.push(today);if(addChest(s,'round'))event.chest='完成一輪 10 題';}
  if(event.correct&&noteCorrect(s,today))event.jade=true;
  const battle=s.battle;ensureBreak(battle,null);const brk=q.move==='catch'?afterCatch(battle):resolveBreak(battle,{correct:event.correct,boost:q.boost||0,category:q.category||null});event.break=brk;let damage=0,caught=false;const hpBefore=battle.hp;const passive=passiveFor(s.selected?.id);const burnBefore=battle.burn||0;const roll=()=>Math.random()<PASSIVE_RATE;
  if(event.correct){bumpQuest(s,'correct10',today);if(q.move==='catch'){caught=canCapture(battle.hp,battle.maxHp)&&Math.random()<0.92;}else{s.combo=(s.combo||0)+1;const mult=comboMultiplier(s.combo),eff=effectiveness(s.selected?.type,battle.enemy?.type),crit=Math.random()<CRIT_RATE;damage=Math.round((({quick:22,special:45,critical:75}[q.move])+Math.floor(Math.random()*({quick:10,special:18,critical:22}[q.move])))*mult*eff.mult*(crit?CRIT:1)*(brk.mult||1)*(q.awaken?LATENT.mult:1));event.effect=eff.kind;event.crit=crit;battle.hp=Math.max(0,battle.hp-damage);if(s.combo>=5)bumpQuest(s,'combo5',today);
   if(passive?.id==='kui'&&battle.hp>0&&roll()){const extra=Math.min(battle.hp,Math.round(damage*PASSIVE_NUM.kuiExtra[passive.stage]));battle.hp-=extra;damage+=extra;event.passive={...passive,value:extra,text:`追加雷擊 ${extra} 點傷害`};}
   else if(passive?.id==='bifang'&&battle.hp>0&&roll()){battle.burn=PASSIVE_NUM.burnTurns;battle.burnDamage=PASSIVE_NUM.burnDamage[passive.stage];event.passive={...passive,value:battle.burnDamage,text:`${battle.enemy.zhName||'對手'}陷入灼燒，接下來 3 回合每回合扣 ${battle.burnDamage} HP`};}}
  if(passive?.id==='dangkang'&&battle.playerHp<battle.playerMaxHp&&roll()){const healed=Math.min(PASSIVE_NUM.heal[passive.stage],battle.playerMaxHp-battle.playerHp);battle.playerHp+=healed;event.passive={...passive,value:healed,text:`回復 ${healed} HP`};}
  else if(passive?.id==='xuangui'&&(battle.shell||0)<PASSIVE_NUM.shell[passive.stage]&&roll()){battle.shell=PASSIVE_NUM.shell[passive.stage];event.passive={...passive,value:battle.shell,text:`張開玄甲，可擋下之後 ${battle.shell} 次反擊`};}}
  else{s.combo=0;addInk(s,q.bankId,q.questionId,q.question,today);}
  event.combo=s.combo||0;event.multiplier=comboMultiplier(event.combo);
  if(burnBefore>0&&!caught&&battle.hp>0){const t=Math.min(battle.burnDamage||PASSIVE_NUM.burnDamage[0],battle.hp);battle.hp-=t;battle.burn=burnBefore-1;event.burn={damage:t,left:battle.burn};}
  if(caught){battle.status='caught';{const u=recordChapterWin(s,battle.chapter);if(u)event.unlocked={id:u.id,name:u.name,place:u.place};}bumpQuest(s,'capture1',today);const had=s.captured.find(p=>p.id===battle.enemy.id);if(!had)s.captured.push(battle.enemy);else{if(battle.enemy.shiny&&!had.shiny)had.shiny=true;event.dupe=addDupe(s,battle.enemy.id);}}
  else if(battle.hp===0){battle.status='won';bumpQuest(s,'win3',today);{const u=recordChapterWin(s,battle.chapter);if(u)event.unlocked={id:u.id,name:u.name,place:u.place};}}
  const enraged=battle.hp>0&&battle.hp<=battle.maxHp*ENRAGE.at;if(enraged){event.enraged=true;if(hpBefore>battle.maxHp*ENRAGE.at)event.enrageStart=true;}
  let enemyDamage=battle.status==='ready'&&!event.correct&&!brk.noCounter&&!q.awaken?Math.round((18+Math.floor(Math.random()*16))*(enraged?ENRAGE.mult:1)):0;
  if(enemyDamage>0&&battle.shell>0){battle.shell--;event.blocked={value:enemyDamage,left:battle.shell};enemyDamage=0;}
  battle.playerHp=Math.max(0,battle.playerHp-enemyDamage);if(battle.playerHp===0)battle.status='lost';
  if(q.move!=='catch'||enemyDamage>0){const g=(enemyDamage>0?gainLatent(battle,LATENT.hurt):0)+(brk.breakNow?gainLatent(battle,LATENT.break):0);event.latent={value:battle.latent||0,gained:g,full:(battle.latent||0)>=LATENT.max};}
  if(q.awaken)event.awaken=true;
  event.combat={damage,enemyDamage,caught,...battle,passive:event.passive||null,burn:event.burn||null,blocked:event.blocked||null};s.pending=null;
 }else if(route==='/challenge/start'){
  needPartner(s);const at=milestone(s);if(!nextEvolution(s.growth))fail('這位夥伴已完成所有進化。');if(s.days.length<requiredDays(at))fail(`需先累積 ${requiredDays(at)} 天有效陪伴。`);
  if(s.claimed[at])fail('這階段的道具已領取。');
  const total=at===50?10:15;let questions=[];
  if(bank){const active=bank.questions.filter(q=>q.status==='active');if(active.length<total)fail(`題庫至少需要 ${total} 道可用題目，目前只有 ${active.length} 題。`);const pool=[...active];for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}questions=pool.slice(0,total).map(x=>questionFor({...bank,questions:[x]},x.difficulty||'medium',now));}
  else{const seen=new Set();while(questions.length<total){const q=questionFor(null,at===50?'medium':'hard',now);if(!seen.has(q.question)){seen.add(q.question);questions.push(q);}}}
  s.challenge={at,bankId:bank?.bankId||'math-auto',questions,index:0,correct:0,done:false,passed:false};s.pending=null;s.battle=null;
 }else if(route==='/challenge/leave'){
  s.challenge=null;
 }else if(route==='/challenge/answer'){
  const c=s.challenge;if(!c||c.done)fail('請先開始進化挑戰。');const q=c.questions[c.index];if(q.id!==b.questionId)fail('這題已結束，請作答下一題。',409);
  event=resolve(q,b.choice,now);c.correct+=Number(event.correct);c.index++;c.done=c.index===c.questions.length;
  if(c.done){c.passed=c.correct>=(c.at===50?8:12);if(c.passed)s.passes[c.at]=true;}else c.questions[c.index].expires=0;
 }else if(route==='/challenge/next'){
  const c=s.challenge;if(!c||c.done)fail('挑戰已結束。');const q=c.questions[c.index];if(q.expires===0)q.expires=now+q.timeLimit*1000;
 }else if(route==='/claim'){
  needPartner(s);const at=milestone(s);if(s.claimed[at])fail('道具已領取，請到背包查看。');if(!s.passes[at]||s.days.length<requiredDays(at))fail('請先完成陪伴任務與專屬挑戰。');s.items[at]=1;s.claimed[at]=true;event.message=`已獲得${itemName(s.growth.starter,at)}！`;
 }else if(route==='/evolve'){
  needPartner(s);const at=milestone(s);if(!nextEvolution(s.growth)||levelFor(s.growth.xp)<at||s.items[at]!==1)fail('等級或進化道具尚未達標。');s.items[at]=0;const prev=partnerFor(s.growth);s.growth=evolve(s.growth);const partner=partnerFor(s.growth);if(s.selected.id===prev.id)s.selected=partner;if(!s.captured.some(p=>p.id===partner.id))s.captured.push(partner);s.challenge=null;event.message=`${s.nickname||prev.zhName}進化成${partner.zhName}！`;
 }else if(route==='/ink/start'){
  needPartner(s);const m=(s.inkNest||[]).find(x=>x.id===String(b.inkId));if(!m)fail('這隻墨漬怪已經不在巢穴裡了。',404);if(!inkReady(m,today))fail('墨漬怪還在沉睡，明天再來淨化牠吧！');
  if(!bank||bank.bankId!==m.bankId)fail('請用這隻墨漬怪原本的題庫挑戰。');const x=bank.questions.find(q=>q.id===m.questionId&&q.status==='active');
  if(!x){s.inkNest=s.inkNest.filter(i=>i.id!==m.id);fail('這題已從題庫移除，墨漬怪自動消散了。',410);}
  s.inkFight={...questionFor({...bank,questions:[x]},x.difficulty||'medium',now),inkId:m.id};event.question=publicQuestion(s.inkFight);
 }else if(route==='/ink/answer'){
  const q=s.inkFight;if(!q||q.id!==b.questionId)fail('這題已結束，請重新挑戰。',409);event=resolve(q,b.choice,now);s.inkFight=null;recordStudy(s,q.category,event.correct,now);
  const m=(s.inkNest||[]).find(x=>x.id===q.inkId);
  if(event.correct){s.inkNest=(s.inkNest||[]).filter(x=>x.id!==q.inkId);s.food+=INK.food;s.growth={...s.growth,xp:Math.min(MAX_XP,s.growth.xp+INK.xp)};bumpQuest(s,'ink1',today);notePurified(s,now);if((s.study?.purified||0)%LUCKY.inkPerChest===0&&addChest(s,'ink'))event.chest=`淨化 ${LUCKY.inkPerChest} 隻墨漬怪`;if(noteCorrect(s,today))event.jade=true;event.message=`淨化成功！獲得 ${INK.food} 份食物、${INK.xp} XP。`+(event.chest?`另外獲得答題寶箱（${event.chest}）！`:'')+(event.jade?'還得到 1 枚玉符！':'');}
  else{if(m)m.day=today;event.message='墨漬怪還沒被淨化，看完解析，明天再挑戰一次！';}
 }else if(route==='/quest/claim'){
  needPartner(s);const qs=questState(s,today),id=String(b.questId),def=QUESTS[id];if(!def||!qs.ids.includes(id))fail('今天沒有這個任務。',404);if(qs.claimed[id])fail('這個任務的獎勵已領取。');if((qs.progress[id]||0)<def.need)fail('任務還沒完成喔！');
  qs.claimed[id]=true;s.food+=def.food;const bag=bagOf(s);bag[def.item]++;s.bag=bag;event.message=`任務完成！獲得 ${def.food} 份食物和 1 個${itemById(def.item).name}。`;
 }else if(route==='/fortune/draw'){
  event=drawFortune(s,today,b.userKey||'');
 }else if(route==='/chest/open'){
  event=openChest(s);
 }else if(route==='/lantern/pull'){
  event=pullLantern(s,now);
 }else if(route==='/dupe/convert'){
  const r=convertDupe(s,b.id,b.to);event.convert=r;event.message=`${r.zhName} 副本卡已轉化為 ${r.label} ×${r.amount}${r.rare?'（稀有加倍）':''}。`;
 }else if(route==='/world/question'){
  // 山海魔王：week、weak 由伺服器注入（不信任前端）。
  needPartner(s);const diff=['easy','medium','hard'].includes(b.difficulty)?b.difficulty:'medium';
  if(s.worldQ&&s.worldQ.expires>=now&&s.worldQ.week===b.week){event.question=publicQuestion(s.worldQ);return event;}
  s.worldQ={...questionFor(bank,diff,now,s),difficulty:diff,week:String(b.week||''),weak:b.weak||null};event.question=publicQuestion(s.worldQ);
 }else if(route==='/world/answer'){
  const q=s.worldQ;if(!q||q.id!==b.questionId)fail('這題已結束，請重新出題。',409);if(q.week!==b.week)fail('這週的山海魔王已結算，請重新整理。',409);
  event=resolve(q,b.choice,now);recordStudy(s,q.bankId==='math-auto'?'':q.category,event.correct,now);const result=recordAnswer(s.growth,q.bankId,q,event.correct);s.growth=result.state;event.reward=result.reward;
  if(result.reward.complete){s.food++;if(!s.roundDays.includes(today))s.roundDays.push(today);if(addChest(s,'round'))event.chest='完成一輪 10 題';}
  if(event.correct){if(noteCorrect(s,today))event.jade=true;bumpQuest(s,'correct10',today);}else addInk(s,q.bankId,q.questionId,q.question,today);
  const left=Math.max(0,Number(b.hpLeft)||0),raw=event.correct?damageFor(q.difficulty,q.category,q.weak):0;
  event.world={damage:Math.min(raw,left),raw,weak:!!(event.correct&&q.weak&&q.category===q.weak),week:q.week};s.worldQ=null;
 }else if(route==='/world/claim'){
  const got=claimWorld(s,b.awards);if(!got.length)fail('目前沒有可領取的山海魔王獎勵。');event.awards=got;
  event.message=got.map(r=>r.won?`山海魔王打倒了！寶箱 ${r.chest}、玉符 ${r.jade}、食物 ${r.food}${r.title?`，獲得稱號「${r.title}」`:''}`:`山海魔王參加獎：食物 ${r.food}`).join('；');
 }else if(route==='/encounter/question'){
  const e=s.encounter;if(!e||e.done||!['shell','page'].includes(e.kind))fail('目前沒有需要答題的奇遇。',409);
  if(!(e.q&&e.q.expires>=now))e.q={...questionFor(bank,'medium',now,s),difficulty:'medium'};event.question=publicQuestion(e.q);
 }else if(route==='/encounter/answer'){
  const e=s.encounter,q=e?.q;if(!e||e.done||!q||q.id!==b.questionId)fail('這題已結束，請重新開始奇遇。',409);
  event=resolve(q,b.choice,now);recordStudy(s,q.bankId==='math-auto'?'':q.category,event.correct,now);const result=recordAnswer(s.growth,q.bankId,q,event.correct);s.growth=result.state;event.reward=result.reward;
  if(event.correct){if(noteCorrect(s,today))event.jade=true;bumpQuest(s,'correct10',today);}else addInk(s,q.bankId,q.questionId,q.question,today);
  event.encounter=resolveEncounterAnswer(s,event.correct,result.reward?.gained||0);
 }else if(route==='/encounter/skip'){
  const e=s.encounter;if(!e||e.done)fail('目前沒有奇遇。',409);event.encounter=encounterDone(s,{kind:e.kind,skipped:true,text:'略過奇遇，繼續冒險。'});
 }else if(route==='/encounter/close'){
  if(s.encounter&&!s.encounter.done)fail('奇遇還沒結束。',409);s.encounter=null;event.message='繼續冒險！';
 }else if(route==='/hero/claim'){
  const got=claimHero(s,b.awards);if(!got.length)fail('目前沒有可領取的英雄榜獎勵。');event.awards=got;event.jade=got.reduce((a,b)=>a+b.jade,0);event.message=`英雄榜獎勵入帳：玉符 ${event.jade} 枚！`;
 }else if(route==='/collection/claim'){
  needPartner(s);event={...event,...claimCollection(s,b.id)};
 }else if(route==='/title'){
  const value=String(b.title||'');if(value&&![...earnedTitles(s.captured),...(s.extraTitles||[])].includes(value))fail('還沒有取得這個稱號。',403);s.title=value;event.message=value?`已配戴稱號「${value}」。`:'已取消配戴稱號。';
 }else if(route==='/bank/change'){
  s.challenge=null;s.pending=null;
 }else fail('找不到此操作。',404);
 return event;
}
