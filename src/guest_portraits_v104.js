// v0.10.4 - Guest encyclopedia portraits use the EXACT actor renderer
// already used by live restaurant guests; never duplicate pixel art.
import {pixelActor} from './pixels_v041.js?v=0.9.0';
import {CUSTOMERS} from './data.js?v=0.13.0-alpha.6';

// One source for old customers and the star-unlocked stargazer/gardener.
const GUEST_KINDS=new Set(Object.keys(CUSTOMERS));
export function drawGuestPortrait(canvas,kind){
 if(!GUEST_KINDS.has(kind)||!canvas||typeof canvas.getContext!=='function')return false;
 const c=canvas.getContext('2d');
 if(!c)return false;
 c.imageSmoothingEnabled=false;
 c.clearRect(0,0,canvas.width,canvas.height);
 // 64x80-native thumbnail; the actor's original 16x24-ish raster silhouette
 // is reproduced pixel-for-pixel at a fixed, integer-positioned scale.
 pixelActor(c,kind,Math.round(canvas.width/2),Math.round(canvas.height/2)+7,2.45,{face:1,walk:0,attack:false});
 return true;
}
export function drawGuestPortraits(root){
 if(!root||typeof root.querySelectorAll!=='function')return 0;
 let drawn=0;
 for(const node of root.querySelectorAll('canvas[data-guest-portrait]')){
  if(drawGuestPortrait(node,node.dataset.guestPortrait))drawn++;
 }
 return drawn;
}
