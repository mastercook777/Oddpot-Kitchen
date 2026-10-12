// v0.6.3-A: real-time ingredient-event adjudicator.
// No timed turns, no universal style buffs and no direct inventory writes.
import {ING,RECIPES,RECIPE_INDEX,recipeSignature} from './data.js?v=0.8.0';
import {RECIPE_PROFILES} from './recipe_profiles_v063.js?v=0.8.0';

export const LIVE_ACTIONS={
  WOK:[{id:'flip',name:'翻炒',emoji:'🍳'},{id:'toss',name:'颠勺',emoji:'↗'}],
  POT:[{id:'gentle',name:'轻搅',emoji:'🥄'},{id:'reduce',name:'收汁',emoji:'💧'}]
};
export const LIVE_STYLES={
  home:'家常',home_even:'均匀翻炒',burst:'爆炒',aroma:'香味十足',
  pot_home:'家常炖煮',gentle:'清润慢炖',reduced:'浓香收汁',legacy:'标准工艺'
};
export const LIVE_AFFINITY={signature:'招牌适配',viable:'适合',ordinary:'普通',off:'不契合'};
const REQUIRE={beef:5.4,chicken:6.1,chili:1.3,garlic:1.3,mushroom:2.9,cabbage:2.5,onion:2.8,potato:6.2,mushroom_heart:3.9,ember_pepper:1.9};
const AROMATICS=new Set(['onion','garlic','chili','mushroom','ember_pepper']);
const MAIN_PRIORITY=['beef','chicken','potato','cabbage','mushroom','mushroom_heart','onion','ember_pepper','chili','garlic'];
const PRIMARY_AROMATIC={garlic:true,onion:true,chili:true,mushroom:true,ember_pepper:true};
export const liveRecipeId=(ids,station)=>RECIPE_INDEX[recipeSignature(ids,station)]||null;

