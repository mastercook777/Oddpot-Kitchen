import test from 'node:test';import assert from 'node:assert/strict';
import {previewCadence,previewAtlas,ecologyIdle} from '../src/three_z2c5_preview_motion.js';
test('RAF cadence permits 60Hz and adaptive 30Hz instead of fixed 15Hz',()=>{
 const c=previewCadence();assert.equal(c.target,60);assert.ok(c.due(16.67,0));assert.equal(c.due(8.3,0),false);
 for(let i=0;i<18;i++)c.observe(24,33.3);assert.equal(c.target,30);assert.ok(c.due(33.3,0));assert.equal(c.due(16.67,0),false);
 for(let i=0;i<18;i++)c.observe(29,50);assert.equal(c.quality,.68);
 for(let i=0;i<144;i++)c.observe(5,33.3);assert.equal(c.quality,1.05);assert.equal(c.target,60);
});
test('atlas keeps both aspect ratios, stable viewports and no overlap',()=>{
 for(const q of [.68,.85,1.05]){const a=previewAtlas(390,290,170,192,q);assert.equal(a.width,a.land.w+a.hero.w);assert.equal(a.land.x+a.land.w,a.hero.x);assert.equal(a.land.y+a.land.h,a.height);assert.equal(a.hero.y+a.hero.h,a.height);assert.ok(Math.abs(a.land.w/a.land.h-390/290)<.01);assert.ok(Math.abs(a.hero.w/a.hero.h-170/192)<.01);assert.deepEqual(a,previewAtlas(390,290,170,192,q));}
});
test('real enemy kinds have distinct continuous motion',()=>{
 for(const kind of ['chicken','boar','sporeling','steam_crab','pepper','gust_moth']){const a=ecologyIdle(kind,2,0),b=ecologyIdle(kind,2.0167,0);assert.ok(Object.values(a).every(Number.isFinite));assert.ok(Math.hypot(b.x-a.x,b.z-a.z)<.03);assert.notDeepEqual(a,b);}
 assert.notDeepEqual(ecologyIdle('chicken',2),ecologyIdle('boar',2));assert.ok(ecologyIdle('gust_moth',2).y>.1);
});
