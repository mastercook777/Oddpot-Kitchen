import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {evaluateLiveCook,reviewLiveCook,liveCookAmount} from '../src/cooking_v063.js';

const ids=['sky_moss','storm_egg'];
const drops=[{id:'sky_moss',t:0,index:0},{id:'storm_egg',t:.4,index:1}];
const actions=(vent=4.9)=>[
 {type:'seal',t:.9,with:[...ids]},
 ...(vent==null?[]:[{type:'vent',t:vent,with:[...ids]}])
];

test('iPhone Cloud steam replay: successful 0.9s seal and 4.9s vent are Chinese and green',()=>{
 const cooked=evaluateLiveCook(ids,'STEAM',drops,actions(),7.5);
 assert.equal(cooked.recipeId,'steam_moss_egg');
 assert.equal(cooked.sellable,true);
 assert.equal(cooked.style,'steam_even');
 assert.equal(cooked.quality,80);
 const recap=reviewLiveCook(cooked);
 const techniques=recap.steps.filter(s=>s.type==='action');
 assert.deepEqual(techniques.map(s=>[s.label,s.grade]),[['封笼','good'],['排汽','good']]);
 assert.match(techniques[0].detail,/熟化/);
 assert.doesNotMatch(techniques[0].detail,/品质 \+8/);
 assert.match(techniques[1].detail,/云汽匀蒸.*品质 \+8/);
 assert.equal(recap.maxQuality,80);
 assert.equal(recap.atReachableMax,true);
});

test('premature vent is a warned real quality penalty, not an invented +8 reward',()=>{
 const cooked=evaluateLiveCook(ids,'STEAM',drops,actions(1.8),7.5);
 assert.equal(cooked.style,'steam_dry');
 assert.equal(cooked.quality,65);
 const recap=reviewLiveCook(cooked);
 const vent=recap.steps.find(s=>s.label==='排汽');
 assert.equal(vent.grade,'warning');
 assert.match(vent.detail,/至少 2 秒/);
 assert.match(vent.detail,/品质 -7/);
 assert.doesNotMatch(vent.detail,/品质 \+8/);
 assert.equal(recap.atReachableMax,false);
});

test('seal without vent boosts actual cooking but cannot pretend to earn steam-even quality',()=>{
 const sealed=evaluateLiveCook(ids,'STEAM',drops,actions(null),7.5);
 assert.equal(sealed.style,'steam_home');
 assert.equal(sealed.quality,72);
 const recap=reviewLiveCook(sealed);
 assert.deepEqual(recap.steps.filter(s=>s.type==='action').map(s=>[s.label,s.grade]),[['封笼','good']]);
 assert.ok(liveCookAmount(drops[0],7.5,actions(null),'STEAM')>
   liveCookAmount(drops[0],7.5,[],'STEAM'));
});

test('legacy WOK/POT review and GRILL branch keep their existing action names and grades',()=>{
 const wok=evaluateLiveCook(['chicken','chili'],'WOK',[
  {id:'chicken',t:0,index:0},{id:'chili',t:0,index:1}
 ],[{type:'flip',t:2,with:['chicken','chili']}],8);
 const pot=evaluateLiveCook(['chicken','mushroom'],'POT',[
  {id:'chicken',t:0,index:0},{id:'mushroom',t:0,index:1}
 ],[{type:'gentle',t:2,with:['chicken','mushroom']}],9);
 assert.deepEqual(reviewLiveCook(wok).steps.filter(x=>x.type==='action').map(x=>[x.label,x.grade]),[['翻炒','good']]);
 assert.deepEqual(reviewLiveCook(pot).steps.filter(x=>x.type==='action').map(x=>[x.label,x.grade]),[['轻搅','good']]);
 const grill=reviewLiveCook({vessel:'GRILL',events:[],actions:[{type:'turn',t:1},{type:'brush',t:2}],duration:8,doneness:[],sellable:true,quality:84,facts:{lane:'middle',ordered:true}});
 assert.deepEqual(grill.steps.filter(x=>x.type==='action'&&x.time>0).map(x=>x.label),['翻面','刷香料']);
});

test('Pages entry and offline bundle both contain the corrected steam recap',()=>{
 const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const html=readFileSync(new URL('../standalone.html',import.meta.url),'utf8');
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 const engine=readFileSync(new URL('../src/engine.js',import.meta.url),'utf8');
 assert.match(index,/src\/app\.js\?v=0\.15\.0-alpha\.5/);
 assert.match(app,/cooking_v063\.js\?v=0\.15\.0-alpha\.5/);
 assert.match(engine,/cooking_v063\.js\?v=0\.15\.0-alpha\.5/);
 assert.match(html,/v0\.15\.0-alpha\.5 离线版/);
 assert.match(html,/封笼形成保温云汽/);
 assert.match(html,/云汽匀蒸 · 品质 \+8/);
});
