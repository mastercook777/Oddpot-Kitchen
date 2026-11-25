import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const a=app.indexOf('function hud(){'),b=app.indexOf('function toast()',a);
const render=game=>new Function('game','z2a2Icon','z2bPhase','totalBusinessDay','tableCapacity','phaseLabels',app.slice(a,b)+';return hud();')(game,n=>'<svg data-game-icon="'+n+'"></svg>',()=>false,()=>2,()=>4,{});
test('Z2c1 wallet is the current total, not shift revenue, and preserves live controls',()=>{
 const game={phase:'service',coins:321,service:{walkable:true,wave:0,time:10,orders:[{status:'served'}],hero:{energy:4,maxEnergy:6},revenue:51}};
 const h=render(game);assert.match(h,/id="v075-wallet" aria-label="当前金币 321"[^]*?<b>321<\/b>/);assert.match(h,/data-act="service-ledger"/);assert.match(h,/data-act="toggle-service"/);assert.match(h,/id="v075-served"/);
 game.coins=357;assert.match(render(game),/id="v075-wallet" aria-label="当前金币 357"[^]*?<b>357<\/b>/);
});
test('Z2c1 morning and non-live route use a single compact HUD with real resources',()=>{
 const g={phase:'forecast',coins:92,reputation:7,bagSlots:8};
 const home=render(g);assert.match(home,/z2c-hud/);assert.match(home,/第 2 天 · 4 座/);assert.match(home,/当前金币 92/);assert.match(home,/声望 7/);assert.doesNotMatch(home,/day-strip/);
 g.phase='field';const route=render(g);assert.match(route,/门前整装/);assert.match(route,/背包容量/);assert.doesNotMatch(route,/day-strip/);
});
