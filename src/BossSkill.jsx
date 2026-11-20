import React,{useEffect,useRef,useState} from 'react';
import {BOSS_SKILLS} from '../shared/raid-skills.js';
// 魔王干擾技能：預告／施放中的橫幅（投影與學生畫面共用）
export function SkillBanner({room,now,compact=false}){
 const sk=room.skill;if(!sk?.id||!['active','paused'].includes(room.status))return null;
 const def=BOSS_SKILLS[sk.id];const left=Math.max(0,Math.ceil((sk.until-now)/1000));
 if(sk.stage==='warn')return <div className={`boss-skill-warn ${compact?'is-compact':''}`} role="alert"><b>⚠️ {def.warn}</b><span>{left} 秒後發動「{def.name}」{sk.id==='ward'?'，快準備一起答對！':''}</span></div>;
 const detail=sk.id==='ward'?`還需全班答對 ${sk.wardLeft} 題擊破（${sk.wardNeed-sk.wardLeft}/${sk.wardNeed}）`:sk.id==='curse'?`答錯每次全班護盾 −2 · 剩 ${left} 秒`:sk.id==='fog'?(sk.fogMe?`你的選項被墨霧遮住了，抹開它！`:`${sk.fogCount} 位同學被墨霧籠罩 · 剩 ${left} 秒`):`選項順序已打亂 · 剩 ${left} 秒`;
 return <div className={`boss-skill-active skill-${sk.id} ${compact?'is-compact':''}`} role="status"><b>{def.icon} {def.name}</b><span>{detail}</span>{sk.id==='ward'&&<i className="ward-bar"><em style={{width:`${(sk.wardNeed-sk.wardLeft)/sk.wardNeed*100}%`}}/></i>}</div>;
}
// 亂序咒：每題只打亂一次（同一題之後不再換位置）
export function useShuffledOptions(room,q){
 const memo=useRef({});const sk=room.skill;
 if(q&&sk?.id==='shuffle'&&sk.stage==='active'&&!memo.current[q.id]){
  let h=(sk.seed||1)>>>0;for(const c of String(q.id))h=(h*31+c.charCodeAt(0))>>>0;
  const rnd=()=>{h^=h<<13;h>>>=0;h^=h>>>17;h^=h<<5;h>>>=0;return h/4294967296;};
  const idx=q.options.map((_,i)=>i);for(let i=idx.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[idx[i],idx[j]]=[idx[j],idx[i]];}
  if(idx.every((v,i)=>v===i)&&idx.length>1)idx.push(idx.shift());memo.current[q.id]=idx;
 }
 const order=q&&memo.current[q.id];return q?(order?order.map(i=>q.options[i]):q.options):[];
}
// 墨霧：蓋住選項，用手指或滑鼠抹開（抹掉七成或時間到就消失）
const COLS=8,ROWS=5;
export function FogOverlay({until,now}){
 const [cleared,setCleared]=useState(()=>new Set());const ref=useRef(null);const done=cleared.size>=COLS*ROWS*0.7||now>=until;
 useEffect(()=>{setCleared(new Set());},[until]);
 if(done)return null;
 const wipe=e=>{const r=ref.current?.getBoundingClientRect();if(!r)return;const x=Math.floor((e.clientX-r.left)/r.width*COLS),y=Math.floor((e.clientY-r.top)/r.height*ROWS);if(x<0||y<0||x>=COLS||y>=ROWS)return;
  setCleared(prev=>{const n=new Set(prev);for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){const cx=x+dx,cy=y+dy;if(cx>=0&&cy>=0&&cx<COLS&&cy<ROWS)n.add(cy*COLS+cx);}return n;});};
 return <div ref={ref} className="ink-fog" onPointerMove={wipe} onPointerDown={wipe} aria-label="墨霧遮住了選項，在上面抹一抹就能擦掉">
  {Array.from({length:COLS*ROWS},(_,i)=><span key={i} className={cleared.has(i)?'gone':''}/>)}
  <b>🌫️ 抹開墨霧</b>
 </div>;
}
