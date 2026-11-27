import {newGame,ensureKitchen,localStars,totalBusinessDay,roomExpansionAvailable,expandDiningRoom,ROOM_EXPANSION_COST,FOURTH_TABLE_COST,THIRD_KITCHEN_BUNDLE_COST,thirdKitchenBundleAvailable,buyThirdKitchenBundle,GRILL_COST,grillAvailable,buyGrill,cookwareUpgradeCost,buyCookwareUpgrade,bagUpgradePrice,buyBagUpgrade} from './engine.js';
import {dinerFloor} from './restaurant_scene_v075.js';
export const LAB_PRESETS=['early','star','advanced'];
export function labFixture(preset='star'){
 const s=newGame(15742);s.phase='upgrade';s.onboarding.enabled=false;
 if(preset==='early'){s.day=1;s.coins=120;}
 else if(preset==='advanced'){s.day=3;s.cycle=3;s.coins=850;s.reputation=35;s.chapterProgress.stars=2;s.dining.tableCount=4;s.kitchen.thirdUnlocked=true;s.kitchen.slots.push({type:'WOK',level:1});s.crew.helper.hired=true;}
 else{s.day=1;s.cycle=2;s.coins=306;s.reputation=35;s.chapterProgress.stars=1;s.dining.tableCount=3;}
 ensureKitchen(s);return s;
}
export function labOffers(s){
 const k=ensureKitchen(s),count=s.dining.tableCount,stars=localStars(s),g=dinerFloor(s),out=[];
 const add=(id,title,icon,cost,at,description,can=true)=>out.push({id,title,icon,cost,at,description,affordable:can&&s.coins>=cost});
 if(count===2&&totalBusinessDay(s)>=3&&s.reputation>=2||count===3&&stars>=1){
  const next=dinerFloor({...s,dining:{tableCount:count+1}}).tables[count];
  add('table','新增第'+(count+1)+'张餐桌','home',count===2?ROOM_EXPANSION_COST:FOURTH_TABLE_COST,next,'新增 2 个真实座位',roomExpansionAvailable(s));
 }
 if(count>=4&&stars>=1&&!k.thirdUnlocked)add('third','中央厨位','cook',THIRD_KITCHEN_BUNDLE_COST,g.reservedStove,'增加中央厨位与帮厨',thirdKitchenBundleAvailable(s));
 if(stars>=2&&k.thirdUnlocked&&!k.grillOwned)add('grill','购入烤架','grill',GRILL_COST,g.reservedStove,'解锁烤架与烤叉',grillAvailable(s));
 for(const [type,i] of [...new Set(k.slots.map(x=>x.type))].map(t=>[t,k.slots.findIndex(x=>x.type===t)])){
  const cost=cookwareUpgradeCost(s,type);
  if(cost!==null)add('cook:'+type,({WOK:'炒锅',POT:'炖锅',GRILL:'烤架',STEAM:'蒸笼'})[type]+' Lv.2',type.toLowerCase(),cost,[g.stoveLeft,g.stoveRight,g.reservedStove][i],'同类厨具永久升级');
 }
 const bag=bagUpgradePrice(s);if(bag!==null)add('bag','背包扩容','bag',bag,null,'容量 '+s.bagSlots+' → '+Math.min(12,s.bagSlots+2));
 return out;
}
export function labBuy(s,id){
 if(!labOffers(s).some(o=>o.id===id&&o.affordable))return false;
 if(id==='table')return expandDiningRoom(s);
 if(id==='third')return buyThirdKitchenBundle(s);
 if(id==='grill')return buyGrill(s);
 if(id==='bag')return buyBagUpgrade(s);
 if(id.startsWith('cook:'))return buyCookwareUpgrade(s,id.slice(5));
 return false;
}
export function labNextHint(s){
 const count=s.dining.tableCount,stars=localStars(s);
 if(count===2&&(totalBusinessDay(s)<3||s.reputation<2))return '继续营业，第三张餐桌将在第3个营业日、声望2时开放。';
 if(count===3&&stars<1)return '获得首枚万味星章后，可扩建第四张餐桌。';
 if(count>=4&&stars>=1&&!s.kitchen.thirdUnlocked)return '中央厨位可建造。';
 if(s.kitchen.thirdUnlocked&&stars<2)return '下一枚万味星章将带来新的厨具。';
 return '';
}
// Same orthographic projection as existing full-room forecast camera.
export function labProject(at,w,h){
 const aspect=w/Math.max(h,1),half=Math.max(5.65/aspect,8.35),dz=25-8.7,len=Math.hypot(23,dz);
 const z=at.y<=.428?at.y*12:.428*12+(at.y-.428)*16;
 const x=(at.x*10-5)/(half*aspect),y=(dz/len*1.05-23/len*(z-8.7))/half;
 return {x:Math.max(28,Math.min(w-28,(x+1)*w/2)),y:Math.max(90,Math.min(h-110,(1-y)*h/2-17))};
}
