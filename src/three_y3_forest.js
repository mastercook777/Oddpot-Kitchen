import {createFieldEnemyModel} from './three_y3_enemy_models.js?v=z2c4';
import {createRecovery,sharedThree,visibleHost} from './three_y6a_recovery.js?v=y6a';
import {makeLandscapeY5d,landscapeSeed} from './three_y5d_landscape.js?v=y5d';
// Y3a: read-only 3D forest. No physics, inventory or combat simulation.
import {roundedFactory} from './three_y1_models.js?v=y1';
import {makeChefY2} from './three_y2b_chef.js?v=z2c12';
import {makeBladeTrail} from './three_y3d_trail.js?v=y5c3';
import {createWeaponRig} from './three_y3b_weapon_pose.js?v=z2c4';
import {skillMotion} from './three_y3d_pose.js?v=y5c3';
import {enemyHitVisual,pickupVisual} from './three_y3b_feedback.js';
import {makeFieldFx3D,makeTelegraphLayer} from './three_y3c_fx.js?v=y5c3';
import {fieldTilePath,hazardPhase} from './field_rules_v011a.js';
const ANGLE=Math.PI*55/180, SINE=Math.sin(ANGLE), COS=Math.cos(ANGLE);
export const FOREST_ZONES=Object.freeze({herb_path:'meadow',glow_mushroom:'glow',old_tree_edge:'roots',forest_garden:'garden',forest_secret:'glow',spore_gate:'roots',spore_roots:'roots'});
export const SPRING_ZONES=Object.freeze({hot_spring_shallows:'spring',steam_crack:'steam',ember_edge:'ember',steam_lake:'oasis',spring_market:'spring',ember_gate:'ember',ember_side:'ember'});
const THEMES={spring:{floor:'#bca68a',hue:.10,soil:'#dbc59d',sky:'#97b4aa',light:'#fff1c7',leaf:['#9ca899','#b6bbab','#d1c5a4','#9eaa9e'],grass:['#96a995','#c2b89d','#9eab9c']},steam:{floor:'#777b7d',hue:.58,soil:'#a9a7a0',sky:'#738486',light:'#e8f1ec',leaf:['#747c80','#929a99','#a7acaa','#5c686b'],grass:['#8d9895','#a8aaa4','#798b8b']},ember:{floor:'#654943',hue:.035,soil:'#a26c50',sky:'#594247',light:'#ffca98',leaf:['#5a4140','#794d43','#965b48','#614a45'],grass:['#b27d59','#97674d','#7f5650']},oasis:{floor:'#9eaa94',hue:.16,soil:'#c8c4a6',sky:'#83aea9',light:'#e3ffe8',leaf:['#85b2ad','#a8d9ce','#799e9b','#c2cfc4'],grass:['#8ab3a4','#a7c1a1','#b8cfb9']},meadow:{floor:'#809768',hue:.245,soil:'#a79a72',sky:'#536f58',light:'#ffe3ab',leaf:['#3e674a','#527b4b','#67894e','#83a45f'],grass:['#7e9b5a','#96ab6a','#607e4e']},glow:{floor:'#426b68',hue:.47,soil:'#6d8c82',sky:'#294d56',light:'#b9ebe0',leaf:['#2d625c','#387a70','#599184','#73aaa0'],grass:['#599184','#74b4a0','#3a7774']},roots:{floor:'#65605e',hue:.76,soil:'#9c8676',sky:'#434453',light:'#e6c4c9',leaf:['#494854','#5a5361','#706277','#88748b'],grass:['#7e747f','#a297a1','#5d5968']},garden:{floor:'#8b9d61',hue:.20,soil:'#b59b69',sky:'#657c55',light:'#fff0b6',leaf:['#557b39','#689345','#80a452','#a0b868'],grass:['#99af63','#b4bc75','#75944d']}};
export function forestTheme(f){return FOREST_ZONES[f?.biome?.zoneId]||null;}
export function field3DTheme(f){return forestTheme(f)||SPRING_ZONES[f?.biome?.zoneId]||null;}
export function springVentVisual(hz,elapsed,biome){const p=hazardPhase(hz,elapsed,biome),start=p.source==='spore'?3.15:3.45;return {...p,jet:p.active?Math.sin(Math.PI*Math.min(1,(p.phase-start)/(4.2-start)))*(biome?.style==='ember'?1.12:1.48):0};}
export function ventParticlePose(phase,j,t){const active=phase.active,warn=phase.warning,life=(j*.173+t*(active?1.9:.72))%1,spread=(active?.10+.22*life:.06+.055*life),a=j*2.399+t*.7;return {x:Math.cos(a)*spread,y:.09+life*(active?.52+phase.jet*.92:warn?.26+.32*phase.warningProgress:.12),z:Math.sin(a)*spread,scale:(.08+.19*life)*(active?1:warn?.64:.35),opacity:Math.sin(Math.PI*life)*(active?.74:warn?.43:.16)};}
export function y3Eligible(s){const f=s?.field;return s?.phase==='field'&&!!f?.action&&f.worldVersion==='0.11-B1'&&!!field3DTheme(f)&&s.activeWorld!=='cloud';}
export function y3Ground(x,y){return {x,z:y/SINE};}
export function y3CameraFrame(camera,w,h,sx=0,sy=0){const k=camera.scale;return {x:(w/2-camera.offsetX-sx)/k,y:(h/2-camera.offsetY-sy)/k,halfW:w/k/2,halfH:h/k/2};}
export function y3Facing(facing){const x=facing?.x||0,y=facing?.y||0;return Math.abs(x)>Math.abs(y)?x<0?'left':'right':y<0?'back':'front';}
let instance=null,entered=false;const recovery=createRecovery();
function state(v){document.documentElement.dataset.oddpotForest3d=v;}
function release(){if(instance){const old=instance;instance=null;old.dispose();}}
function leave(){if(!entered&&!instance)return;entered=false;release();recovery.reset();state('idle');}
function fail(e){recovery.fail();release();console.warn('Oddpot forest 3D fallback',e);state('fallback');globalThis.__oddpotBuild?.sceneErrors&&(globalThis.__oddpotBuild.sceneErrors.forest=String(e));}
export function enableY3(){
 state('idle');
 globalThis.__oddpotY3Renderer={leave,retry(){release();recovery.reset();sharedThree.reset();state('idle');},draw(canvas,s,t,w,h,camera,sx,sy){
  if(!y3Eligible(s)){leave();return false;}entered=true;
  if(!visibleHost(canvas)||!recovery.canTry())return false;
  const lib=sharedThree.value;if(!lib){sharedThree.tryLoad();state(sharedThree.exhausted?'fallback':'loading');return false;}
  try{if(!instance)instance=createForest(lib);instance.draw(canvas,s.field,t,w,h,camera,sx,sy);recovery.success();return true;}catch(e){fail(e);return false;}
 }};
}
function createForest(T){
 const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'}),element=renderer.domElement;
 Object.assign(element.style,{position:'absolute',inset:'0',width:'100%',height:'100%',zIndex:'0',pointerEvents:'none'});
 element.setAttribute('aria-hidden','true');element.dataset.oddpotForest='3d';
 let disposed=false;element.addEventListener('webglcontextlost',e=>{e.preventDefault();if(!disposed)fail(new Error('WebGL context lost'));});
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.20;
 const scene=new T.Scene();scene.background=new T.Color('#536f58');
 const camera=new T.OrthographicCamera(-4,4,5,-5,.1,65),rounded=roundedFactory(T);
 const material=(color,roughness=.86,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
 const bark=material('#77543b'),barkLight=material('#a17a52'),dark=material('#3f5142'),stone=material('#92948a'),stone2=material('#717e72'),moss=material('#7e9b53'),cream=material('#f4dfad'),copper=material('#bd854d',.45,.38),iron=material('#526b65',.43,.4),red=material('#b96043'),green=material('#59875a'),gold=material('#e5b960'),blue=material('#7a99ad'),purple=material('#9678a6'),ink=material('#3a3931');
 const leaves=['#3e674a','#527b4b','#67894e','#83a45f'].map(c=>material(c));
 const grasses=['#7e9b5a','#96ab6a','#607e4e'].map(c=>material(c));
 const sphere=new T.SphereGeometry(1,12,10),rock=new T.IcosahedronGeometry(1,1),boxCache=new Map(),cylinderCache=new Map();
 const hemi=new T.HemisphereLight('#f0ead1','#5b7756',2.1);scene.add(hemi);
 const sun=new T.DirectionalLight('#ffe3ab',2.6);sun.position.set(-4,13,3);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-12,right:12,top:12,bottom:-12,near:.1,far:40});sun.shadow.normalBias=.045;sun.target.position.set(6,0,10);scene.add(sun,sun.target);
 function group(p,x=0,y=0,z=0){const g=new T.Group();g.position.set(x,y,z);p.add(g);return g;}
 function mesh(p,g,m,x,y,z,shadow=true){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=shadow;o.receiveShadow=true;p.add(o);return o;}
 function ball(p,m,x,y,z,a,b,c,shadow=true){const o=mesh(p,sphere,m,x,y,z,shadow);o.scale.set(a,b,c);return o;}
 function box(p,m,x,y,z,w,h,d){const k=[w,h,d].join(':');if(!boxCache.has(k))boxCache.set(k,rounded(w,h,d,.035));return mesh(p,boxCache.get(k),m,x,y,z);}
 function cyl(p,m,x,y,z,a,b,h,n=14){const k=[a,b,h,n].join(':');if(!cylinderCache.has(k))cylinderCache.set(k,new T.CylinderGeometry(a,b,h,n));return mesh(p,cylinderCache.get(k),m,x,y,z);}
 function place(p,x,y,height=0){p.position.set(x,height,y/SINE);}
 function random(i){return ((Math.imul(i+1729,1664525)+1013904223)>>>0)%10007/10007;}
 function branch(p,a,b,r1,r2,m){const u=new T.Vector3(...a),v=new T.Vector3(...b),d=v.clone().sub(u),q=u.clone().add(v).multiplyScalar(.5),o=cyl(p,m,q.x,q.y,q.z,r1,r2,d.length(),9);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return o;}
 let terrain=null,mapKey='',treeCrowns=[],vents=[],pools=[],nodePool=new Map(),enemyPool=new Map(),uniqueTerrain=[],ambient=null,landscape=null,layoutSeed=0,theme=THEMES.meadow,style='meadow',zone='herb_path';const glow=material('#85e2cc');glow.emissive.set('#4ebda8');glow.emissiveIntensity=.85;const cap=material('#8881bd'),oldBark=material('#685349'),hazardMat=material('#b69ac1');
 const mineral=material('#e3d6ae'),basalt=material('#50464a'),basaltLight=material('#7d6660'),sulfur=material('#d9b758'),water=material('#74c9be',.24,.16),crystal=material('#88d8cf',.27,.12),ember=material('#e68441');ember.emissive.set('#db4b22');ember.emissiveIntensity=1.4;crystal.emissive.set('#276a63');crystal.emissiveIntensity=.25;
 const isSpring=()=>Object.values(SPRING_ZONES).includes(style);
 const pickupGeo=new T.RingGeometry(.80,1,40);pickupGeo.rotateX(-Math.PI/2);const pickupInner=new T.RingGeometry(.94,1,40);pickupInner.rotateX(-Math.PI/2);
 const actors=group(scene),hero=makeChefY2(T,rounded,true);actors.add(hero.root);hero.root.scale.setScalar(.72);
 const weaponRig=createWeaponRig(T,hero,rounded),combatFx=makeFieldFx3D(T,scene,SINE),telegraphs=makeTelegraphLayer(T,scene,SINE),bladeTrail=makeBladeTrail(T,scene);
 function tree(parent,o,i){const p=group(parent);place(p,o.x+.5,o.y+.5);
  if(style==='glow'&&(i%3!==1)){const canopy=group(p);for(let j=0;j<3;j++){const x=(j-1)*.25,z=(j%2)*.22,h=.45+random(i*19+j+layoutSeed%10007)*.95;cyl(p,cream,x,h*.45,z,.075,.13,h*.9);const r=.25+h*.13;ball(canopy,cap,x,h,z,r,.13+h*.055,r*.94);ball(canopy,glow,x,h-.08,z,r*.77,.045,r*.77);for(let k=0;k<6;k++){const a=k*Math.PI/3;ball(canopy,cap,x+Math.cos(a)*r*.78,h-.047,z+Math.sin(a)*r*.78,.09,.035,.09,false);}}treeCrowns.push({crown:canopy,x:o.x+.5,y:o.y+.5,h:1.35});return;}
  if(style==='roots'&&i%3!==2){const h=1.25+random(i*13+layoutSeed%10007)*.86,upper=group(p);branch(p,[0,0,0],[.09,h*.55,0],.23,.31,oldBark);branch(upper,[.09,h*.55,0],[.14,h,0],.16,.23,oldBark);for(let j=0;j<6;j++){const a=j*1.047+i*.37,r=.39+random(j*17+i)*.08;branch(p,[0,.29+j%2*.09,0],[Math.cos(a)*r,.025,Math.sin(a)*r],.06,.12,oldBark);branch(p,[Math.cos(a)*.25,.09,Math.sin(a)*.25],[Math.cos(a)*r,.02,Math.sin(a)*r],.025,.065,barkLight);}for(const k of [-1,1])branch(upper,[.09,h*.6,0],[k*.39,h+.19,.12],.045,.12,oldBark);for(let j=0;j<4;j++){const a=j*2.399;ball(p,cap,Math.cos(a)*.24,.16+j*.045,Math.sin(a)*.24,.12+j*.02,.05,.12,false);}treeCrowns.push({crown:upper,x:o.x+.5,y:o.y+.5,h});return;}
  if(style==='garden'&&i%3===0){for(let j=0;j<4;j++){const a=j*1.57;ball(p,leaves[j],Math.cos(a)*.24,.27,Math.sin(a)*.24,.30,.25,.30);ball(p,gold,Math.cos(a)*.27,.40,Math.sin(a)*.27,.065,.065,.065,false);}return;}
  if(i%5===2){for(let j=0;j<3;j++){const a=mesh(p,rock,j===0?stone:stone2,(j-1)*.22,.22+j*.025,(j%2)*.16);a.scale.set(.36-j*.06,.27+j*.06,.34-j*.05);a.rotation.y=i*.73+j;}ball(p,moss,-.10,.36,.05,.27,.07,.20);return;}
  const seed=layoutSeed%10007,variant=(i+seed)%4,h=1.12+random(i*7+seed)*.68+(variant===0?.35:0),lean=(random(i*19+seed)-.5)*.26;branch(p,[0,0,0],[lean,h,0],.12,.21,bark);for(let j=0;j<5;j++){const a=j*Math.PI*2/5;branch(p,[0,.20,0],[Math.cos(a)*.38,.015,Math.sin(a)*.38],.045,.095,bark);}
  for(const k of [-1,1])branch(p,[.03,h*.62,0],[k*.29,h+.18,.07],.07,.10,barkLight);
  const crown=group(p,lean,h,0);const spread=variant===0?.90:variant===1?1.10:1.0;
  for(let j=0;j<8;j++){const a=j*2.399+i*.71,r=j===0?0:(.27+random(i+j*31+seed)*.15)*spread;const q=ball(crown,leaves[(i+j)%4],Math.cos(a)*r,.13+random(i*53+j+seed)*.34,Math.sin(a)*r,(.34+random(j*11+i)*.12)*spread,.25+random(i*13+j)*.13,.37*spread);q.rotation.y=a;q.rotation.z=.18*Math.sin(a);}
  for(let j=0;j<3;j++)ball(crown,leaves[(j+2)%4],(j-1)*.18,.49+j*.07,(j%2)*.13,.33*spread,.24,.32*spread);
  for(let j=0;j<3;j++){const a=j*2.399+i;const x=Math.cos(a)*.26,z=Math.sin(a)*.26;ball(p,moss,x,.075,z,.14,.045,.12,false);}
  treeCrowns.push({crown,x:o.x+.5,y:o.y+.5,h});
 }
 function rebuild(f,key){if(terrain)scene.remove(terrain);for(const r of uniqueTerrain)r.dispose();uniqueTerrain=[];terrain=group(scene);treeCrowns=[];vents=[];pools=[];mapKey=key;
  style=field3DTheme(f)||'meadow';theme=THEMES[style];zone=f.biome?.zoneId||'herb_path';scene.background.set(theme.sky);sun.color.set(theme.light);hemi.color.set(style==='glow'||style==='oasis'?'#c7f2eb':style==='ember'?'#ffd5b3':'#f0ead1');leaves.forEach((m,i)=>m.color.set(theme.leaf[i]));grasses.forEach((m,i)=>m.color.set(theme.grass[i]));element.dataset.biome=zone;element.dataset.theme=style;element.dataset.region=isSpring()?'spring':'forest';
  const mw=f.worldW,mh=f.worldH,goal=(f.nodes||[]).find(n=>n.key==='target');
  const route=goal?fieldTilePath(f,f.spawn||f.pos,goal,{avoidHazards:true}):[];
  layoutSeed=landscapeSeed(f);landscape=makeLandscapeY5d(T,terrain,f,style,route,SINE);uniqueTerrain.push(...landscape.resources);
  element.dataset.landscape='y5d';for(const [k,v] of Object.entries(landscape.stats))element.dataset['landscape'+k[0].toUpperCase()+k.slice(1)]=String(v);
  // Hot spring/oasis obstacle basins are already rendered by the new layer.
  if(!isSpring())(f.obstacles||[]).forEach((o,i)=>tree(terrain,o,i));
  // Only existing hazard cells: never introduce collision or an extra damage tile.
  for(const hz of f.hazards||[]){
   const p=group(terrain);place(p,hz.x+.5,hz.y+.5);
   const hot=style==='ember',spore=style==='roots',rim=hot?basalt:spore?oldBark:mineral,inside=hot?ember:spore?cap:water;
   // Broken asymmetric mineral / fungal vent, contained inside the real cell.
   for(let j=0;j<9;j++){const a=j*2*Math.PI/9,r=.30+.035*Math.sin(j*2.7),o=mesh(p,rock,j%3===0?(hot?basaltLight:spore?hazardMat:sulfur):rim,Math.cos(a)*r,.055+random(j+hz.x*17)*.065,Math.sin(a)*r,false);o.scale.set(.12,.08+random(j*19)*.095,.11);o.rotation.set(.25*j,j*1.13,.27);}
   ball(p,inside,0,.031,0,.25,.028,.25,false);
   if(spore)for(let j=0;j<4;j++){const a=j*1.57+.35,x=Math.cos(a)*.29,z=Math.sin(a)*.29,h=.14+j*.035;cyl(p,cream,x,h*.5,z,.028,.042,h,7);ball(p,cap,x,h,z,.09,.045,.09,false);}
   if(hot)for(let j=0;j<4;j++){const a=j*1.57;branch(p,[Math.cos(a)*.16,.045,Math.sin(a)*.16],[Math.cos(a)*.33,.065,Math.sin(a)*.33],.014,.025,ember);}
   const jet=group(p),bubbles=[],drops=[];
   // Procedural soft particles with a radial volume-like opacity profile.
   // No image assets, billboards remain in world coordinates and depth-tested.
   const plumeGeo=new T.PlaneGeometry(1,1);uniqueTerrain.push(plumeGeo);
   for(let j=0;j<12;j++){const mat=new T.ShaderMaterial({uniforms:{tint:{value:new T.Color(hot?'#ffd6a1':spore?'#d7adf4':'#e5f9f6')},opacity:{value:0},seed:{value:j*.73},time:{value:0}},vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying vec2 vUv; uniform vec3 tint; uniform float opacity; uniform float seed; uniform float time; void main(){vec2 p=vUv*2.0-1.0;float r=length(p);float n=sin(p.x*8.0+p.y*5.0+seed+time*2.0)*sin(p.y*9.0-p.x*4.0+seed);float a=pow(max(0.0,1.0-r),1.6)*(0.78+0.22*n);gl_FragColor=vec4(tint,a*opacity);}',transparent:true,depthWrite:false,side:T.DoubleSide});uniqueTerrain.push(mat);const o=mesh(jet,plumeGeo,mat,0,0,0,false);o.receiveShadow=false;bubbles.push(o);}
   const dropMat=new T.MeshBasicMaterial({color:hot?'#ffbb63':spore?'#e3b9ff':'#b8f4ef',transparent:true,opacity:.8,depthWrite:false});uniqueTerrain.push(dropMat);
   for(let j=0;j<8;j++){const o=ball(jet,dropMat,0,0,0,.025,.06,.025,false);o.receiveShadow=false;drops.push(o);}vents.push({hz,jet,bubbles,drops,dropMat});
  }
  // Retain themed landmark behind map; groundcover is instanced by Y5d.
  if(style==='roots'){const p=group(terrain,mw*.5,0,-1.05/SINE);branch(p,[-1.8,.04,0],[-.55,1.9,0],.30,.46,oldBark);branch(p,[1.8,.04,0],[.55,1.9,0],.30,.46,oldBark);branch(p,[-.55,1.9,0],[.55,1.9,0],.33,.33,oldBark);for(let j=0;j<5;j++)ball(p,cap,-1+j*.5,1.90,0,.23,.12,.19);}
  const dustGeo=new T.SphereGeometry(.018,6,4),dustMat=new T.MeshBasicMaterial({color:'#fff2bc',transparent:true,opacity:.52,depthWrite:false});ambient=new T.InstancedMesh(dustGeo,dustMat,32);uniqueTerrain.push(dustGeo,dustMat,ambient);terrain.add(ambient);
  // No stale nodes or enemies survive a segment change.
  for(const pool of [nodePool,enemyPool])for(const item of pool.values()){actors.remove(item);for(const m of [...(item.userData.flashMats||[]),...(item.userData.ownedMats||[])])m.dispose();for(const g of item.userData.ownedGeos||[])g.dispose();}nodePool.clear();enemyPool.clear();
 }
 function node(n){const root=group(actors),p=group(root);const id=n.id||'mushroom',ownedGeos=[];
  if(n.type==='event'){if(n.kind==='ecology'){for(let i=0;i<5;i++)ball(p,i%2?gold:purple,Math.cos(i*1.26)*.18,.32,Math.sin(i*1.26)*.18,.13,.18,.11);cyl(p,green,0,.18,0,.07,.11,.34);}
   else{ball(p,blue,0,.31,0,.25,.29,.18);ball(p,cream,0,.64,.02,.22,.21,.20);ball(p,bark,0,.79,0,.31,.10,.27);box(p,barkLight,0,.32,-.20,.34,.40,.16);}}
  else if(id.includes('mushroom')){for(let i=0;i<3;i++){const x=(i-1)*.18,z=(i%2)*.09;cyl(p,cream,x,.17,z,.055,.07,.28);ball(p,id==='mushroom_heart'?purple:red,x,.33,z,.17,.115,.16);ball(p,cream,x-.06,.40,z,.04,.018,.04);}}
  else if(id==='cabbage'||id==='sky_moss'){for(let i=0;i<6;i++){const a=i*1.05,o=ball(p,i%2?green:moss,Math.cos(a)*.12,.17,Math.sin(a)*.12,.19,.14,.15);o.rotation.z=Math.sin(a)*.45;}ball(p,green,0,.25,0,.16,.13,.16);}
  else if(id==='chili'||id==='ember_pepper'){const o=ball(p,id==='ember_pepper'?ember:red,0,.19,0,.12,.25,.11);o.rotation.z=.54;branch(p,[-.1,.35,0],[-.16,.43,0],.025,.035,green);}
  else if(id==='garlic'){for(let j=0;j<5;j++){const a=j*1.256;ball(p,cream,Math.cos(a)*.075,.16,Math.sin(a)*.075,.11,.14,.11);}cyl(p,green,0,.32,0,.025,.04,.18);}
  else if(id==='onion'||id==='potato'){for(let i=0;i<3;i++)ball(p,id==='onion'?cream:barkLight,(i-1)*.15,.15,i%2*.12,.14,.14,.13);if(id==='onion')for(let i=0;i<3;i++)ball(p,green,(i-1)*.05,.34,0,.036,.17,.035);}
  else if(id==='chicken'){
   const leg=group(p);leg.rotation.z=-.55;ball(leg,barkLight,-.09,.22,0,.24,.17,.17);ball(leg,cream,-.10,.30,.03,.20,.08,.15);
   cyl(leg,cream,.19,.20,0,.055,.055,.26).rotation.z=Math.PI/2;for(const z of [-.05,.05])ball(leg,cream,.32,.20,z,.075,.075,.075);
  }else if(id==='beef'){
   const steak=group(p);steak.rotation.y=.45;const sh=new T.Shape();sh.moveTo(-.31,-.12);sh.bezierCurveTo(-.35,-.28,.06,-.30,.24,-.15);sh.bezierCurveTo(.41,.02,.26,.26,.02,.22);sh.bezierCurveTo(-.18,.26,-.35,.13,-.31,-.12);
   const g=new T.ExtrudeGeometry(sh,{depth:.095,bevelEnabled:true,bevelSize:.035,bevelThickness:.025,bevelSegments:2,curveSegments:12});g.rotateX(-Math.PI/2);ownedGeos.push(g);
   mesh(steak,g,red,0,.09,0);mesh(steak,g,cream,0,.07,0).scale.set(1.10,.65,1.10);
   for(let j=0;j<3;j++){const m=box(steak,cream,-.12+j*.12,.218,.02,.035,.014,.16);m.rotation.y=.45+j*.18;}
  }
  else{ball(p,gold,0,.20,0,.23,.18,.22);ball(p,green,0,.36,0,.07,.06,.12);}
  const v=pickupVisual(n,0),m=new T.MeshBasicMaterial({color:v.color,transparent:true,opacity:v.opacity,depthWrite:false,side:T.DoubleSide}),m2=m.clone();m2.opacity=.20;
  const ring=mesh(root,pickupGeo,m,0,.025,0,false),outer=mesh(root,pickupInner,m2,0,.026,0,false);ring.scale.setScalar(v.radius);outer.scale.setScalar(v.radius*1.23);
  root.userData={item:p,ring,outer,ownedMats:[m,m2],ownedGeos};return root;
 }
 function enemy(e){return createFieldEnemyModel(T,actors,e,{group,ball,cyl,box,branch},{basalt,basaltLight,red,ember,sulfur,ink,purple,cream,barkLight,gold,bark,stone2,moss,copper,green,blue});}
 function sync(pool,items,build,fn){const live=new Set();for(const v of items){const k=v.key??v.id;live.add(k);let p=pool.get(k);if(!p){p=build(v);pool.set(k,p);}p.visible=true;fn(p,v);}for(const [k,p] of pool)if(!live.has(k))p.visible=false;}
 const ambientDummy=new T.Object3D();let lastW=0,lastH=0;
 return {element,draw(canvas,f,t,w,h,cam,sx,sy){
  if(element.parentElement!==canvas.parentElement)canvas.parentElement.insertBefore(element,canvas);
  const rw=Math.max(1,Math.round(w*Math.min(devicePixelRatio||1,1.35))),rh=Math.max(1,Math.round(h*Math.min(devicePixelRatio||1,1.35)));if(rw!==lastW||rh!==lastH){renderer.setSize(rw,rh,false);lastW=rw;lastH=rh;}
  const key=[f.worldW,f.worldH,f.biome?.zoneId,f.biome?.encounterSeed,f.segmentIndex,(f.obstacles||[]).map(o=>o.x+','+o.y).join(';')].join('|');if(key!==mapKey)rebuild(f,key);
  const v=y3CameraFrame(cam,w,h,sx,sy),center=y3Ground(v.x,v.y);camera.left=-v.halfW;camera.right=v.halfW;camera.top=v.halfH;camera.bottom=-v.halfH;camera.position.set(center.x,SINE*20,center.z+COS*20);camera.lookAt(center.x,0,center.z);camera.updateProjectionMatrix();
  for(const [i,q] of treeCrowns.entries()){q.crown.visible=!(f.pos.y<q.y&&q.y-f.pos.y<(q.h||1.2)*.92&&Math.abs(f.pos.x-q.x)<.86);q.crown.rotation.z=style==='roots'?0:Math.sin(t*.65+i*.73)*.025;}
  landscape?.update(t);
  for(const [i,v] of vents.entries()){const p=springVentVisual(v.hz,f.elapsed,f.biome);v.jet.visible=true;
   for(const [j,o] of v.bubbles.entries()){const q=ventParticlePose(p,j,f.elapsed+i*.19);o.position.set(q.x,q.y,q.z);o.quaternion.copy(camera.quaternion);o.scale.set(q.scale*2.5,q.scale*3.2,1);o.material.uniforms.opacity.value=q.opacity;o.material.uniforms.time.value=f.elapsed;}
   v.dropMat.opacity=p.active?.85:p.warning?.48:0;for(const [j,o] of v.drops.entries()){const u=(j*.137+f.elapsed*2.6)%1,a=j*2.399;o.visible=p.active||p.warning;o.position.set(Math.cos(a)*u*.34,.06+Math.sin(Math.PI*u)*(p.active?.35+p.jet*.8:.13),Math.sin(a)*u*.34);o.scale.set(.022,.036+.035*(1-u),.022);}}
  for(const [i,o] of pools.entries()){o.scale.setScalar(.24+((t*.28+i*.17)%1)*.28);o.material.opacity=.45*(1-((t*.28+i*.17)%1));}
  sync(nodePool,(f.nodes||[]).filter(n=>!n.claimed),node,(p,n)=>{place(p,n.x,n.y);const v=pickupVisual(n,t),u=p.userData;u.item.position.y=v.bob;u.ring.material.opacity=v.opacity;u.outer.material.opacity=v.opacity*.30;u.outer.scale.setScalar(v.radius*(1.20+.06*Math.sin(t*3+n.x)));});
  sync(enemyPool,(f.enemies||[]).filter(e=>e.hp>0||e.deathFx>0),enemy,(p,e)=>{place(p,e.x,e.y);const body=p.userData.body,v=enemyHitVisual(e);p.rotation.y=Math.atan2(f.pos.x-e.x,(f.pos.y-e.y)/SINE);body.position.y=e.moving?Math.abs(Math.sin(t*10+e.x))*.035:0;body.scale.set(v.sx,v.sy,v.sz);body.rotation.z=v.tilt*(e.hitResponse?.dx||1);const wind=e.warning>0?Math.max(0,Math.min(1,1-e.warning/(e.windupTotal||1))):0,rush=!!(e.ecologyRush||e.rush),stride=e.moving?Math.sin(t*(rush?19:9)+e.x):0;body.rotation.x=-v.tilt*(e.hitResponse?.dy||0)+(rush?.19:wind*.14);body.scale.y*=1-wind*.13;for(const [i,l] of p.userData.limbs.entries())l.rotation.x=stride*(i%3===0?1:-1)*(rush?.62:.33);for(const [i,l] of p.userData.wings.entries())l.rotation.z=(i===0?-1:1)*(e.moving?.25+Math.abs(stride)*.60:wind*.70);if(p.userData.skull)p.userData.skull.rotation.x=rush?.34:wind*.34;if(e.kind==='chicken')body.position.y+=Math.abs(stride)*.055+wind*.08;if(e.kind==='sporeling'||e.kind==='pepper')body.scale.x*=1+wind*.12;for(const m of p.userData.flashMats){m.emissive.set('#fff1c7');m.emissiveIntensity=v.flash*.85;}});
  place(hero.root,f.pos.x,f.pos.y);const facing=y3Facing(f.facing);hero.update(t,{facing,moving:!!f.moving,working:false,carrying:false});const aim=f.weapon?.type==='GRILL'&&f.skillFx>0&&f.skillOrigin?.type==='GRILL'?{x:f.skillOrigin.dx,y:f.skillOrigin.dy}:f.attackFx?.ttl>0&&Number.isFinite(f.attackFx.dx)?{x:f.attackFx.dx,y:f.attackFx.dy}:f.facing;if(aim&&Math.hypot(aim.x,aim.y)>.01)hero.root.rotation.y=Math.atan2(aim.x,aim.y/SINE);const skill=skillMotion(f);if(skill?.type==='WOK')hero.root.rotation.y+=skill.spin;weaponRig.update(f,t);const nativeBlade=bladeTrail.draw(f,weaponRig);
  if(ambient){const dummy=ambientDummy;for(let i=0;i<32;i++){dummy.position.set(random(i*31)*f.worldW+Math.sin(t*.5+i)*.13,.22+random(i*23)*1.9+Math.sin(t*.7+i)*.08,(random(i*53)*f.worldH)/SINE+Math.cos(t*.4+i)*.14);dummy.updateMatrix();ambient.setMatrixAt(i,dummy.matrix);}ambient.instanceMatrix.needsUpdate=true;}
  const fork=weaponRig.forkWorld(),fluidFx=combatFx.draw(f,t,nativeBlade,fork,camera);element.dataset.fireVolume=String(fluidFx.volume);element.dataset.forkAxis=fork?fork.axis.toArray().join(','):'';element.dataset.forkTip=fork?fork.tip.toArray().join(','):'';element.dataset.forkAxial=fork?.locked?'1':'0';element.dataset.fluidCount=String(fluidFx.count);element.dataset.fluidKinds=fluidFx.kinds;element.dataset.forkPhase=fork?.phase||'idle';element.dataset.skillKind=skill?.type||'';const gripError=weaponRig.forkGripError();element.dataset.forkGripError=gripError==null?'':String(gripError);element.dataset.telegraphCount=String(telegraphs.draw(f,t));renderer.render(scene,camera);document.documentElement.dataset.oddpotForest3d='active';
 },dispose(){disposed=true;element.remove();bladeTrail.dispose();combatFx.dispose();telegraphs.dispose();const geometries=new Set(),materials=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const g of boxCache.values())g.dispose();for(const g of cylinderCache.values())g.dispose();for(const g of uniqueTerrain)g.dispose();renderer.dispose();renderer.forceContextLoss();}};
}
