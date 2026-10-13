import {joystickVector} from './controls_v041.js?v=0.5.5';
import {ING,RECIPES,FORECAST,ROUTES,CUSTOMERS} from './data.js?v=0.9.1';
import {LIVE_ACTIONS,LIVE_STYLES,LIVE_AFFINITY,liveRecipeId,reviewLiveCook,liveHeatSummary} from './cooking_v063.js?v=0.8.0';
import {RECIPE_PROFILES} from './recipe_profiles_v063.js?v=0.8.0';
import {livePanMotion} from './cook_motion_v063.js?v=0.6.3';
import {walkServiceHero} from './walkable_restaurant_v07.js?v=0.9.2';
import {PHASES,newGame,save,load,beginLiveResearch,dropLiveIngredient,performLiveAction,finishLiveResearch,stepLiveResearch,liveCookPreview,ensureRecipeVariants,activeRecipeVariant,chooseRecipeVariant,recipeCraftSnapshot,availableBento,prepareBento,today,serviceDayPlan,tableSeatState,enterField,settleField,discardFieldStack,fieldBagSlotsUsed,completeFieldSegment,chooseFieldBranch,selectFieldWeapon,fieldWeaponChoices,selectedFieldWeaponType,skipField,purchase,startCook,moveTile,beat,finishCook,synergyFor,canMenu,prepDish,createService,tick,expedite,walkableSpecial,activateWalkableSpecial,advanceWalkableInteraction,closeService,nextPhase,advanceDay,buyUpgrade,buyKitchenUpgrade,kitchenUpgradeCost,configureKitchenSlot,kitchenPreview,kitchenRefitCost,kitchenHasMenuCoverage,ensureKitchen,ensureCrew,CREW_ROLES,hireCrew,assignCrew,feedCrew,activeCrewMeal,crewEffects,buyBagUpgrade,bagUpgradePrice,canUse,setServicePaused,resumeBreak,breakPrep,setFlame,tossWok,previewHeat,moveExplorer,interactExplorer,sootheGuest,newRecipeLead,currentServiceEvent,chooseServiceEvent,swapBreakMenu,serviceGoalResult,serviceSupplyStatus,prepStockForecast,premiumMenuOptions,premiumMenuActive,recipeAvailableServings,setPremiumMenu,REGULAR_GUESTS,guestBookEntries,ensureDailyMarket,DAILY_STAPLE_MIN_PURCHASES,expandDiningRoom,ROOM_EXPANSION_COST,roomExpansionAvailable,totalBusinessDay,firstChallenge,tableCapacity} from './engine.js?v=0.10.2';
import {startActionField,stepActionField,useFieldSkill,resolveFieldEvent} from './field_v04.js?v=0.8.4';
import {drawField,drawDiner} from './scenes_v04.js?v=0.9.2';

let game=load()||newGame();
let flashUntil=0;
let message='今天会有怎样的客人上门呢？';
let overlay='',bookTab='recipes',tileSelected=null,selectedOrderId=null;let servicePanel='';
let selectedIngredients=['chicken','chili'],selectedMethod='stir';
let routeTarget=null,walking=null,drag=null,selectedRegion='forest';let livePanPointer=null;
const stick={x:0,y:0,pointer:null,originX:0,originY:0};const keys=new Set();let lastFrame=0,lastSave=0;let gameClock=0;let serviceTickAt=0;const touched=new Map();
const app=document.getElementById('app');
const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const b=(act,text,klass='',disabled=false)=>`<button class="game-btn ${klass}" data-act="${act}" ${disabled?'disabled':''}>${text}</button>`;
const recipeIds=Object.keys(game.recipes);
const phaseLabels={forecast:'今日情报',field:'林间探索',research:'料理实验',menu:'今晚菜单',prep:'营业准备',service:'餐厅营业',report:'营业日报',upgrade:'食堂成长'};
const meal=r=>`${r.emoji} ${r.name}`;
const onlyName=id=>ING[id]?.name||id;
const itemCount=()=>Object.keys(game.recipes).length;

function hud(){
 const home=game.phase==='forecast';
 return `<div class="hud ${home?'v076-home-hud':''}"><div class="brand"><span class="logo" aria-hidden="true">🍳</span><div><strong>怪味食堂</strong><small>${home?'今日营业':'ODDPOT · v0.10.2'}</small></div></div><div class="hud-meta"><span aria-label="金币">🪙 ${game.coins}</span><span aria-label="声望">⭐ ${game.reputation}</span></div><button class="hud-gear" data-act="settings" aria-label="设置">⚙</button></div><div class="day-strip ${home?'v076-home-day':''}"><b>营业第 ${totalBusinessDay(game)} 天 · ${tableCapacity(game)} 座</b><span class="day-phase">${home?'☀ 开店前':phaseLabels[game.phase]}</span>${home?'':`<span class="day-recipes">图鉴 ${itemCount()}/${Object.keys(RECIPES).length}</span>`}</div>`;
}
function toast(){return `<div class="game-toast" role="status"><span>${esc(message)}</span></div>`}
function playablePhase(){return game.phase==='service'||(game.phase==='field'&&!!game.field?.action)}
function sceneNotice(){return `<div class="ingame-notice" role="status" id="ingame-notice" ${performance.now()>flashUntil?'hidden':''}>${esc(message.slice(0,28))}</div>`}
function shell(stage,dock){
 const walk=game.phase==='service'&&game.service?.walkable,home=game.phase==='forecast';
 return `<div class="game-shell ${walk?'v075-game-shell':''} ${home?'v076-home-shell':''} ${game.phase==='field'&&game.field?.action?'is-field-playing':''}">${hud()}<main class="stage ${game.phase}${game.cook?' wok-active':''}">${stage}${playablePhase()?sceneNotice():''}</main>${playablePhase()||home?'':toast()}${walk||home?'':`<nav class="dock">${dock}</nav>`}${overlayMarkup()}</div>`;
}
function overlayMarkup(){if(!overlay)return '';
 let body='';
 if(overlay==='book'){
  if(bookTab==='guests'){
   const entries=guestBookEntries(game),met=entries.filter(x=>x.seen).length;
   const descriptions={adventurer:'从矿井带来猛烈的胃口，格外偏爱辛辣肉香。',family:'雨林的小菌帽一家，温和暖汤最容易打动他们。',regular:'会跳动的史莱姆街坊，喜欢清爽有弹性的菜。',critic:'飘过灵界只为寻找难忘味道的鉴味师。'};
   body=`<h2>👥 客人图鉴</h2><p class="sheet-lead">已认识 ${met}/${entries.length} 类食客 · 只有真实到店才会解锁资料。满意用餐 2 次的具名熟客可尝试隐藏菜。</p>
   <div class="v102-guest-list">${entries.map(g=>`<article class="v102-guest-card ${g.seen?'':'unknown'}">
     <div class="v102-guest-icon" aria-hidden="true">${g.seen?g.emoji:'❔'}</div>
     <div class="v102-guest-detail"><strong>${g.seen?esc(g.name):'未遇见的食客'}</strong>
       ${g.seen?`<small>${esc(descriptions[g.segment])}</small><small>偏好 · ${g.likes.map(esc).join(' / ')}</small>`:'<small>等真正的客人来到餐厅，再了解他们。</small>'}
       ${g.seen&&g.segment==='critic'?'<span class="v102-guest-status ready">可品尝隐藏菜 · 鉴味师</span>':''}
       ${g.seen&&g.guestId?`<div class="v102-regular-info"><span>${g.met?`熟客代表 · ${esc(g.guestName)}`:'熟客代表 · 尚未结识'}</span><small>真实用餐 ${g.visits} 次 · 满意用餐 ${Math.min(2,g.happyMeals)}/2</small><span class="v102-guest-status ${g.premiumEligible?'ready':''}">${g.premiumEligible?'✓ 已获隐藏菜资格':'继续积累好评，解锁隐藏菜'}</span></div>`:''}
     </div></article>`).join('')}</div>`;
  }else{
  ensureRecipeVariants(game);
  const shown=Object.entries(RECIPES).filter(([id])=>game.recipes[id]||RECIPE_PROFILES[id]);
  body=`<h2>📖 料理工艺图鉴</h2><p class="sheet-lead">已解锁 ${itemCount()} 道料理 · 每道菜可收藏不同做法。<b>当前默认工艺已经影响实际营业；点击版本可以更换。</b></p><div class="book-list v063-book-list">${shown.map(([id,r])=>{const learned=!!game.recipes[id],variants=game.recipeVariants?.[id]||[],active=game.activeVariantIds?.[id];
    return `<div class="v063-book-entry"><button class="book-item" data-book="${id}"><span class="book-icon">${learned?r.emoji:'❔'}</span><div><strong>${learned?esc(r.name):'未发现的料理'}</strong><small>${learned?`${r.ids.map(onlyName).join(' + ')} · ${r.station==='WOK'?'炒锅':'深锅'} · 已知 ${variants.length} 种工艺`:esc(r.hint)}</small></div><span>›</span></button>${learned?`<div class="v063-variant-list">${variants.map(v=>`<button data-choose-variant="${id}::${v.variantId}" class="v063-variant-chip ${active===v.variantId?'active':''}">${active===v.variantId?'✓ ':''}${esc(v.styleLabel||LIVE_STYLES[v.style]||'标准工艺')} · 品质 ${v.quality} · ${recipeCraftSnapshot(game,id,v)?.price}币 / ${r.time+(recipeCraftSnapshot(game,id,v)?.timeDelta||0)}秒${v.secondaryTrait?' · '+esc(v.secondaryTrait):''}</button>`).join('')}</div>`:''}</div>`}).join('')}</div>`;
  }
  body=`<div class="v102-book-tabs" role="tablist" aria-label="图鉴分类"><button type="button" role="tab" data-book-tab="recipes" aria-selected="${bookTab==='recipes'}" class="${bookTab==='recipes'?'active':''}">📖 菜谱</button><button type="button" role="tab" data-book-tab="guests" aria-selected="${bookTab==='guests'}" class="${bookTab==='guests'?'active':''}">👥 客人</button></div>`+body;
 }else if(overlay==='field-bag'){
  const f=game.field;
  body=`<h2>🎒 野外背包 · ${fieldBagSlotsUsed(f)}/${f.capacity||8} 格</h2>
  <p class="sheet-lead">每格最多 3 份；同种材料可以占多格。点击具体格子丢弃，本次携带材料会减少，仓库不受影响。</p>
  <div class="book-list">${f.bagStacks.map(st=>`<button class="book-item" data-discard="${st.stackId}"><span class="book-icon">${ING[st.ingredientId].emoji}</span><div><strong>${ING[st.ingredientId].name} ×${st.quantity}</strong><small>${ING[st.ingredientId].acquisitionPolicy==='BOSS_ONLY'?'★ Mini Boss 专属':'点击丢弃这一格'}</small></div><span>✕</span></button>`).join('')||'背包是空的'}</div>`;
 }else if(overlay==='stock'){
  const ids=Object.keys(ING),market=ensureDailyMarket(game),canShop=['forecast','field','research','menu','prep'].includes(game.phase)&&(!game.field||game.field.settled);
  const stockLine=id=>{
   const ing=ING[id],shop=ing.acquisitionPolicy==='SHOP_STAPLE',offer=market.goods[id],owned=game.inventory[id]||0;
   if(!shop)return `<div class="stock-line"><span>${ing.emoji} ${ing.name}</span><b>×${owned}</b><small class="v08-source-only">${ing.acquisitionPolicy==='BOSS_ONLY'?'首领掉落':'野外采集'}</small></div>`;
   if(!offer)return `<div class="stock-line"><span>${ing.emoji} ${ing.name}</span><b>×${owned}</b><small>今日缺货 · 可探索补充</small></div>`;
   return `<div class="stock-line"><span>${ing.emoji} ${ing.name}</span><b>×${owned}</b><small>${offer.price} 金币/份 · 今日剩余 ${offer.stock}</small><div class="v093-buy-actions">${b('buy:'+id,offer.stock?'买 1 份':'售罄','small',!canShop||!offer.stock||game.coins<offer.price)}${b('buy:'+id+':3','买 3 份','small',!canShop||offer.stock<3||game.coins<offer.price*3)}</div></div>`;
  };
  body=`<h2>食材采购</h2><p class="sheet-lead">每天随机上架 3–4 种基础食材；上架的每种至少可买 ${DAILY_STAPLE_MIN_PURCHASES} 份。售罄或缺货可等次日，也可去野外取材。</p>
  <h3>今日上架 ${Object.keys(market.goods).length} / 4 种</h3><div class="stock-list">${ids.filter(id=>ING[id].acquisitionPolicy==='SHOP_STAPLE').map(stockLine).join('')}</div>
  <h3>探索获取</h3><div class="stock-list">${ids.filter(id=>ING[id].acquisitionPolicy!=='SHOP_STAPLE').map(stockLine).join('')}</div>`;
 }else if(overlay==='premium'){
  const options=premiumMenuOptions(game),active=premiumMenuActive(game)?game.premiumMenu:null;
  body=`<h2>✨ 隐藏菜单</h2><p class="sheet-lead">每日仅选一款稀有菜，最多两份。只有鉴味师和关系深厚的熟客会获知，且不保证一定购买。食材将被保留，正式制作时才扣除。</p>
   ${active?`<div class="v010-premium-selected"><strong>今晚：${esc(RECIPES[active.recipeId]?.name||'隐藏菜')}</strong><small>供应 ${active.limit} 份 · ${Math.round(recipeCraftSnapshot(game,active.recipeId).price*1.7)} 金币/份</small><button data-premium-clear>撤下</button></div>`:''}
   <div class="v010-premium-options">${options.length?options.map(x=>`<div class="v010-premium-option">
    <div class="v010-premium-meta"><span>${x.recipe.emoji}</span><div><strong>${esc(x.name)}</strong><small>${x.recipe.station==='WOK'?'炒锅':'炖锅'} · 品质 ${x.quality} · ${x.price} 金币/份 · 可做 ${x.stock} 份</small></div></div>
    <div class="v010-premium-actions"><button data-premium-set="${x.id}:1" ${x.stock<1?'disabled':''}>限量 1 份</button><button data-premium-set="${x.id}:2" ${x.stock<2?'disabled':''}>限量 2 份</button></div>
   </div>`).join(''):'<p class="sheet-lead">暂时没有已研发的稀有料理。尝试击败食材首领，研发特别菜谱。</p>'}</div>`;
 }else if(overlay.startsWith('menu:')){
  const slot=Number(overlay.split(':')[1]);body=`<h2>更换第 ${slot+1} 道上架菜</h2><p class="sheet-lead">“可做份数”按当前工艺与可用库存计算，已扣除隐藏菜预留。不同料理共用的材料不能重复计算。</p><div class="book-list">${Object.keys(game.recipes).map(id=>{const r=RECIPES[id],craft=recipeCraftSnapshot(game,id),isPremium=game.premiumMenu?.recipeId===id&&premiumMenuActive(game),count=recipeAvailableServings(game,id,{ignorePremium:!!isPremium});return `<button data-menu-pick="${slot}:${id}" class="book-item v101-menu-option"><span class="book-icon">${r.emoji}</span><div><strong>${esc(r.name)} · ${r.station==='WOK'?'炒锅':'炖锅'}</strong><small>${r.time+(craft?.timeDelta||0)}秒 · ${craft?.price}金币 · ${craft?.ingredientIds.map(onlyName).join(' + ')}</small><span class="v101-serving-tag ${count===0?'shortage':''}">${count===0?'缺料 · ':''}可做 ${count} 份${isPremium?' · 选为日常将撤下隐藏菜':''}</span></div><span>›</span></button>`}).join('')}</div>`;
 }else if(overlay==='bento'){
  const prepared=game.bento?.day===game.cycle+'-'+game.day;
  const possibilities=availableBento(game);
  body=`<h2>🍱 今日探索便当</h2><p class="sheet-lead">出发前制作一份便当，扣除真实食材。菜谱决定能力、合适工艺能强化；当天研发的新菜明天才能带出门。</p>
  ${prepared?`<div class="detail-row">✅ 已准备 ${esc(RECIPES[game.bento.recipeId]?.name||'便当')} · ${esc(game.bento.styleLabel)}</div>`:
  `<div class="book-list">${possibilities.map(item=>`<button class="book-item" data-bento="${item.recipeId}" ${item.canPrepare?'':'disabled'}>
     <span class="book-icon">${RECIPES[item.recipeId].emoji}</span><div><strong>${esc(item.name)} · ${esc(item.craft?.styleLabel||'标准工艺')}</strong>
     <small>${esc(item.description)}${item.enhanced?' · ✨ 工艺契合':''} · 食材 ${item.craft?.ingredientIds.map(x=>ING[x].emoji).join('')||''}</small></div>
     <span>${item.canPrepare?'准备':'缺料'}</span></button>`).join('')||'<p class="sheet-lead">尚未掌握特色便当菜谱。可以先探索研发，次日再带上。</p>'}</div>`}`;
 }else if(overlay==='crew'){
   const crew=ensureCrew(game),eff=crewEffects(game);
   const row=role=>{const person=crew[role],def=CREW_ROLES[role],meal=activeCrewMeal(game,role);
    const options=person.hired&&!meal&&game.phase==='prep'?`<div class="staff-feed-list">${Object.keys(game.recipes).map(id=>`<button data-feed="${role}:${id}" ${!canUse(game,recipeCraftSnapshot(game,id).ingredientIds)?'disabled':''}>${RECIPES[id].emoji} ${RECIPES[id].name}<small>品质 ${recipeCraftSnapshot(game,id).quality} · ${esc(recipeCraftSnapshot(game,id).styleLabel)}</small></button>`).join('')}</div>`:'';
    const current=role==='helper'?`岗位：${person.station===0?'左':'右'}厨位 · 每单 -${eff.helper.seconds}秒`:`每桌耐心 +${eff.waiter.patience}秒`;
    return `<div class="staff-person"><div class="staff-person-head"><b>${role==='helper'?'🍳':'🧺'} ${def.name} · ${def.job}</b><span>${person.hired?'已雇佣':def.hireCost+' 金币'}</span></div>${person.hired?`<div class="staff-buff">${current} · 熟练 ${person.meals}/3</div>${role==='helper'&&game.phase==='prep'?`<div class="staff-assign">${[0,1].map(i=>`<button data-assign="${i}" class="${person.station===i?'active':''}">${i?'右':'左'}厨位</button>`).join('')}</div>`:''}<p>${meal?`今日员工餐：${RECIPES[meal.recipeId].name} · 品质 ${meal.quality}`:game.phase==='prep'?'选一道已研发料理作为今天的员工餐':'下一次开店前可投喂'}</p>${options}`:b('hire:'+role,'雇佣 '+def.name,'primary',game.coins<def.hireCost)}</div>`;
   };
   body=`<h2>👩‍🍳 食堂伙伴</h2><p class="sheet-lead">雇员永久留下；每人每天最多吃 1 道料理。员工餐真实扣料并增加当日效率，也积累最多 3 点熟练。</p><div class="staff-roster">${row('helper')}${row('waiter')}</div>`;
 }else if(overlay==='settings'){
  body=`<h2>⚙ 试玩设置</h2><p class="sheet-lead">版本 v0.10.2 · 固定 9:16 竖屏 · 单机 localStorage 存档</p>${b('reset','重置存档，从 DAY 1 重新开始','danger')}<p class="sheet-lead">切到后台时营业会自动暂停。更换设备不会同步存档。</p>`;
 }else if(overlay==='details'){
  const r=game.report;body=r?`<h2>营业账本详情</h2><p class="sheet-lead">本日订单由真实食材库存、工位工作秒数和顾客等待事件计算。</p><div class="book-list">${Object.entries(r.byDish).map(([id,d])=>`<div class="detail-row">${RECIPES[id].emoji} ${RECIPES[id].name}：售出 ${d.count} 份 · 满意 ${Math.round(d.totalSat/d.count)}</div>`).join('')}<div class="detail-row">WOK 占用 ${r.congestion.WOK} 秒 / POT ${r.congestion.POT} 秒</div><div class="detail-row">食材耗用估值 ${r.cost} · 招待支出 ${r.hospitalityCost||0} · 收入 ${r.revenue} · 贡献利润 ${r.profit}</div></div>`:'';
 }
 return `<div class="sheet-backdrop" data-act="close-sheet"></div><section class="sheet" role="dialog" aria-modal="true" aria-label="游戏面板"><div class="sheet-header"><span class="sheet-handle"></span>${b('close-sheet','✕','sheet-close')}</div><div class="sheet-body">${body}</div></section>`;
}

