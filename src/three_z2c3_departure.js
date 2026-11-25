import {createRecovery,sharedThree,visibleHost} from './three_y6a_recovery.js?v=y6a';
import {makeLandscapeY5d} from './three_y5d_landscape.js?v=y5d';
import {roundedFactory} from './three_y1_models.js?v=y1';
// Art-only scene: the existing DOM buttons remain authoritative for every action.
let instance=null,entered=false,lastAt=-Infinity;
const recovery=createRecovery();
const status=v=>document.documentElement.dataset.oddpotDeparture3d=v;
function release(){if(instance){const old=instance;instance=null;old.dispose();}lastAt=-Infinity;}
function leave(){if(!entered&&!instance)return;entered=false;release();recovery.reset();status('idle');}
function fail(e){recovery.fail();release();status('fallback');if(globalThis.__oddpotBuild?.sceneErrors)globalThis.__oddpotBuild.sceneErrors.departure=String(e);console.warn('Oddpot departure fallback',e);}
export function enableZ2c3(){
 status('idle');globalThis.__oddpotDepartureRenderer={leave,retry(){release();recovery.reset();sharedThree.reset();status('idle');},draw(app,s,now){
  if(s.phase!=='field'||s.field){leave();return;}
  const map=app.querySelector('.z2c2-map'),rack=app.querySelector('.z2c2-tools');if(!map||!rack){leave();return;}entered=true;
  if(!visibleHost(map)||!visibleHost(rack)||!recovery.canTry())return;
  const T=sharedThree.value;if(!T){sharedThree.tryLoad();status(sharedThree.exhausted?'fallback':'loading');return;}
  if(instance?.same(map,rack)&&now-lastAt<90)return;lastAt=now;
  try{if(!instance)instance=makeDiorama(T);instance.draw(map,rack,now/1000);recovery.success();status('active');if(globalThis.__oddpotBuild?.sceneErrors)delete globalThis.__oddpotBuild.sceneErrors.departure;}catch(e){fail(e);}
 }};
}
function makeDiorama(T){
 const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power',preserveDrawingBuffer:true});
 renderer.setPixelRatio(1);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.14;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 let disposed=false;renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();if(!disposed)fail(Error('departure WebGL context lost'));});
 let map=null,rack=null,land=null,bench=null,region='',weaponKey='',mapCanvas=null,rackCanvas=null;
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
 function lights(scene,focus){scene.add(new T.HemisphereLight('#fff1cf','#576d57',1.75));const sun=new T.DirectionalLight('#ffe0ac',3.1);sun.position.set(focus.x-5,9,focus.z+4);sun.target.position.set(focus.x,0,focus.z);scene.add(sun.target,sun);sun.castShadow=true;Object.assign(sun.shadow.camera,{left:-9,right:9,top:9,bottom:-9,near:.5,far:30});sun.shadow.mapSize.set(1024,1024);sun.shadow.normalBias=.035;const fill=new T.DirectionalLight('#b5d9e5',.8);fill.position.set(9,5,-6);scene.add(fill);}
 function lodge(parent,x,z){const g=group(parent,x,0,z);box(g,rock,0,.09,0,2.0,.18,1.48);box(g,plaster,0,.70,0,1.78,1.18,1.29);
  for(const k of [-1,1]){box(g,woodDark,k*.82,.70,.66,.11,1.20,.10);box(g,woodDark,k*.82,.70,-.66,.11,1.20,.10);const slab=box(g,roof,k*.49,1.48,0,1.15,.14,1.64);slab.rotation.z=-k*.55;for(let i=0;i<7;i++){const tile=box(g,i%2?roof:roofEdge,k*.48,1.57,-.72+i*.235,1.10,.055,.23);tile.rotation.z=-k*.55;}}
  box(g,woodDark,0,1.31,.67,1.72,.12,.13);box(g,woodDark,0,.48,.67,.46,.85,.10);box(g,woodLight,0,.48,.73,.34,.73,.06);for(const k of [-1,1]){box(g,woodDark,k*.55,.82,.68,.40,.40,.09);box(g,light,k*.55,.82,.74,.30,.30,.055);box(g,woodDark,k*.55,.82,.78,.035,.30,.02);box(g,woodDark,k*.55,.82,.78,.30,.035,.02);}box(g,red,0,1.15,.76,.57,.28,.055);box(g,rock,.60,1.68,-.30,.27,.68,.30);box(g,woodDark,0,.06,.91,.68,.12,.43);return g;}
 function flag(parent,x,z,risk){const g=group(parent,x,.0,z);cyl(g,woodDark,0,.52,0,.045,.065,1.04,10);ell(g,brass,0,1.08,0,.08,.08,.08);box(g,risk?red:green,.25,.82,0,.43,.38,.055);box(g,brass,.25,1.02,0,.48,.045,.08);return g;}
 function buildLand(r){
  const scene=new T.Scene();scene.background=new T.Color(r==='cloud'?'#a0bac3':'#6a8870');
  scene.fog=new T.Fog(scene.background,20,37);lights(scene,{x:5,z:5});
  const root=group(scene),spring=r==='spring',cloud=r==='cloud',style=spring?'spring':'meadow';
  const points=[{x:5,y:9},{x:5,y:7},{x:2.1,y:4.8},{x:2.1,y:3.7},{x:5,y:7},{x:7.9,y:4.8},{x:7.9,y:3.7}];
  const scenery=Array.from({length:125},(_,i)=>({x:.5+(Math.sin(i*127.1)*43758.5453%1+1)%1*9,y:.5+(Math.sin(i*311.7)*13758.5453%1+1)%1*9}));
  const f={worldW:10,worldH:10,biome:{encounterSeed:24017,zoneId:'departure-'+r},scenery,nodes:[],obstacles:spring?[{x:1,y:2},{x:7,y:1},{x:8,y:6},{x:4,y:2}]:[],hazards:[]};
  const landscape=makeLandscapeY5d(T,root,f,style,points,1);
  if(cloud){root.position.y=-.16;const cloudMat=mat('#e5eee5',{roughness:1});for(let i=0;i<21;i++){const a=i*2.399;ell(scene,cloudMat,5+Math.cos(a)*(7+i%3),-.5-(i%4)*.19,5+Math.sin(a)*7,1.6,.42,1.1);}}
  // Stream behind the trailheads, natural banks and a small bridge.
  if(!spring&&!cloud){const curve=new T.CatmullRomCurve3([new T.Vector3(-2,.035,2.8),new T.Vector3(1,.04,2.0),new T.Vector3(4,.04,3.1),new T.Vector3(7,.04,2.4),new T.Vector3(12,.04,3.3)]);
   const bank=mesh(root,new T.TubeGeometry(curve,48,.42,8,false),rock,0,-.23,0);bank.scale.y=.25;
   const stream=mesh(root,new T.TubeGeometry(curve,48,.31,10,false),water,0,-.08,0);stream.scale.y=.22;
   const bridge=group(root,5,.17,2.8);for(let i=0;i<7;i++)box(bridge,i%2?wood:woodLight,0,0,-.55+i*.18,1.15,.12,.16);for(const k of [-1,1]){for(const z of [-.55,.55])box(bridge,woodDark,k*.60,.25,z,.08,.50,.08);box(bridge,wood,k*.60,.43,0,.08,.08,1.24);}
  }
  // Foreground clearing and visible destinations: existing terrain plus hand-built landmarks.
  lodge(root,5,8.6);flag(root,2.05,4.8,false);flag(root,7.95,4.8,true);
  for(let i=0;i<14;i++){const a=i*2.399,x=(i%2?7.9:2.1)+Math.sin(a)*1.1,z=3.3+Math.cos(a)*.95;if(spring)ell(root,rock,x,.16,z,.24,.20,.30);else {cyl(root,woodLight,x,.08,z,.035,.045,.16,8);ell(root,i%3?red:cream,x,.19,z,.13,.07,.12);}}
  for(let i=0;i<6;i++){const z=7.8-i*.38;for(const k of [-1,1])box(root,woodDark,5+k*.65,.20,z,.08,.4,.08);}
  const camera=new T.OrthographicCamera(-6,6,5,-5,.1,70);camera.position.set(5,14,17);camera.lookAt(5,0,5.2);
  return {scene,camera,landscape,anchors:[[2.05,1.0,4.8],[7.95,1.0,4.8]],dispose(){for(const o of landscape.resources)o.dispose?.();}};
 }
 function buildBench(types,selected){
  const scene=new T.Scene();scene.background=new T.Color('#4a3528');lights(scene,{x:0,z:0});const root=group(scene),count=types.length,span=Math.max(5.8,count*1.65);
  box(root,woodDark,0,-.24,0,span+.65,.42,3.7);for(let i=0;i<8;i++)box(root,i%2?wood:woodLight,0,.005,-1.62+i*.46,span+.6,.09,.45);
  for(const k of [-1,1])box(root,woodDark,k*(span/2+.1),-.62,1.2,.25,.7,.34);
  const models=[];for(const [i,type] of types.entries()){const x=(i-(count-1)/2)*span/count,g=group(root,x,.10,0);models.push(g);const active=type===selected;
   box(g,active?gold:woodDark,0,-.02,0,span/count*.88,.10,2.0);box(g,wood,0,.04,0,span/count*.81,.08,1.92);
   const v=group(g,0,.12,-.04);const scale=Math.min(.78,span/count/2.6);v.scale.setScalar(scale);
   if(type==='WOK'){lathe(v,iron,[[0,0],[.46,.03],[.81,.20],[1.04,.46],[1.06,.51],[.99,.51],[.76,.25],[.42,.10],[0,.08]]);ring(v,brass,1.04,.026,.49);box(v,woodDark,1.32,.40,0,.63,.13,.18);box(v,brass,1.03,.40,0,.18,.13,.19);const shield=group(v,-.64,.20,.53);shield.rotation.x=-.6;const lid=cyl(shield,iron,0,.05,0,.48,.48,.08);ring(shield,brass,.44,.035,.10);ell(shield,brass,0,.15,0,.12,.10,.12);}
   else if(type==='POT'){lathe(v,teal,[[0,0],[.70,0],[.86,.14],[.86,.74],[.82,.78],[.77,.73],[.77,.09],[0,.09]]);ring(v,brass,.84,.035,.76);for(const k of [-1,1]){const h=mesh(v,new T.TorusGeometry(.20,.055,8,24),brass,k*.95,.57,0);h.rotation.y=Math.PI/2;}const lid=group(v,0,.78,0);lathe(lid,teal,[[0,.21],[.25,.19],[.66,.10],[.88,0],[.86,-.04],[.66,.03],[0,.15]]);ring(lid,brass,.86,.028,0);ell(lid,brass,0,.25,0,.14,.08,.14);}
   else if(type==='GRILL'){box(v,woodDark,-.64,.20,0,.90,.20,.16);box(v,brass,-.05,.20,0,.31,.18,.20);box(v,iron,.43,.20,0,.85,.09,.13);for(const k of [-1,1])box(v,iron,.95,.20,k*.20,.59,.075,.08);}
   else{for(let j=0;j<3;j++){cyl(v,bamboo,0,.14+j*.23,0,.86,.86,.22);ring(v,woodDark,.86,.024,.05+j*.23);}const lid=group(v,0,.70,0);lathe(lid,bamboo,[[0,.19],[.35,.18],[.72,.09],[.9,0],[.88,-.035],[0,.15]]);box(lid,woodDark,0,.23,0,.25,.08,.12);}
  }
  const camera=new T.OrthographicCamera(-span/2,span/2,2,-2,.1,50);camera.position.set(0,5.4,7.6);camera.lookAt(0,.1,0);return {scene,camera,span,models};
 }
 function clearHost(host,canvas){canvas?.remove();if(host)host.removeAttribute('data-z2c3-active');}
 function attach(nextMap,nextRack){if(map===nextMap&&rack===nextRack)return;clearHost(map,mapCanvas);clearHost(rack,rackCanvas);map=nextMap;rack=nextRack;mapCanvas=document.createElement('canvas');rackCanvas=document.createElement('canvas');for(const [host,c,kind] of [[map,mapCanvas,'landscape'],[rack,rackCanvas,'equipment']]){c.className='z2c3-render';c.dataset.oddpotDeparture=kind;c.setAttribute('aria-hidden','true');host.prepend(c);}}
 function paint(host,canvas,scene,camera,halfWidth,halfHeight){const w=Math.min(780,Math.max(1,Math.round(host.clientWidth*1.3))),h=Math.min(780,Math.max(1,Math.round(host.clientHeight*1.3)));const aspect=w/h,half=Math.max(halfHeight,halfWidth/aspect);camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();renderer.setSize(w,h,false);renderer.render(scene,camera);if(canvas.width!==w)canvas.width=w;if(canvas.height!==h)canvas.height=h;const ctx=canvas.getContext('2d');if(!ctx||ctx.isContextLost?.())throw Error('departure display canvas unavailable');ctx.drawImage(renderer.domElement,0,0);return renderer.info.render.calls;}
 function releaseScene(s){if(!s)return;s.dispose?.();s.scene.traverse(o=>{if(o.geometry&&!geo.has(o.geometry))o.geometry.dispose();});}
 return {same:(a,b)=>map===a&&rack===b,draw(a,b,t){
  attach(a,b);const next=a.dataset.departureRegion||'forest',buttons=[...b.querySelectorAll('[data-weapon]')],types=buttons.map(x=>x.dataset.weapon),selected=buttons.find(x=>x.getAttribute('aria-pressed')==='true')?.dataset.weapon,key=types.join(',')+':'+selected;
  if(next!==region){releaseScene(land);land=buildLand(next);region=next;}
  if(key!==weaponKey){releaseScene(bench);bench=buildBench(types,selected);weaponKey=key;}
  land.landscape.update(t);const landCalls=paint(a,mapCanvas,land.scene,land.camera,5.75,4.6),benchCalls=paint(b,rackCanvas,bench.scene,bench.camera,bench.span/2+.25,1.20);
  mapCanvas.dataset.region=region;mapCanvas.dataset.drawCalls=String(landCalls);mapCanvas.dataset.landscape='y5d';rackCanvas.dataset.drawCalls=String(benchCalls);rackCanvas.dataset.selected=selected||'';rackCanvas.dataset.models=String(types.length);
  a.dataset.z2c3Active='1';b.dataset.z2c3Active='1';
 },dispose(){disposed=true;clearHost(map,mapCanvas);clearHost(rack,rackCanvas);releaseScene(land);releaseScene(bench);for(const g of geo)g.dispose();for(const m of mats)m.dispose();renderer.dispose();renderer.forceContextLoss();}};
}
