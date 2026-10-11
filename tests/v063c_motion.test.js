import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {livePanMotion} from '../src/cook_motion_v063.js';

const pot=(vessel='WOK',actions=[],elapsed=3,third=null)=>({
 vessel,elapsed,actions,
 dropped:[{id:'garlic',t:0,index:0},{id:'beef',t:1,index:1},
   ...(third?[{id:third,t:2.6,index:2}]:[])]
});
const geometry={width:330,height:198};
const pos=(motion,id)=>motion.items.find(x=>x.id===id);
const different=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y)+Math.abs(a.rotation-b.rotation)>1;
test('all cooking moves use the same real ingredient nodes, with finite single poses',()=>{
 for(const type of ['flip','toss','gentle','reduce']){
  const withIds=['garlic','beef'],vessel=['flip','toss'].includes(type)?'WOK':'POT';
  const motion=livePanMotion(pot(vessel,[{type,t:2.4,with:withIds}],2.82,'onion'),geometry);
  assert.equal(motion.action,type);
  assert.equal(motion.items.length,3);
  assert.equal(new Set(motion.items.map(x=>x.id)).size,3);
  for(const x of motion.items)for(const key of ['x','y','rotation','scale','opacity'])
   assert.ok(Number.isFinite(x[key]),type+' '+key);
  assert.ok(motion.actionOpacity>.1);
 }
});
test('flip visibly sweeps food around the wok instead of only bobbing',()=>{
 const baseline=livePanMotion(pot('WOK',[],2.85),geometry);
 const flip=livePanMotion(pot('WOK',[{type:'flip',t:2.4,with:['garlic','beef']}],2.85),geometry);
 assert.ok(different(pos(flip,'beef'),pos(baseline,'beef')));
 assert.notEqual(flip.panRotation,0);
 assert.equal(flip.brothScale,1);
});
test('toss makes existing food jump and tilts the wok; newly added food never duplicates',()=>{
 const base=livePanMotion(pot('WOK',[],2.80,'onion'),geometry);
 const tossed=livePanMotion(pot('WOK',[{type:'toss',t:2.4,with:['garlic','beef']}],2.80,'onion'),geometry);
 assert.ok(pos(tossed,'beef').y<pos(base,'beef').y-20);
 assert.ok(Math.abs(tossed.panRotation)>1);
 assert.ok(pos(tossed,'onion'));assert.equal(tossed.items.length,3);
});
test('gentle stirring makes circular drift and ripples rather than wok toss arc',()=>{
 const gentle=livePanMotion(pot('POT',[{type:'gentle',t:2.4,with:['garlic','beef']}],2.82),geometry);
 const base=livePanMotion(pot('POT',[],2.82),geometry);
 assert.ok(gentle.ripple>.1);
 assert.ok(different(pos(gentle,'beef'),pos(base,'beef')));
 assert.ok(Math.abs(gentle.panRotation)<3);
});
test('liquid actually reduces and stays reduced after motion finishes',()=>{
 const action={type:'reduce',t:2.4,with:['garlic','beef']};
 const midpoint=livePanMotion(pot('POT',[action],3.07),geometry);
 const settled=livePanMotion(pot('POT',[action],6),geometry);
 assert.ok(midpoint.brothScale<1&&midpoint.brothScale>.63);
 assert.equal(settled.brothScale,.63);
 assert.equal(settled.action,null);
 assert.equal(settled.actionOpacity,0);
});
test('rebuilding at exact same recipe elapsed timestamp yields identical pose, no trails',()=>{
 const cook=pot('WOK',[{type:'toss',t:2.4,with:['garlic','beef']}],2.82);
 assert.deepEqual(livePanMotion(cook,geometry),livePanMotion(cook,geometry));
 assert.equal(livePanMotion({...cook,elapsed:6},geometry).action,null);
});
test('integrated mainline does not create extra ingredient icon clones or CSS transform races',()=>{
 const js=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/cooking_v063.css',import.meta.url),'utf8');
 const panMark=js.match(/<div class="v063-live-pan[\s\S]*?<\/div><\/div>/)?.[0];
 assert.ok(panMark,'pan renderer present');
 assert.match(js,/const motion=livePanMotion\(c,/);
 assert.match(js,/for\(const food of motion.items\)/);
 assert.match(js,/v063-pan-ripple/);
 assert.match(js,/v063-action-indicator/);
 assert.ok(!js.includes('const angle=now*.001*(c.vessel'),'previous conflicting animation loop must be gone');
 assert.match(css,/\.v063-food-icon\{[^}]*animation:none!important;transition:none!important/);
 assert.ok(!css.includes('ghost')||css.includes('no cloned'));
});
