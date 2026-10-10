import {joystickVector} from './controls_v041.js?v=0.5.2';
import {ING,RECIPES,FORECAST,ROUTES,CUSTOMERS} from './data.js?v=0.5.2';
import {PHASES,newGame,save,load,today,serviceDayPlan,tableSeatState,enterField,settleField,discardFieldStack,skipField,purchase,startCook,moveTile,beat,finishCook,synergyFor,canMenu,prepDish,createService,tick,expedite,closeService,nextPhase,advanceDay,buyUpgrade,buyKitchenUpgrade,kitchenUpgradeCost,configureKitchenSlot,kitchenPreview,kitchenRefitCost,kitchenHasMenuCoverage,ensureKitchen,ensureCrew,CREW_ROLES,hireCrew,assignCrew,feedCrew,activeCrewMeal,crewEffects,buyBagUpgrade,bagUpgradePrice,canUse,setServicePaused,resumeBreak,breakPrep,setFlame,tossWok,previewHeat,moveExplorer,interactExplorer,sootheGuest,newRecipeLead,currentServiceEvent,chooseServiceEvent,swapBreakMenu} from './engine.js?v=0.5.2';
import {startActionField,stepActionField,useFieldSkill,resolveFieldEvent} from './field_v04.js?v=0.5.2';
import {drawField,drawDiner} from './scenes_v04.js?v=0.5.2';

let game=load()||newGame();
let flashUntil=0;
let message='欢迎回到边境食堂！今天会有谁来吃饭呢？';
let overlay='',tileSelected=null,selectedOrderId=null;let servicePanel='';
let selectedIngredients=['chicken','chili'],selectedMethod='stir';
let routeTarget=null,walking=null,drag=null,selectedRegion='forest';
const stick={x:0,y:0,pointer:null,originX:0,originY:0};const keys=new Set();let lastFrame=0,lastSave=0;let gameClock=0;let serviceTickAt=0;const touched=new Map();
const app=document.getElementById('app');
const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const b=(act,text,klass='',disabled=false)=>`<button class="game-btn ${klass}" data-act="${act}" ${disabled?'disabled':''}>${text}</button>`;
const recipeIds=Object.keys(game.recipes);
const phaseLabels={forecast:'今日情报',field:'林间探索',research:'料理实验',menu:'今晚菜单',prep:'营业准备',service:'餐厅营业',report:'营业日报',upgrade:'食堂成长'};
const meal=r=>`${r.emoji} ${r.name}`;
const onlyName=id=>ING[id]?.name||id;
const itemCount=()=>Object.keys(game.recipes).length;

function hud(){return `<div class="hud"><div class="brand"><span class="logo" aria-hidden="true">🍳</span><div><strong>怪味食堂</strong><small>ODDPOT · v0.5C</small></div></div><div class="hud-meta"><span aria-label="金币">🪙 ${game.coins}</span><span aria-label="声望">⭐ ${game.reputation}</span></div><button class="hud-gear" data-act="settings" aria-label="设置">⚙</button></div><div class="day-strip"><b>第 ${game.cycle} 轮 · 第 ${game.day} 天</b><span class="day-phase">${phaseLabels[game.phase]}</span><span class="day-recipes">图鉴 ${itemCount()}/${Object.keys(RECIPES).length}</span></div>`}
function toast(){return `<div class="game-toast" role="status"><span>${esc(message)}</span></div>`}
function playablePhase(){return game.phase==='service'||(game.phase==='field'&&!!game.field?.action)}
function sceneNotice(){return `<div class="ingame-notice" role="status" id="ingame-notice" ${performance.now()>flashUntil?'hidden':''}>${esc(message.slice(0,28))}</div>`}
function shell(stage,dock){return `<div class="game-shell">${hud()}<main class="stage ${game.phase}${game.cook?' wok-active':''}">${stage}${playablePhase()?sceneNotice():''}</main>${playablePhase()?'':toast()}<nav class="dock">${dock}</nav>${overlayMarkup()}</div>`}
function overlayMarkup(){if(!overlay)return '';
 let body='';
 if(overlay==='book'){
  body=`<h2>📖 料理灵感图鉴</h2><p class="sheet-lead">${itemCount()}/${Object.keys(RECIPES).length} 道已掌握 · 未发现的料理先显示线索，做出来才会解锁。</p><div class="book-list">${Object.entries(RECIPES).map(([id,r])=>`<button class="book-item" data-book="${id}"><span class="book-icon">${game.recipes[id]?r.emoji:'❔'}</span><div><strong>${game.recipes[id]?r.name:'未发现的料理'}</strong><small>${game.recipes[id]?`${r.ids.map(onlyName).join(' + ')} · ${r.station==='WOK'?'爆炒':'焖煮'}`:r.hint}</small></div><span>›</span></button>`).join('')}</div>`;
 }else if(overlay==='field-bag'){
  const f=game.field;body=`<h2>🎒 野外背包 · ${Object.keys(f.bag).length}/${f.capacity||6} 格</h2><p class="sheet-lead">每格最多 3 份同类食材。满格时可以丢掉一整格，为新发现腾出位置；丢弃只影响本次探索背包。</p><div class="book-list">${Object.entries(f.bag).map(([id,n])=>`<button class="book-item" data-discard="${id}"><span class="book-icon">${ING[id].emoji}</span><div><strong>${ING[id].name} ×${n}</strong><small>点击丢弃这一格</small></div><span>✕</span></button>`).join('')||'背包是空的'}</div>`;
 }else if(overlay==='stock'){
  body=`<h2>🎒 食材仓库</h2><p class="sheet-lead">原料跨天保留 · 采购会扣除金币，研发和营业真正消耗库存</p><div class="stock-list">${Object.entries(ING).map(([id,ing])=>`<div class="stock-line"><span>${ing.emoji} ${ing.name}</span><b>×${game.inventory[id]||0}</b>${b(`buy:${id}`,'采购', 'small',game.coins<ing.cost||id==='beef')}</div>`).join('')}</div>`;
 }else if(overlay.startsWith('menu:')){
  const slot=Number(overlay.split(':')[1]);body=`<h2>更换第 ${slot+1} 道上架菜</h2><p class="sheet-lead">每晚三道菜，不是价格越高越好；两口锅的负载会影响等待。</p><div class="book-list">${Object.keys(game.recipes).map(id=>{const r=RECIPES[id];return `<button data-menu-pick="${slot}:${id}" class="book-item"><span class="book-icon">${r.emoji}</span><div><strong>${r.name} · ${r.station}</strong><small>${r.time}s · ${r.price}金币 · ${r.ids.map(onlyName).join(' + ')}</small></div><span>›</span></button>`}).join('')}</div>`;
 }else if(overlay==='crew'){
   const crew=ensureCrew(game),eff=crewEffects(game);
   const row=role=>{const person=crew[role],def=CREW_ROLES[role],meal=activeCrewMeal(game,role);
    const options=person.hired&&!meal&&game.phase==='prep'?`<div class="staff-feed-list">${Object.keys(game.recipes).map(id=>`<button data-feed="${role}:${id}" ${!canUse(game,RECIPES[id].ids)?'disabled':''}>${RECIPES[id].emoji} ${RECIPES[id].name}<small>品质 ${game.recipes[id]}</small></button>`).join('')}</div>`:'';
    const current=role==='helper'?`岗位：${person.station===0?'左':'右'}厨位 · 每单 -${eff.helper.seconds}秒`:`每桌耐心 +${eff.waiter.patience}秒`;
    return `<div class="staff-person"><div class="staff-person-head"><b>${role==='helper'?'🍳':'🧺'} ${def.name} · ${def.job}</b><span>${person.hired?'已雇佣':def.hireCost+' 金币'}</span></div>${person.hired?`<div class="staff-buff">${current} · 熟练 ${person.meals}/3</div>${role==='helper'&&game.phase==='prep'?`<div class="staff-assign">${[0,1].map(i=>`<button data-assign="${i}" class="${person.station===i?'active':''}">${i?'右':'左'}厨位</button>`).join('')}</div>`:''}<p>${meal?`今日员工餐：${RECIPES[meal.recipeId].name} · 品质 ${meal.quality}`:game.phase==='prep'?'选一道已研发料理作为今天的员工餐':'下一次开店前可投喂'}</p>${options}`:b('hire:'+role,'雇佣 '+def.name,'primary',game.coins<def.hireCost)}</div>`;
   };
   body=`<h2>👩‍🍳 食堂伙伴</h2><p class="sheet-lead">雇员永久留下；每人每天最多吃 1 道料理。员工餐真实扣料并增加当日效率，也积累最多 3 点熟练。</p><div class="staff-roster">${row('helper')}${row('waiter')}</div>`;
 }else if(overlay==='settings'){
  body=`<h2>⚙ 试玩设置</h2><p class="sheet-lead">固定 9:16 竖屏 · 单机 localStorage 存档 · 原型验证版本</p>${b('reset','重置存档，从 DAY 1 重新开始','danger')}<p class="sheet-lead">切到后台时营业会自动暂停。更换设备不会同步存档。</p>`;
 }else if(overlay==='details'){
  const r=game.report;body=r?`<h2>营业账本详情</h2><p class="sheet-lead">本日订单由真实食材库存、工位工作秒数和顾客等待事件计算。</p><div class="book-list">${Object.entries(r.byDish).map(([id,d])=>`<div class="detail-row">${RECIPES[id].emoji} ${RECIPES[id].name}：售出 ${d.count} 份 · 满意 ${Math.round(d.totalSat/d.count)}</div>`).join('')}<div class="detail-row">WOK 占用 ${r.congestion.WOK} 秒 / POT ${r.congestion.POT} 秒</div><div class="detail-row">食材耗用估值 ${r.cost} · 招待支出 ${r.hospitalityCost||0} · 收入 ${r.revenue} · 贡献利润 ${r.profit}</div></div>`:'';
 }
 return `<div class="sheet-backdrop" data-act="close-sheet"></div><section class="sheet" role="dialog" aria-modal="true" aria-label="游戏面板"><div class="sheet-header"><span class="sheet-handle"></span>${b('close-sheet','✕','sheet-close')}</div><div class="sheet-body">${body}</div></section>`;
}

