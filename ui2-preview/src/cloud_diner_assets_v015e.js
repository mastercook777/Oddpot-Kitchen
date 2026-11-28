// v0.15-E · unique procedural Cloud Harbor diner props, not a palette swap.
// All geometry is visual only: the canonical dinerFloor still owns navigation.
const poly=(c,pts,fill,stroke,width=2)=>{
 c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();
 c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}
};
const round=(c,x,y,w,h,r,color,stroke)=>{
 c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=color;c.fill();
 if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.stroke();}
};
const cable=(c,x,y,xx,yy,color='#7e9bad',width=2)=>{
 c.beginPath();c.moveTo(x,y);c.lineTo(xx,yy);c.strokeStyle=color;c.lineWidth=width;c.stroke();
};
// Sailing cloth, pulleys and real port cargo take up upper-wall space;
// this silhouette belongs only to Cloud, not the Hearth restaurant.
export function drawCloudPortProps(c,t,w,h){
 const x=n=>n*w,y=n=>n*h;
 c.save();
 for(const [a,d,flip] of [[.10,.24,1],[.90,.24,-1]]){
  cable(c,x(a),y(.005),x(a),y(.23),'#577485',3);
  cable(c,x(a),y(.07),x(a+flip*.20),y(.115),'#46687b',2);
  poly(c,[[x(a),y(.045)],[x(a+flip*.20),y(.107)],[x(a),y(.137)]],
   '#f1deaa','#879fb0',1.8);
  for(let i=0;i<3;i++)cable(c,x(a+flip*.027*i),y(.054+i*h*.0),x(a+flip*.027*i),y(.15),'#b4c4bc',.7);
  round(c,x(a)-8,y(.20),16,14,3,'#546a70','#e3cb9b');
  round(c,x(a)-4,y(.212),8,10,2,'#d8b876');
 }
 // Cargo pulley at the upper left; readable as freight equipment instead
 // of Hearth's plant pots and mushroom lanterns.
 cable(c,x(.23),y(.012),x(.23),y(.17),'#a0b4b4',3);
 c.beginPath();c.arc(x(.23),y(.165),11,0,Math.PI*2);c.fillStyle='#536d79';c.fill();
 c.strokeStyle='#f0d8a2';c.lineWidth=3;c.stroke();
 cable(c,x(.23),y(.175),x(.23),y(.205),'#f0d8a2',2);
 const cy=y(.218);
 round(c,x(.23)-21,cy-7,42,23,3,'#9eaa90','#436475');
 for(let j=-1;j<=1;j++)cable(c,x(.23)+j*13,cy-7,x(.23)+j*13,cy+16,'#d7b87b',2);
 // Bundled sky herb packets in recessed cargo racks, not floating UI labels.
 for(const [px,py] of [[.81,.205],[.82,.245]]){
  round(c,x(px)-18,y(py)-8,36,19,3,'#5b7b84','#b6d3c6');
  for(let i=0;i<3;i++){round(c,x(px)-13+i*10,y(py)-3,8,10,3,'#89bba5');}
 }
 c.restore();
}
export function drawCloudCrystalTable(c,X,Y,side,t,index){
 const half=side/2;
 c.save();
 // Suspended docks use hex-cut translucent stone, rope supports and stubby
 // brass stools in positions compatible with canonical two-person seating.
 for(const sign of [-1,1]){
  const sx=X+sign*side*.77;
  round(c,sx-9,Y-10,18,23,5,'#416876','#a5c6c6');
  round(c,sx-8,Y-16,16,12,4,'#6ba9b6','#f0d9a7');
  cable(c,sx,Y+12,sx,Y+19,'#e5ce93',2);
 }
 poly(c,[[X,Y-half-11],[X+half+6,Y-half*.52],[X+half+6,Y+half*.45],
    [X,Y+half+13],[X-half-6,Y+half*.45],[X-half-6,Y-half*.52]],
    '#3b6e81','#e8d9ad',3);
 poly(c,[[X,Y-half-6],[X+half,Y-half*.43],[X+half,Y+half*.40],
    [X,Y+half+6],[X-half,Y+half*.40],[X-half,Y-half*.43]],
    '#91d0d2','#f7f0cd',2);
 // A transparent crystal lattice and a moving specular glint are visibly
 // different from the old square wooden tables.
 c.globalAlpha=.52;poly(c,[[X,Y-half+1],[X+half*.71,Y],[X,Y+half*.76],[X-half*.7,Y]],
  '#d8fcf1','#b8e3de',1);
 c.globalAlpha=1;
 cable(c,X-half*.7,Y,X+half*.7,Y,'#4b899b',1.2);
 cable(c,X,Y-half*.55,X,Y+half*.55,'#4b899b',1.2);
 c.beginPath();c.arc(X,Y,3.3,0,Math.PI*2);
 c.fillStyle=index%2?'#ffdfa3':'#d5f6ee';c.fill();
 const shine=X+Math.sin(t*.85+index)*half*.27;
 c.beginPath();c.moveTo(shine-4,Y-half*.45);c.lineTo(shine,Y-half*.61);
 c.strokeStyle='#ffffff86';c.lineWidth=2;c.stroke();
 c.restore();
}
// A stacked bamboo steam basket, brass condenser and visible vent piping;
// no shared Hearth round-pot graphic is reused.
export function drawCloudSteamerStation(c,X,Y,rw,t,busy,level=1){
 c.save();
 round(c,X-rw/2,Y-25,rw,51,7,'#3d6475','#e4d5a8');
 round(c,X-rw*.43,Y-19,rw*.86,40,6,'#648d91','#a9d3c4');
 const radius=Math.min(19,rw*.34),a=Y-7;
 round(c,X-radius-3,a-17,2*radius+6,11,4,'#a47845','#ecd8a7');
 round(c,X-radius-1,a-8,2*radius+2,17,5,'#d8b27b','#77563b');
 for(let i=-2;i<=2;i++)cable(c,X+i*radius*.37,a-7,X+i*radius*.37,a+9,'#90663f',1.6);
 // Two visible tiers and distinct vent cap give this cookware silhouette.
 round(c,X-radius,a-19,radius*2,7,4,'#f0cf96','#96704d');
 c.beginPath();c.ellipse(X,a-20,radius*.82,5,0,0,Math.PI*2);
 c.fillStyle='#f5dfae';c.fill();
 round(c,X-3,a-26,6,7,2,'#accbc9','#517c87');
 round(c,X+radius-1,a-15,13,4,2,'#8bc7d0','#4c7a8a');
 if(level>1){round(c,X-radius-7,a-13,5,18,2,'#84d7d1','#e6e6b1');
  round(c,X+radius+10,a-18,5,16,2,'#84d7d1','#e6e6b1');}
 if(busy){
  for(let i=0;i<4;i++){
   const lift=(t*.65+i*.23)%1;
   c.beginPath();c.arc(X-11+i*7+Math.sin(t+i)*2,a-25-lift*19,
    2.2+lift*2.5,0,Math.PI*2);c.fillStyle=`rgba(229,251,244,${.70*(1-lift)})`;c.fill();
  }
 }
 c.restore();
}
