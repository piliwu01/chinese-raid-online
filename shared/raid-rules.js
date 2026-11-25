import {comboMultiplier,CLASS_COMBO,classComboNeed} from './play.js';
import {initSkills,advanceSkills,interruptSkill,wardAbsorb,skillActive,shiftSkills,puppetHit,regenHit,markMult,sealed,BOSS_SKILL} from './raid-skills.js';
import {damageBonus} from './talents.js';
export const DIFF_DAMAGE={easy:8,medium:10,hard:20};
// 魔王第二階段：血量降到一半時變身，反擊間隔由 40 秒縮短為 28 秒，並每 45 秒輪替一種弱點題型（傷害 ×2）。
export const PHASE2={attackEvery:28000,weakEvery:45000,damageMult:1.5};
export function currentWeakness(s,now){
 if(s.phase!==2||!s.weakPool?.length||!s.weakStart)return null;
 const at=s.status==='paused'&&s.pausedAt?s.pausedAt:now,slot=Math.max(0,Math.floor((at-s.weakStart)/PHASE2.weakEvery));
 return {category:s.weakPool[(slot+(s.weakOffset||0))%s.weakPool.length],until:s.weakStart+(slot+1)*PHASE2.weakEvery};
}
// 魔王護盾（全班共用，2026-11-22）：題庫中有 2 種「破盾題型」，全班答對這兩種題型時護盾 -1；
// 護盾歸零即「破盾」：10 秒內全班答題傷害 ×2。時間到護盾回滿，並換一組破盾題型。護盾點數＝參戰人數（4～30）。
// 墨甲護體期間答對只會打墨甲，不扣護盾。沒有題型分類的題庫（自動數學）沒有魔王護盾。
export const RAID_BREAK={window:10000,weakCount:2,min:4,max:30,mult:2};
function pickBreakWeak(pool,prev,random=Math.random){
 const pick=()=>{const a=[...pool];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a.slice(0,Math.min(RAID_BREAK.weakCount,a.length));};
 let w=pick();for(let i=0;i<5&&prev&&pool.length>RAID_BREAK.weakCount&&w.every(c=>prev.includes(c));i++)w=pick();return w;
}
export function initBreak(s,random=Math.random){
 const pool=s.weakPool||[];if(!pool.length){s.bossShield=null;return;}
 const max=Math.max(RAID_BREAK.min,Math.min(RAID_BREAK.max,Object.keys(s.members||{}).length));
 const weak=pickBreakWeak(pool,null,random);s.bossShield={max,left:max,weak,revealed:weak.slice(0,1),until:0,count:0};
}
export const breakActive=(s,now)=>!!(s.bossShield&&s.bossShield.until>now);
// 破盾時間結束：護盾回滿、換破盾題型。回傳是否有變動。
export function settleBreak(s,now,random=Math.random){
 const b=s.bossShield;if(!b||!b.until||b.until>now)return false;
 b.until=0;b.left=b.max;b.weak=pickBreakWeak(s.weakPool||b.weak,b.weak,random);b.revealed=b.weak.slice(0,1);
 addEvent(s,'shield',`魔王護盾恢復了！新的破盾題型：${b.weak.map(c=>b.revealed.includes(c)?c:'？？').join('、')}`,now);return true;
}
export function checkPhase(s,now){
 if(s.phase===2||s.hp<=0||!s.maxHp||s.hp>s.maxHp/2)return;
 s.phase=2;s.attackEvery=PHASE2.attackEvery;s.weakStart=now;s.weakOffset=Math.floor(Math.random()*Math.max(1,s.weakPool?.length||1));
 if(s.nextAttackAt-now>PHASE2.attackEvery)s.nextAttackAt=now+PHASE2.attackEvery;
 const weak=currentWeakness(s,now);
 addEvent(s,'phase',`墨卷魔神暴走了！攻擊力 ×${PHASE2.damageMult}、反擊加快${weak?`，弱點：${weak.category}題（傷害 ×2）`:''}`,now,{weak:weak?.category||''});
}
// 全班連擊：10 秒內全班累積答對達門檻，觸發合體大招（魔王最大血量 12% 的傷害＋暈眩 10 秒）。
export function classComboStatus(s,now){
 const need=classComboNeed(Object.keys(s.members||{}).length),hits=(s.comboHits||[]).filter(t=>now-t<CLASS_COMBO.window);
 return {count:hits.length,need,hits,cooldownUntil:s.comboCooldownUntil||0,window:CLASS_COMBO.window};
}
function stunBoss(s,now){s.stunUntil=Math.max(now,s.stunUntil||0)+BOSS_SKILL.wardStun;s.nextAttackAt+=BOSS_SKILL.wardStun;}
function classUltimate(s,now){
 interruptSkill(s,now,addEvent);
 const damage=Math.min(Math.max(30,Math.round(s.maxHp*CLASS_COMBO.share)),s.hp);s.hp-=damage;
 s.stunUntil=Math.max(now,s.stunUntil||0)+CLASS_COMBO.stun;s.nextAttackAt+=CLASS_COMBO.stun;s.comboHits=[];s.comboCooldownUntil=now+CLASS_COMBO.cooldown;
 addEvent(s,'ultimate',`全班合體技！所有夥伴一起出手，造成 ${damage} 點傷害，魔王暈眩 10 秒`,now,{value:damage});
 checkPhase(s,now);if(s.hp===0)finishRoom(s,'won',now);
}
export const hitDamage=d=>DIFF_DAMAGE[d]??RAID.hit;
export const RAID={duration:600000,shield:100,attackEvery:40000,bossDamage:10,hit:10,strong:30,heal:10,energyEvery:5,maxCharges:2,maxPlayers:60,hpPerPlayer:300};
export const live=status=>['waiting','active','paused'].includes(status);
export function raidError(message,status=400){throw Object.assign(Error(message),{status});}
// Enough replay history for a 60-student burst, skills and item events.
export const RAID_EVENT_BUFFER=256;
export function addEvent(s,type,text,now,extra={}){s.stats=s.stats||{};s.stats[type]=(s.stats[type]||0)+1;s.sequence++;s.events.unshift({sequence:s.sequence,type,text,at:now,...extra});s.events=s.events.slice(0,RAID_EVENT_BUFFER);}
export function newRoom(config,now){return {...config,status:'waiting',createdAt:now,sequence:0,members:{},shield:100,maxShield:100,hp:0,maxHp:0,endsAt:null,nextAttackAt:null,pausedAt:null,events:[],outbox:[],rankings:null,stunUntil:0,drumUntil:0,guardCharges:0,poisons:[],poisonNextAt:null};}
export function rank(s,field){const order=field==='damage'?'damageOrder':'healOrder';return Object.values(s.members).filter(m=>m[field]>0).sort((a,b)=>b[field]-a[field]||a[order]-b[order]||a.joinOrder-b.joinOrder).slice(0,10).map((m,i)=>({id:m.id,name:m.name,partner:m.partner,nickname:m.nickname,value:m[field],rank:i+1}));}
export function finishRoom(s,status,now){
 if(!live(s.status))return;
 // 結束時把剩餘時間定格（暫停中結束就以暫停那一刻計算），結算畫面不再倒數。
 s.leftMs=s.endsAt?Math.max(0,s.endsAt-(s.status==='paused'&&s.pausedAt?s.pausedAt:now)):s.duration;
 if(status==='won')s.finisherId=s.events.find(e=>e.actorId)?.actorId||null; // 最後一擊
 s.status=status;s.finishedAt=now;s.rankings={damage:rank(s,'damage'),heal:rank(s,'heal')};
 addEvent(s,'finish',({won:'魔王被擊敗！全班一起守住了這裡。',lost:'護盾歸零，本次討伐結束。',timeout:'時間到，謝謝每一位夥伴的努力。',cancelled:'老師已提前結束本次討伐。'})[status],now);
 for(const m of Object.values(s.members)){
  const damageRank=s.rankings.damage.find(r=>r.id===m.id)?.rank||null,healRank=s.rankings.heal.find(r=>r.id===m.id)?.rank||null;
  const badges=status==='cancelled'?[]:[...(damageRank?['破陣先鋒']:[]),...(healRank?['守護之星']:[])];
  s.outbox.push({id:`raid_${s.code}_${m.id}_result`,kind:'result',userId:m.id,roomCode:s.code,at:now,summary:{roomCode:s.code,outcome:status,damage:m.damage,heal:m.heal,answered:m.answered,correct:m.correct,damageRank,healRank,badges,food:badges.length*3,at:now}});
 }
}
export function advanceRoom(s,now){
 if(s.status!=='active')return false;let changed=advanceSkills(s,now,addEvent);if(s.shield===0){finishRoom(s,'lost',s.lostAt||now);return true;}if(settleBreak(s,now))changed=true;
 while(true){const poisonTime=s.poisons?.length?s.poisonNextAt:Infinity,time=Math.min(s.nextAttackAt,poisonTime);if(time>now||time>=s.endsAt)break;changed=true;
  if(poisonTime<=s.nextAttackAt){const dose=s.poisons[0],m=s.members[dose.actorId];dose.ticks--;if(dose.ticks===0)s.poisons.shift();s.poisonNextAt=s.poisons.length?time+5000:null;const amount=skillActive(s,'ward')?0:Math.min(10,s.hp);s.hp-=amount;m.damage+=amount;addEvent(s,'poison',`${m.name}的毒霧造成 ${amount} 點傷害`,time,{actorId:m.id,value:amount});m.damageOrder=s.sequence;checkPhase(s,time);if(s.hp===0){finishRoom(s,'won',time);return true;}}
  else {s.nextAttackAt+=s.attackEvery||RAID.attackEvery;const guarded=(s.guardCharges||0)>0;if(guarded)s.guardCharges--;const amount=Math.round(RAID.bossDamage*(s.phase===2?PHASE2.damageMult:1))-(guarded?5:0);s.shield=Math.max(0,s.shield-amount);addEvent(s,'boss',`魔王反擊！全班護盾 −${amount}${guarded?'（守護結晶減傷 5 點）':''}`,time);if(s.shield===0){finishRoom(s,'lost',time);return true;}}
 }
 if(now>=s.endsAt){finishRoom(s,'timeout',s.endsAt);changed=true;}return changed;
}
export function startRoom(s,now){if(s.status!=='waiting')raidError('房間已開始或結束。',409);const n=Object.keys(s.members).length;if(!n)raidError('至少要有 1 位學生加入。');s.status='active';s.maxHp=s.hp=s.customHp||n*RAID.hpPerPlayer;s.endsAt=now+s.duration;s.nextAttackAt=now+RAID.attackEvery;initSkills(s,now);initBreak(s);addEvent(s,'start',`${n} 位冒險者集結，討伐開始！`,now);}
export function pauseRoom(s,now){advanceRoom(s,now);if(s.status!=='active')raidError('目前無法暫停。',409);s.status='paused';s.pausedAt=now;addEvent(s,'pause','老師暫停了討伐，計時與題目一起休息。',now);}
export function resumeRoom(s,now){if(s.status!=='paused')raidError('房間目前沒有暫停。',409);const delay=now-s.pausedAt;s.endsAt+=delay;s.nextAttackAt+=delay;if(s.poisonNextAt)s.poisonNextAt+=delay;for(const field of ['stunUntil','drumUntil','comboCooldownUntil'])if(s[field]>s.pausedAt)s[field]+=delay;if(s.weakStart)s.weakStart+=delay;if(s.bossShield?.until>s.pausedAt)s.bossShield.until+=delay;if(s.comboHits)s.comboHits=s.comboHits.map(t=>t+delay);shiftSkills(s,delay,s.pausedAt);for(const m of Object.values(s.members))if(m.question)m.question.expires+=delay;s.status='active';s.pausedAt=null;addEvent(s,'resume','大家準備好了，繼續討伐！',now);}
export function recordHit(s,m,correct,now,difficulty,category=''){
 m.answered++;const dk=['easy','medium','hard'].includes(difficulty)?difficulty:'medium';m.diff=m.diff||{};m.diff[dk]=m.diff[dk]||[0,0];m.diff[dk][1]++;if(correct)m.diff[dk][0]++;
 if(!correct){m.combo=0;if(skillActive(s,'curse')){const cut=Math.min(BOSS_SKILL.curseShield,s.shield);s.shield-=cut;addEvent(s,'curse',`反噬詛咒！${m.name}答錯，全班護盾 −${cut}`,now,{actorId:m.id,value:cut});if(s.shield===0)finishRoom(s,'lost',now);}return;}m.correct++;m.combo=(m.combo||0)+1;m.bestCombo=Math.max(m.bestCombo||0,m.combo);
 {const bs=s.bossShield;if(bs&&category&&bs.weak.includes(category)&&Array.isArray(bs.revealed)&&!bs.revealed.includes(category)){bs.revealed.push(category);addEvent(s,'reveal',`${m.name}找出魔王的另一個破盾題型：${category}！`,now,{actorId:m.id,category});}}
 const weak=currentWeakness(s,now),isWeak=!!(weak&&category&&weak.category===category);
 const warded=skillActive(s,'ward'),mark=markMult(s,m.id);settleBreak(s,now);const broken=breakActive(s,now);
 const damage=warded?0:Math.min(Math.round(hitDamage(difficulty)*(isWeak?2:1)*(broken?RAID_BREAK.mult*(m.talent?.breakMult||2)/2:1)*comboMultiplier(m.combo)*damageBonus(m.talent,m.combo)*mark)+(s.drumUntil>now?5:0),s.hp);s.hp-=damage;m.damage+=damage;
 if(warded){const left=s.skill.wardLeft-1;addEvent(s,'ward-hit',`${m.name}擊中墨甲！還需答對 ${Math.max(0,left)} 題`,now,{actorId:m.id});wardAbsorb(s,now,1,addEvent,()=>stunBoss(s,now));}
 else {const bs=s.bossShield,shieldHit=!broken&&!!bs&&!!category&&bs.weak.includes(category);if(shieldHit)bs.left=Math.max(0,bs.left-1);
 const tags=`${mark>1?'印記加倍！':''}${broken?'破盾加倍！':''}${isWeak?'弱點命中！':''}${difficulty==='hard'?'難題命中！':''}${m.combo>=3?`${m.combo} 連擊！`:''}`;
 addEvent(s,'hit',`${tags}${m.name}與${m.nickname||m.partner.zhName}造成 ${damage} 點傷害`,now,{actorId:m.id,value:damage,hard:difficulty==='hard',weak:isWeak,combo:m.combo,shieldHit,broken});m.damageOrder=s.sequence;
 if(shieldHit&&bs.left===0&&s.hp>0){bs.until=now+RAID_BREAK.window;bs.count++;m.breaks=(m.breaks||0)+1;addEvent(s,'break',`${m.name}擊破魔王護盾！全班 10 秒內傷害 ×2`,now,{actorId:m.id,until:bs.until});}}
 puppetHit(s,now,1,addEvent,m);regenHit(s,now,addEvent);
 if(m.charges<RAID.maxCharges){m.energy++;if(m.energy===RAID.energyEvery){m.energy=0;m.charges++;}}
 checkPhase(s,now);if(s.hp===0){finishRoom(s,'won',now);return;}
 if(now>=(s.comboCooldownUntil||0)){s.comboHits=[...(s.comboHits||[]).filter(t=>now-t<CLASS_COMBO.window),now];if(s.comboHits.length>=classComboNeed(Object.keys(s.members).length))classUltimate(s,now);}
}
export function useRaidItem(s,m,id,now){
 if(s.status!=='active')raidError('請在進行中的討伐使用道具。',409);
 if(sealed(s))raidError('封印咒發動中，暫時不能使用道具，先專心答題！',409);
 let message;
 if(id==='shield'){const amount=Math.min(10,s.maxShield-s.shield);if(amount<=0)raidError('護盾已滿，不消耗補給包。');s.shield+=amount;m.heal+=amount;addEvent(s,'heal',`${m.name}使用補給包，修復 ${amount} 點護盾`,now,{actorId:m.id,value:amount});m.healOrder=s.sequence;return {message:`已回復 ${amount} 點全班護盾。`};}
 if(id==='fire'&&skillActive(s,'ward')){addEvent(s,'ward-hit',`${m.name}的火焰瓶燒向墨甲！`,now,{actorId:m.id});wardAbsorb(s,now,3,addEvent,()=>stunBoss(s,now));return {message:'火焰瓶削弱了墨甲。'};}
 if(id==='fire'){const amount=Math.min(30,s.hp);s.hp-=amount;m.damage+=amount;addEvent(s,'fire',`${m.name}投出火焰瓶，造成 ${amount} 點傷害`,now,{actorId:m.id,value:amount});puppetHit(s,now,3,addEvent,m);m.damageOrder=s.sequence;checkPhase(s,now);if(s.hp===0)finishRoom(s,'won',now);return {message:`火焰瓶造成 ${amount} 點傷害。`};}
 if(id==='energy'){if(m.charges>=RAID.maxCharges)raidError('技能機會已滿，不消耗能量果實。');m.charges++;message=`${m.name}使用能量果實，技能機會 ＋1`;}
 else if(id==='stun'){s.stunUntil=Math.max(now,s.stunUntil||0)+10000;s.nextAttackAt+=10000;message=`${m.name}投出暈眩彈，魔王多暈眩 10 秒`;}
 else if(id==='poison'){s.poisons||=[];const last=s.poisons.at(-1);if(last?.actorId===m.id)last.ticks+=6;else s.poisons.push({actorId:m.id,ticks:6});if(!s.poisonNextAt)s.poisonNextAt=now+5000;message=`${m.name}施放毒霧，增加 6 次毒傷`;}
 else if(id==='guard'){s.guardCharges=(s.guardCharges||0)+1;message=`${m.name}放置守護結晶，增加 1 波減傷保護`;}
 else if(id==='drum'){s.drumUntil=Math.max(now,s.drumUntil||0)+20000;message=`${m.name}敲響戰鼓，全班答對加傷延長 20 秒`;}
 else raidError('無效的討伐道具。');addEvent(s,id,message,now,{actorId:m.id});return {message};
}
export function useSkill(s,m,kind,now){
 if(s.status!=='active')raidError('討伐未進行中。',409);if(sealed(s))raidError('封印咒發動中，暫時不能使用技能，先專心答題！',409);if(m.charges<1)raidError('技能能量不足。');
 if(kind==='strong'&&skillActive(s,'ward')){m.charges--;addEvent(s,'ward-hit',`${m.name}的強力攻擊重擊墨甲！`,now,{actorId:m.id});wardAbsorb(s,now,3,addEvent,()=>stunBoss(s,now));}
 else if(kind==='strong'){const damage=Math.min(RAID.strong,s.hp);s.hp-=damage;m.damage+=damage;m.charges--;addEvent(s,'strong',`${m.name}發動強力攻擊！造成 ${damage} 點傷害`,now,{actorId:m.id,value:damage});puppetHit(s,now,3,addEvent,m);m.damageOrder=s.sequence;checkPhase(s,now);if(s.hp===0)finishRoom(s,'won',now);}
 else if(kind==='heal'){const healed=Math.min(RAID.heal+(m.talent?.raidHeal||0),s.maxShield-s.shield);if(!healed)raidError('護盾已滿，不消耗技能。');s.shield+=healed;m.heal+=healed;m.charges--;addEvent(s,'heal',`${m.name}修復 ${healed} 點全班護盾`,now,{actorId:m.id,value:healed});m.healOrder=s.sequence;}
 else raidError('技能無效。');
}
