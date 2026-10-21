import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 newGame,travelPortal,activeWorld,steamerAvailable,buySteamer,buyCookwareUpgrade,
 cookwareUpgradeCost,ensureKitchen,fieldWeaponChoices,fieldWeaponSnapshot,
 selectedFieldWeaponType,selectFieldWeapon,enterField,save,load,configureKitchenSlot
} from '../src/engine.js';
import {startActionField,useFieldSkill} from '../src/field_v04.js';
import {
 STEAM_COMBAT,steamPulseStats,steamPulseTargets,startSteamMist,stepSteamMist,steamMistContains
} from '../src/field_steam_v015e.js';
const makeCloud=()=>{
 const s=newGame(15152);s.chapterProgress.stars=3;s.phase='forecast';
 assert.equal(travelPortal(s,'cloud'),true);assert.equal(activeWorld(s),'cloud');
 s.cloudProgress.explored=true;s.coins=400;s.phase='upgrade';
 return s;
};
test('Cloud steamer is a real 85+95 coin pair of ledgered transactions and a local Lv2 type',()=>{
 const s=makeCloud();
 assert.equal(cookwareUpgradeCost(s,'STEAM'),null,'purchase must precede upgrade');
 assert.equal(steamerAvailable(s),true);assert.equal(buySteamer(s),true);
 assert.equal(s.coins,315);
 assert.equal(cookwareUpgradeCost(s,'STEAM'),95);
 assert.equal(buyCookwareUpgrade(s,'STEAM'),true);
 assert.equal(s.coins,220);assert.equal(ensureKitchen(s).mastery.STEAM,2);
 assert.equal(buyCookwareUpgrade(s,'STEAM'),false);
 assert.equal(s.ledger.filter(x=>x.id==='cloud-steamer').length,1);
 assert.equal(s.ledger.filter(x=>x.id==='cookware-upgrade-STEAM').length,1);
 assert.equal(cookwareUpgradeCost(s,'STEAM'),null);
});
test('upgraded fitted STEAM slot has Lv2 and in-progress kitchen snapshots remain untouched',()=>{
 const s=makeCloud();buySteamer(s);
 s.phase='prep';assert.equal(configureKitchenSlot(s,1,'STEAM'),true);
 s.phase='upgrade';const before=structuredClone(ensureKitchen(s).slots);
 // Simulate an already-started service snapshot (source of job durations).
 s.service={kitchenSnapshot:structuredClone(before)};
 assert.equal(buyCookwareUpgrade(s,'STEAM'),true);
 assert.equal(ensureKitchen(s).slots[1].level,2);
 assert.equal(s.service.kitchenSnapshot[1].level,1,'frozen service keeps its old rate');
 const source=readFileSync(new URL('../src/engine.js',import.meta.url),'utf8');
 assert.match(source,/const bonus=\(slot\.level-1\)\*2/,'live service uses actual frozen slot level for -2 seconds');
});
test('Cloud stock steamer can be selected as a spare weapon and return travel preserves isolated mastery',()=>{
 const s=makeCloud();buySteamer(s);buyCookwareUpgrade(s,'STEAM');
 s.phase='field';
 const choices=fieldWeaponChoices(s),steam=choices.find(x=>x.type==='STEAM');
 assert.equal(steam.level,2);assert.equal(steam.fitted,false);
 assert.equal(selectFieldWeapon(s,'STEAM'),true);
 assert.equal(selectedFieldWeaponType(s),'STEAM');
 assert.deepEqual(fieldWeaponSnapshot(s).attackId,'mist_pulse');
 assert.deepEqual(fieldWeaponSnapshot(s).skillId,'mist_field');
 assert.equal(enterField(s,'cloud_safe'),true);
 assert.equal(s.field.weapon.type,'STEAM');assert.equal(s.field.weapon.level,2);
 assert.equal(s.field.weapon.source,'reserve');
 // Equipment is frozen at departure, independently from newly configured slots.
 ensureKitchen(s).mastery.STEAM=1;
 assert.equal(s.field.weapon.level,2);
 s.field=null;s.phase='upgrade';
 // restore the real upgrade level to verify cross-chapter persistence.
 ensureKitchen(s).mastery.STEAM=2;
 assert.equal(travelPortal(s,'hearth'),true);assert.equal(fieldWeaponChoices(s).some(x=>x.type==='STEAM'),false);
 assert.equal(cookwareUpgradeCost(s,'STEAM'),null);
 assert.equal(travelPortal(s,'cloud'),true);
 assert.equal(ensureKitchen(s).mastery.STEAM,2);
});
test('an existing Cloud purchased steamer save migrates to a paid Lv2, without auto-bonus',()=>{
 const original=globalThis.localStorage,store=new Map();
 globalThis.localStorage={setItem:(k,v)=>store.set(k,v),getItem:k=>store.get(k)};
 try{
  const s=makeCloud();buySteamer(s);save(s);
  const restored=load();
  assert.equal(ensureKitchen(restored).mastery.STEAM,1);
  assert.equal(restored.kitchen.steamerOwned,true);
  assert.equal(cookwareUpgradeCost(restored,'STEAM'),95);
  assert.equal(buyCookwareUpgrade(restored,'STEAM'),true);
 }finally{globalThis.localStorage=original}
});
test('mist pulse always caps two enemies, prioritises distance, cannot penetrate obstacles',()=>{
 const f={pos:{x:4,y:4},weapon:{type:'STEAM',level:1},enemies:[
  {id:'a',x:4.4,y:4,hp:3},{id:'b',x:4.8,y:4,hp:3},{id:'c',x:5.1,y:4,hp:3},{id:'dead',x:4.1,y:4,hp:0}
 ]};
 assert.deepEqual(steamPulseTargets(f).map(e=>e.id),['a','b']);
 assert.deepEqual(steamPulseTargets(f,(from,e)=>e.id!=='a').map(e=>e.id),['b','c']);
 assert.deepEqual(steamPulseStats(1),{range:1.6,cooldown:.96,slow:.9,targets:2});
 assert.deepEqual(steamPulseStats(2),{range:1.9,cooldown:.78,slow:1.25,targets:2});
});
test('persistent mist slows inside its unique static world area, lasts by weapon level and then expires',()=>{
 const f={pos:{x:4,y:4},weapon:{level:2,type:'STEAM'}};
 startSteamMist(f);
 assert.equal(f.steamMist.ttl,3.4);assert.equal(f.steamMist.radius,2.15);
 assert.equal(steamMistContains(f.steamMist,{x:5.3,y:4}),true);
 assert.equal(steamMistContains(f.steamMist,{x:7,y:4}),false);
 const initial={x:f.steamMist.x,y:f.steamMist.y};
 f.pos={x:9,y:9};
 stepSteamMist(f,1);assert.deepEqual({x:f.steamMist.x,y:f.steamMist.y},initial);
 stepSteamMist(f,2.41);assert.equal(f.steamMist,null);
 assert.equal(STEAM_COMBAT.mistSlowTick,.24);
});
test('real field skill works with no enemy and creates control area, unlike the pot target requirement',()=>{
 const s=makeCloud();buySteamer(s);
 s.phase='field';assert.equal(selectFieldWeapon(s,'STEAM'),true);
 assert.equal(enterField(s,'cloud_safe'),true);
 assert.equal(startActionField(s),true);
 assert.equal(s.field.weapon.type,'STEAM');
 s.field.enemies=[];
 assert.equal(useFieldSkill(s),true);
 assert.equal(s.field.skillCd,6.5);
 assert.equal(s.field.steamMist.ttl,2.8);
 assert.equal(useFieldSkill(s),false,'cannot double-cast before cooldown');
});
test('Cloud assets have their own furniture shapes, station and field FX in main and offline entry',()=>{
 const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
 const scene=read('src/scenes_v04.js'),art=read('src/cloud_diner_assets_v015e.js'),
  fx=read('src/field_steam_visuals_v015e.js'),offline=read('standalone.html');
 assert.match(scene,/drawCloudCrystalTable\(c,X,Y,side,t,i\)/);
 assert.match(scene,/drawCloudSteamerStation\(c,X,Y,rw,t/);
 assert.match(scene,/drawCloudPortProps\(c,t,w,h\)/);
 assert.match(scene,/drawSteamMistField\(c,f,clock\)/);
 assert.match(scene,/drawPixelSteamBasket\(c,f,\{layer:'front'\}\)/);
 assert.match(art,/悬|云港|港口|sailing|Cloud|freight|harbour|港口/);
 assert.match(art,/poly\(c,\[\[X,Y-half-11\]/);
 assert.match(fx,/fillRect\(x,y,w,h\)/);
 assert.match(offline,/function drawCloudCrystalTable/);
 assert.match(offline,/function drawPixelSteamBasket/);
 assert.match(offline,/function steamPulseTargets/);
 assert.match(offline,/v0\.15\.0-alpha\.5 离线版/);
});
