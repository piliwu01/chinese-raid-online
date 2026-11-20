// 簡化屬性相剋：效果絕佳 ×1.25、效果不太好 ×0.8。（祥瑞＝fairy、凶煞＝dark、靈＝psychic）
const STRONG={fire:['grass','bug','ice','steel'],water:['fire','ground','rock'],grass:['water','ground','rock'],electric:['water','flying'],ice:['grass','ground','flying','dragon'],
 fighting:['normal','ice','rock','dark','steel'],poison:['grass','fairy'],ground:['fire','electric','poison','rock','steel'],flying:['grass','fighting','bug'],psychic:['fighting','poison'],
 bug:['grass','psychic','dark'],rock:['fire','ice','flying','bug'],dragon:['dragon'],dark:['psychic'],steel:['ice','rock','fairy'],fairy:['fighting','dragon','dark']};
export const SUPER=1.25,WEAK=0.8,CRIT_RATE=0.12,CRIT=1.5;
export function effectiveness(attacker,defender){
 if(STRONG[attacker]?.includes(defender))return {kind:'super',mult:SUPER};
 if(STRONG[defender]?.includes(attacker))return {kind:'weak',mult:WEAK};
 return {kind:null,mult:1};
}
