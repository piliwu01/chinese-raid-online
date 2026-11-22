// 個人對戰的「破盾與蓄力」：護盾與弱點放在敵人血條卡片下方，靈氣與投入點數放在夥伴血條卡片下方。
import React from 'react';
import { BREAK, LATENT, boostMultiplier } from '../shared/breakboost.js';

export function EnemyShield({ brk }) {
  if (!brk?.maxShield) return null;
  return (
    <div className="hp-break" aria-label="護盾與弱點">
      <div className="hp-break-row">
        <span className="break-label">護盾</span>
        <span className="shield-pips" role="img" aria-label={`護盾 ${brk.shield} / ${brk.maxShield}`}>
          {Array.from({ length: brk.maxShield }, (_, i) => <i key={i} className={i < brk.shield ? 'on' : ''} />)}
        </span>
        {brk.broken && <strong className="break-state">破盾！傷害 ×{BREAK.breakMult}</strong>}
      </div>
      {brk.broken
        ? <p className="break-note">這題答錯也不會被反擊</p>
        : <div className="hp-break-row break-weak"><span className="break-label">弱點</span>{brk.weak.map((c, i) => c ? <em key={c}>{c}</em> : <em key={'h' + i} className="weak-hidden" title="答對這種題型就會翻開">？？</em>)}</div>}
    </div>
  );
}

export function PlayerBoost({ brk, boost, setBoost, disabled, awaken = false, setAwaken = () => {} }) {
  if (!brk) return null;
  const orbs = brk.orbs || 0, latent = Math.min(LATENT.max, brk.latent || 0), full = latent >= LATENT.max;
  return (
    <div className="hp-break" aria-label="靈氣蓄力">
      <div className="hp-break-row">
        <span className="break-label">靈氣</span>
        <span className="orb-pips" role="img" aria-label={`靈氣 ${orbs} / ${BREAK.orbsMax}`}>
          {Array.from({ length: BREAK.orbsMax }, (_, i) => <i key={i} className={i < orbs ? 'on' : ''} />)}
        </span>
        <small className={`boost-hint ${!awaken && !boost ? 'is-none' : ''}`}>{awaken ? `覺醒 ×${LATENT.mult}` : boost ? `×${boostMultiplier(boost)}` : '不加成'}</small>
      </div>
      <div className="hp-break-row boost-pick" role="group" aria-label="投入靈氣">
        <span className="break-label">投入</span>
        {Array.from({ length: BREAK.boostMax + 1 }, (_, n) => (
          <button key={n} type="button" className={n === boost ? 'active' : ''} aria-pressed={n === boost}
            disabled={disabled || awaken || n > orbs} onClick={() => setBoost(n)}>{n}</button>
        ))}
        <span className={`latent-box ${full ? 'is-full' : ''}`} title={`潛力：被反擊或破盾時增加，集滿可發動覺醒（傷害 ×${LATENT.mult}，答錯不被反擊）`}>
          {full
            ? <button type="button" className={`awaken-btn ${awaken ? 'active' : ''}`} aria-pressed={awaken} disabled={disabled} onClick={() => setAwaken(!awaken)}>{awaken ? '覺醒✓' : '覺醒！'}</button>
            : <><small className="latent-label">潛力</small><span className="latent-track" role="progressbar" aria-label="潛力" aria-valuemin={0} aria-valuemax={LATENT.max} aria-valuenow={latent}><i style={{ width: `${latent}%` }} /></span></>}
        </span>
      </div>
    </div>
  );
}

// 手機版：潛力條放在「你的回合」下方（夥伴卡片太小放不下）。
export function LatentPanel({ brk, awaken, setAwaken, disabled }) {
  if (!brk) return null;
  const latent = Math.min(LATENT.max, brk.latent || 0), full = latent >= LATENT.max;
  return (
    <div className={`latent-panel ${full ? 'is-full' : ''}`}>
      <span className="latent-label">潛力</span>
      <span className="latent-track" role="progressbar" aria-label="潛力" aria-valuemin={0} aria-valuemax={LATENT.max} aria-valuenow={latent}><i style={{ width: `${latent}%` }} /></span>
      {full
        ? <button type="button" className={`awaken-btn ${awaken ? 'active' : ''}`} aria-pressed={awaken} disabled={disabled} onClick={() => setAwaken(!awaken)}>{awaken ? `覺醒中 ×${LATENT.mult}` : '覺醒！'}</button>
        : <small className="latent-num">{latent} / {LATENT.max}</small>}
    </div>
  );
}
