// 本週山海魔王（2026-11-23）：每班每週一隻，全班在家各自答題，傷害累積到共同血條。純函式，前後端共用。
// - 開放：週一 00:00 ～ 週日 22:00（台北時間），週日 22:00 結算。
// - 2026-11-23 改版：不另外答題。學生在「冒險」個人對戰打到野生神獸的傷害，有 50% 同時打到本週山海魔王（本週弱點題型再 ×2）。
// - 血量：班上學生人數 × 300；答錯不扣分；不設每日上限。
// - 獎勵：本週答對至少 20 題才能領。打倒：寶箱 1、玉符 1、食物 3，貢獻前 3 名加「山海魔王勇者」稱號；沒打倒：食物 2。
import {weekStart} from './hero.js';
import {luckyOf,addChest} from './lucky.js';

export const WORLD = {
  hpPerStudent: 300, rewardMin: 20, top: 3, title: '山海魔王勇者',
  share: 0.5, weakMult: 2,
  win: { chest: 1, jade: 1, food: 3 }, lose: { food: 2 },
  firstWeek: '2026-11-23',
  bosses: [
    { id: 'taotie', name: '饕餮', line: '貪吃的饕餮張開大嘴，想把書本都吞下去！' },
    { id: 'qiongqi', name: '窮奇', line: '張開翅膀的窮奇，想把大家的筆記吹散！' },
    { id: 'taowu', name: '檮杌', line: '倔強的檮杌不服輸，要大家用知識說服牠！' },
    { id: 'hundun', name: '混沌', line: '沒有五官的混沌，正把字句攪得亂七八糟！' },
  ],
};
const DAY = 86400000, HOUR = 3600000;

export const worldWeek = (now = Date.now()) => weekStart(now);
export function worldWindow(week) {
  const start = Date.parse(week + 'T00:00:00+08:00');
  return { start, end: start + 6 * DAY + 22 * HOUR };
}
export const worldOpen = (now = Date.now()) => now < worldWindow(worldWeek(now)).end;
export function bossFor(week) {
  const n = Math.round((Date.parse(week + 'T00:00:00+08:00') - Date.parse(WORLD.firstWeek + 'T00:00:00+08:00')) / (7 * DAY));
  return WORLD.bosses[((n % 4) + 4) % 4];
}
export const worldMaxHp = students => Math.max(1, students) * WORLD.hpPerStudent;
// 本週弱點：從可用題型中依「週次＋班級」固定挑一種（同班整週相同）。
export function pickWeak(pool, week, className) {
  if (!pool?.length) return null;
  let h = 7; for (const c of `${week}|${className}`) h = (h * 31 + c.codePointAt(0)) >>> 0;
  return pool[h % pool.length];
}
// 冒險傷害分給山海魔王：50%，本週弱點題型 ×2。
export function shareDamage(damage, category, weak) {
  if (!(damage > 0)) return 0;
  return Math.max(1, Math.round(damage * WORLD.share * (weak && category === weak ? WORLD.weakMult : 1)));
}

// 結算：回傳 { won, awards:[{userId, won, top, damage, correct}] }。hits：[{userId, damage, correct}]
export function settleWorld(maxHp, hits) {
  const total = hits.reduce((a, h) => a + (h.damage || 0), 0), won = total >= maxHp;
  const ranked = hits.filter(h => h.damage > 0).sort((a, b) => b.damage - a.damage || (a.at || 0) - (b.at || 0));
  const topIds = new Set(won ? ranked.slice(0, WORLD.top).map(h => h.userId) : []);
  const awards = hits.filter(h => (h.correct || 0) >= WORLD.rewardMin).map(h => ({ userId: h.userId, won, top: topIds.has(h.userId), damage: h.damage || 0, correct: h.correct || 0 }));
  return { won, total, awards };
}

// 領取伺服器派發的山海魔王獎勵（awards 由伺服器注入）。同一週只入帳一次。
export function claimWorld(s, awards) {
  const w = s.worldBoss && typeof s.worldBoss === 'object' ? s.worldBoss : (s.worldBoss = { claimed: [] });
  w.claimed ||= []; s.extraTitles ||= [];
  const got = [];
  for (const a of Array.isArray(awards) ? awards : []) {
    const week = String(a.week || ''); if (!week || w.claimed.includes(week)) continue;
    w.claimed.push(week);
    const r = { week, won: !!a.won, top: !!a.top, chest: 0, jade: 0, food: 0, title: '' };
    if (r.won) {
      for (let i = 0; i < WORLD.win.chest; i++) { if (addChest(s, 'world')) r.chest++; else { luckyOf(s).jade++; r.jade++; } }
      luckyOf(s).jade += WORLD.win.jade; r.jade += WORLD.win.jade;
      s.food = (s.food || 0) + WORLD.win.food; r.food = WORLD.win.food;
      if (r.top && !s.extraTitles.includes(WORLD.title)) { s.extraTitles.push(WORLD.title); r.title = WORLD.title; }
    } else { s.food = (s.food || 0) + WORLD.lose.food; r.food = WORLD.lose.food; }
    got.push(r);
  }
  w.claimed = w.claimed.slice(-60);
  return got;
}