function restaurantView(interactive=false){
 const v=game.service;
 if(v?.walkable||!v)return `<div class="diner-world v075-world"><canvas id="diner-canvas" class="diner-canvas" aria-label="怪味食堂可移动餐厅场景"></canvas>${interactive&&v?.walkable?`<div id="diner-stick" class="diner-float-stick" aria-hidden="true"><div id="diner-stick-knob" class="diner-float-knob"></div></div><button id="diner-special" data-act="hero-special" class="diner-special" type="button" hidden aria-label="主动使用主厨技能"></button>`:''}</div>`;
 const table=(i)=>{
  const seats=tableSeatState(v,i),orders=seats.filter(Boolean),active=orders.length>0;
  const seatHtml=seats.map((o,j)=>`<span class="seat-hit-target seat-${j}" data-seat-index="${j}" aria-label="${i+1}桌第${j+1}位${o?CUSTOMERS[o.segment]?.name:'空位'}"></span>`).join('');
  return `<button class="diner-table two-seat ${active?'occupied':''} ${orders.some(o=>o.id===selectedOrderId)?'selected':''}" data-seat="${i}" ${interactive?'':'disabled'} aria-label="${i+1}号双人餐桌：${orders.length}位顾客">
     ${seatHtml}<span class="wood-table"></span>
     <span class="seat-label">${i+1}号桌 · ${orders.length}/2 位</span>
   </button>`;
 };
 const st=position=>{const job=v?.stations[position],slot=ensureKitchen(game).slots[position==='WOK'?0:1],r=job?RECIPES[v.orders.find(o=>o.id===job.orderId)?.recipeId]:null;return `<button class="diner-station" data-station="${position}" ${interactive?'':'disabled'}><span class="station-object">${slot.type==='WOK'?'🍳':'🍲'}</span><strong>${slot.type==='WOK'?'炒锅':'炖锅'} Lv.${slot.level}</strong><small>${r?`${r.emoji} ${job.left}s`:'待命'}</small></button>`};
 return `<div class="diner-world"><canvas id="diner-canvas" class="diner-canvas"></canvas><div class="diner-top"><div class="shop-sign">ODDPOT · 边境小食堂</div><div class="tiny-window">🌙</div></div><div class="diner-kitchen">${st('WOK')}<div class="cook-avatar"><span>👩‍🍳</span><small>主厨</small></div>${st('POT')}</div><div class="service-counter"><i></i>出餐柜台<i></i></div><div class="diner-tables">${table(0)}${table(1)}${v?.tableCount>=3?table(2):''}</div><div class="diner-floor"><span>🪴</span><span class="diner-entry">🚪<small>欢迎光临</small></span><span>🪴</span></div>${v?`<div class="scene-corner">已服务 ${v.orders.filter(o=>o.status==='served').length}/${v.orders.length}</div>`:''}${interactive&&v?.walkable?`<div id="diner-stick" class="diner-float-stick" aria-hidden="true"><div id="diner-stick-knob" class="diner-float-knob"></div></div><button id="diner-special" data-act="hero-special" class="diner-special" type="button" hidden aria-label="主动使用主厨技能"></button>`:''}</div>`;
}
function sceneTag(title,sub=''){return `<div class="scene-tag"><strong>${title}</strong>${sub?`<small>${sub}</small>`:''}</div>`}
function forecast(){
 const plan=serviceDayPlan(game);
 const stock=Object.values(game.inventory).reduce((sum,n)=>sum+n,0);
 const bentoReady=game.bento?.day===game.cycle+'-'+game.day;
 const title=firstChallenge(game)?'爆炎厨王踢馆':plan.pressure;
 const brief=firstChallenge(game)?'评委将重点关注辛辣与爆香料理。':'招待古怪食客、积累口碑、赚金币把食堂扩得更大！';
 return [`
 <div class="v076-home">
  <section class="v076-mission" aria-label="今日营业目标">
    <div class="v076-mission-meta"><span>☀ 今日营业计划</span><span>👥 预计 ${plan.count} 位</span></div>
    <h1>${esc(title)}</h1>
    <p><span aria-hidden="true">🎯</span> ${esc(plan.goal.label)}</p>
    <small>${brief}</small>
  </section>
  <section class="v076-preview" aria-label="餐厅当前布局">
    ${restaurantView(false)}
  </section>
  <section class="v076-home-controls" aria-label="开店前可用操作">
    <div class="v076-home-resources"><strong>出发准备</strong><span>🎒 食材 ${stock} 份 · 可补货 ${Object.values(ensureDailyMarket(game).goods).reduce((sum,x)=>sum+x.stock,0)} 份</span></div>
    <div class="v076-home-shortcuts">
      <button type="button" data-act="stock"><span aria-hidden="true">🧺</span> 采购</button>
      <button type="button" data-act="bento"><span aria-hidden="true">🍱</span> 便当${bentoReady?' ✓':''}</button>
      <button type="button" data-act="book"><span aria-hidden="true">📖</span> 图鉴</button>
    </div>
    <button type="button" class="v076-home-primary" data-act="to-field">🌲 出门取材 <span aria-hidden="true">→</span></button>
  </section>
 </div>`,'' ];
}
function bossHint(region){
 const hot=region==='spring',ingredient=hot?'ember_pepper':'mushroom_heart',boss=hot?'熔壳椒王':'孢冠菇王';
 const first=!game.bossCleared?.[hot?'ember_king':'spore_king'];
 return {boss,name:ING[ingredient].name,qty:first?2:1,emoji:ING[ingredient].emoji};
}
function field(){
 const f=game.field;
 if(!f){
  const activeRoutes=selectedRegion==='forest'?ROUTES:[{id:'spring_safe',name:'热泉浅滩',emoji:'♨',subtitle:'火椒、蒜瓣 · 可避开战斗'},{id:'spring_risk',name:'热泉断坡',emoji:'🌋',subtitle:'深入第三段必遇熔壳椒王 · 熔心椒晶'}];
  return [
 `<div class="forest-scene route-scene ux-route">${forestBackdrop()}<div class="route-panel">
   <div class="route-intro"><span class="ux-kicker">出发准备</span><h2>今天去哪找食材？</h2><p>缺什么，就去哪。</p></div>
   <div class="ux-field-label"><strong>目标食材</strong><span>当前：${ING[game.selectedTarget]?.name||'未选'}</span></div>
   <div class="target-scroller" role="group" aria-label="目标食材">${Object.entries(ING).filter(([id,ing])=>ing.acquisitionPolicy!=='BOSS_ONLY').map(([id,ing])=>`<button class="target-chip ${game.selectedTarget===id?'chosen':''}" data-target="${id}" aria-pressed="${game.selectedTarget===id}">${ing.emoji} ${ing.name}</button>`).join('')}</div>
   <div class="ux-field-label"><strong>探索区域</strong></div>
   <div class="region-tabs" role="group" aria-label="探索区域"><button data-region="forest" class="${selectedRegion==='forest'?'current':''}" aria-pressed="${selectedRegion==='forest'}">晨露森林</button><button data-region="spring" class="${selectedRegion==='spring'?'current':''}" aria-pressed="${selectedRegion==='spring'}">热泉峡谷</button></div>
   <div class="ux-field-label"><strong>携带厨具</strong><span>升级也会影响探索</span></div>
   <div class="v08-weapon-picks">${fieldWeaponChoices(game).map(({type,level,slotIndex,fitted})=>`<button class="v08-weapon-pick ${selectedFieldWeaponType(game)===type?'chosen':''}" data-weapon="${type}" aria-pressed="${selectedFieldWeaponType(game)===type}">${type==='WOK'?'🛡️ 炒锅剑盾':'🍲 炖锅投弹'} · Lv${level}<small>${fitted?`${slotIndex===0?'左':'右'}厨位强化`:'备用基础款'} · ${type==='WOK'?'自动正面格挡':'远程范围爆炸'}</small></button>`).join('')}</div>
   <div class="ux-field-label"><strong>路线</strong><span>点击出发</span></div>
   <div class="route-options">${activeRoutes.map(r=>`<button class="route-card ${/risk/.test(r.id)?'route-risk':'route-safe'}" data-route="${r.id}"><span class="route-emoji" aria-hidden="true">${r.emoji}</span><div><strong>${r.name}</strong><small>${/risk/.test(r.id)?`${r.subtitle} · 第三段必遇${bossHint(selectedRegion).boss} · 掉落${bossHint(selectedRegion).name} ×${bossHint(selectedRegion).qty}，留 1 格背包`:r.subtitle}</small></div><span class="route-risk-label">${/risk/.test(r.id)?'高风险':'安全'}</span><b aria-hidden="true">›</b></button>`).join('')}</div>
  </div></div>`,
 `<div class="dock-head"><span>最多三段探索 · 可随时回店</span><span>背包 ${game.bagSlots||8} 格</span></div><div class="action-row">${b('bento','🍱 便当','secondary')}${b('skip-field','暂不探索 · 去研发','secondary wide')}</div>`]
 }
 if(f.segmentStatus==='choice'){
  const boss=bossHint(f.region),slots=fieldBagSlotsUsed(f),full=slots>=f.capacity;
  return [`<div class="forest-scene v08-branch-scene"><div class="v08-branch-panel"><small>第 ${f.segmentIndex}/3 段探索完成</small><h2>继续深入，还是回饭店？</h2>
  <p>背包 ${slots}/${f.capacity} 格 · 生命 ${f.hp}/3 · ${f.weapon?.type||'WOK'} Lv${f.weapon?.level||1}</p>
  ${f.dangerCommitment?`<div class="v082-boss-promise">⚔️ 第三段必遇 ${boss.boss} · ${boss.emoji}${boss.name} ×${boss.qty}</div>`:''}
  <div class="v08-branch-cards">${f.choices.map(c=>`<button class="v08-branch-card" data-branch="${c.choiceId}">
  <strong>${c.danger?'⚠️':'🌿'} ${c.name}</strong><span>${c.description}</span>
  <small>${c.danger?`⚔️ 第三段 ${boss.boss} · ${boss.name} ×${boss.qty}`:'🌱 普通资源 / 特殊事件'}</small>
  </button>`).join('')}</div>
  ${full?`<div class="v082-bag-warning">🎒 背包已满！Boss 奖励需要空格。可从背包丢弃一格材料。</div><button class="v082-manage-bag" data-act="field-bag">整理背包</button>`:`<p class="v082-bag-reminder">🎒 建议为后续稀有食材保留至少 1 格。</p>`}
  <button type="button" class="v08-home-choice" data-act="retreat">🏠 带着收获回饭店</button></div></div>`, ''];
 }
 const readyToFinish=f.nodes?.some(n=>n.key==='target'&&n.claimed)&&!(f.segmentIndex===3&&f.enemies?.some(e=>e.isBoss&&e.hp>0));
 const bag=Object.entries(f.bag).map(([id,n])=>`${ING[id].name}${n}`).join(' · ')||'空';
 const event=f.activeEvent&&f.nodes.find(n=>n.key===f.activeEvent);
 return [`<div class="forest-scene action-forest"><canvas id="forest-canvas" class="forest-canvas"></canvas><div class="floating-joystick" id="field-stick" aria-hidden="true"><div class="floating-joystick-knob" id="field-stick-knob"></div></div><div class="action-hud" aria-label="探索状态"><span class="field-hp" aria-label="体力">${'♥'.repeat(f.hp)}${'♡'.repeat(3-f.hp)}</span><button data-act="field-bag" class="field-bag-chip" aria-label="查看野外背包">背包 <b id="field-bag-count">${fieldBagSlotsUsed(f)}/${f.capacity||8}</b></button><span class="field-clock" id="field-clock">${f.segmentIndex||1}/3 · ${Math.floor(f.elapsed)}s</span></div><div class="field-action-notice" id="field-action-notice" hidden></div>${f.weapon?.type==='WOK'?`<div class="v082-shield-status" id="v082-shield-status" aria-label="锅盖被动防御状态">${f.shieldCharge!==false?'🛡 防御就绪':'🛡 蓄能 '+Math.ceil(f.shieldCooldown||0)+'s'}</div>`:''}${f.bento?`<div class="v063-field-bento">🍱 ${esc(RECIPES[f.bento.recipeId]?.name||"便当")} · <span id="v063-bento-effect">${f.bento.used?"已触发":"待触发"}</span></div>`:""}<button data-act="skill" class="field-skill" aria-label="${f.weapon?.type==='POT'?'高压洋葱炸弹':'锅盖反击'}"><span class="skill-glyph" aria-hidden="true">${f.weapon?.type==='WOK'?'🛡':'🧅'}</span><span class="skill-caption">${f.weapon?.type==='POT'?'汤锅':'反击'}</span><span class="skill-cooldown" id="skill-cooldown" hidden></span></button>${event?`<div class="field-event"><strong>野外遭遇 · 流浪调味师</strong><p>你在林中发现一份料理线索，如何处理？</p><button data-event="trade">用蘑菇交换火椒</button><button data-event="forage">深入调查：损失生命，争取两份材料</button><button data-event="leave">绕开，保留现有收获</button></div>`:''}</div>`,
 `<div class="action-field-dock field-compact-dock"><span class="field-touch-tip">按住场景 · 拖动移动</span>${readyToFinish?b('finish-segment',f.segmentIndex===3?'探索结束 · 返回':'结束本区 · 选择下一站','primary'):''}${b('retreat','撤离回店','secondary')} </div>`]
}

