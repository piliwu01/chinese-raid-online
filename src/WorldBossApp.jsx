// 本週山海魔王（2026-11-23 改版）：不另外答題。學生在「冒險」打野生神獸的傷害，有 50% 同時打到全班共同的山海魔王。
// 這一頁只看進度、排名與獎勵；週日 22:00 結算。老師可選班級查看進度。
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Clock, Flame, Home, Swords, Trophy, Users } from 'lucide-react';
import { api } from './api.js';
import { bossFor, roundKey, baseWeek } from '../shared/world-boss.js';
import './world.css';

function left(ms) {
  if (ms <= 0) return '已結算';
  const d = Math.floor(ms / 86400000), h = Math.floor(ms % 86400000 / 3600000), m = Math.floor(ms % 3600000 / 60000);
  return d > 0 ? `剩 ${d} 天 ${h} 小時` : h > 0 ? `剩 ${h} 小時 ${m} 分` : `剩 ${m} 分鐘`;
}

export default function WorldBossApp({ user, onExit }) {
  const teacher = user.role === 'teacher';
  const [view, setView] = useState(null), [error, setError] = useState(''), [classes, setClasses] = useState([]), [cls, setCls] = useState(user.className || '');
  const [now, setNow] = useState(Date.now());
  const offset = useRef(0);
  const load = useCallback(async () => {
    try { const r = await api('/world/view', teacher ? { className: cls } : {}); offset.current = r.serverNow - Date.now(); setView(r); setError(''); }
    catch (e) { setError(e.message); }
  }, [teacher, cls]);
  useEffect(() => { if (!teacher || cls) load(); }, [load]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000), r = setInterval(load, 20000); return () => { clearInterval(t); clearInterval(r); }; }, [load]);
  useEffect(() => { if (teacher) api('/admin/users').then(r => { const list = [...new Set(r.users.map(u => u.class_name).filter(Boolean))].sort(); setClasses(list); if (!cls && list[0]) setCls(list[0]); }).catch(() => {}); }, []);
  const serverNow = now + offset.current;

  if (!view) return <main className="world-page"><header className="world-head"><h1><Flame /> 本週山海魔王</h1></header>{teacher && <ClassPick classes={classes} cls={cls} setCls={setCls} />}<p className="world-loading">{error || '正在呼喚山海魔王…'}</p></main>;
  const pct = view.maxHp ? view.hp / view.maxHp * 100 : 100, ends = view.endsAt - serverNow, open = view.open && ends > 0;
  const need = Math.max(0, view.rules.rewardMin - view.me.correct);
  return (
    <main className="world-page">
      <header className="world-head">
        <div><span className="world-eyebrow">WEEKLY WORLD BOSS</span><h1><Flame /> 本週山海魔王</h1><p>每週一 00:00 開打，週日 22:00 結算。在「冒險」打怪，傷害的一半會同時打到山海魔王！</p></div>
        {onExit && <button className="secondary-button" onClick={onExit}><Home size={16} /> 回到主畫面</button>}
      </header>
      {teacher && <ClassPick classes={classes} cls={cls} setCls={setCls} />}
      {view.lastWeek && <p className={`world-last ${view.lastWeek.won ? 'is-won' : ''}`}>{view.lastWeek.sameWeek ? '本週上一隻' : '上週'} {view.lastWeek.boss}：{view.lastWeek.won ? '🎉 全班打倒了！' : `差一點，打掉 ${view.lastWeek.total.toLocaleString()} / ${view.lastWeek.maxHp.toLocaleString()}`}</p>}
      <section className={`world-boss ${view.defeated ? 'is-defeated' : ''}`}>
        <div className="wb-portrait"><img src={`/world/${view.boss.id}.webp`} alt={`山海魔王${view.boss.name}`} onError={e => { e.currentTarget.src = '/assets/boss.png'; }} /></div>
        <div className="wb-info">
          <div className="wb-title"><h2>{view.className} 班・本週山海魔王：{view.boss.name}{view.round > 1 ? `（第 ${view.round} 隻）` : ''}</h2><span className="wb-clock"><Clock size={16} />{open ? left(ends) : '本週已結算，下週一再來'}</span></div>
          <p className="wb-line">{view.defeated ? `${view.boss.name}被打倒了！週日 22:00 結算時發獎勵。` : view.boss.line}</p>
          <div className="wb-hp"><span>全班共同血量</span><b>{view.hp.toLocaleString()} <small>/ {view.maxHp.toLocaleString()}</small></b></div>
          <div className="wb-bar" role="progressbar" aria-label="山海魔王剩餘血量" aria-valuemin={0} aria-valuemax={view.maxHp} aria-valuenow={view.hp}><i style={{ width: `${pct}%` }} /></div>
          <div className="wb-chips">{view.weak && <span className="wb-chip is-weak">本週弱點：{view.weak}題 傷害 ×{view.rules.weakMult}</span>}<span className="wb-chip"><Users size={14} />已有 {view.participants} / {view.classSize} 人出手</span></div>
        </div>
      </section>
      <div className={`world-grid ${teacher ? 'is-teacher' : ''}`}>
        {!teacher && <section className="world-play">
          {!open ? <div className="wb-closed"><Trophy size={30} /><h3>本週山海魔王已結算</h3><p>下週一 00:00 會出現新的山海魔王，記得回來幫全班出手！</p></div>
            : <div className="wb-how">
              <h3>怎麼打山海魔王？</h3>
              <ol>
                <li><b>⚔️</b><span>到「冒險」打野生神獸，<em>你造成的傷害有 {Math.round(view.rules.share * 100)}%</em> 會同時打到{view.boss.name}。</span></li>
                <li><b>🎯</b><span>答對本週弱點<em>「{view.weak || '—'}」題</em>，打到魔王的傷害再 ×{view.rules.weakMult}。</span></li>
                <li><b>💥</b><span>破盾、蓄力、覺醒打得越痛，魔王也扣得越多。</span></li>
                <li><b>✅</b><span>本週在冒險答對 {view.rules.rewardMin} 題，結算就能領獎。</span></li>
              </ol>
              {onExit && <button className="primary-button wb-go" onClick={onExit}><Swords size={20} />去冒險出手</button>}
            </div>}
        </section>}
        <aside className="world-side">
          {!teacher && <div className="wb-card"><h3>我的貢獻</h3><div className="wb-me"><span>傷害<b>{view.me.damage.toLocaleString()}</b></span><span>答對<b>{view.me.correct}</b></span><span>名次<b>{view.me.rank || '—'}</b></span></div>
            <p className={need ? '' : 'is-ok'}>{need ? `再答對 ${need} 題，就能領本週獎勵` : '✅ 已達領獎門檻'}</p></div>}
          <div className="wb-card"><h3>{teacher ? '全班貢獻' : '班級貢獻前五名'}</h3>
            {view.top.length ? <ol className="wb-rank">{view.top.map(r => <li key={r.id} className={r.me ? 'is-me' : ''}><b>{r.rank||'—'}</b><span>{r.name}</span><em>{r.damage.toLocaleString()}</em>{teacher && <small>答對 {r.correct}</small>}</li>)}</ol> : <p className="wb-empty">還沒有人出手，成為第一個吧！</p>}</div>
          <div className="wb-card wb-rules"><h3>結算獎勵</h3>
            <p>本週答對至少 <b>{view.rules.rewardMin}</b> 題才能領獎。</p>
            <p>🎉 打倒：寶箱 {view.rules.win.chest}、玉符 {view.rules.win.jade}、食物 {view.rules.win.food}；貢獻前 {view.rules.top} 名加稱號「{view.rules.title}」。</p>
            <p>💪 沒打倒：食物 {view.rules.lose.food}。</p></div>
          {teacher && <RestartCard view={view} open={open} onDone={load} />}
        </aside>
      </div>
    </main>
  );
}
function ClassPick({ classes, cls, setCls }) {
  return <label className="wb-class">查看班級<select value={cls} onChange={e => setCls(e.target.value)}>{classes.map(c => <option key={c} value={c}>{c}</option>)}</select></label>;
}

