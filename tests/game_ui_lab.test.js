import test from 'node:test';
import assert from 'node:assert/strict';
import {labFixture,labOffers,labBuy,labProject,labNextHint} from '../src/game_ui_lab_state.js';
test('workshop progression reveals actual current opportunities and hides completed items',()=>{
 const early=labFixture('early');assert.deepEqual(labOffers(early).map(x=>x.id).sort(),['bag','cook:POT','cook:WOK']);
 assert.match(labNextHint(early),/第三张/);
 assert.equal(labBuy(early,'table'),false);assert.equal(early.coins,120);
 assert.equal(labBuy(early,'cook:WOK'),true);assert.equal(early.coins,60);assert.equal(early.kitchen.mastery.WOK,2);
 assert.ok(!labOffers(early).some(x=>x.id==='cook:WOK'));assert.equal(labBuy(early,'cook:WOK'),false);
 const first=labFixture('star'),cost=labOffers(first).find(x=>x.id==='table').cost,before=first.coins;
 assert.equal(labBuy(first,'table'),true);assert.equal(first.dining.tableCount,4);assert.equal(first.coins,before-cost);
 assert.ok(!labOffers(first).some(x=>x.id==='table'));assert.ok(labOffers(first).some(x=>x.id==='third'&&!x.affordable));
 assert.equal(labBuy(first,'third'),false);assert.equal(first.coins,before-cost);
 const advanced=labFixture('advanced');assert.ok(labOffers(advanced).some(x=>x.id==='grill'));
 assert.equal(labBuy(advanced,'grill'),true);assert.ok(!labOffers(advanced).some(x=>x.id==='grill'));
 assert.equal(labBuy(advanced,'bag'),true);assert.equal(labBuy(advanced,'bag'),true);assert.equal(advanced.bagSlots,12);assert.ok(!labOffers(advanced).some(x=>x.id==='bag'));
 assert.equal(labFixture('early').coins,120);
});
test('projected hotspot stays on the scene for representative portrait screens',()=>{
 for(const [w,h] of [[320,568],[375,667],[390,844]])for(const preset of ['early','star','advanced'])for(const o of labOffers(labFixture(preset)).filter(o=>o.at)){
 const p=labProject(o.at,w,h);assert.ok(p.x>=28&&p.x<=w-28&&p.y>=90&&p.y<=h-110);
 }
});
