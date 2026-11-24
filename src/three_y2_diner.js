// Y2a read-only 3D renderer. Original game remains the only simulation.
import {dinerFloor} from './restaurant_scene_v075.js';
import {RECIPES,CUSTOMERS} from './data.js';
import {selectDiningSpeech,selectStaffSpeech} from './diner_ambience_v077.js';
import {homeKitchenChatter} from './home_kitchen_v013j.js';
import {roundedFactory} from './three_y1_models.js?v=y1';
import {makeChefY2} from './three_y2b_chef.js?v=y3d';
import {dinerAction,dishStyle,createServiceRig} from './three_y4a_service.js?v=y4a';

export function y2Eligible(s){return s?.activeWorld!=='cloud'&&(s?.phase==='forecast'&&!s.service||s?.phase==='service'&&!!s.service?.walkable);}
export function y2Layout(s){
 const g=dinerFloor(s),v=s.service,slots=v?.kitchenSnapshot||s.kitchen?.slots||[];
 const n=v?v.kitchenSnapshot?.length||2:s.kitchen?.thirdUnlocked?3:2;
 return {tables:g.tables.map((p,i)=>({id:i,x:p.x,z:p.y})),stoves:[g.stoveLeft,g.stoveRight,g.reservedStove].map((p,i)=>({id:['WOK','POT','CENTER'][i],x:p.x,z:p.y,unlocked:i<n,type:slots[i]?.type||(i===1?'POT':'WOK'),level:slots[i]?.level||1})),floor:g};
}
const wx=x=>x*10,wz=z=>z*12;
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const activeOrders=new Set(['queued','cooking','pickup','carried','delivering','flying','ordering']);
let disabled=false,instance=null,pending=null;
const y2bHotspots=['stock','book','bento','crew','door'];
export function y2bHotspotPosition(x,y,w,h){return {x:clamp(x,Math.min(36,w/2),Math.max(w-36,w/2)),y:clamp(y,Math.min(24,h/2),Math.max(h-24,h/2))};}
function resetHotspots(){for(const k of y2bHotspots)for(const el of document.querySelectorAll('.v016-'+k+'[data-y2b-anchor]')){el.style.removeProperty('left');el.style.removeProperty('top');el.style.removeProperty('bottom');el.style.removeProperty('transform');delete el.dataset.y2bAnchor;}}
function fail(error){disabled=true;resetHotspots();instance?.element.remove();instance=null;console.warn('Oddpot 3D fallback',error);document.documentElement.dataset.oddpot3d='fallback';}
export function enableY2(){
 document.documentElement.dataset.oddpot3d='loading';
 globalThis.__oddpotY2Renderer={draw(canvas,s,t,w,h,actorsFn){
  if(!y2Eligible(s)||disabled){resetHotspots();instance?.element.remove();return false;}
  if(!instance){if(!pending)pending=import('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js').then(T=>{instance=createDiner(T);document.documentElement.dataset.oddpot3d='ready';}).catch(fail);return false;}
  try{instance.draw(canvas,s,t,w,h,actorsFn(s,t));return true;}catch(e){fail(e);return false;}
 }};
}
function createDiner(T){
 const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
 const element=renderer.domElement;Object.assign(element.style,{position:'absolute',inset:'0',width:'100%',height:'100%',zIndex:'0',pointerEvents:'none'});
 element.setAttribute('aria-hidden','true');element.addEventListener('webglcontextlost',e=>{e.preventDefault();fail(new Error('WebGL context lost'));});
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
 const scene=new T.Scene();scene.background=new T.Color('#343b36');
 const camera=new T.OrthographicCamera(-6,6,7,-7,.1,60);camera.position.set(5,17,22);camera.lookAt(5,0,6.5);
 const rounded=roundedFactory(T),mat=(color,roughness=.85,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
 const wood=mat('#9a6846'),top=mat('#c99a65'),dark=mat('#59402f'),mortar=mat('#625951'),stone=mat('#898477'),brass=mat('#c6a16a',.45,.4),iron=mat('#485c58',.5,.4),cream=mat('#eddbb6'),teal=mat('#557b70'),red=mat('#b55e4d'),green=mat('#728e57'),blue=mat('#628a9b'),violet=mat('#ad92c2');
 const sphere=new T.SphereGeometry(1,16,12),boxCache=new Map(),cylCache=new Map();
 function mesh(p,g,m,x,y,z){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;p.add(o);return o;}
 function group(p,x=0,y=0,z=0){const o=new T.Group();o.position.set(x,y,z);p.add(o);return o;}
 function box(p,x,y,z,w,h,d,m,soft=0){const k=[w,h,d].join(':');if(!boxCache.has(k))boxCache.set(k,new T.BoxGeometry(w,h,d));return mesh(p,soft?rounded(w,h,d,soft):boxCache.get(k),m,x,y,z);}
 function cyl(p,x,y,z,a,b,h,m,n=20){const k=[a,b,h,n].join(':');if(!cylCache.has(k))cylCache.set(k,new T.CylinderGeometry(a,b,h,n));return mesh(p,cylCache.get(k),m,x,y,z);}
 function ball(p,x,y,z,a,b,c,m){const o=mesh(p,sphere,m,x,y,z);o.scale.set(a,b,c);return o;}
 function plate(p,x,y,z){const o=group(p,x,y,z),base=cyl(o,0,0,0,.22,.20,.055,cream),food=group(o),sets={};
  for(const kind of ['soup','skewer','steam','stir'])sets[kind]=group(food);
  const soup=sets.soup;cyl(soup,0,.065,0,.19,.135,.13,cream);const broth=cyl(soup,0,.135,0,.167,.167,.015,brass);const soupBits=[];
  for(let i=0;i<4;i++)soupBits.push(ball(soup,Math.cos(i*1.57)*.075,.15,Math.sin(i*1.57)*.075,.037,.024,.04,green));
  const skewer=sets.skewer,skewerBits=[];for(const x of [-.075,.075]){box(skewer,x,.045,0,.022,.025,.35,dark,.008);for(let j=0;j<4;j++)skewerBits.push(box(skewer,x,.086,-.11+j*.065,.09,.07,.062,red,.018));}
  const steam=sets.steam,steamBits=[];for(let j=0;j<5;j++)steamBits.push(ball(steam,Math.cos(j*2.4)*.085,.09,Math.sin(j*2.4)*.085,.065,.055,.065,cream));
  const stir=sets.stir,stirBits=[];for(let j=0;j<6;j++)stirBits.push(box(stir,Math.cos(j*2.4)*.10,.075,Math.sin(j*2.4)*.10,.085,.065,.07,green,.018));
  o.userData.setDish=(recipeId,portion=1)=>{const s=dishStyle(RECIPES[recipeId]);for(const [k,g] of Object.entries(sets))g.visible=k===s.kind;base.visible=s.kind!=='soup';broth.visible=portion>0;const protein=s.protein==='beef'?red:s.protein==='chicken'?brass:green;for(const [j,m] of [...soupBits,...skewerBits,...steamBits,...stirBits].entries()){m.material=j%3===0?(s.spicy?red:s.greens?green:cream):protein;m.visible=(j%4)/4<portion;}};
  o.userData.setDish(null);return o;}
 // Real 10x12 floor: same x/z normalization for all furniture and actors.
 box(scene,5,-.22,6.5,10.45,.44,10.8,mortar,.1);
 const woods=['#a67650','#b18157','#9b6c47','#b68a60'].map(c=>mat(c));
 for(let j=0;j<18;j++)for(let i=0;i<7;i++){const a=Math.max(0,i*1.6-(j%2)*.8),b=Math.min(10,i*1.6-(j%2)*.8+1.6);if(b>a+.025)box(scene,(a+b)/2,.02,1.35+j*.58,b-a-.018,.035,.56,woods[(i+j*3)%4]);}
 for(let j=0;j<5;j++)for(let i=0;i<14;i++)box(scene,i*.714+.357,.05,1.6+j*.66,.69,.04,.64,stone);
 box(scene,5,1.52,1.20,10.35,3.04,.35,mortar);
 for(let j=0;j<7;j++)for(let i=0;i<15;i++){let x=i*.67+.33;if(x<4.12||x>5.9||j<2||j>5)box(scene,x,j*.43+.21,1.40,.64,.40,.14,stone);}
 for(const x of [0,10]){box(scene,x,1.52,1.4,.25,3.04,.45,dark,.03);box(scene,x,.19,6.6,.28,.38,10.35,stone,.04);}
 box(scene,5,3.05,1.30,10.45,.22,.44,wood,.04);
 box(scene,5,1.78,1.48,1.78,1.48,.10,mat('#8ab7b5'));for(const x of [4.09,5,5.91])box(scene,x,1.78,1.56,.11,1.60,.14,dark,.02);for(const y of [1.0,1.78,2.56])box(scene,5,y,1.56,1.9,.13,.17,dark,.025);box(scene,5,.92,1.62,2,.12,.42,top,.03);
 for(const x of [3.4,6.6]){box(scene,x,1.53,1.48,.15,2.95,.28,wood,.03);}
 const pantry=group(scene,1.55,0,1.73);box(pantry,0,1.03,0,1.8,2.06,.52,dark,.04);for(let j=0;j<3;j++){box(pantry,0,.56+j*.56,.12,1.77,.085,.62,top,.025);for(let i=0;i<5;i++){const x=-.66+i*.33;cyl(pantry,x,.72+j*.56,.18,.11,.13,.24,[red,green,brass][(i+j)%3]);cyl(pantry,x,.86+j*.56,.18,.105,.105,.05,cream);}}
 const ledger=group(scene,8.3,1.6,1.6);box(ledger,0,0,0,1.12,.82,.13,dark,.035);box(ledger,0,0,.075,.93,.62,.035,cream,.02);for(let i=0;i<4;i++)box(ledger,0,.18-i*.115,.103,.65-i%2*.12,.025,.02,wood);
 for(const [a,b] of [[.075,.390],[.610,.925]]){const x=wx((a+b)/2),w=wx(b-a),z=wz(.408);box(scene,x,.43,z,w,.86,.48,wood,.04);box(scene,x,.91,z,w+.09,.16,.57,top,.04);for(let i=0;i<3;i++){const xx=x+(i-1)*w/3;box(scene,xx,.43,z+.25,w/3-.08,.64,.04,dark,.02);box(scene,xx,.43,z+.28,w/3-.18,.52,.03,wood,.02);box(scene,xx+.18,.56,z+.31,.09,.05,.04,brass,.015);}for(let j=0;j<3;j++)cyl(scene,x-.55+j*.22,1.10,z,.085,.10,.22,[red,green,brass][j]);}
 // The existing action buttons point at these real display props.
 const lunch=group(scene,2.45,1.02,wz(.408));box(lunch,0,.10,0,.58,.20,.37,wood,.035);box(lunch,0,.23,0,.62,.085,.41,top,.025);box(lunch,0,.16,0,.08,.26,.43,red,.015);
 const roster=group(scene,7.55,1.0,wz(.408));box(roster,0,.17,0,.47,.34,.13,dark,.025);box(roster,0,.17,.076,.40,.27,.025,cream,.015);for(let i=0;i<3;i++)box(roster,0,.24-i*.075,.095,.27,.018,.015,wood);
 const pass=group(scene,5,0,wz(.397));box(pass,0,.39,0,1.13,.78,.35,wood,.04);box(pass,0,.83,0,1.22,.14,.42,top,.04);const passPlates=[-1,0,1].map(i=>plate(pass,i*.32,.94,0));
 box(scene,5,.045,10.65,1.7,.035,1.45,cream,.02);box(scene,5,.067,10.65,1.55,.02,1.30,teal,.02);
 for(const x of [.85,9.15]){cyl(scene,x,.26,10.36,.22,.16,.48,wood);for(let i=0;i<5;i++)ball(scene,x+Math.cos(i*2.4)*.15,.62+Math.sin(i)*.07,10.36+Math.sin(i*2.4)*.12,.15,.25,.13,green);}
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
 // Stable reusable actors. Staff use the Y1 chef model, guests have species silhouettes.
 function makeGuest(kind){const root=group(scene),body=group(root),legs=[];let m=kind==='family'?red:kind==='critic'?violet:kind==='gardener'?green:blue;
  if(!['regular','critic'].includes(kind))for(const k of [-1,1]){const leg=group(body,k*.12,.27,0);ball(leg,wood,0,-.12,.04,.12,.13,.15);legs.push(leg);}
  if(kind==='regular'){ball(body,teal,0,.34,0,.43,.34,.36);ball(body,green,-.16,.55,.18,.12,.09,.08);ball(body,teal,.29,.28,0,.18,.16,.22);}
  else if(kind==='critic'){mesh(body,new T.LatheGeometry([[0,0],[.10,.02],[.30,.18],[.32,.46],[.24,.74],[0,.83]].map(a=>new T.Vector2(...a)),24),violet,0,.18,0);ball(body,cream,0,.91,.035,.26,.24,.24);for(const k of [-1,1])ball(body,violet,k*.29,.57,.04,.14,.085,.12);}
  else{ball(body,m,0,.48,0,.26,.27,.21);ball(body,cream,0,.86,.03,.26,.24,.23);
   if(kind==='family'){ball(body,red,0,1.07,0,.39,.18,.36);for(let i=0;i<4;i++)ball(body,cream,Math.cos(i*1.6)*.23,1.18,Math.sin(i*1.6)*.21,.07,.025,.07);}
   else if(kind==='adventurer'){ball(body,iron,0,1.01,0,.29,.16,.26);ball(body,wood,0,.69,.20,.22,.20,.14);for(const k of [-1,1]){ball(body,wood,k*.085,.55,.23,.07,.13,.075);ball(body,brass,k*.085,.48,.28,.045,.04,.03);}box(body,brass,0,1.03,.255,.07,.20,.035,.018);}
   else if(kind==='gardener'){for(const k of [-1,1]){box(body,k*.20,1.17,0,.055,.34,.06,wood,.02).rotation.z=k*.32;ball(body,green,k*.24,1.22,.02,.09,.12,.06);}}
   else{cyl(body,0,1.09,0,.035,.30,.45,blue);ball(body,brass,.17,1.08,.2,.05,.05,.04);}
  }
  const ey=kind==='regular'?.43:kind==='critic'?.92:.88;for(const k of [-1,1])ball(body,dark,k*.09,ey,.25,.029,.037,.017);
  const hands=[],elbows=[],utensils=[];if(!['regular','critic'].includes(kind))for(const k of [-1,1]){const arm=group(body,k*.25,.57,.04);ball(arm,m,0,-.055,0,.08,.095,.08);const elbow=group(arm,0,-.11,0);ball(elbow,m,0,-.035,0,.065,.075,.065);ball(elbow,cream,0,-.10,.02,.07,.07,.07);const utensil=group(elbow,0,-.10,.02);box(utensil,brass,0,0,.085,.025,.025,.18,.006);ball(utensil,cream,0,0,.17,.037,.022,.048);hands.push(arm);elbows.push(elbow);utensils.push(utensil);}return {root,update(t,s){for(let i=0;i<legs.length;i++)legs[i].rotation.x=s.seated?-1.15:s.moving?Math.sin(t*10+i*Math.PI)*.36:0;for(let i=0;i<hands.length;i++){const bite=(1+Math.sin(t*3.4+i*1.5))/2;hands[i].rotation.x=s.eating?-.65-bite*.52:s.seated?-.25:s.moving?Math.sin(t*10+i*Math.PI)*.23:0;elbows[i].rotation.x=s.eating?-.40-bite*.85:0;utensils[i].visible=s.eating&&i===0;}body.position.y=kind==='critic'?.10+Math.sin(t*2.4)*.04:s.moving?Math.abs(Math.sin(t*10))*.025:0;body.rotation.x=s.eating?.07+Math.sin(t*4)*.04:s.review?Math.sin(t*4)*.04:0;if(kind==='regular'){body.scale.y=1+(s.eating?.10:s.moving?.10:.035)*Math.sin(t*(s.eating?4:s.moving?8:2));body.scale.x=1-(body.scale.y-1)*.45;}root.rotation.y={front:0,right:Math.PI/2,back:Math.PI,left:-Math.PI/2}[s.facing]||0;}};
 }
 const pool=new Map(),byId=new Map();
 function actor(kind,id){let a=byId.get(id);if(a&&a.kind===kind)return a;if(a){a.root.visible=false;byId.delete(id);}let list=pool.get(kind);if(!list)pool.set(kind,list=[]);a=list.find(o=>!o.used&&!byId.has(o.id));if(!a){const staff=['chef','helper','helper2','waiter','waiter2'].includes(kind),m=staff?makeChefY2(T,rounded,kind==='chef'):makeGuest(kind);scene.add(m.root);m.root.scale.setScalar(kind==='chef'?.84:staff?.70:.76);a={...m,kind};if(staff&&kind!=='chef'){m.root.traverse(o=>{if(o.isMesh&&o.material?.color?.getHexString()==='417b91'){o.material=o.material.clone();o.material.color.set(kind==='waiter'?'#708d62':kind==='helper'?'#d27a46':'#517d85');}});}a.dish=plate(staff?m.rig.body:m.root,0,.59,.30);if(staff)a.serviceRig=createServiceRig(T,m,rounded);list.push(a);}a.id=id;byId.set(id,a);return a;}
 const tmp=new T.Vector3();let lastW=0,lastH=0;
 function project(x,z,y,w,h){tmp.set(wx(x),y,wz(z)).project(camera);return {x:(tmp.x+1)*w/2,y:(1-tmp.y)*h/2};}
 function label(c,p,txt,w,h){if(!txt)return;c.font='bold 11px system-ui';const width=Math.min(w-12,c.measureText(txt).width+12),x=clamp(p.x-width/2,6,w-width-6),y=clamp(p.y-16,5,h-23);c.fillStyle='#2d3029e8';c.beginPath();c.roundRect(x,y,width,19,5);c.fill();c.fillStyle='#fff0ce';c.textAlign='center';c.textBaseline='middle';c.fillText(txt,x+width/2,y+9.5,width-8);}
 return {element,draw(canvas,s,t,w,h,actors){
  const parent=canvas.parentElement;if(!parent)return;if(element.parentElement!==parent)parent.insertBefore(element,canvas);
  const dpr=Math.min(devicePixelRatio||1,1.5),rw=Math.round(w*dpr),rh=Math.round(h*dpr);
  if(rw!==lastW||rh!==lastH){renderer.setSize(rw,rh,false);const aspect=w/h,half=Math.max(5.5/aspect,5.9);camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();lastW=rw;lastH=rh;}
  const layout=y2Layout(s),v=s.service;
  for(let i=0;i<tables.length;i++){const item=tables[i],p=layout.tables[i];item.p.visible=!!p;if(p){item.p.position.set(wx(p.x),0,wz(p.z));for(let j=0;j<2;j++){const order=v?.orders?.find(o=>o.tableId===i&&(o.seatId??0)===j&&['eating','review'].includes(o.status));item.meals[j].visible=!!order;if(order)item.meals[j].userData.setDish(order.recipeId,order.status==='review'?0:1);}}}
  for(let i=0;i<3;i++){const item=stoves[i],p=layout.stoves[i],busy=v?.stations?.[p.id];item.p.position.set(wx(p.x),0,wz(p.z));const type=p.unlocked?(item.vessels[p.type]?p.type:'WOK'):'LOCKED';for(const [k,g] of Object.entries(item.vessels))g.visible=k===type;item.flames.forEach((f,j)=>{f.visible=p.unlocked&&(!v||!!busy);f.scale.y=.07+.035*Math.sin(t*8+j);});item.wisps.forEach((o,j)=>{const q=(t*.55+j*.25)%1;o.visible=p.unlocked&&!!busy;o.position.set(Math.sin(q*5+j)*.14,1.18+q*.75,Math.cos(q*4+j)*.09);o.scale.set(.08+q*.11,.12+q*.15,.08+q*.11);});}
  const ready=v?.orders?.filter(o=>o.status==='pickup')||[];passPlates.forEach((p,i)=>{p.visible=!!ready[i];if(ready[i])p.userData.setDish(ready[i].recipeId);});
  const ids=new Set(actors.map(a=>a.id));for(const [id,a] of byId)if(!ids.has(id)){a.root.visible=false;byId.delete(id);}
  for(const list of pool.values())for(const a of list)a.used=false;
  for(const a of actors){const m=actor(a.kind,a.id);m.used=true;m.root.visible=true;let direction=a.direction==='up'?'back':a.direction==='down'?'front':a.direction;if(!direction&&m.last){const dx=a.x-m.last.x,dz=a.y-m.last.y;if(Math.hypot(dx,dz)>.0004)direction=Math.abs(dx)>Math.abs(dz)?dx<0?'left':'right':dz<0?'back':'front';}if(a.seat&&a.order)direction=(a.order.seatId??0)===0?'right':'left';m.facing=direction||m.facing||'front';m.last={x:a.x,y:a.y};m.root.position.set(wx(a.x),a.seat?.19:0,wz(a.y));const action=dinerAction(a,layout,v);m.dish.visible=action.mode==='carry';if(a.plate)m.dish.userData.setDish(a.plateRecipeId);m.update(t,{facing:m.facing,moving:!!a.walk,working:action.mode==='cook',carrying:action.mode==='carry',seated:!!a.seat,eating:a.order?.status==='eating',review:a.order?.status==='review'});if(action.mode==='cook'){const st=action.station,dx=wx(st.x-a.x),dz=wz(st.z-a.y);m.root.rotation.y=Math.atan2(dx,dz);}m.serviceRig?.update(action,t,!!a.walk,m.dish);}
  hemi.intensity=v?1.05:1.9;sun.intensity=v?1.65:3.1;renderer.render(scene,camera);
  const c=canvas.getContext('2d');c.clearRect(0,0,w,h);
  if(!v){const section=parent.closest('.v016-scene');if(section){
   const anchors={stock:[.155,1.73/12,1.72],book:[.83,1.6/12,1.63],bento:[.245,.408,1.15],crew:[.755,.408,1.18],door:[.50,.93,.05]};
   for(const [key,[x,z,y]] of Object.entries(anchors)){const el=section.querySelector('.v016-'+key);if(!el)continue;const pt=project(x,z,y,w,h),q=y2bHotspotPosition(pt.x,pt.y,w,h);el.style.left=q.x+'px';el.style.top=q.y+'px';el.style.bottom='auto';el.style.transform='translate(-50%,-50%)';el.dataset.y2bAnchor='1';}
  }}else resetHotspots();
  const guestCues=selectDiningSpeech(v?.orders||[],t,2),staffCue=selectStaffSpeech(s,t,guestCues),home=!v?homeKitchenChatter(s,t,globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false):null;
  for(const a of actors){const p=project(a.x,a.y,1.45,w,h),cue=guestCues.find(q=>q.id===a.id),o=a.order;const txt=cue?.text||(staffCue?.staffRole===a.id?staffCue.text:null)||(home?.actor===a.id?home.text:null)||(o&&activeOrders.has(o.status)?RECIPES[o.recipeId]?.emoji||'🍽':o?.status==='review'?o.sat>=70?'💚':'💬':a.working?'🍳':a.plate?'🍽':null);if(txt)label(c,p,txt,w,h);
   if(a.id==='hero'){const base=project(a.x,a.y,.05,w,h),hero=v?.hero;c.strokeStyle='#f1d59b';c.lineWidth=2;c.beginPath();c.ellipse(base.x,base.y,9,4,0,0,Math.PI*2);c.stroke();if(hero?.dwellZone&&hero.dwell>0){c.beginPath();c.arc(base.x,base.y,11,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.min(1,hero.dwell/(hero.dwellZone.startsWith('serve:')?.48:.36)));c.stroke();}}
  }
  for(const p of layout.stoves){const job=v?.stations?.[p.id];if(job)label(c,project(p.x,p.z,1.6,w,h),Math.ceil(job.left)+'s',w,h);}
  document.documentElement.dataset.oddpot3d='active';
 }};
}
