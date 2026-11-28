import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CB_FORMULAS} from '../src/cooking_formulas_p1.js';
import {CB3_LEGACY_INDEX,cb3MapLegacyCraft,cb3SafeBoundary,cb3MigrationPlan} from '../src/cb3_migration_a1.js';
import {newGame,inspectCB3Migration} from '../src/engine.js';
const catalog=JSON.parse(readFileSync(new URL('../docs/CB2_P0_RECIPE_CATALOG.json',import.meta.url),'utf8'));
test('CB3 migration index matches every approved legacy mapping and formula',()=>{
 assert.equal(Object.keys(CB3_LEGACY_INDEX).length,198);assert.equal(Object.keys(CB_FORMULAS).length,177);
 for(const row of catalog.legacyRecipes){
  const indexed=CB3_LEGACY_INDEX[row.oldId];for(const field of ['signature','world','decision','recipeId','formulaId'])assert.equal(indexed[field],row[field]);
  const out=cb3MapLegacyCraft(row.oldId);assert.equal(out.status,row.decision==='retire'?'retired':'mapped');
  if(out.status==='mapped'){assert.equal(out.recipeId,row.recipeId);assert.equal(out.formulaId,row.formulaId);}
 }
});
test('CB3 migration uses real craft ingredients and preserves historical snapshot',()=>{
 const craft={variantId:'legacy-custom',ingredientIds:['mushroom','onion'],quality:92,price:99,style:'old'};
 const out=cb3MapLegacyCraft('mushroom_stir',craft);assert.equal(out.formulaId,'mushroom_stir@mushroom,onion');assert.deepEqual(out.history,craft);
 out.history.quality=1;assert.equal(craft.quality,92);
 assert.equal(cb3MapLegacyCraft('mushroom_stir',{ingredientIds:['beef','chicken']}).status,'retired');
 assert.equal(cb3MapLegacyCraft('unknown-recipe').status,'unknown');
});
test('CB3 audit is read-only, repeatable and protects unsettled chapters',()=>{
 const s=newGame();s.menu=['mushroom_stir','mushroom_stir','veg_stir'];s.worlds={cloud:{phase:'service',service:{orders:[]},menu:['mushroom_stir']}};
 const old=JSON.stringify(s);const plan=inspectCB3Migration(s);assert.deepEqual(plan,cb3MigrationPlan(s));assert.equal(JSON.stringify(s),old);
 assert.equal(plan.safeBoundary,true);assert.equal(plan.worlds.hearth.needsReview,true);assert.deepEqual(plan.worlds.hearth.duplicateRecipeIds,['mushroom_stir']);
 assert.equal(plan.worlds.cloud.safeBoundary,false);assert.equal(plan.worlds.cloud.menu[0].eligible,false);
 for(const patch of [{phase:'research'},{cook:{}},{service:{}},{field:{settled:false}},{prep:{mushroom_stir:1}},{prepVariants:{mushroom_stir:[{}]}},{premiumMenu:{}},{bento:{}}])assert.equal(cb3SafeBoundary({...s,...patch}),false);
 assert.equal(s.cbExperiment,undefined);
});
