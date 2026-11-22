// 狀態圖示與回合數：角色頭上的小圖示，右下角數字是剩下的回合（題）、次數或秒數。
import React from 'react';
import { BOSS_SKILLS } from '../shared/raid-skills.js';

// item：{ key, icon, label, n, unit, tone: 'buff' | 'debuff' | 'warn', tip }
export function StatusChips({ items, className = '', label }) {
  const list = (items || []).filter(Boolean);
  if (!list.length) return null;
  return (
    <div className={`status-chips ${className}`} role="list" aria-label={label || '狀態'}>
      {list.map(it => (
        <span key={it.key} role="listitem" className={`status-chip tone-${it.tone || 'warn'}`} title={it.tip || it.label}>
          <i aria-hidden="true">{it.icon}</i>
          <span className="sc-label">{it.label}</span>
          {it.n != null && <b className="sc-n">{it.n}{it.unit && <small>{it.unit}</small>}</b>}
        </span>
      ))}
    </div>
  );
}

const secs = (until, now) => Math.max(1, Math.ceil((until - now) / 1000));

// 共同討伐：魔王身上的狀態（對全班有利的標成 buff）。
export function bossStatusItems(room, now) {
  const sk = room.skill || {}, def = BOSS_SKILLS[sk.id];
  return [
    room.phase === 2 && { key: 'rage', icon: '😡', label: '暴走', tone: 'warn', tip: '魔王暴走：反擊傷害 ×1.5、反擊加快' },
    sk.stage === 'active' && def && { key: 'skill', icon: def.icon, label: def.name, n: secs(sk.until, now), unit: '秒', tone: 'warn', tip: `${def.name}發動中` },
    room.stunUntil > now && { key: 'stun', icon: '💫', label: '暈眩', n: secs(room.stunUntil, now), unit: '秒', tone: 'buff', tip: '魔王暈眩：暫停反擊' },
    room.bossShield?.until > now && { key: 'break', icon: '💥', label: '破盾', n: Math.min(10, secs(room.bossShield.until, now)), unit: '秒', tone: 'buff', tip: '破盾：全班傷害 ×2' },
    room.poisonTicks > 0 && { key: 'poison', icon: '🧪', label: '毒傷', n: room.poisonTicks, unit: '次', tone: 'buff', tip: '毒霧：每 5 秒扣魔王血' },
  ];
}
// 共同討伐：全班（夥伴這一方）的狀態。
export function teamStatusItems(room, now) {
  return [
    room.guardCharges > 0 && { key: 'guard', icon: '💎', label: '守護', n: room.guardCharges, unit: '波', tone: 'buff', tip: '守護：減輕之後的魔王反擊' },
    room.drumUntil > now && { key: 'drum', icon: '🥁', label: '戰鼓', n: secs(room.drumUntil, now), unit: '秒', tone: 'buff', tip: '戰鼓：答對傷害 +5' },
  ];
}
