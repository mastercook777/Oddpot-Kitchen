import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeChefZ2c7,portraitIdle} from '../src/three_z2c7_chef_portrait.js';
test('Z2c7 hero model keeps an independent factory and finite bounded preview motion',()=>{
 assert.equal(typeof makeChefZ2c7,'function');
 for(let i=0;i<=1800;i++){const p=portraitIdle(i/60,10);assert.ok(Object.values(p).every(Number.isFinite));assert.ok(p.blink>=.079&&p.blink<=1);assert.ok(Math.abs(p.glance)<=1);assert.ok(p.show>=0&&p.show<=1)}
});
test('hero atelier uses real model factories, four views and no save API',()=>{
 const html=readFileSync(new URL('../hero-atelier.html',import.meta.url),'utf8');
 for(const version of ['Z2c5','Z2c6','Z2c7'])assert.ok(html.includes('makeChef'+version));
 for(const angle of [0,45,90,180])assert.ok(html.includes('data-angle="'+angle+'"'));
 assert.match(html,/new T\.WebGLRenderer/);
 assert.match(html,/document\.hidden/);
 assert.doesNotMatch(html,/localStorage|sessionStorage|indexedDB/);
 const script=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1].replace(/^import .*;\n/gm,'');
 assert.doesNotThrow(()=>new Function(script));
});
