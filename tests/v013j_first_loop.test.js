import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,recipeCraftSnapshot,ensureRecipeVariants,createService,selectArrivalDish,chooseRecipeVariant} from '../src/engine.js';
import {RECIPES} from '../src/data.js';
import {craftedPrice,qualityPriceBonus} from '../src/recipe_value_v013j.js';
import {homeKitchenActors,homeKitchenChatter} from '../src/home_kitchen_v013j.js';
import {firstDayGuide} from '../src/first_day_guide_v013j.js';

function variant(s,id,style,quality){
 s.recipes[id]??=quality;
 ensureRecipeVariants(s);
 const v={variantId:`j-${id}-${style}-${quality}`,recipeId:id,ingredientIds:RECIPES[id].ids,
  vessel:RECIPES[id].station,style,styleLabel:style,quality,valid:true,legacy:false};
 s.recipeVariants[id].push(v);s.activeVariantIds[id]=v.variantId;return v;
}

test('quality tiers and authored signature affect real craft price without a global style buff',()=>{
 assert.deepEqual([72,79,80,84,85,87,90].map(qualityPriceBonus),[0,0,2,2,5,5,7]);
 assert.equal(craftedPrice({price:18},85,null),23);
 const s=newGame();
 variant(s,'mushroom_stir','aroma',86);
 const signature=recipeCraftSnapshot(s,'mushroom_stir');
 variant(s,'mushroom_stir','home',86);
 const home=recipeCraftSnapshot(s,'mushroom_stir');
 assert.ok(signature.price>home.price,'this recipe rewards its own signature technique');
 assert.equal(home.price,RECIPES.mushroom_stir.price+5);
 variant(s,'chili_meat','aroma',86);
 const other=recipeCraftSnapshot(s,'chili_meat');
 assert.equal(other.price,RECIPES.chili_meat.price+5,'same style has no blanket signature premium');
});

test('new save prompts the first loop; an old save and a skipped guide stay quiet',()=>{
 const s=newGame();assert.equal(firstDayGuide(s).title,'第一天，从这间小厨房开始');
 s.phase='field';assert.ok(firstDayGuide(s));s.field={action:true};assert.equal(firstDayGuide(s),null);
 s.field=null;s.phase='research';assert.ok(firstDayGuide(s));s.phase='menu';assert.ok(firstDayGuide(s));
 s.phase='prep';assert.ok(firstDayGuide(s));s.phase='report';assert.ok(firstDayGuide(s));
 s.onboarding.enabled=false;assert.equal(firstDayGuide(s),null);
 const old=newGame();delete old.onboarding;assert.equal(firstDayGuide(old),null);
 const later=newGame();later.day=2;assert.equal(firstDayGuide(later),null);
 later.onboarding.replay=true;assert.ok(firstDayGuide(later));
});

test('idle preview only depicts hired staff and produces no economic state',()=>{
 const s=newGame(),before=structuredClone(s);
 const solo=homeKitchenActors(s,4);assert.deepEqual(solo.map(x=>x.kind),['chef']);
 assert.ok(homeKitchenChatter(s,0));
 s.crew.helper.hired=true;s.crew.waiter.hired=true;
 const staffed=homeKitchenActors(s,4);
 assert.deepEqual(staffed.map(x=>x.kind),['chef','helper','waiter']);
 assert.notDeepEqual(homeKitchenActors(s,4)[0],homeKitchenActors(s,7)[0]);
 assert.deepEqual(homeKitchenActors(s,4,true)[0],homeKitchenActors(s,7,true)[0]);
 assert.equal(homeKitchenChatter(s,0,true),null);
 s.kitchen.thirdUnlocked=true;s.crew.helper2={hired:true,station:2,level:2};
 assert.ok(homeKitchenActors(s,4).some(x=>x.kind==='helper2'&&x.level===2));
 assert.equal(s.coins,before.coins);assert.deepEqual(s.ledger,before.ledger);
});

test('future customer freezes the new price; switching a recipe cannot reprice it',()=>{
 const s=newGame();variant(s,'mushroom_stir','aroma',86);
 s.menu=['mushroom_stir','mushroom_stir','mushroom_stir'];s.phase='service';
 assert.equal(createService(s),true);
 const o=s.service.orders[0];o.segment='regular';selectArrivalDish(s,o);
 const frozen=structuredClone(o.craft);
 const low=variant(s,'mushroom_stir','home',72);
 assert.equal(chooseRecipeVariant(s,'mushroom_stir',low.variantId),true);
 assert.deepEqual(o.craft,frozen);
 assert.ok(frozen.price>recipeCraftSnapshot(s,'mushroom_stir').price);
});
