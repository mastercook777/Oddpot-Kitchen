import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext, Script} from 'node:vm';

// Verify the HTML actually paints food as persistent visible DOM sprites, not
// an uninspected canvas test double. No dependency on browser fonts/assets.
function openLab(page){
 const html=readFileSync(new URL('../experiments/'+page,import.meta.url),'utf8');
 const script=html.match(/<script>([\s\S]*?)<\/script>/i)?.[1];
 assert.ok(script);
 const nodes=new Map();
 function makeNode(){
  let classes=new Set();
  return {
   style:{},dataset:{},textContent:'',innerHTML:'',disabled:false,children:[],
   classList:{toggle(name,on){if(on)classes.add(name);else classes.delete(name)},contains(name){return classes.has(name)},add(name){classes.add(name)},remove(name){classes.delete(name)}},
   addEventListener(){},setPointerCapture(){},
   getBoundingClientRect(){return {width:360,height:240}},
   replaceChildren(...list){this.children=list}
  };
 }
 const document={
  getElementById(id){if(!nodes.has(id))nodes.set(id,makeNode());return nodes.get(id)},
  createElement(){return makeNode()},
  addEventListener(){}
 };
 const window={devicePixelRatio:2};
 const storage=new Map();
 const context={document,window,
  localStorage:{getItem(k){return storage.get(k)||null},setItem(k,v){storage.set(k,v)}},
  performance:{now(){return 2000}},
  requestAnimationFrame(){return 1},cancelAnimationFrame(){},
  setTimeout(){return 1},clearTimeout(){},Math,Date
 };
 createContext(context);new Script(script,{filename:page}).runInContext(context);
 return {lab:window.__oddpotLab,html,nodes};
}
for(const page of ['v06-1-freefire-cooking.html','v06-2-two-pots-cooking.html']){
 test(page+' keeps pot and food visible without duplicate/stale sprite layers',()=>{
  const {lab,html,nodes}=openLab(page);
  assert.match(html,/class="pan-dom-bowl"/,'CSS bowl must be present even when Canvas is blank');
  assert.match(html,/id="pan-food-layer"/);
  assert.match(html,/position:absolute;inset:0;z-index:2;opacity:0/,'transparent canvas keeps swipe target without visual double painting');
  lab.start();lab.drop('beef');lab.drop('onion');
  lab.draw(1.5);
  const layer=nodes.get('pan-food-layer');
  assert.equal(layer.children.length,2);
  assert.deepEqual(layer.children.map(x=>x.textContent),['🥩','🧅']);
  const originals=[...layer.children];
  for(let frame=0;frame<45;frame++)lab.draw(frame/9);
  assert.equal(layer.children.length,2,'must not accumulate 45 frames of sprites');
  assert.equal(layer.children[0],originals[0],'must reuse sprite nodes to prevent Safari emoji trails');
  assert.equal(layer.children[1],originals[1]);
  layer.children.forEach(node=>assert.match(node.style.transform,/translate\(-50%,-50%\) translate\(/));
  // A cook animation or stir action doesn't create a second copy.
  lab.action(page.includes('two-pots')?'flip':'stir');
  lab.draw(7);
  assert.equal(layer.children.length,2);
  assert.equal(layer.children[0],originals[0]);
  assert.match(nodes.get('pan-flare').style.opacity,/^(0|0\.\d+|1)$/);
  // Reset clears old food immediately on the next animation frame.
  lab.start();lab.draw(0.3);
  assert.equal(layer.children.length,0);
 });
}
test('v0.6.2 pot still renders both foods after stirring and reducing',()=>{
 const {lab,nodes}=openLab('v06-2-two-pots-cooking.html');
 lab.state.vessel='pot';lab.start();lab.drop('onion');lab.drop('beef');
 lab.action('gentle');lab.action('reduce');
 for(let i=0;i<20;i++)lab.draw(2+i*.1);
 assert.equal(nodes.get('pan-food-layer').children.length,2);
 assert.equal(nodes.get('pan-dom-surface').classList.contains('pot'),true);
});
