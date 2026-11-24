// 2026-11-24 同行夥伴：沒選到的初始夥伴，會在打通第 2、4、6 章時依序加入（固定第一階段、不會進化，但有被動技能）。
// 加入順序依《山海經》出處：旋龜（南山經）→ 畢方（西山經）→ 當康（東山經）→ 夔（大荒）。
// 已經打通篇章的學生，下次有任何操作（登入時會自動同步一次）就補給。純函式，前後端共用。
import {CHAPTER_NEED,chapterWins} from './chapters.js';
import {spiritRef} from './migrate.js';
import {currentId,SPIRIT_BY_ID} from './catalog.js';

export const ALLY_AT=[2,4,6];
export const ALLY_ORDER=[2004,2001,2007,2010];
export const ALLY_LINES={
 2004:'溪水裡傳來劈木般的聲響，旋龜探出鳥頭：「我聽見你答題的聲音了，帶我一起走吧。」',
 2001:'一隻赤紋青羽、只有一足的鳥落在你肩上。畢方說：「你的筆裡也有火。」',
 2007:'「當康！當康！」牠一路喊著自己的名字跑來——跟著你，好像就會有好收成。',
 2010:'雷澤上鼓聲大作，夔一足立在浪頭：「你的勇氣，配得上我的雷。」',
};
const cleared=(s,ch)=>(chapterWins(s)[ch]||0)>=CHAPTER_NEED;
// 依主夥伴排除後，三位同行夥伴的順序
export function allyPlan(s){const mine=currentId(s?.growth?.starter);if(!mine)return [];return ALLY_ORDER.filter(id=>id!==mine).slice(0,ALLY_AT.length).map((id,i)=>({id,chapter:ALLY_AT[i]}));}
const owns=(s,id)=>(Array.isArray(s.captured)?s.captured:[]).some(p=>currentId(p.id)===id);
// 補上應該加入但還沒加入的夥伴；回傳這次新加入的名單
export function grantAllies(s){
 const out=[];
 for(const a of allyPlan(s)){
  if(!cleared(s,a.chapter))continue;
  const joined=Array.isArray(s.allies)?s.allies:[];
  if(!joined.includes(a.id))s.allies=[...joined,a.id];
  if(owns(s,a.id))continue;
  s.captured=[...(Array.isArray(s.captured)?s.captured:[]),spiritRef({id:a.id})];
  const p=SPIRIT_BY_ID.get(a.id);out.push({id:a.id,zhName:p.zhName,type:p.type,chapter:a.chapter,line:ALLY_LINES[a.id]});
 }
 return out;
}
export const allyPending=s=>allyPlan(s).some(a=>cleared(s,a.chapter)&&!owns(s,a.id));
// 給畫面用：每位同行夥伴是否已加入、在第幾章加入
export const publicAllies=s=>allyPlan(s).map(a=>{const p=SPIRIT_BY_ID.get(a.id);return {id:a.id,zhName:p.zhName,type:p.type,chapter:a.chapter,joined:owns(s,a.id)};});
