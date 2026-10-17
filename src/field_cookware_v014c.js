// Pixel cookware is drawn in the same local pixel scale as pixelActor's chef.
// These are held objects, while their attack effects remain smooth E.2 Canvas effects.
import {FORK_FLAME} from './field_v04.js';
const px=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h)};
const ink='#27343b',iron='#657e87',shine='#d8e5d8',copper='#d6a76c',wood='#806044';
export function drawPixelWok(c,pose,{layer='front',parry=false}={}){
 const side=layer==='back'?-pose.shieldSign:pose.shieldSign,bob=pose.weapon.y-5;
 c.save();c.scale(side,1);
 if(layer==='back'){
  px(c,7,6+bob,17,4,ink);px(c,8,6+bob,15,2,wood);
  px(c,21,1+bob,15,12,ink);px(c,22,2+bob,13,9,iron);
  px(c,24,3+bob,9,2,shine);px(c,23,9+bob,11,2,'#465d66');
 }else{
  const x=pose.shield.x*pose.shieldSign-7,y=pose.shield.y-7;
  px(c,x,y,15,15,ink);px(c,x+2,y+2,11,11,'#869aa1');
  px(c,x+4,y+4,7,7,parry?'#fff2c1':'#516d75');
  px(c,x+5,y+5,4,3,parry?'#ffe397':'#c3d5d1');
  px(c,x+6,y-3,3,3,copper);
 }
 c.restore();
}
export function drawPixelPot(c,pose,{layer='front'}={}){
 const side=pose.side,y=pose.pot.y;
 c.save();c.scale(side,1);
 if(layer==='back'){
  px(c,7,6,17,4,ink);px(c,8,7,14,2,wood);
 }else{
  px(c,13,y-7,22,17,ink);px(c,15,y-5,18,13,'#4e6e77');
  px(c,16,y-4,15,3,shine);px(c,17,y+1,14,4,iron);
  px(c,11,y-3,4,7,ink);px(c,35,y-3,4,7,ink);
  px(c,14,y-10,21,4,ink);px(c,16,y-9,17,2,copper);
  px(c,22,y-13,6,3,ink);px(c,23,y-12,4,2,shine);
  px(c,19,y+6,10,2,'#334e56');
 }
 c.restore();
}
export function forkExtension(attackFx){
 if(!attackFx?.forkThrust||!attackFx.ttl)return 0;
 const p=1-attackFx.ttl/attackFx.duration;
 return p<.12?-3*p/.12:p<.56?-3+19*(p-.12)/.44:16*(1-(p-.56)/.44);
}
export function drawPixelFork(c,f,{layer='front'}={}){
 const facing=f.facing||{x:1,y:0},back=facing.y<-.35;
 if((layer==='back')!==back)return;
 const attack=f.attackFx,active=attack?.forkThrust||attack?.forkFlame;
 const dx=active?attack.dx:facing.x,dy=active?attack.dy:facing.y;
 const angle=Math.atan2(dy,dx),side=dx<-.1?-1:1;
 c.save();c.translate(side*8,8);c.rotate(angle);
 c.translate(forkExtension(attack),0);
 // Hand grip, metal collar, straight neck and three separated pointed tines.
 px(c,-2,-3,11,7,ink);px(c,-1,-2,9,5,wood);px(c,0,-1,6,2,copper);
 px(c,8,-4,4,9,ink);px(c,9,-3,2,7,shine);
 px(c,12,-3,18,7,ink);px(c,13,-2,17,5,iron);px(c,14,-1,13,2,shine);
 px(c,29,-7,5,15,ink);px(c,30,-6,3,13,iron);
 for(const y of [-7,-1,5]){px(c,33,y,9,3,ink);px(c,34,y,7,2,shine);px(c,41,y,3,1,'#fff2d4');}
 c.restore();
}
export function drawForkThrustFx(c,f){
 const fx=f.attackFx;if(!fx?.forkThrust||fx.ttl<=0)return;
 const p=1-fx.ttl/fx.duration;if(p<.10||p>.88)return;
 const phase=p<.52?(p-.10)/.42:(.88-p)/.36;
 const length=.45+1.7*Math.max(0,Math.min(1,phase));
 c.save();c.translate(fx.x,fx.y);c.rotate(Math.atan2(fx.dy,fx.dx));
 c.globalAlpha=Math.max(0,Math.min(1,phase))*.85;c.lineCap='round';
 // Converging air cuts make the tip's depth legible without a solid beam.
 for(const side of [-1,1]){
  c.beginPath();c.moveTo(.23,side*.24);c.quadraticCurveTo(length*.65,side*(.30-.13*phase),length,side*.07);
  c.strokeStyle=side<0?'#fff1d0':'#c98e62';c.lineWidth=.025+.015*phase;c.stroke();
 }
 c.beginPath();c.moveTo(length-.32,0);c.lineTo(length+.12,0);c.strokeStyle='#fff7dd';c.lineWidth=.055;c.stroke();
 for(let i=0;i<3;i++){const x=length-.16+i*.12;
  c.beginPath();c.moveTo(x,-.10-i*.035);c.lineTo(x+.11,.02);c.strokeStyle='#f8c78e';c.lineWidth=.022;c.stroke();}
 c.restore();
}
export function drawForkFlameFx(c,f){
 if(!(f.skillFx>0)||f.skillOrigin?.type!=='GRILL')return;
 const o=f.skillOrigin,p=1-Math.min(1,f.skillFx/.85),fade=Math.min(1,p*12)*Math.min(1,(1-p)*3);
 const angle=Math.atan2(o.dy??-1,o.dx??0),half=FORK_FLAME.halfAngle;
 c.save();c.translate(o.x,o.y);c.rotate(angle);c.globalAlpha=fade*.93;
 const reach=FORK_FLAME.range*Math.min(1,.36+p*4.2);
 const layers=[{r:reach,a:half,fill:'#df4d23'},{r:reach*.82,a:half*.79,fill:'#ff972f'},{r:reach*.64,a:half*.53,fill:'#ffe49a'}];
 for(const layer of layers){
  c.beginPath();c.moveTo(.16,0);c.arc(0,0,layer.r,-layer.a,layer.a);c.closePath();
  c.fillStyle=layer.fill;c.fill();
 }
 for(let i=-5;i<=5;i++){
  const a=i*half/5,r=reach*(.72+(i%3)*.06),x=Math.cos(a)*r,y=Math.sin(a)*r;
  c.beginPath();c.moveTo(x-.15,y);c.quadraticCurveTo(x+.12,y-.08,x+.30,y-.04-.18*(1-p));
  c.quadraticCurveTo(x+.08,y+.13,x-.15,y);c.fillStyle=i%2?'#ffb958':'#ffe1a2';c.fill();
 }
 for(let i=-4;i<=4;i++){
  const a=(i+.45)*half/5,r=reach*(.87+(i%2)*.06);
  c.beginPath();c.moveTo(Math.cos(a)*r,Math.sin(a)*r);
  c.quadraticCurveTo(Math.cos(a)*reach*1.12,Math.sin(a)*reach*1.13-.16,
   Math.cos(a)*reach*.92,Math.sin(a)*reach*.92-.23);
  c.strokeStyle=i%2?'#ff8b34':'#f9c46e';c.lineWidth=.08;c.stroke();
 }
 for(let i=0;i<8;i++){
  const a=-half+((i*5)%9)*half/4,r=reach*(.35+((i*3)%5)*.11);
  c.fillStyle='#ffecc2';c.fillRect(Math.cos(a)*r,Math.sin(a)*r-.1-p*.3,.035,.035);
 }
 c.restore();
}
