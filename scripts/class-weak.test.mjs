import test from 'node:test';import assert from 'node:assert/strict';
import {classWeak} from '../shared/class-weak.js';
import {classWeakPrompt,parseClassWeak} from '../server/ai.js';

const rows=[
 {name:'甲生',answered:40,cats:[{category:'修辭',right:2,total:10},{category:'成語',right:9,total:10}],wrongs:[{qid:'b:1',stem:'修辭題一',category:'修辭'},{qid:'b:2',stem:'成語題',category:'成語'}]},
 {name:'乙生',answered:30,cats:[{category:'修辭',right:5,total:10},{category:'成語',right:8,total:10}],wrongs:[{qid:'b:1',stem:'修辭題一',category:'修辭'},{qid:'b:1',stem:'修辭題一',category:'修辭'}]},
 {name:'丙生',answered:0,cats:[],wrongs:[]},
];
test('class weakness: totals, sort low to high, struggling students, shared wrong questions',()=>{
 const o=classWeak(rows);
 assert.equal(o.students,3);assert.equal(o.withData,2);assert.equal(o.answered,70);
 assert.deepEqual(o.cats.map(c=>c.category),['修辭','成語']);
 assert.equal(+o.cats[0].rate.toFixed(2),0.35);assert.deepEqual(o.cats[0].struggling,['甲生','乙生']);assert.deepEqual(o.cats[1].struggling,[]);
 assert.equal(o.wrongs.length,1);assert.equal(o.wrongs[0].stem,'修辭題一');assert.deepEqual(o.wrongs[0].names,['甲生','乙生']);
});
test('class weakness AI: prompt has no student names, reply is filtered to real categories',()=>{
 const o=classWeak(rows),p=JSON.stringify(classWeakPrompt(o,'701'));
 assert.ok(!p.includes('甲生')&&!p.includes('乙生'));assert.match(p,/修辭/);assert.match(p,/2 位學生答錯/);
 const r=parseClassWeak('好的：{"overall":"整體還不錯","focus":[{"category":"修辭","why":"分不清譬喻轉化","reteach":"比較兩者","activity":"找課文例句"},{"category":"火星文","why":"x"},{"category":"修辭","why":"重複"}]}',o.cats);
 assert.equal(r.overall,'整體還不錯');assert.equal(r.focus.length,1);assert.equal(r.focus[0].activity,'找課文例句');
 assert.equal(parseClassWeak('沒有 JSON',o.cats),null);
});
