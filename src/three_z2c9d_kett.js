// Z2c9d: longer-limb hero proportion study, atelier only. Not compatible with old IK lengths.
import {portraitIdle,loadoutAccent} from './three_z2c7_chef_portrait.js';
export function makeChefZ2c9d(T,rounded){
 const root=new T.Group(),body=new T.Group();root.add(body);body.position.y=.21;body.scale.y=1.10;
 const mat=(color,roughness=.78,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
 const skin=mat('#e9a876'),skinWarm=mat('#c97f54'),hair=mat('#482b24'),hairEdge=mat('#75452e'),ink=mat('#38231e'),teeth=mat('#fff1d6'),white=mat('#fff1dc'),iris=mat('#9a5831'),teal=mat('#2b6874'),tealDark=mat('#234c58'),cream=mat('#f2dbb0'),fold=mat('#cdb087'),scarlet=mat('#b8362f'),redDark=mat('#8e2926'),pants=mat('#403b3a'),leather=mat('#75452e'),dark=mat('#4b3026'),sole=mat('#b07c49'),brass=mat('#d8a04c',.43,.42),copper=mat('#b76534',.42,.35),spice=mat('#e05b32'),glass=mat('#e8c49c',.33);
 const sphere=new T.SphereGeometry(1,24,16);
 function group(p,x=0,y=0,z=0){const o=new T.Group();o.position.set(x,y,z);p.add(o);return o;}
 function mesh(p,g,m,x=0,y=0,z=0){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;p.add(o);return o;}
 function ell(p,m,x,y,z,a,b,c){const o=mesh(p,sphere,m,x,y,z);o.scale.set(a,b,c);return o;}
 function box(p,m,x,y,z,w,h,d,r=.035){return mesh(p,rounded(w,h,d,r),m,x,y,z);}
 function tube(p,m,pts,r){return mesh(p,new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(v=>new T.Vector3(...v))),20,r,8,false),m);}
 function cyl(p,m,x,y,z,rt,rb,h){return mesh(p,new T.CylinderGeometry(rt,rb,h,20),m,x,y,z);}
 // Profile surfaces with continuous curved masses and optional eccentric crown.
 function mass(p,m,pts,x=0,y=0,z=0,depth=1,shift=0,lobe=0){
  const curve=new T.SplineCurve(pts.map(q=>new T.Vector2(...q))),g=new T.LatheGeometry(curve.getPoints(32).map(q=>new T.Vector2(Math.max(0,q.x),q.y)),32),a=g.attributes.position;
  const lo=pts[0][1],hi=pts.at(-1)[1];for(let i=0;i<a.count;i++){const X=a.getX(i),Y=a.getY(i),Z=a.getZ(i),u=Math.max(0,Math.min(1,(Y-lo)/(hi-lo))),f=1+lobe*Math.cos(5*Math.atan2(X,Z)+u*1.2)*Math.sin(Math.PI*u);a.setXYZ(i,X*f+shift*u*u,Y,Z*f*depth);}
  g.computeVertexNormals();return mesh(p,g,m,x,y,z);
 }
 // Tapered curving solid locks / folds; each has a sculptural changing cross section.
 function sweep(p,m,pts,widths,depths,name){
  const curve=new T.CatmullRomCurve3(pts.map(q=>new T.Vector3(...q))),verts=[],idx=[],n=24,k=16;
  function sample(a,u){const v=u*(a.length-1),j=Math.min(a.length-2,Math.floor(v));return a[j]+(a[j+1]-a[j])*(v-j);}
  for(let i=0;i<=n;i++){const u=i/n,c=curve.getPoint(u),t=curve.getTangent(u),a=new T.Vector3(t.y,-t.x,0).normalize();if(a.lengthSq()<.01)a.set(1,0,0);const b=a.clone().cross(t).normalize();for(let j=0;j<=k;j++){const th=j/k*2*Math.PI,v=c.clone().addScaledVector(a,Math.max(.001,sample(widths,u))*Math.cos(th)).addScaledVector(b,Math.max(.001,sample(depths,u))*Math.sin(th));verts.push(v.x,v.y,v.z);}}
  for(let i=0;i<n;i++)for(let j=0;j<k;j++){const a=i*(k+1)+j,b=a+k+1;idx.push(a,b,a+1,b,b+1,a+1);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setIndex(idx);g.computeVertexNormals();const o=mesh(p,g,m);o.name=name||'';return o;
 }
 function panel(p,m,points,z,depth=.023,bend=.28,name=''){
  const s=new T.Shape();s.moveTo(...points[0]);for(const v of points.slice(1))s.lineTo(...v);s.closePath();
  const g=new T.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelThickness:.008,bevelSize:.008,bevelSegments:2,steps:1}),a=g.attributes.position;for(let i=0;i<a.count;i++)a.setZ(i,a.getZ(i)-bend*a.getX(i)**2);g.computeVertexNormals();const o=mesh(p,g,m,0,0,z);o.name=name;return o;
 }
 // Trapezoid jacket with broad shoulder volume, narrow waist and distinct coat tails.
 mass(body,teal,[[0,.30],[.160,.30],[.187,.37],[.207,.48],[.283,.59],[.306,.657],[.274,.708],[.145,.766],[0,.78]],0,0,0,.91).name='kett-jacket';
 ell(body,pants,0,.29,0,.226,.123,.165);
 mass(body,tealDark,[[0,.205],[.260,.205],[.243,.275],[.196,.37],[0,.38]],0,0,0,.88);
 const legs=[],arms=[],elbows=[],grips=[],eyesList=[],brows=[];
 for(const k of [-1,1]){
  const leg=group(root,k*.161,.53,0);legs.push(leg);
  mass(leg,pants,[[0,-.37],[.088,-.37],[.113,-.28],[.129,-.15],[.127,-.025],[.120,.045],[0,.065]],0,0,0,.94);
  const shoe=group(leg,k*.019,-.41,.04);shoe.rotation.y=k*.17;
  ell(shoe,dark,0,-.061,.051,.153,.038,.190);ell(shoe,sole,0,-.077,.051,.148,.019,.184);
  ell(shoe,leather,0,-.002,.068,.145,.101,.179);
  mass(shoe,leather,[[0,.018],[.107,.018],[.116,.075],[.116,.145],[.120,.190],[.111,.205],[0,.205]],0,0,-.033,.95);mass(shoe,dark,[[0,.17],[.118,.17],[.125,.183],[.122,.200],[0,.203]],0,0,-.033,.95);
  box(shoe,dark,0,.046,.134,.20,.045,.055,.019);box(shoe,brass,k*.060,.049,.168,.048,.042,.016,.010);box(shoe,leather,k*.060,.049,.179,.025,.020,.006,.003);
  const arm=group(body,k*.285,.685,0);arms.push(arm);
  mass(arm,teal,[[0,-.172],[.102,-.172],[.106,-.145],[.116,-.094],[.132,-.034],[.126,.012],[.103,.049],[0,.064]],0,0,0,1.03).name='kett-long-sleeve';
  mass(arm,cream,[[0,-.192],[.101,-.192],[.114,-.185],[.119,-.165],[.114,-.147],[0,-.147]],0,0,0,.98);
  const elbow=group(arm,0,-.21,0);elbows.push(elbow);
  mass(elbow,skin,[[0,-.163],[.074,-.163],[.082,-.128],[.098,-.080],[.105,-.026],[.085,.020],[.062,.042],[0,.05]],0,0,0,.97).name='kett-long-forearm';
  mass(elbow,dark,[[0,-.174],[.085,-.174],[.099,-.166],[.105,-.137],[.108,-.096],[.104,-.084],[0,-.084]],0,0,0,1.0);
  box(elbow,leather,0,-.118,.101,.139,.055,.022,.010);box(elbow,brass,k*.045,-.117,.116,.039,.030,.009,.005);
  const wrist=group(elbow,0,-.185,.015);grips.push(wrist);
  ell(wrist,dark,0,.011,-.007,.103,.087,.092);const fist=ell(wrist,skin,0,-.059,.025,.091,.071,.075);fist.rotation.z=k*.12;fist.name='kett-clenched-fist';
  for(let j=0;j<3;j++){const finger=ell(wrist,skin,(j-1)*.046,-.055-j*.005,.067,.028,.044,.030);finger.rotation.z=k*.08;}
  ell(wrist,skin,-k*.069,-.026,.053,.039,.063,.045).rotation.z=k*.32;
 }
 // Cream jacket lapels and two-piece asymmetric chef apron, with red edge graphic.
 for(const k of [-1,1]){panel(body,cream,[[k*.067,.735],[k*.193,.704],[k*.171,.647],[k*.219,.566],[k*.201,.553],[k*.105,.644]],.258,.018,.62);cyl(body,brass,k*.18,.556,.255,.025,.025,.014).rotation.x=Math.PI/2;}
 panel(body,fold,[[-.19,.407],[.128,.405],[.241,.18],[.039,.147],[-.211,.213]],.175,.028,.18,'kett-apron-under');
 panel(body,cream,[[-.143,.408],[.159,.409],[.215,.205],[.023,.168],[-.181,.231]],.218,.024,.24,'kett-apron');
 panel(body,scarlet,[[-.170,.248],[-.159,.270],[.025,.210],[.192,.242],[.203,.216],[.025,.181]],.259,.011,.24,'kett-apron-red-hem');
 mass(body,dark,[[0,.36],[.229,.36],[.244,.38],[.239,.417],[.226,.425],[0,.425]],0,0,0,.83);
 box(body,brass,.020,.394,.215,.089,.061,.025,.014);box(body,dark,.020,.394,.232,.052,.032,.013,.005);
 const strap=panel(body,leather,[[-.217,.43],[-.158,.40],[.190,.725],[.143,.755]],.294,.023,.52,'kett-crossbody');
 const badge=cyl(body,brass,.133,.676,.320,.050,.050,.024);badge.rotation.x=Math.PI/2;
 const crest=cyl(body,dark,.133,.676,.334,.031,.031,.009);crest.rotation.x=Math.PI/2;
 tube(body,brass,[[.116,.677,.344],[.123,.661,.346],[.144,.661,.346],[.151,.677,.344]],.006);
 tube(body,brass,[[.126,.685,.344],[.132,.696,.344],[.129,.705,.344]],.004);
 const bag=group(body,-.255,.35,-.052);bag.rotation.z=-.18;box(bag,leather,0,0,0,.228,.223,.164,.039).name='kett-satchel';box(bag,dark,0,.066,.078,.222,.10,.041,.022);box(bag,brass,.025,.017,.108,.055,.064,.018,.008);box(bag,leather,.025,.017,.12,.029,.036,.012,.005);
 const vial=group(body,.213,.342,.115);vial.rotation.z=.16;cyl(vial,glass,0,-.008,0,.033,.032,.101);cyl(vial,spice,0,-.029,0,.034,.033,.055);cyl(vial,leather,0,.052,0,.023,.026,.032);cyl(vial,brass,0,.036,0,.036,.036,.013);
 // Side/back scarf silhouette, not just a thin ring.
 ell(body,skin,0,.791,0,.104,.105,.103);
 mass(body,redDark,[[0,.735],[.148,.735],[.18,.771],[.166,.81],[.115,.835],[0,.835]],0,0,0,.95);
 panel(body,scarlet,[[-.183,.801],[.175,.794],[.148,.735],[.034,.642],[-.102,.708]],.236,.039,.48,'kett-scarf-front');
 const tail=group(body,-.115,.77,-.13);
 sweep(tail,scarlet,[[0,0,0],[-.12,-.005,-.08],[-.23,-.042,-.09],[-.31,-.08,-.07]],[.046,.079,.063,0],[.03,.028,.015,0],'kett-scarf-tail');
 sweep(tail,redDark,[[0,-.01,0],[-.07,-.085,-.09],[-.14,-.153,-.12]],[.035,.054,0],[.027,.023,0],'kett-scarf-tail-lower');
 ell(body,scarlet,-.126,.779,-.143,.071,.055,.058);
 // A sculpted squared-off hero face: narrower temples, heavy cheek/jaw, protruding chin.
 const head=group(body,0,.945,0);head.scale.set(.73,.75,.79);
 // Parametric facial surface. Invert the SAME deformed sphere used by the mesh.
 const sp=(x,p)=>Math.sign(x)*Math.abs(x)**p;
 function jawWidth(y){return 1+.15*Math.exp(-((y+.53)**2)*12)-.065*Math.max(0,y)-.06*Math.exp(-((y+.96)**2)*50);}
 function facePoint(x,y,z){
  const jaw=jawWidth(y),front=Math.max(0,z);
  const cheek=.030*Math.exp(-((Math.abs(x)-.57)**2*14+(y+.28)**2*18))*front;
  const chin=.024*Math.exp(-((y+.73)**2*25+x*x*8))*front;
  const brow=.024*Math.exp(-((Math.abs(x)-.40)**2*12+(y-.44)**2*30))*front;
  const socket=.017*Math.exp(-((Math.abs(x)-.40)**2*22+(y-.16)**2*50))*front;
  return [sp(x,.70)*.269*jaw,sp(y,.78)*.266,sp(z,.86)*.229+cheek+chin+brow-socket];
 }
 const faceGeo=new T.SphereGeometry(1,56,40),fp=faceGeo.attributes.position;
 for(let i=0;i<fp.count;i++)fp.setXYZ(i,...facePoint(fp.getX(i),fp.getY(i),fp.getZ(i)));
 faceGeo.computeVertexNormals();mesh(head,faceGeo,skin).name='kett-squared-face';
 function surfaceZ(X,Y){
  const y=sp(Math.max(-.999,Math.min(.999,Y/.266)),1/.78),jaw=jawWidth(y);
  const x=sp(X/(.269*jaw),1/.70),z=Math.sqrt(Math.max(0,1-x*x-y*y));return facePoint(x,y,z)[2];
 }
 // Face paint-like surface patches tessellated in 2D, then projected on the
 // actual 3D face. No floating globes or separate tooth blocks.
 function facePatch(name,m,shape,offset,parent=head){
  const g=new T.ShapeGeometry(shape,24),pos=g.attributes.position;
  // Subdivide triangles for the curved face instead of projecting only the border.
  const raw=g.toNonIndexed(),v=raw.attributes.position,out=[];
  function sub(a,b,c,n){if(!n){for(const q of [a,b,c])out.push(q[0],q[1],surfaceZ(q[0],q[1])+offset);return;}
   const mid=(p,q)=>[(p[0]+q[0])*.5,(p[1]+q[1])*.5],ab=mid(a,b),bc=mid(b,c),ca=mid(c,a);
   sub(a,ab,ca,n-1);sub(ab,b,bc,n-1);sub(ca,bc,c,n-1);sub(ab,bc,ca,n-1);}
  for(let i=0;i<v.count;i+=3)sub([v.getX(i),v.getY(i)],[v.getX(i+1),v.getY(i+1)],[v.getX(i+2),v.getY(i+2)],2);
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(out,3));geo.computeVertexNormals();
  g.dispose();raw.dispose();const o=mesh(parent,geo,m);o.name=name;o.castShadow=false;o.receiveShadow=false;return o;
 }
 function oval(x,y,w,h){const s=new T.Shape();s.absellipse(x,y,w,h,0,Math.PI*2,false,0);return s;}
 function almond(cx,cy,w,h,k){const s=new T.Shape();s.moveTo(cx-w,cy-k*.008);s.quadraticCurveTo(cx-.015,cy+h*1.48,cx+w,cy+k*.008);s.quadraticCurveTo(cx,cy-h*1.18,cx-w,cy-k*.008);return s;}
 for(const k of [-1,1]){
  ell(head,skin,k*.263,-.012,-.021,.058,.072,.047);ell(head,skinWarm,k*.294,-.011,.010,.016,.032,.016);
  const x=k*.106,y=.047,eye=group(head);
  const lid=facePatch('kett-eye-lid',ink,almond(x,y,.077,.039,k),.006,eye);
  facePatch('kett-eye-white',white,almond(x,y-.004,.068,.033,k),.009,eye);
  const pupil=group(eye);
  facePatch('kett-iris',iris,oval(x-k*.009,y-.003,.026,.029),.013,pupil);
  facePatch('kett-pupil',ink,oval(x-k*.009,y-.003,.017,.022),.016,pupil);
  facePatch('kett-eye-glint',white,oval(x-k*.009-.007,y+.009,.005,.006),.019,pupil);
  // Keep the projected eye itself in place; blink with a skin-colored eyelid
  // covering the aperture, with no shrinking of the face-space coordinates.
  const blink=facePatch('kett-blink',skin,almond(x,y,.080,.046,k),.024);blink.visible=false;
  eyesList.push({eye,pupil,base:0,blink});
  const eyebrow=new T.Shape();const inner=x-k*.061,outer=x+k*.068,arch=x+k*.020,raise=k===1?.012:0;eyebrow.moveTo(inner,.090+raise);eyebrow.quadraticCurveTo(arch,.114+raise,outer,.093+raise);eyebrow.lineTo(outer,.123+raise);eyebrow.quadraticCurveTo(arch,.156+raise,inner,.126+raise);eyebrow.closePath();
  brows.push(facePatch('kett-angular-brow',hair,eyebrow,.010));
  sweep(head,hair,[[k*.238,.130,.060],[k*.262,.062,.083],[k*.241,-.069,.105]],[.037,.039,0],[.039,.032,0],'kett-sideburn');
 }
 // Low, blended wedge-like nose, with a warm shadow instead of a ball-on-ball.
 const bridge=ell(head,skin,0,.012,.227,.036,.067,.030);bridge.rotation.x=-.20;const nose=ell(head,skin,0,-.025,.251,.047,.035,.030);nose.rotation.x=-.12;
 ell(head,skinWarm,-.024,-.046,.262,.012,.006,.006);ell(head,skinWarm,.024,-.046,.262,.012,.006,.006);
 const smile=new T.Shape();smile.moveTo(-.093,-.100);smile.quadraticCurveTo(-.022,-.121,.065,-.091);smile.quadraticCurveTo(.089,-.080,.100,-.067);smile.quadraticCurveTo(.092,-.092,.065,-.103);smile.quadraticCurveTo(-.024,-.133,-.093,-.100);smile.closePath();
 facePatch('kett-grin',ink,smile,.005);
 const patch=box(head,cream,-.190,-.077,surfaceZ(-.190,-.077),.044,.023,.006,.004);patch.rotation.set(.10,-.48,.60);
 // Hair cap and large tapered swept locks, intentionally asymmetric and visible in silhouette.
 ell(head,hair,0,.125,-.073,.268,.201,.214);
 const locks=[
  [[-.156,.182,.137],[-.089,.231,.159],[-.025,.272,.156],[-.015,.302,.134]],
  [[-.068,.188,.141],[.028,.235,.180],[.107,.307,.150],[.128,.397,.079]],
  [[.063,.175,.125],[.154,.227,.135],[.238,.248,.087],[.308,.315,.002]],
  [[.166,.104,.047],[.250,.145,.023],[.315,.142,-.023],[.369,.190,-.061]],
  [[.173,-.032,-.04],[.282,-.017,-.064],[.337,.023,-.111]],
  [[-.175,.094,-.11],[-.275,.12,-.137],[-.335,.165,-.152]],
  [[-.132,-.08,-.145],[-.23,-.06,-.20],[-.267,.015,-.225]]
 ];
 locks.forEach((v,i)=>sweep(head,i===1?hairEdge:hair,v,i===1?[.075,.080,.043,0]:i===2?[.065,.067,.034,0]:i<4?[.037,.051,.025,0]:[.045,.046,0],i===1?[.081,.068,.031,0]:i<4?[.055,.049,.025,0]:[.041,.031,0],'kett-hair-lock-'+i));
 // Tall biased chef crown with a curling fold and red cross stitch, not a flat bonnet.
 const cap=group(head,-.105,.207,-.063);cap.rotation.z=.28;
 mass(cap,fold,[[0,0],[.209,0],[.224,.018],[.221,.060],[.209,.074],[0,.09]],0,0,0,.90);
 mass(cap,cream,[[0,.062],[.181,.062],[.235,.106],[.248,.161],[.205,.224],[.138,.287],[0,.310]],0,0,0,.94,-.065,.16).name='kett-cap-crown';
 sweep(cap,cream,[[-.171,.115,.093],[-.208,.209,.114],[-.160,.302,.136],[-.054,.290,.153],[-.032,.241,.179],[-.083,.224,.195]],[.064,.075,.061,.052,.038,0],[.068,.077,.068,.052,.033,0],'kett-cap-curl');
 const stitch=group(cap,-.055,.041,.209);box(stitch,scarlet,0,0,0,.059,.014,.012,.004).rotation.z=.72;box(stitch,scarlet,0,0,0,.059,.014,.012,.004).rotation.z=-.72;
 let last='',changed=-100;
 return {root,rig:{body,head,arms,elbows,grips},update(t,type,level){
  const key=type+':'+(level??0);if(key!==last){last=key;changed=t;}
  const p=portraitIdle(t,changed),a=level===undefined?{pitch:0,yaw:0,roll:0,turn:0,brow:0}:loadoutAccent(t,changed,type);
  root.rotation.y=p.yaw+a.turn;body.position.y=.21+.003*p.breath;body.rotation.z=p.roll;
  head.rotation.set(.012*p.breath-.048*p.nod-.032*p.show+a.pitch,.075*p.glance+a.yaw,p.headRoll+a.roll);
  for(const {eye,blink} of eyesList){const closed=p.blink<.43;eye.visible=!closed;blink.visible=closed;}
  brows[1].position.y=.003*p.nod+.003*p.show+a.brow*.25;tail.rotation.z=.04*p.breath-.07*p.show;tail.rotation.y=.06*p.breath;
 }};
}
