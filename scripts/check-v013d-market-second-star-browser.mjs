import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {newGame} from '../src/engine.js';
const dir='docs/screenshots/v013d-second-star';await mkdir(dir,{recursive:true});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5173','--strictPort'],{stdio:'ignore'});
const sleep=n=>new Promise(resolve=>setTimeout(resolve,n)),storageKey='oddpot-prototype-v04';
let browser;
function state(stars){
 const s=newGame(20261009);s.coins=600;s.cycle=4;s.day=1;s.phase='prep';s.chapterProgress.stars=stars;
 s.dining.tableCount=4;s.crew.helper.hired=true;s.crew.helper.onDuty=true;
 s.crew.waiter.hired=true;s.crew.waiter.onDuty=true;
 return s;
}
try {
 let ready=false;for(let i=0;i<60;i++){try{if((await fetch('http://127.0.0.1:5173/index.html')).ok){ready=true;break}}catch{}await sleep(250)}
 assert.ok(ready,'Vite must start');
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const [width,height] of [[320,568],[375,667],[390,844]]){
  const errors=[],page=await browser.newPage({viewport:{width,height},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  page.on('pageerror',e=>errors.push(e.message));
  const a=state(1);await page.addInitScript(([key,v])=>localStorage.setItem(key,JSON.stringify(v)),[storageKey,a]);
  await page.goto('http://127.0.0.1:5173/index.html',{waitUntil:'networkidle'});
  const enrol=page.locator('[data-act="second-star-request"]');
  assert.equal(await enrol.count(),1);
  assert.match(await page.locator('.v12-star-invite').first().innerText(),/第1\/2夜/);
  await enrol.click();
  const booked=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),storageKey);
  assert.equal(booked.chapterProgress.secondAppraisal?.requestDay,'4-1');
  await page.screenshot({path:dir+'/second-star-signup-'+width+'.png',fullPage:true});
  const two=state(2);
  await page.addInitScript(([key,v])=>localStorage.setItem(key,JSON.stringify(v)),[storageKey,two]);
  await page.reload({waitUntil:'networkidle'});
  assert.match(await page.locator('.v12-star-invite').first().innerText(),/芽角鹿客/);
  const garden=page.locator('[data-act="promo:garden"]');
  assert.equal(await garden.count(),1);
  await garden.click();
  const targeted=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),storageKey);
  assert.equal(targeted.management.campaignId,'garden');
  await page.screenshot({path:dir+'/vegetable-invitation-'+width+'.png',fullPage:true});
  assert.deepEqual(errors,[],'mobile '+width+' JavaScript errors');
  await page.close();
 }
 const offline=await browser.newPage({viewport:{width:390,height:844}});
 await offline.addInitScript(([key,v])=>localStorage.setItem(key,JSON.stringify(v)),[storageKey,state(1)]);
 await offline.goto('http://127.0.0.1:5173/standalone.html',{waitUntil:'networkidle'});
 assert.match(await offline.title(),/0.13.0-alpha.5/);
 assert.equal(await offline.locator('[data-act="second-star-request"]').count(),1);
 await offline.close();
 console.log('v0.13-D: second-star requests, veggie marketing and standalone pass in 320/375/390 Chrome');
} finally {if(browser)await browser.close();server.kill('SIGTERM')}
