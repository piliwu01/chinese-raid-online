import React,{useEffect,useState} from 'react';
import {Bot,LoaderCircle} from 'lucide-react';
import {api} from './api.js';

// "還是不懂？" button shown under a wrong answer's explanation. The server only answers
// for questions the student just got wrong (today's ink monsters), so it cannot leak answers.
export default function AiTutor({feedback}){
 const bankId=feedback?.bankId,sourceId=feedback?.sourceId,key=`${bankId}:${sourceId}`;
 const [state,setState]=useState({key:'',text:'',error:'',busy:false});
 useEffect(()=>{setState({key,text:'',error:'',busy:false});},[key]);
 if(!feedback||feedback.correct||!bankId||bankId==='math-auto'||!sourceId)return null;
 const ask=async()=>{setState(s=>({...s,busy:true,error:''}));try{const r=await api('/ai/explain',{bankId,questionId:sourceId});setState(s=>({...s,busy:false,text:r.text}));}catch(e){setState(s=>({...s,busy:false,error:e.message}));}};
 return <div className="ai-tutor">
  {state.text?<div className="ai-tutor-answer"><span className="ai-tutor-label"><Bot size={15}/>AI 小老師</span><p>{state.text}</p><small>AI 說明僅供參考，以課本與老師說明為準。</small></div>
  :<button type="button" className="ai-tutor-button" disabled={state.busy} onClick={ask}>{state.busy?<LoaderCircle size={16} className="spin"/>:<Bot size={16}/>}{state.busy?'小老師思考中…':'還是不懂？問 AI 小老師'}</button>}
  {state.error&&<p className="ai-tutor-error">{state.error}</p>}
 </div>;
}
