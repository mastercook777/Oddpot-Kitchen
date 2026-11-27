import {CB_FORMULAS,resolveCBFormula} from './cooking_formulas_p1.js?v=cb2p1';
const all=Object.values(CB_FORMULAS);
export function cookwareAvailable(s,v){return ['WOK','POT'].includes(v)||v==='GRILL'&&!!s.kitchen.grillOwned||v==='STEAM'&&!!s.kitchen.steamerOwned;}
export function chapterFormulas(s,v){return all.filter(f=>f.world===s.cbExperiment.config.world&&(!v||f.vessel===v)&&cookwareAvailable(s,f.vessel)&&resolveCBFormula(f.ingredientIds,f.vessel,f.world)===f);}
export const hasStock=(s,f)=>f.ingredientIds.every(id=>s.inventory[id]>0);
export function discoveryStatus(s,f){return !(s.cbExperiment.discoveredRecipes||[]).includes(f.recipeId)?'new-recipe':!(s.cbExperiment.discoveredFormulas||[]).includes(f.formulaId)?'new-formula':'known';}
export function recipePreview(s,v,ids){
 const valid=Array.isArray(ids)&&ids.length<=3&&new Set(ids).size===ids.length;
 const candidates=valid?chapterFormulas(s,v).filter(f=>ids.every(id=>f.ingredientIds.includes(id))):[];
 const ready=candidates.filter(f=>hasStock(s,f)),exact=candidates.find(f=>f.ingredientIds.length===ids.length)||null;
 const canBegin=!!exact&&hasStock(s,exact);
 return {exact,canBegin,status:canBegin?discoveryStatus(s,exact):ready.length?'partial':candidates.length?'missing':'invalid',candidates,ready,next:[...new Set(ready.flatMap(f=>f.ingredientIds.filter(id=>!ids.includes(id))))]};
}
export function recipeAtlas(s,v){const groups=new Map();for(const f of chapterFormulas(s,v)){if(!groups.has(f.recipeId))groups.set(f.recipeId,[]);groups.get(f.recipeId).push(f);}
 return [...groups].map(([recipeId,formulas])=>{const known=s.cbExperiment.discoveredRecipes.includes(recipeId),discovered=formulas.filter(f=>s.cbExperiment.discoveredFormulas.includes(f.formulaId));const hint=[...formulas].sort((a,b)=>Number(hasStock(s,b))-Number(hasStock(s,a))||a.ingredientIds.length-b.ingredientIds.length)[0];return {recipeId,known,formulas,discovered,hint,available:formulas.some(f=>hasStock(s,f))};});}
export function craftLocked(s,id){return (s.cbExperiment.lockedCrafts||[]).includes(id);}
export function toggleCraftLock(s,id){if(!s.cbExperiment.collection.some(v=>v.variantId===id))return false;const a=s.cbExperiment.lockedCrafts??=[];const i=a.indexOf(id);if(i<0)a.push(id);else a.splice(i,1);return true;}
export function deleteCraft(s,deck,id){const a=s.cbExperiment.collection,i=a.findIndex(v=>v.variantId===id);if(i<0||deck.includes(id)||craftLocked(s,id))return false;a.splice(i,1);return true;}
