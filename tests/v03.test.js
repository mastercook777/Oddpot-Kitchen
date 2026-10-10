import test from 'node:test';
import assert from 'node:assert/strict';
import {ING,RECIPES} from '../src/data.js';
import {newGame,enterField,moveExplorer,interactExplorer,settleField,canUse,startCook,moveTile,beat,finishCook,createService,tick,setServicePaused,resumeBreak,closeService,sootheGuest,newRecipeLead,cookOutcome} from '../src/engine.js';

test('v0.3 content has eight real foods and twelve unique, discoverable recipes',()=>{
 assert.equal(Object.keys(ING).length,8);
 assert.equal(Object.keys(RECIPES).length,12);
 const keys=new Set();
 for(const [id,r] of Object.entries(RECIPES)){
  assert.ok(r.ids.length>=2&&r.ids.length<=3,id);
  assert.ok(r.ids.every(ingredient=>ING[ingredient]),id);
  const signature=[r.method,...r.ids.slice().sort()].join('-');
  assert.ok(!keys.has(signature),`${id} duplicates known recipe ${signature}`);
  keys.add(signature);
 }
});
test('every non-hidden recipe can be cooked from its intended ingredients with 3 beats',()=>{
 // Enumerate simple fixed layouts/three fire levels. Not an unlock cheat: this only
 // establishes that a player has at least one real route to a sellable dish.
 const positions=[0,1,2,3,4,5,6,7,8];
 for(const [id,r] of Object.entries(RECIPES)){
  if(r.hidden)continue;
  let found=false;
  const arrange=(selected)=>{
   if(found)return;
   if(selected.length===r.ids.length){
    for(const fire of [-1,0,1]){
     const c={method:r.method,tiles:Array(9).fill(null),adj:{spice:0,umami:0},effects:[],beats:0,flame:fire,movedThisBeat:false};
     selected.forEach((p,i)=>c.tiles[p]={id:r.ids[i],heat:0});
     // game rules have a three-beat helper; simulation uses the same public beat() as UI.
     const s={cook:c};for(let i=0;i<3;i++){c.flame=fire;beat(s)}
     const v=cookOutcome(c);
     if(v.recipeId===id&&v.sellable){found=true;break;}
    }
    return;
   }
   for(const p of positions)if(!selected.includes(p))arrange([...selected,p]);
  };
  arrange([]);assert.ok(found,`${id}: no cookable fixed 3-beat layout found`);
 }
});
test('safe map has a playable path to guaranteed selected material, and pays out only once',()=>{
 const s=newGame(789);s.phase='field';s.selectedTarget='onion';
 assert.equal(enterField(s,'safe'),true);
 assert.equal(s.field.worldW,9);assert.equal(s.field.worldH,11);
 assert.deepEqual(s.field.nodes[0].id,'onion');
 const before=s.inventory.onion;
 for(let i=0;i<3;i++)assert.equal(moveExplorer(s,0,-1).ok,true);
 assert.equal(s.field.bag.onion,2);
 assert.equal(s.inventory.onion,before,'material has not been booked into restaurant prematurely');
 assert.equal(interactExplorer(s).ok,false,'cannot claim completed node again');
 assert.equal(settleField(s),true);
 assert.equal(s.inventory.onion,before+2);
 assert.equal(settleField(s),false);
 assert.equal(s.inventory.onion,before+2);
 assert.equal(s.ledger.filter(x=>x.type==='exploration').length,1);
});
test('map and node variants reproduce for equal seed, day and route',()=>{
 const a=newGame(56),b=newGame(56);a.phase='field';b.phase='field';
 a.selectedTarget='potato';b.selectedTarget='potato';
 enterField(a,'risk');enterField(b,'risk');assert.deepEqual(a.field,b.field);
});
test('hospitality is a meaningful single-use decision and charges only once',()=>{
 const s=newGame(66);s.phase='service';createService(s);setServicePaused(s,false);tick(s,3);setServicePaused(s,true);
 const o=s.service.orders.find(v=>v.status==='queued'||v.status==='cooking');
 assert.ok(o);const before=s.coins;const patience=o.patience;
 assert.equal(sootheGuest(s,o.id),true);
 assert.equal(o.patience,patience+9);assert.equal(s.coins,before-5);
 assert.equal(sootheGuest(s,o.id),false);assert.equal(s.coins,before-5);
});
test('automated service can finish a whole evening without manual re-cooking',()=>{
 const s=newGame(77);s.phase='service';createService(s);setServicePaused(s,false);
 for(let i=0;i<110;i++){
  if(s.service.breakAt)resumeBreak(s);
  if(s.service.done)break;
  tick(s,1);
 }
 assert.equal(s.service.done,true);
 assert.equal(s.service.manualUsed,0);
 const before=s.coins;
 const r=closeService(s);
 assert.ok(r&&r.served>0);
 assert.equal(r.revenue,s.service.income);
 assert.equal(s.phase,'report');assert.equal(closeService(s),false);
 assert.equal(s.coins,before);
});
test('night feedback points to an actually undiscovered cookable recipe',()=>{
 const s=newGame();const lead=newRecipeLead(s);
 assert.ok(lead);assert.ok(!s.recipes[lead.id]);
 assert.deepEqual(lead.ingredients,RECIPES[lead.id].ids);
});
test('guest hospitality is counted in contribution profit but never charged twice',()=>{
 const s=newGame(92);s.phase='service';createService(s);setServicePaused(s,false);tick(s,3);setServicePaused(s,true);
 const o=s.service.orders.find(x=>x.status==='queued'||x.status==='cooking');const coin=s.coins;
 assert.equal(sootheGuest(s,o.id),true);assert.equal(s.coins,coin-5);
 setServicePaused(s,false);
 for(let i=0;i<115;i++){
  if(s.service.breakAt)resumeBreak(s);
  if(s.service.done)break;
  tick(s,1);
 }
 const afterService=s.coins;
 const r=closeService(s);
 assert.equal(r.hospitalityCost,5);
 assert.equal(r.profit,r.revenue-r.cost-5);
 assert.equal(s.coins,afterService,'nightly profit display must not withdraw hospitality money twice');
});