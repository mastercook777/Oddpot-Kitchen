import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,identify,collect,budget,applyDeck,summary,AFFIX,rarityOf,baseTier,sample} from '../src/cooking_build_v2.js';
import {beginLiveResearch,dropLiveIngredient,performLiveAction,stepLiveResearch,finishLiveResearch,createService,tick,resumeBreak,closeService,setServicePaused,prepDish,recipeCraftSnapshot,canMenu,selectArrivalDish,stationDuration,threadGrillIngredient,placeGrillSkewer,grillCookPreview,liveCookPreview} from '../src/engine.js';
import {ING,RECIPES} from '../src/data.js';
import {evaluateLiveCook} from '../src/cooking_v063.js';
import {evaluatePlacedGrill} from '../src/grill_cooking_v014c.js';
import {judgeCooking} from '../src/cooking_quality_r1.js';
const advance=(s,target)=>{while(s.cook&&s.cook.elapsed<target-1e-6){const dt=Math.min(.1,target-s.cook.elapsed);stepLiveResearch(s,dt)}};
const testRecipes={WOK:['mushroom_stir','garlic_beef'],POT:['chicken_stew','onion_chicken'],STEAM:['steam_cloud_rice','steam_moss_egg'],GRILL:['grill_beef','grill_chicken']};
function candidates(id,v){
 const ids=RECIPES[id].ids,found={},blue=new Map();
 for(const order of [ids,[...ids].reverse()])for(const delay of v==='GRILL'?[0]:[0,.5,1.5,2.5,4])for(const kind of v==='GRILL'?['none','brush','smoke']:v==='STEAM'?['none','seal','vent']:v==='WOK'?['none','flip','toss']:['none','gentle','reduce'])for(const at of kind==='none'?[0]:[.5,1.5,2.5,4,5.5,7,8.5])for(let end=2;end<=18;end+=.5){
  if(delay>=end||kind!=='none'&&(at<delay||at>=end))continue;
  const actions=[];let r;
  if(v==='GRILL'){if(kind!=='none')actions.push({type:kind,t:at,with:ids});r=evaluatePlacedGrill({ids,skewer:order,lane:'middle',actions,elapsed:end,cbTiming:true})}
  else{if(kind!=='none')actions.push({type:kind,t:at,with:ids});r=evaluateLiveCook(ids,v,order.map((id,index)=>({id,index,t:index*delay})),actions,end,true)}
  const j=judgeCooking(r,15742,'trajectory');if(!j.baseTier)continue;
  const target=[0,44,64,88][j.baseTier],distance=Math.abs(j.internal.raw-target),p={order:[...order],delay,kind,actions,end,distance,r,j};
  if(!found[j.baseTier]||distance<found[j.baseTier].distance)found[j.baseTier]=p;
  if(j.baseTier===3){const k=order[0]+':'+kind;if(!blue.has(k)||distance<blue.get(k).distance)blue.set(k,p)}
 }
 return {found,blue:[...blue.values()].sort((a,b)=>a.distance-b.distance)};
}
function replay(id,v,p){
 const s=fixture({world:v==='STEAM'?'cloud':'hearth',level:4,stations:3,third:v==='STEAM'?'STEAM':'GRILL'});
 assert.ok(beginLiveResearch(s,p.order,v),id+' begin');const txn=s.cook.txn,old={...s.inventory},before=structuredClone(s.recipeVariants);
 if(v==='GRILL'){for(const id of p.order)assert.ok(threadGrillIngredient(s,id));assert.ok(placeGrillSkewer(s,'middle'))}
 else for(const [i,id] of p.order.entries()){advance(s,i*p.delay);assert.ok(dropLiveIngredient(s,id))}
 for(const a of p.actions){advance(s,a.t);assert.ok(performLiveAction(s,a.type))}
 advance(s,p.end);const r=finishLiveResearch(s);assert.ok(r&&r.sellable,id+' '+JSON.stringify(p));assert.ok(r.doneness.every(d=>d.label==='熟透'));assert.deepEqual(s.recipeVariants,before);for(const id of p.order)assert.equal(s.inventory[id],old[id]-1);assert.equal(finishLiveResearch(s),false);assert.equal(r.cbVerdict.baseTier,p.j.baseTier,id+' '+JSON.stringify(p));return {s,r,txn};
}
test('R1 eight real recipes, four cookware, reachable fully cooked white green blue and multiple excellent trajectories',()=>{
 for(const [v,ids] of Object.entries(testRecipes))for(const id of ids){const {found,blue}=candidates(id,v);assert.ok(found[1]&&found[2]&&found[3],id+' all tiers');assert.ok(blue.length>=2,id+' multiple routes');
 for(const tier of [1,2,3]){const {s,r,txn}=replay(id,v,found[tier]);const item=identify(r,s.seed,txn);assert.equal(item.baseTier,tier);if(tier<3){assert.ok(r.cbVerdict.tip);assert.equal(item.affixes.length,0)}else assert.ok(item.affixes.length);const n=s.cbExperiment.collection.length;assert.ok(collect(s,item));assert.ok(collect(s,item));assert.equal(s.cbExperiment.collection.length,n+1)}
 for(const p of blue.slice(0,2))assert.equal(replay(id,v,p).r.cbVerdict.baseTier,3);console.log('R1 actual trajectories',v,id,[1,2,3].map(k=>({kind:found[k].kind,order:found[k].order,delay:found[k].delay,end:found[k].end,raw:Math.round(found[k].j.internal.raw)})),blue.length);
 }
});
test('R1 strict failure before discovery, actual once-only ingredients and old game unaffected',()=>{
 const s=fixture();assert.ok(beginLiveResearch(s,['chicken','chili'],'WOK'));const old=s.inventory.chicken,recipes=structuredClone(s.recipes),variants=structuredClone(s.recipeVariants),learned=structuredClone(s.learned);
 assert.ok(dropLiveIngredient(s,'chicken'));assert.ok(dropLiveIngredient(s,'chili'));advance(s,4);const r=finishLiveResearch(s);assert.ok(r.doneness.some(x=>x.label==='受热中'));assert.equal(r.sellable,false);assert.equal(r.cbVerdict.baseTier,0);assert.equal(identify(r,s.seed,r.cbTxn),null);assert.ok(r.cbVerdict.tip.includes('熟透'));assert.deepEqual(s.recipes,recipes);assert.deepEqual(s.recipeVariants,variants);assert.deepEqual(s.learned,learned);assert.equal(s.inventory.chicken,old-1);assert.equal(finishLiveResearch(s),false);
 for(const [ids,v,actions,end] of [[['garlic','mushroom'],'WOK',[],15],[['beef','garlic'],'GRILL',[],2]]){const q=fixture();assert.ok(beginLiveResearch(q,ids,v));if(v==='GRILL'){for(const id of ids)assert.ok(threadGrillIngredient(q,id));assert.ok(placeGrillSkewer(q,'middle'))}else for(const id of ids)assert.ok(dropLiveIngredient(q,id));advance(q,end);const rr=finishLiveResearch(q);assert.equal(rr.sellable,false);assert.equal(rr.cbVerdict.baseTier,0)}
 const q=fixture();assert.ok(beginLiveResearch(q,['garlic','mushroom'],'WOK'));assert.ok(dropLiveIngredient(q,'garlic'));advance(q,3);assert.equal(finishLiveResearch(q).cbVerdict.baseTier,0);
 const legacy=fixture();delete legacy.cbExperiment;assert.ok(beginLiveResearch(legacy,['chicken','chili'],'WOK'));dropLiveIngredient(legacy,'chicken');dropLiveIngredient(legacy,'chili');advance(legacy,4);assert.equal(finishLiveResearch(legacy).sellable,true);
});
test('R1 identical excellent trajectories independent open pool, all rolls and stable transactions',()=>{
 const {blue}=candidates('garlic_beef','WOK'),p=blue.find(x=>x.order[0]==='garlic'),q=blue.find(x=>x.order[0]==='beef');assert.ok(p&&q);
 const results=[replay('garlic_beef','WOK',p).r,replay('garlic_beef','WOK',q).r],counts=[],rolls={};
 for(const [j,result] of results.entries()){const rarity=[0,0,0,0,0,0],first={};for(let i=0;i<10000;i++){const v=identify(result,15742,'txn-'+i);rarity[v.rarity]++;assert.equal(v.rarity,rarityOf(3,v.affixes));assert.ok(v.affixes.length>=1);assert.equal(new Set(v.affixes.map(a=>AFFIX[a.id].group)).size,v.affixes.length);first[v.affixes[0].id]=(first[v.affixes[0].id]||0)+1;for(const a of v.affixes){assert.ok(a.value>=AFFIX[a.id].min&&a.value<=AFFIX[a.id].max);(rolls[a.id]||=new Set()).add(a.value)}}
 assert.equal(Object.keys(first).length,6);for(const n of Object.values(first))assert.ok(n>1450&&n<1900);assert.ok(rarity[3]>6500&&rarity[4]>1200&&rarity[5]>200);counts.push({rarity,first});assert.deepEqual(identify(result,1,'same'),identify(result,1,'same'))}
 assert.deepEqual(counts[0],counts[1]);for(const [id,a] of Object.entries(AFFIX)){assert.equal(rolls[id].size,a.max-a.min+1,id+' all inclusive values');}console.log('R1 open pool 2 x 10000',counts,Object.fromEntries(Object.entries(rolls).map(([id,x])=>[id,[Math.min(...x),Math.max(...x),x.size]])));
});
test('R1 boundary randomness never bypasses failure or jumps two tiers',()=>{
 const result=evaluateLiveCook(['mushroom','garlic'],'WOK',[{id:'mushroom',t:0,index:0},{id:'garlic',t:.5,index:1}],[{type:'flip',t:1.5,with:['mushroom','garlic']}],5);
 const grades=new Set(Array.from({length:200},(_,i)=>judgeCooking(result,i,'same').baseTier));assert.ok(Math.max(...grades)-Math.min(...grades)<=1);const bad={...result,sellable:false};for(let i=0;i<100;i++)assert.equal(judgeCooking(bad,i,'same').baseTier,0);
});
const choose=(s,id,rarity=1)=>s.cbExperiment.collection.find(v=>v.recipeId===id&&v.rarity===rarity).variantId;
function run(s,deck){assert.ok(applyDeck(s,deck));assert.ok(canMenu(s));s.phase='prep';assert.ok(prepDish(s,s.menu[0]));s.phase='service';assert.ok(createService(s,{walkable:false}));setServicePaused(s,false);for(let i=0;i<110&&!s.service.done;i++){if(s.service.breakAt)resumeBreak(s);tick(s,1)}assert.ok(s.service.done);assert.ok(closeService(s));assert.equal(closeService(s),false);assert.ok(s.service.orders.every(o=>['served','left','rejected'].includes(o.status)));assert.equal(s.service.income,s.ledger.filter(e=>e.type==='sale').reduce((n,e)=>n+e.amount,0));assert.ok(Object.values(s.inventory).every(n=>n>=0));assert.equal(new Set(s.ledger.map(e=>e.id)).size,s.ledger.length);return summary(s)}
test('real one-night A/B, immutable snapshot, budget and deterministic replay',()=>{const base=fixture({level:1,guest:'adventure',pressure:'high'});const a=[choose(base,'garlic_beef',5),choose(base,'chicken_stew'),choose(base,'veg_stir')],b=[choose(base,'mushroom_stir',3),choose(base,'chicken_stew',3),choose(base,'veg_stir')];assert.equal(budget(base,a).used,7);assert.equal(budget(base,b).used,7);assert.equal(budget(base,[...a,choose(base,'mushroom_stir')]).valid,false);const x=structuredClone(base),y=structuredClone(base);const ra=run(x,a),rb=run(y,b);assert.deepEqual(ra,run(structuredClone(base),a));assert.ok(ra.guests===14&&rb.guests===14);assert.ok(ra.rows.some(row=>row.events.some(e=>e.affix==='stars'||e.affix==='aroma')));assert.ok(rb.rows.some(row=>row.events.some(e=>e.affix==='quick'||e.affix==='aftertaste')));console.log('CB real A/B',JSON.stringify({a:ra,b:rb}))});
test('master four slots, actual craft snapshots and cloud eligibility',()=>{const s=fixture({level:4,stations:3,third:'GRILL'});const deck=[choose(s,'garlic_beef',5),choose(s,'chicken_stew',3),choose(s,'mushroom_stir',3),choose(s,'grill_beef')];assert.equal(budget(s,deck).used,12);assert.ok(budget(s,deck).valid);assert.ok(applyDeck(s,deck));assert.equal(recipeCraftSnapshot(s,'garlic_beef').price,Math.round(RECIPES.garlic_beef.price*1.08));assert.ok(run(s,deck).guests>0);const cloud=fixture({world:'cloud',level:4,stations:3,third:'STEAM'});assert.ok(cloud.kitchen.slots.some(x=>x.type==='STEAM'));const cd=[choose(cloud,'cloud_rice_chicken'),choose(cloud,'sour_rice'),choose(cloud,'steam_cloud_rice',4),choose(cloud,'cloud_potato_rice')];assert.ok(budget(cloud,cd).valid);assert.ok(run(cloud,cd).guests>0)});

