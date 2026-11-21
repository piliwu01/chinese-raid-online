// 收集獎勵：集齊套組或全部野外神獸後，每項可領一次獎勵（伺服器呼叫，寫入學生進度）。
// 已領取紀錄存在 s.collectionClaimed（{ flood: true, master: true, ... }）。
import {SETS,MASTER,setProgress,masterProgress} from './play.js';
import {luckyOf} from './lucky.js';
import {bagOf,itemById} from './items.js';

export const claimedOf=s=>s.collectionClaimed&&typeof s.collectionClaimed==='object'&&!Array.isArray(s.collectionClaimed)?s.collectionClaimed:{};
export const publicCollection=s=>({sets:setProgress(s.captured,claimedOf(s)),master:masterProgress(s.captured,claimedOf(s))});
export function rewardText(r){
 return [r.food&&`食物 ×${r.food}`,r.jade&&`玉符 ×${r.jade}`,...Object.entries(r.items||{}).map(([id,n])=>`${itemById(id)?.name||id} ×${n}`)].filter(Boolean).join('、');
}
function fail(message,status=400){throw Object.assign(new Error(message),{status});}

export function claimCollection(s,id){
 id=String(id||'');
 const def=id===MASTER.id?MASTER:SETS.find(x=>x.id===id);if(!def)fail('沒有這個收集獎勵。',404);
 const p=id===MASTER.id?masterProgress(s.captured,claimedOf(s)):setProgress(s.captured,claimedOf(s)).find(x=>x.id===id);
 if(p.claimed)fail('這個收集獎勵已經領過了。');
 if(!p.done)fail(id===MASTER.id?`還差 ${p.total-p.have} 隻神獸才能集齊全部。`:`「${def.name}」還沒集齊（${p.have} / ${def.ids.length}）。`);
 const r=def.reward;s.food=(s.food||0)+(r.food||0);
 if(r.jade){const l=luckyOf(s);l.jade+=r.jade;}
 if(r.items){const bag=bagOf(s);for(const [k,n] of Object.entries(r.items))bag[k]+=n;s.bag=bag;}
 s.collectionClaimed={...claimedOf(s),[id]:true};
 return {collection:{id,title:def.title,reward:r},message:`「${def.name}」收集獎勵入帳：${rewardText(r)}！`};
}
