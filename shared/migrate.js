// 舊題靈存檔 → 山海經神獸（2026-11-19）。可重複執行（idempotent）。
import {SPIRIT_BY_ID,currentId} from './catalog.js';
import {earnedTitles} from './play.js';
export const BESTIARY_VERSION=2;
export const spiritRef=p=>{const x=SPIRIT_BY_ID.get(currentId(p.id));return x?{id:x.id,name:x.name,zhName:x.zhName,type:x.type,gen:x.gen,...(p.shiny?{shiny:true}:{})}:null;};
export function migrateState(s){
 if(!s||s.bestiary===BESTIARY_VERSION)return s;
 if(s.growth&&s.growth.starter!=null)s.growth.starter=currentId(s.growth.starter);
 const seen=new Map();
 for(const p of Array.isArray(s.captured)?s.captured:[]){const r=spiritRef(p);if(!r)continue;const had=seen.get(r.id);if(had){if(r.shiny)had.shiny=true;}else seen.set(r.id,r);}
 s.captured=[...seen.values()];
 if(s.selected){const r=spiritRef(s.selected);s.selected=r||s.captured[0]||null;}
 if(s.battle&&s.battle.enemy&&!SPIRIT_BY_ID.has(s.battle.enemy.id))s.battle=null;
 if(s.title&&!earnedTitles(s.captured).includes(s.title))s.title='';
 s.bestiary=BESTIARY_VERSION;return s;
}
