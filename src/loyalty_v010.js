import {ING,RECIPES,CUSTOMERS} from './data.js?v=0.9.1';

// v0.10: hidden premium dish uses rare ingredients. It is NOT a three-slot menu dish.
// All effects follow actual seat/order/served/review events; no virtual sales.
export const SIGNATURE_MAX_PER_NIGHT=2;
export const SIGNATURE_MARKUP=1.25;
export const REGULAR_PROFILES=[
 {id:'mimi',name:'菌帽米米',emoji:'🍄',segment:'family',hint:'最喜欢菌香暖汤'},
 {id:'amao',name:'铁甲阿铆',emoji:'⚒️',segment:'adventurer',hint:'特别爱辛辣肉菜'},
 {id:'bobo',name:'史莱姆啵啵',emoji:'🫧',segment:'regular',hint:'偏爱鲜香清爽料理'}
];
const between=(v,min,max)=>Math.max(min,Math.min(max,v));
export const businessDay=s=>(s.cycle-1)*3+s.day;
export const isSignatureRecipe=id=>!!RECIPES[id]?.rare&&RECIPES[id].ids.some(i=>ING[i]?.acquisitionPolicy==='BOSS_ONLY');
export function signatureOptions(s){
 return Object.keys(s.recipes||{}).filter(isSignatureRecipe);
}
export function ensureLoyalty(s){
 if(!s.loyalty||typeof s.loyalty!=='object')s.loyalty={};
 const l=s.loyalty;l.signatureRecipeId??=null;
 l.recipes??={};l.regulars??={};
 for(const p of REGULAR_PROFILES){
  const r=l.regulars[p.id]??={};
  r.visits=between(Number(r.visits)||0,0,99999);
  r.trust=between(Number(r.trust)||0,0,3);
  r.favoriteRecipeId??=null;
  r.lastVisitDay??=0;
 }
 l.buzz=between(Number(l.buzz)||0,0,6);
 l.lastSettledDay??=null;l.lastNight??=null;
 return l;
}
export function chooseSignatureDish(s,id){
 if(!['menu','prep'].includes(s.phase))return false;
 if(id===null){ensureLoyalty(s).signatureRecipeId=null;return true}
 if(!s.recipes?.[id]||!isSignatureRecipe(id))return false;
 ensureLoyalty(s).signatureRecipeId=id;return true;
}
export function currentSignature(s){
 const id=ensureLoyalty(s).signatureRecipeId;
 return id&&s.recipes?.[id]&&isSignatureRecipe(id)?id:null;
}
export function signatureQuote(s,id,craft=null){
 if(!id||!isSignatureRecipe(id))return null;
 const r=RECIPES[id],ids=craft?.ingredientIds||r.ids;
 const units={};for(const i of ids)units[i]=(units[i]||0)+1;
 const stock=Math.min(...Object.entries(units).map(([i,n])=>Math.floor((s.inventory?.[i]||0)/n)));
 return {id,available:between(stock,0,SIGNATURE_MAX_PER_NIGHT),
  price:Math.max(1,Math.round((craft?.price??r.price)*SIGNATURE_MARKUP)),
  ingredientIds:ids};
}
export function expectedRegulars(s){
 const day=businessDay(s);
 const first=REGULAR_PROFILES[(day-1)%REGULAR_PROFILES.length];
 const second=REGULAR_PROFILES[day%REGULAR_PROFILES.length];
 return (s.reputation>=5||ensureLoyalty(s).buzz>=3)?[first,second]:[first];
}
export function placeRegulars(s,orders){
 const profiles=expectedRegulars(s),l=ensureLoyalty(s);
 const lastAvailable=orders.length-(s.cycle===1&&s.day===3?1:0);
 if(lastAvailable<3)return orders;
 const positions=[1,Math.max(2,Math.floor(lastAvailable*.6))];
 for(let i=0;i<profiles.length;i++){
  const p=profiles[i],o=orders[positions[i]];
  if(!o||o.segment==='critic')continue;
  o.segment=p.segment;o.patience=CUSTOMERS[p.segment].patience;
  o.regularId=p.id;o.regularName=p.name;
  o.favoriteRecipeId=l.regulars[p.id].favoriteRecipeId;
  o.regularReturning=l.regulars[p.id].visits>0;
 }
 return orders;
}
export function incomingWordOfMouth(s){
 const last=ensureLoyalty(s).lastNight;
 return last?.day===businessDay(s)-1?between(last.nextGuests||0,0,2):0;
}
export function settleLoyalty(s,orders){
 const l=ensureLoyalty(s),day=businessDay(s);
 if(l.lastSettledDay===day)return l.lastNight;
 const served=orders.filter(o=>o.status==='served'&&Number.isFinite(o.sat));
 const special=served.filter(o=>o.signatureOrder===true&&isSignatureRecipe(o.recipeId));
 const praised=special.filter(o=>o.sat>=80&&(o.quality||0)>=70);
 const advocates=new Set(praised.map(o=>o.id));
 let regularVisits=0,returningVisits=0,regularPraise=0;
 for(const o of orders){
  if(!o.regularId||!l.regulars[o.regularId]||o.status==='waiting')continue;
  const p=l.regulars[o.regularId];
  const returning=p.visits>0;
  p.visits++;p.lastVisitDay=day;regularVisits++;
  if(returning)returningVisits++;
  if(o.status==='served'&&o.sat>=75){
   p.trust=between(p.trust+1,0,3);p.favoriteRecipeId=o.recipeId;
   if(p.trust>=2&&o.sat>=80){advocates.add(o.id);regularPraise++;}
  }else if(o.status!=='served'||(o.sat||0)<55){
   p.trust=between(p.trust-1,0,3);
  }
 }
 const bad=orders.filter(o=>['left','rejected'].includes(o.status)||(o.status==='served'&&(o.sat||0)<50)).length;
 const shares=advocates.size;
 l.buzz=between(l.buzz+Math.min(2,shares)-(bad>=3?2:bad?1:0)-(shares?0:1),0,6);
 const nextGuests=shares>0?between((shares>=3||l.buzz>=3?2:1)-(bad>=3?1:0),0,2):0;
 for(const o of special){
  const r=l.recipes[o.recipeId]??={served:0,praise:0,days:0};
  r.served++;if(o.sat>=80&&o.quality>=70)r.praise++;
 }
 l.lastSettledDay=day;
 l.lastNight={day,signatureId:currentSignature(s),signatureSales:special.length,
  signaturePraise:praised.length,regularVisits,returningVisits,regularPraise,
  shares,bad,buzz:l.buzz,nextGuests};
 return l.lastNight;
}
