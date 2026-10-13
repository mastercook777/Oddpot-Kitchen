// v0.10-A: business relationships use the existing order engine, never a second sales ledger.
import {CUSTOMERS,RECIPES,ING} from './data.js?v=0.9.1';

export const REGULAR_GUEST_TEMPLATES=[
 {id:'dwarf_amu',name:'铜须阿穆',segment:'adventurer'},
 {id:'mushroom_mimi',name:'菌帽米米',segment:'family'}
];
export const GROWTH_TEST_VALUES={goodReview:80,returnChance:75,maxReferralPerDay:1};

export function ensureRestaurantGrowth(s){
 if(!s.restaurantGrowth||typeof s.restaurantGrowth!=='object')s.restaurantGrowth={};
 const g=s.restaurantGrowth;
 if(!g.regulars||typeof g.regulars!=='object')g.regulars={};
 if(!Array.isArray(g.referrals))g.referrals=[];
 if(!RECIPES[g.hiddenMenuRecipeId]?.rare)g.hiddenMenuRecipeId=null;
 g.signatureRecipeId=null; // deprecated: never promote one of the three ordinary dishes
 if(!Number.isInteger(g.hiddenSoldDay))g.hiddenSoldDay=-1;
 if(!Number.isInteger(g.hiddenSoldCount))g.hiddenSoldCount=0;
 return g;
}
export const HIDDEN_DAILY_LIMIT=2;
export function isRareRecipe(id){return !!RECIPES[id]?.rare&&RECIPES[id].ids.some(ing=>ING[ing]?.acquisitionPolicy==='BOSS_ONLY');}
export function setHiddenMenuRecipe(s,id){
 if(s.phase!=='menu'||(id!==null&&(!s.recipes?.[id]||!isRareRecipe(id))))return false;
 const g=ensureRestaurantGrowth(s);if(g.hiddenMenuRecipeId===id)return false;
 g.hiddenMenuRecipeId=id;return true;
}
export function eligibleForHidden(order,g){
 if(order.segment==='critic')return true;
 const reg=g?.regulars?.[order.visitor?.regularId];
 return !!reg&&reg.qualifiedVisits>=2;
}
export function hiddenRemaining(s,day){const g=s.restaurantGrowth||{};return Math.max(0,HIDDEN_DAILY_LIMIT-(g.hiddenSoldDay===day?g.hiddenSoldCount:0));}
export function markHiddenSold(s,day){const g=ensureRestaurantGrowth(s);if(g.hiddenSoldDay!==day){g.hiddenSoldDay=day;g.hiddenSoldCount=0;}g.hiddenSoldCount++;}
export function setSignatureRecipe(){return false;} // compatibility: deprecated old API
export function clearUnavailableSignature(s){ensureRestaurantGrowth(s);}
export const regularGuestName=id=>REGULAR_GUEST_TEMPLATES.find(g=>g.id===id)?.name||null;
function seededRoll(seed,salt){
 let x=(seed^salt)>>>0;
 x=Math.imul(x^(x>>>16),0x7feb352d);
 x=Math.imul(x^(x>>>15),0x846ca68b);
 return ((x^(x>>>16))>>>0)%100;
}
// Read-only: previewing a day must neither mint referrals nor consume them.
export function buildGrowthGuestPlan(s,originalGuests,seed,day,challenge=false){
 const g=s.restaurantGrowth||{};
 const regulars=g.regulars||{};
 const guests=[...originalGuests],visitors=guests.map(()=>null);
 const known=REGULAR_GUEST_TEMPLATES.filter(t=>regulars[t.id]?.visits>0&&
   regulars[t.id].lastVisitDay<day);
 const returning=known.find((t,i)=>seededRoll(seed,day*97+i*701+t.id.length)<GROWTH_TEST_VALUES.returnChance);
 const sign=null;
 const fresh=REGULAR_GUEST_TEMPLATES.find(t=>!regulars[t.id]&&guests.includes(t.segment));
 const target=returning||fresh;
 if(target){
  const index=guests.findIndex((segment,i)=>segment===target.segment&&!(challenge&&i===guests.length-1));
  if(index>=0)visitors[index]={regularId:target.id,source:returning?'return':'first',
   name:target.name,favoriteRecipeId:regulars[target.id]?.favoriteRecipeId||sign};
 }
 const referral=(g.referrals||[]).find(r=>!r.usedDay&&r.availableDay<=day);
 if(referral){
  const insertAt=challenge?Math.max(0,guests.length-1):guests.length;
  guests.splice(insertAt,0,referral.segment);
  visitors.splice(insertAt,0,{source:'referral',referralId:referral.id,referrerId:referral.fromRegularId,
   name:(regularGuestName(referral.fromRegularId)||'熟客')+'推荐的朋友'});
 }
 return {guests,visitors,count:guests.length};
}
// Called once after the REAL eating/review transition, guarded by a unique
// relationship-orderId ledger event in the engine.
export function applyRealRegularReview(s,order,day){
 const id=order.visitor?.regularId;
 const template=REGULAR_GUEST_TEMPLATES.find(x=>x.id===id);
 if(!template||!order.recipeId||!Number.isFinite(order.sat))return false;
 const g=ensureRestaurantGrowth(s),prior=g.regulars[id];
 g.regulars[id]={id,name:template.name,segment:template.segment,
  favoriteRecipeId:prior?.favoriteRecipeId||order.recipeId,visits:(prior?.visits||0)+1,
  qualifiedVisits:(prior?.qualifiedVisits||0)+(order.sat>=GROWTH_TEST_VALUES.goodReview?1:0),
  affinity:Math.max(0,(prior?.affinity||0)+(order.sat>=GROWTH_TEST_VALUES.goodReview?1:0)),
  lastVisitDay:day,lastSatisfaction:order.sat};
 const issuedToday=g.referrals.filter(r=>r.createdDay===day).length;
 if(order.sat>=GROWTH_TEST_VALUES.goodReview&&issuedToday<GROWTH_TEST_VALUES.maxReferralPerDay){
  g.referrals.push({id:'referral-'+order.id,fromRegularId:id,segment:template.segment,
   sourceOrderId:order.id,createdDay:day,availableDay:day+1,usedDay:null});
 }
 return true;
}
export function markPlannedReferralsUsed(s,visitors,day){
 const g=ensureRestaurantGrowth(s);
 for(const v of visitors)if(v?.referralId){
  const r=g.referrals.find(x=>x.id===v.referralId&&!x.usedDay);
  if(r)r.usedDay=day; // Actual service orders were already created; no automatic income.
 }
}
export function summarizeGrowthService(s,service,day){
 const orders=service?.orders||[];
 const arrived=orders.filter(o=>o.doorAt!==null&&o.doorAt!==undefined);
 const counted=source=>arrived.filter(o=>o.visitor?.source===source);
 const referrals=counted('referral');
 return {hiddenMenuRecipeId:service?.hiddenMenuRecipeId||null,
  firstArrived:counted('first').length,returned:counted('return').length,
  referralArrived:referrals.length,referralServed:referrals.filter(o=>o.status==='served').length,
  newReferrals:(s.restaurantGrowth?.referrals||[]).filter(r=>r.createdDay===day).length,
  regularCount:Object.keys(s.restaurantGrowth?.regulars||{}).length};
}