function restaurantView(interactive=false){
 const v=game.service;
 const table=(i)=>{
  const seats=tableSeatState(v,i),orders=seats.filter(Boolean),active=orders.length>0;
  const seatHtml=seats.map((o,j)=>`<span class="diner-seat-marker seat-${j} ${o?'occupied':''} ${selectedOrderId===o?.id?'selected':''}" data-seat-index="${j}" aria-label="${i+1}桌第${j+1}位${o?CUSTOMERS[o.segment]?.name:'空位'}">${o?j===0?'①':'②':'·'}</span>`).join('');
  return `<button class="diner-table two-seat ${active?'occupied':''} ${orders.some(o=>o.id===selectedOrderId)?'selected':''}" data-seat="${i}" ${interactive?'':'disabled'} aria-label="${i+1}号双人餐桌：${orders.length}位顾客">
     ${seatHtml}<span class="wood-table"></span>
     <span class="seat-label">${i+1}号桌 · ${orders.length}/2 位</span>
   </button>`;
 };
 const st=position=>{const job=v?.stations[position],slot=ensureKitchen(game).slots[position==='WOK'?0:1],r=job?RECIPES[v.orders.find(o=>o.id===job.orderId)?.recipeId]:null;return `<button class="diner-station" data-station="${position}" ${interactive?'':'disabled'}><span class="station-object">${slot.type==='WOK'?'🍳':'🍲'}</span><strong>${slot.type==='WOK'?'炒锅':'炖锅'} Lv.${slot.level}</strong><small>${r?`${r.emoji} ${job.left}s`:'待命'}</small></button>`};
 return `<div class="diner-world"><canvas id="diner-canvas" class="diner-canvas"></canvas><div class="diner-top"><div class="shop-sign">ODDPOT · 边境小食堂</div><div class="tiny-window">🌙</div></div><div class="diner-kitchen">${st('WOK')}<div class="cook-avatar"><span>👩‍🍳</span><small>主厨</small></div>${st('POT')}</div><div class="service-counter"><i></i>出餐柜台<i></i></div><div class="diner-tables">${table(0)}${table(1)}</div><div class="diner-floor"><span>🪴</span><span class="diner-entry">🚪<small>欢迎光临</small></span><span>🪴</span></div>${v?`<div class="scene-corner">已服务 ${v.orders.filter(o=>o.status==='served').length}/${v.orders.length}</div>`:''}</div>`;
}
function sceneTag(title,sub=''){return `<div class="scene-tag"><strong>${title}</strong>${sub?`<small>${sub}</small>`:''}</div>`}
function forecast(){const f=today(game),plan=serviceDayPlan(game);return [
 `<div class="scene-bg diner-bg">${restaurantView(false)}<div class="scene-float top">${sceneTag(game.day===3?'🔥 爆炎厨王踢馆':plan.pressure,`预计 ${plan.count} 位 · 今日目标：${plan.goal.label}`)}</div><div class="scene-float bottom forecast-advice">${game.day===3?'今晚的评委关注辛辣或爆香料理，评分目标 71 分。':'今天的菜单，不必和昨天一样。研发新菜能吸引不同的客人。'}</div></div>`,
 `<div class="dock-head"><span>🌅 开店前</span><span>库存 ${Object.values(game.inventory).reduce((a,b)=>a+b,0)} 份</span></div><div class="action-row">${b('stock','🎒 仓库','secondary')}${b('to-field','🌲 出门取材 →','primary wide')}</div>`
 ]}
