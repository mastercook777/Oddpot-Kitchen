import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {evaluateLiveCook,liveIngredientState,liveIngredientHeatFeedback,
 liveHeatSummary,reviewLiveCook} from '../src/cooking_v063.js';
import {newGame,liveCookPreview} from '../src/engine.js';

const drop=(id,t,index)=>({id,t,index});
const action=(type,t,withIds)=>({type,t,with:[...withIds]});

test('the current WOK maximum is 87 and GREEN recap explains actual ingredient/aroma/action verdicts',()=>{
 const ids=['garlic','mushroom'],ds=[drop('garlic',0,0),drop('mushroom',2,1)];
 const acts=[action('toss',3,ids),action('flip',4,ids)];
 const result=evaluateLiveCook(ids,'WOK',ds,acts,7);
 const before=JSON.stringify(result),r=reviewLiveCook(result);
 assert.equal(result.recipeId,'mushroom_stir');
 assert.equal(result.quality,87);
 assert.equal(r.maxQuality,87);
 assert.equal(r.atReachableMax,true);
 assert.ok(r.steps.some(x=>x.type==='drop'&&x.label.includes('跳跳蒜瓣')&&x.grade==='good'&&x.detail.includes('1.05')));
 assert.ok(r.steps.some(x=>x.type==='action'&&x.label==='颠勺'&&x.grade==='good'&&x.detail.includes('+6')));
 assert.ok(r.steps.some(x=>x.label==='翻炒'&&x.grade==='good'&&x.detail.includes('+5')));
 assert.ok(r.steps.every((x,i)=>i===0||x.time>=r.steps[i-1].time));
 assert.equal(JSON.stringify(result),before,'review must never alter economic/quality adjudication');
});
test('the current POT maximum is 86; there is no unreachable 90+ skill requirement',()=>{
 const ids=['mushroom','chicken'],ds=[drop('mushroom',0,0),drop('chicken',2,1)];
 const acts=[action('gentle',4,ids),action('reduce',5,ids)];
 const result=evaluateLiveCook(ids,'POT',ds,acts,12);
 const review=reviewLiveCook(result);
 assert.equal(result.quality,86);
 assert.equal(review.maxQuality,86);assert.equal(review.atReachableMax,true);
 assert.ok(review.steps.find(x=>x.label==='收汁'&&x.grade==='good'&&x.detail.includes('+5')));
});
test('missed optional timing is YELLOW, not a fake penalty or a red mistake',()=>{
 const ids=['garlic','mushroom'],ds=[drop('garlic',0,0),drop('mushroom',2,1)];
 const result=evaluateLiveCook(ids,'WOK',ds,
  [action('toss',7,ids),action('flip',8,ids)],9);
 const review=reviewLiveCook(result);
 assert.equal(review.steps.find(x=>x.label==='颠勺').grade,'warning');
 assert.equal(result.facts.burst,false);
 assert.equal(result.quality,81);
 assert.equal(review.steps.at(-1).grade,'good','all food still cooked; timing only missed a bonus');
});
test('real burnt, raw and partially heated ingredients have the same verdict as the original judge',()=>{
 const ids=['garlic','mushroom'];
 const burnt=evaluateLiveCook(ids,'WOK',[drop('garlic',0,0),drop('mushroom',2,1)],[],15);
 assert.equal(burnt.sellable,false);
 assert.equal(liveIngredientState(drop('garlic',0,0),15,[],'WOK'),'焦糊');
 assert.equal(reviewLiveCook(burnt).steps.find(x=>x.label.includes('跳跳蒜瓣')).grade,'bad');
 const raw=evaluateLiveCook(ids,'WOK',[drop('garlic',0,0),drop('mushroom',6,1)],[],6.4);
 assert.equal(raw.sellable,false);
 assert.ok(reviewLiveCook(raw).steps.some(x=>x.grade==='bad'));
 const slight=evaluateLiveCook(ids,'WOK',[drop('garlic',0,0),drop('mushroom',4,1)],[],6);
 assert.equal(slight.sellable,true);assert.equal(slight.status,'略欠火');
 assert.ok(reviewLiveCook(slight).steps.some(x=>x.grade==='warning'&&x.detail.includes('16')));
});
test('heat bar is the true recipe cook amount, and near-burn warns before real burn without changing it',()=>{
 const d=drop('garlic',0,0),a=[];
 const early=liveIngredientHeatFeedback(d,.4,a,'WOK');
 assert.equal(early.baseState,'偏生');assert.equal(early.tone,'warming');
 assert.ok(early.progress<100);
 const ready=liveIngredientHeatFeedback(d,2,a,'WOK');
 assert.equal(ready.state,'熟透');assert.equal(ready.progress,100);assert.equal(ready.tone,'good');
 const near=liveIngredientHeatFeedback(d,13,a,'WOK');
 assert.equal(near.baseState,'熟透');assert.equal(near.nearBurn,true);
 assert.equal(near.state,'将焦');assert.equal(near.tone,'warning');
 const burnt=liveIngredientHeatFeedback(d,15,a,'WOK');
 assert.equal(burnt.baseState,'焦糊');assert.equal(burnt.tone,'bad');
 assert.equal(liveIngredientState(d,13,a,'WOK'),'熟透','warning does not alter real cooking judgement');
});
test('overview responds to actual heat states, raw material and partial cooking',()=>{
 const waiting=liveIngredientHeatFeedback(null,0,[],'WOK');
 assert.equal(waiting.tone,'idle');
 assert.equal(liveHeatSummary([{...waiting,dropped:false}]).tone,'idle');
 const a=liveIngredientHeatFeedback(drop('chicken',0,0),1,[],'WOK');
 assert.equal(liveHeatSummary([{...a,dropped:true}]).tone,'warming');
 const b=liveIngredientHeatFeedback(drop('chicken',0,0),8,[],'WOK');
 assert.equal(liveHeatSummary([{...b,dropped:true}]).tone,'good');
 const burnt=liveIngredientHeatFeedback(drop('garlic',0,0),15,[],'WOK');
 assert.equal(liveHeatSummary([{...burnt,dropped:true}]).tone,'bad');
});
test('live preview adds readonly heat state and never mutates cook, wallet, recipes or ledger',()=>{
 const s=newGame(),before=JSON.stringify(s);
 const p=liveCookPreview(s);
 assert.equal(p,null);assert.equal(JSON.stringify(s),before);
});
test('mobile UI grades each chronological step and updates heat without changing cooking buttons',()=>{
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/cooking_v063.css',import.meta.url),'utf8');
 assert.match(app,/reviewLiveCook\(result\)/);
 assert.match(app,/review\.steps\.map/);
 assert.match(app,/v103-recap-step/);
 assert.match(app,/v103-heat-status/);
 assert.match(app,/data-heat-fill/);
 assert.match(app,/liveHeatSummary\(indicators\)/);
 assert.match(app,/data-act="live-finish"/);
 assert.match(css,/\.v103-recap-step\.warning/);
 assert.match(css,/\.v103-recap-step\.bad/);
 assert.match(css,/\.v103-heat-meter/);
 assert.match(css,/@media\(max-width:340px\)/);
});
