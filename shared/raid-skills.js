// 共同討伐：墨卷魔神的干擾技能。
// 開戰後每 60 秒出招一次；魔王暴走（第二階段）後改為約每 45 秒一次。
// 每次出招前先預告 3 秒；「全班合擊」成功會打斷正在預告或施放中的技能。
// 技能只干擾作答（選項位置、遮蔽、反噬、護盾），不更改題目與答案。
export const BOSS_SKILL = { warn: 3000, every: 60000, everyEnraged: 45000, first: 60000, wardMax: 60000, wardStun: 10000, curseShield: 2, fogShare: 0.25,
  // 2026-11-25 新增四招
  puppets: 3, puppetBlast: 5, summonMs: 20000, regenMs: 20000, regenEvery: 4000, regenShare: 0.01, sealMs: 15000, markMs: 20000, markCount: 3, markMult: 2 };
export const BOSS_SKILLS = {
  ward: { id: 'ward', name: '墨甲護體', icon: '🛡️', warn: '墨卷魔神正在凝聚墨甲！', active: '魔王張開墨甲，攻擊打不進去！全班合力答對來擊破。', duration: BOSS_SKILL.wardMax },
  shuffle: { id: 'shuffle', name: '亂序咒', icon: '🔀', warn: '墨卷魔神正在念誦亂序咒！', active: '選項順序被打亂了！看清楚內容再作答。', duration: 10000 },
  fog: { id: 'fog', name: '墨霧遮眼', icon: '🌫️', warn: '墨卷魔神正在醞釀墨霧！', active: '墨霧遮住了部分同學的選項，用手指或滑鼠抹開它！', duration: 8000 },
  curse: { id: 'curse', name: '反噬詛咒', icon: '💥', warn: '墨卷魔神正在施放反噬詛咒！', active: '詛咒期間答錯，全班護盾每次額外 −2，不確定就別亂猜！', duration: 20000 },
  summon: { id: 'summon', name: '墨偶召喚', icon: '👺', warn: '墨卷魔神正在召喚墨偶！', active: '三隻小墨偶衝上戰場！全班答對打散牠們，時間到沒打散的會自爆，每隻全班護盾 −5。', duration: BOSS_SKILL.summonMs },
  regen: { id: 'regen', name: '墨卷重生', icon: '💚', warn: '墨卷魔神正在吸收墨氣！', active: '魔王開始回血！全班一起答對，就能打斷回血。', duration: BOSS_SKILL.regenMs },
  seal: { id: 'seal', name: '封印咒', icon: '⛓️', warn: '墨卷魔神正在念封印咒！', active: '道具和技能被封印了，這段時間只能靠答題！', duration: BOSS_SKILL.sealMs },
  mark: { id: 'mark', name: '考驗印記', icon: '🎯', warn: '墨卷魔神正在挑選對手！', active: '魔王盯上了幾位同學！被盯上的同學答對，傷害 ×2。', duration: BOSS_SKILL.markMs },
};
const ORDER = Object.keys(BOSS_SKILLS);
export const wardNeed = members => Math.min(20, Math.max(6, members));
// 每隻墨偶要答對幾題才打散（人數越多越耐打）；墨卷重生要全班答對幾題才打斷。
export const puppetNeed = members => Math.min(6, Math.max(2, Math.ceil(members / 5)));
export const regenNeed = members => Math.min(8, Math.max(3, Math.ceil(members / 4)));
const shuffled = (ids, random) => { const a = [...ids]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

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
    if (sk.id === 'regen' && sk.stage === 'active') {
      while (sk.tickAt && sk.tickAt <= Math.min(now, sk.until)) {
        const amount = Math.min(Math.max(1, Math.round((s.maxHp || 0) * BOSS_SKILL.regenShare)), Math.max(0, (s.maxHp || 0) - s.hp));
        s.hp += amount; sk.healed += amount;
        addEvent(s, 'regen', `💚 墨卷重生：魔王回復 ${amount} 點生命`, sk.tickAt, { skill: 'regen', value: amount });
        sk.tickAt += BOSS_SKILL.regenEvery; changed = true;
      }
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
      if (sk.id === 'summon') { const need = puppetNeed(Object.keys(s.members).length); s.skill.puppetNeed = need; s.skill.puppets = Array(BOSS_SKILL.puppets).fill(need); }
      if (sk.id === 'regen') { s.skill.regenNeed = regenNeed(Object.keys(s.members).length); s.skill.regenLeft = s.skill.regenNeed; s.skill.healed = 0; s.skill.tickAt = t + BOSS_SKILL.regenEvery; }
      if (sk.id === 'mark') s.skill.marked = shuffled(Object.keys(s.members), random).slice(0, Math.min(BOSS_SKILL.markCount, Object.keys(s.members).length));
      addEvent(s, 'skill', `${def.icon} ${def.name}：${def.active}`, t, { skill: sk.id });
      changed = true; continue;
    }
    // 施放結束
    const t = sk.until;
    if (sk.id === 'summon') {
      const alive = sk.puppets.filter(x => x > 0).length;
      if (alive) {
        const cut = Math.min(alive * BOSS_SKILL.puppetBlast, s.shield); s.shield -= cut;
        addEvent(s, 'puppet-blast', `💥 ${alive} 隻墨偶自爆！全班護盾 −${cut}`, t, { skill: 'summon', value: cut });
      }
    }
    addEvent(s, 'skill-end', sk.id === 'ward' ? '墨甲撐不住，自己散去了。' : sk.id === 'summon' && !sk.puppets.some(x => x > 0) ? '墨偶全部被打散了！' : `${def.name}的效果消失了。`, t, { skill: sk.id });
    if (s.shield === 0) { s.lostAt = t; s.lastSkill = sk.id; s.skill = null; changed = true; break; }
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

// 墨偶召喚：答對打最前面還沒散的墨偶，hits 為削減的題數。全部打散就提早結束本招。
export function puppetHit(s, now, hits, addEvent, actor) {
  if (!skillActive(s, 'summon')) return false;
  const p = s.skill.puppets; let left = hits;
  for (let i = 0; i < p.length && left > 0; i++) { if (p[i] <= 0) continue; const cut = Math.min(p[i], left); p[i] -= cut; left -= cut; if (p[i] === 0) addEvent(s, 'puppet-down', `${actor?.name || '全班'}打散了一隻墨偶！`, now, { skill: 'summon', actorId: actor?.id, index: i }); }
  if (!p.some(x => x > 0)) { addEvent(s, 'skill-break', '✨ 三隻墨偶全被打散了！', now, { skill: 'summon' }); s.lastSkill = 'summon'; s.skill = null; scheduleNext(s, now); }
  return true;
}
// 墨卷重生：全班答對累計到門檻就打斷回血。
export function regenHit(s, now, addEvent) {
  if (!skillActive(s, 'regen')) return false;
  s.skill.regenLeft = Math.max(0, s.skill.regenLeft - 1);
  if (s.skill.regenLeft === 0) { addEvent(s, 'skill-break', '✨ 全班打斷了墨卷重生！', now, { skill: 'regen' }); s.lastSkill = 'regen'; s.skill = null; scheduleNext(s, now); }
  return true;
}
// 考驗印記：被盯上的同學答對時的傷害倍率。
export const markMult = (s, id) => (skillActive(s, 'mark') && s.skill.marked?.includes(id) ? BOSS_SKILL.markMult : 1);
export const sealed = s => skillActive(s, 'seal');

export function shiftSkills(s, delay, pausedAt) {
  if (s.skillNextAt && s.skillNextAt > pausedAt) s.skillNextAt += delay;
  if (s.skillCastAt) s.skillCastAt += delay;
  if (s.skill) { s.skill.at += delay; s.skill.until += delay; if (s.skill.tickAt) s.skill.tickAt += delay; }
}

// 給前端的技能狀態（不公開墨霧名單，只告訴本人是否被遮）
export function publicSkill(s, userId) {
  const sk = s.skill; if (!sk) return { next: s.skillNextAt || null };
  return { id: sk.id, stage: sk.stage, at: sk.at, until: sk.until, seed: sk.seed || 0, wardLeft: sk.wardLeft, wardNeed: sk.wardNeed, fogCount: sk.targets?.length || 0, fogMe: !!(userId && sk.targets?.includes(userId)),
    puppets: sk.puppets || null, puppetNeed: sk.puppetNeed || 0, regenLeft: sk.regenLeft, regenNeed: sk.regenNeed, healed: sk.healed || 0, marked: sk.marked || null, markMe: !!(userId && sk.marked?.includes(userId)), next: s.skillNextAt || null };
}
