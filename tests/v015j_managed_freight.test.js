import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,hireCrew,travelPortal,createService,tick,closeService,setServicePaused,
 resumeBreak,currentServiceEvent,chooseServiceEvent,advanceDay,nextPhase,save,load,
 managedFreightStatus,configureManagedFreight,claimManagedFreight,MANAGED_FREIGHT_FOCUS,
 redeemFerrySupply,chapterRecipeAvailable,selectMenuRecipe} from '../src/engine.js';
const copy=x=>structuredClone(x);
function enterCloud(seed=66,hire=true){
 const s=newGame(seed);s.chapterProgress.stars=3;
 if(hire){s.phase='prep';assert.equal(hireCrew(s,'helper'),true);}
 s.phase='forecast';assert.equal(travelPortal(s,'cloud'),true);
 s.recipes.sour_rice=84;s.recipes.cloud_rice_chicken=84;s.recipes.moss_soup=84;
 s.menu=['sour_rice','cloud_rice_chicken','moss_soup'];
 return s;
}
function cloudNight(s){
 s.phase='service';assert.equal(createService(s,{walkable:false}),true);
 assert.equal(setServicePaused(s,false),true);
 for(let step=0;step<160&&!s.service.done;step++){
  if(s.service.breakAt){
   const event=currentServiceEvent(s),steady=event?.choices.find(c=>c.id==='steady')||event?.choices[0];
   if(steady)assert.equal(chooseServiceEvent(s,steady.id),true);
   assert.equal(resumeBreak(s),true);
  }
  tick(s,1);
 }
 assert.equal(s.service.done,true);
 const report=closeService(s);assert.ok(report);
 return report;
}
function morning(s){nextPhase(s,'upgrade');assert.equal(advanceDay(s),true);}
test('no old keeper means no shipping license, and Cloud-only configuration does not change old store',()=>{
 const s=enterCloud(700,false);
 assert.equal(managedFreightStatus(s).keeper,false);
 assert.equal(configureManagedFreight(s,'forest'),false);
 assert.equal(claimManagedFreight(s),false);
 assert.equal(configureManagedFreight(s,'bogus'),false);
 const frozen=copy(s.worlds.hearth);
 cloudNight(s);morning(s);cloudNight(s);
 assert.deepEqual(s.worlds.hearth,frozen);
});
test('two actual Cloud evenings dispatch 6 actual Hearth units; collection has two separate idempotent ledgers',()=>{
 const s=enterCloud(701,true),old=s.worlds.hearth;
 old.inventory.mushroom=3;old.inventory.chicken=2;old.inventory.onion=1;old.coins=70;
 assert.equal(configureManagedFreight(s,'forest'),true);
 const before=copy(old.inventory),cloudBefore=copy(s.inventory);
 const r1=cloudNight(s);assert.equal(r1.managedFreight,undefined);
 assert.equal(managedFreightStatus(s).days,1);
 assert.equal(closeService(s),false);
 morning(s);assert.equal(managedFreightStatus(s).days,1);
 const r2=cloudNight(s);assert.equal(r2.managedFreight.total,6);
 assert.deepEqual(r2.managedFreight.items,{mushroom:3,chicken:2,onion:1});
 assert.equal(s.worlds.hearth.coins,60);
 assert.equal(s.worlds.hearth.inventory.mushroom,0);
 assert.equal(s.worlds.hearth.inventory.chicken,before.chicken-2);
 assert.equal(s.worlds.hearth.inventory.onion,before.onion-1);
 assert.equal(s.worlds.hearth.ledger.filter(x=>x.id==='managed-export-out-1').length,1);
 assert.equal(s.worlds.hearth.ledger.find(x=>x.id==='managed-export-out-1').day,old.day,'old warehouse ledger must keep Hearth-local business day');
 assert.equal(s.worlds.hearth.ledger.find(x=>x.id==='managed-export-out-1').cloudDay,'1-2','scheduled ship day must remain Cloud-local');
 assert.equal(s.inventory.mushroom||0,cloudBefore.mushroom||0);
 assert.equal(claimManagedFreight(s),false,'report cannot collect before the morning');
 morning(s);
 const beforeReceipt=copy(s.inventory);
 assert.equal(claimManagedFreight(s),true);
 assert.equal(claimManagedFreight(s),false);
 assert.equal(s.ledger.filter(x=>x.id==='managed-export-in-1').length,1);
 assert.equal(s.inventory.mushroom,(beforeReceipt.mushroom||0)+3);
 assert.equal(s.inventory.chicken,(beforeReceipt.chicken||0)+2);
 assert.equal(s.inventory.onion,(beforeReceipt.onion||0)+1);
});
test('only what the old warehouse owns can ship, and a pending cargo blocks additional shipping until claimed',()=>{
 const s=enterCloud(702,true),old=s.worlds.hearth;
 old.inventory.chili=1;old.inventory.garlic=0;old.inventory.onion=0;old.coins=25;
 assert.equal(configureManagedFreight(s,'spice'),true);
 cloudNight(s);morning(s);const r=cloudNight(s);
 assert.equal(r.managedFreight.total,1);
 assert.deepEqual(r.managedFreight.items,{chili:1});
 assert.equal(old.coins,15);
 morning(s);cloudNight(s);morning(s);cloudNight(s);
 assert.equal(s.worlds.hearth.ledger.filter(x=>x.type==='managed_export_out').length,1);
 assert.equal(s.managedFreight.pending.seq,1);
 morning(s);assert.equal(claimManagedFreight(s),true);
 assert.equal(s.inventory.chili,1);
});
test('insufficient Hearth gold or empty stock never costs gold or creates a shipment; next true close retries',()=>{
 const s=enterCloud(703,true),old=s.worlds.hearth;
 old.coins=9;old.inventory.beef=2;old.inventory.potato=0;old.inventory.chicken=0;
 assert.equal(configureManagedFreight(s,'hunt'),true);
 cloudNight(s);morning(s);cloudNight(s);
 assert.equal(s.managedFreight.days,2);assert.equal(s.managedFreight.pending,null);
 assert.equal(old.inventory.beef,2);assert.equal(old.coins,9);
 morning(s);old.coins=12;const r=cloudNight(s);
 assert.equal(r.managedFreight.total,2);
 assert.equal(old.coins,2);assert.equal(old.inventory.beef,0);
});
test('save/restore, chapter travel, non-Cloud days, old voucher and duplicate pending never fabricate goods',()=>{
 const originalStorage=globalThis.localStorage,store=new Map();
 globalThis.localStorage={setItem:(k,v)=>store.set(k,v),getItem:k=>store.get(k)};
 try{
  const s=enterCloud(704,true);
  s.worlds.hearth.inventory.mushroom=3;s.worlds.hearth.inventory.chicken=2;s.worlds.hearth.inventory.onion=1;s.worlds.hearth.coins=100;
  configureManagedFreight(s,'forest');
  cloudNight(s);morning(s);cloudNight(s);morning(s);
  const oldStock=copy(s.worlds.hearth.inventory),cloudStock=copy(s.inventory);
  save(s);const loaded=load();assert.ok(loaded);assert.equal(loaded.managedFreight.pending.total,6);
  assert.equal(claimManagedFreight(loaded),true);
  save(loaded);const reload=load();assert.ok(reload);
  assert.equal(claimManagedFreight(reload),false);
  assert.equal(reload.ledger.filter(x=>x.type==='managed_export_in').length,1);
  assert.deepEqual(reload.worlds.hearth.inventory,oldStock);
  assert.equal(reload.inventory.mushroom,(cloudStock.mushroom||0)+3);
  reload.managedFreight.pending={seq:1,focus:'forest',items:{mushroom:3},total:3};
  assert.equal(claimManagedFreight(reload),false);
  assert.equal(reload.managedFreight.pending,null);
  assert.equal(reload.inventory.mushroom,(cloudStock.mushroom||0)+3);
  reload.phase='upgrade';assert.equal(travelPortal(reload,'hearth'),true);
  assert.equal(configureManagedFreight(reload,'spice'),false);
  assert.equal(reload.managedFreight.pending,null);
  assert.equal(reload.worlds.cloud.inventory.mushroom,(cloudStock.mushroom||0)+3);
  assert.equal(reload.ferryCredits||0,0,'no extra real Hearth dinner has been credited');
 }finally{globalThis.localStorage=originalStorage;}
});
test('freight is ordinary border cargo only, keeps original world recipe limits and manual vouchers independent',()=>{
 const s=enterCloud(705,true);
 assert.equal(configureManagedFreight(s,'forest'),true);
 for(const p of Object.values(MANAGED_FREIGHT_FOCUS))for(const id of Object.keys(p.items))
  assert.ok(!['cloud_rice','sky_moss','storm_egg','sour_bell','gale_core','mushroom_heart'].includes(id));
 assert.equal(chapterRecipeAvailable(s,'chicken_stew'),false);
 assert.equal(chapterRecipeAvailable(s,'cloud_mushroom_moss'),true);
 assert.equal(s.ferryCredits||0,0);
 assert.equal(redeemFerrySupply(s,'forest'),false);
});

