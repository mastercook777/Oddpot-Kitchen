// Actual scene/effect keyframes using native Canvas, never a concept mockup.
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {newGame,enterField} from '../src/engine.js';
import {generateBiomeMap} from '../src/field_biomes_v081.js';
import {expandFieldMap} from '../src/field_world_v011b1.js';
import {startActionField} from '../src/field_v04.js';
import {fieldTilePath} from '../src/field_rules_v011a.js';
import {drawField} from '../src/scenes_v04.js';
const require=createRequire(import.meta.url);
let canvasRuntime;try{canvasRuntime=require('@napi-rs/canvas');}catch{canvasRuntime=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas');}
const {createCanvas,loadImage}=canvasRuntime;
globalThis.window={devicePixelRatio:2};globalThis.document={createElement:()=>createCanvas(1,1)};
const zones=['herb_path','glow_mushroom','old_tree_edge','forest_garden','hot_spring_shallows','steam_crack','ember_edge','steam_lake'];
const out='docs/screenshots/rollout';await mkdir(out,{recursive:true});const report=[];
for(const zone of zones){
 const s=newGame(20261013),route=/^(hot_|steam_|ember_)/.test(zone)?'spring_safe':'safe';s.phase='field';enterField(s,route);
 Object.assign(s.field,expandFieldMap(generateBiomeMap({...s,fieldZoneId:zone},route),s.seed));startActionField(s);
 const f=s.field,target=f.nodes.find(n=>n.key==='target'),path=fieldTilePath(f,f.spawn,target,{avoidHazards:true});f.pos={...path[Math.max(0,path.length-2)]};f.elapsed=3.2;
 for(const [w,h] of [[390,620],[320,350]]){
  const cv=createCanvas(w*2,h*2);cv.getBoundingClientRect=()=>({width:w,height:h});const before=JSON.stringify(s),t=performance.now();
  drawField(cv,s,3.2);const firstMs=performance.now()-t,times=[];
  for(let i=0;i<60;i++){const a=performance.now();drawField(cv,s,3.2+i*.016);times.push(performance.now()-a);}
  if(JSON.stringify(s)!==before)throw new Error('Mutated '+zone);
  await writeFile(`${out}/${zone}-${w}.png`,cv.toBuffer('image/png'));
  times.sort((a,b)=>a-b);report.push({zone,w,h,firstMs,meanMs:times.reduce((a,b)=>a+b)/times.length,p95Ms:times[56]});
 }
 // Controlled snapshots use REAL renderer fields; no reward / battle simulation changes.
 for(const weapon of ['WOK','POT']){
  f.weapon.type=weapon;f.attackFx={ttl:.2,duration:.33,dx:1,dy:0,pot:weapon==='POT'};f.skillFx=.24;f.hitFlash=.2;f.shieldFlash=.2;
  f.projectiles=[{x:f.pos.x+.6,y:f.pos.y-.4,vx:-1,vy:0,source:'spore'}];
  f.playerProjectiles=[{x:f.pos.x-.3,y:f.pos.y-.4,fromX:f.pos.x,fromY:f.pos.y,targetX:f.pos.x-1,targetY:f.pos.y-1,time:.19,duration:.38}];
  f.popFx=[{x:f.pos.x+1,y:f.pos.y-.3,text:'💥',ttl:.32},{x:f.pos.x-.4,y:f.pos.y+.3,text:'+2',ttl:.55}];
  for(const e of f.enemies){e.hurtFx=.24;e.warning=.4;e.windupTotal=.7;e.aim={...f.pos};e.attackOrigin={x:e.x,y:e.y};}
  const cv=createCanvas(780,1240);cv.getBoundingClientRect=()=>({width:390,height:620});drawField(cv,s,3.2);
  await writeFile(`${out}/${zone}-${weapon}-effects.png`,cv.toBuffer('image/png'));
 }
}
await writeFile(`${out}/render-performance.json`,JSON.stringify({kind:'native Canvas timings; not iPhone FPS or touch acceptance',scenes:report},null,2));
// A review sheet makes the eight real scenes easy to inspect together.

const sheet=createCanvas(1280,1100),c=sheet.getContext('2d');c.fillStyle='#e9e7d7';c.fillRect(0,0,1280,1100);c.font='18px sans-serif';c.fillStyle='#3d5745';
for(let i=0;i<zones.length;i++){const x=(i%4)*320,y=Math.floor(i/4)*550;c.fillText(zones[i],x+14,y+25);c.drawImage(await loadImage(`${out}/${zones[i]}-390.png`),x+10,y+40,300,477);}
await writeFile(`${out}/eight-biomes-review.png`,sheet.toBuffer('image/png'));console.log('Rendered 32 actual scene/effect snapshots and eight-biome review; retained performance record.');
