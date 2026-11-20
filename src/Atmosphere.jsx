import React from 'react';
// 戰場氛圍圖層：晝夜色調＋天氣粒子，只做視覺，不影響戰鬥。
export default function AtmoLayer({time,weather}){
 return <div className={`atmo atmo-${time} weather-${weather}`} aria-hidden="true">
  <div className="atmo-tint"/>
  {time==='night'&&<div className="atmo-stars"/>}
  {['rain','drizzle','storm'].includes(weather)&&<div className="atmo-rain"/>}
  {weather==='storm'&&<div className="atmo-flash"/>}
  {weather==='heat'&&<div className="atmo-heat"/>}
  {['mist','miasma','cloudy'].includes(weather)&&<div className="atmo-fog"/>}
  {weather==='wind'&&<div className="atmo-wind"><i/><i/><i/><i/><i/></div>}
  {weather==='eclipse'&&<div className="atmo-eclipse"/>}
 </div>;
}
