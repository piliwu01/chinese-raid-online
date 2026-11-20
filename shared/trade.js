// 卡牌交易：只交換「副本卡」（重複收服得到），自己的圖鑑不會減少。
import {CATALOG,SPIRIT_BY_ID} from './catalog.js';
import {spiritRef} from './migrate.js';
import {earnedTitles} from './play.js';
export const TRADE={dailyLimit:3,maxDupes:9,pendingLimit:3,expireMs:24*3600*1000};
const WILD=new Set(CATALOG.map(p=>p.id));
export const isTradeable=id=>WILD.has(Number(id));
export const dupesOf=s=>s.dupes&&typeof s.dupes==='object'&&!Array.isArray(s.dupes)?s.dupes:(s.dupes={});
export function addDupe(s,id){const d=dupesOf(s),k=String(id);d[k]=Math.min(TRADE.maxDupes,(d[k]||0)+1);return d[k];}
export const publicDupes=s=>Object.entries(s.dupes&&typeof s.dupes==="object"?s.dupes:{}).filter(([id,n])=>n>0&&isTradeable(id)).map(([id,n])=>{const p=SPIRIT_BY_ID.get(Number(id));return {id:Number(id),count:n,zhName:p.zhName,type:p.type};}).sort((a,b)=>a.id-b.id);
// 收到一張卡：沒有就加入圖鑑（新收集），已有就變成副本卡。
export function receiveCard(s,id){
 const owned=(s.captured||[]).some(p=>p.id===id);
 if(owned){addDupe(s,id);return 'dupe';}
 s.captured=[...(s.captured||[]),spiritRef({id})];return 'new';
}
export function giveCard(s,id){const d=dupesOf(s),k=String(id);if(!(d[k]>0))return false;d[k]--;if(!d[k])delete d[k];return true;}
// 交換雙方的狀態（就地修改）。任何一方副本不足就丟出錯誤。
export function swapCards(fromState,toState,give,want){
 if(!isTradeable(give)||!isTradeable(want))throw Object.assign(Error('只能交換野外神獸的副本卡。'),{status:400});
 if(!giveCard(fromState,give))throw Object.assign(Error('提出交易的同學已經沒有這張副本卡了。'),{status:409});
 if(!giveCard(toState,want))throw Object.assign(Error('你已經沒有對方想要的副本卡了。'),{status:409});
 const a=receiveCard(fromState,want),b=receiveCard(toState,give);
 for(const s of [fromState,toState])if(s.title&&!earnedTitles(s.captured).includes(s.title))s.title='';
 return {from:a,to:b};
}
