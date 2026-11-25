import test from 'node:test';import assert from 'node:assert/strict';
import {Z2A3_ART,z2a3Layers} from '../src/ui_icon_art_z2a3.js';
import {Z2A2_ICONS,z2a2Icon,z2a2DrawIcon,z2a2LineIcon} from '../src/ui_icons_z2a2.js';
test('Hearthcraft covers all original keys with actual multi-color illustrated shapes',()=>{
 assert.deepEqual(Object.keys(Z2A3_ART).sort(),Object.keys(Z2A2_ICONS).sort());
 for(const [name,layers] of Object.entries(Z2A3_ART)){
  assert.ok(layers.length>=3,name);assert.ok(new Set(layers.map(l=>l[1]).filter(f=>f!=='none')).size>=2,name);
  const markup=z2a2Icon(name);assert.ok(markup.includes('data-icon-art="hearthcraft"'));assert.ok(markup.includes('aria-hidden="true"'));assert.notEqual(markup,z2a2LineIcon(name));
  for(const [d,f,s,w] of layers){assert.ok(d.startsWith('M'));assert.match(f,/^(#[0-9a-f]{6}|none)$/i);assert.match(s,/^(#[0-9a-f]{6}|none)$/i);assert.ok(Number.isFinite(w)&&w>=0);}
  assert.equal((markup.match(/<path /g)||[]).length,layers.length);
 }
});
test('Canvas and SVG share every ordered fill/stroke and cached path; health has an empty variant',()=>{
 const old=globalThis.Path2D;let builds=0,ops=[];
 try{
  globalThis.Path2D=class {constructor(d){this.d=d;builds++;}};
  const c={save(){},restore(){},translate(){},scale(){},fill(p){ops.push([p.d,'fill',this.fillStyle]);},stroke(p){ops.push([p.d,'stroke',this.strokeStyle,this.lineWidth]);}};
  for(const [name,layers] of Object.entries(Z2A3_ART)){
   ops=[];assert.ok(z2a2DrawIcon(c,name,12,12,18,'#fff'));const expected=layers.flatMap(([d,f,s,w])=>[...(f!=='none'?[[d,'fill',f]]:[]),...(s!=='none'&&w>0?[[d,'stroke',s,w]]:[])]);
   assert.deepEqual(ops,expected);const before=builds;ops=[];assert.ok(z2a2DrawIcon(c,name,12,12,20,'#fff'));assert.equal(builds,before);assert.deepEqual(ops,expected);
  }
 }finally{if(old===undefined)delete globalThis.Path2D;else globalThis.Path2D=old;}
 assert.notDeepEqual(z2a3Layers('heart','is-empty'),z2a3Layers('heart','is-full'));assert.notEqual(z2a2Icon('heart','is-empty'),z2a2Icon('heart','is-full'));assert.equal(z2a2Icon('missing'),'');
});