function forestBackdrop(){return `<div class="forest-cloud c1">🌲</div><div class="forest-cloud c2">🌲</div><div class="forest-cloud c3">🍄</div><div class="forest-cloud c4">🌿</div><div class="forest-cloud c5">🦬</div>`}
function researchReceipt(){
 const result=game.lastCook,ok=!!result?.sellable;
 const profile=RECIPE_PROFILES[result?.recipeId];
 const record=game.recipeVariants?.[result?.recipeId]?.find(v=>v.variantId===result?.variantId);
 const craft=ok?recipeCraftSnapshot(game,result.recipeId,record):null;
 const recipe=RECIPES[result?.recipeId];
 const review=reviewLiveCook(result);
 const guests=craft?Object.entries(craft.guestFitDelta).filter(([,n])=>n!==0).map(([id,n])=>`${CUSTOMERS[id]?.name||id} ${n>0?'+':''}${n}`).join(' · '):'';
 const crew=profile?.crewSpecific?.style===result.style?`${profile.crewSpecific.role==='helper'?'阿火':'小芽'}专项适配（受岗位及原有上限限制）`:'使用菜品原有员工餐风味收益';
 const bento=profile?.bentoSpecific?`可制作「${esc(recipe?.name)}」探索便当${profile.bentoSpecific.preferredStyle===result.style?' · 本工艺特别契合':''}；次日出发前制作`:'当前无专属探索便当';
 return [`<div class="v063-receipt ${ok?'pass':'failed'}">
    <div class="v063-receipt-head"><span>${ok?recipe?.emoji||'🍽️':'🍲'}</span>
      <div class="v063-receipt-kicker">${ok?'✨ 料理研发成功':'⚠ 本次研发失败'}</div>
      <h2>${esc(ok?result.recipeName:result.status)}</h2>
      <small>${ok?(result.firstDiscovery?'🎉 全新菜谱首次发现':result.newTechnique?'📖 新工艺已写入图鉴':'已有工艺再次尝试'):'本锅无法加入菜单或收藏'}</small>
    </div>
    <div class="v063-receipt-scroll">
      ${ok?`<div class="v063-receipt-tags"><b>${esc(result.styleLabel)}</b><span>${esc(result.secondaryTrait||'自然烹制')}</span><span>${esc(result.affinityLabel)}</span></div>
      <div class="v063-receipt-metrics"><div><small>完成品质</small><b>${result.quality}</b><small>${review.atReachableMax?'已达到当前机制最高品质':'当前机制上限 '+review.maxQuality}</small></div><div><small>自动制作</small><b>${recipe.time+(craft?.timeDelta||0)}s</b></div><div><small>售卖价格</small><b>${craft.price} 🪙</b></div></div>`:''}
      <section><strong>🥘 操作复盘</strong><p>${esc(result.ids.map(id=>ING[id].emoji+' '+ING[id].name).join(' + '))} · ${result.vessel==='WOK'?'炒锅':'深锅'} · ${result.duration.toFixed(1)} 秒</p>
       <small class="v103-recap-legend">● 绿：判定有效　◆ 黄：可优化　✕ 红：确实失误</small>
       <div class="v103-recap-steps">${review.steps.map(step=>`<div class="v103-recap-step ${step.grade}"><span class="v103-recap-dot" aria-hidden="true">${step.grade==='good'?'✓':step.grade==='bad'?'✕':'!'}</span><time>${step.time.toFixed(1)}s</time><div><strong>${esc(step.label)}</strong><small>${esc(step.detail)}</small></div></div>`).join('')}</div>
      </section>
      <section><strong>🌡 熟度与结果</strong><div class="v063-receipt-line">${result.doneness.map(d=>`<span>${ING[d.id].emoji} ${esc(d.label)}</span>`).join('')}</div>
        <p>${esc(result.reason)} · 食材估值 ${result.ingredientCost||0} 金币（已消耗真实库存）</p></section>
      ${ok?`<section><strong>📋 这次工艺的实际用途</strong>
        <p>🍽️ 营业：${guests?`客群匹配 ${esc(guests)}`:'采用菜谱的基础客群匹配'}；${craft.timeDelta!==0?`工序 ${craft.timeDelta>0?'+':''}${craft.timeDelta}s`:'不额外改变制作时间'}；${craft.price!==recipe.price?`价格由 ${recipe.price} 调整为 ${craft.price} 金币`:'保持菜谱原价'}。</p>
        <p>👩‍🍳 员工餐：${esc(crew)}。</p><p>🍱 探索：${esc(bento)}。</p>
        <small>工艺永久掌握，但每次做成实物仍需实际原料。</small></section>`:
        `<section class="v063-receipt-warning"><strong>为什么不能上架？</strong><p>${esc(result.reason)}。本锅原料已消耗；尝试晚一些起锅或调整下料顺序，不必追求精准 QTE。</p></section>`}
    </div>
 </div>`,
 `<div class="v063-receipt-dock"><div class="action-row">${b('receipt-retry','↶ 再试一道','secondary') }${b('receipt-finish','📖 回研发','primary wide')}</div>
    <div class="action-row">${ok?b('book','查看工艺图鉴','secondary'):''}${b('receipt-menu','去经营上架 →','secondary')}</div></div>`]
}

