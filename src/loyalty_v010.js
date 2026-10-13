// v0.10: restaurant loyalty only follows delivered meals and actual guest feedback.
// Data stays in the existing v4 save. No separate currency, fake sales or extra service pass.
export const REGULAR_PROFILES=[
 {id:'mimi',name:'菌帽米米',emoji:'🍄',segment:'family',hint:'偏爱温暖的菌香料理'},
 {id:'amao',name:'铁甲阿铆',emoji:'⚒️',segment:'adventurer',hint:'爱吃有锅气的辛辣肉菜'},
 {id:'bobo',name:'史莱姆啵啵',emoji:'🫧',segment:'regular',hint:'喜欢清爽又实惠的菜单'}
];
const between=(v,min,max)=>Math.max(min,Math.min(max,v));
export const businessDay=s=>(s.cycle-1)*3+s.day;
export function ensureLoyalty(s){
 if(!s.loyalty||typeof s.loyalty!=='object')s.loyalty={};
 const l=s.loyalty;
 l.signatureRecipeId??=null;
 l.recipes??={};
 l.regulars??={};
 for(const p of REGULAR_PROFILES){
  const r=l.regulars[p.id]??={};
  r.visits=between(Number(r.visits)||0,0,99999);
  r.trust=between(Number(r.trust)||0,0,3);
  r.favoriteRecipeId??=null;
  r.lastVisitDay??=0;
 }
 l.buzz=between(Number(l.buzz)||0,0,6);
 l.lastSettledDay??=0;
 l.lastNight??=null;
 return l;
}
// One recognizable regular can become a loyal advocate, but not all visitors are regulars.
// Schedule is deterministic and does not replace the challenge judge.
export function expectedRegulars(s){
 const day=businessDay(s);
 return [REGULAR_PROFILES[(day-1)%REGULAR_PROFILES.length],
         REGULAR_PROFILES[day%REGULAR_PROFILES.length]];
}
export function placeRegulars(s,orders){
 const profiles=expectedRegulars(s),lastAvailable=orders.length-(s.cycle===1&&s.day===3?1:0);
 if(lastAvailable<4)return orders;
 const positions=[1,Math.max(2,Math.min(lastAvailable-1,Math.floor(lastAvailable*.6)))];
 const l=ensureLoyalty(s);
 for(let i=0;i<profiles.length;i++){
  const p=profiles[i],o=orders[positions[i]];if(!o)continue;
  o.segment=p.segment;
  o.regularId=p.id;
  o.regularName=p.name;
  o.favoriteRecipeId=l.regulars[p.id].favoriteRecipeId;
  o.regularReturning=l.regulars[p.id].visits>0;
 }
 return orders;
}
export function signatureOnMenu(s){
 const id=ensureLoyalty(s).signatureRecipeId;
 return id&&s.recipes?.[id]&&s.menu?.includes(id)?id:null;
}
export function chooseSignatureDish(s,id){
 if(!['menu','prep'].includes(s.phase)||!s.menu?.includes(id)||!s.recipes?.[id])return false;
 ensureLoyalty(s).signatureRecipeId=id;
 return true;
}
export function incomingWordOfMouth(s){
 const last=ensureLoyalty(s).lastNight;
 return last?.day===businessDay(s)-1?between(last.nextGuests||0,0,2):0;
}
// Call only from closeService. Idempotency is also enforced locally, independent
// of the service.reportBuilt guard. Negative visits count; disappointment is not erased.
export function settleLoyalty(s,orders){
 const l=ensureLoyalty(s),day=businessDay(s);
 if(l.lastSettledDay===day)return l.lastNight;
 const signatureId=signatureOnMenu(s);
 const realServed=orders.filter(o=>o.status==='served'&&Number.isFinite(o.sat));
 const signatureServed=realServed.filter(o=>signatureId&&o.recipeId===signatureId);
 const signaturePraise=signatureServed.filter(o=>o.sat>=80&&o.quality>=70);
 const advocates=new Set(signaturePraise.map(o=>o.id));
 let regularVisits=0,returningVisits=0,regularPraise=0;
 for(const o of orders){
  if(!o.regularId||!l.regulars[o.regularId])continue;
  const person=l.regulars[o.regularId];
  const returning=person.visits>0;
  person.visits++;
  person.lastVisitDay=day;
  regularVisits++;
  if(returning)returningVisits++;
  if(o.status==='served'&&o.sat>=75){
   person.trust=between(person.trust+1,0,3);
   person.favoriteRecipeId=o.recipeId;
   if(person.trust>=2&&o.sat>=80){advocates.add(o.id);regularPraise++;}
  }else if(o.status!=='served'||o.sat<55){
   person.trust=between(person.trust-1,0,3);
  }
 }
 const bad=orders.filter(o=>['left','rejected'].includes(o.status)||(o.status==='served'&&(o.sat||0)<50)).length;
 const shares=advocates.size;
 l.buzz=between(l.buzz+Math.min(2,shares)-(bad>=3?2:bad?1:0)-(shares?0:1),0,6);
 const nextGuests=between((shares>=3?2:shares>=1?1:0)-(bad>=3?1:0),0,2);
 if(signatureId){
  const r=l.recipes[signatureId]??={served:0,praise:0,days:0};
  r.served+=signatureServed.length;
  r.praise+=signaturePraise.length;
  if(signatureServed.length)r.days++;
 }
 l.lastSettledDay=day;
 l.lastNight={day,signatureId,signatureSales:signatureServed.length,
  signaturePraise:signaturePraise.length,regularVisits,returningVisits,regularPraise,
  shares,bad,buzz:l.buzz,nextGuests};
 return l.lastNight;
}
