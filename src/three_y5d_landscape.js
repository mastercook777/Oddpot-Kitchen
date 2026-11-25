// Y5d: deterministic landscape, render-only. Coordinates are field tiles;
// all traversable ground remains exactly y=0, all tall new forms outside
// the map or on existing obstacles.
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
export function landscapeSeed(f){let n=(f.biome?.encounterSeed||0)>>>0;for(const c of String(f.biome?.zoneId||''))n=Math.imul(n^c.charCodeAt(0),16777619)>>>0;return n;}
const rnd=(seed,i)=>{let n=(seed+Math.imul(i+1,0x9e3779b1))>>>0;n=Math.imul(n^(n>>>16),0x21f0aaad);n=Math.imul(n^(n>>>15),0x735a2d97);return ((n^(n>>>15))>>>0)/4294967296;};
export function pathDistance(x,y,route=[]){
 let best=Infinity;
 if(route.length===1)return Math.hypot(x-route[0].x,y-route[0].y);
 for(let i=1;i<route.length;i++){const a=route[i-1],b=route[i],dx=b.x-a.x,dy=b.y-a.y,t=clamp(((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1));best=Math.min(best,Math.hypot(x-a.x-dx*t,y-a.y-dy*t));}
 return best;
}
export function landscapeSample(f,style,x,y,route=[],seed=landscapeSeed(f)){
 const w=f.worldW,h=f.worldH,phase=rnd(seed,0)*6.283;
 const dx=Math.max(0,-x,x-w),back=Math.max(0,-y),front=Math.max(0,y-h),d=Math.hypot(dx,back,front);
 const ridge=.6+.4*Math.sin(x*.72+y*.31+phase),isRock=['spring','steam','ember','oasis'].includes(style);
 // The mesh is continuous at the border. Raised far/side slopes, low near edge.
 const height=d===0?0:(smooth(0,2.6,Math.max(dx,back))*(.45+ridge*(isRock?1.0:.70))*(front>0?.25:1)-smooth(0,2.8,front)*.34);
 const broad=clamp(.50+.24*Math.sin(x*.66+y*.35+phase)+.17*Math.cos(y*.9-x*.43-phase)+.07*Math.sin(x*3.7+y*2.1));
 const grain=clamp(.50+.24*Math.sin(x*9.1+y*7.3+phase)+.18*Math.cos(x*5.8-y*11.9));
 const seam=isRock?Math.pow(Math.abs(Math.sin(y*2.9+x*.59+Math.sin(x*.9+phase)*1.2)),14):Math.pow(Math.abs(Math.sin(x*.8+y*.62+phase)),12);
 const edge=.43+.075*Math.sin(x*3.4+y*2.2+phase);
 const path=d===0?1-smooth(edge-.10,edge+.18,pathDistance(x,y,route)):0;
 return {height,broad,grain,seam,path};
}
export function landscapePlan(f,style,route=[]){
 const seed=landscapeSeed(f),w=f.worldW,h=f.worldH,rock=['spring','steam','ember','oasis'].includes(style),rim=[],plants=[],springs=[];
 // continuous groups, not evenly spaced single-file props. Preserve clear foreground.
 for(let i=0;i<Math.ceil(w*1.2);i++){const x=(i+.5)*w/Math.ceil(w*1.2)+(rnd(seed,i)-.5)*.52,y=-.62-rnd(seed,i+100)*1.6;rim.push({x,y,size:.72+rnd(seed,i+300)*.65,rot:rnd(seed,i+400)*6.28,kind:rock?'cliff':'grove',back:true});}
 for(const side of [-1,1])for(let i=0;i<Math.ceil(h*.72);i++){const x=side<0?-.60-rnd(seed,i+500)*.9:w+.60+rnd(seed,i+700)*.9,y=(i+.5)*h/Math.ceil(h*.72)+(rnd(seed,i+800)-.5)*.55;rim.push({x,y,size:.48+rnd(seed,i+900)*.56,rot:rnd(seed,i+1000)*6.28,kind:rock?'cliff':'grove',back:false});}
 const forbidden=[...(f.nodes||[]).map(n=>({x:n.x,y:n.y})),...(f.obstacles||[]).map(n=>({x:n.x+.5,y:n.y+.5})),...(f.hazards||[]).map(n=>({x:n.x+.5,y:n.y+.5}))];
 for(const [i,p] of (f.scenery||[]).entries()){
  if(p.x<.35||p.y<.35||p.x>w-.35||p.y>h-.35||pathDistance(p.x,p.y,route)<.72||forbidden.some(q=>Math.hypot(p.x-q.x,p.y-q.y)<.83))continue;
  plants.push({x:p.x,y:p.y,size:.60+rnd(seed,1200+i)*.65,rot:rnd(seed,1500+i)*6.28,kind:rock?'mineral':style==='glow'?'fungus':style==='roots'?'fern':style==='garden'?'flowers':'grass'});
 }
 if(style==='spring'||style==='oasis'){
  for(const [i,o] of (f.obstacles||[]).entries())springs.push({x:o.x+.5,y:o.y+.5,size:.67+rnd(seed,i+2100)*.16,rot:rnd(seed,i+2200)*6.28,kind:'obstacle'});
  for(let i=0;i<5;i++){const x=i%2?w+.88:-.88,y=(i+1)*h/6;springs.push({x,y,size:1.05+rnd(seed,i+2300)*.30,rot:rnd(seed,i+2400)*6.28,kind:'outer'});}
 }
 return {seed,rim,plants,springs};
}
const palettes={
 meadow:['#597b46','#9eac6b','#ad9569','#65794b','#37583d','#78944e','#bdab7e'],
 glow:['#315457','#608b7c','#6e8981','#547876','#274e4b','#529785','#8e9bba'],
 roots:['#4e494a','#87756d','#9d8972','#655c64','#493e39','#796358','#a18d9d'],
 garden:['#6d8b45','#b1b978','#ba9e6b','#798c51','#4b6836','#91ad55','#e2c27b'],
 spring:['#aa916d','#d8c9a7','#dbc6a0','#c3b58f','#a9997e','#e0d0ac','#ddc26f'],
 steam:['#4f595c','#909b94','#a4a49a','#687c7a','#434b50','#758583','#b7b7a2'],
 ember:['#483338','#91604c','#a67a59','#7d5147','#362b33','#704c46','#b97d52'],
 oasis:['#728b80','#bac9aa','#c9c6a7','#8ea89a','#607f79','#a8c5b6','#77b6b0']
};
export function makeLandscapeY5d(T,parent,f,style,route,sine){
 const plan=landscapePlan(f,style,route),palette=palettes[style]||palettes.meadow,rock=['spring','steam','ember','oasis'].includes(style),resources=[],batches=new Map(),dummy=new T.Object3D();
 const own=r=>{resources.push(r);return r;},mat=(color,extra={})=>own(new T.MeshStandardMaterial({color,roughness:.88,...extra})),base=palette.map(c=>new T.Color(c));
 const w=f.worldW,h=f.worldH,pad=3;
 const geo=own(new T.PlaneGeometry(w+pad*2,(h+pad*2)/sine,Math.ceil((w+pad*2)*5),Math.ceil((h+pad*2)*5)));geo.rotateX(-Math.PI/2);
 const pos=geo.attributes.position,colors=[],c=new T.Color();
 for(let i=0;i<pos.count;i++){const x=pos.getX(i)+w/2,y=pos.getZ(i)*sine+h/2,q=landscapeSample(f,style,x,y,route,plan.seed);pos.setY(i,q.height);c.copy(base[0]).lerp(base[1],q.broad*.84+q.grain*.16);c.lerp(base[3],q.seam*(rock?.33:.13));c.lerp(base[2],q.path*.78);colors.push(c.r,c.g,c.b);}
 geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.computeVertexNormals();
 const ground=new T.Mesh(geo,mat('#ffffff',{vertexColors:true}));ground.position.set(w/2,0,h/2/sine);ground.receiveShadow=true;parent.add(ground);
 // Shared faceted forms and real multi-ring strata: all statics instanced by material.
 const boulder=own(new T.IcosahedronGeometry(1,1)),crown=own(new T.IcosahedronGeometry(1,1)),trunk=own(new T.CylinderGeometry(.56,1,1,8)),blade=own(new T.ConeGeometry(1,1,4)),shard=own(new T.CylinderGeometry(0,1,1,6)),stem=own(new T.CylinderGeometry(.72,1,1,7));
 const makeStrata=()=>{const verts=[],idx=[],cols=[],radii=[.91,1,.94,.98,.76,.69],ys=[0,.12,.26,.48,.72,1],n=12;for(let k=0;k<ys.length;k++)for(let j=0;j<n;j++){const a=j*2*Math.PI/n,r=radii[k]*(.91+.09*Math.sin(j*3.1));verts.push(Math.cos(a)*r,ys[k],Math.sin(a)*r);const shade=[.61,.86,.72,.95,.81,1][k];cols.push(shade,shade,shade);}for(let k=0;k<ys.length-1;k++)for(let j=0;j<n;j++){const a=k*n+j,b=k*n+(j+1)%n;idx.push(a,a+n,b,b,a+n,b+n);}for(let j=1;j<n-1;j++)idx.push((ys.length-1)*n,(ys.length-1)*n+j+1,(ys.length-1)*n+j);const g=own(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setAttribute('color',new T.Float32BufferAttribute(cols,3));g.setIndex(idx);g.computeVertexNormals();return g;};
 const strata=makeStrata(),stone=mat(palette[4],{vertexColors:true}),lightStone=mat(palette[5],{vertexColors:true}),plainStone=mat(palette[4]),leaf=[mat(palette[4]),mat(palette[5]),mat(palette[1])],wood=mat(style==='roots'?'#584234':'#72563c'),fungus=mat(style==='glow'?'#6eaba5':'#9b8f75'),petal=mat(palette[6]),grass=mat(palette[5]),mineral=mat(palette[6],{roughness:.45});
 function add(key,g,m,x,y,z,sx,sy,sz,ry=0,rx=0,rz=0){if(!batches.has(key))batches.set(key,{g,m,items:[]});batches.get(key).items.push({x,y,z,sx,sy,sz,ry,rx,rz});}
 const elevation=(x,y)=>landscapeSample(f,style,x,y,[],plan.seed).height;
 for(const [i,p] of plan.rim.entries()){
  const z=p.y/sine,y=elevation(p.x,p.y),s=p.size;
  if(rock){const high=(p.back?1.75:.82)*s;add('strata',strata,stone,p.x,y,z,.65*s,high,.82*s,p.rot);add('shelf',strata,lightStone,p.x+.24*s,y+.03,z+.12,.48*s,high*.40,.66*s,p.rot+.4);
   if(style==='ember')add('ember',shard,mineral,p.x-.15*s,y+high*.52,z,.10*s,.36*s,.13*s,p.rot,0,.38);
   if(style==='oasis'||style==='steam')for(let j=0;j<3;j++)add('crystal',shard,mineral,p.x+(j-1)*.18*s,y+(.25+j*.13)*s,z+.26*s,.095*s,(.42+j*.19)*s,.10*s,p.rot+j,0,(j-1)*.22);
  }else if(style==='glow'){const high=(p.back?1.55:.88)*s;for(let j=0;j<2;j++){const x=p.x+(j-.5)*.38*s;add('stems',stem,wood,x,y+high*.43,z,.11*s,high*.86,.11*s,p.rot);add('fungi',crown,fungus,x,y+high*.91,z,.47*s,.19*s,.42*s,p.rot+j);}}
  else {const high=(p.back?2.4:1.20)*s*(.78+rnd(plan.seed,i+3100)*.55);
   add('wood',trunk,wood,p.x,y+high*.43,z,.13*s,high*.86,.15*s,p.rot);
   for(let j=0;j<3;j++){const a=j*2.4+p.rot,ss=(j===2?.62:.76)*s;add('leaf'+j,crown,leaf[j],p.x+Math.cos(a)*.24*s,y+high*(.70+j*.14),z+Math.sin(a)*.24*s,ss,.52*ss,ss,p.rot+j);}
   if(style==='roots')for(let j=0;j<2;j++)add('wood',trunk,wood,p.x+(j?1:-1)*.28*s,y+.10*s,z,.11*s,.62*s,.10*s,p.rot,0,(j?1:-1)*1.2);
  }
 }
 for(const [i,p] of plan.plants.entries()){
  const s=p.size,z=p.y/sine;
  if(rock){for(let j=0;j<3;j++){const a=p.rot+j*2.4,r=.13+j*.035;add('pebbles',boulder,plainStone,p.x+Math.cos(a)*r,.04*s,z+Math.sin(a)*r,.11*s,.055*s,.09*s,a);}if(i%3===0)add('mineral',shard,mineral,p.x,.10*s,z,.065*s,.20*s,.06*s,p.rot,0,.18);}
  else {for(let j=0;j<6;j++){const a=p.rot+j*2.399,r=.08+j*.019;add('blades',blade,grass,p.x+Math.cos(a)*r,.11*s,z+Math.sin(a)*r,.042*s,(.18+j%3*.07)*s,.024*s,a,Math.sin(a)*.24,Math.cos(a)*.26);}
   if(p.kind==='flowers'||p.kind==='fungus')for(let j=0;j<3;j++){const a=j*2.4+p.rot,x=p.x+Math.cos(a)*.14,z2=z+Math.sin(a)*.14,hh=(.13+j*.035)*s;add('stems',stem,wood,x,hh*.5,z2,.018*s,hh,.018*s,a);add('petals',crown,petal,x,hh,z2,.064*s,.025*s,.057*s,a);}
   if(p.kind==='fern')for(let j=0;j<5;j++){const a=j*1.256+p.rot;add('fern',blade,leaf[1],p.x+Math.cos(a)*.09,.12*s,z+Math.sin(a)*.09,.045*s,.28*s,.07*s,a,.4,.65);}
  }
 }
 // Irregular travertine shelves with actual inset water surface; never a new hazard.
 const waterGeo=own(new T.CircleGeometry(1,32));waterGeo.rotateX(-Math.PI/2);const wp=waterGeo.attributes.position;for(let i=1;i<wp.count;i++){const a=Math.atan2(wp.getZ(i),wp.getX(i)),r=.94+.06*Math.sin(a*3)+.04*Math.cos(a*5);wp.setX(i,wp.getX(i)*r);wp.setZ(i,wp.getZ(i)*r);}wp.needsUpdate=true;
 const waterMat=own(new T.ShaderMaterial({uniforms:{time:{value:0},tint:{value:new T.Color(style==='oasis'?'#70d8d3':'#78b8b1')}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying vec2 vUv;uniform float time;uniform vec3 tint;void main(){vec2 p=vUv*2.0-1.0;float r=length(p);float wave=sin(r*28.0-time*2.0+sin(p.x*9.0+p.y*5.0)*.8);float w=pow(max(0.0,wave),8.0);vec3 c=mix(tint*.55,tint,clamp(r*.65+.25,0.0,1.0));c+=vec3(.24,.30,.25)*w*.30;gl_FragColor=vec4(c,1.0);}',side:T.DoubleSide}));
 for(const p of plan.springs){const s=p.size,y=p.kind==='outer'?elevation(p.x,p.y):0,z=p.y/sine;
  // Outer shelves are taller; interior footprint fits existing collision tile.
  for(let j=0;j<3;j++){const r=(.57-j*.075)*s,hh=.10*s;add('shelf',strata,lightStone,p.x,y+j*hh,z,r,hh,r*1.03,p.rot+j*.13);}
  const o=new T.Mesh(waterGeo,waterMat);o.position.set(p.x,y+.309*s,z);o.scale.set(.37*s,1,.37*s);o.rotation.y=p.rot;parent.add(o);
  for(let j=0;j<8;j++){const a=j*Math.PI/4+p.rot,r=.43*s;add('rimStone',boulder,plainStone,p.x+Math.cos(a)*r,y+.28*s,z+Math.sin(a)*r,.095*s,.053*s,.105*s,a);}
 }
 for(const {g,m,items} of batches.values()){const inst=own(new T.InstancedMesh(g,m,items.length));let i=0;for(const p of items){dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(p.rx,p.ry,p.rz);dummy.scale.set(p.sx,p.sy,p.sz);dummy.updateMatrix();inst.setMatrixAt(i++,dummy.matrix);}inst.receiveShadow=true;parent.add(inst);}
 return {resources,stats:{vertices:pos.count,rim:plan.rim.length,plants:plan.plants.length,pools:plan.springs.length,batches:batches.size},update(t){waterMat.uniforms.time.value=t;}};
}
