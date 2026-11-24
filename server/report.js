// 老師端：個人學習報告（依班級）。
import {studySummary} from '../shared/learning.js';
import {levelFor,partnerFor} from '../src/growth.js';
import {unlockedUpTo} from '../shared/chapters.js';
import {classWeak} from '../shared/class-weak.js';
import {categorize} from '../shared/play.js';
export async function learningReport(env,className){
 const db=env.DB;
 const {results}=await db.prepare("SELECT u.id,u.username,u.display_name,u.class_name,p.data,(SELECT max(created_at) FROM operations o WHERE o.user_id=u.id) last_op FROM users u JOIN progress p ON p.user_id=u.id WHERE u.role='student' AND (?='' OR u.class_name=?) ORDER BY u.class_name,u.username").bind(className,className).all();
 const now=Date.now();
 return results.map(r=>{const s=JSON.parse(r.data),st=studySummary(s,now),g=s.growth||{};
  const answered=st.answered||g.answered||0,correct=st.answered?st.correct:(g.correct||0);
  return {id:r.id,username:r.username,name:r.display_name,className:r.class_name,partner:partnerFor(g)?.zhName||'（尚未選擇）',level:levelFor(g.xp||0),
   answered,correct,accuracy:answered?correct/answered:null,cats:st.cats,weak:st.weak.map(c=>c.category),week:st.week,activeDays7:st.activeDays7,
   ink:(s.inkNest||[]).length,inkStems:(s.inkNest||[]).slice(-8).reverse().map(m=>m.stem),purified:st.purified,captured:(s.captured||[]).length,chapter:unlockedUpTo(s),
   lastActive:Math.max(st.last||0,r.last_op||0)||null};});
}

// 2026-11-24 全班弱點總覽：題型答對率合計、各題型需要關心的學生、最多人答錯（還沒淨化）的題目。
export async function classWeakness(env,className){
 const db=env.DB;
 const {results}=await db.prepare("SELECT u.display_name,p.data FROM users u JOIN progress p ON p.user_id=u.id WHERE u.role='student' AND (?='' OR u.class_name=?)").bind(className,className).all();
 const banks={},bankOf=async id=>{if(!(id in banks)){const b=await db.prepare('SELECT data FROM banks WHERE id=?').bind(id).first();banks[id]=b?JSON.parse(b.data):{questions:[]};}return banks[id];};
 const rows=[];
 for(const r of results){const s=JSON.parse(r.data),st=studySummary(s),wrongs=[];
  for(const m of (s.inkNest||[]).slice(-30)){const b=await bankOf(m.bankId),q=b.questions.find(x=>x.id===m.questionId);wrongs.push({qid:`${m.bankId}:${m.questionId}`,stem:String(m.stem||q?.stem||'').slice(0,80),category:q?categorize(q):''});}
  rows.push({name:r.display_name,answered:st.answered,cats:st.cats,wrongs});}
 return classWeak(rows);
}
