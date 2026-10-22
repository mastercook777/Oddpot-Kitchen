import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {RECIPES,CUSTOMERS} from '../src/data.js';
import {
 newGame,travelPortal,selectArrivalDish,chapterRecipeAvailable,
 createService,CLOUD_SERVICE_EVENTS,CUSTOMER_REVIEW_VOICES,
 currentServiceEvent,chooseServiceEvent,closeService,setServicePaused,tick,resumeBreak
} from '../src/engine.js';

function chooser(menu,seed=42,count=72,segment='family'){
 const s=newGame(seed);s.phase='service';s.menu=[...menu];
 for(const id of menu)s.recipes[id]=84;
 s.service={scenarioSeed:seed,orders:[],judgeOrderId:null};
 const result=[];
 for(let i=0;i<count;i++){
  const o={id:'guest-'+i,segment,recipeId:null,fit:0};
  selectArrivalDish(s,o);
  result.push({id:o.recipeId,fit:o.fit});
  o.orderedAt=i+1;s.service.orders.push(o);
 }
 return result;
}
test('similar quality dishes have multiple genuine orders without forced exact thirds',()=>{
 const menu=['chicken_stew','mushroom_stir','veg_stir'];
 const picks=chooser(menu,1723,80);
 const dist=Object.fromEntries(menu.map(id=>[id,picks.filter(x=>x.id===id).length]));
 assert.ok(Object.values(dist).filter(n=>n>0).length>=2,JSON.stringify(dist));
 assert.equal(Object.values(dist).reduce((n,x)=>n+x,0),80);
 assert.deepEqual(chooser(menu,1723,80),picks,'save/seed replay must not reroll');
});
test('repeating one menu entry never adds probability or changes the same 60 seeded orders',()=>{
 const a=chooser(['chicken_stew','veg_stir','chicken_stew'],81,60);
 const b=chooser(['chicken_stew','veg_stir'],81,60);
 assert.deepEqual(a,b);
});
test('unacceptable Cloud food cannot win a diversity quota against a real favorite',()=>{
 const s=newGame(31);s.chapterProgress.stars=3;s.phase='forecast';assert.equal(travelPortal(s,'cloud'),true);
 s.menu=['cloud_rice_chicken','cloud_beef_sour','cloud_rice_chicken'];
 s.recipes.cloud_rice_chicken=90;s.recipes.cloud_beef_sour=90;
 s.service={scenarioSeed:31,orders:[]};
 for(let i=0;i<35;i++){
  const o={id:'weaver-'+i,segment:'cloud_weaver'};
  selectArrivalDish(s,o);
  assert.equal(o.recipeId,'cloud_rice_chicken');
  o.orderedAt=i+1;s.service.orders.push(o);
 }
});
test('Cloud uses its own maritime incidents, native guests and distinct review voices',()=>{
 const s=newGame(2025);s.chapterProgress.stars=3;s.phase='forecast';
 assert.equal(travelPortal(s,'cloud'),true);s.phase='service';
 s.recipes.cloud_rice_chicken=80;s.menu=['cloud_rice_chicken','cloud_rice_chicken','cloud_rice_chicken'];
 assert.equal(createService(s),true);
 assert.equal(s.service.eventPlan[1].id,CLOUD_SERVICE_EVENTS[1].id);
 assert.equal(s.service.eventPlan[2].id,CLOUD_SERVICE_EVENTS[2].id);
 for(const id of ['cloud_weaver','cloud_docker']){assert.ok(CUSTOMERS[id]);for(const p of ['late','quality','taste','delicious','happy','okay','bad'])assert.ok(CUSTOMER_REVIEW_VOICES[id][p]);}
 s.service.breakAt=1;s.service.breakUsed=false;s.service.eventChoiceMade=[];
 assert.equal(currentServiceEvent(s).id,'sky_freight');
 const next=s.service.orders.find(o=>o.status==='waiting'&&o.wave===1);
 assert.ok(next,'requires future wave order');
 assert.equal(chooseServiceEvent(s,'sign'),true);
 assert.equal(next.segment,'cloud_docker');
 assert.equal(s.service.decisionFlash,'港口搬运客增加');
});
test('Cloud Boss hint and online/offline copy avoid forest Boss names for the floating harbor',()=>{
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 const offline=readFileSync(new URL('../standalone.html',import.meta.url),'utf8');
 for(const source of [app,offline]){
  assert.match(source,/if\(region==='cloud'\)return \{boss:'风暴之王'/);
  assert.match(source,/function cloudBackdrop\(/);
  assert.match(source,/今日实际点单 \/ 售出/);
 }
 assert.match(app,/三段航路/);
});
