import React,{useEffect,useMemo,useState} from 'react';
import {api} from './api.js';
import ClassWeak from './ClassWeak.jsx';
const pct=x=>x==null?'—':`${Math.round(x*100)}%`;
const when=ms=>{if(!ms)return '尚未上線';const d=Date.now()-ms;if(d<3600000)return `${Math.max(1,Math.round(d/60000))} 分鐘前`;if(d<86400000)return `${Math.round(d/3600000)} 小時前`;return `${Math.round(d/86400000)} 天前`;};
const time=ms=>ms?new Intl.DateTimeFormat('zh-TW',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(ms)):'';
const SORTS={username:['座號／帳號',(a,b)=>a.username.localeCompare(b.username)],accuracy:['答對率低→高',(a,b)=>(a.accuracy??2)-(b.accuracy??2)],answered:['作答數多→少',(a,b)=>b.answered-a.answered],last:['最久未上線',(a,b)=>(a.lastActive||0)-(b.lastActive||0)]};
// 老師端：個人學習報告，可依班級篩選、排序、點開看題型弱點，並匯出 CSV（Excel 可開）。
export default function LearningReport(){
 const [cls,setCls]=useState('313'),[rows,setRows]=useState(null),[err,setErr]=useState(''),[sort,setSort]=useState('username'),[open,setOpen]=useState(null),[asked,setAsked]=useState(null);
 async function load(){setErr('');try{setRows((await api('/admin/report',{className:cls.trim()})).students);setAsked({cls:cls.trim(),at:Date.now()});}catch(e){setErr(e.message);}}
 useEffect(()=>{load();},[]);
 const list=useMemo(()=>[...(rows||[])].sort(SORTS[sort][1]),[rows,sort]);
 const sum=useMemo(()=>{const r=rows||[],a=r.reduce((n,x)=>n+x.answered,0),c=r.reduce((n,x)=>n+x.correct,0),cats={};for(const x of r)for(const k of x.cats){cats[k.category]||={r:0,t:0};cats[k.category].r+=k.right;cats[k.category].t+=k.total;}
  return {n:r.length,answered:a,acc:a?c/a:null,active:r.filter(x=>x.activeDays7>0).length,weak:Object.entries(cats).filter(([,v])=>v.t>=10).map(([k,v])=>({k,rate:v.r/v.t})).sort((x,y)=>x.rate-y.rate).slice(0,3)};},[rows]);
 function exportCsv(){const esc=v=>'"'+String(v??'').replaceAll('"','""')+'"';const cats=[...new Set((rows||[]).flatMap(r=>r.cats.map(c=>c.category)))];
  const head=['帳號','姓名','班級','夥伴','等級','作答數','答對數','答對率','近7天上線天數','最後上線','待淨化墨漬怪','已淨化','收服數','已解鎖篇章','弱點題型',...cats.map(c=>c+'答對率')];
  const body=list.map(r=>[r.username,r.name,r.className,r.partner,r.level,r.answered,r.correct,pct(r.accuracy),r.activeDays7,time(r.lastActive),r.ink,r.purified,r.captured,r.chapter,r.weak.join('、'),...cats.map(c=>{const x=r.cats.find(k=>k.category===c);return x?`${pct(x.rate)}（${x.right}/${x.total}）`:'';})]);
  const csv='﻿'+[head,...body].map(r=>r.map(esc).join(',')).join('\r\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download=`學習報告_${cls||'全部'}_${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(a.href);}
 const detail=list.find(r=>r.id===open);
 return <section className="desk-card learning-report"><h2>個人學習報告</h2><p>答對率與題型統計從這次更新後開始累計（題型統計包含單人對戰、墨漬怪、共同討伐與 PVP）。點學生可看詳細資料。</p>
  <div className="report-tools"><input value={cls} onChange={e=>setCls(e.target.value)} placeholder="班級（空白＝全部）" aria-label="班級"/><button className="primary-button" onClick={load}>查詢</button>
   <select value={sort} onChange={e=>setSort(e.target.value)} aria-label="排序">{Object.entries(SORTS).map(([k,[l]])=><option key={k} value={k}>{l}</option>)}</select>
   <button className="primary-button" disabled={!rows?.length} onClick={exportCsv}>匯出 Excel（CSV）</button></div>
  {err&&<p className="cloud-error">{err}</p>}
  {rows&&<div className="report-summary"><div><b>{sum.n}</b><span>位學生</span></div><div><b>{sum.active}</b><span>人近 7 天有上線</span></div><div><b>{sum.answered}</b><span>總作答數</span></div><div><b>{pct(sum.acc)}</b><span>全班答對率</span></div><div className="wide"><span>全班較弱題型</span><b>{sum.weak.length?sum.weak.map(w=>`${w.k} ${pct(w.rate)}`).join('、'):'資料累積中'}</b></div></div>}
  {asked&&<ClassWeak cls={asked.cls} stamp={asked.at}/>}
  {rows&&(list.length?<div className="report-table"><table><thead><tr><th>學生</th><th>夥伴</th><th>作答</th><th>答對率</th><th>近 7 天</th><th>弱點題型</th><th>墨漬怪</th><th>收服</th><th>最後上線</th></tr></thead>
   <tbody>{list.map(r=><tr key={r.id} className={open===r.id?'is-open':''} onClick={()=>setOpen(open===r.id?null:r.id)}>
    <td><b>{r.name}</b><small>{r.username}</small></td><td>{r.partner}<small>Lv.{r.level}</small></td><td>{r.answered}</td>
    <td><span className={`acc ${r.accuracy==null?'':r.accuracy<0.6?'low':r.accuracy<0.8?'mid':'high'}`}>{pct(r.accuracy)}</span></td>
    <td><span className="spark">{r.week.map(d=><i key={d.day} title={`${d.day}：${d.count} 題`} style={{height:`${Math.min(100,d.count*4)}%`}}/>)}</span><small>{r.activeDays7} 天</small></td>
    <td>{r.weak.join('、')||'—'}</td><td>{r.ink}<small>已淨化 {r.purified}</small></td><td>{r.captured}<small>第 {r.chapter} 章</small></td>
    <td className={!r.lastActive||Date.now()-r.lastActive>7*86400000?'stale':''}>{when(r.lastActive)}</td></tr>)}</tbody></table></div>:<p className="trade-empty">這個班級沒有學生。</p>)}
  {detail&&<div className="report-detail"><h3>{detail.name} 的學習細節</h3>
   <div className="report-detail-grid"><div><h4>各題型答對率</h4>{detail.cats.length?<ul className="cat-bars">{detail.cats.map(c=><li key={c.category}><span>{c.category}</span><i><em style={{width:pct(c.rate),background:c.rate<0.6?'#ef4444':c.rate<0.8?'#f59e0b':'#22c55e'}}/></i><b>{pct(c.rate)}</b><small>{c.right}/{c.total}</small></li>)}</ul>:<p className="trade-empty">尚無題型資料（更新後開始累計）。</p>}</div>
    <div><h4>目前待淨化的錯題（最近 8 題）</h4>{detail.inkStems.length?<ol className="ink-stems">{detail.inkStems.map((s,i)=><li key={i}>{s}</li>)}</ol>:<p className="trade-empty">沒有待淨化的錯題。</p>}</div></div></div>}
 </section>;
}
