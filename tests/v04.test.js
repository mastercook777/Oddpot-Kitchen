import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,nextPhase,enterField,settleField,createService,setServicePaused,tick,currentServiceEvent,chooseServiceEvent,swapBreakMenu,resumeBreak,breakPrep,closeService} from '../src/engine.js';
import {startActionField,stepActionField,useFieldSkill,resolveFieldEvent} from '../src/field_v04.js';
const explore=(route='safe')=>{const s=newGame();nextPhase(s,'field');assert.equal(enterField(s,route),true);assert.equal(startActionField(s),true);return s};
const service=()=>{const s=newGame();nextPhase(s,'service');createService(s);setServicePaused(s,false);tick(s,20);return s};

test('v04 field uses continuous motion not instant grid teleports',()=>{
 const s=explore(),f=s.field;const y=f.pos.y;stepActionField(s,0,-1,.05);
 assert.ok(f.pos.y<y&&f.pos.y>y-1);assert.equal(f.pos.x,4.5);
});
test('target is harvested after dwelling near it; retreat transfers once',()=>{
 const s=explore();const f=s.field;f.pos={x:4.5,y:7};f.x=f.pos.x;f.y=f.pos.y;
 // x 4.5 / y 6.5 goal is 0.5 away: 17 frames of 0.05 seconds.
 for(let i=0;i<22;i++)stepActionField(s,0,0,.05);
 assert.equal(f.nodes.find(n=>n.key==='target').claimed,true);
 assert.equal(f.bag.chili,2);
 const stock=s.inventory.chili;
 assert.equal(settleField(s),true);assert.equal(s.inventory.chili,stock+2);assert.equal(settleField(s),false);
});
test('safe line can collect target without engaging optional enemy',()=>{
 const s=explore('safe'),f=s.field;f.pos={x:4.5,y:7};for(let i=0;i<22;i++)stepActionField(s,0,0,.05);
 assert.equal(f.hp,3);assert.equal(f.enemies[0].hp,2);assert.equal(f.bag.chili,2);
});
test('risk path includes two enemies and skill cooldown damage',()=>{
 const s=explore('risk'),f=s.field;assert.equal(f.enemies.length,2);
 f.pos={x:6.8,y:6.6};assert.equal(useFieldSkill(s),true);assert.equal(useFieldSkill(s),false);
 assert.equal(f.skillCd,6.5);assert.ok(f.enemies[0].hp<=1);
});
test('forest event offers a real HP vs materials decision',()=>{
 const s=explore('risk'),f=s.field;f.pos={x:4.5,y:1.5};
 stepActionField(s,0,0,.05);assert.equal(f.activeEvent,'cache');
 const before=f.hp;assert.equal(resolveFieldEvent(s,'forage'),true);assert.equal(f.hp,before-1);
 assert.equal(f.nodes.find(n=>n.key==='cache').claimed,true);
 assert.equal(resolveFieldEvent(s,'forage'),false);
});
test('wave1 event appears at actual break and once-chosen change affects wave2',()=>{
 const s=service();assert.equal(s.service.breakAt,1);
 assert.ok(['rush','rain','market'].includes(currentServiceEvent(s).id));
 const target=s.service.orders.find(o=>o.wave===1);assert.equal(target.status,'waiting');
 const choice=currentServiceEvent(s).choices.find(c=>['sign','soup'].includes(c.id))?.id;
 assert.ok(choice);assert.equal(chooseServiceEvent(s,choice),true);assert.equal(target.segment,choice==='sign'?'adventurer':'family');assert.equal(target.recipeId,null);
 assert.equal(chooseServiceEvent(s,choice),false);
 resumeBreak(s);tick(s,4);assert.equal(target.recipeId!==null,true);
});
test('intermission swap changes arriving recipes, not seated orders',()=>{
 const s=service(), v=s.service;
 const seated=v.orders.find(o=>o.status==='served'||o.status==='cooking'||o.status==='queued');const original=seated.recipeId;
 const next=v.orders.find(o=>o.status==='waiting'&&o.wave===1);assert.equal(next.recipeId,null);
 const old=s.menu[0];s.recipes.chili_meat=77;
 assert.ok(swapBreakMenu(s,0,'chili_meat'));
 assert.notEqual(s.menu[0],old);assert.equal(seated.recipeId,original);
 assert.equal(chooseServiceEvent(s,'sign'),false);assert.equal(breakPrep(s,s.menu[0]),false);
 resumeBreak(s);tick(s,4);assert.notEqual(next.recipeId,null);
});
test('event expense debits once and is represented in the close-of-day P&L',()=>{
 const s=service();const before=s.coins;
 assert.equal(chooseServiceEvent(s,'kitchen'),true);assert.equal(s.coins,before-6);
 assert.equal(chooseServiceEvent(s,'kitchen'),false);
 assert.equal(s.service.eventExpense,6);assert.equal(s.service.eventEffects.WOK,3);
 resumeBreak(s);for(let i=0;i<140&&!s.service.done;i++){tick(s,1);if(s.service.breakAt)resumeBreak(s)}
 assert.equal(s.service.done,true);const report=closeService(s);assert.equal(report.eventExpense,6);
 assert.equal(report.profit,report.revenue-report.cost-report.hospitalityCost-6);
 assert.equal(closeService(s),false);
});
test('a break can be skipped without forcing a modal choice',()=>{const s=service();assert.equal(resumeBreak(s),true);tick(s,1);assert.equal(s.service.breakAt,0)});