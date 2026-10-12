import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fieldWokPose} from '../src/field_pose_v083.js';
const source=name=>readFileSync(new URL('../src/'+name,import.meta.url),'utf8');

test('WOK shield stays off the face in each of four directions',()=>{
 const faces=[
  {name:'right',face:{x:1,y:0}},
  {name:'left',face:{x:-1,y:0}},
  {name:'up',face:{x:0,y:-1}},
  {name:'down',face:{x:0,y:1}}
 ];
 for(const {name,face} of faces){
  const p=fieldWokPose(face,false,0,false);
  assert.equal(p.direction,name);
  assert.ok(Math.abs(p.shield.x)-p.shield.radius>=13.5,name+' shield must not overlap face width');
  assert.ok(p.shield.y>=4,name+' lid must not sit on forehead');
  assert.ok(p.shield.radius<=7,name+' lid should be compact');
  assert.equal(Math.sign(p.shield.x),-Math.sign(p.weapon.x),name+' gear goes on opposite arms');
 }
});
test('mirrored sideways posture and short parry movement do not obscure chef head',()=>{
 const right=fieldWokPose({x:1,y:0}),left=fieldWokPose({x:-1,y:0});
 assert.equal(right.shield.x,-left.shield.x);
 assert.equal(right.weapon.x,-left.weapon.x);
 const up=fieldWokPose({x:0,y:-1},false,0,true);
 const regular=fieldWokPose({x:0,y:-1},false,0,false);
 assert.equal(up.shield.y,regular.shield.y-3);
 assert.ok(Math.abs(up.shield.x)-up.shield.radius>=13.5);
 const moving=fieldWokPose({x:1,y:0},true,Math.PI/18,false);
 assert.notEqual(moving.shield.y,right.shield.y,'held gear may bob slightly when walking');
});
test('gameplay has scoped selection suppression including the lower thumb dock',()=>{
 const app=source('app.js'),css=source('field_touch_v083.css');
 assert.match(app,/game-shell.*is-field-playing/);
 assert.match(app,/fieldGestureSurface\(e\.target\)/);
 assert.match(app,/action-forest,\.action-field-dock/);
 assert.match(app,/button,select,input,textarea/);
 assert.match(app,/touchmove[\s\S]*?stick\.pointer===null/);
 assert.match(app,/app\.addEventListener\('selectstart'/);
 assert.match(app,/app\.addEventListener\('contextmenu'/);
 assert.match(app,/clearThumbSelection/);
 assert.match(css,/\.game-shell\.is-field-playing \.dock \*/);
 assert.match(css,/\.game-shell\.is-field-playing \.action-field-dock/);
 assert.match(css,/-webkit-user-select:none/);
 assert.match(css,/-webkit-touch-callout:none/);
 assert.match(css,/touch-action:none/);
 assert.match(css,/touch-action:manipulation/);
 assert.match(css,/contenteditable="true"/);
});
test('chef cookware uses procedural layers; no new raster art or persistent weapon slots',()=>{
 const scene=source('scenes_v04.js');
 assert.match(scene,/const posture=isWok\?fieldWokPose/);
 assert.match(scene,/BACK LAYER/);
 assert.match(scene,/FOREGROUND/);
 assert.match(scene,/chef\(c,0/);
 assert.ok(scene.indexOf('const a=posture.hand')<scene.indexOf('chef(c,0,Math.sin(clock*9)',scene.indexOf('const a=posture.hand')));
 assert.match(scene,/f\.shieldCooldown/);
});
