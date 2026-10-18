// Pixel cookware is drawn in the same local pixel scale as pixelActor's chef.
// These are held objects, while their attack effects remain smooth E.2 Canvas effects.
import {FORK_FLAME} from './field_v04.js?v=0.14.0-alpha.5';
const px=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h)};
const ink='#27343b',iron='#657e87',shine='#d8e5d8',copper='#d6a76c',wood='#806044';
export function drawPixelWok(c,pose,{layer='front',parry=false,level=1}={}){
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
  if(level>1){px(c,x+1,y+1,13,2,'#efca7b');px(c,x+2,y+10,11,2,'#f9dc98');px(c,x+6,y+3,3,2,'#fff2c5');}
 }
 c.restore();
}
export function drawPixelPot(c,pose,{layer='front',level=1}={}){
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
  if(level>1){px(c,16,y-4,17,2,'#f4cb80');px(c,19,y+2,11,2,'#efbb72');px(c,24,y-12,3,2,'#fff1ba');}
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
 if(f.weapon?.level>1){px(c,14,-3,3,7,'#ffd18a');px(c,22,-2,5,5,'#ffd18a');px(c,30,-6,3,13,'#e6ba6e');}
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
 if(f.weapon?.level>1){c.beginPath();c.moveTo(.35,0);c.lineTo(length+.23,0);c.strokeStyle='#ffd887';c.lineWidth=.034;c.stroke();}
 c.restore();
}
export function drawForkFlameFx(c,f){
 if(!(f.skillFx>0)||f.skillOrigin?.type!=='GRILL')return;
 const o=f.skillOrigin,p=1-Math.min(1,f.skillFx/.85),fade=Math.min(1,p*13)*Math.min(1,(1-p)*3.6);
 const angle=Math.atan2(o.dy??-1,o.dx??0),half=FORK_FLAME.halfAngle;
 c.save();c.translate(o.x,o.y);c.rotate(angle);
 const reach=(FORK_FLAME.range+(o.level>1?.3:0))*Math.min(1,.18+p*5.1),wave=p*16;
 // Moving transparent ribbons leave gaps between tongues. Their tips breathe
 // independently; no opaque sector texture hides enemies or the terrain.
 for(let i=-4;i<=4;i++){
  const a=i*half/4+Math.sin(wave+i*1.7)*.036;
  const length=reach*(.72+.20*Math.sin(wave*1.15+i*2.13));
  const width=.19+.10*(1-Math.abs(i)/5),bend=Math.sin(wave+i*1.38)*.11;
  c.save();c.rotate(a);c.globalAlpha=fade*(i%2?.55:.72);
  c.beginPath();c.moveTo(.12,-.05);
  c.bezierCurveTo(length*.21,-width*.86,length*.42,-width*1.42+bend,length*.64,-width*.64+bend);
  c.bezierCurveTo(length*.82,-width*.21+bend,length*.78,-width*.62+bend,length,-.04+bend*.35);
  c.bezierCurveTo(length*.85,width*.16+bend,length*.78,width*.08+bend,length*.65,width*.55+bend);
  c.bezierCurveTo(length*.43,width*1.18+bend,length*.19,width*.66,.12,.05);c.closePath();
  c.fillStyle=i%3===0?'#d4482a':'#ef6d2e';c.fill();
  c.beginPath();c.moveTo(.19,-.025);
  c.bezierCurveTo(length*.35,-width*.38,length*.57,-width*.34+bend*.3,length*.77,-.035+bend*.2);
  c.bezierCurveTo(length*.58,width*.39+bend*.3,length*.36,width*.59,.19,.025);c.closePath();
  c.fillStyle=i%2?'#ffbf67':'#ffdb89';c.fill();
  c.restore();
 }
 // White-hot ignition lives near the fork, then a second wave curls off
 // the cone perimeter. Sparks travel outward and separate as it dissipates.
 c.globalAlpha=fade*.88;
 c.beginPath();c.ellipse(.28,0,.28+.12*Math.sin(wave)**2,.12,0,0,Math.PI*2);
 c.fillStyle='#fff0b4';c.fill();
 for(let i=-4;i<=4;i++){
  const a=(i+.5)*half/5,travel=(.34+((p*1.7+i*13/17)%1)*.69)*reach;
  const xx=Math.cos(a)*travel,yy=Math.sin(a)*travel+Math.sin(wave+i*2)*.08;
  c.globalAlpha=fade*(.35+.35*(1-travel/Math.max(reach,.01)));
  c.beginPath();c.moveTo(xx-.10,yy+.04);c.quadraticCurveTo(xx+.025,yy-.10,xx+.16,yy-.13);
  c.strokeStyle=i%2?'#ffd778':'#f98945';c.lineWidth=.045;c.stroke();
  c.fillStyle='#ffe9a5';c.fillRect(xx+.14,yy-.15,.035,.035);
 }
 c.restore();
}
