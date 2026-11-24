// 2026-11-23 天賦樹：每升 5 級得 1 點天賦（Lv100 共 20 點），三條路線各 8 點，最多點滿兩條半。
// 同一條路線要把前一格點滿，才能點下一格。花 1 枚玉符可以全部重置、重新分配。
// 效果在冒險、全班討伐、PVP 都會生效（每格說明寫出生效的地方）。純函式，前後端共用。
import {levelFor} from '../src/growth.js';

export const TALENT={every:5,resetJade:1};
export const BRANCHES=[
 {id:'atk',name:'攻擊之道',icon:'⚔️',color:'#ff8f8f',nodes:[
  {id:'a1',icon:'🖋️',name:'銳筆',max:3,per:0.04,text:r=>`答對造成的傷害 +${r*4}%`,where:'冒險・討伐・PVP'},
  {id:'a2',icon:'💥',name:'會心',max:2,per:0.05,text:r=>`暴擊機率 +${r*5}%`,where:'冒險'},
  {id:'a3',icon:'🔥',name:'乘勝',max:2,per:0.05,text:r=>`連擊 3 以上時，傷害再 +${r*5}%`,where:'冒險・討伐'},
  {id:'a4',icon:'🗡️',name:'破陣',max:1,per:0.5,text:()=>'破盾後的傷害由 ×2 提高為 ×2.5',where:'冒險・討伐'},
 ]},
 {id:'def',name:'守護之道',icon:'🛡️',color:'#8fd3ff',nodes:[
  {id:'d1',icon:'🛡️',name:'厚甲',max:3,per:10,text:r=>`最大 HP +${r*10}；討伐修復護盾 +${r*2}`,where:'冒險・討伐・PVP'},
  {id:'d2',icon:'🧘',name:'鎮心',max:2,per:0.08,text:r=>`受到的反擊傷害 −${r*8}%`,where:'冒險'},
  {id:'d3',icon:'🧪',name:'良藥',max:2,per:10,text:r=>`傷藥多回復 ${r*10} HP`,where:'冒險・PVP'},
  {id:'d4',icon:'💪',name:'不屈',max:1,per:1,text:()=>'每場第一次被打倒時，留下 1 HP',where:'冒險・PVP'},
 ]},
 {id:'wis',name:'學識之道',icon:'📜',color:'#b9f28f',nodes:[
  {id:'w1',icon:'📖',name:'勤學',max:3,per:0.05,text:r=>`冒險答題得到的 XP +${r*5}%`,where:'冒險'},
  {id:'w2',icon:'🌱',name:'蓄勢',max:2,per:0.2,text:r=>`潛力累積速度 +${r*20}%`,where:'冒險'},
  {id:'w3',icon:'👁️',name:'慧眼',max:2,per:1,text:r=>r>=2?'開戰就翻開全部弱點，而且靈氣多 1 顆':'開戰就翻開全部弱點',where:'冒險'},
  {id:'w4',icon:'🎓',name:'博學',max:1,per:1,text:()=>'淨化墨漬怪的 XP 與食物加倍',where:'墨漬怪巢穴'},
 ]},
];
export const NODES=Object.fromEntries(BRANCHES.flatMap(b=>b.nodes.map((n,i)=>[n.id,{...n,branch:b.id,index:i}])));
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};

export const talentsOf=s=>{const t=s?.talents&&typeof s.talents==='object'?s.talents:{};const out={};for(const id in NODES)out[id]=Math.max(0,Math.min(NODES[id].max,Number(t[id])||0));return out;};
export const totalPoints=xp=>Math.floor(levelFor(xp||0)/TALENT.every);
export const spentPoints=t=>Object.values(t).reduce((a,b)=>a+b,0);
export const freePoints=s=>Math.max(0,totalPoints(s?.growth?.xp)-spentPoints(talentsOf(s)));
// 前一格點滿才能點下一格
export function canLearn(s,id){const n=NODES[id];if(!n)return '沒有這個天賦。';const t=talentsOf(s);if(t[id]>=n.max)return '這個天賦已經點滿了。';if(freePoints(s)<1)return totalPoints(s?.growth?.xp)?'天賦點用完了，再升 5 級就有新的 1 點。':'升到 Lv5 就能拿到第 1 點天賦。';
 const prev=BRANCHES.find(b=>b.id===n.branch).nodes[n.index-1];if(prev&&t[prev.id]<prev.max)return `先把「${prev.name}」點滿，才能點「${n.name}」。`;return '';}
export function learnTalent(s,id){const why=canLearn(s,String(id));if(why)fail(why);const t=talentsOf(s);t[id]++;s.talents=t;return {id,rank:t[id],name:NODES[id].name};}
export function resetTalents(s,lucky){const t=talentsOf(s),spent=spentPoints(t);if(!spent)fail('還沒有點任何天賦，不需要重置。');if((lucky.jade||0)<TALENT.resetJade)fail(`重置天賦需要 ${TALENT.resetJade} 枚玉符。`);lucky.jade-=TALENT.resetJade;s.talents={};return spent;}

// 把天賦換算成各種加成（數字都是「額外」的部分）。
export function talentFx(s){const t=talentsOf(s),r=id=>t[id]*NODES[id].per;
 return {dmg:r('a1'),crit:r('a2'),combo:r('a3'),breakMult:t.a4?2.5:2,
  hp:r('d1'),raidHeal:t.d1*2,counterCut:r('d2'),potion:r('d3'),stand:t.d4>0,
  xp:r('w1'),latent:r('w2'),revealAll:t.w3>=1,orbs:t.w3>=2?1:0,purify:t.w4?2:1};}
// 傷害倍率：基礎 + 連擊加成（連擊 3 以上）
export const damageBonus=(fx,combo)=>1+(fx?.dmg||0)+((combo||0)>=3?(fx?.combo||0):0);
