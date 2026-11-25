// Procedural, world-space flowing ribbons. No sphere sprites, textures,
// extra simulation events or per-frame GPU allocations.
const sat=n=>Math.max(0,Math.min(1,n));
export function fluidRibbonSamples(d,t=0){
 const out=[],r=Math.max(.02,d.r||.2),p=sat(d.phase??(1-(d.alpha??1))),a=Math.atan2(d.dx||0,d.dy||0);
 const put=(kind,theta,baseX,baseZ,length,height,width,opacity,seed,tilt=0)=>out.push({kind,theta,baseX,baseZ,length,height,width,opacity:sat(opacity),seed,tilt,phase:p});
 if(d.kind==='flame'){
  const reach=r*Math.min(1,.34+p*5.8),base=Math.min(.58,reach*.62),fade=Math.min(1,.35+p*12)*Math.min(1,(1-p)*3.8);
  for(let j=0;j<11;j++){
   const lane=(j-5)/5,theta=a+lane*.48+Math.sin(t*13+j*1.9)*.022;
   const len=Math.max(.04,(reach-base)*(.76+.24*Math.sin(t*9+j*2.13)**2));
   put(1,theta,Math.sin(a)*base,Math.cos(a)*base,len,.15+.28*(1-Math.abs(lane)),.13+.12*(1-Math.abs(lane)),fade*(j%2?.64:.88),j*2.13,j%2?1.0:.30);
  }
  // Bright narrow core, then thin flying ember streaks, not solid particles.
  put(1,a,Math.sin(a)*base,Math.cos(a)*base,Math.max(.04,(reach-base)*.83),.12,.13,fade,29,.67);
  for(let j=0;j<6;j++){const theta=a+(j-2.5)*.17,u=.42+((p*2.1+j*.173)%1)*.48,dist=reach*u;put(2,theta,Math.sin(theta)*dist,Math.cos(theta)*dist,.09+.14*(1-u),.07,.018,fade*.78,j+33,.5);}
 }else if(d.kind==='potPressure'||d.kind==='potErupt'){
  const pre=d.kind==='potPressure',burst=pre?0:Math.sin(Math.PI*Math.min(1,p*1.45)),fade=pre?.34+p*.36:(1-p)*.83;
  for(let j=0;j<(pre?6:10);j++){
   const theta=j*2.399,rad=r*(pre?.52:.07+p*.40)*(j%3+1)/3;
   put(0,theta,Math.cos(theta)*rad,Math.sin(theta)*rad,pre?.12:.18+p*.34,pre?.18+p*.29:.20+burst*(.86+(j%3)*.18)+p*.45,pre?.10:.20+p*.32,fade*(j%2?.67:.87),j*1.61,j%2?.7:.2);
  }
  if(!pre)for(let j=0;j<8;j++){const theta=j*2.399,dist=r*(.10+p*.66),h=Math.sin(Math.PI*p)*(.35+j%3*.16);put(3,theta,Math.cos(theta)*dist,Math.sin(theta)*dist,.09+.10*p,h,.018,fade,j+50,.25);}
 }else if(d.kind==='thrust'){
  const len=Math.hypot(d.dx||0,d.dy||0),fade=sat(d.alpha??1);
  for(let j=-1;j<=1;j++){const b=j*.095,base=Math.max(.15,len*.23),theta=a+j*.032;put(2,theta,Math.sin(a)*base+Math.cos(a)*b,Math.cos(a)*base-Math.sin(a)*b,Math.max(.04,len-base),.03,.035+Math.abs(j)*.012,fade*(j? .60:.92),j+4,j? .38:.9);}
 }
 return out;
}
const vertex=`
 uniform float uMode,uAngle,uLength,uHeight,uWidth,uPhase,uTime,uSeed,uTilt;
 uniform vec2 uBase;
 varying vec2 vUv;
 void main(){
  vUv=uv; float v=uv.y, side=uv.x*2.0-1.0;
  vec3 forward=vec3(sin(uAngle),0.0,cos(uAngle));
  vec3 right=vec3(cos(uAngle),0.0,-sin(uAngle));
  float curl=sin(v*7.0-uTime*9.0+uSeed)*sin(v*3.14159);
  vec3 pos=vec3(uBase.x,0.0,uBase.y);
  if(uMode<0.5){
   float taper=(0.28+0.72*sin(v*2.1))*pow(max(0.0,1.0-v),0.26);
   pos+=forward*(v*uLength+curl*uWidth*0.32)+right*side*uWidth*taper;
   pos.y+=v*uHeight+side*uTilt*uWidth*0.16;
  }else if(uMode>2.5){
   pos+=forward*(v*uLength)+right*side*uWidth*(1.0-v*0.78);
   pos.y+=uHeight+v*0.16;
  }else{
   float taper=sin(3.14159*pow(v,0.68))*0.9+0.08;
   pos+=forward*(v*uLength)+right*(side*uWidth*taper*cos(uTilt)+curl*uWidth*0.42);
   pos.y+=uHeight*sin(v*1.9)+side*uWidth*taper*sin(uTilt);
  }
  gl_Position=projectionMatrix*modelViewMatrix*vec4(pos,1.0);
 }`;
