import {fieldHarvestTargetSuffix} from './field_target_v012f.js';
import {makeSpecialEncounterPlan,previewSpecialEncounter,SPECIAL_ENCOUNTER_KINDS} from './field_encounters_v011c.js';
import {ING,RECIPES,CUSTOMERS,FORECAST,DEFAULT_INVENTORY,SHOP_STAPLES} from './data.js?v=0.12.0-alpha.5';
import {LIVE_ACTIONS,evaluateLiveCook,liveIngredientState,liveIngredientHeatFeedback,legacyVariant,makeLiveVariant,resolveTechnique} from './cooking_v063.js?v=0.12.0-alpha.5';
import {RECIPE_PROFILES} from './recipe_profiles_v063.js?v=0.12.0-alpha.5';
import {generateBiomeMap} from './field_biomes_v081.js?v=0.12.0-alpha.5';
import {makeFieldEncounterPlan,insertPlannedFieldEncounter} from './field_encounter_plan_v011b.js?v=0.12.0-alpha.5';
import {expandFieldMap} from './field_world_v011b1.js';
import {newServiceHero,heroZone} from './walkable_restaurant_v07.js?v=0.9.2';
import {CAMPAIGNS,CREW_GROWTH,CREW_XP_THRESHOLDS,ensureManagement,selectedCampaign,chooseCampaign,crewWage,ensureStaffProgress,setCrewDuty,crewPromotion,applyCrewPromotion,payroll,settleCrewExperience} from './restaurant_management_v012c.js';
export {CAMPAIGNS,CREW_GROWTH,CREW_XP_THRESHOLDS,ensureManagement,selectedCampaign,chooseCampaign,crewWage,setCrewDuty,crewPromotion};
import {naturalStarAttendance,serviceArrivalWave,serviceArrivalSecond,outdoorQueueCount,outdoorQueueExpired,queueServiceReport} from './restaurant_demand_v012e.js';
export {QUEUE_PATIENCE_SECONDS,NATURAL_STAR_GUEST_CAP,starWordOfMouthBoost,naturalStarAttendance,serviceArrivalWave,serviceArrivalSecond,queueServiceReport} from './restaurant_demand_v012e.js';
export function promoteCrew(s,role){return applyCrewPromotion(s,role,transact)}
import {ensureChapterProgress,firstStarAvailable,firstStarRequested,requestFirstStar,scoreFirstStar,FOURTH_TABLE_COST} from './restaurant_star_v012a.js';
export {ensureChapterProgress,firstStarAvailable,firstStarRequested,requestFirstStar,FOURTH_TABLE_COST};
export const PHASES=['forecast','field','research','menu','prep','service','report','upgrade'];
export const SAVE_KEY='oddpot-prototype-v04'; // v0.2 兼容先前试玩存档
const clone=x=>structuredClone(x);
export const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
export function rand(seed){return (Math.imul(1664525,seed>>>0)+1013904223)>>>0}
export function uniqueAdd(ledger,id,type,extra={}){if(ledger.some(x=>x.id===id))return false;ledger.push({id,type,...extra});return true}
export function newGame(seed=20261009){return {version:4,seed,cycle:1,day:1,dining:{tableCount:2},chapterProgress:{chapterId:'hearth',stars:0,requestDay:null,lastAttemptDay:null,lastScore:null},premiumMenu:null,guestRelationships:{},guestDex:{seenSegments:{},metGuests:{}},history:[],market:null,phase:'forecast',coins:120,reputation:0,inventory:{...DEFAULT_INVENTORY},recipes:{chicken_stew:76,mushroom_stir:76,veg_stir:72},learned:{},recipeVariants:{},activeVariantIds:{},tech:false,upgrade:false,crew:{helper:{hired:false,station:0,meals:0,feed:null},waiter:{hired:false,meals:0,feed:null}},staffFoodCost:0,management:{dayKey:'1-1',openingCoins:120,campaignId:'none',wageDebt:0},kitchen:{slots:[{type:'WOK',level:1},{type:'POT',level:1}],refitDay:null,freeRefitUsed:false,extraRefits:0},bagSlots:8,_bagMigrated:true,_v08Save:true,selectedWeaponSlot:0,bento:null,selectedTarget:'chili',route:null,field:null,cook:null,menu:['chicken_stew','mushroom_stir','veg_stir'],prep:{},prepVariants:{},prepCost:0,manualCost:0,service:null,report:null,lastCook:null,researchReceipt:false,ledger:[],logs:[],result:null,step:0};}
// Kitchen station IDs remain WOK/POT for compatibility with 0.4 saves,
// but now denote PHYSICAL positions (left/right), not stove types.
// Room size and market stock are persistent economic state, not scene-only buffs.
// v0.10: one secret daily dish, two real servings at most, no phantom sales.
// Guest IDs refer to recurring people rather than giving every visitor a name.
export const PREMIUM_MAX_SERVINGS=2;
export const PREMIUM_PRICE_FACTOR=1.7;
export const REGULAR_GUESTS=Object.freeze({
 adventurer:{id:'miner_boro',name:'伯罗',segment:'adventurer'},
 family:{id:'mushroom_ami',name:'阿米',segment:'family'},
 regular:{id:'slime_popo',name:'啵啵',segment:'regular'}
});
// Separate meeting a guest (real arrival) from gaining favor (real meal).
export function ensureGuestDex(s){
 s.guestDex??={seenSegments:{},metGuests:{}};
 s.guestDex.seenSegments??={};s.guestDex.metGuests??={};
 // Legacy real meals prove these guests have been met, but do not infer
 // unrecorded earlier visits or generate fake relationship scores.
 for(const [guestId,rel] of Object.entries(s.guestRelationships||{})){
  if((rel?.visits||0)>0&&CUSTOMERS[rel.segment]){
   s.guestDex.seenSegments[rel.segment]=true;
   s.guestDex.metGuests[guestId]=true;
  }
 }
 return s.guestDex;
}
export function guestBookEntries(s){
 const dex=ensureGuestDex(s);
 return Object.entries(CUSTOMERS).map(([segment,data])=>{
  const guest=REGULAR_GUESTS[segment],rel=guest?s.guestRelationships?.[guest.id]:null;
  const seen=!!dex.seenSegments[segment]||!!(rel?.visits);
  const met=!!(guest&&dex.metGuests[guest.id])||!!(rel?.visits);
  return {segment,name:data.name,emoji:data.emoji,likes:[...data.likes],seen,
   guestId:guest?.id||null,guestName:guest?.name||null,met,
   visits:Math.max(0,rel?.visits||0),happyMeals:Math.max(0,rel?.happyMeals||0),
   premiumEligible:segment==='critic'||!!(guest&&rel?.happyMeals>=2)};
 });
}
export const currentPremiumDay=s=>`${s.cycle}-${s.day}`;
export function premiumMenuActive(s){
 const p=s.premiumMenu;
 return !!(p&&p.dayKey===currentPremiumDay(s)&&p.recipeId&&p.limit>0&&
  s.recipes?.[p.recipeId]&&RECIPES[p.recipeId]?.rare&&!s.menu.includes(p.recipeId));
}
export function premiumMenuOptions(s){
 return Object.entries(RECIPES).filter(([id,r])=>r.rare&&s.recipes?.[id]&&!s.menu.includes(id))
  .map(([id,r])=>{const craft=recipeCraftSnapshot(s,id);
   const stock=recipeAvailableServings(s,id,{ignorePremium:true});
   return {id,name:r.name,stock,price:Math.round(craft.price*PREMIUM_PRICE_FACTOR),quality:craft.quality,recipe:r};});
}
export function setPremiumMenu(s,id,limit=1){
 if(s.phase!=='menu')return false;
 if(id===null){s.premiumMenu=null;return true}
 if(!Number.isInteger(limit)||limit<1||limit>PREMIUM_MAX_SERVINGS)return false;
 const option=premiumMenuOptions(s).find(x=>x.id===id);
 if(!option||option.stock<limit)return false;
 s.premiumMenu={dayKey:currentPremiumDay(s),recipeId:id,limit};
 return true;
}
export function premiumReserved(s){
 if(!premiumMenuActive(s)||!['menu','prep','service'].includes(s.phase))return {};
 const p=s.premiumMenu,craft=recipeCraftSnapshot(s,p.recipeId);
 if(!craft)return {};
 const remaining=Math.max(0,p.limit-(s.service?.premiumConsumed||0));
 return Object.fromEntries(Object.entries(countIds(craft.ingredientIds)).map(([id,n])=>[id,n*remaining]));
}
// Single source of truth for menu stock visibility; figures describe one
// recipe at a time. Distinct menu dishes can compete for the same ingredients.
export function recipeAvailableServings(s,recipeId,{ignorePremium=false}={}){
 const craft=recipeCraftSnapshot(s,recipeId);
 if(!craft?.ingredientIds?.length)return 0;
 const required=countIds(craft.ingredientIds),reserved=ignorePremium?{}:premiumReserved(s);
 return Math.max(0,Math.min(...Object.entries(required).map(([id,n])=>
  Math.floor(Math.max(0,(s.inventory?.[id]||0)-(reserved[id]||0))/n))));
}
export function premiumGuestEligible(s,o){
 if(o.segment==='critic')return true;
 return !!(o.guestId&&s.guestRelationships?.[o.guestId]?.happyMeals>=2);
}
export function premiumQualifiedPreview(s){
 if(!premiumMenuActive(s))return false;
 return Object.values(s.guestRelationships||{}).some(x=>x.happyMeals>=2);
}
export const ROOM_EXPANSION_COST=160;
export const totalBusinessDay=s=>(s.cycle-1)*3+s.day;
export const firstChallenge=s=>s.cycle===1&&s.day===3;
export const tableCapacity=s=>2*(s?.dining?.tableCount||s?.service?.tableCount||2);
export function roomExpansionAvailable(s){
 const count=s.dining?.tableCount||2;
 return s.phase==='upgrade'&&
  (count===2?totalBusinessDay(s)>=3&&s.reputation>=2&&s.coins>=ROOM_EXPANSION_COST:
   count===3&&ensureChapterProgress(s).stars>=1&&s.coins>=FOURTH_TABLE_COST);
}
export function expandDiningRoom(s){
 if(!roomExpansionAvailable(s))return false;
 const count=s.dining?.tableCount||2;
 const next=count+1;
 if(!transact(s,next===3?'expand-third-table':'expand-fourth-table','room_upgrade',{},-(next===3?ROOM_EXPANSION_COST:FOURTH_TABLE_COST)))return false;
 s.dining={tableCount:next};return true;
}
// The day still randomly stocks 3–4 of the four common staples.
// Each listed staple has at least six purchase units; rare goods stay field-only.
export const DAILY_STAPLE_MIN_PURCHASES=6;
export function ensureDailyMarket(s){
 const key=`${s.cycle}-${s.day}`;
 if(s.market?.dayKey===key&&s.market.schema===2)return s.market;
 const previous=s.market?.dayKey===key?s.market.goods||{}:{};
 const selection=SHOP_STAPLES.map((id,i)=>({id,roll:rand((s.seed^(s.cycle*7919)^(s.day*65521)^Math.imul(i+1,1103515245))>>>0)}))
  .sort((a,b)=>a.roll-b.roll||a.id.localeCompare(b.id));
 // Preserve the original v0.9 random availability: only 3 or 4 of 4 staples
 // are listed each day. Increase the offered quantity, not the item variety.
 const count=3+((rand(s.seed+s.cycle*101+s.day*109)>>>21)%2);
 const goods={};
 for(const {id,roll} of selection.slice(0,count)){
  const old=previous[id],bought=old?Math.max(0,(old.initialStock||0)-(old.stock||0)):0;
  const initialStock=Math.max(DAILY_STAPLE_MIN_PURCHASES+((roll>>>16)%4),bought);
  // Migrated games keep all purchases and the same daily price as before.
  const price=old?.price||Math.max(1,Math.round(ING[id].cost*(85+((roll>>>10)%51))/100));
  goods[id]={stock:initialStock-bought,initialStock,price};
 }
 s.market={dayKey:key,goods,schema:2};
 return s.market;
}
export const KITCHEN_POSITIONS=['WOK','POT','CENTER'];
export const THIRD_KITCHEN_BUNDLE_COST=260;
const stationId=i=>KITCHEN_POSITIONS[i];
const stationIdx=id=>KITCHEN_POSITIONS.indexOf(id);
const shiftHelperAt=(crew,index)=>['helper','helper2'].find(role=>crew?.[role]?.hired&&crew[role].station===index)||null;
export function thirdKitchenBundleAvailable(s){return s.phase==='upgrade'&&!s.kitchen?.thirdUnlocked&&(s.chapterProgress?.stars||0)>=1&&(s.dining?.tableCount||2)>=4&&s.coins>=THIRD_KITCHEN_BUNDLE_COST;}
export function buyThirdKitchenBundle(s){
 if(!thirdKitchenBundleAvailable(s))return false;
 if(!transact(s,'third-kitchen-crew-bundle','room_staff_upgrade',{},-THIRD_KITCHEN_BUNDLE_COST))return false;
 const k=ensureKitchen(s);k.thirdUnlocked=true;k.slots.push({type:'WOK',level:1});
 const p=ensureCrew(s).helper2;p.hired=true;p.onDuty=true;p.station=2;
 return true;
}
export function ensureKitchen(s){
 if(!s.kitchen||!Array.isArray(s.kitchen.slots))s.kitchen={slots:[{type:'WOK',level:s.upgrade?2:1},{type:'POT',level:1}],refitDay:null,freeRefitUsed:false,extraRefits:0};
 s.kitchen.slots=(s.kitchen.thirdUnlocked?[0,1,2]:[0,1]).map(i=>{const v=s.kitchen.slots[i]||{};return {type:v.type==='WOK'?'WOK':'POT',level:v.level===2?2:1}});
 if(s.upgrade&&s.kitchen.slots[0].level<2)s.kitchen.slots[0].level=2;
 s.kitchen.extraRefits??=0;s.kitchen.freeRefitUsed??=false;
 return s.kitchen;
}
export function kitchenDayKey(s){return `${s.cycle}-${s.day}`}
export function kitchenRefitCost(s){const k=ensureKitchen(s);return k.refitDay===kitchenDayKey(s)&&k.freeRefitUsed?12:0}
export function configureKitchenSlot(s,index,type){
 if(s.phase!=='prep'||index<0||index>=ensureKitchen(s).slots.length||!['WOK','POT'].includes(type))return false;
 const k=ensureKitchen(s);if(k.slots[index].type===type)return false;
 const today=kitchenDayKey(s),normalFee=kitchenRefitCost(s);
 // Never soft-lock a player who experimented with a free refit. If the
 // kitchen is currently incompatible and this change restores coverage,
 // allow an emergency zero-cost correction when money is insufficient.
 const coverageAfter=(()=>{const types=k.slots.map((x,i)=>i===index?type:x.type);return s.menu.every(id=>!s.recipes[id]||!RECIPES[id]||types.includes(RECIPES[id].station))})();
 const fee=normalFee>s.coins&&!kitchenHasMenuCoverage(s)&&coverageAfter?0:normalFee;
 if(s.coins<fee)return false;
 const seq=k.extraRefits||0;
 if(fee&&!transact(s,`kitchen-refit-${today}-${seq}`,'kitchen_refit',{},-fee))return false;
 if(fee)k.extraRefits=seq+1;
 k.refitDay=today;k.freeRefitUsed=true;k.slots[index].type=type;return true;
}
export function kitchenHasMenuCoverage(s){
 const k=ensureKitchen(s),needed=new Set(s.menu.filter(id=>s.recipes[id]&&RECIPES[id]).map(id=>RECIPES[id].station));
 return [...needed].every(type=>k.slots.some(slot=>slot.type===type));
}
export function kitchenPreview(s){
 const k=ensureKitchen(s),demand={WOK:0,POT:0};
 for(const id of s.menu)if(s.recipes[id]&&RECIPES[id])demand[RECIPES[id].station]++;
 const capacity={WOK:k.slots.filter(x=>x.type==='WOK').length,POT:k.slots.filter(x=>x.type==='POT').length};
 const risk=['WOK','POT'].filter(type=>demand[type]&&!capacity[type]);
 const pressure=['WOK','POT'].map(type=>({type,menu:demand[type],capacity:capacity[type],pressure:capacity[type]?demand[type]/capacity[type]:null}));
 return {pressure,risk,valid:risk.length===0};
}
export function kitchenUpgradeCost(s,index){
 if(index<0||index>=ensureKitchen(s).slots.length)return null;
 return ensureKitchen(s).slots[index].level>=2?null:index===0?60:75;
}
export function buyKitchenUpgrade(s,index){
 if(s.phase!=='upgrade'||index<0||index>=ensureKitchen(s).slots.length)return false;
 const k=ensureKitchen(s),cost=kitchenUpgradeCost(s,index);
 if(cost===null||s.coins<cost)return false;
 const key=index===0?'upgrade-wok':'kitchen-upgrade-1';
 if(!transact(s,key,'upgrade',{},-cost))return false;
 k.slots[index].level=2;if(index===0)s.upgrade=true;return true;
}
// v0.6.3-B: recipe identity + selected *actual* craft determines its own
// benefits. Never attach economic effects to style labels globally.
export function recipeCraftSnapshot(s,recipeId,variant=null){
 const r=RECIPES[recipeId];if(!r)return null;
 const v=variant||activeRecipeVariant(s,recipeId);
 const pair=v&&!v.legacy?resolveTechnique(recipeId,v.style):null;
 const ids=v?.ingredientIds?.length?v.ingredientIds:r.ids;
 return {recipeId,variantId:v?.variantId||'standard-'+recipeId,
   style:v?.style||'legacy',styleLabel:v?.styleLabel||'标准工艺',
   affinity:pair?.affinity||'ordinary',quality:v?.quality||s.recipes?.[recipeId]||72,
   ingredientIds:[...ids],price:r.price+(pair?.priceDeltaCoins||0),
   baseTime:r.time,timeDelta:pair?.timeDeltaSeconds||0,
   guestFitDelta:{...(pair?.guestFitDelta||{})},
   secondaryTrait:v?.secondaryTrait||null,
   recipeTags:[...r.tags]};
}
export function stationDuration(s,position,recipe,v,order=null){
 const i=stationIdx(position),slot=v?.kitchenSnapshot?.[i]||ensureKitchen(s).slots[i];
 if(!slot)return recipe.time;
 const role=shiftHelperAt(v?.crew,i),staff=role?v.crew[role]:null;
 const bonus=(slot.level-1)*2,delta=order?.craft?.timeDelta||0;
 const rush=staff?.level>=3&&v?.time>=30&&v?.time<=70?1:0;
 return Math.max(1,recipe.time+delta-bonus-Math.min(4,(staff?.seconds||0)+rush)-(v?.eventEffects?.[slot.type]||0));
}

