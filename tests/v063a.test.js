import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
import {RECIPES,RECIPE_INDEX,ING,recipeSignature} from '../src/data.js';
import {LIVE_ACTIONS,liveRecipeId,evaluateLiveCook,resolveTechnique} from '../src/cooking_v063.js';
import {newGame,ensureRecipeVariants,activeRecipeVariant,chooseRecipeVariant,
  beginLiveResearch,dropLiveIngredient,performLiveAction,stepLiveResearch,finishLiveResearch,
  load,save,createService,nextPhase} from '../src/engine.js';

const BEEF_ONION=['beef','onion'];
const run=(s,t)=>{let remaining=t;while(remaining>0){const n=Math.min(.07,remaining);stepLiveResearch(s,n);remaining-=n}};
test('v0.6.3-A mainline Vite bundle builds with live cooking UI',()=>{
 const build=spawnSync('npm',['run','build'],{cwd:new URL('..',import.meta.url).pathname,encoding:'utf8'});
 assert.equal(build.status,0,build.stdout+'\n'+build.stderr);
});
test('v0.6.3-A app and all new modules have parseable ESM source',()=>{
 for(const name of ['app.js','data.js','recipe_profiles_v063.js','cooking_v063.js','engine.js']){
  const p=new URL('../src/'+name,import.meta.url).pathname;
  const x=spawnSync(process.execPath,['--check',p],{encoding:'utf8'});
  assert.equal(x.status,0,name+': '+x.stderr);
 }
});
test('regenerated standalone JS is syntactically valid and includes all v0.6.3-A systems',()=>{
 const html=readFileSync(new URL('../standalone.html',import.meta.url),'utf8');
 const inline=html.split('<script>')[1]?.split('</script>')[0];
 assert.ok(inline&&inline.includes('function evaluateLiveCook')&&inline.includes('function beginLiveResearch'));
 assert.doesNotThrow(()=>new Script(inline));
 assert.match(html,/v063-live-pan|v063-food-layer/);
});
test('full catalog has 84 pairs/triples for each vessel, and retains legacy 12 plus six curated recipes',()=>{
 assert.equal(Object.keys(ING).length,17);
 assert.equal(Object.keys(RECIPE_INDEX).length,199);
 assert.equal(Object.keys(RECIPES).length,198); // original combinations plus eight authored Cloud Harbor dishes
 const ids=['beef','chicken','chili','garlic','mushroom','cabbage','onion','potato'];
 for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){
  const choices=[[ids[i],ids[j]]];
  for(let k=j+1;k<ids.length;k++)choices.push([ids[i],ids[j],ids[k]]);
  for(const v of ['WOK','POT'])for(const combo of choices){
   const r=liveRecipeId(combo,v);assert.ok(r&&RECIPES[r],combo+' '+v);
   assert.equal(liveRecipeId([...combo].reverse(),v),r);
   assert.ok(RECIPES[r].name&&!RECIPES[r].name.includes('未知'));
  }
 }
 assert.equal(liveRecipeId(['chicken','chili'],'WOK'),'chili_meat');
 assert.equal(liveRecipeId(['beef','chili'],'WOK'),'chili_meat');
 assert.equal(liveRecipeId(BEEF_ONION,'WOK'),'wok_beef_onion');
 assert.equal(liveRecipeId(BEEF_ONION,'POT'),'pot_beef_onion');
 assert.equal(LIVE_ACTIONS.WOK[0].name,'翻炒');
 assert.equal(LIVE_ACTIONS.POT[1].name,'收汁');
});
test('recipe-specific technique affinity does not grant universal economic modifiers',()=>{
 const spicy=resolveTechnique('chili_meat','burst'),veg=resolveTechnique('veg_stir','burst');
 const beef=resolveTechnique('garlic_beef','burst'),soup=resolveTechnique('woodland_pot','reduced');
 assert.equal(spicy.timeDeltaSeconds,0);
 assert.equal(beef.timeDeltaSeconds,-1);
 assert.equal(veg.timeDeltaSeconds,0);
 assert.equal(veg.affinity,'ordinary');
 assert.equal(soup.affinity,'signature');
});
test('cooking different orders/actions yields distinctive recipe variants',()=>{
 const normal=evaluateLiveCook(BEEF_ONION,'WOK',[{id:'beef',t:0,index:0},{id:'onion',t:2,index:1}],[],9);
 const burst=evaluateLiveCook(BEEF_ONION,'WOK',[{id:'beef',t:0,index:0},{id:'onion',t:2,index:1}],[{type:'toss',t:2.5,with:['beef','onion']}],9);
 const aromatic=evaluateLiveCook(BEEF_ONION,'WOK',[{id:'onion',t:0,index:0},{id:'beef',t:2,index:1}],[{type:'flip',t:2.4,with:['onion','beef']}],9);
 assert.deepEqual([normal.recipeId,burst.recipeId,aromatic.recipeId],['wok_beef_onion','wok_beef_onion','wok_beef_onion']);
 assert.equal(normal.style,'home');assert.equal(burst.style,'burst');assert.equal(aromatic.style,'aroma');
 assert.ok(normal.sellable&&burst.sellable&&aromatic.sellable);
});
test('aroma recognition also works for garlic+mushroom and mushroom+chicken',()=>{
 const a=evaluateLiveCook(['garlic','mushroom'],'WOK',[{id:'garlic',t:0,index:0},{id:'mushroom',t:2,index:1}],[{type:'flip',t:3,with:['garlic','mushroom']}],9);
 const b=evaluateLiveCook(['chicken','mushroom'],'WOK',[{id:'mushroom',t:0,index:0},{id:'chicken',t:2,index:1}],[{type:'flip',t:3,with:['mushroom','chicken']}],9);
 assert.equal(a.style,'aroma');assert.equal(b.style,'aroma');
 assert.equal(a.recipeName,RECIPES.mushroom_stir.name);assert.equal(b.recipeName,'山菌炒鸡');
 assert.ok(a.sellable&&b.sellable);
});
test('old saves gain legacy variants with unchanged quality and the same default menu',()=>{
 const s=newGame();delete s.recipeVariants;delete s.activeVariantIds;
 const original=JSON.stringify(s.menu);
 ensureRecipeVariants(s);
 assert.equal(JSON.stringify(s.menu),original);
 assert.equal(s.recipes.chicken_stew,76);
 const old=activeRecipeVariant(s,'chicken_stew');
 assert.equal(old.quality,76);assert.equal(old.style,'legacy');
 assert.equal(chooseRecipeVariant(s,'chicken_stew','invalid'),false);
 assert.equal(chooseRecipeVariant(s,'chicken_stew',old.variantId),true);
});
test('failure costs real ingredients but never unlocks a variant; retry can succeed',()=>{
 const s=newGame();s.phase='research';
 const before={...s.inventory};assert.ok(beginLiveResearch(s,['chicken','chili'],'WOK'));
 assert.ok(dropLiveIngredient(s,'chicken'));assert.ok(dropLiveIngredient(s,'chili'));
 run(s,1.5);
 const failed=finishLiveResearch(s);
 assert.equal(failed.status,'夹生失败');assert.equal(failed.sellable,false);
 assert.equal(s.inventory.chicken,before.chicken-1);assert.equal(s.inventory.chili,before.chili-1);
 assert.equal(s.recipes.chili_meat,undefined);
 assert.equal(s.recipeVariants.chili_meat,undefined);
 assert.equal(finishLiveResearch(s),false);
 assert.ok(beginLiveResearch(s,['chicken','chili'],'WOK'));
 dropLiveIngredient(s,'chili');run(s,2);dropLiveIngredient(s,'chicken');performLiveAction(s,'flip');run(s,8);
 const cooked=finishLiveResearch(s);
 assert.equal(cooked.sellable,true);
 assert.equal(cooked.style,'aroma');assert.equal(cooked.recipeId,'chili_meat');
 assert.equal(s.recipeVariants.chili_meat.length,1,'new dish must not fabricate legacy default');
 assert.equal(s.inventory.chili,before.chili-2);
 assert.equal(s.ledger.filter(e=>e.type==='consume').length,2);
 assert.ok(activeRecipeVariant(s,'chili_meat'));
});
test('selected recipe techniques persist in a save roundtrip, with old business quality intact',()=>{
 const s=newGame();s.phase='research';
 beginLiveResearch(s,['beef','onion'],'WOK');
 dropLiveIngredient(s,'beef');run(s,2);dropLiveIngredient(s,'onion');
 performLiveAction(s,'toss');run(s,7);
 const outcome=finishLiveResearch(s);
 assert.equal(outcome.sellable,true);
 const chosen=activeRecipeVariant(s,'wok_beef_onion');
 assert.equal(chosen.style,'burst');
 assert.equal(chooseRecipeVariant(s,'wok_beef_onion',chosen.variantId),true);
 assert.equal(s.recipes.chicken_stew,76,'legacy cook quality unchanged');
 assert.deepEqual(s.menu,['chicken_stew','mushroom_stir','veg_stir']);
});
test('auto-finish at 19s is once-only and cannot double-spend inventory',()=>{
 const s=newGame();s.phase='research';beginLiveResearch(s,['beef','onion'],'WOK');
 dropLiveIngredient(s,'beef');run(s,2);dropLiveIngredient(s,'onion');
 run(s,17.2);
 assert.equal(s.cook,null);assert.ok(s.lastCook);
 const txns=s.ledger.filter(x=>x.type==='consume');assert.equal(txns.length,1);
 assert.equal(finishLiveResearch(s),false);assert.equal(txns.length,1);
});
