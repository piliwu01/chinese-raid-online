// 題庫抽題：每位學生、每份題庫、每個難度「抽完一輪才重複」。
// 全力暴擊（hard）的難題做完一輪後，改從尚未做過的中等題補題；中等題也做完，才重新洗牌難題。
const ORDER={hard:['hard','medium'],medium:['medium'],easy:['easy']};
const pickOne=(list,random)=>list[Math.floor(random()*list.length)];
export function seenOf(s,bankId){
 if(!s.seenQ||typeof s.seenQ!=='object')s.seenQ={};
 for(const k of Object.keys(s.seenQ))if(k!==bankId)delete s.seenQ[k]; // 只保留目前題庫，避免狀態無限長大
 const b=s.seenQ[bankId]&&typeof s.seenQ[bankId]==='object'?s.seenQ[bankId]:(s.seenQ[bankId]={});
 for(const d of ['easy','medium','hard'])if(!Array.isArray(b[d]))b[d]=[];
 return b;
}
export function pickBankQuestion(s,bank,diff,random=Math.random){
 const pool=bank.questions.filter(x=>x.status==='active');if(!pool.length)return null;
 const byDiff=d=>pool.filter(x=>(x.difficulty||'medium')===d);
 if(!s)return pickOne(byDiff(diff).length?byDiff(diff):pool,random);
 const seen=seenOf(s,bank.bankId||'bank');
 const tiers=(ORDER[diff]||[diff]).filter(d=>byDiff(d).length);
 if(!tiers.length){const x=pickOne(pool,random);return x;}
 for(const d of tiers){const done=new Set(seen[d]);const fresh=byDiff(d).filter(x=>!done.has(x.id));if(fresh.length){const x=pickOne(fresh,random);seen[d].push(x.id);return x;}}
 // 這個難度（含補題）都做完一輪：重新洗牌原本的難度
 const d=tiers[0];seen[d]=[];const x=pickOne(byDiff(d),random);seen[d].push(x.id);return x;
}