// A two-person restaurant team. Feed uses real standard-recipe ingredients;
// meals grant one service-day buff plus a tiny, capped long-term familiarity.
export const CREW_ROLES={helper:{name:'阿火',job:'帮厨',hireCost:40},waiter:{name:'小芽',job:'跑堂',hireCost:35},helper2:{name:'小炭',job:'后厨帮手',hireCost:0}};
export function ensureCrew(s){
 ensureStaffProgress(s);
 for(const role of Object.keys(CREW_ROLES)){
  const raw=s.crew[role]||{};
  raw.hired=!!raw.hired;raw.meals=Math.max(0,Math.min(3,Number(raw.meals)||0));
  raw.feed??=null;if(role==='helper'||role==='helper2')raw.station=Number.isInteger(raw.station)&&raw.station>=0&&raw.station<ensureKitchen(s).slots.length?raw.station:role==='helper2'?2:0;
  s.crew[role]=raw;
 }
 s.staffFoodCost??=0;
 return s.crew;
}
export function hireCrew(s,role){
 if(!['prep','upgrade'].includes(s.phase)||!CREW_ROLES[role]||role==='helper2')return false;
 const c=ensureCrew(s)[role],price=CREW_ROLES[role].hireCost;
 if(c.hired||s.coins<price||!transact(s,`crew-hire-${role}`,'crew_hire',{},-price))return false;
 c.hired=true;c.onDuty=true;return true;
}
export function assignCrew(s,position,role='helper'){
 if(s.phase!=='prep'||!['helper','helper2'].includes(role))return false;
 const crew=ensureCrew(s),c=crew[role];
 if(!c?.hired||!Number.isInteger(position)||position<0||position>=ensureKitchen(s).slots.length||c.station===position)return false;
 const other=role==='helper'?'helper2':'helper';
 if(crew[other]?.hired&&crew[other].onDuty&&crew[other].station===position)return false;
 c.station=position;return true;
}
export function activeCrewMeal(s,role){
 const c=ensureCrew(s)[role];return c?.hired&&c.feed?.day===kitchenDayKey(s)?c.feed:null;
}
export function crewEffects(s){
 const crew=ensureCrew(s),helper=crew.helper,helper2=crew.helper2,waiter=crew.waiter;
 const f=activeCrewMeal(s,'helper'),f2=activeCrewMeal(s,'helper2'),w=activeCrewMeal(s,'waiter');
 const hr=f?.recipeId?RECIPES[f.recipeId]:null,h2r=f2?.recipeId?RECIPES[f2.recipeId]:null,wr=w?.recipeId?RECIPES[w.recipeId]:null;
 const helperActive=helper.hired&&helper.onDuty,helper2Active=helper2.hired&&helper2.onDuty,waiterActive=waiter.hired&&waiter.onDuty;
 const helperBase=helperActive?1+(helper.meals>=3?1:0)+(helper.level>=2?1:0):0;
 const helperMeal=helperActive&&hr?(hr.tags.includes('辣')&&ensureKitchen(s).slots[helper.station].type==='WOK'?2:hr.tags.includes('菌香')?1:0)+(f.quality>=85?1:0)+(f.craftBonus?.role==='helper'&&ensureKitchen(s).slots[helper.station].type==='WOK'?Math.min(1,f.craftBonus.bonus):0):0;
 const helper2Base=helper2Active?1+(helper2.meals>=3?1:0)+(helper2.level>=2?1:0):0;
 const helper2Meal=helper2Active&&h2r?(h2r.tags.includes('辣')&&ensureKitchen(s).slots[helper2.station]?.type==='WOK'?2:h2r.tags.includes('菌香')?1:0)+(f2.quality>=85?1:0):0;
 const waiterBase=waiterActive?3+(waiter.meals>=3?1:0)+(waiter.level>=2?2:0)+(waiter.level>=3?1:0):0;
 const waiterMeal=waiterActive&&wr?(wr.tags.includes('温和')?6:wr.tags.includes('菌香')?4:2)+(w.quality>=85?2:0)+(w.craftBonus?.role==='waiter'?Math.min(1,w.craftBonus.bonus):0):0;
 return {helper:{hired:helperActive,station:helper.station,seconds:Math.min(4,helperBase+helperMeal),fed:helperActive&&!!f,recipeId:f?.recipeId||null,meals:helper.meals,level:helper.level,salary:helperActive?crewWage('helper',helper.level):0},helper2:{hired:helper2Active,station:helper2.station,seconds:Math.min(4,helper2Base+helper2Meal),fed:helper2Active&&!!f2,recipeId:f2?.recipeId||null,meals:helper2.meals,level:helper2.level,salary:helper2Active?crewWage('helper2',helper2.level):0},waiter:{hired:waiterActive,patience:Math.min(12,waiterBase+waiterMeal),fed:waiterActive&&!!w,recipeId:w?.recipeId||null,meals:waiter.meals,level:waiter.level,salary:waiterActive?crewWage('waiter',waiter.level):0}};
}
export function feedCrew(s,role,recipeId){
 if(s.phase!=='prep'||!CREW_ROLES[role]||!s.recipes[recipeId]||!RECIPES[recipeId])return false;
 const c=ensureCrew(s)[role],r=RECIPES[recipeId],craft=recipeCraftSnapshot(s,recipeId);
 if(!craft||!c.hired||!c.onDuty||activeCrewMeal(s,role)||!canUse(s,craft.ingredientIds))return false;
 const txn=`crew-meal-${kitchenDayKey(s)}-${role}`;
 if(!consume(s,craft.ingredientIds,txn))return false;
 const specific=RECIPE_PROFILES[recipeId]?.crewSpecific;
 const craftBonus=specific&&specific.style===craft.style&&(specific.role===role||role==='helper2'&&specific.role==='helper')?{role,bonus:Math.min(1,Number(specific.bonus)||0)}:null;
 c.feed={day:kitchenDayKey(s),recipeId,quality:craft.quality,variantId:craft.variantId,craftBonus,ingredients:[...craft.ingredientIds]};c.meals=Math.min(3,c.meals+1);
 s.staffFoodCost+=craft.ingredientIds.reduce((sum,id)=>sum+ING[id].cost,0);
 return true;
}
export function save(s){try{localStorage.setItem(SAVE_KEY,JSON.stringify(s))}catch{}}
export function load(){try{
const s=JSON.parse(localStorage.getItem(SAVE_KEY));
if(s?.version!==4||!PHASES.includes(s.phase))return null;
if(s.service){s.service.walkable??=false;if(s.service.walkable){s.service.hero??=newServiceHero();s.service.hero.dwell??=0;s.service.hero.dwellZone??=null;if(!['0.7.5','0.9.0'].includes(s.service.sceneVersion)){s.service.sceneVersion='0.9.0';s.service.hero.x=.5;s.service.hero.y=.365;s.service.hero.dwell=0;s.service.hero.dwellZone=null;s.service.clockAccumulator=0;}}s.service.paused ??= true;s.service.breakAt ??= 0;s.service.breakUsed ??= false;s.service.breakSeen ??= [];s.service.events ??= [];s.service.treatUsed ??= false;
 s.service.kitchenSnapshot ??= structuredClone(ensureKitchen(s).slots);
 s.service.stationStats ??= {WOK:{count:0,secondsSaved:0},POT:{count:0,secondsSaved:0}};
 s.service.judgeOrderId ??= firstChallenge(s)?s.service.orders.at(-1)?.id:null;
 s.service.crew ??= clone(crewEffects(s));
 s.service.staffStats ??= {helperSeconds:0,helperOrders:0,waiterBonus:0,waiterOrders:0,waiterSaved:0};
 // v0.1 浏览器存档尚无固定桌位，按当前等餐顺序温和迁移。
 const active=s.service.orders.filter(o=>['queued','cooking'].includes(o.status));
 const taken=new Set(active.map(o=>o.tableId).filter(x=>x!==undefined));
 for(const o of active){if(o.tableId==null){const n=[0,1].find(i=>!taken.has(i));if(n!==undefined){o.tableId=n;taken.add(n)}}o.seatId??=0;}
 }
ensureKitchen(s);ensureCrew(s);ensureManagement(s);ensureChapterProgress(s);ensureRecipeVariants(s);s.prepVariants??={};s.dining??={tableCount:2};s.premiumMenu??=null;s.guestRelationships??={};ensureGuestDex(s);s.history??=[];if(s.market?.dayKey!==kitchenDayKey(s))s.market=null;if(s.service)s.service.tableCount??=s.dining.tableCount;
s.bagSlots = s.bagSlots===6?8:s.bagSlots===7?10:s.bagSlots===8&&s._bagMigrated!==true&&s._v08Save!==true?12:s.bagSlots;
s._bagMigrated=true;s._v08Save=true;s.selectedWeaponSlot??=0;
if(s.field){s.field.capacity??=s.bagSlots;s.field.capacity=Math.max(s.field.capacity,s.bagSlots);syncFieldBagStacks(s.field);s.field.weapon??=fieldWeaponSnapshot(s);if(!s.field.segmentIndex){s.field.segmentIndex=3;s.field.segmentStatus='active';s.field.legacyField=true;}}
if(s.cook)s.cook.flame ??= 0;
return s;
}catch{return null}}
export function today(s){return s.cycle>1&&s.day===3?FORECAST[(s.cycle-1)%2]:FORECAST[(s.day-1)%3]}
export function transact(s,id,type,items={},amount=0){if(!uniqueAdd(s.ledger,id,type,{items,amount,day:s.day,cycle:s.cycle}))return false;for(const [ing,n] of Object.entries(items)){s.inventory[ing]=(s.inventory[ing]||0)+n;if(s.inventory[ing]<0)throw Error('库存不足 '+ing)}s.coins+=amount;return true}
export function canUse(s,ids,forPremium=false){const held=forPremium?{}:premiumReserved(s);return Object.entries(countIds(ids)).every(([id,n])=>(s.inventory[id]||0)-(held[id]||0)>=n)}
export function countIds(ids){const o={};for(const id of ids)o[id]=(o[id]||0)+1;return o}
export function consume(s,ids,txn,forPremium=false){if(!canUse(s,ids,forPremium))return false;return transact(s,txn,'consume',Object.fromEntries(Object.entries(countIds(ids)).map(([id,n])=>[id,-n]))) }
export function nextPhase(s,phase){s.phase=phase;s.step++;return s}
export function availableBento(s){
 ensureRecipeVariants(s);
 return Object.keys(s.recipes||{}).filter(id=>RECIPE_PROFILES[id]?.bentoSpecific).map(id=>{
  const craft=recipeCraftSnapshot(s,id),profile=RECIPE_PROFILES[id].bentoSpecific;
  return {recipeId:id,name:RECIPES[id].name,craft,
   description:profile.base,
   enhanced:craft?.style===profile.preferredStyle,
   canPrepare:craft&&canUse(s,craft.ingredientIds)};
 });
}
// Bento is one purchased meal per day and is locked before departure.
// Its buff is recipe-specific; a shared cooking word never grants global power.
export function prepareBento(s,recipeId){
 if(!['forecast','field'].includes(s.phase)||s.field||s.bento?.day===kitchenDayKey(s))return false;
 const p=RECIPE_PROFILES[recipeId]?.bentoSpecific;
 if(!s.recipes?.[recipeId]||!p)return false;
 const craft=recipeCraftSnapshot(s,recipeId);
 if(!craft||!canUse(s,craft.ingredientIds))return false;
 const txn='bento-'+kitchenDayKey(s);
 if(!consume(s,craft.ingredientIds,txn))return false;
 s.bento={day:kitchenDayKey(s),recipeId,variantId:craft.variantId,
  styleLabel:craft.styleLabel,kind:p.type,
  enhanced:craft.style===p.preferredStyle,
  ingredients:[...craft.ingredientIds],used:false};
 return true;
}
const FOREST_ZONES={
 safe:[{id:'glow_mushroom',name:'幽光菌地',description:'菌菇与鸡肉 · 常规探索',danger:false,target:'mushroom'},
       {id:'old_tree_edge',name:'古树外缘',description:'高危孢雾 · 第三段菇王',danger:true,target:'mushroom'}],
 finishSafe:[{id:'forest_garden',name:'林地菜圃',description:'平稳补充蔬菜与蘑菇',danger:false,target:'cabbage'},
       {id:'forest_secret',name:'菌光秘径',description:'更多菌菇与奇遇',danger:false,target:'mushroom'}],
 finishBoss:[{id:'spore_gate',name:'孢巢正门',description:'更多食材怪 · 孢冠菇王',danger:true,target:'mushroom'},
       {id:'spore_roots',name:'枯根侧道',description:'更复杂地形 · 孢冠菇王',danger:true,target:'mushroom'}]
};
const SPRING_ZONES={
 safe:[{id:'steam_crack',name:'蒸汽裂隙',description:'火椒与肉类 · 常规探索',danger:false,target:'chili'},
       {id:'ember_edge',name:'赤焰外缘',description:'高危热泉 · 第三段椒王',danger:true,target:'chili'}],
 finishSafe:[{id:'steam_lake',name:'温泉食材滩',description:'稳定火椒与土豆',danger:false,target:'potato'},
       {id:'spring_market',name:'裂隙秘泉',description:'有机会发现更多香料',danger:false,target:'chili'}],
 finishBoss:[{id:'ember_gate',name:'熔岩正坡',description:'密集小怪 · 熔壳椒王',danger:true,target:'chili'},
       {id:'ember_side',name:'蒸汽绕行',description:'更多喷气地形 · 熔壳椒王',danger:true,target:'chili'}]
};
// Both starter cookware modes are owned from day one. Physical stations
// affect the combat level only while fitted: a stored spare always remains
// usable as a Lv1 expedition weapon, without changing the kitchen layout.
export function fieldWeaponChoices(s){
 const slots=ensureKitchen(s).slots;
 return ['WOK','POT'].map(type=>{
  const installed=slots.map((slot,index)=>({...slot,index}))
   .filter(slot=>slot.type===type)
   .sort((a,b)=>b.level-a.level||a.index-b.index)[0];
  return {type,level:installed?.level||1,slotIndex:installed?.index??null,
    fitted:!!installed,source:installed?'kitchen':'reserve'};
 });
}
export function selectedFieldWeaponType(s){
 if(s.selectedWeaponType==='WOK'||s.selectedWeaponType==='POT')return s.selectedWeaponType;
 const slot=Math.min(1,Math.max(0,Number(s.selectedWeaponSlot)||0));
 return ensureKitchen(s).slots[slot].type;
}
export function fieldWeaponSnapshot(s){
 // New game UI selects a cookware TYPE, not one of two physical kitchen slots.
 // Legacy saves that only saved selectedWeaponSlot keep their previous behavior.
 const type=selectedFieldWeaponType(s);
 const choice=fieldWeaponChoices(s).find(x=>x.type===type);
 return {slotIndex:choice.slotIndex,type,level:choice.level,source:choice.source,
  attackId:type==='WOK'?'wok_sweep':'pot_onion',skillId:type==='WOK'?'wok_guard':'pot_pressure'};
}
export function selectFieldWeapon(s,selection){
 if(s.phase!=='field'||s.field)return false;
 // Retain the old numeric input for existing integrations and tests.
 if(Number.isInteger(selection)&&[0,1].includes(selection)){
  const kitchen=ensureKitchen(s);s.selectedWeaponSlot=selection;
  s.selectedWeaponType=kitchen.slots[selection].type;return true;
 }
 if(!['WOK','POT'].includes(selection))return false;
 s.selectedWeaponType=selection;
 const selected=fieldWeaponChoices(s).find(x=>x.type===selection);
 if(selected.slotIndex!==null)s.selectedWeaponSlot=selected.slotIndex;
 return true;
}
export function syncFieldBagStacks(f){
 if(!f)return [];
 const stacks=[];
 for(const [id,number] of Object.entries(f.bag||{})){
  let n=Math.max(0,Math.trunc(number)||0),j=0;
  while(n>0){const quantity=Math.min(3,n);stacks.push({stackId:id+'-'+j++,ingredientId:id,quantity});n-=quantity;}
 }
 f.bagStacks=stacks;return stacks;
}
export function fieldBagSlotsUsed(f){return syncFieldBagStacks(f).length}
export function addFieldBag(f,id,count){
 if(!f||!ING[id]||!Number.isInteger(count)||count<1)return 0;
 let gained=0;
 while(gained<count){
  const n=f.bag?.[id]||0;
  const used=fieldBagSlotsUsed(f),needsNew=n%3===0;
  if(needsNew&&used>=f.capacity)break;
  const accepted=Math.min(count-gained,3-(n%3));
  f.bag[id]=n+accepted;gained+=accepted;
 }
 syncFieldBagStacks(f);if(f.ecologyStats)f.ecologyStats.collected+=gained;return gained;
}
export function fieldBranchChoices(f){
 const zones=f.region==='spring'?SPRING_ZONES:FOREST_ZONES;
 return f.segmentIndex===1&&!f.dangerCommitment?zones.safe:
   f.dangerCommitment?zones.finishBoss:
   f.segmentIndex===2?[
    zones.finishSafe[0],
    {...zones.finishBoss[0],name:f.region==='spring'?'赤焰断坡':'古树孢巢',description:'危险终点 · 固定 Mini Boss'}
   ]:zones.safe;
}
export function enterField(s,route){
 if(s.phase!=='field'||s.field||!['safe','risk','spring_safe','spring_risk'].includes(route))return false;
 const target=['SHOP_STAPLE','FIELD_ONLY'].includes(ING[s.selectedTarget]?.acquisitionPolicy)?s.selectedTarget:'mushroom';
 const risk=route==='risk'||route==='spring_risk';
 const sequence=risk?[{type:'gather',id:target,n:2,label:'定向采集'},{type:'danger',id:'beef',n:2,label:'野牛领地'},{type:'event',id:'mushroom',n:2,label:'菌菇奇遇'}]:
  [{type:'gather',id:target,n:2,label:'目标采集'},{type:'gather',id:s.day===2?'chili':'mushroom',n:3,label:'林间采集'},{type:'event',id:'chicken',n:2,label:'流浪农夫'}];
 s.route=route;
 const encounterPlan=makeSpecialEncounterPlan(s,route),map=insertPlannedFieldEncounter(buildFieldMap(s,route,target),encounterPlan,1);
 s.field={route,hp:3,node:0,dailyTarget:target,target,bag:{},bagStacks:[],capacity:s.bagSlots||8,sequence,
  segmentIndex:1,segmentStatus:'active',encounterPlan,zoneId:route.startsWith('spring')?'hot_spring_shallows':'herb_path',
  zoneTitle:route.startsWith('spring')?'热泉浅滩':'香草小径',
  dangerCommitment:risk,selectedBranches:[],choices:[],weapon:fieldWeaponSnapshot(s),
  finished:false,...map,bento:s.bento?.day===kitchenDayKey(s)?clone(s.bento):null};
 return true;
}
export function completeFieldSegment(s){
 const f=s.field;
 if(s.phase!=='field'||!f||f.settled||f.finished||f.segmentStatus!=='active')return false;
 if(!f.nodes?.some(n=>n.key==='target'&&n.claimed))return false;
 if(f.segmentIndex===3){
  if(f.dangerCommitment&&f.enemies?.some(e=>e.isBoss&&e.hp>0))return false;
  return settleField(s,'completed');
 }
 recordEcologySegment(f,'continued');
 f.segmentStatus='choice';f.choices=fieldBranchChoices(f).map((a,i)=>({...a,choiceId:f.segmentIndex+'-'+i}));
 return true;
}
export function chooseFieldBranch(s,choiceId){
 const f=s.field;
 if(s.phase!=='field'||!f||f.settled||f.segmentStatus!=='choice'||f.segmentIndex>=3)return false;
 const branch=f.choices?.find(a=>a.choiceId===choiceId);
 if(!branch)return false;
 f.selectedBranches.push(branch.choiceId);f.dangerCommitment ||=branch.danger;
 f.segmentIndex++;f.zoneId=branch.id;f.zoneTitle=branch.name;f.segmentStatus='active';f.choices=[];
 f.route=f.region==='spring'?(f.dangerCommitment?'spring_risk':'spring_safe'):(f.dangerCommitment?'risk':'safe');
 const segmentSeed=(f.segmentIndex*1307+branch.id.split('').reduce((n,c)=>n+c.charCodeAt(0),0)*17);
 const map=insertPlannedFieldEncounter(buildFieldMap({...s,seed:s.seed+segmentSeed,fieldZoneId:branch.id,fieldSegmentIndex:f.segmentIndex},f.route,branch.target),f.encounterPlan,f.segmentIndex);
 for(const key of ['region','biome','bossSpawn','spawn','x','y','steps','worldW','worldH','worldVersion','scenery','visitedHazards','nodes','obstacles','hazards'])f[key]=map[key];
 if(map.nodes.some(n=>['merchant','traveler'].includes(n.kind)))f.specialNpcOpportunity=true;
 f.action=false;f.target=branch.target;f.harvestProgress=0;f.harvestNode=null;f.activeEvent=null;
 // HP, bag, bento, skill cooldown and equipped cookware persist across all three segments.
 return true;
}
export function bagCount(bag){return Object.values(bag).reduce((a,n)=>a+n,0)}
export function collectNode(s,choice='collect'){const f=s.field;if(!f||f.finished||f.node>=f.sequence.length)return {ok:false,message:'探索已结束'};const n=f.sequence[f.node];if(choice==='skip'){f.node++;return {ok:true,message:'绕过当前节点'};}if(n.type==='danger'){const hit=rand(s.seed+s.cycle*100+s.day*10+f.node)%3===0?2:1;f.hp-=hit;if(f.hp<=0){f.finished=true;return settleField(s,'faint')} }
const gain=addFieldBag(f,n.id,n.n);if(!gain)return {ok:false,message:'野外背包已满，先整理或撤离'};f.node++;if(f.node>=f.sequence.length)f.finished=true;return {ok:true,message:`收获 ${ING[n.id].name} ×${gain}${n.type==='danger'?' · 遭遇受伤':''}`};}
export function discardFieldStack(s,id){
 const f=s.field;if(s.phase!=='field'||!f||f.settled||f.finished)return false;
 const parts=String(id).split('-'),ingredient=ING[id]?id:parts.slice(0,-1).join('-');
 const n=f.bag?.[ingredient]||0;if(!n)return false;
 const removing=ING[id]?n:Math.min(3,n);
 if(n<=removing)delete f.bag[ingredient];else f.bag[ingredient]-=removing;
 syncFieldBagStacks(f);if(f.ecologyStats)f.ecologyStats.discarded+=removing;return true;
}
function recordEcologySegment(f,reason){
 if(!f.ecologyStats)return;f.encounterHistory??=[];
 if(f.encounterHistory.some(x=>x.segment===f.segmentIndex))return;
 f.encounterHistory.push({segment:f.segmentIndex,zone:f.biome?.zoneId,seconds:f.elapsed,reason,...f.ecologyStats,discardRate:(f.ecologyStats.carriedIn+f.ecologyStats.collected)?f.ecologyStats.discarded/(f.ecologyStats.carriedIn+f.ecologyStats.collected):0});
}
export function settleField(s,reason='retreat'){const f=s.field;if(!f||f.settled)return false;let items={...f.bag};if(reason==='faint')for(const id of Object.keys(items)){items[id]=Math.ceil(items[id]/2);if(items[id]===0)delete items[id]};f.settled=true;f.reason=reason;f.winnings=items;const settled=transact(s,`field-${s.cycle}-${s.day}`,'exploration',items);
 if(settled){recordEcologySegment(f,reason);
  if(f.encounterPlan?.version==='0.11-C'){
   s.encounterProgress??={misses:0};
   if(f.specialNpcOpportunity)s.encounterProgress.misses=0;
   else if(reason==='completed'&&f.segmentIndex===3)s.encounterProgress.misses=Math.min(2,(s.encounterProgress.misses||0)+1);
  }
 }
 if(settled&&f.bossDefeated&&(items.mushroom_heart||items.ember_pepper)){s.bossCleared??={};s.bossCleared[f.bossDefeated]=true;}
 nextPhase(s,'research');return true}
