import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script,createContext} from 'node:vm';

// Isolated laboratory: parse the actual shipped HTML script and exercise the
// same scoring function. This intentionally does not alter src/engine.js.
const html=readFileSync(new URL('../experiments/v06-1-freefire-cooking.html',import.meta.url),'utf8');
const source=html.match(/<script>([\s\S]*?)<\/script>/i)?.[1];
test('v0.6.1 page contains one syntactically valid gameplay script',()=>{
 assert.ok(source,'inline gameplay script must exist');
 assert.doesNotThrow(()=>new Script(source,{filename:'v061_lab.js'}));
});
function harness(){
 const nodes=new Map();
 const dummy=()=>({innerHTML:'',textContent:'',disabled:false,dataset:{},classList:{toggle(){},add(){},remove(){}},addEventListener(){},getBoundingClientRect(){return {width:360,height:300}},getContext(){return {setTransform(){},clearRect(){},createRadialGradient(){return {addColorStop(){}}},beginPath(){},ellipse(){},fill(){},stroke(){},fillText(){},moveTo(){},lineTo(){},arc(){}}}});
 const document={getElementById(id){if(!nodes.has(id))nodes.set(id,dummy());return nodes.get(id)},addEventListener(){}};
 const ctx={document,window:{devicePixelRatio:1},localStorage:{getItem(){return null},setItem(){}},performance:{now(){return 1000}},requestAnimationFrame(){return 1},cancelAnimationFrame(){},setTimeout(){return 1},clearTimeout(){},Math,Date};
 createContext(ctx);new Script(source,{filename:'v061_lab.js'}).runInContext(ctx);
 return ctx.window.__oddpotLab;
}
const input=['beef','onion'];
test('identical ingredients retain one recipe identity despite drop/action changes',()=>{
 const lab=harness();
 const home=lab.score(input,[{id:'beef',t:0,index:0},{id:'onion',t:2,index:1}],[],10);
 const aroma=lab.score(input,[{id:'onion',t:0,index:0},{id:'beef',t:3,index:1}],[{type:'stir',t:5,with:['onion','beef']}],10);
 const wok=lab.score(input,[{id:'onion',t:0,index:0},{id:'beef',t:3,index:1}],[{type:'toss',t:4,with:['onion','beef']}],10);
 for(const result of [home,aroma,wok]){
  assert.equal(result.recipeName,'葱爆牛肉');
  assert.equal(result.recipeId,'onion_beef_lab');
 }
 assert.equal(home.style,'家常');
 assert.equal(aroma.style,'香味十足');
 assert.equal(wok.style,'爆炒');
 assert.ok(wok.tags.includes('锅气'));
 assert.ok(aroma.tags.includes('浓香融合'));
});
test('tossing before meat arrives must not unlock 爆炒',()=>{
 const lab=harness();
 const r=lab.score(input,[{id:'onion',t:0,index:0},{id:'beef',t:5,index:1}],[{type:'toss',t:2,with:['onion']}],10);
 assert.notEqual(r.style,'爆炒');
});
test('cooking is event-driven, not pre-assigned stage or per-beat heat puzzle',()=>{
 assert.match(html,/点击食材亲手下锅/);
 assert.match(html,/if\(!s\.live\)/);
 assert.doesNotMatch(html,/stage-list|stage-card|data-stage|加热一拍/);
});
