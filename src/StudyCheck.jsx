// 2026-11-23 學生端「我的學習健檢」：題型答對率、近 7 天練習、AI 小老師分析（每天 1 次）與針對弱點練習。
import React, { useEffect, useState } from 'react';
import { Bot, LoaderCircle, Target, X } from 'lucide-react';
import { api } from './api.js';

const pct = x => x == null ? '—' : `${Math.round(x * 100)}%`;
const MIN = 30;

export default function StudyCheck({ cloud, act, busy }) {
  const [sum, setSum] = useState(null), [ai, setAi] = useState(null), [loading, setLoading] = useState(false), [err, setErr] = useState(''), [msg, setMsg] = useState('');
  const answered = cloud.growth?.answered || 0;
  useEffect(() => { api('/study/summary', {}).then(r => setSum(r.summary)).catch(() => {}); }, [answered]);
  if (!sum) return null;
  const cats = sum.cats.filter(c => c.total > 0).sort((a, b) => a.rate - b.rate);
  const maxDay = Math.max(1, ...sum.week.map(d => d.count)), need = Math.max(0, MIN - sum.answered), focus = cloud.studyFocus;
  const ask = async () => { setLoading(true); setErr(''); try { setAi(await api('/ai/study', {})); } catch (e) { setErr(e.message); } finally { setLoading(false); } };
  const practice = async list => { try { const r = await act('/study/focus', { cats: list }); setMsg(r.event.message); } catch {} };
  const clear = async () => { try { await act('/study/focus/clear', {}); setMsg(''); } catch {} };
  return (
    <article className="study-check" aria-label="我的學習健檢">
      <header className="sc-head"><h2>🩺 我的學習健檢</h2><span>看看自己哪裡最需要加油</span></header>
      <div className="sc-stats">
        <span>總答題<b>{sum.answered}</b></span><span>答對率<b>{pct(sum.accuracy)}</b></span><span>近 7 天練習<b>{sum.activeDays7} 天</b></span>
      </div>
      {cats.length ? <ul className="sc-cats" aria-label="各題型答對率（低到高）">{cats.map(c => <li key={c.category} className={c.rate < .6 ? 'is-low' : c.rate >= .8 ? 'is-good' : ''}><span>{c.category}</span><i><em style={{ width: pct(c.rate) }} /></i><b>{pct(c.rate)}</b><small>{c.right}/{c.total}</small></li>)}</ul>
        : <p className="sc-empty">還沒有答題紀錄，先去冒險答幾題吧！</p>}
      <div className="sc-week" aria-label="近 7 天答題數">{sum.week.map(d => <span key={d.day} title={`${d.day}：${d.count} 題`}><i style={{ height: `${Math.round(d.count / maxDay * 100)}%` }} /><small>{d.day.slice(5).replace('-', '/')}</small></span>)}</div>
      {focus && <p className="sc-focus"><Target size={16} />針對弱點練習中：<b>{focus.cats.join('、')}</b>，還剩 {focus.left} 題<button type="button" onClick={clear} disabled={busy} aria-label="取消針對弱點練習"><X size={14} />取消</button></p>}
      {msg && !focus && <p className="sc-msg">{msg}</p>}
      {ai ? <div className="sc-ai">
          <span className="sc-ai-label"><Bot size={16} />AI 小老師的分析{ai.cached ? '（今天的分析）' : ''}</span>
          {ai.strength && <p className="sc-strength">💪 {ai.strength}</p>}
          {ai.weak?.length > 0 && <ul className="sc-weak">{ai.weak.map(w => <li key={w.category}><b>需要加強：{w.category}</b><span>{w.reason}</span></li>)}</ul>}
          {ai.plan?.length > 0 && <ol className="sc-plan">{ai.plan.map((p, i) => <li key={i}>{p}</li>)}</ol>}
          {ai.weak?.length > 0 && !focus && <button type="button" className="primary-button sc-go" disabled={busy} onClick={() => practice(ai.weak.map(w => w.category))}><Target size={18} />針對弱點練習 20 題</button>}
          <small>AI 建議僅供參考；每天可以分析 1 次。</small>
        </div>
        : <div className="sc-ask">
          {need ? <p>再答 <b>{need}</b> 題，就能請 AI 小老師幫你做學習健檢！</p> : <p>請 AI 小老師看看你的答題紀錄，找出最需要加強的地方。</p>}
          <button type="button" className="primary-button" disabled={!!need || loading} onClick={ask}>{loading ? <LoaderCircle size={17} className="spin" /> : <Bot size={17} />}{loading ? '小老師分析中…' : '請 AI 小老師幫我健檢'}</button>
          {err && <p className="sc-err" role="alert">{err}</p>}
        </div>}
    </article>
  );
}
