import React,{useEffect,useState} from 'react';
import {SPIRIT_BY_ID} from '../shared/catalog.js';
import AiTutor from './AiTutor.jsx';
import {ListChecks,Gift,Sparkles,Award,Clock,Check} from 'lucide-react';
import {itemById} from '../shared/items.js';
import {rewardText} from '../shared/collection.js';
import StudyCheck from './StudyCheck.jsx';

// 冒險準備頁的三張卡片：每日任務、墨漬怪巢穴（錯題複習）、收集套組與稱號。
export default function PlayPanel({cloud,act,artwork,busy}){
 const [message,setMessage]=useState(''),[fight,setFight]=useState(null),[result,setResult]=useState(null),[left,setLeft]=useState(0);
 const quests=cloud.quests||[],nest=cloud.inkNest||[],sets=cloud.sets||[],titles=cloud.titles||[],master=cloud.master;
 const claim=x=>!x.done?null:x.claimed?<span className="quest-done"><Check size={15}/>已領取</span>:<button className="quest-claim set-claim" disabled={busy} onClick={()=>run('/collection/claim',{id:x.id})}><Gift size={15}/>領取獎勵</button>;
 const ready=nest.filter(m=>m.ready),sleeping=nest.length-ready.length;
 useEffect(()=>{if(!fight)return;const tick=()=>setLeft(Math.max(0,Math.ceil((fight.expires-Date.now())/1000)));tick();const t=setInterval(tick,250);return()=>clearInterval(t);},[fight]);
 useEffect(()=>{if(fight&&!result&&left===0&&fight.expires<Date.now())answerInk(null);},[left]);
 async function run(path,body,after){try{const r=await act(path,body);if(r.event?.message)setMessage(r.event.message);after?.(r);}catch(e){setMessage(e.message);}}
 const startInk=m=>run('/ink/start',{inkId:m.id,bankId:m.bankId},r=>{setResult(null);setFight({...r.event.question,inkId:m.id});});
 const answerInk=choice=>run('/ink/answer',{questionId:fight.id,choice},r=>{setResult(r.event);});
 return <section className="play-section" aria-label="每日任務與收藏">
  <StudyCheck cloud={cloud} act={act} busy={busy}/>
  <div className="play-grid">
   <article className="play-card quest-card">
    <span className="cloud-eyebrow">DAILY QUESTS</span><h3><ListChecks size={20}/>今日任務</h3><p>每天換新任務，完成後領取食物和道具。</p>
    <ul className="quest-list">{quests.map(q=><li key={q.id} className={q.claimed?'is-claimed':q.ready?'is-ready':''}>
     <div><b>{q.text}</b><small>獎勵：{q.food} 份食物 ＋ {itemById(q.item)?.icon} {itemById(q.item)?.name}</small><div className="quest-track"><span style={{width:`${Math.min(100,q.progress/q.need*100)}%`}}/></div></div>
     {q.claimed?<span className="quest-done"><Check size={15}/>已領取</span>:<button className="quest-claim" disabled={busy||!q.ready} onClick={()=>run('/quest/claim',{questId:q.id})}>{q.ready?<><Gift size={15}/>領取</>:`${q.progress} / ${q.need}`}</button>}
    </li>)}</ul>
   </article>
   <article className="play-card ink-card">
    <span className="cloud-eyebrow">INK NEST</span><h3>🫧 墨漬怪巢穴</h3>
    <p>答錯的題目會變成墨漬怪。隔天起答對牠就能淨化，獲得 1 份食物和 15 XP。</p>
    <div className="ink-summary"><span><b>{ready.length}</b> 隻可以淨化</span><span><b>{sleeping}</b> 隻沉睡中（明天醒來）</span></div>
    {nest.length?<div className="ink-grid">{nest.slice(-24).reverse().map(m=><button key={m.id} className={`ink-blob ${m.ready?'is-awake':''}`} disabled={busy||!m.ready} onClick={()=>startInk(m)} title={m.stem} aria-label={m.ready?`淨化墨漬怪：${m.stem}`:`沉睡中的墨漬怪：${m.stem}`}><i/><i/>{!m.ready&&<em>z</em>}</button>)}</div>:<p className="ink-empty">巢穴空空的，代表你目前沒有待複習的錯題！</p>}
   </article>
   <article className="play-card set-card">
    <span className="cloud-eyebrow">COLLECTION SETS</span><h3><Award size={20}/>收集套組</h3><p>收齊一整組神獸就能獲得專屬稱號（配戴後會顯示在共同討伐中），還能領一次獎勵。</p>
    {master&&<div className={`set-row master-row ${master.done?'is-done':''}`}><div className="set-head"><b>👑 {master.name}：集齊全部野外神獸</b><span>{master.have} / {master.total}</span></div><div className="master-bar" role="progressbar" aria-label="全部神獸收集進度" aria-valuemin={0} aria-valuemax={master.total} aria-valuenow={master.have}><i style={{width:`${master.have/master.total*100}%`}}/></div><div className="set-foot"><small className="set-reward">集齊可得最高稱號「{master.title}」＋{rewardText(master.reward)}</small>{claim(master)}</div></div>}
    <div className="set-list">{sets.map(s=><div key={s.id} className={`set-row ${s.done?'is-done':''}`}><div className="set-head"><b>{s.name}{s.rare&&<em className="set-rare">稀有</em>}</b><span>{s.done?`✔ 已得稱號「${s.title}」`:`${s.have} / ${s.ids.length}`}</span></div><div className="set-icons">{s.ids.map(id=>{const owned=(cloud.captured||[]).some(p=>p.id===id),name=SPIRIT_BY_ID.get(id)?.zhName||id;return <figure key={id} className={`set-slot ${owned?'is-owned':'is-missing'}`} title={owned?`${name}（已收服）`:`${name}（尚未收服）`}><span><img src={artwork(id)} alt="" loading="lazy"/></span><figcaption>{owned?'':'？'}{name}</figcaption></figure>;})}</div><div className="set-foot"><small className="set-reward">集齊可得稱號「{s.title}」＋{rewardText(s.reward)}</small>{claim(s)}</div></div>)}</div>
    {titles.length>0&&<label className="title-pick">配戴稱號<select value={cloud.title||''} disabled={busy} onChange={e=>run('/title',{title:e.target.value})}><option value="">不配戴</option>{titles.map(t=><option key={t} value={t}>{t}</option>)}</select></label>}
   </article>
  </div>
  {message&&<p className="play-message" role="status">{message}</p>}
  {fight&&<div className="ink-modal" role="dialog" aria-modal="true" aria-label="淨化墨漬怪">
   <div className="ink-modal-card">
    <div className="ink-modal-head"><span className="ink-blob is-awake big"><i/><i/></span><div><span className="cloud-eyebrow">PURIFY</span><h3>淨化墨漬怪</h3></div>{!result&&<span className="ink-timer"><Clock size={14}/>{left}s</span>}</div>
    <p className="ink-question">{fight.question}</p>
    {!result?<div className="ink-options">{fight.options.map(o=><button key={o} disabled={busy} onClick={()=>answerInk(o)}><b>{o}</b>{fight.optionTexts?.[o]}</button>)}</div>
    :<div className={`ink-result ${result.correct?'ok':'no'}`}><h4>{result.correct?<><Sparkles size={18}/>淨化成功！</>:'墨漬怪還在…'}</h4><p>正確答案：{result.answerText}</p><p className="ink-explain">{result.explanation}</p><p>{result.message}</p><AiTutor feedback={result}/></div>}
    <div className="ink-modal-foot">{!result&&<button className="pvp-quiet" disabled={busy} onClick={()=>answerInk(null)}>放棄這題</button>}{result&&<button className="primary-button" onClick={()=>{setFight(null);setResult(null);}}>回到巢穴</button>}</div>
   </div>
  </div>}
 </section>;
}
