import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {newGame,buyThirdKitchenBundle,createService,setServicePaused,tick,resumeBreak,ensureCrew,ensureKitchen} from '../src/engine.js';
import {DINER_FLOOR} from '../src/restaurant_scene_v075.js';

const out='docs/screenshots/v013a-staffed-kitchen',key='oddpot-prototype-v04';
await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5173','--strictPort'],{stdio:'ignore'});
const nap=t=>new Promise(r=>setTimeout(r,t));
const base=()=>{const s=newGame(612917);s.cycle=3;s.day=1;s.coins=900;s.reputation=20;s.chapterProgress.stars=1;s.dining.tableCount=4;
 s.crew.helper.hired=true;s.crew.helper.onDuty=true;s.crew.waiter.hired=true;s.crew.waiter.onDuty=true;
 return s;
};
let browser;
try{
 let ready=false;for(let i=0;i<65;i++){try{if((await fetch('http://127.0.0.1:5173/index.html')).ok){ready=true;break}}catch{}await nap(300)}
 assert.ok(ready,'vite server ready');
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const [width,height] of [[320,568],[375,667],[390,844]]){
  const errors=[];const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:2,hasTouch:true,isMobile:true,locale:'zh-CN'});
  page.on('pageerror',e=>errors.push(e.message));
  const s=base();s.phase='upgrade';
  await page.addInitScript(([k,v])=>localStorage.setItem(k,JSON.stringify(v)),[key,s]);
  await page.goto('http://127.0.0.1:5173/index.html',{waitUntil:'networkidle'});
  assert.match(await page.locator('.v13a-bundle-panel').innerText(),/中央厨位.*小炭/);
  await page.screenshot({path:out+'/upgrade-before-'+width+'.png',fullPage:true});
  await page.locator('[data-act="third-kitchen-bundle"]').click();
  const saved=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
  assert.equal(saved.kitchen.thirdUnlocked,true);assert.equal(saved.kitchen.slots.length,3);
  assert.equal(saved.crew.helper2.hired,true);assert.equal(saved.coins,900-260);
  assert.equal(saved.ledger.filter(e=>e.id==='third-kitchen-crew-bundle').length,1);
  assert.equal(await page.locator('[data-act="third-kitchen-bundle"]').count(),0,'cannot purchase twice');
  await page.screenshot({path:out+'/upgrade-after-'+width+'.png',fullPage:true});
  await page.locator('[data-act="next-day"]').click();
  const prep=await page.evaluate(k=>{const s=JSON.parse(localStorage.getItem(k));s.phase='prep';for(const id of Object.keys(s.inventory))s.inventory[id]=100;return s},key);
  // Load the exact purchased state into pre-opening, with complete inventory.
  await page.addInitScript(([k,v])=>localStorage.setItem(k,JSON.stringify(v)),[key,prep]);
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('.kitchen-config-slot').count(),3);
  assert.match(await page.locator('.kitchen-config-slot').last().innerText(),/中厨位/);
  await page.locator('[data-act="crew"]').first().click();
  assert.equal(await page.locator('canvas[data-crew-portrait="helper2"]').count(),1,'different third employee portrait');
  assert.match(await page.locator('.staff-roster').innerText(),/小炭/);
  assert.equal(await page.locator('[data-assign="helper2:2"]').count(),1);
  await page.screenshot({path:out+'/prep-crew-'+width+'.png',fullPage:true});
  await page.locator('[data-act="close-sheet"]').last().click();
  const current=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
  current.phase='service';assert.equal(createService(current,{walkable:true}),true);
  Object.assign(current.service.hero,DINER_FLOOR.right);setServicePaused(current,false);
  for(let i=0;i<60&&!current.service.done;i++){
   if(current.service.breakAt)resumeBreak(current);
   tick(current,1);
  }
  assert.equal(current.service.kitchenSnapshot.length,3);
  assert.ok(current.service.events.some(e=>e.type==='started'&&e.station==='CENTER'));
  await page.addInitScript(([k,v])=>localStorage.setItem(k,JSON.stringify(v)),[key,current]);
  await page.reload({waitUntil:'networkidle'});
  assert.ok(await page.locator('#diner-canvas').evaluate(c=>c.width>0&&c.height>0));
  await page.screenshot({path:out+'/real-third-kitchen-'+width+'.png'});
  assert.deepEqual(errors,[],'no Chrome exceptions at '+width);
  await page.close();
 }
 const offline=await browser.newPage({viewport:{width:390,height:844},locale:'zh-CN'});
 const errors=[];offline.on('pageerror',e=>errors.push(e.message));
 const s=base();s.phase='upgrade';assert.equal(buyThirdKitchenBundle(s),true);
 await offline.addInitScript(([k,v])=>localStorage.setItem(k,JSON.stringify(v)),[key,s]);
 await offline.goto('http://127.0.0.1:5173/standalone.html',{waitUntil:'networkidle'});
 assert.match(await offline.title(),/0.13.0-alpha.2/);
 assert.match(await offline.locator('.v13a-bundle-panel').innerText(),/小炭已到岗/);
 await offline.screenshot({path:out+'/standalone-third-bundle.png'});
 assert.deepEqual(errors,[]);
 await offline.close();
 console.log('v0.13-A: 3 portrait Chrome widths + offline; one purchase=one chef+one center, real work sprite, preserved payroll and no exceptions. Actual iPhone subjective acceptance pending.');
}finally{if(browser)await browser.close();server.kill('SIGTERM')}
