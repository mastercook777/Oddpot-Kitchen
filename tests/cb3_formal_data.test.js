import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,stageCB3Migration,discardCB3Migration,cb3MigrationCurrent,recipeCraftSnapshot} from '../src/engine.js';
import {evaluateCBDeck,compileCBDeck,identify} from '../src/cb_build_rules.js?v=cb3a2';
import {fixture,budget,applyDeck,identify as workshopIdentify} from '../src/cooking_build_v2.js';
test('formal staging preserves original data and historical economic values, no activation',()=>{
 const s=newGame(),before=structuredClone(s);
 assert.equal(stageCB3Migration(s).status,'staged');const b=s.cbBuild;
 assert.equal(b.collection.length,3);assert.equal(b.chapters.hearth.needsReview,false);
 for(const v of b.collection){const old=recipeCraftSnapshot(structuredClone(before),v.oldId);assert.equal(v.rarity,1);assert.deepEqual(v.affixes,[]);assert.deepEqual(v.legacySnapshot,old);assert.equal(b.chapters.hearth.crafts[v.recipeId].price,old.price);}
 const {cbBuild,...untouched}=s;assert.deepEqual(untouched,before);assert.equal(s.cbExperiment,undefined);
 assert.equal(cb3MigrationCurrent(s),true);const serialized=JSON.stringify(s);assert.equal(stageCB3Migration(s).status,'staged');assert.equal(JSON.stringify(s),serialized);
 const reload=JSON.parse(serialized);assert.equal(cb3MigrationCurrent(reload),true);reload.menu.reverse();assert.equal(stageCB3Migration(reload).status,'stale');assert.equal(discardCB3Migration(reload),true);assert.deepEqual(reload.menu,[...before.menu].reverse());
 assert.equal(discardCB3Migration(s),true);assert.deepEqual(s,before);
});
test('unsafe boundary, experimental fixtures, and dormant chapter review',()=>{
 for(const patch of [{phase:'research'},{service:{}},{cook:{}},{premiumMenu:{}},{bento:{}},{field:{settled:false}},{prep:{veg_stir:1}}]){const s={...newGame(),...patch},old=structuredClone(s);assert.equal(stageCB3Migration(s).status,'unsafe');assert.deepEqual(s,old);}
 const f=fixture();assert.equal(stageCB3Migration(f).status,'experiment');assert.equal(f.cbBuild,undefined);
 const s=newGame();s.menu=['mushroom_stir','mushroom_stir','veg_stir'];s.worlds={cloud:{phase:'service',menu:['mushroom_stir'],service:{orders:[]},kitchen:{slots:[{type:'WOK'}]}}};
 assert.equal(stageCB3Migration(s).status,'staged');assert.equal(s.cbBuild.chapters.hearth.needsReview,true);assert.equal(s.cbBuild.chapters.cloud.needsReview,true);assert.deepEqual(s.cbBuild.chapters.cloud.deck,[null]);assert.deepEqual(s.cbBuild.discoveredRecipes,[]);
});
test('workshop uses exactly the same shared identification, deck and snapshot functions',()=>{
 assert.equal(workshopIdentify,identify);
 for(const level of [1,2,3,4]){const s=fixture({level});const deck=s.cbExperiment.deck;const b=budget(s,deck),shared=evaluateCBDeck(s.cbExperiment.collection,deck,level,v=>s.kitchen.slots.some(k=>k.type===v.vessel));assert.deepEqual(b,shared);assert.ok(applyDeck(s,deck));assert.deepEqual(s.cbExperiment.crafts,compileCBDeck(b.variants));}
});
