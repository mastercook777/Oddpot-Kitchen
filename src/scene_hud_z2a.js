// Read-only Z2a status language shared by Canvas and WebGL.
export function z2aOrderMark(o,t=0){
 if(!o)return null;const st=o.status;
 if(st==='served'||st==='waiting'&&o.arrival>t)return null;
 if(st==='review')return {glyph:o.sat>=70?'✓':'!',label:o.sat>=70?'满意':'不满意',color:o.sat>=70?'#bce3ac':'#ffad92'};
 if(st==='left'||st==='rejected')return t-(o.leftAt??t)<1.1?{glyph:'!',label:'离席',color:'#ffad92'}:null;
 if(st==='eating')return {glyph:'·',label:'进食',color:'#f5dda1'};
 if(['ordering','queued','cooking','pickup','carried','delivering','flying','waiting','entering'].includes(st)){
  const urgent=Number.isFinite(o.patience)&&Number.isFinite(o.arrival)&&o.patience-(t-o.arrival)<=9;
  const info={ordering:['?','点餐'],queued:['…','等候'],cooking:['…','烹饪'],pickup:['↑','待上菜'],carried:['↑','送餐'],delivering:['↑','送餐'],flying:['↑','送餐'],waiting:['…','等位'],entering:['…','入店']}[st];
  return {glyph:urgent?'!':info[0],label:urgent?info[1]+' · 催促':info[1],color:urgent?'#ffad92':st==='pickup'?'#ffdb89':'#e9e5cc'};
 }
 return null;
}
export function z2aOrderStatus(o,t){return z2aOrderMark(o,t)?.label||({served:'已完成',left:'已离席',rejected:'未入座',waiting:'未到店'}[o.status]||'等待');}
export function z2aDrawMark(c,x,y,mark,w,h){if(!mark)return;const px=Math.max(9,Math.min(w-9,x)),py=Math.max(9,Math.min(h-9,y));c.save();c.fillStyle='#202f28e8';c.strokeStyle=mark.color;c.lineWidth=1;c.beginPath();c.arc(px,py,8,0,Math.PI*2);c.fill();c.stroke();c.fillStyle=mark.color;c.font='bold 12px system-ui';c.textAlign='center';c.textBaseline='middle';c.fillText(mark.glyph,px,py);c.restore();}
