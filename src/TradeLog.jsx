import React,{useEffect,useState} from 'react';
import {api} from './api.js';
const STATUS={pending:'等待回覆',accepted:'交易成功',declined:'已婉拒',cancelled:'已取消',expired:'已過期'};
const time=ms=>ms?new Intl.DateTimeFormat('zh-TW',{timeZone:'Asia/Taipei',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(ms)):'';
// 老師端：卡牌交易紀錄（可依班級篩選）。
export default function TradeLog(){
 const [cls,setCls]=useState(''),[rows,setRows]=useState(null),[err,setErr]=useState(''),[onlyDone,setOnlyDone]=useState(false);
 async function load(){setErr('');try{setRows((await api('/admin/trades',{className:cls})).trades);}catch(e){setErr(e.message);}}
 useEffect(()=>{load();},[]);
 const list=(rows||[]).filter(r=>!onlyDone||r.status==='accepted');
 return <section className="desk-card trade-log"><h2>卡牌交易紀錄</h2><p>學生只能和同班同學交換副本卡，每人每天最多完成 3 次。</p>
  <div className="trade-log-filter"><input value={cls} onChange={e=>setCls(e.target.value)} placeholder="班級（空白＝全部）" aria-label="班級"/><button className="primary-button" onClick={load}>查詢</button><label><input type="checkbox" checked={onlyDone} onChange={e=>setOnlyDone(e.target.checked)}/>只看成功的交易</label></div>
  {err&&<p className="cloud-error">{err}</p>}
  {rows&&(list.length?<div className="trade-log-table"><table><thead><tr><th>時間</th><th>班級</th><th>提出</th><th>送出</th><th>對象</th><th>換得</th><th>結果</th></tr></thead><tbody>{list.map(r=><tr key={r.id}><td>{time(r.decidedAt||r.createdAt)}</td><td>{r.className}</td><td>{r.from}</td><td>{r.give}</td><td>{r.to}</td><td>{r.want}</td><td className={`s-${r.status}`}>{STATUS[r.status]}</td></tr>)}</tbody></table></div>:<p className="trade-empty">目前沒有交易紀錄。</p>)}
 </section>;
}
