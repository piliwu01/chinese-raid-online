// 冒險奇遇（2026-11-23，山海貨郎已取消）：個人冒險按「開始冒險」時，有 10% 機率先遇到奇遇；每人每天最多 3 次（台北時間）。
// - 藏寶螺（50%）：連續答對 3 題打開，得寶箱 1（寶箱滿了改給玉符 1）；中途答錯就跑走，已答對幾題給幾份食物。
// - 古書殘頁（50%）：答 1 題，答對經驗值加倍、再加食物 1；答錯照常進錯題本。
// 由伺服器的 applyAction 呼叫；題目與答案都存在伺服器，publicEncounter 只給畫面需要的資料。
import {addChest,luckyOf} from './lucky.js';
import {MAX_XP} from '../src/growth.js';

export const ENCOUNTER = {
  chance: 0.1, dailyMax: 3, shellNeed: 3,
  kinds: [
    { id: 'shell', name: '藏寶螺', weight: 50 },
    { id: 'page', name: '古書殘頁', weight: 50 },
  ],
};

function pickKind(random) {
  const total = ENCOUNTER.kinds.reduce((a, k) => a + k.weight, 0);
  let r = random() * total;
  for (const k of ENCOUNTER.kinds) { if ((r -= k.weight) < 0) return k.id; }
  return ENCOUNTER.kinds[0].id;
}

// 開戰時呼叫：可能產生一個奇遇（尚未處理完的奇遇會保留，不重抽）。回傳新的奇遇或 null。
export function rollEncounter(s, today, random = Math.random) {
  if (s.encounter && !s.encounter.done) return null;
  const d = s.encounterDay?.day === today ? s.encounterDay : (s.encounterDay = { day: today, count: 0 });
  if (d.count >= ENCOUNTER.dailyMax || random() >= ENCOUNTER.chance) return null;
  d.count++;
  const kind = pickKind(random);
  const e = { id: `${today}-${d.count}`, kind, opened: 0, done: false, result: null, q: null };
  s.encounter = e;
  return e;
}

export function encounterDone(s, result) { if (s.encounter) { s.encounter.done = true; s.encounter.result = result; s.encounter.q = null; } return result; }

// 藏寶螺／古書殘頁答題後的結算。gained＝這題原本得到的經驗值（古書殘頁再給一次＝加倍）。
export function resolveEncounterAnswer(s, correct, gained = 0) {
  const e = s.encounter;
  if (e.kind === 'page') {
    if (!correct) return encounterDone(s, { kind: 'page', correct: false, text: '殘頁飄走了，這題會進錯題本。' });
    s.growth.xp = Math.min(MAX_XP, (s.growth.xp || 0) + gained); s.food = (s.food || 0) + 1;
    return encounterDone(s, { kind: 'page', correct: true, xp: gained, food: 1, text: `答對了！經驗值加倍（+${gained * 2}），再加食物 1。` });
  }
  if (e.kind === 'shell') {
    if (!correct) {
      const food = e.opened; s.food = (s.food || 0) + food;
      return encounterDone(s, { kind: 'shell', correct: false, opened: e.opened, food, text: food ? `藏寶螺跑走了……答對 ${food} 題，獲得食物 ${food} 份。` : '藏寶螺跑走了，下次再挑戰！' });
    }
    e.opened++; e.q = null;
    if (e.opened < ENCOUNTER.shellNeed) return { kind: 'shell', correct: true, opened: e.opened, need: ENCOUNTER.shellNeed, text: `打開第 ${e.opened} 道鎖！還差 ${ENCOUNTER.shellNeed - e.opened} 題。` };
    const chest = addChest(s, 'shell'); if (!chest) luckyOf(s).jade++;
    return encounterDone(s, { kind: 'shell', correct: true, opened: e.opened, chest: chest ? 1 : 0, jade: chest ? 0 : 1, text: chest ? '藏寶螺打開了！獲得寶箱 1 個。' : '藏寶螺打開了！寶箱已滿，改得玉符 1 枚。' });
  }
  return null;
}

export function publicEncounter(e, publicQuestion) {
  if (!e) return null;
  const kind = ENCOUNTER.kinds.find(k => k.id === e.kind);
  return { id: e.id, kind: e.kind, name: kind?.name || '', opened: e.opened, need: ENCOUNTER.shellNeed, done: e.done, result: e.result,
    question: e.q ? publicQuestion(e.q) : null };
}
