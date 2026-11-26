// Z2c9b: screenshot-driven facial surface and silhouette refinement; preserve Y3 anchors.
import {portraitIdle,loadoutAccent} from './three_z2c7_chef_portrait.js';
export function makeChefZ2c9b(T,rounded){
 const root=new T.Group(),body=new T.Group();root.add(body);body.position.y=.12;
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
 mass(body,teal,[[0,.30],[.17,.30],[.205,.37],[.225,.48],[.259,.60],[.278,.67],[.233,.735],[.125,.78],[0,.79]],0,0,0,.78).name='kett-jacket';
 ell(body,pants,0,.29,0,.226,.123,.165);
 mass(body,tealDark,[[0,.225],[.265,.225],[.254,.29],[.218,.37],[0,.38]],0,0,0,.79);
 const legs=[],arms=[],elbows=[],grips=[],eyesList=[],brows=[];
 for(const k of [-1,1]){
  const leg=group(root,k*.148,.42,0);legs.push(leg);
  mass(leg,pants,[[0,-.28],[.08,-.28],[.105,-.19],[.111,-.06],[.11,.03],[0,.055]],0,0,0,.94);
  const shoe=group(leg,k*.019,-.30,.04);shoe.rotation.y=k*.17;
  ell(shoe,dark,0,-.061,.051,.153,.038,.190);ell(shoe,sole,0,-.077,.051,.148,.019,.184);
  ell(shoe,leather,0,-.002,.068,.145,.101,.179);
  mass(shoe,leather,[[0,.018],[.107,.018],[.116,.072],[.112,.13],[.118,.147],[.105,.158],[0,.158]],0,0,-.033,.95);mass(shoe,dark,[[0,.12],[.116,.12],[.123,.132],[.121,.148],[0,.15]],0,0,-.033,.95);
  box(shoe,dark,0,.046,.134,.20,.045,.055,.019);box(shoe,brass,k*.060,.049,.168,.048,.042,.016,.010);box(shoe,leather,k*.060,.049,.179,.025,.020,.006,.003);
  const arm=group(body,k*.265,.685,0);arms.push(arm);
  mass(arm,teal,[[0,-.123],[.103,-.123],[.113,-.06],[.108,.009],[.071,.048],[0,.054]],0,0,0,.97);
  mass(arm,cream,[[0,-.142],[.100,-.142],[.107,-.125],[.109,-.10],[0,-.10]],0,0,0,.96);
  const elbow=group(arm,0,-.15,0);elbows.push(elbow);
  mass(elbow,skin,[[0,-.092],[.092,-.092],[.098,-.055],[.095,.005],[.071,.032],[0,.04]],0,0,0,.94);
  mass(elbow,dark,[[0,-.112],[.097,-.112],[.104,-.087],[.099,-.033],[.089,-.022],[0,-.022]],0,0,0,.96);
  box(elbow,leather,0,-.070,.098,.144,.048,.025,.012);
  const wrist=group(elbow,0,-.125,.015);grips.push(wrist);
  ell(wrist,dark,0,.022,0,.095,.073,.082);ell(wrist,skin,0,-.026,.023,.093,.059,.072);
  ell(wrist,skin,k*.066,.007,.039,.037,.055,.037).rotation.z=-k*.28;
 }
 // Cream jacket lapels and two-piece asymmetric chef apron, with red edge graphic.
 for(const k of [-1,1]){panel(body,cream,[[k*.07,.747],[k*.193,.693],[k*.162,.635],[k*.222,.555],[k*.195,.548],[k*.10,.636]],.216,.018,.72);cyl(body,brass,k*.18,.556,.217,.025,.025,.014).rotation.x=Math.PI/2;}
 panel(body,fold,[[-.19,.407],[.128,.405],[.241,.18],[.039,.147],[-.211,.213]],.175,.028,.18,'kett-apron-under');
 panel(body,cream,[[-.143,.408],[.159,.409],[.215,.205],[.023,.168],[-.181,.231]],.218,.024,.24,'kett-apron');
 panel(body,scarlet,[[-.181,.235],[-.170,.259],[.026,.198],[.202,.231],[.213,.205],[.026,.169]],.246,.010,.24,'kett-apron-red-hem');
 mass(body,dark,[[0,.36],[.229,.36],[.244,.38],[.239,.417],[.226,.425],[0,.425]],0,0,0,.83);
 box(body,brass,.020,.394,.215,.089,.061,.025,.014);box(body,dark,.020,.394,.232,.052,.032,.013,.005);
 const strap=panel(body,leather,[[-.24,.43],[-.17,.40],[.195,.725],[.142,.759]],.257,.023,.43,'kett-crossbody');
 const badge=cyl(body,brass,.133,.676,.291,.050,.050,.024);badge.rotation.x=Math.PI/2;
 const crest=cyl(body,dark,.133,.676,.305,.031,.031,.009);crest.rotation.x=Math.PI/2;
 tube(body,brass,[[.116,.677,.315],[.123,.661,.317],[.144,.661,.317],[.151,.677,.315]],.006);
 tube(body,brass,[[.126,.685,.315],[.132,.696,.315],[.129,.705,.315]],.004);
 const bag=group(body,-.255,.35,-.052);bag.rotation.z=-.18;box(bag,leather,0,0,0,.228,.223,.164,.039).name='kett-satchel';box(bag,dark,0,.066,.078,.222,.10,.041,.022);box(bag,brass,.025,.017,.108,.055,.064,.018,.008);box(bag,leather,.025,.017,.12,.029,.036,.012,.005);
 const vial=group(body,.213,.342,.115);vial.rotation.z=.16;cyl(vial,glass,0,-.008,0,.033,.032,.101);cyl(vial,spice,0,-.029,0,.034,.033,.055);cyl(vial,leather,0,.052,0,.023,.026,.032);cyl(vial,brass,0,.036,0,.036,.036,.013);
 // Side/back scarf silhouette, not just a thin ring.
 ell(body,skin,0,.791,0,.104,.105,.103);
 mass(body,redDark,[[0,.735],[.148,.735],[.18,.771],[.166,.81],[.115,.835],[0,.835]],0,0,0,.95);
 panel(body,scarlet,[[-.182,.806],[.15,.792],[.13,.732],[.031,.66],[-.092,.714]],.17,.036,.35,'kett-scarf-front');
 const tail=group(body,-.115,.77,-.13);
 sweep(tail,scarlet,[[0,0,0],[-.12,-.005,-.08],[-.23,-.042,-.09],[-.31,-.08,-.07]],[.046,.079,.063,0],[.03,.028,.015,0],'kett-scarf-tail');
 sweep(tail,redDark,[[0,-.01,0],[-.07,-.085,-.09],[-.14,-.153,-.12]],[.035,.054,0],[.027,.023,0],'kett-scarf-tail-lower');
 ell(body,scarlet,-.126,.779,-.143,.071,.055,.058);
 // A sculpted squared-off hero face: narrower temples, heavy cheek/jaw, protruding chin.
 const head=group(body,0,.986,0);
 // Parametric facial surface. Invert the SAME deformed sphere used by the mesh.
 const sp=(x,p)=>Math.sign(x)*Math.abs(x)**p;
 function facePoint(x,y,z){
  const jaw=1+.095*Math.exp(-((y+.40)**2)*8)-.055*Math.max(0,y),front=Math.max(0,z);
  const cheek=.017*Math.exp(-((Math.abs(x)-.61)**2*12+(y+.18)**2*15))*front;
  const chin=.016*Math.exp(-((y+.68)**2*19+x*x*7))*front;
  return [sp(x,.90)*.269*jaw,sp(y,.92)*.266,sp(z,.92)*.229+cheek+chin];
 }
 const faceGeo=new T.SphereGeometry(1,56,40),fp=faceGeo.attributes.position;
 for(let i=0;i<fp.count;i++)fp.setXYZ(i,...facePoint(fp.getX(i),fp.getY(i),fp.getZ(i)));
 faceGeo.computeVertexNormals();mesh(head,faceGeo,skin).name='kett-squared-face';
 function surfaceZ(X,Y){
  const y=sp(Math.max(-.999,Math.min(.999,Y/.266)),1/.92),jaw=1+.095*Math.exp(-((y+.40)**2)*8)-.055*Math.max(0,y);
  const x=sp(X/(.269*jaw),1/.90),z=Math.sqrt(Math.max(0,1-x*x-y*y));return facePoint(x,y,z)[2];
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
  const x=k*.103,y=.035,eye=group(head);
  const lid=facePatch('kett-eye-lid',ink,almond(x,y,.074,.040,k),.004,eye);
  facePatch('kett-eye-white',white,almond(x,y,.066,.033,k),.006,eye);
  const pupil=group(eye);
  facePatch('kett-iris',iris,oval(x-k*.004,y,.029,.031),.010,pupil);
  facePatch('kett-pupil',ink,oval(x-k*.004,y,.019,.024),.013,pupil);
  facePatch('kett-eye-glint',white,oval(x-k*.004-.007,y+.012,.006,.007),.016,pupil);
  // Keep the projected eye itself in place; blink with a skin-colored eyelid
  // covering the aperture, with no shrinking of the face-space coordinates.
  const blink=facePatch('kett-blink',skin,almond(x,y,.077,.044,k),.021);blink.visible=false;
  eyesList.push({eye,pupil,base:0,blink});
  const eyebrow=new T.Shape();eyebrow.moveTo(x-.062,.090+k*.006);eyebrow.quadraticCurveTo(x-.007,.125+k*.007,x+.065,.098+k*.012);eyebrow.lineTo(x+.057,.123+k*.012);eyebrow.quadraticCurveTo(x-.012,.153+k*.005,x-.065,.118+k*.006);eyebrow.closePath();
  brows.push(facePatch('kett-angular-brow',hair,eyebrow,.012));
  sweep(head,hair,[[k*.238,.130,.060],[k*.262,.062,.083],[k*.241,-.069,.105]],[.037,.039,0],[.039,.032,0],'kett-sideburn');
 }
 // Low, blended wedge-like nose, with a warm shadow instead of a ball-on-ball.
 const nose=ell(head,skin,0,-.018,.229,.047,.048,.042);nose.rotation.x=-.16;
 ell(head,skinWarm,0,-.047,.252,.029,.010,.012);
 const smile=new T.Shape();smile.moveTo(-.082,-.095);smile.quadraticCurveTo(-.009,-.125,.087,-.075);smile.quadraticCurveTo(.051,-.145,-.014,-.139);smile.quadraticCurveTo(-.065,-.132,-.082,-.095);smile.closePath();
 facePatch('kett-grin',ink,smile,.005);
 const smileTeeth=new T.Shape();smileTeeth.moveTo(-.065,-.105);smileTeeth.quadraticCurveTo(-.001,-.125,.071,-.085);smileTeeth.quadraticCurveTo(.027,-.125,-.012,-.128);smileTeeth.quadraticCurveTo(-.047,-.126,-.065,-.105);smileTeeth.closePath();
 facePatch('kett-teeth-band',teeth,smileTeeth,.008);
 const patch=box(head,cream,-.190,-.077,surfaceZ(-.190,-.077),.044,.023,.006,.004);patch.rotation.set(.10,-.48,.60);
 // Hair cap and large tapered swept locks, intentionally asymmetric and visible in silhouette.
 ell(head,hair,0,.116,-.072,.269,.200,.213);
 const locks=[
  [[-.13,.177,.146],[-.058,.226,.167],[.014,.276,.159],[.007,.328,.130]],
  [[-.025,.177,.154],[.082,.224,.160],[.159,.293,.103],[.194,.352,.033]],
  [[.085,.157,.107],[.180,.191,.116],[.275,.220,.068],[.341,.275,-.012]],
  [[.167,.094,.047],[.264,.109,.023],[.317,.106,-.023],[.361,.151,-.061]],
  [[.173,-.032,-.04],[.282,-.017,-.064],[.337,.023,-.111]],
  [[-.175,.094,-.11],[-.275,.12,-.137],[-.335,.165,-.152]],
  [[-.132,-.08,-.145],[-.23,-.06,-.20],[-.267,.015,-.225]]
 ];
 locks.forEach((v,i)=>sweep(head,i===1?hairEdge:hair,v,i<4?[.052,.063,.033,0].slice(0,v.length):[.055,.057,0],i<4?[.060,.055,.029,0].slice(0,v.length):[.050,.037,0],'kett-hair-lock-'+i));
 // Tall biased chef crown with a curling fold and red cross stitch, not a flat bonnet.
 const cap=group(head,-.079,.217,-.057);cap.rotation.z=.15;
 mass(cap,fold,[[0,0],[.209,0],[.224,.018],[.221,.060],[.209,.074],[0,.09]],0,0,0,.90);
 mass(cap,cream,[[0,.062],[.195,.062],[.251,.109],[.264,.173],[.231,.229],[.143,.258],[0,.264]],0,0,0,.94,-.054,.08).name='kett-cap-crown';
 sweep(cap,cream,[[-.183,.13,.10],[-.199,.215,.107],[-.117,.281,.112],[-.038,.245,.151],[-.069,.191,.182]],[.049,.061,.057,.032,0],[.062,.059,.050,.028,0],'kett-cap-curl');
 const stitch=group(cap,-.020,.034,.217);box(stitch,scarlet,0,0,0,.059,.014,.012,.004).rotation.z=.72;box(stitch,scarlet,0,0,0,.059,.014,.012,.004).rotation.z=-.72;
 let last='',changed=-100;
 return {root,rig:{body,head,arms,elbows,grips},update(t,type,level){
  const key=type+':'+(level??0);if(key!==last){last=key;changed=t;}
  const p=portraitIdle(t,changed),a=level===undefined?{pitch:0,yaw:0,roll:0,turn:0,brow:0}:loadoutAccent(t,changed,type);
  root.rotation.y=p.yaw+a.turn;body.position.y=.12+.003*p.breath;body.rotation.z=p.roll;
  head.rotation.set(.012*p.breath-.048*p.nod-.032*p.show+a.pitch,.075*p.glance+a.yaw,p.headRoll+a.roll);
  for(const {eye,blink} of eyesList){const closed=p.blink<.43;eye.visible=!closed;blink.visible=closed;}
  brows[1].position.y=.003*p.nod+.003*p.show+a.brow*.25;tail.rotation.z=.04*p.breath-.07*p.show;tail.rotation.y=.06*p.breath;
 }};
}
