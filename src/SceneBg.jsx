// HD-2D 戰鬥背景：圖存在 D1（/assets/bg-*.png），讀不到時自動隱藏，退回原本的程式繪製背景。
import React from 'react';
export default function SceneBg({name}){
  return <div className="scene-bg" aria-hidden="true"><img src={`/assets/bg-${name}.png`} alt="" decoding="async" onError={e=>{e.currentTarget.parentElement.style.display='none';}}/></div>;
}
