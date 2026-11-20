// 重複卡（副本卡）可以保留（拿去交易）或轉化成其他物品。稀有神獸轉化數量加倍。
import {SPIRIT_BY_ID} from './catalog.js';
import {isTradeable,giveCard,dupesOf} from './trade.js';
import {isRare} from './lucky.js';
import {bagOf} from './items.js';
export const DUPE_CONVERT={food:{label:'食物',icon:'🍙',base:3},potion:{label:'傷藥',icon:'💊',base:1}};
export const convertAmount=(id,to)=>DUPE_CONVERT[to]?DUPE_CONVERT[to].base*(isRare(id)?2:1):0;
export function convertDupe(s,id,to){
 id=Number(id);const opt=DUPE_CONVERT[to];
 if(!opt)throw Object.assign(Error('不支援這種轉化。'),{status:400});
 if(!isTradeable(id))throw Object.assign(Error('只能轉化野外神獸的副本卡。'),{status:400});
 if(!giveCard(s,id))throw Object.assign(Error('你沒有這張副本卡了。'),{status:409});
 const amount=convertAmount(id,to);
 if(to==='food')s.food=(Number(s.food)||0)+amount;
 else{const bag=bagOf(s);bag.potion+=amount;s.bag=bag;}
 return {id,zhName:SPIRIT_BY_ID.get(id)?.zhName||'',to,label:opt.label,amount,left:dupesOf(s)[String(id)]||0,rare:isRare(id)};
}