function field(){
 const f=game.field;
 if(!f){
  const activeRoutes=selectedRegion==='forest'?ROUTES:[{id:'spring_safe',name:'热泉浅滩',emoji:'♨',subtitle:'火椒、蒜瓣 · 可避开战斗'},{id:'spring_risk',name:'热泉断坡',emoji:'🌋',subtitle:'火椒、野牛肉 · 高风险'}];
  return [
 `<div class="forest-scene route-scene ux-route">${forestBackdrop()}<div class="route-panel">
   <div class="route-intro"><span class="ux-kicker">出发准备</span><h2>今天去哪找食材？</h2><p>缺什么，就去哪。</p></div>
   <div class="ux-field-label"><strong>目标食材</strong><span>当前：${ING[game.selectedTarget]?.name||'未选'}</span></div>
   <div class="target-scroller" role="group" aria-label="目标食材">${Object.entries(ING).map(([id,ing])=>`<button class="target-chip ${game.selectedTarget===id?'chosen':''}" data-target="${id}" aria-pressed="${game.selectedTarget===id}">${ing.emoji} ${ing.name}</button>`).join('')}</div>
   <div class="ux-field-label"><strong>探索区域</strong></div>
   <div class="region-tabs" role="group" aria-label="探索区域"><button data-region="forest" class="${selectedRegion==='forest'?'current':''}" aria-pressed="${selectedRegion==='forest'}">晨露森林</button><button data-region="spring" class="${selectedRegion==='spring'?'current':''}" aria-pressed="${selectedRegion==='spring'}">热泉峡谷</button></div>
   <div class="ux-field-label"><strong>路线</strong><span>点击出发</span></div>
   <div class="route-options">${activeRoutes.map(r=>`<button class="route-card ${/risk/.test(r.id)?'route-risk':'route-safe'}" data-route="${r.id}"><span class="route-emoji" aria-hidden="true">${r.emoji}</span><div><strong>${r.name}</strong><small>${r.subtitle}</small></div><span class="route-risk-label">${/risk/.test(r.id)?'高风险':'安全'}</span><b aria-hidden="true">›</b></button>`).join('')}</div>
  </div></div>`,
 `<div class="dock-head"><span>探索约 60 秒</span><span>背包 ${game.bagSlots||6} 格</span></div><div class="action-row">${b('skip-field','暂不探索 · 去研发','secondary wide')}</div>`]
 }
 const bag=Object.entries(f.bag).map(([id,n])=>`${ING[id].name}${n}`).join(' · ')||'空';
 const event=f.activeEvent&&f.nodes.find(n=>n.key===f.activeEvent);
 return [`<div class="forest-scene action-forest"><canvas id="forest-canvas" class="forest-canvas"></canvas><div class="floating-joystick" id="field-stick" aria-hidden="true"><div class="floating-joystick-knob" id="field-stick-knob"></div></div><div class="action-hud" aria-label="探索状态"><span class="field-hp" aria-label="体力">${'♥'.repeat(f.hp)}${'♡'.repeat(3-f.hp)}</span><button data-act="field-bag" class="field-bag-chip" aria-label="查看野外背包">背包 <b id="field-bag-count">${Object.keys(f.bag).length}/${f.capacity||6}</b></button><span class="field-clock" id="field-clock">${Math.floor(f.elapsed)}s</span></div><div class="field-action-notice" id="field-action-notice" hidden></div><button data-act="skill" class="field-skill" aria-label="锅铲击退技能"><span class="skill-glyph" aria-hidden="true">✦</span><span class="skill-caption">锅铲</span><span class="skill-cooldown" id="skill-cooldown" hidden></span></button>${event?`<div class="field-event"><strong>野外遭遇 · 流浪调味师</strong><p>你在林中发现一份料理线索，如何处理？</p><button data-event="trade">用蘑菇交换火椒</button><button data-event="forage">深入调查：损失生命，争取两份材料</button><button data-event="leave">绕开，保留现有收获</button></div>`:''}</div>`,
 `<div class="action-field-dock field-compact-dock"><span class="field-touch-tip">按住场景 · 拖动移动</span>${b('retreat','撤离回店','secondary')} </div>`]
}

