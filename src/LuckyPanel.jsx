import React,{useState} from 'react';
import DupeChoice from './DupeChoice.jsx';
import {X} from 'lucide-react';
const art=id=>`/assets/${id}.png`;
const pct=x=>`${Math.round(x*100)}%`;
// 山海福運：每日山海籤、答題寶箱、祈福天燈。
export default function LuckyPanel({cloud,act,artwork,busy}){
 const l=cloud.lucky||{},[show,setShow]=useState(null),[err,setErr]=useState(''),[working,setWorking]=useState(false);
 async function run(path,kind){setErr('');setWorking(true);setShow({kind,phase:'anim'});try{const r=await act(path,{});const e=r.event;setTimeout(()=>setShow({kind,phase:'result',data:e}),kind==='fortune'?1300:kind==='chest'?1100:1500);}catch(e){setShow(null);setErr(e.message);}finally{setTimeout(()=>setWorking(false),1500);}}
 const fortune=l.lastFortune;
 return <section className="lucky-panel" aria-label="山海福運">
  <div className="lucky-head"><div><span className="section-label">FORTUNE OF MOUNTAINS AND SEAS</span><h2>山海福運</h2><p>獎勵都來自學習：每答對 {l.perJade||20} 題得 1 枚玉符（每天最多 {l.jadeDailyMax||3} 枚）。</p></div>
   <div className="jade-count"><img src={art('item-jade')} alt=""/><div><b>{l.jade||0}</b><small>玉符</small></div><span className="jade-progress"><i style={{width:pct((l.progress||0)/(l.perJade||20))}}/></span><small>下一枚：{l.progress||0}/{l.perJade||20} 題 · 今日 {l.jadeToday||0}/{l.jadeDailyMax||3}</small></div></div>
  {err&&<p className="trade-msg">{err}</p>}
  <div className="lucky-grid">
   <article className="lucky-card"><img src={art('item-fortune')} alt=""/><h3>每日山海籤</h3><p>每天免費抽一支，籤面是一句《山海經》原文，附白話與今日讀書建議。</p>
    {l.fortuneToday&&fortune?<button className="ghost-button" onClick={()=>setShow({kind:'fortune',phase:'result',data:fortune})}>看今天的籤：{fortune.level}</button>:<button className="primary-button" disabled={busy||working} onClick={()=>run('/fortune/draw','fortune')}>搖籤筒</button>}
    <small>上上籤 10% · 上籤 30% · 中籤 45% · 小吉 15%</small></article>
   <article className="lucky-card"><img src={art('item-chest')} alt=""/><h3>答題寶箱 <em>×{l.chests||0}</em></h3><p>完成一輪 10 題、每淨化 5 隻墨漬怪、在共同討伐拿下傷害或修復第 1 名，都能得到寶箱。</p>
    <button className="primary-button" disabled={busy||working||!l.chests} onClick={()=>run('/chest/open','chest')}>{l.chests?'打開寶箱':'還沒有寶箱'}</button>
    <small>食物 55% · 道具 28% · 玉符 14% · 大獎 3%</small></article>
   <article className="lucky-card"><img src={art('item-lantern')} alt=""/><h3>祈福天燈</h3><p>花 1 枚玉符點一盞天燈，隨機得到一張神獸副本卡，可拿去卡牌交易所交換。</p>
    <button className="primary-button" disabled={busy||working||!l.jade} onClick={()=>run('/lantern/pull','lantern')}>{l.jade?'點亮天燈（1 玉符）':'玉符不足'}</button>
    <small>稀有神獸 {pct(l.rareRate||0.08)} · 保底：{(l.pityMax||10)-(l.pity||0)} 次內必出稀有 · 本週神獸機率提高</small></article>
  </div>
  {show&&<div className="lucky-modal" role="dialog" aria-modal="true" onClick={()=>show.phase==='result'&&setShow(null)}>
   <div className={`lucky-stage kind-${show.kind} phase-${show.phase}`} onClick={e=>e.stopPropagation()}>
    {show.phase==='result'&&<button className="spirit-detail-close" onClick={()=>setShow(null)} aria-label="關閉"><X size={20}/></button>}
    {show.phase==='anim'&&<div className="lucky-anim"><img src={art(show.kind==='fortune'?'item-fortune':show.kind==='chest'?'item-chest':'item-lantern')} alt=""/><p>{show.kind==='fortune'?'搖籤中…':show.kind==='chest'?'開箱中…':'天燈冉冉升起…'}</p></div>}
    {show.phase==='result'&&show.kind==='fortune'&&<Fortune f={show.data}/>}
    {show.phase==='result'&&show.kind==='chest'&&<Chest r={show.data}/>}
    {show.phase==='result'&&show.kind==='lantern'&&<Lantern r={show.data} artwork={artwork} act={act} busy={busy}/>}
   </div></div>}
 </section>;
}
function Rewards({food,jade,item,item2}){const list=[food&&`食物 ×${food}`,jade&&`玉符 ×${jade}`,item&&`${item.name} ×1`,item2&&`${item2.name} ×1`].filter(Boolean);return list.length?<p className="lucky-rewards">獲得：{list.join('、')}</p>:null;}
function Fortune({f}){return <div className="fortune-slip"><span className={`fortune-level lv-${f.level}`}>{f.level}</span>
 <p className="fortune-quote"><span className="lore-seal">{f.beast.source}</span>「{f.beast.quote}」</p>
 <p className="fortune-plain"><b>白話</b>{f.beast.zhName}：{f.beast.plain}</p><p className="fortune-advice"><b>籤解</b>{f.advice}</p><Rewards food={f.food} jade={f.jade} item={f.item}/></div>;}
function Chest({r}){return <div className="chest-result"><h3>{r.kind==='jackpot'?'🎉 大獎！':'寶箱打開了！'}</h3><Rewards {...r}/></div>;}
function Lantern({r,artwork,act,busy}){return <div className={`lantern-result ${r.rare?'is-rare':''}`}><span className="lantern-tag">{r.rare?(r.pityHit?'✨ 保底稀有！':'✨ 稀有神獸！'):'天燈帶來了…'}</span>
 <img src={artwork(r.id)} alt=""/><h3>{r.zhName}</h3><p>獲得「{r.zhName}」副本卡（現有 {r.count} 張）{r.owned?'':'，你還沒收服本體，可以拿去交換或在野外收服牠！'}</p>{act&&<DupeChoice id={r.id} zhName={r.zhName} count={1} act={act} busy={busy} onDone={()=>{}}/>}</div>;}
