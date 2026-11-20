import React,{useEffect,useRef,useState} from 'react';
import {SPIRIT_BY_ID} from '../shared/catalog.js';
const store=()=>{try{return window.localStorage;}catch{return null;}};
// 神獸登場演出：畫面暗下、原文逐字浮現（可朗讀），剪影轉為彩色後退場。點一下即可略過。
export default function EncounterIntro({enemy,battleId,onDone}){
 const lore=SPIRIT_BY_ID.get(enemy?.id)||{},text=lore.quote||'',[n,setN]=useState(0),[phase,setPhase]=useState('text'),[speak,setSpeak]=useState(()=>store()?.getItem('quizspirit.readQuote')==='1'),done=useRef(false);
 const reduce=typeof window!=='undefined'&&window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const finish=()=>{if(done.current)return;done.current=true;try{window.speechSynthesis?.cancel();}catch{}onDone?.();};
 useEffect(()=>{if(!text||reduce){const t=setTimeout(finish,reduce?1600:600);return()=>clearTimeout(t);}
  const step=Math.max(45,Math.min(85,2600/text.length));let i=0;const t=setInterval(()=>{i++;setN(i);if(i>=text.length){clearInterval(t);setTimeout(()=>setPhase('reveal'),500);setTimeout(()=>setPhase('out'),1700);setTimeout(finish,2200);}},step);
  return()=>clearInterval(t);},[battleId]);
 useEffect(()=>{if(!speak||!text||!window.speechSynthesis)return;try{const u=new SpeechSynthesisUtterance(text);u.lang='zh-TW';u.rate=.9;window.speechSynthesis.speak(u);}catch{}},[battleId]);
 const toggle=e=>{e.stopPropagation();const v=!speak;setSpeak(v);try{store()?.setItem('quizspirit.readQuote',v?'1':'0');}catch{};if(!v)try{window.speechSynthesis?.cancel();}catch{}};
 if(!enemy)return null;
 return <div className={`encounter-intro phase-${phase}`} onClick={finish} role="dialog" aria-label={`遭遇${enemy.zhName}`}>
  <div className="intro-ink"/>
  <img className="intro-beast" src={`./assets/${enemy.id}.png`} alt=""/>
  <div className="intro-scroll"><span className="intro-name">{enemy.shiny?'✨ ':''}野生的 {enemy.zhName} 出現了！</span>
   {text&&<p className="intro-quote"><span className="lore-seal">{lore.source}</span>「{reduce?text:text.slice(0,n)}<span className="intro-caret"/>」</p>}</div>
  <div className="intro-tools"><button type="button" onClick={toggle} aria-pressed={speak}>{speak?'🔊 朗讀原文：開':'🔈 朗讀原文：關'}</button><button type="button" onClick={e=>{e.stopPropagation();finish();}}>略過 ▶▶</button></div>
 </div>;
}
