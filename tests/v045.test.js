import test from 'node:test';
import assert from 'node:assert/strict';
import {ING} from '../src/data.js';
import {newGame,nextPhase,enterField} from '../src/engine.js';
import {startActionField,stepActionField,addBag} from '../src/field_v04.js';
import {guestWaitRatio} from '../src/scenes_v04.js';
test('6 / 7 / 8 slot backpacks can collect exactly their upgraded capacity',()=>{
 const ids=Object.keys(ING);assert.ok(ids.length>=8);
 for(const capacity of [6,7,8]){const f={bag:{},capacity};ids.forEach((id,i)=>assert.equal(addBag(f,id,1),i<capacity?1:0));assert.equal(Object.keys(f.bag).length,capacity);}
});
test('ingredient stacks cap at 3 and unknown items cannot be inserted',()=>{
 const f={bag:{},capacity:8};
 assert.equal(addBag(f,'mushroom',2),2);assert.equal(addBag(f,'mushroom',2),1);
 assert.equal(addBag(f,'mushroom',1),0);assert.equal(addBag(f,'unknown_material',1),0);
 assert.equal(Object.keys(f.bag).length,1);
});
test('collect resources when within 0.78 cells for 0.82s and never collect twice',()=>{
 const s=newGame();nextPhase(s,'field');assert.equal(enterField(s,'safe'),true);assert.equal(startActionField(s),true);
 const f=s.field,n=f.nodes.find(n=>n.key==='target');f.enemies=[];f.pos={x:n.x,y:n.y+.78};
 for(let i=0;i<17;i++)stepActionField(s,0,0,.06);
 assert.equal(n.claimed,true);assert.equal(f.bag[n.id],2);
 for(let i=0;i<17;i++)stepActionField(s,0,0,.06);
 assert.equal(f.bag[n.id],2);
});
test('customer patience ring is clamped and frozen on pause',()=>{
 assert.equal(guestWaitRatio(10,10,20),1);assert.equal(guestWaitRatio(15,10,20),.75);
 assert.equal(guestWaitRatio(20,10,20),.5);assert.equal(guestWaitRatio(30,10,20),0);
 assert.equal(guestWaitRatio(40,10,20),0);assert.equal(guestWaitRatio(8,10,20),1);
});