// 老師：提前結算目前這隻並重開新的一隻（2026-11-25）。先填血量，再看確認內容才送出。
function RestartCard({ view, open, onDone }) {
  const suggest = Math.max(view.rules.hpMin, view.classSize * view.rules.hpPerStudent);
  const [hp, setHp] = useState(String(suggest)), [confirm, setConfirm] = useState(false), [busy, setBusy] = useState(false), [msg, setMsg] = useState(''), [err, setErr] = useState('');
  useEffect(() => { setHp(String(suggest)); setConfirm(false); setErr(''); }, [view.className, view.week]);
  const n = Math.round(Number(hp)), valid = Number.isFinite(n) && n >= view.rules.hpMin && n <= view.rules.hpMax;
  const next = bossFor(roundKey(baseWeek(view.week), (view.round || 1) + 1)), eligible = view.top.filter(r => r.correct >= view.rules.rewardMin).length;
  async function go() {
    setBusy(true); setErr('');
    try { const r = await api('/world/restart', { className: view.className, maxHp: n, expect: view.week }); setMsg(`已發獎並結算${view.boss.name}；${next.name}（血量 ${r.maxHp.toLocaleString()}）上場了！`); setConfirm(false); await onDone(); }
    catch (e) { setErr(e.message); setConfirm(false); await onDone(); }
    finally { setBusy(false); }
  }
  return <div className="wb-card wb-restart"><h3>提前結算並重開</h3>
    {!open ? <p className="wb-note">本週已結算，下週一 00:00 會自動出現新的山海魔王。</p> : <>
      <p className="wb-note">魔王太早被打倒時使用：照週日 22:00 的規則立刻發獎，再換下一隻神獸重新開打。</p>
      <label className="wb-hp-input">新魔王血量<input type="number" inputMode="numeric" min={view.rules.hpMin} max={view.rules.hpMax} step={1000} value={hp} onChange={e => { setHp(e.target.value); setConfirm(false); }} disabled={busy} /></label>
      <small className="wb-hint">建議 {suggest.toLocaleString()}（{view.classSize} 人 × {view.rules.hpPerStudent.toLocaleString()}）；可填 {view.rules.hpMin.toLocaleString()}～{view.rules.hpMax.toLocaleString()}</small>
      {!confirm ? <button className="secondary-button wb-restart-go" disabled={!valid || busy} onClick={() => { setConfirm(true); setMsg(''); }}>提前結算並重開…</button>
        : <div className="wb-confirm" role="alertdialog" aria-label="確認提前結算">
          <p>結算 <b>{view.boss.name}</b>：{view.defeated ? '🎉 已打倒' : `還沒打倒（剩 ${view.hp.toLocaleString()}）`}</p>
          <p>{eligible ? `${eligible} 人答對滿 ${view.rules.rewardMin} 題，可領${view.defeated ? '打倒獎' : '參加獎'}；學生下次登入或重新整理時自動領取。` : `還沒有人答對滿 ${view.rules.rewardMin} 題，這次不會發獎。`}</p>
          <p>新的一隻：<b>{next.name}</b>，血量 <b>{n.toLocaleString()}</b>。答對 {view.rules.rewardMin} 題的門檻重新累積。</p>
          <p className="wb-warn">結算後不能復原。</p>
          <div className="wb-confirm-actions"><button className="primary-button" disabled={busy} onClick={go}>{busy ? '處理中…' : '確定結算並重開'}</button><button className="secondary-button" disabled={busy} onClick={() => setConfirm(false)}>取消</button></div>
        </div>}
    </>}
    {msg && <p className="wb-done" role="status">{msg}</p>}{err && <p className="wb-error" role="alert">{err}</p>}
  </div>;
}
