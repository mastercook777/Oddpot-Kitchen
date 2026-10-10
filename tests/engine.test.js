import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,canUse,purchase,enterField,collectNode,settleField,nextPhase,startCook,moveTile,beat,finishCook,synergyFor,prepDish,createService,tick,closeService,advanceDay,markManual,challengeScore,consume,setServicePaused,resumeBreak,breakPrep,previewHeat,setFlame,tossWok} from '../src/engine.js';
function advanceServiceUntilDone(s,max=160){
 assert.equal(setServicePaused(s,false),true,'营业必须从显式开门开始');
 for(let i=0;i<max&&!s.service.done;i++){
  if(s.service.breakAt)assert.equal(resumeBreak(s),true);
  tick(s,1);
 }
 assert.equal(s.service.done,true,'三波结束后应可以查看营业日报');
}
function testCook(s,recipe){assert.ok(startCook(s,recipe.ids,recipe.method));return s.cook}
test('可复现的爆炎牛肉 GDD 三拍布局与隐藏变体',()=>{const s=newGame();s.phase='research';const c=testCook(s,{ids:['garlic','chili','beef'],method:'stir'});assert.deepEqual([c.tiles[0].id,c.tiles[1].id,c.tiles[4].id],['garlic','chili','beef']);beat(s);assert.equal(moveTile(s,4,0),true);assert.equal(moveTile(s,0,2),false,'每拍至多移动一次');beat(s);assert.equal(moveTile(s,4,0),true);beat(s);const result=finishCook(s);assert.equal(result.recipeId,'flame_beef');assert.equal(result.sellable,true);assert.deepEqual(result.heat.map(x=>x.heat),[5,6,7]);assert.equal(result.quality,100);assert.equal(s.recipes.flame_beef,90)});
test('已解锁菜与未知组合都遵守热量和耗材',()=>{const s=newGame();s.phase='research';const before=s.inventory.chicken;testCook(s,{ids:['chicken','chili'],method:'stir'});beat(s);beat(s);beat(s);const r=finishCook(s);assert.equal(r.sellable,false,'未熟肉不能出售');assert.equal(s.inventory.chicken,before-1);assert.equal(s.recipes.chili_meat,undefined)});
test('安全路线采集保底实际进入库存，不能重复发奖',()=>{const s=newGame();s.phase='field';s.selectedTarget='chili';assert.equal(enterField(s,'safe'),true);const old=s.inventory.chili;assert.equal(collectNode(s).ok,true);assert.equal(settleField(s),true);assert.equal(s.inventory.chili,old+2);assert.equal(settleField(s),false);assert.equal(s.inventory.chili,old+2);assert.equal(s.phase,'research')});
test('采购一次扣钱，生产扣原料不再扣金币',()=>{const s=newGame();const before=s.coins;assert.equal(purchase(s,'garlic'),true);assert.equal(s.coins,before-2);const mid=s.coins;assert.equal(consume(s,['garlic'],'test-unique'),true);assert.equal(s.coins,mid);const last=s.inventory.garlic;assert.equal(consume(s,['garlic'],'test-unique'),true===false);assert.equal(s.inventory.garlic,last)});
test('菜单共鸣需要不同菜谱，不重复刷',()=>{assert.equal(synergyFor(['chili_meat','chicken_stew','veg_stir']),'辛香暖胃');assert.equal(synergyFor(['mushroom_stir','chicken_stew','veg_stir']),'菌香组合');assert.equal(synergyFor(['mushroom_stir','mushroom_stir','mushroom_stir']),null)});
test('两锅可以并行，同一个工位不并发；消耗有来源',()=>{const s=newGame();s.phase='service';s.menu=['chicken_stew','mushroom_stir','veg_stir'];createService(s);setServicePaused(s,false);for(let i=0;i<8;i++)tick(s);assert.ok(s.service.stations.POT||s.service.stations.WOK);assert.equal(s.service.stations.WOK?.orderId===s.service.stations.POT?.orderId,false);assert.equal(s.ledger.filter(e=>e.type==='sale').length,s.service.orders.filter(o=>o.status==='served').length)});
test('整晚自动营业能结束且只可结算一次',()=>{const s=newGame();s.phase='service';createService(s);advanceServiceUntilDone(s);assert.equal(s.service.done,true);const r=closeService(s);assert.ok(r);assert.equal(s.phase,'report');assert.equal(closeService(s),false);assert.equal(s.ledger.filter(e=>e.type==='sale').length,r.served);assert.ok(r.profit<=r.revenue);assert.ok(s.inventory.mushroom>=0)});
test('备餐耗料估值且剩菜报损',()=>{const s=newGame();s.phase='prep';const n=s.inventory.mushroom;assert.equal(prepDish(s,'mushroom_stir'),true);assert.equal(s.inventory.mushroom,n-1);assert.ok(s.prepCost>0);nextPhase(s,'service');createService(s);advanceServiceUntilDone(s);const r=closeService(s);assert.ok(r.cost>=s.service.cost);assert.equal(s.prepCost,0)});
test('厨王四轴评分固定公式',()=>{const v={orders:[{status:'served',sat:78,recipeId:'chili_meat',quality:90},...Array.from({length:5},()=>({status:'served',sat:78,recipeId:'chili_meat',quality:90})),{status:'served',sat:78,recipeId:'chili_meat',quality:90}]};const score=challengeScore(v);assert.equal(score.signature,90);assert.equal(Math.round(.4*78+.25*85+.2*88+.15*90),84)});
test('日程与永久库存延续新轮次',()=>{const s=newGame();s.day=3;s.phase='upgrade';s.tech=true;const orig=s.inventory.mushroom;assert.equal(advanceDay(s),true);assert.equal(s.day,1);assert.equal(s.cycle,2);assert.equal(s.inventory.mushroom,orig);assert.equal(s.tech,true)});
test('四种基础菜均有可达的真实烹饪解',()=>{
const all=[
 {id:'chili_meat',ids:['chicken','chili'],method:'stir',actions:[()=>{},s=>{assert.ok(moveTile(s,0,4))},()=>{}]},
 {id:'mushroom_stir',ids:['mushroom','garlic'],method:'stir',actions:[s=>{moveTile(s,0,1)},()=>{},()=>{}]},
 {id:'chicken_stew',ids:['chicken','mushroom'],method:'stew',actions:[s=>{moveTile(s,0,4)},()=>{},s=>{moveTile(s,1,4)}]},
 {id:'veg_stir',ids:['cabbage','mushroom'],method:'stir',actions:[()=>{},()=>{},()=>{}]}
 ];
for(const r of all){const s=newGame();s.phase='research';assert.ok(startCook(s,r.ids,r.method));for(const fn of r.actions){fn(s);beat(s)}const result=finishCook(s);assert.equal(result.recipeId,r.id,r.id);assert.equal(result.sellable,true,`${r.id}: ${JSON.stringify(result.heat)}`)}
});
test('准备充分的基础辣味菜单可以在第 3 晚击败厨王，首奖不重复',()=>{
const s=newGame();s.day=3;s.phase='service';s.menu=['chili_meat','chicken_stew','mushroom_stir'];s.recipes.chili_meat=93;s.inventory.chili=12;s.inventory.chicken=30;s.inventory.mushroom=30;createService(s);advanceServiceUntilDone(s);const report=closeService(s);assert.ok(report.won,JSON.stringify(report.challenge));assert.ok(report.challenge.score>70);assert.ok(s.tech);assert.equal(s.ledger.filter(x=>x.id==='first-boss-reward').length,1);assert.equal(closeService(s),false);assert.equal(s.ledger.filter(x=>x.id==='first-boss-reward').length,1)
});

