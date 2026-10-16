#!/usr/bin/env node
// Paired real restaurant nights; same seeds, roster, room, and stock. Menu and center equipment differ.
import {newGame,ensureKitchen,createService,setServicePaused,tick,closeService,resumeBreak,recipeCraftSnapshot} from '../src/engine.js';
import {RECIPES} from '../src/data.js';
import {DINER_FLOOR} from '../src/restaurant_scene_v075.js';
const count=Number(process.argv[2]||80);
if(!Number.isInteger(count)||count<20||count>1000)throw Error('20–1000 seeds');
function night(seed,grill,stock){
 const s=newGame(seed);s.phase='prep';s.cycle=3;s.day=3;s.reputation=24;s.coins=500;
 s.chapterProgress.stars=2;s.dining.tableCount=4;s.kitchen.thirdUnlocked=true;s.kitchen.grillOwned=grill;
 s.kitchen.slots.push({type:grill?'GRILL':'WOK',level:1});ensureKitchen(s);
 s.crew.helper={hired:true,onDuty:true,station:0,level:1,xp:0,meals:0};
 s.crew.helper2={hired:true,onDuty:true,station:2,level:1,xp:0,meals:0};
 s.crew.waiter={hired:true,onDuty:true,level:1,xp:0,meals:0};
 s.management={dayKey:'3-3',openingCoins:500,campaignId:'none',wageDebt:0};
 s.menu=grill?['grill_chicken','chicken_stew','mushroom_stir']:['chili_meat','chicken_stew','mushroom_stir'];
 for(const id of s.menu)s.recipes[id]=85;
 if(grill){const id='grill_chicken';s.recipeVariants[id]=[{variantId:'sim-glazed',recipeId:id,ingredientIds:[...RECIPES[id].ids],vessel:'GRILL',style:'glazed',styleLabel:'双面刷香',quality:85,valid:true,legacy:false}];s.activeVariantIds[id]='sim-glazed';}
 for(const id of Object.keys(s.inventory))s.inventory[id]=stock;
 s.phase='service';if(!createService(s,{walkable:true}))throw Error('open');
 Object.assign(s.service.hero,DINER_FLOOR.right);setServicePaused(s,false);
 for(let i=0;i<150&&!s.service.done;i++){if(s.service.breakAt)resumeBreak(s);tick(s,1);}
 if(!s.service.done)throw Error('unfinished '+seed);
 const r=closeService(s);
 return {demand:r.totalOrders,served:r.served,revenue:r.revenue,profit:r.profit,center:r.kitchen.stats.CENTER.count,
  grillOrders:s.service.orders.filter(o=>o.status==='served'&&o.recipeId==='grill_chicken').length,grillPrice:grill?recipeCraftSnapshot(s,'grill_chicken').price:0};
}
const avg=(arr,key)=>+(arr.reduce((n,x)=>n+x[key],0)/arr.length).toFixed(2);
const results=[100,4].map(stock=>{
 const old=[],newer=[];
 for(let n=0;n<count;n++){const seed=240001+n*7919;old.push(night(seed,false,stock));newer.push(night(seed,true,stock));}
 if(old.some((x,i)=>x.demand!==newer[i].demand))throw Error('demand changed');
 return {stock,baseline:Object.fromEntries(['demand','served','revenue','profit','center'].map(k=>[k,avg(old,k)])),grill:Object.fromEntries(['demand','served','revenue','profit','center','grillOrders','grillPrice'].map(k=>[k,avg(newer,k)]))};
});
console.log(JSON.stringify({runs:count,comparison:'same seeds, room, roster, non-grill menus and input stock; center WOK with chili_meat versus center GRILL with glazed grill_chicken; hero stays by right pot; real orders, no field gathering or 180 coin investment amortization',results},null,2));
