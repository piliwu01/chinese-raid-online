import React,{useEffect,useRef,useState} from 'react';
import {Music,VolumeX} from 'lucide-react';
import {TrackPlayer,TRACKS} from './bgm.js';
// 共同討伐／PVP 的原聲配樂與右下角開關。
const KEY='quizspirit.roomMusic';
export default function RoomMusic({theme='boss'}){
 const ref=useRef(null);
 const [on,setOn]=useState(()=>{try{return localStorage.getItem(KEY)!=='off';}catch{return true;}});
 useEffect(()=>{const p=new TrackPlayer();ref.current=p;p.configure({enabled:on,volume:0.3,theme});
  const unlock=()=>p.unlock();const vis=()=>p.configure({hidden:document.hidden});
  document.addEventListener('pointerdown',unlock);document.addEventListener('keydown',unlock);document.addEventListener('visibilitychange',vis);
  return ()=>{document.removeEventListener('pointerdown',unlock);document.removeEventListener('keydown',unlock);document.removeEventListener('visibilitychange',vis);p.dispose();ref.current=null;};},[]);
 useEffect(()=>{ref.current?.configure({enabled:on,theme});try{localStorage.setItem(KEY,on?'on':'off');}catch{}},[on,theme]);
 return <button type="button" className={`room-music ${on?'is-on':''}`} onClick={()=>setOn(v=>!v)} aria-pressed={on} title={on?`配樂：${TRACKS[theme]?.title}（點一下關閉）`:'配樂已關閉（點一下開啟）'}>{on?<Music size={18}/>:<VolumeX size={18}/>}<span>{on?TRACKS[theme]?.title:'配樂關'}</span></button>;
}
