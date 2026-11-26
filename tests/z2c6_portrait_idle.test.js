import test from 'node:test';import assert from 'node:assert/strict';
import {portraitIdle} from '../src/three_z2c6_chef_portrait.js';
test('portrait blink, glance and reveal have separate timing',()=>{
 assert.ok(portraitIdle(2.28).blink<.1);assert.equal(portraitIdle(0).blink,1);
 assert.ok(portraitIdle(4).glance>.9);assert.equal(portraitIdle(2.28).glance,0);
 assert.ok(portraitIdle(.35,0).show>.99);assert.ok(portraitIdle(1,0).show<1e-8);
});
test('30 seconds of portrait movement remain finite and continuous',()=>{
 for(let t=0;t<=30;t+=1/60){const a=portraitIdle(t,0),b=portraitIdle(t+1/60,0);assert.ok(Object.values(a).every(Number.isFinite));assert.ok(a.blink>=.079&&a.blink<=1);assert.ok(Math.abs(a.roll-b.roll)<.01);assert.ok(Math.abs(a.yaw-b.yaw)<.03);assert.ok(Math.abs(a.headRoll-b.headRoll)<.02);}
});
