// 共同討伐：墨卷魔神的干擾技能。
// 開戰後每 60 秒出招一次；魔王暴走（第二階段）後改為約每 45 秒一次。
// 每次出招前先預告 3 秒；「全班合擊」成功會打斷正在預告或施放中的技能。
// 技能只干擾作答（選項位置、遮蔽、反噬、護盾），不更改題目與答案。
export const BOSS_SKILL = { warn: 3000, every: 60000, everyEnraged: 45000, first: 60000, wardMax: 60000, wardStun: 10000, curseShield: 2, fogShare: 0.25 };
export const BOSS_SKILLS = {
  ward: { id: 'ward', name: '墨甲護體', icon: '🛡️', warn: '墨卷魔神正在凝聚墨甲！', active: '魔王張開墨甲，攻擊打不進去！全班合力答對來擊破。', duration: BOSS_SKILL.wardMax },
  shuffle: { id: 'shuffle', name: '亂序咒', icon: '🔀', warn: '墨卷魔神正在念誦亂序咒！', active: '選項順序被打亂了！看清楚內容再作答。', duration: 10000 },
  fog: { id: 'fog', name: '墨霧遮眼', icon: '🌫️', warn: '墨卷魔神正在醞釀墨霧！', active: '墨霧遮住了部分同學的選項，用手指或滑鼠抹開它！', duration: 8000 },
  curse: { id: 'curse', name: '反噬詛咒', icon: '💥', warn: '墨卷魔神正在施放反噬詛咒！', active: '詛咒期間答錯，全班護盾每次額外 −2，不確定就別亂猜！', duration: 20000 },
};
const ORDER = Object.keys(BOSS_SKILLS);
export const wardNeed = members => Math.min(20, Math.max(6, members));

export function initSkills(s, now) { s.skill = null; s.lastSkill = null; s.skillCastAt = null; s.skillNextAt = now + BOSS_SKILL.first; }
export const skillActive = (s, id) => s.skill && s.skill.stage === 'active' && (!id || s.skill.id === id);
const interval = s => (s.phase === 2 ? BOSS_SKILL.everyEnraged : BOSS_SKILL.every);
function scheduleNext(s, from) { s.skillNextAt = Math.max(from + 5000, (s.skillCastAt || from) + interval(s)); }
function pick(s, random) { const pool = ORDER.filter(id => id !== s.lastSkill); return pool[Math.floor(random() * pool.length)]; }

// 推進技能狀態到 now（預告 → 施放 → 結束 → 下一招）。addEvent 由呼叫端提供，避免循環引用。
export function advanceSkills(s, now, addEvent, random = Math.random) {
  if (s.status !== 'active' || !s.skillNextAt) return false;
  let changed = false;
  for (let guard = 0; guard < 8; guard++) {
    const sk = s.skill;
    if (!sk) {
      if (now < s.skillNextAt || s.skillNextAt >= s.endsAt) break;
      const id = pick(s, random), def = BOSS_SKILLS[id], t = s.skillNextAt;
      s.skill = { id, stage: 'warn', at: t, until: t + BOSS_SKILL.warn }; s.skillCastAt = t;
      addEvent(s, 'skill-warn', `⚠️ ${def.warn}`, t, { skill: id });
      changed = true; continue;
    }
    if (now < sk.until) break;
    const def = BOSS_SKILLS[sk.id];
    if (sk.stage === 'warn') {
      const t = sk.until;
      s.skill = { id: sk.id, stage: 'active', at: t, until: t + def.duration, seed: Math.floor(random() * 1e9) };
      if (sk.id === 'ward') { s.skill.wardNeed = wardNeed(Object.keys(s.members).length); s.skill.wardLeft = s.skill.wardNeed; }
      if (sk.id === 'fog') {
        const ids = Object.keys(s.members); const n = Math.max(1, Math.ceil(ids.length * BOSS_SKILL.fogShare));
        for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
        s.skill.targets = ids.slice(0, n);
      }
      addEvent(s, 'skill', `${def.icon} ${def.name}：${def.active}`, t, { skill: sk.id });
      changed = true; continue;
    }
    // 施放結束
    const t = sk.until;
    addEvent(s, 'skill-end', sk.id === 'ward' ? '墨甲撐不住，自己散去了。' : `${def.name}的效果消失了。`, t, { skill: sk.id });
    s.lastSkill = sk.id; s.skill = null; scheduleNext(s, t); changed = true;
  }
  return changed;
}

// 全班合擊：打斷預告中或施放中的技能（含擊碎墨甲）
export function interruptSkill(s, now, addEvent) {
  if (!s.skill) return false;
  const def = BOSS_SKILLS[s.skill.id];
  addEvent(s, 'skill-break', `✨ 全班合擊打斷了魔王的${def.name}！`, now, { skill: s.skill.id });
  s.lastSkill = s.skill.id; s.skill = null; scheduleNext(s, now); return true;
}

// 墨甲期間的傷害：回傳實際對魔王造成的傷害（墨甲吸收時為 0）；hits 為削減墨甲的次數
export function wardAbsorb(s, now, hits, addEvent, onBreak) {
  if (!skillActive(s, 'ward')) return false;
  s.skill.wardLeft = Math.max(0, s.skill.wardLeft - hits);
  if (s.skill.wardLeft === 0) {
    addEvent(s, 'skill-break', '💥 全班擊碎了墨甲！魔王暈眩 10 秒。', now, { skill: 'ward' });
    s.lastSkill = 'ward'; s.skill = null; scheduleNext(s, now); onBreak?.();
  }
  return true;
}

export function shiftSkills(s, delay, pausedAt) {
  if (s.skillNextAt && s.skillNextAt > pausedAt) s.skillNextAt += delay;
  if (s.skillCastAt) s.skillCastAt += delay;
  if (s.skill) { s.skill.at += delay; s.skill.until += delay; }
}

// 給前端的技能狀態（不公開墨霧名單，只告訴本人是否被遮）
export function publicSkill(s, userId) {
  const sk = s.skill; if (!sk) return { next: s.skillNextAt || null };
  return { id: sk.id, stage: sk.stage, at: sk.at, until: sk.until, seed: sk.seed || 0, wardLeft: sk.wardLeft, wardNeed: sk.wardNeed, fogCount: sk.targets?.length || 0, fogMe: !!(userId && sk.targets?.includes(userId)), next: s.skillNextAt || null };
}
