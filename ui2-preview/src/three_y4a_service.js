// Y4a: presentation only. Real actor and order flags remain authoritative.
import {applyArm} from './three_y3d_pose.js';
export function dinerAction(a,layout,service){
 if(a.plate)return {mode:'carry'};
 if(!a.working||!service)return {mode:'idle'};
 const candidates=layout.stoves.filter(p=>p.unlocked&&service.stations?.[p.id]);
 if(!candidates.length)return {mode:'idle'};
 // Workers have canonical assignments even when another stove is nearer.
 const assigned=service.crew?.[a.id];const slot=assigned?.currentStation??assigned?.station;
 const station=candidates.find(p=>p.id===['WOK','POT','CENTER'][slot])||[...candidates].sort((p,q)=>Math.hypot((p.x-a.x)*10,(p.z-a.y)*12)-Math.hypot((q.x-a.x)*10,(q.z-a.y)*12))[0];
 return {mode:'cook',type:station.type,station};
}
export function dishStyle(recipe){
 const ids=recipe?.ids||[],method=recipe?.method;
 return {kind:method==='stew'?'soup':method==='grill'?'skewer':method==='steam'?'steam':'stir',protein:ids.includes('beef')?'beef':ids.includes('chicken')?'chicken':'veg',greens:ids.some(x=>['cabbage','garlic','sky_moss'].includes(x)),spicy:ids.includes('chili')};
}
export function servicePose(action,t,moving=false){
 const speed=action.type==='POT'?3.3:action.type==='GRILL'?3.8:action.type==='STEAM'?2.1:5.2,s=Math.sin(t*speed),c=Math.cos(t*speed),bob=moving?Math.sin(t*10)*.006:0;
 if(action.mode==='carry')return {right:[-.21,.53+bob,.20],left:[.21,.53+bob,.20],tray:[0,.59+bob,.30],lean:.025};
 if(action.mode!=='cook')return null;
 switch(action.type){
 case 'POT':return {right:[-.19+s*.055,.66+.012*c,.20+c*.04],left:[.24,.59,.16],direction:[s*.22,-.67,.68+c*.15],lean:.075};
 case 'GRILL':return {right:[-.18+s*.065,.64+Math.max(0,c)*.06,.20+.045*s],left:[.25,.52,.13],direction:[s*.20,-.38,.88],lean:.10};
 case 'STEAM':return {right:[-.16,.64+Math.max(0,s)*.05,.22],left:[.18,.64+Math.max(0,s)*.05,.22],direction:[.1,-.26,.95],lean:.07};
 default:return {right:[-.19+s*.075,.64+Math.max(0,c)*.045,.22],left:[.27,.60,.22],direction:[s*.36,-.46,.81],lean:.11};
 }
}
export function createServiceRig(T,model,rounded){
 const {body,arms,elbows,grips,head}=model.rig;
 const steel=new T.MeshStandardMaterial({color:'#a3aaa1',metalness:.45,roughness:.49}),wood=new T.MeshStandardMaterial({color:'#8c6041',roughness:.85}),brass=new T.MeshStandardMaterial({color:'#d3aa70',metalness:.25,roughness:.6});
 const group=p=>{const o=new T.Group();p.add(o);return o;};
 function box(p,m,x,y,z,w,h,d){const o=new T.Mesh(rounded(w,h,d,.018),m);o.position.set(x,y,z);o.castShadow=true;p.add(o);return o;}
 function bowl(p,m,x,y,z){const o=new T.Mesh(new T.SphereGeometry(1,16,10),m);o.position.set(x,y,z);o.scale.set(.095,.045,.13);p.add(o);return o;}
 const tools={};for(const k of ['WOK','POT','GRILL','STEAM'])tools[k]=group(grips[0]);
 for(const k of ['WOK','POT']){const g=tools[k];box(g,wood,0,-.26,0,.045,.60,.045);if(k==='WOK')box(g,steel,0,-.62,0,.15,.19,.04);else bowl(g,steel,0,-.62,0);}
 for(const x of [-.038,.038])box(tools.GRILL,steel,x,-.26,0,.035,.60,.035).rotation.z=x*.65;
 box(tools.GRILL,wood,0,-.07,0,.12,.20,.055);
 box(tools.STEAM,brass,0,-.15,0,.055,.35,.055);box(tools.STEAM,wood,0,-.31,0,.15,.065,.12);
 return {update(action,t,moving,tray,targetWorld=null,role='chef',level=1){
  // Reset before every state, so reused actors never retain a previous IK pose.
  for(const g of [...elbows,...grips])g.rotation.set(0,0,0);
  for(const g of Object.values(tools)){g.visible=false;g.scale.set(1,1,1);}
  body.rotation.y=0;const offset=role==='helper'?1.13:role==='helper2'?2.31:role==='waiter'?.73:0;const phase=t+offset;const pose=servicePose(action,phase,moving);if(!pose){if(!moving&&role!=='chef'){const q=Math.max(0,Math.sin(phase*1.8));head.rotation.y=Math.sin(phase*.95)*.16;applyArm(T,model.rig,0,[-.31,.46,.07+.055*q],[-1,-.3,0]);applyArm(T,model.rig,1,[.30,.46,.04], [1,-.3,0]);}else head.rotation.y=0;return;}head.rotation.y=0;
  body.rotation.x=pose.lean;body.rotation.z=0;
  applyArm(T,model.rig,0,pose.right,[-1,-.3,0],pose.direction||null);applyArm(T,model.rig,1,pose.left,[1,-.3,0]);
  if(action.mode==='carry'){tray.position.set(...pose.tray);tray.quaternion.copy(body.quaternion).invert();head.rotation.x=.06;}
  else{const tool=tools[action.type]||tools.WOK;tool.visible=true;head.rotation.x=.17;if(targetWorld){model.root.updateMatrixWorld(true);const target=body.worldToLocal(targetWorld.clone());const speed=action.type==='POT'?3.3:action.type==='GRILL'?3.8:action.type==='STEAM'?2.1:5.2;target.x+=Math.sin(phase*speed)*(action.type==='GRILL'?.20:.12);target.z+=Math.cos(phase*speed)*.09;target.y+=action.type==='GRILL'?Math.max(0,Math.cos(phase*speed))*.11:action.type==='STEAM'?.035*Math.sin(phase*speed):0;const hand=applyArm(T,model.rig,0,pose.right,[-1,-.3,0],pose.direction||null).hand,dir=target.clone().sub(new T.Vector3(...hand)),len=dir.length();if(len>.001){applyArm(T,model.rig,0,pose.right,[-1,-.3,0],dir.normalize().toArray());const tip=action.type==='STEAM'?.31:action.type==='GRILL'?.55:.62;tool.scale.y=Math.max(.80,Math.min(1.35,len/tip));}}}
 }};
}