test('next shipment requires two more actual Cloud nights after receipt; pausing stops new escrow but preserves shipped parcel',()=>{
 const s=enterCloud(706,true),old=s.worlds.hearth;
 old.coins=80;old.inventory.mushroom=9;old.inventory.chicken=6;old.inventory.onion=4;
 assert.equal(configureManagedFreight(s,'forest'),true);
 cloudNight(s);morning(s);const first=cloudNight(s);
 assert.equal(first.managedFreight.seq,1);assert.equal(old.coins,70);
 morning(s);assert.equal(claimManagedFreight(s),true);
 // A single new closing after receipt cannot send a second batch.
 cloudNight(s);assert.equal(s.managedFreight.pending,null);
 morning(s);const next=cloudNight(s);
 assert.equal(next.managedFreight.seq,2);
 assert.equal(old.coins,60);
 assert.equal(old.ledger.filter(x=>x.type==='managed_export_out').length,2);
 assert.equal(configureManagedFreight(s,'off'),false,'must not change dispatch settings during report');
 morning(s);assert.equal(configureManagedFreight(s,'off'),true);
 const priorShipments=old.ledger.filter(x=>x.type==='managed_export_out').length;
 cloudNight(s);morning(s);cloudNight(s);
 assert.equal(old.ledger.filter(x=>x.type==='managed_export_out').length,priorShipments);
 morning(s);assert.equal(claimManagedFreight(s),true,'already shipped cargo remains collectible while suspended');
 assert.equal(s.ledger.filter(x=>x.type==='managed_export_in').length,2);
 assert.equal(s.managedFreight.pending,null);
});
