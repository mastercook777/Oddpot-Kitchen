import test from 'node:test';
import assert from 'node:assert/strict';
import {drawHerbPixelNode} from '../src/field_pixel_herb_v011c.js';
import {ING} from '../src/data.js';

function recordingContext(){
 const operations=[];
 const c={
  imageSmoothingEnabled:true,fillStyle:'',
  save(){operations.push(['save']);},
  restore(){operations.push(['restore']);},
  translate(x,y){operations.push(['translate',x,y]);},
  scale(x,y){operations.push(['scale',x,y]);},
  fillRect(x,y,w,h){operations.push(['rect',x,y,w,h,this.fillStyle]);},
  drawImage(){throw Error('material node depends on offscreen drawImage on Android');}
 };
 return {c,operations};
}

test('all normal and boss food drops paint directly to primary Canvas; no second Canvas upload',()=>{
 for(const id of ['beef','chicken','chili','garlic','mushroom','cabbage','onion','potato',
  'mushroom_heart','ember_pepper','starlit_nectar','tide_sour_pulp']){
  assert.ok(ING[id],id);
  const {c,operations}=recordingContext();
  drawHerbPixelNode(c,{key:'killed-boar-drop-2',id,n:1,
   type:'gather',claimed:false,x:5.5,y:8.5},12.5,false,49);
  assert.ok(operations.filter(x=>x[0]==='rect').length>=5,id+' has visible raster geometry');
  assert.ok(operations.some(x=>x[0]==='scale'&&x[1]===.76/16&&x[2]===.76/16),id);
  assert.equal(operations.filter(x=>x[0]==='save').length,operations.filter(x=>x[0]==='restore').length,id);
 }
});
test('ecology key target, meat drop and rare boss reward all keep core bounds and picked node disappears',()=>{
 for(const key of ['target','boar-2-drop-1','boss-reward-3']){
  const {c,operations}=recordingContext();
  drawHerbPixelNode(c,{key,id:key==='boss-reward-3'?'mushroom_heart':'beef',
   type:'gather',claimed:false,x:1.5,y:4.5},0,true,34);
  assert.ok(operations.filter(x=>x[0]==='rect').length>=5);
  assert.ok(operations.some(x=>x[0]==='translate'&&Math.abs(x[1]-(1.5-.38))<.0001));
 }
 const {c,operations}=recordingContext();
 drawHerbPixelNode(c,{key:'target',id:'beef',type:'gather',claimed:true,x:1.5,y:4.5});
 assert.equal(operations.length,0);
});
