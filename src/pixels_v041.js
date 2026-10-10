// v0.4.1 original 16x24-ish pixel actors. Raster blocks rendered at integer scale,
// so these are maintainable gameplay sprites rather than platform emoji or external art.
const P={outline:'#2b3334',skin:'#e4b18a',skinLight:'#f7d0a1',white:'#f5ead1',shadow:'#534b48'};
function r(c,x,y,w,h,col){c.fillStyle=col;c.fillRect(x|0,y|0,w|0,h|0)}
function person(c,kind,walk,attack){
 const p={chef:['#477a91','#e7d4a7','#7e4f37'],helper:['#d27a46','#f2d69a','#654730'],waiter:['#708d62','#dfc18e','#466251'],adventurer:['#4d8a66','#c59d55','#5d4630'],family:['#d67872','#f0cf79','#8a5747'],regular:['#729aba','#9bc1ce','#6c5440'],critic:['#795777','#bb9abd','#362e48']}[kind]||['#729aba','#9bc1ce','#6c5440'];
 const step=walk?Math.round(Math.sin(walk*13)*2):0,arm=attack? -7:Math.round(Math.sin(walk*13+2)*1);
 // Shoes, alternating leg pixels, outlined torso/arms, expressive large face.
 r(c,3,18+step,5,5,P.outline);r(c,10,18-step,5,5,P.outline);
 r(c,4,19+step,3,4,'#56493e');r(c,11,19-step,3,4,'#56493e');
 r(c,3,9,13,12,P.outline);r(c,4,10,11,10,p[0]);
 r(c,1,10,4,8,P.outline);r(c,2,11,3,6,p[0]);
 r(c,14,10+arm,4,8,P.outline);r(c,15,11+arm,2,6,p[0]);
 r(c,5,11,8,8,p[1]);r(c,8,11,2,6,kind==='chef'?'#d26f52':p[0]);
 r(c,3,2,13,11,P.outline);r(c,4,3,11,9,P.skin);r(c,5,4,9,6,P.skinLight);
 r(c,5,6,2,2,P.outline);r(c,12,6,2,2,P.outline);r(c,9,9,3,1,'#9d644f');
 if(kind==='chef'||kind==='helper'){
  r(c,2,1,15,4,P.outline);r(c,3,1,13,3,P.white);r(c,5,-4,9,6,P.outline);r(c,6,-4,7,5,P.white);r(c,8,-6,4,3,P.white);
 }else if(kind==='waiter'){
  r(c,2,0,14,3,'#466251');r(c,6,-2,7,3,'#ddc391');r(c,6,13,8,3,'#e9daa7');
 }else if(kind==='adventurer'){
  r(c,2,1,15,4,P.outline);r(c,4,0,12,4,p[2]);r(c,14,11,4,8,'#8c764b');
 }else if(kind==='critic'){
  r(c,3,0,13,4,P.outline);r(c,4,0,11,2,p[2]);r(c,1,3,4,8,p[2]);r(c,14,3,4,8,p[2]);r(c,5,13,8,2,'#d4b16d');
 }else if(kind==='family'){
  r(c,3,0,13,4,p[2]);r(c,2,3,4,8,p[2]);r(c,15,3,3,8,p[2]);
 }else{
  r(c,3,0,13,4,p[2]);r(c,4,3,5,2,p[2]);
 }
 if(attack){
  // A readable, off-center utensil silhouette synchronized to the attack state.
  r(c,17,-1,2,12,'#b7c4b8');r(c,14,-4,8,4,P.outline);r(c,15,-4,6,3,'#e2ddc3');
 }
}
export function pixelActor(c,kind,x,y,scale=2.4,options={}){
 c.save();c.translate(Math.round(x),Math.round(y));const face=options.face??1;
 c.scale((face<0?-1:1)*scale,scale);c.translate(-9,-12);
 if(options.hurt&&Math.floor(options.hurt*20)%2===0)c.globalAlpha=.44;
 person(c,kind,options.walk||0,options.attack||false);
 c.restore();
}
export function pixelEnemy(c,kind,x,y,scale=2.4,options={}){
 c.save();c.translate(Math.round(x),Math.round(y));c.scale((options.face||1)<0?-scale:scale,scale);c.translate(-9,-10);
 const bounce=Math.sin((options.walk||0)*12)*1.5;
 if(options.hurt&&Math.floor(options.hurt*22)%2===0)c.globalAlpha=.36;
 if(kind==='chicken'){
  r(c,3,15+bounce,4,6,P.outline);r(c,12,15-bounce,4,6,P.outline);
  r(c,3,4,14,13,P.outline);r(c,4,5,12,11,'#e6cca1');r(c,2,8,5,6,'#d8b482');
  r(c,6,0,3,6,'#ba5545');r(c,10,-2,4,8,'#c7694a');
  r(c,11,7,3,3,P.outline);r(c,14,10,5,4,'#dc8b50');r(c,6,14,6,2,'#f3e7c6');
 }else{
  r(c,6,15+bounce,3,5,P.outline);r(c,12,15-bounce,3,5,P.outline);
  r(c,3,3,14,15,P.outline);r(c,4,4,12,12,'#b74637');r(c,5,2,10,7,'#e3764a');
  r(c,8,-2,3,7,'#466d36');r(c,10,0,5,3,'#729849');
  r(c,6,9,3,3,P.outline);r(c,12,9,3,3,P.outline);
  r(c,7,14,6,2,'#e7a26a');
 }
 c.restore();
}
export function pixelImpact(c,x,y,size=13,accent='#fff0a1'){
 c.save();c.translate(x,y);r(c,-2,-size-3,4,size*2+6,accent);r(c,-size-3,-2,size*2+6,4,accent);
 c.rotate(Math.PI/4);r(c,-1,-size+2,2,size*2-4,'#fff9d8');r(c,-size+2,-1,size*2-4,2,'#fff9d8');c.restore();
}