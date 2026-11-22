// 每次出題都打亂選項順序（避免學生背「這題選 C」）。
// - 只處理題庫題（有 optionTexts 的 A～D 選擇題）；自動數學題不動。
// - 解析裡寫到的選項字母，例如「(A)形容…」「選項B」「故選 C」，會一起換成學生實際看到的新字母。
// - 選項內容互相參照（以上皆是、(A)(B)皆對、A與B…）的題目維持原順序，避免意思跑掉。
const LETTERS = ['A', 'B', 'C', 'D'];
const REFERS = /以上|皆是|皆非|皆正確|皆錯誤|皆對|皆錯|均是|均非|[（(][A-D][)）]|[A-D]\s*[、與和及或跟]\s*[A-D]|選項\s*[A-D]/;

export function canShuffle(q) {
  if (!q || !q.optionTexts || !Array.isArray(q.options)) return false;
  if (q.options.length !== 4 || !q.options.every((o, i) => o === LETTERS[i])) return false;
  if (!LETTERS.includes(q.answer)) return false;
  return !LETTERS.some(l => REFERS.test(String(q.optionTexts[l] ?? '')));
}

// 把解析中的舊字母換成新字母（同時替換，不會連鎖換錯）。map：舊字母 → 新字母。
export function remapLetters(text, map) {
  if (!text) return text;
  const m = l => map[l] || l;
  return String(text)
    .replace(/([（(])\s*([A-D])\s*([)）])/g, (_, a, l, b) => `${a}${m(l)}${b}`)
    .replace(/(選項\s*)([A-D])(?![A-Za-z])/g, (_, p, l) => p + m(l))
    .replace(/(?<![A-Za-z])([A-D])(\s*選項)/g, (_, l, p) => m(l) + p)
    .replace(/((?:故|應|答案)?選\s*)([A-D])(?![A-Za-z])/g, (_, p, l) => p + m(l))
    .replace(/(答案(?:為|是)\s*)([A-D])(?![A-Za-z])/g, (_, p, l) => p + m(l));
}

// 回傳打亂後的新題目物件（不改原物件）。perm[i]＝新位置 i 放原本哪個字母的選項。
export function shuffleQuestion(q, random = Math.random) {
  if (!canShuffle(q)) return q;
  const perm = [...LETTERS];
  for (let i = perm.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  const toNew = {}; perm.forEach((old, i) => { toNew[old] = LETTERS[i]; });
  const optionTexts = {}; LETTERS.forEach((l, i) => { optionTexts[l] = q.optionTexts[perm[i]]; });
  return { ...q, optionTexts, answer: toNew[q.answer], explanation: reorderExplanation(q.explanation, toNew), shuffled: perm.join('') };
}

// 解析若是「(A)…(B)…(C)…(D)…」逐項說明，換字母後再依新字母 A→D 排好，讀起來才順。
// 其他寫法（或句中有「故選」「答案」等結論）只換字母、不重排。
export function reorderExplanation(text, map) {
  if (!text) return text;
  const re = /[（(]\s*([A-D])\s*[)）]/g, hits = [...String(text).matchAll(re)];
  const letters = hits.map(h => h[1]);
  if (hits.length !== 4 || letters.join('') !== 'ABCD' || /故選|答案|應選/.test(text)) return remapLetters(text, map);
  const prefix = text.slice(0, hits[0].index);
  const parts = hits.map((h, i) => ({ to: map[h[1]] || h[1], body: remapLetters(text.slice(h.index, i < 3 ? hits[i + 1].index : undefined), map) }));
  const tail = parts[3].body.match(/[。．.]\s*$/)?.[0] || '';
  if (tail) parts[3].body = parts[3].body.slice(0, -tail.length);
  parts.sort((a, b) => a.to.localeCompare(b.to));
  return prefix + parts.map(p => p.body).join('') + tail;
}