export function skipField(s){if(s.phase!=='field'||s.field)return false;nextPhase(s,'research');return true}
export function purchase(s,id,n=1){
 if(!['forecast','field','research','menu','prep'].includes(s.phase)||(s.field&&!s.field.settled)||!ING[id]||ING[id].acquisitionPolicy!=='SHOP_STAPLE'||!Number.isInteger(n)||n<1||n>5)return false;
 const item=ensureDailyMarket(s).goods[id];
 if(!item||item.stock<n||s.coins<item.price*n)return false;
 if(!transact(s,`buy-${s.cycle}-${s.day}-${s.step++}`,'purchase',{[id]:n},-item.price*n))return false;
 item.stock-=n;return true;
}
export function startCook(s,ids,method='stir',context='research',orderId=null){const premium=!!(context==='service'&&s.service?.orders?.find(o=>o.id===orderId)?.premium);if(!['research','service'].includes(s.phase)||s.cook||ids.length<2||ids.length>3||!canUse(s,ids,premium))return false;const txn=`cook-${s.cycle}-${s.day}-${s.step++}`;if(context==='research'&&s.phase!=='research')return false;const tiles=Array(9).fill(null);const defaults=[0,1,4];ids.forEach((id,i)=>tiles[defaults[i]]={id,heat:0});s.cook={context,orderId,method,tiles,movedThisBeat:false,beats:0,adj:{spice:0,umami:0},effects:[],flame:0,txn};return true}
export function moveTile(s,from,to){const c=s.cook;if(!c||c.beats>=3||(c.beats>0&&c.movedThisBeat)||from<0||from>8||to<0||to>8)return false;[c.tiles[from],c.tiles[to]]=[c.tiles[to],c.tiles[from]];if(c.beats>0)c.movedThisBeat=true;return true}
const neighbors=(p,q)=>Math.abs(Math.floor(p/3)-Math.floor(q/3))+Math.abs(p%3-q%3)===1;
export function setFlame(s,flame){
 if(!s.cook||s.cook.beats>=3||![-1,0,1].includes(flame))return false;
 s.cook.flame=flame;return true;
}
// 甩锅让整圈食材顺时针移动一格（中心不动），与一次换位互斥。
export function tossWok(s){
 const c=s.cook;
 if(!c||c.beats>=3||(c.beats>0&&c.movedThisBeat))return false;
 const ring=[0,1,2,5,8,7,6,3],old=ring.map(i=>c.tiles[i]);
 ring.forEach((pos,i)=>{c.tiles[pos]=old[(i+ring.length-1)%ring.length]});
 if(c.beats>0)c.movedThisBeat=true;
 return true;
}
export function previewHeat(c){
 const heatMap=c.method==='stir'?[1,2,1,2,3,2,1,2,1]:[1,1,1,1,2,1,1,1,1];
 return c.tiles.map((tile,p)=>tile?Math.max(0,heatMap[p]+(c.flame||0))+tile.heat:null);
}
export function beat(s){const c=s.cook;if(!c||c.beats>=3)return false;for(let p=0;p<9;p++){const tile=c.tiles[p];if(!tile)continue;const center=p===4,corner=[0,2,6,8].includes(p);tile.heat+=Math.max(0,(c.method==='stir'?(center?3:corner?1:2):(center?2:1))+(c.flame||0))}
const find=id=>c.tiles.findIndex(v=>v?.id===id);const meat=c.tiles.findIndex(v=>['beef','chicken'].includes(v?.id));const chili=find('chili'),garlic=find('garlic'),mush=find('mushroom');
if(meat>=0&&chili>=0&&neighbors(meat,chili))c.adj.spice++;
if(meat>=0&&mush>=0&&neighbors(meat,mush))c.adj.umami++;
if(garlic===4&&c.method==='stir'&&c.tiles[4].heat>=3&&c.tiles.some((v,p)=>v&&p!==4&&neighbors(p,4)&&v.heat>0))c.effects.push('蒜香爆锅');
c.beats++;c.movedThisBeat=false;c.flame=0;return true;}
export function cookOutcome(c,tech=false){const tiles=c.tiles.filter(Boolean),ids=tiles.map(t=>t.id),k=tiles.length;const good=tiles.map(x=>{let h=x.heat;if(tech&&c.method==='stir'&&h>ING[x.id].hi)h--;return h>=ING[x.id].lo&&h<=ING[x.id].hi});const undersafe=tiles.some(x=>['beef','chicken'].includes(x.id)&&x.heat<4);const match=(ids,need)=>ids.length===need.length&&need.every(id=>ids.includes(id));
let id=null;
if(match(ids,['beef','chili','garlic'])&&c.method==='stir'&&c.adj.spice>=2&&c.effects.includes('蒜香爆锅'))id='flame_beef';
else for(const [key,r] of Object.entries(RECIPES)){if(key==='flame_beef'||r.method!==c.method)continue;if(match(ids,r.ids)||(r.also||[]).some(x=>match(ids,x))){id=key;break}}
let heatScore=tiles.reduce((v,x)=>{let h=x.heat;if(tech&&c.method==='stir'&&h>ING[x.id].hi)h--;let distance=h<ING[x.id].lo?ING[x.id].lo-h:Math.max(0,h-ING[x.id].hi);return v+(distance===0?60/k:distance===1?35/k:distance===2?15/k:0)},0);
const effects=[...new Set([...c.effects,...(c.adj.spice>=2&&good.every(Boolean)?['辛香入味']:[]),...(c.adj.umami>=2&&good.every(Boolean)?['浓鲜融合']:[]),...(ids.includes('cabbage')&&good[ids.indexOf('cabbage')]?['爽脆']:[])])];
let synergy=effects.length>=2?25:effects.length?18:10;let technique=id?15:0;let quality=clamp(Math.round(heatScore+synergy+technique),0,100);const sellable=Boolean(id)&&!undersafe&&quality>=40;return {recipeId:id,quality,heatScore:Math.round(heatScore),effects,ids,tiles:clone(c.tiles),sellable,reason:!id?'未匹配已开放的料理配方':undersafe?'肉类未达到安全熟度':quality<40?'火候偏差过大':'成功',heat:tiles.map(t=>({id:t.id,heat:t.heat,ideal:`${ING[t.id].lo}–${ING[t.id].hi}`}))};}
export function finishCook(s){const c=s.cook;if(!c||c.beats!==3)return false;const r=cookOutcome(c,s.tech);const fee=c.context==='research',premium=!!(!fee&&s.service?.orders?.find(o=>o.id===c.orderId)?.premium);const ok=consume(s,r.ids,c.txn,premium);if(!ok)return false;if(premium)s.service.premiumConsumed=(s.service.premiumConsumed||0)+1;s.lastCook=r;s.cook=null;if(fee&&r.sellable){s.recipes[r.recipeId]=Math.max(s.recipes[r.recipeId]||0,Math.min(r.quality,90));s.learned[r.recipeId]=true;}if(!fee&&s.service){s.manualCost+=materialCost(r.ids);const order=s.service.orders.find(o=>o.id===c.orderId);if(order&&order.status==='queued'){order.manual={quality:r.quality,sellable:r.sellable,recipeId:r.recipeId};order.manualMaterialsConsumed=true;order.manualTimePaid=false;}}return r;}
export function synergyFor(menu){const rs=[...new Set(menu)].map(id=>RECIPES[id]).filter(Boolean);if(rs.some(r=>r.tags.includes('辣')&&r.tags.includes('肉'))&&rs.some(r=>r.station==='POT'))return '辛香暖胃';if(rs.filter(r=>r.tags.includes('菌香')).length>=2)return '菌香组合';return null}
export function canMenu(s){return s.menu.length===3&&s.menu.every(id=>s.recipes[id]&&RECIPES[id]);}
// A *forecast*, not a reservation: distribute expected guests evenly across
// the three selected dishes. Dishes may be duplicated in menu slots.
// Pre-cooked meals count as already supplied; their ingredients are not needed
// again. No material, gold, customer or save ledger mutations occur here.
export function prepStockForecast(s){
 const plan=serviceDayPlan(s),guestCount=plan.count;
 const menu=Array.isArray(s.menu)?s.menu:[];
 const planned={};
 if(menu.length){
  const base=Math.floor(guestCount/menu.length),extra=guestCount%menu.length;
  menu.forEach((id,i)=>{if(RECIPES[id])planned[id]=(planned[id]||0)+base+(i<extra?1:0)});
 }
 const required={};let afterPrep=0,coveredByPrep=0;
 for(const [id,plannedPortions] of Object.entries(planned)){
  const already=Math.min(plannedPortions,Math.max(0,s.prep?.[id]||0));
  coveredByPrep+=already;
  const toCook=Math.max(0,plannedPortions-already),craft=recipeCraftSnapshot(s,id);
  if(!craft)continue;
  afterPrep+=toCook;
  for(const ingredient of craft.ingredientIds)
   required[ingredient]=(required[ingredient]||0)+toCook;
 }
 const ingredients=Object.entries(required).map(([id,needed])=>{
  const have=Math.max(0,(s.inventory?.[id]||0)-(premiumReserved(s)[id]||0)),short=Math.max(0,needed-have);
  return {id,have,needed,short,remaining:have-needed};
 }).sort((a,b)=>b.short-a.short||b.needed-a.needed||a.id.localeCompare(b.id));
 const shortages=ingredients.filter(x=>x.short>0);
 const market=ensureDailyMarket(s);
 const purchasableShortages=shortages.filter(x=>
  ING[x.id]?.acquisitionPolicy==='SHOP_STAPLE'&&(market.goods[x.id]?.stock||0)>0);
 return {guestCount,portionsToCook:afterPrep,coveredByPrep,ingredients,shortages,
  shortageCount:shortages.length,purchasableShortages,purchasableCount:purchasableShortages.length,
  estimated:true};
}
export function prepDish(s,id){
 if(s.phase!=='prep'||!s.menu.includes(id)||!s.recipes[id])return false;
 const craft=recipeCraftSnapshot(s,id);if(!craft||!canUse(s,craft.ingredientIds))return false;
 if(!consume(s,craft.ingredientIds,'prep-'+s.cycle+'-'+s.day+'-'+s.step++))return false;
 s.prep[id]=(s.prep[id]||0)+1;
 s.prepVariants??={};(s.prepVariants[id]??=[]).push(clone(craft));
 s.prepCost+=materialCost(craft.ingredientIds);return true;
}
function customerFit(r,customerId,syn,craft=null){const customer=CUSTOMERS[customerId];let fit=clamp(50+r.tags.filter(t=>customer.likes.includes(t)).length*20-Math.max(0,(craft?.price??r.price)-customer.budget)*4,0,100);if(syn==='辛香暖胃'&&customerId==='adventurer'&&r.tags.includes('辣'))fit+=10;if(syn==='菌香组合'&&(customerId==='family'||customerId==='critic')&&r.tags.includes('菌香'))fit+=10;return clamp(fit+(craft?.guestFitDelta?.[customerId]||0),0,100)}
export function selectArrivalDish(s,o){
 // Only select food when the customer reaches the door: changing a menu at
 // intermission affects future orders, never rewrites an already seated order.
 const syn=synergyFor(s.menu),options=s.menu.filter(id=>s.recipes[id]&&RECIPES[id]).map(id=>{const craft=recipeCraftSnapshot(s,id);return {id,craft,score:customerFit(RECIPES[id],o.segment,syn,craft),price:craft.price}}).sort((a,b)=>b.score-a.score||a.price-b.price);
 const themed=firstChallenge(s)&&o.id===(s.service?.judgeOrderId||s.service?.orders?.[6]?.id)?options.filter(x=>RECIPES[x.id].tags.some(t=>['辣','爆香'].includes(t))):[];
 const best=themed[0]||options[0];
 const p=s.service?.premiumOffered,servedPremium=s.service?.orders?.filter(x=>x.premium).length||0;
 if(p&&p.dayKey===currentPremiumDay(s)&&premiumGuestEligible(s,o)&&servedPremium<p.limit){
  const special=RECIPES[p.recipeId],craft=recipeCraftSnapshot(s,p.recipeId);
  if(special&&craft&&canUse(s,craft.ingredientIds,true)){
   const overlap=special.tags.filter(t=>CUSTOMERS[o.segment].likes.includes(t)).length;
   const fit=clamp(53+overlap*18+(craft.quality>=85?8:0)+(craft.guestFitDelta?.[o.segment]||0),0,100);
   // A qualified diner can reject the dish: price/quality/style fit do matter.
   if(fit>=63&&fit>=((best?.score||50)-24)){
    o.premium=true;o.recipeId=p.recipeId;o.fit=fit;
    o.craft=clone({...craft,price:Math.round(craft.price*PREMIUM_PRICE_FACTOR)});
    return {id:o.recipeId,score:fit,craft:o.craft,premium:true};
   }
  }
 }
 o.premium=false;o.recipeId=best?.id||null;o.fit=best?.score||0;o.craft=best?.craft?clone(best.craft):null;
 return best;
}
// v0.5C: seeded nightly scenarios. Save/restore does not reroll guests or goals.
export function serviceDayPlan(s){
 const key=rand(s.seed+s.cycle*3109+s.day*701+Math.max(0,s.reputation)*11);
 // The LCG multiplier is divisible by 5, so key % 5 was CONSTANT.
 // Use mixed high bits or every night falsely advertises the same scenario.
 const pressure=['街坊晚餐','菌帽家庭聚餐','矿工收工','雨夜暖汤','集市热闹夜'][(key>>>17)%5];
 // Crowd labels represent different *operational pressure*, not cosmetic themes.
 const crowdRules={
  '街坊晚餐':{min:6,spread:2,spacing:3,favorite:'regular'},
  '菌帽家庭聚餐':{min:8,spread:2,spacing:2,favorite:'family'},
  '矿工收工':{min:8,spread:3,spacing:1,favorite:'adventurer'},
  '雨夜暖汤':{min:6,spread:3,spacing:3,favorite:'family'},
  '集市热闹夜':{min:10,spread:2,spacing:1,favorite:'adventurer'}
 };
 const rule=crowdRules[pressure];
 const baselineCount=Math.min(s.cycle===1?11:14,rule.min+((key>>>5)%rule.spread)+(firstChallenge(s)?1:0)+(s.cycle>1?2:0)+(s.reputation>=10?1:0));
 // The star earns local word-of-mouth; tables DO NOT generate customers.
 const starred=ensureChapterProgress(s).stars>=1;
 const count=naturalStarAttendance(baselineCount,starred?1:0,pressure,s.reputation);
 const favorite=rule.favorite;
 const baseline=today(s).segments;
 const guests=Array.from({length:count},(_,i)=>{
  if(firstChallenge(s)&&i===count-1)return 'critic';
  if(i===0)return baseline[0];
  const pick=rand(key+i*109+s.day*17)%6;
  return pick<2?favorite:pick===2?'regular':pick===3?'adventurer':pick===4?'family':baseline[i%baseline.length];
 });
 // On a stocked secret-dish night, qualify at least one *planned* visitor.
 // Prefer an already-qualified returning guest; otherwise reuse an existing
 // scheduled customer slot for the ghost critic. Do not change total count.
 if(premiumMenuActive(s)){
  const seen=new Set();
  const alreadyQualified=guests.some(segment=>{
   if(segment==='critic')return true;
   if(seen.has(segment))return false;seen.add(segment);
   const id=REGULAR_GUESTS[segment]?.id;
   return !!(id&&s.guestRelationships?.[id]?.happyMeals>=2);
  });
  if(!alreadyQualified)guests[Math.min(2,count-1)]='critic';
 }
 // A real new customer occupies an existing arrival slot after the first star.
 // The already-started service keeps its frozen order list on load.
 if(ensureChapterProgress(s).stars>=1){
  guests[Math.min(1,count-1)]='stargazer';
  if(count>=9&&((key>>>12)%3===0))guests[count-2]='stargazer';
 }
 const campaign=selectedCampaign(s);
 if(!campaign.stars||ensureChapterProgress(s).stars>=campaign.stars)guests.push(...campaign.guests);
 const fullCount=guests.length;
 const goals=[
  {kind:'served',target:Math.max(5,Math.ceil(fullCount*.75)),label:`完成 ${Math.max(5,Math.ceil(fullCount*.75))} 份上菜`},
  {kind:'comfort',target:72,label:'平均满意达到 72'},
  {kind:'pair',target:2,label:'服务至少 2 位同桌食客'},
  {kind:'flavor',target:2,label:'卖出至少 2 道辛辣料理'}
 ];
 const goal=goals[(key>>>9)%goals.length];
 return {seed:key,pressure,count:fullCount,baseCount:count,starred,guests,goal,arrivalSpacing:rule.spacing,campaignId:campaign.id,marketingCost:campaign.cost,marketingGuests:fullCount-count};
}
// A physical chair stays occupied until the guest has finished leaving.
// This prevents a newly seated diner overlapping an exiting actor.
export function seatOccupiedAt(o,t){
 if(o.tableId===null||o.tableId===undefined)return false;
 if(['entering','ordering','queued','cooking','pickup','carried','delivering','flying','eating','review'].includes(o.status))return true;
 if(o.status==='served'&&Number.isFinite(o.reviewedAt))return t-o.reviewedAt<2.2;
 if(o.status==='served'&&Number.isFinite(o.served))return t-o.served<3.85;
 if(['left','rejected'].includes(o.status)&&Number.isFinite(o.leftAt))return t-o.leftAt<2.6;
 return false;
}
export function serviceSupplyStatus(s){
 const v=s.service;if(!v)return {queued:0,cooking:0,arrived:0,shortages:[],lastProblem:null};
 const queued=v.orders.filter(o=>o.status==='queued');
 const stock={...s.inventory},prep={...s.prep},prepVariants=clone(s.prepVariants||{}),shortages=[];
 for(const o of queued){const r=RECIPES[o.recipeId];if(!r)continue;
  const existing=prepVariants[o.recipeId]||[],index=existing.findIndex(x=>x.variantId===o.craft?.variantId);
  if((prep[o.recipeId]||0)>0&&(index>=0||!existing.length)){prep[o.recipeId]--;if(index>=0)existing.splice(index,1);continue}
  const need={};for(const id of o.craft?.ingredientIds||r.ids)need[id]=(need[id]||0)+1;
  const missing=Object.entries(need).filter(([id,n])=>(stock[id]||0)<n).map(([id,n])=>({id,amount:n-(stock[id]||0)}));
  if(missing.length)shortages.push({orderId:o.id,recipeId:o.recipeId,tableId:o.tableId,seatId:o.seatId,missing});
  else for(const [id,n] of Object.entries(need))stock[id]-=n;
 }
 const lastProblem=[...v.events].reverse().find(ev=>ev.type==='rejected'&&ev.reason==='食材不足'&&v.time-ev.t<=7)||null;
 return {queued:queued.length,cooking:v.orders.filter(o=>o.status==='cooking').length,
  arrived:v.orders.filter(o=>o.status!=='waiting').length,shortages,lastProblem};
}
export function tableSeatState(v,table){
 return [0,1].map(seat=>v?.orders?.find(o=>o.tableId===table&&o.seatId===seat&&['entering','ordering','queued','cooking','pickup','carried','delivering','flying','eating','review'].includes(o.status))||null);
}
export function serviceGoalResult(v){
 const goal=v?.goal;if(!goal)return null;
 const served=v.orders.filter(o=>o.status==='served');
 const value=goal.kind==='served'?served.length:
  goal.kind==='comfort'?Math.round(served.reduce((n,o)=>n+(o.sat||0),0)/Math.max(1,served.length)):
  goal.kind==='pair'?served.filter(o=>o.partySize===2).length:
  served.filter(o=>RECIPES[o.recipeId]?.tags?.includes('辣')).length;
 return {kind:goal.kind,label:goal.label,value,target:goal.target,success:value>=goal.target};
}
export function createService(s,options={}){if(s.phase!=='service'||s.service||!kitchenHasMenuCoverage(s))return false;
 const plan=serviceDayPlan(s),size=plan.count;
 if(s.coins<plan.marketingCost)return false;
 if(plan.marketingCost&&!transact(s,`marketing-${kitchenDayKey(s)}`,'marketing',{},-plan.marketingCost))return false;
 const namedToday=new Set();
 const orders=plan.guests.map((segment,i)=>{
  const guest=REGULAR_GUESTS[segment],guestId=guest&&!namedToday.has(segment)?guest.id:null;
  if(guestId)namedToday.add(segment);
  const plannedWave=j=>j<plan.baseCount?serviceArrivalWave(j,plan.baseCount,plan.starred):(plan.campaignId==='guild'||plan.campaignId==='tasting'?2:(j-plan.baseCount)%2+1);
  const wave=plannedWave(i);
  const waveIndex=plan.guests.slice(0,i).filter((_,j)=>plannedWave(j)===wave).length;
  return {id:`${s.cycle}-${s.day}-o${i}`,segment,recipeId:null,fit:0,wave,
   arrival:serviceArrivalSecond(wave,waveIndex,i>=plan.baseCount&&plan.campaignId==='guild'?1:plan.arrivalSpacing,plan.starred),promotionGuest:i>=plan.baseCount,status:'waiting',patience:CUSTOMERS[segment].patience,
   elapsed:0,quality:null,started:null,served:null,tableId:null,seatId:null,partySize:1,guestId};
 });
 // Pairs are formed from adjacent visitors in a wave. Their orders remain
 // independent; the second diner cannot overwrite the first one's seat.
 for(let i=0;i<orders.length;i+=2){
  if(orders[i+1]&&orders[i+1].wave===orders[i].wave){orders[i].partyId=orders[i+1].partyId=`party-${i}`;orders[i].partySize=orders[i+1].partySize=2;}
 }
 const planEvents={1:SERVICE_EVENT_POOL[1][(plan.seed>>>2)%SERVICE_EVENT_POOL[1].length],
                   2:SERVICE_EVENT_POOL[2][(plan.seed>>>4)%SERVICE_EVENT_POOL[2].length]};
 s.service={orders,time:0,scenario:plan.pressure,scenarioSeed:plan.seed,goal:clone(plan.goal),eventPlan:planEvents,
  judgeOrderId:firstChallenge(s)?[...orders].reverse().find(o=>o.segment==='critic')?.id:null,
  marketing:{id:plan.campaignId,cost:plan.marketingCost,guests:plan.marketingGuests},
  ratingAttempt:ensureChapterProgress(s).stars===0&&
   ensureChapterProgress(s).requestDay===kitchenDayKey(s)&&totalBusinessDay(s)>=4,
  crew:clone(crewEffects(s)),staffStats:{helperSeconds:0,helperOrders:0,waiterBonus:0,waiterOrders:0,waiterSaved:0},
  stations:{WOK:null,POT:null},kitchenSnapshot:clone(ensureKitchen(s).slots),stationStats:{WOK:{count:0,secondsSaved:0},POT:{count:0,secondsSaved:0}},
  queued:[],wave:0,done:false,events:[],income:0,cost:0,tableCount:s.dining?.tableCount||2,congestion:{WOK:0,POT:0},initialInventory:clone(s.inventory),
  reportBuilt:false,manualUsed:0,treatUsed:false,paused:true,breakAt:0,breakSeen:[],breakUsed:false,eventChoiceMade:[],
  eventEffects:{WOK:0,POT:0},eventExpense:0,guestMood:0,
  premiumConsumed:0,premiumOffered:premiumMenuActive(s)?{...s.premiumMenu}:null,
  walkable:options.walkable===true,sceneVersion:options.walkable===true?'0.9.0':null,hero:options.walkable===true?newServiceHero():null};
 spawnArrivals(s);return true;
}

