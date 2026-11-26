import {labFixture,labOffers,labBuy,labNextHint,labProject} from './game_ui_lab_state.js?v=z2e1';
import {drawDiner} from './scenes_v04.js?v=z2e1';
import {enableY2} from './three_y2_diner.js?v=z2e1';
import {z2a2Icon as icon} from './ui_icons_z2a2.js?v=z2a3';
import {ingredientIconHtml} from './ingredient_icons_v011g.js';
import {ING,RECIPES} from './data.js';
const $=id=>document.getElementById(id),room=$('room'),world=$('world'),dialog=$('window'),content=$('window-content');
const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const labels={early:'初来乍到',star:'首星之夜',advanced:'进阶食堂'};
const demo={early:{income:72,profit:28,served:'5/6',sat:68},star:{income:311,profit:190,served:'10/11',sat:72},advanced:{income:560,profit:286,served:'17/18',sat:85}};
let preset='star',s=labFixture(preset),mode='result',view='',selected='',page=0,slot=0,ceremony=true,toastTimer=0;
let returnView='',renderer='loading';
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const iconBtn=(act,glyph,label)=>'<button type="button" class="icon-btn" data-act="'+act+'" aria-label="'+label+'">'+icon(glyph)+'<span>'+label+'</span></button>';
const gold=(act,label,glyph='',disabled=false)=>'<button type="button" class="gold" data-act="'+act+'" '+(disabled?'disabled':'')+'>'+ (glyph?icon(glyph):'')+label+'</button>';
const minor=(act,label,extra='')=>'<button type="button" class="minor" data-act="'+act+'" '+extra+'>'+label+'</button>';
const title=(t,close=true)=>'<header class="ribbon" id="window-title">'+t+'</header>'+(close?'<button class="close" data-act="close" aria-label="关闭窗口"><span>×</span></button>':'');
const metric=(g,n,l)=>'<div class="metric">'+icon(g)+'<b>'+n+'</b><small>'+l+'</small></div>';
function renderHUD(){
 $('hud').innerHTML='<div class="hud-stack"><div class="hud-chip">'+icon('coin')+'<b id="coins">'+s.coins+'</b></div><div class="hud-chip">'+icon('star')+'<b>'+s.chapterProgress.stars+'</b> · 第 '+((s.cycle-1)*3+s.day)+' 天</div></div><div class="hud-right"><small class="lab-label" id="render-label">UI 工坊 · '+renderer+'</small>'+iconBtn('settings','gear','设置')+'</div>';
 $('dock').innerHTML='<div class="dock-left">'+iconBtn('stock','bag','库存')+iconBtn('menu','menu','菜单')+iconBtn('ledger','ledger','账本')+'</div>'+gold('next','下一天','next');
 $('hint').textContent=mode==='growth'?labNextHint(s):mode==='morning'?'新的一天 · 工坊演示':'';
 renderSpots();
}
function renderSpots(){
 const w=world.clientWidth,h=world.clientHeight,offers=mode==='growth'?labOffers(s):[],physical=offers.filter(o=>o.at),utility=offers.find(o=>o.id==='bag');
 // Place markers at the projected real furniture; stagger only co-located offers.
 const used=[];$('hotspots').innerHTML=physical.map(o=>{
  let p=renderer==='2D'?{x:o.at.x*w,y:o.at.y*h-20}:labProject(o.at,w,h);
  p.y=Math.max(94,Math.min(h-122,p.y));
  while(used.some(q=>Math.hypot(p.x-q.x,p.y-q.y)<49)&&p.y<h-174)p.y+=51;
  used.push(p);
  return '<button class="spot" style="left:'+p.x+'px;top:'+p.y+'px" data-act="offer:'+o.id+'" data-affordable="'+o.affordable+'" aria-label="'+esc(o.title)+'，'+o.cost+'金币" title="'+esc(o.title)+'">'+icon(o.icon)+'<em>↑</em></button>';
 }).join('')+(utility?'<button class="spot" style="left:calc(100% - 39px);top:calc(100% - 145px)" data-act="offer:bag" data-affordable="'+utility.affordable+'" aria-label="背包扩容，'+utility.cost+'金币">'+icon('bag')+'<em>↑</em></button>':'');
}
function open(which,from=''){
 view=which;returnView=from;renderWindow();
 if(!dialog.open)dialog.showModal();
}
function dismiss(){
 if(view==='result'||view==='star')return;
 if(returnView){const target=returnView;returnView='';open(target);return;}
 dialog.close();view='';renderHUD();
}
function notify(msg){clearTimeout(toastTimer);$('toast').textContent=msg;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,1800);}
function renderWindow(){
 const d=demo[preset];let body='';
 if(view==='result'){
  body=title('今日收工',false)+'<div class="result-hero">'+icon('coin')+'<small>经营利润</small><strong>+'+d.profit+'</strong></div><div class="metrics">'+metric('coin',d.income,'收入')+metric('plate',d.served,'上菜')+metric('heart',d.sat,'满意')+'</div>'+(ceremony?'<div class="notice">'+icon('star','')+' 获得万味星章！</div>':'<div class="notice">今天辛苦了，明日再接再厉。</div>')+'<div class="actions">'+minor('result-ledger','账本')+gold('result-next','继续','next')+'</div><p class="note">工坊示例成绩 · 非正式存档</p>';
 }else if(view==='star'){
  body=title('万味评鉴',false)+'<div class="star-hero">'+icon('star')+'<h2>获得万味星章！</h2><p>新的餐桌扩建机会已开放</p></div>'+gold('star-next','回到餐厅','home');
 }else if(view==='offer'){
  const o=labOffers(s).find(a=>a.id===selected);if(!o){dismiss();return;}
  body=title('食堂成长')+'<div class="upgrade-hero">'+icon(o.icon)+'<h2>'+esc(o.title)+'</h2><p>'+esc(o.description)+'</p></div><div class="cost-line">'+icon('coin')+o.cost+' 金币</div><p class="note">'+(o.affordable?'购买后立即生效':'金币不足，继续营业即可积累')+'</p><div class="actions">'+minor('close','取消')+gold('buy:'+o.id,o.affordable?'确认升级':'金币不足','coin',!o.affordable)+'</div>';
 }else if(view==='stock'){
  const items=Object.entries(s.inventory).filter(([id,n])=>ING[id]&&n>0),pages=Math.max(1,Math.ceil(items.length/8));page=Math.min(page,pages-1);
  const part=items.slice(page*8,page*8+8),item=items.find(([id])=>id===selected);
  body=title('食材柜')+'<div class="grid-slots">'+part.map(([id,n])=>'<button class="slot" aria-label="'+esc(ING[id].name)+' '+n+'份" aria-pressed="'+(id===selected)+'" data-act="item:'+id+'">'+ingredientIconHtml(id,32)+'<span>'+n+'</span></button>').join('')+'</div><div class="slot-detail">'+(item?esc(ING[item[0]].name)+' · 库存 '+item[1]+' 份':'点选食材查看库存')+'</div><div class="pager">'+minor('prev-page','‹',''+(page===0?'disabled':''))+'<span>'+(page+1)+' / '+pages+'</span>'+minor('next-page','›',page>=pages-1?'disabled':'')+'</div>';
 }else if(view==='menu'){
  const recipes=Object.keys(s.recipes).filter(id=>RECIPES[id]),r=RECIPES[s.menu[slot]];
  body=title('今日菜单')+'<div class="menu-slots">'+s.menu.map((id,i)=>'<button class="slot" aria-label="菜单第'+(i+1)+'格 '+esc(RECIPES[id]?.name||'空')+'" aria-pressed="'+(i===slot)+'" data-act="slot:'+i+'">'+icon('plate')+'<small>'+esc(RECIPES[id]?.name||'空')+'</small></button>').join('')+'</div><div class="slot-detail">'+esc(r?.name||'空槽')+' · 点击下方菜谱替换</div><div class="grid-slots">'+recipes.map(id=>'<button class="slot" aria-label="'+esc(RECIPES[id].name)+'" data-act="recipe:'+id+'" aria-pressed="'+(id===s.menu[slot])+'">'+ingredientIconHtml(RECIPES[id].ids[0],32)+'</button>').join('')+'</div><p class="note">工坊内替换，不影响正式菜单</p>'+gold('close','完成','next');
 }else if(view==='ledger'){
  body=title('经营账本')+'<div class="ledger">'+[['今晚收入',d.income],['经营利润','+'+d.profit],['成功上菜',d.served],['平均满意',d.sat],['现有座位',s.dining.tableCount*2],['当前金币',s.coins],['背包容量',s.bagSlots]].map(([k,v])=>'<p>'+k+' <b style="float:right">'+v+'</b></p>').join('')+'</div>'+gold('close','合上账本')+'<p class="note">示例经营数据 · 购买变化为真实规则计算</p>';
 }else if(view==='settings'){
  body=title('工坊设置')+'<div class="setting-choices">'+Object.entries(labels).map(([id,label])=>minor('preset:'+id,label,'aria-pressed="'+(preset===id)+'"')).join('')+'</div><p class="note">切换档位会重新开始示例。不会读写正式游戏存档。</p><div class="actions">'+minor('retry-3d','重试3D')+gold('reset','重置演示')+'</div>';
 }else if(view==='morning'){
  body=title('新的一天')+'<div class="star-hero">'+icon('home')+'<h2>餐厅已准备就绪</h2><p>工坊流程到此结束</p></div>'+gold('reset','再体验一次','play')+minor('close','回到餐厅');
 }
 content.innerHTML=body;
 // Size decorative inline icons without changing the slot geometry.
 content.querySelectorAll('.notice svg').forEach(e=>{e.style.width='20px';e.style.height='20px';e.style.verticalAlign='middle';});
 if(dialog.open){const first=content.querySelector('button:not(:disabled)');first?.focus({preventScroll:true});}
}
function reset(id=preset){preset=id;s=labFixture(id);mode='result';ceremony=id==='star';selected='';page=slot=0;renderHUD();open('result');}
function handle(act){
 if(act==='close'){dismiss();return}
 if(act==='result-next'){if(ceremony){open('star');return;}mode='growth';dialog.close();view='';renderHUD();return;}
 if(act==='star-next'){ceremony=false;mode='growth';dialog.close();view='';renderHUD();return;}
 if(act==='result-ledger'){open('ledger','result');return;}
 if(act==='settings'||act==='ledger'){open(act);return;}
 if(act==='stock'){page=0;selected='';open('stock');return;}
 if(act==='menu'){slot=0;open('menu');return;}
 if(act.startsWith('offer:')){selected=act.slice(6);open('offer');return;}
 if(act.startsWith('buy:')){const id=act.slice(4);if(labBuy(s,id)){dialog.close();view='';renderHUD();world.classList.remove('success-flash');void world.offsetWidth;world.classList.add('success-flash');notify('升级完成！');}else{renderWindow();}return;}
 if(act.startsWith('preset:')){reset(act.slice(7));return;}
 if(act==='reset'){reset();return;}
 if(act==='retry-3d'){globalThis.__oddpotY2Renderer?.retry();notify('正在重试3D');return;}
 if(act.startsWith('item:')){selected=act.slice(5);renderWindow();return;}
 if(act==='prev-page'||act==='next-page'){page=Math.max(0,page+(act==='next-page'?1:-1));selected='';renderWindow();return;}
 if(act.startsWith('slot:')){slot=Number(act.slice(5));renderWindow();return;}
 if(act.startsWith('recipe:')){const id=act.slice(7);if(s.recipes[id]&&RECIPES[id]){const old=s.menu.indexOf(id);if(old>=0&&old!==slot)[s.menu[old],s.menu[slot]]=[s.menu[slot],s.menu[old]];else s.menu[slot]=id;renderWindow();}return;}
 if(act==='next'){mode='morning';renderHUD();open('morning');}
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(b&&!b.disabled)handle(b.dataset.act);});
dialog.addEventListener('cancel',e=>{e.preventDefault();dismiss();});
new ResizeObserver(renderSpots).observe(world);
enableY2();reset();
let last=0;function frame(now){
 requestAnimationFrame(frame);if(now-last<33||document.hidden)return;last=now;
 try{drawDiner(room,{...s,phase:'forecast',service:null},reduced?1:now/1000);const label=document.documentElement.dataset.oddpot3d==='active'?'3D':document.documentElement.dataset.oddpot3d==='fallback'?'2D':'加载中';if(label!==renderer){renderer=label;const el=$('render-label');if(el)el.textContent='UI 工坊 · '+renderer;renderSpots();}}catch(e){console.warn('UI workshop scene',e);}
}
requestAnimationFrame(frame);
