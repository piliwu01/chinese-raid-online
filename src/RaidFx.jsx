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
