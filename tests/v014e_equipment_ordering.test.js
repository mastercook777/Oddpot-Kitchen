import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {RECIPES} from '../src/data.js';
import {newGame,ensureKitchen,buyGrill,buyCookwareUpgrade,cookwareUpgradeCost,
 configureKitchenSlot,fieldWeaponChoices,selectFieldWeapon,enterField,stationDuration,
 createService,recipeCraftSnapshot,selectArrivalDish,markManual,setServicePaused,tick,resumeBreak} from '../src/engine.js';
import {startActionField,stepActionField,inForkFlameCone} from '../src/field_v04.js';

function owned(){
 const s=newGame(1405);s.phase='upgrade';s.chapterProgress.stars=2;
 s.kitchen.thirdUnlocked=true;s.kitchen.slots.push({type:'WOK',level:1});s.coins=1000;
 assert.equal(buyGrill(s),true);return s;
}
test('legacy saves keep their grill position; purchase and shared level persist through all three refits',()=>{
 const s=owned(),k=ensureKitchen(s);s.phase='prep';
 assert.equal(configureKitchenSlot(s,2,'GRILL'),true);
 delete k.mastery.GRILL;assert.equal(ensureKitchen(s).mastery.GRILL,1);
 s.phase='upgrade';const before=s.coins;
 assert.equal(cookwareUpgradeCost(s,'GRILL'),90);
 assert.equal(buyCookwareUpgrade(s,'GRILL'),true);
 assert.equal(s.coins,before-90);assert.equal(buyCookwareUpgrade(s,'GRILL'),false);
 assert.equal(s.ledger.filter(x=>x.id==='cookware-upgrade-GRILL').length,1);
 assert.equal(k.slots[2].level,2);
 s.phase='prep';assert.equal(configureKitchenSlot(s,0,'GRILL'),true);
 assert.equal(configureKitchenSlot(s,1,'GRILL'),true);
 assert.deepEqual(k.slots.map(x=>x.level),[2,2,2]);
 assert.equal(fieldWeaponChoices(s).find(x=>x.type==='GRILL').level,2);
 assert.equal(configureKitchenSlot(s,0,'WOK'),true);
 assert.equal(configureKitchenSlot(s,1,'POT'),true);
 assert.equal(configureKitchenSlot(s,2,'WOK'),true);
 assert.equal(fieldWeaponChoices(s).find(x=>x.type==='GRILL').level,2,'reserve weapon keeps its purchased mastery');
 assert.equal(configureKitchenSlot(s,1,'GRILL'),true);assert.equal(k.slots[1].level,2);
 assert.equal(stationDuration(s,'POT',RECIPES.grill_beef,null),RECIPES.grill_beef.time-2);
 const old=newGame();assert.equal(cookwareUpgradeCost(old,'GRILL'),null);
});

test('all three physical positions execute a real grill order and level saves two seconds',()=>{
 for(const i of [0,1,2]){
  const s=owned();s.phase='prep';assert.equal(configureKitchenSlot(s,i,'GRILL'),true);
  s.menu=['grill_beef'];s.recipes.grill_beef=85;
  s.crew.helper2={hired:true,onDuty:true,station:i,level:1,xp:0};
  for(const id of Object.keys(s.inventory))s.inventory[id]=100;
  const raw=RECIPES.grill_beef;
  assert.equal(stationDuration(s,['WOK','POT','CENTER'][i],raw,null),raw.time);
  s.phase='service';assert.equal(createService(s,{walkable:true}),true);
  const v=s.service,o=v.orders[0];o.recipeId='grill_beef';o.status='queued';o.arrival=0;o.patience=1000;
  o.craft=recipeCraftSnapshot(s,'grill_beef');v.queued.push(o.id);
  assert.equal(markManual(s,o.id),false);assert.equal(setServicePaused(s,false),true);
  for(let t=0;t<110&&!v.done;t++){if(v.breakAt)resumeBreak(s);tick(s,1)}
  const station=['WOK','POT','CENTER'][i];
  assert.ok(v.events.some(e=>e.type==='started'&&e.order===o.id&&e.station===station),station);
  assert.equal(s.ledger.filter(e=>e.id==='service-cook-'+o.id).length,1);
  assert.equal(s.ledger.filter(e=>e.id==='sale-'+o.id).length,1);
 }
});

