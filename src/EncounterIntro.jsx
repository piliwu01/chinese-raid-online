import React,{useEffect,useRef,useState} from 'react';
import {SPIRIT_BY_ID} from '../shared/catalog.js';
// 神獸登場演出：畫面暗下、原文逐字浮現，剪影轉為彩色後退場。點一下即可略過。
// 2026-11-26：老師反映右上角「朗讀原文／略過」按鈕會一閃而過，已拿掉按鈕與朗讀功能（點畫面仍可略過）。
export default function EncounterIntro({enemy,battleId,onDone}){
 const lore=SPIRIT_BY_ID.get(enemy?.id)||{},text=lore.quote||'',[n,setN]=useState(0),[phase,setPhase]=useState('text'),done=useRef(false);
 const reduce=typeof window!=='undefined'&&window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const finish=()=>{if(done.current)return;done.current=true;onDone?.();};
 useEffect(()=>{if(!text||reduce){const t=setTimeout(finish,reduce?1600:600);return()=>clearTimeout(t);}
  const step=Math.max(45,Math.min(85,2600/text.length));let i=0;const t=setInterval(()=>{i++;setN(i);if(i>=text.length){clearInterval(t);setTimeout(()=>setPhase('reveal'),500);setTimeout(()=>setPhase('out'),1700);setTimeout(finish,2200);}},step);
  return()=>clearInterval(t);},[battleId]);
 if(!enemy)return null;
 return <div className={`encounter-intro phase-${phase}`} onClick={finish} role="dialog" aria-label={`遭遇${enemy.zhName}`}>
  <div className="intro-ink"/>
  <img className="intro-beast" src={`./assets/${enemy.id}.png`} alt=""/>
  <div className="intro-scroll"><span className="intro-name">{enemy.shiny?'✨ ':''}野生的 {enemy.zhName} 出現了！</span>
   {text&&<p className="intro-quote"><span className="lore-seal">{lore.source}</span>「{reduce?text:text.slice(0,n)}<span className="intro-caret"/>」</p>}</div>
 </div>;
}
