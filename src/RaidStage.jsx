import SceneBg from './SceneBg.jsx';
import React,{useEffect,useRef,useState} from 'react';
import {SkillBanner} from './BossSkill.jsx';
import {BossIntro,SkillSweep} from './RaidFx.jsx';
import {Swords,Shield,Clock,Zap,Users} from 'lucide-react';
import {fxFor,shake,motionFor,idleStyle} from './fx.js';
import {api} from './api.js';
import {collectStageEvents,formation,effectLabel,EFFECT_LIFETIME,roomIdentity} from './raid-stage.js';
import './raid-stage.css';

// 魔王反擊時墨汁潑濺的位置：[x%, y%, 尺寸(cqw), 延遲ms]，集中在右側隊伍區。
const INK=[[58,30,13,0],[74,24,10,90],[88,40,15,40],[66,55,17,130],[82,68,12,60],[52,72,11,170],[94,78,9,210],[70,86,10,120],[46,44,8,240]];
const clock=n=>`${String(Math.floor(Math.max(0,n)/60)).padStart(2,'0')}:${String(Math.max(0,n)%60).padStart(2,'0')}`;
export function RaidVitals({room,remaining,strike,compact=false}){
 return <div className={`raid-vitals ${compact?'is-compact':''}`}>
  <div className="vital-boss"><span><Swords size={14}/>魔王生命</span><b>{room.hp.toLocaleString()}<small> / {room.maxHp.toLocaleString()||'等待開戰'}</small></b><div className="raid-meter boss-meter" role="progressbar" aria-label="魔王生命值" aria-valuemin={0} aria-valuemax={room.maxHp||1} aria-valuenow={room.hp}><span style={{width:`${room.maxHp?room.hp/room.maxHp*100:100}%`}}/></div></div>
  <div className={`vital-shield ${room.shield<=30?'danger':''}`}><span><Shield size={14}/>全班護盾</span><b>{room.shield}<small> / 100</small></b><div className="raid-meter shield-meter" role="progressbar" aria-label="全班護盾" aria-valuemin={0} aria-valuemax={100} aria-valuenow={room.shield}><span style={{width:`${room.shield}%`}}/></div></div>
  <div className="vital-clock"><span><Clock size={14}/>剩餘時間</span><b>{clock(remaining)}</b></div>
  <div className="vital-strike"><span><Zap size={14}/>魔王反擊</span><b>{['active','paused'].includes(room.status)?`${strike}s`:'—'}</b></div>
 </div>;
}
// 全班連擊條：10 秒內全班答對達門檻就觸發合體大招；舊的命中會隨時間從條上消失。
export function ClassCombo({room,now,compact=false}){
 const c=room.classCombo;if(!c||!['active','paused'].includes(room.status))return null;
 const count=(c.hits||[]).filter(t=>now-t<c.window&&now>=t-2000).length,cooling=c.cooldownUntil>now,pct=Math.min(100,count/c.need*100);
 return <div className={`class-combo ${compact?'is-compact':''} ${cooling?'is-cooling':''} ${pct>=66?'is-hot':''}`} role="status" aria-label={`全班連擊 ${count} / ${c.need}`}>
  <span className="cc-label">{cooling?'合體技冷卻中':'全班連擊'}</span>
  <div className="cc-track">{Array.from({length:c.need},(_,i)=><i key={i} className={i<count?'on':''}/>)}</div>
  <b>{cooling?`${Math.ceil((c.cooldownUntil-now)/1000)}s`:`${count} / ${c.need}`}</b>
  {!compact&&!cooling&&<small>10 秒內全班答對 {c.need} 題，發動合體大招！</small>}
 </div>;
}
export function WeakBanner({room,now,compact=false}){
 const w=room.weakness;if(room.phase!==2||!w||!['active','paused'].includes(room.status))return null;
 return <div className={`weak-banner ${compact?'is-inline':''}`} role="status"><span>弱點題型</span><b>{w.category}</b><small>傷害 ×2 · 剩 {Math.max(0,Math.ceil((w.until-now)/1000))} 秒</small></div>;
}
export function RaidStatuses({room,now}){
 return <div className="stage-statuses">{room.stunUntil>now&&<span>💫 暈眩 {Math.ceil((room.stunUntil-now)/1000)} 秒</span>}{room.poisonTicks>0&&<span>🧪 毒傷剩 {room.poisonTicks} 次</span>}{room.guardCharges>0&&<span>💎 守護 {room.guardCharges} 波</span>}{room.drumUntil>now&&<span>🥁 戰鼓 {Math.ceil((room.drumUntil-now)/1000)} 秒</span>}</div>;
}
const TAUNT_FALLBACK={start:'區區學子，也敢挑戰本座？',boss:'墨浪滔天，看你們如何招架！',phase:'本座怒矣！墨焰焚書！',ultimate:'這……這是什麼合體之術！',low:'本座……尚未言敗！'};
function useBossTaunt(room,incoming){
 const [line,setLine]=useState(null),last=useRef({at:0,kinds:new Set()}),code=room.code;
 const say=kind=>{const t=Date.now(),major=kind==='phase'||kind==='ultimate'||kind==='low';if(!major&&t-last.current.at<15000)return;last.current.at=t;
  const show=text=>setLine({text,key:t});api(`/raid/${code}/taunt`,{requestId:crypto.randomUUID().replaceAll('-',''),kind}).then(r=>show(r.text||TAUNT_FALLBACK[kind])).catch(()=>show(TAUNT_FALLBACK[kind]));};
 useEffect(()=>{if(!line)return;const timer=setTimeout(()=>setLine(null),5200);return()=>clearTimeout(timer);},[line]);
 useEffect(()=>{if(room.status==='active'&&!last.current.kinds.has('start')){last.current.kinds.add('start');if(Date.now()-(room.startedAt||0)<30000||!room.startedAt)say('start');}},[room.status]);
 useEffect(()=>{if(!incoming.length)return;const types=new Set(incoming.map(e=>e.type));const kind=types.has('ultimate')?'ultimate':types.has('phase')?'phase':types.has('boss')?'boss':null;if(kind)say(kind);},[incoming]);
 useEffect(()=>{if(room.status==='active'&&room.hp>0&&room.hp<=room.maxHp*.15&&!last.current.kinds.has('low')){last.current.kinds.add('low');say('low');}},[room.hp]);
 return line;
}
export default function RaidStage({room,now,remaining,strike,onExit}){
 const [fresh,setFresh]=useState([]);const cursor=useRef(null),effectId=useRef(0),arenaRef=useRef(null),[size,setSize]=useState({width:1200,height:600}),[effects,setEffects]=useState([]),[reduced,setReduced]=useState(false);
 const positions=formation(room.members),members=new Map(positions.map(m=>[m.id,m]));
 const columns=Math.min(10,Math.max(3,Math.ceil(Math.sqrt(room.members.length*1.6)))),rows=Math.max(1,Math.ceil(room.members.length/columns));
 const spriteSize=Math.max(20,Math.min(90,size.width*.065,size.width*.46/columns*.9,size.height*.47/Math.max(1,rows-1)-(room.members.length>36?24:40)));
 useEffect(()=>{const observer=new ResizeObserver(entries=>{const {width,height}=entries[0].contentRect;setSize({width,height});});observer.observe(arenaRef.current);return()=>observer.disconnect();},[]);
 useEffect(()=>{
  const media=matchMedia('(prefers-reduced-motion: reduce)'),change=()=>setReduced(media.matches);change();media.addEventListener('change',change);return()=>media.removeEventListener('change',change);
 },[]);
 useEffect(()=>{
  const switched=cursor.current?.identity!==roomIdentity(room),result=collectStageEvents(cursor.current,room);cursor.current=result.cursor;
  const incoming=result.events.map(e=>({...e,key:++effectId.current,remaining:EFFECT_LIFETIME}));
  setEffects(previous=>switched?[]:[...previous,...incoming]);if(!switched&&incoming.length)setFresh(incoming);
  if(!switched&&arenaRef.current){if(incoming.some(e=>e.type==='ultimate'||e.type==='phase'))shake(arenaRef.current,14,800);else if(incoming.some(e=>e.type==='boss'))shake(arenaRef.current,11,650);else if(incoming.some(e=>e.hard||e.weak))shake(arenaRef.current,6,420);}
 },[room]);
 useEffect(()=>{
  if(room.status==='paused')return;
  let last=performance.now();const timer=setInterval(()=>{const now=performance.now(),elapsed=now-last;last=now;setEffects(previous=>previous.length?previous.map(e=>({...e,remaining:e.remaining-elapsed})).filter(e=>e.remaining>0):previous);},100);
  return()=>clearInterval(timer);
 },[room.status]);
 const taunt=useBossTaunt(room,fresh);
 const bossHits=effects.filter(e=>['hit','strong','fire','poison','ultimate'].includes(e.type)),counter=effects.filter(e=>e.type==='boss').at(-1),ultimate=effects.filter(e=>e.type==='ultimate').at(-1),phaseFx=effects.filter(e=>e.type==='phase').at(-1),last=effects.at(-1);
 return <>
  <RaidVitals room={room} remaining={remaining} strike={strike}/>
  <ClassCombo room={room} now={now}/>
  <section ref={arenaRef} className={`raid-arena ${room.phase===2?'is-phase2':''} ${ultimate?'is-ultimate':''} ${room.status==='paused'?'is-paused':''} ${reduced?'reduced-motion':''} ${counter?'is-countering':''} ${room.members.length>36?'is-crowded':''}`} aria-label={`全班共同戰場，${room.members.length} 位角色`} style={{'--formation-columns':columns}}>
   <div className="stage-moon"/><div className="stage-ridge ridge-back"/><div className="stage-ridge ridge-front"/><div className="stage-floor"/><SceneBg name="raid"/>
   <div className="raid-stage-caption"><span>CLASS RAID · LIVE BATTLE</span><h2>暮光裂隙</h2><p>每一位夥伴，都在這裡。</p></div>
   <RaidStatuses room={room} now={now}/>
   <WeakBanner room={room} now={now}/><SkillBanner room={room} now={now}/><SkillSweep room={room} now={now}/><BossIntro room={room} now={now}/>
   <div className={`stage-boss ${bossHits.length?'is-hit':''} ${room.stunUntil>now?'is-stunned':''}`}>
    <div className="stage-boss-aura"/><div className="stage-boss-shadow"/>
    <img src="/assets/boss.png" alt="魔王墨卷魔神"/>
    <div className="stage-boss-name"><span>RAID BOSS</span><h3>墨卷魔神 · 國文試煉{room.phase===2&&<em className="phase-tag">暴走</em>}</h3></div>
    {taunt&&<div key={taunt.key} className="boss-taunt" role="status">{taunt.text}</div>}
    {room.stunUntil>now&&<span className="boss-condition">💫 暈眩中</span>}
    {room.poisonTicks>0&&<span className="boss-poison">毒霧侵蝕中</span>}
   </div>
   <div className="formation-title"><Users size={14}/>我們的隊伍 <b>{room.members.length}</b><span>{room.members.filter(m=>m.online).length} 人在線</span></div>
   {positions.map(m=>{
    const action=effects.filter(e=>e.actorId===m.id).at(-1),attacking=(action&&['hit','strong','fire'].includes(action.type))||!!ultimate,supporting=action&&!attacking;
    return <div key={m.id} className={`stage-unit ${attacking?'is-attacking':''} ${supporting?'is-supporting':''} ${m.online?'is-online':'is-offline'}`} style={{left:`${m.x}%`,top:`${m.y}%`,'--sprite-size':`${spriteSize}px`}} data-member-id={m.id}>
     <div className="unit-plinth"/><div className="unit-sprite" key={ultimate?`u${ultimate.key}`:action?.key||'idle'}><img className={`idle-${motionFor(m.partner.type)}${m.partner.shiny?' is-shiny':''}`} style={idleStyle(m.partner.id+m.x)} src={`/assets/${m.partner.id}.png`} alt={`${m.name}的${m.nickname||m.partner.zhName}`} loading="eager"/></div>
     <span className="unit-name" title={m.name}><i/>{m.name}</span><small className="unit-partner">{m.title?<em className="unit-title">「{m.title}」</em>:null}{m.nickname||m.partner.zhName}</small>
    </div>;
   })}
   {!positions.length&&<div className="stage-empty"><Users size={25}/><h3>等待夥伴入場</h3><p>學生加入後，角色會出現在這裡。</p></div>}
   <svg className="stage-attack-layer" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true">
    {effects.filter(e=>e.actorId&&members.has(e.actorId)&&['hit','strong','fire','poison'].includes(e.type)).map(e=>{const m=members.get(e.actorId),x=m.x*10,y=m.y*6-22,fx=fxFor(m.partner?.type);return <g key={e.key} className={`stage-attack attack-${e.type} trail-${fx.kind}`} style={{color:fx.color}}><path pathLength="1" d={`M ${x} ${y} Q ${x*.6} ${Math.max(40,y-100)} 240 285`}/><circle cx="240" cy="285" r={e.type==='strong'?34:19}/></g>;})}
    {counter&&<g key={counter.key} className="stage-counter"><path pathLength="1" d="M 245 290 Q 500 150 830 330"/><ellipse cx="740" cy="350" rx="220" ry="170"/></g>}
   </svg>
   <div className="stage-fx" aria-hidden="true">
    {effects.filter(e=>e.actorId&&members.has(e.actorId)&&['hit','strong','fire'].includes(e.type)).map(e=>{const m=members.get(e.actorId),fx=fxFor(m.partner?.type);return <div key={e.key} className={`fx-shot fx-${fx.kind} ${e.hard?'is-crit':''} ${e.type==='strong'?'is-strong':''}`} style={{'--x0':`${m.x}%`,'--y0':`${m.y-5}%`,'--fx':fx.color,'--fx-glow':fx.glow}}>
     {fx.kind!=='bolt'&&[0,1,2].map(i=><i key={i} style={{animationDelay:`${i*80}ms`}}><b/></i>)}
     <div className="fx-impact">{Array.from({length:8},(_,i)=><s key={i} style={{'--a':`${i*45}deg`}}/>)}</div>
     {e.hard&&<div className="fx-crit"><small>難題命中！</small><strong>−{e.value}</strong></div>}
    </div>;})}
    {ultimate&&<div key={ultimate.key} className="fx-ultimate">{positions.map(m=>{const fx=fxFor(m.partner?.type);return <div key={m.id} className={`fx-shot fx-${fx.kind==='bolt'?'orb':fx.kind} is-strong`} style={{'--x0':`${m.x}%`,'--y0':`${m.y-5}%`,'--fx':fx.color,'--fx-glow':fx.glow}}><i style={{animationDelay:`${(m.joinOrder||0)%6*40}ms`}}><b/></i></div>;})}<div className="ult-flash"/><div className="ult-burst"/><div className="ult-text"><small>全班合體技！</small><strong>−{ultimate.value}</strong><span>魔王暈眩 10 秒</span></div></div>}
    {phaseFx&&<div key={phaseFx.key} className="phase-announce"><small>PHASE 2</small><strong>墨卷魔神暴走了！</strong><span>攻擊力 ×1.5 · 反擊加快{phaseFx.weak?` · 弱點：${phaseFx.weak}題 傷害 ×2`:''}</span></div>}
    {counter&&<div key={counter.key} className="fx-ink">{INK.map((b,i)=><i key={i} style={{left:`${b[0]}%`,top:`${b[1]}%`,'--s':b[2],animationDelay:`${b[3]}ms`}}/>)}<div className="fx-vignette"/></div>}
   </div>
   <div className="stage-floats" aria-hidden="true">{effects.map(e=>{const m=members.get(e.actorId);if(!m)return null;return <div key={e.key} data-actor-id={e.actorId} data-event-sequence={e.sequence} className={`stage-float float-${e.type}`} style={{left:`${m.x}%`,top:`${m.y}%`,'--float-shift':`${(e.sequence%3-1)*8}px`}}><span>{m.name}</span><b>{effectLabel(e)}</b></div>;})}</div>
   {counter&&<div key={counter.key} className="counter-announcement"><Shield size={22}/>{counter.text}</div>}
   {room.status==='paused'&&<div className="arena-pause"><span>Ⅱ</span>老師暫停中 · 夥伴原地待命</div>}
   {!['active','paused','waiting'].includes(room.status)&&<div className={`arena-outcome outcome-${room.status}`}><span>{room.status==='won'?'VICTORY':'BATTLE COMPLETE'}</span><strong>{room.status==='won'?'討伐成功！':room.status==='lost'?'護盾耗盡':room.status==='timeout'?'時間到':'本場已結束'}</strong><small>謝謝每一位夥伴的努力</small>{onExit&&<button type="button" className="primary-button exit-main" onClick={onExit}>回到主畫面</button>}</div>}
   <div className="arena-bottom"><div><i/>{room.status==='active'?'全班即時共鬥':room.status==='waiting'?'夥伴集結中':'共同守護的每一刻'}<small>角色依加入順序固定站位</small></div><p role="status">{last?.text||room.events[0]?.text||'帶著你的夥伴，一起出發。'}</p></div>
  </section>
 </>;
}
