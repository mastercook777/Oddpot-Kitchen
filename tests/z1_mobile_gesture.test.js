import {stickOrigin,fixedStickAnchor} from '../src/ui_foundation_z2ed0.js';
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../src/'+p,import.meta.url),'utf8'),src=read('app.js'),css=read('field_touch_v083.css');
function setup(phase){
 const handlers={},win={},doc={},stick={pointer:null,x:0,y:0},game={phase,service:{walkable:true},field:{action:true}},gestureTouches=new Set(),keys=new Set();
 const app={addEventListener(n,f){(handlers[n]??=[]).push(f)},contains(){return true},querySelector(){return null},setPointerCapture(){},hasPointerCapture(){return true},releasePointerCapture(){}},window={getSelection:()=>({isCollapsed:true}),addEventListener(n,f){(win[n]??=[]).push(f)}},document={addEventListener(n,f){(doc[n]??=[]).push(f)}};
 const a=src.indexOf('// Z1: one selection policy'),b=src.indexOf('// Cooking gestures are optional',a);
 new Function('app','game','stick','gestureTouches','keys','window','document','joystickVector','stickOrigin','fixedStickAnchor','let overlay="",livePanPointer=null,drag=null,stickMode="floating";'+src.slice(a,b))(app,game,stick,gestureTouches,keys,window,document,()=>({x:.5,y:.2,knobX:27,knobY:10}),stickOrigin,fixedStickAnchor);
 const target=(...tags)=>({closest(s){return tags.some(t=>s.split(',').includes(t))?this:null}});
 const send=(type,target,extra={},table=handlers)=>{const e={target,pointerId:1,button:0,clientX:50,clientY:50,cancelable:true,defaultPrevented:false,preventDefault(){this.defaultPrevented=true},...extra};for(const f of table[type]||[])f(e);return e.defaultPrevented;};
 return {game,stick,gestureTouches,target,send,win};
}
test('Z1 both joysticks own only their original touch; second button stays native',()=>{
 for(const phase of ['field','service']){
  const h=setup(phase),tag=phase==='field'?'.action-forest':'.diner-world',surface=h.target(tag),button=h.target(tag,'button');
  assert.ok(h.send('pointerdown',surface));assert.equal(h.stick.pointer,1);
  assert.ok(h.send('touchstart',surface,{changedTouches:[{identifier:1,target:surface}]}));
  assert.equal(h.send('touchstart',button,{changedTouches:[{identifier:2,target:button}]}),false);
  assert.equal(h.send('touchmove',button,{changedTouches:[{identifier:2,target:button}]}),false);
  assert.ok(h.send('touchmove',surface,{changedTouches:[{identifier:1,target:surface}]}));
  h.send('pointercancel',surface);assert.equal(h.stick.pointer,null);assert.equal(h.stick.x,0);assert.equal(h.gestureTouches.size,0);
 }
});
test('Z1 context menu, selection and drag blocked except native fields; pause and blur release',()=>{
 const h=setup('service'),surface=h.target('.diner-world'),input=h.target('input'),copy=h.target('[data-allow-selection]');
 for(const e of ['selectstart','contextmenu','dragstart']){assert.ok(h.send(e,surface));assert.equal(h.send(e,input),false);assert.equal(h.send(e,copy),false);}
 assert.equal(h.send('touchstart',h.target('.sheet'),{changedTouches:[{identifier:3,target:h.target('.sheet')}]}),false);
 h.send('pointerdown',surface);h.game.service.paused=true;h.send('pointermove',surface);assert.equal(h.stick.pointer,null);
 h.game.service.paused=false;h.send('pointerdown',surface);h.send('blur',surface,{},h.win);assert.equal(h.stick.pointer,null);
 assert.match(css,/#app \.is-diner-playing \.diner-world/);assert.match(css,/touch-action:pan-y/);assert.match(css,/touch-action:pan-x/);
});