// Shared field enemy geometry: combat and read-only departure preview.
export function createFieldEnemyModel(T,actors,e,{group,ball,cyl,box,branch},{basalt,basaltLight,red,ember,sulfur,ink,purple,cream,barkLight,gold,bark,stone2,moss,copper,green,blue}){const p=group(actors),body=group(p),kind=e.kind,limbs=[],wings=[];let skull=null;
  if(e.kind==='boss_ember'){ball(body,basalt,0,.48,0,.60,.48,.48);ball(body,red,0,.73,.27,.38,.35,.29);for(let j=0;j<7;j++){const a=j*.9;const spike=cyl(body,j%2?ember:sulfur,Math.cos(a)*.33,1.04+Math.abs(Math.sin(a))*.12,Math.sin(a)*.29,0,.12,.46,5);spike.rotation.z=Math.cos(a)*.32;}for(const k of [-1,1]){const arm=group(body,k*.54,.45,0);ball(arm,basaltLight,0,-.08,0,.22,.30,.20);ball(arm,ember,0,-.24,.13,.16,.13,.15);limbs.push(arm);ball(body,ink,k*.15,.77,.53,.055,.07,.025);ball(body,sulfur,k*.15,.79,.55,.025,.03,.015);}for(let j=0;j<4;j++)box(body,ember,(j-1.5)*.17,.40,.43,.065,.19,.035);}
  else if(e.isBoss){ball(body,purple,0,.46,0,.56,.46,.47);cyl(body,cream,0,.60,0,.21,.24,.60);ball(body,barkLight,0,.87,0,.73,.12,.66);ball(body,red,0,.99,0,.76,.27,.69);ball(body,purple,0,1.18,-.07,.34,.10,.30);for(let i=0;i<7;i++){let a=i*.90;ball(body,cream,Math.cos(a)*.49,1.15,Math.sin(a)*.45,.09,.025,.09);}for(const k of [-1,1]){ball(body,red,k*.57,.43,0,.18,.28,.20);ball(body,ink,k*.14,.70,.39,.06,.065,.035);}}
  else if(kind==='chicken'){ball(body,cream,0,.27,0,.27,.24,.24);ball(body,cream,0,.53,.16,.18,.17,.17);for(let j=0;j<3;j++)ball(body,red,0,.68+j*.025,.10+j*.07,.045,.075,.045);for(let j=0;j<3;j++){const tail=ball(body,cream,(j-1)*.07,.40,-.26,.07,.20,.16);tail.rotation.x=-.6;}ball(body,gold,0,.50,.32,.10,.055,.08);for(const k of [-1,1]){const wing=group(body,k*.24,.30,0);ball(wing,cream,0,0,0,.11,.15,.19);wings.push(wing);ball(body,ink,k*.08,.56,.29,.025,.028,.018);}}
  else if(kind==='boar'){
   // The internal legacy id is boar; the GDD/data identify Ironhorn Bison.
   ball(body,bark,0,.44,-.08,.37,.35,.52);ball(body,bark,0,.55,.14,.40,.43,.34);
   skull=group(body,0,.49,.38);ball(skull,barkLight,0,-.01,.02,.26,.27,.29);ball(skull,stone2,0,-.14,.23,.24,.135,.16);
   for(const k of [-1,1]){
    ball(skull,bark,k*.27,.15,-.03,.15,.09,.08);
    branch(skull,[k*.17,.18,.02],[k*.33,.32,.02],.067,.095,stone2);
    branch(skull,[k*.33,.32,.02],[k*.40,.49,.06],.012,.067,cream);
    ball(skull,ink,k*.13,.04,.22,.035,.035,.025);ball(skull,ink,k*.095,-.14,.36,.042,.025,.018);
    for(const zz of [-.37,.26]){const leg=group(body,k*.24,.33,zz);cyl(leg,bark,0,-.15,0,.09,.10,.30);box(leg,ink,0,-.275,.025,.19,.11,.22);limbs.push(leg);}
   }
   branch(body,[0,.47,-.56],[.08,.31,-.79],.035,.045,bark);ball(body,ink,.08,.26,-.81,.065,.10,.06);
   for(let j=0;j<3;j++)ball(body,moss,(j-1)*.13,.85,-.03+j*.08,.12,.045,.15);
  }
  else if(kind==='steam_crab'){ball(body,basaltLight,0,.26,0,.37,.24,.31);ball(body,copper,0,.43,-.04,.33,.16,.27);for(let j=0;j<3;j++){const a=(j-1)*.18;ball(body,sulfur,a,.53,0,.045,.045,.065);}for(const k of [-1,1]){for(let j=0;j<3;j++){const leg=group(body,k*.25,.20,-.18+j*.18);branch(leg,[0,0,0],[k*.19,-.05,0],.045,.06,copper);branch(leg,[k*.19,-.05,0],[k*.25,-.17,.05],.025,.045,basalt);limbs.push(leg);}const claw=group(body,k*.31,.29,.24);ball(claw,copper,k*.13,0,.07,.17,.12,.14);for(const sign of [-1,1]){const tip=ball(claw,red,k*.16+sign*.065,.02,.20,.075,.09,.13);tip.rotation.y=sign*.35;}wings.push(claw);ball(body,cream,k*.12,.48,.22,.07,.08,.06);ball(body,ink,k*.12,.49,.27,.027,.032,.018);}}
  else if(kind==='gust_moth'){ball(body,cream,0,.40,0,.12,.27,.13);ball(body,blue,0,.62,.04,.14,.13,.13);for(const k of [-1,1]){const wing=group(body,k*.10,.49,0);ball(wing,blue,k*.27,.025,0,.34,.065,.26);ball(wing,cream,k*.22,.045,.025,.20,.04,.13);wings.push(wing);branch(body,[k*.045,.70,.04],[k*.14,.82,.10],.012,.018,bark);ball(body,ink,k*.055,.65,.14,.027,.03,.02);}}
  else if(kind==='pepper'){ball(body,red,0,.35,0,.23,.35,.22);branch(body,[0,.61,0],[.11,.76,0],.05,.065,green);for(const k of [-1,1])ball(body,ink,k*.08,.42,.20,.036,.045,.02);}
  else {ball(body,cream,0,.23,0,.22,.24,.20);ball(body,kind==='sporeling'?purple:blue,0,.49,0,.36,.17,.31);for(const k of [-1,1])ball(body,ink,k*.075,.29,.19,.03,.035,.018);}
  for(const k of [-1,1])if(!['pepper','sporeling','boar'].includes(kind)&&!e.isBoss)for(let j=0;j<(kind==='boar'?2:1);j++)ball(body,bark,k*.14,.075,j*.26-.08,.07,.08,.10);
  p.userData.body=body;p.userData.limbs=limbs;p.userData.wings=wings;p.userData.skull=skull;const own=new Map();body.traverse(o=>{if(o.isMesh&&o.material?.emissive){if(!own.has(o.material))own.set(o.material,o.material.clone());o.material=own.get(o.material);}});p.userData.flashMats=[...own.values()];return p;
 }
