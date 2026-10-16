import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {newGame} from '../src/engine.js';

const key='oddpot-prototype-v04',url='http://127.0.0.1:5173/';
const dir='docs/screenshots/v013j-first-loop';
await mkdir(dir,{recursive:true});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5173','--strictPort'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let browser;
async function seededPage(state,viewport,resource='index.html'){
 const page=await browser.newPage({viewport,deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await page.addInitScript(([k,v])=>localStorage.setItem(k,JSON.stringify(v)),[key,state]);
 await page.goto(url+resource,{waitUntil:'networkidle'});
 return page;
}
try{
 let ready=false;for(let i=0;i<60;i++){try{if((await fetch(url+'index.html')).ok){ready=true;break}}catch{}await sleep(250)}
 assert.ok(ready,'vite starts');
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const [width,height] of [[320,568],[375,667],[390,844]]){
  const s=newGame();const page=await seededPage(s,{width,height});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  assert.match(await page.locator('.v013j-guide').innerText(),/第一天，从这间小厨房开始/);
  const layout=await page.evaluate(()=>({button:document.querySelector('.v076-home-primary').getBoundingClientRect(),preview:document.querySelector('.v076-preview').getBoundingClientRect()}));
  assert.ok(layout.button.bottom<=height&&layout.preview.height>=80,'guide keeps scene and main button usable '+width);
  await page.screenshot({path:`${dir}/new-${width}.png`});
  await page.locator('[data-act="to-field"]').click();
  assert.match(await page.locator('.v013j-guide').innerText(),/去找今晚的食材/);
  assert.equal(await page.locator('[data-route]').count(),2);
  await page.locator('[data-act="guide-skip"]').click();
  assert.equal(await page.locator('.v013j-guide').count(),0);
  await page.locator('[data-act="settings"]').click();
  await page.locator('[data-act="guide-replay"]').click();
  assert.match(await page.locator('.v013j-guide').innerText(),/去找今晚的食材/);
  assert.deepEqual(errors,[],'no runtime errors '+width);
  await page.close();
 }
 const staffed=newGame();staffed.crew.helper.hired=true;staffed.crew.waiter.hired=true;
 const staff=await seededPage(staffed,{width:390,height:844});
 const first=await staff.locator('#diner-canvas').evaluate(el=>el.toDataURL());
 await sleep(1100);
 const second=await staff.locator('#diner-canvas').evaluate(el=>el.toDataURL());
 assert.notEqual(first,second,'hired workers animate in the real restaurant canvas');
 await staff.screenshot({path:`${dir}/staffed-390.png`});await staff.close();
 const old=newGame();delete old.onboarding;
 const legacy=await seededPage(old,{width:320,height:568});
 assert.equal(await legacy.locator('.v013j-guide').count(),0,'old saves do not receive surprise onboarding');await legacy.close();
 const offline=await seededPage(newGame(),{width:390,height:844},'standalone.html');
 assert.match(await offline.locator('.v013j-guide').innerText(),/第一天/);await offline.close();
 console.log('v0.13-J first-day guide, actual animated home, old save and offline passed');
}finally{if(browser)await browser.close();server.kill('SIGTERM')}
