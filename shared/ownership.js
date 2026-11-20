import {partnerFor} from '../src/growth.js';import {currentId} from './catalog.js';import {spiritRef} from './migrate.js';
export function ownedSpirit(state,id){
 const value=Number(id);if(!Number.isSafeInteger(value)||value<1)return null;
 const partner=partnerFor(state.growth);if(partner?.id===value)return partner;
 const hit=(Array.isArray(state.captured)?state.captured:[]).find(p=>currentId(p.id)===value);return hit?spiritRef(hit):null;
}
export const canUseSpirit=(state,id)=>!!ownedSpirit(state,id);
export function usableSpirit(state){const partner=partnerFor(state.growth),all=[partner,...(state.captured||[])].filter(Boolean);return [...new Map(all.map(p=>[p.id,p])).values()].map(p=>ownedSpirit(state,p.id)).filter(Boolean);}