test('R1b rapid four-button sequences cannot obtain excellent even with ideal finish timing',()=>{
 for(const v of ['WOK','POT']){
  const dishes=Object.entries(RECIPES).filter(([id,x])=>!x.generated&&!x.rare&&x.station===v&&x.method!=='steam'&&x.ids.length===2&&x.ids.every(i=>!['cloud_rice','sky_moss','storm_egg','sour_bell','gale_core'].includes(i)));
  const counts=[0,0,0,0];
  for(const [id,x] of dishes)for(const order of [x.ids,[...x.ids].reverse()])for(const gap of [.1,.25,.4])for(const kinds of v==='WOK'?[['flip','toss'],['toss','flip']]:[['gentle','reduce'],['reduce','gentle']])for(let end=2;end<=18;end+=.25){
   const drops=order.map((id,i)=>({id,index:i,t:i*gap})),actions=kinds.map((type,i)=>({type,t:(i+2)*gap,with:order}));
   const rr=evaluateLiveCook(order,v,drops,actions,end,true);
   for(const seed of [1,15742,99])counts[judgeCooking(rr,seed,'rapid').baseTier]++;
  }
  assert.equal(counts[3],0);assert.ok(counts[1]>0&&counts[2]>0);
  console.log('R1b rapid trace distribution',v,dishes.length,counts);
 }
 // Execute the same pattern through the actual workshop engine, not a synthetic verdict.
 for(const [v,ids,actions] of [['WOK',['beef','garlic'],['flip','toss']],['POT',['chicken','mushroom'],['gentle','reduce']]]){
  const s=fixture();assert.ok(beginLiveResearch(s,ids,v));dropLiveIngredient(s,ids[0]);advance(s,.25);dropLiveIngredient(s,ids[1]);advance(s,.5);performLiveAction(s,actions[0]);advance(s,.75);performLiveAction(s,actions[1]);advance(s,9);const rr=finishLiveResearch(s);assert.ok(rr.sellable);assert.ok(rr.cbVerdict.baseTier<3);assert.equal(identify(rr,s.seed,rr.cbTxn).affixes.length,0);
 }
});

