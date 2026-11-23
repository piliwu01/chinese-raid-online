// 本週山海魔王：全班在家各自答題，傷害累積到共同血條；週日 22:00 結算。老師可選班級查看進度。
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Clock, Flame, Home, Swords, Trophy, Users } from 'lucide-react';
import { api } from './api.js';
import AiTutor from './AiTutor.jsx';
import { preferredBank } from './question-bank.js';
import './world.css';

const DIFFS = [['easy', '簡單題'], ['medium', '中等題'], ['hard', '困難題']];
function left(ms) {
  if (ms <= 0) return '已結算';
  const d = Math.floor(ms / 86400000), h = Math.floor(ms % 86400000 / 3600000), m = Math.floor(ms % 3600000 / 60000);
  return d > 0 ? `剩 ${d} 天 ${h} 小時` : h > 0 ? `剩 ${h} 小時 ${m} 分` : `剩 ${m} 分鐘`;
}

export default function WorldBossApp({ user, banks, act, busy, onExit }) {
  const teacher = user.role === 'teacher';
  const [view, setView] = useState(null), [error, setError] = useState(''), [classes, setClasses] = useState([]), [cls, setCls] = useState(user.className || '');
  const [bank, setBank] = useState(() => preferredBank(banks)), [diff, setDiff] = useState('medium');
  const [q, setQ] = useState(null), [fb, setFb] = useState(null), [now, setNow] = useState(Date.now()), [hit, setHit] = useState(null);
  const offset = useRef(0), auto = useRef('');
  const load = useCallback(async () => {
    try { const r = await api('/world/view', teacher ? { className: cls } : {}); offset.current = r.serverNow - Date.now(); setView(r); setError(''); }
    catch (e) { setError(e.message); }
  }, [teacher, cls]);
  useEffect(() => { if (!teacher || cls) load(); }, [load]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000), r = setInterval(load, 20000); return () => { clearInterval(t); clearInterval(r); }; }, [load]);
  useEffect(() => { if (teacher) api('/admin/users').then(r => { const list = [...new Set(r.users.map(u => u.class_name).filter(Boolean))].sort(); setClasses(list); if (!cls && list[0]) setCls(list[0]); }).catch(() => {}); }, []);
  const serverNow = now + offset.current;
  const secs = q ? Math.max(0, Math.ceil((q.expires - serverNow) / 1000)) : 0;

  const ask = async () => { setFb(null); try { const r = await act('/world/question', { bankId: bank, difficulty: diff }); setQ(r.event.question); } catch { load(); } };
  const answer = async choice => {
    if (!q) return; const cur = q; setQ(null);
    try {
      const r = await act('/world/answer', { questionId: cur.id, choice, bankId: bank }); const e = r.event;
      setFb({ ...e, bankId: e.bankId, sourceId: e.sourceId, order: e.order });
      if (e.world?.damage) setHit({ key: Date.now(), value: e.world.damage, weak: e.world.weak });
      load();
    } catch { load(); }
  };
  useEffect(() => { if (q && secs === 0 && auto.current !== q.id && !busy) { auto.current = q.id; answer(null); } }, [secs, q?.id]);

  if (!view) return <main className="world-page"><header className="world-head"><h1><Flame /> 本週山海魔王</h1></header>{teacher && <ClassPick classes={classes} cls={cls} setCls={setCls} />}<p className="world-loading">{error || '正在呼喚山海魔王…'}</p></main>;
  const pct = view.maxHp ? view.hp / view.maxHp * 100 : 100, ends = view.endsAt - serverNow, open = view.open && ends > 0;
  const need = Math.max(0, view.rules.rewardMin - view.me.correct);
  return (
    <main className="world-page">
      <header className="world-head">
        <div><span className="world-eyebrow">WEEKLY WORLD BOSS</span><h1><Flame /> 本週山海魔王</h1><p>每週一 00:00 開打，週日 22:00 結算，全班在家一起出手。</p></div>
        {onExit && <button className="secondary-button" onClick={onExit}><Home size={16} /> 回到主畫面</button>}
      </header>
      {teacher && <ClassPick classes={classes} cls={cls} setCls={setCls} />}
      {view.lastWeek && <p className={`world-last ${view.lastWeek.won ? 'is-won' : ''}`}>上週 {view.lastWeek.boss}：{view.lastWeek.won ? '🎉 全班打倒了！' : `差一點，打掉 ${view.lastWeek.total.toLocaleString()} / ${view.lastWeek.maxHp.toLocaleString()}`}</p>}
      <section className={`world-boss ${view.defeated ? 'is-defeated' : ''}`}>
        <div className="wb-portrait"><img src={`/world/${view.boss.id}.webp`} alt={`山海魔王${view.boss.name}`} onError={e => { e.currentTarget.src = '/assets/boss.png'; }} />{hit && <b key={hit.key} className={`wb-hit ${hit.weak ? 'is-weak' : ''}`}>−{hit.value}{hit.weak ? ' 弱點！' : ''}</b>}</div>
        <div className="wb-info">
          <div className="wb-title"><h2>{view.className} 班・本週山海魔王：{view.boss.name}</h2><span className="wb-clock"><Clock size={16} />{open ? left(ends) : '本週已結算，下週一再來'}</span></div>
          <p className="wb-line">{view.defeated ? `${view.boss.name}被打倒了！週日 22:00 結算時發獎勵。` : view.boss.line}</p>
          <div className="wb-hp"><span>全班共同血量</span><b>{view.hp.toLocaleString()} <small>/ {view.maxHp.toLocaleString()}</small></b></div>
          <div className="wb-bar" role="progressbar" aria-label="山海魔王剩餘血量" aria-valuemin={0} aria-valuemax={view.maxHp} aria-valuenow={view.hp}><i style={{ width: `${pct}%` }} /></div>
          <div className="wb-chips">{view.weak && <span className="wb-chip is-weak">本週弱點：{view.weak}題 傷害 ×{view.rules.weakMult}</span>}<span className="wb-chip"><Users size={14} />已有 {view.participants} / {view.classSize} 人出手</span></div>
        </div>
      </section>
      <div className={`world-grid ${teacher ? 'is-teacher' : ''}`}>
        {!teacher && <section className="world-play">
          {!open ? <div className="wb-closed"><Trophy size={30} /><h3>本週山海魔王已結算</h3><p>下週一 00:00 會出現新的山海魔王，記得回來幫全班出手！</p></div>
            : q ? <div className="wb-question">
              <div className="wb-qhead"><span>{DIFFS.find(d => d[0] === diff)?.[1]} · 答對 {view.rules.damage[diff]} 傷害{q.category && <em className={q.category === view.weak ? 'is-weak' : ''}>{q.category}{q.category === view.weak ? ' ×2' : ''}</em>}</span><b><Clock size={15} />{secs} 秒</b></div>
              <h3>{q.question}</h3>
              <div className="wb-options">{q.options.map((o, i) => <button key={o} disabled={busy} onClick={() => answer(o)}><span>{String.fromCharCode(65 + i)}</span><b>{q.optionTexts?.[o] ?? o}</b><ArrowRight size={17} /></button>)}</div>
            </div>
            : <div className="wb-start">
              {fb && <div className={`wb-feedback ${fb.correct ? 'is-correct' : ''}`}>
                <strong>{fb.correct ? (fb.world?.damage ? `答對了！對${view.boss.name}造成 ${fb.world.damage} 點傷害${fb.world.weak ? '（弱點加倍）' : ''}` : '答對了！山海魔王已經倒下，經驗值照拿') : fb.timedOut ? '時間到了，一起看看答案。' : '沒關係，答錯不扣分，再來一題！'}</strong>
                <p>正確答案：{fb.answerText}</p>{fb.explanation && <p className="wb-expl">{fb.explanation}</p>}<AiTutor feedback={fb} />
              </div>}
              <label className="wb-bank">題庫<select value={bank} onChange={e => setBank(e.target.value)}>{banks.filter(b => b.count > 0).map(b => <option key={b.bankId} value={b.bankId}>{b.title}</option>)}</select></label>
              <div className="wb-diffs" role="group" aria-label="選擇難度">{DIFFS.map(([k, label]) => <button key={k} type="button" aria-pressed={diff === k} className={diff === k ? 'active' : ''} onClick={() => setDiff(k)}>{label}<small>{view.rules.damage[k]} 傷害</small></button>)}</div>
              <button className="primary-button wb-go" disabled={busy} onClick={ask}><Swords size={20} />{fb ? '下一題，繼續出手' : '開始出手'}</button>
              <small>答錯不扣分、不會被反擊；答題經驗值和錯題本照常累積。</small>
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
        </aside>
      </div>
    </main>
  );
}
function ClassPick({ classes, cls, setCls }) {
  return <label className="wb-class">查看班級<select value={cls} onChange={e => setCls(e.target.value)}>{classes.map(c => <option key={c} value={c}>{c}</option>)}</select></label>;
}
