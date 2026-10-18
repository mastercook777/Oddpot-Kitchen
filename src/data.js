import {RECIPE_PROFILES} from './recipe_profiles_v063.js?v=0.12.0-alpha.1';
// v0.3 prototype content — expanded, configurable, not final balance values.
export const ING = {
  beef:{name:'铁角野牛肉',emoji:'🥩',tags:['鲜','肉','厚重'],lo:5,hi:8,cost:8},
  chicken:{name:'咕咕鸡肉',emoji:'🍗',tags:['鲜','肉','温和'],lo:5,hi:8,cost:6},
  chili:{name:'喷火椒',emoji:'🌶️',tags:['辣'],lo:3,hi:6,cost:4},
  garlic:{name:'跳跳蒜瓣',emoji:'🧄',tags:['香'],lo:3,hi:6,cost:2},
  mushroom:{name:'幽光蘑菇',emoji:'🍄',tags:['菌香','鲜'],lo:4,hi:7,cost:3},
  cabbage:{name:'卷卷魔菜',emoji:'🥬',tags:['清爽'],lo:3,hi:6,cost:2},
  onion:{name:'琥珀洋葱',emoji:'🧅',tags:['甜香','温和'],lo:3,hi:6,cost:3},
  potato:{name:'地精土豆',emoji:'🥔',tags:['饱腹','温和'],lo:5,hi:8,cost:4}
};
export const RECIPES = {
  chili_meat:{name:'火椒噼啪肉',emoji:'🌶️',ids:['chicken','chili'],also:[['beef','chili']],method:'stir',station:'WOK',time:8,price:28,tags:['辣','肉','鲜'],cost:12,hint:'肉类 + 火椒，尝试爆炒'},
  mushroom_stir:{name:'幽光菌锅舞',emoji:'🍄',ids:['mushroom','garlic'],method:'stir',station:'WOK',time:6,price:18,tags:['菌香','鲜','香'],cost:6,hint:'森林蘑菇需要一味香料'},
  chicken_stew:{name:'咕噜菌雾鸡',emoji:'🍲',ids:['chicken','mushroom'],method:'stew',station:'POT',time:12,price:24,tags:['温和','菌香','鲜'],cost:9,hint:'鸡肉与森林鲜味，慢火焖煮'},
  veg_stir:{name:'月光跳跳蔬',emoji:'🥬',ids:['cabbage','mushroom'],method:'stir',station:'WOK',time:6,price:16,tags:['清爽','菌香'],cost:5,hint:'清爽蔬菜与蘑菇快速翻炒'},
  flame_beef:{name:'爆炎牛魔锅',emoji:'🔥',ids:['beef','chili','garlic'],method:'stir',station:'WOK',time:10,price:34,tags:['辣','肉','香','爆香'],cost:15,hidden:true,hint:'牛肉与辣椒贴近两拍，蒜瓣到锅心爆香'},
  garlic_beef:{name:'焦香蒜牛',emoji:'🥩',ids:['beef','garlic'],method:'stir',station:'WOK',time:9,price:32,tags:['肉','香','鲜'],cost:10,hint:'野牛肉和蒜瓣，爆炒出焦香'},
  spicy_mushroom:{name:'火山菌菇',emoji:'🍄',ids:['chili','mushroom'],method:'stir',station:'WOK',time:7,price:21,tags:['辣','菌香'],cost:7,hint:'辣椒与蘑菇不一定需要肉'},
  onion_chicken:{name:'洋葱烩鸡',emoji:'🍗',ids:['chicken','onion'],method:'stew',station:'POT',time:11,price:26,tags:['温和','肉','甜香'],cost:9,hint:'甜香洋葱，试着与鸡肉同炖'},
  potato_stew:{name:'地精咕噜土豆煲',emoji:'🥔',ids:['potato','onion'],method:'stew',station:'POT',time:11,price:20,tags:['饱腹','温和'],cost:7,hint:'两种田野作物慢慢焖煮'},
  chili_potato:{name:'爆辣脆薯',emoji:'🍟',ids:['potato','chili'],method:'stir',station:'WOK',time:7,price:23,tags:['辣','饱腹'],cost:8,hint:'火椒配上能扛高温的根茎'},
  woodland_pot:{name:'森林浓汤',emoji:'🥣',ids:['mushroom','potato'],method:'stew',station:'POT',time:13,price:23,tags:['菌香','温和','饱腹'],cost:7,hint:'蘑菇与土豆，慢煮出浓郁'},
  harvest_stir:{name:'丰收三拼',emoji:'🥘',ids:['cabbage','onion','potato'],method:'stir',station:'WOK',time:10,price:29,tags:['清爽','温和','饱腹'],cost:9,hint:'卷心菜、洋葱和土豆，考验三种不同耐热'}
};
export const CUSTOMERS={gardener:{name:'芽角鹿客',emoji:'🌱',likes:['蔬食','清爽','温和'],budget:32,patience:30},adventurer:{name:'铁甲矮人',emoji:'⛏️',likes:['辣','肉','饱腹'],budget:40,patience:24},family:{name:'菌帽一家',emoji:'🍄',likes:['温和','菌香','甜香'],budget:28,patience:32},regular:{name:'史莱姆街坊',emoji:'🟢',likes:['清爽','菌香','鲜'],budget:26,patience:27},critic:{name:'幽灵鉴味师',emoji:'👻',likes:['辣','香','爆香'],budget:50,patience:26},stargazer:{name:'星砂旅人',emoji:'✦',likes:['清爽','甜香','菌香'],budget:44,patience:29}};
export const FORECAST=[
  {name:'菌帽家族的晚餐',hint:'菌帽一家偏爱暖汤与菌香，温和料理更受欢迎',segments:['family','regular','family','adventurer','regular','family','critic']},
  {name:'矮人探险团集会',hint:'矿井收工的矮人偏爱辛辣肉食，饱腹料理热卖',segments:['adventurer','family','adventurer','adventurer','regular','adventurer','critic']},
  {name:'爆炎厨王的怪味试炼',hint:'今晚会有幽灵鉴味师登门；他尤其在意爆香工艺',segments:['adventurer','family','adventurer','adventurer','regular','adventurer','critic']}
];
// v0.8: sources are authoritative for both warehouse controls and domain purchases.
for(const [id,ing] of Object.entries(ING))ing.acquisitionPolicy=
  ['garlic','mushroom','cabbage','chicken'].includes(id)?'SHOP_STAPLE':'FIELD_ONLY';
