import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ui2Scene} from '../src/formal_ui_v2.js';
test('UI2 maps the six restaurant phases to one persistent room, not six screens',()=>{
 for(const phase of ['forecast','menu','prep','service','report','upgrade'])for(const has of [true,false])assert.equal(ui2Scene(phase,has),'room');
 assert.equal(ui2Scene('field',false),'departure');assert.equal(ui2Scene('field',true),'field');assert.equal(ui2Scene('research',false),'research');assert.equal(ui2Scene('research',true),'research');
});
test('production uses same architecture and bundle online and offline',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8'),app=read('src/app.js'),html=read('index.html'),build=read('scripts/build-standalone.py');
 assert.match(app,/ui2Mount\(app,shell\(stage,dock\),game.phase,!!game.field\)/);
 assert.doesNotMatch(app,/app\.innerHTML=shell\(/);
 assert.match(html,/formal_ui_v2\.css/);
 assert.match(build,/formal_ui_v2\.css/);assert.match(build,/formal_ui_v2\.js/);
 assert.match(app,/function harvestResult/);assert.match(app,/function ui2MenuPanel/);assert.match(app,/function ui2PrepPanel/);
 assert.match(app,/discardFieldStack\(game,ui2DiscardId\)/);
});