function record(s,e){s.service.events.push({t:s.service.time,...e})}
export function setServicePaused(s,paused){
 const v=s.service;
 if(s.phase!=='service'||!v||v.done||s.cook||v.breakAt||typeof paused!=='boolean')return false;
 v.paused=paused;return true;
}
export function resumeBreak(s){
 const v=s.service;
 if(s.phase!=='service'||!v||!v.breakAt||v.done)return false;
 record(s,{type:'wave_resumed',wave:v.breakAt});
 v.breakAt=0;v.paused=false;return true;
}
export function breakPrep(s,recipeId){
 const v=s.service,recipe=RECIPES[recipeId],craft=recipeCraftSnapshot(s,recipeId);
 if(s.phase!=='service'||!v||!v.breakAt||v.breakUsed||!recipe||!s.menu.includes(recipeId)||!s.recipes[recipeId]||!craft||!canUse(s,craft.ingredientIds))return false;
 if(!consume(s,craft.ingredientIds,`emergency-prep-${s.cycle}-${s.day}-${v.breakAt}`))return false;
 s.prep[recipeId]=(s.prep[recipeId]||0)+1;s.prepVariants??={};(s.prepVariants[recipeId]??=[]).push(clone(craft));
 v.cost+=materialCost(craft.ingredientIds);v.breakUsed=true;v.decisionFlash=`应急预制：${recipe.name}`;v.decisionAt=v.time;
 record(s,{type:'emergency_prep',recipeId});return true;
}
export const SERVICE_EVENTS={
 1:{id:'rush',title:'矿井刚刚换班',description:'饥肠辘辘的矮人陆续进门，肉菜可能卖得更快。',choices:[
  {id:'sign',label:'主推辣味菜',detail:'下一波增加一位喜欢辣味的矮人'},
  {id:'kitchen',label:'整理后厨',detail:'花 6 金币：下一波炒锅每单减少 3 秒'},
  {id:'steady',label:'保持原计划',detail:'不追加成本，原客群结构保持不变'}]},
 2:{id:'critic',title:'门外飘来一团灵雾',description:'听说幽灵鉴味师会来，出餐速度和火候都得留心。',choices:[
  {id:'soup',label:'主推温和餐',detail:'下一波增加一位菌帽食客'},
  {id:'assist',label:'雇临时帮厨',detail:'花 8 金币：下一波两口锅每单减少 3 秒'},
  {id:'publicity',label:'免费试吃宣传',detail:'花 5 金币：下一波顾客满意度 +10'}]}
};
// Event variation affects presentation and the offer's tactical context;
// every choice still uses its single authoritative accounting path.
export const SERVICE_EVENT_POOL={
 1:[SERVICE_EVENTS[1],
  {id:'rain',title:'突降大雨，客人想吃热的',description:'有人想喝汤，但炒锅仍有排队风险。',choices:[
   {id:'soup',label:'推荐一份热汤',detail:'下一波一位顾客转为家庭客'},
   {id:'kitchen',label:'帮后厨清台',detail:'6 金币：炒锅加速 3 秒'},
   {id:'steady',label:'不追热潮',detail:'保持计划，保存金币'}]},
  {id:'market',title:'矿工们被香味引了过来',description:'门外越来越热闹，今晚的肉菜会不会不够？',choices:[
   {id:'sign',label:'推出辛辣招牌',detail:'下一波增加矮人食客'},
   {id:'kitchen',label:'整理炒锅',detail:'6 金币：炒锅每单缩短 3 秒'},
   {id:'steady',label:'保留原菜单',detail:'不改变今晚的客群'}]}],
 2:[SERVICE_EVENTS[2],
  {id:'late',title:'深夜加班客匆匆进门',description:'快餐和耐心都成为最后一波的关键。',choices:[
   {id:'assist',label:'临时请人帮忙',detail:'8 金币：所有锅具加速 3 秒'},
   {id:'publicity',label:'送一份试吃',detail:'5 金币：下一波好感 +10'},
   {id:'steady',label:'稳住节奏',detail:'不追加支出'}]},
  {id:'family',title:'几顶小菌帽探进门来',description:'林地家庭想吃温暖的料理，需要调整菜单吗？',choices:[
   {id:'soup',label:'优先推荐温和菜',detail:'下一波增加菌帽食客'},
   {id:'publicity',label:'附赠小菜招待',detail:'5 金币：下一波好感 +10'},
   {id:'assist',label:'请人救急',detail:'8 金币：双厨具加速 3 秒'}]}]
};
export function currentServiceEvent(s){const v=s.service;if(s.phase!=='service'||!v?.breakAt||v.eventChoiceMade?.includes(v.breakAt))return null;return v.eventPlan?.[v.breakAt]||SERVICE_EVENTS[v.breakAt]||null}
export function chooseServiceEvent(s,choice){
 const v=s.service,event=currentServiceEvent(s);
 if(!event||v.breakUsed||!event.choices.some(c=>c.id===choice))return false;
 const wave=v.breakAt,txn=`service-event-${s.cycle}-${s.day}-${wave}`;
 const cost=choice==='kitchen'?6:choice==='assist'?8:choice==='publicity'?5:0;
 if(s.coins<cost)return false;
 if(cost){if(!transact(s,txn,'service_event',{},-cost))return false;v.eventExpense+=cost;}
 if(choice==='sign'||choice==='soup'){
  const next=v.orders.find(o=>o.status==='waiting'&&o.wave===wave);
  if(next){next.segment=choice==='sign'?'adventurer':'family';next.patience=CUSTOMERS[next.segment].patience}
 }else if(choice==='kitchen'){v.eventEffects.WOK=3;}
 else if(choice==='assist'){v.eventEffects.WOK=3;v.eventEffects.POT=3;}
 else if(choice==='publicity'){v.guestMood=10;v.eventMoodWave=wave;}
 v.eventChoiceMade.push(wave);v.breakUsed=true;
 v.decisionFlash=({sign:'矮人客人增加',kitchen:'炒锅加速 -3秒',steady:'稳住服务节奏',soup:'菌帽食客增加',assist:'双厨具加速 -3秒',publicity:'顾客好感 +10'})[choice]||'事件已处理';v.decisionAt=v.time;
 record(s,{type:'management_choice',wave,choice,cost});return true;
}
export function swapBreakMenu(s,slot,id){
 const v=s.service;
 if(s.phase!=='service'||!v?.breakAt||v.breakUsed||!Number.isInteger(slot)||slot<0||slot>2||!s.recipes[id]||!RECIPES[id])return false;
 const before=s.menu[slot];if(before===id)return false;s.menu[slot]=id;v.breakUsed=true;v.decisionFlash=`下一波新上架：${RECIPES[id].name}`;v.decisionAt=v.time;
 record(s,{type:'menu_swap',wave:v.breakAt,slot,before,after:id});return true;
}
function materialCost(ids){return ids.reduce((sum,id)=>sum+ING[id].cost,0)}
// The plate is only prepared when a station finishes. It is NOT yet served.
// Order money, guest happiness and final service counters are committed after
// the projectile lands and the guest has visibly tasted and reviewed it.
export const DINER_TIMING={enter:2,order:1,flight:2,eat:3,review:2,exit:2.2};
function finishOrder(s,o,quality){
 const v=s.service;
 if(o.status==='left'||o.status==='rejected')return;
 o.quality=quality;
 if(v.walkable){
  o.status='pickup';o.pickupAt=v.time;
  record(s,{type:'plate_ready',order:o.id,recipeId:o.recipeId});
  return;
 }
 o.status='flying';o.flightAt=v.time;
 record(s,{type:'throw',order:o.id,recipeId:o.recipeId,quality});
}
function deliverWalkableOrder(s,o,by){
 const v=s.service;
 if(!v.walkable||!['pickup','carried','delivering'].includes(o.status))return false;
 if(o.status==='carried'&&by!=='hero')return false;
 if(o.status==='delivering'&&by!=='waiter')return false;
 if(o.status==='pickup'&&by!=='self')return false;
 if(v.hero?.carryOrderId===o.id)v.hero.carryOrderId=null;
 o.status='flying';o.deliveryMode=by;
 // The physical delivery is already complete. A one-tick landing closes
 // the same existing sale transaction, without an additional throw animation.
 o.flightAt=v.time-(DINER_TIMING.flight-1);
 record(s,{type:'delivered',order:o.id,recipeId:o.recipeId,by});
 return true;
}
export function walkableSpecial(s){
 const v=s.service,h=v?.hero;if(s.phase!=='service'||!v?.walkable||!h||v.paused||v.done||v.breakAt||s.cook||h.carryOrderId)return null;
 const zone=heroZone(h,s);
 if(zone==='WOK'||zone==='POT'){
  const job=v.stations[zone],o=v.orders.find(x=>x.id===job?.orderId);
  if(!job||!o||o.status!=='cooking'||job.left<=2.2||h.assistIds.includes(o.id))return null;
  return {kind:'burst',zone,orderId:o.id,energy:2,available:h.energy>=2,icon:'🔥'};
 }
 if(zone?.startsWith('TABLE')){
  const table=Number(zone.slice(5));
  const o=v.orders.find(x=>x.tableId===table&&['queued','cooking','pickup','delivering'].includes(x.status)&&!h.comfortIds.includes(x.id));
  if(!o||o.patience-(v.time-o.arrival)>12||o.patience-(v.time-o.arrival)<=0)return null;
  return {kind:'comfort',zone,orderId:o.id,energy:1,available:h.energy>=1,icon:'💛'};
 }
 return null;
}
export function activateWalkableSpecial(s){
 const action=walkableSpecial(s);if(!action||!action.available)return false;
 const v=s.service,h=v.hero,o=v.orders.find(x=>x.id===action.orderId);
 if(!o)return false;
 if(action.kind==='burst'){
  const job=v.stations[action.zone];if(!job||job.orderId!==o.id)return false;
  job.left=Math.max(.8,job.left-2);h.energy-=2;h.assistIds.push(o.id);h.assists++;
  record(s,{type:'hero_boost',order:o.id,seconds:2});
 }else if(action.kind==='comfort'){
  if(!['queued','cooking','pickup','delivering'].includes(o.status))return false;
  o.patience+=4;h.energy-=1;h.comfortIds.push(o.id);h.comforts++;
  record(s,{type:'hero_comfort',order:o.id,seconds:4});
 }else return false;
 return true;
}
// Single authority for proximity actions: RAF drives movement+dwell with the
// SAME real-time delta as the 1s production clock. No second sale system.
export function advanceWalkableInteraction(s,dt){
 const v=s.service,h=v?.hero;
 if(s.phase!=='service'||!v?.walkable||!h||v.paused||v.breakAt||v.done||s.cook)return false;
 dt=Math.max(0,Math.min(.06,Number(dt)||0));
 const zone=heroZone(h,s),carry=v.orders.find(o=>o.id===h.carryOrderId&&o.status==='carried');
 const pending=zone==='PASS'&&!carry?v.orders.find(o=>o.status==='pickup'):null;
 const delivery=zone?.startsWith('TABLE')&&carry&&carry.tableId===Number(zone.slice(5))?carry:null;
 const focus=delivery?'serve:'+delivery.id:pending?'pickup:'+pending.id:null;
 if(h.dwellZone!==focus){h.dwellZone=focus;h.dwell=0}
 if(!focus)return false;
 h.dwell+=dt;
 if(h.dwell<(delivery?.48:.36))return false;
 if(delivery){
  if(!deliverWalkableOrder(s,delivery,'hero'))return false;
  h.delivered++;h.dwell=0;h.dwellZone=null;
  return true;
 }
 if(pending?.status==='pickup'&&!h.carryOrderId){
  pending.status='carried';pending.carriedAt=v.time;h.carryOrderId=pending.id;
  record(s,{type:'hero_pickup',order:pending.id});
  h.dwell=0;h.dwellZone=null;
  return true;
 }
 return false;
}
function stepWalkableShift(s){
 const v=s.service,h=v.hero;
 if(!h||!v.walkable)return;
 const zone=heroZone(h,s);
 if(h.carryOrderId&&!v.orders.some(o=>o.id===h.carryOrderId&&o.status==='carried'))h.carryOrderId=null;
 // Player food handling is controlled by advanceWalkableInteraction() with
 // short physical dwell, NEVER teleported at the next whole-second tick.
 // Kitchenless orders sit on the pass. Helpers deliver without player travel,
 // but always via the same delivery/landing path used by the original ledger.
 for(const o of v.orders){
  if(o.status==='pickup'&&v.time-o.pickupAt>=(v.crew.waiter.hired?2:9)&&(!v.crew.waiter.hired||(!v.orders.some(other=>other.status==='delivering')&&v.time>=(v.waiterBusyUntil||0)))){
   if(v.crew.waiter.hired){o.status='delivering';o.deliveryAt=v.time;record(s,{type:'waiter_pickup',order:o.id});}
   else deliverWalkableOrder(s,o,'self');
  }
  if(o.status==='delivering'&&v.time-o.deliveryAt>=(v.crew?.waiter?.level>=3&&!v.waiterExpressUsed&&v.time>=30&&v.time<=80?1:3)){if(v.crew?.waiter?.level>=3&&!v.waiterExpressUsed&&v.time>=30&&v.time<=80){v.waiterExpressUsed=true;record(s,{type:'crew_skill',role:'waiter',order:o.id})}
   if(deliverWalkableOrder(s,o,'waiter')){v.waiterBusyUntil=v.time+2;record(s,{type:'waiter_return',order:o.id,table:o.tableId});}
  }
 }
 const active=!!h.carryOrderId||((zone==='WOK'||zone==='POT')&&!!v.stations[zone]);
 h.recovery+=1/(active?12:7);
 if(h.recovery>=1){const n=Math.floor(h.recovery);h.recovery-=n;h.energy=Math.min(h.maxEnergy,h.energy+n);}
 if(h.energy>=h.maxEnergy)h.recovery=0;
}
// Real satisfaction rules are unchanged. Species-specific lines are the
// presentation of that verdict, not additional hidden score modifiers.
export const CUSTOMER_REVIEW_VOICES={
 adventurer:{late:'这锅香归香，我的矿车都开走了！',quality:'火候软得像矿渣，再来点劲！',taste:'这味道不够扎实，矿工吃不饱。',delicious:'好吃！胡子都沾上锅气了！',happy:'够劲！明天带矿友来。',okay:'嗯，勉强够下矿了。',bad:'没填饱矿工的肚子。'},
 family:{late:'幼菇们都快睡着了……',quality:'菌汤还差点火候呢。',taste:'这味道让小菌帽有点不适应。',delicious:'真好吃！幼菇们都笑啦！',happy:'暖暖的，下次还来。',okay:'还算温暖，孩子们吃得下。',bad:'小菌帽们没吃尽兴。'},
 regular:{late:'好吃归好吃，我都快等成一滩啦！',quality:'呜咕，火候让口感变硬了。',taste:'呜咕，这口味让我不太想弹。',delicious:'咕噜！好吃得浑身发光！',happy:'弹！明天再来一份！',okay:'咕噜……还可以。',bad:'呜咕，没吃出开心来。'},
 critic:{late:'让亡灵苦等，香气也会散尽。',quality:'火候未得其魂，甚是可惜。',taste:'异味有了，层次还差一些。',delicious:'绝妙！这味道足以穿透灵界。',happy:'有趣，下次再品鉴。',okay:'尚可，留下些许余味。',bad:'灵魂未被打动。'},
 stargazer:{late:'星砂都快落尽了，我还没吃上。',quality:'这火候让星光都暗了些。',taste:'旅途中更想尝点清新的。',delicious:'像把整片星空盛进了碗里！',happy:'真好，明晚再循香过来。',okay:'这顿旅途餐还不错。',bad:'今晚的星光没落到盘里。'}
};
export function guestReview(o){
 const wait=Math.max(0,(o.landedAt??o.served??0)-(o.arrival||0));
 const ratio=wait/Math.max(1,o.patience||1);
 const type=ratio>.72?'late':(o.quality||0)<62?'quality':(o.fit||0)<57?'taste':
    (o.sat||0)>=87?'delicious':(o.sat||0)>=72?'happy':(o.sat||0)>=55?'okay':'bad';
 const voice=CUSTOMER_REVIEW_VOICES[o.segment]||CUSTOMER_REVIEW_VOICES.regular;
 return {type,text:voice[type]};
}
function advanceGuestMeals(s){
 const v=s.service;
 for(const o of v.orders){
  if(o.status==='flying'&&v.time-o.flightAt>=DINER_TIMING.flight){
   o.status='eating';o.landedAt=v.time;o.served=v.time;
   const price=o.craft?.price??RECIPES[o.recipeId]?.price??0;
   if(transact(s,`sale-${o.id}`,'sale',{},price))v.income+=price;
   record(s,{type:'landed',order:o.id,recipeId:o.recipeId});
  }
  if(o.status==='eating'&&v.time-o.landedAt>=DINER_TIMING.eat){
   const wait=clamp(o.landedAt-o.arrival,0,o.patience);
   const serviceScore=clamp(Math.round(100*(1-wait/o.patience)),0,100);
   o.sat=clamp(Math.round(.5*o.fit+.3*o.quality+.2*serviceScore+(v.guestMood||0)*(o.wave===v.eventMoodWave?1:0)),0,100);
   const review=guestReview(o);o.reviewText=review.text;o.reviewType=review.type;
   o.status='review';o.reviewAt=v.time;
   s.reputation+=o.sat>=70?1:o.sat<50?-1:0;
   if(o.guestId&&uniqueAdd(s.ledger,`guest-visit-${o.id}`,'guest_relationship',{guestId:o.guestId,sat:o.sat})){
    const p=REGULAR_GUESTS[o.segment];
    const rel=s.guestRelationships[o.guestId]??={guestId:o.guestId,name:p?.name||'熟客',segment:o.segment,visits:0,happyMeals:0,lastDay:0};
    rel.visits++;if(o.sat>=80)rel.happyMeals++;rel.lastDay=totalBusinessDay(s);
    record(s,{type:'regular_visit',order:o.id,guestId:o.guestId,sat:o.sat,happyMeals:rel.happyMeals});
   }
   if(v.staffStats&&(v.crew?.waiter?.patience||0)>0&&wait>(o.basePatience||o.patience))v.staffStats.waiterSaved++;
   record(s,{type:'reviewed',order:o.id,recipeId:o.recipeId,sat:o.sat,reason:review.type,text:review.text});
  }
  if(o.status==='review'&&v.time-o.reviewAt>=DINER_TIMING.review){
   o.status='served';o.reviewedAt=v.time;
   record(s,{type:'served',order:o.id,recipeId:o.recipeId,sat:o.sat,quality:o.quality,wait:o.landedAt-o.arrival});
  }
 }
}
function advanceGuestOrders(s){
 const v=s.service;
 for(const o of v.orders){
  if(o.status==='entering'&&v.time-o.doorAt>=DINER_TIMING.enter){
   o.status='ordering';o.seatedAt=v.time;record(s,{type:'seated',order:o.id,table:o.tableId,seat:o.seatId});
  }
  if(o.status==='ordering'&&v.time-o.seatedAt>=DINER_TIMING.order){
   selectArrivalDish(s,o);
   if(o.fit<45||!o.recipeId){o.status='rejected';o.rejectReason='菜单不匹配';o.leftAt=v.time;record(s,{type:'rejected',order:o.id,reason:'菜单不匹配'});continue;}
   o.basePatience=o.patience;const bonus=v.crew?.waiter?.patience||0;
   // Outdoor waiting uses up real customer patience; reset at ordering must not be a free time bank.
   const queuePenalty=Math.min(24,Math.round((o.queueSeconds||0)*1.15));
   o.patience=Math.max(8,o.patience+bonus-queuePenalty);v.staffStats.waiterBonus+=bonus;if(bonus)v.staffStats.waiterOrders++;
   o.status='queued';o.arrival=v.time; o.orderedAt=v.time;
   v.queued.push(o.id);record(s,{type:'ordered',order:o.id,recipeId:o.recipeId,table:o.tableId,seat:o.seatId});
  }
 }
}
export function expedite(s,orderId){const v=s.service;if(!v||s.phase!=='service')return false;const i=v.queued.indexOf(orderId);if(i<0)return false;v.queued.splice(i,1);v.queued.unshift(orderId);return true}
export function markManual(s,orderId){const v=s.service;if(!v||v.manualUsed>=2||s.cook)return false;const o=v.orders.find(x=>x.id===orderId);if(!o||o.status!=='queued'||o.manual||!s.recipes[o.recipeId])return false;const r=RECIPES[o.recipeId];if(!canUse(s,r.ids,!!o.premium))return false;const started=startCook(s,r.ids,r.method,'service',orderId);if(started)v.manualUsed++;return started}
function spawnArrivals(s){
 const v=s.service;
 for(const o of v.orders){
  if(o.status!=='waiting'||o.arrival>v.time)continue;
  if(v.orders.filter(x=>seatOccupiedAt(x,v.time)).length>=v.tableCount*2)continue;
  const occupied=v.orders.filter(x=>seatOccupiedAt(x,v.time));
  // Keep party members together if a seat is available. Else seat pairs in
  // the same table, using both chairs before spilling into another table.
  const party=occupied.find(x=>x.partyId&&x.partyId===o.partyId);
  let table=null,seat=null;
  if(party){const used=new Set(occupied.filter(x=>x.tableId===party.tableId).map(x=>x.seatId));
    const candidate=[0,1].find(i=>!used.has(i));if(candidate!==undefined){table=party.tableId;seat=candidate;}}
  if(table===null){for(const i of Array.from({length:v.tableCount},(_,j)=>j)){const used=new Set(occupied.filter(x=>x.tableId===i).map(x=>x.seatId));
    const candidate=[0,1].find(j=>!used.has(j));if(candidate!==undefined){table=i;seat=candidate;break;}}}
  if(table===null)continue;
  o.status='entering';o.doorAt=v.time;o.tableId=table;o.seatId=seat;
  // Remember actual outdoor waiting; a smaller room cannot grant free extra patience.
  o.queueSeconds=Math.max(0,v.time-o.arrival);
  if(v.time>o.arrival)record(s,{type:'queue_seated',order:o.id,seconds:v.time-o.arrival});
  const dex=ensureGuestDex(s);
  dex.seenSegments[o.segment]=true;
  if(o.guestId)dex.metGuests[o.guestId]=true;
  record(s,{type:'arrived',order:o.id,table,seat});
 }
}
// A real customer can walk away while waiting outdoors, with no order or revenue.
// The order keeps tableId=null so the existing sales and seat rules cannot fake a sale.
function expireOutdoorQueue(s){
 const v=s.service;
 for(const o of v.orders){
  if(!outdoorQueueExpired(o,v.time))continue;
  o.status='left';o.leftReason='等位超时';o.leftAt=v.time;
  record(s,{type:'queue_left',order:o.id,seconds:v.time-o.arrival,reason:'等位超时'});
 }
}

