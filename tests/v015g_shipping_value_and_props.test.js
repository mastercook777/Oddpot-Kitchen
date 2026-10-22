import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 newGame,activeWorld,travelPortal,redeemFerrySupply,ferrySupplyAvailable,FERRY_SUPPLY_PACKS,
 save,load,advanceDay,closeService,createService,setServicePaused,tick,resumeBreak
} from '../src/engine.js';

function cloud(seed=157){const s=newGame(seed);s.chapterProgress.stars=3;s.phase='forecast';assert.equal(travelPortal(s,'cloud'),true);return s;}
const count=pack=>Object.values(pack.items).reduce((n,x)=>n+x,0);

test('three freight choices are real Cloud pantry ingredients, each a larger eight-portion pack',()=>{
 assert.deepEqual(Object.keys(FERRY_SUPPLY_PACKS),['staple','steamer','tangy']);
 for(const pack of Object.values(FERRY_SUPPLY_PACKS)){
  assert.equal(count(pack),8);
  assert.ok(Object.keys(pack.items).length>=3);
  for(const [id,n] of Object.entries(pack.items)){
   assert.ok(['cloud_rice','sky_moss','storm_egg','sour_bell'].includes(id),'no boss, currency or original shop ingredients');
   assert.ok(Number.isInteger(n)&&n>0);
  }
 }
});
for(const [id,pack] of Object.entries(FERRY_SUPPLY_PACKS)){
 test('freight '+id+' redeems once with exact eight items, ledger and zero currency movement',()=>{
  const s=cloud();s.ferryCredits=2;s.phase='forecast';
  const old=structuredClone(s.inventory),coins=s.coins,ledgerBefore=s.ledger.length;
  assert.equal(ferrySupplyAvailable(s),true);
  assert.equal(redeemFerrySupply(s,id),true);
  assert.equal(s.ferryCredits,1);assert.equal(s.coins,coins);
  for(const [item,n] of Object.entries(pack.items))assert.equal(s.inventory[item],(old[item]||0)+n,item);
  const entry=s.ledger.find(x=>x.id==='ferry-supply-1-1');
  assert.ok(entry);assert.equal(entry.type,'ferry_supply');assert.equal(entry.packId,id);
  assert.deepEqual(entry.items,pack.items);
  assert.equal(s.ledger.length,ledgerBefore+1);
  assert.equal(redeemFerrySupply(s,id),false);assert.equal(s.ferryCredits,1);
  assert.equal(s.ledger.filter(x=>x.id==='ferry-supply-1-1').length,1);
  assert.equal(ferrySupplyAvailable(s),false);
 });
}
test('invalid pack, original world, no voucher, unsafe stage or active field cannot redeem or modify stock',()=>{
 const s=cloud();s.ferryCredits=1;s.phase='forecast';
 const before=JSON.stringify(s);
 assert.equal(redeemFerrySupply(s,'__proto__'),false);
 assert.equal(redeemFerrySupply(s,'nonexistent'),false);
 assert.equal(JSON.stringify(s),before);
 s.phase='service';assert.equal(redeemFerrySupply(s,'staple'),false);
 s.phase='field';s.field={settled:false};assert.equal(redeemFerrySupply(s,'staple'),false);
 s.field={settled:true};assert.equal(redeemFerrySupply(s,'staple'),true);
 s.phase='upgrade';assert.equal(travelPortal(s,'hearth'),true);
 assert.equal(redeemFerrySupply(s,'steamer'),false);
 assert.equal(activeWorld(s),'hearth');
});
test('older 3-item redemptions remain spent today, unspent legacy vouchers remain redeemable at new amounts tomorrow',()=>{
 const s=cloud();s.phase='forecast';s.ferryCredits=2;
 s.ledger.push({id:'ferry-supply-1-1',type:'ferry_supply',items:{cloud_rice:2,sky_moss:1},amount:0});
 const before={...s.inventory};
 assert.equal(redeemFerrySupply(s,'steamer'),false);
 assert.deepEqual(s.inventory,before);assert.equal(s.ferryCredits,2);
 s.phase='upgrade';assert.equal(advanceDay(s),true);
 assert.equal(redeemFerrySupply(s,'steamer'),true);
 assert.equal(s.ferryCredits,1);
 assert.equal(s.inventory.storm_egg,(before.storm_egg||0)+3);
});
test('cross-world journeys and old save serialization never duplicate a voucher or cloud cargo',()=>{
 const s=cloud();s.ferryCredits=2;s.phase='forecast';
 assert.equal(redeemFerrySupply(s,'tangy'),true);
 const once=structuredClone(s.inventory);
 s.phase='upgrade';assert.equal(travelPortal(s,'hearth'),true);
 assert.equal(s.ferryCredits,1);
 s.phase='upgrade';assert.equal(travelPortal(s,'cloud'),true);
 assert.deepEqual(s.inventory,once);
 s.phase='forecast';assert.equal(redeemFerrySupply(s,'staple'),false);
 const storage=globalThis.localStorage,map=new Map();
 globalThis.localStorage={setItem:(k,v)=>map.set(k,v),getItem:k=>map.get(k)};
 try{
  save(s);const restored=load();assert.ok(restored);
  assert.equal(restored.ferryCredits,1);assert.deepEqual(restored.inventory,once);
  assert.equal(redeemFerrySupply(restored,'staple'),false);
  restored.phase='upgrade';assert.equal(advanceDay(restored),true);
  assert.equal(redeemFerrySupply(restored,'staple'),true);
 }finally{globalThis.localStorage=storage;}
});
test('one actual sale in old restaurant earns precisely one ticket; no sale cannot mint one',()=>{
 const s=cloud();s.phase='upgrade';assert.equal(travelPortal(s,'hearth'),true);
 s.inventory=Object.fromEntries(Object.keys(s.inventory).map(id=>[id,100]));
 s.phase='service';assert.equal(createService(s),true);setServicePaused(s,false);
 for(let i=0;i<160&&!s.service.done;i++){if(s.service.breakAt)resumeBreak(s);tick(s,1)}
 const result=closeService(s);assert.ok(result?.served>0);assert.equal(s.ferryCredits,1);
 assert.equal(closeService(s),false);
 assert.equal(s.ledger.filter(x=>x.type==='ferry_commission').length,1);
 s.phase='upgrade';assert.equal(travelPortal(s,'cloud'),true);
 s.phase='forecast';assert.equal(redeemFerrySupply(s,'steamer'),true);
 assert.equal(s.inventory.storm_egg>=4,true,'old shop real meal becomes meaningful Cloud-local steam supply');
});
test('four screenshots pillars are NOT grill: remove exact inert wall loop in both worlds and offline mirror',()=>{
 const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
 const source=read('src/scenes_v04.js'),offline=read('standalone.html');
 for(const s of [source,offline]){
  assert.doesNotMatch(s,/x\(\.15\+i\*\.055\)-5,y\(\.185\)/);
  assert.match(s,/for\(const \[i,key\] of/,'actual kitchen stations still drawn');
  assert.match(s,/drawCloudPortProps\(c,t,w,h\)/,'cloud identity unaffected');
  assert.match(s,/Low, horizontal charcoal rack/);
 }
 assert.match(read('src/app.js'),/v015-ferry-packs/);
 assert.match(offline,/const FERRY_SUPPLY_PACKS/);
 assert.match(offline,/function redeemFerrySupply\(s,packId='staple'\)/);
});
