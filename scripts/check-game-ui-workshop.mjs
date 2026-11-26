import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,readFile} from 'node:fs/promises';
const out='docs/screenshots/z2e-workshop';await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5173','--strictPort'],{stdio:'ignore'});
const url='http://127.0.0.1:5173/game-ui-workshop.html';
let browser;try{
 let ready=false;for(let i=0;i<60;i++){try{if((await fetch(url)).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,250));}assert.ok(ready);
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const [width,height] of [[320,568],[375,667],[390,844]]){
  const p=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.route('https://cdn.jsdelivr.net/npm/three@0.170.0/build/**',async route=>{const name=new URL(route.request().url()).pathname.split('/').at(-1);if(!/^three[.a-z]+\.js$/.test(name))return route.abort();await route.fulfill({contentType:'text/javascript',headers:{'access-control-allow-origin':'*'},body:await readFile('node_modules/three/build/'+name,'utf8')});});
  await p.addInitScript(()=>localStorage.setItem('oddpot-prototype-v04','workshop-must-not-touch'));
  await p.goto(url);await p.waitForFunction(()=>document.documentElement.dataset.oddpot3d==='active',null,{timeout:20000});
  const act=id=>p.locator('[data-act="'+id+'"]');
  const fits=async()=>{const g=await p.locator('dialog').evaluate(d=>{const b=d.getBoundingClientRect(),c=d.querySelector('#window-content'),buttons=[...d.querySelectorAll('button')];return {bounds:b.top>=0&&b.bottom<=innerHeight,scroll:c.scrollHeight<=c.clientHeight+1,visible:buttons.every(x=>{const q=x.getBoundingClientRect();return q.top>=0&&q.bottom<=innerHeight&&q.left>=0&&q.right<=innerWidth;})}});assert.ok(g.bounds&&g.scroll&&g.visible,JSON.stringify(g));};
  await fits();await p.screenshot({path:out+'/result-'+width+'.png'});
  await act('result-next').click();await fits();await p.screenshot({path:out+'/star-'+width+'.png'});
  await act('star-next').click();await p.screenshot({path:out+'/growth-'+width+'.png'});
  await act('offer:table').click();await fits();await p.screenshot({path:out+'/purchase-'+width+'.png'});await act('buy:table').click();
  await p.waitForFunction(()=>document.querySelector('canvas[data-table-count]')?.dataset.tableCount==='4');assert.equal(await p.locator('#coins').textContent(),'86');assert.equal(await act('offer:table').count(),0);assert.ok(await act('offer:third').count());
  await act('stock').click();await fits();await p.locator('.grid-slots button').first().click();await p.screenshot({path:out+'/stock-'+width+'.png'});await p.keyboard.press('Escape');
  await act('menu').click();await fits();await act('slot:1').click();await p.locator('[data-act^="recipe:"]').first().click();await p.screenshot({path:out+'/menu-'+width+'.png'});await act('close').last().click();
  await act('settings').click();await act('preset:early').click();await act('result-next').click();assert.equal(await act('offer:table').count(),0);assert.equal(await act('offer:third').count(),0);assert.equal(await act('offer:grill').count(),0);
  assert.equal(await p.evaluate(()=>localStorage.getItem('oddpot-prototype-v04')),'workshop-must-not-touch');assert.deepEqual(errors,[]);await p.close();
 }
 // The same UI remains useful even if 3D downloads are blocked.
 const fallback=await browser.newPage({viewport:{width:320,height:568},isMobile:true,hasTouch:true});await fallback.route(/https:\/\/(cdn.jsdelivr.net|unpkg.com)\//,route=>route.abort());await fallback.goto(url);await fallback.locator('[data-act="result-next"]').click();await fallback.locator('[data-act="star-next"]').click();await fallback.locator('[data-act="offer:table"]').click();await fallback.locator('[data-act="buy:table"]').click();assert.equal(await fallback.locator('#coins').textContent(),'86');await fallback.close();
 console.log('Z2e workshop: 3 portrait sizes, real WebGL, actual purchases, slots, fallback and save isolation');
}finally{await browser?.close();server.kill();}
