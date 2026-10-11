import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script,createContext} from 'node:vm';

// Test the shipping v0.6.2 standalone script. The main v0.5E.1 engine is untouched.
const html=readFileSync(new URL('../experiments/v06-2-two-pots-cooking.html',import.meta.url),'utf8');
const source=html.match(/<script>([\s\S]*?)<\/script>/i)?.[1];
function boot(){
 const nodes=new Map();
 const node=()=>({textContent:'',innerHTML:'',disabled:false,dataset:{},
  classList:{toggle(){},add(){},remove(){}},addEventListener(){},
  getBoundingClientRect(){return {width:370,height:280}},
  getContext(){return {setTransform(){},clearRect(){},createRadialGradient(){return {addColorStop(){}}},
   beginPath(){},ellipse(){},fill(){},stroke(){},fillText(){},arc(){},moveTo(){},lineTo(){}}}
 });
 const storage=new Map();
 const document={getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},addEventListener(){}};
 const win={devicePixelRatio:1};
 const ctx={document,window:win,localStorage:{getItem(k){return storage.get(k)||null},setItem(k,v){storage.set(k,v)}},
  performance:{now(){return 1000}},requestAnimationFrame(){return 1},cancelAnimationFrame(){},
  setTimeout(){return 1},clearTimeout(){},Math,Date};
 createContext(ctx);new Script(source,{filename:'v062.js'}).runInContext(ctx);
 return {lab:win.__oddpotLab,nodes,storage};
}
test('v0.6.2 HTML has valid script and both pot action sets',()=>{
 assert.ok(source);
 assert.doesNotThrow(()=>new Script(source));
 const {lab}=boot();
 assert.deepEqual(Array.from(lab.VESSEL.wok.actions.map(x=>x[1])),['翻炒','颠勺']);
 assert.deepEqual(Array.from(lab.VESSEL.pot.actions.map(x=>x[1])),['轻搅','收汁']);
});
test('all 8-ingredient 2/3 combinations have stable non-unknown recipes per vessel',()=>{
 const {lab}=boot(),ids=Object.keys(lab.ING),set=new Set();
 assert.equal(lab.totalCombos(),84);
 assert.ok(Object.keys(lab.NAMED).length>=60);
 for(const v of ['wok','pot']){
  for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){
   const pairs=[[ids[i],ids[j]]];
   for(let k=j+1;k<ids.length;k++)pairs.push([ids[i],ids[j],ids[k]]);
   for(const chosen of pairs){
    const r=lab.recipe(chosen,v);
    assert.ok(r.name.length>2&&!/未知|undefined|null/.test(r.name),r.id+' '+r.name);
    assert.ok(!set.has(r.id),r.id);
    set.add(r.id);
    assert.equal(r.id,lab.recipe(chosen.slice().reverse(),v).id);
   }
  }
 }
 assert.equal(set.size,168);
});
test('same beef/onion in wok leads to 家常 or 爆炒 depending on timing',()=>{
 const {lab}=boot(),ingredients=['beef','onion'];
 const home=lab.evaluate(ingredients,'wok',[{id:'beef',t:0,index:0},{id:'onion',t:2,index:1}],[],9);
 const burst=lab.evaluate(ingredients,'wok',[{id:'onion',t:0,index:0},{id:'beef',t:3,index:1}],[{type:'toss',t:4,with:['onion','beef']}],9);
 for(const r of [home,burst]){assert.equal(r.recipeName,'葱爆牛肉');assert.equal(r.sellable,true);}
 assert.equal(home.style,'家常');
 assert.equal(burst.style,'爆炒');
 assert.ok(burst.tags.includes('锅气'));
});
test('deep-pot reduction makes a distinct 适口浓香 result with same ingredients',()=>{
 const {lab}=boot(),input=['beef','onion'];
 const plain=lab.evaluate(input,'pot',[{id:'beef',t:0,index:0},{id:'onion',t:2,index:1}],[],13);
 const rich=lab.evaluate(input,'pot',[{id:'onion',t:0,index:0},{id:'beef',t:3,index:1}],
  [{type:'gentle',t:6,with:['onion','beef']},{type:'reduce',t:8,with:['onion','beef']}],13);
 assert.equal(plain.recipeName,'洋葱炖牛肉');
 assert.equal(rich.recipeName,'洋葱炖牛肉');
 assert.equal(plain.sellable,true);assert.equal(rich.sellable,true);
 assert.equal(rich.style,'浓香收汁');
 assert.ok(rich.tags.includes('浓厚酱汁'));
});
test('taking food out much too early fails (cannot unlock recipe)',()=>{
 const {lab}=boot(),input=['beef','onion'];
 const raw=lab.evaluate(input,'wok',[{id:'beef',t:0,index:0},{id:'onion',t:.3,index:1}],[],1.5);
 assert.equal(raw.sellable,false);
 assert.equal(raw.status,'夹生失败');
 assert.ok(raw.doneness.some(x=>x.label==='夹生'));
});
test('slight undercooking can be sellable with a real quality penalty',()=>{
 const {lab}=boot(),input=['beef','onion'];
 const mild=lab.evaluate(input,'wok',[{id:'beef',t:0,index:0},{id:'onion',t:4,index:1}],[],6.5);
 assert.equal(mild.sellable,true);
 assert.ok(mild.tags.includes('欠火'));
 assert.ok(mild.quality<65);
});
test('missing ingredient and severe burning both fail',()=>{
 const {lab}=boot();
 const missing=lab.evaluate(['beef','onion'],'wok',[{id:'beef',t:0,index:0}],[],9);
 assert.equal(missing.sellable,false);assert.equal(missing.status,'漏下料');
 const charred=lab.evaluate(['beef','onion'],'wok',[{id:'beef',t:0,index:0},{id:'onion',t:2,index:1}],[],21);
 assert.equal(charred.sellable,false);assert.equal(charred.status,'焦糊失败');
});
test('UI never records a failed experiment but records a successful one',()=>{
 const {lab,storage}=boot();
 lab.start();lab.drop('beef');lab.drop('onion');lab.state.elapsed=1.5;lab.finish();
 assert.equal(lab.state.result.sellable,false);assert.equal(lab.state.records.length,0);
 assert.equal(storage.size,0);
 lab.start();lab.drop('onion');lab.state.elapsed=3;lab.drop('beef');lab.state.elapsed=4;lab.act('toss');lab.state.elapsed=9;lab.finish();
 assert.equal(lab.state.result.sellable,true);assert.equal(lab.state.records.length,1);
 assert.ok(storage.has('oddpot-cooking-lab-v062'));
 assert.ok(!storage.has('oddpot-prototype-v04'));
});
test('no turn-based step or forced pre-ordering in v0.6.2',()=>{
 assert.doesNotMatch(html,/加热一拍|第\s*1\s*\/\s*3\s*拍|data-stage/);
 assert.match(html,/点击食材直接下锅/);
});
