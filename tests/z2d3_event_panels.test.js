import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const app=read('src/app.js'),css=read('src/full_game_ui_v014.css');
const block=app.slice(app.indexOf('function keyboardMovementAllowed('),app.indexOf('function render(){'));
const api=new Function(block+';return {keyboardMovementAllowed,eventScrollState,restoreEventScroll};')();
test('Z2d3 movement keys are accepted only in active gameplay, not modal decisions or pause',()=>{
 const {keyboardMovementAllowed:allowed}=api;
 const field={phase:'field',field:{action:true}},service={phase:'service',service:{walkable:true}};
 for(const s of [field,service]){assert.equal(allowed(s,''),true);assert.equal(allowed(s,'book'),false);}
 for(const fields of [{activeEvent:'merchant'},{finished:true},{segmentStatus:'choice'}])assert.equal(allowed({...field,field:{...field.field,...fields}},''),false);
 for(const flags of [{walkable:false},{paused:true},{breakAt:1},{done:true}])assert.equal(allowed({...service,service:{...service.service,...flags}},''),false);
 for(const phase of ['forecast','prep','research','menu','report','upgrade'])assert.equal(allowed({phase},''),false);
 assert.equal(allowed({...service,cook:{}},''),false);
});
test('Z2d3 preserves scroll for the same actual event only',()=>{
 const root=(key,top)=>{const panel={scrollTop:top,closest:()=>({dataset:{z2d3EventKey:key}})};return {panel,querySelector:()=>panel};};
 const old=root('field:merchant',120),next=root('field:merchant',0),other=root('service:1',0);
 const snapshot=api.eventScrollState(old);assert.equal(snapshot.top,120);api.restoreEventScroll(next,snapshot);assert.equal(next.panel.scrollTop,120);
 api.restoreEventScroll(other,snapshot);assert.equal(other.panel.scrollTop,0);assert.equal(api.eventScrollState({querySelector:()=>null}),null);
});
test('Z2d3 event card owns bounded scrolling and movement handler uses real state',()=>{
 assert.match(css,/\.action-forest\[data-z2d3-event-key\]\{touch-action:pan-y\}/);
 assert.match(css,/\.v075-event-shade \.v075-event-card\{max-height:100%;min-height:0;overflow-y:auto/);
 assert.match(css,/\.action-forest\[data-z2d3-event-key\] \.field-event\{[^}]*overflow-y:auto/);
 assert.match(app,/if\(!keyboardMovementAllowed\(game,overlay\)\)keys.clear\(\)/);
 assert.match(app,/keydown',e=>\{if\(keyboardMovementAllowed\(game,overlay\)\)/);
});