export function tick(s,seconds=1){const v=s.service;if(!v||v.done||s.phase!=='service'||s.cook||v.paused||v.breakAt)return false;for(let t=0;t<seconds;t++){if(v.done)break;v.time++;
// 每波之后给一个真正可交互的停顿；停顿期间生产和耐心都不走时。
if((v.time===20||v.time===41)&&!v.breakSeen.includes(v.time)){
 v.breakAt=v.time===20?1:2;v.breakSeen.push(v.time);v.breakUsed=false;v.eventEffects={WOK:0,POT:0};
 record(s,{type:'wave_break',wave:v.breakAt});break;
}
expireOutdoorQueue(s);
spawnArrivals(s);
v.queuePeak=Math.max(v.queuePeak||0,outdoorQueueCount(v.orders,v.time));
advanceGuestOrders(s);
advanceGuestMeals(s);
if(v.walkable)stepWalkableShift(s);
for(const st of ['WOK','POT']){const job=v.stations[st];if(job){v.congestion[st]++;
 const assigned=v.crew?.helper?.hired&&v.crew.helper.station===(st==='WOK'?0:1);
 const hero=v.walkable&&v.hero&&!v.hero.carryOrderId&&heroZone(v.hero,s)===st;
 const rate=v.walkable?(Number(assigned)+Number(!!hero)):1;
 job.left-=rate;
 if(job.left<=0){v.stations[st]=null;const o=v.orders.find(x=>x.id===job.orderId);if(o.status==='cooking'){finishOrder(s,o,job.quality);if(v.crew?.helper?.hired&&v.crew.helper.station===(st==='WOK'?0:1))record(s,{type:'helper_finished',order:job.orderId});}else record(s,{type:'waste',order:job.orderId});}}}
for(const o of v.orders){if((o.status==='queued'||o.status==='cooking'||(v.walkable&&['pickup','carried','delivering'].includes(o.status)))&&v.time-o.arrival>o.patience){if(v.walkable&&o.status==='delivering'){v.waiterBusyUntil=v.time+2;record(s,{type:'waiter_return',order:o.id,table:o.tableId});}o.status='left';o.leftReason='等待超时';o.leftAt=v.time;if(v.hero?.carryOrderId===o.id)v.hero.carryOrderId=null;s.reputation=Math.max(-20,s.reputation-1);v.queued=v.queued.filter(id=>id!==o.id);record(s,{type:'left',order:o.id,reason:'等待超时'});}}
for(const st of ['WOK','POT']){if(v.stations[st])continue;let i=v.queued.findIndex(id=>{const o=v.orders.find(x=>x.id===id);return o&&RECIPES[o.recipeId].station===ensureKitchen(s).slots[st==='WOK'?0:1].type});if(i<0)continue;const id=v.queued.splice(i,1)[0];const o=v.orders.find(x=>x.id===id);const r=RECIPES[o.recipeId];if(o.manual){o.status='cooking';v.stations[st]={orderId:id,left:stationDuration(s,st,r,v),quality:o.manual.sellable&&o.manual.recipeId===o.recipeId?o.manual.quality:0};if(!o.manual.sellable||o.manual.recipeId!==o.recipeId){o.status='left';o.leftReason='制作失败';o.leftAt=v.time;record(s,{type:'failed_cook',order:id})}continue;}
const prepared=s.prepVariants?.[o.recipeId]||[];
const match=prepared.findIndex(x=>x.variantId===(o.craft?.variantId||''));
if((s.prep[o.recipeId]||0)>0&&(match>=0||!prepared.length)){
 s.prep[o.recipeId]--;const cooked=match>=0?prepared.splice(match,1)[0]:null;
 if(cooked)o.craft=clone(cooked);
 finishOrder(s,o,o.craft?.quality||s.recipes[o.recipeId]);continue;
}
const materialIds=o.craft?.ingredientIds||r.ids;
if(!canUse(s,materialIds,!!o.premium)){o.status='rejected';o.rejectReason='食材不足';o.leftAt=v.time;const shortage=materialIds.filter(x=>(s.inventory[x]||0)<materialIds.filter(y=>y===x).length);o.missingIngredients=[...new Set(shortage)];record(s,{type:'rejected',order:id,reason:'食材不足',recipeId:o.recipeId,missing:o.missingIngredients});continue;}
if(!consume(s,materialIds,`service-cook-${id}`,!!o.premium)){o.status='rejected';o.rejectReason='食材不足';record(s,{type:'rejected',order:id,reason:'食材不足'});continue;}
if(o.premium)v.premiumConsumed=(v.premiumConsumed||0)+1;
v.cost+=materialCost(materialIds);o.status='cooking';o.started=v.time;v.stations[st]={orderId:id,left:stationDuration(s,st,r,v,o),quality:o.craft?.quality||s.recipes[o.recipeId]||72};v.stationStats[st].count++;v.stationStats[st].secondsSaved+=Math.max(0,r.time-v.stations[st].left);const helper=v.crew?.helper;if(helper?.hired&&helper.station===(st==='WOK'?0:1)){const withoutHelper=Math.max(1,r.time+(o.craft?.timeDelta||0)-(ensureKitchen(s).slots[st==='WOK'?0:1].level-1)*2-(v.eventEffects?.[r.station]||0));v.staffStats.helperSeconds+=withoutHelper-v.stations[st].left;v.staffStats.helperOrders++;}record(s,{type:'started',order:id,station:st,cookType:r.station,level:ensureKitchen(s).slots[st==='WOK'?0:1].level});}
if(v.orders.every(o=>['served','left','rejected'].includes(o.status))&&Object.values(v.stations).every(x=>!x)&&v.time>=44){v.done=true;break}if(v.time>=100){for(const o of v.orders)if(!['served','left','rejected'].includes(o.status)){o.status='left';o.leftReason='营业结束';o.leftAt=v.time;record(s,{type:'left',order:o.id,reason:'营业结束'})}v.done=true;break}
v.wave=v.time<21?0:v.time<42?1:2;
 const goalNow=serviceGoalResult(v);
 if(goalNow?.success&&!v.goalCelebrated){v.goalCelebrated=true;record(s,{type:'goal_reached',label:goalNow.label});}
 }
return true}
export function challengeScore(v){const n=v.orders.length,served=v.orders.filter(o=>o.status==='served'),svc=Math.round(v.orders.reduce((x,o)=>x+(o.sat||0),0)/n),theme=Math.round(served.reduce((x,o)=>x+(RECIPES[o.recipeId].tags.some(t=>['辣','爆香'].includes(t))?100:50),0)/Math.max(n,1)),fulfillment=Math.round(100*served.length/n),judge=v.orders.find(o=>o.id===v.judgeOrderId)||v.orders[6],signature=judge?.status==='served'&&RECIPES[judge.recipeId].tags.some(t=>['辣','爆香'].includes(t))?(judge.quality||0):0;return {service:svc,theme,fulfillment,signature,score:Math.round(.4*svc+.25*theme+.2*fulfillment+.15*signature)} }
export function closeService(s){const v=s.service;if(!v||!v.done||v.reportBuilt)return false;v.reportBuilt=true;const served=v.orders.filter(o=>o.status==='served');const left=v.orders.filter(o=>o.status==='left');const rej=v.orders.filter(o=>o.status==='rejected');const byDish={},byCraft={};
for(const o of served){
 const x=byDish[o.recipeId]||{count:0,totalSat:0};x.count++;x.totalSat+=o.sat;byDish[o.recipeId]=x;
 const key=(o.recipeId||'unknown')+'|'+(o.craft?.variantId||'legacy');
 const row=byCraft[key]||{recipeId:o.recipeId,variantId:o.craft?.variantId||null,styleLabel:o.craft?.styleLabel||'标准工艺',count:0,totalSat:0,revenue:0,baseRevenue:0,timeDelta:0};
 row.count++;row.totalSat+=o.sat;row.revenue+=o.craft?.price??RECIPES[o.recipeId]?.price??0;
 row.baseRevenue+=RECIPES[o.recipeId]?.price||0;row.timeDelta+=o.craft?.timeDelta||0;byCraft[key]=row;
}
const prev=s.report,cong=v.congestion.WOK>v.congestion.POT*1.5&&v.congestion.WOK>15;
const suggested=rej.length?'存在无法接单的顾客：优先补料或调整菜单。':left.length?(cong?'炒锅排队太长：尝试增加焖煮菜或提前备餐。':'顾客等太久：提前备餐或调整紧急订单优先级。'):served.some(o=>o.sat<70)?'订单全部完成，但部分客群满意度低：尝试不同风味菜。': '这套菜单运行顺畅，下次可测试更高售价的招牌菜。';
const finance=payroll(s,v,transact),growth=settleCrewExperience(s,v);const revenue=v.income;let cost=v.cost+s.prepCost+s.manualCost+(s.staffFoodCost||0);const hospitalityCost=v.events.filter(e=>e.type==='guest_care').length*5;const eventExpense=v.eventExpense||0;const staffFoodCost=s.staffFoodCost||0;s.prep={};s.prepVariants={};s.prepCost=0;s.manualCost=0;s.staffFoodCost=0;
const challenge=firstChallenge(s)?challengeScore(v):null;const won=!!challenge&&challenge.score>70;
if(won&&!s.tech){s.tech=true;uniqueAdd(s.ledger,'first-boss-reward','unlock',{tech:'heat-mastery'})}
const rating=v.ratingAttempt?scoreFirstStar(v.orders):null;
if(rating){
 const p=ensureChapterProgress(s);
 p.lastAttemptDay=kitchenDayKey(s);p.lastScore=rating.score;p.requestDay=null;
 if(rating.passed&&uniqueAdd(s.ledger,'chapter-hearth-star-1','restaurant_star',{chapterId:'hearth',stars:1}))
  p.stars=1;
}
const goal=serviceGoalResult(v);if(goal?.success&&uniqueAdd(s.ledger,`goal-${s.cycle}-${s.day}`,'goal_reward',{goal:goal.kind})){s.reputation+=2;}
const premiumOrders=v.orders.filter(o=>o.premium),premiumSales=premiumOrders.filter(o=>o.status==='served');
const premiumReport={recipeId:v.premiumOffered?.recipeId||null,limit:v.premiumOffered?.limit||0,ordered:premiumOrders.length,sold:premiumSales.length,revenue:premiumSales.reduce((sum,o)=>sum+(o.craft?.price||0),0),qualifiedVisitors:v.orders.filter(o=>o.segment==='critic'||premiumGuestEligible(s,o)).length,regularVisits:v.events.filter(e=>e.type==='regular_visit').length};
const regularGuests=v.events.filter(e=>e.type==='regular_visit').map(e=>({guestId:e.guestId,name:s.guestRelationships?.[e.guestId]?.name||'熟客',happyMeals:e.happyMeals,sat:e.sat}));
s.report={rating,premium:premiumReport,regularGuests,day:s.day,absoluteDay:totalBusinessDay(s),tableCount:v.tableCount,unseated:v.orders.filter(o=>o.tableId==null).length,queuePeak:v.queuePeak||0,queue:queueServiceReport(v),goal,scenario:v.scenario||'常规晚餐',totalOrders:v.orders.length,revenue,cost,profit:revenue-cost-hospitalityCost-eventExpense-finance.wage-(v.marketing?.cost||0),finance:{...finance,marketingCost:v.marketing?.cost||0,campaignId:v.marketing?.id||'none',promotionGuests:v.marketing?.guests||0,marketingArrived:v.orders.filter(o=>o.promotionGuest&&o.doorAt!==undefined).length,marketingServed:served.filter(o=>o.promotionGuest).length,marketingRevenue:served.filter(o=>o.promotionGuest).reduce((n,o)=>n+(o.craft?.price??RECIPES[o.recipeId]?.price??0),0),cashChange:s.coins-ensureManagement(s).openingCoins},growth,hospitalityCost,eventExpense,choices:v.events.filter(e=>e.type==='management_choice'||e.type==='menu_swap'),served:served.length,left:left.length,rejected:rej.length,sat:Math.round(served.reduce((a,o)=>a+o.sat,0)/Math.max(1,served.length)),byDish,byCraft,guestReviews:v.events.filter(e=>e.type==='reviewed').map(e=>({recipeId:e.recipeId,sat:e.sat,text:e.text,reason:e.reason})),congestion:v.congestion,kitchen:{slots:clone(v.kitchenSnapshot||ensureKitchen(s).slots),stats:clone(v.stationStats||{})},staff:{crew:clone(v.crew||{}),stats:clone(v.staffStats||{}),foodCost:staffFoodCost},synergy:synergyFor(s.menu),suggested,challenge,won};s.result=won?'win':challenge?'loss':null;
 s.history??=[];s.history.push({day:totalBusinessDay(s),revenue:s.report.revenue,profit:s.report.profit,
   served:s.report.served,arrivals:s.report.totalOrders,unseated:s.report.unseated,
   reputation:s.reputation,tables:v.tableCount,satisfaction:s.report.sat,marketing:v.marketing?.id||'none',payroll:finance.wage,cashDelta:s.report.finance.cashChange});
 nextPhase(s,'report');return s.report}
