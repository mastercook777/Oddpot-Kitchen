import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {newGame,buyThirdKitchenBundle,createService,reassignIdleCooks} from '../src/engine.js';
const dir='docs/screenshots/v013b-workforce';await mkdir(dir,{recursive:true});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5173','--strictPort'],{stdio:'ignore'});
const sleep=t=>new Promise(r=>setTimeout(r,t)),key='oddpot-prototype-v04';
let browser;
function make(phase='upgrade'){
 const s=newGame(1313);s.coins=1000;s.phase='upgrade';s.chapterProgress.stars=1;s.dining.tableCount=4;
 s.crew.helper.hired=true;s.crew.helper.onDuty=true;s.crew.waiter.hired=true;s.crew.waiter.onDuty=true;
 assert.equal(buyThirdKitchenBundle(s),true);s.phase=phase;return s;
}
try{
 let ready=false;for(let i=0;i<60;i++){try{if((await fetch('http://127.0.0.1:5173/index.html')).ok){ready=true;break}}catch{}await sleep(350)}assert.ok(ready);
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const [width,height] of [[320,568],[375,667],[390,844]]){
  const errors=[];const page=await browser.newPage({viewport:{width,height},hasTouch:true,isMobile:true,deviceScaleFactor:2});
  page.on('pageerror',e=>errors.push(e.message));
  const s=make();await page.addInitScript(([k,v])=>localStorage.setItem(k,JSON.stringify(v)),[key,s]);
  await page.goto('http://127.0.0.1:5173/index.html',{waitUntil:'networkidle'});
  assert.equal(await page.locator('[data-act="upgrade-kitchen:WOK"]').count(),1);
  assert.equal(await page.locator('[data-act="upgrade-kitchen:POT"]').count(),1);
  assert.equal(await page.locator('[data-act^="upgrade-kitchen:"]').count(),2);
  await page.locator('[data-act="upgrade-kitchen:WOK"]').click();
  const after=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
  assert.equal(after.kitchen.mastery.WOK,2);
  assert.equal(after.kitchen.slots[0].level,2);assert.equal(after.kitchen.slots[2].level,2);
  assert.equal(await page.locator('[data-act="upgrade-kitchen:WOK"]').isDisabled(),true);
  await page.screenshot({path:dir+'/global-upgrade-'+width+'.png',fullPage:true});
  const prep=structuredClone(after);prep.phase='prep';prep.service=null;
  await page.addInitScript(([k,v])=>localStorage.setItem(k,JSON.stringify(v)),[key,prep]);await page.reload({waitUntil:'networkidle'});
  await page.locator('[data-act="crew"]').first().click();
  assert.equal(await page.locator('[data-assign="helper:2"]').count(),1);
  assert.equal(await page.locator('[data-assign="helper:2"]').isDisabled(),true);
  assert.deepEqual(await page.locator('[data-assign^="helper:"]').allTextContents(),['左','中','右']);
  await page.locator('[data-assign="helper:1"]').click();
  const selected=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
  assert.equal(selected.crew.helper.station,1);
  assert.equal(selected.crew.helper2.station,2);
  assert.equal(await page.locator('[data-assign="helper2:1"]').isDisabled(),true);
  await page.screenshot({path:dir+'/simple-crew-position-'+width+'.png',fullPage:true});
  assert.deepEqual(errors,[], 'no browser exceptions on '+width);
  await page.close();
 }
 const p=await browser.newPage({viewport:{width:390,height:844}});
 const s=make('prep');s.menu=['chili_meat','chicken_stew','mushroom_stir'];
 for(const id of s.menu)s.recipes[id]=82;
 s.phase='service';assert.equal(createService(s,{walkable:true}),true);
 const v=s.service;v.time=8;v.queued=[v.orders[0].id];v.orders[0].status='queued';v.orders[0].recipeId='chicken_stew';reassignIdleCooks(v);
 assert.ok(v.crew.helper.moveUntil>v.time);
 await p.addInitScript(([k,obj])=>localStorage.setItem(k,JSON.stringify(obj)),[key,s]);
 await p.goto('http://127.0.0.1:5173/index.html',{waitUntil:'networkidle'});
 assert.ok(await p.locator('#diner-canvas').evaluate(c=>c.width>0&&c.height>0));
 await p.screenshot({path:dir+'/worker-moving.png'});
 await p.close();
 const offline=await browser.newPage({viewport:{width:390,height:844}});
 await offline.addInitScript(([k,obj])=>localStorage.setItem(k,JSON.stringify(obj)),[key,make()]);
 await offline.goto('http://127.0.0.1:5173/standalone.html',{waitUntil:'networkidle'});
 assert.match(await offline.title(),/0.13.0-alpha.3/);
 assert.equal(await offline.locator('[data-act^="upgrade-kitchen:"]').count(),2);
 await offline.close();
 console.log('v0.13-B: independent cookware mastery, simple crew positions, staff travel display, 320/375/390 Chrome and offline: PASS');
}finally{if(browser)await browser.close();server.kill('SIGTERM')}
