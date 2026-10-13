import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newGame,enterField,completeFieldSegment,chooseFieldBranch} from '../src/engine.js';
import {startActionField,stepActionField} from '../src/field_v04.js';
import {fieldTilePath} from '../src/field_rules_v011a.js';
import {
 HERB_PIXEL_TILE,HERB_PIXEL_PALETTE,herbPixelSpriteNames,herbPixelSpriteSize,
 isHerbPixelSlice,herbPixelGroundPlan,drawHerbPixelGround,drawHerbPixelObstacle,
 drawHerbPixelNode,drawHerbPixelHazard
} from '../src/field_pixel_herb_v011c.js';
import {drawField} from '../src/scenes_v04.js';

function field(route='safe'){
 const s=newGame(20261013);s.phase='field';
 assert.equal(enterField(s,route),true);
 return s;
}
test('herb pixel atlas has 16px native tiles, coherent role scale and bounded distinct palette',()=>{
 assert.equal(HERB_PIXEL_TILE,16);
 assert.equal(HERB_PIXEL_PALETTE.grass,'#527546');
 const sprites=herbPixelSpriteNames(),unique=new Set(sprites);
 assert.equal(sprites.length,unique.size);
 for(const name of sprites){
  const v=herbPixelSpriteSize(name);
  assert.ok(v&&v.width>=16&&v.height>=16,name);
  assert.ok(v.width<=24&&v.height<=30,'aligned with existing actor size: '+name);
 }
 for(let mask=0;mask<16;mask++)for(let variant=0;variant<4;variant++)
  assert.deepEqual(herbPixelSpriteSize('trail:'+mask+':'+variant),{width:16,height:16});
 assert.equal(herbPixelSpriteSize('unsupported'),null);
});
test('art switch affects only expanded first-forest biome and does not alter original map',()=>{
 const s=field('safe'),f=s.field,save=JSON.stringify(s);
 assert.equal(f.biome.zoneId,'herb_path');
 assert.equal(isHerbPixelSlice(f),true);
 const plan=herbPixelGroundPlan(f);
 assert.equal(plan.width,12);assert.equal(plan.height,16);
 assert.ok(plan.trail.size>=3);
 assert.ok(fieldTilePath(f,f.spawn,{x:f.nodes[0].x+.5,y:f.nodes[0].y+.5},{avoidHazards:true}).length);
 for(const key of plan.trail){
  const [x,y]=key.split(',').map(Number);
  assert.ok(!f.obstacles.some(o=>o.x===x&&o.y===y),'visual road cannot run through a real tree');
  assert.ok(!f.hazards.some(o=>o.x===x&&o.y===y),'road should avoid visible danger');
 }
 assert.equal(JSON.stringify(s),save,'renderer planning does not mutate map, bag or ledger');
 const other=field('spring_safe');
 assert.equal(isHerbPixelSlice(other.field),false);assert.equal(herbPixelGroundPlan(other.field),null);
 assert.equal(isHerbPixelSlice({...f,worldVersion:undefined,worldW:9,worldH:11}),false);
 assert.equal(isHerbPixelSlice({...f,biome:{...f.biome,zoneId:'glow_mushroom'}}),false);
});
function mockCanvasContext(){
 const pixels=[];
 const target={
  fillStyle:'#000',strokeStyle:'#fff',font:'',
  fillRect(x,y,w,h){pixels.push([x,y,w,h]);assert.ok([x,y,w,h].every(Number.isFinite),'finite pixel bounds');},
  drawImage(img,x,y,w,h){assert.ok(img?.width>0&&img?.height>0);assert.ok([x,y,w,h].every(Number.isFinite));target.images++;},
  createRadialGradient(){return {addColorStop(){}};},
  createLinearGradient(){return {addColorStop(){}};},
  measureText(t){return {width:String(t).length*9};},
  images:0,pixels
 };
 return new Proxy(target,{get(obj,key){
  if(key in obj)return obj[key];
  if(typeof key==='string'&&['save','restore','clearRect','scale','translate','rotate','setTransform',
    'beginPath','closePath','moveTo','lineTo','arc','ellipse','stroke','strokeRect',
    'fill','fillText','setLineDash','roundRect','quadraticCurveTo','bezierCurveTo',
    'clip','rect','fillRect'].includes(key))return ()=>{};
  return undefined;
 }});
}
test('sprite render is native pixel artwork, reusable and cache does not allocate each frame',()=>{
 const oldDoc=globalThis.document;
 let created=0;
 globalThis.document={createElement(tag){
  assert.equal(tag,'canvas');created++;
  const ctx=mockCanvasContext();
  return {width:16,height:16,getContext(){return ctx;}};
 }};
 try{
  const s=field(),f=s.field,ctx=mockCanvasContext();
  assert.equal(drawHerbPixelGround(ctx,f),true);
  assert.ok(ctx.images>=f.worldW*f.worldH,'one native tile draw per cell');
  const first=created;
  assert.ok(first<=75,'sprite variants should be cached not allocated per tile');
  drawHerbPixelGround(ctx,f);
  assert.equal(created,first,'repeated frames reuse atlases');
  for(const [i,o] of f.obstacles.entries())drawHerbPixelObstacle(ctx,o,i);
  startActionField(s);
  for(const n of f.nodes)drawHerbPixelNode(ctx,n,0.3);
  drawHerbPixelHazard(ctx,{x:1,y:1},{active:true},1);
  assert.ok(ctx.images>f.worldW*f.worldH*2);
  assert.equal(drawHerbPixelGround(ctx,field('spring_safe').field),false,'non-meadow remains untouched');
 }finally{globalThis.document=oldDoc;}
});
test('full field canvas stays renderable and advances gameplay on separate sample branch',()=>{
 const oldDoc=globalThis.document,oldWindow=globalThis.window;
 let created=0;
 globalThis.window={devicePixelRatio:2};
 globalThis.document={createElement(tag){
  assert.equal(tag,'canvas');created++;
  const ctx=mockCanvasContext();
  return {width:16,height:16,getContext(){return ctx;}};
 }};
 try{
  for(const route of ['safe','risk','spring_safe']){
   const s=field(route);
   assert.ok(startActionField(s));
   const ctx=mockCanvasContext(),canvas={width:0,height:0,
    getBoundingClientRect(){return {width:375,height:600}},
    getContext(){return ctx;}};
   drawField(canvas,s,0.6);
   assert.equal(canvas.width,750);assert.equal(canvas.height,1200);
   assert.ok(ctx.images>0,'raster actors or tiles should draw');
   const before=s.field.elapsed;stepActionField(s,0,-1,.05);
   assert.ok(s.field.elapsed>before,'render never disables gameplay');
  }
 }finally{globalThis.document=oldDoc;globalThis.window=oldWindow;}
});
test('first branch segment displays pixel art, later ecology returns to prior renderer',()=>{
 const s=field('safe'),f=s.field;
 assert.equal(isHerbPixelSlice(f),true);
 f.nodes.find(n=>n.key==='target').claimed=true;
 assert.equal(completeFieldSegment(s),true);
 assert.ok(chooseFieldBranch(s,f.choices[0].choiceId));
 assert.equal(s.field.worldW,12);assert.equal(s.field.worldH,16);
 assert.equal(isHerbPixelSlice(s.field),false);
 assert.ok(s.field.nodes.some(n=>n.key==='target'));
});
test('pixel art comes from local code and offline build includes the source before field renderer',()=>{
 const script=readFileSync(new URL('../scripts/build-standalone.py',import.meta.url),'utf8');
 const scenes=readFileSync(new URL('../src/scenes_v04.js',import.meta.url),'utf8');
 assert.ok(script.indexOf("'field_pixel_herb_v011c.js'")<script.indexOf("'scenes_v04.js'"));
 assert.match(scenes,/isHerbPixelSlice\(f\)/);
 assert.match(scenes,/drawHerbPixelGround\(c,f\)/);
 assert.match(scenes,/drawHerbPixelObstacle/);
 assert.match(scenes,/drawHerbPixelNode/);
 assert.match(scenes,/drawHerbPixelHazard/);
});
