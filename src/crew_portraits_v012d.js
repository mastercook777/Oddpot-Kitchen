// v0.12-D: one painter for the real service actor AND its magnified staff-sheet portrait.
import {pixelActor,crewAppearance} from './pixels_v041.js?v=0.15.0-alpha.6';
export function drawCrewPortrait(canvas,role,level=1){
 if(!canvas||typeof canvas.getContext!=='function')return false;
 const look=crewAppearance(role,level);
 if(!look)return false;
 const c=canvas.getContext('2d');if(!c)return false;
 c.clearRect(0,0,canvas.width,canvas.height);
 c.imageSmoothingEnabled=false;
 const scale=Math.min(canvas.width/28,canvas.height/36);
 pixelActor(c,role,Math.round(canvas.width/2),Math.round(canvas.height*.59),scale,
  {walk:0,attack:false,level:look.level,face:1});
 return true;
}
export function drawCrewPortraits(root){
 if(!root||typeof root.querySelectorAll!=='function')return 0;
 let count=0;
 for(const canvas of root.querySelectorAll('canvas[data-crew-portrait]')){
  const look=crewAppearance(canvas.dataset.crewPortrait,Number(canvas.dataset.level));
  if(look&&drawCrewPortrait(canvas,look.role,look.level))count++;
 }
 return count;
}