function research(){const c=game.cook;
 if(!c&&game.researchReceipt&&game.lastCook?.events)return researchReceipt();
 if(!c||c.mode==='v063-live'){
  if(c){
   const p=liveCookPreview(game),heat=liveHeatSummary(p.indicators),acts=LIVE_ACTIONS[c.vessel],order=c.dropped.map(d=>d.id),icons=c.dropped.map(d=>`<span class="v063-food-icon" data-live-icon="${d.id}">${ING[d.id].emoji}</span>`).join('');
   return [`<div class="v063-live-scene">
     <div class="v063-live-head"><b>${c.vessel==='WOK'?'🍳 炒锅 · 连续实时':'🍲 深锅 · 连续实时'}</b><span id="v063-clock">${p.elapsed.toFixed(1)}s / 19s</span></div>
     <div class="v063-live-pan ${c.vessel==='POT'?'pot':''}" data-live-pan="true">
       <div class="v063-bowl">${c.vessel==='POT'?'<div class="v063-broth"></div>':''}</div>
       <div class="v063-pan-glow" aria-hidden="true"></div>
       <div class="v063-pan-ripple" aria-hidden="true"></div>
       <div class="v063-food-layer">${icons||'<span class="v063-pan-hint">轻点下方食材下锅</span>'}</div>
       <div class="v063-action-indicator" aria-live="off"></div>
       <div class="v063-steam">♨</div></div>
     <div class="v063-live-msg v103-heat-status" id="v103-heat-status" data-heat-tone="${heat.tone}"><span aria-hidden="true">🌡</span><b id="v103-heat-label">${heat.label}</b><small id="v103-heat-detail">${heat.details}</small></div>
     <div class="v063-live-tray">${c.ids.map(id=>{const d=p.indicators.find(x=>x.id===id);return `<button class="v063-drop ${d.dropped?'added':''}" data-live-drop="${id}" data-heat-tone="${d.tone}" ${d.dropped?'disabled':''}><span>${ING[id].emoji}</span><b>${ING[id].name}</b><small data-live-status="${id}">${d.state}</small><i class="v103-heat-meter" aria-hidden="true"><i data-heat-fill="${id}" style="width:${d.progress}%"></i></i></button>`}).join('')}</div>
   </div>`,
   `<div class="v063-live-actions"><div class="action-row">${acts.map(a=>b('live-action:'+a.id,a.emoji+' '+a.name,c.actions.some(x=>x.type===a.id)?'chosen':'secondary',!c.dropped.length||c.actions.some(x=>x.type===a.id))).join('')}</div><div class="action-row">${b('live-finish','🍽️ 起锅鉴定','primary wide',!c.dropped.length||c.elapsed<1.2)}</div></div>`];
  }
  const featured=selectedIngredients.length>=2?liveRecipeId(selectedIngredients,selectedMethod==='stir'?'WOK':'POT'):null;
  const r=featured?RECIPES[featured]:null;
  const last=game.lastCook&&game.lastCook.events?game.lastCook:null;
  return [`<div class="v063-setup">
    <div class="v063-setup-title"><strong>🔥 实时料理研发</strong><small>只挑厨具与食材，开火后由你决定下料顺序</small></div>
    <div class="v063-vessels"><button class="v063-vessel ${selectedMethod==='stir'?'chosen':''}" data-act="method:stir">🍳 炒锅<br><small>翻炒 · 颠勺</small></button><button class="v063-vessel ${selectedMethod==='stew'?'chosen':''}" data-act="method:stew">🍲 深锅<br><small>轻搅 · 收汁</small></button></div>
    <div class="v063-label">选 2–3 种食材 <small>${selectedIngredients.length}/3</small></div>
    <div class="v063-food-picker">${Object.entries(ING).map(([id,ing])=>`<button data-ingredient="${id}" class="${selectedIngredients.includes(id)?'picked':''}" ${!game.inventory[id]&&!selectedIngredients.includes(id)?'disabled':''}><span>${ing.emoji}</span><b>${ing.name}</b><small>×${game.inventory[id]||0}</small></button>`).join('')}</div>
    <div class="v063-recipe-clue">${r?`预计菜品：<strong>${esc(r.name)}</strong> · ${r.station==='WOK'?'炒锅':'深锅'}`:'选择食材组合后，在实际下料中发现不同工艺。'}<small>同一道菜可研究「家常、爆炒、香味十足」等不同路线。</small></div>
    ${last?`<div class="v063-last-result ${last.sellable?'ok':'fail'}"><b>${last.sellable?'✅ 研发成功':'❌ 研发失败'}：${esc(last.recipeName||'料理')}</b><small>${last.sellable?`${esc(last.styleLabel)} · ${esc(last.affinityLabel)} · 品质 ${last.quality}`:esc(last.reason)}${last.sellable?' · 已记入工艺图鉴':' · 原料已消耗，未收录'}</small></div>`:''}
  </div>`,`<div class="action-row">${b('start-research','🔥 亲手下料，开始研发','primary wide',selectedIngredients.length<2||!canUse(game,selectedIngredients))}${b('book','📖 工艺图鉴','secondary')}${b('to-menu','去上架 →','secondary')}</div>`];
 }
 
 if(c){const heat=previewHeat(c);const board=c.tiles.map((t,i)=>`<button class="wok-tile ${t?'filled':''} ${tileSelected===i?'active':''} ${t&&heat[i]>ING[t.id].hi?'too-hot':''}" data-tile="${i}">${t?`<span>${ING[t.id].emoji}</span><b>${t.heat}</b><small>→${heat[i]}</small>`:`<small>${[1,2,1,2,3,2,1,2,1][i]}</small>`}</button>`).join('');return [
 `<div class="wok-scene"><div class="wok-caption">🔥 ${c.method==='stir'?'爆炒':'焖煮'} · 第 ${Math.min(c.beats+1,3)} / 3 拍 · <b>${c.beats===3?'可以出锅':'拖动或点击换位'}</b></div><div class="wok-rim"><div class="wok-grid">${board}</div></div><div class="wok-ingredients">${c.tiles.filter(Boolean).map(t=>`<div>${ING[t.id].emoji} <strong>${t.heat}</strong><small>理想 ${ING[t.id].lo}–${ING[t.id].hi}</small></div>`).join('')}</div><div class="wok-explainer">${c.beats===3?'三拍完成！现在出锅看看发现了什么。':'每拍可换位或颠锅一次。火候累积，避免生熟不均与焦化。'}</div></div>`,
 `<div class="fire-modes">${[-1,0,1].map(v=>b(`flame:${v}`,v===-1?'小火':v===0?'标准':'猛火',c.flame===v?'chosen':'',c.beats===3)).join('')}</div><div class="action-row">${b('toss','↻ 颠锅','secondary',c.beats===3)}${c.beats===3?b('finish','🍽 起锅鉴定！','primary wide'):b('heat','🔥 加热一拍','primary wide')}</div>`];}
 const recipeCount=Object.keys(RECIPES).length;
 return [`<div class="research-scene"><div class="research-board"><div class="cauldron">🍳</div><div class="research-label">自由搭配食材，解锁新的料理</div><div class="ingredients-board">${Object.entries(ING).map(([id,ing])=>`<button class="ingredient-tile ${selectedIngredients.includes(id)?'picked':''}" data-ingredient="${id}" ${!game.inventory[id]&&!selectedIngredients.includes(id)?'disabled':''}><span>${ing.emoji}</span><strong>${ing.name}</strong><small>×${game.inventory[id]||0}</small></button>`).join('')}</div><div class="selected-caption">已下料：${selectedIngredients.map(id=>ING[id].emoji).join(' + ')} ${selectedIngredients.length}/3</div><div class="hint-glow">📖 已掌握 ${itemCount()}/${recipeCount} 道菜 · ${recipeCount-itemCount()} 道等待发现</div></div></div>`,
 `<div class="action-row method-pick">${b('method:stir','🔥 爆炒',selectedMethod==='stir'?'chosen':'secondary')}${b('method:stew','🍲 焖煮',selectedMethod==='stew'?'chosen':'secondary')}${b('book','📖 图鉴','secondary')}</div><div class="action-row">${b('start-research','开锅实验','primary wide',selectedIngredients.length<2||!canUse(game,selectedIngredients))}${b('to-menu','去上架 →','secondary')}</div>`]
}
function menu(){const syn=synergyFor(game.menu);const wok=game.menu.filter(id=>RECIPES[id]?.station==='WOK').length,pot=3-wok;
 return [`<div class="menu-scene"><div class="menu-title">🪧 今晚菜单 · 3 道</div><div class="menu-blackboard">${game.menu.map((id,i)=>{const r=RECIPES[id];return `<button class="menu-line" data-edit-slot="${i}"><span class="menu-num">0${i+1}</span><span class="menu-icon">${r?.emoji||'❔'}</span><div><strong>${r?.name||'未选择'}</strong><small>${r?.station} · ${r?.time+(recipeCraftSnapshot(game,id)?.timeDelta||0)}s · 售价 ${recipeCraftSnapshot(game,id)?.price} · 工艺：${esc(activeRecipeVariant(game,id)?.styleLabel||'标准')}</small><small class="v101-menu-capacity ${recipeAvailableServings(game,id)===0?'shortage':''}">当前可做 ${recipeAvailableServings(game,id)} 份</small></div><span class="menu-switch">⇄</span></button>`}).join('')}</div><button type="button" class="v010-premium-entry" data-act="premium"><span>✨ 隐藏菜</span><strong>${premiumMenuActive(game)?esc(RECIPES[game.premiumMenu.recipeId]?.name)+' · 限'+game.premiumMenu.limit+'份':'未设置 · 可选稀有料理'}</strong><span>›</span></button><div class="menu-forecast">${today(game).hint}<small style="display:block;opacity:.8;margin-top:3px">单菜份数按当前可用材料计算；多道菜共用食材，不可直接相加。工艺影响实际售价与制作时间。</small></div><div class="menu-balance"><div>🍳 炒锅任务 <strong>${wok}</strong></div><div>🍲 炖锅任务 <strong>${pot}</strong></div></div><div class="synergy-box">✨ ${syn?`主共鸣：${syn}`:'暂无主共鸣 · 不同料理搭配可能产生额外好评'}</div></div>`,
 `<div class="dock-head"><span>点击菜名替换 · 厨房仅有两口锅</span></div><div class="action-row">${b('book','📖 图鉴','secondary')}${b('to-prep','确认菜单 →','primary wide',!canMenu(game))}</div>`]
}
// The pre-opening stock check is deliberately small, unlike the full stock
// sheet. It forecasts a three-dish split of expected visitors, never a
// guaranteed number of orders or a forced purchase before opening.
function prepInventoryCheck(){
 const f=prepStockForecast(game),risky=f.shortageCount>0;
 const visible=f.shortages.slice(0,2);
 const summary=risky?`预计 ${f.shortageCount} 种原料偏紧`:'按今晚客流估算，备货较充足';
 const detail=risky?
  visible.map(x=>`${ING[x.id]?.emoji||'•'} ${esc(ING[x.id]?.name||x.id)} ${x.have}/${x.needed}`).join(' · ')+(f.shortageCount>2?` 等${f.shortageCount}种`:''):
  `预计 ${f.guestCount} 位客人 · 已预制 ${f.coveredByPrep} 份`;
 const action=risky&&f.purchasableCount===0?'查看':'采购';
 return `<section class="v095-stock-check ${risky?'v095-stock-risk':'v095-stock-good'}" aria-label="开业前库存估算">
 <div class="v095-stock-copy"><strong>${risky?'⚠️':'✓'} ${esc(summary)}</strong><small>${detail}</small></div>
 <button type="button" data-act="stock" class="v095-stock-action" aria-label="查看库存与今日采购">${action} ›</button>
 </section>`;
}
function prep(){
 const k=ensureKitchen(game),preview=kitchenPreview(game);
 const slotCards=k.slots.map((slot,i)=>`<div class="kitchen-config-slot"><span><b>${i===0?'左厨位':'右厨位'}</b><small>Lv.${slot.level}${slot.level===2?' · 制作 -2秒':''}</small></span><div class="kitchen-choice"><button data-act="kitchen:${i}:WOK" class="${slot.type==='WOK'?'active':''}" aria-pressed="${slot.type==='WOK'}">炒锅</button><button data-act="kitchen:${i}:POT" class="${slot.type==='POT'?'active':''}" aria-pressed="${slot.type==='POT'}">炖锅</button></div></div>`).join('');
 const dayPlan=serviceDayPlan(game);
 const pressure=preview.pressure.map(p=>`${p.type==='WOK'?'炒锅':'炖锅'} ${p.menu}菜 / ${p.capacity}位`).join('　');
 return [`<div class="scene-bg diner-bg">${restaurantView(false)}<div class="prep-card kitchen-prep-card"><h2>厨房排布 · 备餐</h2><div class="kitchen-config-head">${preview.valid?'设备覆盖菜单':'缺少：'+preview.risk.map(t=>t==='WOK'?'炒锅':'炖锅').join(' / ')}</div><div class="kitchen-config-slots">${slotCards}</div><p class="kitchen-pressure">${pressure}</p><p class="kitchen-refit">本日首次换锅免费 · 后续每次 ${kitchenRefitCost(game)||12} 金币</p><button class="staff-open-prep" data-act="crew">👩‍🍳 员工餐与岗位 <span>${Object.values(ensureCrew(game)).filter(x=>x.hired).length}/2 人 ›</span></button><div class="service-day-brief"><b>${dayPlan.pressure}</b><span>预计 ${dayPlan.count} 人 · ${dayPlan.goal.label}</span></div>${premiumMenuActive(game)?`<div class="v101-premium-summary" aria-label="今晚隐藏菜单"><span aria-hidden="true">✨</span><div><strong>隐藏菜 · ${esc(RECIPES[game.premiumMenu.recipeId]?.name)}</strong><small>限量 ${game.premiumMenu.limit} 份 · 食材已预留</small></div></div>`:''}${prepInventoryCheck()}<div class="prep-divider">开业前预制</div><div class="prep-items">${game.menu.map(id=>`<button class="prep-item" data-act="prep:${id}" ${!canUse(game,recipeCraftSnapshot(game,id).ingredientIds)?'disabled':''}>${RECIPES[id].emoji} ${RECIPES[id].name}<span>已备 ${game.prep[id]||0} · ＋1</span></button>`).join('')}</div></div></div>`,
 `<div class="dock-head"><span>${preview.valid?'厨房就绪，可开业': '先给菜单配置所需锅具'}</span><span>金币 ${game.coins}</span></div><div class="action-row">${b('crew','员工','secondary')}${b('open','开门迎客','primary wide',!preview.valid)}</div>`]
}
function serviceLegacy(){const v=game.service;if(!v)return ['<div class="empty">餐厅正在准备...</div>',b('open','开业','primary')];
 const served=v.orders.filter(o=>o.status==='served').length;
 const events=v.events.slice(-2).reverse().map(e=>e.type==='served'?`😋 ${RECIPES[e.recipeId]?.name} 获赞 ${e.sat}分`:e.type==='left'?'😟 客人久等离开':e.type==='guest_care'?'💛 招待了等待的客人':e.type==='started'?'🍳 后厨开始制作':'').filter(Boolean);
 const selected=v.orders.find(o=>o.id===selectedOrderId);
 const situation=serviceSupplyStatus(game),goal=serviceGoalResult(v),reached=goal?.value??0;
 const remaining=Math.max(0,(goal?.target??0)-reached);
 const shortage=situation.shortages[0];
 const shortageText=shortage?`缺 ${shortage.missing.map(x=>`${ING[x.id].name}×${x.amount}`).join('、')} · ${RECIPES[shortage.recipeId]?.name} 等料`:
 situation.lastProblem?`缺料退单：${(situation.lastProblem.missing||[]).map(id=>ING[id]?.name||id).join('、')}`:'';
 const status=`第 ${Math.min(v.wave+1,3)}/3 波 · 营业 ${v.time}s · ${served}/${v.orders.length} 已送达`;
 const operationalHud=`<div class="service-operational-hud"><div class="service-demand-line"><b>${esc(v.scenario||'食堂营业')}</b><span>到店 ${situation.arrived}/${v.orders.length} · 待做 ${situation.queued} · 烹饪 ${situation.cooking}</span></div><div class="service-goal-progress ${goal?.success?'complete':''}"><span>🎯 ${esc(goal?.label||'经营目标')}</span><strong>${reached}/${goal?.target||1}${goal?.success?' ✓':''}</strong><i style="--fill:${Math.min(100,Math.round(100*reached/Math.max(1,goal?.target||1)))}%"></i></div>${shortageText?`<div class="service-stock-warning" role="status">⚠ ${esc(shortageText)}</div>`:v.goalCelebrated&&v.events.findLast(e=>e.type==='goal_reached'&&v.time-e.t<=4)?`<div class="service-goal-celebration">★ 今日任务完成！口碑奖励将在日报结算</div>`:''}</div>`;
 return [`<div class="scene-bg diner-bg service-scene">${restaurantView(true)}<div class="service-mini-hud"><strong>第 ${Math.min(v.wave+1,3)}/3 波</strong><span>${v.time}s</span><span>上菜 ${served}/${v.orders.length}</span>${v.paused?'<b class="paused-chip">暂停</b>':''}</div>${operationalHud}${v.breakAt&&currentServiceEvent(game)&&servicePanel==='event'?`<div class="management-card"><strong>${currentServiceEvent(game).title}</strong><p>${currentServiceEvent(game).description}</p>${currentServiceEvent(game).choices.map(ch=>`<button data-choice="${ch.id}"><b>${ch.label}</b><small>${ch.detail}</small></button>`).join('')}</div>`:''}${v.breakAt&&servicePanel==='swap'?`<div class="management-card"><strong>换一道下一波招牌菜</strong><p>下一波到店客人才会按照新菜单点单，当前桌位不受影响。</p>${game.menu.map((id,i)=>`<div class="break-choice-line">${i+1}·${RECIPES[id].name} <select data-swap-slot="${i}">${Object.keys(game.recipes).map(r=>`<option value="${r}" ${r===id?'selected':''}>${RECIPES[r].name}</option>`).join('')}</select><button data-apply-swap="${i}">替换</button></div>`).join('')}</div>`:''}${v.breakAt&&servicePanel==='prep'?`<div class="management-card"><strong>补一份应急餐点</strong><p>现在扣除食材；下一波同款订单可直接上桌，卖不完会计入报损。</p>${game.menu.map(id=>`<button data-breakprep="${id}" ${!canUse(game,recipeCraftSnapshot(game,id).ingredientIds)?'disabled':''}>${RECIPES[id].name} · 预制 1 份</button>`).join('')}</div>`:''}</div>`,
 v.done?`<div class="dock-head"><span>✅ 今晚营业结束</span></div><div class="action-row">${b('close','📊 查看经营反馈','primary wide')}</div>`:
 v.breakAt?`<div class="dock-head"><span>第 ${v.breakAt} 波结束 · 本波只能选一项应急决策</span></div><div class="break-toolbar">${b('show-management','经营事件','primary',v.breakUsed)}${b('show-swap','临时换菜','secondary',v.breakUsed)}${b('show-prep','备菜','secondary',v.breakUsed)}${b('resume-break','继续迎客 ▶','primary')}</div>`:
 `<div class="dock-head"><span>${selected&&['queued','cooking'].includes(selected.status)?`${CUSTOMERS[selected.segment].name} · ${RECIPES[selected.recipeId]?.name||'挑选菜品'} · 剩余 ${Math.max(0,selected.patience-(v.time-selected.arrival))}s` :v.walkable?'靠近厨位自动烹饪 · 出餐台自动取菜':'点餐桌查看订单 · 厨房自动制作'}</span><span>${v.walkable?'⚡ '+(v.hero?.energy??6)+' / '+(v.hero?.maxEnergy??6):'招待 '+(v.treatUsed?'已用':'1次')}</span></div><div class="action-row">${selected&&selected.status==='queued'?b(`priority:${selected.id}`,'↑ 优先出餐','secondary'):b('clear-table','选择客人','secondary')}${selected&&!v.walkable?b(`soothe:${selected.id}`,'💛 招待客人','secondary',v.treatUsed||game.coins<5):''}${b('toggle-service',v.paused?'▶ 继续营业':'Ⅱ 暂停','primary wide')}</div>`]
}
function service(){
 const v=game.service;if(!v?.walkable)return serviceLegacy();
 const waiting=v.orders.filter(o=>o.status==='waiting'&&o.arrival<=v.time).length;
 const complete=v.orders.filter(o=>o.status==='served').length;
 const total=v.orders.length,goal=serviceGoalResult(v);
 const event=v.breakAt?currentServiceEvent(game):null;
 const choices=event?event.choices.map(ch=>{
  const costs={kitchen:6,assist:8,publicity:5};
  const cost=costs[ch.id]||0,disabled=game.coins<cost;
  return '<button class="v075-event-choice" data-choice="'+esc(ch.id)+'" '+(disabled?'disabled':'')+'><strong>'+esc(ch.label)+'</strong><small>'+esc(ch.detail)+(cost?' · 🪙'+cost:'')+'</small></button>'
 }).join(''):'';
 const modal=event?'<div class="v075-event-shade" role="dialog" aria-modal="true" aria-label="突发经营事件"><div class="v075-event-card"><div class="v075-event-kicker">⚡ 第 '+v.breakAt+' 波事件</div><h2>'+esc(event.title)+'</h2><p>'+esc(event.description)+'</p><div class="v075-event-options">'+choices+'</div><small>选择后将自动继续营业</small></div></div>':'';
 const paused=v.paused&&!v.breakAt&&!v.done?'<div class="v075-pause-screen"><strong>⏸ 已暂停</strong><button data-act="toggle-service">▶ 继续营业</button></div>':'';
 const end=v.done?'<div class="v075-finish"><h2>🌙 今日打烊</h2><p>成功上菜 '+complete+' / '+total+' · 厨房已经收工</p><button data-act="close">📊 查看经营日报</button></div>':'';
 const warn=serviceSupplyStatus(game);
 return [`<div class="scene-bg diner-bg service-scene v075-service">${restaurantView(true)}
  <div class="v075-status" aria-label="餐厅营业状态">
    <span id="v075-wave">🌙 第 ${Math.min(v.wave+1,3)}/3 波</span>
    <span id="v075-served">🍽️ ${complete}/${total}${waiting?' · 等位 '+waiting:''}</span>
    <span id="v075-energy">⚡ ${v.hero?.energy??6}/${v.hero?.maxEnergy??6}</span>
    <button type="button" data-act="toggle-service" ${v.breakAt||v.done?'disabled':''} aria-label="${v.paused?'继续营业':'暂停营业'}">${v.paused?'▶':'Ⅱ'}</button>
  </div>
  <div id="v075-notification" class="v075-notification" ${warn.shortages.length?'':'hidden'}>⚠ 原料不足，部分订单可能无法制作</div>
  ${goal?'<div class="v075-goal">🎯 '+esc(goal.label)+' · <b id="v075-goal">'+goal.value+'/'+goal.target+'</b></div>':''}
  ${modal}${paused}${end}</div>`,''];
}
function report(){const r=game.report;const lead=newRecipeLead(game);if(!r)return ['',''];return [`<div class="report-scene" aria-label="今日营业结算"><h2 class="report-header">${r.won?'🏆 击败爆炎厨王！':r.challenge?'🔥 爆炎厨王：挑战结束':'🌙 打烊啦，看看大家怎么说'}</h2><div class="report-stats"><div><small>今晚收入</small><b>🪙 ${r.revenue}</b></div><div><small>贡献利润</small><b>${r.profit}</b></div><div><small>成功上菜</small><b>${r.served}/${r.totalOrders||7}</b></div><div><small>平均满意</small><b>${r.sat}</b></div></div>${r.kitchen?`<div class="kitchen-report"><strong>厨房复盘</strong>${r.kitchen.slots.map((slot,i)=>`<span>${i?'右':'左'} ${slot.type==='WOK'?'炒锅':'炖锅'} Lv.${slot.level} · ${r.kitchen.stats?.[i?'POT':'WOK']?.count||0} 单 · 节约 ${r.kitchen.stats?.[i?'POT':'WOK']?.secondsSaved||0} 秒</span>`).join('')}</div>`:''}${r.byCraft&&Object.keys(r.byCraft).length?`<div class="v063-craft-report"><strong>🥘 本晚工艺表现（实际销售）</strong>${Object.values(r.byCraft).map(x=>`<div class="v063-craft-row"><b>${esc(RECIPES[x.recipeId]?.name||'料理')} · ${esc(x.styleLabel)}</b><small>售出 ${x.count} 份 · 评价 ${Math.round(x.totalSat/x.count)} · 实收 ${x.revenue} 金币${x.revenue!==x.baseRevenue? '（相比基础 '+(x.revenue-x.baseRevenue>0?'+':'')+(x.revenue-x.baseRevenue)+'）':''}</small></div>`).join('')}</div>` :''}${r.staff?.crew&&(r.staff.crew.helper.hired||r.staff.crew.waiter.hired)?`<div class="staff-report"><b>员工今日贡献</b>${r.staff.crew.helper.hired?`<span>帮厨：参与 ${r.staff.stats.helperOrders} 单 · 实省 ${r.staff.stats.helperSeconds} 秒</span>`:''}${r.staff.crew.waiter.hired?`<span>跑堂：照顾 ${r.staff.stats.waiterOrders} 桌 · 额外耐心 ${r.staff.stats.waiterBonus} 秒 · 延误挽回 ${r.staff.stats.waiterSaved} 单</span>`:''}<small>员工餐食材成本 ${r.staff.foodCost} 金币（计入利润）</small></div>`:''}${r.regularGuests?.length?`<div class="v010-regular-report">👥 今天认识或再见了：${r.regularGuests.slice(0,3).map(g=>esc(g.name)+(g.happyMeals>=2?' · 熟客':'')).join('、')}</div>`:''}${r.premium?.recipeId?`<div class="v010-premium-report"><strong>✨ 隐藏菜 · ${esc(RECIPES[r.premium.recipeId]?.name||'稀有料理')}</strong><span>限量 ${r.premium.limit} 份 · 接单 ${r.premium.ordered} · 完成 ${r.premium.sold} · 实收 ${r.premium.revenue} 金币</span></div>`:''}<div class="daily-goal-result"><b>今日任务：${r.goal?.label||'完成营业'}</b><span>${r.goal?`${r.goal.value}/${r.goal.target} · ${r.goal.success?'达成！口碑 +2':'未达成，下次再试'}`:'常规营业'}</span></div><div class="guest-verdict"><strong>💬 今日食客点评</strong><p>${r.suggested}</p></div>${r.guestReviews?.length?`<div class="guest-feedback-list"><strong>真实食客回访</strong>${r.guestReviews.slice(0,3).map(x=>`<div class="review-line"><span>${RECIPES[x.recipeId]?.name||'今日料理'}</span><span>“${esc(x.text)}” · ${x.sat}分</span></div>`).join('')}</div>`:''}${r.choices?.length?`<div class="v04-choices"><small>店长今日决策</small>${r.choices.map(c=>`<span>${c.type==='menu_swap'?`临时换菜：${RECIPES[c.before].name} → ${RECIPES[c.after].name}`:`第${c.wave}波：${({sign:'辣味招牌',kitchen:'整理后厨',steady:'稳定营业',soup:'温和推荐',assist:'临时帮厨',publicity:'试吃宣传'})[c.choice]||c.choice}`}</span>`).join('')}</div>`:''}${r.challenge?`<div class="boss-mini">厨王赛得分 <b>${r.challenge.score}</b> / 对手 70　${r.won?'🏆 获得猛火掌控':'未达标，下轮仍可挑战'}</div>`:''}<div class="v09-growth-report"><b>🏠 经营成长 · 第 ${r.absoluteDay||totalBusinessDay(game)} 天</b><span>食堂 ${r.tableCount||2} 桌 / ${(r.tableCount||2)*2} 席 · 今日等位高峰 ${r.queuePeak||0} 人 · 未能入座 ${r.unseated||0} 人</span><span>累计营业额 ${game.history.reduce((n,x)=>n+x.revenue,0)} 金币 · 累计招待 ${game.history.reduce((n,x)=>n+x.served,0)} 人</span></div><div class="recipe-lead"><small>🔎 顾客带来的研发灵感</small><strong>${lead?`“${lead.hint}”`:'目前的菜谱已经全部解锁！'}</strong>${lead?`<span>可尝试 ${lead.ingredients.map(id=>ING[id].emoji).join(' + ')}</span>`:''}</div></div>`,
 `<div class="action-row">${b('details','📊 账本','secondary')}${b('to-upgrade','🌅 结束本日 →','primary wide')}</div>`]}
