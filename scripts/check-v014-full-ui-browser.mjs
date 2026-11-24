import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {newGame,createService,setServicePaused,tick,resumeBreak,closeService} from '../src/engine.js';

const storageKey='oddpot-prototype-v04';
const url='http://127.0.0.1:5173/';
const output='docs/screenshots/v014-full-ui';
await mkdir(output,{recursive:true});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5173','--strictPort'],{stdio:'ignore'});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const fixture=phase=>{
 const s=newGame(15742);s.onboarding.enabled=false;s.phase=phase;
 if(phase==='service'){assert.ok(createService(s,{walkable:true}));setServicePaused(s,false);}
 if(phase==='report'){
  s.phase='service';assert.ok(createService(s,{walkable:true}));setServicePaused(s,false);
  for(let t=0;t<160&&!s.service.done;t++){if(s.service.breakAt)resumeBreak(s);tick(s,1);}
  assert.ok(s.service.done);assert.ok(closeService(s));
 }
 return s;
};
let browser;
try{
 let ready=false;
 for(let i=0;i<60;i++){try{if((await fetch(url+'index.html')).ok){ready=true;break;}}catch{}await wait(250);}
 assert.ok(ready,'Vite server starts');
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const [width,height] of [[320,568],[375,667],[390,844]]){
  for(const phase of ['forecast','field','research','menu','prep','service','report','upgrade']){
   const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'zh-CN'});
   const errors=[];page.on('pageerror',error=>errors.push(error.message));
   await page.addInitScript(([key,state])=>localStorage.setItem(key,JSON.stringify(state)),[storageKey,fixture(phase)]);
   await page.goto(url,{waitUntil:'networkidle'});
   assert.equal(await page.locator(`.stage.${phase}`).count(),1,`${phase} stage exists at ${width}`);
   const layout=await page.evaluate(()=>{
    const shell=document.querySelector('.game-shell').getBoundingClientRect(),stage=document.querySelector('.stage').getBoundingClientRect();
    return {shellBottom:shell.bottom,stageBottom:stage.bottom,stageHeight:stage.height};
   });
   assert.ok(layout.shellBottom<=height+1&&layout.stageBottom<=height+1&&layout.stageHeight>120,`${phase} fits ${width}×${height}: ${JSON.stringify(layout)}`);
   if(width!==375&&['prep','report'].includes(phase))await page.screenshot({path:`${output}/${phase}-${width}.png`});
   if(phase==='forecast'){
    const scene=page.locator('.v016-scene');
    assert.equal(await scene.count(),1,'border home uses the scene-first layout');
    const rect=await scene.boundingBox();
    assert.ok(rect.height>=layout.stageHeight*.60,'scene occupies at least 60% of stage');
    assert.equal(await scene.locator('canvas').count(),1);
    await page.waitForFunction(async()=>{const art=await import('/src/hearth_assets_v016a21.js?v=0.16-a21');return art.a21AtlasReady();});
    assert.ok(await page.evaluate(async()=>{const a=await import('/src/hearth_assets_v016a21.js?v=0.16-a21');const c=document.createElement('canvas');c.width=44;c.height=36;const ctx=c.getContext('2d');if(!a.a21Sprite(ctx,'table',0,0,44,36))return false;const pixels=ctx.getImageData(0,0,44,36).data;return pixels.some((v,i)=>i%4===3&&v===255)&&pixels.some((v,i)=>i%4===3&&v===0);}), 'transparent table sprite actually decodes and draws');

    for(const act of ['stock','book','bento','crew']){
     await scene.locator('[data-act="'+act+'"]').click();
     assert.ok(await page.locator('.sheet').isVisible(),act+' uses the existing sheet');
     await page.locator('[data-act="close-sheet"]').last().click();
    }
    await page.screenshot({path:`${output}/v016-home-${width}.png`});
    await scene.locator('[data-act="to-field"]').click();
    assert.equal(await page.locator('.stage.field').count(),1,'door opens the real field preparation');
    assert.deepEqual(errors,[],`A1 home runtime errors at ${width}`);
    await page.close();
    continue;
   }
   if(phase==='field')assert.equal(await page.locator('[data-route]').count(),2);
   if(phase==='research')assert.equal(await page.locator('.v063-food-picker button').count(),12);
   if(phase==='menu'){
    assert.equal(await page.locator('.menu-line').count(),3);
    assert.equal(await page.locator('.v014-menu-value').count(),3);
    await page.locator('.menu-line').first().click();assert.ok(await page.locator('.sheet').isVisible());
    await page.locator('[data-act="close-sheet"]').last().click();
   }
   if(phase==='prep'){
    assert.ok(await page.locator('[data-act="open"]').isVisible());
    await page.locator('.v014-marketing summary').click();
    await page.locator('[data-act="promo:flyer"]').click();
    assert.ok(await page.locator('.v014-marketing').getAttribute('open')!==null,'campaign choice stays expanded');
   }
   if(phase==='service')assert.ok(await page.locator('#diner-canvas').isVisible());
   if(phase==='report'){
    assert.ok(await page.locator('.report-stats').isVisible());
    await page.locator('.v014-report-more summary').click();
    assert.ok(await page.locator('.v12c-finance').isVisible());
   }
   if(phase==='upgrade')assert.ok(await page.locator('.kitchen-upgrade-card').isVisible());
   assert.deepEqual(errors,[],`${phase} runtime errors at ${width}`);
   if(width!==375)await page.screenshot({path:`${output}/${phase}${['prep','report'].includes(phase)?'-details':''}-${width}.png`});
   await page.close();
  }
 }
 const offline=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'zh-CN'});
 await offline.addInitScript(([key,state])=>localStorage.setItem(key,JSON.stringify(state)),[storageKey,fixture('menu')]);
 await offline.goto(url+'standalone.html',{waitUntil:'networkidle'});
 assert.equal(await offline.locator('.v014-menu-value').count(),3,'offline menu uses same UI');
 await offline.close();
 const offlineHome=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'zh-CN'});
 await offlineHome.addInitScript(([key,state])=>localStorage.setItem(key,JSON.stringify(state)),[storageKey,fixture('forecast')]);
 await offlineHome.goto(url+'standalone.html',{waitUntil:'networkidle'});
 assert.equal(await offlineHome.locator('.v016-scene').count(),1,'offline uses A1 home');
 await offlineHome.locator('.v016-scene [data-act="stock"]').click();
 assert.ok(await offlineHome.locator('.sheet').isVisible(),'offline scene action works');
 await offlineHome.close();
 console.log('v0.14 real Chrome: eight stages at 320/375/390, sheets, marketing, ledger and offline menu passed');
}finally{if(browser)await browser.close();server.kill('SIGTERM');}