test('fork Lv2 has discernible attack cadence, target reach and flame reach without changing old run snapshot',()=>{
 const s=owned();s.phase='field';assert.equal(selectFieldWeapon(s,'GRILL'),true);assert.equal(enterField(s,'safe'),true);
 assert.equal(s.field.weapon.level,1);startActionField(s);
 s.field.pos={x:4,y:5};s.field.obstacles=[];s.field.enemies=[{id:'dummy',kind:'chicken',x:5,y:5,hp:30,maxHp:30,cooldown:100,phase:0}];
 stepActionField(s,.01);assert.equal(s.field.attackCd,.88);
 const current=s.field.weapon;
 s.phase='upgrade';assert.equal(buyCookwareUpgrade(s,'GRILL'),true);
 assert.equal(s.field.weapon,current);assert.equal(current.level,1,'in-progress expedition is frozen');
 assert.equal(inForkFlameCone({x:0,y:0},{x:1,y:0},{x:2.9,y:0},1),false);
 assert.equal(inForkFlameCone({x:0,y:0},{x:1,y:0},{x:2.9,y:0},2),true);
 const upgraded=owned();assert.equal(buyCookwareUpgrade(upgraded,'GRILL'),true);
 upgraded.phase='field';assert.equal(selectFieldWeapon(upgraded,'GRILL'),true);assert.equal(enterField(upgraded,'safe'),true);
 startActionField(upgraded);upgraded.field.pos={x:4,y:5};upgraded.field.obstacles=[];
 upgraded.field.enemies=[{id:'dummy',kind:'chicken',x:5,y:5,hp:30,maxHp:30,cooldown:100,phase:0}];
 stepActionField(upgraded,.01);assert.equal(upgraded.field.attackCd,.72);
});

test('grill meat gains a limited real affinity; expensive quality can still lose to a cheaper meat dish',()=>{
 for(const id of Object.keys(RECIPES).filter(id=>RECIPES[id].station==='GRILL'))assert.ok(RECIPES[id].tags.includes('炭香'));
 for(const [quality,favorite] of [[85,'grill_beef'],[100,'chili_meat']]){
  const s=newGame(29);s.menu=['grill_beef','chili_meat'];s.recipes.chili_meat=85;s.recipes.grill_beef=quality;
  const orders=Array.from({length:120},(_,i)=>{const o={id:'day-'+quality+'-'+i,segment:'adventurer'};selectArrivalDish(s,o);return o.recipeId});
  assert.ok(orders.includes(favorite),'preferred option must remain a real choice');
  assert.ok(orders.some(id=>id!==favorite),'near-fit alternative should sometimes be ordered instead');
 }
 const s=newGame(29);s.menu=['grill_beef','chili_meat'];s.recipes.chili_meat=85;s.recipes.grill_beef=85;
 const family=Array.from({length:120},(_,i)=>{const o={id:'family-'+i,segment:'family'};selectArrivalDish(s,o);return o.recipeId});
 assert.ok(family.filter(id=>id==='chili_meat').length>60,'meat affinity is for adventurers, not the family');
});

test('exploration uses equipped silhouettes instead of the generic raised-arm tool; all worktops share width',()=>{
 const scene=readFileSync(new URL('../src/scenes_v04.js',import.meta.url),'utf8');
 assert.match(scene,/chef\(c,0,Math\.sin\(clock\*9\).*walk:f\.moving,face:chefFace/);
 assert.doesNotMatch(scene,/walk:f\.moving,attack:!!f\.attackFx/);
 assert.match(scene,/rw=Math\.min\(58,w\*\.168\)/);
 assert.doesNotMatch(scene,/rw=Math\.min\(i===2\?/);
});
