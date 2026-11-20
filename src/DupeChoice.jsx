import React,{useState} from 'react';
import {DUPE_CONVERT,convertAmount} from '../shared/dupes.js';
// 重複卡的選擇：保留（可交易）或轉化成其他物品。count＝目前副本卡張數。
export default function DupeChoice({id,zhName,count,act,busy,onDone,compact=false}){
 const [msg,setMsg]=useState(''),[left,setLeft]=useState(count),[working,setWorking]=useState(false);
 const [kept,setKept]=useState(false);
 if(kept||!(left>0))return msg?<p className="dupe-msg" role="status">{msg}</p>:null;
 async function convert(to){setWorking(true);try{const r=await act('/dupe/convert',{id,to});setLeft(r.event.convert.left);setMsg(`✅ 已轉化為 ${r.event.convert.label} ×${r.event.convert.amount}${r.event.convert.rare?'（稀有加倍）':''}`);onDone?.(r.event.convert);}catch(e){setMsg('❌ '+e.message);}finally{setWorking(false);}}
 return <div className={`dupe-choice ${compact?'is-compact':''}`}>
  <p><b>🎴 {zhName} 副本卡 ×{left}</b>{!compact&&<span>要保留拿去交換，還是轉化成其他物品？</span>}</p>
  <div className="dupe-actions">
   {onDone&&!compact&&<button type="button" className="dupe-keep" onClick={()=>{setKept(true);setMsg('👍 已保留副本卡，可以到「卡牌交易」和同學交換。');onDone(null);}} disabled={working}>保留副本卡</button>}
   {Object.entries(DUPE_CONVERT).map(([k,o])=><button key={k} type="button" className="dupe-convert" disabled={busy||working} onClick={()=>convert(k)}>轉化：{o.icon} {o.label} ×{convertAmount(id,k)}</button>)}
  </div>
  {msg&&<p className="dupe-msg" role="status">{msg}</p>}
 </div>;
}
