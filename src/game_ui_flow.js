import {labFixture,labOffers,labBuy,labNextHint,labProject} from './game_ui_lab_state.js?v=z2e1';
import {nextPhase,enterField,settleField,fieldWeaponChoices,selectedFieldWeaponType,selectFieldWeapon,availableBento,prepareBento,fieldBagSlotsUsed,beginLiveResearch,dropLiveIngredient,performLiveAction,stepLiveResearch,finishLiveResearch,liveCookPreview,selectMenuRecipe,recipeCookware,prepDish,createService,setServicePaused,tick,currentServiceEvent,chooseServiceEvent,resumeBreak,advanceWalkableInteraction,activateWalkableSpecial,closeService,advanceDay} from './engine.js';
import {startActionField,stepActionField,useFieldSkill,resolveFieldEvent} from './field_v04.js?v=y5c';
import {walkServiceHero} from './walkable_restaurant_v07.js';
import {dinerFloor,dinerGuide} from './restaurant_scene_v075.js?v=y4d';
import {LIVE_ACTIONS} from './cooking_v063.js?v=0.15.0-alpha.11';
import {drawDiner,drawField} from './scenes_v04.js?v=z2e2';
import {enableY2} from './three_y2_diner.js?v=z2e2';
import {enableY3} from './three_y3_forest.js?v=z2e2';
import {enableY4b} from './three_y4b_research.js?v=z2e2';
import {enableZ2c3} from './three_z2c3_departure.js?v=z2e2';
import {z2a2Icon as icon} from './ui_icons_z2a2.js?v=z2a3';
import {ingredientIconHtml} from './ingredient_icons_v011g.js';
import {ING,RECIPES} from './data.js';
const $=id=>document.getElementById(id),lab=$('lab'),world=$('world'),dialog=$('window'),content=$('window-content');
const esc=x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const names={WOK:'炒锅',POT:'炖锅',GRILL:'烤架',STEAM:'蒸笼'};
const modeNames={morning:'清晨',departure:'整备',field:'探索',research:'研发',prep:'开业准备',service:'营业中',report:'打烊',growth:'成长'};
const sceneOf=m=>['morning','prep','service','report','growth'].includes(m)?'room':m;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let s,mode='morning',view='',back='',selection='',page=0,menuSlot=0,region='forest',risk=false,vessel='WOK',ingredients=[],fast=false,acc=0,starsBefore=1,toastTimer=0,renderer='加载中',axis=[0,0],keys=new Set(),pointer=null,opener=null;
const gold=(act,label,glyph='',disabled=false)=>'<button type="button" class="gold" data-act="'+act+'" '+(disabled?'disabled':'')+'>'+(glyph?icon(glyph):'')+label+'</button>';
const minor=(act,label,extra='')=>'<button type="button" class="minor" data-act="'+act+'" '+extra+'>'+label+'</button>';
const ib=(act,glyph,label)=>'<button type="button" class="icon-btn" data-act="'+act+'" aria-label="'+label+'">'+icon(glyph)+'<span>'+label+'</span></button>';
const title=(t,close=true)=>'<header class="ribbon" id="window-title">'+t+'</header>'+(close?'<button class="close" data-act="close" aria-label="关闭窗口"><span>×</span></button>':'');
const metric=(g,n,l)=>'<div class="metric">'+icon(g)+'<b>'+esc(n)+'</b><small>'+l+'</small></div>';
const chip=(g,txt)=>'<div class="hud-chip">'+icon(g)+txt+'</div>';
const food=(id,n,act,pressed=false)=>'<button class="slot" data-act="'+act+'" aria-label="'+esc(ING[id]?.name||id)+'" aria-pressed="'+pressed+'">'+ingredientIconHtml(id,32)+(n!==null?'<span>'+n+'</span>':'')+'</button>';
function reset(){
 s=labFixture('star');s.phase='forecast';s.coins=620;s.management.openingCoins=620;s.crew.helper.hired=true;s.crew.waiter.hired=true;s.crew.helper.onDuty=true;s.crew.waiter.onDuty=true;
 for(const id of Object.keys(ING))if(['mushroom','garlic','chicken','cabbage','potato','onion'].includes(id))s.inventory[id]=Math.max(s.inventory[id]||0,12);
 mode='morning';view=back='';if(dialog.open)dialog.close();region='forest';risk=false;vessel='WOK';ingredients=[];fast=false;acc=0;starsBefore=s.chapterProgress.stars;stopInput();switchScene('morning',true);
}
function stopInput(){axis=[0,0];keys.clear();pointer=null}
function notify(msg){clearTimeout(toastTimer);$('toast').textContent=msg;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,1800)}
function switchScene(next,force=false){
 const old=world.dataset.scene,target=sceneOf(next);mode=next;lab.dataset.mode=next;lab.dataset.scene=target;stopInput();
 if(old!==target||force){
  if(old==='room'&&target!=='room')globalThis.__oddpotY2Renderer?.leave();
  if(old==='departure'&&target!=='departure')globalThis.__oddpotDepartureRenderer?.leave();
  if(old==='field'&&target!=='field')globalThis.__oddpotY3Renderer?.leave();
  if(old==='research'&&target!=='research')globalThis.__oddpotY4bRenderer?.leave();
  for(const id of ['room','departure','field','research'])$(id+'-host').hidden=id!==target;
  world.dataset.scene=target;renderer='加载中';
  if(!reduced){$('curtain').classList.remove('cross');void $('curtain').offsetWidth;$('curtain').classList.add('cross')}
 }
 renderUI();
}
function open(which,from=''){
 stopInput();if(!dialog.open)opener=document.activeElement;view=which;back=from;renderWindow();
 if(!dialog.open)dialog.showModal();
}
function hide(){
 if(dialog.open)dialog.close();view=back='';stopInput();
}
function dismiss(){
 if(['harvest','cook-result','result','star','service-event','field-event'].includes(view))return;
 if(view==='research-select'&& !s.cook){hide();renderUI();return}
 if(back){const v=back;open(v);return}
 if(view==='menu'&&mode==='prep')s.phase='prep';
 hide();renderUI();if(opener?.isConnected)opener.focus({preventScroll:true});
}
function renderUI(){
 const phase=modeNames[mode],day=(s.cycle-1)*3+s.day;
 let left=chip('coin','<b id="coins">'+s.coins+'</b>')+chip('star',s.chapterProgress.stars+' · 第 '+day+' 天');
 if(mode==='field')left=chip('heart','<b id="hp">'+s.field.hp+'/3</b>')+chip('bag','<b id="bag-count">'+fieldBagSlotsUsed(s.field)+'/'+s.field.capacity+'</b>');
 if(mode==='service'){const v=s.service;left=chip('moon','<b id="live-status">'+Math.min(v.wave+1,3)+'/3 · '+v.orders.filter(o=>o.status==='served').length+'/'+v.orders.length+'</b>')+chip('energy','<b id="energy">'+(v.hero?.energy??6)+'</b>')+chip('coin','<b id="coins">'+s.coins+'</b>')}
 if(mode==='research')left=chip('cook','<b>料理研发</b>')+chip('coin','<b id="coins">'+s.coins+'</b>');
 $('hud').innerHTML='<div class="hud-stack">'+left+'</div><div class="hud-right"><small class="lab-label" id="render-label">工坊 2.0 · '+phase+' · '+renderer+'</small>'+ib('settings','gear','设置')+'</div>';
 let dock='',hint='',controls='';
 if(mode==='morning'){dock='<div class="dock-left">'+ib('stock','bag','库存')+ib('crew','queue','员工')+ib('forecast','target','预报')+'</div>'+gold('departure','出发','route');hint='点击门口出发，或先查看今日备料。'}
 if(mode==='departure'){dock='<div class="dock-left">'+ib('home','home','返店')+ib('bento','bento','便当')+'</div>'+gold('depart','确认出发','route');controls='<div class="route-pair">'+route('safe','采集路线','bag',!risk)+route('risk','狩猎路线','wok',risk)+'</div>';renderDeparture()}
 if(mode==='field'){dock='<div class="dock-left">'+ib('field-bag','bag','背包')+'</div>'+gold('retreat','返回餐厅','home');controls=dpad()+ '<button class="skill" data-act="skill">'+icon(s.field.weapon?.type?.toLowerCase()||'wok')+'<span id="skill-text">技能</span></button>';hint=s.field.zoneTitle+' · 移动自动采集与攻击'}
 if(mode==='research'){dock='<div class="dock-left">'+ib('stock','bag','库存')+'</div>'+(s.cook?gold('finish-cook','出锅','plate',s.cook.elapsed<1.2):gold('skip-research','回餐厅','home'));controls=researchControls()}
 if(mode==='prep'){dock='<div class="dock-left">'+ib('menu','menu','菜单')+ib('stock','bag','库存')+ib('crew','queue','员工')+'</div>'+gold('open-shop','开始营业','play');hint='点选厨位备餐，菜单确认后开店。'}
 if(mode==='service'){dock='<div class="dock-left">'+ib('pause','pause',s.service.paused?'继续':'暂停')+ib('ledger','ledger','账本')+'</div>'+gold('fast',fast?'正常速度':'快进营业','next');controls=dpad()+'<button class="skill" data-act="special">'+icon('energy')+'<span>技能</span></button>';hint='靠近厨位、出餐台与餐桌进行操作'}
 if(mode==='growth'){dock='<div class="dock-left">'+ib('stock','bag','库存')+ib('ledger','ledger','账本')+'</div>'+gold('next-day','下一天','next');hint=labNextHint(s)||'选择要升级的物件，或结束今天。'}
 $('dock').innerHTML=dock;$('hint').textContent=hint;$('play-controls').innerHTML=controls;renderSpots();updateLive();
}
function route(id,label,g,checked){return '<button class="route-choice" data-act="route:'+id+'" aria-pressed="'+checked+'">'+icon(g)+label+'</button>'}
function renderDeparture(){
 const host=$('departure-host'),map=host.querySelector('.z2c2-map');map.dataset.departureRegion=region;
 $('map-label').innerHTML=route('forest','晨露森林','route',region==='forest').replace('route:forest','region:forest')+route('spring','热泉峡谷','route',region==='spring').replace('route:spring','region:spring');
 $('equipment').innerHTML=fieldWeaponChoices(s).map(q=>'<button class="icon-btn" data-act="weapon:'+q.type+'" data-weapon="'+q.type+'" data-weapon-level="'+q.level+'" aria-pressed="'+(selectedFieldWeaponType(s)===q.type)+'">'+icon(q.type.toLowerCase())+names[q.type]+' Lv.'+q.level+'</button>').join('');
}
function dpad(){return '<div class="dpad" aria-label="移动方向">'+[['0,-1','↑','上'],['-1,0','←','左'],['1,0','→','右'],['0,1','↓','下']].map(([a,t,n])=>'<button data-axis="'+a+'" aria-label="向'+n+'移动">'+t+'</button>').join('')+'</div>'}
function researchControls(){
 if(!s.cook){$('cook-top').innerHTML='<div class="heat-pill">选择食材与厨具</div>';return '<div class="cook-controls">'+gold('research-select','选择食材','bag')+'</div>'}
 const c=s.cook;$('cook-top').innerHTML='<div class="heat-pill" id="heat">火候 · '+c.elapsed.toFixed(1)+' s</div>';
 return '<div class="cook-controls"><div class="cook-ingredients">'+c.ids.map(id=>food(id,null,'drop:'+id,c.dropped.some(x=>x.id===id))).join('')+'</div><div class="cook-actions">'+LIVE_ACTIONS[c.vessel].map(a=>gold('cook-action:'+a.id,a.name,'cook',!c.dropped.length||c.actions.some(x=>x.type===a.id))).join('')+'</div></div>';
}
function renderSpots(){
 if(!['morning','prep','growth'].includes(mode)){$('hotspots').innerHTML='';return}
 const g=dinerFloor(s),w=world.clientWidth,h=world.clientHeight;let items=[];
 if(mode==='morning')items=[{id:'departure',icon:'route',title:'出发',at:g.entrance},{id:'forecast',icon:'target',title:'今日预报',at:g.passFurniture}];
 if(mode==='prep')items=s.kitchen.slots.map((x,i)=>({id:'prep:'+i,icon:x.type.toLowerCase(),title:names[x.type]+' 备餐',at:[g.stoveLeft,g.stoveRight,g.reservedStove][i]}));
 if(mode==='growth')items=labOffers(s).map(o=>({...o,id:'offer:'+o.id,title:o.title+' · '+o.cost+' 金币'}));
 const used=[];$('hotspots').innerHTML=items.map(o=>{
  let p=o.at?(renderer==='2D'?{x:o.at.x*w,y:o.at.y*h-20}:labProject(o.at,w,h)):{x:w-39,y:h-145};p.y=Math.max(90,Math.min(h-120,p.y));while(used.some(q=>Math.hypot(p.x-q.x,p.y-q.y)<49)&&p.y<h-175)p.y+=51;used.push(p);
  return '<button class="spot" data-act="'+o.id+'" style="left:'+p.x+'px;top:'+p.y+'px" aria-label="'+esc(o.title)+'" data-affordable="'+(o.affordable!==false)+'">'+icon(o.icon)+(mode==='growth'?'<em>↑</em>':'')+'</button>';
 }).join('');
}
function renderWindow(){
 let body='',r=s.report,items,part,pages;
 if(view==='stock'||view==='field-bag'||view==='harvest'){
  const bag=view==='stock'?s.inventory:view==='harvest'?s.field?.winnings:s.field?.bag;items=Object.entries(bag||{}).filter(([id,n])=>ING[id]&&n>0);pages=Math.max(1,Math.ceil(items.length/8));page=Math.min(page,pages-1);part=items.slice(page*8,page*8+8);
  const item=items.find(([id])=>id===selection);
  body=title(view==='harvest'?'探索收获':view==='field-bag'?'野外背包':'食材柜',view!=='harvest')+'<div class="grid-slots">'+part.map(([id,n])=>food(id,n,'item:'+id,id===selection)).join('')+'</div><div class="slot-detail">'+(item?esc(ING[item[0]].name)+' · '+item[1]+'份':items.length?'点选食材查看':'本次没有带回食材')+'</div>'+(pages>1?'<div class="pager">'+minor('prev-page','‹',page===0?'disabled':'')+'<span>'+(page+1)+' / '+pages+'</span>'+minor('next-page','›',page>=pages-1?'disabled':'')+'</div>':'')+(view==='harvest'?gold('research-enter','回店研发','cook'):gold('close','完成','next'));
 }else if(view==='forecast'){
  body=title('今日备料')+'<div class="upgrade-hero">'+icon('target')+'<h2>营业前的准备</h2><p>探索带回食材，再研发和备餐。</p></div><div class="grid-slots">'+s.menu.map(id=>RECIPES[id]?.ids[0]).filter(Boolean).map(id=>food(id,s.inventory[id]||0,'forecast-item:'+id)).join('')+'</div>'+gold('close','明白','next');
 }else if(view==='crew'){
  body=title('食堂伙伴')+'<div class="crew-grid">'+[['helper','帮厨','cook'],['waiter','侍者','carry']].map(([id,label,g])=>'<div class="crew-slot">'+icon(g)+'<b>'+label+'</b><small>'+(s.crew[id]?.hired?'在职 · Lv.'+(s.crew[id].level||1):'未雇佣')+'</small></div>').join('')+'</div><p class="note">工坊样本已配备员工；正式招聘和调度将在迁移时接入。</p>'+gold('close','返回餐厅','home');
 }else if(view==='bento'){
  const opts=availableBento(s).slice(0,4);body=title('带上便当')+'<div class="compact-list">'+(s.bento?'<div class="notice">已备好 '+esc(RECIPES[s.bento.recipeId]?.name)+'</div>':opts.map(o=>minor('bento:'+o.recipeId,esc(o.name)+' · '+esc(o.description),o.canPrepare?'':'disabled')).join('')||'<p>暂无可制作便当</p>')+'</div>'+gold('close','完成','next');
 }else if(view==='research-select'){
  items=Object.entries(s.inventory).filter(([id,n])=>ING[id]&&n>0);pages=Math.max(1,Math.ceil(items.length/8));page=Math.min(page,pages-1);part=items.slice(page*8,page*8+8);
  body=title('灶台研发')+'<div class="actions">'+minor('vessel:WOK','炒锅',vessel==='WOK'?'aria-pressed="true"':'')+minor('vessel:POT','炖锅',vessel==='POT'?'aria-pressed="true"':'')+'</div><div class="research-select">'+[0,1,2].map(i=>ingredients[i]?food(ingredients[i],null,'ingredient:'+ingredients[i],true):'<span class="slot" aria-label="空食材槽">＋</span>').join('')+'</div><div class="grid-slots">'+part.map(([id,n])=>food(id,n,'ingredient:'+id,ingredients.includes(id))).join('')+'</div><div class="pager">'+minor('prev-page','‹',page===0?'disabled':'')+'<span>食材 '+ingredients.length+'/3 · '+(page+1)+'/'+pages+'</span>'+minor('next-page','›',page>=pages-1?'disabled':'')+'</div>'+gold('begin-cook','开始烹饪','cook',ingredients.length<2);
 }else if(view==='cook-result'){
  const c=s.lastCook;body=title(c?.sellable?'料理完成':'研发结束',false)+'<div class="star-hero">'+icon('plate')+'<h2>'+esc(c?.sellable?(RECIPES[c.recipeId]?.name||'新料理'):'本次未达到上架条件')+'</h2><p>品质 '+esc(c?.quality??'—')+(c?.firstDiscovery&&c.sellable?' · 新发现':'')+'</p></div>'+gold('prep-enter','返回餐厅','home');
 }else if(view==='menu'){
  const recipes=Object.keys(s.recipes).filter(id=>RECIPES[id]);pages=Math.max(1,Math.ceil(recipes.length/8));page=Math.min(page,pages-1);
  body=title('今日菜单')+'<div class="menu-slots">'+s.menu.map((id,i)=>'<button class="slot" data-act="slot:'+i+'" aria-pressed="'+(menuSlot===i)+'" aria-label="菜单第'+(i+1)+'格">'+icon('plate')+'<small>'+esc(RECIPES[id]?.name||'空')+'</small></button>').join('')+'</div><div class="slot-detail">点选菜谱替换第 '+(menuSlot+1)+' 格</div><div class="grid-slots">'+recipes.slice(page*8,page*8+8).map(id=>'<button class="slot" data-act="recipe:'+id+'" aria-label="'+esc(RECIPES[id].name)+'" aria-pressed="'+(s.menu[menuSlot]===id)+'">'+ingredientIconHtml(RECIPES[id].ids[0],32)+'</button>').join('')+'</div>'+(pages>1?'<div class="pager">'+minor('prev-page','‹',page===0?'disabled':'')+'<span>'+(page+1)+'/'+pages+'</span>'+minor('next-page','›',page>=pages-1?'disabled':'')+'</div>':'')+gold('close','完成','next');
 }else if(view==='prep'){
  const k=s.kitchen.slots[Number(selection)],dishes=[...new Set(s.menu)].filter(id=>recipeCookware(RECIPES[id])===k?.type);
  body=title(names[k?.type]+' · 备餐')+'<div class="compact-list">'+dishes.map(id=>minor('prep-dish:'+id,esc(RECIPES[id].name)+' · 已备 '+(s.prep[id]||0)+' 份')).join('')+'</div><p class="note">预制会实际消耗工坊食材。</p>'+gold('close','完成','next');
 }else if(view==='field-event'){
  const n=s.field.nodes.find(n=>n.key===s.field.activeEvent);body=title('野外奇遇',false)+'<div class="upgrade-hero">'+icon('warn')+'<h2>'+esc(n?.title||'偶遇旅人')+'</h2><p>本轮先验证事件窗口，完整奇遇选项保留在正式游戏。</p></div><div class="actions">'+minor('retreat','返回餐厅')+gold('event-leave','继续赶路','route')+'</div>';
 }else if(view==='service-event'){
  const e=currentServiceEvent(s);body=title('营业插曲',false)+'<div class="notice">'+esc(e?.title||'下一波客人')+'</div><p class="note">'+esc(e?.description||'继续营业')+'</p><div class="compact-list">'+(e?.choices||[]).map(c=>minor('service-choice:'+c.id,esc(c.label)+' · '+esc(c.detail))).join('')+'</div>'+gold('resume','继续营业','play');
 }else if(view==='result'){
  const gained=s.chapterProgress.stars>starsBefore;body=title('今日收工',false)+'<div class="result-hero">'+icon('coin')+'<small>经营利润</small><strong>'+(r.profit>=0?'+':'')+r.profit+'</strong></div><div class="metrics">'+metric('coin',r.revenue,'收入')+metric('plate',r.served+'/'+r.totalOrders,'上菜')+metric('heart',r.sat,'满意')+'</div><div class="notice">'+(gained?icon('star')+' 获得万味星章！':esc(r.suggested||'今日营业结束'))+'</div><div class="actions">'+minor('result-ledger','账本')+gold('result-next','继续','next')+'</div>';
 }else if(view==='star'){
  body=title('万味评鉴',false)+'<div class="star-hero">'+icon('star')+'<h2>获得万味星章！</h2><p>当前 '+s.chapterProgress.stars+' 星</p></div>'+gold('growth-enter','回到餐厅','home');
 }else if(view==='ledger'){
  const rows=r?[['收入',r.revenue],['利润',r.profit],['成功上菜',r.served+'/'+r.totalOrders],['满意度',r.sat],['成本',r.cost]]:[['营业时间',s.service?.time||0],['收入',s.service?.income||0],['已上菜',s.service?.orders?.filter(o=>o.status==='served').length||0]];
  body=title('经营账本')+'<div class="ledger">'+rows.map(([k,v])=>'<p>'+k+' <b style="float:right">'+v+'</b></p>').join('')+'</div>'+gold('close','合上账本');
 }else if(view==='offer'){
  const o=labOffers(s).find(x=>x.id===selection);if(!o){dismiss();return}body=title('食堂成长')+'<div class="upgrade-hero">'+icon(o.icon)+'<h2>'+esc(o.title)+'</h2><p>'+esc(o.description)+'</p></div><div class="cost-line">'+icon('coin')+o.cost+' 金币</div><div class="actions">'+minor('close','取消')+gold('buy:'+o.id,o.affordable?'确认升级':'金币不足','coin',!o.affordable)+'</div>';
 }else if(view==='settings'){
  body=title('工坊 2.0')+'<div class="notice">独立内存样本 · 已有首星与员工</div><p class="note">实际探索、研发、营业与购买规则。快进仅加快时间。不会读写正式存档。</p><div class="actions">'+minor('retry','重试3D')+gold('reset','重新开始')+'</div>'+minor('close','返回游戏');
 }
 content.innerHTML=body;
 if(dialog.open)content.querySelector('button:not(:disabled)')?.focus({preventScroll:true});
}
function startResearch(){hide();ingredients=[];page=0;vessel='WOK';switchScene('research');open('research-select')}
function toPrep(){hide();nextPhase(s,'prep');switchScene('prep')}
function toGrowth(){hide();nextPhase(s,'upgrade');switchScene('growth')}
function fieldEnd(){hide();page=0;selection='';stopInput();open('harvest')}
function closeNight(){
 if(mode!=='service'||!s.service.done)return;const r=closeService(s);if(!r)return;fast=false;hide();switchScene('report');open('result');
}
function handle(a){
 if(a==='close'){dismiss();return}
 if(a==='settings'){open('settings');return}
 if(a==='reset'){reset();return}
 if(a==='retry'){for(const key of ['__oddpotY2Renderer','__oddpotY3Renderer','__oddpotY4bRenderer','__oddpotDepartureRenderer'])globalThis[key]?.retry();notify('正在重试3D');return}
 if(a==='stock'||a==='field-bag'){selection='';page=0;open(a);return}
 if(a==='crew'||a==='forecast'||a==='bento'||a==='ledger'){open(a);return}
 if(a==='departure'&&mode==='morning'){nextPhase(s,'field');switchScene('departure');return}
 if(a==='home'&&mode==='departure'){nextPhase(s,'forecast');switchScene('morning');return}
 if(a.startsWith('region:')){region=a.slice(7);risk=false;renderUI();return}
 if(a.startsWith('route:')){risk=a.endsWith('risk');renderUI();return}
 if(a.startsWith('weapon:')){selectFieldWeapon(s,a.slice(7));renderUI();return}
 if(a.startsWith('bento:')){if(prepareBento(s,a.slice(6)))renderWindow();else notify('无法准备便当');return}
 if(a==='depart'&&mode==='departure'){const route=(region==='spring'?'spring_':'')+(risk?'risk':'safe');if(enterField(s,route)&&startActionField(s)){switchScene('field')}else notify('无法出发');return}
 if(a==='skill'&&mode==='field'){useFieldSkill(s);return}
 if(a==='retreat'&&mode==='field'){if(!s.field.settled)settleField(s,'retreat');fieldEnd();return}
 if(a==='event-leave'){if(resolveFieldEvent(s,'leave')){hide();renderUI()}else{hide();if(!s.field.settled)settleField(s,'retreat');fieldEnd()}return}
 if(a==='research-enter'){startResearch();return}
 if(a==='research-select'){page=0;open('research-select');return}
 if(a==='skip-research'&&!s.cook){toPrep();return}
 if(a.startsWith('vessel:')){vessel=a.slice(7);renderWindow();return}
 if(a.startsWith('ingredient:')){const id=a.slice(11);if(ingredients.includes(id))ingredients=ingredients.filter(x=>x!==id);else if(ingredients.length<3)ingredients.push(id);renderWindow();return}
 if(a==='begin-cook'){if(beginLiveResearch(s,ingredients,vessel)){hide();renderUI()}else notify('食材不足或无法研发');return}
 if(a.startsWith('drop:')){if(dropLiveIngredient(s,a.slice(5)))renderUI();return}
 if(a.startsWith('cook-action:')){if(performLiveAction(s,a.slice(12)))renderUI();return}
 if(a==='finish-cook'){if(finishLiveResearch(s)){renderUI();open('cook-result')}return}
 if(a==='prep-enter'){toPrep();return}
 if(a==='menu'&&mode==='prep'){s.phase='menu';page=0;menuSlot=0;open('menu');return}
 if(a.startsWith('slot:')){menuSlot=Number(a.slice(5));renderWindow();return}
 if(a.startsWith('recipe:')){if(selectMenuRecipe(s,menuSlot,a.slice(7)))renderWindow();else notify('该菜谱暂不可配置');return}
 if(a.startsWith('prep:')){selection=a.slice(5);open('prep');return}
 if(a.startsWith('prep-dish:')){if(prepDish(s,a.slice(10)))renderWindow();else notify('食材不足');return}
 if(a==='open-shop'&&mode==='prep'){nextPhase(s,'service');if(createService(s,{walkable:true})){starsBefore=s.chapterProgress.stars;setServicePaused(s,false);acc=0;fast=false;switchScene('service')}else{s.phase='prep';notify('请检查菜单与厨具')}return}
 if(a==='pause'&&mode==='service'){setServicePaused(s,!s.service.paused);stopInput();renderUI();return}
 if(a==='fast'&&mode==='service'){fast=!fast;setServicePaused(s,false);renderUI();return}
 if(a==='special'&&mode==='service'){if(activateWalkableSpecial(s))notify('主厨技能已使用');else notify('当前无可用技能');return}
 if(a.startsWith('service-choice:')){if(chooseServiceEvent(s,a.slice(15))){resumeBreak(s);hide();renderUI()}else notify('当前无法执行');return}
 if(a==='resume'){resumeBreak(s);hide();renderUI();return}
 if(a==='result-ledger'){open('ledger','result');return}
 if(a==='result-next'){if(s.chapterProgress.stars>starsBefore)open('star');else toGrowth();return}
 if(a==='growth-enter'){toGrowth();return}
 if(a.startsWith('offer:')){selection=a.slice(6);open('offer');return}
 if(a.startsWith('buy:')){if(labBuy(s,a.slice(4))){hide();renderUI();notify('升级完成！');world.classList.remove('success-flash');void world.offsetWidth;world.classList.add('success-flash')}else renderWindow();return}
 if(a==='next-day'&&advanceDay(s)){fast=false;switchScene('morning');notify('新的一天');return}
 if(a.startsWith('item:')){selection=a.slice(5);renderWindow();return}
 if(a.startsWith('forecast-item:')){notify(ING[a.slice(14)]?.name||'食材');return}
 if(a==='prev-page'||a==='next-page'){page=Math.max(0,page+(a==='next-page'?1:-1));renderWindow()}
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(b&&!b.disabled)handle(b.dataset.act)});
dialog.addEventListener('cancel',e=>{e.preventDefault();dismiss()});
const directions={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0],w:[0,-1],s:[0,1],a:[-1,0],d:[1,0]};
document.addEventListener('keydown',e=>{if(!dialog.open&&['field','service'].includes(mode)&&directions[e.key]){e.preventDefault();keys.add(e.key)}});
document.addEventListener('keyup',e=>keys.delete(e.key));window.addEventListener('blur',stopInput);document.addEventListener('visibilitychange',stopInput);
lab.addEventListener('pointerdown',e=>{const b=e.target.closest('[data-axis]');if(!b||dialog.open)return;e.preventDefault();pointer=e.pointerId;axis=b.dataset.axis.split(',').map(Number);b.setPointerCapture(e.pointerId)});
for(const event of ['pointerup','pointercancel','lostpointercapture'])lab.addEventListener(event,e=>{if(e.pointerId===pointer){pointer=null;axis=[0,0]}});
function movement(){let [x,y]=axis;for(const key of keys){x+=directions[key][0];y+=directions[key][1]}const len=Math.hypot(x,y);return len>1?[x/len,y/len]:[x,y]}
function setText(id,t){const e=$(id);if(e&&e.textContent!==String(t))e.textContent=t}
function updateLive(){
 if(mode==='field'){const f=s.field;setText('hp',f.hp+'/3');setText('bag-count',fieldBagSlotsUsed(f)+'/'+f.capacity);setText('skill-text',f.skillCd>0?Math.ceil(f.skillCd)+'s':'技能');const el=lab.querySelector('[data-act="skill"]');if(el)el.disabled=f.skillCd>0;if(f.actionMessageTTL>0)$('hint').textContent=f.actionMessage}
 if(mode==='research'&&s.cook){setText('heat','火候 · '+s.cook.elapsed.toFixed(1)+' s');const el=lab.querySelector('[data-act="finish-cook"]');if(el)el.disabled=s.cook.elapsed<1.2}
 if(mode==='service'){const v=s.service;setText('live-status',Math.min(v.wave+1,3)+'/3 · '+v.orders.filter(o=>o.status==='served').length+'/'+v.orders.length);setText('energy',v.hero?.energy??6);setText('coins',s.coins);const g=dinerGuide(s);$('hint').textContent=g?.mode==='serve'?'前往 '+(g.table+1)+' 号桌上菜':g?.mode==='pickup'?'靠近出餐台取餐':'靠近厨位，等待出锅'}
}
function paint(now){
 const scene=sceneOf(mode),t=now/1000;
 if(scene==='room'){const state=mode==='service'?s:{...s,phase:'forecast',service:null};drawDiner($('room'),state,['report','growth'].includes(mode)?8:t,s.service?.time??t)}
 if(scene==='departure')globalThis.__oddpotDepartureRenderer?.draw(lab,s,now);
 if(scene==='field')drawField($('forest'),{...s,phase:'field'},t);
 if(scene==='research')globalThis.__oddpotY4bRenderer?.draw(lab,s,liveCookPreview(s),now);
 const ds=document.documentElement.dataset,status=scene==='room'?ds.oddpot3d:scene==='field'?ds.oddpotForest3d:scene==='departure'?ds.oddpotDeparture3d:ds.oddpotResearch3d;
 const label=status==='active'?'3D':status==='fallback'?'2D':scene==='research'&&!s.cook?'工作台':'加载中';
 if(label!==renderer){renderer=label;setText('render-label','工坊 2.0 · '+modeNames[mode]+' · '+label);renderSpots()}
}
function simulate(dt){
 if(dialog.open||document.hidden)return;
 const [x,y]=movement();
 if(mode==='field'&&!s.field.settled){
  stepActionField(s,x,y,dt);
  if(s.field.settled||s.phase!=='field'){fieldEnd();return}
  if(s.field.activeEvent){open('field-event');return}
 }
 if(mode==='research'&&s.cook){const done=stepLiveResearch(s,dt);if(done){renderUI();open('cook-result')}}
 if(mode==='service'&&s.service&&!s.service.paused&&!s.service.done&&!s.service.breakAt){
  const v=s.service;walkServiceHero(v.hero,x,y,dt,s);advanceWalkableInteraction(s,dt);acc+=dt*(fast?18:1);
  while(acc>=1&&!v.done&&!v.breakAt){acc-=1;tick(s,1)}
  if(v.breakAt){acc=0;open('service-event');return}
  if(v.done){closeNight();return}
 }
}
new ResizeObserver(()=>renderSpots()).observe(world);
enableY2();enableY3();enableY4b();enableZ2c3();reset();
let last=0;function frame(now){requestAnimationFrame(frame);if(document.hidden){last=now;return}const dt=Math.min(.06,Math.max(0,(now-last)/1000));if(last&&now-last<25)return;last=now;try{simulate(dt);paint(now);updateLive()}catch(e){console.warn('Workshop2 frame',e)}}requestAnimationFrame(frame);
