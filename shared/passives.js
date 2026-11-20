// 初始四位主角（含進化型態）的被動能力：只在單人對戰生效，答對時 15% 機率發動，效果隨進化階段加強。
export const PASSIVE_RATE=0.15;
// 每個數值陣列依序為：第一階段、第二階段、最終型態
export const PASSIVE_NUM={kuiExtra:[0.5,0.75,1],heal:[25,35,50],burnDamage:[15,20,25],burnTurns:3,shell:[1,2,3]};
const pct=x=>`${Math.round(x*100)}%`;
export const PASSIVES={
 kui:{id:'kui',name:'雷鼓震天',icon:'⚡',when:'答對攻擊時',lore:'黃帝以夔皮為鼓，聲聞五百里。',desc:st=>`追加一次雷擊，額外造成這次傷害的 ${pct(PASSIVE_NUM.kuiExtra[st])}。`,steps:`額外傷害 ${PASSIVE_NUM.kuiExtra.map(pct).join(' → ')}`},
 dangkang:{id:'dangkang',name:'大穰之兆',icon:'🌾',when:'答對時',lore:'「見則天下大穰」，牠一出現就是豐年。',desc:st=>`回復 ${PASSIVE_NUM.heal[st]} HP。`,steps:`回復 ${PASSIVE_NUM.heal.join(' → ')} HP`},
 bifang:{id:'bifang',name:'訛火燎原',icon:'🔥',when:'答對攻擊時',lore:'「見則其邑有訛火」。',desc:st=>`讓對手灼燒，接下來 3 回合每回合扣 ${PASSIVE_NUM.burnDamage[st]} HP。`,steps:`每回合灼燒 ${PASSIVE_NUM.burnDamage.join(' → ')} HP`},
 xuangui:{id:'xuangui',name:'玄甲護身',icon:'🛡️',when:'答對時',lore:'玄甲堅固，「佩之不聾」。',desc:st=>`張開玄甲，擋下之後 ${PASSIVE_NUM.shell[st]} 次反擊（暴走也能擋）。`,steps:`可擋反擊 ${PASSIVE_NUM.shell.join(' → ')} 次`},
};
const LINE={2010:['kui',0],2011:['kui',1],2012:['kui',2],2007:['dangkang',0],2008:['dangkang',1],2009:['dangkang',2],2001:['bifang',0],2002:['bifang',1],2003:['bifang',2],2004:['xuangui',0],2005:['xuangui',1],2006:['xuangui',2]};
// 回傳 {id,name,icon,when,stage,text}；野外神獸沒有被動能力
export function passiveFor(id){const l=LINE[Number(id)];if(!l)return null;const p=PASSIVES[l[0]];return {...p,stage:l[1],desc:p.desc(l[1])};}
