// 2026-11-24 同行夥伴加入的小劇情（打通第 2、4、6 章時出現；一次可能有好幾位，依序顯示）。
import React, { useState } from 'react';
import { passiveFor } from '../shared/passives.js';

export default function AllyJoin({ list, onClose }) {
  const [i, setI] = useState(0);
  const a = list[i];
  if (!a) return null;
  const p = passiveFor(a.id), last = i >= list.length - 1;
  return (
    <div className="ally-join-backdrop" role="dialog" aria-modal="true" aria-label={`${a.zhName}加入了隊伍`}>
      <div className={`ally-join type-${a.type}`}>
        <span className="aj-kicker">打通第 {a.chapter} 章・新的同伴</span>
        <img src={`/assets/${a.id}.png`} alt={a.zhName} />
        <h2>{a.zhName} 加入了隊伍！</h2>
        <p className="aj-line">{a.line}</p>
        {p && <p className="aj-passive"><b>{p.icon} 被動【{p.name}】</b>{p.when}有 15% 機率{p.desc}</p>}
        <small>到「圖鑑」點牠，就能設為出戰夥伴（固定第一階段，不會進化）。</small>
        <button type="button" className="primary-button" autoFocus onClick={() => last ? onClose() : setI(i + 1)}>
          {last ? '一起出發！' : `下一位（${i + 1} / ${list.length}）`}
        </button>
      </div>
    </div>
  );
}

// 夥伴頁的「同行夥伴」名單：已加入顯示圖，還沒加入顯示要打通哪一章。
export function AllyRoster({ allies }) {
  if (!allies?.length) return null;
  return (
    <section className="ally-roster" aria-label="同行夥伴">
      <h3>🤝 同行夥伴<small>沒選到的初始夥伴，會在打通第 2、4、6 章時加入（固定第一階段，有被動技能）</small></h3>
      <ul>
        {allies.map(a => {
          const p = passiveFor(a.id);
          return (
            <li key={a.id} className={a.joined ? 'is-joined' : 'is-waiting'}>
              {a.joined ? <img src={`/assets/${a.id}.png`} alt="" /> : <span className="ar-silhouette" aria-hidden="true">？</span>}
              <div><b>{a.joined ? a.zhName : '？？？'}</b>
                <small>{a.joined ? (p ? `${p.icon} ${p.name}・可在圖鑑設為出戰` : '可在圖鑑設為出戰') : `打通第 ${a.chapter} 章後加入`}</small></div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
