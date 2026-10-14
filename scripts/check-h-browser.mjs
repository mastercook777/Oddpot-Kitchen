import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createMeadowPreview} from '../src/meadow_preview_state_e1.js';
const out='docs/screenshots/h-browser';await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5173','--strictPort'],{stdio:'ignore'});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));let browser;
try{
 let ready=false;for(let i=0;i<60;i++){try{if((await fetch('http://127.0.0.1:5173')).ok){ready=true;break;}}catch{}await sleep(500);}assert.ok(ready,'Vite startup');
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:390,height:844},locale:'zh-CN',deviceScaleFactor:2,isMobile:true,hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const [width,height] of [[320,568],[375,667],[390,844]]){
  await page.setViewportSize({width,height});
  for(const view of ['combat_wok','combat_pot','combat_wok_skill','combat_pot_skill','combat_boss']){
   await page.goto('http://127.0.0.1:5173/art-preview.html?view='+view,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.__oddpotPreview?.rendered);
   assert.equal(await page.locator('[data-weapon="'+(view.includes('pot')?'POT':'WOK')+'"]').getAttribute('aria-pressed'),'true');
   for(const selector of ['#joystick','#skill']){const b=await page.locator(selector).boundingBox();assert.ok(b&&b.x>=0&&b.y>=0&&b.x+b.width<=width+1&&b.y+b.height<=height+1,selector+' reachable at '+width);}
   assert.ok(await page.locator('#scene').evaluate(c=>c.getContext('2d').getImageData(c.width/2|0,c.height/2|0,1,1).data[3]>0));
   await page.screenshot({path:`${out}/${view}-${width}.png`});
  }
 }
 // Actual browser touch input on the formal module and offline builds.
 const fixture=createMeadowPreview(20261014),f=fixture.field;Object.assign(f,{pos:{x:6,y:9},x:6,y:9,nodes:[],obstacles:[],hazards:[],attackCd:999,skillCd:0,damageCd:999});
 f.weapon.type='WOK';f.enemies=[{id:'browser-hit',kind:'boar',x:6.9,y:9,hp:4,maxHp:4,cooldown:999,phase:0}];
 await page.addInitScript(s=>localStorage.setItem('oddpot-prototype-v04',JSON.stringify(s)),fixture);
 await page.setViewportSize({width:390,height:844});
 for(const path of ['index.html','standalone.html']){
  await page.goto('http://127.0.0.1:5173/'+path,{waitUntil:'networkidle'});await page.locator('.field-skill').waitFor();
  const scene=await page.locator('.action-forest').boundingBox(),skill=await page.locator('.field-skill').boundingBox();assert.ok(scene&&skill);
  const cdp=await page.context().newCDPSession(page),p={id:1,x:scene.x+scene.width*.25,y:scene.y+scene.height*.65},q={id:2,x:skill.x+skill.width/2,y:skill.y+skill.height/2};
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p]});p.x+=32;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[p]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p,q]});await page.waitForTimeout(100);
  assert.ok(await page.locator('#field-stick').evaluate(el=>el.classList.contains('active')),'second finger keeps joystick');
  await page.waitForFunction(()=>{const s=JSON.parse(localStorage.getItem('oddpot-prototype-v04'));return s.field.skillCd>0&&s.field.enemies[0].hp===2&&s.field.pos.x>6;});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.ok(!await page.locator('#field-stick').evaluate(el=>el.classList.contains('active')),'release clears joystick');
  await page.screenshot({path:`${out}/${path}.png`});await cdp.detach();
 }
 assert.deepEqual(errors,[]);console.log('15 real Chrome mobile screenshots; formal/offline two-finger cast, stick ownership, motion, release and saved unique damage passed. iPhone Safari remains player QA.');
}finally{if(browser)await browser.close();server.kill('SIGTERM');}
