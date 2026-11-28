import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {newGame,createService,setServicePaused,tick,resumeBreak,closeService,ROOM_EXPANSION_COST} from '../src/engine.js';

const storageKey='oddpot-prototype-v04';
const url='http://127.0.0.1:5173/';
const output='docs/screenshots/v014-full-ui';
await mkdir(output,{recursive:true});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5173','--strictPort'],{stdio:'ignore'});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const fixture=phase=>{
 const s=newGame(15742);s.onboarding.enabled=false;s.phase=phase;
 if(phase==='upgrade'){s.day=3;s.reputation=2;s.coins=500;}
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
   await page.waitForFunction(()=>globalThis.__oddpotBuild?.boot==='ready',null,{timeout:22000});
   assert.equal(await page.locator(`.stage.${phase}`).count(),1,`${phase} stage exists at ${width}`);
   const layout=await page.evaluate(()=>{
    const shell=document.querySelector('.game-shell').getBoundingClientRect(),stage=document.querySelector('.stage').getBoundingClientRect();
    return {shellBottom:shell.bottom,stageBottom:stage.bottom,stageHeight:stage.height};
   });
   assert.ok(layout.shellBottom<=height+1&&layout.stageBottom<=height+1&&layout.stageHeight>120,`${phase} fits ${width}×${height}: ${JSON.stringify(layout)}`);
   if(['forecast','menu','prep','upgrade'].includes(phase)){
    const hud=await page.evaluate(()=>{const chips=[...document.querySelectorAll('.ui2-hud-chip')].map(e=>e.getBoundingClientRect()),gear=document.querySelector('.ui2-hud .hud-gear').getBoundingClientRect();return {chips:chips.map(r=>({x:r.x,y:r.y,right:r.right,bottom:r.bottom})),gear:{x:gear.x,y:gear.y,right:gear.right,bottom:gear.bottom,width:gear.width,height:gear.height}};});
    assert.equal(hud.chips.length,3);assert.ok(hud.chips.every((r,i)=>Math.abs((r.y+r.bottom)/2-(hud.chips[0].y+hud.chips[0].bottom)/2)<2&&(i===0||r.x>=hud.chips[i-1].right-1)));assert.ok(hud.gear.x>=hud.chips[2].right-1&&hud.gear.right<=width&&hud.gear.width>=44&&hud.gear.height>=44&&Math.abs(hud.gear.y+hud.gear.height/2-(hud.chips[0].y+hud.chips[0].bottom)/2)<3,'compact HUD '+JSON.stringify(hud));
   }
   if(['forecast','menu'].includes(phase)){const hotspot=page.locator('.ui2-spot[data-act="'+(phase==='forecast'?'ui2-forecast':'ui2-menu')+'"]');assert.equal((await hotspot.getAttribute('data-ui2-anchor')).split(',')[0],'0.5');const b=await hotspot.boundingBox();assert.ok(Math.abs(b.x+b.width/2-width/2)<3);}
   if(width!==375&&['prep','report'].includes(phase))await page.screenshot({path:`${output}/${phase}-${width}.png`});
   if(phase==='forecast'){
    assert.ok(await page.locator('.z2c-hud').isVisible());assert.equal(await page.locator('.day-strip').count(),0);assert.ok(await page.locator('.z2c-hud [data-game-icon="coin"]').isVisible());
    const scene=page.locator('.ui2-room-host');
    assert.equal(await scene.count(),1,'border home uses the scene-first layout');
    const rect=await scene.boundingBox();
    assert.ok(rect.height>=layout.stageHeight*.98,'scene occupies at least 60% of stage');
    assert.equal(await scene.locator('#diner-canvas').count(),1);await page.evaluate(()=>{globalThis.__ui2Shell=document.querySelector('.game-shell');globalThis.__ui2Room=document.querySelector('.ui2-room-host');globalThis.__ui2Canvas=document.querySelector('#diner-canvas')});
    await page.waitForFunction(async()=>{const art=await import('/src/hearth_assets_v016a21.js?v=0.16-a21');return art.a21AtlasReady();});
    assert.ok(await page.evaluate(async()=>{const a=await import('/src/hearth_assets_v016a21.js?v=0.16-a21');const c=document.createElement('canvas');c.width=44;c.height=36;const ctx=c.getContext('2d');if(!a.a21Sprite(ctx,'table',0,0,44,36))return false;const pixels=ctx.getImageData(0,0,44,36).data;return pixels.some((v,i)=>i%4===3&&v===255)&&pixels.some((v,i)=>i%4===3&&v===0);}), 'transparent table sprite actually decodes and draws');

    for(const act of ['stock','book','bento','crew']){
     await page.locator('.ui2-room-dock [data-act="'+act+'"]').click();
     assert.ok(await page.locator('.sheet').isVisible(),act+' uses the existing sheet');
     assert.equal(await page.locator('.z2c13-sheet .sheet-header h2').count(),1);
     assert.equal(await page.locator('.z2c13-sheet').getAttribute('data-sheet-kind'),act);
     assert.ok(await page.evaluate(()=>document.activeElement.matches('.sheet-close')&&[...document.querySelector('.game-shell').children].filter(e=>!e.matches('.sheet,.sheet-backdrop')).every(e=>e.inert)), 'drawer focuses close and isolates background');
     await page.keyboard.press('Shift+Tab');assert.ok(await page.evaluate(()=>document.activeElement.closest('.z2c13-sheet')&&!document.activeElement.matches('.sheet-close')));
     await page.keyboard.press('Tab');assert.ok(await page.evaluate(()=>document.activeElement.matches('.sheet-close')));
     const head=await page.locator('.sheet-header').boundingBox(),body=await page.locator('.sheet-body').boundingBox(),windowBox=await page.locator('.sheet').boundingBox();assert.ok(head.y+head.height<=body.y+1);assert.ok(Math.abs(windowBox.y+windowBox.height/2-height/2)<3);assert.ok(await page.evaluate(()=>globalThis.__ui2Shell===document.querySelector('.game-shell')&&globalThis.__ui2Room===document.querySelector('.ui2-room-host')&&globalThis.__ui2Canvas===document.querySelector('#diner-canvas')));if(['stock','book','crew'].includes(act))assert.ok(await page.locator('.ui2-slots .ui2-slot').count()>0);
     if(act==='book'){
      assert.ok(await page.locator('.z2c13-atlas-count').isVisible());
      await page.locator('[data-book-region="all"]').click();assert.ok(await page.evaluate(()=>document.activeElement.dataset.bookRegion==='all'));assert.ok((await page.locator('[data-book-region="all"]').boundingBox()).height>=44);
      for(const type of ['WOK','POT','STEAM','GRILL']){await page.locator('[data-recipe-type="'+type+'"]').click();assert.equal(await page.locator('[data-recipe-type="'+type+'"]').getAttribute('aria-selected'),'true');assert.ok(await page.locator('.z2c13-atlas-count').isVisible());assert.ok(await page.locator('.book-item[data-book],.z2c13-empty').count()>0);}
      await page.locator('[data-book-tab="guests"]').click();assert.ok(await page.locator('.v102-guest-card').count()>0);assert.match(await page.locator('.sheet-header h2').innerText(),/客人图鉴/);
      await page.screenshot({path:output+'/z2c13-guest-'+width+'.png'});
      await page.locator('[data-book-tab="recipes"]').click();await page.locator('[data-recipe-type="WOK"]').click();await page.screenshot({path:output+'/z2c13-atlas-'+width+'.png'});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
     }
     if(act==='book')await page.keyboard.press('Escape');else await page.locator('[data-act="close-sheet"]').last().click();
     assert.equal(await page.locator('.sheet').count(),0);assert.ok(await page.evaluate(a=>document.activeElement.dataset.act===a,act),'focus returns to original scene action');
    }
    await page.locator('[data-act="settings"]').first().click();assert.equal(await page.locator('[data-act="stick-mode:floating"]').getAttribute('aria-pressed'),'true');await page.locator('[data-act="stick-mode:fixed"]').click();assert.equal(await page.locator('[data-act="stick-mode:fixed"]').getAttribute('aria-pressed'),'true');assert.equal(await page.evaluate(()=>localStorage.getItem('oddpot-ui-joystick-mode')),'fixed');await page.keyboard.press('Escape');await page.reload({waitUntil:'networkidle'});await page.locator('[data-act="settings"]').first().click();assert.equal(await page.locator('[data-act="stick-mode:fixed"]').getAttribute('aria-pressed'),'true');await page.locator('[data-act="stick-mode:floating"]').click();await page.keyboard.press('Escape');
    const door=page.locator('.ui2-spot[data-act="to-field"]');assert.ok(await door.isVisible());assert.equal(await scene.locator('.v076-home-primary').count(),0);assert.ok((await door.boundingBox()).height>=44);await page.screenshot({path:`${output}/z2c2-home-${width}.png`});
    await door.click();assert.ok(await page.locator('.z2c-hud').isVisible());assert.equal(await page.locator('.z2c4-routes [data-route]').count(),2);assert.equal(await page.locator('.z2c2-map-art').count(),1);assert.equal(await page.locator('.region-tabs,.route-options').count(),0);const map=await page.locator('.z2c2-map').boundingBox();assert.ok(map.height>=layout.stageHeight*.35,`departure map ${width}×${height}: ${map.height}px / stage ${layout.stageHeight}px (min ${layout.stageHeight*.35}px)`);await page.locator('[data-region="spring"]').click();assert.ok(await page.locator('[data-route="spring_safe"]').isVisible());await page.locator('[data-weapon="POT"]').click();assert.equal(await page.locator('[data-weapon="POT"]').getAttribute('aria-pressed'),'true');await page.screenshot({path:output+'/z2c2-expedition-'+width+'.png'});
    assert.equal(await page.locator('.stage.field').count(),1,'door opens the real field preparation');
    const departure=page.locator('.z2ed3-departure');assert.ok(await departure.isVisible());const travelLayout=await departure.evaluate(el=>({client:el.clientHeight,scroll:el.scrollHeight}));assert.ok(travelLayout.scroll<=travelLayout.client+2,JSON.stringify(travelLayout));for(const act of ['back-from-departure','departure-notebook','bento','skip-field'])assert.ok(await page.locator('[data-act="'+act+'"]').isVisible());await page.locator('[data-act="departure-notebook"]').click();assert.ok(await page.locator('.sheet .v013h-supply-hint').isVisible());assert.ok(await page.locator('.sheet .z2ed3-travel-details').isVisible());await page.keyboard.press('Escape');await page.locator('[data-act="back-from-departure"]').click();assert.equal(await page.locator('.stage.forecast').count(),1);await page.locator('.ui2-spot[data-act="to-field"]').click();assert.equal(await page.locator('[data-weapon="POT"]').getAttribute('aria-pressed'),'true');
    await page.locator('[data-route="spring_safe"]').click();
    await page.locator('[data-act="settings"]').click();await page.locator('[data-act="stick-mode:fixed"]').click();await page.keyboard.press('Escape');
    const geometry=await page.evaluate(()=>{const box=s=>document.querySelector(s)?.getBoundingClientRect();const a=box('#field-stick'),b=box('.field-skill'),d=box('.field-compact-dock');return {stick:a?.bottom,dock:d?.top,skill:b?.bottom};});
    assert.ok(geometry.stick<=geometry.dock&&geometry.skill<=geometry.dock,'player screenshot regression: field controls must not overlap dock '+JSON.stringify(geometry));
    await page.screenshot({path:output+'/ui2-field-controls-'+width+'.png'});
    assert.deepEqual(errors,[],`A1 home runtime errors at ${width}`);
    await page.close();
    continue;
   }
   if(phase==='field')assert.equal(await page.locator('[data-route]').count(),2);
   if(['research','menu','prep'].includes(phase)){assert.equal(await page.locator('.z2b-hud').count(),1);assert.equal(await page.locator('.brand,.day-strip').count(),0);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
   if(phase==='research'){
    assert.equal(await page.locator('.v063-food-picker button').count(),12);
    assert.equal(await page.locator('.z2b-tray-slot').count(),3);
    assert.equal(await page.locator('.z2b-tray-slot.filled').count(),2);
    const id=await page.locator('.z2b-tray-slot.filled').first().getAttribute('data-ingredient');
    await page.locator('.z2b-tray-slot.filled').first().click();
    assert.equal(await page.locator('.z2b-tray-slot.filled').count(),1);
    assert.ok(await page.locator('[data-act="start-research"]').isDisabled());
    await page.locator('.z2b-pantry [data-ingredient="'+id+'"]').click();
    assert.equal(await page.locator('.z2b-tray-slot.filled').count(),2);
    await page.locator('[data-act="method:stew"]').click();
    assert.equal(await page.locator('[data-act="method:stew"]').getAttribute('aria-pressed'),'true');
    assert.ok(await page.locator('.z2b-bench-vessel svg[data-game-icon="pot"]').count());
    await page.screenshot({path:output+'/z2b-bench-'+width+'.png'});
    await page.locator('[data-act="start-research"]').click();
    assert.ok(await page.locator('.v063-live-pan').isVisible());
    assert.equal(await page.locator('.v063-live-actions .action-row').count(),1);
    await page.locator('[data-live-drop="'+id+'"]').click();
    assert.ok(await page.locator('[data-live-drop="'+id+'"]').isDisabled());
    assert.ok(await page.locator('[data-act="live-action:gentle"]').isEnabled());
    await page.screenshot({path:output+'/z2b-live-'+width+'.png'});
   }
   if(phase==='menu'){
    await page.evaluate(()=>globalThis.__menuRoom=document.querySelector('#diner-canvas'));await page.locator('.ui2-spot[data-act="ui2-menu"]').click();
    assert.equal(await page.locator('.menu-line').count(),3);
    assert.equal(await page.locator('.v014-menu-value').count(),3);
    assert.equal(await page.locator('.menu-line .z2b-dish-art').count(),3);
    await page.locator('.menu-line').first().click();assert.ok(await page.locator('.sheet').isVisible());assert.ok(await page.locator('.z2b-menu-group').count()>0);
    const before=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).menu[0],storageKey);
    const choices=await page.locator('[data-menu-pick]:enabled').evaluateAll(es=>es.map(e=>e.dataset.menuPick));
    const picked=choices.find(x=>x.split(':')[1]!==before)||choices[0];assert.ok(picked);
    const allPicks=await page.locator('[data-menu-pick]').evaluateAll(es=>es.map(e=>e.dataset.menuPick));await page.locator('.ui2-slots .ui2-slot').nth(allPicks.indexOf(picked)).click();await page.locator('[data-menu-pick="'+picked+'"]').click();assert.equal(await page.locator('.sheet').getAttribute('data-sheet-kind'),'ui2-menu');
    assert.equal(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).menu[0],storageKey),picked.split(':')[1]);await page.keyboard.press('Escape');assert.ok(await page.evaluate(()=>globalThis.__menuRoom===document.querySelector('#diner-canvas')));await page.locator('[data-act="to-prep"]').click();assert.equal(await page.locator('.stage.prep').count(),1);assert.ok(await page.evaluate(()=>globalThis.__menuRoom===document.querySelector('#diner-canvas')),'same canvas from menu into preparation');
   }
   if(phase==='prep'){
    assert.ok(await page.locator('[data-act="open"]').isVisible());
    const scene=page.locator('.ui2-room-host'),a=await scene.boundingBox();assert.ok(a.height>=layout.stageHeight*.98);await page.locator('.ui2-room-dock [data-act="ui2-prep"]').click();const d=await page.locator('.sheet').boundingBox();assert.ok(d.y>a.y&&d.y+d.height<a.y+a.height);
    assert.equal(await page.locator('.kitchen-config-slot').count(),2);
    const stock=await page.locator('.ui2-room-dock [data-act="stock"]').count();assert.equal(stock,1);
    const dish=page.locator('.prep-item:enabled').first();if(await dish.count()){
      const id=(await dish.getAttribute('data-act')).split(':')[1],before=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),storageKey);
      await dish.click();const after=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),storageKey);
      assert.equal(after.prep[id],(before.prep[id]||0)+1);assert.ok(Object.keys(before.inventory).some(i=>(after.inventory[i]||0)<before.inventory[i]));
      const a2=await scene.boundingBox();assert.ok(Math.abs(a2.y-a.y)<1&&Math.abs(a2.height-a.height)<1,'preparation remains separated after action');
    }
    await page.screenshot({path:output+'/z2b-prep-'+width+'.png'});
    await page.locator('.v014-marketing summary').click();
    await page.locator('[data-act="promo:flyer"]').click();
    assert.ok(await page.locator('.v014-marketing').getAttribute('open')!==null,'campaign choice stays expanded');
   }
   if(phase==='service'){assert.ok(await page.locator('#diner-canvas').isVisible());const guideRect=await page.locator('.v4d-service-guide').boundingBox();assert.ok(guideRect&&guideRect.height<=60,'player screenshot regression: service guidance cannot stretch vertically');await page.locator('[data-act="service-ledger"]').click();await page.locator('.sheet [data-act="settings"]').click();await page.locator('[data-act="stick-mode:fixed"]').click();await page.keyboard.press('Escape');assert.equal(await page.locator('.sheet').getAttribute('data-sheet-kind'),'service-ledger');await page.keyboard.press('Escape');const pad=page.locator('#diner-stick');await pad.waitFor({state:'visible'});assert.ok(await pad.evaluate(e=>e.classList.contains('z2ed0-fixed')));const box=await pad.boundingBox();const center={x:box.x+box.width/2,y:box.y+box.height/2};await page.mouse.move(center.x,center.y);await page.mouse.down();await page.mouse.move(center.x+30,center.y-15);assert.notEqual(await page.locator('#diner-stick-knob').evaluate(e=>e.style.transform),'translate(0px, 0px)');await page.mouse.up();assert.ok(await pad.evaluate(e=>e.classList.contains('z2ed0-fixed')));assert.equal(await page.locator('#diner-stick-knob').evaluate(e=>e.style.transform),'translate(0px, 0px)');}
   if(phase==='report'){
    const sceneBox=await page.locator('.z2d2-report-stage').boundingBox(),ledgerBox=await page.locator('.z2d2-report-layout .z2c10-ledger').boundingBox();
    const resultBox=await page.locator('.z2ed1-result').boundingBox(),actions=await page.locator('.z2ed1-result-actions').boundingBox();assert.ok(sceneBox.height>=layout.stageHeight*.90&&resultBox.y>=sceneBox.y&&resultBox.y+resultBox.height<=sceneBox.y+sceneBox.height+1&&ledgerBox.y+ledgerBox.height<=actions.y+1&&actions.height>=44,'mandatory result overlays full restaurant, scroll body separate from actions');assert.equal(await page.locator('.z2ed1-result').getAttribute('role'),'dialog');assert.ok(resultBox.height<=layout.stageHeight*.66,'compact result must leave scene visible');assert.equal(await page.locator('.z2a-hud').isVisible(),false,'no HUD over mandatory result');await page.evaluate(()=>globalThis.__d1Canvas=document.querySelector('#diner-canvas'));await page.keyboard.press('Escape');assert.equal(await page.locator('.stage.report').count(),1);
    assert.equal(await page.locator('.ui2-room-host #diner-canvas').count(),1);
    assert.ok(await page.locator('.z2c10-paper .report-stats').isVisible());
    const title=await page.locator('.z2c10-paper .report-header').evaluate(el=>({color:getComputedStyle(el).color,weight:Number(getComputedStyle(el).fontWeight),size:parseFloat(getComputedStyle(el).fontSize)}));assert.equal(title.color,'rgb(69, 51, 40)');assert.ok(title.weight>=700&&title.size>=17);
    assert.equal(await page.locator('.z2c10-hud').count(),1);assert.equal(await page.locator('.brand,.day-strip').count(),0);
    assert.equal(await page.locator('.z2c10-paper .report-stats>div').count(),4);
    const saved=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),storageKey);
    assert.equal((await page.locator('.report-stats b').first().textContent()).trim(),String(saved.report.revenue));
    assert.equal(await page.locator('.z2c10-feedback .daily-goal-result').count(),1);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.equal(await page.locator('.v014-report-more').getAttribute('open'),null);
    await page.locator('.v014-report-more summary').click();
    assert.ok(await page.locator('.v12c-finance').isVisible());
    assert.equal(await page.locator('.report-scene > .v063-craft-report').count(),0);
    await page.locator('[data-act="details"]').click();assert.ok(await page.locator('.sheet').isVisible());
    await page.locator('[data-act="close-sheet"]').last().click();
    assert.notEqual(await page.locator('.v014-report-more').getAttribute('open'),null);
    await page.screenshot({path:output+'/z2c10-report-'+width+'.png'});
    await page.locator('[data-act="to-upgrade"]').click();assert.equal(await page.locator('.stage.upgrade').count(),1);if(await page.locator('[data-act="ui2-star-confirm"]').count())await page.locator('[data-act="ui2-star-confirm"]').click();assert.ok(await page.evaluate(()=>globalThis.__d1Canvas===document.querySelector('#diner-canvas')),'same canvas survives report to growth');
   }
   if(phase==='upgrade'){
    assert.equal(await page.locator('.z2c11-hud').count(),1);
    const scene=page.locator('.z2c11-growth-scene'),work=page.locator('.z2ed1-growth-tools');
    const a=await scene.boundingBox(),d=await work.boundingBox();assert.ok(a.height>=layout.stageHeight*.90&&d.y>=a.y&&d.y+d.height<=a.y+a.height+1);
    const layers=await page.evaluate(()=>{const r=s=>document.querySelector(s)?.getBoundingClientRect();return {hud:r('.ui2-hud-stack').bottom,caption:r('.z2c11-scene-caption').top,tools:r('.z2ed1-growth-tools').bottom,dock:r('.dock').top}});assert.ok(layers.hud<=layers.caption&&layers.tools<=layers.dock+1,'growth HUD/controls do not overlap '+JSON.stringify(layers));
    assert.equal(await page.locator('.ui2-room-host #diner-canvas').count(),1);
    await page.evaluate(()=>globalThis.__growthRoom=document.querySelector('#diner-canvas'));
    assert.equal(await page.locator('.z2c11-growth-group').count(),0);await page.locator('[data-act="growth-overview"]').click();assert.equal(await page.locator('.z2c11-growth-group').count(),3);await page.keyboard.press('Escape');
    const before=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),storageKey);
    await page.locator('[data-act="growth-offer:table"]').click();assert.equal(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).coins,storageKey),before.coins);await page.locator('[data-act="growth-buy:expand-room"]').click();
    const after=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),storageKey);
    assert.equal(after.dining.tableCount,3);assert.equal(after.coins,before.coins-ROOM_EXPANSION_COST);
    assert.match(await page.locator('.z2c11-scene-caption').innerText(),/3 桌 · 6 席/);
    const a2=await scene.boundingBox();assert.ok(Math.abs(a2.y-a.y)<1&&Math.abs(a2.height-a.height)<1);
    await page.locator('[data-act="growth-offer:bag"]').click();await page.locator('[data-act="growth-buy:upgrade-bag"]').click();
    const bag=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),storageKey);
    assert.equal(bag.bagSlots,(after.bagSlots||8)+2);
    assert.equal(bag.coins,after.coins-60);
    await page.screenshot({path:output+'/z2c11-growth-'+width+'.png'});
    await page.locator('[data-act="next-day"]').click();assert.equal(await page.locator('.stage.forecast').count(),1);assert.ok(await page.evaluate(()=>globalThis.__growthRoom===document.querySelector('#diner-canvas')),'same room across new business day');
   }
   assert.deepEqual(errors,[],`${phase} runtime errors at ${width}`);
   if(width!==375)await page.screenshot({path:`${output}/${phase}${['prep','report'].includes(phase)?'-details':''}-${width}.png`});
   await page.close();
  }
 }
 // Z2d3: real intermission at a viewport shorter than the smallest normal phone.
 const eventState=newGame(15742);eventState.onboarding.enabled=false;eventState.coins=500;eventState.phase='service';
 assert.ok(createService(eventState,{walkable:true}));setServicePaused(eventState,false);
 for(let t=0;t<160&&!eventState.service.breakAt&&!eventState.service.done;t++)tick(eventState,1);
 assert.ok(eventState.service.breakAt,'real intermission fixture');
 const short=await browser.newPage({viewport:{width:320,height:420},deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'zh-CN'});
 await short.addInitScript(([key,state])=>localStorage.setItem(key,JSON.stringify(state)),[storageKey,eventState]);
 await short.goto(url+'index.html',{waitUntil:'domcontentloaded'});
 const card=short.locator('.v075-event-card'),choices=card.locator('[data-choice]');await card.waitFor({state:'visible'});
 assert.ok(await choices.count()>=2);
 const geometry=await card.evaluate(el=>{const a=el.getBoundingClientRect(),p=el.parentElement.getBoundingClientRect(),s=getComputedStyle(el);return {bounded:a.top>=p.top-1&&a.bottom<=p.bottom+1,scroll:s.overflowY,ink:getComputedStyle(el.querySelector('p')).color,buttons:[...el.querySelectorAll('button')].map(b=>b.getBoundingClientRect().height)};});
 assert.ok(geometry.bounded);assert.equal(geometry.scroll,'auto');assert.equal(geometry.ink,'rgb(99, 74, 49)');assert.ok(geometry.buttons.every(h=>h>=44));
 const last=card.locator('[data-choice]:not(:disabled)').last();await last.scrollIntoViewIfNeeded();
 assert.ok(await last.evaluate(el=>{const a=el.getBoundingClientRect(),p=el.closest('.v075-event-card').getBoundingClientRect();return a.top>=p.top-1&&a.bottom<=p.bottom+1;}));
 assert.ok(await short.evaluate(()=>document.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',cancelable:true,bubbles:true}))), 'event allows native arrow scrolling, not movement capture');
 await short.screenshot({path:output+'/z2d3-event-short.png'});
 await last.click();await card.waitFor({state:'detached'});assert.ok(await short.evaluate(k=>!JSON.parse(localStorage.getItem(k)).service.breakAt,storageKey));
 await short.close();
 const offline=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'zh-CN'});
 await offline.addInitScript(([key,state])=>localStorage.setItem(key,JSON.stringify(state)),[storageKey,fixture('menu')]);
 await offline.goto(url+'standalone.html',{waitUntil:'networkidle'});
 await offline.locator('.ui2-room-dock [data-act="ui2-menu"]').click();assert.equal(await offline.locator('.v014-menu-value').count(),3,'offline menu uses same UI');
 await offline.close();
 const offlineHome=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'zh-CN'});
 await offlineHome.addInitScript(([key,state])=>localStorage.setItem(key,JSON.stringify(state)),[storageKey,fixture('forecast')]);
 await offlineHome.goto(url+'standalone.html',{waitUntil:'networkidle'});
 assert.equal(await offlineHome.locator('.ui2-room-host').count(),1,'offline uses same permanent world');
 await offlineHome.locator('.ui2-room-dock [data-act="stock"]').click();
 assert.ok(await offlineHome.locator('.sheet').isVisible(),'offline scene action works');
 await offlineHome.close();
 console.log('v0.14 real Chrome: eight stages at 320/375/390, sheets, marketing, ledger and offline menu passed');
}finally{if(browser)await browser.close();server.kill('SIGTERM');}
