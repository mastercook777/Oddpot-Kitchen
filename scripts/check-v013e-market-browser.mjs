// v0.13-E acceptance MUST use the actual game UI rather than only the RNG.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {newGame,ensureDailyMarket} from '../src/engine.js';

const dir='docs/screenshots/v013e-market-four';
await mkdir(dir,{recursive:true});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5173','--strictPort'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms)),key='oddpot-prototype-v04',url='http://127.0.0.1:5173/';
const states=()=>{
 const s=newGame(20261009);s.phase='forecast';s.coins=900;
 return s;
};
let browser;
async function launchState(page,s,resource='index.html'){
 // Seed the exact game save BEFORE app.js initializes. Post-load injection
 // can race against its initial render/save and silently reset to Day 1.
 await page.addInitScript(([k,v])=>localStorage.setItem(k,JSON.stringify(v)),[key,s]);
 await page.goto(url+resource,{waitUntil:'networkidle'});
}
async function checkFour(page,s,{legacy=false}={}){
 const expected=Object.keys(ensureDailyMarket(s).goods).sort();
 await page.locator('[data-act="stock"]').first().click();
 const rows=page.locator('.stock-list[aria-label="今日可采购食材"] .stock-line');
 assert.equal(await rows.count(),4,'four real product rows visible');
 assert.deepEqual((await rows.evaluateAll(nodes=>nodes.map(x=>x.dataset.marketId))).sort(),expected,'show exact RNG-supplied IDs');
 assert.match(await page.locator('.sheet').innerText(),/每天从 8 种普通食材随机上架 4 种/);
 assert.equal(await page.locator('.sheet').getByText('今日缺货').count(),0);
 assert.equal(await page.locator('.stock-list[aria-label="今日可采购食材"] [data-act^="buy:"]').count(),8,'both buy quantities for exactly four product rows');
 for(const id of expected)assert.equal(await page.locator('.stock-list[aria-label="今日可采购食材"] .stock-line[data-market-id="'+id+'"]').count(),1);
 const first=expected.find(x=>ensureDailyMarket(s).goods[x].stock>0);
 const price=ensureDailyMarket(s).goods[first].price,before=s.coins,qty=ensureDailyMarket(s).goods[first].stock;
 const target=page.locator('.stock-list[aria-label="今日可采购食材"] .stock-line[data-market-id="'+first+'"]');
 await target.locator('[data-act="buy:'+first+'"]').click();
 const result=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
 assert.equal(result.coins,before-price,'buy button debits actual money');
 assert.equal(result.market.goods[first].stock,qty-1,'buy button decrements offer');
 assert.equal(result.inventory[first],(s.inventory[first]||0)+1,'buy button delivers actual stock');
 assert.equal(Object.keys(result.market.goods).length,4);
 if(legacy)assert.equal(result.market.schema,4,'legacy state persisted upgraded schema');
 await page.screenshot({path:dir+'/'+(legacy?'legacy-':'new-')+page.viewportSize().width+'.png',fullPage:true});
 await page.locator('[data-act="close-sheet"]').last().click();
 assert.equal(await page.locator('.stock-list[aria-label="今日可采购食材"]').count(),0);
 return result;
}
try{
 let ok=false;for(let i=0;i<60;i++){try{if((await fetch(url+'index.html')).ok){ok=true;break}}catch{}await sleep(250)}assert.ok(ok,'vite startup');
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const [width,height] of [[320,568],[375,667],[390,844]]){
  const freshPage=()=>browser.newPage({viewport:{width,height},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const errors=[];
  const p1=await freshPage();p1.on('pageerror',e=>errors.push(e.message));
  const s=states();await launchState(p1,s);
  const result=await checkFour(p1,s);
  await p1.close();

  const tomorrow=structuredClone(result);tomorrow.day=tomorrow.day===3?1:tomorrow.day+1;
  if(result.day===3)tomorrow.cycle++;
  const nextMarket=ensureDailyMarket(tomorrow);
  assert.notDeepEqual(Object.keys(nextMarket.goods).sort(),Object.keys(result.market.goods).sort(),'actual next-day inventory rotates for default seed');
  const p2=await freshPage();p2.on('pageerror',e=>errors.push(e.message));
  await launchState(p2,tomorrow);
  await checkFour(p2,tomorrow);
  await p2.close();

  const old=states();old.market={dayKey:'1-1',schema:2,goods:{
    chicken:{initialStock:8,stock:4,price:7},
    garlic:{initialStock:7,stock:0,price:3},
    mushroom:{initialStock:9,stock:5,price:4}
  }};
  const p3=await freshPage();p3.on('pageerror',e=>errors.push(e.message));
  await launchState(p3,old);
  const migrated=await p3.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
  assert.equal(Object.keys(migrated.market.goods).length,4,'old three-product day supplemented to four');
  for(const id of ['chicken','garlic','mushroom'])assert.deepEqual(migrated.market.goods[id],old.market.goods[id],'legacy stock/price unchanged '+id);
  await checkFour(p3,old,{legacy:true});
  await p3.close();
  assert.deepEqual(errors,[],'no errors at '+width);
 }
 const offline=await browser.newPage({viewport:{width:390,height:844}});
 const s=states();await launchState(offline,s,'standalone.html');
 assert.match(await offline.title(),/0\.\d+\.\d+-alpha\.\d+/);
 await checkFour(offline,s);
 await offline.close();
 console.log('v0.13-E verified actual four displayed market rows, buy actions, spend, next-day rotation, old saves, 320/375/390 and offline');
} finally{if(browser)await browser.close();server.kill('SIGTERM');}
