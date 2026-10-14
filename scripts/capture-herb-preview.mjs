import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';

const out='docs/screenshots';
await mkdir(out,{recursive:true});
// Spawn Vite directly: killing npm leaves child Vite running and the screenshot job hangs.
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5173','--strictPort'],{stdio:['ignore','pipe','pipe']});
let logs='';
for(const ch of [server.stdout,server.stderr])ch.on('data',d=>{logs+=d.toString();});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function available(){
 for(let n=0;n<60;n++){
  try{const r=await fetch('http://127.0.0.1:5173/art-preview.html');if(r.ok)return;}
  catch{}
  await sleep(500);
 }
 throw new Error('Vite preview did not launch: '+logs.slice(-2500));
}
let browser;
try{
 await available();
 browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',timeout:65000,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:430,height:932},deviceScaleFactor:2,locale:'zh-CN',isMobile:true,hasTouch:true});
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const shots=[['harvest','herb-path-hybrid-gather-mobile.png'],['spawn','herb-path-hybrid-entry-mobile.png'],['pixel','herb-path-pixel-before-mobile.png'],['original','herb-path-original-comparison-mobile.png']];
 for(const [view,name] of shots){
  await page.goto('http://127.0.0.1:5173/art-preview.html?view='+view,{waitUntil:'domcontentloaded',timeout:15000});
  await page.waitForFunction("window.__oddpotPreview?.rendered===true",{timeout:12000});
  if(errors.length)throw new Error(view+' has browser errors: '+errors.join('; '));
  const drawCalls=await page.locator('#scene').evaluate(canvas=>{
   const ctx=canvas.getContext('2d');const a=ctx.getImageData(canvas.width/2|0,canvas.height/2|0,1,1).data;
   return {pixel:[...a],size:[canvas.width,canvas.height]};
  });
  if(drawCalls.pixel[3]===0)throw new Error('Transparent center rendered in '+view);
  await page.locator('.shell').screenshot({path:out+'/'+name,animations:'disabled',timeout:15000});
  console.log('Saved '+name+' '+JSON.stringify(drawCalls));
 }
 // Exercise all ecology mother styles through the actual UI, then short screens.
 const biomes=['herb_path','glow_mushroom','old_tree_edge','forest_garden','hot_spring_shallows','steam_crack','ember_edge','steam_lake'];
 for(const zone of biomes){
  await page.goto('http://127.0.0.1:5173/art-preview.html?view=harvest&zone='+zone,{waitUntil:'domcontentloaded'});
  await page.waitForFunction("window.__oddpotPreview?.rendered===true");
  if(errors.length)throw new Error('Browser errors: '+errors.join('; '));
  await page.locator('.shell').screenshot({path:out+'/hybrid-rollout-'+zone+'-mobile.png'});
 }
 for(const size of [{width:375,height:667},{width:320,height:568}]){
  await page.setViewportSize(size);
  await page.goto('http://127.0.0.1:5173/art-preview.html?view=spawn');
  await page.waitForFunction("window.__oddpotPreview?.rendered===true");
  const bounds=await page.locator('#joystick').boundingBox();
  if(!bounds||bounds.y<0||bounds.y+bounds.height>size.height)throw new Error('Joystick outside short screen');
  await page.locator('.shell').screenshot({path:out+'/hybrid-rollout-short-'+size.width+'.png'});
 }
 // Keyboard keeps working after a focused pause button, and pointer release stops movement.
 await page.goto('http://127.0.0.1:5173/art-preview.html?view=spawn');
 await page.waitForFunction("window.__oddpotPreview?.rendered===true");
 const before=await page.evaluate(()=>window.__oddpotPreview.pos.y);
 await page.locator('#pause').click();await page.keyboard.down('ArrowUp');await page.waitForTimeout(450);await page.keyboard.up('ArrowUp');
 const after=await page.evaluate(()=>window.__oddpotPreview.pos.y);
 if(!(after<before-.35))throw new Error('Keyboard movement did not work after button focus');
 await page.locator('#reset').click();
 const joy=await page.locator('#joystick').boundingBox();const x=joy.x+joy.width/2,y=joy.y+joy.height/2;
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x,y-32);await page.waitForTimeout(350);await page.mouse.up();await page.waitForTimeout(100);
 const released=await page.evaluate(()=>window.__oddpotPreview.pos.y);await page.waitForTimeout(220);
 const stopped=await page.evaluate(()=>window.__oddpotPreview.pos.y);
 if(Math.abs(released-stopped)>.12)throw new Error('Movement persisted after pointer release');
 if(errors.length)throw new Error('Browser errors: '+errors.join('; '));
 await page.goto('http://127.0.0.1:5173/index.html',{waitUntil:'domcontentloaded'});
 await page.locator('#app .hud').waitFor({state:'visible',timeout:15000});
 if(errors.length)throw new Error('Main game browser errors: '+errors.join('; '));
 console.log('Eight ecology UI scenes, short screens, keyboard, pointer release and formal game boot passed.');
}finally{
 if(browser)await browser.close();
 server.kill('SIGTERM');
 server.stdout.destroy();server.stderr.destroy();
}
