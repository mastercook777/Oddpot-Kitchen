import {Z2A3_ART} from '../src/ui_icon_art_z2a3.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {Z2A2_ICONS,z2a2Icon,z2a2DrawIcon} from '../src/ui_icons_z2a2.js';
import {z2a2Lines,z2a2SpeechLayout,z2a2LiveSpeech} from '../src/diner_speech_z2a2.js';
import {z2aOrderMark} from '../src/scene_hud_z2a.js';
import {dinerSeatPoint} from '../src/restaurant_scene_v075.js';
const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));
const cue=(id,priority=6)=>({id,priority,phase:.4,kind:'order',text:'老板，这锅气真香，给我来一份热腾腾的料理！'});
test('Z2a2 shared icon registry covers live HUD, skill and all order states',()=>{
 for(const [name,paths] of Object.entries(Z2A2_ICONS)){assert.ok(paths.length&&paths.every(p=>p.startsWith('M')));const html=z2a2Icon(name);assert.ok(html.includes('data-game-icon="'+name+'"'));assert.ok(html.includes('viewBox="0 0 24 24"'));assert.ok(html.includes('aria-hidden="true"'));}
 for(const name of ['moon','plate','energy','ledger','pause','play','queue','heart','bag','route','gear','shield','bento','target','warn','menu','wait','cutlery','star','cook','carry','wok','pot','grill','steam','soothe','move','home','next'])assert.ok(Z2A2_ICONS[name]);
 for(const status of ['waiting','entering','ordering','queued','cooking','pickup','carried','delivering','flying','eating','review','left','rejected'])assert.ok(Z2A2_ICONS[z2aOrderMark({status,arrival:0,patience:30,sat:80,leftAt:2},2).icon]);
 assert.equal(z2a2Icon('unknown'),'');
});
test('Z2a2 Canvas uses the same authored paths, not a system font',()=>{
 const orig=globalThis.Path2D;let count=0;
 try{globalThis.Path2D=class {constructor(d){assert.ok(d.startsWith('M'));}};const c={save(){},restore(){},translate(){},scale(){},fill(){},stroke(){count++;}};
 assert.ok(z2a2DrawIcon(c,'plate',12,12,18,'#eed'));assert.equal(count,Z2A3_ART.plate.filter(l=>l[2]!=='none'&&l[3]>0).length);}
 finally{if(orig===undefined)delete globalThis.Path2D;else globalThis.Path2D=orig;}
});
test('Z2a2 bounded two-line dialogue with actual speaker identity, quiet intervals and no body overlap',()=>{
 const lines=z2a2Lines(cue('a').text);assert.ok(lines.length<=2);assert.ok(lines.every(s=>Array.from(s).length<=9));assert.ok(lines.join('').endsWith('…'));
 for(const w of [320,375,390])for(const h of [440,600,790]){
  const anchors=[{id:'a',x:w*.25,y:h*.45,width:24,height:35},{id:'b',x:w*.75,y:h*.68,width:24,height:35},{id:'hero',x:w*.50,y:h*.54,width:24,height:36}];
  const before=JSON.stringify(anchors),normal=z2a2SpeechLayout([cue('a'),cue('b')],anchors,w,h);assert.equal(normal.length,1);
  const urgent=z2a2SpeechLayout([cue('a',10),cue('b',8)],anchors,w,h);assert.equal(urgent.length,w*h*.06>=2*124*39?2:1);assert.ok(urgent.reduce((n,p)=>n+p.width*p.height,0)<=w*h*.06);
  for(const p of urgent){const a=anchors.find(q=>q.id===p.actorId);assert.equal(p.tipX,a.x);assert.equal(p.tipY,a.y);assert.ok(Math.hypot(p.tipX-p.baseX,p.tipY-p.baseY)<=42);assert.ok(p.x>=6&&p.x+p.width<=w-6&&p.y>=36&&p.y+p.height<=h-52);for(const q of anchors)assert.equal(overlap(p,{x:q.x-q.width/2,y:q.y,width:q.width,height:q.height}),0);}
  if(urgent.length===2)assert.equal(overlap(urgent[0],urgent[1]),0);assert.equal(JSON.stringify(anchors),before);
  assert.equal(z2a2SpeechLayout([cue('missing')],anchors,w,h).length,0);
  assert.equal(z2a2SpeechLayout([{...cue('a'),phase:0}],anchors,w,h).length,0);
 }
});
test('Z2a2 real review/eating fixture produces anchored speech in 2D and 3D projections at three widths',()=>{
 for(const [w,h] of [[320,518],[375,617],[390,794]]){
  const s={dining:{tableCount:3},service:{walkable:true,paused:true,orders:[]}},t=10,types=['gardener','adventurer','family','regular','critic','stargazer'];
  for(let i=0;i<6;i++)s.service.orders.push({id:'g'+i,segment:types[i],recipeId:'veg_stir',tableId:Math.floor(i/2),seatId:i%2,status:i===5?'review':'eating',landedAt:t-1.35,reviewAt:t-.25,sat:80,arrival:0,reviewText:'味道真不错！'});
  const before=JSON.stringify(s),scale=h/(2*Math.max(5.65/(w/h),8.35)),sy=(z,y)=>h/2-(y*16.3/Math.hypot(23,16.3)-(z-8.7)*23/Math.hypot(23,16.3))*scale;
  for(const mode of ['2d','3d']){
   const anchors=s.service.orders.map(o=>{const q=dinerSeatPoint(o.tableId,o.seatId,s),height=({regular:.93,critic:1.42,gardener:1.60,stargazer:1.61})[o.segment]||1.38,z=q.y<=.428?q.y*12:.428*12+(q.y-.428)*16,top=sy(z,.37+height),feet=sy(z,.37);return mode==='2d'?{id:o.id,x:q.x*w,y:q.y*h-31,width:24,height:33}:{id:o.id,x:w/2+(q.x*10-5)*scale,y:top,width:Math.max(20,Math.min(42,(feet-top)*.78)),height:Math.max(19,feet-top)};});
   const plan=z2a2LiveSpeech(s,t,anchors,w,h);assert.ok(plan.length>0&&plan.length<=2,mode+' '+w);assert.equal(plan[0].actorId,'g5');assert.equal(plan[0].cue.text,'味道真不错！');
  }
  assert.equal(JSON.stringify(s),before);
 }
});

test('Z2a2 real queue and employee voices use actual actor identity; not fabricated visitors',()=>{
 const anchor={id:'q',x:150,y:330,width:22,height:28},s={service:{walkable:true,time:2,orders:[{id:'q',segment:'regular',status:'waiting',arrival:0,patience:35}],crew:{},events:[]}};
 const q=z2a2LiveSpeech(s,2,[anchor],375,617);assert.equal(q.length,1);assert.equal(q[0].actorId,'q');assert.equal(z2a2LiveSpeech(s,2,[anchor],375,617,false).length,0);
 assert.equal(z2a2LiveSpeech(s,2,[{...anchor,id:'nonexistent'}],375,617).length,0);
 assert.equal(z2a2LiveSpeech(s,5.5,[anchor],375,617).length,0);
 const staff={service:{walkable:true,time:10,orders:[],crew:{helper:{hired:true,station:0}},events:[{type:'started',station:'WOK',t:10,order:'r'}]}};
 const p=z2a2LiveSpeech(staff,10.6,[{...anchor,id:'helper'}],375,617);assert.equal(p.length,1);assert.equal(p[0].actorId,'helper');assert.equal(p[0].cue.kind,'staff');
});