function forestBackdrop(){return `<div class="forest-cloud c1">🌲</div><div class="forest-cloud c2">🌲</div><div class="forest-cloud c3">🍄</div><div class="forest-cloud c4">🌿</div><div class="forest-cloud c5">🦬</div>`}
function research(){const c=game.cook;
 if(c){const heat=previewHeat(c);const board=c.tiles.map((t,i)=>`<button class="wok-tile ${t?'filled':''} ${tileSelected===i?'active':''} ${t&&heat[i]>ING[t.id].hi?'too-hot':''}" data-tile="${i}">${t?`<span>${ING[t.id].emoji}</span><b>${t.heat}</b><small>→${heat[i]}</small>`:`<small>${[1,2,1,2,3,2,1,2,1][i]}</small>`}</button>`).join('');return [
 `<div class="wok-scene"><div class="wok-caption">🔥 ${c.method==='stir'?'爆炒':'焖煮'} · 第 ${Math.min(c.beats+1,3)} / 3 拍 · <b>${c.beats===3?'可以出锅':'拖动或点击换位'}</b></div><div class="wok-rim"><div class="wok-grid">${board}</div></div><div class="wok-ingredients">${c.tiles.filter(Boolean).map(t=>`<div>${ING[t.id].emoji} <strong>${t.heat}</strong><small>理想 ${ING[t.id].lo}–${ING[t.id].hi}</small></div>`).join('')}</div><div class="wok-explainer">${c.beats===3?'三拍完成！现在出锅看看发现了什么。':'每拍可换位或颠锅一次。火候累积，避免生熟不均与焦化。'}</div></div>`,
 `<div class="fire-modes">${[-1,0,1].map(v=>b(`flame:${v}`,v===-1?'小火':v===0?'标准':'猛火',c.flame===v?'chosen':'',c.beats===3)).join('')}</div><div class="action-row">${b('toss','↻ 颠锅','secondary',c.beats===3)}${c.beats===3?b('finish','🍽 起锅鉴定！','primary wide'):b('heat','🔥 加热一拍','primary wide')}</div>`];}
 const recipeCount=Object.keys(RECIPES).length;
 return [`<div class="research-scene"><div class="research-board"><div class="cauldron">🍳</div><div class="research-label">自由搭配食材，解锁新的料理</div><div class="ingredients-board">${Object.entries(ING).map(([id,ing])=>`<button class="ingredient-tile ${selectedIngredients.includes(id)?'picked':''}" data-ingredient="${id}" ${!game.inventory[id]&&!selectedIngredients.includes(id)?'disabled':''}><span>${ing.emoji}</span><strong>${ing.name}</strong><small>×${game.inventory[id]||0}</small></button>`).join('')}</div><div class="selected-caption">已下料：${selectedIngredients.map(id=>ING[id].emoji).join(' + ')} ${selectedIngredients.length}/3</div><div class="hint-glow">📖 已掌握 ${itemCount()}/${recipeCount} 道菜 · ${recipeCount-itemCount()} 道等待发现</div></div></div>`,
 `<div class="action-row method-pick">${b('method:stir','🔥 爆炒',selectedMethod==='stir'?'chosen':'secondary')}${b('method:stew','🍲 焖煮',selectedMethod==='stew'?'chosen':'secondary')}${b('book','📖 图鉴','secondary')}</div><div class="action-row">${b('start-research','开锅实验','primary wide',selectedIngredients.length<2||!canUse(game,selectedIngredients))}${b('to-menu','去上架 →','secondary')}</div>`]
}
function menu(){const syn=synergyFor(game.menu);const wok=game.menu.filter(id=>RECIPES[id]?.station==='WOK').length,pot=3-wok;
 return [`<div class="menu-scene"><div class="menu-title">🪧 今晚的三道招牌菜</div><div class="menu-blackboard">${game.menu.map((id,i)=>{const r=RECIPES[id];return `<button class="menu-line" data-edit-slot="${i}"><span class="menu-num">0${i+1}</span><span class="menu-icon">${r?.emoji||'❔'}</span><div><strong>${r?.name||'未选择'}</strong><small>${r?.station} · ${r?.time}s · 售价 ${r?.price}</small></div><span class="menu-switch">⇄</span></button>`}).join('')}</div><div class="menu-forecast">${today(game).hint}</div><div class="menu-balance"><div>🍳 炒锅任务 <strong>${wok}</strong></div><div>🍲 炖锅任务 <strong>${pot}</strong></div></div><div class="synergy-box">✨ ${syn?`主共鸣：${syn}`:'暂无主共鸣 · 不同料理搭配可能产生额外好评'}</div></div>`,
 `<div class="dock-head"><span>点击菜名替换 · 厨房仅有两口锅</span></div><div class="action-row">${b('book','📖 图鉴','secondary')}${b('to-prep','确认菜单 →','primary wide',!canMenu(game))}</div>`]
}
function prep(){
 const k=ensureKitchen(game),preview=kitchenPreview(game);
 const slotCards=k.slots.map((slot,i)=>`<div class="kitchen-config-slot"><span><b>${i===0?'左厨位':'右厨位'}</b><small>Lv.${slot.level}${slot.level===2?' · 制作 -2秒':''}</small></span><div class="kitchen-choice"><button data-act="kitchen:${i}:WOK" class="${slot.type==='WOK'?'active':''}" aria-pressed="${slot.type==='WOK'}">炒锅</button><button data-act="kitchen:${i}:POT" class="${slot.type==='POT'?'active':''}" aria-pressed="${slot.type==='POT'}">炖锅</button></div></div>`).join('');
 const dayPlan=serviceDayPlan(game);
 const pressure=preview.pressure.map(p=>`${p.type==='WOK'?'炒锅':'炖锅'} ${p.menu}菜 / ${p.capacity}位`).join('　');
 return [`<div class="scene-bg diner-bg">${restaurantView(false)}<div class="prep-card kitchen-prep-card"><h2>厨房排布 · 备餐</h2><div class="kitchen-config-head">${preview.valid?'设备覆盖菜单':'缺少：'+preview.risk.map(t=>t==='WOK'?'炒锅':'炖锅').join(' / ')}</div><div class="kitchen-config-slots">${slotCards}</div><p class="kitchen-pressure">${pressure}</p><p class="kitchen-refit">本日首次换锅免费 · 后续每次 ${kitchenRefitCost(game)||12} 金币</p><button class="staff-open-prep" data-act="crew">👩‍🍳 员工餐与岗位 <span>${Object.values(ensureCrew(game)).filter(x=>x.hired).length}/2 人 ›</span></button><div class="service-day-brief"><b>${dayPlan.pressure}</b><span>预计 ${dayPlan.count} 人 · ${dayPlan.goal.label}</span></div><div class="prep-divider">开业前预制</div><div class="prep-items">${game.menu.map(id=>`<button class="prep-item" data-act="prep:${id}" ${!canUse(game,RECIPES[id].ids)?'disabled':''}>${RECIPES[id].emoji} ${RECIPES[id].name}<span>已备 ${game.prep[id]||0} · ＋1</span></button>`).join('')}</div></div></div>`,
 `<div class="dock-head"><span>${preview.valid?'厨房就绪，可开业': '先给菜单配置所需锅具'}</span><span>金币 ${game.coins}</span></div><div class="action-row">${b('crew','员工','secondary')}${b('open','开门迎客','primary wide',!preview.valid)}</div>`]
}
function service(){const v=game.service;if(!v)return ['<div class="empty">餐厅正在准备...</div>',b('open','开业','primary')];
 const served=v.orders.filter(o=>o.status==='served').length;
 const events=v.events.slice(-2).reverse().map(e=>e.type==='served'?`😋 ${RECIPES[e.recipeId]?.name} 获赞 ${e.sat}分`:e.type==='left'?'😟 客人久等离开':e.type==='guest_care'?'💛 招待了等待的客人':e.type==='started'?'🍳 后厨开始制作':'').filter(Boolean);
 const selected=v.orders.find(o=>o.id===selectedOrderId);
 const status=`第 ${Math.min(v.wave+1,3)}/3 波 · 营业 ${v.time}s · ${served}/${v.orders.length} 已送达`;
 return [`<div class="scene-bg diner-bg service-scene">${restaurantView(true)}<div class="service-mini-hud"><strong>第 ${Math.min(v.wave+1,3)}/3 波</strong><span>${v.time}s</span><span>上菜 ${served}/${v.orders.length}</span><span class="service-goal-label" title="今晚目标">${v.goal?.label||''}</span>${v.paused?'<b class="paused-chip">暂停</b>':''}</div>${v.breakAt&&currentServiceEvent(game)&&servicePanel==='event'?`<div class="management-card"><strong>${currentServiceEvent(game).title}</strong><p>${currentServiceEvent(game).description}</p>${currentServiceEvent(game).choices.map(ch=>`<button data-choice="${ch.id}"><b>${ch.label}</b><small>${ch.detail}</small></button>`).join('')}</div>`:''}${v.breakAt&&servicePanel==='swap'?`<div class="management-card"><strong>换一道下一波招牌菜</strong><p>下一波到店客人才会按照新菜单点单，当前桌位不受影响。</p>${game.menu.map((id,i)=>`<div class="break-choice-line">${i+1}·${RECIPES[id].name} <select data-swap-slot="${i}">${Object.keys(game.recipes).map(r=>`<option value="${r}" ${r===id?'selected':''}>${RECIPES[r].name}</option>`).join('')}</select><button data-apply-swap="${i}">替换</button></div>`).join('')}</div>`:''}${v.breakAt&&servicePanel==='prep'?`<div class="management-card"><strong>补一份应急餐点</strong><p>现在扣除食材；下一波同款订单可直接上桌，卖不完会计入报损。</p>${game.menu.map(id=>`<button data-breakprep="${id}" ${!canUse(game,RECIPES[id].ids)?'disabled':''}>${RECIPES[id].name} · 预制 1 份</button>`).join('')}</div>`:''}</div>`,
 v.done?`<div class="dock-head"><span>✅ 今晚营业结束</span></div><div class="action-row">${b('close','📊 查看经营反馈','primary wide')}</div>`:
 v.breakAt?`<div class="dock-head"><span>第 ${v.breakAt} 波结束 · 本波只能选一项应急决策</span></div><div class="break-toolbar">${b('show-management','经营事件','primary',v.breakUsed)}${b('show-swap','临时换菜','secondary',v.breakUsed)}${b('show-prep','备菜','secondary',v.breakUsed)}${b('resume-break','继续迎客 ▶','primary')}</div>`:
 `<div class="dock-head"><span>${selected&&['queued','cooking'].includes(selected.status)?`${CUSTOMERS[selected.segment].name} · ${RECIPES[selected.recipeId].name} · 剩余 ${Math.max(0,selected.patience-(v.time-selected.arrival))}s`:'点餐桌查看订单 · 厨房自动制作'}</span><span>招待 ${v.treatUsed?'已用':'1次'}</span></div><div class="action-row">${selected&&selected.status==='queued'?b(`priority:${selected.id}`,'↑ 优先出餐','secondary'):b('clear-table','选择客人','secondary')}${selected?b(`soothe:${selected.id}`,'💛 招待客人','secondary',v.treatUsed||game.coins<5):''}${b('toggle-service',v.paused?'▶ 继续营业':'Ⅱ 暂停','primary wide')}</div>`]
}
function report(){const r=game.report;const lead=newRecipeLead(game);if(!r)return ['',''];return [`<div class="report-scene"><div class="report-header">${r.won?'🏆 击败爆炎厨王！':r.challenge?'🔥 爆炎厨王：挑战结束':'🌙 打烊啦，看看大家怎么说'}</div><div class="report-stats"><div><small>今晚收入</small><b>🪙 ${r.revenue}</b></div><div><small>贡献利润</small><b>${r.profit}</b></div><div><small>成功上菜</small><b>${r.served}/${r.totalOrders||7}</b></div><div><small>平均满意</small><b>${r.sat}</b></div></div>${r.kitchen?`<div class="kitchen-report"><strong>厨房复盘</strong>${r.kitchen.slots.map((slot,i)=>`<span>${i?'右':'左'} ${slot.type==='WOK'?'炒锅':'炖锅'} Lv.${slot.level} · ${r.kitchen.stats?.[i?'POT':'WOK']?.count||0} 单 · 节约 ${r.kitchen.stats?.[i?'POT':'WOK']?.secondsSaved||0} 秒</span>`).join('')}</div>`:''}${r.staff?.crew&&(r.staff.crew.helper.hired||r.staff.crew.waiter.hired)?`<div class="staff-report"><b>员工今日贡献</b>${r.staff.crew.helper.hired?`<span>帮厨：参与 ${r.staff.stats.helperOrders} 单 · 实省 ${r.staff.stats.helperSeconds} 秒</span>`:''}${r.staff.crew.waiter.hired?`<span>跑堂：照顾 ${r.staff.stats.waiterOrders} 桌 · 额外耐心 ${r.staff.stats.waiterBonus} 秒 · 延误挽回 ${r.staff.stats.waiterSaved} 单</span>`:''}<small>员工餐食材成本 ${r.staff.foodCost} 金币（计入利润）</small></div>`:''}<div class="daily-goal-result"><b>今日任务：${r.goal?.label||'完成营业'}</b><span>${r.goal?`${r.goal.value}/${r.goal.target} · ${r.goal.success?'达成！口碑 +2':'未达成，下次再试'}`:'常规营业'}</span></div><div class="guest-verdict"><strong>💬 今日食客点评</strong><p>${r.suggested}</p></div>${r.choices?.length?`<div class="v04-choices"><small>店长今日决策</small>${r.choices.map(c=>`<span>${c.type==='menu_swap'?`临时换菜：${RECIPES[c.before].name} → ${RECIPES[c.after].name}`:`第${c.wave}波：${({sign:'辣味招牌',kitchen:'整理后厨',steady:'稳定营业',soup:'温和推荐',assist:'临时帮厨',publicity:'试吃宣传'})[c.choice]||c.choice}`}</span>`).join('')}</div>`:''}${r.challenge?`<div class="boss-mini">厨王赛得分 <b>${r.challenge.score}</b> / 对手 70　${r.won?'🏆 获得猛火掌控':'未达标，下轮仍可挑战'}</div>`:''}<div class="recipe-lead"><small>🔎 顾客带来的研发灵感</small><strong>${lead?`“${lead.hint}”`:'目前的菜谱已经全部解锁！'}</strong>${lead?`<span>可尝试 ${lead.ingredients.map(id=>ING[id].emoji).join(' + ')}</span>`:''}</div></div>`,
 `<div class="action-row">${b('details','📊 账本','secondary')}${b('to-upgrade','🌅 结束本日 →','primary wide')}</div>`]}
