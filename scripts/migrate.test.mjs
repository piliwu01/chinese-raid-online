import test from 'node:test';import assert from 'node:assert/strict';
import {migrateState} from '../shared/migrate.js';import {applyAction,publicState} from '../shared/game.js';import {CATALOG,SPIRIT_BY_ID,LEGACY_IDS} from '../shared/catalog.js';import {partnerFor} from '../src/growth.js';
const legacy=()=>({growth:{version:1,evolutionRules:2,starter:25,stage:1,xp:5000,mastered:{},rounds:{},answered:3,correct:2},nickname:'小雷',food:3,bond:2,days:[],fed:[],roundDays:[],passes:{},claimed:{},items:{},
 captured:[{id:25,name:'Zappip',zhName:'雷啾啾',type:'electric',gen:1},{id:1010,name:'Inkstone',zhName:'墨硯龜',type:'water',gen:1},{id:1010,name:'Inkstone',zhName:'墨硯龜',type:'water',gen:1,shiny:true},{id:94,name:'Gloomwisp',zhName:'幽燈靈',type:'ghost',gen:1}],
 selected:{id:1010,name:'Inkstone',zhName:'墨硯龜',type:'water',gen:1},battle:{id:'b',status:'ready',enemy:{id:130},hp:5,maxHp:10},title:'文房雅士'});
test('legacy ids map to distinct new spirits and every old catalog id is covered',()=>{const v=Object.values(LEGACY_IDS);assert.equal(new Set(v).size,v.length);for(const id of v)assert(SPIRIT_BY_ID.has(id));});
test('migrateState converts starter, collection, selection, battle and title; idempotent',()=>{
 const s=migrateState(legacy());assert.equal(s.growth.starter,2010);assert.equal(partnerFor(s.growth).id,2011);
 assert.deepEqual(s.captured.map(p=>p.id),[2010,LEGACY_IDS[1010],LEGACY_IDS[94]]);assert.equal(s.captured[1].shiny,true);assert.equal(s.captured[1].zhName,SPIRIT_BY_ID.get(LEGACY_IDS[1010]).zhName);
 assert.equal(s.selected.id,LEGACY_IDS[1010]);assert.equal(s.battle,null);assert.equal(s.title,'');assert.equal(s.bestiary,2);
 const again=JSON.stringify(s);migrateState(s);assert.equal(JSON.stringify(s),again);
 assert.equal(s.growth.xp,5000);assert.equal(s.nickname,'小雷');
});
test('legacy save works through game actions and public state',()=>{const s=legacy();const v=publicState(s,1000);assert.equal(v.growth.starter,2010);applyAction(s,'/battle/start',{},1000);assert(CATALOG.some(p=>p.id===s.battle.enemy.id));assert.equal(s.battle.enemy.quote,undefined);});
