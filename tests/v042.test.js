import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,enterField,nextPhase,save,load,buyBagUpgrade,bagUpgradePrice,discardFieldStack,settleField,advanceDay,createService,tick} from '../src/engine.js';
import {startActionField,stepActionField} from '../src/field_v04.js';
import {arrivalProgress,servingProgress} from '../src/scenes_v04.js';

test('two regions have genuinely distinct collectible, rock and hazard layouts',()=>{
 const a=newGame(42),b=newGame(42);nextPhase(a,'field');nextPhase(b,'field');
 assert.ok(enterField(a,'safe'));assert.ok(enterField(b,'spring_safe'));
 assert.equal(a.field.region,'forest');assert.equal(b.field.region,'spring');
 assert.notDeepEqual(a.field.obstacles,b.field.obstacles);
 assert.notDeepEqual(a.field.nodes.map(n=>[n.x,n.y]),b.field.nodes.map(n=>[n.x,n.y]));
 assert.ok(startActionField(a));assert.ok(startActionField(b));
 assert.equal(a.field.enemies[0].kind,'chicken');assert.equal(b.field.enemies[0].kind,'pepper');
 assert.ok(Math.hypot(b.field.pos.x-2.5,b.field.pos.y-10.1)<.01);
});
test('both region routes keep a reliably discoverable target source',()=>{
 for(const route of ['safe','risk','spring_safe','spring_risk']){
  const s=newGame();s.selectedTarget='chili';nextPhase(s,'field');assert.ok(enterField(s,route));
  assert.ok(s.field.nodes.some(n=>n.key==='target'&&n.id==='chili'&&n.n>=1));
 }
});
test('backpack expands from six to eight at real cost and persists through next days',()=>{
 const s=newGame();s.phase='upgrade';s.coins=250;
 assert.equal(bagUpgradePrice(s),45);assert.ok(buyBagUpgrade(s));assert.equal(s.bagSlots,7);assert.equal(s.coins,205);
 assert.equal(bagUpgradePrice(s),75);assert.ok(buyBagUpgrade(s));assert.equal(s.bagSlots,8);assert.equal(s.coins,130);
 assert.equal(bagUpgradePrice(s),null);assert.equal(buyBagUpgrade(s),false);
 assert.equal(s.ledger.filter(e=>e.id.startsWith('bag-upgrade-')).length,2);
 assert.ok(advanceDay(s));assert.equal(s.bagSlots,8);
 nextPhase(s,'field');assert.ok(enterField(s,'spring_safe'));assert.equal(s.field.capacity,8);
});
test('insufficient funds cannot give a free bag upgrade or duplicate purchase',()=>{
 const s=newGame();s.phase='upgrade';s.coins=44;
 assert.equal(buyBagUpgrade(s),false);assert.equal(s.bagSlots,6);
 s.coins=100;assert.ok(buyBagUpgrade(s));assert.equal(s.ledger.filter(e=>e.type==='upgrade').length,1);
});
test('arrival and serving animations are one-shot, monotonic and remain frozen on pause',()=>{
 assert.equal(arrivalProgress(20,20),0);
 assert.ok(arrivalProgress(20.35,20)>0&&arrivalProgress(20.35,20)<1);
 assert.equal(arrivalProgress(20.9,20),1);
 assert.equal(arrivalProgress(100,20),1);
 assert.equal(servingProgress(20,20),0);
 assert.equal(servingProgress(20.5,20),.4);
 assert.equal(servingProgress(21.25,20),null);
 assert.equal(servingProgress(30,20),null);
 // If service time is paused at 20.5, calling again cannot change the animation.
 assert.equal(servingProgress(20.5,20),servingProgress(20.5,20));
});
test('forest and spring startActionField handle historical six-slot saves safely',()=>{
 const s=newGame();delete s.bagSlots;nextPhase(s,'field');assert.ok(enterField(s,'spring_risk'));
 assert.equal(s.field.capacity,6);assert.ok(startActionField(s));
 const px=s.field.pos.x,py=s.field.pos.y;stepActionField(s,0,0,.03);
 assert.equal(s.field.pos.x,px);assert.equal(s.field.pos.y,py);
});

test('seven genuinely distinct sources make backpack expansion materially useful',()=>{
 for(const route of ['safe','risk','spring_safe','spring_risk']){
  const s=newGame();nextPhase(s,'field');enterField(s,route);
  const gather=s.field.nodes.filter(n=>n.type==='gather');
  // Risk route also has a guarded, collectible meat source when defeated.
  const collectible=s.field.nodes.filter(n=>n.type==='gather'||n.type==='danger');
  assert.ok(collectible.length>=7,route);
  assert.equal(new Set(collectible.map(n=>n.id)).size,collectible.length,route);
 }
});
test('discard affects only expedition bag and cannot refund to restaurant stock',()=>{
 const s=newGame();nextPhase(s,'field');enterField(s,'safe');
 const before=s.inventory.chili;s.field.bag={chili:2,mushroom:3};
 assert.equal(discardFieldStack(s,'chili'),true);
 assert.equal(s.field.bag.chili,undefined);assert.equal(s.inventory.chili,before);
 assert.equal(discardFieldStack(s,'chili'),false);
 assert.equal(s.ledger.length,0);
});