import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {RECIPES} from '../src/data.js';
import {newGame,serviceDayPlan,selectArrivalDish,newRecipeLead} from '../src/engine.js';
import {drawForkFlameFx} from '../src/field_cookware_v014c.js';
import {diningSpeechCue} from '../src/diner_ambience_v077.js';

test('fixed-seed real arrival plans choose grill recipes for multiple existing guest groups',()=>{
 const grillGuests=new Set();let orders=0;
 for(let seed=1;seed<=80;seed++){
  const s=newGame(seed);s.chapterProgress.stars=2;s.day=1+seed%6;
  s.menu=['grill_chicken','grill_vegetable','chicken_stew'];
  for(const id of s.menu)s.recipes[id]=85;
  for(const segment of serviceDayPlan(s).guests){
   const o={id:'planned-'+orders++,segment};selectArrivalDish(s,o);
   if(RECIPES[o.recipeId]?.station==='GRILL')grillGuests.add(segment);
  }
 }
 assert.deepEqual([...grillGuests].sort(),['adventurer','critic','gardener','stargazer']);
});

test('recipe book and menu use actual GRILL label, not pot; old saves do not auto-learn new dishes',()=>{
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 assert.match(app,/const shown=Object\.entries\(RECIPES\)\.filter\(\(\[id,r\]\)=>recipeCookware\(r\)===recipeType.*r\.station==='GRILL'.*grillOwned/);
 assert.match(app,/const stationName=.*recipe\?\.method==='steam'\?'云汽蒸笼':type==='GRILL'\?'烤架'/);
 assert.match(app,/r\.ids\.map\(onlyName\).*stationName\(r\.station,r\)/);
 assert.match(app,/esc\(r\.name\)\} · \$\{cookName\(recipeCookware\(r\)\)\}/);
 const s=newGame(77);assert.equal(s.recipes.grill_garlic_mushroom,undefined);
 for(const [id,r] of Object.entries(RECIPES))if(r.station!=='GRILL')s.recipes[id]=75;
 assert.equal(newRecipeLead(s),null,'unowned grill does not advertise unavailable research');
 s.kitchen.grillOwned=true;
 assert.equal(RECIPES[newRecipeLead(s).id].station,'GRILL');
});

test('fork skill paints multiple changing flame ribbons, not an opaque sector',()=>{
 const record=ttl=>{
  const ops=[];
  const c=new Proxy({}, {get(target,key){if(key in target)return target[key];return (...args)=>ops.push([key,...args]);},set(target,key,value){target[key]=value;return true;}});
  drawForkFlameFx(c,{skillFx:ttl,skillOrigin:{type:'GRILL',x:4,y:5,dx:1,dy:0}});
  return ops;
 };
 const early=record(.72),middle=record(.42),late=record(.12);
 for(const frame of [early,middle,late]){
  assert.equal(frame.filter(x=>x[0]==='bezierCurveTo').length,54);
  assert.equal(frame.some(x=>x[0]==='arc'),false);
 }
 assert.notDeepEqual(early.filter(x=>x[0]==='bezierCurveTo'),middle.filter(x=>x[0]==='bezierCurveTo'));
 assert.notDeepEqual(middle.filter(x=>x[0]==='bezierCurveTo'),late.filter(x=>x[0]==='bezierCurveTo'));
});

test('real grill orders get segment-specific barbecue cues rather than soup or wok chatter',()=>{
 const order={id:'order-27',segment:'family',tableId:1,seatId:0,recipeId:'grill_sweet_chicken',status:'queued',orderedAt:5,arrival:0,patience:60};
 assert.match(diningSpeechCue(order,5.2).text,/琥珀烤鸡串！.*烤串/);
 assert.match(diningSpeechCue({...order,status:'cooking',started:6},9.2).text,/翻面/);
 assert.match(diningSpeechCue({...order,status:'pickup',pickupAt:10},10.2).text,/烤串/);
 assert.doesNotMatch(diningSpeechCue(order,5.2).text,/热汤|锅气/);
});
