// Y3d: anatomical two-segment arm solve and authored melee follow-through.
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),mul=(a,s)=>a.map(v=>v*s),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),norm=a=>Math.hypot(...a),unit=a=>mul(a,1/Math.max(1e-8,norm(a)));
export function solveArm(shoulder,target,pole,l1=.15,l2=Math.hypot(.125,.015)){
 const d0=sub(target,shoulder),len=clamp(norm(d0),Math.abs(l1-l2)+.001,l1+l2-.001),d=norm(d0)>1e-8?unit(d0):[0,-1,0];
 let v=sub(pole,mul(d,dot(pole,d)));if(norm(v)<1e-5)v=sub([1,0,0],mul(d,d[0]));if(norm(v)<1e-5)v=sub([0,0,1],mul(d,d[2]));
 v=unit(v);const along=(l1*l1-l2*l2+len*len)/(2*len),height=Math.sqrt(Math.max(0,l1*l1-along*along));
 return {elbow:add(shoulder,add(mul(d,along),mul(v,height))),hand:add(shoulder,mul(d,len))};
}
const lerp=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const ease=t=>t*t*(3-2*t);
const frames=[
 // phase, hand target, spatula direction, torso yaw
 [0,[-.29,.61,.24],[-.48,.02,.88],-.13],
 [.18,[-.23,.61,.26],[.22,-.04,.97],.09],
 [.43,[-.25,.57,.25],[.86,-.14,.49],.31],
 [.67,[-.35,.49,.14],[.60,-.56,.57],.14],
 [1,[-.40,.49,.055],[-.52,-.67,.53],0]
];
// Same oscillator as the actual leg animation: right arm opposes right leg.
// Wrist motion is authored in body space; the two-link IK preserves limb length.
export function gaitPose(f,t=0){
 const phase=t*11,a=f.moving?Math.sin(phase):0,b=f.moving?Math.cos(phase*2):0;
 return {rightZ:a*.092,leftZ:-a*.052,rightY:f.moving?.027*b:Math.sin(t*2.4)*.006,leftY:f.moving?.025*Math.sin(phase+.55):Math.sin(t*2.4)*.004,yaw:a*.065,lean:f.moving?.075:.025};
}
export function skillMotion(f){
 const o=f.skillOrigin;if(!(f.skillFx>0)||!o?.duration||o.type!==(f.weapon?.type||'WOK'))return null;
 const p=clamp(1-f.skillFx/o.duration);
 return {type:o.type,p,spin:o.type==='WOK'?Math.PI*2*ease(p):0,cast:Math.sin(Math.PI*p)};
}
export function meleePose(f,t=0){
 const active=f.attackFx?.ttl>0,p=active?clamp(1-f.attackFx.ttl/(f.attackFx.duration||.33)):1,guard=f.guardTime>0||f.shieldFlash>0,g=gaitPose(f,t),skill=skillMotion(f);
 let hand=[-.40,.49+g.rightY,.075+g.rightZ],direction=[-.52,-.67,.53+g.rightZ*1.8],yaw=g.yaw;
 let shield=guard?[.39,.64,.23]:[.41,.49+g.leftY,.08+g.leftZ];
 if(skill?.type==='WOK'){
  const k=Math.sin(Math.PI*skill.p),u=ease(Math.min(1,skill.p*5)),v=ease(Math.min(1,(1-skill.p)*5)),w=u*v;
  hand=lerp(hand,[-.47,.61,.105],w);direction=lerp(direction,[-.98,-.08,.22],w);
  yaw=.10*k;shield=lerp(shield,[.35,.62,.16],k*.60);
 }else if(active){let j=1;while(j<frames.length-1&&p>frames[j][0])j++;const a=frames[j-1],b=frames[j],u=ease(clamp((p-a[0])/(b[0]-a[0])));hand=lerp(a[1],b[1],u);direction=unit(lerp(a[2],b[2],u));yaw=a[3]+(b[3]-a[3])*u;}
 return {active,p,guard,hand,direction:unit(direction),shield,yaw,lean:skill?.type==='WOK'?.08:active?.025+Math.sin(p*Math.PI)*.035:g.lean};
}
export function potIdlePose(f,t=0){const g=gaitPose(f,t),m=skillMotion(f);let hand=[-.40,.51+g.rightY,.075+g.rightZ*.76],direction=[-.38,-.65,.65+g.rightZ],pot=[.42,.465+g.leftY*.7,.05+g.leftZ*.6];if(m?.type==='POT'){const u=Math.sin(Math.PI*Math.min(1,m.p*1.8));hand=lerp(hand,[-.31,.68,.23],u);direction=lerp(direction,[-.10,.50,.86],u);pot=lerp(pot,[.36,.60,.19],u*.85);}return {hand,direction:unit(direction),pot};}
export function otherToolPose(f,t=0){
 const g=gaitPose(f,t),m=skillMotion(f),type=f.weapon?.type;
 if(type==='GRILL'){
  const u=m?.type==='GRILL'?Math.sin(Math.PI*m.p):0;
  return {right:[-.34,.53+g.rightY*.6+u*.08,.17+g.rightZ*.44+u*.06],left:[.22,.54+g.rightY*.6+u*.08,.19+g.rightZ*.44+u*.04],direction:unit([0,-.35+u*.32,1]),lean:g.lean+u*.12,yaw:g.yaw*.5};
 }
 const u=m?.type==='STEAM'?Math.sin(Math.PI*m.p):0;
 return {right:[-.25,.52+g.rightY*.35+u*.13,.20+u*.05],left:[.25,.52+g.rightY*.35+u*.13,.20+u*.05],lean:g.lean+u*.04,yaw:g.yaw*.4};
}
export function applyArm(T,rig,i,target,pole,toolDirection=null){
 const arm=rig.arms[i],elbow=rig.elbows[i],wrist=rig.grips[i],s=arm.position.toArray(),p=solveArm(s,target,pole);
 const v=a=>new T.Vector3(...a);
 arm.quaternion.setFromUnitVectors(new T.Vector3(0,-1,0),v(sub(p.elbow,s)).normalize());
 const relative=v(sub(p.hand,p.elbow)).normalize().applyQuaternion(arm.quaternion.clone().invert());
 elbow.quaternion.setFromUnitVectors(new T.Vector3(0,-.125,.015).normalize(),relative);
 const inverse=arm.quaternion.clone().multiply(elbow.quaternion).invert();
 if(toolDirection){const dir=v(toolDirection).normalize(),up=new T.Vector3(0,1,0);const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,-1,0),dir);wrist.quaternion.copy(inverse.multiply(q));}
 else wrist.quaternion.copy(inverse);
 return p;
}