ING.mushroom_heart={name:'菌王孢心',emoji:'🍄',tags:['菌香','鲜','浓郁'],lo:4,hi:8,cost:13,
  acquisitionPolicy:'BOSS_ONLY',bossId:'spore_king'};
ING.ember_pepper={name:'熔心椒晶',emoji:'🌋',tags:['辣','香','爆香'],lo:3,hi:6,cost:16,
  acquisitionPolicy:'BOSS_ONLY',bossId:'ember_king'};
ING.tide_sour_pulp={name:'逆潮酸浆',emoji:'🫐',tags:['酸','清爽','开胃'],lo:2,hi:6,cost:18,acquisitionPolicy:'MERCHANT_ONLY'};
ING.starlit_nectar={name:'星露花蜜',emoji:'🍯',tags:['花香','甜香','温和'],lo:2,hi:5,cost:12,acquisitionPolicy:'ENCOUNTER_ONLY'};
// Daily market rotates among ALL eight ordinary ingredients. FIELD_ONLY items remain
// important in exploration and receive tighter shop quantities and higher prices.
export const MARKET_ROTATION_STAPLES=['beef','chicken','chili','garlic','mushroom','cabbage','onion','potato'];
export const SHOP_STAPLES=Object.keys(ING).filter(id=>ING[id].acquisitionPolicy==='SHOP_STAPLE');
export const FIELD_INGREDIENTS=Object.keys(ING).filter(id=>ING[id].acquisitionPolicy!=='SHOP_STAPLE');
export const DEFAULT_INVENTORY={beef:3,chicken:10,chili:2,garlic:9,mushroom:12,cabbage:8,onion:5,potato:5};
export const ROUTES=[{id:'safe',name:'采集路线',subtitle:'草甸与菜圃 · 包菜、蒜瓣、菌菇集中采集',emoji:'🌿'}, {id:'risk',name:'狩猎路线',subtitle:'古树兽巢 · 野牛与鸡怪战斗掉肉，最终可挑战菌王',emoji:'🦬'}];

