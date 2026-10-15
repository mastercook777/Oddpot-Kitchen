import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {newGame,createService} from '../src/engine.js';

const out='docs/screenshots/v012d-crew-art';
await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5173','--strictPort'],{stdio:'ignore'});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const storageKey='oddpot-prototype-v04';
const fixture=()=>{
 const s=newGame(195);s.cycle=3;s.day=2;s.phase='prep';s.coins=700;
 s.crew.helper.hired=true;s.crew.helper.onDuty=true;s.crew.helper.xp=30;
 s.crew.waiter.hired=true;s.crew.waiter.onDuty=true;s.crew.waiter.xp=30;
 return s;
};
let browser;
try{
 let ready=false;
 for(let i=0;i<60;i++){try{if((await fetch('http://127.0.0.1:5173/index.html')).ok){ready=true;break;}}catch{}await sleep(400)}
 assert.ok(ready,'local Vite server started');
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 const screenshots=[];
 for(const [width,height] of [[320,568],[375,667],[390,844]]){
  const errors=[];
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:2,locale:'zh-CN',isMobile:true,hasTouch:true});
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(([k,s])=>localStorage.setItem(k,JSON.stringify(s)),[storageKey,fixture()]);
  await page.goto('http://127.0.0.1:5173/index.html',{waitUntil:'networkidle'});
  await page.locator('[data-act="crew"]').last().click();
  const read=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),storageKey);
  const checksum=async role=>page.locator('canvas[data-crew-portrait="'+role+'"]').evaluate(c=>c.toDataURL('image/png'));
  const variants={helper:[],waiter:[]};
  for(let level=1;level<=3;level++){
   for(const role of ['helper','waiter']){
    const el=page.locator('canvas[data-crew-portrait="'+role+'"]');
    assert.equal(await el.getAttribute('data-level'),String(level));
    variants[role].push(await checksum(role));
   }
   screenshots.push(out+'/staff-'+width+'-lv'+level+'.png');
   await page.screenshot({path:screenshots.at(-1)});
   if(level<3){
    for(const role of ['helper','waiter']){
     const previous=await read();const cash=previous.coins;
     await page.locator('[data-act="promote:'+role+'"]').click();
     const after=await read();
     assert.equal(after.crew[role].level,level+1);
     assert.equal(after.coins,cash-(level===1?28:64));
    }
   }
  }
  for(const role of ['helper','waiter']){
   assert.equal(new Set(variants[role]).size,3,role+' three levels must be visually different');
  }
  assert.deepEqual(errors,[],'no runtime exceptions on '+width+'x'+height);
  await page.close();
 }
 // Freeze: changing permanent staff after the shift started must not alter tonight's actor.
 const live=fixture();live.phase='service';
 live.crew.helper.level=3;live.crew.waiter.level=3;
 assert.equal(createService(live,{walkable:true}),true);
 live.crew.helper.level=1;live.crew.waiter.level=1;
 assert.equal(live.service.crew.helper.level,3);
 assert.equal(live.service.crew.waiter.level,3);
 const scene=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,locale:'zh-CN'});
 const errors=[];
 scene.on('pageerror',e=>errors.push(e.message));
 await scene.addInitScript(([k,s])=>localStorage.setItem(k,JSON.stringify(s)),[storageKey,live]);
 await scene.goto('http://127.0.0.1:5173/index.html',{waitUntil:'networkidle'});
 const canvas=scene.locator('#diner-canvas');await canvas.waitFor();
 assert.ok(await canvas.evaluate(c=>c.width>0&&c.height>0),'live restaurant should actually draw');
 await scene.screenshot({path:out+'/live-shift-lv3-390.png'});
 await scene.close();

 // The single-file offline edition must carry the same pixel actor and employee sheet.
 const offline=await browser.newPage({viewport:{width:390,height:844},locale:'zh-CN'});
 offline.on('pageerror',e=>errors.push(e.message));
 await offline.addInitScript(([k,s])=>localStorage.setItem(k,JSON.stringify(s)),[storageKey,fixture()]);
 await offline.goto('http://127.0.0.1:5173/standalone.html',{waitUntil:'networkidle'});
 await offline.locator('[data-act="crew"]').last().click();
 await offline.locator('[data-act="promote:helper"]').click();
 assert.equal(await offline.locator('canvas[data-crew-portrait="helper"]').getAttribute('data-level'),'2');
 assert.equal(await offline.locator('.v12d-staff-identity').count(),2);
 await offline.screenshot({path:out+'/offline-staff-390.png'});
 await offline.close();
 assert.deepEqual(errors,[]);
 console.log('v0.12-D real Chrome: 320x568, 375x667, 390x844 full rank progression, differentiated pixels, live shift snapshot and offline art passed. Player iPhone visual acceptance pending.');
}finally{if(browser)await browser.close();server.kill('SIGTERM')}
