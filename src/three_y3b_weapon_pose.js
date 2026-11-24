// Y3b: grip-bound cookware, driven exclusively by existing attack timelines.
const clamp=x=>Math.min(1,Math.max(0,x));
export function weaponPose(f){
 const type=f.weapon?.type||'WOK',fx=f.attackFx;
 const p=fx?.ttl>0?clamp(1-fx.ttl/(fx.duration||.3)):1;
 const strike=fx?.ttl>0?Math.sin(Math.PI*Math.pow(p,.48)):0;
 const guard=f.guardTime>0||f.shieldFlash>0;
 if(type==='WOK')return {type,left:[guard?-1.45:-.96,0,-.36],right:[-.52-strike*.84,-strike*.75,.46-strike*.88],lean:.05+strike*.09,strike};
 if(type==='POT')return {type,left:[-.53,0,-.36],right:[-.76-strike*1.05,-.22,.35-strike*.45],lean:.06+strike*.12,strike};
 if(type==='GRILL')return {type,left:[-1.10-strike*.34,.12,-.30],right:[-1.04-strike*.42,-.15,.32],lean:.09+strike*.20,strike};
 return {type:'STEAM',left:[-1.0-strike*.38,.12,-.25],right:[-1.0-strike*.38,-.12,.25],lean:.03+strike*.10,strike};
}
export function createWeaponRig(T,hero,rounded){
 const {arms,grips,body}=hero.rig;
 const mat=(color,metalness=0)=>new T.MeshStandardMaterial({color,metalness,roughness:.55});
 const iron=mat('#687e79',.55),edge=mat('#d4ceac',.65),wood=mat('#805333'),copper=mat('#b57b42',.45),bamboo=mat('#d4aa68');
 function group(p){const g=new T.Group();p.add(g);return g;}
 function mesh(p,g,m,x,y,z){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;p.add(o);return o;}
 function box(p,m,x,y,z,w,h,d){return mesh(p,rounded(w,h,d,.025),m,x,y,z);}
 function cylinder(p,m,x,y,z,a,b,h){return mesh(p,new T.CylinderGeometry(a,b,h,24),m,x,y,z);}
 const sets={};for(const k of ['WOK','POT','GRILL','STEAM'])sets[k]=[group(grips[0]),group(grips[1])];
 // Facing +Z: negative X is the chef's anatomical right. Put spatula in that hand.
 const [spatula,shield]=sets.WOK;
 box(spatula,wood,0,-.13,0,.075,.34,.075);box(spatula,iron,0,-.40,0,.20,.25,.055);box(spatula,edge,0,-.52,0,.19,.035,.06);
 const lid=group(shield);lid.position.set(0,-.12,.09);lid.rotation.x=Math.PI/2;
 cylinder(lid,iron,0,0,0,.30,.32,.055);cylinder(lid,edge,0,.035,0,.31,.31,.028);cylinder(lid,copper,0,.075,0,.22,.25,.065);box(lid,wood,0,.13,0,.15,.065,.08);
 const [ladle,pot]=sets.POT;box(ladle,wood,0,-.15,0,.065,.38,.065);const spoon=mesh(ladle,new T.SphereGeometry(1,16,10),iron,0,-.39,0);spoon.scale.set(.13,.10,.055);
 const potBody=group(pot);potBody.position.set(0,-.30,0);
 cylinder(potBody,iron,0,0,0,.25,.21,.31);cylinder(potBody,copper,0,.16,0,.26,.26,.045);cylinder(potBody,edge,0,.19,0,.22,.23,.035);
 const handle=mesh(potBody,new T.TorusGeometry(.23,.025,8,24,Math.PI),wood,0,.15,0);handle.rotation.z=0;
 const [fork,guide]=sets.GRILL;box(fork,wood,0,-.27,0,.065,.82,.065);box(fork,iron,0,-.68,0,.25,.075,.075);for(const x of [-.10,.10])box(fork,edge,x,-.85,0,.047,.30,.047);
 // Both hands support a single basket; second hand has no duplicated object.
 const [basket,support]=sets.STEAM;basket.position.set(.21,0,.10);
 for(let i=0;i<2;i++){cylinder(basket,bamboo,0,i*.115,0,.25,.25,.115);cylinder(basket,wood,0,i*.115-.052,0,.26,.26,.025);}
 cylinder(basket,bamboo,0,.18,0,.25,.25,.045);box(basket,wood,0,.22,0,.12,.045,.05);
 return {update(f){const p=weaponPose(f);for(const [k,pair] of Object.entries(sets))for(const g of pair)g.visible=k===p.type;
  // Pose indices are anatomical left/right; negative-X arm is right.
  arms[0].rotation.set(...p.right);arms[1].rotation.set(...p.left);body.rotation.x=p.lean;
  shield.rotation.x=-arms[1].rotation.x+(f.guardTime>0?-.16:.12);shield.rotation.z=-arms[1].rotation.z;spatula.rotation.z=-p.strike*.45;
  pot.rotation.x=-arms[1].rotation.x;pot.rotation.z=-arms[1].rotation.z;
  fork.rotation.x=-.25-p.strike*.25;basket.rotation.x=-arms[0].rotation.x;basket.rotation.z=-arms[0].rotation.z;
 }};
}
