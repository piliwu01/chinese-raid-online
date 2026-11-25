// Presentation only: no HP, rewards or room state is calculated here.
export const EFFECT_LIFETIME=1900;
export const RECENT_EVENT_WINDOW=5000;
export const visualTypes=new Set(['hit','strong','heal','fire','energy','stun','stun-miss','poison','guard','drum','boss','ultimate','phase']);
export function roomIdentity(room){return `${room.code}:${room.createdAt}`;}
export function collectStageEvents(cursor,room){
 const identity=roomIdentity(room),sequence=Number(room.sequence)||0;
 if(!cursor||cursor.identity!==identity)return {cursor:{identity,sequence},events:[]};
 if(sequence<=cursor.sequence)return {cursor,events:[]};
 const events=(room.events||[]).filter(e=>e.sequence>cursor.sequence&&e.sequence<=sequence&&visualTypes.has(e.type)&&room.serverNow-e.at<=RECENT_EVENT_WINDOW&&room.serverNow>=e.at).sort((a,b)=>a.sequence-b.sequence);
 return {cursor:{identity,sequence},events};
}
// 隊伍排法：依場景右半邊（寬 46%、高 38%）的形狀，試 3～12 欄，挑夥伴能畫最大的排法（先不套 20 px 下限再比，手機窄畫面才不會選到上下擠在一起的排法）。
// 區域又寬又矮時會自動多排幾欄、少排幾排；人多時名字字體縮小，所以預留的名字高度也較少。
export function stageLayout(n,width,height){
 const bandW=width*.46,bandH=height*.38,nameH=n>36?24:n>=20?34:40,ideal=Math.sqrt(Math.max(1,n)*bandW/Math.max(1,bandH));
 const sizeFor=c=>{const r=Math.max(1,Math.ceil(n/c));return Math.min(90,width*.065,bandW/c*.9,height<520?height*.15:999,r>1?bandH/(r-1)-nameH:999);};
 let best=null;
 for(let c=3;c<=Math.max(3,Math.min(12,n));c++){const spriteSize=sizeFor(c),rows=Math.max(1,Math.ceil(n/c)),cand={columns:c,rows,spriteSize};
  if(!best||spriteSize>best.spriteSize+.5||(Math.abs(spriteSize-best.spriteSize)<=.5&&Math.abs(c-ideal)<Math.abs(best.columns-ideal)))best=cand;}
 best.spriteSize=Math.max(20,best.spriteSize);return best;
}
const defaultColumns=n=>Math.min(10,Math.max(3,Math.ceil(Math.sqrt(n*1.6))));
// 單、雙排左右錯開半格（像磚牆），上下排的名字不會正好疊在一起；x 仍落在 49%～95%。
export function formation(members,columns=defaultColumns(members.length)){
 const rows=Math.max(1,Math.ceil(members.length/columns)),stagger=rows>1&&columns>1,step=columns>1?46/(columns-(stagger?.5:1)):0;
 return members.map((member,i)=>{const row=Math.floor(i/columns),col=i%columns,shift=stagger&&row%2===1?step/2:0;
  return {...member,x:columns>1?49+col*step+shift:72,y:rows===1?50:30+row*38/Math.max(1,rows-1)};});
}
export function effectLabel(e){
 if(e.type==='hit')return `${e.weak?'弱點 ':''}−${e.value}${e.combo>=3?` 🔥${e.combo}`:''}`;
 if(['strong','fire'].includes(e.type))return `${e.type==='strong'?'強攻 ':'火焰 '}−${e.value}`;
 if(e.type==='heal')return `護盾 ＋${e.value}`;
 if(e.type==='boss')return e.text;
 if(e.type==='poison'&&Number.isFinite(e.value))return `毒傷 −${e.value}`;
 return {energy:'能量 ＋1',stun:'暈眩 10 秒','stun-miss':'暈眩彈落空',poison:'毒霧施放',guard:'守護結晶',drum:'團隊戰鼓'}[e.type]||'';
}
