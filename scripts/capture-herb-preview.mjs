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
 // B2 packs: exact formal controller, new preview entries, no fake save rewards.
 for(const zone of ['forest_garden','old_tree_edge','steam_crack','ember_edge'])for(const risk of [false,true]){
  await page.setViewportSize({width:390,height:844});
  await page.goto('http://127.0.0.1:5173/art-preview.html?zone='+zone+'&view='+(risk?'encounter_risk':'encounter'));
  await page.waitForFunction("window.__oddpotPreview?.rendered===true");
  const initial=await page.evaluate(()=>window.__oddpotPreview);
  if(initial.encounterVersion!=='0.11-B2'||initial.enemies.length<(risk?4:2)||initial.enemies.length>(risk?7:4))throw new Error('Wrong ecology pack count/version');
  await page.locator('#pause').click();await page.waitForTimeout(1050);await page.locator('#pause').click();
  const later=await page.evaluate(()=>window.__oddpotPreview.enemies);
  if(!later.some(e=>{const before=initial.enemies.find(b=>b.id===e.id);return before&&Math.hypot(before.x-e.x,before.y-e.y)>.02;}))throw new Error('Pack controller never moved '+zone);
  if(later.filter(e=>e.engaged).length>3)throw new Error('Too many ordinary active threats');
  await page.locator('.shell').screenshot({path:out+'/b2-'+zone+'-'+(risk?'risk':'safe')+'.png'});
  await page.locator('#camera').selectOption(risk?'encounter':'encounter_risk');
  await page.waitForFunction("window.__oddpotPreview?.rendered===true&&window.__oddpotPreview.paused");
 }
 console.log('B2 formal ecology packs, counts, movement, threat cap and dropdown switching passed.');
 // G: formal bodies and controls in the same independent field fixture.
 for(const view of ['boss_spore','boss_ember','merchant']){
  await page.setViewportSize({width:390,height:844});
  await page.goto('http://127.0.0.1:5173/art-preview.html?view='+view+'&zone='+(view==='boss_ember'?'ember_edge':'glow_mushroom'));
  await page.waitForFunction("window.__oddpotPreview?.rendered===true");
  await page.locator('.shell').screenshot({path:out+'/g-'+view+'-mobile.png'});
  if(view!=='merchant'){
   await page.locator('#pause').click();await page.waitForTimeout(1600);
   if(await page.evaluate(()=>window.__oddpotPreview.boss)!==view)throw new Error('Wrong boss fixture');
  }
 }
 // Validate real dropdown entries, including switching away from an NPC fixture.
 await page.locator('#camera').selectOption('boss_ember');
 await page.waitForFunction("window.__oddpotPreview?.boss==='boss_ember'");
 await page.locator('#camera').selectOption('boss_spore');
 await page.waitForFunction("window.__oddpotPreview?.boss==='boss_spore'");
 await page.locator('#camera').selectOption('spawn');
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
 // The stock page and real cooking DOM must decode the same ten sprites.
 await page.setViewportSize({width:320,height:568});
 await page.locator('[data-act="stock"]').first().click();
 await page.locator('.ingredient-icon').first().waitFor();
 await page.waitForFunction(()=>[...document.querySelectorAll('.ingredient-icon')].every(i=>i.complete&&i.naturalWidth>0));
 const stockUrls=await page.locator('[data-ingredient-icon]').evaluateAll(images=>Object.fromEntries(images.map(i=>[i.dataset.ingredientIcon,i.src])));
 if(Object.keys(stockUrls).length!==10)throw new Error('Missing stock ingredient sprites');
 await page.screenshot({path:out+'/g-stock-320.png'});
 // Isolated test save: research begins through the formal controls, with real inventory.
 const researchSave=await page.evaluate(async()=>{const {newGame}=await import('/src/engine.js?v=0.11.0-alpha.6');const s=newGame(20261013);s.phase='research';return s;});
 // Inject after navigation: the departing game's visibility handler legitimately saves its own state.
 await page.addInitScript(s=>localStorage.setItem('oddpot-prototype-v04',JSON.stringify(s)),researchSave);
 await page.reload();await page.locator('[data-act="start-research"]').waitFor();
 await page.locator('[data-act="start-research"]').click();
 await page.locator('[data-live-drop="chicken"]').click();
 await page.locator('[data-live-drop="chili"]').click();
 await page.waitForFunction(()=>document.querySelectorAll('[data-live-icon] .ingredient-icon').length===2);
 const food=await page.locator('[data-live-icon] .ingredient-icon').evaluateAll(images=>images.map(i=>({id:i.dataset.ingredientIcon,url:i.src,loaded:i.complete&&i.naturalWidth>0})));
 if(food.some(i=>!i.loaded||i.url!==stockUrls[i.id]))throw new Error('Pan/stock ingredient artwork differs');
 const identity=await page.locator('[data-live-icon="chicken"]').evaluate(el=>(window.__gFood=el,true));
 await page.waitForTimeout(350);
 if(!identity||!await page.locator('[data-live-icon="chicken"]').evaluate(el=>el===window.__gFood))throw new Error('Live food duplicated/replaced every frame');
 await page.screenshot({path:out+'/g-pan-320.png'});
 await page.goto('http://127.0.0.1:5173/standalone.html');
 await page.locator('#app .hud').waitFor();
 if(errors.length)throw new Error('G browser errors: '+errors.join('; '));
 console.log('G bosses, merchant, ten stock icons, matching real pan sprites and offline boot passed.');
 console.log('Eight ecology UI scenes, short screens, keyboard, pointer release and formal game boot passed.');
}finally{
 if(browser)await browser.close();
 server.kill('SIGTERM');
 server.stdout.destroy();server.stderr.destroy();
}