export function advanceDay(s){if(s.phase!=='upgrade')return false;const day=s.day;s.day=day===3?1:day+1;if(day===3)s.cycle++;s.phase='forecast';ensureChapterProgress(s).requestDay=null;s.premiumMenu=null;s.market=null;s.route=null;s.field=null;s.bento=null;s.cook=null;s.report=null;s.lastCook=null;s.researchReceipt=false;s.prep={};s.prepVariants={};s.prepCost=0;s.manualCost=0;s.service=null;s.step++;ensureManagement(s);return true}
export function buyUpgrade(s){return buyKitchenUpgrade(s,0)}
export function bagUpgradePrice(s){return (s.bagSlots||8)>=12?null:(s.bagSlots||8)<=8?60:110}
export function buyBagUpgrade(s){const price=bagUpgradePrice(s);if(s.phase!=='upgrade'||price===null||s.coins<price)return false;const next=Math.min(12,(s.bagSlots||8)+2);if(!transact(s,`bag-upgrade-${next}`,'upgrade',{},-price))return false;s.bagSlots=next;return true}

// v0.3 walkable, deterministic field. Each node is claimed once, and nothing
// reaches restaurant inventory until settleField() records the unique transaction.
export function buildFieldMap(s,route,target){
 return expandFieldMap(generateBiomeMap(s,route,target),s.seed||20261009);
}

