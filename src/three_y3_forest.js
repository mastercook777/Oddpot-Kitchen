// Y3a: read-only 3D forest. No physics, inventory or combat simulation.
import {roundedFactory} from './three_y1_models.js?v=y1';
import {makeChefY2} from './three_y2b_chef.js?v=y3b';
import {createWeaponRig} from './three_y3b_weapon_pose.js?v=y3c';
import {enemyHitVisual,pickupVisual} from './three_y3b_feedback.js';
import {makeFieldFx3D} from './three_y3c_fx.js';
import {fieldTilePath} from './field_rules_v011a.js';
const ANGLE=Math.PI*55/180, SINE=Math.sin(ANGLE), COS=Math.cos(ANGLE);
export function y3Eligible(s){const f=s?.field;return s?.phase==='field'&&!!f?.action&&f.worldVersion==='0.11-B1'&&f.biome?.zoneId==='herb_path'&&s.activeWorld!=='cloud';}
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
 let terrain=null,mapKey='',treeCrowns=[],nodePool=new Map(),enemyPool=new Map(),uniqueTerrain=[],ambient=null;
 const pickupGeo=new T.RingGeometry(.80,1,40);pickupGeo.rotateX(-Math.PI/2);const pickupInner=new T.RingGeometry(.94,1,40);pickupInner.rotateX(-Math.PI/2);
 const actors=group(scene),hero=makeChefY2(T,rounded,true);actors.add(hero.root);hero.root.scale.setScalar(.72);
 const weaponRig=createWeaponRig(T,hero,rounded),combatFx=makeFieldFx3D(T,scene,SINE);
 function tree(parent,o,i){const p=group(parent);place(p,o.x+.5,o.y+.5);
  if(i%5===2){for(let j=0;j<3;j++){const a=mesh(p,rock,j===0?stone:stone2,(j-1)*.22,.22+j*.025,(j%2)*.16);a.scale.set(.36-j*.06,.27+j*.06,.34-j*.05);a.rotation.y=i*.73+j;}ball(p,moss,-.10,.36,.05,.27,.07,.20);return;}
  const h=1.0+random(i*7)*.38;branch(p,[0,0,0],[.08,h,0],.13,.20,bark);for(let j=0;j<5;j++){const a=j*Math.PI*2/5;branch(p,[0,.20,0],[Math.cos(a)*.38,.015,Math.sin(a)*.38],.045,.095,bark);}
  for(const k of [-1,1])branch(p,[.03,h*.62,0],[k*.29,h+.18,.07],.07,.10,barkLight);
  const crown=group(p,.05,h,0);for(let j=0;j<7;j++){const a=j*2.4,r=j===0?0:.31+random(i+j*31)*.15;ball(crown,leaves[(i+j)%4],Math.cos(a)*r,.20+random(i*53+j)*.24,Math.sin(a)*r,.40+random(j*11+i)*.09,.37,.42);}
  ball(crown,leaves[3],-.10,.55,-.09,.43,.33,.40);treeCrowns.push({crown,x:o.x+.5,y:o.y+.5});
 }
 function rebuild(f,key){if(terrain)scene.remove(terrain);for(const r of uniqueTerrain)r.dispose();uniqueTerrain=[];terrain=group(scene);treeCrowns=[];mapKey=key;
  const mw=f.worldW,mh=f.worldH;const groundGeo=new T.PlaneGeometry(mw+4,(mh+4)/SINE),groundMat=material('#809768');uniqueTerrain.push(groundGeo,groundMat);const ground=mesh(terrain,groundGeo,groundMat,mw/2,-.025,mh/2/SINE,false);ground.rotation.x=-Math.PI/2;
  // Broad subtle organic patches, not tiled checkerboards. Vertex colors follow deterministic positions.
  const geo=new T.PlaneGeometry(mw,mh/SINE,Math.ceil(mw*2),Math.ceil(mh*2));geo.rotateX(-Math.PI/2);const pos=geo.attributes.position,colors=[],c=new T.Color();
  for(let i=0;i<pos.count;i++){let x=pos.getX(i),z=pos.getZ(i);let q=.5+.22*Math.sin(x*.63+z*.39)+.14*Math.cos(z*.93-x*.48)+.08*Math.sin(x*2.5+z*1.4);c.setHSL(.245+q*.022,.27+q*.09,.37+q*.12);colors.push(c.r,c.g,c.b);}
  geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));const terrainMat=new T.MeshStandardMaterial({vertexColors:true,roughness:1});uniqueTerrain.push(geo,terrainMat);mesh(terrain,geo,terrainMat,mw/2,0,mh/2/SINE,false);
  const goal=(f.nodes||[]).find(n=>n.key==='target');const route=goal?fieldTilePath(f,f.spawn||f.pos,goal,{avoidHazards:true}):[];
  if(route.length>1){const pathGeo=new T.CircleGeometry(.5,14),pathMat=material('#a79a72');uniqueTerrain.push(pathGeo,pathMat);const pathMesh=new T.InstancedMesh(pathGeo,pathMat,route.length*2);uniqueTerrain.push(pathMesh);const d=new T.Object3D();let j=0;
   for(const [i,q] of route.entries()){d.position.set(q.x,.008,q.y/SINE);d.rotation.set(-Math.PI/2,0,random(i*57)*.25);d.scale.set(.86+random(i*71)*.19,1.40/SINE,1);d.updateMatrix();pathMesh.setMatrixAt(j++,d.matrix);d.position.set(q.x+(i%2?.22:-.22),.009,q.y/SINE+.12);d.scale.set(.35,.42,1);d.updateMatrix();pathMesh.setMatrixAt(j++,d.matrix);}pathMesh.receiveShadow=true;terrain.add(pathMesh);
  }
  for(let i=0;i<22;i++){const side=i%2,x=side?mw+.40:-.40,z=(Math.floor(i/2)+.5)*mh/11/SINE;ball(terrain,leaves[(i+1)%4],x,-.13,z,.60,.43+random(i*13)*.30,.83,false);if(i%3===0){const o=mesh(terrain,rock,stone2,x,.13,z,false);o.scale.set(.36,.28,.40);}}
  (f.obstacles||[]).forEach((o,i)=>tree(terrain,o,i));
  // Decorative scenery is sourced from existing non-collision scenery cells.
  const props=f.scenery||[],matrix=new T.Matrix4(),dummy=new T.Object3D();
  for(let variant=0;variant<3;variant++){const pts=props.filter((p,i)=>i%3===variant);if(!pts.length)continue;const grassGeo=new T.ConeGeometry(.095,.26,5),g=new T.InstancedMesh(grassGeo,grasses[variant],pts.length*3);uniqueTerrain.push(grassGeo,g);let j=0;for(const p of pts){for(let k=0;k<3;k++){dummy.position.set(p.x+(k-1)*.08,.12,p.y/SINE+(k%2)*.08);dummy.rotation.set(.12*(k-1),random(j)*6.28,(k-1)*.18);dummy.scale.setScalar((p.scale||1)*.7);dummy.updateMatrix();g.setMatrixAt(j++,dummy.matrix);}}g.receiveShadow=true;terrain.add(g);}
  for(const [i,p] of props.entries())if(i%9===0){const flower=group(terrain);place(flower,p.x,p.y);cyl(flower,green,0,.12,0,.018,.024,.24,7);for(let j=0;j<5;j++)ball(flower,i%2?cream:purple,Math.cos(j*1.26)*.064,.24,Math.sin(j*1.26)*.064,.048,.026,.048,false);ball(flower,gold,0,.26,0,.035,.024,.035,false);}
  // Layered low-profile decor: existing non-collision scenery cells only.
  // Small, muted silhouettes are deliberately unlike glowing harvest nodes.
  const leafGeo=new T.SphereGeometry(1,7,5),pebbleGeo=new T.IcosahedronGeometry(1,0),leafMat=material('#a89b61'),pebbleMat=material('#9b9f87');
  uniqueTerrain.push(leafGeo,pebbleGeo,leafMat,pebbleMat);
  const decor=props.filter((p,i)=>i%2===0),leafMesh=new T.InstancedMesh(leafGeo,leafMat,decor.length*3),pebbles=new T.InstancedMesh(pebbleGeo,pebbleMat,decor.length*2);
  uniqueTerrain.push(leafMesh,pebbles);let li=0,pi=0;
  for(const [i,p] of decor.entries()){
   for(let j=0;j<3;j++){dummy.position.set(p.x+(random(i*11+j)-.5)*.45,.018,p.y/SINE+(random(i*19+j)-.5)*.48);dummy.rotation.set(0,random(i*7+j)*6.28,0);dummy.scale.set(.12,.012,.047);dummy.updateMatrix();leafMesh.setMatrixAt(li++,dummy.matrix);}
   for(let j=0;j<2;j++){dummy.position.set(p.x+(j-.5)*.21,.038,p.y/SINE+.22);dummy.rotation.set(.2,i*.73+j,0);dummy.scale.set(.065,.047,.085);dummy.updateMatrix();pebbles.setMatrixAt(pi++,dummy.matrix);}
   if(i%5===0){const shrub=group(terrain);place(shrub,p.x,p.y);for(let j=0;j<4;j++){const a=j*2.4;ball(shrub,leaves[(i+j)%4],Math.cos(a)*.13,.12+(.03*j),Math.sin(a)*.13,.16,.13,.16,false);}}
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
  else if(id==='chili'||id==='ember_pepper'){const o=ball(p,red,0,.19,0,.12,.25,.11);o.rotation.z=.54;branch(p,[-.1,.35,0],[-.16,.43,0],.025,.035,green);}
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
  if(e.isBoss){ball(body,purple,0,.46,0,.56,.46,.47);cyl(body,cream,0,.60,0,.21,.24,.60);ball(body,barkLight,0,.87,0,.73,.12,.66);ball(body,red,0,.99,0,.76,.27,.69);ball(body,purple,0,1.18,-.07,.34,.10,.30);for(let i=0;i<7;i++){let a=i*.90;ball(body,cream,Math.cos(a)*.49,1.15,Math.sin(a)*.45,.09,.025,.09);}for(const k of [-1,1]){ball(body,red,k*.57,.43,0,.18,.28,.20);ball(body,ink,k*.14,.70,.39,.06,.065,.035);}}
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
  else if(kind==='pepper'){ball(body,red,0,.35,0,.23,.35,.22);branch(body,[0,.61,0],[.11,.76,0],.05,.065,green);for(const k of [-1,1])ball(body,ink,k*.08,.42,.20,.036,.045,.02);}
  else {ball(body,cream,0,.23,0,.22,.24,.20);ball(body,kind==='sporeling'?purple:blue,0,.49,0,.36,.17,.31);for(const k of [-1,1])ball(body,ink,k*.075,.29,.19,.03,.035,.018);}
  for(const k of [-1,1])if(!['pepper','sporeling','boar'].includes(kind)&&!e.isBoss)for(let j=0;j<(kind==='boar'?2:1);j++)ball(body,bark,k*.14,.075,j*.26-.08,.07,.08,.10);
  p.userData.body=body;p.userData.limbs=limbs;p.userData.wings=wings;p.userData.skull=skull;const own=new Map();body.traverse(o=>{if(o.isMesh&&o.material?.emissive){if(!own.has(o.material))own.set(o.material,o.material.clone());o.material=own.get(o.material);}});p.userData.flashMats=[...own.values()];return p;
 }
 function sync(pool,items,build,fn){const live=new Set();for(const v of items){const k=v.key??v.id;live.add(k);let p=pool.get(k);if(!p){p=build(v);pool.set(k,p);}p.visible=true;fn(p,v);}for(const [k,p] of pool)if(!live.has(k))p.visible=false;}
 let lastW=0,lastH=0;
 return {element,draw(canvas,f,t,w,h,cam,sx,sy){
  if(element.parentElement!==canvas.parentElement)canvas.parentElement.insertBefore(element,canvas);
  const rw=Math.max(1,Math.round(w*Math.min(devicePixelRatio||1,1.35))),rh=Math.max(1,Math.round(h*Math.min(devicePixelRatio||1,1.35)));if(rw!==lastW||rh!==lastH){renderer.setSize(rw,rh,false);lastW=rw;lastH=rh;}
  const key=[f.worldW,f.worldH,f.biome?.encounterSeed,f.segmentIndex,(f.obstacles||[]).map(o=>o.x+','+o.y).join(';')].join('|');if(key!==mapKey)rebuild(f,key);
  const v=y3CameraFrame(cam,w,h,sx,sy),center=y3Ground(v.x,v.y);camera.left=-v.halfW;camera.right=v.halfW;camera.top=v.halfH;camera.bottom=-v.halfH;camera.position.set(center.x,SINE*20,center.z+COS*20);camera.lookAt(center.x,0,center.z);camera.updateProjectionMatrix();
  for(const q of treeCrowns){q.crown.visible=!(f.pos.y<q.y&&q.y-f.pos.y<1.20&&Math.abs(f.pos.x-q.x)<.74);}
  sync(nodePool,(f.nodes||[]).filter(n=>!n.claimed),node,(p,n)=>{place(p,n.x,n.y);const v=pickupVisual(n,t),u=p.userData;u.item.position.y=v.bob;u.ring.material.opacity=v.opacity;u.outer.material.opacity=v.opacity*.30;u.outer.scale.setScalar(v.radius*(1.20+.06*Math.sin(t*3+n.x)));});
  sync(enemyPool,(f.enemies||[]).filter(e=>e.hp>0||e.deathFx>0),enemy,(p,e)=>{place(p,e.x,e.y);const body=p.userData.body,v=enemyHitVisual(e);p.rotation.y=Math.atan2(f.pos.x-e.x,(f.pos.y-e.y)/SINE);body.position.y=e.moving?Math.abs(Math.sin(t*10+e.x))*.035:0;body.scale.set(v.sx,v.sy,v.sz);body.rotation.z=v.tilt*(e.hitResponse?.dx||1);const wind=e.warning>0?Math.max(0,Math.min(1,1-e.warning/(e.windupTotal||1))):0,rush=!!(e.ecologyRush||e.rush),stride=e.moving?Math.sin(t*(rush?19:9)+e.x):0;body.rotation.x=-v.tilt*(e.hitResponse?.dy||0)+(rush?.19:wind*.14);body.scale.y*=1-wind*.13;for(const [i,l] of p.userData.limbs.entries())l.rotation.x=stride*(i%3===0?1:-1)*(rush?.62:.33);for(const [i,l] of p.userData.wings.entries())l.rotation.z=(i===0?-1:1)*(e.moving?.25+Math.abs(stride)*.60:wind*.70);if(p.userData.skull)p.userData.skull.rotation.x=rush?.34:wind*.34;if(e.kind==='chicken')body.position.y+=Math.abs(stride)*.055+wind*.08;if(e.kind==='sporeling'||e.kind==='pepper')body.scale.x*=1+wind*.12;for(const m of p.userData.flashMats){m.emissive.set('#fff1c7');m.emissiveIntensity=v.flash*.85;}});
  place(hero.root,f.pos.x,f.pos.y);const facing=y3Facing(f.facing);hero.update(t,{facing,moving:!!f.moving,working:false,carrying:false});const aim=f.attackFx?.ttl>0&&Number.isFinite(f.attackFx.dx)?{x:f.attackFx.dx,y:f.attackFx.dy}:f.facing;if(aim&&Math.hypot(aim.x,aim.y)>.01)hero.root.rotation.y=Math.atan2(aim.x,aim.y/SINE);weaponRig.update(f);
  if(ambient){const dummy=new T.Object3D();for(let i=0;i<32;i++){dummy.position.set(random(i*31)*f.worldW+Math.sin(t*.5+i)*.13,.22+random(i*23)*1.9+Math.sin(t*.7+i)*.08,(random(i*53)*f.worldH)/SINE+Math.cos(t*.4+i)*.14);dummy.updateMatrix();ambient.setMatrixAt(i,dummy.matrix);}ambient.instanceMatrix.needsUpdate=true;}
  combatFx.draw(f,t);renderer.render(scene,camera);document.documentElement.dataset.oddpotForest3d='active';
 },dispose(){disposed=true;element.remove();combatFx.dispose();const geometries=new Set(),materials=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const g of boxCache.values())g.dispose();for(const g of cylinderCache.values())g.dispose();for(const g of uniqueTerrain)g.dispose();renderer.dispose();renderer.forceContextLoss();}};
}
