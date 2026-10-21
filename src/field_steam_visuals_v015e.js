// v0.15-E: pixel-designed steamer silhouette plus smooth non-pixel mist FX.
const pixel=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
export function drawPixelSteamBasket(c,f,{layer='front'}={}){
 const lv=f.weapon?.level||1;
 c.save();c.translate(10,-8);
 if(layer==='back'){
  pixel(c,0,-5,3,12,'#426b76');pixel(c,3,-7,7,3,'#c5dfdb');
  pixel(c,6,-12,2,6,'#c5dfdb');
 }else{
  pixel(c,-2,0,24,5,'#594930');
  pixel(c,0,-7,20,10,'#c79a65');
  pixel(c,1,-7,18,2,'#edcf91');
  for(let i=3;i<19;i+=4)pixel(c,i,-5,1,6,'#886a49');
  pixel(c,-2,-11,24,5,'#9c7950');
  pixel(c,0,-13,20,3,'#ebc991');
  pixel(c,8,-16,5,4,'#c7e8dc');
  pixel(c,10,-19,2,4,'#8bbeba');
  pixel(c,18,-6,7,3,'#6e9da5');
  if(lv>1){pixel(c,-6,-8,4,13,'#92d7d2');pixel(c,24,-8,4,13,'#92d7d2');
    pixel(c,5,-17,11,2,'#e8efca');}
 }
 c.restore();
}
const ring=(c,x,y,r,color,line=0.07)=>{
 c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.strokeStyle=color;c.lineWidth=line;c.stroke();
};
export function drawSteamMistField(c,f,t){
 const mist=f.steamMist;
 if(!mist||mist.ttl<=0)return;
 const q=Math.min(1,mist.ttl/.48,(mist.duration-mist.ttl+.12)/.30);
 c.save();c.globalAlpha=Math.max(0,q)*.55;
 const fill=c.createRadialGradient(mist.x,mist.y,.1,mist.x,mist.y,mist.radius);
 fill.addColorStop(0,'rgba(205,247,245,.47)');fill.addColorStop(.58,'rgba(144,221,223,.39)');
 fill.addColorStop(1,'rgba(100,190,205,0)');
 c.beginPath();c.arc(mist.x,mist.y,mist.radius,0,Math.PI*2);c.fillStyle=fill;c.fill();
 ring(c,mist.x,mist.y,mist.radius*.94,'#b5f3ed',.065);
 for(let i=0;i<8;i++){
  const a=i*Math.PI/4+t*.42+(mist.level>1?.22:0);
  const r=mist.radius*(.62+.07*Math.sin(t*1.8+i));
  c.beginPath();c.ellipse(mist.x+Math.cos(a)*r,mist.y+Math.sin(a)*r,.20,.10,
   a,0,Math.PI*2);c.fillStyle='#effff9';c.fill();
 }
 c.restore();
}
export function drawSteamPulse(c,f){
 const fx=f.attackFx;if(!(fx?.steamPulse&&fx.ttl>0))return;
 const pct=1-fx.ttl/Math.max(.001,fx.duration);
 const range=fx.radius||1.6;
 c.save();c.globalAlpha=Math.max(0,.73*(1-pct));
 ring(c,fx.x??f.pos.x,fx.y??f.pos.y,.35+range*.75*pct,'#c0f5e9',.095*(1-pct)+.015);
 ring(c,fx.x??f.pos.x,fx.y??f.pos.y,.20+range*pct,'#fff5cf',.045*(1-pct)+.015);
 c.restore();
}
