// 英雄榜：勤學榜（答對題數）與精準榜（答對率），分「本週」與「總榜」。每週一（台北時間）結算上週前 10 名發玉符。
import {taipeiDate} from './game-date.js';
import {luckyOf} from './lucky.js';
export const HERO={top:10,weeklyMin:30,totalMin:100,rewards:[5,5,4,4,3,3,2,2,1,1],launchWeek:'2026-11-16'};
export const BOARDS={weekCorrect:'本週勤學榜',weekAccuracy:'本週精準榜',totalCorrect:'總勤學榜',totalAccuracy:'總精準榜'};
const DAY=86400000;
// 台北時間該週週一的日期字串
export function weekStart(now=Date.now()){const d=taipeiDate(now);const dow=new Date(d+'T12:00:00Z').getUTCDay();const back=(dow+6)%7;return taipeiDate(Date.parse(d+'T12:00:00+08:00')-back*DAY);}
export const weekDays=monday=>{const t=Date.parse(monday+'T12:00:00+08:00');return Array.from({length:7},(_,i)=>taipeiDate(t+i*DAY));};
export const previousWeek=(now=Date.now())=>weekStart(Date.parse(weekStart(now)+'T12:00:00+08:00')-7*DAY);
export function weekStats(s,monday){const st=s.study||{},da=st.da||{},dr=st.dr||{};let answered=0,correct=0;for(const d of weekDays(monday)){answered+=da[d]||0;correct+=dr[d]||0;}return {answered,correct};}
export function totalStats(s){const t=s.study?.total||{r:0,w:0};return {answered:(t.r||0)+(t.w||0),correct:t.r||0};}
const acc=x=>x.answered?x.correct/x.answered:0;
// rows: [{id,name,stats:{answered,correct}}]
export function rankBoard(rows,kind,min=0){
 const list=rows.filter(r=>kind==='correct'?r.stats.correct>0:r.stats.answered>=min).map(r=>({...r,accuracy:acc(r.stats)}));
 list.sort(kind==='correct'?(a,b)=>b.stats.correct-a.stats.correct||b.accuracy-a.accuracy||String(a.name).localeCompare(String(b.name)):(a,b)=>b.accuracy-a.accuracy||b.stats.correct-a.stats.correct||String(a.name).localeCompare(String(b.name)));
 let rank=0,prev=null;return list.map((r,i)=>{const key=kind==='correct'?r.stats.correct+'|'+r.accuracy.toFixed(4):r.accuracy.toFixed(4)+'|'+r.stats.correct;if(key!==prev){rank=i+1;prev=key;}return {...r,rank};});
}
export const rewardFor=rank=>HERO.rewards[rank-1]||0;
// 領取伺服器派發的獎勵（awards 由伺服器注入，不信任前端）。同一筆獎勵只會入帳一次。
export function claimHero(s,awards){
 const h=s.hero&&typeof s.hero==='object'?s.hero:(s.hero={claimed:[]});h.claimed||=[];
 const got=[];for(const a of Array.isArray(awards)?awards:[]){const key=String(a.key||'');const jade=Math.max(0,Math.min(5,Number(a.jade)||0));if(!key||!jade||h.claimed.includes(key))continue;h.claimed.push(key);luckyOf(s).jade+=jade;got.push({key,jade,board:String(a.board||''),rank:Number(a.rank)||0,week:String(a.week||'')});}
 h.claimed=h.claimed.slice(-100);return got;
}
