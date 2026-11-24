// Native 3D effects derived only from authoritative simulation state.
const clamp=x=>Math.max(0,Math.min(1,x));
import {meleeProfile,meleeWindupProgress} from './field_combat_feedback_v084.js?v=0.8.4';
import {hazardPhase} from './field_rules_v011a.js';
const polar=(p,r,a)=>({x:p.x+r*Math.cos(a),y:p.y+r*Math.sin(a)});
const direction=(a,b)=>Math.atan2(b.y-a.y,b.x-a.x);
const valid=p=>Number.isFinite(p?.x)&&Number.isFinite(p?.y);
export function fieldTelegraphs3D(f){
 const out=[];
 const circle=(p,r,q,color,kind='circle')=>{if(valid(p))out.push({kind,p,r,q,color,points:Array.from({length:40},(_,i)=>polar(p,r,i*Math.PI/20))});};
 const sector=(p,r,a,half,q,color,kind='sector')=>{if(valid(p))out.push({kind,p,r,q,color,points:[p,...Array.from({length:25},(_,i)=>polar(p,r,a-half+i*half/12))]});};
 const lane=(a,b,width,q,color,kind='lane')=>{if(!valid(a)||!valid(b))return;const t=direction(a,b),h=width/2,points=[...Array.from({length:13},(_,i)=>polar(b,h,t-Math.PI/2+i*Math.PI/12)),...Array.from({length:13},(_,i)=>polar(a,h,t+Math.PI/2+i*Math.PI/12))];out.push({kind,p:a,end:b,width,q,color,points});};
 for(const e of f.enemies||[]){
  if(e.hp<=0)continue;
  const origin=e.attackOrigin||e,aim=e.aim||f.pos,a=valid(origin)&&valid(aim)?direction(origin,aim):0,q=meleeWindupProgress(e),p=meleeProfile(e.kind);
  if(e.warning>0){
   if(e.isBoss&&e.bossAttack){const b=e.bossAttack,t=valid(b.origin)&&valid(b.aim)?direction(b.origin,b.aim):a,c=e.kind==='boss_spore'?'#e5a9f3':'#ff9b52';
    if(b.kind==='burst')circle(b.aim,.8,q,c,'bossBurst');
    else if(b.kind==='charge')lane(b.origin,b.end,1.2,q,c,'bossCharge');
    else if(b.kind==='fan'||b.kind==='ring'){const spread=b.kind==='ring'?Array.from({length:7},(_,i)=>(i+1)*Math.PI/4):e.kind==='boss_spore'?[-.55,0,.55]:[-.27,0,.27];for(const d of spread)lane(polar(b.origin,.38,t+d),polar(b.origin,1.5,t+d),.09,q,c,'aim');}
   }else if(e.ecologyAttack?.end&&e.kind==='boar')lane(e.ecologyAttack.origin,e.ecologyAttack.end,.96,q,'#ff9c64','charge');
   else if(p)sector(e,p.reach,a,p.arcDeg*Math.PI/360,q,'#ff7953');
   else if(valid(origin)&&valid(aim))lane(origin,polar(origin,Math.min(3.2,Math.hypot(aim.x-origin.x,aim.y-origin.y)),a),.085,q,e.kind==='sporeling'?'#e0b2ff':'#ffb46a','aim');
  }
  if(p&&e.strikeFx?.ttl>0){const z=e.strikeFx;sector(z,p.reach,Math.atan2(z.dy,z.dx),p.arcDeg*Math.PI/360,clamp(z.ttl/(z.duration||.28)),p.accent,'strike');}
 }
 for(const h of f.hazards||[]){const v=hazardPhase(h,f.elapsed,f.biome);if(v.warning||v.active)circle({x:h.x+.5,y:h.y+.5},v.radius,v.warningProgress,v.source==='spore'?'#deb2ff':'#ffb35d',v.active?'hazardActive':'hazard');}
 for(const z of f.bossZones||[])if(z.life>0)circle(z,z.radius,clamp(z.life/.25),z.source==='spore'?'#d7a6f4':'#ff9e56','activeZone');
 return out;
}
export function makeTelegraphLayer(T,scene,sine){
 const root=new T.Group(),pool=[];scene.add(root);
 function slot(){const g=new T.Group(),geom=new T.BufferGeometry(),lineGeo=new T.BufferGeometry(),fill=new T.MeshBasicMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}),edge=new T.LineBasicMaterial({transparent:true,depthWrite:false});const mesh=new T.Mesh(geom,fill),line=new T.LineLoop(lineGeo,edge);mesh.frustumCulled=line.frustumCulled=false;mesh.renderOrder=2;line.renderOrder=3;g.add(mesh,line);root.add(g);const data={g,geom,lineGeo,fill,edge};pool.push(data);return data;}
 function attr(g,key,values){let a=g.getAttribute(key);if(!a||a.array.length!==values.length)g.setAttribute(key,new T.Float32BufferAttribute(values,3));else{a.array.set(values);a.needsUpdate=true;}}
 return {draw(f){const ds=fieldTelegraphs3D(f).slice(0,80);for(let i=0;i<Math.max(ds.length,pool.length);i++){const d=ds[i],s=pool[i]||(d?slot():null);if(!s)continue;s.g.visible=!!d;if(!d)continue;const pts=d.points,verts=[],edge=[];for(const p of pts)edge.push(p.x,.036,p.y/sine);for(let j=1;j<pts.length-1;j++)for(const p of [pts[0],pts[j],pts[j+1]])verts.push(p.x,.027,p.y/sine);attr(s.geom,'position',verts);attr(s.lineGeo,'position',edge);s.fill.color.set(d.color);s.edge.color.set(d.q>.78?'#fff2bd':d.color);const active=['strike','hazardActive','activeZone'].includes(d.kind);s.fill.opacity=active?.29*d.q+.09:d.kind==='aim'?.27+.25*d.q:.12+.25*d.q;s.edge.opacity=active?.65*d.q+.18:.55+.45*d.q;}return ds.length;},dispose(){for(const s of pool){s.geom.dispose();s.lineGeo.dispose();s.fill.dispose();s.edge.dispose();}scene.remove(root);}};
}

