// 個人對戰的「破盾與蓄力」資訊列：敵人護盾、弱點題型、靈氣與本回合投入點數。
import React from 'react';
import { BREAK, boostMultiplier } from '../shared/breakboost.js';

export default function BreakBar({ brk, boost, setBoost, disabled }) {
  if (!brk) return null;
  const orbs = brk.orbs || 0;
  return (
    <div className="break-bar" aria-label="破盾與蓄力">
      {brk.maxShield > 0 && (
        <div className="break-shield">
          <span className="break-label">護盾</span>
          <span className="shield-pips" role="img" aria-label={`護盾 ${brk.shield} / ${brk.maxShield}`}>
            {Array.from({ length: brk.maxShield }, (_, i) => <i key={i} className={i < brk.shield ? 'on' : ''} />)}
          </span>
          {brk.broken
            ? <strong className="break-state">破盾！這題傷害 ×{BREAK.breakMult}，答錯不會被反擊</strong>
            : <span className="break-weak"><span className="break-label">弱點</span>{brk.weak.map(c => <em key={c}>{c}</em>)}</span>}
        </div>
      )}
      <div className="break-orbs">
        <span className="break-label">靈氣</span>
        <span className="orb-pips" role="img" aria-label={`靈氣 ${orbs} / ${BREAK.orbsMax}`}>
          {Array.from({ length: BREAK.orbsMax }, (_, i) => <i key={i} className={i < orbs ? 'on' : ''} />)}
        </span>
        <span className="boost-pick" role="group" aria-label="投入靈氣">
          <span className="break-label">投入</span>
          {Array.from({ length: BREAK.boostMax + 1 }, (_, n) => (
            <button key={n} type="button" className={n === boost ? 'active' : ''} aria-pressed={n === boost}
              disabled={disabled || n > orbs} onClick={() => setBoost(n)}>{n}</button>
          ))}
          <small>{boost ? `傷害 ×${boostMultiplier(boost)}` : '不加成'}</small>
        </span>
      </div>
    </div>
  );
}