export function liveCookAmount(drop,t,actions,vessel){
 const rate=vessel==='POT'?.92:1.10;
 let count=Math.max(0,t-drop.t)*rate;
 for(const a of actions||[]){
  if(!a.with?.includes(drop.id))continue;
  count+=({flip:.9,toss:.45,gentle:.75,reduce:.35}[a.type]||0);
 }
 return count;
}
export function liveIngredientState(drop,t,actions,vessel){
 if(!drop)return '待下锅';
 const ratio=liveCookAmount(drop,t,actions,vessel)/(REQUIRE[drop.id]*(vessel==='POT'?1.18:1));
 const age=Math.max(0,t-drop.t);
 if(ratio<.65)return '偏生';
 if(ratio<1)return '受热中';
 if((ratio>3.4&&['beef','chicken','potato'].includes(drop.id))||
    age>(drop.id==='ember_pepper'&&vessel==='POT'?19:['garlic','chili','onion','ember_pepper'].includes(drop.id)?14:16))return '焦糊';
 return '熟透';
}
export function readCookFacts(ids,vessel,drops,actions,t){
 const ds=[...drops].sort((a,b)=>a.t-b.t||a.index-b.index);
 const leader=MAIN_PRIORITY.find(id=>ids.includes(id));
 const main=ds.find(d=>d.id===leader)||ds.find(d=>['beef','chicken','potato','cabbage','mushroom'].includes(d.id))||ds[0];
 const aromaLead=ds.some(d=>d.id!==main?.id&&PRIMARY_AROMATIC[d.id]&&
   main&&d.t<=main.t-1.05);
 const toss=actions.find(a=>a.type==='toss'),flip=actions.find(a=>a.type==='flip'),
       gentle=actions.find(a=>a.type==='gentle'),reduce=actions.find(a=>a.type==='reduce');
 const burst=!!(toss&&main&&toss.t>=main.t&&toss.t-main.t<=3.8&&toss.with.length>=2);
 const reduceGood=!!(reduce&&reduce.t>=4&&reduce.with.length>=2);
 // Garlic+mushroom has mushroom as main and garlic as aroma;
 // mushroom+chicken has chicken as main and mushroom as aroma.
 const style=vessel==='WOK'?
     (burst?'burst':aromaLead&&(flip||toss)?'aroma':flip?'home_even':'home'):
     (reduceGood?'reduced':gentle?'gentle':'pot_home');
 return {style,aromaLead,burst,evenHeat:!!flip,softStir:!!gentle,reduceGood,
   primaryIngredient:main?.id||null,ingredientOrder:ds.map(d=>d.id)};
}
export function resolveTechnique(recipeId,style){
 const profile=RECIPE_PROFILES[recipeId];
 const match=profile?.styles?.find(s=>s.code===style);
 // A generic dish may use a family template for neutral flavor narration;
 // it never inherits a Universal economic modifier.
 return {
   affinity:match?.affinity||'ordinary',
   affinityLabel:LIVE_AFFINITY[match?.affinity||'ordinary'],
   reason:match?.culinaryReason||(style==='burst'?'这锅带有明显的锅气。':style==='reduced'?'收汁形成了浓厚汤汁。':'食材组合形成了一道可售料理。'),
   guestFitDelta:match?.guestFitDelta||{},
   timeDeltaSeconds:match?.timeDeltaSeconds||0,
   priceDeltaCoins:match?.priceDeltaCoins||0,
   curated:!!profile
 };
}
export function evaluateLiveCook(ids,vessel,drops,actions,elapsed){
 const id=liveRecipeId(ids,vessel);
 const recipe=id&&RECIPES[id];
 const sorted=[...drops].sort((a,b)=>a.t-b.t||a.index-b.index);
 const facts=readCookFacts(ids,vessel,sorted,actions,elapsed);
 const missing=ids.filter(id=>!sorted.some(d=>d.id===id)),undercooked=[],burnt=[],slight=[];
 const doneness=sorted.map(d=>{
  const label=liveIngredientState(d,elapsed,actions,vessel);
  if(label==='偏生')undercooked.push(d.id);
  if(label==='受热中')slight.push(d.id);
  if(label==='焦糊')burnt.push(d.id);
  return {id:d.id,label};
 });
 const sellable=!!recipe&&!missing.length&&!undercooked.length&&!burnt.length;
 const technique=resolveTechnique(id,facts.style);
 const finishState=!recipe?'未知组合':missing.length?'漏下料':undercooked.length?'夹生失败':burnt.length?'焦糊失败':slight.length?'略欠火':'成功';
 let quality=72-slight.length*16;
 if(facts.aromaLead)quality+=4;
 if(facts.evenHeat||facts.softStir)quality+=5;
 if(facts.burst)quality+=6;
 if(facts.reduceGood)quality+=5;
 if(!actions.length)quality+=2;
 // Suitability is not an auto-win or auto-90. All styles can succeed.
 quality=Math.min(90,Math.max(35,quality));
 const extra=facts.burst?'锅气':facts.aromaLead?'香气底味':facts.evenHeat?'均匀受热':facts.softStir?'柔和融合':facts.reduceGood?'浓厚酱汁':'自然烹制';
 return {recipeId:id,recipeName:recipe?.name||'未识别料理',
  ids:[...ids],vessel,quality,sellable,status:finishState,style:facts.style,
  styleLabel:LIVE_STYLES[facts.style],secondaryTrait:extra,
  affinity:technique.affinity,affinityLabel:technique.affinityLabel,
  culinaryReason:technique.reason,events:sorted.map(d=>({...d})),
  actions:actions.map(a=>({...a,with:[...a.with]})),duration:+elapsed.toFixed(2),
  doneness:[...doneness,...missing.map(id=>({id,label:'未下锅'}))],
  reason:!sellable?finishState:(slight.length?'可以出售，但部分食材欠火，品质偏低。':technique.reason),
  facts};
}
export function legacyVariant(recipeId,quality){
 const r=RECIPES[recipeId];if(!r)return null;
 return {variantId:'legacy-'+recipeId,recipeId,ingredientIds:[...r.ids],vessel:r.station,
   style:'legacy',styleLabel:'标准工艺',secondaryTrait:null,quality,valid:true,legacy:true,
   techniqueSummary:'旧存档已学会的标准工艺（原有营业参数不变）'};
}
export function makeLiveVariant(result){
 const signature=[result.recipeId,[...result.ids].sort().join('+'),result.style,
   result.secondaryTrait].join('|');
 return {variantId:'v063-'+signature,recipeId:result.recipeId,ingredientIds:[...result.ids],
   vessel:result.vessel,style:result.style,styleLabel:result.styleLabel,
   secondaryTrait:result.secondaryTrait,quality:result.quality,valid:true,legacy:false,
   affinity:result.affinity,techniqueSummary:result.culinaryReason,
   discoveredAt:Date.now()};
}
