// Y5c3: orthographic ray integration through a bounded 3D density field.
// A single proxy box, no billboard/ribbon or texture sequence for GRILL.
const sat=x=>Math.max(0,Math.min(1,x));
export function fireVolumePlan(d,sine,nozzle){
 const p=sat(d.phase??1-(d.alpha??1)),n=Math.hypot(d.dx||0,d.dy||0)||1;
 const dx=(d.dx||0)/n,dz=(d.dy||0)/n/sine,k=Math.hypot(dx,dz)||1;
 const axis=[dx/k,0,dz/k],start=[d.x,0,d.y/sine],range=(d.r||2.7)*k;
 const advance=(nozzle.x-start[0])*axis[0]+(nozzle.z-start[2])*axis[2];
 const length=Math.max(.25,range-Math.max(0,advance)),width=(d.r||2.7)*1.13/Math.min(1,sine);
 return {axis,length,width,height:1.30,head:sat((p-.105)*5.7),opacity:sat((p-.105)*18)*sat((1-p)*4.5),phase:p};
}
const vertex=`
 varying vec3 vLocal;
 void main(){vLocal=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}
`;
const fragment=`
 uniform vec3 uRay;
 uniform float uTime,uHead,uOpacity;
 varying vec3 vLocal;
 float hash(vec3 p){p=fract(p*0.3183099+vec3(.1,.23,.37));p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
 float noise3(vec3 p){
  vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
   mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
 }
 void main(){
  vec3 ray=normalize(uRay);
  vec3 safeRay=vec3(abs(ray.x)<.00001?.00001:ray.x,abs(ray.y)<.00001?.00001:ray.y,abs(ray.z)<.00001?.00001:ray.z);
  vec3 a=(-vec3(.5)-vLocal)/safeRay,b=(vec3(.5)-vLocal)/safeRay;
  vec3 farT=max(a,b);float endT=max(0.0,min(farT.x,min(farT.y,farT.z)));
  float dt=endT/26.0;vec4 sum=vec4(0.0);
  for(int i=0;i<26;i++){
   vec3 q=vLocal+ray*((float(i)+.5)*dt);float z=q.z+.5;
   float head=1.0-smoothstep(max(0.0,uHead-.18),max(.001,uHead),z);
   float end=1.0-smoothstep(.78,1.0,z);
   vec3 adv=vec3(q.x*8.0,q.y*7.0,z*9.0-uTime*12.0);
   float n=noise3(adv),n2=noise3(adv*2.03+vec3(4.1,2.7,1.9));
   float turbulence=n*.72+n2*.28;
   float rx=.045+.41*z,ry=.055+.24*z;
   float curlX=(n-.5)*.16*z,cy=-.16+.20*z+(n2-.5)*.12*z;
   float radial=length(vec2((q.x-curlX)/rx,(q.y-cy)/ry));
   float envelope=1.0-smoothstep(.45,1.0,radial+(turbulence-.5)*.55);
   float density=envelope*head*end*smoothstep(.15,.68,turbulence)*uOpacity;
   float core=(1.0-smoothstep(.15,.7,radial))*(1.0-z)*head;
   float heat=clamp(core*.83+turbulence*.42,0.0,1.0);
   vec3 col=mix(vec3(.86,.055,.006),vec3(1.0,.45,.025),smoothstep(.12,.58,heat));
   col=mix(col,vec3(1.0,.96,.73),smoothstep(.55,.91,heat));
   float alpha=1.0-exp(-(density*9.0+core*2.2*uOpacity)*dt);
   sum.rgb+=(1.0-sum.a)*col*alpha;sum.a+=(1.0-sum.a)*alpha;
  }
  if(sum.a<.006)discard;
  gl_FragColor=vec4(sum.rgb/max(.001,sum.a),sum.a);
 }
`;
export function makeFireVolume(T,scene,sine){
 const root=new T.Group(),geo=new T.BoxGeometry(1,1,1);
 const mat=new T.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,uniforms:{uRay:{value:new T.Vector3(0,-1,0)},uTime:{value:0},uHead:{value:0},uOpacity:{value:0}},transparent:true,depthWrite:false,side:T.FrontSide});
 const box=new T.Mesh(geo,mat);box.frustumCulled=false;box.renderOrder=4;root.add(box);
 const emberGeo=new T.OctahedronGeometry(1,0),emberMat=new T.MeshBasicMaterial({color:0xffb44c,transparent:true,depthWrite:false,blending:T.AdditiveBlending});
 const embers=Array.from({length:14},()=>{const o=new T.Mesh(emberGeo,emberMat);o.renderOrder=5;root.add(o);return o;});
 scene.add(root);root.visible=false;let token=null,nozzle=null;
 const inv=new T.Matrix4(),ray=new T.Vector3(),axis=new T.Vector3(),pos=new T.Vector3();
 return {draw(d,t,tip,camera,cast){
  if(!d||!tip||!camera){root.visible=false;token=null;nozzle=null;return 0;}
  if(token!==cast){token=cast;nozzle=null;}
  if((d.phase??0)<.105){root.visible=false;return 0;}
  if(!nozzle)nozzle=tip.clone();
  const v=fireVolumePlan(d,sine,nozzle);root.visible=v.opacity>.005;
  axis.set(...v.axis);box.position.copy(nozzle).addScaledVector(axis,v.length*.5);box.position.y+=v.height*.16;
  box.rotation.y=Math.atan2(axis.x,axis.z);box.scale.set(v.width,v.height,v.length);box.updateMatrixWorld(true);
  camera.getWorldDirection(ray);ray.transformDirection(inv.copy(box.matrixWorld).invert());mat.uniforms.uRay.value.copy(ray);mat.uniforms.uTime.value=t;mat.uniforms.uHead.value=v.head;mat.uniforms.uOpacity.value=v.opacity;
  emberMat.opacity=v.opacity*.9;
  for(let j=0;j<embers.length;j++){const o=embers[j],u=((v.phase*2.7+j*.073)%1),travel=u*v.length*v.head,w=Math.sin(j*2.399+t*2.2)*v.width*.37*u;
   pos.copy(nozzle).addScaledVector(axis,travel);pos.x+=axis.z*w;pos.z-=axis.x*w;pos.y+=.12+u*.42+.12*Math.sin(j*3.7+t*5);o.position.copy(pos);o.rotation.y=box.rotation.y;o.scale.set(.016,.019,.055+u*.07);o.visible=u>.05&&u<.94;
  }return root.visible?1:0;
 },dispose(){scene.remove(root);geo.dispose();mat.dispose();emberGeo.dispose();emberMat.dispose();}};
}
