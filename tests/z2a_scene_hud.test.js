import test from 'node:test';import assert from 'node:assert/strict';
import {z2aOrderMark,z2aOrderStatus,z2aDrawMark} from '../src/scene_hud_z2a.js';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Z2a order marks use actual status, patience and satisfaction; no mutation',()=>{
 const cases=[['waiting','…'],['entering','…'],['ordering','?'],['queued','…'],['cooking','…'],['pickup','↑'],['carried','↑'],['delivering','↑'],['flying','↑'],['eating','·'],['review','✓'],['left','!'],['rejected','!'],['served',null]];
 for(const [status,glyph] of cases){const o={id:'o',status,arrival:1,patience:30,sat:80,leftAt:5},before=JSON.stringify(o),m=z2aOrderMark(o,5);assert.equal(m?.glyph??null,glyph);assert.ok(z2aOrderStatus(o,5).length>0);assert.equal(JSON.stringify(o),before);}
 assert.equal(z2aOrderMark({status:'queued',arrival:0,patience:10},2).glyph,'!');
 assert.equal(z2aOrderMark({status:'review',sat:40},2).glyph,'!');
 assert.equal(z2aOrderMark({status:'waiting',arrival:6},2),null);
 assert.equal(z2aOrderMark({status:'left',leftAt:0},2),null);
});
test('Z2a marks stay at 20px and clamp inside the canvas',()=>{
 let rect,word;const c={save(){},restore(){},beginPath(){},roundRect(...a){rect=a},fill(){},stroke(){},fillText(...a){word=a}};
 z2aDrawMark(c,-100,999,{glyph:'!',color:'#ffad92'},320,500);
 assert.deepEqual(rect,[1,479,20,20,5]);assert.deepEqual(word,['!',11,489]);
});
test('Z2a live HUD structure, ledger and offline shared presentation',()=>{
 const app=read('src/app.js'),scene=read('src/scenes_v04.js'),three=read('src/three_y2_diner.js'),css=read('src/full_game_ui_v014.css'),build=read('scripts/build-standalone.py');
 const hud=app.slice(app.indexOf('function hud(){'),app.indexOf('function toast()')),service=app.slice(app.indexOf('function service(){'),app.indexOf('function report(){'));
 assert.match(hud,/z2a-service-hud/);assert.match(hud,/z2a-field-hud/);assert.match(hud,/data-act="service-ledger"/);assert.doesNotMatch(service,/class="v075-status"/);
 assert.match(app,/overlay==='service-ledger'/);assert.match(app,/z2aOrderStatus\(o,t\)/);assert.match(app,/warn.shortages.flatMap/);
 assert.match(scene,/z2aDrawMark\(c,X,Y-43,z2aOrderMark\(o,t\),w,h\)/);assert.match(three,/element.dataset.statusMarks/);
 assert.match(css,/\.z2a-hud/);assert.match(css,/min-height:44px/);assert.match(build,/'scene_hud_z2a.js'/);
});