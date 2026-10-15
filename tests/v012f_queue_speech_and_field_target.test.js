import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {selectOutdoorQueueSpeech,OUTDOOR_QUEUE_LINES,OUTDOOR_QUEUE_URGENT} from '../src/outdoor_queue_speech_v012f.js';
import {fieldDailyTarget,fieldHarvestTargetKind,fieldHarvestTargetSuffix} from '../src/field_target_v012f.js';
import {newGame,enterField,interactExplorer,completeFieldSegment,chooseFieldBranch} from '../src/engine.js';
import {startActionField,stepActionField} from '../src/field_v04.js';

const guest=(id,segment,arrival=20)=>({id,segment,arrival,status:'waiting'});
test('v0.12-F outdoor chat only belongs to actual arrived waiting guests and stops on seating/exit',()=>{
 const visitor=guest('1-1-o3','family');
 assert.equal(selectOutdoorQueueSpeech([],23),null);
 assert.equal(selectOutdoorQueueSpeech([visitor],18),null);
 assert.equal(selectOutdoorQueueSpeech([{...visitor,status:'served'}],23),null);
 assert.equal(selectOutdoorQueueSpeech([visitor],21),null); // first second of arrival is silent
 let active=null;
 for(let t=22;t<45;t+=.5){const cue=selectOutdoorQueueSpeech([visitor],t);if(cue){active=cue;break}}
 assert.ok(active);assert.equal(active.orderId,visitor.id);assert.equal(active.segment,'family');
 assert.equal(selectOutdoorQueueSpeech([visitor],active.kind==='urgent'?active.phase:23).orderId,'1-1-o3');
 assert.equal(selectOutdoorQueueSpeech([{...visitor,status:'entering'}],active.id?23:23),null);
});
test('v0.12-F pseudo-random species dialogue stable across rereads and changes per role/clock',()=>{
 const people=['adventurer','family','regular','critic','stargazer'];
 for(const segment of people){
  const orders=[guest('3-1-'+segment,segment,0)];
  const speaking=Array.from({length:140},(_,i)=>selectOutdoorQueueSpeech(orders,i*.3)).filter(Boolean);
  assert.ok(speaking.length>5,segment);
  assert.ok(speaking.every(c=>c.segment===segment&&c.orderId===orders[0].id));
  assert.ok(speaking.every(c=>OUTDOOR_QUEUE_LINES[segment].includes(c.text)||c.text===OUTDOOR_QUEUE_URGENT[segment]));
  assert.deepEqual(selectOutdoorQueueSpeech(orders,14.7),selectOutdoorQueueSpeech(orders,14.7));
  assert.ok(speaking.some(c=>c.kind==='urgent'),'real late-waiter cue is possible');
 }
 const multiple=[guest('a','family',0),guest('b','regular',0),guest('c','adventurer',0)];
 for(let t=0;t<50;t+=.25){
  const cue=selectOutdoorQueueSpeech(multiple,t);
  assert.ok(!cue||multiple.some(o=>o.id===cue.orderId));
  assert.ok(!cue||!cue.text.includes('undefined'));
 }
});
test('v0.12-F a key:target means zone completion, only exact selected ingredient means daily completion',()=>{
 const f={dailyTarget:'chili',sequence:[{type:'gather',id:'chili'}]};
 const mushroom={key:'target',id:'mushroom'};
 assert.equal(fieldDailyTarget(f),'chili');
 assert.equal(fieldHarvestTargetKind(f,mushroom),'segment');
 assert.match(fieldHarvestTargetSuffix(f,mushroom,{action:true}),/本区采集完成/);
 assert.doesNotMatch(fieldHarvestTargetSuffix(f,mushroom,{action:true}),/今日目标/);
 assert.match(fieldHarvestTargetSuffix(f,{...mushroom,id:'chili'},{action:true}),/今日目标已完成/);
 assert.equal(fieldHarvestTargetSuffix(f,{...mushroom,key:'pocket-0',id:'chili'}),'');
 const legacy={sequence:[{type:'gather',id:'onion'}],target:'mushroom'};
 assert.equal(fieldDailyTarget(legacy),'onion');
 assert.match(fieldHarvestTargetSuffix(legacy,{key:'target',id:'mushroom'}),/本区/);
});
test('v0.12-F a player-chosen non-mushroom run can still advance through a mushroom branch without false completion',()=>{
 const s=newGame(15689);s.phase='field';s.selectedTarget='chili';
 assert.equal(enterField(s,'safe'),true);
 assert.equal(s.field.dailyTarget,'chili');
 const first=s.field.nodes.find(n=>n.key==='target');
 assert.equal(first.id,'chili');
 s.field.x=first.x;s.field.y=first.y;
 const result=interactExplorer(s);
 assert.equal(result.ok,true);assert.match(result.message,/今日目标已完成/);
 assert.equal(completeFieldSegment(s),true);
 assert.equal(s.field.segmentStatus,'choice');
 assert.equal(chooseFieldBranch(s,'1-0'),true);
 const node=s.field.nodes.find(n=>n.key==='target');
 assert.equal(node.id,'mushroom');
 assert.equal(s.field.dailyTarget,'chili');
 s.field.x=node.x;s.field.y=node.y;
 const result2=interactExplorer(s);
 assert.equal(result2.ok,true);assert.match(result2.message,/本区采集完成/);
 assert.doesNotMatch(result2.message,/今日目标/);
 assert.equal(completeFieldSegment(s),true,'zone progress must still be valid');
});
test('v0.12-F real action-stage auto-harvest uses the same truthful per-run target',()=>{
 const s=newGame(13799);s.phase='field';s.selectedTarget='potato';
 assert.equal(enterField(s,'safe'),true);
 const target=s.field.nodes.find(n=>n.key==='target');
 assert.equal(target.id,'potato');
 assert.equal(startActionField(s),true);
 s.field.enemies=[];s.field.pos={x:target.x,y:target.y};
 for(let i=0;i<35&&!target.claimed;i++)stepActionField(s,0,0,.06);
 assert.equal(target.claimed,true);
 assert.match(s.field.actionMessage,/今日目标已完成/);
 assert.equal(completeFieldSegment(s),true);
 assert.equal(chooseFieldBranch(s,'1-0'),true);
 assert.equal(startActionField(s),true);
 s.field.enemies=[];
 const branch=s.field.nodes.find(n=>n.key==='target');
 assert.equal(branch.id,'mushroom');
 s.field.pos={x:branch.x,y:branch.y};
 for(let i=0;i<35&&!branch.claimed;i++)stepActionField(s,0,0,.06);
 assert.equal(branch.claimed,true);
 assert.match(s.field.actionMessage,/本区采集完成/);
 assert.doesNotMatch(s.field.actionMessage,/今日目标/);
});
test('v0.12-F visual renderer binds the visible actual queue and offline pack contains the new pure modules',()=>{
 const scenes=readFileSync(new URL('../src/scenes_v04.js',import.meta.url),'utf8');
 const bundle=readFileSync(new URL('../scripts/build-standalone.py',import.meta.url),'utf8');
 assert.match(scenes,/drawOutdoorQueueChatter\(c,queue,t,L,T,W,H\)/);
 assert.match(scenes,/selectOutdoorQueueSpeech\(queue,t\)/);
 assert.match(bundle,/outdoor_queue_speech_v012f\.js/);
 assert.match(bundle,/field_target_v012f\.js/);
});
