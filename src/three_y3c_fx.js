// Native 3D effects derived only from authoritative simulation state.
const clamp=x=>Math.max(0,Math.min(1,x));
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
 for(const z of f.projectiles||[])add('orb',z.x,z.y,{alpha:1,h:.28,color:z.source==='spore'?'#c7a4f1':'#ff9d4c',r:.12});
 for(const z of f.playerProjectiles||[]){const q=clamp(z.time/z.duration);add('orb',z.x,z.y,{alpha:1,h:.30+Math.sin(q*Math.PI)*.48,color:z.empowered?'#d8f5ac':'#eab577',r:z.empowered?.22:.16});}
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
 return {draw(f,t){const data=fieldFx3D(f).slice(0,96);for(let i=0;i<Math.max(data.length,pool.length);i++){const d=data[i],s=pool[i]||(d?create():null);if(!s)continue;s.g.visible=!!d;if(!d)continue;const {g,mat,meshes,sparks}=s;g.position.set(d.x,d.h||0,d.y/sine);g.scale.set(1,1,1/sine);g.rotation.set(0,0,0);mat.color.set(d.color||'#ffe4a0');mat.opacity=Math.max(0,Math.min(1,d.alpha??1));for(const o of Object.values(meshes)){o.visible=false;o.position.set(0,0,0);o.rotation.set(0,0,0);o.scale.set(1,1,1);}for(const o of sparks)o.visible=false;
  const q=1-(d.alpha??1),r=Math.max(.02,d.r||.2),angle=Math.atan2(d.dx||0,d.dy||0);
  if(d.kind==='slash'){const o=meshes.arc;o.visible=true;o.rotation.y=angle+(q-.5)*.45;o.scale.set(r,1,r);o.position.y=.12;for(let j=0;j<5;j++){const v=sparks[j],a=angle-.75+j*.375+(q-.5)*.45;v.visible=true;v.position.set(Math.sin(a)*r,.13+.12*Math.sin(j*Math.PI/4),Math.cos(a)*r);v.scale.set(.035,.055,.035);}}
  else if(d.kind==='thrust'){const len=Math.hypot(d.dx,d.dy),o=meshes.streak;o.visible=true;o.rotation.y=angle;o.position.set(d.dx*.5,0,d.dy*.5);o.scale.set(.09,.065,len*.52);}
  else if(d.kind==='orb'){const o=meshes.orb;o.visible=true;o.scale.set(r,r,r);for(let j=0;j<3;j++){const v=sparks[j];v.visible=true;v.position.set(Math.sin(t*13+j)*r*.75,.02+j*.09,Math.cos(t*13+j)*r*.75);v.scale.setScalar(r*.33);}}
  else if(d.kind==='flame'){const o=meshes.cone;o.visible=true;o.rotation.y=angle;o.position.set(Math.sin(angle)*r*.52,0,Math.cos(angle)*r*.52);o.scale.set(.65,.38,r);mat.color.set('#ffac49');for(let j=0;j<8;j++){const v=sparks[j],dist=r*(j+1)/9;v.visible=true;v.position.set(Math.sin(angle)*dist+Math.cos(angle)*Math.sin(t*13+j)*.26,.1+Math.sin(j+t*10)*.12,Math.cos(angle)*dist-Math.sin(angle)*Math.sin(t*13+j)*.26);v.scale.set(.11,.16,.11);}}
  else if(['wave','mist','burst'].includes(d.kind)){const o=meshes.ring;o.visible=true;o.scale.set(r,1,r);if(d.kind!=='wave')for(let j=0;j<8;j++){const v=sparks[j],a=j*Math.PI/4+t*.4;v.visible=true;v.position.set(Math.cos(a)*r*.65,.14+Math.sin(t*4+j)*.09,Math.sin(a)*r*.65);v.scale.set(d.kind==='mist'?.25:.11,.22,.20);} }
  else if(d.kind==='spark'||d.kind==='dust'){for(let j=0;j<8;j++){const v=sparks[j],a=j*2.399;v.visible=true;v.position.set(Math.cos(a)*r*(.2+q),.08+Math.sin(q*Math.PI)*.32+(j%3)*.04,Math.sin(a)*r*(.2+q));v.scale.set(.035+(1-q)*.045,.035,.055);}}
 }},dispose(){for(const s of pool)s.mat.dispose();for(const g of [orb,ring,arc,cone,streak])g.dispose();scene.remove(root);}};
}
