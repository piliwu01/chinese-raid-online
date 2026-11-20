import React from 'react';
import {Lock,MapPin} from 'lucide-react';
// 山海輿圖：選擇要冒險的篇章；在一章打倒或收服 3 隻即可前往下一章。
export default function ChapterMap({chapters=[],current=1,onPick,busy,schedule}){
 const f=schedule?.featured;
 return <section className="chapter-map" aria-label="山海輿圖">
  <div className="chapter-map-head"><div><span className="section-label">MAP OF MOUNTAINS AND SEAS</span><h2>山海輿圖</h2><p>選一個篇章出發，只會遇到原典記在那一章的神獸。在一章打倒或收服 3 隻，就能前往下一章。</p></div>
   {f&&<div className="weekly-beast"><img src={`/assets/${f.id}.png`} alt=""/><div><span>⭐ 本週神獸</span><b>{f.zhName}</b><small>在第 {['一','二','三','四','五','六'][f.chapter-1]} 章出現率提高，每週一更換</small></div></div>}
  </div>
  <p className="night-note">{schedule?.night?'🌙 現在是夜晚：夜間限定的燭陰、三青鳥已在「海外・大荒」出沒！':'🌙 夜間限定：燭陰、三青鳥只在晚上 6 點到清晨 5 點出現。'}</p>
  <ol className="chapter-path">{chapters.map((c,i)=><li key={c.id} className={`chapter-node ${c.unlocked?'':'is-locked'} ${current===c.id?'is-current':''}`}>
   <button type="button" disabled={!c.unlocked||busy} onClick={()=>onPick(c.id)} aria-pressed={current===c.id} style={{backgroundImage:`url(/assets/bg-${c.bgs[0]}.png)`}}>
    <span className="chapter-no">第 {['一','二','三','四','五','六'][i]} 章</span>
    <b>{c.name}</b><small>{c.place}</small>
    <em>{c.unlocked?`${c.count} 種神獸 · 勝場 ${Math.min(c.wins,c.need)}/${c.need}`:'尚未解鎖'}</em>
    {c.featured&&c.unlocked&&<span className="chapter-star">⭐ 本週神獸</span>}{c.unlocked?(current===c.id&&<span className="chapter-here"><MapPin size={14}/>目前所在</span>):<span className="chapter-lock"><Lock size={16}/></span>}
   </button>
   <p className="chapter-blurb">{c.blurb}</p>
  </li>)}</ol>
 </section>;
}
