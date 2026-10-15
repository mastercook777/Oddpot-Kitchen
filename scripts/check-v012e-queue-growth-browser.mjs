import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {newGame,createService,setServicePaused,tick,closeService,resumeBreak} from '../src/engine.js';
import {DINER_FLOOR} from '../src/restaurant_scene_v075.js';

const output='docs/screenshots/v012e-queue-growth';
await mkdir(output,{recursive:true});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5173','--strictPort'],{stdio:'ignore'});
const nap=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const key='oddpot-prototype-v04';
const fixture=(seed=20261015,tables=4)=>{
 const s=newGame(seed);s.cycle=3;s.day=1;s.phase='prep';s.coins=800;s.reputation=24;
 s.management={dayKey:'3-1',openingCoins:800,campaignId:'none',wageDebt:0};
 s.dining.tableCount=tables;s.chapterProgress.stars=1;
 s.crew.helper.hired=true;s.crew.helper.onDuty=true;s.crew.helper.xp=8;
 s.crew.waiter.hired=true;s.crew.waiter.onDuty=true;s.crew.waiter.xp=8;
 s.menu=['chicken_stew','mushroom_stir','veg_stir'];
 for(const ingredient of Object.keys(s.inventory))s.inventory[ingredient]=80;
 return s;
};
const done=()=>{
 const s=fixture();s.phase='service';
 assert.equal(createService(s,{walkable:true}),true);
 Object.assign(s.service.hero,DINER_FLOOR.right);
 assert.equal(setServicePaused(s,false),true);
 for(let i=0;i<130&&!s.service.done;i++){
  if(s.service.breakAt)resumeBreak(s);
  tick(s,1);
 }
 assert.equal(s.service.done,true);
 assert.ok(closeService(s));
 assert.ok(s.report.queue);
 return s;
};
let browser;
try{
 let ready=false;for(let i=0;i<65;i++){try{if((await fetch('http://127.0.0.1:5173/index.html')).ok){ready=true;break;}}catch{}await nap(300)}
 assert.ok(ready,'Vite started');
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const [width,height] of [[320,568],[375,667],[390,844]]){
  const errs=[];
  const prep=await browser.newPage({viewport:{width,height},deviceScaleFactor:2,locale:'zh-CN',isMobile:true,hasTouch:true});
  prep.on('pageerror',e=>errs.push(e.message));
  await prep.addInitScript(([k,s])=>localStorage.setItem(k,JSON.stringify(s)),[key,fixture()]);
  await prep.goto('http://127.0.0.1:5173/index.html',{waitUntil:'networkidle'});
  assert.match(await prep.locator('.service-day-brief').innerText(),/星章口碑热潮/);
  assert.match(await prep.locator('.staff-open-prep').innerText(),/2人可晋升/);
  await prep.screenshot({path:output+'/preopen-'+width+'.png'});
  await prep.close();

  const r=done();
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:2,locale:'zh-CN',isMobile:true,hasTouch:true});
  page.on('pageerror',e=>errs.push(e.message));
  await page.addInitScript(([k,s])=>localStorage.setItem(k,JSON.stringify(s)),[key,r]);
  await page.goto('http://127.0.0.1:5173/index.html',{waitUntil:'networkidle'});
  assert.equal(await page.locator('.v12e-promotion-alert').count(),1);
  assert.match(await page.locator('.v12e-promotion-alert').innerText(),/阿火.*可晋升/);
  assert.match(await page.locator('.v12e-queue-report').innerText(),/等位后入店.*等位流失/);
  await page.screenshot({path:output+'/report-'+width+'.png',fullPage:true});
  await page.locator('.v12e-promotion-alert [data-act="crew"]').click();
  assert.equal(await page.locator('[data-act="promote:helper"]').isEnabled(),true);
  const before=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).coins,key);
  await page.locator('[data-act="promote:helper"]').click();
  const after=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
  assert.equal(after.crew.helper.level,2);
  assert.equal(after.coins,before-28);
  assert.equal(after.report.finance.wage,r.report.finance.wage,'no retroactive changes to settled payroll');
  assert.equal(after.ledger.filter(x=>x.type==='crew_promotion').length,1);
  assert.equal(await page.locator('canvas[data-crew-portrait="helper"]').getAttribute('data-level'),'2');
  await page.screenshot({path:output+'/report-promotion-'+width+'.png'});
  await page.locator('[data-act="close-sheet"]').last().click();
  assert.equal(await page.locator('.v12e-promotion-alert').count(),1,'other ready crew should still be surfaced');
  await page.close();
  assert.deepEqual(errs,[],'no exception at '+width+'x'+height);
 }
 // Reuse a deterministic real rush from the service engine, not a painted crowd.
 let rush=null;
 for(let seed=7000;seed<7060&&!rush;seed++){
  const s=fixture(seed,4);s.phase='service';
  createService(s,{walkable:true});setServicePaused(s,false);
  for(let i=0;i<58&&!s.service.done;i++){
   if(s.service.breakAt)resumeBreak(s);
   tick(s,1);
   const count=s.service.orders.filter(o=>o.status==='waiting'&&o.arrival<=s.service.time).length;
   if(count>=1){rush=s;break;}
  }
 }
 assert.ok(rush,'at least one real 4-table star rush should queue customers');
 const queue=await browser.newPage({viewport:{width:390,height:844},locale:'zh-CN'});
 const errors=[];queue.on('pageerror',e=>errors.push(e.message));
 await queue.addInitScript(([k,s])=>localStorage.setItem(k,JSON.stringify(s)),[key,rush]);
 await queue.goto('http://127.0.0.1:5173/index.html',{waitUntil:'networkidle'});
 assert.match(await queue.locator('#v075-served').innerText(),/等位/);
 assert.ok(await queue.locator('#diner-canvas').evaluate(c=>c.width>0&&c.height>0));
 await queue.screenshot({path:output+'/rush-real-waiting-390.png'});
 await queue.close();

 const offline=await browser.newPage({viewport:{width:390,height:844},locale:'zh-CN'});
 offline.on('pageerror',e=>errors.push(e.message));
 await offline.addInitScript(([k,s])=>localStorage.setItem(k,JSON.stringify(s)),[key,done()]);
 await offline.goto('http://127.0.0.1:5173/standalone.html',{waitUntil:'networkidle'});
 assert.match(await offline.title(),/alpha\.\d+/);
 assert.equal(await offline.locator('.v12e-promotion-alert').count(),1);
 await offline.locator('.v12e-promotion-alert [data-act="crew"]').click();
 assert.equal(await offline.locator('[data-act="promote:waiter"]').isEnabled(),true);
 await offline.screenshot({path:output+'/offline-report-390.png'});
 await offline.close();
 assert.deepEqual(errors,[]);
 console.log('v0.12-E 3-size real Chrome: star rush, report promotion, money, frozen payroll, actual queue status, offline passed. iPhone subjective experience remains player validation.');
}finally{if(browser)await browser.close();server.kill('SIGTERM')}
