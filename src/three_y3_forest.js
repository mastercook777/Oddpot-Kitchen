// Y3a: read-only 3D forest. No physics, inventory or combat simulation.
import {roundedFactory} from './three_y1_models.js?v=y1';
import {makeChefY2} from './three_y2b_chef.js?v=y5c';
import {makeBladeTrail} from './three_y3d_trail.js';
import {createWeaponRig} from './three_y3b_weapon_pose.js?v=y5c';
import {enemyHitVisual,pickupVisual} from './three_y3b_feedback.js';
import {makeFieldFx3D,makeTelegraphLayer} from './three_y3c_fx.js?v=y5b2';
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
let instance=null,loading=null,disabled=false,lib=null,epoch=0;
function fail(e){disabled=true;leave();console.warn('Oddpot forest 3D fallback',e);document.documentElement.dataset.oddpotForest3d='fallback';}
function leave(){if(!instance)return;epoch++;const old=instance;instance=null;old.dispose();if(!disabled)document.documentElement.dataset.oddpotForest3d='idle';}
export function enableY3(){
 globalThis.__oddpotY3Renderer={leave,draw(canvas,s,t,w,h,camera,sx,sy){
  if(!y3Eligible(s)||disabled){if(instance)leave();return false;}
  if(!lib){if(!loading){document.documentElement.dataset.oddpotForest3d='loading';loading=import('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js').then(T=>{lib=T;}).catch(fail);}return false;}
  try{if(!instance)instance=createForest(lib);instance.draw(canvas,s.field,t,w,h,camera,sx,sy);return true;}catch(e){fail(e);return false;}
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
 let terrain=null,mapKey='',treeCrowns=[],vents=[],pools=[],nodePool=new Map(),enemyPool=new Map(),uniqueTerrain=[],ambient=null,theme=THEMES.meadow,style='meadow',zone='herb_path';const glow=material('#85e2cc');glow.emissive.set('#4ebda8');glow.emissiveIntensity=.85;const cap=material('#8881bd'),oldBark=material('#685349'),hazardMat=material('#b69ac1');
 const mineral=material('#e3d6ae'),basalt=material('#50464a'),basaltLight=material('#7d6660'),sulfur=material('#d9b758'),water=material('#74c9be',.24,.16),crystal=material('#88d8cf',.27,.12),ember=material('#e68441');ember.emissive.set('#db4b22');ember.emissiveIntensity=1.4;crystal.emissive.set('#276a63');crystal.emissiveIntensity=.25;
 const isSpring=()=>Object.values(SPRING_ZONES).includes(style);
 const pickupGeo=new T.RingGeometry(.80,1,40);pickupGeo.rotateX(-Math.PI/2);const pickupInner=new T.RingGeometry(.94,1,40);pickupInner.rotateX(-Math.PI/2);
 const actors=group(scene),hero=makeChefY2(T,rounded,true);actors.add(hero.root);hero.root.scale.setScalar(.72);
 const weaponRig=createWeaponRig(T,hero,rounded),combatFx=makeFieldFx3D(T,scene,SINE),telegraphs=makeTelegraphLayer(T,scene,SINE),bladeTrail=makeBladeTrail(T,scene);
 function tree(parent,o,i){const p=group(parent);place(p,o.x+.5,o.y+.5);
  if(isSpring()){
   if(style==='oasis'){for(let j=0;j<5;j++){const a=j*2.4,h=.30+random(i*21+j)*.75;const shard=mesh(p,new T.CylinderGeometry(0,.14,h,5),crystal,Math.cos(a)*.20,h*.5,Math.sin(a)*.20);uniqueTerrain.push(shard.geometry);shard.rotation.z=Math.sin(a)*.28;}ball(p,mineral,0,.075,0,.43,.10,.42,false);}
   else if(style==='spring'){for(let j=0;j<3;j++){const r=.43-j*.075;const shelf=cyl(p,j===2?sulfur:mineral,0,.075+j*.115,0,r*.9,r,.15,9);shelf.rotation.y=i*.7+j*.4;}ball(p,water,.03,.37,0,.23,.025,.19,false);}
   else {for(let j=0;j<3;j++){const q=mesh(p,rock,j%2?basaltLight:basalt,(j-1)*.17,.23+j*.18,(j%2)*.12);q.scale.set(.26,.34+j*.13,.30);q.rotation.set(.15*j,i*.7+j,.18*j);}if(style==='ember'){for(let j=0;j<3;j++)branch(p,[-.28+j*.18,.12,0],[-.18+j*.18,.38+j*.08,.23],.023,.028,ember);}}
   return;
  }
  if(style==='glow'&&(i%3!==1)){for(let j=0;j<3;j++){const x=(j-1)*.25,z=(j%2)*.22,h=.45+random(i*19+j)*.78;cyl(p,cream,x,h*.45,z,.075,.13,h*.9);ball(p,cap,x,h,z,.30+h*.12,.15,.34);ball(p,glow,x,h-.08,z,.23,.07,.25);}return;}
  if(style==='roots'&&i%3!==2){const h=1.3+random(i*13)*.8;branch(p,[0,0,0],[.14,h,0],.20,.32,oldBark);for(let j=0;j<5;j++){const a=j*1.256;branch(p,[0,.32,0],[Math.cos(a)*.47,.025,Math.sin(a)*.47],.075,.15,oldBark);}for(const k of [-1,1])branch(p,[.09,h*.6,0],[k*.42,h+.23,.15],.045,.12,oldBark);ball(p,cap,.23,.28,.24,.22,.09,.19);return;}
  if(style==='garden'&&i%3===0){for(let j=0;j<4;j++){const a=j*1.57;ball(p,leaves[j],Math.cos(a)*.24,.27,Math.sin(a)*.24,.30,.25,.30);ball(p,gold,Math.cos(a)*.27,.40,Math.sin(a)*.27,.065,.065,.065,false);}return;}
  if(i%5===2){for(let j=0;j<3;j++){const a=mesh(p,rock,j===0?stone:stone2,(j-1)*.22,.22+j*.025,(j%2)*.16);a.scale.set(.36-j*.06,.27+j*.06,.34-j*.05);a.rotation.y=i*.73+j;}ball(p,moss,-.10,.36,.05,.27,.07,.20);return;}
  const h=1.0+random(i*7)*.38;branch(p,[0,0,0],[.08,h,0],.13,.20,bark);for(let j=0;j<5;j++){const a=j*Math.PI*2/5;branch(p,[0,.20,0],[Math.cos(a)*.38,.015,Math.sin(a)*.38],.045,.095,bark);}
  for(const k of [-1,1])branch(p,[.03,h*.62,0],[k*.29,h+.18,.07],.07,.10,barkLight);
  const crown=group(p,.05,h,0);for(let j=0;j<7;j++){const a=j*2.4,r=j===0?0:.31+random(i+j*31)*.15;ball(crown,leaves[(i+j)%4],Math.cos(a)*r,.20+random(i*53+j)*.24,Math.sin(a)*r,.40+random(j*11+i)*.09,.37,.42);}
  ball(crown,leaves[3],-.10,.55,-.09,.43,.33,.40);treeCrowns.push({crown,x:o.x+.5,y:o.y+.5});
 }
 function rebuild(f,key){if(terrain)scene.remove(terrain);for(const r of uniqueTerrain)r.dispose();uniqueTerrain=[];terrain=group(scene);treeCrowns=[];vents=[];pools=[];mapKey=key;
  style=field3DTheme(f)||'meadow';theme=THEMES[style];zone=f.biome?.zoneId||'herb_path';scene.background.set(theme.sky);sun.color.set(theme.light);hemi.color.set(style==='glow'||style==='oasis'?'#c7f2eb':style==='ember'?'#ffd5b3':'#f0ead1');leaves.forEach((m,i)=>m.color.set(theme.leaf[i]));grasses.forEach((m,i)=>m.color.set(theme.grass[i]));element.dataset.biome=zone;element.dataset.theme=style;element.dataset.region=isSpring()?'spring':'forest';
  const mw=f.worldW,mh=f.worldH;const groundGeo=new T.PlaneGeometry(mw+4,(mh+4)/SINE),groundMat=material(theme.floor);uniqueTerrain.push(groundGeo,groundMat);const ground=mesh(terrain,groundGeo,groundMat,mw/2,-.025,mh/2/SINE,false);ground.rotation.x=-Math.PI/2;
  // Broad subtle organic patches, not tiled checkerboards. Vertex colors follow deterministic positions.
  const geo=new T.PlaneGeometry(mw,mh/SINE,Math.ceil(mw*2),Math.ceil(mh*2));geo.rotateX(-Math.PI/2);const pos=geo.attributes.position,colors=[],c=new T.Color();
  for(let i=0;i<pos.count;i++){let x=pos.getX(i),z=pos.getZ(i);let q=.5+.22*Math.sin(x*.63+z*.39)+.14*Math.cos(z*.93-x*.48)+.08*Math.sin(x*2.5+z*1.4);c.setHSL(theme.hue+q*.022,isSpring()?(style==='steam'?.06:.19)+q*.08:style==='roots'?.13+q*.07:.27+q*.09,(style==='spring'?.51:style==='oasis'?.47:style==='steam'?.31:style==='ember'?.22:style==='glow'?.27:style==='roots'?.28:.37)+q*.12);colors.push(c.r,c.g,c.b);}
  geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));const terrainMat=new T.MeshStandardMaterial({vertexColors:true,roughness:1});uniqueTerrain.push(geo,terrainMat);mesh(terrain,geo,terrainMat,mw/2,0,mh/2/SINE,false);
  const goal=(f.nodes||[]).find(n=>n.key==='target');const route=goal?fieldTilePath(f,f.spawn||f.pos,goal,{avoidHazards:true}):[];
  if(route.length>1){const pathGeo=new T.CircleGeometry(.5,14),pathMat=material(theme.soil);uniqueTerrain.push(pathGeo,pathMat);const pathMesh=new T.InstancedMesh(pathGeo,pathMat,route.length*2);uniqueTerrain.push(pathMesh);const d=new T.Object3D();let j=0;
   for(const [i,q] of route.entries()){d.position.set(q.x,.008,q.y/SINE);d.rotation.set(-Math.PI/2,0,random(i*57)*.25);d.scale.set(.86+random(i*71)*.19,1.40/SINE,1);d.updateMatrix();pathMesh.setMatrixAt(j++,d.matrix);d.position.set(q.x+(i%2?.22:-.22),.009,q.y/SINE+.12);d.scale.set(.35,.42,1);d.updateMatrix();pathMesh.setMatrixAt(j++,d.matrix);}pathMesh.receiveShadow=true;terrain.add(pathMesh);
  }
  for(let i=0;i<22;i++){const side=i%2,x=side?mw+.40:-.40,z=(Math.floor(i/2)+.5)*mh/11/SINE;if(isSpring()){const q=mesh(terrain,rock,style==='ember'?basalt:mineral,x,.16,z,false);q.scale.set(.63,.26+random(i*13)*.45,.8);}else ball(terrain,leaves[(i+1)%4],x,-.13,z,.60,.43+random(i*13)*.30,.83,false);if(i%3===0){const o=mesh(terrain,rock,stone2,x,.13,z,false);o.scale.set(.36,.28,.40);}}
  // Outer landscape terraces: outside the playable field, no fake collision.
  for(let i=0;i<16;i++){const x=(i+.5)*mw/16,z=(i%2?mh/SINE+.84:-.84),p=group(terrain,x,0,z);
   if(isSpring()){for(let j=0;j<3;j++){const q=mesh(p,rock,style==='ember'?basalt:j%2?basaltLight:mineral,(j-1)*.21,.20+j*.13,(j%2)*.26,false);q.scale.set(.38,.24+j*.10,.52);q.rotation.y=i*.81+j;}if(style==='ember')branch(p,[-.26,.18,.03],[.23,.30,.13],.035,.03,ember);}
   else{for(let j=0;j<3;j++){ball(p,leaves[(i+j)%4],(j-1)*.25,.13+j*.12,0,.40,.28+j*.10,.44,false);}if(i%3===0){branch(p,[-.38,.08,.05],[.36,.09,.15],.11,.14,bark);ball(p,barkLight,.36,.09,.15,.04,.10,.10,false);}}
  }
  (f.obstacles||[]).forEach((o,i)=>tree(terrain,o,i));
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
  if(isSpring())for(let j=0;j<5;j++){
   const p=group(terrain,j%2?mw+.70:-.70,0,(j+1)*mh/6/SINE);
   if(style==='spring'||style==='oasis'){ball(p,mineral,0,-.03,0,.69,.09,1.05,false);ball(p,water,0,.035,0,.56,.025,.85,false);const ripple=mesh(p,pickupGeo,new T.MeshBasicMaterial({color:'#dffdf3',transparent:true,opacity:.5,depthWrite:false,side:T.DoubleSide}),0,.07,0,false);uniqueTerrain.push(ripple.material);pools.push(ripple);}
   else {for(let k=0;k<3;k++){const q=mesh(p,rock,basalt,(k-1)*.22,.35+k*.15,0);q.scale.set(.4,.5+k*.2,.37);}if(style==='ember')branch(p,[0,.05,-.4],[.12,.08,.6],.055,.04,ember);}
  }
  // Distinct landmark silhouettes at the real map edge, out of walkable bounds.
  if(style==='glow'){for(let j=0;j<5;j++){const p=group(terrain,-.45,0,(j+1)*mh/6/SINE);const h=.8+j%3*.4;cyl(p,cream,0,h*.45,0,.12,.19,h*.9);ball(p,cap,0,h,0,.53,.22,.52);ball(p,glow,0,h-.10,0,.40,.07,.40);}}
  if(style==='roots'){const p=group(terrain,mw*.5,0,-.35);branch(p,[-1.8,.04,0],[-.55,1.9,0],.30,.46,oldBark);branch(p,[1.8,.04,0],[.55,1.9,0],.30,.46,oldBark);branch(p,[-.55,1.9,0],[.55,1.9,0],.33,.33,oldBark);for(let j=0;j<5;j++)ball(p,cap,-1+j*.5,1.90,0,.23,.12,.19);}
  if(style==='garden'){for(let i=0;i<8;i++){const p=group(terrain,mw+.24,0,(i+1)*mh/9/SINE);box(p,bark,0,.13,0,.40,.26,.64);for(let j=0;j<3;j++)ball(p,leaves[(i+j)%4],0,.34,-.20+j*.20,.17,.17,.16);}}
  // Decorative scenery is sourced from existing non-collision scenery cells.
  const props=f.scenery||[],matrix=new T.Matrix4(),dummy=new T.Object3D();
  if(!isSpring())for(let variant=0;variant<3;variant++){const pts=props.filter((p,i)=>i%3===variant);if(!pts.length)continue;const grassGeo=new T.ConeGeometry(.095,.26,5),g=new T.InstancedMesh(grassGeo,grasses[variant],pts.length*3);uniqueTerrain.push(grassGeo,g);let j=0;for(const p of pts){for(let k=0;k<3;k++){dummy.position.set(p.x+(k-1)*.08,.12,p.y/SINE+(k%2)*.08);dummy.rotation.set(.12*(k-1),random(j)*6.28,(k-1)*.18);dummy.scale.setScalar((p.scale||1)*.7);dummy.updateMatrix();g.setMatrixAt(j++,dummy.matrix);}}g.receiveShadow=true;terrain.add(g);}
  for(const [i,p] of props.entries())if(!isSpring()&&i%9===0){const flower=group(terrain);place(flower,p.x,p.y);cyl(flower,green,0,.12,0,.018,.024,.24,7);for(let j=0;j<5;j++)ball(flower,i%2?cream:purple,Math.cos(j*1.26)*.064,.24,Math.sin(j*1.26)*.064,.048,.026,.048,false);ball(flower,gold,0,.26,0,.035,.024,.035,false);}
  // Layered low-profile decor: existing non-collision scenery cells only.
  // Small, muted silhouettes are deliberately unlike glowing harvest nodes.
  const leafGeo=new T.SphereGeometry(1,7,5),pebbleGeo=new T.IcosahedronGeometry(1,0),leafMat=material(isSpring()?style==='ember'?'#986b53':'#c3b49b':'#a89b61'),pebbleMat=material(isSpring()?'#a39b8c':'#9b9f87');
  uniqueTerrain.push(leafGeo,pebbleGeo,leafMat,pebbleMat);
  const decor=props.filter((p,i)=>i%2===0),leafMesh=new T.InstancedMesh(leafGeo,leafMat,decor.length*3),pebbles=new T.InstancedMesh(pebbleGeo,pebbleMat,decor.length*2);
  uniqueTerrain.push(leafMesh,pebbles);let li=0,pi=0;
  for(const [i,p] of decor.entries()){
   for(let j=0;j<3;j++){dummy.position.set(p.x+(random(i*11+j)-.5)*.45,.018,p.y/SINE+(random(i*19+j)-.5)*.48);dummy.rotation.set(0,random(i*7+j)*6.28,0);dummy.scale.set(.12,.012,.047);dummy.updateMatrix();leafMesh.setMatrixAt(li++,dummy.matrix);}
   for(let j=0;j<2;j++){dummy.position.set(p.x+(j-.5)*.21,.038,p.y/SINE+.22);dummy.rotation.set(.2,i*.73+j,0);dummy.scale.set(.065,.047,.085);dummy.updateMatrix();pebbles.setMatrixAt(pi++,dummy.matrix);}
   if(isSpring()&&i%5===0){const p2=group(terrain);place(p2,p.x,p.y);for(let j=0;j<3;j++)ball(p2,style==='ember'?basalt:style==='oasis'?crystal:sulfur,(j-1)*.09,.045,j*.04,.08,.05+j*.02,.07,false);}
   if(!isSpring()&&i%5===0){const shrub=group(terrain);place(shrub,p.x,p.y);for(let j=0;j<4;j++){const a=j*2.4;ball(shrub,leaves[(i+j)%4],Math.cos(a)*.13,.12+(.03*j),Math.sin(a)*.13,.16,.13,.16,false);}}
  }
  terrain.add(leafMesh,pebbles);
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
 function enemy(e){const p=group(actors),body=group(p),kind=e.kind,limbs=[],wings=[];let skull=null;
  if(e.kind==='boss_ember'){ball(body,basalt,0,.48,0,.60,.48,.48);ball(body,red,0,.73,.27,.38,.35,.29);for(let j=0;j<7;j++){const a=j*.9;const spike=cyl(body,j%2?ember:sulfur,Math.cos(a)*.33,1.04+Math.abs(Math.sin(a))*.12,Math.sin(a)*.29,0,.12,.46,5);spike.rotation.z=Math.cos(a)*.32;}for(const k of [-1,1]){const arm=group(body,k*.54,.45,0);ball(arm,basaltLight,0,-.08,0,.22,.30,.20);ball(arm,ember,0,-.24,.13,.16,.13,.15);limbs.push(arm);ball(body,ink,k*.15,.77,.53,.055,.07,.025);ball(body,sulfur,k*.15,.79,.55,.025,.03,.015);}for(let j=0;j<4;j++)box(body,ember,(j-1.5)*.17,.40,.43,.065,.19,.035);}
  else if(e.isBoss){ball(body,purple,0,.46,0,.56,.46,.47);cyl(body,cream,0,.60,0,.21,.24,.60);ball(body,barkLight,0,.87,0,.73,.12,.66);ball(body,red,0,.99,0,.76,.27,.69);ball(body,purple,0,1.18,-.07,.34,.10,.30);for(let i=0;i<7;i++){let a=i*.90;ball(body,cream,Math.cos(a)*.49,1.15,Math.sin(a)*.45,.09,.025,.09);}for(const k of [-1,1]){ball(body,red,k*.57,.43,0,.18,.28,.20);ball(body,ink,k*.14,.70,.39,.06,.065,.035);}}
  else if(kind==='chicken'){ball(body,cream,0,.27,0,.27,.24,.24);ball(body,cream,0,.53,.16,.18,.17,.17);for(let j=0;j<3;j++)ball(body,red,0,.68+j*.025,.10+j*.07,.045,.075,.045);for(let j=0;j<3;j++){const tail=ball(body,cream,(j-1)*.07,.40,-.26,.07,.20,.16);tail.rotation.x=-.6;}ball(body,gold,0,.50,.32,.10,.055,.08);for(const k of [-1,1]){const wing=group(body,k*.24,.30,0);ball(wing,cream,0,0,0,.11,.15,.19);wings.push(wing);ball(body,ink,k*.08,.56,.29,.025,.028,.018);}}
  else if(kind==='boar'){
   // The internal legacy id is boar; the GDD/data identify Ironhorn Bison.
   ball(body,bark,0,.44,-.08,.37,.35,.52);ball(body,bark,0,.55,.14,.40,.43,.34);
   skull=group(body,0,.49,.38);ball(skull,barkLight,0,-.01,.02,.26,.27,.29);ball(skull,stone2,0,-.14,.23,.24,.135,.16);
   for(const k of [-1,1]){
    ball(skull,bark,k*.27,.15,-.03,.15,.09,.08);
    branch(skull,[k*.17,.18,.02],[k*.33,.32,.02],.067,.095,stone2);
    branch(skull,[k*.33,.32,.02],[k*.40,.49,.06],.012,.067,cream);
    ball(skull,ink,k*.13,.04,.22,.035,.035,.025);ball(skull,ink,k*.095,-.14,.36,.042,.025,.018);
    for(const zz of [-.37,.26]){const leg=group(body,k*.24,.33,zz);cyl(leg,bark,0,-.15,0,.09,.10,.30);box(leg,ink,0,-.275,.025,.19,.11,.22);limbs.push(leg);}
   }
   branch(body,[0,.47,-.56],[.08,.31,-.79],.035,.045,bark);ball(body,ink,.08,.26,-.81,.065,.10,.06);
   for(let j=0;j<3;j++)ball(body,moss,(j-1)*.13,.85,-.03+j*.08,.12,.045,.15);
  }
  else if(kind==='steam_crab'){ball(body,basaltLight,0,.26,0,.37,.24,.31);ball(body,copper,0,.43,-.04,.33,.16,.27);for(let j=0;j<3;j++){const a=(j-1)*.18;ball(body,sulfur,a,.53,0,.045,.045,.065);}for(const k of [-1,1]){for(let j=0;j<3;j++){const leg=group(body,k*.25,.20,-.18+j*.18);branch(leg,[0,0,0],[k*.19,-.05,0],.045,.06,copper);branch(leg,[k*.19,-.05,0],[k*.25,-.17,.05],.025,.045,basalt);limbs.push(leg);}const claw=group(body,k*.31,.29,.24);ball(claw,copper,k*.13,0,.07,.17,.12,.14);for(const sign of [-1,1]){const tip=ball(claw,red,k*.16+sign*.065,.02,.20,.075,.09,.13);tip.rotation.y=sign*.35;}wings.push(claw);ball(body,cream,k*.12,.48,.22,.07,.08,.06);ball(body,ink,k*.12,.49,.27,.027,.032,.018);}}
  else if(kind==='pepper'){ball(body,red,0,.35,0,.23,.35,.22);branch(body,[0,.61,0],[.11,.76,0],.05,.065,green);for(const k of [-1,1])ball(body,ink,k*.08,.42,.20,.036,.045,.02);}
  else {ball(body,cream,0,.23,0,.22,.24,.20);ball(body,kind==='sporeling'?purple:blue,0,.49,0,.36,.17,.31);for(const k of [-1,1])ball(body,ink,k*.075,.29,.19,.03,.035,.018);}
  for(const k of [-1,1])if(!['pepper','sporeling','boar'].includes(kind)&&!e.isBoss)for(let j=0;j<(kind==='boar'?2:1);j++)ball(body,bark,k*.14,.075,j*.26-.08,.07,.08,.10);
  p.userData.body=body;p.userData.limbs=limbs;p.userData.wings=wings;p.userData.skull=skull;const own=new Map();body.traverse(o=>{if(o.isMesh&&o.material?.emissive){if(!own.has(o.material))own.set(o.material,o.material.clone());o.material=own.get(o.material);}});p.userData.flashMats=[...own.values()];return p;
 }
 function sync(pool,items,build,fn){const live=new Set();for(const v of items){const k=v.key??v.id;live.add(k);let p=pool.get(k);if(!p){p=build(v);pool.set(k,p);}p.visible=true;fn(p,v);}for(const [k,p] of pool)if(!live.has(k))p.visible=false;}
 const ambientDummy=new T.Object3D();let lastW=0,lastH=0,gaitBlend=0,lastGaitT=null;
 return {element,draw(canvas,f,t,w,h,cam,sx,sy){
  if(element.parentElement!==canvas.parentElement)canvas.parentElement.insertBefore(element,canvas);
  const rw=Math.max(1,Math.round(w*Math.min(devicePixelRatio||1,1.35))),rh=Math.max(1,Math.round(h*Math.min(devicePixelRatio||1,1.35)));if(rw!==lastW||rh!==lastH){renderer.setSize(rw,rh,false);lastW=rw;lastH=rh;}
  const key=[f.worldW,f.worldH,f.biome?.zoneId,f.biome?.encounterSeed,f.segmentIndex,(f.obstacles||[]).map(o=>o.x+','+o.y).join(';')].join('|');if(key!==mapKey)rebuild(f,key);
  const v=y3CameraFrame(cam,w,h,sx,sy),center=y3Ground(v.x,v.y);camera.left=-v.halfW;camera.right=v.halfW;camera.top=v.halfH;camera.bottom=-v.halfH;camera.position.set(center.x,SINE*20,center.z+COS*20);camera.lookAt(center.x,0,center.z);camera.updateProjectionMatrix();
  for(const [i,q] of treeCrowns.entries()){q.crown.visible=!(f.pos.y<q.y&&q.y-f.pos.y<1.20&&Math.abs(f.pos.x-q.x)<.74);q.crown.rotation.z=Math.sin(t*.65+i*.73)*.025;}
  for(const [i,v] of vents.entries()){const p=springVentVisual(v.hz,f.elapsed,f.biome);v.jet.visible=true;
   for(const [j,o] of v.bubbles.entries()){const q=ventParticlePose(p,j,f.elapsed+i*.19);o.position.set(q.x,q.y,q.z);o.quaternion.copy(camera.quaternion);o.scale.set(q.scale*2.5,q.scale*3.2,1);o.material.uniforms.opacity.value=q.opacity;o.material.uniforms.time.value=f.elapsed;}
   v.dropMat.opacity=p.active?.85:p.warning?.48:0;for(const [j,o] of v.drops.entries()){const u=(j*.137+f.elapsed*2.6)%1,a=j*2.399;o.visible=p.active||p.warning;o.position.set(Math.cos(a)*u*.34,.06+Math.sin(Math.PI*u)*(p.active?.35+p.jet*.8:.13),Math.sin(a)*u*.34);o.scale.set(.022,.036+.035*(1-u),.022);}}
  for(const [i,o] of pools.entries()){o.scale.setScalar(.24+((t*.28+i*.17)%1)*.28);o.material.opacity=.45*(1-((t*.28+i*.17)%1));}
  sync(nodePool,(f.nodes||[]).filter(n=>!n.claimed),node,(p,n)=>{place(p,n.x,n.y);const v=pickupVisual(n,t),u=p.userData;u.item.position.y=v.bob;u.ring.material.opacity=v.opacity;u.outer.material.opacity=v.opacity*.30;u.outer.scale.setScalar(v.radius*(1.20+.06*Math.sin(t*3+n.x)));});
  sync(enemyPool,(f.enemies||[]).filter(e=>e.hp>0||e.deathFx>0),enemy,(p,e)=>{place(p,e.x,e.y);const body=p.userData.body,v=enemyHitVisual(e);p.rotation.y=Math.atan2(f.pos.x-e.x,(f.pos.y-e.y)/SINE);body.position.y=e.moving?Math.abs(Math.sin(t*10+e.x))*.035:0;body.scale.set(v.sx,v.sy,v.sz);body.rotation.z=v.tilt*(e.hitResponse?.dx||1);const wind=e.warning>0?Math.max(0,Math.min(1,1-e.warning/(e.windupTotal||1))):0,rush=!!(e.ecologyRush||e.rush),stride=e.moving?Math.sin(t*(rush?19:9)+e.x):0;body.rotation.x=-v.tilt*(e.hitResponse?.dy||0)+(rush?.19:wind*.14);body.scale.y*=1-wind*.13;for(const [i,l] of p.userData.limbs.entries())l.rotation.x=stride*(i%3===0?1:-1)*(rush?.62:.33);for(const [i,l] of p.userData.wings.entries())l.rotation.z=(i===0?-1:1)*(e.moving?.25+Math.abs(stride)*.60:wind*.70);if(p.userData.skull)p.userData.skull.rotation.x=rush?.34:wind*.34;if(e.kind==='chicken')body.position.y+=Math.abs(stride)*.055+wind*.08;if(e.kind==='sporeling'||e.kind==='pepper')body.scale.x*=1+wind*.12;for(const m of p.userData.flashMats){m.emissive.set('#fff1c7');m.emissiveIntensity=v.flash*.85;}});
  place(hero.root,f.pos.x,f.pos.y);const dt=lastGaitT==null?1/60:Math.max(0,Math.min(.08,t-lastGaitT));lastGaitT=t;gaitBlend+=((f.moving?1:0)-gaitBlend)*(1-Math.exp(-dt*15));const facing=y3Facing(f.facing);hero.update(t,{facing,moving:!!f.moving,gaitBlend,working:false,carrying:false});const spin=f.skillOrigin?.spin&&f.skillFx>0,aim=spin?{x:f.skillOrigin.dx,y:f.skillOrigin.dy}:f.attackFx?.ttl>0&&Number.isFinite(f.attackFx.dx)?{x:f.attackFx.dx,y:f.attackFx.dy}:f.facing;if(aim&&Math.hypot(aim.x,aim.y)>.01)hero.root.rotation.y=Math.atan2(aim.x,aim.y/SINE);if(spin){const u=Math.max(0,Math.min(1,1-f.skillFx/(f.skillOrigin.duration||.6)));hero.root.rotation.y+=Math.PI*2*(u*u*(3-2*u));}weaponRig.update(f,t,gaitBlend);const nativeBlade=bladeTrail.draw(f,weaponRig);
  if(ambient){const dummy=ambientDummy;for(let i=0;i<32;i++){dummy.position.set(random(i*31)*f.worldW+Math.sin(t*.5+i)*.13,.22+random(i*23)*1.9+Math.sin(t*.7+i)*.08,(random(i*53)*f.worldH)/SINE+Math.cos(t*.4+i)*.14);dummy.updateMatrix();ambient.setMatrixAt(i,dummy.matrix);}ambient.instanceMatrix.needsUpdate=true;}
  combatFx.draw(f,t,nativeBlade);element.dataset.telegraphCount=String(telegraphs.draw(f,t));renderer.render(scene,camera);document.documentElement.dataset.oddpotForest3d='active';
 },dispose(){disposed=true;element.remove();bladeTrail.dispose();combatFx.dispose();telegraphs.dispose();const geometries=new Set(),materials=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const g of boxCache.values())g.dispose();for(const g of cylinderCache.values())g.dispose();for(const g of uniqueTerrain)g.dispose();renderer.dispose();renderer.forceContextLoss();}};
}
