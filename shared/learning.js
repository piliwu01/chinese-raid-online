// 學習紀錄：依題型累計答對／答錯、每日作答數，給老師的個人學習報告使用。
import {taipeiDate} from './game-date.js';
export const studyOf=s=>{const st=s.study&&typeof s.study==='object'?s.study:(s.study={});st.cats||={};st.days||={};st.total||={r:0,w:0};return st;};
export function recordStudy(s,category,correct,now=Date.now()){
 const st=studyOf(s),k=correct?'r':'w',cat=String(category||'').slice(0,12);
 st.total[k]++;if(cat){st.cats[cat]||={r:0,w:0};st.cats[cat][k]++;}
 const day=taipeiDate(now);st.days[day]=(st.days[day]||0)+1;
 st.da||={};st.dr||={};st.da[day]=(st.da[day]||0)+1;if(correct)st.dr[day]=(st.dr[day]||0)+1;
 for(const m of [st.days,st.da,st.dr]){const keys=Object.keys(m).sort();for(const old of keys.slice(0,Math.max(0,keys.length-60)))delete m[old];}
 st.last=Math.max(st.last||0,now);return st;
}
export const notePurified=(s,now=Date.now())=>{const st=studyOf(s);st.purified=(st.purified||0)+1;st.last=Math.max(st.last||0,now);};
// 整理成報告欄位（不修改狀態）。
export function studySummary(s,now=Date.now()){
 const st=s.study||{},total=st.total||{r:0,w:0},answered=total.r+total.w;
 const cats=Object.entries(st.cats||{}).map(([category,v])=>({category,right:v.r,wrong:v.w,total:v.r+v.w,rate:(v.r+v.w)?v.r/(v.r+v.w):0})).sort((a,b)=>b.total-a.total);
 const weak=cats.filter(c=>c.total>=5).sort((a,b)=>a.rate-b.rate).slice(0,2).filter(c=>c.rate<0.8);
 const week=[];for(let i=6;i>=0;i--){const d=taipeiDate(now-i*86400000);week.push({day:d,count:(st.days||{})[d]||0});}
 return {answered,correct:total.r,accuracy:answered?total.r/answered:null,cats,weak,week,activeDays7:week.filter(d=>d.count>0).length,purified:st.purified||0,last:st.last||0};
}
