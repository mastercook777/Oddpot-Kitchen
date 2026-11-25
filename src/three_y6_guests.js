// Y6: species-specific silhouettes, anatomy and state-driven gestures.
// All geometry is shared by guest instances where possible; no simulation writes.
import {guestLife} from './three_y6_life.js?v=y6';
import {solveArm} from './three_y3d_pose.js?v=y5c3';
export function makeGuestFactory(T,rounded){
 const sphere=new T.SphereGeometry(1,16,12),cone=new T.ConeGeometry(1,1,12),cyl=new T.CylinderGeometry(1,1,1,16),torus=new T.TorusGeometry(1,.12,8,24);
 const mat=(c,extra={})=>new T.MeshStandardMaterial({color:c,roughness:.79,...extra});
 const skin=mat('#e6b38d'),warm=mat('#ad7454'),cream=mat('#f2dbad'),ink=mat('#292830'),bronze=mat('#c89957',{metalness:.38}),iron=mat('#627981',{metalness:.43}),leather=mat('#634838'),bark=mat('#97724a'),leaf=mat('#7ca654'),mint=mat('#b2e2c5'),white=mat('#f7f2dc'),blue=mat('#46698b'),violet=mat('#897ba8'),ghost=mat('#b7c7d3',{transparent:true,opacity:.86,depthWrite:false}),ghostDark=mat('#70849c'),slime=mat('#5eaa91',{roughness:.28,metalness:.05}),slimeLight=mat('#b4e8b5',{roughness:.32}),slimeDark=mat('#3a746c');
 const coats={gardener:['#718c4f','#8b9c5a','#66865a','#8b9869'],adventurer:['#55656c','#856448','#526c66','#7b5751'],family:['#b95e4b','#c78259','#aa7776','#c19b64'],stargazer:['#344d69','#56607e','#665879','#38626b']};
 const cloth=Object.fromEntries(Object.entries(coats).map(([k,cs])=>[k,cs.map(c=>mat(c))]));
 const beardMats=['#7b5037','#b48758','#64514a','#c9b7a1'].map(c=>mat(c));
 const capMats=['#b45c47','#bb8b5e','#9a6f9b','#c79357'].map(c=>mat(c));
 const group=(p,x=0,y=0,z=0)=>{const g=new T.Group();g.position.set(x,y,z);p?.add(g);return g;};
 function mesh(p,g,m,x,y,z,sx=1,sy=1,sz=1){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;o.receiveShadow=true;p.add(o);return o;}
 const ball=(p,m,x,y,z,a,b,c)=>mesh(p,sphere,m,x,y,z,a,b,c);
 const box=(p,m,x,y,z,w,h,d)=>mesh(p,rounded(w,h,d,.022),m,x,y,z);
 const cylinder=(p,m,x,y,z,r,h)=>mesh(p,cyl,m,x,y,z,r,h,r);
 const ring=(p,m,x,y,z,r)=>mesh(p,torus,m,x,y,z,r,r,r);
 function branch(p,m,a,b,r){const u=new T.Vector3(...a),v=new T.Vector3(...b),delta=v.clone().sub(u),o=cylinder(p,m,0,0,0,r,delta.length());o.position.copy(u.add(v).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return o;}
 const armLength=.21,foreLength=.20;
 function aimArm(arm,target,tipTarget=null){const s=arm.shoulder.position.toArray(),q=solveArm(s,target,[arm.sign,-.35,-.30],armLength,foreLength),v=a=>new T.Vector3(...a),upper=v(q.elbow).sub(v(s)).normalize(),lower=v(q.hand).sub(v(q.elbow)).normalize();
  arm.shoulder.quaternion.setFromUnitVectors(new T.Vector3(0,-1,0),upper);arm.elbow.quaternion.setFromUnitVectors(new T.Vector3(0,-1,0),lower.applyQuaternion(arm.shoulder.quaternion.clone().invert()));
  const inv=arm.shoulder.quaternion.clone().multiply(arm.elbow.quaternion).invert();arm.wrist.quaternion.copy(inv);
  if(tipTarget){const d=v(tipTarget).sub(v(q.hand));if(d.lengthSq()>.00001)arm.utensil.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),d.normalize());}
  return q.hand;
 }
 function create(kind){
  const root=group(),body=group(root),head=group(body),arms=[],legs=[],eyes=[],accents=[],special={};let mouth=[0,.78,.29],skinMat=skin,shoulderY=.57,shoulderX=.24,baseHeadY=.79;
  const isSlime=kind==='regular',isGhost=kind==='critic',isDwarf=kind==='adventurer',isFamily=kind==='family',isDeer=kind==='gardener';
  const outfit=cloth[kind]?.[0]||violet;
  function accent(o,kind='cloth'){accents.push({o,kind});return o;}
  function face(p,y,z,span=.10){for(const k of [-1,1]){const eye=ball(p,ink,k*span,y,z,.032,.047,.018);eyes.push(eye);ball(p,white,k*span-.009,y+.012,z+.014,.009,.012,.006);ball(p,warm,k*(span+.06),y-.075,z-.011,.037,.019,.012);}special.mouth=ball(p,ink,0,y-.115,z+.003,.043,.016,.012);}
  if(isSlime){
   head.position.set(0,.34,0);
   special.blob=ball(body,slime,0,.34,0,.43,.36,.39);ball(body,slimeDark,0,.13,0,.37,.12,.34);ball(body,slimeLight,-.19,.52,.18,.13,.045,.05);ball(body,slimeLight,.15,.46,-.16,.07,.036,.05);
   face(head,.09,.354,.125);special.mouth.position.y=-.04;mouth=[0,.30,.36];for(const k of [-1,1])special['pseudopod'+k]=ball(body,slime,k*.30,.22,.11,.14,.12,.15);
  }else if(isGhost){
   baseHeadY=.87;head.position.y=baseHeadY;skinMat=ghost;shoulderY=.59;shoulderX=.23;mouth=[0,.77,.25];
   const robe=new T.LatheGeometry([[0,0],[.10,.035],[.23,.12],[.32,.28],[.29,.53],[.19,.70],[0,.75]].map(a=>new T.Vector2(...a)),24);
   mesh(body,robe,ghostDark,0,.08,0);special.tail=group(body,0,.14,-.04);for(let j=0;j<3;j++){const o=ball(special.tail,ghostDark,(j-1)*.14,.03-j%2*.055,-.05,.13,.18,.12);o.rotation.z=(j-1)*.28;}
   ball(head,ghost,0,0,0,.26,.26,.24);face(head,.015,.229);box(head,ghostDark,0,.13,.211,.29,.055,.052);
   for(const k of [-1,1])ring(head,bronze,k*.107,.02,.255,.077);box(head,bronze,0,.02,.264,.06,.018,.02);
   const collar=ring(body,bronze,0,.67,.03,.20);collar.rotation.x=Math.PI/2;special.book=group(body,.20,.41,-.14);box(special.book,leather,0,0,0,.20,.25,.065);box(special.book,cream,0,0,.04,.16,.20,.025);
  }else{
   baseHeadY=isDwarf?.72:isFamily?.78:isDeer?.84:.81;head.position.y=baseHeadY;shoulderY=isDwarf?.52:.56;shoulderX=isDwarf?.27:.23;mouth=[0,baseHeadY-.10,.29];
   accent(ball(body,outfit,0,.42,0,isDwarf?.32:.25,isDwarf?.25:.28,.22));
   accent(ball(body,outfit,0,.27,0,.24,.14,.19));
   ball(head,isDeer?warm:skin,0,0,.025,isDwarf?.285:.245,isDwarf?.22:.245,.24);
   face(head,.015,.25);
   for(const k of [-1,1]){const leg=group(body,k*.12,.27,0);ball(leg,leather,0,-.12,.015,.11,.145,.12);ball(leg,isDwarf?iron:leather,0,-.235,.055,.125,.075,.16);legs.push(leg);}
   if(isDwarf){
    accent(ball(head,beardMats[0],0,-.13,.16,.25,.19,.18),'beard');for(const k of [-1,1]){accent(ball(head,beardMats[0],k*.14,-.19,.22,.095,.17,.085),'beard');cylinder(head,bronze,k*.14,-.28,.22,.063,.038);ball(head,skin,k*.275,-.035,0,.075,.08,.07);}
    ball(head,iron,0,.14,-.025,.31,.21,.28);box(head,bronze,0,.14,.265,.055,.29,.035);for(const k of [-1,1]){ball(head,bronze,k*.26,.11,.07,.075,.11,.075);branch(head,cream,[k*.24,.20,0],[k*.39,.31,-.02],.065);}
    for(const k of [-1,1]){ball(body,iron,k*.265,.55,.01,.115,.12,.14);box(body,leather,k*.14,.41,.206,.065,.28,.042);}box(body,bronze,0,.29,.235,.13,.09,.04);box(body,leather,0,.39,-.22,.38,.41,.18);
   }else if(isFamily){
    accent(ball(head,capMats[0],0,.24,-.025,.38,.16,.35),'cap');ball(head,cream,0,.17,0,.33,.065,.31);for(let j=0;j<7;j++){const a=j*2.399,r=j%2?.25:.13;ball(head,cream,Math.cos(a)*r,.31+(j%2?0:.05),Math.sin(a)*r,.052,.020,.043);}
    ball(body,cream,0,.44,.193,.17,.22,.045);box(body,leather,0,.29,.22,.29,.06,.045);
   }else if(isDeer){
    ball(head,cream,0,-.08,.21,.19,.12,.10);ball(head,ink,0,-.055,.304,.06,.036,.035);special.ears=[];
    for(const k of [-1,1]){const e=group(head,k*.22,.08,0);ball(e,warm,k*.07,.02,0,.13,.058,.075).rotation.z=k*.35;ball(e,skin,k*.09,.023,.04,.075,.034,.033).rotation.z=k*.35;special.ears.push(e);branch(head,bark,[k*.15,.18,-.015],[k*.22,.43,-.03],.032);branch(head,bark,[k*.19,.33,-.02],[k*.31,.40,.015],.023);const l=ball(head,leaf,k*.24,.40,.01,.085,.038,.05);l.rotation.z=k*.55;}
    box(body,cream,0,.42,.195,.25,.27,.043);for(const k of [-1,1])ball(body,leaf,k*.12,.64,.12,.10,.045,.08);
   }else{
    // Stargazer: asymmetric star-tipped cap and travel cloak.
    accent(ball(head,outfit,0,.13,-.07,.29,.29,.27));const hat=mesh(head,cone,blue,-.025,.30,-.035,.28,.42,.27);hat.rotation.z=-.25;ball(head,bronze,.029,.50,-.04,.065,.065,.065);
    const cape=ball(body,blue,0,.43,-.16,.27,.30,.10);cape.rotation.x=.18;for(let j=0;j<5;j++)ball(cape,bronze,Math.cos(j*2.4)*.45,Math.sin(j*2.4)*.5,.89,.11,.12,.04);ball(body,bronze,0,.59,.23,.075,.075,.032);box(body,leather,.22,.29,-.025,.19,.26,.16);
   }
  }
  if(!isSlime)for(const sign of [-1,1]){
   const shoulder=group(body,sign*shoulderX,shoulderY,.03),elbow=group(shoulder,0,-armLength,0),wrist=group(elbow,0,-foreLength,0);
   accent(ball(shoulder,isGhost?ghostDark:outfit,0,-.095,0,.083,.13,.082));accent(ball(elbow,isGhost?ghost:outfit,0,-.07,0,.069,.103,.067));ball(wrist,skinMat,0,0,0,.068,.076,.066);
   const utensil=group(wrist);box(utensil,bronze,0,0,.10,.023,.023,.20);ball(utensil,iron,0,0,.212,.050,.021,.065);utensil.visible=false;arms.push({shoulder,elbow,wrist,utensil,sign});
  }
  let identityKey='',lastMode='';
  function update(t,s){
   const v=guestLife(kind,s.order,t,{moving:s.moving,seated:s.seated,waiting:s.waiting},s.id),phase=v.identity.phase,walk=v.mode==='walk',eat=v.mode==='eat',review=v.mode==='review',lift=v.meal.lift;
   if(identityKey!==String(s.id)){identityKey=String(s.id);for(const a of accents){if(a.kind==='beard')a.o.material=beardMats[v.identity.variant];else if(a.kind==='cap')a.o.material=capMats[v.identity.variant];else if(cloth[kind])a.o.material=cloth[kind][v.identity.variant];}root.rotation.y=0;lastMode='';}
   const a=v.a,step=Math.sin(t*(isDwarf?8:10)*v.identity.tempo+phase);
   root.rotation.y={front:0,right:Math.PI/2,back:Math.PI,left:-Math.PI/2}[s.facing]||0;
   body.position.set(0,isGhost?.09+Math.sin(a*2.6)*.045:walk?Math.abs(step)*.035:0,0);
   body.rotation.set(eat?.035+lift*.10:review?(v.positive?-.06:.065)*v.reaction:0,0,walk?step*.045:0);
   head.rotation.set(eat?-.08*lift:review?(v.positive?-.11:.09)*v.reaction:Math.sin(a*1.35)*.035,eat?0:review&&!v.positive?Math.sin(a*8)*.18*v.reaction:v.look,0);
   const blink=(a%4.7+4.7)%4.7<.13;for(const e of eyes)e.scale.y=blink?.008:.047;
   if(special.mouth){special.mouth.scale.y=eat&&v.meal.chew?.028+Math.abs(Math.sin(a*18))*.014:review&&v.positive?.023:.014;special.mouth.scale.x=eat&&v.meal.chew?.057:.043;}
   if(isSlime){
    const stretch=walk?.12*step:eat?.07*Math.sin(v.meal.cycle*6.28):.025*Math.sin(a*2.7);body.scale.set(1-stretch*.45,1+stretch,1-stretch*.35);body.position.z=eat?.22*(1-lift):0;body.rotation.x=eat?.17*(1-lift):0;head.rotation.y=0;
    for(const sign of [-1,1])special['pseudopod'+sign].scale.z=.15+(eat?.08*(1-lift):0);
   }else{
    body.scale.setScalar(1);if(special.tail)special.tail.rotation.x=Math.sin(a*2.8)*.18;if(special.ears)for(let j=0;j<2;j++)special.ears[j].rotation.z=(j?1:-1)*Math.sin(a*2.4)*.09;
    for(let i=0;i<legs.length;i++){const l=legs[i];l.rotation.x=s.seated?-1.43:walk?(i?1:-1)*step*.48:0;l.rotation.z=s.seated?(i?1:-1)*.08:0;}
    for(const [i,arm] of arms.entries()){
     const sign=arm.sign,dominant=i===0;let target=[sign*(shoulderX+.045),.25,walk?step*(i?-.16:.16):.045],tip=null;
     if(s.seated)target=[sign*.22,.37,.26];
     if(eat){if(dominant){
       // The local plate is .50 ahead and .41 above the seat root. The
       // spoon travels from plate to mouth rather than swinging in midair.
       const scoop=[-.13,.41,.29],feed=[-.12,mouth[1]-.09,.23];target=scoop.map((x,j)=>x+(feed[j]-x)*lift);
       tip=[-.015,.43,.50].map((x,j)=>x+(mouth[j]-x)*lift);
      }else target=[.19,.40,.27];
     }else if(v.mode==='order'&&dominant){target=[-.19,.51+.12*Math.max(0,Math.sin(a*1.8)),.25];}
     else if(v.mode==='anticipate'&&dominant){target=[-.18,.47,.27+.055*Math.sin(a*3)];}
     else if(review){target=[sign*.26,.39+(v.positive?.23:.07)*v.reaction,.15+.10*v.reaction];}
     else if(v.impatient&&s.seated&&dominant)target=[-.21,.40+.025*Math.sin(a*8),.25];
     arm.utensil.visible=eat&&dominant;aimArm(arm,target,tip);
    }
   }
   lastMode=v.mode;return v;
  }
  return {root,update};
 }
 return {create};
}
