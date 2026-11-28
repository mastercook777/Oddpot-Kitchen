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

test('UI2 morning room migrates existing market before the first render saves it',()=>{
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 const offline=readFileSync(new URL('../standalone.html',import.meta.url),'utf8');
 for(const source of [app,offline])assert.match(source,/function forecast\(\)\{[^}]*ensureDailyMarket\(game\);/);
});

test('departure shares the compact HUD and reserves a fixed clear map viewport',()=>{
 const css=readFileSync(new URL('../src/formal_ui_v2.css',import.meta.url),'utf8');
 assert.match(css,/\[data-ui2-scene=departure\]\) \.ui2-hud-stack\{display:flex/);
 assert.match(css,/\[data-ui2-scene=departure\] \.z2c2-expedition\{position:absolute!important;inset:calc\(var\(--ui2-hud-top\) \+ 52px\)/);
 assert.match(css,/\[data-ui2-scene=departure\] \.z2ed3-departure\{padding-top:0!important/);
 const html=readFileSync(new URL('../standalone.html',import.meta.url),'utf8');assert.ok(html.includes(css));
});

test('departure map preserves the 35 percent floor with rounding margin and one published build label',()=>{
 const css=readFileSync(new URL('../src/formal_ui_v2.css',import.meta.url),'utf8');
 assert.match(css,/grid-template-rows:minmax\(calc\(35dvh \+ 2px\),1\.2fr\)/);
 assert.match(css,/\.z2ed3-departure \.z2c2-map\{min-height:calc\(35dvh \+ 2px\)!important/);
 const online=readFileSync(new URL('../index.html',import.meta.url),'utf8'),offline=readFileSync(new URL('../standalone.html',import.meta.url),'utf8'),app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8'),builder=readFileSync(new URL('../scripts/build-standalone.py',import.meta.url),'utf8');
 const version=online.match(/const build='([^']+)'/)[1];
 assert.ok(online.includes('当前构建版本">'+version+' · Loading'));assert.ok(app.includes('ODDPOT · '+version+' · 单机本地存档'));assert.ok(offline.includes('怪味食堂 · '+version+' 离线版'));assert.ok(builder.includes('怪味食堂 · '+version+' 离线版'));
});
