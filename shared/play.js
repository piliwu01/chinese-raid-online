// 遊戲化規則（伺服器與畫面共用）：題型分類、連擊、每日任務、收集套組、墨漬怪巢穴、閃光題靈。
// 這裡只放純函式與常數；寫入學生進度的地方都由伺服器呼叫。
import { CATALOG } from './catalog.js';

// ---------- 題型分類（魔王弱點用）----------
const CATEGORY_RULES = [
  ['修辭', /修辭|譬喻|轉化|擬人|誇飾|映襯|排比|類疊|設問|頂真|借代|摹寫|對偶|層遞|示現|倒裝/],
  ['成語', /成語/],
  ['對聯', /對聯|聯語|上聯|下聯|賀聯|輓聯|楹聯/],
  ['字音字形', /字音|字形|讀音|注音|錯別字|錯字|同音|形近|音義|國字|部首/],
  ['詞語運用', /詞語|語詞|詞義|用詞|詞性|量詞|虛詞/],
];
// 題庫題目若有 category 欄位就直接使用；否則依題幹關鍵字判斷，閱讀題歸「文意理解」。
export function categorize(x) {
  if (!x) return '';
  if (typeof x.category === 'string' && x.category.trim()) return x.category.trim().slice(0, 12);
  const text = String(x.stem ?? x.question ?? '');
  const hit = CATEGORY_RULES.find(([, re]) => re.test(text));
  if (hit) return hit[0];
  return /文意|閱讀|課文理解/.test(String(x.unit || '')) ? '文意理解' : '語文常識';
}
// 可當弱點的題型：題庫中至少 minCount 題。
export function weaknessPool(bank, minCount = 10) {
  if (!bank) return [];
  const count = {};
  for (const x of bank.questions || []) if (x.status === 'active') { const c = categorize(x); count[c] = (count[c] || 0) + 1; }
  return Object.keys(count).filter(c => count[c] >= minCount).sort();
}

// ---------- 連擊 ----------
// 連續答對 3 題起加成：3 連擊 ×1.1、4 連擊 ×1.2 … 8 連擊以上 ×1.6。
export const comboMultiplier = combo => combo >= 3 ? 1 + Math.min(combo, 8) * 0.1 - 0.2 : 1;
export const CLASS_COMBO = { window: 10000, max: 15, min: 3, cooldown: 60000, stun: 5000, share: 0.03 };
// 全班連擊門檻：15 題；人數少於 15 人的班級改為「人數」題（至少 3 題），避免小班永遠觸發不了。
export const classComboNeed = members => Math.max(CLASS_COMBO.min, Math.min(CLASS_COMBO.max, members));

// ---------- 閃光題靈 ----------
export const SHINY_RATE = 0.02;

// ---------- 收集套組與稱號 ----------
// 集齊一組可得稱號，並可領一次獎勵（reward：食物、玉符、道具）。稀有套組獎勵加倍。
const SET_REWARD = { food: 5, jade: 2 }, RARE_SET_REWARD = { food: 10, jade: 4 };
export const SETS = [
  { id: 'flood', name: '洪水之兆', title: '治水使者', ids: [2021, 2038, 2045, 2084], reward: SET_REWARD }, // 長右、蠃魚、蠻蠻、夫諸
  { id: 'drought', name: '旱魃之兆', title: '祈雨師', ids: [2025, 2024, 2075, 2083], reward: SET_REWARD }, // 肥遺、鱄魚、獙獙、鳴蛇
  { id: 'ward', name: '驅凶護身', title: '辟邪者', ids: [2034, 2035, 2050, 2041], reward: SET_REWARD }, // 天狗、讙、孟槐、冉遺之魚
  { id: 'auspice', name: '四方祥瑞', title: '瑞獸知音', ids: [2095, 2096, 2065, 2097], reward: RARE_SET_REWARD, rare: true }, // 騶吾、吉量、象蛇、三青鳥
  { id: 'fiends', name: '上古凶獸', title: '伏魔者', ids: [2037, 2059, 2040, 2022], reward: RARE_SET_REWARD, rare: true }, // 窮奇、狍鴞、帝江、蠱雕
  { id: 'fish', name: '山海奇魚', title: '博物君子', ids: [2049, 2028, 2052, 2072], reward: SET_REWARD }, // 何羅之魚、文鰩魚、儵魚、珠蟞魚
];
// 集齊全部野外神獸（catalog.js 的 CATALOG，不含四條主角進化線）。
export const MASTER = { id: 'master', name: '山海全錄', title: '神獸至尊', ids: CATALOG.map(p => p.id), reward: { food: 30, jade: 10, items: { potion: 5 } } };
export const setFor = id => SETS.find(set => set.ids.includes(Number(id))) || null;
const progressOf = (set, owned, claimed) => {
  const have = set.ids.filter(id => owned.has(id)).length, done = have === set.ids.length;
  return { ...set, have, done, claimed: !!claimed?.[set.id] };
};
export function setProgress(captured, claimed = {}) {
  const owned = new Set((captured || []).map(p => p.id));
  return SETS.map(set => progressOf(set, owned, claimed));
}
export function masterProgress(captured, claimed = {}) {
  const { ids, ...rest } = progressOf(MASTER, new Set((captured || []).map(p => p.id)), claimed);
  return { ...rest, total: ids.length };
}
export const earnedTitles = captured => [...setProgress(captured).filter(s => s.done).map(s => s.title), ...(masterProgress(captured).done ? [MASTER.title] : [])];

