// CB2-R2b: visual-only kitchen scenery and thermal phenomena.
// All geometry/materials are registered with the owning Y4b renderer.
export function makeKitchenArt(T,{work,range,cook,mat,group,box,cyl,lathe,ring,mesh,geos,mats}){
 const root=group(work),props={},fx=group(cook);
 const plaster=mat('#b59b74'),mortar=mat('#655447'),brick=[mat('#936e50'),mat('#a07d59'),mat('#84634b')],beam=mat('#583b29'),wood=mat('#94613c'),edge=mat('#c18d53'),black=mat('#262a25',.25),iron=mat('#535d53',.4),copper=mat('#b27d46',.55),ceramic=mat('#e0c89b'),green=mat('#657b57'),cloth=mat('#9a5440'),ash=mat('#5c4a3b'),char=mat('#392a24');
 const wall=group(root,0,0,-2.45);
 box(wall,plaster,0,1.53,0,7.5,3.35,.19);
 box(wall,mortar,0,.48,.12,7.5,1.03,.12);
 for(let row=0;row<3;row++)for(let i=0;i<9;i++){const x=(i-4)*.84+(row%2)*.4;box(wall,brick[(i+row)%3],x,.16+row*.32,.20,.79,.28,.12);}
 for(const x of [-3.35,3.35])box(wall,beam,x,1.55,.22,.24,3.30,.22);
 box(wall,beam,0,2.97,.24,7.1,.22,.24);
 box(wall,beam,0,1.02,.29,7.1,.14,.28);
 const shelf=group(wall,-.65,2.17,.38);box(shelf,wood,0,0,0,3.7,.14,.65);box(shelf,edge,0,.06,.32,3.75,.055,.08);
 for(const x of [-1.48,1.48]){const o=box(shelf,beam,x,-.22,.05,.12,.48,.12);o.rotation.x=-.48;}
 function jar(p,x,y,z,m=ceramic,s=1){const g=group(p,x,y,z);g.scale.setScalar(s);lathe(g,m,[[0,0],[.16,0],[.23,.09],[.24,.36],[.15,.43],[.14,.5]],0,0,0);cyl(g,wood,0,.51,0,.16,.17,.07);ring(g,copper,.19,.012,.15);box(g,ceramic,0,.28,.24,.19,.14,.018);return g;}
 jar(shelf,-1.2,.1,0,green,.88);jar(shelf,-.65,.1,0,ceramic,.75);jar(shelf,.05,.1,0,cloth,.9);jar(shelf,.70,.1,0,green,.67);
 const bowls=group(shelf,1.35,.1,0);for(let i=0;i<3;i++)lathe(bowls,ceramic,[[0,0],[.18,0],[.25,.10],[.26,.12],[.23,.12],[.16,.03],[0,.03]],0,i*.075,0);
 const rack=group(wall,1.75,1.82,.27);box(rack,beam,0,0,0,1.65,.12,.15);
 for(let i=0;i<3;i++){const g=group(rack,(i-1)*.48,-.12,.11);cyl(g,copper,0,0,0,.035,.035,.13);box(g,wood,0,-.28,0,.07,.50,.065);if(i===0){const o=ring(g,iron,.13,.035,-.57);o.rotation.x=0;o.position.z=.01;}else box(g,i===1?iron:edge,0,-.58,0,.22,.23,.055);}
 // Front apron, real recessed-looking firebox, masonry courses and copper rivets.
 box(root,beam,0,-.29,2.34,6.78,.39,.12);box(root,edge,0,-.11,2.39,6.76,.055,.065);
 for(const x of [-2.83,2.83]){box(root,beam,x,-.64,1.95,.29,.74,.31);box(root,copper,x,-.48,2.12,.19,.10,.035);}
 const furnace=group(root,0,.0,0);
 box(furnace,black,0,.24,1.43,1.52,.39,.09);
 for(const x of [-1.46,1.46]){box(furnace,black,x,.25,1.43,.36,.45,.10);box(furnace,copper,x,.35,1.50,.12,.10,.04);}
 for(const x of [-.83,.83])box(furnace,brick[1],x,.25,1.46,.24,.47,.16);
 box(furnace,iron,0,.47,1.47,1.58,.085,.14);box(furnace,iron,0,.055,1.47,1.62,.09,.14);
 for(let i=0;i<5;i++)box(furnace,black,(i-2)*.27,.10,1.56,.065,.12,.08);
 for(const x of [-1.75,1.75])box(furnace,copper,x,.51,0,.075,.13,2.79);
 box(furnace,copper,0,.51,1.40,3.55,.08,.07);
 for(const x of [-1.49,-.98,.98,1.49])cyl(furnace,copper,x,.56,1.34,.045,.045,.03,10);
 // Sparse surface scratches and ash marks follow the wood/stone rather than float.
 for(let i=0;i<18;i++){const x=(i%6-2.5)*.46,z=1.64+Math.floor(i/6)*.21;const o=box(root,i%3?wood:beam,x,.049,z,.12+(i%4)*.06,.006,.012);o.rotation.y=Math.sin(i*3)*.19;}
 for(let i=0;i<7;i++){const o=box(root,ash,-1.39+i*.45,.558,1.10+(i%2)*.08,.14,.006,.04);o.rotation.y=i*.71;}
 const board=group(root,-2.25,.08,.82);box(board,beam,0,0,0,.91,.10,.83);box(board,edge,0,.06,0,.87,.065,.79);
 for(let i=0;i<4;i++)box(board,wood,-.2+i*.12,.096,0,.009,.006,.36);
 function bowl(p,x,z,m=ceramic,s=1){const g=group(p,x,.075,z);g.scale.setScalar(s);lathe(g,m,[[0,0],[.13,0],[.24,.12],[.25,.15],[.22,.15],[.12,.035],[0,.035]],0,0,0);return g;}
 function tool(p,x,z,m=iron){const g=group(p,x,.14,z);box(g,wood,0,0,0,.055,.06,.48);box(g,m,0,0,-.32,.18,.055,.22);g.rotation.y=.42;return g;}
 for(const k of ['WOK','POT','GRILL','STEAM'])props[k]=group(root);
 jar(props.WOK,2.15,.07,-.65,green,1.02);bowl(props.WOK,2.3,.23,ceramic,1.1);bowl(props.WOK,2.5,.78,cloth,.85);tool(props.WOK,-2.25,.8);
 jar(props.POT,2.2,.07,-.52,ceramic,1.12);bowl(props.POT,2.28,.43,green,1.2);tool(props.POT,-2.25,.8,copper);box(props.POT,cloth,2.28,.055,1.13,.72,.025,.45);
 bowl(props.GRILL,2.15,.12,cloth,1.2);tool(props.GRILL,2.32,.72,edge);for(let i=0;i<4;i++){const o=box(props.GRILL,edge,-2.28,.20,.60+i*.11,.74,.035,.035);o.rotation.y=.1;}
 jar(props.STEAM,2.15,.07,-.52,green,1.1);box(props.STEAM,ceramic,2.28,.06,.66,.73,.027,.60);bowl(props.STEAM,2.28,.65,ceramic,1.15);for(let i=0;i<2;i++)ring(props.STEAM,edge,.33,.04,.12+i*.10).position.set(-2.25,.12+i*.10,.80);
 // Continuous tapered, turbulent wisps and layered flames; no sphere sprites.
 const plane=new T.PlaneGeometry(1,1);geos.add(plane);
 const shader=(kind)=>{const m=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:{uTime:{value:0},uStrength:{value:1},uTint:{value:new T.Color('#e9dcc3')}},vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:`varying vec2 vUv; uniform float uTime,uStrength; uniform vec3 uTint;
 void main(){float y=vUv.y; float x=vUv.x-.5; float t=uTime;
 ${kind==='flame'?`float center=.11*sin(y*8.-t*9.)*y+.05*sin(y*17.+t*11.);float w=.30*pow(max(0.,1.-y),.75)+.014;float a=(1.-smoothstep(w*.38,w,abs(x-center)))*smoothstep(0.,.09,y)*(1.-smoothstep(.78,1.,y));vec3 c=mix(vec3(1.,.23,.035),vec3(1.,.86,.32),clamp((1.-y)*.65+(1.-abs(x-center)/w)*.52,0.,1.));gl_FragColor=vec4(c,a*uStrength);`:`float center=.15*sin(y*7.-t*1.8)+.065*sin(y*16.+t*1.2);float w=.075+y*.13;float strand=1.-smoothstep(w*.32,w,abs(x-center));float split=(1.-smoothstep(.025,.085,abs(x-center-.18*y)))*smoothstep(.2,.65,y);float envelope=smoothstep(0.,.16,y)*(1.-smoothstep(.56,1.,y));float grain=.73+.27*sin(y*29.-t*3.+x*14.);gl_FragColor=vec4(uTint,(strand*.78+split*.36)*envelope*grain*uStrength);`}}
 `});mats.add(m);return m;};
 const smokeM=shader('smoke'),flameM=shader('flame'),wisps=[],flames=[];
 for(let i=0;i<9;i++)wisps.push(mesh(fx,plane,smokeM,0,0,0));
 for(let i=0;i<7;i++)flames.push(mesh(root,plane,flameM,0,0,0));
 const rippleMat=new T.MeshBasicMaterial({color:'#ffdc99',transparent:true,opacity:.37,depthWrite:false});mats.add(rippleMat);
 const ripples=Array.from({length:6},()=>ring(fx,rippleMat,.20,.008,0));
 const fleckMat=mat('#ffd58b');fleckMat.emissive.set('#e67821');fleckMat.emissiveIntensity=.8;
 const flecks=Array.from({length:10},()=>mesh(fx,new T.OctahedronGeometry(.035,0),fleckMat,0,0,0));
 const glow=new T.PointLight('#ff8c35',0,3.5,2);root.add(glow);glow.position.set(0,.40,1.7);
 const soupColor=new T.Color('#c79858'),reducedColor=new T.Color('#8c4824');
 function update(f,camera,soup,broth,ember,now){
  const active=!!f?.workbench;root.visible=fx.visible=active;if(!active)return;
  const time=f.workbench.clock||0,lit=f.lit,smoke=f.type==='GRILL'&&f.smoke>0,vent=f.type==='STEAM'&&f.vent>0;
  for(const [k,g] of Object.entries(props))g.visible=k===f.type;
  smokeM.uniforms.uTime.value=time;smokeM.uniforms.uTint.value.set(smoke?'#bcb2a0':f.type==='STEAM'?'#f9ead6':'#e8d4b2');smokeM.uniforms.uStrength.value=smoke?.61:vent?.72:f.type==='STEAM'?.47:.36;
  for(let i=0;i<wisps.length;i++){const o=wisps[i],q=(time*(f.type==='WOK'?.80:.43)+i*.137)%1,a=i*2.399;const surge=vent?1.3:smoke?1.12:1;o.visible=lit&&(f.type!=='STEAM'||vent||i<5);o.quaternion.copy(camera.quaternion);o.position.set(smoke?-.85+i*.21+q*.39:Math.cos(a)*(.18+q*.35),.66+q*.85*surge,smoke?f.workbench.z:Math.sin(a)*.26);o.scale.set((.24+q*.25)*surge,(.55+q*.65)*surge,1);}
  flameM.uniforms.uTime.value=time;flameM.uniforms.uStrength.value=.92;glow.intensity=lit?2.6+Math.sin(time*13)*.45:0;
  for(let i=0;i<flames.length;i++){const o=flames[i];o.visible=lit;o.position.set((i-3)*.19,.27+Math.sin(time*9+i*2)*.035,1.56);o.scale.set(.28,.36+Math.sin(time*7+i*1.9)*.07,1);o.rotation.y=.06*Math.sin(i);}
  ember.emissiveIntensity=lit?1.05+.36*Math.sin(time*8):.15;
  broth.color.copy(soupColor).lerp(reducedColor,f.reduction<1?.72:0);broth.roughness=f.reduction<1?.27:.43;
  for(let i=0;i<ripples.length;i++){const o=ripples[i],q=(time*(f.action==='gentle'?1.8:.72)+i/6)%1,a=i*2.4;o.visible=lit&&f.type==='POT';o.position.set(f.action==='gentle'?0:Math.cos(a)*.43,soup.position.y+.026+i*.001,f.action==='gentle'?0:Math.sin(a)*.43);o.scale.setScalar(.22+q*(f.action==='gentle'?3.25:1.20));}
  for(let i=0;i<flecks.length;i++){const o=flecks[i],q=(time*2.1+i*.127)%1,a=i*2.4;o.visible=lit&&(f.type==='GRILL'||f.type==='WOK'&&['flip','toss'].includes(f.action));o.position.set(Math.cos(a)*(.31+q*.65),.37+Math.sin(q*Math.PI)*.65,Math.sin(a)*(.32+q*.48));o.scale.setScalar(.55+(1-q)*.45);o.rotation.z=time*3+i;}
 }
 return {update};
}
