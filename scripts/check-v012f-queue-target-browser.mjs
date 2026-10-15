import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {newGame,createService,enterField,interactExplorer,completeFieldSegment,chooseFieldBranch} from '../src/engine.js';
import {selectOutdoorQueueSpeech} from '../src/outdoor_queue_speech_v012f.js';

const out='docs/screenshots/v012f-queue-target';
await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5173','--strictPort'],{stdio:'ignore'});
const nap=ms=>new Promise(r=>setTimeout(r,ms)),k='oddpot-prototype-v04';
const crowd=()=>{
 const s=newGame(20261015);s.cycle=3;s.day=1;s.phase='service';s.chapterProgress.stars=1;
 s.dining.tableCount=4;s.crew.helper.hired=true;s.crew.waiter.hired=true;
 assert.equal(createService(s,{walkable:true}),true);
 // The visitor must be a genuine generated order in the service model.
 const first=s.service.orders[0];first.status='waiting';first.arrival=0;first.segment='adventurer';
 for(const o of s.service.orders.slice(1)){o.status='waiting';o.arrival=999;}
 s.service.time=23;s.service.queuePeak=1;
 assert.ok(selectOutdoorQueueSpeech(s.service.orders,23)?.text);
 return s;
};
const field=()=>{
 const s=newGame(20261015);s.phase='field';s.selectedTarget='chili';
 assert.equal(enterField(s,'safe'),true);
 const first=s.field.nodes.find(n=>n.key==='target');s.field.x=first.x;s.field.y=first.y;
 assert.equal(interactExplorer(s).ok,true);assert.equal(completeFieldSegment(s),true);
 assert.equal(chooseFieldBranch(s,'1-0'),true);
 const next=s.field.nodes.find(n=>n.key==='target');s.field.x=next.x;s.field.y=next.y;
 assert.match(interactExplorer(s).message,/本区采集完成/);
 return s;
};
let browser;
try{
 let ready=false;for(let i=0;i<60;i++){try{if((await fetch('http://127.0.0.1:5173/index.html')).ok){ready=true;break;}}catch{}await nap(350)}
 assert.ok(ready);
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const [w,h] of [[320,568],[375,667],[390,844]]){
  const errors=[];const page=await browser.newPage({viewport:{width:w,height:h},deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'zh-CN'});
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(([key,s])=>localStorage.setItem(key,JSON.stringify(s)),[k,crowd()]);
  await page.goto('http://127.0.0.1:5173/index.html',{waitUntil:'networkidle'});
  assert.match(await page.locator('#v075-served').innerText(),/等位 1/);
  const source=await page.locator('#diner-canvas').evaluate(c=>({w:c.width,h:c.height,paint:c.toDataURL('image/png').length}));
  assert.ok(source.w>200&&source.h>200&&source.paint>4500);
  assert.deepEqual(errors,[]);
  await page.screenshot({path:out+'/outdoor-queue-'+w+'.png'});
  await page.close();
 }
 const f=field();const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'zh-CN'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(([key,s])=>localStorage.setItem(key,JSON.stringify(s)),[k,f]);
 await page.goto('http://127.0.0.1:5173/index.html',{waitUntil:'networkidle'});
 const actual=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),k);
 assert.equal(actual.field.dailyTarget,'chili');assert.equal(actual.field.nodes.find(n=>n.key==='target').id,'mushroom');
 assert.equal(await page.locator('#forest-canvas').count(),1,'active exploration should still render its field Canvas');
 await page.close();

 const offline=await browser.newPage({viewport:{width:390,height:844},locale:'zh-CN'});
 offline.on('pageerror',e=>errors.push(e.message));
 await offline.addInitScript(([key,s])=>localStorage.setItem(key,JSON.stringify(s)),[k,crowd()]);
 await offline.goto('http://127.0.0.1:5173/standalone.html',{waitUntil:'networkidle'});
 assert.match(await offline.title(),/alpha.2/);
 assert.match(await offline.locator('#v075-served').innerText(),/等位 1/);
 assert.ok(await offline.locator('#diner-canvas').evaluate(c=>c.width>0));
 await offline.screenshot({path:out+'/queue-standalone-390.png'});
 assert.deepEqual(errors,[]);
 await offline.close();
 console.log('v0.12-F Chrome 320x568, 375x667, 390x844: real waiting guest painting, no UI exception, frozen selected ingredient, and offline alpha.2 passed.');
}finally{if(browser)await browser.close();server.kill('SIGTERM')}
