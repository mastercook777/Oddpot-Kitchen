import test from 'node:test';import assert from 'node:assert/strict';
import {createRecovery,createRetryLoader} from '../src/three_y6a_recovery.js';
test('scene failures cool down, retry at most three times, recover after stable rendering or reentry',()=>{
 let t=0;const r=createRecovery({now:()=>t,delay:100});assert.ok(r.canTry());r.fail();assert.equal(r.canTry(),false);t=100;assert.ok(r.canTry());r.fail();t=300;assert.ok(r.canTry());r.fail();t=10000;assert.ok(r.exhausted);assert.equal(r.canTry(),false);r.reset();assert.ok(r.canTry());r.fail();t+=100;assert.ok(r.canTry());r.success();t+=2501;r.success();assert.equal(r.failures,0);
});
test('shared loader deduplicates pending imports, retries a rejected URL, and retains late success',async()=>{
 let t=0,calls=0;let resolve;const loader=createRetryLoader([()=>{calls++;throw Error('transient')},()=>{calls++;return new Promise(r=>resolve=r)}],{now:()=>t,delay:100});
 const first=loader.tryLoad();assert.equal(loader.tryLoad(),first);assert.equal(await first,null);assert.equal(calls,1);assert.equal(await loader.tryLoad(),null);t=100;const second=loader.tryLoad();await Promise.resolve();assert.equal(calls,2);assert.equal(loader.tryLoad(),second);resolve({engine:true});assert.deepEqual(await second,{engine:true});assert.equal(loader.value.engine,true);assert.equal(await loader.tryLoad(),loader.value);assert.equal(calls,2);assert.equal(loader.exhausted,false);
});
test('exhausted loader does not spin; manual reset restores finite budget',async()=>{
 let calls=0;const l=createRetryLoader([()=>{calls++;throw Error('offline')}],{delay:0});await l.tryLoad();assert.ok(l.exhausted);await l.tryLoad();assert.equal(calls,1);l.reset();await l.tryLoad();assert.equal(calls,2);
});
test('timed out engine import releases the pending slot and late success remains usable',async()=>{
 let resolve;const l=createRetryLoader([()=>new Promise(r=>resolve=r),()=>Promise.resolve({engine:'alternate'})],{delay:0,timeout:5});
 assert.equal(await l.tryLoad(),null);assert.equal(l.pending,null);resolve({engine:'late'});await Promise.resolve();await Promise.resolve();assert.equal((await l.tryLoad()).engine,'late');
});
