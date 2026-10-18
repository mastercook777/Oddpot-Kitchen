// v0.6.3-A: real-time ingredient-event adjudicator.
// No timed turns, no universal style buffs and no direct inventory writes.
import {ING,RECIPES,RECIPE_INDEX,recipeSignature} from './data.js?v=0.14.0-alpha.5';
import {RECIPE_PROFILES} from './recipe_profiles_v063.js?v=0.12.0-alpha.1';
import {evaluateGrillCook,grillHeat,grillTechnique} from './grill_cooking_v014b.js?v=0.14.0-alpha.5';

export const LIVE_ACTIONS={
  WOK:[{id:'flip',name:'翻炒',emoji:'🍳'},{id:'toss',name:'颠勺',emoji:'↗'}],
  POT:[{id:'gentle',name:'轻搅',emoji:'🥄'},{id:'reduce',name:'收汁',emoji:'💧'}],
  GRILL:[{id:'turn',name:'翻面',emoji:'🍢'},{id:'brush',name:'刷香料',emoji:'🖌️'}]
};
export const LIVE_STYLES={
  home:'家常',home_even:'均匀翻炒',burst:'爆炒',aroma:'香味十足',
  pot_home:'家常炖煮',gentle:'清润慢炖',reduced:'浓香收汁',even:'双面原味',glazed:'双面刷香',legacy:'标准工艺'
};
export const LIVE_AFFINITY={signature:'招牌适配',viable:'适合',ordinary:'普通',off:'不契合'};
const REQUIRE={beef:5.4,chicken:6.1,chili:1.3,garlic:1.3,mushroom:2.9,cabbage:2.5,onion:2.8,potato:6.2,mushroom_heart:3.9,ember_pepper:1.9,tide_sour_pulp:1.8,starlit_nectar:1.2};
const AROMATICS=new Set(['onion','garlic','chili','mushroom','ember_pepper','tide_sour_pulp','starlit_nectar']);
const MAIN_PRIORITY=['beef','chicken','potato','cabbage','mushroom','mushroom_heart','onion','ember_pepper','chili','garlic','tide_sour_pulp','starlit_nectar'];
const PRIMARY_AROMATIC={garlic:true,onion:true,chili:true,mushroom:true,ember_pepper:true,tide_sour_pulp:true,starlit_nectar:true};
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
// Presentation ONLY. Uses the exact maturity/burning rules above; its percent
// describes progress to readiness, not an invented power/temperature stat.
export function liveIngredientHeatFeedback(drop,t,actions,vessel){
 if(!drop)return {state:'待下锅',baseState:'待下锅',progress:0,tone:'idle',nearBurn:false};
 if(vessel==='GRILL'){
  const h=grillHeat(drop.id,t-drop.t,(actions||[]).map(a=>({...a,t:a.t-drop.t})));
  return {state:h.state,baseState:h.state,progress:Math.min(h.frontProgress,h.backProgress),frontProgress:h.frontProgress,backProgress:h.backProgress,tone:h.tone,nearBurn:false};
 }
 const divisor=REQUIRE[drop.id]*(vessel==='POT'?1.18:1);
 const ratio=liveCookAmount(drop,t,actions,vessel)/divisor,age=Math.max(0,t-drop.t);
 const baseState=liveIngredientState(drop,t,actions,vessel);
 const ageLimit=drop.id==='ember_pepper'&&vessel==='POT'?19:
  ['garlic','chili','onion','ember_pepper'].includes(drop.id)?14:16;
 const dense=['beef','chicken','potato'].includes(drop.id);
 const nearBurn=baseState==='熟透'&&(age>=ageLimit-2||(dense&&ratio>=2.9));
 const state=nearBurn?'将焦':baseState;
 const tone=baseState==='焦糊'?'bad':nearBurn?'warning':baseState==='熟透'?'good':'warming';
 return {state,baseState,progress:Math.max(0,Math.min(100,Math.round(ratio*100))),tone,nearBurn};
}
export function liveHeatSummary(indicators){
 const active=(indicators||[]).filter(i=>i.dropped),total=(indicators||[]).length;
 if(!active.length)return {tone:'idle',label:'尚未下料',details:'观察每种食材的成熟进度'};
 if(active.some(i=>i.baseState==='焦糊'))return {tone:'bad',label:'已焦糊',details:'及时结束或重新尝试'};
 if(active.some(i=>i.nearBurn))return {tone:'warning',label:'接近焦糊',details:'注意及时起锅'};
 if(active.length<total)return {tone:'warming',label:`已下 ${active.length}/${total} 种`,details:'继续投料并观察熟度'};
 const raw=active.filter(i=>i.baseState==='偏生').length;
 if(raw)return {tone:'warming',label:`${raw} 种仍偏生`,details:'还需要加热'};
 const almost=active.filter(i=>i.baseState==='受热中').length;
 if(almost)return {tone:'warming',label:`${almost} 种正在熟化`,details:'略等一会再起锅'};
 return {tone:'good',label:'全部熟透',details:'可以起锅鉴定'};
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
 const grill=grillTechnique(recipeId,style);if(grill)return grill;
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
 if(vessel==='GRILL')return evaluateGrillCook(ids,drops,actions,elapsed);
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
// Read-only recap: color means a real verdict. Missed OPTIONAL bonuses are
// amber, not fabricated "mistakes"; only actual raw/burnt/missing food is red.
export function reviewLiveCook(result){
 if(!result)return {steps:[],maxQuality:0,atReachableMax:false};
 if(result.vessel==='GRILL'){
  const rows=(result.events||[]).map(d=>({type:'drop',time:d.t,grade:result.doneness?.find(x=>x.id===d.id)?.label==='熟透'?'good':'bad',label:`穿上 ${ING[d.id]?.name||d.id}`,detail:result.doneness?.find(x=>x.id===d.id)?.label||'待判定'}));
  if(result.facts?.lane)rows.push({type:'action',time:0,grade:'good',label:'摆上'+({edge:'边火',middle:'均火',flame:'猛火'}[result.facts.lane]||'烤架'),detail:result.facts.ordered?'串序契合，品质 +3':'串序不影响可售'});
  for(const a of result.actions||[])rows.push({type:'action',time:a.t,grade:'good',label:a.type==='turn'?'翻面':'刷香料',detail:a.type==='turn'?'正反面分别受热':'翻面后形成香料焦边'});
  rows.push({type:'finish',time:result.duration,grade:result.sellable?'good':'bad',label:'起锅鉴定',detail:result.reason});
  const maxQuality=result.facts?.lane?90:85;
  return {steps:rows.sort((a,b)=>a.time-b.time),maxQuality,atReachableMax:result.sellable&&result.quality>=maxQuality};
 }
 const events=result.events||[],actions=result.actions||[],facts=result.facts||
  readCookFacts(result.ids||[],result.vessel,events,actions,result.duration||0);
 const main=events.find(d=>d.id===facts.primaryIngredient);
 const states=new Map((result.doneness||[]).map(d=>[d.id,d.label]));
 const steps=[];
 for(const d of events){
  const state=states.get(d.id)||'待判定';
  let grade='good',detail='食材最终熟透';
  if(state==='偏生'||state==='焦糊'||state==='未下锅'){
   grade='bad';detail=state==='焦糊'?'食材已经焦糊，导致本锅失败':'食材未熟，导致本锅失败';
  }else if(state==='受热中'){
   grade='warning';detail='还差一点火候，当前品质每份扣 16 分';
  }else if(d.id!==main?.id&&PRIMARY_AROMATIC[d.id]){
   const lead=!!(main&&d.t<=main.t-1.05);
   grade=lead?'good':'warning';
   detail=lead?'比主食材提前至少 1.05 秒，提供底香 +4':'未提前至少 1.05 秒，未触发底香加分';
  }
  steps.push({type:'drop',time:d.t,grade,label:`下 ${ING[d.id]?.name||d.id}`,detail});
 }
 for(const a of actions){
  let grade='good',detail='';
  if(a.type==='flip')detail='有效翻炒，受热加分 +5';
  else if(a.type==='gentle')detail='有效轻搅，受热加分 +5';
  else if(a.type==='toss'){
   const hit=!!(facts.burst&&main&&a.t>=main.t&&a.t-main.t<=3.8&&(a.with||[]).length>=2);
   grade=hit?'good':'warning';
   detail=hit?'主食材入锅后 3.8 秒内、至少两料同锅，锅气 +6':'本次颠勺未触发锅气：需主食材下锅后 3.8 秒内，至少两料同锅';
  }else if(a.type==='reduce'){
   const hit=!!(a.t>=4&&(a.with||[]).length>=2);
   grade=hit?'good':'warning';
   detail=hit?'4 秒后两料同锅收汁，浓香加分 +5':'本次收汁未触发加分：需 4 秒后且两料同锅';
  }else{grade='warning';detail='未产生对应工艺加成'}
  const actionName={flip:'翻炒',toss:'颠勺',gentle:'轻搅',reduce:'收汁'}[a.type]||a.type;
  steps.push({type:'action',time:a.t,grade,label:actionName,detail});
 }
 const missing=(result.doneness||[]).filter(d=>d.label==='未下锅');
 for(const d of missing)steps.push({type:'missing',time:result.duration||0,grade:'bad',
  label:`漏下 ${ING[d.id]?.name||d.id}`,detail:'没有投料，导致本锅失败'});
 const tones=(result.doneness||[]).map(d=>d.label);
 const grade=tones.some(x=>['偏生','焦糊','未下锅'].includes(x))?'bad':
  tones.includes('受热中')?'warning':'good';
 steps.push({type:'finish',time:result.duration||0,grade,label:'起锅鉴定',
  detail:grade==='good'?'所有已下食材成熟':grade==='warning'?'至少一种食材略欠火，品质受到实际扣分':'存在真实夹生、焦糊或漏料问题'});
 steps.sort((a,b)=>a.time-b.time||({drop:0,action:1,missing:2,finish:3}[a.type]-{drop:0,action:1,missing:2,finish:3}[b.type]));
 // The global cap is 90, but the reachable theoretical maximum is lower.
 const maxQuality=result.vessel==='WOK'?87:86;
 return {steps,maxQuality,atReachableMax:!!(result.sellable&&result.quality>=maxQuality)};
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
