import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {newGame} from '../src/engine.js';
const url='http://127.0.0.1:5173/',key='oddpot-prototype-v04',out='docs/screenshots/v014b-grill';
await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5173','--strictPort'],{stdio:'ignore'});
let browser;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const base=(phase,width)=>{
 const s=newGame(3219+width);s.onboarding.enabled=false;s.phase=phase;s.chapterProgress.stars=2;
 s.dining.tableCount=4;s.kitchen.thirdUnlocked=true;s.kitchen.slots.push({type:'WOK',level:1});s.coins=550;
 s.crew.helper2={hired:true,onDuty:true,station:2,level:1,xp:0,meals:0};
 s.crew.waiter={hired:true,onDuty:true,level:1,xp:0,meals:0};
 for(const id of Object.keys(s.inventory))s.inventory[id]=30;
 return s;
};
try{
 let ready=false;for(let i=0;i<60;i++){try{if((await fetch(url+'index.html')).ok){ready=true;break;}}catch{}await wait(250);}
 assert.ok(ready,'Vite starts');
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const [width,height] of [[320,568],[375,667],[390,844]]){
  let page;const errors=[];
  const openState=async state=>{if(page)await page.close();page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true,locale:'zh-CN'});page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(([k,s])=>localStorage.setItem(k,JSON.stringify(s)),[key,state]);await page.goto(url,{waitUntil:'networkidle'});};
  await openState(base('upgrade',width));
  await page.locator('[data-act="buy-grill"]').click();
  assert.ok(await page.locator('.v014b-grill-unlock').innerText().then(x=>x.includes('已购入')));
  await page.screenshot({path:`${out}/upgrade-${width}.png`});
  const purchased=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
  assert.equal(purchased.kitchen.grillOwned,true);
  purchased.phase='research';
  await openState(purchased);
  await page.locator('[data-act="method:grill"]').click();
  await page.locator('[data-ingredient="chicken"]').click();await page.locator('[data-ingredient="chili"]').click();
  await page.locator('[data-ingredient="beef"]').click();await page.locator('[data-ingredient="garlic"]').click();
  assert.ok((await page.locator('.v063-recipe-clue').innerText()).includes('野牛蒜香串'));
  await page.locator('[data-act="start-research"]').click();
  await page.locator('[data-live-drop="beef"]').click();await page.locator('[data-live-drop="garlic"]').click();
  await page.waitForTimeout(4500);await page.locator('[data-act="live-action:turn"]').click();
  await page.locator('[data-act="live-action:brush"]').click();
  await page.waitForTimeout(4800);await page.screenshot({path:`${out}/research-${width}.png`});
  await page.locator('[data-act="live-finish"]').click();
  assert.ok((await page.locator('.v063-receipt').innerText()).includes('野牛蒜香串'));
  assert.ok((await page.locator('.v063-receipt').innerText()).includes('每份售价'));
  const crafted=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
  assert.ok(crafted.recipes.grill_beef>0);
  crafted.phase='prep';crafted.menu=['grill_beef','chicken_stew','mushroom_stir'];
  await openState(crafted);
  assert.ok((await page.locator('.kitchen-config-head').innerText()).includes('烤架'));
  await page.locator('[data-act="kitchen:2:GRILL"]').click();
  assert.equal(await page.locator('[data-act="open"]').isDisabled(),false);
  await page.screenshot({path:`${out}/prep-${width}.png`});
  await page.locator('[data-act="open"]').click();assert.ok(await page.locator('#diner-canvas').isVisible());
  const layout=await page.evaluate(()=>({bottom:document.querySelector('.game-shell').getBoundingClientRect().bottom,scroll:document.documentElement.scrollWidth}));
  assert.ok(layout.bottom<=height+1&&layout.scroll<=width+1,JSON.stringify(layout));
  assert.deepEqual(errors,[],`${width} runtime`);
  await page.close();
 }
 const offline=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const s=base('research',390);s.kitchen.grillOwned=true;
 await offline.addInitScript(([k,v])=>localStorage.setItem(k,JSON.stringify(v)),[key,s]);
 await offline.goto(url+'standalone.html',{waitUntil:'networkidle'});
 assert.ok(await offline.locator('[data-act="method:grill"]').isVisible());await offline.close();
 console.log('v0.14-B Chrome 320/375/390: purchase, two-sided cook, value receipt, prep coverage, service and offline passed');
}finally{await browser?.close();server.kill('SIGTERM');}
