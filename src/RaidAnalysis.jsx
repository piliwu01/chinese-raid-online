import React,{useState} from 'react';
import {Bot,LoaderCircle,BarChart3} from 'lucide-react';
import {api} from './api.js';

const pct=x=>`${Math.round(x*100)}%`;
// Teacher-only: class weakness summary (numbers from the room) + AI teaching advice.
export default function RaidAnalysis({room}){
 const [data,setData]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const run=async()=>{setBusy(true);setError('');try{setData(await api(`/raid/${room.code}/analysis`,{requestId:crypto.randomUUID().replaceAll('-','')}));}catch(e){setError(e.message);}finally{setBusy(false);}};
 const s=data?.summary;
 return <section className="raid-analysis">
  <div className="raid-analysis-head"><div><span className="raid-eyebrow">CLASS INSIGHT</span><h3><BarChart3 size={18}/>全班弱點分析</h3><p>統計這場各題型的錯誤率，並由 AI 整理下一節課的教學建議。</p></div>
   <button className="primary-button" disabled={busy} onClick={run}>{busy?<LoaderCircle size={17} className="spin"/>:<Bot size={17}/>}{busy?'分析中…':data?'重新分析':'AI 分析全班弱點'}</button></div>
  {error&&<p className="raid-analysis-error">{error}</p>}
  {data?.message&&<p className="raid-analysis-note">{data.message}</p>}
  {s?.answered>0&&<div className="raid-analysis-body">
   <div className="raid-analysis-stats"><p>共作答 <b>{s.answered}</b> 次，答對率 <b>{pct(s.correct/s.answered)}</b></p>
    <ul className="cat-bars">{s.categories.map(c=><li key={c.category}><span>{c.category}</span><i><em style={{width:pct(c.rate)}}/></i><b>{pct(c.rate)}</b><small>錯 {c.wrong}／{c.total}</small></li>)}</ul>
    {s.hardest.length>0&&<><h4>錯最多的題目</h4><ol className="hard-list">{s.hardest.map(q=><li key={q.id}><em>{q.category}</em>{q.stem}<small>錯 {q.wrong}／{q.total}</small></li>)}</ol></>}
   </div>
   {data.text&&<div className="raid-analysis-ai"><span className="ai-tutor-label"><Bot size={15}/>AI 教學建議</span><p>{data.text}</p><small>AI 建議僅供參考，請依班級實況調整。</small></div>}
  </div>}
 </section>;
}
