import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const standalone=readFileSync(new URL('../standalone.html',import.meta.url),'utf8');
for(const [name,src] of [['main',app],['offline',standalone]])test(name+' keeps exactly one RAF scheduled through a transient scene or loop exception',()=>{
 const a=src.indexOf('const sceneFrameErrors=new Map();'),b=src.indexOf('function advanceFrame(now)',a);
 assert.ok(a>=0&&b>a);
 const queue=[],diagnostics={sceneErrors:{}},logs=[];let calls=0;
 const {frame,safeSceneFrame}=new Function('requestAnimationFrame','advanceFrame','globalThis','console',src.slice(a,b)+';return {frame,safeSceneFrame};')(fn=>queue.push(fn),()=>{calls++;if(calls===1)throw Error('temporary');},{__oddpotBuild:diagnostics},{warn:(...args)=>logs.push(args)});
 frame(0);assert.equal(queue.length,1);assert.match(diagnostics.sceneErrors['frame-loop'],/temporary/);
 queue.shift()(16);assert.equal(queue.length,1);assert.equal(calls,2);assert.equal(diagnostics.sceneErrors['frame-loop'],undefined);
 assert.equal(safeSceneFrame('diner',()=>{throw Error('paint')}),false);assert.equal(safeSceneFrame('diner',()=>{throw Error('paint')}),false);assert.equal(logs.length,2);
 assert.equal(safeSceneFrame('diner',()=>{}),true);assert.deepEqual(diagnostics.sceneErrors,{});
 assert.match(src,/safeSceneFrame\('diner',\(\)=>drawDiner/);
});