const fragment=`
 uniform float uMode,uTime,uPhase,uSeed,uOpacity;
 varying vec2 vUv;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),u.x),mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),u.x),u.y);}
 void main(){
  float v=vUv.y,x=abs(vUv.x*2.0-1.0);
  vec2 flow=vec2(vUv.x*4.7+uSeed,v*8.0-uTime*5.0);
  float n=noise(flow)*0.65+noise(flow*2.07+vec2(2.7,1.2))*0.35;
  float edge=1.0-smoothstep(0.28,1.0,x+0.22*(n-0.5));
  float ends=smoothstep(0.0,0.10,v)*(1.0-smoothstep(0.67,1.0,v));
  vec3 color;float alpha;
  if(uMode<0.5){
   color=mix(vec3(0.42,0.66,0.65),vec3(0.93,0.99,0.94),smoothstep(0.25,0.85,n));
   alpha=edge*ends*pow(n,1.5)*uOpacity;
  }else if(uMode<1.5){
   float heat=clamp((1.0-x)*0.76+(1.0-v)*0.25+n*0.21,0.0,1.0);
   color=mix(vec3(0.90,0.14,0.025),vec3(1.0,0.52,0.06),smoothstep(0.14,0.61,heat));
   color=mix(color,vec3(1.0,0.97,0.71),smoothstep(0.68,0.96,heat));
   alpha=edge*ends*smoothstep(0.16,0.53,n)*uOpacity;
  }else{
   color=uMode>2.5?vec3(0.80,0.98,0.92):vec3(1.0,0.84,0.46);
   alpha=pow(edge,2.0)*ends*uOpacity;
  }
  gl_FragColor=vec4(color,alpha);
 }`;
export function makeSkillFluidLayer(T,scene,sine){
 const root=new T.Group();scene.add(root);
 const geo=new T.PlaneGeometry(1,1,8,26),pool=[];
 const kinds=new Set(['flame','potPressure','potErupt','thrust']);
 function slot(){const uniforms={uMode:{value:0},uAngle:{value:0},uLength:{value:1},uHeight:{value:1},uWidth:{value:1},uPhase:{value:0},uTime:{value:0},uSeed:{value:0},uTilt:{value:0},uBase:{value:new T.Vector2()},uOpacity:{value:0}};
  const mat=new T.ShaderMaterial({uniforms,vertexShader:vertex,fragmentShader:fragment,transparent:true,depthWrite:false,side:T.DoubleSide});
  const o=new T.Mesh(geo,mat);o.frustumCulled=false;root.add(o);pool.push(o);return o;
 }
 return {draw(data,t){let i=0;for(const d of data){if(!kinds.has(d.kind))continue;for(const q of fluidRibbonSamples(d,t)){
   if(i>=48)break;const o=pool[i]||slot(),u=o.material.uniforms;i++;o.visible=q.opacity>0;
   o.position.set(d.x,d.h||0,d.y/sine);o.scale.set(1,1,1/sine);
   u.uMode.value=q.kind;u.uAngle.value=q.theta;u.uLength.value=q.length;u.uHeight.value=q.height;u.uWidth.value=q.width;u.uPhase.value=q.phase;u.uTime.value=t;u.uSeed.value=q.seed;u.uTilt.value=q.tilt;u.uOpacity.value=q.opacity;u.uBase.value.set(q.baseX,q.baseZ);
  }}for(let j=i;j<pool.length;j++)pool[j].visible=false;return i;},dispose(){for(const o of pool)o.material.dispose();geo.dispose();scene.remove(root);}};
}
