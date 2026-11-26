import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,readFile} from 'node:fs/promises';
const out='docs/screenshots/z2e-workshop-v2';await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5173','--strictPort'],{stdio:'ignore'});
const url='http://127.0.0.1:5173/game-ui-workshop-v2.html';
let browser;try{
 let ready=false;for(let i=0;i<60;i++){try{if((await fetch(url)).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,250));}assert.ok(ready);
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const [width,height] of [[320,568],[375,667],[390,844]]){
  const p=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.route('https://cdn.jsdelivr.net/npm/three@0.170.0/build/**',async route=>{const name=new URL(route.request().url()).pathname.split('/').at(-1);if(!/^three[.a-z]+\.js$/.test(name))return route.abort();await route.fulfill({contentType:'text/javascript',headers:{'access-control-allow-origin':'*'},body:await readFile('node_modules/three/build/'+name,'utf8')});});
  await p.addInitScript(()=>localStorage.setItem('oddpot-prototype-v04','workshop-v2-must-not-touch'));
  await p.goto(url);const act=id=>p.locator('#dock [data-act="'+id+'"], #hotspots [data-act="'+id+'"], #play-controls [data-act="'+id+'"], #window-content [data-act="'+id+'"], #hud [data-act="'+id+'"], #map-label [data-act="'+id+'"], #equipment [data-act="'+id+'"]').first();
  const mode=m=>p.waitForFunction(m=>document.getElementById('lab').dataset.mode===m,m);
  const fit=async()=>{const g=await p.locator('dialog').evaluate(d=>{const b=d.getBoundingClientRect(),c=d.querySelector('#window-content');return {bounds:b.top>=0&&b.bottom<=innerHeight,scroll:c.scrollHeight<=c.clientHeight+1,visible:[...d.querySelectorAll('button')].every(x=>{const q=x.getBoundingClientRect();return q.top>=0&&q.bottom<=innerHeight&&q.left>=0&&q.right<=innerWidth})}});assert.ok(g.bounds&&g.scroll&&g.visible,JSON.stringify(g));};
  const shot=async n=>p.screenshot({path:out+'/'+n+'-'+width+'.png'});
  await mode('morning');await p.waitForFunction(()=>document.documentElement.dataset.oddpot3d==='active',null,{timeout:20000});await shot('morning');
  await act('stock').click();await fit();await p.keyboard.press('Escape');await mode('morning');
  await act('departure').click();await mode('departure');await p.waitForFunction(()=>document.documentElement.dataset.oddpotDeparture3d==='active',null,{timeout:20000});await shot('departure');
  await act('region:spring').click();await act('weapon:POT').click();await act('region:forest').click();await act('depart').click();await mode('field');
  await p.waitForFunction(()=>document.documentElement.dataset.oddpotForest3d==='active',null,{timeout:20000});await shot('field');await act('field-bag').click();await fit();await p.keyboard.press('Escape');await act('retreat').click();await fit();await shot('harvest');await act('research-enter').click();await mode('research');await fit();
  // Choose actual owned ingredients and cook using the original rules.
  for(const id of ['mushroom','garlic']){const btn=p.locator('#window-content [data-act="ingredient:'+id+'"]').first();if(!await btn.count()){await act('next-page').click()}await p.locator('#window-content [data-act="ingredient:'+id+'"]').first().click()}
  await act('begin-cook').click();await p.waitForFunction(()=>document.documentElement.dataset.oddpotResearch3d==='active',null,{timeout:20000});await act('drop:mushroom').click();await act('drop:garlic').click();await shot('research');await act('cook-action:flip').click();await act('finish-cook').click({timeout:10000});await fit();await shot('cook-result');await act('prep-enter').click();await mode('prep');await p.waitForFunction(()=>document.documentElement.dataset.oddpot3d==='active',null,{timeout:20000});await shot('prep');
  await act('menu').click();await fit();await shot('menu');await p.keyboard.press('Escape');await act('prep:0').click();await fit();await p.keyboard.press('Escape');
  await p.evaluate(()=>{window.__roomIdentity=document.getElementById('room')});
  await act('open-shop').click();await mode('service');await shot('service');await act('fast').click();
  for(let i=0;i<2;i++){await act('resume').waitFor({state:'visible',timeout:30000});await fit();await shot('service-event-'+i);await act('resume').click()}
  await mode('report');await fit();await shot('report');await act('result-next').click();await mode('growth');assert.ok(await p.evaluate(()=>window.__roomIdentity===document.getElementById('room')));await shot('growth');
  await act('offer:table').click();await fit();const before=Number(await p.locator('#coins').textContent());await act('buy:table').click();await p.waitForFunction(()=>document.querySelector('canvas[data-table-count]')?.dataset.tableCount==='4');assert.ok(Number(await p.locator('#coins').textContent())<before);assert.equal(await act('offer:table').count(),0);await act('next-day').click();await mode('morning');await shot('next-day');
  assert.equal(await p.evaluate(()=>localStorage.getItem('oddpot-prototype-v04')),'workshop-v2-must-not-touch');assert.deepEqual(errors,[]);assert.ok(await p.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1));await p.close();
 }
 const fallback=await browser.newPage({viewport:{width:320,height:568},isMobile:true,hasTouch:true});await fallback.route(/https:\/\/(cdn.jsdelivr.net|unpkg.com)\//,route=>route.abort());await fallback.goto(url);await fallback.locator('#dock [data-act="departure"]').click();await fallback.locator('#dock [data-act="depart"]').click();await fallback.locator('#dock [data-act="retreat"]').click();await fallback.locator('[data-act="research-enter"]').click();await fallback.keyboard.press('Escape');await fallback.locator('#dock [data-act="skip-research"]').click();assert.equal(await fallback.locator('#lab').getAttribute('data-mode'),'prep');await fallback.close();
 console.log('Z2e workshop2: five scenes, three portrait sizes, one full day, actual rules, same room canvas, fallback and save isolation');
}finally{await browser?.close();server.kill();}