// v0.6.3-A: all 8-ingredient, 2/3-item combinations are researchable,
// even without hand-curated text. Original twelve recipe IDs stay unchanged.
// RECIPE_INDEX is a pure identity lookup (never a numeric buff table).
export const RECIPE_INDEX = Object.create(null);
export const recipeSignature = (ids,station)=>station+":"+ids.slice().sort().join(",");
const registerRecipe = (id,r)=>{
  RECIPE_INDEX[recipeSignature(r.ids,r.station)]=id;
  for(const alt of r.also||[])RECIPE_INDEX[recipeSignature(alt,r.station)]=id;
};
for(const [id,r] of Object.entries(RECIPES))registerRecipe(id,r);
const FEATURED_ADDITIONS = {
  "wok_beef_onion":{name:"葱爆牛肉",emoji:"🍳",ids:["beef","onion"],method:"stir",station:"WOK",time:9,price:30,tags:["肉","鲜","甜香"],cost:11,hint:"发现新料理：改变入锅顺序与操作"},
  "pot_beef_onion":{name:"洋葱炖牛肉",emoji:"🍲",ids:["beef","onion"],method:"stew",station:"POT",time:13,price:28,tags:["肉","甜香","温和"],cost:11,hint:"发现新料理：改变入锅顺序与操作"},
  "wok_garlic_cabbage":{name:"蒜香包菜",emoji:"🍳",ids:["cabbage","garlic"],method:"stir",station:"WOK",time:6,price:17,tags:["清爽","香"],cost:4,hint:"发现新料理：改变入锅顺序与操作"},
  "pot_beef_potato":{name:"牛肉土豆煲",emoji:"🍲",ids:["beef","potato"],method:"stew",station:"POT",time:13,price:29,tags:["肉","饱腹","温和"],cost:12,hint:"发现新料理：改变入锅顺序与操作"},
  "wok_chicken_mushroom":{name:"山菌炒鸡",emoji:"🍳",ids:["chicken","mushroom"],method:"stir",station:"WOK",time:8,price:24,tags:["肉","鲜","菌香"],cost:9,hint:"发现新料理：改变入锅顺序与操作"},
  "pot_mushroom_onion":{name:"洋葱菌菇汤",emoji:"🍲",ids:["mushroom","onion"],method:"stew",station:"POT",time:10,price:19,tags:["菌香","温和","甜香"],cost:6,hint:"发现新料理：改变入锅顺序与操作"},
};
for(const [id,r] of Object.entries(FEATURED_ADDITIONS)){RECIPES[id]=r;registerRecipe(id,r)}
const RARE_FEATURED_RECIPES={
 sour_chicken_wok:{name:'逆潮酸爆鸡',emoji:'🍳',ids:['tide_sour_pulp','chicken','garlic'],method:'stir',station:'WOK',time:9,price:42,tags:['酸','清爽','肉','香'],cost:26,hint:'酸浆配鸡肉与蒜瓣，用炒锅激出酸香',rare:true},
 sour_potato_pot:{name:'潮酸焖薯',emoji:'🥣',ids:['tide_sour_pulp','potato','onion'],method:'stew',station:'POT',time:13,price:40,tags:['酸','饱腹','温和'],cost:25,hint:'酸浆配土豆与洋葱，轻搅慢炖',rare:true},
 nectar_cabbage_wok:{name:'星蜜卷卷脆蔬',emoji:'🥬',ids:['starlit_nectar','cabbage'],method:'stir',station:'WOK',time:7,price:40,tags:['花香','甜香','清爽'],cost:14,hint:'花蜜与魔菜，均匀翻炒保留清甜',rare:true},
 nectar_chicken_pot:{name:'星露蜜焖鸡',emoji:'🍲',ids:['starlit_nectar','chicken','onion'],method:'stew',station:'POT',time:13,price:44,tags:['花香','甜香','温和','肉'],cost:21,hint:'花蜜配鸡肉与洋葱，轻搅形成温和蜜香',rare:true},
  mushroom_heart_wok:{name:'菌心爆香',emoji:'🍄',ids:['mushroom_heart','garlic'],method:'stir',station:'WOK',time:9,price:35,tags:['菌香','鲜','香'],cost:15,hint:'菌王孢心配蒜瓣，高温激发菌香',rare:true},
  mushroom_heart_pot:{name:'菌王吐息浓汤',emoji:'🥣',ids:['mushroom_heart','chicken','mushroom'],method:'stew',station:'POT',time:14,price:36,tags:['菌香','鲜','温和'],cost:22,hint:'菌王孢心与鸡汤慢炖，再收汁',rare:true},
  ember_pepper_wok:{name:'熔心喷火牛',emoji:'🔥',ids:['ember_pepper','beef','garlic'],method:'stir',station:'WOK',time:11,price:46,tags:['辣','肉','香','爆香'],cost:26,hint:'熔心椒晶、野牛肉和蒜瓣极速爆炒',rare:true},
  ember_pepper_pot:{name:'火山焖鸡',emoji:'🍲',ids:['ember_pepper','chicken','potato'],method:'stew',station:'POT',time:14,price:38,tags:['辣','饱腹','温和'],cost:26,hint:'熔心椒晶与鸡肉土豆慢炖',rare:true}
};
for(const [id,r] of Object.entries(RARE_FEATURED_RECIPES)){RECIPES[id]=r;registerRecipe(id,r)}

