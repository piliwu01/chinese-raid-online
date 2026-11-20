import React,{useEffect,useRef,useState} from 'react';
import {ChevronLeft,ChevronRight,X} from 'lucide-react';
// 遊戲說明懶人包：6 張直式圖卡，左右切換（按鈕、方向鍵、手機左右滑）。
const PAGES=['第一次使用','選你的夥伴','打怪方式','收服神獸','每天變強','和同學一起玩'];
export default function GuideViewer({onClose}){
 const [i,setI]=useState(0);const touch=useRef(null);const n=PAGES.length;
 const go=d=>setI(x=>Math.min(n-1,Math.max(0,x+d)));
 useEffect(()=>{const k=e=>{if(e.key==='ArrowRight')go(1);else if(e.key==='ArrowLeft')go(-1);else if(e.key==='Escape')onClose();};window.addEventListener('keydown',k);return ()=>window.removeEventListener('keydown',k);},[]);
 useEffect(()=>{if(i+1<n){const im=new Image();im.src=`/guide/${i+2}.webp`;}},[i]);
 return <div className="guide-overlay" role="dialog" aria-modal="true" aria-label="遊戲說明" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
  <section className="guide-viewer" onTouchStart={e=>{touch.current=e.touches[0].clientX;}} onTouchEnd={e=>{if(touch.current==null)return;const dx=e.changedTouches[0].clientX-touch.current;touch.current=null;if(Math.abs(dx)>40)go(dx<0?1:-1);}}>
   <header className="guide-head"><b>遊戲說明 {i+1}／{n}</b><span>{PAGES[i]}</span><button type="button" className="guide-close" onClick={onClose} aria-label="關閉遊戲說明"><X size={20}/></button></header>
   <div className="guide-stage">
    <button type="button" className="guide-arrow prev" onClick={()=>go(-1)} disabled={i===0} aria-label="上一張"><ChevronLeft size={28}/></button>
    <img key={i} src={`/guide/${i+1}.webp`} alt={`遊戲說明第 ${i+1} 張：${PAGES[i]}`}/>
    <button type="button" className="guide-arrow next" onClick={()=>go(1)} disabled={i===n-1} aria-label="下一張"><ChevronRight size={28}/></button>
   </div>
   <nav className="guide-tabs" aria-label="選擇說明頁">{PAGES.map((p,j)=><button key={p} type="button" className={j===i?'is-active':''} aria-current={j===i?'page':undefined} onClick={()=>setI(j)}><span>{j+1}</span>{p}</button>)}</nav>
  </section>
 </div>;
}
