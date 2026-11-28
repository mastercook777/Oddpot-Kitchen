// v0.11-B1: pure, resolution-independent camera for portrait H5 field scenes.
export function fieldCamera(f,width,height){
 const w=Math.max(1,Number(width)||1),h=Math.max(1,Number(height)||1);
 const mapW=f?.worldW||9,mapH=f?.worldH||11;
 const expanded=f?.worldVersion==='0.11-B1';
 if(!expanded){
  const scale=Math.min(w/mapW,h/mapH);
  return {scale,offsetX:(w-scale*mapW)/2,offsetY:(h-scale*mapH)/2,
   cameraX:0,cameraY:0,viewW:w/scale,viewH:h/scale,expanded:false};
 }
 // Hold roughly the original on-screen actor/tile size instead of shrinking
 // all sprites to fit 12x16. Clamp to map edges; center if viewport is larger.
 const scale=Math.max(Math.min(w/7.6,h/10),w/mapW,h/mapH);
 const viewW=w/scale,viewH=h/scale;
 const center=f?.pos||f?.spawn||{x:mapW/2,y:mapH/2};
 const limit=(n,max)=>Math.max(0,Math.min(n,Math.max(0,max)));
 const cameraX=limit(center.x-viewW/2,mapW-viewW);
 const cameraY=limit(center.y-viewH/2,mapH-viewH);
 return {scale,cameraX,cameraY,viewW,viewH,expanded:true,
  offsetX:viewW>=mapW?(w-mapW*scale)/2:-cameraX*scale,
  offsetY:viewH>=mapH?(h-mapH*scale)/2:-cameraY*scale};
}
