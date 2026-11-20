import React,{useEffect} from 'react';
import DupeChoice from './DupeChoice.jsx';
import {X,CheckCircle2,Lock} from 'lucide-react';
import {SPIRIT_BY_ID,REGIONS} from '../shared/catalog.js';
import {setFor} from '../shared/play.js';

// 圖鑑大圖：點卡片後顯示大張神獸圖、原文與出處；已收服者可在此設為出戰夥伴。
export default function SpiritDetail({spirit,typeLabel,usable,current,onUse,onClose,owned=[],schedule,dupes=0,act,busy}){
 useEffect(()=>{const key=e=>{if(e.key==='Escape')onClose();};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[onClose]);
 if(!spirit)return null;
 const lore=SPIRIT_BY_ID.get(spirit.id)||{},region=REGIONS.find(r=>r.gen===lore.gen)?.name,set=setFor(spirit.id),have=new Set(owned);
 return <div className="spirit-detail-backdrop" role="dialog" aria-modal="true" aria-label={`${spirit.zhName}的圖鑑`} onClick={onClose}>
  <div className={`spirit-detail type-${spirit.type}`} onClick={e=>e.stopPropagation()}>
   <button className="spirit-detail-close" onClick={onClose} aria-label="關閉"><X size={22}/></button>
   <div className="spirit-detail-art">{spirit.shiny&&<span className="shiny-tag">✨ 閃光</span>}<img className={spirit.shiny?'is-shiny':''} src={`./assets/${spirit.id}.png`} alt={spirit.zhName}/></div>
   <div className="spirit-detail-info">
    <span className="spirit-detail-no">No. {spirit.id}{region?` ・ ${region}`:''}</span>
    <h2>{spirit.zhName}<small>{spirit.name}</small></h2>
    <span className={`type-badge type-${spirit.type}`}>{typeLabel(spirit)}屬性</span>{schedule?.nightOnly?.includes(spirit.id)&&<span className="card-time">🌙 夜間限定（18:00–05:00）</span>}{schedule?.featured?.id===spirit.id&&<span className="card-time is-star">⭐ 本週神獸 · 出現率提高</span>}
    {lore.quote&&<div className="spirit-detail-lore"><span className="lore-seal">{lore.source}</span><p>「{lore.quote}」</p></div>}
    {dupes>0&&act&&<DupeChoice key={spirit.id} id={spirit.id} zhName={lore.zhName||spirit.zhName} count={dupes} act={act} busy={busy} compact/>}{set?<div className="spirit-detail-set"><div><b>🏷 所屬套組：{set.name}</b><span>{set.ids.filter(id=>have.has(id)).length} / {set.ids.length}</span></div><ul>{set.ids.map(id=><li key={id} className={have.has(id)?'is-owned':''}>{have.has(id)?'✔':'○'} {SPIRIT_BY_ID.get(id)?.zhName}</li>)}</ul><small>集齊 4 隻可得稱號「{set.title}」</small></div>
    :lore.quote&&<p className="spirit-detail-noset">這隻神獸不屬於任何收集套組，可自由收服。</p>}
    <div className="spirit-detail-actions">
     {current?<span className="spirit-detail-state"><CheckCircle2 size={18}/>目前出戰夥伴</span>
      :usable?<button className="primary-button" onClick={()=>{onUse(spirit);onClose();}}>設為出戰夥伴</button>
      :<span className="spirit-detail-state is-locked"><Lock size={16}/>尚未收服，在對戰中把牠收服吧！</span>}
    </div>
   </div>
  </div>
 </div>;
}
