import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {y2Eligible,y2Layout} from '../src/three_y2_diner.js';
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
 assert.match(read('index.html'),/get\("render"\)==="3d"/);
 assert.doesNotMatch(read('standalone.html'),/cdn\.jsdelivr\.net\/npm\/three/);
 assert.match(read('src/scenes_v04.js'),/restaurantActorsV075\(s,t\)/);
});
