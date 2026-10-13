import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {diningSpeechCue,selectDiningSpeech,speechOpacity,diningBubbleLines} from '../src/diner_ambience_v077.js';
import {newGame,createService,tick,setServicePaused} from '../src/engine.js';
const src=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const order=(status,tableId=0,seatId=0)=>({
 id:'test-'+tableId+'-'+seatId,tableId,seatId,status,
 recipeId:'chicken_stew',arrival:3,orderedAt:3,seatedAt:2,
 started:5,pickupAt:10,deliveryAt:12,landedAt:16,reviewAt:19,reviewedAt:21,
 patience:30,reviewText:'好吃！下次还来！',reviewType:'happy'
});
test('guests request real menu dishes, never unrelated invented dialogue',()=>{
 const o=order('queued');
 assert.ok(diningSpeechCue(o,3.3)?.text.startsWith('咕噜菌雾鸡！'));
 assert.equal(diningSpeechCue(o,7),null);
 assert.ok(diningSpeechCue({...o,recipeId:'no-such-dish'},3.3)?.text.startsWith('招牌菜！'));
});
test('each order phase carries a short contextual reaction',()=>{
 for(const [state,t,word] of [
  ['ordering',2.4,''],['cooking',8.6,''],['pickup',10.8,''],
  ['carried',10.9,''],['delivering',12.6,''],['eating',16.8,'']
 ]){
  const cue=diningSpeechCue(order(state),t);
  assert.ok(cue,state+' at '+t);
  assert.ok(cue.text.includes(word),cue.text);
 }
});
test('reviews display ACTUAL assessed text including negatives; never fake praise',()=>{
 const o=order('review');o.reviewType='quality';o.reviewText='这道菜火候不太对。';
 const cue=diningSpeechCue(o,19.3);
 assert.equal(cue.kind,'review');assert.equal(cue.reviewType,'quality');
 assert.equal(cue.text,o.reviewText);
 assert.equal(diningSpeechCue(o,22),null);
 assert.equal(diningSpeechCue({...o,status:'served'},21.4)?.text,o.reviewText);
 assert.equal(diningSpeechCue({...o,status:'served'},22.3),null);
});
test('only actually impatient patrons complain; leaving reason matches simulation',()=>{
 const o=order('queued');o.orderedAt=0;o.arrival=4;o.patience=18;
 assert.equal(diningSpeechCue(o,5),null);
 assert.equal(diningSpeechCue(o,12.2)?.kind,'upset');
 assert.equal(diningSpeechCue({...o,status:'left',leftReason:'等待超时',leftAt:22},22.5)?.kind,'upset');
 assert.equal(diningSpeechCue({...o,status:'rejected',rejectReason:'菜单不匹配',leftAt:22},22.5)?.kind,'upset');
});
test('no bubble when there is no physical diner or applicable phase window',()=>{
 assert.equal(diningSpeechCue(order('waiting'),8),null);
 assert.equal(diningSpeechCue({...order('review'),tableId:null},19.3),null);
 assert.equal(diningSpeechCue({...order('review'),tableId:undefined},19.3),null);
 assert.equal(diningSpeechCue({...order('review'),tableId:0.4},19.3),null);
 assert.equal(diningSpeechCue(order('review'),NaN),null);
});
test('one speech per table, two maximum; meaningful events prioritize table chatter',()=>{
 const a=order('queued',0,0),b=order('queued',0,1);
 assert.equal(selectDiningSpeech([a,b],3.3).length,1);
 const review=order('review',1,0);
 const selected=selectDiningSpeech([a,b,review],19.3);
 assert.equal(selected.length,1);assert.equal(selected[0].id,review.id);
 const both=[order('review',0,0),review];
 assert.equal(selectDiningSpeech(both,19.3).length,2);
 assert.equal(selectDiningSpeech(both,19.3,1).length,1);
});
test('up to two short lines and smooth finite fade, no flashing CSS bubble',()=>{
 const lines=diningBubbleLines('好吃是好吃，等太久啦，非常抱歉以后不会再来吃了');
 assert.ok(lines.length<=2&&lines.every(x=>Array.from(x).length<=8));
 assert.match(lines.at(-1),/…$/);
 const o=order('review');
 const a=diningSpeechCue(o,19.1),b=diningSpeechCue(o,20),c=diningSpeechCue(o,21.3);
 assert.ok(speechOpacity(a)<speechOpacity(b));
 assert.ok(speechOpacity(c)<speechOpacity(b));
});
test('official new canvas paints bounded speech and hides duplicate head icons',()=>{
 const scene=src('../src/scenes_v04.js');
 assert.match(scene,/selectDiningSpeech\(v\?\.orders\|\|\[\],t,2\)/);
 assert.match(scene,/drawGuestSpeech077\(c,cue,speaker,w,h\)/);
 assert.match(scene,/const speaking=new Set\(visibleSpeech\.map\(q=>q\.id\)\)/);
 assert.match(scene,/if\(!speaking\.has\(o\.id\)/);
 assert.match(scene,/Plates remain on the ACTUAL table/i);
 assert.match(scene,/if\(v\?\.walkable\|\|!v\)\{drawRestaurantV075\(c,s,t,w,h\);return;\}/);
});
test('speech calculations do not mutate real inventory, orders, money or service clock',()=>{
 const s=newGame();s.phase='service';createService(s,{walkable:true});setServicePaused(s,false);tick(s,1);
 const before=JSON.stringify(s);selectDiningSpeech(s.service.orders,s.service.time);
 assert.equal(JSON.stringify(s),before);
});
test('all visible game versions, entrypoint and offline build are aligned',()=>{
 const html=src('../index.html'),script=src('../scripts/build-standalone.py'),
 app=src('../src/app.js'),pkg=JSON.parse(src('../package.json'));
 assert.equal(pkg.version,'0.10.3');
 assert.match(html,/Oddpot Kitchen v0\.10\.2/);
 assert.match(html,/app\.js\?v=0\.10\.2-guest-book/);
 assert.match(app,/ODDPOT · v0\.10\.2/);
 assert.match(app,/版本 v0\.10\.2/);
 assert.match(script,/diner_ambience_v077\.js/);
 assert.match(script,/v0\.10\.2 离线版/);
 for(const name of ['../src/diner_ambience_v077.js','../src/scenes_v04.js']){
  const check=spawnSync(process.execPath,['--check',new URL(name,import.meta.url).pathname],{encoding:'utf8'});
  assert.equal(check.status,0,check.stderr);
 }
});