// Ten authored grill recipes: distinctive demand without a combinatorial menu flood.
const GRILL_RECIPES={
 grill_beef:{name:'野牛蒜香串',emoji:'🍢',ids:['beef','garlic'],method:'grill',station:'GRILL',time:12,price:35,tags:['肉','香','鲜'],cost:10,hint:'牛肉与蒜瓣穿串，两面都要烤熟'},
 grill_chicken:{name:'火椒烤鸡串',emoji:'🍢',ids:['chicken','chili'],method:'grill',station:'GRILL',time:11,price:31,tags:['肉','辣','香'],cost:10,hint:'鸡肉与火椒穿串，翻面后刷出椒香'},
 grill_vegetable:{name:'林野菌蔬串',emoji:'🍢',ids:['mushroom','cabbage','onion'],method:'grill',station:'GRILL',time:10,price:27,tags:['菌香','清爽','甜香'],cost:8,hint:'菌菇、卷卷魔菜与洋葱两面翻烤'},
 grill_fire_beef:{name:'炭火椒牛串',emoji:'🍢',ids:['beef','chili'],method:'grill',station:'GRILL',time:13,price:38,tags:['肉','辣','香'],cost:12,hint:'野牛肉和火椒穿串，猛火两面翻烤'},
 grill_sweet_chicken:{name:'琥珀烤鸡串',emoji:'🍢',ids:['chicken','onion'],method:'grill',station:'GRILL',time:11,price:29,tags:['肉','温和','甜香'],cost:9,hint:'鸡肉和洋葱穿串，翻面刷出甜香'},
 grill_garlic_mushroom:{name:'蒜香菌菇串',emoji:'🍢',ids:['mushroom','garlic'],method:'grill',station:'GRILL',time:10,price:25,tags:['菌香','鲜','香'],cost:5,hint:'蘑菇与蒜瓣穿串，烤出鲜香'},
 grill_fire_potato:{name:'火椒烤薯串',emoji:'🍢',ids:['potato','chili'],method:'grill',station:'GRILL',time:12,price:28,tags:['辣','饱腹','温和'],cost:8,hint:'土豆与火椒穿串，厚切薯块两面烤透'},
 grill_garlic_cabbage:{name:'蒜香卷卷串',emoji:'🍢',ids:['cabbage','garlic'],method:'grill',station:'GRILL',time:9,price:23,tags:['蔬食','清爽','香'],cost:4,hint:'卷卷魔菜与蒜瓣穿串，烤出清爽脆边'},
 grill_forest_beef:{name:'幽光牛菌串',emoji:'🍢',ids:['beef','mushroom'],method:'grill',station:'GRILL',time:13,price:39,tags:['肉','菌香','鲜'],cost:11,hint:'牛肉与幽光蘑菇交错穿串，两面烤匀'},
 grill_hearty_chicken:{name:'咕咕烤薯串',emoji:'🍢',ids:['chicken','potato'],method:'grill',station:'GRILL',time:13,price:34,tags:['肉','饱腹','温和'],cost:10,hint:'鸡肉与地精土豆穿串，耐心翻烤'}
};
for(const [id,r] of Object.entries(GRILL_RECIPES)){RECIPES[id]=r;registerRecipe(id,r)}

