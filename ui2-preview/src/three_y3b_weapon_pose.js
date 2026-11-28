// Y3b: grip-bound cookware, driven exclusively by existing attack timelines.
import {meleePose,potIdlePose,otherToolPose,forkTwoHandPose,skillMotion,gaitPose,applyArm} from './three_y3d_pose.js?v=y5c3';
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
 // Fork is parented to the torso, not to either hand; both hands grasp its
 // fixed shaft at local y=0 and -.30. Positive y is the rear counterweight.
 const fork=group(body);fork.visible=false;
 cylinder(fork,wood,0,-.21,0,.036,.038,.92);
 cylinder(fork,copper,0,.225,0,.047,.042,.075);
 for(const y of [0,-.30]){cylinder(fork,wood,0,y,0,.046,.046,.105);for(let j=0;j<3;j++)cylinder(fork,copper,0,y+(j-1)*.036,0,.047,.047,.012);}
 cylinder(fork,iron,0,-.70,0,.047,.044,.17);
 box(fork,iron,0,-.78,0,.27,.065,.065);box(fork,copper,0,-.74,0,.14,.035,.075);
 for(const x of [-.10,0,.10]){box(fork,iron,x,-.89,0,.045,.22,.045);const tip=mesh(fork,new T.ConeGeometry(.035,.09,4),edge,x,-1.025,0);tip.rotation.z=Math.PI;}
 const forkRear=group(fork),forkFront=group(fork);forkFront.position.y=-.30;const forkTip=group(fork);forkTip.position.y=-1.07;let forkPose=null;
 // Both hands support a single basket; second hand has no duplicated object.
 const [basket,support]=sets.STEAM;basket.position.set(.29,-.09,.10);
 for(let i=0;i<2;i++){cylinder(basket,bamboo,0,i*.115,0,.25,.25,.115);cylinder(basket,wood,0,i*.115-.052,0,.26,.26,.025);}
 cylinder(basket,bamboo,0,.18,0,.25,.25,.045);box(basket,wood,0,.22,0,.12,.045,.05);

 // Cosmetic mastery meshes use the same rig in preview and live field.
 const mastery={WOK:[group(spatula),group(lid)],POT:[group(ladle),group(potBody)],GRILL:[group(fork)],STEAM:[group(basket)]};
 const [blade2,lid2]=mastery.WOK;
 box(blade2,copper,0,-.40,0,.12,.10,.085);box(blade2,edge,0,-.60,.033,.20,.035,.02);box(blade2,copper,0,-.52,.035,.045,.18,.023);
 const shieldRim=mesh(lid2,new T.TorusGeometry(.33,.027,8,40),copper,0,.035,0);shieldRim.rotation.x=Math.PI/2;
 for(let j=0;j<8;j++){const a=j*Math.PI/4;cylinder(lid2,edge,Math.cos(a)*.28,.066,Math.sin(a)*.28,.022,.022,.028);}
 cylinder(lid2,edge,0,.123,0,.105,.12,.032);
 const [ladle2,pot2]=mastery.POT;
 box(ladle2,copper,0,-.23,0,.089,.12,.089);for(const y of [-.12,.07]){const rim=mesh(pot2,new T.TorusGeometry(.246,.023,8,36),copper,0,y,0);rim.rotation.x=Math.PI/2;}
 for(let j=0;j<6;j++){const a=j*Math.PI/3;const rivet=mesh(pot2,new T.SphereGeometry(.033,10,8),edge,Math.cos(a)*.252,.025,Math.sin(a)*.252);rivet.scale.y=.8;}
 cylinder(pot2,copper,0,.23,0,.10,.12,.065);cylinder(pot2,edge,0,.27,0,.065,.065,.028);
 const [fork2]=mastery.GRILL;for(const y of [.24,-.49,-.70])cylinder(fork2,copper,0,y,0,.061,.061,.066);
 for(const x of [-.10,0,.10]){box(fork2,copper,x,-.78,.03,.055,.08,.04);box(fork2,edge,x,-.91,.025,.035,.12,.02);}
 const [basket2]=mastery.STEAM;
 for(const y of [-.02,.095,.21]){const rim=mesh(basket2,new T.TorusGeometry(.258,.023,8,36),copper,0,y,0);rim.rotation.x=Math.PI/2;}
 for(let j=0;j<4;j++){const a=j*Math.PI/2;const strap=box(basket2,edge,Math.cos(a)*.257,.10,Math.sin(a)*.257,.055,.22,.025);strap.rotation.y=Math.PI/2-a;}box(basket2,copper,0,.255,0,.16,.045,.075);
 for(const gs of Object.values(mastery))for(const g of gs)g.visible=false;
 let visibleMasteryParts=0;
 return {masteryParts(){return visibleMasteryParts;},update(f,t=0){const p=weaponPose(f);for(const g of [...elbows,...grips])g.rotation.set(0,0,0);for(const [k,pair] of Object.entries(sets))for(const g of pair)g.visible=k===p.type;fork.visible=p.type==='GRILL';visibleMasteryParts=0;for(const [k,gs] of Object.entries(mastery))for(const g of gs){g.visible=k===p.type&&(f.weapon?.level||1)>1;if(g.visible)g.traverse(o=>{if(o.isMesh)visibleMasteryParts++;});}
  // Pose indices are anatomical left/right; negative-X arm is right.
  arms[0].rotation.set(...p.right);arms[1].rotation.set(...p.left);body.rotation.x=p.lean;body.rotation.y=p.twist;
  shield.rotation.x=-arms[1].rotation.x+(f.guardTime>0?-.16:.12);shield.rotation.z=-arms[1].rotation.z;spatula.rotation.z=-.22-p.strike*.30;spatula.rotation.x=.18-p.strike*.34;
  pot.rotation.x=-arms[1].rotation.x;pot.rotation.z=-arms[1].rotation.z;
  basket.rotation.x=-arms[0].rotation.x;basket.rotation.z=-arms[0].rotation.z;
  if(p.type==='WOK'){const m=meleePose(f,t);body.rotation.x=m.lean;body.rotation.y=m.yaw;applyArm(T,hero.rig,0,m.hand,[-1,-.2,-.3],m.direction);applyArm(T,hero.rig,1,m.shield,[1,-.2,-.3]);spatula.rotation.set(0,0,0);shield.rotation.set(m.guard?-.13:.18,0,m.guard?-.10:.30);}
  else if(p.type==='POT'&&(!(f.attackFx?.ttl>0)||skillMotion(f))){const m=potIdlePose(f,t);applyArm(T,hero.rig,0,m.hand,[-1,-.2,-.25],m.direction);applyArm(T,hero.rig,1,m.pot,[1,-.2,-.3]);ladle.rotation.set(0,0,0);pot.rotation.set(0,0,0);const g=gaitPose(f,t);body.rotation.x=g.lean;body.rotation.y=g.yaw;}
  else if(p.type==='GRILL'){const m=forkTwoHandPose(f,t);forkPose=m;body.rotation.x=m.lean;body.rotation.y=m.yaw;if(m.axialLocked){body.rotation.z=0;body.position.y=0;}
   applyArm(T,hero.rig,0,m.right,[-1,-.5,-.2],m.direction);applyArm(T,hero.rig,1,m.left,[1,-.5,-.2],m.direction);
   fork.position.set(...m.right);fork.quaternion.setFromUnitVectors(new T.Vector3(0,-1,0),new T.Vector3(...m.direction));
  }else if(p.type==='STEAM'&&(!(f.attackFx?.ttl>0)||skillMotion(f))){const m=otherToolPose(f,t);body.rotation.x=m.lean;body.rotation.y=m.yaw;applyArm(T,hero.rig,0,m.right,[-1,-.3,-.2],m.direction);applyArm(T,hero.rig,1,m.left,[1,-.3,-.2]);basket.rotation.set(0,0,0);}
 },forkWorld(){if(!fork.visible)return null;hero.root.updateMatrixWorld(true);const rear=forkRear.getWorldPosition(new T.Vector3()),tip=forkTip.getWorldPosition(new T.Vector3());return {rear,tip,axis:tip.clone().sub(rear).normalize(),phase:forkPose?.phase||'idle',locked:!!forkPose?.axialLocked};},forkGripError(){if(!fork.visible)return null;hero.root.updateMatrixWorld(true);return Math.max(forkRear.getWorldPosition(new T.Vector3()).distanceTo(grips[0].getWorldPosition(new T.Vector3())),forkFront.getWorldPosition(new T.Vector3()).distanceTo(grips[1].getWorldPosition(new T.Vector3())));},bladeWorld(){hero.root.updateMatrixWorld(true);return {base:bladeBase.getWorldPosition(new T.Vector3()),tip:bladeTip.getWorldPosition(new T.Vector3())};
 }};
}