// ---------- 每日任務 ----------
// reward：食物數量與一個道具（道具 id 對應 shared/items.js）。
export const QUESTS = {
  correct10: { text: '答對 10 題', need: 10, food: 2, item: 'potion' },
  capture1: { text: '收服 1 隻題靈', need: 1, food: 2, item: 'energy' },
  raidHeal1: { text: '在共同討伐中修復 1 次護盾', need: 1, food: 2, item: 'shield' },
  win3: { text: '打倒 3 隻野生題靈', need: 3, food: 2, item: 'fire' },
  ink1: { text: '淨化 1 隻墨漬怪', need: 1, food: 2, item: 'guard' },
  raidCorrect5: { text: '在共同討伐中答對 5 題', need: 5, food: 2, item: 'drum' },
  combo5: { text: '個人對戰打出 5 連擊', need: 1, food: 2, item: 'stun' },
};
// 每天固定 3 個任務（全班相同，方便老師說明）：「答對 10 題」每天都有，另外 2 個依日期輪替。
export function questsFor(day) {
  const others = ['capture1', 'raidHeal1', 'win3', 'ink1', 'raidCorrect5', 'combo5'];
  let h = 0; for (const ch of String(day)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const a = others[h % others.length], rest = others.filter(x => x !== a), b = rest[(h >>> 7) % rest.length];
  return ['correct10', a, b];
}
export function questState(s, day) {
  if (!s.quests || s.quests.day !== day) s.quests = { day, ids: questsFor(day), progress: {}, claimed: {} };
  return s.quests;
}
export function bumpQuest(s, kind, day, amount = 1) {
  const q = questState(s, day);
  if (!q.ids.includes(kind) || q.claimed[kind]) return;
  q.progress[kind] = Math.min(QUESTS[kind].need, (q.progress[kind] || 0) + amount);
}
export function publicQuests(s, day) {
  const q = s.quests?.day === day ? s.quests : { day, ids: questsFor(day), progress: {}, claimed: {} };
  return q.ids.map(id => ({ id, ...QUESTS[id], progress: q.progress[id] || 0, claimed: !!q.claimed[id], ready: (q.progress[id] || 0) >= QUESTS[id].need && !q.claimed[id] }));
}

// ---------- 墨漬怪巢穴（錯題）----------
export const INK = { max: 40, food: 1, xp: 15 };
// 答錯一題題庫題目：放進巢穴（同一題不重複），隔天起才能挑戰。
export function addInk(s, bankId, questionId, stem, day) {
  if (!bankId || bankId === 'math-auto' || !questionId) return false;
  s.inkNest ||= [];
  const existing = s.inkNest.find(m => m.bankId === bankId && m.questionId === questionId);
  if (existing) { existing.day = day; return false; }
  s.inkNest.push({ id: `${bankId}:${questionId}`, bankId, questionId, stem: String(stem || '').slice(0, 80), day, born: day });
  if (s.inkNest.length > INK.max) s.inkNest = s.inkNest.slice(-INK.max);
  return true;
}
export const inkReady = (m, day) => m.day < day;
export function publicInk(s, day) {
  return (s.inkNest || []).map(m => ({ id: m.id, bankId: m.bankId, stem: m.stem, ready: inkReady(m, day), born: m.born }));
}
