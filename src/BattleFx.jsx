// 個人對戰演出：破盾切入特寫、勝利結算（數字跳動）。只做畫面，不影響規則。
import React, { useEffect, useState } from 'react';

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// 破盾瞬間：斜長條帶著夥伴大圖橫掃戰場，閃白光，約 1.3 秒後自動消失。
export function BreakCutIn({ fx, onDone }) {
  useEffect(() => {
    if (!fx) return;
    const t = setTimeout(onDone, reduced() ? 900 : 1400);
    return () => clearTimeout(t);
  }, [fx?.key]);
  if (!fx) return null;
  return (
    <div className="break-cutin" key={fx.key} aria-live="polite" role="status">
      <div className="cutin-flash" />
      <div className="cutin-band">
        <img src={fx.img} alt="" onError={e => { e.currentTarget.style.visibility = 'hidden'; }} />
        <div className="cutin-text"><strong>破盾！</strong><span>BREAK · {fx.name}</span></div>
      </div>
      <p className="cutin-note">下一題傷害 ×2，答錯也不會被反擊</p>
    </div>
  );
}

// 數字從 0 跳到目標值。
function CountUp({ to, delay = 0 }) {
  const [n, setN] = useState(reduced() ? to : 0);
  useEffect(() => {
    if (reduced() || !to) { setN(to); return; }
    let raf, start;
    const t = setTimeout(() => {
      const step = ts => { start ??= ts; const p = Math.min(1, (ts - start) / 650); setN(Math.round(to * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(step); };
      raf = requestAnimationFrame(step);
    }, delay);
    return () => { clearTimeout(t); cancelAnimationFrame(raf); };
  }, [to, delay]);
  return <>{n.toLocaleString()}</>;
}

// 對戰結算：一行一行出現，數字跳動。tally 由畫面在每題作答後累計。
export function BattleTally({ tally, outcome }) {
  if (!tally || !tally.answered) return null;
  const rows = [
    ['答對題數', tally.correct, ` / ${tally.answered}`],
    ['獲得經驗', tally.xp, ' XP'],
    ['最高連擊', tally.maxCombo, ' 連擊'],
    tally.breaks ? ['破盾次數', tally.breaks, ' 次'] : null,
    tally.food ? ['食物', tally.food, ' 份'] : null,
    tally.jade ? ['玉符', tally.jade, ' 枚'] : null,
    tally.chest ? ['答題寶箱', tally.chest, ' 個'] : null,
  ].filter(Boolean);
  return (
    <div className={`battle-tally tally-${outcome}`} aria-label="本場結算">
      <div className="tally-title"><strong>{outcome === 'lost' ? '本場紀錄' : '戰鬥結算'}</strong><span>{outcome === 'lost' ? 'RECORD' : 'VICTORY'}</span></div>
      <dl>
        {rows.map(([label, value, unit], i) => (
          <div className="tally-row" key={label} style={{ animationDelay: `${i * 220}ms` }}>
            <dt>{label}</dt><dd><b><CountUp to={value} delay={i * 220 + 120} /></b>{unit}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