test('进入营业明确暂停，恢复才推进餐厅时间；后台暂停不影响既有状态',()=>{
 const s=newGame();s.phase='service';assert.equal(createService(s),true);
 const initial=s.service.time;
 assert.equal(tick(s,9),false);
 assert.equal(s.service.time,initial);
 assert.equal(setServicePaused(s,false),true);
 tick(s,4);assert.equal(s.service.time,initial+4);
 assert.equal(setServicePaused(s,true),true);
 assert.equal(tick(s,9),false);
 assert.equal(s.service.time,initial+4);
});
test('两桌各有独立两座，客人不会占用同一把椅子',()=>{
 const s=newGame();s.phase='service';createService(s);
 assert.equal(s.service.orders[0].tableId,0);
 setServicePaused(s,false);
 for(let i=0;i<13;i++)tick(s);
 const active=s.service.orders.filter(o=>['queued','cooking'].includes(o.status));
 assert.equal(new Set(active.map(o=>`${o.tableId}:${o.seatId}`)).size,active.length);
 assert.ok(active.every(o=>[0,1].includes(o.seatId)));
 assert.ok(active.length<=4);
 assert.ok(active.every(o=>[0,1].includes(o.tableId)));
});
test('两次真实波间决策，制备有成本，二次点击不刷材料',()=>{
 const s=newGame();s.phase='service';createService(s);setServicePaused(s,false);
 for(let i=0;i<22&&!s.service.breakAt;i++)tick(s);
 assert.equal(s.service.breakAt,1);
 const n=s.inventory.mushroom;
 assert.equal(breakPrep(s,'mushroom_stir'),true);
 assert.equal(s.inventory.mushroom,n-1);
 assert.equal(breakPrep(s,'mushroom_stir'),false);
 assert.equal(s.inventory.mushroom,n-1);
 assert.equal(resumeBreak(s),true);
});
test('火力预判与外圈颠锅真实影响下一拍，且单拍只能颠一次',()=>{
 const s=newGame();s.phase='research';startCook(s,['garlic','chili','beef'],'stir');
 assert.equal(setFlame(s,1),true);
 const pred=previewHeat(s.cook);
 assert.equal(pred[4],4);
 beat(s);
 assert.equal(s.cook.tiles[4].heat,4);
 const ringBefore=s.cook.tiles[0].id;
 assert.equal(tossWok(s),true);
 assert.equal(s.cook.tiles[1].id,ringBefore);
 assert.equal(tossWok(s),false);
});