export function fieldFx3D(f){
 const out=[],a=f.attackFx,type=f.weapon?.type||'WOK';
 const add=(kind,x,y,opts={})=>{if(Number.isFinite(x)&&Number.isFinite(y))out.push({kind,x,y,...opts});};
 if(a?.ttl>0){const q=clamp(a.ttl/(a.duration||.3)),o={x:a.x??f.pos.x,y:a.y??f.pos.y},dx=a.dx??f.facing?.x??0,dy=a.dy??f.facing?.y??-1;
  if(type==='WOK')add('slash',o.x,o.y,{dx,dy,r:1.20,alpha:q,h:.28});
  if(type==='GRILL'&&!a.forkFlame){const x=a.hitX??o.x+dx*2.1,y=a.hitY??o.y+dy*2.1;add('thrust',o.x,o.y,{dx:x-o.x,dy:y-o.y,alpha:q,h:.22});}
  if(type==='STEAM')add('wave',o.x,o.y,{r:(a.radius||1.6)*(.35+.65*(1-q)),alpha:q,h:.14,color:'#d7eee0'});
 }
 if(f.skillFx>0){const o=f.skillOrigin||f.pos,q=clamp(f.skillFx/(type==='GRILL'?.85:.42));
  if(type==='GRILL')add('flame',o.x,o.y,{dx:o.dx??f.facing?.x??0,dy:o.dy??f.facing?.y??-1,r:2.7+(f.weapon?.level>1?.3:0),alpha:q,h:.30});
  else if(type==='WOK'||type==='POT')add('wave',o.x,o.y,{r:type==='WOK'? .3+(1-q)*1.55:.22+(1-q)*.45,alpha:q,h:.12,color:type==='WOK'?'#ffe0a0':'#d0efd0'});
 }
 if(f.steamMist?.ttl>0){const m=f.steamMist;add('mist',m.x,m.y,{r:m.radius,alpha:Math.min(.75,m.ttl),h:.12,color:'#c2e6d8'});}
 for(const z of f.projectiles||[])add('orb',z.x,z.y,{alpha:1,h:.28,color:z.source==='spore'?'#c7a4f1':'#ff9d4c',r:.12,dx:z.vx||0,dy:z.vy||0});
 for(const z of f.playerProjectiles||[]){const q=clamp(z.time/z.duration);add('orb',z.x,z.y,{alpha:1,h:.30+Math.sin(q*Math.PI)*.48,color:z.empowered?'#d8f5ac':'#eab577',r:z.empowered?.22:.16,dx:(z.targetX-z.fromX)||0,dy:(z.targetY-z.fromY)||0});}
 for(const z of f.impactFx||[]){const q=clamp(z.ttl/(z.duration||.2));if(q<=0)continue;add(z.kind==='contact'?'spark':'wave',z.x,z.y,{dx:z.dx||0,dy:z.dy||0,r:z.kind==='contact'?(z.strong?.55:.36):(z.radius||.6)*Math.min(1,(1-q)*3),alpha:q,h:.25,color:z.color||(z.strong?'#c8efd1':'#ffe7a4')});}
 for(const z of f.bossZones||[])if(z.life>0)add('burst',z.x,z.y,{r:z.radius,alpha:clamp(z.life/.25),h:.12,color:'#c6a4e7'});
 for(const e of f.enemies||[])if(e.hp>0&&(e.ecologyRush||e.rush))add('dust',e.x,e.y,{r:.45,alpha:.65,h:.07,dx:(e.ecologyRush||e.rush)?.end?.x-e.x||0,dy:(e.ecologyRush||e.rush)?.end?.y-e.y||0,color:'#c8b28a'});
 return out;
}
export function makeFieldFx3D(T,scene,sine){
 const root=new T.Group();scene.add(root);const pool=[];
 const orb=new T.SphereGeometry(1,12,8),ring=new T.RingGeometry(.82,1,48);ring.rotateX(-Math.PI/2);
 // An actual curved, bevelled-looking ribbon with tapered ends. The shape is
 // oriented in tile coordinates before z compensation, not a screen sprite.
 const arc=new T.RingGeometry(.78,1,40,1,-Math.PI/2-.84,1.68);arc.rotateX(-Math.PI/2);
 const cone=new T.ConeGeometry(1,1,10);cone.rotateX(Math.PI/2);const streak=new T.SphereGeometry(1,10,6);
 function create(){const g=new T.Group();root.add(g);const mat=new T.MeshBasicMaterial({color:'#fff0bf',transparent:true,opacity:1,depthWrite:false,side:T.DoubleSide});const meshes={};for(const [k,geo] of Object.entries({orb,ring,arc,cone,streak})){const o=new T.Mesh(geo,mat);g.add(o);meshes[k]=o;}const sparks=[];for(let i=0;i<8;i++){const o=new T.Mesh(orb,mat);g.add(o);sparks.push(o);}const slot={g,mat,meshes,sparks};pool.push(slot);return slot;}
 return {draw(f,t,nativeBlade=false){const data=fieldFx3D(f).filter(d=>!nativeBlade||d.kind!=='slash').slice(0,96);for(let i=0;i<Math.max(data.length,pool.length);i++){const d=data[i],s=pool[i]||(d?create():null);if(!s)continue;s.g.visible=!!d;if(!d)continue;const {g,mat,meshes,sparks}=s;g.position.set(d.x,d.h||0,d.y/sine);g.scale.set(1,1,1/sine);g.rotation.set(0,0,0);mat.color.set(d.color||'#ffe4a0');mat.opacity=Math.max(0,Math.min(1,d.alpha??1));for(const o of Object.values(meshes)){o.visible=false;o.position.set(0,0,0);o.rotation.set(0,0,0);o.scale.set(1,1,1);}for(const o of sparks)o.visible=false;
  const q=1-(d.alpha??1),r=Math.max(.02,d.r||.2),angle=Math.atan2(d.dx||0,d.dy||0);
  if(d.kind==='slash'){const o=meshes.arc;o.visible=true;o.rotation.y=angle+(q-.5)*.45;o.scale.set(r,1,r);o.position.y=.12;for(let j=0;j<5;j++){const v=sparks[j],a=angle-.75+j*.375+(q-.5)*.45;v.visible=true;v.position.set(Math.sin(a)*r,.13+.12*Math.sin(j*Math.PI/4),Math.cos(a)*r);v.scale.set(.035,.055,.035);}}
  else if(d.kind==='thrust'){const len=Math.hypot(d.dx,d.dy),o=meshes.streak;o.visible=true;o.rotation.y=angle;o.position.set(d.dx*.5,0,d.dy*.5);o.scale.set(.09,.065,len*.52);}
  else if(d.kind==='orb'){const o=meshes.orb;o.visible=true;o.scale.set(r,r,r);const tail=meshes.streak;tail.visible=true;tail.rotation.y=angle;tail.position.set(-Math.sin(angle)*r*1.35,0,-Math.cos(angle)*r*1.35);tail.scale.set(r*.48,r*.48,r*2.4);for(let j=0;j<5;j++){const v=sparks[j];v.visible=true;const d=r*(1+j*.64);v.position.set(-Math.sin(angle)*d+Math.sin(t*13+j)*r*.3,.03+Math.sin(t*10+j)*r*.4,-Math.cos(angle)*d);v.scale.setScalar(r*(.48-j*.065));}}
  else if(d.kind==='flame'){const o=meshes.cone;o.visible=true;o.rotation.y=angle;o.position.set(Math.sin(angle)*r*.52,0,Math.cos(angle)*r*.52);o.scale.set(.65,.38,r);mat.color.set('#ffac49');for(let j=0;j<8;j++){const v=sparks[j],dist=r*(j+1)/9;v.visible=true;v.position.set(Math.sin(angle)*dist+Math.cos(angle)*Math.sin(t*13+j)*.26,.1+Math.sin(j+t*10)*.12,Math.cos(angle)*dist-Math.sin(angle)*Math.sin(t*13+j)*.26);v.scale.set(.11,.16,.11);}}
  else if(['wave','mist','burst'].includes(d.kind)){const o=meshes.ring;o.visible=true;o.scale.set(r,1,r);if(d.kind!=='wave')for(let j=0;j<8;j++){const v=sparks[j],a=j*Math.PI/4+t*.4;v.visible=true;v.position.set(Math.cos(a)*r*.65,.14+Math.sin(t*4+j)*.09,Math.sin(a)*r*.65);v.scale.set(d.kind==='mist'?.25:.11,.22,.20);} }
  else if(d.kind==='spark'||d.kind==='dust'){for(let j=0;j<8;j++){const v=sparks[j],a=j*2.399;v.visible=true;v.position.set(Math.cos(a)*r*(.2+q),.08+Math.sin(q*Math.PI)*.32+(j%3)*.04,Math.sin(a)*r*(.2+q));v.scale.set(.035+(1-q)*.045,.035,.055);}}
 }},dispose(){for(const s of pool)s.mat.dispose();for(const g of [orb,ring,arc,cone,streak])g.dispose();scene.remove(root);}};
}