function upgrade(){
 const k=ensureKitchen(game);
 return [`<div class="scene-bg diner-bg">${restaurantView(false)}<div class="upgrade-card kitchen-upgrade-card"><h2>餐厅扩建</h2><p>增加座位，接待更多顾客。扩建将直接改变餐厅布局。</p><div class="v09-room-upgrade"><strong>🪑 ${game.dining?.tableCount||2} 桌 · ${tableCapacity(game)} 席</strong><span>${(game.dining?.tableCount||2)>=3?'已增加一张双人桌':'解锁条件：营业至少 3 天 · 声望达到 2 · 支付 '+ROOM_EXPANSION_COST+' 金币'}</span>${b('expand-room',(game.dining?.tableCount||2)>=3?'已扩建':'扩建餐厅 · '+ROOM_EXPANSION_COST+' 金币','primary wide',!roomExpansionAvailable(game))}</div><div class="upgrade-feature">📊 累计收入 ${(game.history||[]).reduce((n,x)=>n+x.revenue,0)} · 累计招待 ${(game.history||[]).reduce((n,x)=>n+x.served,0)} 位食客</div><div class="upgrade-feature">${game.tech?'猛火掌控已解锁':'赢得厨王赛后解锁猛火掌控'}</div>${k.slots.map((slot,i)=>{const cost=kitchenUpgradeCost(game,i);return `<div class="kitchen-upgrade-row"><div><strong>${i===0?'左厨位':'右厨位'} · ${slot.type==='WOK'?'炒锅':'炖锅'}</strong><small>Lv.${slot.level}${slot.level===2?' · 每单 -2秒':' → Lv.2 每单 -2秒'}</small></div>${b(`upgrade-kitchen:${i}`,cost===null?'已升级':`${cost} 金币升级`,'secondary',cost===null||game.coins<cost)}</div>`}).join('')}<div class="upgrade-feature">背包 ${game.bagSlots||8}/12 格 · ${bagUpgradePrice(game)===null?'已满级':`扩容 ${bagUpgradePrice(game)} 金币`}</div>${b('upgrade-bag','增加背包 2 格','secondary',bagUpgradePrice(game)===null||game.coins<bagUpgradePrice(game))}</div></div>`,
 `<div class="action-row">${b('next-day','开始营业第 '+(totalBusinessDay(game)+1)+' 天','primary wide')}</div>`]
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
 if(stick.pointer!==null){const pad=app.querySelector('#field-stick, #diner-stick'),knob=app.querySelector('#field-stick-knob, #diner-stick-knob');if(pad){pad.classList.add('active');pad.style.left=stick.originX+'px';pad.style.top=stick.originY+'px';}if(knob)knob.style.transform=`translate(${stick.x*54}px,${stick.y*54}px)`;}
 save(game);
}
function note(txt){message=txt;flashUntil=performance.now()+1900;render()}
function stepMove(dx,dy){const result=moveExplorer(game,dx,dy);if(result.ok)message=result.message;render();return result.ok}
function findPath(x,y){const f=game.field;if(!f)return [];const start=[f.x,f.y];const seen=new Set([start.join(',')]);let paths=[[...start,[]]];while(paths.length){const [cx,cy,path]=paths.shift();if(cx===x&&cy===y)return path;for(const [dx,dy] of [[0,-1],[1,0],[0,1],[-1,0]]){const nx=cx+dx,ny=cy+dy,key=`${nx},${ny}`;if(nx<0||ny<0||nx>=f.worldW||ny>=f.worldH||seen.has(key)||f.obstacles.some(o=>o.x===nx&&o.y===ny))continue;seen.add(key);paths.push([nx,ny,[...path,[dx,dy]]]);}}return []}
function walkTo(x,y){if(walking)clearInterval(walking);const path=findPath(x,y);if(!path.length){note('点击可到达的地图格，或用方向键行走。');return}walking=setInterval(()=>{const step=path.shift();if(!step||game.phase!=='field'||!game.field||game.field.settled){clearInterval(walking);walking=null;return}const old=game.field.nodes.filter(n=>n.claimed).length;stepMove(...step);if(game.phase!=='field'||game.field.nodes.filter(n=>n.claimed).length>old||!path.length){clearInterval(walking);walking=null;}},130)}
function action(act){
 if(act==='hero-special'){if(activateWalkableSpecial(game)){message='主厨技能发动！';render()}return}
 if(act==='close-sheet'){overlay='';render();return}
 if(act==='crew'){overlay='crew';render();return}
 if(act.startsWith('hire:')){note(hireCrew(game,act.slice(5))?'伙伴加入食堂！':'金币不足或已经雇佣。');return}
 if(act==='field-bag'){if(game.phase==='field'&&game.field){releaseStick();overlay='field-bag';render()}return}
 if(act==='book'){bookTab='recipes';overlay='book';render();return}
 if(act==='stock'||act==='premium'||act==='settings'||act==='details'||act==='bento'){overlay=act;render();return}
 if(act==='reset'){if(confirm('清空本设备的 v0.4 试玩存档？')){localStorage.removeItem('oddpot-prototype-v04');game=newGame();selectedIngredients=['chicken','chili'];overlay='';note('新旅程开始，祝你研究出奇味料理！')}return}
 if(act.startsWith('buy:')){const [,id,n]=act.split(':'),count=n?Number(n):1;
  note(purchase(game,id,count)?'已采购 '+count+' 份，食材进入仓库。':'金币不足、当日售罄或当前阶段不能采购。');return}
 if(act==='to-field'){nextPhase(game,'field');note('想做什么菜，就去寻找那道菜缺少的食材。');return}
 if(act==='skip-field'){skipField(game);note('跳过探索，直接开始今天的料理研发。');return}
 if(act==='skill'){if(useFieldSkill(game)){message=game.field.actionMessage;render()}return}
 if(act==='finish-segment'){releaseStick();if(completeFieldSegment(game))note(game.phase==='research'?'探索结束，收获已入库！':'本区完成，请选择前进或回饭店。');else note('尚未达成采集目标，或 Mini Boss 仍在战斗。');return}
 if(act==='retreat'){releaseStick();if(walking){clearInterval(walking);walking=null}const result=settleField(game);note(result?'已带着背包回店，收获已入库！':'本次探索已结算。');return}
 if(act.startsWith('method:')){selectedMethod=act.slice(7);render();return}
 if(act==='receipt-retry'||act==='receipt-finish'){if(act==='receipt-retry'&&game.lastCook?.ids){selectedIngredients=[...game.lastCook.ids];selectedMethod=game.lastCook.vessel==='POT'?'stew':'stir';}game.researchReceipt=false;note(act==='receipt-retry'?'保留食材组合，再来一锅。':'研发成果已收好，可以继续研究。');return}
 if(act==='receipt-menu'){game.researchReceipt=false;nextPhase(game,'menu');note('将研发出的工艺用于今晚的餐馆经营。');return}
 if(act==='start-research'){note(beginLiveResearch(game,selectedIngredients,selectedMethod==='stir'?'WOK':'POT')?'开锅！轻点食材投入锅中，再按自己的时机掌勺。':'请选择 2–3 种有库存的食材。');return}
 if(act.startsWith('live-action:')){note(performLiveAction(game,act.slice(12))?'掌勺成功，锅内风味正在变化。':'这个动作本锅已用过，或尚未下料。');return}
 if(act==='live-finish'){const r=finishLiveResearch(game);note(r?.sellable?'🎉 '+r.recipeName+' · '+r.styleLabel+' · '+r.affinityLabel+' · 品质 '+r.quality+'！已加入工艺图鉴。':'🍲 '+(r?.reason||'锅还没热起来')+'。本次失败不能上架。');return}
 if(act.startsWith('flame:')){setFlame(game,Number(act.slice(6)));render();return}
 if(act==='toss'){note(tossWok(game)?'↻ 颠锅成功，食材沿锅边移动一格。':'本拍已经换过位置，不能再颠锅。');return}
 if(act==='heat'){if(beat(game))note('食材正在受热！观察实际热量与下一拍预测。');return}
 if(act==='finish'){const r=finishCook(game);note(r?.sellable?`🎉 ${RECIPES[r.recipeId].name} 研发成功，品质 ${r.quality}！已写入图鉴。`:`料理还没成功：${r?.reason||'火候不足'}。试试其他食材位置或火力。`);return}
 if(act==='to-menu'){nextPhase(game,'menu');note('把今天的发现写在店门前的菜单上。');return}
 if(act==='to-prep'){if(canMenu(game)){nextPhase(game,'prep');note('安排员工和预制餐点，营业时靠近厨位工作、到餐桌上菜。')}return}
 if(act.startsWith('kitchen:')){const [,i,type]=act.split(':');note(configureKitchenSlot(game,Number(i),type)?`设备已改为${type==='WOK'?'炒锅':'炖锅'}；订单将按新配置分流。`:'配置未更改，或改装金币不足。');return}
 if(act.startsWith('prep:')){note(prepDish(game,act.slice(5))?'备好一份餐点，稍后可直接上桌。':'食材不足，备餐失败。');return}
 if(act==='open'){if(!kitchenHasMenuCoverage(game)){note('菜单里的料理没有对应锅具，请先调整厨房。');return}nextPhase(game,'service');if(!createService(game,{walkable:true})){game.phase='prep';note('厨房未就绪，暂不能开业');return}setServicePaused(game,false);servicePanel='';selectedOrderId=null;note('开门营业！到锅边做菜，再去出餐台取菜、送到餐桌。');return}
 if(act==='toggle-service'){setServicePaused(game,!game.service.paused);serviceTickAt=performance.now();note(game.service.paused?'已暂停营业。':'开始迎客！到厨位工作，出餐台取菜再送到桌边。');return}
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
 if(act==='upgrade-bag'){note(buyBagUpgrade(game)?`背包扩容完成！下次探索可带 ${game.bagSlots} 格。`:'金币不足或已经升满背包。');return}
 if(act==='expand-room'){note(expandDiningRoom(game)?'扩建完成！现在可以同时接待六位客人。':'需要营业至少三天、声望达到 2 并备足扩建金币。');return}
 if(act==='next-day'){advanceDay(game);note('🌅 新的一天！客人偏好与探索路线在变化。');return}
}
app.addEventListener('click',e=>{
 const drop=e.target.closest('[data-live-drop]');if(drop){if(dropLiveIngredient(game,drop.dataset.liveDrop))note('食材入锅！正在连续受热。');return}
 const variant=e.target.closest('[data-choose-variant]');if(variant){const value=variant.dataset.chooseVariant,cut=value.indexOf('::');if(cut>0){const id=value.slice(0,cut),variantId=value.slice(cut+2);if(chooseRecipeVariant(game,id,variantId))note('已设为默认工艺，它的真实售价、时间和顾客适配会在营业时生效。')}return}
 const tile=e.target.closest('[data-tile]');if(tile&&game.cook){const i=+tile.dataset.tile;if(tileSelected===null){if(game.cook.tiles[i]){tileSelected=i;note('再点一次目的格，交换或移动食材。');}}else{const from=tileSelected;tileSelected=null;note(moveTile(game,from,i)?'已翻动锅内食材。':'本拍换位机会已用完。')}return}
 const discard=e.target.closest('[data-discard]');if(discard){const ok=discardFieldStack(game,discard.dataset.discard);overlay='';note(ok?'已丢弃本次探索的食材格，仓库库存未受影响。':'无法丢弃该材料。');return}
 const ev=e.target.closest('[data-event]');if(ev){if(resolveFieldEvent(game,ev.dataset.event)){message=game.field.actionMessage;render()}return}
 const ch=e.target.closest('[data-choice]');if(ch){if(chooseServiceEvent(game,ch.dataset.choice)){if(game.service?.walkable)resumeBreak(game);servicePanel='';releaseStick();note(game.service.decisionFlash+'，已继续营业。')}else note('目前条件不足或已经处理过本波事件。');return}
 const bp=e.target.closest('[data-breakprep]');if(bp){servicePanel='';note(breakPrep(game,bp.dataset.breakprep)?game.service.decisionFlash+'，下波同款订单将优先出餐。':'原料不足或本波应急机会已用。');return}
 const swap=e.target.closest('[data-apply-swap]');if(swap){const slot=Number(swap.dataset.applySwap),id=app.querySelector(`[data-swap-slot="${slot}"]`)?.value;const ok=swapBreakMenu(game,slot,id);servicePanel='';note(ok?game.service.decisionFlash+'，只影响尚未入店的顾客。':'无法换菜：只能一次，或与现有菜相同。');return}
 const bento=e.target.closest('[data-bento]');if(bento){note(prepareBento(game,bento.dataset.bento)?'🍱 便当已制作，出门探索时自动生效。':'无法制作：材料不足或今天已经带了便当。');return}
 const feed=e.target.closest('[data-feed]');if(feed){const [role,id]=feed.dataset.feed.split(':');if(feedCrew(game,role,id)){note(`${CREW_ROLES[role].name}吃下${RECIPES[id].name}，今晚能力已提升。`);}else note('已经吃过员工餐，或者材料不足。');return}
 const assign=e.target.closest('[data-assign]');if(assign){note(assignCrew(game,Number(assign.dataset.assign))?'帮厨已调整工作厨位。':'岗位未变更。');return}
 const a=e.target.closest('[data-act]');if(a){if(!a.disabled)action(a.dataset.act);return}
 const region=e.target.closest('[data-region]');if(region){selectedRegion=region.dataset.region;render();return}
 const weapon=e.target.closest('[data-weapon]');if(weapon){if(selectFieldWeapon(game,weapon.dataset.weapon))render();return}
 const branch=e.target.closest('[data-branch]');if(branch){
  releaseStick();const result=chooseFieldBranch(game,branch.dataset.branch);
  if(result)startActionField(game);note(result?'继续前进！新的区段开始。':'无法进入该分支');return;
 }
 const route=e.target.closest('[data-route]');if(route){const entered=enterField(game,route.dataset.route);if(entered)startActionField(game);if(entered){message='出发！';flashUntil=0;render()}else note('无法进入路线');return}
 const target=e.target.closest('[data-target]');if(target){game.selectedTarget=target.dataset.target;render();return}
 const item=e.target.closest('[data-ingredient]');if(item){const id=item.dataset.ingredient;if(selectedIngredients.includes(id))selectedIngredients=selectedIngredients.filter(i=>i!==id);else if(selectedIngredients.length<3)selectedIngredients=[...selectedIngredients,id];else message='一锅最多放三种食材。';render();return}
 const tab=e.target.closest('[data-book-tab]');if(tab){bookTab=tab.dataset.bookTab==='guests'?'guests':'recipes';render();return}
 const book=e.target.closest('[data-book]');if(book){const r=RECIPES[book.dataset.book];selectedIngredients=[...r.ids];selectedMethod=r.method;overlay='';note(`已选择实验线索：${r.hint}`);return}
 const special=e.target.closest('[data-premium-set]');if(special){const [id,n]=special.dataset.premiumSet.split(':');const ok=setPremiumMenu(game,id,Number(n));overlay=ok?'':overlay;note(ok?'已准备隐藏菜（只有合资格食客可能点单），真实稀有原料已预留。':'库存不足或菜谱尚未研发。');return}
 const clear=e.target.closest('[data-premium-clear]');if(clear){if(setPremiumMenu(game,null)){overlay='';note('已撤下今晚的隐藏菜。')}return}
 const slot=e.target.closest('[data-edit-slot]');if(slot){overlay=`menu:${slot.dataset.editSlot}`;render();return}
 const pick=e.target.closest('[data-menu-pick]');if(pick){const [slot,id]=pick.dataset.menuPick.split(':');game.menu[Number(slot)]=id;if(game.premiumMenu?.recipeId===id)setPremiumMenu(game,null);overlay='';note(`已上架 ${RECIPES[id].name}，看看厨房的双工位负担。`);return}
 const seat=e.target.closest('[data-seat]');if(seat){const id=+seat.dataset.seat,seatTarget=e.target.closest('[data-seat-index]');const seats=tableSeatState(game.service,id);const o=seatTarget?seats[Number(seatTarget.dataset.seatIndex)]:seats.find(Boolean);selectedOrderId=o?.id||null;note(o?`${CUSTOMERS[o.segment].name}：${o.recipeId?'点了'+RECIPES[o.recipeId].name:'正在挑选菜单'}。`:'这把椅子目前空着。');return}
 const station=e.target.closest('[data-station]');if(station){const pos=station.dataset.station,v=game.service,slot=ensureKitchen(game).slots[pos==='WOK'?0:1],queue=v?v.queued.filter(id=>RECIPES[v.orders.find(o=>o.id===id)?.recipeId]?.station===slot.type).length:0;note(`${pos==='WOK'?'左':'右'}厨位：${slot.type==='WOK'?'炒锅':'炖锅'} Lv.${slot.level}，同类候餐 ${queue} 单。`);return}
 // Realtime field uses the thumb joystick; no grid click-to-walk.
 
});
// Mobile skills are explicitly tapped, even while the left thumb moves.
app.addEventListener('pointerdown',e=>{
 const btn=e.target.closest('#diner-special');
 if(!btn||btn.disabled||game.phase!=='service'||!game.service?.walkable)return;
 e.preventDefault();
 if(activateWalkableSpecial(game)){message='主厨技能发动！';render()}
},{passive:false});
// Second-finger skill must work while the first finger owns the floating
// joystick. Mobile browsers do not always synthesize a click for multitouch.
app.addEventListener('pointerdown',e=>{const skill=e.target.closest('.field-skill');if(!skill||skill.disabled||game.phase!=='field'||!game.field?.action)return;
 e.preventDefault();if(useFieldSkill(game)){message=game.field.actionMessage;flashUntil=0;}
},{passive:false});
app.addEventListener('pointerdown',e=>{const a=e.target.closest('[data-tile]');if(a&&game.cook&&game.cook.tiles[+a.dataset.tile])drag={i:+a.dataset.tile,x:e.clientX,y:e.clientY};},{passive:true});
app.addEventListener('pointerup',e=>{if(!drag)return;const from=drag;drag=null;if(Math.hypot(e.clientX-from.x,e.clientY-from.y)<25)return;const to=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-tile]');if(to){tileSelected=null;note(moveTile(game,from.i,+to.dataset.tile)?'拖动翻炒成功。':'本拍只能换位一次。')}},{passive:true});
document.addEventListener('keydown',e=>{if(((game.phase==='field'&&game.field)||(game.phase==='service'&&game.service?.walkable))&&!overlay){const map={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0],w:[0,-1],s:[0,1],a:[-1,0],d:[1,0]};if(map[e.key]){e.preventDefault();keys.add(e.key)}}});
setInterval(()=>{if(document.hidden||overlay)return;if(game.phase==='service'&&game.service&&!game.service.walkable&&!game.service.paused&&!game.service.done&&!game.service.breakAt){tick(game,1);serviceTickAt=performance.now();if(game.service.done)message='今晚的顾客已经全部处理完毕，可以查看日报。';else if(game.service.breakAt){servicePanel='event';message='突发经营事件！请选择应对方案，或改菜单、备菜。';}render()}},750);
document.addEventListener('keyup',e=>keys.delete(e.key));
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(walking){clearInterval(walking);walking=null}if(game.phase==='service'&&game.service&&!game.service.paused){game.service.paused=true;game.service.clockAccumulator=0;releaseStick();message='已自动暂停营业，返回后继续。'}save(game)}else if(game.phase==='service'&&game.service?.walkable){render()}});
render();

