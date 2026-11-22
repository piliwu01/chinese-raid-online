// 討伐結束的全班戰績榜：摘要列＋依貢獻排序的表格（稱號、成就標籤、答對、易中難）。
// 老師看全班、可全螢幕投影；學生只看摘要與自己那一列。只做畫面，不影響獎勵。
import React, { useEffect, useRef, useState } from 'react';
import { Maximize } from 'lucide-react';

const TITLES = ['', '見習山客', '初陣靈童', '巡山弟子', '守谷劍士', '御風騎士', '破陣戰術家', '傳奇勇者', '山海英雄', '魔王終結者'];
const tier = lv => (lv >= 8 ? 'gold' : lv === 7 ? 'amber' : lv >= 5 ? 'teal' : 'violet');
const HEADS = { won: ['🎉', '魔王被打倒了！'], timeout: ['⏰', '時間到！'], lost: ['🛡️', '護盾被擊破了…'], cancelled: ['⏸️', '本場提前結束'] };
const DIFFS = [['easy', '易'], ['medium', '中'], ['hard', '難']];

export function scoreRows(room) {
  const list = room.members.map(m => ({ ...m, contrib: (m.damage || 0) + (m.heal || 0) }));
  const max = Math.max(0, ...list.map(m => m.contrib));
  const best = Math.max(0, ...list.map(m => m.bestCombo || 0));
  const topDmg = room.rankings?.damage?.[0]?.id, topHeal = room.rankings?.heal?.[0]?.id;
  return list
    .sort((a, b) => b.contrib - a.contrib || b.correct - a.correct || a.joinOrder - b.joinOrder)
    .map((m, i) => {
      const lv = m.contrib > 0 && max > 0 ? Math.max(1, Math.min(9, 1 + Math.round((8 * m.contrib) / max))) : 1;
      const tags = [
        room.finisherId === m.id && '最後一擊',
        m.breaks > 0 && `破盾 ×${m.breaks}`,
        topDmg === m.id && '傷害第一',
        topHeal === m.id && '守護第一',
        m.answered >= 3 && m.correct === m.answered && '全對',
        best >= 3 && m.bestCombo === best && `${best} 連擊王`,
      ].filter(Boolean).slice(0, 3);
      return { ...m, rank: i + 1, lv, title: TITLES[lv], tags };
    });
}

const mmss = ms => { const t = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(t / 60)} 分 ${t % 60} 秒`; };

export default function RaidScoreboard({ room, user }) {
  const ref = useRef(null), [big, setBig] = useState(false);
  useEffect(() => { if (!big) return; const esc = e => { if (e.key === 'Escape') setBig(false); }; document.addEventListener('keydown', esc); return () => document.removeEventListener('keydown', esc); }, [big]);
  const rows = scoreRows(room), host = room.host, mine = rows.find(r => r.id === user.id);
  const shown = host ? rows : mine ? [mine] : [];
  const [icon, head] = HEADS[room.status] || HEADS.cancelled;
  const used = room.duration - (room.leftMs ?? 0), st = room.stats || {};
  const attacks = rows.reduce((n, m) => n + (m.correct || 0), 0);
  const summary = [
    room.endsAt && `${mmss(used)}`,
    `限時 ${Math.round(room.duration / 60000)} 分鐘`,
    `答對攻擊 ${attacks} 次`,
    st.ultimate ? `合體大招 ${st.ultimate} 次` : null,
    st.break ? `破盾 ${st.break} 次` : null,
    `魔王反擊 ${st.boss || 0} 次`,
    `魔王剩 ${room.hp.toLocaleString()} 血`,
  ].filter(Boolean);
  // 優先用瀏覽器全螢幕；不支援時改成蓋滿視窗（按 Esc 或再按一次關閉）。
  const full = async () => { if (big) { setBig(false); return; } try { if (document.fullscreenElement) await document.exitFullscreen(); else await ref.current.requestFullscreen(); } catch { setBig(true); } };
  return (
    <section ref={ref} className={`raid-scoreboard status-${room.status} ${big ? 'is-projecting' : ''}`} aria-label="全班戰績榜">
      <div className="sb-head">
        <h2><span aria-hidden="true">{icon}</span>{head}</h2>
        {host && <button type="button" className="sb-full" onClick={full} aria-label="全螢幕投影戰績榜"><Maximize size={18} />{big ? '關閉投影' : '投影戰績榜'}</button>}
      </div>
      <p className="sb-summary">{summary.join('・')}</p>
      {shown.length > 0 && (
        <div className="sb-table-wrap">
          <table className="sb-table">
            <thead><tr><th>名次</th><th>姓名</th><th>稱號</th><th>貢獻</th><th>傷害</th><th>修復</th><th>答對／作答</th>{DIFFS.map(([k, l]) => <th key={k} className="sb-diff">{l}</th>)}</tr></thead>
            <tbody>
              {shown.map(m => (
                <tr key={m.id} className={m.id === user.id ? 'is-me' : ''}>
                  <td className="sb-rank">{m.rank}</td>
                  <td className="sb-name"><img src={`/assets/${m.partner.id}.png`} alt="" />{m.name}</td>
                  <td className="sb-title"><span className={`sb-lv tier-${tier(m.lv)}`}>Lv{m.lv} {m.title}</span>{m.tags.map(t => <em key={t}>{t}</em>)}</td>
                  <td className="sb-num sb-contrib" data-label="貢獻">{m.contrib}</td>
                  <td className="sb-num" data-label="傷害">{m.damage}</td>
                  <td className="sb-num" data-label="修復">{m.heal}</td>
                  <td className="sb-num" data-label="答對／作答">{m.correct}／{m.answered}{m.answered >= 3 && m.correct === m.answered && ' ✓'}</td>
                  {DIFFS.map(([k, l]) => <td key={k} className="sb-num sb-diff" data-label={l}>{m.diff ? `${m.diff[k]?.[0] || 0}/${m.diff[k]?.[1] || 0}` : '—'}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="sb-note">{host ? '稱號依本場貢獻（傷害＋修復）換算，Lv9 為本場最高；易／中／難為各難度答對/作答。' : `全班共 ${rows.length} 位夥伴參戰。稱號依本場貢獻（傷害＋修復）換算；易／中／難為各難度答對/作答。`}</p>
    </section>
  );
}
