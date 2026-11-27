import {automaticGrillState} from './grill_cooking_v014b.js?v=cb2r1c';
import {createRecovery,sharedThree,visibleHost} from './three_y6a_recovery.js?v=y6a';
// Y4b read-only research presentation. All adjudication remains in the engine.
import {roundedFactory} from './three_y1_models.js?v=y1';
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const durations={flip:1.15,toss:.88,gentle:1.35,reduce:1.55,seal:.65,vent:.9,turn:.65,brush:.85,smoke:1.6};
export function researchFrame(c,preview){
 if(!c||!['v063-live','v014c-grill'].includes(c.mode))return null;
 const grill=c.mode==='v014c-grill',type=grill?'GRILL':c.vessel,t=Math.max(0,c.elapsed||0),actions=c.actions||[];
 const latest=[...actions].reverse().find(a=>t>=a.t&&t-a.t<(durations[a.type]||0));
 const p=latest?clamp((t-latest.t)/durations[latest.type]):1,beat=Math.sin(p*Math.PI);
 const raw=grill?(c.skewer||[]).map((id,index)=>({id,index,t:0})):c.dropped||[];
 const items=raw.map((d,i)=>{const h=(grill?preview?.items:preview?.indicators)?.find(h=>h.id===d.id),age=Math.max(0,t-(d.t||0)),applies=latest?.with?.includes(d.id);
 let x=0,z=0,y=0,rot=0;
 if(grill){x=(i-(raw.length-1)/2)*.62;z=c.lane?({edge:.62,middle:0,flame:-.62}[c.lane]||0):.94;y=.04;}
 else{let angle=i*2.39996+t*(type==='POT'?.45:.72);if(applies&&['flip','gentle'].includes(latest.type))angle+=p*4.8;const radius=.41+i*.18;x=Math.cos(angle)*radius;z=Math.sin(angle)*radius*.84;
 if(applies&&latest.type==='toss'){y+=beat*.93;rot=p*Math.PI*2;}if(age<.52)y+=(1-clamp(age/.52))**2*1.18;
 }
 return {id:d.id,x,y,z,rot,tone:h?.tone||'idle',progress:h?.progress??Math.min(h?.frontProgress||0,h?.backProgress||0)};
 });
 const turns=actions.filter(a=>a.type==='turn'),lastTurn=turns.at(-1),turned=turns.length>0;
 const auto=grill&&c.cbTiming&&c.lane?automaticGrillState(t):null;
 const turnAngle=auto?Math.PI*(Math.max(0,auto.turnCount-1)+(auto.turnCount?clamp(auto.sinceTurn/durations.turn):0)):(latest?.type==='turn'?Math.PI*p:turned?Math.PI:0);
 const sealed=c.cbTiming&&type==='STEAM'?raw.length>0:actions.some(a=>a.type==='seal')&&!actions.some(a=>a.type==='vent');
 return {type,t,items,action:latest?.type||null,beat,p,lit:grill?!!c.lane:items.length>0,lane:c.lane||null,
 turn:turnAngle,sealed,vent:latest?.type==='vent'?beat:0,smoke:latest?.type==='smoke'?beat:0,baseOnly:!!c.cbTiming,
 reduction:actions.some(a=>a.type==='reduce')?.66:1,tilt:latest?.type==='toss'?Math.sin(p*Math.PI*2)*.19:latest?.type==='flip'?Math.sin(p*Math.PI*3)*.06:0};
}
export function receiptFrame(result){
 if(!result?.events)return null;
 return {type:result.vessel||'WOK',success:!!result.sellable,discovery:!!(result.sellable&&result.firstDiscovery),items:result.events.map((e,i)=>({id:e.id,x:Math.cos(i*2.4)*.52,z:Math.sin(i*2.4)*.44,y:0,rot:0,tone:result.doneness?.find(d=>d.id===e.id)?.label==='焦糊'?'bad':result.doneness?.find(d=>d.id===e.id)?.label==='熟透'?'good':'warming'}))};
}
let instance=null,entered=false,lastAt=-Infinity,lastCook=null,lastHost=null;const recovery=createRecovery();
function state(v){document.documentElement.dataset.oddpotResearch3d=v;}
function release(){lastCook=null;lastHost=null;lastAt=-Infinity;if(instance){const old=instance;instance=null;old.dispose();}}
function leave(){if(!entered&&!instance)return;entered=false;release();recovery.reset();state('idle');}
function fail(e){recovery.fail();release();console.warn('Oddpot research 3D fallback',e);state('fallback');globalThis.__oddpotBuild?.sceneErrors&&(globalThis.__oddpotBuild.sceneErrors.research=String(e));}
export function enableY4b(){
 state('idle');
 globalThis.__oddpotY4bRenderer={leave,retry(){release();recovery.reset();sharedThree.reset();state('idle');},draw(app,s,preview,now){
  if(s.phase!=='research'){leave();return;}
  const cook=s.cook,live=['v063-live','v014c-grill'].includes(cook?.mode),result=!cook&&s.researchReceipt?s.lastCook:null;
  const host=live?app.querySelector(cook.mode==='v014c-grill'?'.v014c-hearth':'.v063-live-pan'):result?app.querySelector('.v063-receipt-head>span'):null;
  if(!host){leave();return;}entered=true;if(!visibleHost(host)||!recovery.canTry())return;
  const lib=sharedThree.value;if(!lib){sharedThree.tryLoad();state(sharedThree.exhausted?'fallback':'loading');return;}
  const identity=cook||result,changed=lastCook!==identity||lastHost!==host;if(!changed&&now-lastAt<33)return;lastAt=now;lastCook=identity;lastHost=host;
  const frame=live?researchFrame(cook,preview):null,receipt=result?receiptFrame(result):null;if(!frame&&!receipt)return;
  try{if(!instance)instance=makeWorkbench(lib);instance.draw(host,frame,receipt,s.lastCook,now);recovery.success();state('active');}catch(e){fail(e);}
 }};
}
function makeWorkbench(T){
 const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'}),canvas=renderer.domElement;
 renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,1.15));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
 Object.assign(canvas.style,{position:'absolute',inset:'0',width:'100%',height:'100%',pointerEvents:'none',zIndex:'9'});canvas.setAttribute('aria-hidden','true');canvas.dataset.oddpotResearch='3d';
 let disposed=false;canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();if(!disposed)fail(new Error('research WebGL context lost'));});
 const scene=new T.Scene();scene.background=new T.Color('#3e4d3b');const camera=new T.OrthographicCamera(-3,3,2,-2,.1,35);camera.position.set(3.1,5.6,6.4);camera.lookAt(0,.8,0);
 const rounded=roundedFactory(T),geos=new Set(),mats=new Set(),mat=(c,metalness=0)=>{const m=new T.MeshStandardMaterial({color:c,metalness,roughness:metalness?.48:.83});mats.add(m);return m;};
 const wood=mat('#a7784d'),dark=mat('#604733'),iron=mat('#566963',.48),brass=mat('#bd925d',.5),stone=mat('#7b8276'),cream=mat('#eee0b8'),bamboo=mat('#c49a5e'),broth=mat('#bb8747'),coal=mat('#482e27'),ember=mat('#f5a348');ember.emissive.set('#ff7828');ember.emissiveIntensity=1.25;
 const sphere=new T.SphereGeometry(1,18,12);geos.add(sphere);
 function group(p,x=0,y=0,z=0){const g=new T.Group();g.position.set(x,y,z);p.add(g);return g;}
 function mesh(p,g,m,x,y,z){geos.add(g);const o=new T.Mesh(g,m);o.position.set(x,y,z);p.add(o);return o;}
 function box(p,m,x,y,z,w,h,d){return mesh(p,rounded(w,h,d,.045),m,x,y,z);}
 function cyl(p,m,x,y,z,a,b,h,n=32){return mesh(p,new T.CylinderGeometry(a,b,h,n),m,x,y,z);}
 function ball(p,m,x,y,z,a,b,c){const o=mesh(p,sphere,m,x,y,z);o.scale.set(a,b,c);return o;}
 function lathe(p,m,points,x,y,z){return mesh(p,new T.LatheGeometry(points.map(v=>new T.Vector2(...v)),48),m,x,y,z);}
 function ring(p,m,r,t,y){const o=mesh(p,new T.TorusGeometry(r,t,8,48),m,0,y,0);o.rotation.x=Math.PI/2;return o;}
 scene.add(new T.HemisphereLight('#f4e8cd','#65785b',2.2));const sun=new T.DirectionalLight('#ffe1ae',3);sun.position.set(-4,8,3);scene.add(sun);const fill=new T.DirectionalLight('#c0e0dd',.7);fill.position.set(5,3,-3);scene.add(fill);
 const work=group(scene);box(work,dark,0,-.23,0,6.8,.40,4.8);for(let i=0;i<9;i++)box(work,i%2?wood:bamboo,0,.005,-2.13+i*.53,6.75,.07,.51);
 const range=group(work);box(range,stone,0,.24,0,3.55,.48,2.70);box(range,iron,0,.49,0,3.68,.12,2.83);box(range,dark,0,.25,1.365,1.3,.29,.08);
 const fire=group(range);for(let i=0;i<7;i++){const a=i*2.4;ball(fire,coal,Math.sin(a)*.53,.25,1.42+Math.cos(a)*.025,.11,.10,.06);ball(fire,ember,Math.sin(a)*.53,.29,1.46,.065,.12,.035);}
 for(const x of [-1.94,1.94]){const jar=group(work,x,.07,-.83);cyl(jar,cream,0,.24,0,.17,.20,.40);cyl(jar,wood,0,.47,0,.18,.18,.06);box(jar,bamboo,0,.26,.18,.17,.13,.025);}
 const board=group(work,-2.05,.09,.85);box(board,dark,0,0,0,.70,.09,.68);box(board,wood,0,.06,0,.65,.07,.63);
 const cook=group(range,0,.59,0),vessels={};for(const k of ['WOK','POT','GRILL','STEAM'])vessels[k]=group(cook);
 const wok=vessels.WOK;lathe(wok,iron,[[0,0],[.43,.015],[.87,.15],[1.12,.43],[1.15,.50],[1.08,.50],[.82,.22],[.40,.08],[0,.07]],0,0,0);ring(wok,brass,1.115,.026,.49);box(wok,dark,1.43,.39,0,.74,.13,.18);box(wok,brass,1.12,.39,0,.22,.12,.22);
 const pot=vessels.POT;lathe(pot,iron,[[0,0],[.82,0],[.93,.13],[.93,.69],[.88,.73],[.84,.69],[.84,.11],[0,.11]],0,0,0);ring(pot,brass,.90,.035,.71);for(const x of [-1,1])box(pot,brass,x*.99,.54,0,.26,.14,.30);const soup=cyl(pot,broth,0,.53,0,.832,.832,.04);
 const grill=vessels.GRILL;box(grill,iron,0,.12,0,2.93,.29,2.16);for(let i=0;i<12;i++){box(grill,coal,-1.22+(i%6)*.48,.31,-.58+Math.floor(i/6)*1.10,.38,.13,.48);box(grill,ember,-1.22+(i%6)*.48,.38,-.58+Math.floor(i/6)*1.10,.20,.04,.15);}for(let i=0;i<9;i++)box(grill,brass,-1.22+i*.305,.47,0,.055,.06,2.02);
 const steam=vessels.STEAM;for(let j=0;j<2;j++){cyl(steam,bamboo,0,.14+j*.25,0,1.00,1.00,.24);ring(steam,dark,1,.028,.035+j*.25);}cyl(steam,cream,0,.53,0,.94,.94,.045);for(let i=0;i<8;i++)box(steam,dark,0,.56,-.75+i*.21,1.36,.025,.022);
 const lid=group(steam,0,.64,0);lathe(lid,bamboo,[[0,.23],[.4,.21],[.85,.12],[1.02,0],[.99,-.035],[.80,.08],[0,.19]],0,0,0);ring(lid,dark,1,.025,.01);box(lid,dark,0,.27,0,.28,.09,.12);
 const stick=group(cook);box(stick,wood,0,0,0,2.45,.055,.055);box(stick,brass,1.35,0,0,.30,.12,.13);
 const tool=group(cook),toolHandle=box(tool,wood,0,.39,0,.075,.78,.075),toolHead=box(tool,iron,0,-.07,0,.29,.22,.055),ladle=ball(tool,iron,0,-.08,0,.17,.07,.17),brush=box(tool,bamboo,0,-.11,0,.25,.22,.10);
 const foodRoot=group(cook),plateRoot=group(scene);const dish=cyl(plateRoot,cream,0,.10,0,1.40,1.18,.14);ring(plateRoot,brass,1.28,.028,.18);const resultSoup=cyl(plateRoot,broth,0,.21,0,1.09,1.09,.045),resultStick=box(plateRoot,wood,0,.24,0,2.28,.055,.055);
 const reveal=group(scene);const starMat=mat('#f8d98b');starMat.emissive.set('#eeb85e');starMat.emissiveIntensity=.9;
 for(let i=0;i<12;i++){const a=i*2.39996,o=ball(reveal,starMat,Math.cos(a)*1.5,.6+(i%3)*.24,Math.sin(a)*1.15,.035,.075,.035);o.rotation.z=a;}
 const vaporMat=new T.MeshBasicMaterial({color:'#fff0d1',transparent:true,opacity:.23,depthWrite:false});mats.add(vaporMat);const vapor=[];for(let i=0;i<12;i++)vapor.push(ball(cook,vaporMat,0,0,0,.10,.16,.10));
 const sparks=[];for(let i=0;i<10;i++)sparks.push(ball(cook,ember,0,0,0,.035,.055,.035));
 const colors={beef:'#a94738',chicken:'#e4b284',chili:'#c44730',garlic:'#f0dcb4',mushroom:'#9a7ba9',cabbage:'#86ae5c',onion:'#ddad77',potato:'#bd945d',mushroom_heart:'#b68bdc',ember_pepper:'#e96e37',tide_sour_pulp:'#a681b7',starlit_nectar:'#e8bf62',cloud_rice:'#f4e8c7',sky_moss:'#79b9a0',storm_egg:'#d4ddeb',sour_bell:'#99b55e',gale_core:'#91c4d6'};
 const foodPool=new Map();
 function food(id){if(foodPool.has(id))return foodPool.get(id);const root=group(foodRoot),base=mat(colors[id]||'#d8af75'),raw=new T.Color(colors[id]||'#d8af75');
  if(id==='beef'){box(root,base,0,.09,0,.42,.18,.29);box(root,cream,0,.155,.10,.38,.045,.075);}
  else if(id==='chicken'){ball(root,base,-.06,.12,0,.18,.13,.14);cyl(root,cream,.16,.12,0,.037,.037,.20).rotation.z=Math.PI/2;ball(root,cream,.25,.12,.03,.052,.052,.052);}
  else if(id.includes('mushroom')){cyl(root,cream,0,.10,0,.060,.075,.18);ball(root,base,0,.20,0,.20,.105,.18);}
  else if(id==='chili'||id==='ember_pepper'){ball(root,base,0,.105,0,.10,.14,.23).rotation.y=.3;box(root,wood,0,.16,-.23,.055,.055,.11);}
  else if(id==='cabbage'||id==='sky_moss'){for(let i=0;i<5;i++){const a=i*1.26,o=ball(root,base,Math.cos(a)*.09,.10,Math.sin(a)*.09,.11,.095,.12);o.rotation.z=Math.sin(a)*.5;}}
  else if(id==='garlic'){for(let i=0;i<3;i++)ball(root,base,(i-1)*.10,.10,0,.08,.11,.08);}
  else if(id==='cloud_rice'){for(let i=0;i<7;i++)ball(root,base,Math.cos(i*2.4)*.11,.08+(i%2)*.035,Math.sin(i*2.4)*.12,.045,.035,.085);}
  else{ball(root,base,0,.115,0,.17,.13,.15);if(id==='onion')ball(root,base,0,.24,0,.055,.075,.055);}
  const v={root,base,raw};foodPool.set(id,v);return v;}
 const warm=new T.Color('#a76b35'),burn=new T.Color('#3d2d26');let host=null,hostStyle=null,hint=null,lastW=0,lastH=0,lastAt=-Infinity,lastReceipt=null,revealAt=0;
 function detach(){if(host){host.style.position=hostStyle.position;host.style.minHeight=hostStyle.minHeight;host.style.color=hostStyle.color;host.removeAttribute('data-y4b-active');for(const child of host.children)if(child.dataset.y4bHidden==='1'){child.style.visibility=child.dataset.y4bOldVisibility||'';delete child.dataset.y4bHidden;delete child.dataset.y4bOldVisibility;}}hint?.remove();hint=null;canvas.remove();host=null;}
 function attach(next,receipt){if(host===next)return;detach();host=next;hostStyle={position:host.style.position,minHeight:host.style.minHeight,color:host.style.color};host.style.position='relative';if(receipt){host.style.minHeight='92px';}host.append(canvas);if(!receipt){hint=document.createElement('span');hint.setAttribute('aria-hidden','true');Object.assign(hint.style,{position:'absolute',bottom:'8px',left:'0',right:'0',textAlign:'center',font:'600 12px system-ui',color:'#fff0cf',textShadow:'0 1px 3px #000',zIndex:'10',pointerEvents:'none'});host.append(hint);}}
 return {draw(next,f,r,receiptKey,now){
  const changed=host!==next;attach(next,!!r);if(!changed&&now-lastAt<30)return;if(!changed&&r&&lastReceipt===receiptKey&&now-revealAt>900&&lastAt-revealAt>850&&next.clientWidth===lastW&&next.clientHeight===lastH)return;lastAt=now;
  const w=next.clientWidth,h=next.clientHeight;if(w<5||h<5)return;if(w!==lastW||h!==lastH){renderer.setSize(w,h,false);lastW=w;lastH=h;}
  const aspect=w/h,half=Math.max(r?.98:2.0,(r?1.68:3.05)/aspect);camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;camera.lookAt(0,r?.32:.62,0);camera.updateProjectionMatrix();
  work.visible=!!f;plateRoot.visible=!!r;reveal.visible=false;if(hint){hint.textContent=f?.items.length?'':f?.type==='GRILL'?'轻点食材，依次穿串':'轻点下方食材下锅';}for(const x of foodPool.values())x.root.visible=false;
  if(f){for(const [k,g] of Object.entries(vessels))g.visible=k===f.type;fire.visible=f.lit;cook.rotation.z=f.tilt;stick.visible=f.type==='GRILL';stick.position.set(0,f.lane?.58:.60,f.lane?({edge:.62,middle:0,flame:-.62}[f.lane]||0):.94);stick.rotation.x=f.turn;soup.position.y=.36+.17*f.reduction;
   lid.visible=f.sealed||f.action==='seal'||f.action==='vent';lid.position.set(0,.64+(f.baseOnly?(f.action==='vent'?.28*f.beat:0):f.action==='seal'?(1-f.p)*.75:f.action==='vent'?f.p*.75:0),0);lid.rotation.z=f.action==='vent'?(f.baseOnly?f.beat:f.p)*.34:0;
   tool.visible=['flip','gentle','brush','reduce'].includes(f.action);toolHead.visible=f.action==='flip';ladle.visible=['gentle','reduce'].includes(f.action);brush.visible=f.action==='brush';tool.position.set(Math.sin(f.p*Math.PI*2)*.62,.72+f.beat*.12,.30);tool.rotation.set(-.72,0,Math.sin(f.p*6.28)*.4);
   for(const [i,o] of vapor.entries()){const q=(f.t*.66+i/12)%1,a=i*2.4;o.visible=f.lit&&(f.type!=='STEAM'||!f.sealed||f.vent>0||i<3);o.position.set(Math.cos(a)*(.15+q*.40),.65+q*(.8+f.vent*.6+(f.smoke||0)*.8),Math.sin(a)*(.12+q*.29));o.scale.set(.09+q*.12+(f.smoke||0)*.12,.13+q*.15+(f.smoke||0)*.15,.09+q*.12+(f.smoke||0)*.12);}
   for(const [i,o] of sparks.entries()){o.visible=f.lit&&(['toss','flip','brush'].includes(f.action));const q=(f.p+i*.11)%1;o.position.set(Math.cos(i*2.4)*(.35+q*.72),.50+Math.sin(q*Math.PI)*.85,Math.sin(i*2.4)*(.35+q*.55));}
  }
  if(r){if(lastReceipt!==receiptKey){lastReceipt=receiptKey;revealAt=now;}const q=clamp((now-revealAt)/850);plateRoot.scale.setScalar(.88+.12*Math.sin(q*Math.PI/2));plateRoot.rotation.y=(1-q)*-.35;reveal.visible=r.discovery&&q<1;reveal.rotation.y=q*1.6;resultSoup.visible=r.type==='POT';resultStick.visible=r.type==='GRILL';}
  for(const [i,v] of (f?.items||r?.items||[]).entries()){const o=food(v.id);o.root.visible=true;const parent=r?plateRoot:f.type==='GRILL'?stick:foodRoot;if(o.root.parent!==parent)parent.add(o.root);
   const height=r?.24:f.type==='POT'?.36+.17*f.reduction:f.type==='STEAM'?.56:f.type==='GRILL'?.06:.14;
   o.root.position.set(f?.type==='GRILL'?v.x:r?.type==='GRILL'?(i-((r.items.length-1)/2))*.62:v.x,height+v.y,f?.type==='GRILL'||r?.type==='GRILL'?0:v.z);
   o.root.rotation.set(v.rot||0,0,0);o.base.color.copy(o.raw).lerp(v.tone==='bad'?burn:warm,v.tone==='bad'?.86:v.tone==='good'?.26:v.tone==='warning'?.53:0);}
  renderer.render(scene,camera);if(r)host.style.color='transparent';else for(const child of host.children)if(child!==canvas&&child!==hint&&child.dataset.y4bHidden!=='1'){child.dataset.y4bOldVisibility=child.style.visibility;child.dataset.y4bHidden='1';child.style.visibility='hidden';}host.dataset.y4bActive='1';
 },dispose(){disposed=true;detach();for(const g of geos)g.dispose();for(const m of mats)m.dispose();renderer.dispose();renderer.forceContextLoss();}};
}