function upgrade(){
 const k=ensureKitchen(game);
 return [`<div class="scene-bg diner-bg">${restaurantView(false)}<div class="upgrade-card kitchen-upgrade-card"><h2>食堂升级</h2><p>厨房升级永久保留；锅具类型在每天开业前配置。</p><div class="upgrade-feature">${game.tech?'猛火掌控已解锁':'赢得厨王赛后解锁猛火掌控'}</div>${k.slots.map((slot,i)=>{const cost=kitchenUpgradeCost(game,i);return `<div class="kitchen-upgrade-row"><div><strong>${i===0?'左厨位':'右厨位'} · ${slot.type==='WOK'?'炒锅':'炖锅'}</strong><small>Lv.${slot.level}${slot.level===2?' · 每单 -2秒':' → Lv.2 每单 -2秒'}</small></div>${b(`upgrade-kitchen:${i}`,cost===null?'已升级':`${cost} 金币升级`,'secondary',cost===null||game.coins<cost)}</div>`}).join('')}<div class="upgrade-feature">背包 ${game.bagSlots||6}/8 格 · ${bagUpgradePrice(game)===null?'已满级':`扩容 ${bagUpgradePrice(game)} 金币`}</div>${b('upgrade-bag','增加背包 1 格','secondary',bagUpgradePrice(game)===null||game.coins<bagUpgradePrice(game))}</div></div>`,
 `<div class="action-row">${b('next-day',game.day===3?'再开一轮':'开始下一天','primary wide')}</div>`]
}
function render(){
 if(walking&&(!game.field||game.phase!=='field')){clearInterval(walking);walking=null;}
 // Restoring horizontal chip position prevents the target selector from snapping
 // back to the first ingredient on every tap; same for an open reference sheet.
 const prevTargetScroll=app.querySelector('.target-scroller')?.scrollLeft||0;
 const prevSheetScroll=app.querySelector('.sheet-body')?.scrollTop||0;
 const [stage,dock]=({forecast,field,research,menu,prep,service,report,upgrade}[game.phase])();
 app.innerHTML=shell(stage,dock);
 const target=app.querySelector('.target-scroller');if(target)target.scrollLeft=prevTargetScroll;
 const sheet=app.querySelector('.sheet-body');if(sheet)sheet.scrollTop=prevSheetScroll;
 // Preserve the on-screen floating stick when a second finger uses the skill.
 if(stick.pointer!==null){const pad=app.querySelector('#field-stick'),knob=app.querySelector('#field-stick-knob');if(pad){pad.classList.add('active');pad.style.left=stick.originX+'px';pad.style.top=stick.originY+'px';}if(knob)knob.style.transform=`translate(${stick.x*54}px,${stick.y*54}px)`;}
 save(game);
}
function note(txt){message=txt;flashUntil=performance.now()+1900;render()}
function stepMove(dx,dy){const result=moveExplorer(game,dx,dy);if(result.ok)message=result.message;render();return result.ok}
function findPath(x,y){const f=game.field;if(!f)return [];const start=[f.x,f.y];const seen=new Set([start.join(',')]);let paths=[[...start,[]]];while(paths.length){const [cx,cy,path]=paths.shift();if(cx===x&&cy===y)return path;for(const [dx,dy] of [[0,-1],[1,0],[0,1],[-1,0]]){const nx=cx+dx,ny=cy+dy,key=`${nx},${ny}`;if(nx<0||ny<0||nx>=f.worldW||ny>=f.worldH||seen.has(key)||f.obstacles.some(o=>o.x===nx&&o.y===ny))continue;seen.add(key);paths.push([nx,ny,[...path,[dx,dy]]]);}}return []}
function walkTo(x,y){if(walking)clearInterval(walking);const path=findPath(x,y);if(!path.length){note('点击可到达的地图格，或用方向键行走。');return}walking=setInterval(()=>{const step=path.shift();if(!step||game.phase!=='field'||!game.field||game.field.settled){clearInterval(walking);walking=null;return}const old=game.field.nodes.filter(n=>n.claimed).length;stepMove(...step);if(game.phase!=='field'||game.field.nodes.filter(n=>n.claimed).length>old||!path.length){clearInterval(walking);walking=null;}},130)}
function action(act){
 if(act==='close-sheet'){overlay='';render();return}
 if(act==='crew'){overlay='crew';render();return}
 if(act.startsWith('hire:')){note(hireCrew(game,act.slice(5))?'伙伴加入食堂！':'金币不足或已经雇佣。');return}
 if(act==='field-bag'){if(game.phase==='field'&&game.field){releaseStick();overlay='field-bag';render()}return}
 if(act==='stock'||act==='book'||act==='settings'||act==='details'){overlay=act;render();return}
 if(act==='reset'){if(confirm('清空本设备的 v0.4 试玩存档？')){localStorage.removeItem('oddpot-prototype-v04');game=newGame();selectedIngredients=['chicken','chili'];overlay='';note('新旅程开始，祝你研究出奇味料理！')}return}
 if(act.startsWith('buy:')){note(purchase(game,act.slice(4))?'采购成功，材料已经进入食堂仓库。':'当前金币或购买条件不足。');return}
 if(act==='to-field'){nextPhase(game,'field');note('想做什么菜，就去寻找那道菜缺少的食材。');return}
 if(act==='skip-field'){skipField(game);note('跳过探索，直接开始今天的料理研发。');return}
 if(act==='skill'){if(useFieldSkill(game)){message=game.field.actionMessage;render()}return}
 if(act==='retreat'){releaseStick();if(walking){clearInterval(walking);walking=null}const result=settleField(game);note(result?'已带着背包回店，收获已入库！':'本次探索已结算。');return}
 if(act.startsWith('method:')){selectedMethod=act.slice(7);render();return}
 if(act==='start-research'){note(startCook(game,selectedIngredients,selectedMethod)?'开锅！改变位置和火力，尝试做出新的料理。':'请选择 2–3 份有库存的不同食材。');return}
 if(act.startsWith('flame:')){setFlame(game,Number(act.slice(6)));render();return}
 if(act==='toss'){note(tossWok(game)?'↻ 颠锅成功，食材沿锅边移动一格。':'本拍已经换过位置，不能再颠锅。');return}
 if(act==='heat'){if(beat(game))note('食材正在受热！观察实际热量与下一拍预测。');return}
 if(act==='finish'){const r=finishCook(game);note(r?.sellable?`🎉 ${RECIPES[r.recipeId].name} 研发成功，品质 ${r.quality}！已写入图鉴。`:`料理还没成功：${r?.reason||'火候不足'}。试试其他食材位置或火力。`);return}
 if(act==='to-menu'){nextPhase(game,'menu');note('把今天的发现写在店门前的菜单上。');return}
 if(act==='to-prep'){if(canMenu(game)){nextPhase(game,'prep');note('想提前备餐吗？营业中已经不用你每单亲自下锅了。')}return}
 if(act.startsWith('kitchen:')){const [,i,type]=act.split(':');note(configureKitchenSlot(game,Number(i),type)?`设备已改为${type==='WOK'?'炒锅':'炖锅'}；订单将按新配置分流。`:'配置未更改，或改装金币不足。');return}
 if(act.startsWith('prep:')){note(prepDish(game,act.slice(5))?'备好一份餐点，稍后可直接上桌。':'食材不足，备餐失败。');return}
 if(act==='open'){if(!kitchenHasMenuCoverage(game)){note('菜单里的料理没有对应锅具，请先调整厨房。');return}nextPhase(game,'service');if(!createService(game)){game.phase='prep';note('厨房未就绪，暂不能开业');return}servicePanel='';selectedOrderId=null;note('开店！点击继续营业');return}
 if(act==='toggle-service'){setServicePaused(game,!game.service.paused);serviceTickAt=performance.now();note(game.service.paused?'已暂停营业。':'开始迎客！新菜会自动进厨房制作。');return}
 if(act==='resume-break'){servicePanel='';resumeBreak(game);serviceTickAt=performance.now();note('下一波开始，注意哪一口锅更忙。');return}
 if(act==='show-management'){servicePanel='event';render();return}
 if(act==='show-swap'){servicePanel='swap';render();return}
 if(act==='show-prep'){servicePanel='prep';render();return}
 if(act.startsWith('breakprep:')){note(breakPrep(game,act.slice(10))?'休整时额外预制了一份菜，等待时间会降低。':'只能在本次休整备餐一次，且需要实际食材。');return}
 if(act.startsWith('priority:')){note(expedite(game,act.slice(9))?'已把该客人的订单排到同工位队列前面。':'这单已经开工，不能再插队。');return}
 if(act.startsWith('soothe:')){note(sootheGuest(game,act.slice(7))?'💛 花费 5 金币招待客人，延长其耐心 9 秒。':'今晚的招待机会已用或该客人已经离开。');return}
 if(act==='clear-table'){selectedOrderId=null;note('点餐桌查看客人的实时订单，再决定是否优先出餐。');return}
 if(act==='close'){const r=closeService(game);note(r?'日报已经生成。今天的客人会告诉你该研发什么新菜。':'请先完成本晚营业。');return}
 if(act==='to-upgrade'){nextPhase(game,'upgrade');note('所有食材与新菜都会保留到下一天。');return}
 if(act.startsWith('upgrade-kitchen:')){const i=Number(act.split(':')[1]);note(buyKitchenUpgrade(game,i)?'厨位永久升级！今后该工位每单节约 2 秒。':'金币不足或已经升级。');return}
 if(act==='upgrade'){note(buyUpgrade(game)?'厨位升级成功。':'已经升级或金币不足。');return}
 if(act==='upgrade-bag'){note(buyBagUpgrade(game)?`背包扩容完成！下次探索可带 ${game.bagSlots} 种食材。`:'金币不足或已经升满背包。');return}
 if(act==='next-day'){advanceDay(game);note('🌅 新的一天！客人偏好与探索路线在变化。');return}
}
app.addEventListener('click',e=>{
 const tile=e.target.closest('[data-tile]');if(tile&&game.cook){const i=+tile.dataset.tile;if(tileSelected===null){if(game.cook.tiles[i]){tileSelected=i;note('再点一次目的格，交换或移动食材。');}}else{const from=tileSelected;tileSelected=null;note(moveTile(game,from,i)?'已翻动锅内食材。':'本拍换位机会已用完。')}return}
 const discard=e.target.closest('[data-discard]');if(discard){const ok=discardFieldStack(game,discard.dataset.discard);overlay='';note(ok?'已丢弃本次探索的食材格，仓库库存未受影响。':'无法丢弃该材料。');return}
 const ev=e.target.closest('[data-event]');if(ev){if(resolveFieldEvent(game,ev.dataset.event)){message=game.field.actionMessage;render()}return}
 const ch=e.target.closest('[data-choice]');if(ch){if(chooseServiceEvent(game,ch.dataset.choice)){servicePanel='';note(game.service.decisionFlash+'，下一波将兑现。')}else note('目前条件不足或已经处理过本波事件。');return}
 const bp=e.target.closest('[data-breakprep]');if(bp){servicePanel='';note(breakPrep(game,bp.dataset.breakprep)?game.service.decisionFlash+'，下波同款订单将优先出餐。':'原料不足或本波应急机会已用。');return}
 const swap=e.target.closest('[data-apply-swap]');if(swap){const slot=Number(swap.dataset.applySwap),id=app.querySelector(`[data-swap-slot="${slot}"]`)?.value;const ok=swapBreakMenu(game,slot,id);servicePanel='';note(ok?game.service.decisionFlash+'，只影响尚未入店的顾客。':'无法换菜：只能一次，或与现有菜相同。');return}
 const feed=e.target.closest('[data-feed]');if(feed){const [role,id]=feed.dataset.feed.split(':');if(feedCrew(game,role,id)){note(`${CREW_ROLES[role].name}吃下${RECIPES[id].name}，今晚能力已提升。`);}else note('已经吃过员工餐，或者材料不足。');return}
 const assign=e.target.closest('[data-assign]');if(assign){note(assignCrew(game,Number(assign.dataset.assign))?'帮厨已调整工作厨位。':'岗位未变更。');return}
 const a=e.target.closest('[data-act]');if(a){if(!a.disabled)action(a.dataset.act);return}
 const region=e.target.closest('[data-region]');if(region){selectedRegion=region.dataset.region;render();return}
 const route=e.target.closest('[data-route]');if(route){const entered=enterField(game,route.dataset.route);if(entered)startActionField(game);if(entered){message='出发！';flashUntil=0;render()}else note('无法进入路线');return}
 const target=e.target.closest('[data-target]');if(target){game.selectedTarget=target.dataset.target;render();return}
 const item=e.target.closest('[data-ingredient]');if(item){const id=item.dataset.ingredient;if(selectedIngredients.includes(id))selectedIngredients=selectedIngredients.filter(i=>i!==id);else if(selectedIngredients.length<3)selectedIngredients=[...selectedIngredients,id];else message='一锅最多放三种食材。';render();return}
 const book=e.target.closest('[data-book]');if(book){const r=RECIPES[book.dataset.book];selectedIngredients=[...r.ids];selectedMethod=r.method;overlay='';note(`已选择实验线索：${r.hint}`);return}
 const slot=e.target.closest('[data-edit-slot]');if(slot){overlay=`menu:${slot.dataset.editSlot}`;render();return}
 const pick=e.target.closest('[data-menu-pick]');if(pick){const [slot,id]=pick.dataset.menuPick.split(':');game.menu[Number(slot)]=id;overlay='';note(`已上架 ${RECIPES[id].name}，看看厨房的双工位负担。`);return}
 const seat=e.target.closest('[data-seat]');if(seat){const id=+seat.dataset.seat,seatTarget=e.target.closest('[data-seat-index]');const seats=tableSeatState(game.service,id);const o=seatTarget?seats[Number(seatTarget.dataset.seatIndex)]:seats.find(Boolean);selectedOrderId=o?.id||null;note(o?`${CUSTOMERS[o.segment].name}：想吃 ${RECIPES[o.recipeId].name}。`:'这把椅子目前空着。');return}
 const station=e.target.closest('[data-station]');if(station){const pos=station.dataset.station,v=game.service,slot=ensureKitchen(game).slots[pos==='WOK'?0:1],queue=v?v.queued.filter(id=>RECIPES[v.orders.find(o=>o.id===id)?.recipeId]?.station===slot.type).length:0;note(`${pos==='WOK'?'左':'右'}厨位：${slot.type==='WOK'?'炒锅':'炖锅'} Lv.${slot.level}，同类候餐 ${queue} 单。`);return}
 // Realtime field uses the thumb joystick; no grid click-to-walk.
 
});
// Second-finger skill must work while the first finger owns the floating
// joystick. Mobile browsers do not always synthesize a click for multitouch.
app.addEventListener('pointerdown',e=>{const skill=e.target.closest('.field-skill');if(!skill||skill.disabled||game.phase!=='field'||!game.field?.action)return;
 e.preventDefault();if(useFieldSkill(game)){message=game.field.actionMessage;flashUntil=0;}
},{passive:false});
app.addEventListener('pointerdown',e=>{const a=e.target.closest('[data-tile]');if(a&&game.cook&&game.cook.tiles[+a.dataset.tile])drag={i:+a.dataset.tile,x:e.clientX,y:e.clientY};},{passive:true});
app.addEventListener('pointerup',e=>{if(!drag)return;const from=drag;drag=null;if(Math.hypot(e.clientX-from.x,e.clientY-from.y)<25)return;const to=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-tile]');if(to){tileSelected=null;note(moveTile(game,from.i,+to.dataset.tile)?'拖动翻炒成功。':'本拍只能换位一次。')}},{passive:true});
document.addEventListener('keydown',e=>{if(game.phase==='field'&&game.field&&!overlay){const map={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0],w:[0,-1],s:[0,1],a:[-1,0],d:[1,0]};if(map[e.key]){e.preventDefault();keys.add(e.key)}}});
setInterval(()=>{if(document.hidden||overlay)return;if(game.phase==='service'&&game.service&&!game.service.paused&&!game.service.done&&!game.service.breakAt){tick(game,1);serviceTickAt=performance.now();if(game.service.done)message='今晚的顾客已经全部处理完毕，可以查看日报。';else if(game.service.breakAt){servicePanel='event';message='突发经营事件！请选择应对方案，或改菜单、备菜。';}render()}},750);
document.addEventListener('keyup',e=>keys.delete(e.key));
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(walking){clearInterval(walking);walking=null}if(game.phase==='service'&&game.service&&!game.service.paused){game.service.paused=true;message='已自动暂停营业，返回后继续。'}save(game)}});
render();

