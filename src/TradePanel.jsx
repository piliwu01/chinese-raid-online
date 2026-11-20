import React,{useCallback,useEffect,useMemo,useState} from 'react';
import {ArrowLeftRight,X,Check,Ban,RefreshCw} from 'lucide-react';
import {api} from './api.js';
import {setFor} from '../shared/play.js';

const STATUS={pending:'等待回覆',accepted:'交易成功',declined:'已婉拒',cancelled:'已取消',expired:'已過期'};
const img=id=>`./assets/${id}.png`;
function Card({c,selected,onClick,note}){
 return <button type="button" className={`trade-card ${selected?'is-selected':''}`} onClick={onClick} title={setFor(c.id)?`套組：${setFor(c.id).name}`:''}>
  <img src={img(c.id)} alt="" loading="lazy"/><b>{c.zhName}</b><small>副本 ×{c.count}</small>{note&&<em>{note}</em>}
 </button>;
}
// 卡牌交易所：只交換重複收服得到的副本卡，同班同學之間，每日 3 次。
export default function TradePanel({onClose,onChanged}){
 const [board,setBoard]=useState(null),[mate,setMate]=useState(''),[give,setGive]=useState(null),[want,setWant]=useState(null),[msg,setMsg]=useState(''),[busy,setBusy]=useState(false);
 const load=useCallback(async()=>{try{setBoard(await api('/trade/board',{}));}catch(e){setMsg(e.message);}},[]);
 useEffect(()=>{load();const t=setInterval(load,15000);return()=>clearInterval(t);},[load]);
 const target=board?.classmates.find(m=>m.id===mate);
 const owned=useMemo(()=>new Set(board?.myOwned||[]),[board]);
 async function run(path,body,done){setBusy(true);setMsg('');try{const r=await api(path,body);setMsg(r.message||'完成');done?.(r);await load();if(path==='/trade/accept')onChanged?.();}catch(e){setMsg(e.message);}finally{setBusy(false);}}
 if(!board)return <section className="trade-panel"><p>{msg||'正在載入交易所…'}</p></section>;
 const incoming=board.trades.filter(t=>t.status==='pending'&&!t.mine),outgoing=board.trades.filter(t=>t.status==='pending'&&t.mine),history=board.trades.filter(t=>t.status!=='pending').slice(0,8);
 const left=Math.max(0,board.dailyLimit-board.todayDone);
 return <section className="trade-panel" aria-label="卡牌交易所">
  <div className="trade-head"><div><span className="cloud-eyebrow">CARD EXCHANGE</span><h2><ArrowLeftRight size={22}/>卡牌交易所</h2>
   <p>重複收服同一隻神獸會得到「副本卡」。用副本卡和同班同學交換，自己的圖鑑不會減少。今天還能完成 <b>{left}</b> / {board.dailyLimit} 次交易。</p></div>
   <div className="trade-head-actions"><button className="icon-button" onClick={load} aria-label="重新整理"><RefreshCw size={17}/></button><button className="icon-button" onClick={onClose} aria-label="關閉交易所"><X size={18}/></button></div></div>
  {msg&&<p className="trade-msg" role="status">{msg}</p>}
  {incoming.length>0&&<div className="trade-block trade-inbox"><h3>📨 收到的交易邀請</h3>{incoming.map(t=><div key={t.id} className="trade-offer">
   <span><b>{t.from.name}</b> 想用 <img src={img(t.give.id)} alt=""/><b>{t.give.zhName}</b> 換你的 <img src={img(t.want.id)} alt=""/><b>{t.want.zhName}</b>{!owned.has(t.give.id)&&<em className="new-tag">新神獸！</em>}</span>
   <span className="trade-offer-actions"><button className="primary-button" disabled={busy||left===0} onClick={()=>run('/trade/accept',{id:t.id})}><Check size={15}/>接受</button><button className="ghost-button" disabled={busy} onClick={()=>run('/trade/decline',{id:t.id})}><Ban size={15}/>婉拒</button></span></div>)}</div>}
  <div className="trade-grid">
   <div className="trade-block"><h3>① 我的副本卡</h3>
    {board.myDupes.length?<div className="trade-cards">{board.myDupes.map(c=><Card key={c.id} c={c} selected={give===c.id} onClick={()=>setGive(give===c.id?null:c.id)}/>)}</div>
     :<p className="trade-empty">還沒有副本卡。在對戰中再次收服已經擁有的神獸，就會得到副本卡。</p>}</div>
   <div className="trade-block"><h3>② 選擇同學與想要的卡</h3>
    <select value={mate} onChange={e=>{setMate(e.target.value);setWant(null);}} aria-label="選擇同學"><option value="">— 選擇同班同學 —</option>{board.classmates.map(m=><option key={m.id} value={m.id}>{m.name}（副本 {m.dupes.reduce((n,c)=>n+c.count,0)} 張）</option>)}</select>
    {target&&(target.dupes.length?<div className="trade-cards">{target.dupes.map(c=><Card key={c.id} c={c} selected={want===c.id} onClick={()=>setWant(want===c.id?null:c.id)} note={owned.has(c.id)?'':'你還沒有'}/>)}</div>:<p className="trade-empty">這位同學目前沒有副本卡。</p>)}
   </div>
  </div>
  <div className="trade-send"><span>{give&&want?<>用 <b>{board.myDupes.find(c=>c.id===give)?.zhName}</b> 換 <b>{target?.dupes.find(c=>c.id===want)?.zhName}</b></>:'先選一張自己的副本卡，再選同學想交換的卡。'}</span>
   <button className="primary-button" disabled={busy||!give||!want||!mate||left===0} onClick={()=>run('/trade/offer',{toId:mate,give,want},()=>{setGive(null);setWant(null);})}>送出交易邀請</button></div>
  {outgoing.length>0&&<div className="trade-block"><h3>📤 我送出的邀請（24 小時內有效）</h3>{outgoing.map(t=><div key={t.id} className="trade-offer"><span>給 <b>{t.to.name}</b>：用 <b>{t.give.zhName}</b> 換 <b>{t.want.zhName}</b></span><button className="ghost-button" disabled={busy} onClick={()=>run('/trade/cancel',{id:t.id})}>取消</button></div>)}</div>}
  {history.length>0&&<div className="trade-block"><h3>🕘 最近紀錄</h3><ul className="trade-history">{history.map(t=><li key={t.id}><span className={`trade-status s-${t.status}`}>{STATUS[t.status]}</span>{t.mine?`我 → ${t.to.name}`:`${t.from.name} → 我`}：{t.give.zhName} ⇄ {t.want.zhName}</li>)}</ul></div>}
 </section>;
}
