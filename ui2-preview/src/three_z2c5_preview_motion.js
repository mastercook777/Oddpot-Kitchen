// Z2c5: presentation-only clock and two fixed-aspect viewports in one buffer.
export function previewCadence(){
 let tier=2,window=[],fastWindows=0;
 const qualities=[.68,.85,1.05];
 return {get quality(){return qualities[tier]},get target(){return tier===2?60:30},
  due(now,last){return now-last>=(tier===2?15:30);},
  observe(cost,gap){
   if(!Number.isFinite(gap)||gap>250)return;
   window.push({cost,gap});if(window.length<18)return;
   const avg=k=>window.reduce((s,x)=>s+x[k],0)/window.length,slow=avg('cost')>21||avg('gap')>(tier===2?28:43),fast=avg('cost')<11&&avg('gap')<(tier===2?21:38);window=[];
   if(slow){tier=Math.max(0,tier-1);fastWindows=0;}else if(fast){if(++fastWindows>=4){tier=Math.min(2,tier+1);fastWindows=0;}}else fastWindows=0;
  }};
}
export function previewAtlas(w1,h1,w2,h2,quality){
 const fit=(w,h)=>{w=Math.max(1,w);h=Math.max(1,h);const scale=Math.min(quality,650/w,650/h);return {w:Math.max(1,Math.round(w*scale)),h:Math.max(1,Math.round(h*scale))}};
 const a=fit(w1,h1),b=fit(w2,h2),height=Math.max(a.h,b.h);
 return {width:a.w+b.w,height,land:{...a,x:0,y:height-a.h},hero:{...b,x:a.w,y:height-b.h}};
}
export function ecologyIdle(kind,t,i=0){
 const a=t*.68+i*2.17,step=t*4.2+i,hop=Math.max(0,Math.sin(step)),breath=Math.sin(t*2.2+i),peck=Math.pow(Math.max(0,Math.sin(t*1.1+i)),12);
 const x=Math.sin(a)*.39,z=Math.sin(a*1.17+.7)*.24,yaw=Math.atan2(Math.cos(a)*.39,.28*Math.cos(a*1.17+.7));
 if(kind==='chicken')return {x,z,y:.045*hop,yaw,bodyY:.012*hop,pitch:peck*.19,sy:1-.035*peck,sxz:1+.017*peck,limb:0,wing:.12*hop,head:0};
 if(kind==='boar')return {x:x*.65,z:z*.65,y:0,yaw,bodyY:.006*breath,pitch:.017*breath,sy:1+.015*breath,sxz:1,limb:.19,wing:0,head:.08*Math.sin(a*1.6)};
 if(kind==='sporeling')return {x:x*.62,z:z*.65,y:.075*hop,yaw,bodyY:0,pitch:0,sy:1-.055*Math.cos(step),sxz:1+.028*Math.cos(step),limb:0,wing:0,head:0};
 if(kind==='gust_moth')return {x,z,y:.30+.10*Math.sin(step*.65),yaw,bodyY:0,pitch:.05*Math.sin(a),sy:1,sxz:1,limb:0,wing:.55,head:0};
 return {x,z,y:.012*hop,yaw,bodyY:.009*breath,pitch:.025*breath,sy:1+.02*breath,sxz:1,limb:.17,wing:.21,head:0};
}
