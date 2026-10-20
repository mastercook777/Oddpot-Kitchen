import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {newGame,travelPortal} from '../src/engine.js';

const url='http://127.0.0.1:5173/',key='oddpot-prototype-v04',out='docs/screenshots/v015-cloud';
await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5173','--strictPort'],{stdio:'ignore'});
const staticUrl='http://127.0.0.1:5174/';
const staticServer=spawn('python3',['-m','http.server','5174','--bind','127.0.0.1'],{stdio:'ignore'});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let browser;
const hearth=seed=>{const s=newGame(seed);s.onboarding.enabled=false;s.chapterProgress.stars=3;s.phase='forecast';s.coins=450;s.crew.helper.hired=true;s.crew.helper.level=2;s.crew.helper.xp=28;s.kitchen.mastery={WOK:2,POT:1,GRILL:1};s.kitchen.slots[0].level=2;return s};
const cloud=seed=>{const s=hearth(seed);assert.equal(travelPortal(s,'cloud',{tool:'WOK',crew:'helper'}),true);s.cloudProgress.explored=true;s.phase='upgrade';s.coins=350;return s};

try{
 let ready=false;for(let i=0;i<60;i++){try{if((await fetch(url+'index.html')).ok){ready=true;break}}catch{}await wait(250)}
 assert.ok(ready,'Vite starts');
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 let staticReady=false;for(let i=0;i<60;i++){try{if((await fetch(staticUrl+'index.html')).ok){staticReady=true;break}}catch{}await wait(250)}
 assert.ok(staticReady,'direct static host starts');
 const staticPage=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'zh-CN'});
 const staticErrors=[];staticPage.on('pageerror',e=>staticErrors.push(e.message));
 await staticPage.addInitScript(([k,v])=>localStorage.setItem(k,JSON.stringify(v)),[key,hearth(914)]);
 await staticPage.goto(staticUrl+'index.html',{waitUntil:'networkidle'});
 assert.ok(await staticPage.locator('[data-act="portal-travel"]').isVisible(),'Pages-style static index renders the portal');
 assert.deepEqual(staticErrors,[],'Pages-style static index has no startup errors');
 await staticPage.screenshot({path:`${out}/static-390.png`});await staticPage.close();
 for(const [width,height] of [[320,568],[375,667],[390,844]]){
  const errors=[];let page;
  const open=async(state,path='index.html')=>{
   if(page)await page.close();page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true,locale:'zh-CN'});
   page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(([k,v])=>localStorage.setItem(k,JSON.stringify(v)),[key,state]);
   await page.goto(url+path,{waitUntil:'networkidle'});
  };
  const two=hearth(width);two.chapterProgress.stars=2;
  await open(two);await page.locator('[data-act="third-star-request"]').click();
  assert.equal((await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key)).chapterProgress.thirdAppraisal.requestDay,'1-1');
  await open(hearth(width));assert.ok(await page.locator('[data-act="portal-travel"]').isVisible());
  await page.locator('[data-act="portal-travel"]').click();
  const entered=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
  assert.equal(entered.activeWorld,'cloud');assert.equal(entered.coins,120);
  assert.equal(entered.crew.helper.level,1);assert.equal(entered.crew.waiter.hired,false);
  assert.deepEqual(entered.menu,['','','']);
  assert.ok((await page.locator('.v12-star-invite').first().innerText()).includes('云港'));
  await page.screenshot({path:`${out}/portal-${width}.png`});
  await page.locator('[data-act="to-field"]').click();
  assert.ok(await page.locator('[data-route="cloud_safe"]').isVisible());
  await page.screenshot({path:`${out}/routes-${width}.png`});
  await page.locator('[data-route="cloud_safe"]').click();
  assert.equal((await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key)).field.action,true);
  assert.ok(await page.locator('#forest-canvas').isVisible());
  assert.ok(await page.evaluate(()=>{const c=document.querySelector('#forest-canvas');return c.width>0&&c.height>0&&c.getContext('2d').getImageData(c.width>>1,c.height>>1,1,1).data[3]>0}), 'field canvas has rendered pixels');
  assert.ok(!(await page.locator('#field-clock').innerText()).includes('NaN'));
  await page.screenshot({path:`${out}/island-${width}.png`});
  const choices=cloud(width);choices.phase='menu';choices.recipes.cloud_rice_chicken=80;choices.recipes.sour_rice=80;choices.recipes.steam_cloud_rice=80;
  choices.kitchen.steamerOwned=true;choices.menu=['sour_rice','cloud_rice_chicken','sour_rice'];
  await open(choices);await page.locator('[data-edit-slot="2"]').click();
  assert.equal(await page.locator('[data-menu-pick="2:steam_cloud_rice"]').isDisabled(),true,'third cookware is blocked at selection');
  await page.screenshot({path:`${out}/menu-limit-${width}.png`});
  const setup=cloud(width);await open(setup);
  await page.locator('[data-act="buy-steamer"]').click();
  const bought=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
  assert.equal(bought.kitchen.steamerOwned,true);
  assert.equal(bought.ledger.filter(x=>x.id==='cloud-steamer').length,1);
  await page.screenshot({path:`${out}/steamer-${width}.png`});
  bought.phase='research';await open(bought);
  await page.locator('[data-act="method:steam"]').click();
  for(const id of ['cloud_rice','chicken'])await page.locator(`[data-ingredient="${id}"]`).click();
  for(const id of ['cloud_rice','chicken'])await page.locator(`[data-ingredient="${id}"]`).click();
  await page.locator('[data-act="start-research"]').click();
  for(const id of ['cloud_rice','chicken'])await page.locator(`[data-live-drop="${id}"]`).click();
  await page.locator('[data-act="live-action:seal"]').click();
  await page.waitForTimeout(3200);await page.locator('[data-act="live-action:vent"]').click();
  await page.waitForTimeout(5200);await page.locator('[data-act="live-finish"]').click();
  assert.ok((await page.locator('.v063-receipt').innerText()).includes('云汽鸡香饭'));
  const crafted=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
  assert.ok(crafted.recipes.steam_cloud_rice>0);
  const layout=await page.evaluate(()=>({bottom:document.querySelector('.game-shell').getBoundingClientRect().bottom,scroll:document.documentElement.scrollWidth}));
  assert.ok(layout.bottom<=height+1&&layout.scroll<=width+1,JSON.stringify(layout));
  assert.deepEqual(errors,[],`${width} runtime errors`);
  await page.screenshot({path:`${out}/research-${width}.png`});await page.close();
 }
 const offline=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'zh-CN'});
 await offline.addInitScript(([k,v])=>localStorage.setItem(k,JSON.stringify(v)),[key,hearth(915)]);
 await offline.goto(url+'standalone.html',{waitUntil:'networkidle'});
 assert.ok(await offline.locator('[data-act="portal-travel"]').isVisible());
 await offline.locator('[data-act="portal-travel"]').click();
 assert.ok((await offline.locator('.v12-star-invite').first().innerText()).includes('云港'));
 await offline.screenshot({path:`${out}/offline-390.png`});await offline.close();
 console.log('v0.15 Chrome 320/375/390: third-star invitation, cloud portal, route, steamer research and offline entry passed');
}finally{await browser?.close();server.kill('SIGTERM');staticServer.kill('SIGTERM')}
