// 戰場氛圍：台北真實時間決定晝夜；遇到有「預兆」的神獸會改變天氣（見則大水→下雨、見則大旱→熱浪…）。
export const OMENS={
 rain:{ids:[2021,2038,2045,2084,2071,2042,2006,2005],icon:'🌧️',label:'大雨',why:'見則大水'},
 heat:{ids:[2025,2024,2075,2083,2080],icon:'🔥',label:'旱熱',why:'見則大旱'},
 storm:{ids:[2010,2011,2012,2057,2063],icon:'⛈️',label:'雷雨',why:'其聲如雷'},
 miasma:{ids:[2079,2088,2078],icon:'🌫️',label:'瘴氣',why:'見則大疫'},
 eclipse:{ids:[2093],icon:'🌗',label:'晝夜交替',why:'視為晝，瞑為夜'},
 wind:{ids:[2046,2043,2047,2085],icon:'🌪️',label:'狂風',why:'見則有兵'},
};
const DAILY=['clear','clear','clear','clear','clear','cloudy','cloudy','mist','drizzle','clear'];
const WEATHER_LABEL={clear:'晴朗',cloudy:'多雲',mist:'起霧',drizzle:'細雨',rain:'大雨',heat:'旱熱',storm:'雷雨',miasma:'瘴氣',eclipse:'晝夜交替',wind:'狂風'};
const TIME_LABEL={dawn:'清晨',day:'白天',dusk:'黃昏',night:'夜晚'};
export function timeOfDay(now=Date.now()){
 const h=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Taipei',hour:'2-digit',hour12:false}).format(new Date(now)))%24;
 return h>=5&&h<7?'dawn':h>=7&&h<16?'day':h>=16&&h<18?'dusk':'night';
}
const hash=s=>[...String(s)].reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,7);
export function omenFor(enemyId){for(const [k,o] of Object.entries(OMENS))if(o.ids.includes(Number(enemyId)))return {kind:k,...o};return null;}
export function weatherFor({enemyId,battleId='',chapter=1}){
 const omen=omenFor(enemyId);if(omen)return omen.kind;
 let w=DAILY[hash(battleId+chapter)%DAILY.length];
 if(chapter===3&&w==='clear'&&hash(battleId)%3===0)w='mist';
 return w;
}
export function atmosphere({enemyId,battleId,chapter,now=Date.now()}){
 const time=timeOfDay(now),weather=weatherFor({enemyId,battleId,chapter});
 return {time,weather,timeLabel:TIME_LABEL[time],weatherLabel:WEATHER_LABEL[weather],omen:omenFor(enemyId)};
}
