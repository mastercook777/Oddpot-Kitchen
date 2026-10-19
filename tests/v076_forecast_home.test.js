import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {newGame,serviceDayPlan,ensureKitchen,availableBento,nextPhase} from '../src/engine.js';

const source=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const app=source('../src/app.js'),css=source('../src/forecast_home_v076.css');
const index=source('../index.html'),pkg=JSON.parse(source('../package.json'));

test('the internal, browser, offline and package versions all target v0.15.0-alpha.1',()=>{
 assert.equal(pkg.version,'0.15.0-alpha.1');
 assert.match(index,/<title>怪味食堂 · Oddpot Kitchen v0\.15\.0-alpha\.1<\/title>/);
 assert.match(index,/src\/app\.js\?v=0\.15\.0-alpha\.2/);
 assert.match(index,/forecast_home_v076\.css\?v=0\.9\.3/);
 assert.match(app,/ODDPOT · v0\.15\.0-alpha\.1/);
 assert.match(index,/full_game_ui_v014\.css/);
 const script=source('../scripts/build-standalone.py');
 assert.match(script,/forecast_home_v076\.css/);
 assert.match(script,/v0\.15\.0-alpha\.1 离线版/);
});
test('home is its own phase UI, without historical large message bar or old bottom dock',()=>{
 const s=app.slice(app.indexOf('function shell('),app.indexOf('\nfunction overlayMarkup(',app.indexOf('function shell(')));
 assert.match(s,/home=game\.phase==='forecast'/);
 assert.match(s,/playablePhase\(\)\|\|home\?'':toast\(\)/);
 assert.match(s,/walk\|\|home\?'':/);
 const forecast=app.slice(app.indexOf('function forecast(){'),app.indexOf('\nfunction field(){'));
 assert.match(forecast,/v076-mission/);
 assert.match(forecast,/v076-preview/);
 assert.match(forecast,/v076-home-controls/);
 assert.doesNotMatch(forecast,/scene-float/);
 assert.doesNotMatch(forecast,/sceneTag/);
 assert.doesNotMatch(forecast,/forecast-advice/);
 assert.doesNotMatch(forecast,/dock-head/);
 assert.doesNotMatch(forecast,/game-toast/);
});
test('one main button and three small shortcuts retain real action handlers',()=>{
 const screen=app.slice(app.indexOf('function forecast(){'),app.indexOf('\nfunction field(){'));
 assert.equal((screen.match(/data-act="to-field"/g)||[]).length,1);
 assert.equal((screen.match(/class="v076-home-primary"/g)||[]).length,1);
 for(const action of ['stock','bento','book']){
  assert.equal((screen.match(new RegExp('data-act="'+action+'"','g'))||[]).length,1);
 }
 assert.match(app,/if\(act==='to-field'\)\{nextPhase\(game,'field'\)/);
 assert.match(app,/if\(act==='book'\)\{bookTab='recipes';overlay='book';render\(\);return\}/);
 assert.match(app,/if\(act==='stock'\|\|act==='premium'\|\|act==='settings'/);
 const s=newGame();
 assert.equal(s.phase,'forecast');
 assert.ok(serviceDayPlan(s).goal.label.length>0);
 assert.equal(ensureKitchen(s).slots.length,2);
 assert.ok(Array.isArray(availableBento(s)));
 nextPhase(s,'field');
 assert.equal(s.phase,'field');
});
test('the compact game HUD shows the current phase and a journey, with version in settings',()=>{
 const hud=app.slice(app.indexOf('function hud(){'),app.indexOf('\nfunction toast(){'));
 assert.match(hud,/home=game\.phase==='forecast'/);
 assert.match(hud,/v014-journey/);
 assert.match(hud,/phaseLabels\[game\.phase\]/);
 assert.doesNotMatch(hud,/ODDPOT · v/);
 assert.match(app,/ODDPOT · v0\.15\.0-alpha\.1/);
});
test('small-phone responsive CSS protects the preview, touch targets and bottom safe area',()=>{
 assert.match(css,/\.v076-preview\{flex:1 1 0/);
 assert.match(css,/\.v076-home-primary\{/);
 assert.match(css,/\.v076-home-shortcuts\{/);
 assert.match(css,/env\(safe-area-inset-bottom\)/);
 assert.match(css,/@media\(max-width:350px\)/);
 assert.match(css,/@media\(max-height:575px\)/);
 assert.doesNotMatch(css,/\.stage\.service/,'forecast CSS must not change active restaurant');
});
test('the same existing Canvas restaurant is displayed without inventing a second environment',()=>{
 const forecast=app.slice(app.indexOf('function forecast(){'),app.indexOf('\nfunction field(){'));
 assert.match(forecast,/restaurantView\(false\)/);
 assert.match(app,/if\(v\?\.walkable\|\|!v\)return/);
 const sc=source('../src/scenes_v04.js');
 assert.match(sc,/if\(v\?\.walkable\|\|!v\)\{drawRestaurantV075\(c,s,t,w,h\);return;\}/);
});
test('app and stylesheet scripts parse without syntax errors',()=>{
 const p=spawnSync(process.execPath,['--check',new URL('../src/app.js',import.meta.url).pathname],{encoding:'utf8'});
 assert.equal(p.status,0,p.stderr);
});
