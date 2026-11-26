import {makeChefY2} from './three_y2b_chef.js?v=z2c12';
import {previewCadence,previewAtlas,ecologyIdle} from './three_z2c5_preview_motion.js?v=z2c5';
import {createWeaponRig} from './three_y3b_weapon_pose.js?v=z2c4';
import {createFieldEnemyModel} from './three_y3_enemy_models.js?v=z2c4';
import {departureEcologyZ2c4} from './field_ecology_v011b2.js?v=z2c4';
import {createRecovery,sharedThree,visibleHost} from './three_y6a_recovery.js?v=y6a';
import {makeLandscapeY5d} from './three_y5d_landscape.js?v=y5d';
import {roundedFactory} from './three_y1_models.js?v=y1';
// Art-only scene: the existing DOM buttons remain authoritative for every action.
let instance=null,entered=false,lastAt=-Infinity,cadence=previewCadence();
const recovery=createRecovery();
const status=v=>document.documentElement.dataset.oddpotDeparture3d=v;
function release(){if(instance){const old=instance;instance=null;old.dispose();}lastAt=-Infinity;cadence=previewCadence();}
function leave(){if(!entered&&!instance)return;entered=false;release();recovery.reset();status('idle');}
function fail(e){recovery.fail();release();status('fallback');if(globalThis.__oddpotBuild?.sceneErrors)globalThis.__oddpotBuild.sceneErrors.departure=String(e);console.warn('Oddpot departure fallback',e);}
export function enableZ2c3(){
 status('idle');globalThis.__oddpotDepartureRenderer={leave,rebind(app){const a=app.querySelector('.z2c2-map'),b=app.querySelector('.z2c4-hero');if(instance&&a&&b){instance.rebind(a,b);lastAt=-Infinity;}},retry(){release();recovery.reset();sharedThree.reset();status('idle');},draw(app,s,now){
  if(s.phase!=='field'||s.field){leave();return;}
  const map=app.querySelector('.z2c2-map'),rack=app.querySelector('.z2c4-hero');if(!map||!rack){leave();return;}entered=true;
  if(!visibleHost(map)||!visibleHost(rack)||!recovery.canTry())return;
  const T=sharedThree.value;if(!T){sharedThree.tryLoad();status(sharedThree.exhausted?'fallback':'loading');return;}
  if(instance?.same(map,rack)&&!cadence.due(now,lastAt))return;const gap=now-lastAt;lastAt=now;
  try{const start=performance.now();if(!instance)instance=makeDiorama(T);instance.draw(map,rack,now/1000,cadence.quality,cadence.target);cadence.observe(performance.now()-start,gap);recovery.success();status('active');if(globalThis.__oddpotBuild?.sceneErrors)delete globalThis.__oddpotBuild.sceneErrors.departure;}catch(e){fail(e);}
 }};
}
function makeDiorama(T){
 const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'default',preserveDrawingBuffer:false});
 renderer.setPixelRatio(1);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.14;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 let disposed=false;renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();if(!disposed)fail(Error('departure WebGL context lost'));});
 let map=null,rack=null,land=null,bench=null,region='',mapCanvas=null,rackCanvas=null;const lands=new Map();let atlasW=0,atlasH=0,atlasResizes=0,frames=0;
 const rounded=roundedFactory(T),geo=new Set(),mats=new Set();
 const mat=(color,opts={})=>{const o=new T.MeshStandardMaterial({color,roughness:.84,...opts});mats.add(o);return o;};
 const wood=mat('#9d663b'),woodDark=mat('#5d3828'),woodLight=mat('#cc9558'),roof=mat('#6a6358'),roofEdge=mat('#51483c'),plaster=mat('#d9b97a'),iron=mat('#52625f',{metalness:.55,roughness:.38}),brass=mat('#c69b54',{metalness:.45,roughness:.4}),teal=mat('#437d7b',{roughness:.38,metalness:.15}),cream=mat('#ead9ab'),bamboo=mat('#ba9159'),red=mat('#ad5441'),green=mat('#66874c'),rock=mat('#787b70'),water=mat('#4faaa7',{metalness:.2,roughness:.24}),gold=mat('#f5c879',{emissive:'#db8c35',emissiveIntensity:.55}),light=mat('#ffd681',{emissive:'#ffb94e',emissiveIntensity:1.1});
 const ballGeo=new T.IcosahedronGeometry(1,2);geo.add(ballGeo);
 function group(p,x=0,y=0,z=0){const g=new T.Group();g.position.set(x,y,z);p.add(g);return g;}
 function mesh(p,g,m,x,y,z){geo.add(g);const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;p.add(o);return o;}
 function box(p,m,x,y,z,w,h,d){return mesh(p,rounded(w,h,d,.045),m,x,y,z);}
 function ell(p,m,x,y,z,a,b,c){const o=mesh(p,ballGeo,m,x,y,z);o.scale.set(a,b,c);return o;}
 function cyl(p,m,x,y,z,a,b,h,n=24){return mesh(p,new T.CylinderGeometry(a,b,h,n),m,x,y,z);}
 function lathe(p,m,points){return mesh(p,new T.LatheGeometry(points.map(q=>new T.Vector2(...q)),40),m,0,0,0);}
 function ring(p,m,r,t,y){const o=mesh(p,new T.TorusGeometry(r,t,8,40),m,0,y,0);o.rotation.x=Math.PI/2;return o;}
 function lights(scene,focus,staticShadows=true){scene.add(new T.HemisphereLight('#fff1cf','#576d57',1.75));const sun=new T.DirectionalLight('#ffe0ac',3.1);sun.position.set(focus.x-5,9,focus.z+4);sun.target.position.set(focus.x,0,focus.z);scene.add(sun.target,sun);sun.castShadow=staticShadows;sun.shadow.autoUpdate=false;sun.shadow.needsUpdate=staticShadows;Object.assign(sun.shadow.camera,{left:-9,right:9,top:9,bottom:-9,near:.5,far:30});sun.shadow.mapSize.set(768,768);sun.shadow.normalBias=.035;const fill=new T.DirectionalLight('#b5d9e5',.8);fill.position.set(9,5,-6);scene.add(fill);return sun;}
 function lodge(parent,x,z){const g=group(parent,x,0,z);box(g,rock,0,.09,0,2.0,.18,1.48);box(g,plaster,0,.70,0,1.78,1.18,1.29);
  for(const k of [-1,1]){box(g,woodDark,k*.82,.70,.66,.11,1.20,.10);box(g,woodDark,k*.82,.70,-.66,.11,1.20,.10);const slab=box(g,roof,k*.49,1.48,0,1.15,.14,1.64);slab.rotation.z=-k*.55;for(let i=0;i<7;i++){const tile=box(g,i%2?roof:roofEdge,k*.48,1.57,-.72+i*.235,1.10,.055,.23);tile.rotation.z=-k*.55;}}
  box(g,woodDark,0,1.31,.67,1.72,.12,.13);box(g,woodDark,0,.48,.67,.46,.85,.10);box(g,woodLight,0,.48,.73,.34,.73,.06);for(const k of [-1,1]){box(g,woodDark,k*.55,.82,.68,.40,.40,.09);box(g,light,k*.55,.82,.74,.30,.30,.055);box(g,woodDark,k*.55,.82,.78,.035,.30,.02);box(g,woodDark,k*.55,.82,.78,.30,.035,.02);}box(g,red,0,1.15,.76,.57,.28,.055);box(g,rock,.60,1.68,-.30,.27,.68,.30);box(g,woodDark,0,.06,.91,.68,.12,.43);return g;}
 function flag(parent,x,z,risk){const g=group(parent,x,.0,z);cyl(g,woodDark,0,.52,0,.045,.065,1.04,10);ell(g,brass,0,1.08,0,.08,.08,.08);box(g,risk?red:green,.25,.82,0,.43,.38,.055);box(g,brass,.25,1.02,0,.48,.045,.08);return g;}
 function buildLand(r){
  const scene=new T.Scene();scene.background=new T.Color(r==='cloud'?'#a0bac3':'#6a8870');
  scene.fog=new T.Fog(scene.background,20,37);const sun=lights(scene,{x:5,z:5});
  const root=group(scene),spring=r==='spring',cloud=r==='cloud',style=spring?'spring':'meadow';
  const points=[{x:5,y:9},{x:4.4,y:7.1},{x:5.6,y:5.2},{x:4.4,y:3.5},{x:5,y:1}];
  const scenery=Array.from({length:125},(_,i)=>({x:.5+(Math.sin(i*127.1)*43758.5453%1+1)%1*9,y:.5+(Math.sin(i*311.7)*13758.5453%1+1)%1*9}));
  const f={worldW:10,worldH:10,biome:{encounterSeed:24017,zoneId:'departure-'+r},scenery,nodes:[],obstacles:spring?[{x:1,y:2},{x:7,y:1},{x:8,y:6},{x:4,y:2}]:[],hazards:[]};
  const landscape=makeLandscapeY5d(T,root,f,style,points,1);root.traverse(o=>{if(o.isInstancedMesh)o.castShadow=true;});
  if(cloud){root.position.y=-.16;const cloudMat=mat('#e5eee5',{roughness:1});for(let i=0;i<21;i++){const a=i*2.399;ell(scene,cloudMat,5+Math.cos(a)*(7+i%3),-.5-(i%4)*.19,5+Math.sin(a)*7,1.6,.42,1.1);}}
  // Stream behind the trailheads, natural banks and a small bridge.
  if(!spring&&!cloud){const curve=new T.CatmullRomCurve3([new T.Vector3(-2,.035,2.8),new T.Vector3(1,.04,2.0),new T.Vector3(4,.04,3.1),new T.Vector3(7,.04,2.4),new T.Vector3(12,.04,3.3)]);
   const bank=mesh(root,new T.TubeGeometry(curve,48,.42,8,false),rock,0,-.02,0);bank.scale.y=.25;
   const stream=mesh(root,new T.TubeGeometry(curve,48,.31,10,false),water,0,.07,0);stream.scale.y=.22;
   const bridge=group(root,5,.17,2.8);for(let i=0;i<7;i++)box(bridge,i%2?wood:woodLight,0,0,-.55+i*.18,1.15,.12,.16);for(const k of [-1,1]){for(const z of [-.55,.55])box(bridge,woodDark,k*.60,.25,z,.08,.50,.08);box(bridge,wood,k*.60,.43,0,.08,.08,1.24);}
  }
  // More intentional masses around the trail: pine silhouettes, warm stones and bushes.
  const pineDark=mat('#37543d'),pineMid=mat('#557344'),pineLight=mat('#82995b'),bark=mat('#735238');
  function pine(x,z,size){const p=group(root,x,0,z);p.scale.setScalar(size);cyl(p,bark,0,.62,0,.10,.16,1.24,9);for(let k=0;k<4;k++){const yy=.70+k*.39,r=.64-k*.10;const crown=mesh(p,new T.ConeGeometry(r,.92,9),[pineDark,pineMid,pineMid,pineLight][k],0,yy,0);crown.rotation.y=k*.8;}return p;}
  if(!spring&&!cloud){for(const [x,z,k] of [[.4,3.9,.9],[.7,5.4,1],[1.0,7.3,.7],[3.2,1.4,1.1],[4.1,1.0,.8],[6.3,1.2,1],[8.9,2.2,1.1],[9.3,5.3,.9],[9.1,7.1,.8],[.5,8.2,.65]])pine(x,z,k);
   for(let i=0;i<18;i++){const a=i*2.399,x=i%2?.65+(i%3)*.18:9.25-(i%3)*.16,z=1.4+(i%9)*.84;ell(root,i%3?pineMid:pineLight,x,.20,z,.32,.25,.25);if(i%3===0)ell(root,rock,x+.15,.13,z+.23,.21,.14,.24);}
  }else if(spring){const rust=mat('#a65e3c'),terracotta=mat('#bd8050');for(let i=0;i<13;i++){const side=i%2?1:-1,x=5+side*(3.4+(i%3)*.43),z=1.2+(i%6)*.82;ell(root,i%3?rust:terracotta,x,.4+(i%3)*.19,z,.55,.63+(i%3)*.26,.54);}}
  // Foreground clearing and visible destinations: existing terrain plus hand-built landmarks.
  // A regional ecology sample, not a route map; no route flags or restaurant origin.
  const ecology=departureEcologyZ2c4(r),actors=group(root),enemyMats={basalt:mat('#50464a'),basaltLight:mat('#7d6660'),red,ember:mat('#e68441'),sulfur:mat('#d9b758'),ink:mat('#3a3931'),purple:mat('#9678a6'),cream,barkLight:woodLight,gold:brass,bark:woodDark,stone2:rock,moss:green,copper:brass,green,blue:teal};
  const branch=(p,a,b,r1,r2,m)=>{const u=new T.Vector3(...a),v=new T.Vector3(...b),d=v.clone().sub(u),q=u.clone().add(v).multiplyScalar(.5),o=cyl(p,m,q.x,q.y,q.z,r1,r2,d.length(),9);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return o;};
  // Soft moving contact shadows replace per-frame shadow-map regeneration.
  const shadowPixels=new Uint8Array(32*32*4);for(let y=0;y<32;y++)for(let x=0;x<32;x++){const i=(y*32+x)*4,r=Math.hypot((x-15.5)/15.5,(y-15.5)/15.5);shadowPixels[i]=28;shadowPixels[i+1]=39;shadowPixels[i+2]=26;shadowPixels[i+3]=Math.round(94*Math.pow(Math.max(0,1-r),1.5));}
  const shadowTex=new T.DataTexture(shadowPixels,32,32,T.RGBAFormat);shadowTex.needsUpdate=true;
  const contact=new T.MeshBasicMaterial({map:shadowTex,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
  mats.add(contact);
  const homes=[[2.3,5.6],[7.2,5.3],[5.0,7.0]],critters=ecology.enemies.map((kind,i)=>{const model=createFieldEnemyModel(T,actors,{kind},{group,ball:ell,cyl,box,branch},enemyMats);model.scale.setScalar(kind==='boar'?1.5:1.85);model.traverse(o=>{if(o.isMesh)o.castShadow=false;});const shadow=mesh(root,new T.PlaneGeometry(kind==='boar'?2.2:1.55,kind==='boar'?2.0:1.55),contact,0,.021,0);shadow.rotation.x=-Math.PI/2;shadow.castShadow=false;shadow.receiveShadow=false;return {kind,model,shadow,x:homes[i%3][0],z:homes[i%3][1]};});
  for(let i=0;i<14;i++){const a=i*2.399,x=(i%2?7.9:2.1)+Math.sin(a)*1.1,z=3.3+Math.cos(a)*.95;if(spring)ell(root,rock,x,.16,z,.24,.20,.30);else {cyl(root,woodLight,x,.08,z,.035,.045,.16,8);ell(root,i%3?red:cream,x,.19,z,.13,.07,.12);}}

  const camera=new T.OrthographicCamera(-6,6,5,-5,.1,70);camera.position.set(5,14,17);camera.lookAt(5,0,5.2);
  return {scene,camera,sun,landscape,critters,ecology,update(t){landscape.update(t);for(const [i,v] of critters.entries()){
   const p=ecologyIdle(v.kind,t,i);v.model.position.set(v.x+p.x,p.y,v.z+p.z);v.model.rotation.y=p.yaw;v.shadow.position.set(v.x+p.x,.021,v.z+p.z);
   const d=v.model.userData;d.body.position.y=p.bodyY;d.body.rotation.x=p.pitch;d.body.scale.set(p.sxz,p.sy,p.sxz);
   if(d.skull)d.skull.rotation.y=p.head;
   for(const [j,l] of d.limbs.entries())l.rotation.x=Math.sin(t*4.2+j*Math.PI+i)*p.limb;
   for(const [j,w] of d.wings.entries())w.rotation.z=Math.sin(t*(v.kind==='gust_moth'?11:3.8)+j*Math.PI)*p.wing;
  }},dispose(){shadowTex.dispose();sun.shadow.map?.dispose();for(const o of landscape.resources)o.dispose?.();for(const v of critters)for(const mat of v.model.userData.flashMats||[])mat.dispose();}};
 }
 function buildBench(){
  const scene=new T.Scene();scene.background=new T.Color('#394d3d');lights(scene,{x:0,z:0},false);const root=group(scene);
  cyl(root,woodDark,0,-.13,0,.72,.78,.18,48);cyl(root,woodLight,0,-.033,0,.73,.75,.045,48);ring(root,brass,.70,.018,-.005);
  const hero=makeChefY2(T,rounded,true);root.add(hero.root);const rig=createWeaponRig(T,hero,rounded);
  const camera=new T.OrthographicCamera(-1,1,1,-1,.1,40);camera.position.set(0,2.25,5.8);camera.lookAt(0,.70,0);
  return {scene,camera,hero,rig,update(type,level,t){hero.update(t,{facing:'front',moving:false,working:false,carrying:false});rig.update({weapon:{type,level},moving:false,facing:{x:0,y:1}},t);hero.root.rotation.y=Math.sin(t*.85)*.035;},dispose(){const gs=new Set(),ms=new Set();hero.root.traverse(o=>{if(o.geometry)gs.add(o.geometry);if(o.material)for(const v of Array.isArray(o.material)?o.material:[o.material])ms.add(v);});for(const g of gs)if(!geo.has(g))g.dispose();for(const v of ms)if(!mats.has(v))v.dispose();}};
 }

 function clearHost(host,canvas){canvas?.remove();if(host)host.removeAttribute('data-z2c3-active');}
 function attach(nextMap,nextRack){if(map===nextMap&&rack===nextRack)return;if(map)map.removeAttribute('data-z2c3-active');if(rack)rack.removeAttribute('data-z2c3-active');map=nextMap;rack=nextRack;
  if(!mapCanvas)mapCanvas=document.createElement('canvas');if(!rackCanvas)rackCanvas=document.createElement('canvas');
  for(const [host,c,kind] of [[map,mapCanvas,'landscape'],[rack,rackCanvas,'equipment']]){c.className='z2c3-render';c.dataset.oddpotDeparture=kind;c.setAttribute('aria-hidden','true');host.prepend(c);if(c.dataset.drawCalls&&(kind==='equipment'||c.dataset.region===host.dataset.departureRegion))host.dataset.z2c3Active='1';}
 }
 function paint(canvas,scene,camera,rect,halfWidth,halfHeight){
  const {w,h,x,y}=rect,aspect=w/h,half=Math.max(halfHeight,halfWidth/aspect);camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();
  renderer.setViewport(x,y,w,h);renderer.setScissor(x,y,w,h);renderer.setScissorTest(true);renderer.render(scene,camera);
  if(canvas.width!==w)canvas.width=w;if(canvas.height!==h)canvas.height=h;const ctx=canvas.getContext('2d');if(!ctx||ctx.isContextLost?.())throw Error('departure display canvas unavailable');
  ctx.drawImage(renderer.domElement,x,atlasH-y-h,w,h,0,0,w,h);return renderer.info.render.calls;
 }
 function onscreen(host){const r=host.getBoundingClientRect(),s=host.closest('.route-panel')?.getBoundingClientRect();return r.bottom>Math.max(0,s?.top||0)&&r.top<Math.min(innerHeight,s?.bottom||innerHeight);}

 function releaseScene(s){if(!s)return;s.dispose?.();s.scene.traverse(o=>{if(o.geometry&&!geo.has(o.geometry))o.geometry.dispose();});}
 return {same:(a,b)=>map===a&&rack===b,rebind:attach,draw(a,b,t,quality,target){
  attach(a,b);const next=a.dataset.departureRegion||'forest',buttons=[...b.parentElement.querySelectorAll('[data-weapon]')],selectedButton=buttons.find(x=>x.getAttribute('aria-pressed')==='true')||buttons[0],selected=selectedButton?.dataset.weapon||'WOK',level=Number(selectedButton?.dataset.weaponLevel)||1;
  if(next!==region){if(!lands.has(next))lands.set(next,buildLand(next));land=lands.get(next);region=next;}
  if(!bench)bench=buildBench();
  const atlas=previewAtlas(a.clientWidth,a.clientHeight,b.clientWidth,b.clientHeight,quality);const resized=atlas.width!==atlasW||atlas.height!==atlasH;
  if(resized){atlasW=atlas.width;atlasH=atlas.height;renderer.setSize(atlasW,atlasH,false);atlasResizes++;}
  const showLand=onscreen(a)||!mapCanvas.dataset.drawCalls||mapCanvas.dataset.region!==region||resized,showHero=onscreen(b)||!rackCanvas.dataset.drawCalls||rackCanvas.dataset.selected!==selected||rackCanvas.dataset.level!==String(level)||resized;
  let landCalls=Number(mapCanvas.dataset.drawCalls)||0,benchCalls=Number(rackCanvas.dataset.drawCalls)||0;
  if(showLand){land.update(t);landCalls=paint(mapCanvas,land.scene,land.camera,atlas.land,5.55,3.7);mapCanvas.dataset.frames=String((Number(mapCanvas.dataset.frames)||0)+1);}
  if(showHero){bench.update(selected,level,t);benchCalls=paint(rackCanvas,bench.scene,bench.camera,atlas.hero,.82,.96);rackCanvas.dataset.frames=String((Number(rackCanvas.dataset.frames)||0)+1);}
  frames++;mapCanvas.dataset.targetFps=String(target);mapCanvas.dataset.atlasResizes=String(atlasResizes);rackCanvas.dataset.portrait='z2c12';
  mapCanvas.dataset.region=region;mapCanvas.dataset.drawCalls=String(landCalls);mapCanvas.dataset.landscape='y5d';mapCanvas.dataset.enemies=land.ecology.enemies.join(',');rackCanvas.dataset.drawCalls=String(benchCalls);rackCanvas.dataset.selected=selected;rackCanvas.dataset.level=String(level);rackCanvas.dataset.upgradeParts=String(bench.rig.masteryParts());rackCanvas.dataset.models=String(buttons.length);
  a.dataset.z2c3Active='1';b.dataset.z2c3Active='1';
 },dispose(){disposed=true;clearHost(map,mapCanvas);clearHost(rack,rackCanvas);for(const v of lands.values())releaseScene(v);lands.clear();bench?.dispose();for(const g of geo)g.dispose();for(const mat of mats)mat.dispose();renderer.dispose();renderer.forceContextLoss();}};
}
