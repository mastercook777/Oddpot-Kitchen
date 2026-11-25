// Y3b: grip-bound cookware, driven exclusively by existing attack timelines.
import {meleePose,potIdlePose,chefSupportPose,chefSkillPose,applyArm} from './three_y3d_pose.js?v=y5c';
const clamp=x=>Math.min(1,Math.max(0,x));
// Deliberate windup, contact and recovery: contact is immediate in the existing sim.
export function weaponPose(f){
 const type=f.weapon?.type||'WOK',fx=f.attackFx;
 const active=fx?.ttl>0,p=active?clamp(1-fx.ttl/(fx.duration||.3)):1;
 const strike=active?Math.pow(1-p,1.7):0,follow=active?Math.sin(p*Math.PI):0;
 const guard=f.guardTime>0||f.shieldFlash>0;
 // Negative X arm is anatomical right; negative Z rotation opens it outwards.
 if(type==='WOK')return {type,left:[guard?-1.25:-.32,0,guard?.34:.76],right:[-.18-strike*.88,-strike*.70,-.93+strike*.52],lean:.06+strike*.17,twist:-strike*.43+follow*.12,strike};
 if(type==='POT')return {type,left:[-.10,0,.70],right:[.20-strike*1.60,-strike*.25,-.86+strike*.30],lean:.05+strike*.19,twist:-strike*.32,strike};
 if(type==='GRILL')return {type,left:[-.53-strike*.40,0,.28],right:[-.72-strike*.62,0,-.49],lean:.13+strike*.22,twist:-strike*.14,strike};
 return {type:'STEAM',left:[-.40-strike*.54,0,.35],right:[-.40-strike*.54,0,-.35],lean:.05+strike*.13,twist:0,strike};
}
export function createWeaponRig(T,hero,rounded){
 const {arms,elbows,grips,body}=hero.rig;
 const mat=(color,metalness=0)=>new T.MeshStandardMaterial({color,metalness,roughness:.55});
 const iron=mat('#687e79',.55),edge=mat('#d4ceac',.65),wood=mat('#805333'),copper=mat('#b57b42',.45),bamboo=mat('#d4aa68');
 function group(p){const g=new T.Group();p.add(g);return g;}
 function mesh(p,g,m,x,y,z){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;p.add(o);return o;}
 function box(p,m,x,y,z,w,h,d){return mesh(p,rounded(w,h,d,.025),m,x,y,z);}
 function cylinder(p,m,x,y,z,a,b,h){return mesh(p,new T.CylinderGeometry(a,b,h,24),m,x,y,z);}
 const sets={};for(const k of ['WOK','POT','GRILL','STEAM'])sets[k]=[group(grips[0]),group(grips[1])];
 // Facing +Z: negative X is the chef's anatomical right. Put spatula in that hand.
 const [spatula,shield]=sets.WOK;
 box(spatula,wood,0,-.19,0,.075,.46,.075);box(spatula,iron,0,-.53,0,.24,.29,.055);box(spatula,edge,0,-.67,0,.22,.035,.06);const bladeBase=group(spatula),bladeTip=group(spatula);bladeBase.position.y=-.40;bladeTip.position.y=-.69;
 const lid=group(shield);lid.position.set(0,-.05,.13);lid.rotation.x=Math.PI/2;
 cylinder(lid,iron,0,0,0,.30,.32,.055);cylinder(lid,edge,0,.035,0,.31,.31,.028);cylinder(lid,copper,0,.075,0,.22,.25,.065);box(lid,wood,0,.13,0,.15,.065,.08);
 const [ladle,pot]=sets.POT;box(ladle,wood,0,-.15,0,.065,.38,.065);const spoon=mesh(ladle,new T.SphereGeometry(1,16,10),iron,0,-.39,0);spoon.scale.set(.13,.10,.055);
 const potBody=group(pot);potBody.position.set(0,-.30,0);
 cylinder(potBody,iron,0,0,0,.25,.21,.31);cylinder(potBody,copper,0,.16,0,.26,.26,.045);cylinder(potBody,edge,0,.19,0,.22,.23,.035);
 const handle=mesh(potBody,new T.TorusGeometry(.23,.025,8,24,Math.PI),wood,0,.15,0);handle.rotation.z=0;
 const [fork,guide]=sets.GRILL;box(fork,wood,0,-.27,0,.065,.82,.065);box(fork,iron,0,-.68,0,.25,.075,.075);for(const x of [-.10,.10])box(fork,edge,x,-.85,0,.047,.30,.047);
 // Both hands support a single basket; second hand has no duplicated object.
 const [basket,support]=sets.STEAM;basket.position.set(.29,-.09,.10);
 for(let i=0;i<2;i++){cylinder(basket,bamboo,0,i*.115,0,.25,.25,.115);cylinder(basket,wood,0,i*.115-.052,0,.26,.26,.025);}
 cylinder(basket,bamboo,0,.18,0,.25,.25,.045);box(basket,wood,0,.22,0,.12,.045,.05);
 return {update(f,t=0,gait=f.moving?1:0){const p=weaponPose(f),skill=chefSkillPose(f);for(const g of [...elbows,...grips])g.rotation.set(0,0,0);for(const [k,pair] of Object.entries(sets))for(const g of pair)g.visible=k===p.type;
  // Pose indices are anatomical left/right; negative-X arm is right.
  arms[0].rotation.set(...p.right);arms[1].rotation.set(...p.left);body.rotation.x=p.lean;body.rotation.y=p.twist;
  shield.rotation.x=-arms[1].rotation.x+(f.guardTime>0?-.16:.12);shield.rotation.z=-arms[1].rotation.z;spatula.rotation.z=-.22-p.strike*.30;spatula.rotation.x=.18-p.strike*.34;
  pot.rotation.x=-arms[1].rotation.x;pot.rotation.z=-arms[1].rotation.z;
  fork.rotation.x=-Math.PI/2-arms[0].rotation.x;fork.rotation.z=-arms[0].rotation.z;basket.rotation.x=-arms[0].rotation.x;basket.rotation.z=-arms[0].rotation.z;
  if(p.type==='WOK'){const m=meleePose(f,t,gait);body.rotation.x=m.lean;body.rotation.y=m.yaw;applyArm(T,hero.rig,0,m.hand,[-1,-.2,-.3],m.direction);applyArm(T,hero.rig,1,m.shield,[1,-.2,-.3]);spatula.rotation.set(0,0,0);shield.rotation.set(m.shieldTilt,0,m.shieldRoll);}
  else if(p.type==='POT'&&(!(f.attackFx?.ttl>0)||skill.active)){const m=potIdlePose(f,t,gait);applyArm(T,hero.rig,0,m.hand,[-1,-.2,-.25],m.direction);applyArm(T,hero.rig,1,m.pot,[1,-.2,-.3]);ladle.rotation.set(0,0,0);pot.rotation.set(0,0,0);}
  else if((p.type==='GRILL'||p.type==='STEAM')&&(!(f.attackFx?.ttl>0)||skill.active)){const m=chefSupportPose(f,t,gait);applyArm(T,hero.rig,0,m.right,[-1,-.2,-.3],m.direction);applyArm(T,hero.rig,1,m.left,[1,-.2,-.3]);body.rotation.y=m.yaw;if(p.type==='GRILL')fork.rotation.set(0,0,0);else basket.rotation.set(0,0,0);}
 },bladeWorld(){hero.root.updateMatrixWorld(true);return {base:bladeBase.getWorldPosition(new T.Vector3()),tip:bladeTip.getWorldPosition(new T.Vector3())};
 }};
}
