import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newGame,guestBookEntries,ensureGuestDex,createService,REGULAR_GUESTS,tick} from '../src/engine.js';

test('new game has no fictional sightings or named-guest relationships',()=>{
 const s=newGame(87),entries=guestBookEntries(s);
 assert.equal(entries.length,6);
 assert.equal(entries.filter(x=>x.seen).length,0);
 assert.equal(entries.find(x=>x.segment==='critic').premiumEligible,true);
 assert.equal(Object.keys(s.guestRelationships).length,0);
});
test('guest list reads real data and shows precise favorite tags from existing customers',()=>{
 const s=newGame(1023),entries=guestBookEntries(s);
 assert.deepEqual(entries.find(x=>x.segment==='regular').likes,['清爽','菌香','鲜']);
 assert.deepEqual(entries.find(x=>x.segment==='adventurer').likes,['辣','肉','饱腹']);
});
test('planned but not admitted diners are not automatically counted as met',()=>{
 const s=newGame(4);s.phase='service';
 assert.equal(createService(s),true);
 const admitted=s.service.orders.filter(o=>o.status==='entering');
 const waiting=s.service.orders.filter(o=>o.status==='waiting');
 assert.ok(admitted.length>=1&&waiting.length>=1);
 const seen=new Set(guestBookEntries(s).filter(o=>o.seen).map(o=>o.segment));
 for(const a of admitted)assert.ok(seen.has(a.segment));
 for(const w of waiting)if(!admitted.some(a=>a.segment===w.segment))
  assert.equal(seen.has(w.segment),false,'a future customer should not unlock an entry');
});
test('a real entrance unlocks the group and met regular identity but never creates free favor',()=>{
 const s=newGame(11);s.phase='service';
 createService(s);
 const arrived=s.service.orders.find(o=>o.status==='entering'&&o.guestId);
 assert.ok(arrived);
 const entry=guestBookEntries(s).find(g=>g.segment===arrived.segment);
 assert.equal(entry.seen,true);assert.equal(entry.met,true);
 assert.equal(entry.visits,0);assert.equal(entry.happyMeals,0);
 assert.equal(entry.premiumEligible,false);
 assert.deepEqual(s.guestRelationships,{});
 assert.equal(ensureGuestDex(s).metGuests[arrived.guestId],true);
});
test('legacy relationship data proves a guest was met without inventing prior encounters',()=>{
 const s=newGame();
 delete s.guestDex;
 s.guestRelationships[REGULAR_GUESTS.family.id]={
   guestId:REGULAR_GUESTS.family.id,segment:'family',name:REGULAR_GUESTS.family.name,
   visits:3,happyMeals:1,lastDay:7
 };
 const g=guestBookEntries(s).find(x=>x.segment==='family');
 assert.equal(g.seen,true);assert.equal(g.met,true);
 assert.equal(g.visits,3);assert.equal(g.happyMeals,1);
 assert.equal(g.premiumEligible,false);
 assert.equal(guestBookEntries(s).filter(x=>x.seen).length,1);
 assert.equal(s.guestRelationships[REGULAR_GUESTS.family.id].visits,3);
});
test('two real satisfied meals unlock hidden menu status; opening encyclopedia never increments visits',()=>{
 const s=newGame();const id=REGULAR_GUESTS.adventurer.id;
 s.guestRelationships[id]={guestId:id,segment:'adventurer',name:'伯罗',visits:2,happyMeals:2,lastDay:20};
 const original=JSON.stringify(s.guestRelationships);
 const entry=guestBookEntries(s).find(x=>x.segment==='adventurer');
 assert.equal(entry.premiumEligible,true);
 for(let i=0;i<3;i++)guestBookEntries(s);
 assert.equal(JSON.stringify(s.guestRelationships),original);
});
test('existing recipe tab, variant selection and guest tab are a single sheet with no new home button',()=>{
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/kitchen_050.css',import.meta.url),'utf8');
 assert.match(app,/data-book-tab="recipes"/);
 assert.match(app,/data-book-tab="guests"/);
 assert.match(app,/guestBookEntries\(game\)/);
 assert.match(app,/data-choose-variant/);
 assert.match(app,/bookTab=tab.dataset.bookTab/);
 assert.match(css,/\.v102-book-tabs/);
 assert.match(css,/@media\(max-width:350px\)/);
 assert.match(app,/data-act="book"/);
});
