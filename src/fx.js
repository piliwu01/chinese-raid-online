// 戰鬥特效設定：只影響畫面，不參與任何傷害或獎勵計算。
// kind 決定投射物外形：orb 火球、drop 水滴、leaf 飛葉、bolt 閃電、wave 光波、wisp 幽火、shard 碎晶。
export const FX_BY_TYPE = {
  fire:     { kind: 'orb',   color: '#ff8a3d', glow: '#ffcf6b' },
  water:    { kind: 'drop',  color: '#4cc3ff', glow: '#b7ecff' },
  grass:    { kind: 'leaf',  color: '#6fd96a', glow: '#d4ffb0' },
  bug:      { kind: 'leaf',  color: '#b5d94a', glow: '#efffb0' },
  electric: { kind: 'bolt',  color: '#ffe14d', glow: '#fff7c2' },
  psychic:  { kind: 'wave',  color: '#ff7bd8', glow: '#ffd0f2' },
  fairy:    { kind: 'wave',  color: '#ffa8de', glow: '#fff0fa' },
  ghost:    { kind: 'wisp',  color: '#a97bff', glow: '#e3d3ff' },
  dark:     { kind: 'wisp',  color: '#7a5cff', glow: '#cfc2ff' },
  ice:      { kind: 'shard', color: '#9ff0ff', glow: '#ffffff' },
  dragon:   { kind: 'shard', color: '#6f8cff', glow: '#cdd7ff' },
  steel:    { kind: 'shard', color: '#c9d6e3', glow: '#ffffff' },
  rock:     { kind: 'shard', color: '#d9a66b', glow: '#ffe2bd' },
  fighting: { kind: 'shard', color: '#ff6b5a', glow: '#ffd2c9' },
  normal:   { kind: 'shard', color: '#f5d682', glow: '#fff3cc' },
};
export const fxFor = type => FX_BY_TYPE[type] || FX_BY_TYPE.normal;

// 只在支援且使用者未要求減少動態時，讓整個戰場短暫震動。
export function shake(el, strength = 6, duration = 420) {
  if (!el?.animate || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const s = strength;
  el.animate([
    { transform: 'translate(0,0)' }, { transform: `translate(${-s}px,${s * .5}px)` }, { transform: `translate(${s}px,${-s * .4}px)` },
    { transform: `translate(${-s * .6}px,${-s * .3}px)` }, { transform: `translate(${s * .4}px,${s * .3}px)` }, { transform: 'translate(0,0)' },
  ], { duration, easing: 'ease-out' });
}

// 角色待機動作：整張圖的呼吸、漂浮、游動（靜態圖片無法做四肢分開動作）。
const MOTION_BY_TYPE = { ghost: 'float', psychic: 'float', fairy: 'float', dragon: 'float', water: 'swim', ice: 'swim' };
export const motionFor = type => MOTION_BY_TYPE[type] || 'breathe';
// 依角色編號錯開節奏，避免全班角色同步起伏。
// 每隻角色的待機節奏不同：依 id 決定 2.2～3.9 秒的週期，再依角色位置（我方／敵方）加減速，避免左右同步晃動。
export const IDLE_PACE = { player: 0.82, enemy: 1.28, ally: 1 };
export const idleDuration = (id, role = 'ally') => {
  const n = Math.abs(Number(id) || 0), base = 2.2 + (n * 7 % 18) / 10;
  return +(base * (IDLE_PACE[role] || 1)).toFixed(2);
};
export const idleStyle = (id, role = 'ally') => {
  const d = idleDuration(id, role);
  return { animationDuration: `${d}s`, animationDelay: `-${((Number(id) || 0) * 0.37 % d).toFixed(2)}s` };
};
