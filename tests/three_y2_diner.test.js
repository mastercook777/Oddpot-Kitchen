import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {y2Eligible,y2Layout,y2CameraFrame,dinerWorldZ} from '../src/three_y2_diner.js';
import {dinerFloor} from '../src/restaurant_scene_v075.js';
import {restaurantActorsV075} from '../src/scenes_v04.js';
test('Y2 renderer follows actual floor and station snapshots without writes',()=>{
 for(const count of [2,3,4]){
  const s={phase:'service',activeWorld:'hearth',dining:{tableCount:count},service:{walkable:true,kitchenSnapshot:[{type:'POT',level:2},{type:'GRILL'},{type:'STEAM'}]}};
  const before=JSON.stringify(s),l=y2Layout(s);
  assert.equal(y2Eligible(s),true);assert.deepEqual(l.tables.map(({x,z})=>({x,y:z})),dinerFloor(s).tables);
  assert.deepEqual(l.stoves.map(p=>p.type),['POT','GRILL','STEAM']);assert.ok(l.stoves.every(p=>p.unlocked));assert.equal(JSON.stringify(s),before);
 }
});
test('Y2 defaults to no renderer for unsupported scenes and locked kitchen is real',()=>{
 assert.equal(y2Eligible({phase:'field'}),false);assert.equal(y2Eligible({phase:'forecast',activeWorld:'cloud'}),false);assert.equal(y2Eligible({phase:'service',service:{walkable:false}}),false);
 const s={phase:'forecast',activeWorld:'hearth',crew:{helper:{hired:true}},kitchen:{slots:[{type:'WOK'},{type:'POT'}]}};
 assert.equal(y2Layout(s).stoves[2].unlocked,false);
 const before=JSON.stringify(s);assert.deepEqual(restaurantActorsV075(s,0).map(a=>a.id).sort(),['home-chef','home-helper']);assert.equal(JSON.stringify(s),before);
});
test('3D is opt-in and offline has no CDN bootstrap',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 assert.match(read('index.html'),/get\(['"]render['"]\)\s*===\s*['"]3d['"]/);
 assert.doesNotMatch(read('standalone.html'),/cdn\.jsdelivr\.net\/npm\/three/);
 assert.match(read('src/scenes_v04.js'),/restaurantActorsV075\(s,t\)/);
});

test('growth uses current frontier geometry; Cloud Harbor remains its own 2D scene',()=>{
 const s={phase:'upgrade',activeWorld:'hearth',dining:{tableCount:3},kitchen:{slots:[{type:'WOK'},{type:'POT'}]}};
 assert.equal(y2Eligible(s),true);assert.equal(y2Layout(s).tables.length,3);
 assert.equal(y2Eligible({...s,activeWorld:'cloud'}),false);
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 assert.match(read('src/scenes_v04.js'),/if\(s.phase==='upgrade'\)s=\{\.\.\.s,service:null\};/);
});

test('Z2c14 growth frames the real furniture, preserves caption clearance and enlarges the core room',()=>{
 for(const [w,h] of [[320,210],[375,245],[390,260],[475,315],[320,320],[320,110]])for(const count of [2,3,4]){
  const state={phase:'upgrade',activeWorld:'hearth',dining:{tableCount:count},kitchen:{thirdUnlocked:count===4}},before=JSON.stringify(state);
  const layout=y2Layout(state),frame=y2CameraFrame('upgrade',w,h,layout),old=y2CameraFrame('service',w,h,layout);
  const pitch=Math.atan2(frame.position[1],frame.position[2]-frame.target[2]),si=Math.sin(pitch),co=Math.cos(pitch);
  const project=(y,z)=>(co*y-si*(z-frame.target[2]))/frame.half;
  assert.equal(frame.view,'growth-preview');assert.equal(JSON.stringify(state),before);
  assert.ok(frame.front>=Math.max(...layout.tables.map(p=>dinerWorldZ(p.z)))+.65-1e-9);
  assert.ok(5.25/(frame.half*frame.aspect)<=1);
  assert.ok(project(0,frame.front)>=-1+2*frame.bottomPad-1e-9);
  assert.ok(project(3.16,1)<=1-2*frame.topPad+1e-9);
  if(w/h>=1.35&&h>=200){assert.ok(old.half/frame.half>=1.35);assert.ok(project(0,dinerWorldZ(.93))<-1+2*frame.bottomPad);}
  assert.equal(layout.stoves.filter(p=>p.unlocked).length,count===4?3:2);
 }
});
test('Z2c14 keeps original non-growth camera presets',()=>{
 const layout=y2Layout({phase:'forecast'});
 for(const [w,h] of [[320,210],[390,260],[320,320],[200,700]]){
  const aspect=w/h;
  for(const phase of ['forecast','service'])assert.deepEqual(y2CameraFrame(phase,w,h,layout),{view:'restaurant',half:Math.max(5.65/aspect,8.35),aspect,position:[5,23,25],target:[5,0,8.7]});
  assert.deepEqual(y2CameraFrame('prep',w,h,layout),{view:'kitchen-preview',half:Math.max(5.6/aspect,3.65),aspect,position:[5,15,16],target:[5,0,4.2]});
 }
});
