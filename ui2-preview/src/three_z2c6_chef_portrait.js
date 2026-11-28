// Z2c6: Hearthcraft portrait candidate. Preserve the Y3 arm/wrist anchors.
export function portraitIdle(t,changed=-100){
 const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
 const pulse=(x,w)=>Math.max(0,1-Math.abs(x)/w);
 const phase=((t%11.7)+11.7)%11.7;
 const blink=Math.max(pulse(phase-2.28,.12),pulse(phase-6.43,.10),pulse(phase-9.86,.13));
 const glance=smooth((phase-3.3)/.45)*(1-smooth((phase-4.7)/.55))-.75*smooth((phase-7.8)/.55)*(1-smooth((phase-8.8)/.6));
 const nod=pulse(phase-5.62,.45);
 const u=Math.max(0,Math.min(1,(t-changed)/.7)),show=Math.sin(Math.PI*u);
 const breath=Math.sin(t*1.75)*.65+Math.sin(t*.93)*.35;
 return {blink:1-.92*blink,glance,nod,show,breath,
   roll:-.045+.009*breath+.014*show,
   headRoll:.056-.012*breath-.026*glance,
   yaw:-.16+.045*glance+.10*show};
}
export function makeChefZ2c6(T,rounded){
 const root=new T.Group(),body=new T.Group();root.add(body);
 const mat=(color,roughness=.78)=>new T.MeshStandardMaterial({color,roughness});
 const skin=mat('#e9b58c'),hair=mat('#684232'),hairLight=mat('#966548'),ink=mat('#392c2a'),eyeWhite=mat('#fff4df'),iris=mat('#47372c'),brow=mat('#633f2d'),blush=mat('#d89176'),blue=mat('#397b83'),blueDark=mat('#2c5961'),navy=mat('#324954'),apron=mat('#f0dfb8'),seam=mat('#c6a97b'),red=mat('#b9533b'),redLight=mat('#d66b49'),hat=mat('#f4e8cc'),hatBand=mat('#e0cfaa'),boot=mat('#704a32'),sole=mat('#443329'),leather=mat('#98613a'),gold=mat('#d7a45a',.48);
 const sphere=new T.SphereGeometry(1,32,24);
 function group(p,x=0,y=0,z=0){const g=new T.Group();g.position.set(x,y,z);p.add(g);return g;}
 function mesh(p,g,m,x=0,y=0,z=0){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;p.add(o);return o;}
 function ell(p,m,x,y,z,a,b,c){const o=mesh(p,sphere,m,x,y,z);o.scale.set(a,b,c);return o;}
 function box(p,m,x,y,z,w,h,d,r=.045){return mesh(p,rounded(w,h,d,r),m,x,y,z);}
 function lathe(p,m,points,x=0,y=0,z=0,depth=1,lobes=0){
  const curve=new T.SplineCurve(points.map(q=>new T.Vector2(...q))),pts=curve.getPoints(64).map((q,i)=>new T.Vector2(Math.max(0,q.x),i===0?points[0][1]:i===64?points.at(-1)[1]:q.y));
  const g=new T.LatheGeometry(pts,48),pos=g.attributes.position;
  for(let i=0;i<pos.count;i++){const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),phi=Math.atan2(x,z),factor=1+lobes*Math.cos(phi*5+.35)*Math.sin(Math.PI*Math.max(0,Math.min(1,(y-points[0][1])/(points.at(-1)[1]-points[0][1]))));pos.setXYZ(i,x*factor,y,z*factor*depth);}
  g.computeVertexNormals();return mesh(p,g,m,x,y,z);
 }
 function tube(p,m,pts,r){return mesh(p,new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(q=>new T.Vector3(...q))),24,r,8,false),m);}
 // Longer, connected lower body: boots, trousers, waist and fitted tunic.
 body.position.y=.12;
 lathe(body,blue,[[0,.27],[.14,.27],[.23,.30],[.24,.39],[.23,.52],[.26,.65],[.23,.73],[.14,.77],[0,.78]],0,0,0,.79);
 ell(body,navy,0,.29,0,.225,.13,.17);
 const legs=[],arms=[],elbows=[],grips=[],eyesList=[],brows=[];
 for(const k of [-1,1]){
  const leg=group(root,k*.117,.42,0);legs.push(leg);
  lathe(leg,navy,[[0,-.29],[.075,-.29],[.092,-.20],[.101,-.08],[.105,.02],[.084,.06],[0,.06]],0,0,0,.92);
  const shoe=group(leg,0,-.32,.040);shoe.rotation.y=k*.09;
  ell(shoe,boot,0,.022,.025,.133,.106,.179);ell(shoe,boot,0,.095,-.041,.090,.110,.098);
  ell(shoe,sole,0,-.050,.032,.135,.033,.179);
  box(shoe,leather,0,.093,.049,.145,.045,.065,.018);box(shoe,gold,.026,.095,.087,.047,.048,.021,.012);
  // Original shoulder and link lengths, for the shared combat weapon rig.
  const arm=group(body,k*.265,.685,0);arms.push(arm);
  lathe(arm,blue,[[0,-.155],[.082,-.155],[.094,-.11],[.105,-.036],[.096,.018],[.056,.047],[0,.05]],0,0,0,.94);
  const elbow=group(arm,0,-.15,0);elbows.push(elbow);
  lathe(elbow,blue,[[0,-.095],[.069,-.095],[.080,-.063],[.087,-.010],[.078,.035],[0,.045]],0,0,0,.95);
  lathe(elbow,blueDark,[[0,-.10],[.072,-.10],[.079,-.083],[.079,-.06],[.072,-.052],[0,-.052]],0,0,0,.94);
  const wrist=group(elbow,0,-.125,.015);grips.push(wrist);
  // A joined glove-like hand with a small thumb, not detached finger spheres.
  ell(wrist,skin,0,.006,0,.079,.086,.070);
  const thumb=ell(wrist,skin,k*.046,.015,.032,.030,.048,.031);thumb.rotation.z=-k*.32;
 }
 // Apron drapes down over the hip. Bevel and curved seams rather than stacked blocks.
 const shape=new T.Shape();shape.moveTo(-.12,.20);shape.quadraticCurveTo(-.145,.06,-.205,-.18);shape.quadraticCurveTo(0,-.235,.205,-.18);shape.quadraticCurveTo(.145,.06,.12,.20);shape.closePath();
 mesh(body,new T.ExtrudeGeometry(shape,{depth:.018,bevelEnabled:true,bevelThickness:.009,bevelSize:.009,bevelSegments:3,curveSegments:20}),apron,0,.45,.167);
 tube(body,seam,[[-.168,.292,.185],[0,.265,.194],[.168,.292,.185]],.008);
 for(const k of [-1,1])tube(body,apron,[[k*.108,.63,.184],[k*.13,.71,.17],[k*.13,.76,.09],[k*.13,.73,-.11]],.024);
 const pocket=box(body,apron,.025,.382,.203,.15,.10,.025,.015);tube(body,seam,[[-.049,.415,.218],[.025,.41,.222],[.099,.415,.218]],.006);
 // Belt and compact utility satchel, visible but not dominating the silhouette.
 lathe(body,leather,[[0,.34],[.229,.34],[.245,.355],[.245,.39],[.232,.40],[0,.40]],0,0,0,.78);
 box(body,gold,-.02,.374,.199,.082,.058,.025,.013);box(body,leather,-.02,.374,.213,.047,.031,.012,.008);
 const satchel=group(body,.229,.34,-.035);satchel.rotation.z=.12;box(satchel,leather,0,0,0,.16,.18,.15);box(satchel,boot,0,.054,.075,.155,.07,.025,.02);box(satchel,gold,0,.02,.09,.038,.045,.013,.008);
 // Neck and broad, softly folded kerchief.
 ell(body,skin,0,.79,0,.105,.115,.102);
 lathe(body,red,[[0,.735],[.13,.735],[.15,.766],[.15,.798],[.112,.828],[0,.83]],0,0,0,.88);
 ell(body,redLight,0,.765,.145,.059,.052,.038);const tail=box(body,red,.055,.70,.152,.063,.115,.031,.018);tail.rotation.z=.31;
 const head=group(body,0,.994,.005);head.scale.set(1.16,1.04,1.10);
 // One head surface: sculpt the jaw, chin and temple into a single smooth mesh.
 const faceGeo=new T.SphereGeometry(1,48,32),fp=faceGeo.attributes.position;
 for(let i=0;i<fp.count;i++){const x=fp.getX(i),y=fp.getY(i),z=fp.getZ(i);const jaw=1-.08*Math.max(0,-y-.15)+.09*Math.max(0,1-Math.abs(y+.27)*2.8),face=1+.075*Math.max(0,-y);fp.setXYZ(i,x*.274*jaw,y*.265,z*.235*face+.018*Math.max(0,-y));}
 faceGeo.computeVertexNormals();mesh(head,faceGeo,skin);
 for(const k of [-1,1]){
  ell(head,skin,k*.257,-.025,-.002,.046,.069,.048);
  ell(head,blush,k*.281,-.023,.019,.012,.038,.013);
  const eyes=group(head,k*.101,.018,.218);eyes.rotation.y=k*.22;
  ell(eyes,eyeWhite,0,0,.003,.051,.050,.017);
  const pupil=group(eyes,-k*.005,0,.019);
  ell(pupil,iris,0,-.001,0,.034,.039,.013);ell(pupil,ink,0,-.002,.010,.024,.029,.009);ell(pupil,eyeWhite,-.012,.017,.018,.009,.011,.004);
  eyesList.push({eyes,pupil,base:-k*.005});
  const browPts=[[-.046,.078,.214],[0,.088,.233],[.042,.075,.218]].map(q=>[q[0]+k*.101,q[1],q[2]-Math.abs(q[0]+k*.101)*.10]);const eyebrow=tube(head,brow,browPts.map(q=>[q[0],q[1]+(k===1?.015:0),q[2]]),.016);brows.push(eyebrow);
  // Very subtle cheek color, flush with the face.
  ell(head,blush,k*.158,-.060,.186,.036,.013,.005).rotation.y=k*.45;
 }
 ell(head,skin,0,-.035,.240,.048,.046,.040);
 tube(head,ink,[[-.068,-.092,.218],[-.033,-.116,.232],[.018,-.113,.233],[.070,-.078,.219]],.010);
 // Continuous hair cap with variable hairline and sculpted swept fringe.
 const hp=[],hi=[],rows=24,cols=64;
 for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){const a=i/cols*Math.PI*2,front=(Math.cos(a)+1)/2,end=2.17-1.02*Math.pow(front,2)+.10*Math.sin(a*3)*front,theta=.001+(end-.001)*j/rows,r=.284*(1+.022*Math.sin(a*5+theta*2));hp.push(Math.sin(a)*Math.sin(theta)*r,Math.cos(theta)*.275+.012,Math.cos(a)*Math.sin(theta)*.249-.005);}
 for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=j*(cols+1)+i,b=a+cols+1;hi.push(a,b,a+1,b,b+1,a+1);}
 const hg=new T.BufferGeometry();hg.setAttribute('position',new T.Float32BufferAttribute(hp,3));hg.setIndex(hi);hg.computeVertexNormals();mesh(head,hg,hair);
 // A swept, tapered fringe attaches to the cap; avoid the old disconnected curls.
 const fringe=ell(head,hair,-.075,.152,.184,.175,.076,.071);fringe.rotation.z=-.28;
 const lock=ell(head,hair,.086,.163,.180,.105,.064,.075);lock.rotation.z=.28;
 tube(head,hairLight,[[-.181,.16,.205],[-.102,.19,.245],[-.016,.195,.246]],.008);
 // One low, softly lobed chef bonnet, no tower of stacked spheres.
 const cap=group(head,-.030,.190,-.019);cap.rotation.z=-.19;
 lathe(cap,hatBand,[[0,0],[.238,0],[.264,.021],[.263,.073],[.248,.095],[0,.095]],0,0,0,.93);
 lathe(cap,hat,[[0,.065],[.228,.065],[.305,.092],[.335,.136],[.307,.19],[.208,.223],[.095,.237],[0,.238]],0,0,0,.88,.038);
 const badge=mesh(cap,new T.CylinderGeometry(.047,.047,.018,24),gold,.074,.043,.246);badge.rotation.x=Math.PI/2;
 box(cap,leather,.074,.043,.258,.035,.013,.008,.004);
 let last='',changed=-100;
 return {root,rig:{body,head,arms,elbows,grips},update(t,type){
  if(type!==last){last=type;changed=t;}
  const p=portraitIdle(t,changed);
  root.rotation.y=p.yaw;
  body.position.y=.12+.003*p.breath;body.rotation.z=p.roll;
  head.rotation.z=p.headRoll;head.rotation.x=.012*p.breath-.048*p.nod-.032*p.show;
  head.rotation.y=.075*p.glance;
  for(const {eyes,pupil,base} of eyesList){eyes.scale.y=p.blink;pupil.position.x=base+.010*p.glance;}
  brows[1].position.y=.008*p.nod+.007*p.show;
  tail.rotation.z=.31+.035*p.breath-.085*p.show;
  // Leg and foot anchors are unchanged; all weapon poses remain owned by the rig.
  for(let i=0;i<2;i++)legs[i].rotation.z=0;
 }};
}
