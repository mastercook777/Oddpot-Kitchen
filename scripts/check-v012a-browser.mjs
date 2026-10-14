import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {newGame,nextPhase,requestFirstStar,createService,setServicePaused,resumeBreak,tick,closeService} from '../src/engine.js';

const out='docs/screenshots/v012a-browser';
await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5173','--strictPort'],{stdio:'ignore'});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const key='oddpot-prototype-v04';
const base=()=>{const s=newGame(333);s.cycle=2;s.day=1;return s;};
const read=page=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
let browser;
try{
 let ready=false;
 for(let i=0;i<60;i++){try{if((await fetch('http://127.0.0.1:5173')).ok){ready=true;break;}}catch{}await sleep(500);}
 assert.ok(ready,'Vite startup');
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:390,height:844},locale:'zh-CN',deviceScaleFactor:2,isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const open=async (path,state)=>{
  await page.goto('http://127.0.0.1:5173/'+path,{waitUntil:'networkidle'});
  await page.evaluate(([k,s])=>localStorage.setItem(k,JSON.stringify(s)),[key,state]);
  await page.reload({waitUntil:'networkidle'});
 };
 const visible=async (selector,width,height)=>{
  const b=await page.locator(selector).boundingBox();
  assert.ok(b&&b.x>=0&&b.y>=0&&b.x+b.width<=width+1&&b.y+b.height<=height+1,selector+' reachable in '+width+'×'+height);
 };
 for(const [width,height] of [[320,568],[375,667],[390,844]]){
  await page.setViewportSize({width,height});
  await open('index.html',base());
  await visible('[data-act="first-star-request"]',width,height);
  await visible('[data-act="to-field"]',width,height);
  assert.equal(await page.locator('.v12-star-invite').count(),1);
  await page.screenshot({path:`${out}/forecast-${width}.png`});
  await page.locator('[data-act="first-star-request"]').click();
  assert.equal((await read(page)).chapterProgress.requestDay,'2-1');
  assert.equal(await page.locator('[data-act="first-star-request"]').getAttribute('aria-pressed'),'true');
  await page.locator('[data-act="first-star-request"]').click();
  assert.equal((await read(page)).chapterProgress.requestDay,null);
 }
 const prep=base();prep.phase='prep';
 await open('index.html',prep);
 assert.equal(await page.locator('.stage.prep [data-act="first-star-request"]').count(),1);
 await page.locator('[data-act="first-star-request"]').click();
 assert.equal((await read(page)).chapterProgress.requestDay,'2-1');
 await page.screenshot({path:`${out}/prep-390.png`});

 const rated=base();rated.phase='prep';
 for(const id of ['chicken','mushroom','cabbage','garlic','onion'])rated.inventory[id]=50;
 requestFirstStar(rated);nextPhase(rated,'service');assert.ok(createService(rated));
 setServicePaused(rated,false);
 for(let i=0;i<160&&!rated.service.done;i++){
  if(rated.service.breakAt)resumeBreak(rated);
  tick(rated,1);
 }
 assert.ok(rated.service.done);
 const report=closeService(rated);assert.ok(report.rating?.passed);
 await open('index.html',rated);
 assert.equal(await page.locator('.v12-rating-result').count(),1);
 assert.match(await page.locator('.v12-rating-result').innerText(),/第一枚万味星章/);
 await page.screenshot({path:`${out}/report-390.png`,fullPage:true});

 const room=base();room.phase='upgrade';room.chapterProgress.stars=1;
 room.dining.tableCount=3;room.coins=500;
 await open('index.html',room);
 await page.locator('[data-act="expand-room"]').click();
 const expanded=await read(page);
 assert.equal(expanded.dining.tableCount,4);
 assert.equal(expanded.coins,280);
 assert.equal(expanded.ledger.filter(x=>x.id==='expand-fourth-table').length,1);
 assert.match(await page.locator('.v09-room-upgrade').innerText(),/8 席/);
 await page.screenshot({path:`${out}/upgrade-four-tables-390.png`});

 const service=base();service.phase='service';service.chapterProgress.stars=1;
 service.dining.tableCount=4;assert.ok(createService(service,{walkable:true}));
 await open('index.html',service);
 const canvas=page.locator('.diner-canvas');await canvas.waitFor();
 assert.ok(await canvas.evaluate(c=>{const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;return a.some((value,i)=>i%4===3&&value>0)}));
 await page.screenshot({path:`${out}/service-four-tables-390.png`});

 await open('standalone.html',base());
 await page.locator('[data-act="first-star-request"]').click();
 assert.equal((await read(page)).chapterProgress.requestDay,'2-1');
 await page.screenshot({path:`${out}/offline-forecast-390.png`});
 assert.deepEqual(errors,[]);
 console.log('Real Chrome 320×568, 375×667, 390×844; request/cancel/save, prep, rated report, paid four-table upgrade, Canvas and offline passed. iPhone subjective play remains pending.');
}finally{if(browser)await browser.close();server.kill('SIGTERM');}
