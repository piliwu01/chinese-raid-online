import React,{useEffect,useRef,useState} from 'react';
import {Trophy,X,RefreshCw} from 'lucide-react';
import {api} from './api.js';

const TABS=[['weekCorrect','本週勤學'],['weekAccuracy','本週精準'],['totalCorrect','總勤學'],['totalAccuracy','總精準']];
const pct=x=>x==null?'—':`${Math.round(x*1000)/10}%`;
const medal=r=>r===1?'🥇':r===2?'🥈':r===3?'🥉':r;
const BOARD_NAME={weekCorrect:'勤學榜',weekAccuracy:'精準榜'};
// teacher：老師帳號可選班級查看（2026-11-26），不顯示「我的名次」。
export default function HeroBoard({onClose,teacher=false}){
 const [data,setData]=useState(null),[tab,setTab]=useState('weekCorrect'),[err,setErr]=useState(''),[classes,setClasses]=useState([]),[cls,setCls]=useState(''),latest=useRef(0);
 // 快速切換班級時，只採用最後一次請求的結果（避免慢回來的舊班級蓋掉新選的班級）。
 const load=()=>{if(teacher&&!cls)return;const id=++latest.current;setErr('');api('/hero/board',teacher?{className:cls}:{}).then(d=>{if(id===latest.current)setData(d);}).catch(e=>{if(id===latest.current)setErr(e.message);});};
 useEffect(()=>{if(!teacher)return;api('/admin/users').then(r=>{const list=[...new Set(r.users.map(u=>u.class_name).filter(Boolean))].sort();setClasses(list);if(list[0])setCls(list[0]);else setErr('還沒有學生帳號。');}).catch(e=>setErr(e.message));},[]);
 useEffect(()=>{setData(null);load();},[cls]);
 const b=data?.boards?.[tab],isAcc=tab.endsWith('Accuracy'),weekly=tab.startsWith('week');
 const value=r=>isAcc?pct(r.accuracy):`${r.correct} 題`;
 const sub=r=>isAcc?`答對 ${r.correct}／${r.answered} 題`:`答對率 ${pct(r.accuracy)}`;
 return <div className="hero-overlay" role="dialog" aria-modal="true" aria-label="英雄榜" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
  <section className="hero-board">
   <header className="hero-head"><div><span className="hero-kicker"><Trophy size={16}/> HALL OF HEROES</span><h2>{data?.className||cls||''} 英雄榜</h2>{teacher&&classes.length>0&&<label className="hero-class">查看班級<select value={cls} onChange={e=>setCls(e.target.value)}>{classes.map(c=><option key={c} value={c}>{c}</option>)}</select></label>}<p>每週一（台北時間）結算上週，前 10 名發玉符：第 1–2 名 5 枚、3–4 名 4 枚、5–6 名 3 枚、7–8 名 2 枚、9–10 名 1 枚（勤學榜、精準榜各自計算）。</p></div>
    <div className="hero-head-actions"><button type="button" className="hero-icon" onClick={load} aria-label="重新整理"><RefreshCw size={18}/></button><button type="button" className="hero-icon" onClick={onClose} aria-label="關閉英雄榜"><X size={20}/></button></div></header>
   <div className="hero-tabs" role="tablist">{TABS.map(([k,l])=><button key={k} role="tab" aria-selected={tab===k} className={tab===k?'is-active':''} onClick={()=>setTab(k)}>{l}</button>)}</div>
   {err&&<p className="hero-error" role="alert">{err}</p>}
   {!data&&!err&&<p className="hero-empty">正在讀取排名…</p>}
   {b&&<>
    <p className="hero-rule">{isAcc?`依答對率排名；${weekly?`本週至少作答 ${data.rules.weeklyMin} 題`:`累計至少作答 ${data.rules.totalMin} 題`}才上榜，同答對率時答對題數多者在前。`:`依${weekly?'本週':'累計'}答對題數排名，同題數時答對率高者在前。`}{weekly?`（本週從 ${data.week} 起算）`:''}</p>
    {b.top.length?<ol className="hero-list">{b.top.map(r=><li key={r.rank+'-'+r.name} className={`${r.me?'is-me':''} rank-${r.rank}`}><span className="hero-rank">{medal(r.rank)}</span><span className="hero-name">{r.name}{r.me&&<em>你</em>}</span><span className="hero-value"><b>{value(r)}</b><small>{sub(r)}</small></span>{weekly&&<span className="hero-jade" title="若維持到週日結算">+{[5,5,4,4,3,3,2,2,1,1][r.rank-1]||0} 玉符</span>}</li>)}</ol>:<p className="hero-empty">{teacher?'這個班還沒有人上榜。':'還沒有人上榜，快去答題搶第一！'}</p>}
    {!teacher&&<div className="hero-me">{b.me?<>你目前第 <b>{b.me.rank}</b> 名（共 {b.count} 人上榜）：{value(b.me)}，{sub(b.me)}</>:isAcc?<>你還沒達到上榜門檻：{weekly?`本週需作答 ${data.rules.weeklyMin} 題（目前 ${data.myWeek?.answered||0} 題）`:`累計需作答 ${data.rules.totalMin} 題`}</>:<>你還沒答對任何題目，答對一題就能上榜！</>}</div>}
   </>}
   {data?.lastWeek?.winners?.length>0&&<details className="hero-last"><summary>上週（{data.lastWeek.week} 起）得獎名單</summary><ul>{data.lastWeek.winners.map((w,i)=><li key={i}>{BOARD_NAME[w.board]} 第 {w.rank} 名 · {w.name} · 玉符 {w.jade} 枚</li>)}</ul></details>}
  </section>
 </div>;
}