const NAMED_EXTRA = {"WOK:beef,chili":"辣椒炒肉","WOK:chicken,chili":"辣椒炒肉","WOK:garlic,mushroom":"菌香小炒","POT:chicken,mushroom":"蘑菇焖鸡","WOK:cabbage,mushroom":"清炒双蔬","WOK:beef,chili,garlic":"爆炎牛肉","WOK:beef,garlic":"焦香蒜牛","WOK:chili,mushroom":"火山菌菇","POT:chicken,onion":"洋葱烩鸡","POT:onion,potato":"地精土豆煲","WOK:chili,potato":"爆辣脆薯","POT:mushroom,potato":"森林浓汤","WOK:cabbage,onion,potato":"丰收三拼","WOK:beef,onion":"葱爆牛肉","POT:beef,onion":"洋葱炖牛肉","WOK:chicken,onion":"洋葱炒鸡","POT:beef,potato":"牛肉土豆煲","WOK:beef,potato":"牛肉煎薯","WOK:beef,mushroom":"菌香牛肉","POT:beef,mushroom":"菌香炖牛肉","POT:beef,chili":"火椒炖牛","POT:beef,garlic":"蒜香炖牛","WOK:cabbage,garlic":"蒜香包菜","POT:cabbage,garlic":"蒜香菜汤","WOK:cabbage,onion":"洋葱包菜","POT:cabbage,onion":"甜洋葱菜煲","WOK:cabbage,potato":"锅煎双蔬","POT:cabbage,potato":"田园双蔬汤","WOK:chicken,garlic":"蒜香炒鸡","POT:chicken,garlic":"蒜香焖鸡","WOK:chicken,mushroom":"山菌炒鸡","POT:chicken,potato":"鸡肉土豆煲","WOK:chicken,potato":"鸡肉脆薯","POT:chili,potato":"火椒土豆煲","WOK:garlic,potato":"蒜香脆薯","POT:garlic,potato":"蒜香土豆浓汤","WOK:mushroom,onion":"甜香菌菇","POT:mushroom,onion":"洋葱菌菇汤","WOK:mushroom,potato":"煎菌菇土豆","WOK:chili,garlic":"爆香辣蒜","POT:chili,garlic":"火椒蒜香汁","WOK:chili,onion":"辣炒洋葱","POT:chili,onion":"香辣洋葱汤","WOK:garlic,onion":"双香煸锅","POT:garlic,onion":"双香浓汤","WOK:beef,cabbage":"牛肉炒包菜","POT:beef,cabbage":"牛肉菜煲","WOK:cabbage,chili":"火椒炝包菜","POT:cabbage,chili":"火椒蔬菜汤","WOK:beef,chicken":"双肉锅气炒","POT:beef,chicken":"双肉滋补锅","WOK:beef,chili,onion":"火椒葱爆牛肉","POT:beef,chili,onion":"香辣洋葱牛肉煲","WOK:beef,garlic,onion":"双香爆牛","POT:beef,garlic,onion":"双香焖牛","WOK:chicken,garlic,mushroom":"蒜香菌菇炒鸡","POT:chicken,garlic,mushroom":"菌菇蒜香鸡汤","WOK:chicken,chili,onion":"辛香炒鸡","POT:chicken,chili,onion":"香辣洋葱焖鸡","WOK:cabbage,garlic,mushroom":"菌香蒜炒双蔬","POT:cabbage,garlic,mushroom":"蒜香菌菇蔬菜汤","WOK:beef,mushroom,onion":"菌菇葱爆牛肉","POT:beef,mushroom,onion":"菌香洋葱炖牛肉","WOK:beef,onion,potato":"牛肉薯片葱爆","POT:beef,onion,potato":"洋葱土豆炖牛肉","WOK:chili,mushroom,potato":"火椒菌菇煎薯","POT:chili,mushroom,potato":"火山菌薯汤","WOK:cabbage,chili,garlic":"蒜香火椒包菜","POT:cabbage,chili,garlic":"辣蒜蔬菜汤"};
const NAMED_LOOKUP=Object.fromEntries(Object.entries(NAMED_EXTRA).map(([key,value])=>{const [vessel,parts]=key.split(':');return [vessel+':'+parts.split(',').sort().join(','),value]}));
const idsForRecipes=Object.keys(ING).filter(id=>['SHOP_STAPLE','FIELD_ONLY'].includes(ING[id].acquisitionPolicy));
for(const station of ["WOK","POT"]){
  for(let a=0;a<idsForRecipes.length;a++)for(let b=a+1;b<idsForRecipes.length;b++){
    for(const items of [[idsForRecipes[a],idsForRecipes[b]],
       ...idsForRecipes.slice(b+1).map(c=>[idsForRecipes[a],idsForRecipes[b],c])]){
      const sig=recipeSignature(items,station);if(RECIPE_INDEX[sig])continue;
      const main=items.find(x=>["beef","chicken","potato","mushroom","cabbage"].includes(x))||items[0];
      const names=Object.fromEntries([["beef","牛肉"],["chicken","鸡肉"],["chili","火椒"],["garlic","蒜香"],["mushroom","菌菇"],["cabbage","包菜"],["onion","洋葱"],["potato","土豆"]]);
      const other=items.filter(x=>x!==main).map(x=>names[x]).join("");
      const name=NAMED_LOOKUP[sig]||(station==="WOK"?"秘制炒":"秘制炖")+other+names[main];
      const id="mix_"+station.toLowerCase()+"_"+items.join("_");
      const material=items.reduce((n,x)=>n+ING[x].cost,0);
      const time=station==="WOK"?6+(items.some(x=>["beef","chicken","potato"].includes(x))?2:0)+(items.length-2)*2:
              9+(items.some(x=>["beef","chicken","potato"].includes(x))?3:0)+(items.length-2);
      const tags=[...new Set(items.flatMap(x=>ING[x].tags))].slice(0,4);
      RECIPES[id]={name,emoji:station==="WOK"?"🍳":"🍲",ids:items,method:station==="WOK"?"stir":"stew",
        station,time,price:Math.max(12,Math.round(material*2.1)),tags,cost:material,
        hint:"试着在不同的时机放入 "+items.map(x=>ING[x].name).join("、"),generated:true};
      registerRecipe(id,RECIPES[id]);
    }
  }
}

// Vegetable-first recipes receive an independent affinity; mushroom+chicken is never vegetarian.
for(const recipe of Object.values(RECIPES)){
 const ids=recipe.ids||[];
 if(!ids.some(id=>id==='beef'||id==='chicken')&&ids.some(id=>['cabbage','potato','onion'].includes(id)))
  if(!recipe.tags.includes('蔬食'))recipe.tags.push('蔬食');
}