export function moveExplorer(s,dx,dy){
 const f=s.field;if(s.phase!=='field'||!f||f.settled||f.finished||!Number.isInteger(dx)||!Number.isInteger(dy)||Math.abs(dx)+Math.abs(dy)!==1)return {ok:false,message:'不能移动'};
 const x=f.x+dx,y=f.y+dy;
 if(x<0||y<0||x>=f.worldW||y>=f.worldH||f.obstacles.some(o=>o.x===x&&o.y===y))return {ok:false,message:'前方有树木或岩石'};
 f.x=x;f.y=y;f.steps++;
 const h=f.hazards.find(v=>v.x===x&&v.y===y);
 if(h&&!f.visitedHazards.includes(`${x},${y}`)){
  f.visitedHazards.push(`${x},${y}`);f.hp-=f.route==='risk'?2:1;
  if(f.hp<=0){f.finished=true;settleField(s,'faint');return {ok:true,message:'被危险生物袭击！本次冒险失败，仅带回部分收获。'};}
  return {ok:true,message:'⚠️ 遭遇危险，失去体力！可以从这里撤退。'};
 }
 const near=f.nodes.find(n=>!n.claimed&&Math.abs(n.x-x)+Math.abs(n.y-y)===0);
 if(near)return interactExplorer(s);
 return {ok:true,message:'继续寻找食材，靠近闪光采集点。'};
}
export function interactExplorer(s){
 const f=s.field;if(s.phase!=='field'||!f||f.settled||f.finished)return {ok:false,message:'探索已结束'};
 const node=f.nodes.find(n=>!n.claimed&&Math.abs(n.x-f.x)+Math.abs(n.y-f.y)<=1);
 if(!node)return {ok:false,message:'请靠近可采集的食材'};
 if(node.type==='event'&&node.offer)return {ok:false,message:'请在场内靠近奇遇后选择交易，不能直接采集奇遇货品'};
 if(f.bag[node.id]>=3)return {ok:false,message:'这一食材的背包格已装满，先回店吧'};
 if(Object.keys(f.bag).length>=6&&!f.bag[node.id])return {ok:false,message:'六格背包已满，请先撤离'};
 if(node.type==='danger'){
   f.hp--;
   if(f.hp<=0){f.finished=true;settleField(s,'faint');return {ok:true,message:'尝试夺取野牛食材时被击倒，保留一半本次收获'};}
 }
 const n=Math.min(node.n,3-(f.bag[node.id]||0));f.bag[node.id]=(f.bag[node.id]||0)+n;node.claimed=true;
 f.finished=f.nodes.every(v=>v.claimed);
 return {ok:true,message:`${node.type==='danger'?'⚔️ 成功应对野牛！':'✨ 采集成功！'}获得${ING[node.id].name} ×${n}${fieldHarvestTargetSuffix(f,node)}`};
}

