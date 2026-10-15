import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {DINER_VOICES,diningSpeechCue,selectStaffSpeech,selectDiningSpeech} from '../src/diner_ambience_v077.js';
import {newGame,createService,setServicePaused,tick,recipeCraftSnapshot} from '../src/engine.js';
const source=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const sample=(segment='regular',status='ordering')=>({
 id:'1-1-o3',segment,status,tableId:0,seatId:0,recipeId:'chili_meat',
 seatedAt:2,orderedAt:3,arrival:3,patience:27,
 started:6,pickupAt:11,carriedAt:12,deliveryAt:13,landedAt:18,
 reviewAt:21,reviewedAt:23,reviewText:'非常好吃！',reviewType:'delicious'
});
test('all six customer segments have distinct, multiple voice lines for every meaningful activity',()=>{
 const types=['adventurer','family','regular','critic','stargazer','gardener'];
 assert.deepEqual(Object.keys(DINER_VOICES).sort(),types.sort());
 const kinds=['order','choose','kitchen','ready','delivery','eat','hurry','furious','stockout','mismatch'];
 for(const type of types){
  for(const kind of kinds){
   assert.ok(DINER_VOICES[type][kind].length>=3,type+' '+kind);
   assert.ok(DINER_VOICES[type][kind].every(x=>x.length>3),type+' '+kind);
  }
 }
 const guests=types.map(s=>diningSpeechCue(sample(s),2.6)?.text);
 assert.equal(new Set(guests).size,6,'opening phrases must sound distinct by archetype');
});
test('speech for a real dish leads with the actual recipe name and is deterministic across frames',()=>{
 const o=sample('critic','queued');
 const a=diningSpeechCue(o,3.2),b=diningSpeechCue(o,3.9);
 assert.ok(a.text.startsWith('火椒噼啪肉！'));
 assert.equal(a.text,b.text);
 assert.equal(diningSpeechCue(o,7),null,'transient speech must disappear');
 const f={...o,id:'another-guest'};
 assert.ok(diningSpeechCue(f,3.3)?.text.startsWith('火椒噼啪肉！'));
});
test('real shortage mentions genuinely unavailable ingredients, not a generic bad-menu reason',()=>{
 const s=newGame();s.phase='service';
 assert.equal(createService(s,{walkable:true}),true);
 assert.equal(setServicePaused(s,false),true);
 const v=s.service,o=v.orders[0];
 Object.assign(o,{status:'queued',recipeId:'chili_meat',tableId:0,seatId:0,
   arrival:0,patience:100,craft:recipeCraftSnapshot(s,'chili_meat')});
 v.queued=[o.id];
 for(const id of Object.keys(s.inventory))s.inventory[id]=0;
 tick(s,1);
 assert.equal(o.status,'rejected');
 assert.equal(o.rejectReason,'食材不足');
 assert.ok(o.missingIngredients?.length>0);
 const cue=diningSpeechCue(o,v.time+.4);
 assert.equal(cue.kind,'upset');
 assert.ok(cue.text.includes('没了'),cue.text);
 assert.ok(v.events.some(e=>e.type==='rejected'&&e.reason==='食材不足'));
});
test('menu mismatch, material shortage, late exits and closing are not conflated',()=>{
 const o=sample('adventurer');
 const menu=diningSpeechCue({...o,status:'rejected',rejectReason:'菜单不匹配',leftAt:20},20.4);
 const stock=diningSpeechCue({...o,status:'rejected',rejectReason:'食材不足',leftAt:20},20.4);
 const late=diningSpeechCue({...o,status:'left',leftReason:'等待超时',leftAt:20},20.4);
 const closing=diningSpeechCue({...o,status:'left',leftReason:'营业结束',leftAt:20},20.4);
 assert.equal(menu.kind,'upset');assert.equal(stock.kind,'upset');
 assert.notEqual(menu.text,stock.text);
 assert.notEqual(late.text,closing.text);
 assert.ok(diningSpeechCue({...o,status:'rejected',rejectReason:'食材不足',leftAt:20,missingIngredients:['chili']},20.4).text.includes('火椒'));
});
test('long wait yields two short warnings, then an angry exit without infinite loop',()=>{
 const o={...sample('family','queued'),orderedAt:2,arrival:3,patience:20};
 assert.equal(diningSpeechCue(o,9),null);
 assert.equal(diningSpeechCue(o,12.4)?.kind,'upset');
 assert.equal(diningSpeechCue(o,18.4)?.kind,'upset');
 assert.equal(diningSpeechCue(o,20.9),null);
 const angry=diningSpeechCue({...o,status:'left',leftReason:'等待超时',leftAt:23},24);
 assert.equal(angry.kind,'upset');
 assert.equal(diningSpeechCue({...o,status:'left',leftAt:23},26),null);
});
test('real reviews are never replaced with made-up positive messages',()=>{
 const o=sample('critic','review');o.reviewText='这道菜火候不太对。';o.reviewType='quality';
 assert.equal(diningSpeechCue(o,21.5)?.text,o.reviewText);
 assert.equal(diningSpeechCue(o,21.5)?.reviewType,'quality');
});
test('worker conversations are contextual, sparse, and never override urgent diners',()=>{
 const s={service:{walkable:true,paused:false,breakAt:0,done:false,
   crew:{helper:{hired:true,station:0},waiter:{hired:true}},orders:[],
   events:[{type:'started',station:'WOK',order:'o-0',t:5}]}};
 assert.equal(selectStaffSpeech(s,5.4)?.staffRole,'helper');
 assert.equal(selectStaffSpeech(s,5.4,[{priority:10}]),null);
 s.service.events.push({type:'waiter_pickup',order:'o-0',t:9});
 assert.equal(selectStaffSpeech(s,9.3)?.staffRole,'waiter');
 s.service.events=[];
 assert.equal(selectStaffSpeech(s,24.4)?.staffRole,'helper');
 assert.equal(selectStaffSpeech(s,26.4)?.staffRole,'waiter');
 assert.equal(selectStaffSpeech(s,27.6),null);
 s.service.paused=true;assert.equal(selectStaffSpeech(s,24.4),null);
});
test('helper acknowledges true shortage only AFTER disappointed guest exits',()=>{
 const s={service:{walkable:true,paused:false,breakAt:0,done:false,
  crew:{helper:{hired:true,station:0},waiter:{hired:false}},orders:[],
  events:[{type:'rejected',reason:'食材不足',order:'abc',t:10}]}};
 assert.equal(selectStaffSpeech(s,10.5),null);
 assert.equal(selectStaffSpeech(s,12.7)?.staffRole,'helper');
 assert.equal(selectStaffSpeech(s,14.1),null);
});
test('actual renderer shows departure speech on walking customers and compact worker dialogue',()=>{
 const code=source('../src/scenes_v04.js');
 assert.match(code,/selectStaffSpeech\(s,t,visibleSpeech\)/);
 assert.match(code,/drawStaffSpeech078\(c,workerCue,workerActor,w,h\)/);
 assert.match(code,/a\.order&&\(!a\.walk\|\|\['left','rejected'\]/);
 assert.match(code,/if\(\['left','rejected'\]\.includes\(a\.order\?\.status\)/);
 assert.match(code,/for\(const cue of visibleSpeech\)/);
 assert.match(code,/drawGuestSpeech077/);
 assert.match(code,/Plates remain on the ACTUAL table/);
});
test('long daily report scrolls from TOP and semantic title does not clip or draw a broken box',()=>{
 const code=source('../src/app.js'),css=source('../src/diner_polish_v078.css');
 assert.match(code,/<h2 class="report-header">/);
 assert.match(code,/<\/h2><div class="report-stats">/);
 assert.match(css,/\.stage\.report>\.report-scene/);
 assert.match(css,/justify-content:flex-start/);
 assert.match(css,/overflow-y:auto/);
 assert.match(css,/\.stage\.report \.report-header/);
 assert.match(css,/white-space:normal/);
 assert.match(css,/overflow-wrap:anywhere/);
 assert.match(css,/box-shadow:none/);
 assert.match(css,/@media\(max-height:650px\)/);
 const html=source('../index.html');
 assert.match(html,/diner_polish_v078\.css\?v=0\.9\.1/);
});
test('version, offline bundle and complete JavaScript stay parseable',()=>{
 const html=source('../index.html'),app=source('../src/app.js'),build=source('../scripts/build-standalone.py');
 assert.equal(JSON.parse(source('../package.json')).version,'0.13.0-alpha.6');
 assert.match(html,/Oddpot Kitchen v0\.13\.0-alpha\.5/);
 assert.match(html,/app\.js\?v=0\.13\.0-alpha\.5/);
 assert.match(app,/ODDPOT · v0\.13\.0-alpha\.5/);
 assert.match(app,/版本 v0\.13\.0-alpha\.5/);
 assert.match(build,/diner_polish_v078\.css/);
 assert.match(build,/v0\.13\.0-alpha\.5 离线版/);
 for(const path of ['../src/app.js','../src/diner_ambience_v077.js','../src/engine.js','../src/scenes_v04.js']){
  const p=spawnSync(process.execPath,['--check',new URL(path,import.meta.url).pathname],{encoding:'utf8'});
  assert.equal(p.status,0,path+' '+p.stderr);
 }
});
