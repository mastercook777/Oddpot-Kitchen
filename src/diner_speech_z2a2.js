// Live dialogue is an ephemeral rendering plan, not another simulation.
import {selectDiningSpeech,selectStaffSpeech,speechOpacity} from './diner_ambience_v077.js';
import {selectOutdoorQueueSpeech} from './outdoor_queue_speech_v012f.js';
const z2a2Clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function z2a2Overlap(a,b,p=0){return Math.max(0,Math.min(a.x+a.width+p,b.x+b.width+p)-Math.max(a.x-p,b.x-p))*Math.max(0,Math.min(a.y+a.height+p,b.y+b.height+p)-Math.max(a.y-p,b.y-p));}
export function z2a2Lines(text){const chars=Array.from(String(text||''));if(chars.length>18)chars.splice(17,chars.length-17,'…');if(chars.length<=9)return [chars.join('')];const cut=Math.ceil(chars.length/2);return [chars.slice(0,cut).join(''),chars.slice(cut).join('')];}
export function z2a2SpeechLayout(cues,anchors,w,h){
 const byId=new Map(anchors.map(a=>[a.id,a])),out=[],areaLimit=w*h*.06;
 let area=0;const ranked=cues.filter(q=>q?.text&&speechOpacity(q)>.025).slice().sort((a,b)=>b.priority-a.priority||String(a.id).localeCompare(String(b.id)));
 for(const cue of ranked){
  if(out.length>=2||out.length&&((out[0].cue.priority||0)<7||(cue.priority||0)<7))break;
  const a=byId.get(cue.actorId??cue.staffRole??cue.id);if(!a||a.x<10||a.x>w-10||a.y<8||a.y>h-10)continue;
  const lines=z2a2Lines(cue.text),width=Math.min(w-12,Math.max(62,Math.max(...lines.map(l=>Array.from(l).length))*12+16)),height=lines.length===1?25:39;
  if(area+width*height>areaLimit)continue;
  const candidates=[{x:a.x-width/2,y:a.y-height-12},{x:a.x-width-17,y:a.y-height*.75},{x:a.x+17,y:a.y-height*.75},{x:a.x-width*.75,y:a.y-height-12},{x:a.x-width*.25,y:a.y-height-12}];
  let best=null;
  for(const [i,q] of candidates.entries()){
   const p={x:z2a2Clamp(q.x,6,Math.max(6,w-width-6)),y:z2a2Clamp(q.y,36,Math.max(36,h-height-52)),width,height};
   if(out.some(o=>z2a2Overlap(o,p,4)>0))continue;
   // Bodies are in the same projected coordinate space as the tail.
   if(anchors.some(other=>z2a2Overlap(p,{x:other.x-(other.width||22)/2,y:other.y,width:other.width||22,height:other.height||27},2)>0))continue;
   const baseX=z2a2Clamp(a.x,p.x+8,p.x+width-8),baseY=z2a2Clamp(a.y,p.y+7,p.y+height-7);
   const choices=[{x:baseX,y:p.y},{x:baseX,y:p.y+height},{x:p.x,y:baseY},{x:p.x+width,y:baseY}].map(v=>({...v,d:Math.hypot(v.x-a.x,v.y-a.y)})).sort((a,b)=>a.d-b.d);
   const edge=choices[0];if(edge.d>42||edge.d<3)continue;
   const cost=edge.d+Math.abs(q.x-p.x)*.12+Math.abs(q.y-p.y)*.3+i*2;
   if(!best||cost<best.cost)best={...p,cost,baseX:edge.x,baseY:edge.y,tipX:a.x,tipY:a.y,lines,cue,actorId:a.id};
  }
  if(best){out.push(best);area+=width*height;}
 }
 return out;
}
export function z2a2LiveSpeech(s,t,anchors,w,h,allowOutside=true){
 if(!s?.service?.walkable)return [];
 const ids=new Set(anchors.map(a=>a.id)),v=s.service;
 const guests=selectDiningSpeech(v.orders,t,2).filter(c=>ids.has(c.id));
 let plan=z2a2SpeechLayout(guests,anchors,w,h);
 if(!plan.length){
  const staff=selectStaffSpeech(s,t,guests);
  if(staff&&ids.has(staff.staffRole))plan=z2a2SpeechLayout([staff],anchors,w,h);
 }
 if(!plan.length&&allowOutside){
  const q=selectOutdoorQueueSpeech(v.orders,t);
  if(q&&ids.has(q.orderId))plan=z2a2SpeechLayout([{...q,actorId:q.orderId,priority:q.kind==='urgent'?8:2}],anchors,w,h);
 }
 return plan;
}
export function z2a2DrawSpeech(c,p){
 const cue=p.cue,alpha=speechOpacity(cue);if(alpha<=0)return;
 const bad=cue.kind==='upset'||cue.kind==='urgent'||cue.kind==='review'&&['late','bad','quality','taste'].includes(cue.reviewType),staff=cue.kind==='staff';
 const fill=bad?'#f6dcc2':staff?'#dfecd4':'#f6e9cb',stroke=bad?'#9d6551':staff?'#658b70':'#98794e',ink=bad?'#70392d':staff?'#304b3a':'#443525';
 c.save();c.globalAlpha=Math.min(.96,alpha);c.fillStyle=fill;c.strokeStyle=stroke;c.lineWidth=1.15;
 const dx=p.tipX-p.baseX,dy=p.tipY-p.baseY,d=Math.hypot(dx,dy)||1,nx=-dy/d*4,ny=dx/d*4;
 c.beginPath();c.moveTo(p.baseX+nx,p.baseY+ny);c.lineTo(p.tipX,p.tipY);c.lineTo(p.baseX-nx,p.baseY-ny);c.closePath();c.fill();c.stroke();
 c.beginPath();c.roundRect(p.x,p.y,p.width,p.height,6);c.fill();c.stroke();
 c.strokeStyle='#fff7dd';c.lineWidth=.75;c.beginPath();c.moveTo(p.x+7,p.y+2.5);c.lineTo(p.x+p.width-7,p.y+2.5);c.stroke();
 c.fillStyle=ink;c.font='600 12px system-ui';c.textBaseline='middle';c.textAlign='center';
 for(const [i,line] of p.lines.entries())c.fillText(line,p.x+p.width/2,p.y+p.height/2+(i-(p.lines.length-1)/2)*15,p.width-10);
 c.restore();
}
