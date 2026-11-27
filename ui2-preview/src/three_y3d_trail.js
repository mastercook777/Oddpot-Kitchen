// A swept mesh from the actual world-space spatula blade. No combat writes.
export function makeBladeTrail(T,scene){
 const count=12,positions=new Float32Array(count*2*3),indices=[];for(let i=0;i<count-1;i++){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));geo.setIndex(indices);
 const colors=new Float32Array(count*2*3);for(let i=0;i<count;i++)for(let j=0;j<2;j++){const k=(i*2+j)*3;colors[k]=1;colors[k+1]=j?.88:.58;colors[k+2]=j?.54:.24;}geo.setAttribute('color',new T.BufferAttribute(colors,3));
 const mat=new T.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.75,side:T.DoubleSide,depthWrite:false});
 const mesh=new T.Mesh(geo,mat);mesh.frustumCulled=false;mesh.visible=false;scene.add(mesh);let samples=[],prev=1,prior=null;
 return {draw(f,rig){const spin=f.skillOrigin?.type==='WOK'&&f.skillOrigin?.duration&&f.skillFx>0,a=spin?f.skillOrigin:f.attackFx,ttl=spin?f.skillFx:a?.ttl,active=f.weapon?.type==='WOK'&&ttl>0;
  if(!active){samples=[];prior=null;prev=1;mesh.visible=false;return false;}
  const p=Math.max(0,Math.min(1,1-ttl/(a.duration||.33))),point=rig.bladeWorld();
  if(p<prev-.04||prior!==a){samples=[];prior=a;}prev=p;
  if(p<(spin?.88:.62)){const last=samples.at(-1);if(!last||last.tip.distanceTo(point.tip)>.012)samples.push(point);}
  if(samples.length>count)samples.shift();mesh.visible=samples.length>=2;mat.opacity=.78*Math.max(0,1-p);
  if(mesh.visible){for(let i=0;i<samples.length;i++){const s=samples[i];positions.set(s.base.toArray(),i*6);positions.set(s.tip.toArray(),i*6+3);}geo.attributes.position.needsUpdate=true;geo.setDrawRange(0,(samples.length-1)*6);}
  return mesh.visible;
 },dispose(){scene.remove(mesh);geo.dispose();mat.dispose();}};
}
