// 限時出沒：夜間限定神獸（台北 18:00–05:00），以及每週輪替的「本週神獸」（出現率提高）。
import {CATALOG,SPIRIT_BY_ID} from './catalog.js';
export const NIGHT_ONLY=[2093,2097]; // 燭陰、三青鳥
export const FEATURED_RATE=0.3;
export const taipeiHour=now=>Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Taipei',hour:'2-digit',hour12:false}).format(new Date(now)))%24;
export const isNight=now=>{const h=taipeiHour(now);return h>=18||h<5;};
// 週一 00:00（台北）為一週開始。
export function weekIndex(now){const t=now+8*3600000;return Math.floor((t-4*86400000)/(7*86400000));}
export function featuredId(now){const pool=CATALOG.filter(p=>!NIGHT_ONLY.includes(p.id));const w=weekIndex(now);return pool[((w*7919)%pool.length+pool.length)%pool.length].id;}
export const isAvailable=(id,now)=>!NIGHT_ONLY.includes(Number(id))||isNight(now);
export function publicSchedule(now,chapterOf){const id=featuredId(now),p=SPIRIT_BY_ID.get(id);return {night:isNight(now),nightOnly:NIGHT_ONLY,featured:{id,zhName:p.zhName,type:p.type,chapter:chapterOf(id)}};}
