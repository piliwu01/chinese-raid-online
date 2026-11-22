// 共同討伐演出：魔王登場標題卡（投影畫面）、魔王技能斜長條橫幅（投影與學生畫面）。只做畫面，不影響規則。
import React, { useEffect, useRef, useState } from 'react';
import { BOSS_SKILLS } from '../shared/raid-skills.js';

export const INTRO_MS = 3800, SWEEP_MS = 2600;
const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// 開戰瞬間：畫面變暗、紅光，「BOSS」小字與「墨卷魔神」大標題滑入。只在開戰後幾秒內出現一次（重新整理投影頁不會再跑）。
export function BossIntro({ room, now }) {
  const [show, setShow] = useState(null), seen = useRef(null);
  const start = room.events?.find(e => e.type === 'start');
  useEffect(() => {
    if (!start || room.status !== 'active' || seen.current === start.at) return;
    seen.current = start.at;
    if (now - start.at > 2500) return; // 開戰很久後才打開投影頁：不補播
    setShow(start.at);
  }, [start?.at, room.status]);
  useEffect(() => { if (!show) return; const t = setTimeout(() => setShow(null), reduced() ? 1800 : INTRO_MS); return () => clearTimeout(t); }, [show]);
  if (!show) return null;
  return (
    <div className="boss-intro" role="status" aria-live="polite">
      <div className="intro-dim" />
      <div className="intro-slash" />
      <div className="intro-text">
        <span className="intro-kicker">— BOSS —</span>
        <h2>墨卷魔神</h2>
        <p>討伐開始！全班合力答題，守住護盾！</p>
      </div>
    </div>
  );
}

// 魔王預告出招的瞬間：一條墨色斜長條帶著技能名稱橫掃畫面。之後原本的預告倒數橫幅照常顯示。
export function SkillSweep({ room, now, compact = false }) {
  const [sweep, setSweep] = useState(null), seen = useRef(null);
  const sk = room.skill, key = sk?.stage === 'warn' ? `${sk.id}@${sk.at}` : null;
  useEffect(() => {
    if (!key || seen.current === key || !['active', 'paused'].includes(room.status)) return;
    seen.current = key;
    if (now - sk.at > 1500) return; // 中途才打開畫面：不補播
    setSweep({ key, def: BOSS_SKILLS[sk.id] });
  }, [key]);
  useEffect(() => { if (!sweep) return; const t = setTimeout(() => setSweep(null), reduced() ? 1500 : SWEEP_MS); return () => clearTimeout(t); }, [sweep?.key]);
  if (!sweep?.def) return null;
  return (
    <div className={`skill-sweep ${compact ? 'is-compact' : ''}`} key={sweep.key} role="alert">
      <div className="sweep-band">
        <span className="sweep-icon" aria-hidden="true">{sweep.def.icon}</span>
        <div className="sweep-text"><small>墨卷魔神 · 即將發動</small><strong>{sweep.def.name}</strong></div>
      </div>
    </div>
  );
}

// 魔王護盾（全班共用）：護盾條、破盾題型；破盾中顯示倒數。
export function BossShieldBar({ room, now, compact = false }) {
  const b = room.bossShield;
  if (!b || !['active', 'paused'].includes(room.status)) return null;
  const broken = b.until > now, settling = !broken && b.until > 0, left = broken ? 0 : settling ? b.max : b.left;
  return (
    <div className={`boss-shield ${compact ? 'is-compact' : ''} ${broken ? 'is-broken' : ''}`} role="status" aria-label={broken ? '魔王破盾中' : `魔王護盾 ${left} / ${b.max}`}>
      <span className="bs-label">{broken ? '破盾！' : '魔王護盾'}</span>
      <span className="bs-track"><i style={{ width: `${(left / b.max) * 100}%` }} /></span>
      {broken
        ? <b className="bs-count">全班傷害 ×2 · {Math.min(10, Math.max(0, Math.ceil((b.until - now) / 1000)))} 秒</b>
        : settling ? <b className="bs-count">護盾恢復中…</b>
        : <><b className="bs-count">{left} / {b.max}</b><span className="bs-weak">破盾題型 {b.weak.map(c => <em key={c}>{c}</em>)}</span></>}
    </div>
  );
}

// 有人擊破魔王護盾的瞬間：金色斜長條「破盾！BREAK」。
export function BreakSweep({ room, now, compact = false }) {
  const [fx, setFx] = useState(null), seen = useRef(null);
  const ev = room.events?.find(e => e.type === 'break');
  useEffect(() => {
    if (!ev || seen.current === ev.sequence) return;
    const first = seen.current === null; seen.current = ev.sequence;
    if (first && now - ev.at > 2000) return; // 中途打開畫面：不補播
    if (now - ev.at > 4000) return;
    setFx({ key: ev.sequence, name: room.members.find(m => m.id === ev.actorId)?.name || '' });
  }, [ev?.sequence]);
  useEffect(() => { if (!fx) return; const t = setTimeout(() => setFx(null), reduced() ? 1500 : SWEEP_MS); return () => clearTimeout(t); }, [fx?.key]);
  if (!fx) return null;
  return (
    <div className={`skill-sweep is-break ${compact ? 'is-compact' : ''}`} key={fx.key} role="alert">
      <div className="sweep-band">
        <span className="sweep-icon" aria-hidden="true">💥</span>
        <div className="sweep-text"><small>{fx.name ? `${fx.name} 擊破魔王護盾` : '魔王護盾被擊破'}</small><strong>破盾！全班傷害 ×2</strong></div>
      </div>
    </div>
  );
}
