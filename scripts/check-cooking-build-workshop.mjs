import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,readFile} from 'node:fs/promises';
const out='docs/screenshots/cb01';await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5173','--strictPort'],{stdio:'ignore'});
let browser;
try{const url='http://127.0.0.1:5173/cooking-build-workshop.html';let ready=false;for(let i=0;i<60;i++){try{if((await fetch(url)).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,250))}assert.ok(ready);
browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
for(const [width,height] of [[320,568],[375,667],[390,844]]){const p=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')console.log('BROWSER',m.text().slice(0,500))});await p.route('https://cdn.jsdelivr.net/npm/three@0.170.0/build/**',async route=>{const name=new URL(route.request().url()).pathname.split('/').at(-1);if(!/^three[.a-z]+\.js$/.test(name))return route.abort();await route.fulfill({contentType:'text/javascript',headers:{'access-control-allow-origin':'*'},body:await readFile('node_modules/three/build/'+name,'utf8')})});await p.addInitScript(()=>localStorage.setItem('oddpot-prototype-v04','cb01-sentinel'));
await p.goto(url);const act=id=>p.locator('[data-act="'+id+'"]').first();const mode=m=>p.waitForFunction(m=>document.getElementById('lab').dataset.mode===m,m,{timeout:90000});const shot=n=>p.screenshot({path:out+'/'+n+'-'+width+'.png'});await mode('config');if(width===390){await p.locator('[data-config=level]').selectOption('4');await p.locator('[data-config=stations]').selectOption('3')}await shot('config');await act('start').click();await mode('research');await act('ing:garlic').click();await act('ing:mushroom').click();await act('begin').click();await mode('cook');
await p.waitForFunction(()=>{const h=document.getElementById('pan'),c=h.querySelector('canvas[data-oddpot-research="3d"]');return document.documentElement.dataset.oddpotResearch3d==='active'&&h.dataset.y4bActive==='1'&&h.clientWidth>=180&&h.clientHeight>=100&&c&&c.clientWidth>=180&&c.clientHeight>=100&&c.width>=180&&c.height>=100},null,{timeout:20000});
await shot('empty-cookware');
if(width===390){await act('drop:garlic').click();await act('finish').waitFor({state:'visible'});await p.waitForFunction(()=>!document.querySelector('[data-act=finish]').disabled);await act('finish').click();await mode('result');assert.ok(await act('save').isDisabled());assert.ok((await p.locator('.cb-chef-tip').textContent()).includes('厨师心得'));await shot('failure-tip');await act('discard').click();await mode('research');assert.equal(await act('ing:garlic').getAttribute('aria-pressed'),'true');assert.equal(await act('ing:mushroom').getAttribute('aria-pressed'),'true');await act('begin').click();await mode('cook');}
await act('drop:garlic').click();await p.waitForTimeout(1300);await act('drop:mushroom').click();await act('action:flip').click();await p.waitForFunction(()=>[...document.querySelectorAll('[data-heat]')].every(x=>x.textContent==='熟透'),null,{timeout:12000});await p.waitForFunction(()=>{const h=document.getElementById('pan'),c=h.querySelector('canvas[data-oddpot-research="3d"]');return h.dataset.y4bActive==='1'&&h.clientHeight>=100&&c?.clientHeight>=100});await shot('cook');await act('finish').click();await mode('result');assert.ok(await act('save').isEnabled());await shot('identify');if(await p.locator('.cb-roll-range').count())assert.ok((await p.locator('.cb-roll-range').first().textContent()).includes('数值范围'));else assert.ok(await p.locator('.cb-chef-tip').count());await act('save').click();await mode('deck');if(width===390){const sample=p.locator('[data-act^="detail:"]').filter({hasText:'快手'}).first();await sample.click();assert.ok((await p.locator('#window-content .cb-roll-range').first().textContent()).includes('8–18'));await act('close').click();const item=p.locator('[data-act^="detail:"]').filter({hasText:'焦香蒜牛'}).first();await item.click();await act('equip').click();assert.ok((await p.locator('#budget').textContent()).includes('/ 13'))}await shot('deck');await act('prepare').click();await mode('prep');await act('prep:chicken_stew').click();await act('open').click();await mode('service');await p.waitForFunction(()=>document.documentElement.dataset.oddpot3d==='active',null,{timeout:20000});await shot('service');await act('speed').click();await act('speed').click();for(let j=0;j<2;j++){await act('resume').waitFor({state:'visible',timeout:45000});await shot('event-'+j);await act('resume').click()}await mode('report');await shot('report');assert.ok((await p.locator('#panel').textContent()).includes('实际词缀触发'));await act('retry').click();await mode('deck');assert.equal(await p.evaluate(()=>localStorage.getItem('oddpot-prototype-v04')),'cb01-sentinel');assert.deepEqual(errors,[]);assert.ok(await p.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1));await p.close()}

// Real network failure: fallback must be visible immediately, before any CDN timeout.
for(const [v,ingredients,world] of [['WOK',['garlic','mushroom'],'hearth'],['POT',['chicken','mushroom'],'hearth'],['GRILL',['beef','garlic'],'hearth'],['STEAM',['cloud_rice','chicken'],'cloud']]){
 const p=await browser.newPage({viewport:{width:320,height:568},isMobile:true,hasTouch:true});
 await p.route('**/three@0.170.0/**',route=>route.abort());
 await p.goto(url);
 const act=id=>p.locator('[data-act="'+id+'"]').first();
 if(world==='cloud')await p.locator('[data-config=world]').selectOption('cloud');
 await act('start').click();await act('vessel:'+v).click();for(const id of ingredients)await act('ing:'+id).click();await act('begin').click();
 await p.waitForFunction(v=>{const h=document.getElementById('pan'),f=h.querySelector('.cb-fallback-vessel');return h.dataset.vessel===v&&h.clientHeight>=100&&f.clientWidth>=70&&f.clientHeight>=60&&getComputedStyle(f).visibility==='visible'&&getComputedStyle(f).display!=='none'},v);
 await p.screenshot({path:out+'/fallback-empty-'+v+'.png'});
 await act('drop:'+ingredients[0]).click();await p.waitForFunction(()=>document.querySelectorAll('#fallback-food>span').length===1&&getComputedStyle(document.getElementById('fallback-food')).visibility==='visible');
 await p.screenshot({path:out+'/fallback-food-'+v+'.png'});
 if(v==='GRILL'){
  await act('drop:'+ingredients[1]).click();await act('lane:middle').click();
  assert.equal(await act('action:turn').count(),0);assert.ok(await act('action:brush').isEnabled());assert.ok(await act('action:smoke').isEnabled());
  await p.waitForFunction(()=>document.getElementById('cook-clock').textContent.includes('反面朝火'),null,{timeout:15000});
  await act('action:smoke').click();assert.ok(await act('action:smoke').isDisabled());
  await p.waitForFunction(()=>parseFloat(document.getElementById('cook-clock').textContent.replace('烹饪 ',''))>=5);
  await act('action:brush').click();
  await p.waitForFunction(()=>[...document.querySelectorAll('[data-heat]')].every(e=>e.textContent==='熟透'),null,{timeout:20000});
  await p.screenshot({path:out+'/grill-auto.png'});await act('finish').click();await act('save').waitFor({state:'visible'});assert.ok(await act('save').isEnabled());
 }

 await p.close();
}
console.log('CB01a empty and filled cookware 3D host dimensions, four offline fallbacks verified');
console.log('CB01 real three-viewport research, identification, deck, prep, service, events, report, retry and save isolation');
}finally{await browser?.close();server.kill()}
