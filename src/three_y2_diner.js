// Y2a read-only 3D renderer. Original game remains the only simulation.
import {dinerFloor,dinerQueueGuests,dinerGuide} from './restaurant_scene_v075.js?v=y4d';
import {RECIPES,CUSTOMERS} from './data.js';
import {selectDiningSpeech,selectStaffSpeech} from './diner_ambience_v077.js';
import {homeKitchenChatter} from './home_kitchen_v013j.js';
import {roundedFactory} from './three_y1_models.js?v=y1';
import {makeChefY2} from './three_y2b_chef.js?v=y3d';
import {dinerAction,createServiceRig} from './three_y4a_service.js?v=y6';
import {DINER_TIMING} from './engine.js';
import {mealLife} from './three_y6_life.js?v=y6';
import {makeGuestFactory} from './three_y6_guests.js?v=y6';
import {makeDishFactory} from './three_y6_dishes.js?v=y6';

export function y2Eligible(s){return s?.activeWorld!=='cloud'&&(s?.phase==='forecast'&&!s.service||s?.phase==='service'&&!!s.service?.walkable);}
export function y2Layout(s){
 const g=dinerFloor(s),v=s.service,slots=v?.kitchenSnapshot||s.kitchen?.slots||[];
 const n=v?v.kitchenSnapshot?.length||2:s.kitchen?.thirdUnlocked?3:2;
 return {tables:g.tables.map((p,i)=>({id:i,x:p.x,z:p.y})),stoves:[g.stoveLeft,g.stoveRight,g.reservedStove].map((p,i)=>({id:['WOK','POT','CENTER'][i],x:p.x,z:p.y,unlocked:i<n,type:slots[i]?.type||(i===1?'POT':'WOK'),level:slots[i]?.level||1})),floor:g};
}
export const dinerWorldX=x=>x*10;
export const dinerWorldZ=z=>z<=.428?z*12:.428*12+(z-.428)*16;
const wx=dinerWorldX,wz=dinerWorldZ;
export function dinerVisibleActors(s,t,actors){const v=s.service;if(!v)return actors;const queued=dinerQueueGuests(s,v.time),outside=queued.slice(0,10).map((o,i)=>({id:o.id,kind:o.segment,x:.18+(i%5)*.16,y:1.015+Math.floor(i/5)*.065,order:o,waiting:true,walk:false}));return [...actors,...outside];}
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const activeOrders=new Set(['queued','cooking','pickup','carried','delivering','flying','ordering']);
let disabled=false,instance=null,pending=null,lib=null;
const y2bHotspots=['stock','book','bento','crew','door'];
export function y2bHotspotPosition(x,y,w,h){return {x:clamp(x,Math.min(36,w/2),Math.max(w-36,w/2)),y:clamp(y,Math.min(24,h/2),Math.max(h-24,h/2))};}
function resetHotspots(){for(const k of y2bHotspots)for(const el of document.querySelectorAll('.v016-'+k+'[data-y2b-anchor]')){el.style.removeProperty('left');el.style.removeProperty('top');el.style.removeProperty('bottom');el.style.removeProperty('transform');delete el.dataset.y2bAnchor;}}
function leave(){if(!instance)return;const old=instance;instance=null;old.dispose();resetHotspots();}
function fail(error){disabled=true;leave();resetHotspots();console.warn('Oddpot 3D fallback',error);document.documentElement.dataset.oddpot3d='fallback';}
export function enableY2(){
 document.documentElement.dataset.oddpot3d='loading';
 globalThis.__oddpotY2Renderer={leave,draw(canvas,s,t,w,h,actorsFn){
  if(!y2Eligible(s)||disabled){leave();resetHotspots();return false;}
  if(!lib){if(!pending)pending=import('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js').then(T=>{lib=T;document.documentElement.dataset.oddpot3d='ready';}).catch(fail);return false;}
  try{if(!instance)instance=createDiner(lib);instance.draw(canvas,s,t,w,h,dinerVisibleActors(s,t,actorsFn(s,t)));return true;}catch(e){fail(e);return false;}
 }};
}
function createDiner(T){
 const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
 const element=renderer.domElement;Object.assign(element.style,{position:'absolute',inset:'0',width:'100%',height:'100%',zIndex:'0',pointerEvents:'none'});
 let disposed=false;element.setAttribute('aria-hidden','true');element.addEventListener('webglcontextlost',e=>{e.preventDefault();if(!disposed)fail(new Error('WebGL context lost'));});
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
 const scene=new T.Scene();scene.background=new T.Color('#343b36');
 const camera=new T.OrthographicCamera(-6,6,7,-7,.1,60);camera.position.set(5,23,25);camera.lookAt(5,0,8.7);
 const rounded=roundedFactory(T),mat=(color,roughness=.85,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
 const wood=mat('#9a6846'),top=mat('#c99a65'),dark=mat('#59402f'),mortar=mat('#625951'),stone=mat('#898477'),brass=mat('#c6a16a',.45,.4),iron=mat('#485c58',.5,.4),cream=mat('#eddbb6'),teal=mat('#557b70'),red=mat('#b55e4d'),green=mat('#728e57'),blue=mat('#628a9b'),violet=mat('#ad92c2');
 const sphere=new T.SphereGeometry(1,16,12),boxCache=new Map(),cylCache=new Map();
 function mesh(p,g,m,x,y,z){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;p.add(o);return o;}
 function group(p,x=0,y=0,z=0){const o=new T.Group();o.position.set(x,y,z);p.add(o);return o;}
 function box(p,x,y,z,w,h,d,m,soft=0){const k=[w,h,d].join(':');if(!boxCache.has(k))boxCache.set(k,new T.BoxGeometry(w,h,d));return mesh(p,soft?rounded(w,h,d,soft):boxCache.get(k),m,x,y,z);}
 function cyl(p,x,y,z,a,b,h,m,n=20){const k=[a,b,h,n].join(':');if(!cylCache.has(k))cylCache.set(k,new T.CylinderGeometry(a,b,h,n));return mesh(p,cylCache.get(k),m,x,y,z);}
 function ball(p,x,y,z,a,b,c,m){const o=mesh(p,sphere,m,x,y,z);o.scale.set(a,b,c);return o;}
 const dishes=makeDishFactory(T,rounded,RECIPES),guestFactory=makeGuestFactory(T,rounded);
 const plate=(p,x,y,z)=>dishes.create(p,x,y,z);
 // Real 10x12 floor: same x/z normalization for all furniture and actors.
 box(scene,5,-.22,7.90,10.45,.44,13.6,mortar,.1);
 const woods=['#a67650','#b18157','#9b6c47','#b68a60'].map(c=>mat(c));
 for(let j=0;j<23;j++)for(let i=0;i<7;i++){const a=Math.max(0,i*1.6-(j%2)*.8),b=Math.min(10,i*1.6-(j%2)*.8+1.6);if(b>a+.025)box(scene,(a+b)/2,.02,1.35+j*.58,b-a-.018,.035,.56,woods[(i+j*3)%4]);}
 for(let j=0;j<5;j++)for(let i=0;i<14;i++)box(scene,i*.714+.357,.05,1.6+j*.66,.69,.04,.64,stone);
 box(scene,5,1.52,1.20,10.35,3.04,.35,mortar);
 for(let j=0;j<7;j++)for(let i=0;i<15;i++){let x=i*.67+.33;if(x<4.12||x>5.9||j<2||j>5)box(scene,x,j*.43+.21,1.40,.64,.40,.14,stone);}
 for(const x of [0,10]){box(scene,x,1.52,1.4,.25,3.04,.45,dark,.03);box(scene,x,.19,7.95,.28,.38,13.1,stone,.04);}
 box(scene,5,3.05,1.30,10.45,.22,.44,wood,.04);
 box(scene,5,1.78,1.48,1.78,1.48,.10,mat('#8ab7b5'));for(const x of [4.09,5,5.91])box(scene,x,1.78,1.56,.11,1.60,.14,dark,.02);for(const y of [1.0,1.78,2.56])box(scene,5,y,1.56,1.9,.13,.17,dark,.025);box(scene,5,.92,1.62,2,.12,.42,top,.03);
 for(const x of [3.4,6.6]){box(scene,x,1.53,1.48,.15,2.95,.28,wood,.03);}
 const pantry=group(scene,1.55,0,1.73);box(pantry,0,1.03,0,1.8,2.06,.52,dark,.04);for(let j=0;j<3;j++){box(pantry,0,.56+j*.56,.12,1.77,.085,.62,top,.025);for(let i=0;i<5;i++){const x=-.66+i*.33;cyl(pantry,x,.72+j*.56,.18,.11,.13,.24,[red,green,brass][(i+j)%3]);cyl(pantry,x,.86+j*.56,.18,.105,.105,.05,cream);}}
 const ledger=group(scene,8.3,1.6,1.6);box(ledger,0,0,0,1.12,.82,.13,dark,.035);box(ledger,0,0,.075,.93,.62,.035,cream,.02);for(let i=0;i<4;i++)box(ledger,0,.18-i*.115,.103,.65-i%2*.12,.025,.02,wood);
 for(const [a,b] of [[.075,.390],[.610,.925]]){const x=wx((a+b)/2),w=wx(b-a),z=wz(.408);box(scene,x,.43,z,w,.86,.48,wood,.04);box(scene,x,.91,z,w+.09,.16,.57,top,.04);for(let i=0;i<3;i++){const xx=x+(i-1)*w/3;box(scene,xx,.43,z+.25,w/3-.08,.64,.04,dark,.02);box(scene,xx,.43,z+.28,w/3-.18,.52,.03,wood,.02);box(scene,xx+.18,.56,z+.31,.09,.05,.04,brass,.015);}for(let j=0;j<3;j++)cyl(scene,x-.55+j*.22,1.10,z,.085,.10,.22,[red,green,brass][j]);}
 // The existing action buttons point at these real display props.
 const lunch=group(scene,2.45,1.02,wz(.408));box(lunch,0,.10,0,.58,.20,.37,wood,.035);box(lunch,0,.23,0,.62,.085,.41,top,.025);box(lunch,0,.16,0,.08,.26,.43,red,.015);
 const roster=group(scene,7.55,1.0,wz(.408));box(roster,0,.17,0,.47,.34,.13,dark,.025);box(roster,0,.17,.076,.40,.27,.025,cream,.015);for(let i=0;i<3;i++)box(roster,0,.24-i*.075,.095,.27,.018,.015,wood);
 const pass=group(scene,wx(.33),0,wz(.397));box(pass,0,1.01,0,1.13,.10,.42,teal,.025);const passPlates=[-1,0,1].map(i=>{const p=plate(pass,i*.37,1.10,0);p.scale.setScalar(1.15);return p;});
 const guideMark=group(scene);const markerMat=new T.MeshBasicMaterial({color:'#ffdf8b',transparent:true,opacity:.85,depthTest:true,depthWrite:false,side:T.DoubleSide});const markerGeo=new T.RingGeometry(.37,.44,40);markerGeo.rotateX(-Math.PI/2);mesh(guideMark,markerGeo,markerMat,0,.04,0).castShadow=false;const arrow=mesh(guideMark,new T.ConeGeometry(.14,.29,4),markerMat,0,.55,0);arrow.rotation.z=Math.PI;arrow.castShadow=false;
 box(scene,5,.045,wz(.93),1.7,.035,1.45,cream,.02);box(scene,5,.067,wz(.93),1.55,.02,1.30,teal,.02);
 const porch=group(scene);const porchZ=wz(1.055);box(porch,5,-.18,porchZ,10.45,.35,3.2,stone,.06);for(let j=0;j<4;j++)for(let i=0;i<10;i++)box(porch,i+0.5,.025,porchZ-1.2+j*.76,.96,.05,.72,(i+j)%2?stone:mortar,.015);for(const x of [0.35,9.65]){box(porch,x,.65,wz(.985),.22,1.30,.24,wood,.025);box(porch,x,1.35,wz(.985),.37,.12,.37,brass,.025);ball(porch,x,1.48,wz(.985),.14,.17,.14,cream);}
 for(const x of [1.8,8.2]){box(porch,x,.35,porchZ+1.0,2.65,.17,.40,wood,.03);for(const dx of [-.95,.95])box(porch,x+dx,.16,porchZ+1.0,.14,.32,.22,dark,.02);}
 box(porch,5,.075,wz(.975),2.1,.11,.50,top,.03);
 for(const x of [.85,9.15]){cyl(scene,x,.26,wz(.885),.22,.16,.48,wood);for(let i=0;i<5;i++)ball(scene,x+Math.cos(i*2.4)*.15,.62+Math.sin(i)*.07,wz(.885)+Math.sin(i*2.4)*.12,.15,.25,.13,green);}
 const alcoves=[.255,.745].map(x=>{const p=group(scene,wx(x),0,wz(.555));box(p,0,.04,0,2.65,.045,1.72,teal,.04);for(const dx of [-1.25,1.25])box(p,dx,.055,0,.035,.025,1.70,brass,.008);return p;});
 const tables=[];
 for(let i=0;i<4;i++){const p=group(scene);for(const x of [-.57,.57])for(const z of [-.37,.37])box(p,x,.34,z,.14,.68,.14,dark,.025);box(p,0,.76,0,1.65,.16,1.12,top,.045);box(p,0,.85,0,.36,.025,1.14,teal,.009);
  for(const x of [-1.02,1.02]){for(const dx of [-.16,.16])for(const dz of [-.16,.16])box(p,x+dx,.18,dz,.075,.36,.075,dark,.015);box(p,x,.39,0,.49,.12,.49,wood,.035);box(p,x,.465,0,.44,.08,.43,teal,.025);}
  const meals=[plate(p,-.40,.88,.04),plate(p,.40,.88,.04)];tables.push({p,meals});}
 const flameMat=mat('#f2a052');flameMat.emissive.set('#ff842d');flameMat.emissiveIntensity=1.6;
 const steamGeo=new T.SphereGeometry(1,10,8),steamMats=Array.from({length:4},()=>new T.MeshBasicMaterial({color:'#f6e9d0',transparent:true,opacity:.13,depthWrite:false}));
 const stoves=[];
 for(let i=0;i<3;i++){const p=group(scene);box(p,0,.29,0,1.56,.58,1.05,stone,.08);box(p,0,.64,0,1.68,.14,1.16,mortar,.04);box(p,0,.25,.535,.72,.27,.045,dark,.025);
  const flames=[];for(let k=0;k<3;k++)flames.push(ball(p,(k-1)*.16,.25,.58,.10,.10,.065,flameMat));
  const vessels={};for(const kind of ['WOK','POT','GRILL','STEAM','LOCKED'])vessels[kind]=group(p);
  const wok=vessels.WOK;mesh(wok,new T.LatheGeometry([[.025,0],[.25,.04],[.42,.17],[.48,.28]].map(v=>new T.Vector2(...v)),32),new T.MeshStandardMaterial({color:'#485e59',side:T.DoubleSide,metalness:.45,roughness:.45}),0,.75,0);box(wok,.60,1.01,0,.42,.08,.09,dark,.02);
  const pot=vessels.POT;cyl(pot,0,.96,0,.43,.39,.46,iron,32);cyl(pot,0,1.22,0,.45,.45,.08,brass,32);ball(pot,0,1.29,0,.08,.06,.08,dark);for(const q of [-1,1])box(pot,q*.47,.98,0,.16,.11,.19,brass,.025);
  const grill=vessels.GRILL;box(grill,0,.87,0,1.32,.29,.88,iron,.04);for(let j=0;j<7;j++)box(grill,-.52+j*.17,1.035,0,.045,.035,.77,brass,.008);
  const steam=vessels.STEAM;for(let j=0;j<2;j++){cyl(steam,0,.84+j*.23,0,.43,.43,.22,top,32);cyl(steam,0,.73+j*.23,0,.45,.45,.04,dark,32);}cyl(steam,0,1.21,0,.45,.45,.08,cream,32);
  box(vessels.LOCKED,0,.81,0,1.34,.17,.91,dark,.04);for(const k of [-1,1])box(vessels.LOCKED,0,.93,0,1.13,.08,.12,top,.01).rotation.y=k*.61;
  const wisps=steamMats.map(m=>{const o=mesh(p,steamGeo,m,0,1.4,0);o.castShadow=false;o.receiveShadow=false;return o;});
  stoves.push({p,flames,vessels,wisps});
 }
 for(const x of [2.45,7.55]){cyl(scene,x,2.15,2.46,.36,.70,.35,iron,32);cyl(scene,x,2.67,2.46,.14,.14,.85,iron);cyl(scene,x,1.96,2.46,.72,.72,.06,brass,32);}
 const hemi=new T.HemisphereLight('#e3e9cf','#76634d',1.9);scene.add(hemi);const sun=new T.DirectionalLight('#ffdfb1',3.1);sun.position.set(-3,10,4);sun.target.position.set(5,0,6);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-9,right:9,top:9,bottom:-9,near:.5,far:35});sun.shadow.normalBias=.03;scene.add(sun,sun.target);
 for(const x of [2.2,7.8]){box(scene,x,2.25,1.59,.19,.34,.19,brass,.04);ball(scene,x,2.25,1.72,.11,.14,.11,flameMat);const l=new T.PointLight('#ffbf79',3,5,1.8);l.position.set(x,2.25,1.95);scene.add(l);}
 // Guest models are independent of staff and selected by the actual segment.
 const pool=new Map(),byId=new Map();
 function actor(kind,id){let a=byId.get(id);if(a&&a.kind===kind)return a;if(a){a.root.visible=false;byId.delete(id);}let list=pool.get(kind);if(!list)pool.set(kind,list=[]);a=list.find(o=>!o.used&&!byId.has(o.id));if(!a){const staff=['chef','helper','helper2','waiter','waiter2'].includes(kind),m=staff?makeChefY2(T,rounded,kind==='chef'):guestFactory.create(kind);scene.add(m.root);m.root.scale.setScalar(kind==='chef'?.84:staff?.84:1.24);a={...m,kind};if(staff&&kind!=='chef'){m.root.traverse(o=>{if(o.isMesh&&o.material?.color?.getHexString()==='417b91'){o.material=o.material.clone();o.material.color.set(kind==='waiter'?'#708d62':kind==='helper'?'#d27a46':'#517d85');}});}a.dish=plate(staff?m.rig.body:m.root,0,.59,.30);if(staff)a.serviceRig=createServiceRig(T,m,rounded);list.push(a);}a.id=id;a.last=null;a.facing=null;byId.set(id,a);return a;}
 const tmp=new T.Vector3();let lastW=0,lastH=0;
 function project(x,z,y,w,h){tmp.set(wx(x),y,wz(z)).project(camera);return {x:(tmp.x+1)*w/2,y:(1-tmp.y)*h/2};}
 function label(c,p,txt,w,h){if(!txt)return;c.font='bold 11px system-ui';const width=Math.min(w-12,c.measureText(txt).width+12),x=clamp(p.x-width/2,6,w-width-6),y=clamp(p.y-16,5,h-23);c.fillStyle='#2d3029e8';c.beginPath();c.roundRect(x,y,width,19,5);c.fill();c.fillStyle='#fff0ce';c.textAlign='center';c.textBaseline='middle';c.fillText(txt,x+width/2,y+9.5,width-8);}
 return {element,draw(canvas,s,t,w,h,actors){
  const parent=canvas.parentElement;if(!parent)return;if(element.parentElement!==parent)parent.insertBefore(element,canvas);
  const dpr=Math.min(devicePixelRatio||1,1.5),rw=Math.round(w*dpr),rh=Math.round(h*dpr);
  if(rw!==lastW||rh!==lastH){renderer.setSize(rw,rh,false);const aspect=w/h,half=Math.max(5.65/aspect,8.35);camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();lastW=rw;lastH=rh;}
  const layout=y2Layout(s),v=s.service,guide=dinerGuide(s);pass.position.set(wx(layout.floor.passFurniture.x),0,wz(layout.floor.passFurniture.y));guideMark.visible=!!guide?.target;if(guide?.target){guideMark.position.set(wx(guide.target.x),0,wz(guide.target.y));arrow.position.y=.55+Math.sin(t*4)*.085;markerMat.color.set(guide.mode==='serve'?'#b8f1ac':'#ffdf8b');}alcoves.forEach((a,i)=>a.visible=layout.tables.length>=i+3);
  let mealCount=0,foodPieces=0;const mealKinds=new Set();
  for(let i=0;i<tables.length;i++){const item=tables[i],p=layout.tables[i];item.p.visible=!!p;if(p){item.p.position.set(wx(p.x),0,wz(p.z));for(let j=0;j<2;j++){const order=v?.orders?.find(o=>o.tableId===i&&(o.seatId??0)===j&&['eating','review'].includes(o.status));item.meals[j].visible=!!order;if(order){const stats=item.meals[j].userData.setDish(order.recipeId,mealLife(order,t,DINER_TIMING.eat).portion);mealCount++;foodPieces+=stats.count;mealKinds.add(stats.kind);}}}}
  for(let i=0;i<3;i++){const item=stoves[i],p=layout.stoves[i],busy=v?.stations?.[p.id];item.p.position.set(wx(p.x),0,wz(p.z));const type=p.unlocked?(item.vessels[p.type]?p.type:'WOK'):'LOCKED';for(const [k,g] of Object.entries(item.vessels))g.visible=k===type;item.flames.forEach((f,j)=>{f.visible=p.unlocked&&(!v||!!busy);f.scale.y=.07+.035*Math.sin(t*8+j);});item.wisps.forEach((o,j)=>{const q=(t*.55+j*.25)%1;o.visible=p.unlocked&&!!busy;o.position.set(Math.sin(q*5+j)*.14,1.18+q*.75,Math.cos(q*4+j)*.09);o.scale.set(.08+q*.11,.12+q*.15,.08+q*.11);});}
  const ready=v?.orders?.filter(o=>o.status==='pickup')||[];passPlates.forEach((p,i)=>{p.visible=!!ready[i];if(ready[i])p.userData.setDish(ready[i].recipeId);});
  const ids=new Set(actors.map(a=>a.id));for(const [id,a] of byId)if(!ids.has(id)){a.root.visible=false;byId.delete(id);}
  for(const list of pool.values())for(const a of list)a.used=false;
  const guestModes=new Set(),guestSpecies=new Set();let eatCount=0,reviewCount=0;
  for(const a of actors){const m=actor(a.kind,a.id);m.used=true;m.root.visible=true;let direction=a.direction==='up'?'back':a.direction==='down'?'front':a.direction;if(!direction&&m.last){const dx=a.x-m.last.x,dz=a.y-m.last.y;if(Math.hypot(dx,dz)>.0004)direction=Math.abs(dx)>Math.abs(dz)?dx<0?'left':'right':dz<0?'back':'front';}if(a.seat&&a.order)direction=(a.order.seatId??0)===0?'right':'left';m.facing=direction||m.facing||'front';m.last={x:a.x,y:a.y};m.root.position.set(wx(a.x),a.seat?.37:0,wz(a.y));if(a.order&&a.order.status==='entering'&&t-(a.order.doorAt??t)<.55){const q=clamp((t-(a.order.doorAt??t))/.55,0,1);m.root.position.z+=(1-q)*1.1;}const action=dinerAction(a,layout,v);m.dish.visible=action.mode==='carry';if(a.plate)m.dish.userData.setDish(a.plateRecipeId);const life=m.update(t,{id:a.id,order:a.order,waiting:!!a.waiting,facing:m.facing,moving:!!a.walk,working:action.mode==='cook',carrying:action.mode==='carry',seated:!!a.seat,eating:a.order?.status==='eating',review:a.order?.status==='review'});if(a.order&&life){guestModes.add(life.mode);guestSpecies.add(a.kind);if(life.mode==='eat')eatCount++;if(life.mode==='review')reviewCount++;}if(action.mode==='cook'){const st=action.station,dx=wx(st.x-a.x),dz=wz(st.z-a.y);m.root.rotation.y=Math.atan2(dx,dz);}const target=action.mode==='cook'?new T.Vector3(wx(action.station.x),({WOK:.95,POT:1.17,GRILL:1.07,STEAM:1.19})[action.type]||.95,wz(action.station.z)+.15):null;m.serviceRig?.update(action,t,!!a.walk,m.dish,target,a.kind,a.level||1);}
  hemi.intensity=v?1.65:1.9;sun.intensity=v?2.2:3.1;camera.updateMatrixWorld(true);renderer.render(scene,camera);
  const c=canvas.getContext('2d');c.clearRect(0,0,w,h);
  if(!v){const section=parent.closest('.v016-scene');if(section){
   const anchors={stock:[.155,1.73/12,1.72],book:[.83,1.6/12,1.63],bento:[.245,.408,1.15],crew:[.755,.408,1.18],door:[.50,.93,.05]};
   for(const [key,[x,z,y]] of Object.entries(anchors)){const el=section.querySelector('.v016-'+key);if(!el)continue;const pt=project(x,z,y,w,h),q=y2bHotspotPosition(pt.x,pt.y,w,h);el.style.left=q.x+'px';el.style.top=q.y+'px';el.style.bottom='auto';el.style.transform='translate(-50%,-50%)';el.dataset.y2bAnchor='1';}
  }}else resetHotspots();
  const guestCues=selectDiningSpeech(v?.orders||[],t,2),staffCue=selectStaffSpeech(s,t,guestCues),home=!v?homeKitchenChatter(s,t,globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false):null;
  for(const a of actors){const p=project(a.x,a.y,a.seat?1.86:1.45,w,h),cue=guestCues.find(q=>q.id===a.id),o=a.order;const txt=(o&&activeOrders.has(o.status)?(RECIPES[o.recipeId]?.name||'点餐')+(o.status==='pickup'?' · 待上菜':''):o?.status==='review'?o.sat>=70?'满意':'评价中':null)||cue?.text||(staffCue?.staffRole===a.id?staffCue.text:null)||(home?.actor===a.id?home.text:null)||(a.working?'烹饪中':a.plate?'送餐中':null);if(txt)label(c,p,txt,w,h);
   // No screen-space foot ring. Depth-tested marker belongs to the actual destination.
  }
  for(const p of layout.stoves){const job=v?.stations?.[p.id];if(job)label(c,project(p.x,p.z,1.6,w,h),Math.ceil(job.left)+'s',w,h);}if(guide?.target)label(c,project(guide.target.x,guide.target.y,.82,w,h),guide.mode==='serve'?(guide.table+1)+'号桌 · 上菜':'取餐',w,h);
  const waiting=dinerQueueGuests(s,v?.time||0).length;label(c,project(.5,1.115,.35,w,h),'等位 '+waiting,w,h);element.dataset.lifeVersion='y6';element.dataset.guestModes=[...guestModes].join(',');element.dataset.guestSpecies=[...guestSpecies].join(',');element.dataset.eatingCount=String(eatCount);element.dataset.reviewCount=String(reviewCount);element.dataset.mealCount=String(mealCount);element.dataset.foodPieces=String(foodPieces);element.dataset.mealKinds=[...mealKinds].join(',');element.dataset.guestCount=String(actors.filter(a=>a.order&&!a.waiting).length);element.dataset.visibleGuestCount=String(actors.filter(a=>{if(!a.order||a.waiting)return false;const m=byId.get(a.id);if(!m?.root.visible)return false;const pt=tmp.set(m.root.position.x,m.root.position.y+.65,m.root.position.z).project(camera);return Math.abs(pt.x)<1&&Math.abs(pt.y)<1&&Math.abs(pt.z)<1;}).length);element.dataset.queueCount=String(waiting);element.dataset.tableCount=String(layout.tables.length);element.dataset.phase=s.phase;element.dataset.orderCount=String(v?.orders?.length||0);element.dataset.serviceTime=String(v?.time||0);element.dataset.guide=guide?.mode||'';element.dataset.guideTable=String(guide?.table??'');if(v&&Number(element.dataset.guestCount)>0&&Number(element.dataset.visibleGuestCount)===0){console.warn('Y4d guest projection',JSON.stringify(actors.filter(a=>a.order).map(a=>({id:a.id,x:a.x,y:a.y,status:a.order.status,waiting:a.waiting}))));throw Error('All live guests outside projection; fallback to original diner');}
  document.documentElement.dataset.oddpot3d='active';
 },dispose(){disposed=true;element.remove();const gs=new Set(),ms=new Set();scene.traverse(o=>{if(o.geometry)gs.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])ms.add(m);});for(const g of gs)g.dispose();for(const m of ms)m.dispose();renderer.dispose();renderer.forceContextLoss();}};
}
