// 2026-11-23 天賦樹：夥伴頁下方。每升 5 級 1 點，三條路線，前一格點滿才能點下一格，花 1 枚玉符可重置。
import React, { useState } from 'react';
import { Lock, Plus, RotateCcw, Sparkles } from 'lucide-react';
import { BRANCHES, TALENT, talentsOf, totalPoints, freePoints, canLearn } from '../shared/talents.js';
import { levelFor } from './growth.js';

export default function TalentTree({ cloud, act, busy }) {
  const [msg, setMsg] = useState('');
  const t = talentsOf(cloud), total = totalPoints(cloud.growth?.xp), free = freePoints(cloud), level = levelFor(cloud.growth?.xp || 0);
  const nextAt = Math.min(100, (Math.floor(level / TALENT.every) + 1) * TALENT.every), spent = total - free, jade = cloud.lucky?.jade || 0;
  const run = async (path, body) => { try { const r = await act(path, body); setMsg(r.event.message); } catch (e) { setMsg(e.message || '沒有成功，請再試一次。'); } };
  const reset = () => { if (window.confirm(`花 ${TALENT.resetJade} 枚玉符，把 ${spent} 點天賦全部退回重新分配？`)) run('/talent/reset', {}); };
  return (
    <section className="talent-tree" aria-label="天賦樹">
      <header className="tt-head">
        <div><h2><Sparkles size={22} />天賦樹</h2><p>每升 5 級得到 1 點天賦。同一條路線要先把上一格點滿，才能點下一格。冒險、全班討伐、PVP 都會生效。</p></div>
        <div className="tt-points">
          <span className={free ? 'has-free' : ''}>可用天賦點<b>{free}</b><small>已用 {spent} / 共 {total}</small></span>
          {level < 100 && <small className="tt-next">Lv{nextAt} 再得 1 點</small>}
          <button type="button" className="secondary-button" disabled={busy || !spent || jade < TALENT.resetJade} onClick={reset} title={jade < TALENT.resetJade ? '需要 1 枚玉符' : ''}><RotateCcw size={15} />重置（{TALENT.resetJade} 玉符，現有 {jade}）</button>
        </div>
      </header>
      {msg && <p className="tt-msg" role="status">{msg}</p>}
      <div className="tt-branches">
        {BRANCHES.map(b => {
          const pts = b.nodes.reduce((a, n) => a + t[n.id], 0);
          return (
            <div key={b.id} className="tt-branch" style={{ '--tt-color': b.color }}>
              <h3><span aria-hidden="true">{b.icon}</span>{b.name}<small>{pts} / 8</small></h3>
              <ol>
                {b.nodes.map(n => {
                  const rank = t[n.id], why = canLearn(cloud, n.id), locked = /先把/.test(why), full = rank >= n.max;
                  return (
                    <li key={n.id} className={`tt-node ${full ? 'is-full' : rank ? 'is-some' : ''} ${locked ? 'is-locked' : ''}`}>
                      <div className="tt-node-top">
                        <b>{locked && <Lock size={14} />}{n.name}</b>
                        <span className="tt-pips" aria-label={`${rank} / ${n.max} 級`}>{Array.from({ length: n.max }, (_, i) => <i key={i} className={i < rank ? 'on' : ''} />)}</span>
                      </div>
                      <p>{n.text(Math.max(1, rank))}</p>
                      <small>生效：{n.where}</small>
                      <button type="button" disabled={busy || !!why} title={why} onClick={() => run('/talent/learn', { id: n.id })} aria-label={`點「${n.name}」天賦`}>
                        {full ? '已點滿' : locked ? '尚未解鎖' : <><Plus size={15} />點一下</>}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
          );
        })}
      </div>
    </section>
  );
}
