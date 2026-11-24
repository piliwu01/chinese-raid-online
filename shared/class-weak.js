// 2026-11-24 老師端「全班弱點總覽」：把全班學生的題型答對率與待淨化錯題合起來（純函式，有單元測試）。
// 輸入：每位學生 {name, answered, cats:[{category,right,total}], wrongs:[{qid,stem,category}]}
export const CLASS_WEAK={minCat:5,low:0.6,topWrongs:8};

export function classWeak(rows){
 const cats={},wrongs={};
 for(const r of rows){
  for(const c of r.cats||[]){
   const x=cats[c.category]||={category:c.category,right:0,total:0,students:0,struggling:[]};
   x.right+=c.right;x.total+=c.total;x.students++;
   if(c.total>=CLASS_WEAK.minCat&&c.right/c.total<CLASS_WEAK.low)x.struggling.push(r.name);
  }
  const seen=new Set();
  for(const w of r.wrongs||[]){
   if(!w?.qid||seen.has(w.qid))continue;seen.add(w.qid);
   const y=wrongs[w.qid]||={qid:w.qid,stem:w.stem,category:w.category||'',names:[]};y.names.push(r.name);
  }
 }
 const catList=Object.values(cats).filter(c=>c.total>0).map(c=>({...c,rate:c.right/c.total})).sort((a,b)=>a.rate-b.rate||b.total-a.total);
 const wrongList=Object.values(wrongs).filter(w=>w.names.length>=2).sort((a,b)=>b.names.length-a.names.length).slice(0,CLASS_WEAK.topWrongs);
 const answered=rows.reduce((n,r)=>n+(r.answered||0),0);
 return {students:rows.length,withData:rows.filter(r=>(r.answered||0)>0).length,answered,cats:catList,wrongs:wrongList};
}
