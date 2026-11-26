// Kett concept reconstruction: new shape language, old Y3 grip anchors.
import {portraitIdle,loadoutAccent} from './three_z2c7_chef_portrait.js';
export function makeChefZ2c9(T,rounded){
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
 mass(body,teal,[[0,.30],[.17,.30],[.205,.37],[.225,.48],[.285,.60],[.305,.67],[.255,.735],[.125,.78],[0,.79]],0,0,0,.78).name='kett-jacket';
 ell(body,pants,0,.29,0,.226,.123,.165);
 mass(body,tealDark,[[0,.225],[.265,.225],[.254,.29],[.218,.37],[0,.38]],0,0,0,.79);
 const legs=[],arms=[],elbows=[],grips=[],eyesList=[],brows=[];
 for(const k of [-1,1]){
  const leg=group(root,k*.148,.42,0);legs.push(leg);
  mass(leg,pants,[[0,-.28],[.08,-.28],[.105,-.19],[.111,-.06],[.11,.03],[0,.055]],0,0,0,.94);
  const shoe=group(leg,k*.019,-.30,.04);shoe.rotation.y=k*.17;
  box(shoe,sole,0,-.078,.048,.30,.064,.365,.05);
  ell(shoe,leather,0,-.012,.067,.151,.103,.185);
  mass(shoe,dark,[[0,.018],[.11,.018],[.118,.11],[.126,.145],[.115,.165],[0,.165]],0,0,-.033,.9);
  mass(shoe,leather,[[0,.102],[.13,.102],[.138,.132],[.133,.16],[0,.16]],0,0,-.033,.92);
  box(shoe,leather,0,.051,.121,.244,.054,.095,.021);box(shoe,brass,k*.063,.059,.176,.058,.055,.025,.013);
  const arm=group(body,k*.265,.685,0);arms.push(arm);
  mass(arm,teal,[[0,-.123],[.113,-.123],[.124,-.06],[.124,.009],[.085,.048],[0,.054]],0,0,0,.97);
  mass(arm,cream,[[0,-.142],[.108,-.142],[.116,-.125],[.117,-.10],[0,-.10]],0,0,0,.96);
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
 const head=group(body,0,.987,0);
 const faceGeo=new T.SphereGeometry(1,40,28),fp=faceGeo.attributes.position,sp=(x,p)=>Math.sign(x)*Math.abs(x)**p;
 for(let i=0;i<fp.count;i++){const x=fp.getX(i),y=fp.getY(i),z=fp.getZ(i),jaw=1+.17*Math.exp(-((y+.42)**2)*9)-.09*Math.max(0,y),front=Math.max(0,z),cheek=.026*Math.exp(-((Math.abs(x)-.64)**2*11+(y+.24)**2*14))*front,chin=.023*Math.exp(-((y+.70)**2*20+x*x*7))*front;fp.setXYZ(i,sp(x,.82)*.281*jaw,sp(y,.91)*.263,sp(z,.90)*.229+cheek+chin);}
 faceGeo.computeVertexNormals();mesh(head,faceGeo,skin).name='kett-squared-face';
 for(const k of [-1,1]){
  ell(head,skin,k*.286,-.018,-.017,.066,.078,.053);ell(head,skinWarm,k*.319,-.015,.013,.021,.040,.022);
  const eye=group(head,k*.108,.032,.216);eye.rotation.y=k*.22;eye.rotation.z=k*.15;
  ell(eye,white,0,0,0,.062,.044,.024);const pupil=group(eye,-k*.004,.003,.021);
  ell(pupil,iris,0,0,0,.038,.036,.013);ell(pupil,ink,0,0,.009,.024,.029,.009);ell(pupil,white,-.012,.014,.017,.009,.010,.004);
  eyesList.push({eye,pupil,base:-k*.004});
  const eyebrow=sweep(head,hair,[[k*.046,.106,.237],[k*.111,.137+(k===1?.018:0),.236],[k*.185,.101,.197]],[.019,.033,.007],[.014,.024,.004],'kett-angular-brow');brows.push(eyebrow);
  sweep(head,hair,[[k*.258,.126,.065],[k*.282,.061,.099],[k*.257,-.081,.105]],[.044,.049,0],[.045,.039,0],'kett-sideburn');
 }
 ell(head,skinWarm,0,-.027,.237,.056,.049,.050);ell(head,skin,0,-.018,.248,.050,.041,.051);
 // Graphic toothy asymmetrical grin set into the front surface.
 const mouth=group(head,.012,-.101,.234);mouth.rotation.z=.13;
 ell(mouth,ink,0,0,0,.112,.047,.018).name='kett-grin';
 ell(mouth,teeth,-.002,.012,.014,.096,.020,.008);
 tube(mouth,skinWarm,[[-.09,-.028,.005],[0,-.045,.014],[.09,-.017,.007]],.006);
 const patch=box(head,cream,-.194,-.077,.192,.060,.032,.009,.006);patch.rotation.set(.10,-.52,.60);
 // Hair cap and large tapered swept locks, intentionally asymmetric and visible in silhouette.
 ell(head,hair,0,.103,-.064,.287,.207,.222);
 const locks=[
  [[-.12,.122,.17],[-.042,.209,.195],[.028,.286,.184],[.013,.352,.145]],
  [[-.01,.145,.18],[.112,.215,.171],[.196,.285,.120],[.214,.364,.045]],
  [[.095,.115,.13],[.218,.164,.12],[.311,.207,.065],[.375,.253,-.012]],
  [[.167,.06,.055],[.284,.088,.021],[.348,.075,-.024],[.399,.132,-.061]],
  [[.173,-.032,-.04],[.282,-.017,-.064],[.337,.023,-.111]],
  [[-.175,.094,-.11],[-.275,.12,-.137],[-.335,.165,-.152]],
  [[-.132,-.08,-.145],[-.23,-.06,-.20],[-.267,.015,-.225]]
 ];
 locks.forEach((v,i)=>sweep(head,i===1?hairEdge:hair,v,i<4?[.069,.080,.042,0].slice(0,v.length):[.055,.057,0],i<4?[.073,.064,.035,0].slice(0,v.length):[.050,.037,0],'kett-hair-lock-'+i));
 // Tall biased chef crown with a curling fold and red cross stitch, not a flat bonnet.
 const cap=group(head,-.097,.191,-.043);cap.rotation.z=.23;
 mass(cap,fold,[[0,0],[.224,0],[.242,.018],[.238,.072],[.218,.09],[0,.09]],0,0,0,.90);
 mass(cap,cream,[[0,.062],[.205,.062],[.287,.111],[.295,.176],[.250,.235],[.161,.267],[0,.272]],0,0,0,.94,-.073,.12).name='kett-cap-crown';
 sweep(cap,cream,[[-.207,.14,.06],[-.228,.236,.073],[-.136,.306,.077],[-.043,.278,.087],[-.066,.208,.117]],[.067,.078,.074,.048,0],[.082,.076,.071,.04,0],'kett-cap-curl');
 const stitch=group(cap,.037,.047,.222);box(stitch,scarlet,0,0,0,.059,.014,.012,.004).rotation.z=.72;box(stitch,scarlet,0,0,0,.059,.014,.012,.004).rotation.z=-.72;
 let last='',changed=-100;
 return {root,rig:{body,head,arms,elbows,grips},update(t,type,level){
  const key=type+':'+(level??0);if(key!==last){last=key;changed=t;}
  const p=portraitIdle(t,changed),a=level===undefined?{pitch:0,yaw:0,roll:0,turn:0,brow:0}:loadoutAccent(t,changed,type);
  root.rotation.y=p.yaw+a.turn;body.position.y=.12+.003*p.breath;body.rotation.z=p.roll;
  head.rotation.set(.012*p.breath-.048*p.nod-.032*p.show+a.pitch,.075*p.glance+a.yaw,p.headRoll+a.roll);
  for(const {eye,pupil,base} of eyesList){eye.scale.y=p.blink;pupil.position.x=base+.010*p.glance;}
  brows[1].position.y=.008*p.nod+.007*p.show+a.brow;tail.rotation.z=.04*p.breath-.07*p.show;tail.rotation.y=.06*p.breath;
 }};
}
