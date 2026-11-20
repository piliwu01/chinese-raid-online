// 山海輿圖：六個篇章，依原典出處決定出沒的神獸；在一章打倒或收服 3 隻即可前往下一章。
import {CATALOG,SPIRIT_BY_ID} from './catalog.js';
import {isAvailable,featuredId,FEATURED_RATE} from './schedule.js';
export const CHAPTER_NEED=3;
export const CHAPTERS=[
 {id:1,name:'南山經',place:'青丘之山',gens:[1],bgs:['r1'],blurb:'青山碧水，九尾狐出沒的南方群山。'},
 {id:2,name:'西山經',place:'崑崙之丘',gens:[2],bgs:['r2'],blurb:'帝之下都，陸吾守護的玉階雲海。'},
 {id:3,name:'北山經',place:'北方荒山',gens:[3],bgs:['r3'],blurb:'寒水松林，精衛銜石的北地。'},
 {id:4,name:'東山經',place:'東海之濱',gens:[4],bgs:['r4'],blurb:'潮聲拍岸，珠蟞魚藏身的海角。'},
 {id:5,name:'中山經',place:'中原群山',gens:[5],bgs:['r5'],blurb:'竹林飛瀑，夫諸踏水的中土。'},
 {id:6,name:'海外・大荒',place:'海外諸國與大荒雷澤',gens:[6,7],bgs:['r6','r7'],blurb:'浮島奇木與雷澤風暴，燭陰睜眼為晝。'},
];
export const chapterById=id=>CHAPTERS.find(c=>c.id===Number(id))||null;
export const poolFor=id=>{const c=chapterById(id);return c?CATALOG.filter(p=>c.gens.includes(p.gen)):CATALOG;};
export const chapterWins=s=>s.chapterWins&&typeof s.chapterWins==='object'&&!Array.isArray(s.chapterWins)?s.chapterWins:{};
export function unlockedUpTo(s){const w=chapterWins(s);let n=1;while(n<CHAPTERS.length&&(w[n]||0)>=CHAPTER_NEED)n++;return n;}
export const isUnlocked=(s,id)=>Number(id)>=1&&Number(id)<=unlockedUpTo(s);
// 記錄一場勝利或收服；回傳新解鎖的篇章（若有）。
export function recordChapterWin(s,id){
 const c=chapterById(id);if(!c)return null;const before=unlockedUpTo(s);
 s.chapterWins={...chapterWins(s),[c.id]:(chapterWins(s)[c.id]||0)+1};
 const after=unlockedUpTo(s);return after>before?CHAPTERS[after-1]:null;
}
export const publicChapters=(s,now=Date.now())=>{const w=chapterWins(s),top=unlockedUpTo(s);return CHAPTERS.map(c=>({id:c.id,name:c.name,place:c.place,blurb:c.blurb,bgs:c.bgs,unlocked:c.id<=top,wins:w[c.id]||0,need:CHAPTER_NEED,count:poolFor(c.id).filter(p=>isAvailable(p.id,now)).length,featured:poolFor(c.id).some(p=>p.id===featuredId(now))}));};
export const chapterOf=id=>{const p=SPIRIT_BY_ID.get(Number(id));return p?CHAPTERS.find(c=>c.gens.includes(p.gen))?.id||null:null;};
// 依時間挑一隻：排除不在時段的夜間神獸；本週神獸在其篇章有較高出現率。
export function pickEnemy(chapter,now,excludeId,random=Math.random){
 const pool=poolFor(chapter).filter(p=>p.id!==excludeId&&isAvailable(p.id,now));
 const f=pool.find(p=>p.id===featuredId(now));
 if(f&&random()<FEATURED_RATE)return f;
 return pool[Math.floor(random()*pool.length)];
}
