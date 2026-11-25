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
// The negative-X hand opposes its same-side leg. Shield is heavier and
// carries less fore/aft travel; vertical bounce follows the step cycle.
export function chefGait(t=0,blend=0){const w=clamp(blend),a=Math.sin(t*11),b=Math.cos(t*11),step=Math.abs(a);return {swing:a*w,bob:step*w,lag:b*w,breath:Math.sin(t*2.4)*(1-w),blend:w};}
export function chefSkillPose(f){const kind=f.skillOrigin?.type,ttl=f.skillFx||0,duration=f.skillOrigin?.duration|| (kind==='GRILL'?.85:kind==='WOK'?.42:.42);return {kind,active:ttl>0&&!!kind,p:clamp(1-ttl/duration),spin:kind==='WOK'&&f.skillOrigin?.spin&&ttl>0};}
export function meleePose(f,t=0,blend=f.moving?1:0){
 const active=f.attackFx?.ttl>0,p=active?clamp(1-f.attackFx.ttl/(f.attackFx.duration||.33)):1,guard=f.guardTime>0||f.shieldFlash>0,g=chefGait(t,blend),skill=chefSkillPose(f);
 let hand=[-.39,.50+.034*g.bob+.008*g.breath,.065-.115*g.swing],direction=unit([-.52,-.67+.13*g.swing,.53-.20*g.swing]),yaw=.055*g.swing;
 let shield=[.40,.51+.027*g.bob+.009*g.lag,.10+.068*g.swing];
 if(active){let j=1;while(j<frames.length-1&&p>frames[j][0])j++;const a=frames[j-1],b=frames[j],u=ease(clamp((p-a[0])/(b[0]-a[0]))),weight=1-ease(clamp((p-.67)/.33));hand=lerp(hand,lerp(a[1],b[1],u),weight);direction=unit(lerp(direction,lerp(a[2],b[2],u),weight));yaw=yaw*(1-weight)+(a[3]+(b[3]-a[3])*u)*weight;}
 if(guard)shield=[.39,.64+.012*g.bob,.23-.016*g.swing];
 if(skill.spin){const k=Math.sin(Math.PI*skill.p),w=ease(Math.min(1,skill.p*7,(1-skill.p)*7));hand=lerp(hand,[-.49,.58+.04*k,.13],w);direction=unit(lerp(direction,[-.92,.06,.38],w));shield=lerp(shield,[.43,.60,.15],w);yaw=.08*k;}
 return {active,p,guard,hand,direction,shield,yaw,lean:.025+.035*g.blend+(active?Math.sin(p*Math.PI)*.035:0),shieldTilt:guard?-.13:.18+.07*g.swing,shieldRoll:guard?-.10:.26+.085*g.lag,spin:skill.spin};
}
export function potIdlePose(f,t=0,blend=f.moving?1:0){const g=chefGait(t,blend),s=chefSkillPose(f),lift=s.active&&s.kind==='POT'?Math.sin(Math.PI*s.p):0;return {hand:[-.39,.51+.026*g.bob+.05*lift,.075-.081*g.swing+.10*lift],direction:unit([-.38,-.65+.20*lift,.65]),pot:[.40,.465+.024*g.bob+.16*lift,.055+.047*g.swing+.15*lift]};}
export function chefSupportPose(f,t=0,blend=f.moving?1:0){const g=chefGait(t,blend),s=chefSkillPose(f),k=s.active?Math.sin(Math.PI*s.p):0,grill=f.weapon?.type==='GRILL',sweep=grill&&s.active?Math.sin(s.p*Math.PI*2):0;return {right:grill?[-.33,.52+.025*g.bob+.10*k,.19-.04*g.swing]:[-.34,.53+.024*g.bob+.12*k,.19-.03*g.swing],left:[.34,.53+.024*g.bob+.12*k,.19+.03*g.swing],direction:unit(grill?[.32*sweep,-.18-.20*k,.94]:[0,-1,0]),yaw:.04*g.swing+.34*sweep};}
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
