import {remapLetters} from '../shared/option-shuffle.js';
// Groq AI helpers: model pick, chat, cached explanations, boss taunts, class analysis.
// The key lives in Cloudflare Secrets Store (binding GROQ_KEY); never sent to the browser.
import {taipeiDate} from '../shared/game.js';
import {inkReady} from '../shared/play.js';

const API='https://api.groq.com/openai/v1';
const PREFERRED=['openai/gpt-oss-120b','llama-3.3-70b-versatile','openai/gpt-oss-20b','qwen/qwen3-32b','llama-3.1-8b-instant'];
export const AI_LIMIT={explainPerDay:15,analysisEvery:60000};
export const TAUNT_KINDS=['start','boss','phase','ultimate','low'];
const TAUNT_POOL=6;
const STYLE='你是台灣的國中國文科老師助手。一律使用台灣繁體中文，絕對不要出現簡體字。不要使用 Markdown 標題、表格或粗體符號。';
let modelCache=null;

function aiError(message,status=503){const e=new Error(message);e.status=status;return e;}
async function keyOf(env){if(!env.GROQ_KEY)return null;try{return await env.GROQ_KEY.get();}catch{return null;}}

export function chooseModel(ids){
 const usable=ids.filter(id=>!/whisper|tts|guard|prompt|playai|orpheus|compound|allam/i.test(id));
 return PREFERRED.find(id=>usable.includes(id))||usable.find(id=>/llama|gpt-oss|qwen|kimi/i.test(id))||usable[0]||null;
}
async function modelFor(key){
 if(modelCache&&Date.now()-modelCache.at<3600000)return modelCache.id;
 const r=await fetch(`${API}/models`,{headers:{Authorization:`Bearer ${key}`}});if(!r.ok)throw aiError('AI 服務暫時無法連線，請稍後再試。',502);
 const ids=((await r.json()).data||[]).filter(m=>m.active!==false).map(m=>m.id);const id=chooseModel(ids);if(!id)throw aiError('目前沒有可用的 AI 模型。',502);
 modelCache={id,at:Date.now()};return id;
}
export function cleanText(text,max=900){
 return String(text||'').replace(/<think>[\s\S]*?<\/think>/g,'').replace(/^#+\s*/gm,'').replace(/\*\*/g,'').replace(/\n{3,}/g,'\n\n').trim().slice(0,max);
}
export async function chat(env,messages,maxTokens=500,temperature=.6){
 const key=await keyOf(env);if(!key)throw aiError('AI 功能尚未設定金鑰。');
 const model=await modelFor(key);const body={model,messages,temperature,max_tokens:model.includes('gpt-oss')?maxTokens+700:maxTokens};
 if(model.includes('gpt-oss'))body.reasoning_effort='low';
 const r=await fetch(`${API}/chat/completions`,{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
 if(r.status===429)throw aiError('AI 小老師現在太多人問了，請過一分鐘再試。',429);
 if(!r.ok){if(r.status===404||r.status===400)modelCache=null;throw aiError('AI 暫時忙碌，請稍後再試。',502);}
 const text=cleanText((await r.json()).choices?.[0]?.message?.content);if(!text)throw aiError('AI 這次沒有回答，請再試一次。',502);return text;
}

async function cacheGet(db,key){return (await db.prepare('SELECT text FROM ai_cache WHERE key=?').bind(key).first())?.text||null;}
async function cachePut(db,key,text){await db.prepare('INSERT OR REPLACE INTO ai_cache(key,text,created_at) VALUES(?,?,?)').bind(key,text,Date.now()).run();}

export function explainPrompt(x){
 const options=['A','B','C','D'].map(k=>`${k}. ${x.options?.[k]??''}`).join('\n');
 return [{role:'system',content:STYLE+'說話對象是國中生，語氣親切、像學長姐在旁邊講解。只能根據題目、選項與原解析說明，不要編造課文原文、作者生平或出處。'},
  {role:'user',content:`題目：${x.stem}\n${options}\n正確答案：${x.answer}\n原本的解析：${x.explanation||'（無）'}\n\n學生答錯了，看完原本的解析還是不太懂。請換個方式教他，依序寫：\n1. 一句話說出這題在考什麼。\n2. 用生活化的例子或比喻，說明為什麼答案是 ${x.answer}。\n3. 挑一個最容易誤選的選項，說明它錯在哪裡。\n4. 一句好記的小訣竅。\n每點前面標上 1. 2. 3. 4.，全部不超過 220 字。`}];
}

// POST /ai/explain {bankId, questionId}
export async function explain(env,user,body){
 const db=env.DB,bankId=String(body.bankId||''),questionId=String(body.questionId||'');
 if(!bankId||bankId==='math-auto'||!questionId||bankId.length>80||questionId.length>80)throw aiError('這題沒有可以說明的資料。',400);
 if(user.role!=='teacher'){
  const state=JSON.parse((await db.prepare('SELECT data FROM progress WHERE user_id=?').bind(user.id).first()).data);
  const m=(state.inkNest||[]).find(i=>i.bankId===bankId&&i.questionId===questionId);
  if(!m)throw aiError('答錯的題目要過幾秒才會送進墨漬怪巢穴，請稍等一下再按。',409);
  if(inkReady(m,taipeiDate(Date.now())))throw aiError('這隻墨漬怪已經醒來了，先自己挑戰淨化，答錯後再請小老師說明。',403);
 }
 // 選項每次會打亂：AI 說明用題庫原本的字母，回傳前換成學生畫面上的字母。
 const order=/^[ABCD]{4}$/.test(String(body.order||''))&&new Set(String(body.order)).size===4?String(body.order):'ABCD',toShown={};[...order].forEach((old,i)=>{toShown[old]='ABCD'[i];});const shown=t=>remapLetters(t,toShown);
 const cacheKey=`explain:${bankId}:${questionId}`;const cached=await cacheGet(db,cacheKey);if(cached)return {text:shown(cached),cached:true};
 const day=taipeiDate(Date.now());
 const used=(await db.prepare('INSERT INTO ai_usage(user_id,day,count) VALUES(?,?,1) ON CONFLICT(user_id,day) DO UPDATE SET count=count+1 RETURNING count').bind(user.id,day).first()).count;
 if(user.role!=='teacher'&&used>AI_LIMIT.explainPerDay)throw aiError(`今天已經問了 ${AI_LIMIT.explainPerDay} 次，明天再來問小老師吧！`,429);
 const row=await db.prepare('SELECT data FROM banks WHERE id=?').bind(bankId).first();if(!row)throw aiError('找不到這份題庫。',404);
 const x=JSON.parse(row.data).questions.find(q=>q.id===questionId);if(!x)throw aiError('找不到這一題。',404);
 const text=await chat(env,explainPrompt(x),450,.5);await cachePut(db,cacheKey,text);return {text:shown(text),cached:false};
}

const TAUNT_SCENE={start:'討伐剛開始，全班準備向你進攻',boss:'你剛對全班發動反擊，打掉他們的護盾',phase:'你的血量剩一半，進入暴走狀態，渾身冒出紅色墨焰',ultimate:'全班同時答對發動合體大招，你被打得暈頭轉向',low:'你的血量快見底了，但還在逞強'};
// Pool of cached taunts per scene; the API is called only until each pool is full.
export async function taunt(env,kind){
 if(!TAUNT_KINDS.includes(kind))throw aiError('沒有這種台詞。',400);
 const db=env.DB,slot=Math.floor(Math.random()*TAUNT_POOL),key=`taunt:${kind}:${slot}`;const cached=await cacheGet(db,key);if(cached)return {text:cached};
 const text=cleanText(await chat(env,[{role:'system',content:STYLE+'你扮演國文遊戲裡的魔王「墨卷魔神」，由古書墨跡化成，說話霸氣、帶點文言腔，但適合國中生、不粗俗、不罵人、不提暴力細節。'},{role:'user',content:`情境：${TAUNT_SCENE[kind]}。請說一句台詞，18 個字以內，可以化用成語或古文語氣。只輸出台詞本身，不要加引號或說明。`}],80,1),40).replace(/^[「『"']+|[」』"']+$/g,'');
 await cachePut(db,key,text);return {text};
}

// stats: {questionId:{stem,category,right,wrong}} recorded by the raid room.
export function summarizeStats(stats={}){
 const list=Object.entries(stats).map(([id,v])=>({id,...v,total:v.right+v.wrong,rate:v.wrong/Math.max(1,v.right+v.wrong)}));
 const categories={};for(const q of list){const c=categories[q.category||'其他']||={category:q.category||'其他',right:0,wrong:0};c.right+=q.right;c.wrong+=q.wrong;}
 const cats=Object.values(categories).map(c=>({...c,total:c.right+c.wrong,rate:c.wrong/Math.max(1,c.right+c.wrong)})).sort((a,b)=>b.rate-a.rate||b.total-a.total);
 const hardest=list.filter(q=>q.wrong>0).sort((a,b)=>b.wrong-a.wrong||b.rate-a.rate).slice(0,6);
 return {answered:list.reduce((n,q)=>n+q.total,0),correct:list.reduce((n,q)=>n+q.right,0),categories:cats,hardest};
}
export async function analyze(env,summary,meta){
 const pct=x=>`${Math.round(x*100)}%`;
 const lines=summary.categories.map(c=>`${c.category}：作答 ${c.total} 次，錯誤率 ${pct(c.rate)}`).join('\n');
 const hard=summary.hardest.map((q,i)=>`${i+1}. （${q.category}）${q.stem}　錯 ${q.wrong} 次／共 ${q.total} 次`).join('\n');
 return chat(env,[{role:'system',content:STYLE+'你要幫國中國文老師解讀一場全班答題遊戲的結果，給具體、可在下一節課執行的建議。只根據提供的數據與題目，不要編造數據。'},
  {role:'user',content:`班級：${meta.className}，題庫：${meta.bankTitle}，參與 ${meta.members} 人，共作答 ${summary.answered} 次，答對 ${summary.correct} 次。\n\n各題型錯誤率：\n${lines}\n\n錯最多的題目：\n${hard||'（沒有錯題）'}\n\n請寫給老師看，分三段，每段開頭用【】標出：【整體表現】一到兩句。【主要弱點】指出最需要加強的一到兩個題型或觀念，引用上面的題目當例子。【下一節課建議】兩到三個具體的教學活動或提問方式。全部 300 字以內。`}],700,.4);
}

// 2026-11-23 學生端「AI 學習健檢」：依自己的題型答對率與錯題，請 AI 找出強項、最需加強的題型與練習建議。
// 至少答 30 題才開放；每人每天產生 1 次（同一天再看就用快取）；不送姓名、不送答案。
export const STUDY_CHECK={minAnswered:30};
export function studyPrompt(summary,wrongs){
 const pct=x=>`${Math.round(x*100)}%`;
 const lines=summary.cats.filter(c=>c.total>0).map(c=>`${c.category}：答對 ${c.right} 題、答錯 ${c.wrong} 題（答對率 ${pct(c.rate)}）`).join('\n');
 const wrong=wrongs.map((w,i)=>`${i+1}. （${w.category||'未分類'}）${w.stem}`).join('\n');
 return [{role:'system',content:STYLE+'你是國中生的國文學習教練，說話親切、具體、鼓勵，但要誠實指出問題。只根據提供的數據與錯題，不要編造數字，不要給出任何題目的答案。'},
  {role:'user',content:`這位國中生最近在國文複習遊戲的表現：總共作答 ${summary.answered} 題，答對率 ${pct(summary.accuracy||0)}，近 7 天有 ${summary.activeDays7} 天練習。\n\n各題型表現：\n${lines}\n\n最近答錯、還沒弄懂的題目：\n${wrong||'（沒有）'}\n\n請只輸出一段 JSON，不要有其他文字，格式：{"strength":"一到兩句，說他的強項","weak":[{"category":"題型名稱（必須是上面出現過的題型）","reason":"從錯題看出的共通問題，一到兩句"}],"plan":["本週具體練習建議 1","建議 2","建議 3"]}。weak 最多 2 項，挑答對率最低、題數夠多的題型；plan 每句不超過 40 字，要能直接照做（例如在冒險選哪種題型的招式卡、先淨化哪些墨漬怪）。`}];
}
export function parseStudy(text,cats){
 const m=String(text||'').match(/\{[\s\S]*\}/);if(!m)return null;
 try{const j=JSON.parse(m[0]);const names=new Set(cats.map(c=>c.category));
  const weak=(Array.isArray(j.weak)?j.weak:[]).filter(w=>w&&names.has(String(w.category))).slice(0,2).map(w=>({category:String(w.category),reason:cleanText(String(w.reason||''),120)}));
  const plan=(Array.isArray(j.plan)?j.plan:[]).map(p=>cleanText(String(p),60)).filter(Boolean).slice(0,3);
  const strength=cleanText(String(j.strength||''),120);
  return strength||weak.length||plan.length?{strength,weak,plan}:null;
 }catch{return null;}
}
export async function studyCheck(env,user,{studySummary,categorize},now=Date.now()){
 if(user.role!=='student')throw aiError('學習健檢是給學生用的。',403);
 const db=env.DB,row=await db.prepare('SELECT data FROM progress WHERE user_id=?').bind(user.id).first(),state=JSON.parse(row.data),summary=studySummary(state,now);
 if(summary.answered<STUDY_CHECK.minAnswered)throw aiError(`再答 ${STUDY_CHECK.minAnswered-summary.answered} 題，就能請 AI 小老師幫你做學習健檢！`,409);
 const day=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Taipei'}).format(new Date(now)),key=`study:${user.id}:${day}`;
 const cached=await cacheGet(db,key);if(cached)return {...JSON.parse(cached),cached:true,day};
 const nest=(state.inkNest||[]).slice(-10);const banks={};
 const wrongs=[];for(const m of nest){if(!banks[m.bankId]){const b=await db.prepare('SELECT data FROM banks WHERE id=?').bind(m.bankId).first();banks[m.bankId]=b?JSON.parse(b.data):{questions:[]};}
  const q=banks[m.bankId].questions.find(x=>x.id===m.questionId);wrongs.push({stem:String(m.stem||'').slice(0,60),category:q?categorize(q):''});}
 const result=parseStudy(await chat(env,studyPrompt(summary,wrongs),600,.5),summary.cats);
 if(!result)throw aiError('AI 小老師這次沒有整理好，請稍後再試一次。',502);
 await cachePut(db,key,JSON.stringify(result));return {...result,cached:false,day};
}