test('R1c automatic grill and all optional techniques leave actual maturity invariant',()=>{
 for(const [v,ids,techs] of [['WOK',['beef','garlic'],['flip','toss']],['POT',['chicken','mushroom'],['gentle','reduce']],['STEAM',['cloud_rice','chicken'],['seal','vent']],['GRILL',['beef','garlic'],['brush','smoke']]]){
  for(const end of [2,9,18.5]){
   const run=(actions)=>{const s=fixture({world:v==='STEAM'?'cloud':'hearth',stations:3,third:v==='STEAM'?'STEAM':'GRILL'});assert.ok(beginLiveResearch(s,ids,v));if(v==='GRILL'){for(const id of ids)assert.ok(threadGrillIngredient(s,id));assert.ok(placeGrillSkewer(s,'middle'));assert.equal(performLiveAction(s,'turn'),false)}else for(const id of ids)assert.ok(dropLiveIngredient(s,id));
    for(const [i,a] of actions.entries()){advance(s,.6+i*.5);assert.ok(performLiveAction(s,a));assert.equal(performLiveAction(s,a),false)}
    advance(s,end);const preview=v==='GRILL'?grillCookPreview(s).items:liveCookPreview(s).indicators;if(v==='GRILL')for(const h of preview)assert.ok(Math.abs(h.front+h.back-end*1.05)<.002);
    const r=finishLiveResearch(s);assert.deepEqual(r.doneness.map(h=>h.label),preview.map(h=>h.baseState||h.state));return r};
   const plain=run([]);for(const actions of [[techs[0]],[techs[1]],techs,[...techs].reverse()]){const result=run(actions);assert.deepEqual(result.doneness,plain.doneness);assert.equal(result.sellable,plain.sellable);if(v==='GRILL')assert.deepEqual(result.facts.frontBack,plain.facts.frontBack)}
   assert.equal(plain.sellable,end===9,v+' '+end);if(end===9)assert.ok(plain.cbVerdict.baseTier<3);
  }
 }
 const legacy=fixture();delete legacy.cbExperiment;assert.ok(beginLiveResearch(legacy,['beef','garlic'],'GRILL'));threadGrillIngredient(legacy,'beef');threadGrillIngredient(legacy,'garlic');placeGrillSkewer(legacy,'middle');advance(legacy,3);assert.equal(performLiveAction(legacy,'brush'),false);assert.ok(performLiveAction(legacy,'turn'));assert.equal(performLiveAction(legacy,'turn'),false);assert.equal(performLiveAction(legacy,'smoke'),false);
});
