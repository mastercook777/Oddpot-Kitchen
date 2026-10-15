import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {RECIPES} from '../src/data.js';
import {newGame,recipeAvailableServings,recipeCraftSnapshot,setPremiumMenu,premiumReserved,prepStockForecast,purchase,ensureDailyMarket} from '../src/engine.js';

test('a dish reports the number of complete portions, not the total quantity of its cheapest ingredient',()=>{
 const s=newGame(233);s.inventory.chicken=4;s.inventory.mushroom=2;
 assert.equal(recipeAvailableServings(s,'chicken_stew'),2);
 s.inventory.mushroom=0;
 assert.equal(recipeAvailableServings(s,'chicken_stew'),0);
});
test('current craft variant ingredients are respected and repeated ingredient amounts use floor division',()=>{
 const s=newGame(124);
 s.inventory.chicken=7;s.inventory.mushroom=12;
 s.recipeVariants??={};s.activeVariantIds??={};
 s.recipeVariants.chicken_stew=[{variantId:'double-chicken',ingredientIds:['chicken','chicken','mushroom'],style:'home',quality:80}];
 s.activeVariantIds.chicken_stew='double-chicken';
 assert.deepEqual(recipeCraftSnapshot(s,'chicken_stew').ingredientIds,['chicken','chicken','mushroom']);
 assert.equal(recipeAvailableServings(s,'chicken_stew'),3);
});
test('hidden dish escrow is subtracted from normal recipe, without touching actual inventory',()=>{
 const s=newGame(722);s.phase='menu';s.recipes.ember_pepper_wok=88;
 s.inventory.ember_pepper=3;s.inventory.beef=8;s.inventory.garlic=6;
 assert.equal(setPremiumMenu(s,'ember_pepper_wok',2),true);
 const before=JSON.stringify(s.inventory),held=premiumReserved(s);
 assert.equal(held.ember_pepper,2);
 assert.equal(recipeAvailableServings(s,'ember_pepper_wok'),1);
 assert.equal(recipeAvailableServings(s,'ember_pepper_wok',{ignorePremium:true}),3);
 assert.equal(recipeAvailableServings(s,'garlic_beef'),4);
 assert.equal(JSON.stringify(s.inventory),before);
 assert.equal(setPremiumMenu(s,null),true);
 assert.equal(recipeAvailableServings(s,'ember_pepper_wok'),3);
});
test('read-only stock capacity changes when market replenishes pantry',()=>{
 const s=newGame(147);s.phase='menu';s.coins=1000;
 const [id]=Object.entries(ensureDailyMarket(s).goods)[0];
 const r=Object.entries(RECIPES).find(([,recipe])=>!recipe.rare&&recipe.ids.includes(id))?.[0];
 assert.ok(r);
 s.recipes[r]=76;for(const ingredient of RECIPES[r].ids)s.inventory[ingredient]=10;
 s.inventory[id]=0;
 const before=recipeAvailableServings(s,r);
 assert.equal(before,0);
 assert.equal(purchase(s,id,3),true);
 assert.ok(recipeAvailableServings(s,r)>0);
});
test('menu UI and mobile CSS render distinct serving counts, avoid floating overlays, preserve scroll',()=>{
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/kitchen_050.css',import.meta.url),'utf8');
 assert.match(app,/当前可做 \$\{recipeAvailableServings\(game,id\)\} 份/);
 assert.match(app,/v101-serving-tag/);
 assert.match(app,/hidden?.*/i);
 assert.match(app,/v101-premium-summary/);
 assert.match(css,/\.kitchen-prep-card > \*\{flex-shrink:0\}/);
 assert.match(css,/\.v101-premium-summary/);
 assert.match(css,/@media\(max-width:350px\)/);
 assert.doesNotMatch(app,/class="v010-prep-premium"/);
});
