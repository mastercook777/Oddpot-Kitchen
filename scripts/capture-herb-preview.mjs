import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';

const out='docs/screenshots';
await mkdir(out,{recursive:true});
const server=spawn('npm',['run','dev','--','--host','127.0.0.1','--port','5173','--strictPort'],{stdio:['ignore','pipe','pipe']});
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
 browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:430,height:932},deviceScaleFactor:2,locale:'zh-CN',isMobile:true,hasTouch:true});
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const shots=[['harvest','herb-path-pixel-harvest-mobile.png'],['spawn','herb-path-pixel-entry-mobile.png'],['original','herb-path-original-comparison-mobile.png']];
 for(const [view,name] of shots){
  await page.goto('http://127.0.0.1:5173/art-preview.html?view='+view,{waitUntil:'networkidle'});
  await page.waitForFunction("window.__oddpotPreview?.rendered===true",{timeout:30000});
  if(errors.length)throw new Error(view+' has browser errors: '+errors.join('; '));
  const drawCalls=await page.locator('#scene').evaluate(canvas=>{
   const ctx=canvas.getContext('2d');const a=ctx.getImageData(canvas.width/2|0,canvas.height/2|0,1,1).data;
   return {pixel:[...a],size:[canvas.width,canvas.height]};
  });
  if(drawCalls.pixel[3]===0)throw new Error('Transparent center rendered in '+view);
  await page.screenshot({path:out+'/'+name,fullPage:true,animations:'disabled'});
  console.log('Saved '+name+' '+JSON.stringify(drawCalls));
 }
}finally{
 if(browser)await browser.close();
 server.kill('SIGTERM');
}
