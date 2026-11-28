// Shared production/workshop Build rules. No engine, fixture or save dependencies.
import {resolveCBFormula} from './cooking_formulas_p1.js?v=cb2p1';
import {judgeCooking,seeded} from './cooking_quality_r1.js?v=cb2r1e';
export const TIERS=['','普通','良好','优秀','史诗','传说'];
export const COLORS=['','#a6a6a6','#67a967','#559add','#ac83db','#e1a44a'];
export const LEVELS=[7,9,11,13];
export const AFFIX={
 quick:{name:'快手',tier:1,group:'time',min:8,max:18,desc:v=>'出餐时间 −'+v+'%'},
 fine:{name:'珍馐',tier:1,group:'price',min:8,max:20,desc:v=>'售价 +'+v+'%'},
 aroma:{name:'香飘四溢',tier:1,group:'demand',min:10,max:30,desc:v=>'点单权重 +'+v+'%'},
 aftertaste:{name:'回味无穷',tier:1,group:'sat',min:3,max:8,desc:v=>'满意度 +'+v},
 wait:{name:'望梅止渴',tier:1,group:'patience',min:10,max:20,desc:v=>'等待耐心 +'+v+'%'},
 frugal:{name:'精打细算',tier:1,group:'refund',min:5,max:15,desc:v=>v+'% 概率返还一份基础食材'},
 solo:{name:'独门绝技',tier:2,group:'time',min:12,max:18,desc:v=>'菜单唯一该厨具时出餐 −'+v+'%'},
 stars:{name:'众星捧月',tier:3,group:'price',min:6,max:8,desc:v=>'其他每道普通菜售价 +'+v+'%（最多3道）'}
};
export const hash=(str,seed=2166136261)=>{let h=seed>>>0;for(const c of String(str)){h=Math.imul(h^c.charCodeAt(0),16777619)>>>0}return h};
export function baseTier(result,seed=0,txn='preview'){return result?.cbVerdict?.baseTier??(result?judgeCooking(result,seed,txn).baseTier:0)}
export function rarityOf(base,affixes){if(base!==3)return base;return affixes.some(a=>AFFIX[a.id]?.tier===3)?5:affixes.length>=2?4:3}
export function signature(v){return [v.recipeId,v.vessel,v.formulaId||v.ingredientIds.slice().sort().join(','),v.baseTier,...v.affixes.map(a=>a.id+':'+a.value).sort()].join('|')}
export function identify(result,seed,txn){
 const base=baseTier(result,seed,txn);if(!base)return null;const random=seeded(seed,txn,'cb2r1-affix-selection'),rollValue=seeded(seed,txn,'cb2r1-affix-value'),affixes=[];
 const weight=()=>1; // R1 open pool baseline; no technique-to-affix mapping.
 function add(tiers){const pool=Object.entries(AFFIX).filter(([id,a])=>tiers.includes(a.tier)&&!affixes.some(x=>AFFIX[x.id].group===a.group)&&(id!=='frugal'||result.ids.some(x=>['beef','chicken','chili','garlic','mushroom','cabbage','onion','potato','cloud_rice','sky_moss','storm_egg','sour_bell'].includes(x))));let n=random()*pool.reduce((s,[id])=>s+weight(id),0);const hit=pool.find(([id])=>(n-=weight(id))<0)||pool.at(-1);if(!hit)return false;const [id,a]=hit;affixes.push({id,value:a.min+Math.floor(rollValue()*(a.max-a.min+1))});return true}
 if(base===3){add([1]);const roll=random();if(roll<.05){if(add([3])&&random()<.5)add([1,2]);else if(affixes.length===1)add([1,2])}else if(roll<.25)add([1,2]);}
 const formula=result.formula||resolveCBFormula(result.ids,result.vessel,['cloud_rice','sky_moss','storm_egg','sour_bell','gale_core'].some(id=>result.ids.includes(id))?'cloud':'hearth');if(!formula||formula.recipeId!==result.recipeId)return null;
 const v={recipeId:result.recipeId,vessel:result.vessel,style:result.style,styleLabel:result.styleLabel,formulaId:formula.formulaId,basePrice:formula.basePrice,baseTime:formula.baseTime,materialCost:formula.materialCost,recipeTags:[...formula.recipeTags],ingredientIds:[...formula.ingredientIds],baseTier:base,rarity:rarityOf(base,affixes),affixes,source:txn};
 v.variantId='cb-'+hash(signature(v)).toString(36)+'-'+hash(signature(v),12345).toString(36);return v;
}

export function evaluateCBDeck(collection,deck,level,eligible){
 const variants=deck.map(id=>collection.find(v=>v.variantId===id));
 const used=variants.reduce((n,v)=>n+(v?.rarity||0),0),limit=LEVELS[level-1],slots=level===4?4:3,reasons=[];
 if(deck.length<3||deck.length>slots)reasons.push('需配置3至'+slots+'道菜');
 if(variants.some(v=>!v))reasons.push('未知工艺');
 if(new Set(variants.map(v=>v?.recipeId)).size!==variants.length)reasons.push('同菜不可重复');
 if(used>limit)reasons.push('超出容量');
 if(variants.some(v=>v&&!eligible(v)))reasons.push('缺少对应厨具或章节不符');
 if(!Number.isInteger(level)||level<1||level>4)reasons.push('未知厨房等级');
 return {used,limit,slots,variants,valid:!reasons.length,reasons};
}
export function compileCBDeck(variants,premiumRecipeId=null){
 const crafts={};
 for(const v of variants){
  // Historical crafts carry exact prior economics, never re-roll or stack new affixes.
  if(v.legacySnapshot){crafts[v.recipeId]={...structuredClone(v.legacySnapshot),recipeId:v.recipeId,formulaId:v.formulaId,variantId:v.variantId,rarity:v.rarity,affixes:[],cb:{discount:0,gain:0,aroma:0,sat:0,wait:0,refund:0}};continue;}
  const value=id=>v.affixes.find(x=>x.id===id)?.value||0;
  const discount=Math.max(value('quick'),variants.filter(x=>x.vessel===v.vessel).length===1?value('solo'):0);
  const gain=value('fine')+value('stars')*Math.min(3,variants.filter(x=>x!==v&&x.rarity===1&&x.recipeId!==premiumRecipeId).length);
  crafts[v.recipeId]={recipeId:v.recipeId,formulaId:v.formulaId,materialCost:v.materialCost,variantId:v.variantId,style:v.style,styleLabel:v.styleLabel,quality:[0,66,76,86][v.baseTier],ingredientIds:[...v.ingredientIds],price:Math.round(v.basePrice*(1+gain/100)),basePrice:v.basePrice,baseTime:v.baseTime,timeDelta:-Math.min(v.baseTime*.25,v.baseTime*discount/100),guestFitDelta:{},recipeTags:[...v.recipeTags],affixes:structuredClone(v.affixes),rarity:v.rarity,cb:{discount,gain,aroma:value('aroma'),sat:value('aftertaste'),wait:value('wait'),refund:value('frugal')}};
 }
 return crafts;
}
