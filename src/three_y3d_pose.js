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
export function meleePose(f,t=0){
 const active=f.attackFx?.ttl>0,p=active?clamp(1-f.attackFx.ttl/(f.attackFx.duration||.33)):1,guard=f.guardTime>0||f.shieldFlash>0;
 const walk=f.moving?Math.sin(t*11)*.022:Math.sin(t*2.4)*.009;
 let hand=[-.40,.49,.055+walk],direction=[-.52,-.67,.53],yaw=0;
 if(active){let j=1;while(j<frames.length-1&&p>frames[j][0])j++;const a=frames[j-1],b=frames[j],u=ease(clamp((p-a[0])/(b[0]-a[0])));hand=lerp(a[1],b[1],u);direction=unit(lerp(a[2],b[2],u));yaw=a[3]+(b[3]-a[3])*u;}
 return {active,p,guard,hand,direction:unit(direction),shield:guard?[.39,.64,.23]:[.43,.49,.075-walk],yaw,lean:active?.025+Math.sin(p*Math.PI)*.035:.025};
}
export function potIdlePose(f,t=0){const a=f.moving?Math.sin(t*11)*.026:Math.sin(t*2.4)*.010;return {hand:[-.40,.51,.075+a],direction:unit([-.38,-.65,.65]),pot:[.43,.465,.035-a]};}
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
