import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {ING,RECIPES} from '../src/data.js';
import {z2a2Icon} from '../src/ui_icons_z2a2.js';
// Test markup bindings without requiring browser-only raster Canvas generation.
const ingredientIconHtml=id=>Object.hasOwn(ING,id)?'<img data-ingredient-icon="'+id+'">':'';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8'),app=read('src/app.js'),css=read('src/full_game_ui_v014.css'),three=read('src/three_y2_diner.js');
function fixture(selected,method,kitchen){
 const game={inventory:{chicken:5,chili:2,mushroom:3},phase:'research',kitchen};
 const onlyName=id=>ING[id]?.name||id,cookName=t=>({WOK:'炒锅',POT:'炖锅',STEAM:'云汽蒸笼',GRILL:'烤架'})[t],esc=x=>String(x??'');
 const start=app.indexOf('const z2bPhase='),end=app.indexOf('function z2a2Health',start);
 return new Function('game','selectedIngredients','selectedMethod','z2a2Icon','ingredientIconHtml','onlyName','cookName','esc','ensureKitchen',app.slice(start,end)+';return {z2bPhase,z2bCookIcon,z2bMethod,z2bDishArt,z2bVesselButtons,z2bSelectedTray}')(game,selected,method,z2a2Icon,ingredientIconHtml,onlyName,cookName,esc,s=>s.kitchen);
}
test('Z2b workbench draws exactly three actual selection slots and owned cookware, without mutating inputs',()=>{
 for(const ids of [[],['chicken'],['chicken','chili'],['chicken','chili','mushroom']])for(const method of ['stir','stew','steam','grill']){
  const kitchen={steamerOwned:method==='steam',grillOwned:method==='grill'},before=JSON.stringify([ids,kitchen]),f=fixture(ids,method,kitchen),tray=f.z2bSelectedTray(),vessels=f.z2bVesselButtons();
  assert.equal((tray.match(/class="z2b-tray-slot /g)||[]).length,3);
  assert.equal((tray.match(/class="z2b-tray-slot filled"/g)||[]).length,ids.length);
  for(const id of ids){assert.ok(tray.includes('data-ingredient="'+id+'"'));assert.ok(tray.includes('data-ingredient-icon="'+id+'"'));}
  assert.equal((vessels.match(/aria-pressed="true"/g)||[]).length,1);
  assert.equal((vessels.match(/class="v063-vessel /g)||[]).length,method==='steam'||method==='grill'?3:2);
  assert.ok(vessels.includes('data-act="method:'+method+'"'));assert.equal(JSON.stringify([ids,kitchen]),before);
 }
});
test('Z2b dish tickets use real recipe ingredients and cookware art, not emoji food placeholders',()=>{
 const f=fixture([],'stir',{});
 for(const r of Object.values(RECIPES)){
  const type=r.method==='steam'?'STEAM':r.station||'WOK',html=f.z2bDishArt(r.ids,type);
  assert.ok(html.includes('data-icon-art="hearthcraft"'));for(const id of r.ids)assert.ok(html.includes('data-ingredient-icon="'+id+'"'));
  assert.ok(html.includes('aria-hidden="true"'));
 }
});
test('Z2b preserves action endpoints, actual 3D hosts, separate prep regions and scroll ownership',()=>{
 assert.match(app,/data-ingredient="\$\{id\}" class="z2b-tray-slot filled"/);
 assert.match(app,/selectedIngredients=selectedIngredients.filter\(i=>i!==id\)/);
 assert.match(app,/beginLiveResearch\(game,selectedIngredients/);assert.match(app,/performLiveAction\(game,act.slice\(12\)\)/);
 assert.match(app,/selectMenuRecipe\(game,Number\(slot\),id\)/);assert.match(app,/configureKitchenSlot\(game,Number\(i\),type\)/);assert.match(app,/prepDish\(game,act.slice\(5\)\)/);
 assert.match(app,/function prep\(\)[^\n]*ui2Room\('prep'/);assert.match(app,/function ui2Room[^\n]*restaurantView\(false\)/);assert.match(app,/function ui2PrepPanel\(\)/);
 assert.match(app,/ui2Tool\('stock','bag'/);assert.match(app,/prevPantryScroll/);assert.match(app,/prevStageScroll/);
 assert.match(app,/data-live-pan="true"/);assert.match(app,/class="v014c-hearth/);assert.match(app,/class="v063-receipt-head"/);
 assert.match(three,/\['forecast','menu','prep','report','upgrade'\].includes\(s\?\.phase\)/);assert.match(three,/kitchen-preview/);
 const ui2=read('src/formal_ui_v2.css');assert.match(ui2,/\.ui2-room-host\{position:absolute!important;inset:0!important/);
 assert.match(ui2,/\.sheet-body\{overflow:auto!important/);
 assert.match(ui2,/\.kitchen-choice button\{min-height:52px/);
 assert.match(css,/\.z2b-shell \.z2b-pantry\{[^}]*overflow-y:auto/);
});