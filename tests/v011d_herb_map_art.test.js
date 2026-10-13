import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,enterField} from '../src/engine.js';
import {startActionField} from '../src/field_v04.js';
import {fieldTilePath} from '../src/field_rules_v011a.js';
import {HERB_PIXEL_PALETTE,herbPixelGroundPlan,drawHerbPixelGround,
 drawHerbPixelEnemy,drawHerbPixelProjectile,isHerbPixelSlice} from '../src/field_pixel_herb_v011c.js';

function chroma(hex){
 const nums=hex.slice(1).match(/.{2}/g).map(s=>parseInt(s,16)/255);
 const hi=Math.max(...nums),lo=Math.min(...nums),delta=hi-lo;
 return delta===0?0:delta/(1-Math.abs(hi+lo-1));
}
function makeField(seed=20261013){
 const s=newGame(seed);s.phase='field';assert.ok(enterField(s,'safe'));
 assert.ok(startActionField(s));
 return s.field;
}
test('approved grass palette is less saturated than initial art slice; pickup gold stays warm',()=>{
 const previous=['#527546','#688c52','#80a75d','#a5b96b'];
 const calmer=[HERB_PIXEL_PALETTE.grass,HERB_PIXEL_PALETTE.grassLight,
  HERB_PIXEL_PALETTE.leaf,HERB_PIXEL_PALETTE.sun];
 for(let i=0;i<previous.length;i++)
  assert.ok(chroma(calmer[i])<chroma(previous[i]),'grass shade '+i+' must desaturate');
 assert.equal(HERB_PIXEL_PALETTE.shine,'#f7dfa1');
});
test('seed-dependent herb meadow builds deterministic, contiguous SAFE roads and calm props',()=>{
 let sawBranch=false;
 for(let seed=0;seed<64;seed++){
  const f=makeField(20261013+seed);
  assert.equal(isHerbPixelSlice(f),true);
  const before=JSON.stringify(f);
  const plan=herbPixelGroundPlan(f);
  assert.strictEqual(herbPixelGroundPlan(f),plan,'ground BFS and decor plan is cached per field');
  assert.equal(JSON.stringify(f),before,'visual planning must not mutate gameplay');
  assert.equal(plan.width,12);assert.equal(plan.height,16);
  assert.ok(plan.trail.size>=4);
  assert.ok(plan.props.length<22,'we did not keep old confetti scenery density');
  assert.ok(plan.props.length< f.scenery.length/2+1,'at least 50% reduction in noninteractive props');
  for(const pos of plan.trail){
   const [x,y]=pos.split(',').map(Number);
   assert.ok(!f.obstacles.some(o=>o.x===x&&o.y===y),'road cannot run through trees');
   assert.ok(!f.hazards.some(o=>o.x===x&&o.y===y),'road must remain safe');
  }
  for(const a of plan.props){
   assert.ok(!plan.trail.has(Math.floor(a.x)+','+Math.floor(a.y)),'props never clutter roads');
   assert.ok(Math.hypot(a.x-f.spawn.x,a.y-f.spawn.y)>=1.7,'spawn stays clear');
   assert.ok(f.nodes.every(n=>Math.hypot(a.x-n.x,a.y-n.y)>=1.35),'interactive items stay clear');
  }
  const target=f.nodes.find(n=>n.key==='target');
  const road=fieldTilePath(f,f.spawn,target,{avoidHazards:true});
  for(const step of road)assert.ok(plan.trail.has(Math.floor(step.x)+','+Math.floor(step.y)));
  if(plan.trail.size>road.length)sawBranch=true;
 }
 assert.ok(sawBranch,'some seeds include safe side-spurs to forage or travelers');
});
function fakeContext(){
 const ops=[];
 const c={ops,save(){},restore(){},translate(){},scale(){},fillRect(...n){
  assert.ok(n.every(Number.isFinite));ops.push(['rect',...n]);
 },drawImage(img,...n){assert.ok(img.width>0&&img.height>0);assert.ok(n.every(Number.isFinite));ops.push(['image',...n]);}};
 return c;
}
test('grass sprite has <=5 clustered patch marks instead of 18 salt-and-pepper flecks',()=>{
 const oldDoc=globalThis.document;
 const canvases=[];
 globalThis.document={createElement(type){
  assert.equal(type,'canvas');
  const ctx=fakeContext(),canvas={width:16,height:16,ctx,getContext(){return ctx;}};
  canvases.push(canvas);return canvas;
 }};
 try{
  const f=makeField(),ctx=fakeContext();
  assert.ok(drawHerbPixelGround(ctx,f));
  const grasses=canvases.filter(v=>v.width===16&&v.height===16&&v.ctx.ops.length<=6);
  assert.ok(grasses.length>0,'grass tiles use a quiet handful of grouped marks');
  for(const tile of grasses){
   assert.ok(tile.ctx.ops.length<=6,'maximum 5 decorations + 1 background');
   for(const cmd of tile.ctx.ops)if(cmd[0]==='rect')
    assert.ok(Number.isInteger(cmd[1])&&Number.isInteger(cmd[2]),'authored at integer pixels');
  }
  assert.ok(ctx.ops.filter(op=>op[0]==='image').length>=f.worldW*f.worldH);
 }finally{globalThis.document=oldDoc}
});
test('meadow enemy and projectiles render via rectangular pixel units, without touching HP',()=>{
 const f=makeField();
 const original={kind:'boar',x:4.5,y:7.5,hp:3,maxHp:4,warning:0.7,face:-1,walk:0};
 const old=JSON.stringify(original);
 const ctx=fakeContext();let actor=0;
 drawHerbPixelEnemy(ctx,original,1.2,45,(c,kind)=>{assert.equal(kind,'boar');actor++;});
 drawHerbPixelProjectile(ctx,{x:2.5,y:3.5},'player');
 assert.equal(actor,1);
 assert.ok(ctx.ops.filter(x=>x[0]==='rect').length>=5);
 assert.equal(JSON.stringify(original),old);
 assert.ok(f.nodes.some(n=>n.key==='target'),'gameplay state remains available');
});
