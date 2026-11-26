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

test('Z2d2 management previews share prep scale, pitch and close-up target; table view pans without zoom',()=>{
 for(const [w,h] of [[320,210],[375,245],[390,260],[475,315],[320,320],[320,110]])for(const count of [2,3,4]){
  const state={phase:'upgrade',activeWorld:'hearth',dining:{tableCount:count},kitchen:{thirdUnlocked:count===4}},before=JSON.stringify(state);
  const layout=y2Layout(state),prep=y2CameraFrame('prep',w,h,layout),report=y2CameraFrame('report',w,h,layout),growth=y2CameraFrame('upgrade',w,h,layout),tables=y2CameraFrame('upgrade',w,h,layout,'tables');
  assert.deepEqual(report,{...prep,view:'report-preview'});assert.deepEqual(growth,{...prep,view:'growth-preview'});
  assert.equal(tables.view,'growth-tables');assert.equal(tables.half,prep.half);assert.equal(tables.aspect,prep.aspect);
  assert.ok(Math.abs(tables.position[2]-tables.target[2]-11.8)<1e-9);
  assert.equal(tables.position[1],15);assert.equal(tables.target[0],5);
  const z=layout.tables.map(p=>dinerWorldZ(p.z));assert.equal(tables.target[2],(Math.min(...z)+Math.max(...z))/2);
  const pitch=Math.atan2(15,11.8),si=Math.sin(pitch),co=Math.cos(pitch);
  for(const p of layout.tables){assert.ok(Math.abs((p.x*10-5)/(tables.half*tables.aspect))<1);assert.ok(Math.abs((co*.8-si*(dinerWorldZ(p.z)-tables.target[2]))/tables.half)<1);}
  assert.equal(JSON.stringify(state),before);assert.equal(y2Layout(state).stoves.filter(p=>p.unlocked).length,count===4?3:2);
 }
 assert.equal(y2Eligible({phase:'report',activeWorld:'hearth'}),true);assert.equal(y2Eligible({phase:'report',activeWorld:'cloud'}),false);
});
test('Z2d2 keeps original preparation and live camera presets',()=>{
 const layout=y2Layout({phase:'forecast'});
 for(const [w,h] of [[320,210],[390,260],[320,320],[200,700]]){
  const aspect=w/h;
  for(const phase of ['forecast','service'])assert.deepEqual(y2CameraFrame(phase,w,h,layout),{view:'restaurant',half:Math.max(5.65/aspect,8.35),aspect,position:[5,23,25],target:[5,0,8.7]});
  assert.deepEqual(y2CameraFrame('prep',w,h,layout),{view:'kitchen-preview',half:Math.max(5.6/aspect,3.65),aspect,position:[5,15,16],target:[5,0,4.2]});
 }
});

test('Z2d3a closing and growth are eligible even when a cached caller passes ended service',()=>{
 const service={walkable:true,done:true,orders:[{id:'old'}]};
 for(const phase of ['report','upgrade']){assert.equal(y2Eligible({phase,service,activeWorld:'hearth'}),true);assert.equal(y2Eligible({phase,service,activeWorld:'cloud'}),false);}
 assert.equal(y2Eligible({phase:'prep',service}),false);
 const renderer=readFileSync(new URL('../src/three_y2_diner.js',import.meta.url),'utf8'),app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 assert.match(renderer,/if\(\['report','upgrade'\].includes\(s\?\.phase\)&&s.service\)s=\{\.\.\.s,service:null\};/);
 assert.match(app,/scenes_v04\.js\?v=z2d3a/);
});
