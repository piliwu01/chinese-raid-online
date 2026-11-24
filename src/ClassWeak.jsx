// 2026-11-24 老師端「全班弱點總覽」：學習報告裡，依查詢的班級顯示題型答對率、需要關心的學生、最多人答錯的題目與 AI 教學建議。
import React, { useEffect, useState } from 'react';
import { Bot, LoaderCircle, RefreshCw } from 'lucide-react';
import { api } from './api.js';

const pct = x => `${Math.round(x * 100)}%`;
const tone = r => r < 0.6 ? 'low' : r < 0.8 ? 'mid' : 'high';

export default function ClassWeak({ cls, stamp }) {
  const [ov, setOv] = useState(null), [err, setErr] = useState(''), [open, setOpen] = useState(null);
  const [ai, setAi] = useState(null), [aiErr, setAiErr] = useState(''), [loading, setLoading] = useState(false);
  useEffect(() => {
    setOv(null); setAi(null); setAiErr(''); setErr(''); setOpen(null);
    api('/admin/class-weak', { className: cls }).then(r => setOv(r.overview)).catch(e => setErr(e.message));
  }, [cls, stamp]);
  const ask = async refresh => {
    setLoading(true); setAiErr('');
    try { setAi(await api('/admin/class-weak/ai', { className: cls, refresh })); } catch (e) { setAiErr(e.message); } finally { setLoading(false); }
  };
  if (err) return <p className="cloud-error">{err}</p>;
  if (!ov) return null;
  const label = cls || '全部班級';
  return (
    <section className="class-weak" aria-label="全班弱點總覽">
      <header className="cw-head">
        <h3>🔍 全班弱點總覽<small>{label}・{ov.withData} / {ov.students} 位學生有作答紀錄・共 {ov.answered} 題</small></h3>
      </header>
      {!ov.cats.length ? <p className="trade-empty">這個班級還沒有題型作答紀錄。</p> : <div className="cw-grid">
        <div>
          <h4>各題型答對率（低 → 高）</h4>
          <ul className="cw-cats">
            {ov.cats.map(c => (
              <li key={c.category}>
                <div className="cw-row">
                  <span className="cw-name">{c.category}</span>
                  <i className="cw-bar"><em className={tone(c.rate)} style={{ width: pct(c.rate) }} /></i>
                  <b className={tone(c.rate)}>{pct(c.rate)}</b>
                  <small>{c.right}/{c.total}</small>
                  {c.struggling.length > 0
                    ? <button type="button" className="cw-who" aria-expanded={open === c.category} onClick={() => setOpen(open === c.category ? null : c.category)}>需要關心 {c.struggling.length} 人</button>
                    : <span className="cw-ok">—</span>}
                </div>
                {open === c.category && <p className="cw-names">答對率低於 6 成：{c.struggling.join('、')}</p>}
              </li>
            ))}
          </ul>
          <small className="cw-note">「需要關心」＝這個題型至少答 5 題、答對率低於 6 成的學生。</small>
        </div>
        <div>
          <h4>最多人答錯、還沒弄懂的題目</h4>
          {ov.wrongs.length ? <ol className="cw-wrongs">
            {ov.wrongs.map(w => <li key={w.qid} title={w.names.join('、')}><span>{w.stem}</span><small>{w.category && <em>{w.category}</em>}{w.names.length} 人答錯</small></li>)}
          </ol> : <p className="trade-empty">目前沒有 2 人以上共同答錯的題目。</p>}
        </div>
      </div>}
      <div className="cw-ai">
        {ai ? <>
          <div className="cw-ai-top"><span><Bot size={17} />AI 教學建議{ai.cached ? `（${ai.day} 的分析）` : ''}</span>
            <button type="button" className="secondary-button" disabled={loading} onClick={() => ask(true)}>{loading ? <LoaderCircle size={15} className="spin" /> : <RefreshCw size={15} />}重新分析</button></div>
          {ai.overall && <p className="cw-overall">{ai.overall}</p>}
          <div className="cw-focus">
            {ai.focus.map(f => (
              <article key={f.category}>
                <h5>{f.category}</h5>
                {f.why && <p><b>常見錯誤</b>{f.why}</p>}
                {f.reteach && <p><b>重講重點</b>{f.reteach}</p>}
                {f.activity && <p><b>課堂活動</b>{f.activity}</p>}
              </article>
            ))}
          </div>
          <small className="cw-note">AI 只看到統計數字與題目，沒有學生姓名；建議僅供參考。</small>
        </> : <div className="cw-ai-ask">
          <p>請 AI 依全班的題型答對率與共同錯題，整理最需要重講的題型、常見錯誤與課堂活動。</p>
          <button type="button" className="primary-button" disabled={loading || !ov.cats.length} onClick={() => ask(false)}>{loading ? <LoaderCircle size={17} className="spin" /> : <Bot size={17} />}{loading ? 'AI 分析中…' : '請 AI 分析全班弱點'}</button>
        </div>}
        {aiErr && <p className="cloud-error" role="alert">{aiErr}</p>}
      </div>
    </section>
  );
}