// Restaurant v0.3: attention is spent on actual guests, not repeated wok puzzles.
export function sootheGuest(s,orderId){
 const v=s.service;if(s.phase!=='service'||!v||v.done||v.treatUsed||s.coins<5)return false;
 const o=v.orders.find(x=>x.id===orderId);
 if(!o||!['queued','cooking'].includes(o.status))return false;
 const id=`hospitality-${o.id}`;
 if(!transact(s,id,'guest_care',{},-5))return false;
 o.patience+=9;v.treatUsed=true;
 record(s,{type:'guest_care',order:o.id,seconds:9});return true;
}
export function newRecipeLead(s){
 const customer=s.day===1?'family':s.day===2?'adventurer':'critic';
 const candidates=Object.entries(RECIPES).filter(([id,r])=>!s.recipes[id]&&!r.hidden);
 const match=candidates.find(([id,r])=>r.tags.some(t=>CUSTOMERS[customer].likes.includes(t)))||candidates[0];
 return match?{id:match[0],hint:match[1].hint,ingredients:match[1].ids}:null;
}

// v0.6.3-A production research path. Legacy 3x3 helpers above are retained
// for old tests and manual service until the v0.6.3-B economic integration.
export function ensureRecipeVariants(s){
 s.recipeVariants??={};s.activeVariantIds??={};
 for(const [id,quality] of Object.entries(s.recipes||{})){
  if(!RECIPES[id]||!(quality>0))continue;
  let variants=s.recipeVariants[id];
  if(!Array.isArray(variants))variants=s.recipeVariants[id]=[];
  if(!variants.length){
   const old=legacyVariant(id,quality);if(old)variants.push(old);
  }
  if(!variants.some(x=>x.variantId===s.activeVariantIds[id]))
   s.activeVariantIds[id]=variants[0]?.variantId||null;
 }
 return s.recipeVariants;
}
export function activeRecipeVariant(s,id){
 ensureRecipeVariants(s);
 return (s.recipeVariants[id]||[]).find(v=>v.variantId===s.activeVariantIds[id])||
   (s.recipeVariants[id]||[])[0]||null;
}
export function chooseRecipeVariant(s,id,variantId){
 if(!s.recipes?.[id]||!Array.isArray(s.recipeVariants?.[id])||
    !s.recipeVariants[id].some(v=>v.valid&&v.variantId===variantId))return false;
 s.activeVariantIds[id]=variantId;return true;
}
export function beginLiveResearch(s,ids,vessel='WOK'){
 if(s.phase!=='research'||s.cook||!['WOK','POT'].includes(vessel)||
  !Array.isArray(ids)||ids.length<2||ids.length>3||new Set(ids).size!==ids.length||
  ids.some(id=>!ING[id])||!canUse(s,ids))return false;
 ensureRecipeVariants(s);
 const txn='live-research-'+s.cycle+'-'+s.day+'-'+s.step++;
 s.cook={mode:'v063-live',context:'research',vessel,ids:[...ids],
   dropped:[],actions:[],elapsed:0,live:false,txn};
 s.lastCook=null;s.researchReceipt=false;return true;
}
export function dropLiveIngredient(s,id){
 const c=s.cook;
 if(c?.mode!=='v063-live'||!c.ids.includes(id)||c.dropped.some(x=>x.id===id)||
    c.elapsed>=19)return false;
 c.dropped.push({id,t:+c.elapsed.toFixed(3),index:c.dropped.length});
 c.live=true;return true;
}
export function performLiveAction(s,type){
 const c=s.cook;
 if(c?.mode!=='v063-live'||!c.dropped.length||c.elapsed>=19||
  !LIVE_ACTIONS[c.vessel].some(a=>a.id===type)||
  c.actions.some(a=>a.type===type))return false;
 c.actions.push({type,t:+c.elapsed.toFixed(3),with:c.dropped.map(x=>x.id)});
 return true;
}
export function liveCookPreview(s){
 const c=s.cook;if(c?.mode!=='v063-live')return null;
 const indicators=c.ids.map(id=>{
  const d=c.dropped.find(x=>x.id===id);
  return {id,...liveIngredientHeatFeedback(d,c.elapsed,c.actions,c.vessel),
    dropped:!!d};
 });
 return {indicators,elapsed:c.elapsed,actions:c.actions};
}
export function finishLiveResearch(s){
 const c=s.cook;
 if(c?.mode!=='v063-live'||!c.live||c.elapsed<1.2)return false;
 const result=evaluateLiveCook(c.ids,c.vessel,c.dropped,c.actions,c.elapsed);
 // Every attempted cook uses real resources, including failed recipes.
 if(!consume(s,c.ids,c.txn))return false;
 s.cook=null;s.lastCook=result;s.researchReceipt=true;
 result.firstDiscovery=!s.recipes[result.recipeId];
 result.ingredientCost=c.ids.reduce((sum,id)=>sum+ING[id].cost,0);
 if(result.sellable){
  const id=result.recipeId;
  // The recipe did not exist before this cook: avoid inventing a fake
  // legacy-standard variant from the brand-new quality just recorded.
  const wasKnown=!!s.recipes[id];
  const variant=makeLiveVariant(result);
  const list=s.recipeVariants[id]||(s.recipeVariants[id]=[]);
  s.recipes[id]=Math.max(s.recipes[id]||0,result.quality);
  s.learned[id]=true;
  const existing=list.findIndex(v=>v.variantId===variant.variantId);
  result.newTechnique=existing<0;result.variantId=variant.variantId;
  if(existing>=0){
   if((list[existing].quality||0)<=variant.quality)list[existing]=variant;
  }else{list.push(variant)}
  // Eight versions incl legacy are ample; keep all distinctive styles first.
  if(list.length>8){
   const legacy=list.filter(x=>x.legacy);
   const modern=list.filter(x=>!x.legacy).sort((a,b)=>b.quality-a.quality);
   s.recipeVariants[id]=[...legacy,...modern].slice(0,8);
  }
  if(!s.activeVariantIds[id]||!wasKnown||s.activeVariantIds[id].startsWith('legacy-'))
   s.activeVariantIds[id]=variant.variantId;
 }
 return result;
}
export function stepLiveResearch(s,seconds=0){
 const c=s.cook;
 if(c?.mode!=='v063-live'||!c.live)return null;
 c.elapsed=Math.min(19,c.elapsed+Math.max(0,Math.min(.1,Number(seconds)||0)));
 if(c.elapsed>=19)return finishLiveResearch(s);
 return null;
}

// Full preflight precedes the only synchronous commit; UI saves one full snapshot.
export function resolveSpecialFieldEvent(s,choice){
 const f=s.field;if(s.phase!=='field'||!f?.action||f.finished||f.settled||!f.activeEvent)return false;
 const n=f.nodes.find(n=>n.key===f.activeEvent);if(!n||!SPECIAL_ENCOUNTER_KINDS.includes(n.kind))return false;
 const quote=previewSpecialEncounter(s,n,choice);
 if(!quote.ok){f.actionMessage=quote.reason;f.actionMessageTTL=3;return false;}
 const id='encounter-'+n.eventId,type=choice==='leave'?'encounter_decline':n.kind==='merchant'?'field_trade':n.kind==='traveler'?'field_exchange':'field_discovery';
 if(!transact(s,id,type,{},-quote.coins))return false;
 f.bag=quote.bag;syncFieldBagStacks(f);f.hp-=quote.hp;
 if(f.ecologyStats){f.ecologyStats.collected+=Object.values(quote.gain).reduce((a,b)=>a+b,0);f.ecologyStats.damageTaken+=quote.hp;}
 n.claimed=true;n.status='resolved';n.result={choice,coins:quote.coins,hp:quote.hp,cost:quote.cost,gain:quote.gain};
 const entry=s.ledger.find(t=>t.id===id);entry.fieldCost={...quote.cost};entry.fieldGain={...quote.gain};entry.hpCost=quote.hp;
 f.activeEvent=null;f.harvestNode=null;f.harvestProgress=0;
 f.actionMessage=choice==='leave'?'你告别了这次奇遇，继续赶路。':'获得'+Object.entries(quote.gain).map(([id,q])=>ING[id].name+'×'+q).join('、')+'，仍在野外背包，回店后入库。';
 f.actionMessageTTL=4;return true;
}
