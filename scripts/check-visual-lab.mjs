import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const dir='docs/screenshots/visual-lab';await mkdir(dir,{recursive:true});
const server=spawn('python3',['-m','http.server','5179'],{stdio:'ignore'});
let browser;
try{
 for(let i=0;i<50;i++){try{if((await fetch('http://127.0.0.1:5179/visual-lab.html')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100))}
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
 for(const width of [320,375,390]){
  const p=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('http://127.0.0.1:5179/visual-lab.html');
  await p.waitForTimeout(500);
  const canvas=p.locator('#art');
  assert.ok(await canvas.isVisible());
  assert.ok(await canvas.evaluate(c=>c.width>0&&c.getContext('2d').getImageData(Math.floor(c.width/2),Math.floor(c.height/2),1,1).data[3]===255));
  await p.screenshot({path:dir+'/hd-'+width+'.png'});
  await p.locator('#night').click();await p.waitForTimeout(150);
  await p.screenshot({path:dir+'/night-'+width+'.png'});
  assert.equal(await p.locator('#night').getAttribute('aria-pressed'),'true');
  assert.equal(await p.evaluate(()=>localStorage.length),0);
  // Deterministically test CDN outage without depending on network/WebGL.
  await p.route('https://cdn.jsdelivr.net/**',route=>route.abort());
  await p.locator('[data-mode="3d"]').click();
  await p.waitForFunction(()=>document.querySelector('[data-mode=hd]').getAttribute('aria-pressed')==='true');
  assert.ok(await canvas.isVisible());
  assert.match(await p.locator('#message').textContent(),/加载失败/);
  assert.deepEqual(errors,[]);
  await p.close();
 }
 console.log('Canvas HD mobile smoke: 320/375/390, day/night, storage isolation, CDN fallback; real WebGL not tested');
}finally{await browser?.close();server.kill()}
