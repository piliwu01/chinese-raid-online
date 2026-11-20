// 山海福運：每日山海籤、答題寶箱、祈福天燈。所有獎勵都來自學習，機率公開、有保底與每日上限。
import {CATALOG,SPIRIT_BY_ID} from './catalog.js';
import {SETS} from './play.js';
import {ITEMS,bagOf} from './items.js';
import {LOOKS} from './lore.js';
import {NIGHT_ONLY,featuredId} from './schedule.js';
import {addDupe} from './trade.js';
export const LUCKY={jadePerCorrect:20,jadeDailyMax:3,chestMax:10,inkPerChest:5,pity:10,rareRate:0.08,featuredRate:0.2};
export const FORTUNES=[{level:'上上籤',weight:10,food:2,jade:1,item:1},{level:'上籤',weight:30,food:2,jade:1,item:0},{level:'中籤',weight:45,food:1,jade:1,item:0},{level:'小吉',weight:15,food:1,jade:0,item:0}];
const ADVICE={
 '上上籤':['如鳳鳴朝陽，今日讀書事半功倍，難題迎刃而解。','神獸護佑，靈光乍現，把握今天多挑戰幾題吧！','青丘祥雲聚頂，今天答題手感絕佳。'],
 '上籤':['如鹿蜀之歌，步步順利，細心就能拿高分。','穩紮穩打，今天適合把錯題本清一清。','東風送暖，複習過的內容都會記得。'],
 '中籤':['如旋龜慢行，慢一點、穩一點，答案自然浮現。','今日宜複習修辭與成語，基礎打穩再衝刺。','先看清題目再作答，墨漬怪就不會變多。'],
 '小吉':['如精衛銜石，一點一滴累積，終能填平大海。','今天先從簡單題開始，信心會慢慢回來。','遇到難題別灰心，看完解析再試一次。'],
};
export const CHEST_TABLE=[{kind:'food',weight:55},{kind:'item',weight:28},{kind:'jade',weight:14},{kind:'jackpot',weight:3}];
const RARE=new Set([...NIGHT_ONLY,...SETS.filter(s=>['auspice','fiends'].includes(s.id)).flatMap(s=>s.ids)]);
export const isRare=id=>RARE.has(Number(id));
const hash=s=>[...String(s)].reduce((h,c)=>(Math.imul(h,31)+c.charCodeAt(0))>>>0,2166136261);
const pickWeighted=(table,r)=>{const total=table.reduce((n,x)=>n+x.weight,0);let x=r*total;for(const t of table){if((x-=t.weight)<0)return t;}return table[table.length-1];};
const itemIds=()=>ITEMS.map(x=>x.id);
export function luckyOf(s){const l=s.lucky&&typeof s.lucky==='object'?s.lucky:(s.lucky={});l.chests??=0;l.jade??=0;l.pity??=0;l.correct??=0;return l;}
const giveItem=(s,r)=>{const ids=itemIds(),id=ids[Math.floor(r*ids.length)%ids.length],bag=bagOf(s);s.bag={...bag,[id]:bag[id]+1};return {id,name:ITEMS.find(x=>x.id===id).name};};
// 答對累計：每 20 題得 1 枚玉符，每天最多 3 枚。
export function noteCorrect(s,day){const l=luckyOf(s);if(l.jadeDay!==day){l.jadeDay=day;l.jadeToday=0;}l.correct++;if(l.correct>=LUCKY.jadePerCorrect){l.correct=0;if(l.jadeToday<LUCKY.jadeDailyMax){l.jadeToday++;l.jade++;return true;}}return false;}
export function addChest(s,reason){const l=luckyOf(s);if(l.chests>=LUCKY.chestMax)return false;l.chests++;l.lastChest=reason;return true;}
export function drawFortune(s,day,userKey,random=Math.random){
 const l=luckyOf(s);if(l.fortuneDay===day)throw Object.assign(Error('今天已經抽過山海籤了，明天再來！'),{status:409});
 const f=pickWeighted(FORTUNES,random()),pool=CATALOG,beast=pool[hash(userKey+day)%pool.length];
 l.fortuneDay=day;s.food=(s.food||0)+f.food;l.jade+=f.jade;const item=f.item?giveItem(s,random()):null;
 const adv=ADVICE[f.level],r={level:f.level,advice:adv[hash(userKey+day+'a')%adv.length],food:f.food,jade:f.jade,item,beast:{id:beast.id,zhName:beast.zhName,source:beast.source,quote:beast.quote,plain:LOOKS[beast.id]||''}};l.lastFortune=r;return r;
}
export function openChest(s,random=Math.random){
 const l=luckyOf(s);if(l.chests<=0)throw Object.assign(Error('沒有可以打開的寶箱。'),{status:409});l.chests--;
 const t=pickWeighted(CHEST_TABLE,random());const out={kind:t.kind};
 if(t.kind==='food'){out.food=1+Math.floor(random()*3);s.food=(s.food||0)+out.food;}
 else if(t.kind==='item'){out.item=giveItem(s,random());}
 else if(t.kind==='jade'){out.jade=1+Math.floor(random()*2);l.jade+=out.jade;}
 else{out.item=giveItem(s,random());out.item2=giveItem(s,random());out.jade=1;l.jade+=1;}
 return out;
}
export function pullLantern(s,now,random=Math.random){
 const l=luckyOf(s);if(l.jade<=0)throw Object.assign(Error('玉符不足。每答對 20 題可得 1 枚玉符（每天最多 3 枚）。'),{status:409});l.jade--;
 const rare=CATALOG.filter(p=>isRare(p.id)),common=CATALOG.filter(p=>!isRare(p.id)),feat=featuredId(now);
 const forced=l.pity+1>=LUCKY.pity,gotRare=forced||random()<LUCKY.rareRate;
 let p;if(gotRare)p=rare[Math.floor(random()*rare.length)];else if(random()<LUCKY.featuredRate&&common.some(c=>c.id===feat))p=SPIRIT_BY_ID.get(feat);else p=common[Math.floor(random()*common.length)];
 l.pity=gotRare?0:l.pity+1;const count=addDupe(s,p.id),owned=(s.captured||[]).some(c=>c.id===p.id);
 return {id:p.id,zhName:p.zhName,type:p.type,rare:gotRare,pityHit:forced&&gotRare,count,owned,pity:l.pity};
}
export function publicLucky(s,day){const l=s.lucky||{};return {chests:l.chests||0,jade:l.jade||0,pity:l.pity||0,pityMax:LUCKY.pity,progress:l.correct||0,perJade:LUCKY.jadePerCorrect,jadeToday:l.jadeDay===day?(l.jadeToday||0):0,jadeDailyMax:LUCKY.jadeDailyMax,fortuneToday:l.fortuneDay===day,lastFortune:l.fortuneDay===day?l.lastFortune:null,rareRate:LUCKY.rareRate,featuredRate:LUCKY.featuredRate,rareIds:[...RARE]};}
