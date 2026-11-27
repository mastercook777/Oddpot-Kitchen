import {ING,RECIPES} from './data.js';
import {newGame,ensureKitchen,ensureCrew,chapterRecipeAvailable,recipeCookware,serviceDayPlan,recipeCraftSnapshot,canUse,createService,closeService} from './engine.js';
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
 solo:{name:'独门绝技',tier:2,group:'time',min:15,max:15,desc:v=>'菜单唯一该厨具时出餐 −'+v+'%'},
 stars:{name:'众星捧月',tier:3,group:'price',min:8,max:8,desc:v=>'其他每道普通菜售价 +'+v+'%（最多3道）'}
};
export const hash=(str,seed=2166136261)=>{let h=seed>>>0;for(const c of String(str)){h=Math.imul(h^c.charCodeAt(0),16777619)>>>0}return h};
function rng(seed){let h=seed>>>0;return ()=>{h=(h+0x6D2B79F5)>>>0;let t=h;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296}}
export function baseTier(result){if(!result?.sellable)return 0;const full=result.doneness?.every(x=>x.label==='熟透');return full&&(result.actions?.length||result.quality>=82)?3:result.quality>=70?2:1}
export function rarityOf(base,affixes){if(base!==3)return base;return affixes.some(a=>AFFIX[a.id]?.tier===3)?5:affixes.length>=2?4:3}
export function signature(v){return [v.recipeId,v.vessel,v.style,v.baseTier,...v.ingredientIds.slice().sort(),...v.affixes.map(a=>a.id+':'+a.value).sort()].join('|')}
export function identify(result,seed,txn){
 const base=baseTier(result);if(!base)return null;const random=rng(hash(txn,seed)),affixes=[];
 const weight=id=>1+((id==='quick'&&(result.facts?.burst||result.facts?.evenHeat))||(id==='aroma'&&result.facts?.aromaLead)||(id==='aftertaste'&&result.vessel==='POT')||(id==='fine'&&result.quality>=85)?1:0);
 function add(tiers){const pool=Object.entries(AFFIX).filter(([id,a])=>tiers.includes(a.tier)&&!affixes.some(x=>AFFIX[x.id].group===a.group)&&(id!=='frugal'||result.ids.some(x=>['beef','chicken','chili','garlic','mushroom','cabbage','onion','potato','cloud_rice','sky_moss','storm_egg','sour_bell'].includes(x))));let n=random()*pool.reduce((s,[id])=>s+weight(id),0);const hit=pool.find(([id])=>(n-=weight(id))<0)||pool.at(-1);if(!hit)return false;const [id,a]=hit;affixes.push({id,value:a.min+Math.floor(random()*(a.max-a.min+1))});return true}
 if(base===3){add([1]);const roll=random();if(roll<.05){if(add([3])&&random()<.5)add([1,2]);else if(affixes.length===1)add([1,2])}else if(roll<.25)add([1,2]);}
 const v={recipeId:result.recipeId,vessel:result.vessel,style:result.style,styleLabel:result.styleLabel,ingredientIds:[...result.ids],baseTier:base,rarity:rarityOf(base,affixes),affixes,source:txn};
 v.variantId='cb-'+hash(signature(v)).toString(36)+'-'+hash(signature(v),12345).toString(36);return v;
}
export function sample(id,affixes=[],base=affixes.length?3:1){const r=RECIPES[id],v={recipeId:id,vessel:recipeCookware(r),style:'sample',styleLabel:'预置工艺',ingredientIds:[...r.ids],baseTier:base,rarity:rarityOf(base,affixes),affixes,source:'sample'};v.variantId='cb-'+hash(signature(v)).toString(36)+'-'+hash(signature(v),12345).toString(36);return v}
export function collect(s,v){if(!v)return false;const list=s.cbExperiment.collection;if(list.some(x=>signature(x)===signature(v)))return true;if(list.filter(x=>x.recipeId===v.recipeId).length>=12)return false;list.push(v);return true}
export function budget(s,deck){const cfg=s.cbExperiment.config,variants=deck.map(id=>s.cbExperiment.collection.find(v=>v.variantId===id));const used=variants.reduce((n,v)=>n+(v?.rarity||0),0),limit=LEVELS[cfg.level-1],slots=cfg.level===4?4:3;const reasons=[];if(deck.length<3||deck.length>slots)reasons.push('需配置3至'+slots+'道菜');if(variants.some(v=>!v))reasons.push('未知工艺');if(new Set(variants.map(v=>v?.recipeId)).size!==variants.length)reasons.push('同菜不可重复');if(used>limit)reasons.push('超出容量');if(variants.some(v=>v&&(!chapterRecipeAvailable(s,v.recipeId)||!s.kitchen.slots.some(k=>k.type===v.vessel))))reasons.push('缺少对应厨具或章节不符');return {used,limit,slots,variants,valid:!reasons.length,reasons}}
export function applyDeck(s,deck){
 const b=budget(s,deck);if(!b.valid)return false;const crafts={};s.menu=b.variants.map(v=>v.recipeId);s.premiumMenu=null;
 for(const v of b.variants){const r=RECIPES[v.recipeId],value=id=>v.affixes.find(x=>x.id===id)?.value||0;
 const discount=Math.max(value('quick'),b.variants.filter(x=>x.vessel===v.vessel).length===1?value('solo'):0);
 const gain=value('fine')+value('stars')*Math.min(3,b.variants.filter(x=>x!==v&&x.rarity===1).length);
 crafts[v.recipeId]={recipeId:v.recipeId,variantId:v.variantId,style:v.style,styleLabel:v.styleLabel,quality:[0,66,76,86][v.baseTier],ingredientIds:[...v.ingredientIds],price:Math.round(r.price*(1+gain/100)),basePrice:r.price,baseTime:r.time,timeDelta:-Math.min(r.time*.25,r.time*discount/100),guestFitDelta:{},recipeTags:[...r.tags],affixes:structuredClone(v.affixes),rarity:v.rarity,cb:{discount,gain,aroma:value('aroma'),sat:value('aftertaste'),wait:value('wait'),refund:value('frugal')}};
 s.recipes[v.recipeId]=Math.max(s.recipes[v.recipeId]||0,crafts[v.recipeId].quality);
 }
 s.cbExperiment.crafts=crafts;s.cbExperiment.deck=[...deck];return true;
}
export const DEFAULT_CONFIG={world:'hearth',level:2,tables:3,stations:2,third:'GRILL',helper:true,waiter:true,guest:'normal',pressure:'normal',stock:'full',seed:15742};
export function fixture(config={}){
 const cfg={...DEFAULT_CONFIG,...config};cfg.level=Math.min(4,Math.max(1,Number(cfg.level)||1));cfg.seed=Number(cfg.seed)>>>0;
 const s=newGame(cfg.seed);s.phase='research';s.onboarding.enabled=false;s.coins=620;s.management.openingCoins=s.coins;s.cycle=2;s.day=1;s.dining.tableCount=Number(cfg.tables);s.chapterProgress.stars=2;s.reputation=12;if(cfg.world==='cloud'){s.activeWorld='cloud';s.cloudProgress={explored:true,servedLocal:0,stars:0};s.kitchen.steamerOwned=true;}
 s.kitchen.thirdUnlocked=Number(cfg.stations)===3;s.kitchen.grillOwned=cfg.world!=='cloud';if(s.kitchen.thirdUnlocked)s.kitchen.slots.push({type:(cfg.world==='cloud'?['WOK','POT','STEAM']:['WOK','POT','GRILL']).includes(cfg.third)?cfg.third:cfg.world==='cloud'?'STEAM':'GRILL',level:1});
 ensureKitchen(s);ensureCrew(s);s.crew.helper.hired=s.crew.helper.onDuty=!!cfg.helper;s.crew.helper.station=0;s.crew.waiter.hired=s.crew.waiter.onDuty=!!cfg.waiter;
 for(const id of Object.keys(ING))s.inventory[id]=(cfg.world!=='cloud'&&['cloud_rice','sky_moss','storm_egg','sour_bell','gale_core'].includes(id))?0:cfg.stock==='scarce'?3:cfg.stock==='limited'?7:24;
 s.cbExperiment={config:cfg,collection:[],crafts:{},deck:[],plan:null};
 const recipes=cfg.world==='cloud'?['cloud_rice_chicken','sour_rice','cloud_potato_rice','cloud_chili_rice','steam_cloud_rice','steam_moss_egg','cloud_garlic_egg']:['chicken_stew','mushroom_stir','veg_stir','garlic_beef','onion_chicken','spicy_mushroom','grill_beef','grill_chicken'];
 for(const id of recipes){collect(s,sample(id));s.recipes[id]=76}
 for(const [id,as] of (cfg.world==='cloud'?[['cloud_rice_chicken',[{id:'quick',value:18}]],['sour_rice',[{id:'aroma',value:25}]],['cloud_potato_rice',[{id:'aftertaste',value:8}]],['cloud_chili_rice',[{id:'aroma',value:25},{id:'stars',value:8}]],['steam_cloud_rice',[{id:'solo',value:15},{id:'wait',value:15}]]]:[['mushroom_stir',[{id:'quick',value:18}]],['chicken_stew',[{id:'aftertaste',value:8}]],['veg_stir',[{id:'aroma',value:25}]],['garlic_beef',[{id:'aroma',value:25},{id:'stars',value:8}]],['onion_chicken',[{id:'solo',value:15},{id:'wait',value:15}]],['spicy_mushroom',[{id:'frugal',value:15}]],['grill_beef',[{id:'fine',value:18}]]]))collect(s,sample(id,as));
 const plan=serviceDayPlan(s),n=cfg.pressure==='low'?7:cfg.pressure==='high'?14:10;
 const pool=cfg.world==='cloud'?(cfg.guest==='premium'?['stargazer','cloud_weaver','cloud_docker']:cfg.guest==='adventure'?['cloud_docker','cloud_docker','cloud_weaver']:cfg.guest==='family'?['cloud_weaver','cloud_weaver','cloud_docker']:null):cfg.guest==='adventure'?['adventurer','adventurer','adventurer','regular','family']:cfg.guest==='family'?['family','family','regular','family','gardener']:cfg.guest==='premium'?['critic','stargazer','critic','adventurer','regular']:null;
 const random=rng(hash('guests',cfg.seed));const guests=Array.from({length:n},(_,i)=>pool?pool[Math.floor(random()*pool.length)]:plan.guests[i%plan.guests.length]);
 s.cbExperiment.plan={...plan,count:n,baseCount:n,guests,arrivalSpacing:cfg.pressure==='high'?1:cfg.pressure==='low'?4:2,marketingCost:0,marketingGuests:0,campaignId:'none',feastSeats:[],pressure:'工坊 · '+cfg.pressure,goal:{kind:'served',target:Math.ceil(n*.75),label:'完成 '+Math.ceil(n*.75)+' 份上菜'}};
 s.cbExperiment.deck=recipes.slice(0,3).map(id=>s.cbExperiment.collection.find(v=>v.recipeId===id).variantId);
 return s;
}
export function summary(s){const v=s.service,r=s.report;if(!v?.reportBuilt||!r)return null;const orders=v.orders,served=orders.filter(o=>o.status==='served'),landed=orders.filter(o=>o.landedAt!=null),started=orders.filter(o=>o.started!=null&&o.pickupAt!=null);const mean=a=>a.length?Math.round(a.reduce((x,y)=>x+y,0)/a.length*10)/10:0;
 return {config:structuredClone(s.cbExperiment.config),deck:structuredClone(s.cbExperiment.deck),guests:orders.length,served:r.served,left:r.left,rejected:r.rejected,revenue:r.revenue,cost:r.cost,wage:r.finance?.wage??0,profit:r.profit,sat:r.sat,wait:mean(landed.map(o=>o.landedAt-o.arrival)),production:mean(started.map(o=>o.pickupAt-o.started)),rows:s.menu.map(id=>{const os=orders.filter(o=>o.recipeId===id),ev=v.events.filter(e=>e.type==='cb_affix'&&e.recipeId===id);return {id,ordered:os.filter(o=>o.orderedAt!=null).length,served:os.filter(o=>o.status==='served').length,income:os.filter(o=>o.landedAt!=null).reduce((n,o)=>n+o.craft.price,0),events:ev}}),suggested:r.suggested};
}
