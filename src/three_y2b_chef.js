// Y2b signature roaming chef; original procedural model.
export function makeChefY2(T,rounded,signature=true){
 const root=new T.Group(),body=new T.Group();root.add(body);
 const mat=color=>new T.MeshStandardMaterial({color,roughness:.8});
 const skin=mat('#e7b28b'),cheek=mat('#c18462'),hair=mat('#684634'),ink=mat('#332c30'),blue=mat('#417b91'),navy=mat('#31546c'),apron=mat('#f0dcaf'),red=mat('#c45d45'),hat=mat('#fff1d3'),fold=mat('#ded0b7'),shoe=mat('#69503d');
 const sphere=new T.SphereGeometry(1,24,16);
 function mesh(p,g,m,x,y,z){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;p.add(o);return o;}
 function ell(p,m,x,y,z,sx,sy,sz){const o=mesh(p,sphere,m,x,y,z);o.scale.set(sx,sy,sz);return o;}
 function box(p,m,x,y,z,w,h,d){return mesh(p,rounded(w,h,d,.04),m,x,y,z);}
 function group(p,x,y,z){const o=new T.Group();o.position.set(x,y,z);p.add(o);return o;}
 function lathe(p,m,pts,x,y,z){return mesh(p,new T.LatheGeometry(pts.map(v=>new T.Vector2(...v)),32),m,x,y,z);}
 lathe(body,blue,[[0,0],[.19,.01],[.26,.07],[.29,.19],[.28,.33],[.23,.45],[.16,.49],[0,.49]],0,.30,0);
 const s=new T.Shape();s.moveTo(-.15,.17);s.quadraticCurveTo(-.19,0,-.21,-.16);s.quadraticCurveTo(0,-.21,.21,-.16);s.quadraticCurveTo(.19,0,.15,.17);s.closePath();
 mesh(body,new T.ExtrudeGeometry(s,{depth:.025,bevelEnabled:true,bevelThickness:.012,bevelSize:.012,bevelSegments:3,curveSegments:10}),apron,0,.51,.23);
 box(body,fold,.035,.44,.269,.16,.10,.024);box(body,apron,.035,.465,.285,.13,.06,.018);
 for(const k of [-1,1]){const strap=box(body,apron,k*.12,.70,.18,.045,.14,.035);strap.rotation.z=k*.13;}
 ell(body,red,0,.77,.15,.16,.065,.10);ell(body,red,0,.74,.25,.075,.065,.05);box(body,red,.055,.675,.255,.08,.14,.035).rotation.z=.28;
 const legs=[],arms=[],elbows=[],grips=[];
 for(const k of [-1,1]){
  const leg=group(root,k*.125,.36,0);legs.push(leg);ell(leg,navy,0,-.12,0,.11,.15,.11);ell(leg,shoe,0,-.265,.045,.125,.09,.17);
  const arm=group(body,k*.265,.685,0);arms.push(arm);arm.rotation.z=k*.19;ell(arm,blue,0,-.075,0,.105,.125,.10);const elbow=group(arm,0,-.15,0);elbows.push(elbow);ell(elbow,blue,0,-.035,0,.093,.085,.092);ell(elbow,navy,0,-.055,0,.096,.045,.09);const wrist=group(elbow,0,-.125,.015);ell(wrist,skin,0,0,0,.085,.095,.082);grips.push(wrist);
 }
 const head=group(body,0,.96,0);
 ell(head,hair,0,.04,-.025,.305,.285,.26);ell(head,skin,0,-.005,.065,.28,.245,.245);ell(head,skin,0,-.10,.135,.245,.16,.18);
 for(const k of [-1,1]){
  ell(head,skin,k*.281,-.028,0,.066,.09,.066);ell(head,hair,k*.225,.115,.085,.09,.13,.115);
  ell(head,ink,k*.103,.015,.286,.030,.044,.014);ell(head,hat,k*.103-.009,.031,.297,.009,.010,.006);ell(head,cheek,k*.165,-.072,.266,.050,.019,.009);
  ell(head,hair,k*.103,.083,.274,.046,.013,.015).rotation.z=-k*.11;
 }
 ell(head,skin,0,-.047,.30,.043,.045,.038);
 const smile=new T.CatmullRomCurve3([new T.Vector3(-.043,-.112,.282),new T.Vector3(0,-.124,.290),new T.Vector3(.043,-.112,.282)]);mesh(head,new T.TubeGeometry(smile,12,.009,6,false),hair,0,0,0);
 lathe(head,fold,[[0,0],[.27,0],[.30,.035],[.29,.105],[.265,.13],[0,.13]],0,.18,0);
 lathe(head,hat,[[0,0],[.255,0],[.31,.07],[.32,.16],[.27,.25],[.15,.29],[0,.3]],0,.26,0);
 for(let i=0;i<5;i++){const a=i*Math.PI*2/5;ell(head,hat,Math.cos(a)*.15,.46,Math.sin(a)*.14,.18,.16,.17);}ell(head,hat,0,.52,0,.18,.15,.18);
 // The roaming chef has an asymmetrical silhouette and recognizable back view.
// Staff retain the simpler uniform and never receive the signature equipment.
 const copper=mat('#b66b3c'),gold=mat('#e4b474'),leather=mat('#865236'),seam=mat('#c59260'),scarf=group(body,.10,.74,-.08);
 const tail2=box(scarf,red,.08,-.12,-.11,.12,.32,.045);tail2.rotation.z=.32;
 const tail3=box(scarf,red,.17,-.20,-.10,.09,.25,.04);tail3.rotation.z=-.22;
 if(!signature)scarf.visible=false;
 if(signature){
  // Rebuild the cap from a tilted, single broad soft crown, not the original tower of puffs.
  for(const o of [...head.children])if(o.material===hat||o.material===fold){if(o.position.y>.16)head.remove(o);}
  const cap=group(head,-.035,.23,-.015);cap.rotation.z=-.15;
  lathe(cap,fold,[[0,0],[.28,0],[.30,.025],[.29,.10],[.27,.12],[0,.12]],0,0,0);
  ell(cap,hat,-.035,.22,-.015,.365,.225,.30);ell(cap,hat,-.16,.22,-.025,.23,.20,.27);
  ell(cap,fold,.24,.12,.015,.12,.12,.25);
  const badge=mesh(cap,new T.CylinderGeometry(.073,.073,.025,24),copper,.09,.083,.30);badge.rotation.x=Math.PI/2;
  const inset=mesh(cap,new T.CylinderGeometry(.051,.051,.027,20),gold,.09,.083,.315);inset.rotation.x=Math.PI/2;
  box(cap,copper,.09,.083,.337,.056,.018,.014);
  // Thick swept fringe, leather sash and apron buttons readable at game scale.
  for(let i=0;i<3;i++){const lock=ell(head,hair,-.13+i*.105,.165-i*.019,.235,.105,.095,.08);lock.rotation.z=-.45;}
  ell(head,mat('#a6754e'),-.17,.181,.278,.060,.04,.022);
  const sash=box(body,leather,0,.43,.295,.055,.56,.04);sash.rotation.z=.62;
  box(body,leather,0,.36,.22,.49,.09,.08);box(body,gold,.02,.36,.28,.105,.075,.025);box(body,leather,.02,.36,.30,.060,.040,.014);
  for(const y of [.63,.54])ell(body,gold,-.12,y,.263,.025,.025,.014);
  const satchel=group(body,.27,.40,-.035);satchel.rotation.z=-.15;
  box(satchel,leather,0,0,0,.24,.26,.20);box(satchel,seam,0,.08,.095,.24,.12,.04);box(satchel,gold,0,.02,.12,.06,.07,.025);
  ell(satchel,mat('#799657'),.04,.15,.01,.055,.10,.035);ell(satchel,mat('#b95e3d'),-.055,.15,0,.05,.075,.045);
  // Copper travel skillet sits flat on the back, with a diagonal wooden handle.
  const kit=group(body,-.055,.53,-.255);kit.rotation.z=-.28;
  const pan=mesh(kit,new T.SphereGeometry(1,24,12),copper,0,0,0);pan.scale.set(.245,.245,.065);
  const rim=mesh(kit,new T.TorusGeometry(.225,.025,8,32),gold,0,0,-.035);
  box(kit,leather,0,.31,-.012,.072,.28,.075);box(kit,gold,0,.19,-.012,.085,.07,.085);
 }
 let heading=0;return {root,rig:{body,head,arms,elbows,grips},update(t,s){const aim={front:0,right:Math.PI/2,back:Math.PI,left:-Math.PI/2}[s.facing]??0;heading+=Math.atan2(Math.sin(aim-heading),Math.cos(aim-heading))*.18;root.rotation.y=heading;const a=s.moving?Math.sin(t*11):0,work=s.working&&!s.carrying;body.position.y=s.moving?Math.abs(a)*.035:Math.sin(t*2.1)*.008;body.rotation.z=a*.035+(work?Math.sin(t*5)*.04:0);body.rotation.x=s.moving?.075:work?.14:0;head.rotation.z=-a*.025;head.rotation.x=work?.12:0;scarf.rotation.x=s.moving?-.22+Math.sin(t*11)*.10:Math.sin(t*2)*.025;for(let i=0;i<2;i++){const k=i?1:-1;legs[i].rotation.x=k*a*.47;arms[i].rotation.x=s.carrying?-1.05:work?-.75+Math.sin(t*7+i*1.5)*.38:-k*a*.34;arms[i].rotation.z=s.carrying?-k*.23:k*.19;}}};
}