// The simulation and visual rendering are decoupled: canvas runs each frame,
// the rules tick at a fixed delta, and HTML overlays rerender only on decisions.
function analogAxis(){let x=stick.x,y=stick.y;for(const key of keys){if(['ArrowLeft','a'].includes(key))x-=1;if(['ArrowRight','d'].includes(key))x+=1;if(['ArrowUp','w'].includes(key))y-=1;if(['ArrowDown','s'].includes(key))y+=1;}const l=Math.hypot(x,y);return l>1?[x/l,y/l]:[x,y]}
// Render progress derives from authoritative service seconds; a paused night
// cannot loop arrival or plate animations through an unrelated wall clock.
function restaurantSimTime(now){const v=game.service;if(!v)return gameClock;if(v.paused||v.breakAt||v.done)return v.time;return v.time+Math.max(0,Math.min(1,(now-(serviceTickAt||now))/750));}
function frame(now){const delta=Math.min(.045,(now-(lastFrame||now))/1000);lastFrame=now;gameClock+=delta;
 if(game.phase==='field'&&game.field?.action&&!document.hidden&&!overlay){
  const [dx,dy]=analogAxis(),evt=stepActionField(game,dx,dy,delta);
  if(evt==='field_event'){message='遇见流浪调味师：请选择方案。';releaseStick();render()}
  else if(game.phase!=='field'){releaseStick();message='探索结束：只损失本次背包收获，原仓库安全。';render()}
  else {const f=game.field;const hp=app.querySelector('.field-hp');if(hp)hp.textContent='♥'.repeat(f.hp)+'♡'.repeat(3-f.hp);
   const count=app.querySelector('#field-bag-count');if(count)count.textContent=Object.keys(f.bag).length+'/'+(f.capacity||6);
   const timer=app.querySelector('#field-clock');if(timer)timer.textContent=Math.floor(f.elapsed)+'s';
   const skill=app.querySelector('[data-act="skill"]');const cooldown=app.querySelector('#skill-cooldown');if(skill){skill.disabled=f.skillCd>0;skill.style.setProperty('--cooldown',(f.skillCd/6.5*100).toFixed(2)+'%');if(cooldown){cooldown.hidden=f.skillCd<=0;cooldown.textContent=f.skillCd>0?Math.ceil(f.skillCd)+'s':'';}}
   const fieldNote=app.querySelector('#field-action-notice');if(fieldNote){fieldNote.hidden=!(f.actionMessageTTL>0);if(!fieldNote.hidden)fieldNote.textContent=f.elapsed<2?'移动 · 自动采集 / 攻击':f.actionMessage.slice(0,22);};
  }
 }
 const notice=app.querySelector('#ingame-notice');if(notice&&now>flashUntil)notice.hidden=true;
 const forest=app.querySelector('#forest-canvas');if(forest)drawField(forest,game,gameClock);
 const diner=app.querySelector('#diner-canvas');if(diner)drawDiner(diner,game,gameClock,restaurantSimTime(now));
 if(now-lastSave>1400&&game.phase==='field'){save(game);lastSave=now}
 requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
// Floating analog: anchored at finger-down anywhere on the forest canvas.
// Pointer capture stays on #app, which does not get replaced during scene updates.
function releaseStick(){
 stick.pointer=null;stick.x=stick.y=0;
 const el=app.querySelector('#field-stick');if(el){el.classList.remove('active');el.style.left='-100px';el.style.top='-100px';}
 const knob=app.querySelector('#field-stick-knob');if(knob)knob.style.transform='translate(0px,0px)';
}
function updateStick(e){
 const v=joystickVector(stick.originX,stick.originY,e.clientX,e.clientY,54,9);
 stick.x=v.x;stick.y=v.y;
 const knob=app.querySelector('#field-stick-knob');
 if(knob)knob.style.transform=`translate(${v.knobX}px,${v.knobY}px)`;
}
app.addEventListener('pointerdown',e=>{
 if(game.phase!=='field'||!game.field?.action||game.field.finished||game.field.activeEvent||overlay||stick.pointer!==null)return;
 // The scene is the input surface. Do not steal events from active buttons or dialogs.
 if(!e.target.closest('.action-forest')||e.target.closest('.field-event,button,select'))return;
 e.preventDefault();stick.pointer=e.pointerId;stick.originX=e.clientX;stick.originY=e.clientY;
 const pad=app.querySelector('#field-stick');if(pad){pad.classList.add('active');pad.style.left=e.clientX+'px';pad.style.top=e.clientY+'px';}
 try{app.setPointerCapture(e.pointerId)}catch{}
 updateStick(e);
},{passive:false});
app.addEventListener('pointermove',e=>{
 if(stick.pointer!==e.pointerId)return;e.preventDefault();updateStick(e);
},{passive:false});
for(const name of ['pointerup','pointercancel','lostpointercapture'])app.addEventListener(name,e=>{if(stick.pointer===e.pointerId)releaseStick();});
window.addEventListener('blur',releaseStick);