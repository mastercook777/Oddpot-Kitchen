import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {drawGuestPortrait,drawGuestPortraits} from '../src/guest_portraits_v104.js';
import {newGame,guestBookEntries} from '../src/engine.js';

function canvas(){
 const drawn=[],ops=[];
 const ctx={
  fillStyle:'#000',imageSmoothingEnabled:true,
  save(){ops.push('save')},restore(){ops.push('restore')},
  translate(){},scale(){},
  clearRect(){ops.push('clear')},
  fillRect(x,y,w,h){drawn.push([x,y,w,h,this.fillStyle])}
 };
 return {node:{width:64,height:80,getContext(){return ctx}},ctx,drawn,ops};
}
test('same live restaurant pixel actor renders all four known groups, with distinct silhouettes',()=>{
 const portraits=new Map();
 for(const kind of ['adventurer','family','regular','critic']){
  const {node,drawn,ctx,ops}=canvas();
  assert.equal(drawGuestPortrait(node,kind),true);
  assert.equal(ctx.imageSmoothingEnabled,false);
  assert.ok(drawn.length>20,kind+' should use many original pixel rectangles');
  assert.ok(ops.includes('save')&&ops.includes('restore'));
  portraits.set(kind,JSON.stringify(drawn));
 }
 assert.equal(new Set(portraits.values()).size,4,'each group must have its original pixel silhouette');
});
test('a guest never encountered is NOT painted as an already-known guest; no bogus kinds',()=>{
 const {node,drawn}=canvas();
 assert.equal(drawGuestPortrait(node,'unknown'),false);
 assert.equal(drawn.length,0);
 assert.equal(drawGuestPortrait(null,'adventurer'),false);
});
test('paint occurs only on stamped seen canvas nodes, and is safe when no sheet exists',()=>{
 const canvases=['adventurer','family','regular','critic'].map(kind=>{
  const {node}=canvas();node.dataset={guestPortrait:kind};return node;
 });
 assert.equal(drawGuestPortraits(null),0);
 assert.equal(drawGuestPortraits({querySelectorAll(){return canvases}}),4);
});
test('portrait is the actual game pixelActor renderer, not an independently invented art path',()=>{
 const code=readFileSync(new URL('../src/guest_portraits_v104.js',import.meta.url),'utf8');
 const scenes=readFileSync(new URL('../src/scenes_v04.js',import.meta.url),'utf8');
 assert.match(code,/import \{pixelActor\} from '\.\/pixels_v041\.js/);
 assert.match(code,/pixelActor\(c,kind,/);
 assert.match(scenes,/import \{pixelActor,pixelEnemy,pixelImpact\} from '\.\/pixels_v041\.js/);
});
test('book guest art is gated by same genuine-seen state, with no loss of relationship data',()=>{
 const game=newGame(),old=JSON.stringify(game.guestRelationships);
 assert.equal(guestBookEntries(game).filter(g=>g.seen).length,0);
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 assert.match(app,/g\.seen\?\x60<canvas class="v104-guest-portrait"/);
 assert.match(app,/data-guest-portrait="/);
 assert.match(app,/:\x27<span class="v104-guest-unknown">\?<\/span>\x27/);
 assert.match(app,/if\(overlay==='book'&&bookTab==='guests'\)drawGuestPortraits\(app\)/);
 assert.equal(JSON.stringify(game.guestRelationships),old);
});
test('separate sheet header reserves full close target and does not overlay tabs or scroll',()=>{
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/kitchen_050.css',import.meta.url),'utf8');
 assert.match(app,/sheet \$\{overlay==='book'\?'v104-book-sheet':''\}/);
 assert.match(app,/data-book-tab="recipes"/);
 assert.match(app,/data-book-tab="guests"/);
 assert.match(app,/data-act="close-sheet"/);
 assert.match(css,/\.v104-book-sheet \.sheet-header\s*\{[^}]*min-height:57px/);
 assert.match(css,/\.v104-book-sheet \.sheet-close\s*\{[^}]*width:44px;min-width:44px;height:44px;min-height:44px/s);
 assert.match(css,/\.v104-book-sheet \.sheet-body\{padding-top:8px;min-height:0;overflow-y:auto\}/);
 assert.match(css,/\.v104-book-sheet \.v102-book-tabs\s*\{/);
 assert.match(css,/@media\(max-width:350px\)/);
 assert.match(css,/image-rendering:pixelated/);
 assert.match(app,/data-choose-variant/);
});
