import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MINI_BOSS_PATTERNS,stepMiniBoss,stepBossZones,bossChargeEnd,drawPixelMiniBoss,drawMiniBossWarning} from '../src/field_bosses_v011g.js';
import {ingredientIconHtml,ingredientIconUrl} from '../src/ingredient_icons_v011g.js';
import {ingredientSpriteCanvas,drawHerbPixelNode} from '../src/field_pixel_herb_v011c.js?v=0.13.0-alpha.8';
import {drawFieldNodeMarkers,drawFieldActorIndicators} from '../src/field_effects_v011e2.js';
import {ING} from '../src/data.js';
const boss=kind=>({id:kind,kind,isBoss:true,x:5,y:5,hp:10,maxHp:10,cooldown:0});
const field=e=>({pos:{x:5,y:7},enemies:[e],projectiles:[],finished:false});
const callbacks={blocked:()=>false,hurt(){}};
function context(){const calls=[];return new Proxy({calls},{get(o,k){return k in o?o[k]:(...args)=>{for(const n of args)if(typeof n==='number')assert.ok(Number.isFinite(n),k);calls.push([k,...args]);};},set:(o,k,v)=>(o[k]=v,true)});}
test('each mini boss cycles three distinct attacks, locks aim and recovers',()=>{
 for(const kind of Object.keys(MINI_BOSS_PATTERNS)){
  const e=boss(kind),f=field(e);
  for(const pattern of MINI_BOSS_PATTERNS[kind]){
   e.cooldown=0;stepMiniBoss(f,e,0,callbacks);assert.equal(e.bossAttack.kind,pattern.kind);
   assert.equal(e.warning,pattern.windup);const locked={...e.bossAttack.aim};
   f.pos={x:7,y:7};stepMiniBoss(f,e,pattern.windup-.01,callbacks);assert.deepEqual(e.bossAttack.aim,locked);
   const n=f.projectiles.length;stepMiniBoss(f,e,.02,callbacks);assert.equal(e.cooldown,2.2);
   if(pattern.kind==='fan')assert.equal(f.projectiles.length-n,3);
   if(pattern.kind==='ring')assert.equal(f.projectiles.length-n,7);
   if(pattern.kind==='burst')assert.deepEqual({x:f.bossZones.at(-1).x,y:f.bossZones.at(-1).y},locked);
   if(e.rush){stepMiniBoss(f,e,1,callbacks);assert.equal(e.rush,null);}
   e.x=5;e.y=5;f.pos={x:5,y:7};
  }
 }
});
test('spore ring leaves locked direction open instead of closing all eight spokes',()=>{
 const e=boss('boss_spore'),f=field(e);e.attackCycle=2;stepMiniBoss(f,e,0,callbacks);stepMiniBoss(f,e,2,callbacks);
 assert.equal(f.projectiles.length,7);assert.ok(f.projectiles.every(p=>Math.abs(Math.atan2(p.vy,p.vx)-Math.PI/2)>.1));
});
test('charge endpoint and actual motion stop at obstacles and never exceed short range',()=>{
 const blocked=(f,p)=>p.x>=6;const end=bossChargeEnd({}, {x:5,y:5},{x:9,y:5},blocked);
 assert.ok(end.x<6&&end.x>5.8);const e=boss('boss_ember'),f=field(e);f.pos={x:8,y:5};e.attackCycle=1;
 stepMiniBoss(f,e,0,{...callbacks,blocked});stepMiniBoss(f,e,1,{...callbacks,blocked});
 for(let i=0;i<30;i++)stepMiniBoss(f,e,.04,{...callbacks,blocked});assert.ok(e.x<6);assert.equal(e.rush,null);
 assert.equal(e.bossAttack,null);assert.ok(Math.hypot(bossChargeEnd({}, {x:0,y:0},{x:9,y:0},()=>false).x,0)<=2.4);
});
test('locked burst can be escaped, retains real source, and dies with its owner',()=>{
 const e=boss('boss_spore'),f=field(e);e.attackCycle=1;stepMiniBoss(f,e,0,callbacks);f.pos={x:8,y:8};stepMiniBoss(f,e,1.1,callbacks);
 const hits=[];stepBossZones(f,.03,(...a)=>hits.push(a));assert.equal(hits.length,0);
 f.pos={x:5,y:7};stepBossZones(f,.03,(...a)=>hits.push(a));assert.equal(hits[0][0],1);assert.equal(hits[0][1],'spore');
 e.hp=0;e.rush={end:{x:9,y:9}};stepMiniBoss(f,e,.03,callbacks);stepBossZones(f,.03,()=>assert.fail('dead boss hit'));
 assert.equal(e.rush,null);assert.equal(e.bossAttack,null);assert.equal(f.bossZones.length,0);
});
test('old save windup completes once and serialized warnings resume without re-aiming',()=>{
 const e=boss('boss_ember'),f=field(e);e.warning=.25;e.windupTotal=.85;e.aim={x:5,y:7};
 stepMiniBoss(f,e,.1,callbacks);const loaded=JSON.parse(JSON.stringify({e,f}));loaded.f.enemies=[loaded.e];
 loaded.f.pos={x:8,y:5};stepMiniBoss(loaded.f,loaded.e,.2,callbacks);
 assert.equal(loaded.f.projectiles.length,3);assert.ok(loaded.f.projectiles[1].vy>3);assert.equal(loaded.e.bossAttack,null);
});
test('boss bodies are detailed pixel primitives; warnings stay smooth and read-only',()=>{
 for(const kind of Object.keys(MINI_BOSS_PATTERNS)){
  const e=boss(kind),f=field(e);stepMiniBoss(f,e,0,callbacks);const before=JSON.stringify(e),c=context();
  drawPixelMiniBoss(c,e,2,40);assert.ok(c.calls.filter(x=>x[0]==='fillRect').length>30);
  const warning=context();drawMiniBossWarning(warning,e);assert.ok(warning.calls.some(x=>x[0]==='stroke'));assert.ok(!warning.calls.some(x=>x[0]==='fillRect'));
  drawFieldActorIndicators(c,e,40);assert.ok(c.calls.some(x=>x[0]==='roundRect'&&x[2]===-54));assert.equal(JSON.stringify(e),before);
 }
});
test('twelve ingredient icons share field raster cache; invalid IDs never emit markup',()=>{
 const old=globalThis.document;let number=0;globalThis.document={createElement(){const id=++number;return {width:0,height:0,getContext:context,toDataURL:()=>`data:image/png;test,${id}`};}};
 try{const urls=[];for(const id of Object.keys(ING)){assert.strictEqual(ingredientSpriteCanvas(id),ingredientSpriteCanvas(id));const url=ingredientIconUrl(id);urls.push(url);assert.equal(url,ingredientSpriteCanvas(id).toDataURL());assert.equal(url,ingredientIconUrl(id));assert.match(ingredientIconHtml(id),new RegExp(`data-ingredient-icon="${id}"`));}assert.equal(new Set(urls).size,12);assert.equal(ingredientIconHtml('invalid'), '');}finally{globalThis.document=old;}
});
test('merchant body keeps screen size at both zooms and smooth exclamation has no star glyph',()=>{
 const old=globalThis.document;globalThis.document={createElement:()=>({getContext:context})};
 try{for(const sc of [28,48]){const c=context(),n={x:5,y:5,type:'event'};drawHerbPixelNode(c,n,0,false,sc);drawFieldNodeMarkers(c,n,0,sc);assert.ok(c.calls.some(x=>x[0]==='drawImage'&&x[4]===28&&x[5]===39.2));assert.ok(c.calls.some(x=>x[0]==='moveTo'&&x[2]===-39));assert.ok(!c.calls.some(x=>x[0]==='fillText'));}}finally{globalThis.document=old;}
});
test('formal ingredient UI and offline package use same icons, preserving live element identity',()=>{
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');assert.ok(!/ING\[[^\]]+\]\.emoji|ing\.emoji/.test(app));
 assert.match(app,/class="v063-food-icon" data-live-icon="\$\{d.id\}"/);
 const offline=readFileSync(new URL('../standalone.html',import.meta.url),'utf8');assert.match(offline,/function stepMiniBoss/);assert.match(offline,/function ingredientIconHtml/);
});
