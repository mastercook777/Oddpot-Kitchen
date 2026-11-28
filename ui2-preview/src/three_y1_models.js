// Original stylized 3D chef, shared rounded furniture geometry.
export function roundedFactory(T){
 const cache=new Map();
 return (w,h,d,r=.06)=>{
  const key=[w,h,d,r].join(':');if(cache.has(key))return cache.get(key);
  const q=Math.min(r,w*.22,h*.22,d*.22),x=w/2-q,y=h/2-q;
  const s=new T.Shape();s.moveTo(-x,-y);s.lineTo(x,-y);s.lineTo(x,y);s.lineTo(-x,y);s.closePath();
  const g=new T.ExtrudeGeometry(s,{depth:d-2*q,bevelEnabled:true,bevelThickness:q,bevelSize:q,bevelSegments:3,steps:1});g.translate(0,0,-d/2+q);g.computeVertexNormals();cache.set(key,g);return g;
 };
}
export function makeChefY1(T,rounded){
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
 const legs=[],arms=[];
 for(const k of [-1,1]){
  const leg=group(root,k*.125,.36,0);legs.push(leg);ell(leg,navy,0,-.12,0,.11,.15,.11);ell(leg,shoe,0,-.265,.045,.125,.09,.17);
  const arm=group(body,k*.265,.685,0);arms.push(arm);arm.rotation.z=k*.19;ell(arm,blue,0,-.11,0,.115,.15,.105);ell(arm,navy,0,-.205,0,.098,.048,.095);ell(arm,skin,0,-.275,.015,.085,.095,.082);
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
 let heading=0;return {root,update(t,s){const aim={front:0,right:Math.PI/2,back:Math.PI,left:-Math.PI/2}[s.facing]??0;heading+=Math.atan2(Math.sin(aim-heading),Math.cos(aim-heading))*.18;root.rotation.y=heading;const a=s.moving?Math.sin(t*11):0;body.position.y=s.moving?Math.abs(a)*.035:Math.sin(t*2.1)*.008;body.rotation.z=a*.035;body.rotation.x=s.moving?.075:0;head.rotation.z=-a*.025;for(let i=0;i<2;i++){const k=i?1:-1;legs[i].rotation.x=k*a*.47;arms[i].rotation.x=-k*a*.34;}}};
}
