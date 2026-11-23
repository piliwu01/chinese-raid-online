// 冒險奇遇彈窗：藏寶螺、古書殘頁。題目與結果都由伺服器決定，畫面只負責顯示與送出選擇。
import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Clock, X } from 'lucide-react';

const LOOK = {
  shell: { icon: '🐚', tone: 'shell', intro: '草叢裡有一顆閃閃發亮的藏寶螺！連續答對 3 題就能打開牠。' },
  page: { icon: '📜', tone: 'page', intro: '一陣風吹來一張發光的古書殘頁，上面寫著一道題目。答對經驗值加倍！' },
};

export default function EncounterModal({ enc, act, busy, bankId }) {
  const [res, setRes] = useState(null), [fb, setFb] = useState(null), [now, setNow] = useState(Date.now());
  const auto = useRef('');
  const look = LOOK[enc.kind] || LOOK.page, q = enc.question;
  const secs = q ? Math.max(0, Math.ceil((q.expires - now) / 1000)) : 0;
  useEffect(() => { if (!q) return; const t = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(t); }, [q?.id]);
  const call = async (path, body = {}) => { try { return await act(path, body); } catch { return null; } };
  const ask = async () => { setFb(null); await call('/encounter/question', { bankId }); };
  const answer = async choice => {
    if (!q) return; const r = await call('/encounter/answer', { questionId: q.id, choice });
    if (r) { setFb(r.event); setRes(r.event.encounter); }
  };
  useEffect(() => { if (q && secs === 0 && auto.current !== q.id && !busy) { auto.current = q.id; answer(null); } }, [secs, q?.id]);
  const skip = async () => { const r = await call('/encounter/skip'); if (r) setRes(r.event.encounter); };
  const close = () => call('/encounter/close');
  const result = enc.done ? (res || enc.result) : null;

  return (
    <div className="encounter-overlay" role="dialog" aria-modal="true" aria-label={`奇遇：${enc.name}`}>
      <section className={`encounter-card tone-${look.tone}`}>
        <header className="enc-head">
          <span className="enc-icon" aria-hidden="true">{look.icon}</span>
          <div><span className="enc-kicker">✨ 奇遇！</span><h2>{enc.name}</h2></div>
          {!enc.done && <button type="button" className="enc-skip" onClick={skip} disabled={busy} aria-label="略過奇遇"><X size={18} />略過</button>}
        </header>
        {enc.kind === 'shell' && <div className="enc-locks" aria-label={`已打開 ${enc.opened} / ${enc.need} 道鎖`}>{Array.from({ length: enc.need }, (_, i) => <i key={i} className={i < enc.opened ? 'on' : ''}>{i < enc.opened ? '🔓' : '🔒'}</i>)}</div>}

        {result ? <div className="enc-result">
            <p>{result.text}</p>
            {fb && !fb.correct && <p className="enc-answer">正確答案：{fb.answerText}</p>}
            <button className="primary-button enc-go" onClick={close} disabled={busy}>繼續冒險<ArrowRight size={20} /></button>
          </div>
          : q ? <div className="enc-body">
            <div className="enc-qhead"><span>{enc.kind === 'shell' ? `第 ${enc.opened + 1} 道鎖` : '古書殘頁的題目'}</span><b><Clock size={15} />{secs} 秒</b></div>
            <h3>{q.question}</h3>
            <div className="enc-options">{q.options.map((o, i) => <button key={o} disabled={busy} onClick={() => answer(o)}><span>{String.fromCharCode(65 + i)}</span><b>{q.optionTexts?.[o] ?? o}</b></button>)}</div>
          </div>
          : <div className="enc-body">
            {fb && fb.correct && res && <p className="enc-step">{res.text}</p>}
            {!fb && <p className="enc-intro">{look.intro}</p>}
            <button className="primary-button enc-go" onClick={ask} disabled={busy}>{fb ? '下一題' : '接受挑戰'}<ArrowRight size={20} /></button>
          </div>}
      </section>
    </div>
  );
}
