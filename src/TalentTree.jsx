// 2026-11-23 天賦樹：夥伴頁下方。每升 5 級 1 點，三條路線，前一格點滿才能點下一格，花 1 枚玉符可重置。
// 2026-11-24 美化：圓形節點用線串成樹、第 4 格是金色六角形終極天賦、點下去有動畫、路線點滿顯示「圓滿」、加成總表。
import React, { useState } from 'react';
import { Lock, Plus, RotateCcw, Sparkles } from 'lucide-react';
import { BRANCHES, NODES, TALENT, talentsOf, totalPoints, freePoints, canLearn, talentFx } from '../shared/talents.js';
import { levelFor } from './growth.js';

const pct = x => Math.round(x * 100);
// 把目前所有天賦效果合起來，給「我的加成總表」用
export function talentSummary(s) {
  const f = talentFx(s), out = [];
  if (f.dmg) out.push(['⚔️', '答對傷害', `+${pct(f.dmg)}%`]);
  if (f.crit) out.push(['⚔️', '暴擊機率', `+${pct(f.crit)}%`]);
  if (f.combo) out.push(['⚔️', '連擊 3 以上傷害', `+${pct(f.combo)}%`]);
  if (f.breakMult > 2) out.push(['⚔️', '破盾後傷害', `×${f.breakMult}`]);
  if (f.hp) out.push(['🛡️', '最大 HP', `+${Math.round(f.hp)}`]);
  if (f.raidHeal) out.push(['🛡️', '討伐修復護盾', `+${f.raidHeal}`]);
  if (f.counterCut) out.push(['🛡️', '受到反擊', `−${pct(f.counterCut)}%`]);
  if (f.potion) out.push(['🛡️', '傷藥多回', `${Math.round(f.potion)} HP`]);
  if (f.stand) out.push(['🛡️', '不屈', '每場留 1 HP']);
  if (f.xp) out.push(['📜', '冒險 XP', `+${pct(f.xp)}%`]);
  if (f.latent) out.push(['📜', '潛力累積', `+${pct(f.latent)}%`]);
  if (f.revealAll) out.push(['📜', '開戰翻開弱點', '全部']);
  if (f.orbs) out.push(['📜', '開戰靈氣', `+${f.orbs}`]);
  if (f.purify > 1) out.push(['📜', '淨化墨漬怪收穫', `×${f.purify}`]);
  return out;
}

export default function TalentTree({ cloud, act, busy }) {
  const [msg, setMsg] = useState(''), [flash, setFlash] = useState(null);
  const t = talentsOf(cloud), total = totalPoints(cloud.growth?.xp), free = freePoints(cloud), level = levelFor(cloud.growth?.xp || 0);
  const nextAt = Math.min(100, (Math.floor(level / TALENT.every) + 1) * TALENT.every), spent = total - free, jade = cloud.lucky?.jade || 0;
  const summary = talentSummary(cloud);
  const run = async (path, body) => {
    try {
      const r = await act(path, body); setMsg(r.event.message);
      if (body.id) { setFlash({ id: body.id, at: Date.now() }); setTimeout(() => setFlash(f => f?.id === body.id ? null : f), 1600); }
    } catch (e) { setMsg(e.message || '沒有成功，請再試一次。'); }
  };
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
      <div className="tt-summary" aria-label="我的加成總表">
        <b>📊 我的加成總表</b>
        {summary.length ? <ul>{summary.map(([icon, label, value]) => <li key={label}><span aria-hidden="true">{icon}</span>{label}<strong>{value}</strong></li>)}</ul>
          : <p>還沒有點任何天賦，點了之後效果會整理在這裡。</p>}
      </div>
      {msg && <p className="tt-msg" role="status">{msg}</p>}
      <div className="tt-branches">
        {BRANCHES.map(b => {
          const pts = b.nodes.reduce((a, n) => a + t[n.id], 0), done = pts >= 8, justDone = done && flash && NODES[flash.id]?.branch === b.id;
          return (
            <div key={b.id} className={`tt-branch ${done ? 'is-complete' : ''} ${justDone ? 'just-complete' : ''}`} style={{ '--tt-color': b.color }}>
              <h3><span aria-hidden="true">{b.icon}</span>{b.name}{done && <em className="tt-done">圓滿</em>}<small>{pts} / 8</small></h3>
              <ol>
                {b.nodes.map((n, i) => {
                  const rank = t[n.id], why = canLearn(cloud, n.id), locked = /先把/.test(why), full = rank >= n.max;
                  const prev = b.nodes[i - 1], open = !prev || t[prev.id] >= prev.max; const cap = i === b.nodes.length - 1;
                  const pop = flash?.id === n.id;
                  return (
                    <li key={n.id} className={`tt-node ${full ? 'is-full' : rank ? 'is-some' : ''} ${locked ? 'is-locked' : ''} ${cap ? 'is-cap' : ''} ${open ? 'is-open' : ''} ${pop ? 'just-learned' : ''}`}>
                      {!cap && <i className="tt-link" aria-hidden="true" key={pop ? `l${flash.at}` : 'l'} />}
                      <div className="tt-orb" aria-hidden="true" key={pop ? `o${flash.at}` : 'o'}>
                        <span className="tt-orb-icon">{n.icon}</span>
                        <span className="tt-orb-rank">{rank}/{n.max}</span>
                      </div>
                      <div className="tt-body">
                        <div className="tt-node-top">
                          <b>{locked && <Lock size={14} />}{n.name}{cap && <em className="tt-cap-tag">終極</em>}</b>
                          <span className="tt-pips" aria-label={`${rank} / ${n.max} 級`}>{Array.from({ length: n.max }, (_, k) => <i key={k} className={k < rank ? 'on' : ''} />)}</span>
                        </div>
                        <p>{n.text(Math.max(1, rank))}</p>
                        <small>生效：{n.where}</small>
                        <button type="button" disabled={busy || !!why} title={why} onClick={() => run('/talent/learn', { id: n.id })} aria-label={`點「${n.name}」天賦`}>
                          {full ? '已點滿' : locked ? '尚未解鎖' : <><Plus size={15} />點一下</>}
                        </button>
                      </div>
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