// The simulation and visual rendering are decoupled: canvas runs each frame,
// the rules tick at a fixed delta, and HTML overlays rerender only on decisions.
function analogAxis(){let x=stick.x,y=stick.y;for(const key of keys){if(['ArrowLeft','a'].includes(key))x-=1;if(['ArrowRight','d'].includes(key))x+=1;if(['ArrowUp','w'].includes(key))y-=1;if(['ArrowDown','s'].includes(key))y+=1;}const l=Math.hypot(x,y);return l>1?[x/l,y/l]:[x,y]}
// Render progress derives from authoritative service seconds; a paused night
// cannot loop arrival or plate animations through an unrelated wall clock.
function restaurantSimTime(now){const v=game.service;if(!v)return gameClock;if(v.walkable)return v.time+(v.clockAccumulator||0);if(v.paused||v.breakAt||v.done)return v.time;return v.time+Math.max(0,Math.min(1,(now-(serviceTickAt||now))/750));}
function frame(now){const delta=Math.min(.045,(now-(lastFrame||now))/1000);lastFrame=now;gameClock+=delta;
 if(game.phase==='field'&&game.field?.action&&game.field.segmentStatus!=='choice'&&!document.hidden&&!overlay){
  const [dx,dy]=analogAxis(),evt=stepActionField(game,dx,dy,delta);
  if(evt==='harvest'&&game.field?.nodes?.some(n=>n.key==='target'&&n.claimed)){releaseStick();render();}
  if(evt==='field_event'){message='遇见流浪调味师：请选择方案。';releaseStick();render()}
  else if(game.phase!=='field'){releaseStick();message='探索结束：只损失本次背包收获，原仓库安全。';render()}
  else {const f=game.field;const hp=app.querySelector('.field-hp');if(hp){hp.textContent='♥'.repeat(f.hp)+'♡'.repeat(3-f.hp);hp.classList.toggle('taking-hit',(f.hitFlash||0)>0);}
   const count=app.querySelector('#field-bag-count');if(count)count.textContent=fieldBagSlotsUsed(f)+'/'+(f.capacity||8);
   const timer=app.querySelector('#field-clock');if(timer)timer.textContent=(f.segmentIndex||1)+'/3 · '+Math.floor(f.elapsed)+'s';const bento=app.querySelector('#v063-bento-effect');if(bento&&f.bento)bento.textContent=f.bento.used?'已触发':'待触发';
   const skill=app.querySelector('[data-act="skill"]');const cooldown=app.querySelector('#skill-cooldown');if(skill){skill.disabled=f.skillCd>0;skill.style.setProperty('--cooldown',(f.skillCd/6.5*100).toFixed(2)+'%');if(cooldown){cooldown.hidden=f.skillCd<=0;cooldown.textContent=f.skillCd>0?Math.ceil(f.skillCd)+'s':'';}}
   const shieldStatus=app.querySelector('#v082-shield-status');if(shieldStatus){
    shieldStatus.textContent=f.shieldCharge!==false?'🛡 防御就绪':'🛡 蓄能 '+Math.ceil(f.shieldCooldown||0)+'s';
    shieldStatus.classList.toggle('charging',f.shieldCharge===false);
   }
   const fieldNote=app.querySelector('#field-action-notice');if(fieldNote){fieldNote.hidden=!(f.actionMessageTTL>0);if(!fieldNote.hidden)fieldNote.textContent=f.elapsed<2?'移动 · 自动采集 / 攻击':f.actionMessage.slice(0,22);};
  }
 }
 if(game.phase==='service'&&game.service?.walkable){
   const v=game.service,h=v.hero;
   const canMove=!document.hidden&&!overlay&&!v.paused&&!v.breakAt&&!v.done&&!game.cook;
   if(canMove){
     const [dx,dy]=analogAxis();walkServiceHero(h,dx,dy,delta,game);
     advanceWalkableInteraction(game,delta);
     v.clockAccumulator=(v.clockAccumulator||0)+delta;
     if(v.clockAccumulator>=1){
       v.clockAccumulator-=1;
       tick(game,1);
       serviceTickAt=now;
       if(v.breakAt){v.clockAccumulator=0;releaseStick();message='突发经营事件：请选择一项应对方案';render();}
       else if(v.done){message='今晚营业结束，查看营业日报';render();}
       else render();
     }
   }else if(h)h.moving=false;
   const skill=app.querySelector('#diner-special'),info=canMove?walkableSpecial(game):null;
   if(skill){
     skill.hidden=!info;
     if(info){skill.textContent=info.icon+' ⚡'+info.energy;skill.disabled=!info.available;
       skill.setAttribute('aria-label',info.kind==='burst'?'全力烹饪，消耗2点精力':'紧急安抚，消耗1点精力')}
   }
 }
 if(game.cook?.mode==='v063-live'&&!document.hidden&&!overlay){
  const auto=stepLiveResearch(game,delta);
  if(auto){message=auto.sellable?'自动出锅：'+auto.recipeName+' · '+auto.styleLabel:'自动出锅失败：'+auto.reason;render();}
  else{
   const c=game.cook,clock=app.querySelector('#v063-clock');if(clock)clock.textContent=c.elapsed.toFixed(1)+'s / 19s';
   const finish=app.querySelector('[data-act="live-finish"]');if(finish)finish.disabled=c.elapsed<1.2||!c.dropped.length;
   const indicators=liveCookPreview(game)?.indicators||[];
   for(const item of indicators){
     const node=app.querySelector('[data-live-status="'+item.id+'"]');
     if(node){node.textContent=item.state;node.closest('[data-heat-tone]')?.setAttribute('data-heat-tone',item.tone)}
     const fill=app.querySelector('[data-heat-fill="'+item.id+'"]');if(fill)fill.style.width=item.progress+'%';
   }
   const summary=liveHeatSummary(indicators),cue=app.querySelector('#v103-heat-status');
   if(cue){cue.dataset.heatTone=summary.tone;
     const label=app.querySelector('#v103-heat-label'),detail=app.querySelector('#v103-heat-detail');
     if(label)label.textContent=summary.label;if(detail)detail.textContent=summary.details;
   }
   const pan=app.querySelector('.v063-live-pan');
   if(pan){
     const motion=livePanMotion(c,{width:pan.clientWidth||310,height:pan.clientHeight||180});
     const bowl=pan.querySelector('.v063-bowl');
     if(bowl)bowl.style.transform='translate(-50%,-50%) translateY('+motion.panLift.toFixed(1)+'px) rotate('+motion.panRotation.toFixed(1)+'deg)';
     // One authoritative motion pose per real dropped ingredient:
     // never append animated clones, duplicate sprites or trailing frames.
     for(const food of motion.items){
       const node=pan.querySelector('[data-live-icon="'+food.id+'"]');if(!node)continue;
       node.style.transform='translate(-50%,-50%) translate('+food.x.toFixed(1)+'px,'+food.y.toFixed(1)+'px) rotate('+food.rotation.toFixed(1)+'deg) scale('+food.scale.toFixed(3)+')';
     }
     const glow=pan.querySelector('.v063-pan-glow');
     if(glow)glow.style.opacity=motion.glow.toFixed(3);
     const ripple=pan.querySelector('.v063-pan-ripple');
     if(ripple){ripple.style.opacity=motion.ripple.toFixed(3);ripple.style.transform='translate(-50%,-50%) scale('+(1+motion.ripple*.36).toFixed(3)+')';}
     const broth=pan.querySelector('.v063-broth');
     if(broth)broth.style.transform='scale('+motion.brothScale.toFixed(3)+')';
     const steam=pan.querySelector('.v063-steam');
     if(steam)steam.style.transform='translateY(-'+((motion.steam-1)*12).toFixed(1)+'px) scale('+motion.steam.toFixed(2)+')';
     const label=pan.querySelector('.v063-action-indicator');
     if(label){label.textContent=motion.actionLabel||'';label.style.opacity=motion.actionOpacity.toFixed(3);}
   }
  }
 }
 const notice=app.querySelector('#ingame-notice');if(notice&&now>flashUntil)notice.hidden=true;
 const forest=app.querySelector('#forest-canvas');if(forest)drawField(forest,game,gameClock);
 const diner=app.querySelector('#diner-canvas');if(diner)drawDiner(diner,game,gameClock,restaurantSimTime(now));
 if(now-lastSave>1400&&(game.phase==='field'||game.cook?.mode==='v063-live'||game.phase==='service'&&game.service?.walkable)){save(game);lastSave=now}
 requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
// Safari selection may start on the *lower dock* when a thumb lands beside
// its instruction text. Both the playfield and the unused dock background are
// gameplay joystick surfaces, but none of their actionable buttons are.
function fieldGestureSurface(target){
 if(!target?.closest)return false;
 if(target.closest('button,select,input,textarea,[contenteditable="true"],.field-event,.sheet,.modal'))return false;
 return !!target.closest('.action-forest,.action-field-dock');
}
function playingFieldGestures(){return game.phase==='field'&&!!game.field?.action&&!game.field.finished&&game.field.segmentStatus!=='choice'&&!overlay;}
function clearThumbSelection(){
 const selected=window.getSelection?.();
 if(selected&&!selected.isCollapsed)selected.removeAllRanges();
}
// Only cancel iOS native gestures while the expedition joystick owns a finger.
// Never steal touches from the two bottom action buttons or a dialog.
app.addEventListener('touchstart',e=>{
 if(!playingFieldGestures()||!fieldGestureSurface(e.target))return;
 if(e.cancelable)e.preventDefault();
 clearThumbSelection();
},{passive:false});
app.addEventListener('touchmove',e=>{
 if(!playingFieldGestures()||stick.pointer===null)return;
 if(e.cancelable)e.preventDefault();
},{passive:false});
app.addEventListener('selectstart',e=>{
 if(game.phase==='field'&&game.field?.action&&!e.target.closest?.('input,textarea,[contenteditable="true"]'))e.preventDefault();
});
app.addEventListener('contextmenu',e=>{
 if(game.phase==='field'&&game.field?.action&&!e.target.closest?.('input,textarea,[contenteditable="true"]'))e.preventDefault();
});
app.addEventListener('dragstart',e=>{
 if(game.phase==='field'&&game.field?.action)e.preventDefault();
});
document.addEventListener('selectionchange',()=>{
 if(playingFieldGestures()&&stick.pointer!==null)clearThumbSelection();
});
// Floating analog: anchored at finger-down anywhere on the forest canvas.
// Pointer capture stays on #app, which does not get replaced during scene updates.
function releaseStick(){
 stick.pointer=null;stick.x=stick.y=0;
 const el=app.querySelector('#field-stick, #diner-stick');if(el){el.classList.remove('active');el.style.left='-100px';el.style.top='-100px';}
 const knob=app.querySelector('#field-stick-knob, #diner-stick-knob');if(knob)knob.style.transform='translate(0px,0px)';
}
function updateStick(e){
 const v=joystickVector(stick.originX,stick.originY,e.clientX,e.clientY,54,9);
 stick.x=v.x;stick.y=v.y;
 const knob=app.querySelector('#field-stick-knob, #diner-stick-knob');
 if(knob)knob.style.transform=`translate(${v.knobX}px,${v.knobY}px)`;
}
app.addEventListener('pointerdown',e=>{
 const serviceReady=game.phase==='service'&&game.service?.walkable&&!game.service.paused&&!game.service.breakAt&&!game.service.done;
 const fieldReady=game.phase==='field'&&game.field?.action&&!game.field.finished&&!game.field.activeEvent&&game.field.segmentStatus!=='choice';
 if(!(serviceReady||fieldReady)||overlay||stick.pointer!==null)return;
 // The scene is the input surface. Do not steal events from active buttons or dialogs.
 if(!(serviceReady?e.target.closest('.diner-world'):fieldGestureSurface(e.target))||e.target.closest('.field-event,button,select,[data-seat],[data-station]'))return;
 e.preventDefault();clearThumbSelection();stick.pointer=e.pointerId;stick.originX=e.clientX;stick.originY=e.clientY;
 const pad=app.querySelector('#field-stick, #diner-stick');if(pad){pad.classList.add('active');pad.style.left=e.clientX+'px';pad.style.top=e.clientY+'px';}
 try{app.setPointerCapture(e.pointerId)}catch{}
 updateStick(e);
},{passive:false});
app.addEventListener('pointermove',e=>{
 if(stick.pointer!==e.pointerId)return;e.preventDefault();updateStick(e);
},{passive:false});
for(const name of ['pointerup','pointercancel','lostpointercapture'])app.addEventListener(name,e=>{if(stick.pointer===e.pointerId)releaseStick();});
window.addEventListener('blur',releaseStick);

// Cooking gestures are optional alternatives to the two action buttons.
app.addEventListener('pointerdown',e=>{
 const pan=e.target.closest('[data-live-pan]');
 if(!pan||game.cook?.mode!=='v063-live')return;
 livePanPointer={id:e.pointerId,x:e.clientX,y:e.clientY,travel:0,lastX:e.clientX,lastY:e.clientY};
},{passive:true});
app.addEventListener('pointermove',e=>{
 if(!livePanPointer||livePanPointer.id!==e.pointerId)return;
 livePanPointer.travel+=Math.hypot(e.clientX-livePanPointer.lastX,e.clientY-livePanPointer.lastY);
 livePanPointer.lastX=e.clientX;livePanPointer.lastY=e.clientY;
},{passive:true});
app.addEventListener('pointerup',e=>{
 const p=livePanPointer;if(!p||p.id!==e.pointerId)return;
 livePanPointer=null;
 const dx=e.clientX-p.x,dy=e.clientY-p.y;
 const type=game.cook?.vessel==='WOK'?(dy<-38&&Math.abs(dx)<145?'toss':p.travel>75?'flip':null):
   (p.travel>95&&Math.hypot(dx,dy)<80?'gentle':dy>45?'reduce':null);
 if(type&&performLiveAction(game,type))note('掌勺动作已记录，看看出锅会有什么新风味。');
},{passive:true});
