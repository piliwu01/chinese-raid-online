// 破盾與蓄力（個人對戰）：純函式，由伺服器的 applyAction 呼叫。
// - 招式卡：每回合發 3 張（快攻＝簡單、強攻＝中等、必殺＝困難），每張標出題型；至少 1 張是弱點題型。
// - 護盾：敵人有 2 種弱點題型、4 點護盾。答對弱點題型護盾 -1；歸零即「破盾」：
//   下一題傷害 ×2，且這題答錯也不會被反擊；這題結束後護盾回滿。
// - 靈氣：開場 1 點，每答對 +1（最多 5）。出招前可投入 0～3 點，傷害 ×1.5／×2／×2.5；不論對錯都會用掉。
import {categorize,weaknessPool} from './play.js';

export const BREAK={shield:4,weakCount:2,minPool:10,orbsStart:1,orbsMax:5,boostMax:3,boostMult:[1,1.5,2,2.5],breakMult:2};
export const CARD_MOVES=[{move:'quick',diff:'easy'},{move:'special',diff:'medium'},{move:'critical',diff:'hard'}];
export const boostMultiplier=n=>BREAK.boostMult[n]||1;

const shuffle=(list,random)=>{const a=[...list];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
// 可當弱點、可出現在招式卡上的題型：題庫中至少 10 題的題型（題太少的題型會一直重複出題）。
export const cardCategories=bank=>bank?weaknessPool(bank,BREAK.minPool):[];

// cats：可出現的題型清單（開戰時存在 battle.cats，之後換牌不需要再讀題庫）。
export function dealCards(cats,weak,random=Math.random){
 cats=cats||[];
 if(!cats.length)return CARD_MOVES.map(m=>({...m,category:null}));
 let picked=shuffle(cats,random);while(picked.length<CARD_MOVES.length)picked=picked.concat(shuffle(cats,random));
 picked=picked.slice(0,CARD_MOVES.length);
 const weakIn=(weak||[]).filter(c=>cats.includes(c));
 if(weakIn.length&&!picked.some(c=>weakIn.includes(c)))picked[Math.floor(random()*picked.length)]=weakIn[Math.floor(random()*weakIn.length)];
 return CARD_MOVES.map((m,i)=>({...m,category:picked[i]}));
}

// 開戰時：決定弱點、護盾、靈氣與第一手招式卡。沒有題庫（數學練習）時沒有弱點與護盾，只保留靈氣。
export function startBreak(battle,bank,random=Math.random){
 const cats=cardCategories(bank);
 battle.cats=cats;battle.weak=shuffle(cats,random).slice(0,Math.min(BREAK.weakCount,cats.length));
 battle.revealed=battle.weak.slice(0,1); // 先翻開 1 個弱點，另 1 個要答對才翻開
 battle.maxShield=battle.weak.length?BREAK.shield:0;battle.shield=battle.maxShield;battle.broken=false;
 battle.orbs=BREAK.orbsStart;battle.latent=0;battle.cards=dealCards(cats,battle.weak,random);
 return battle;
}
// 舊進度（功能上線前開始的對戰）缺少欄位時補齊。
export function ensureBreak(battle,bank,random=Math.random){if(!Array.isArray(battle.cards)||!Array.isArray(battle.weak)||!Array.isArray(battle.cats))startBreak(battle,bank,random);return battle;}

export function cardFor(battle,move){return (battle.cards||[]).find(c=>c.move===move)||null;}
export function checkBoost(battle,boost){
 const n=Number(boost||0);
 if(!Number.isInteger(n)||n<0||n>BREAK.boostMax)throw Object.assign(new Error('靈氣投入只能是 0～3 點。'),{status:400});
 if(n>(battle.orbs||0))throw Object.assign(new Error(`靈氣不夠，目前只有 ${battle.orbs||0} 點。`),{status:400});
 return n;
}
// 依招式卡的題型篩選題庫（篩不到題目就用整份題庫）。
export function bankForCard(bank,card){
 if(!bank||!card?.category)return bank;
 const questions=bank.questions.filter(x=>x.status==='active'&&categorize(x)===card.category);
 return questions.length?{...bank,questions}:bank;
}

// 答題結算（攻擊招式）：回傳傷害倍率與破盾事件，並更新護盾、靈氣、招式卡。
// 呼叫時機：伺服器算出基礎傷害之前；correct＝是否答對；category＝這題的題型。
export function resolveBreak(battle,{correct,boost=0,category=null,random=Math.random}){
 const wasBroken=!!battle.broken;let mult=1,shieldHit=false,breakNow=false;
 battle.orbs=Math.max(0,(battle.orbs||0)-boost);
 let revealNow=null;
 if(correct&&category&&battle.weak?.includes(category)&&Array.isArray(battle.revealed)&&!battle.revealed.includes(category)){battle.revealed.push(category);revealNow=category;}
 if(correct){
  mult*=boostMultiplier(boost);
  if(wasBroken)mult*=BREAK.breakMult;
  else if(battle.maxShield&&category&&battle.weak?.includes(category)){battle.shield=Math.max(0,battle.shield-1);shieldHit=true;if(battle.shield===0){battle.broken=true;breakNow=true;}}
  battle.orbs=Math.min(BREAK.orbsMax,battle.orbs+1);
 }
 // 破盾只維持一題：這題結束（不論對錯）就回滿護盾。
 if(wasBroken){battle.broken=false;battle.shield=battle.maxShield;}
 battle.cards=dealCards(battle.cats,battle.weak,random);
 return {mult,boost,shieldHit,breakNow,revealNow,wasBroken,noCounter:wasBroken,shield:battle.shield,maxShield:battle.maxShield,orbs:battle.orbs};
}
// 收服招式：不影響護盾與靈氣，只換一手招式卡；若正處於破盾，這題也算用掉破盾。
export function afterCatch(battle,random=Math.random){
 const wasBroken=!!battle.broken;if(wasBroken){battle.broken=false;battle.shield=battle.maxShield;}
 battle.cards=dealCards(battle.cats,battle.weak,random);return {noCounter:wasBroken};
}
// 給畫面看的弱點：還沒翻開的換成 null（畫面顯示「？？」）。舊對戰沒有 revealed 時全部公開。
export const visibleWeak=(weak,revealed)=>(weak||[]).map(c=>!Array.isArray(revealed)||revealed.includes(c)?c:null);

// 潛力爆發（個人對戰，2026-11-22）：被反擊扣血 +35、破盾 +50，最多 100。
// 集滿後出招前可選「覺醒」：這一題傷害 ×3，答錯也不會被反擊；覺醒時不使用靈氣，潛力歸零。
export const LATENT={max:100,hurt:35,break:50,mult:3};
export function gainLatent(battle,n){const before=battle.latent||0;battle.latent=Math.min(LATENT.max,before+n);return battle.latent-before;}
export function checkAwaken(battle,awaken,move){
 if(!awaken)return false;
 if(move==='catch')throw Object.assign(new Error('收服時不能發動覺醒。'),{status:400});
 if((battle.latent||0)<LATENT.max)throw Object.assign(new Error('潛力還沒集滿，不能發動覺醒。'),{status:400});
 return true;
}
