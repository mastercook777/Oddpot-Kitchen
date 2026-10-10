import {joystickVector} from './controls_v041.js?v=0.4.1';
import {ING,RECIPES,FORECAST,ROUTES,CUSTOMERS} from './data.js?v=0.4.1';
import {PHASES,newGame,save,load,today,enterField,settleField,skipField,purchase,startCook,moveTile,beat,finishCook,synergyFor,canMenu,prepDish,createService,tick,expedite,closeService,nextPhase,advanceDay,buyUpgrade,canUse,setServicePaused,resumeBreak,breakPrep,setFlame,tossWok,previewHeat,moveExplorer,interactExplorer,sootheGuest,newRecipeLead,currentServiceEvent,chooseServiceEvent,swapBreakMenu} from './engine.js?v=0.4.1';
import {startActionField,stepActionField,useFieldSkill,resolveFieldEvent} from './field_v04.js?v=0.4.1';
import {drawField,drawDiner} from './scenes_v04.js?v=0.4.1';

let game=load()||newGame();
let message='欢迎回到边境食堂！今天会有谁来吃饭呢？';
let overlay='',tileSelected=null,selectedOrderId=null;let servicePanel='';
let selectedIngredients=['chicken','chili'],selectedMethod='stir';
let routeTarget=null,walking=null,drag=null;
const stick={x:0,y:0,pointer:null,originX:0,originY:0};const keys=new Set();let lastFrame=0,lastSave=0;let gameClock=0;const touched=new Map();
const app=document.getElementById('app');
const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const b=(act,text,klass='',disabled=false)=>`<button class="game-btn ${klass}" data-act="${act}" ${disabled?'disabled':''}>${text}</button>`;
const recipeIds=Object.keys(game.recipes);
const phaseLabels={forecast:'今日情报',field:'林间探索',research:'料理实验',menu:'今晚菜单',prep:'营业准备',service:'餐厅营业',report:'营业日报',upgrade:'食堂成长'};
const meal=r=>`${r.emoji} ${r.name}`;
const onlyName=id=>ING[id]?.name||id;
const itemCount=()=>Object.keys(game.recipes).length;

function hud(){return `<div class="hud"><div class="brand"><span class="logo">🍳</span><div><strong>怪味食堂</strong><small>ODDPOT KITCHEN · v0.4.1</small></div></div><div class="hud-meta"><span>🪙 ${game.coins}</span><span>⭐ ${game.reputation}</span></div><button class="hud-gear" data-act="settings" aria-label="设置">⚙</button></div><div class="day-strip"><b>第 ${game.cycle} 轮 · DAY ${game.day}</b><span>${phaseLabels[game.phase]}</span><span>📖 ${itemCount()}/${Object.keys(RECIPES).length}</span></div>`}
function toast(){return `<div class="game-toast" role="status">${esc(message)}</div>`}
function shell(stage,dock){return `<div class="game-shell">${hud()}<main class="stage ${game.phase}${game.cook?' wok-active':''}">${stage}</main>${toast()}<nav class="dock">${dock}</nav>${overlayMarkup()}</div>`}
function overlayMarkup(){if(!overlay)return '';
 let body='';
 if(overlay==='book'){
  body=`<h2>📖 料理灵感图鉴</h2><p class="sheet-lead">${itemCount()}/${Object.keys(RECIPES).length} 道已掌握 · 未发现的料理先显示线索，做出来才会解锁。</p><div class="book-list">${Object.entries(RECIPES).map(([id,r])=>`<button class="book-item" data-book="${id}"><span class="book-icon">${game.recipes[id]?r.emoji:'❔'}</span><div><strong>${game.recipes[id]?r.name:'未发现的料理'}</strong><small>${game.recipes[id]?`${r.ids.map(onlyName).join(' + ')} · ${r.station==='WOK'?'爆炒':'焖煮'}`:r.hint}</small></div><span>›</span></button>`).join('')}</div>`;
 }else if(overlay==='stock'){
  body=`<h2>🎒 食材仓库</h2><p class="sheet-lead">原料跨天保留 · 采购会扣除金币，研发和营业真正消耗库存</p><div class="stock-list">${Object.entries(ING).map(([id,ing])=>`<div class="stock-line"><span>${ing.emoji} ${ing.name}</span><b>×${game.inventory[id]||0}</b>${b(`buy:${id}`,'采购', 'small',game.coins<ing.cost||id==='beef')}</div>`).join('')}</div>`;
 }else if(overlay.startsWith('menu:')){
  const slot=Number(overlay.split(':')[1]);body=`<h2>更换第 ${slot+1} 道上架菜</h2><p class="sheet-lead">每晚三道菜，不是价格越高越好；两口锅的负载会影响等待。</p><div class="book-list">${Object.keys(game.recipes).map(id=>{const r=RECIPES[id];return `<button data-menu-pick="${slot}:${id}" class="book-item"><span class="book-icon">${r.emoji}</span><div><strong>${r.name} · ${r.station}</strong><small>${r.time}s · ${r.price}金币 · ${r.ids.map(onlyName).join(' + ')}</small></div><span>›</span></button>`}).join('')}</div>`;
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
  const o=v?.orders.find(o=>o.tableId===i&&['queued','cooking'].includes(o.status));
  const recent=!o&&v?.orders.find(x=>x.tableId===i&&x.status==='served'&&v.time-x.served<=4);
  const pct=o?Math.max(0,Math.round(100*(1-(v.time-o.arrival)/o.patience))):100;
  const look=o?RECIPES[o.recipeId]:recent?RECIPES[recent.recipeId]:null;
  return `<button class="diner-table ${o?'occupied':''} ${selectedOrderId===o?.id?'selected':''}" data-seat="${i}" ${interactive?'':'disabled'} aria-label="${i+1}号餐桌">
     ${o?`<div class="speech">${look?.emoji||'🍽'} <span>${o.status==='queued'?'等餐中':'制作中'}</span></div>`:recent?'<div class="speech">😋 真好吃！</div>':''}
     <span class="little-human ${o?.segment||'regular'}">${o?CUSTOMERS[o.segment]?.emoji:'·'}</span><span class="wood-table"><span>${look?.emoji||'☕'}</span></span>
     <span class="seat-label">${i+1}号桌 ${o?o.status==='queued'?'⏳ 等待':'🍽 制作中':'空位'}</span>${o?`<span class="patience"><i style="width:${pct}%;background:${pct<35?'#e96e4e':'#b8d96e'}"></i></span>`:''}
  </button>`;
 };
 const st=type=>{const job=v?.stations[type],r=job?RECIPES[v.orders.find(o=>o.id===job.orderId)?.recipeId]:null;return `<button class="diner-station" data-station="${type}" ${interactive?'':'disabled'}><span class="station-object">${type==='WOK'?'🍳':'🍲'}</span><strong>${type==='WOK'?'炒锅':'炖锅'}</strong><small>${r?`${r.emoji} ${job.left}s`:'待命'}</small></button>`};
 return `<div class="diner-world"><canvas id="diner-canvas" class="diner-canvas"></canvas><div class="diner-top"><div class="shop-sign">ODDPOT · 边境小食堂</div><div class="tiny-window">🌙</div></div><div class="diner-kitchen">${st('WOK')}<div class="cook-avatar"><span>👩‍🍳</span><small>主厨</small></div>${st('POT')}</div><div class="service-counter"><i></i>出餐柜台<i></i></div><div class="diner-tables">${table(0)}${table(1)}</div><div class="diner-floor"><span>🪴</span><span class="diner-entry">🚪<small>欢迎光临</small></span><span>🪴</span></div>${v?`<div class="scene-corner">已服务 ${v.orders.filter(o=>o.status==='served').length}/${v.orders.length}</div>`:''}</div>`;
}
function sceneTag(title,sub=''){return `<div class="scene-tag"><strong>${title}</strong>${sub?`<small>${sub}</small>`:''}</div>`}
function forecast(){const f=today(game);return [
 `<div class="scene-bg diner-bg">${restaurantView(false)}<div class="scene-float top">${sceneTag(game.day===3?'🔥 爆炎厨王踢馆':f.name,f.hint)}</div><div class="scene-float bottom forecast-advice">${game.day===3?'今晚的评委关注辛辣或爆香料理，评分目标 71 分。':'今天的菜单，不必和昨天一样。研发新菜能吸引不同的客人。'}</div></div>`,
 `<div class="dock-head"><span>🌅 开店前</span><span>库存 ${Object.values(game.inventory).reduce((a,b)=>a+b,0)} 份</span></div><div class="action-row">${b('stock','🎒 仓库','secondary')}${b('to-field','🌲 出门取材 →','primary wide')}</div>`
 ]}
function field(){
 const f=game.field;
 if(!f){return [
 `<div class="forest-scene route-scene">${forestBackdrop()}<div class="scene-float top">${sceneTag('晨露森林','轻动作探索 · 目标材料驱动')}</div><div class="field-target"><small>今天主要寻找</small><div class="target-scroller">${Object.entries(ING).map(([id,ing])=>`<button class="target-chip ${game.selectedTarget===id?'chosen':''}" data-target="${id}">${ing.emoji} ${ing.name}</button>`).join('')}</div></div><div class="route-options">${ROUTES.map(r=>`<button class="route-card" data-route="${r.id}"><span>${r.emoji}</span><div><strong>${r.name}</strong><small>${r.subtitle}</small></div><b>›</b></button>`).join('')}</div></div>`,
 `<div class="dock-head"><span>单次约 60 秒 · 可主动撤离</span></div><div class="action-row">${b('skip-field','跳过探索，直接研发 →','secondary wide')}</div>`]}
 const bag=Object.entries(f.bag).map(([id,n])=>`${ING[id].name}${n}`).join(' · ')||'空';
 const event=f.activeEvent&&f.nodes.find(n=>n.key===f.activeEvent);
 return [`<div class="forest-scene action-forest"><canvas id="forest-canvas" class="forest-canvas"></canvas><div class="floating-joystick" id="field-stick" aria-hidden="true"><div class="floating-joystick-knob" id="field-stick-knob"></div></div><div class="action-hud"><span>体力 ${f.hp}/3</span><span>收获：${esc(bag)}</span><span>${Math.floor(f.elapsed)}s</span></div>${event?`<div class="field-event"><strong>野外遭遇 · 流浪调味师</strong><p>你在林中发现一份料理线索，如何处理？</p><button data-event="trade">用蘑菇交换火椒</button><button data-event="forage">深入调查：损失生命，争取两份材料</button><button data-event="leave">绕开，保留现有收获</button></div>`:''}</div>`,
 `<div class="action-field-dock"><div class="field-touch-tip">手指按住森林任意位置<br>拖动移动 · 松开停止</div><div class="field-buttons">${b('skill',`锅铲击退${f.skillCd>0?' '+Math.ceil(f.skillCd)+'s':''}`,'skill',f.skillCd>0)}${b('retreat','带材料撤离','secondary')}</div></div>`]
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
function prep(){return [`<div class="scene-bg diner-bg">${restaurantView(false)}<div class="prep-card"><h2>🍱 开业前的备餐</h2><p>提前做好一份标准菜，遇到同款订单可以直接送达。但卖不完也会计入材料损耗。</p><div class="prep-items">${game.menu.map(id=>`<button class="prep-item" data-act="prep:${id}" ${!canUse(game,RECIPES[id].ids)?'disabled':''}>${RECIPES[id].emoji} ${RECIPES[id].name}<span>已备 ${game.prep[id]||0}　＋</span></button>`).join('')}</div></div></div>`,
 `<div class="action-row">${b('stock','🎒 库存','secondary')}${b('open','🏠 开门迎客！','primary wide')}</div>`]}
function service(){const v=game.service;if(!v)return ['<div class="empty">餐厅正在准备...</div>',b('open','开业','primary')];
 const served=v.orders.filter(o=>o.status==='served').length;
 const events=v.events.slice(-2).reverse().map(e=>e.type==='served'?`😋 ${RECIPES[e.recipeId]?.name} 获赞 ${e.sat}分`:e.type==='left'?'😟 客人久等离开':e.type==='guest_care'?'💛 招待了等待的客人':e.type==='started'?'🍳 后厨开始制作':'').filter(Boolean);
 const selected=v.orders.find(o=>o.id===selectedOrderId);
 const status=`第 ${Math.min(v.wave+1,3)}/3 波 · 营业 ${v.time}s · ${served}/7 已送达`;
 return [`<div class="scene-bg diner-bg service-scene">${restaurantView(true)}<div class="scene-float top">${sceneTag(game.day===3?'🔥 厨王挑战营业':'🏠 店内营业',status)}</div><div class="service-event">${events[0]||'观察顾客的等待状态，必要时给指定订单优先出餐。'}</div>${v.breakAt&&currentServiceEvent(game)&&servicePanel==='event'?`<div class="management-card"><strong>${currentServiceEvent(game).title}</strong><p>${currentServiceEvent(game).description}</p>${currentServiceEvent(game).choices.map(ch=>`<button data-choice="${ch.id}"><b>${ch.label}</b><small>${ch.detail}</small></button>`).join('')}</div>`:''}${v.breakAt&&servicePanel==='swap'?`<div class="management-card"><strong>换一道下一波招牌菜</strong><p>下一波到店客人才会按照新菜单点单，当前桌位不受影响。</p>${game.menu.map((id,i)=>`<div class="break-choice-line">${i+1}·${RECIPES[id].name} <select data-swap-slot="${i}">${Object.keys(game.recipes).map(r=>`<option value="${r}" ${r===id?'selected':''}>${RECIPES[r].name}</option>`).join('')}</select><button data-apply-swap="${i}">替换</button></div>`).join('')}</div>`:''}${v.breakAt&&servicePanel==='prep'?`<div class="management-card"><strong>补一份应急餐点</strong><p>现在扣除食材；下一波同款订单可直接上桌，卖不完会计入报损。</p>${game.menu.map(id=>`<button data-breakprep="${id}" ${!canUse(game,RECIPES[id].ids)?'disabled':''}>${RECIPES[id].name} · 预制 1 份</button>`).join('')}</div>`:''}${selected&&['queued','cooking'].includes(selected.status)?`<div class="selected-guest"><strong>${CUSTOMERS[selected.segment].emoji} ${CUSTOMERS[selected.segment].name} · ${RECIPES[selected.recipeId].name}</strong><small>${selected.status==='queued'?'正在排队':'厨房制作中'} · 剩余耐心 ${Math.max(0,selected.patience-(v.time-selected.arrival))}s</small></div>`:''}</div>`,
 v.done?`<div class="dock-head"><span>✅ 今晚营业结束</span></div><div class="action-row">${b('close','📊 查看经营反馈','primary wide')}</div>`:
 v.breakAt?`<div class="dock-head"><span>第 ${v.breakAt} 波结束 · 本波只能选一项应急决策</span></div><div class="break-toolbar">${b('show-management','经营事件','primary',v.breakUsed)}${b('show-swap','临时换菜','secondary',v.breakUsed)}${b('show-prep','备菜','secondary',v.breakUsed)}${b('resume-break','继续迎客 ▶','primary')}</div>`:
 `<div class="dock-head"><span>⏱ ${v.paused?'已暂停 · 点击开业':'观察顾客行为 · 自动制作'}</span><span>招待 ${v.treatUsed?'已用':'1次'}</span></div><div class="action-row">${selected&&selected.status==='queued'?b(`priority:${selected.id}`,'↑ 优先出餐','secondary'):b('clear-table','👀 看顾客','secondary')}${selected?b(`soothe:${selected.id}`,'💛 招待客人','secondary',v.treatUsed||game.coins<5):''}${b('toggle-service',v.paused?'▶ 继续营业':'Ⅱ 暂停','primary wide')}</div>`]
}
function report(){const r=game.report;const lead=newRecipeLead(game);if(!r)return ['',''];return [`<div class="report-scene"><div class="report-header">${r.won?'🏆 击败爆炎厨王！':r.challenge?'🔥 爆炎厨王：挑战结束':'🌙 打烊啦，看看大家怎么说'}</div><div class="report-stats"><div><small>今晚收入</small><b>🪙 ${r.revenue}</b></div><div><small>贡献利润</small><b>${r.profit}</b></div><div><small>成功上菜</small><b>${r.served}/7</b></div><div><small>平均满意</small><b>${r.sat}</b></div></div><div class="guest-verdict"><strong>💬 今日食客点评</strong><p>${r.suggested}</p></div>${r.choices?.length?`<div class="v04-choices"><small>店长今日决策</small>${r.choices.map(c=>`<span>${c.type==='menu_swap'?`临时换菜：${RECIPES[c.before].name} → ${RECIPES[c.after].name}`:`第${c.wave}波：${({sign:'辣味招牌',kitchen:'整理后厨',steady:'稳定营业',soup:'温和推荐',assist:'临时帮厨',publicity:'试吃宣传'})[c.choice]||c.choice}`}</span>`).join('')}</div>`:''}${r.challenge?`<div class="boss-mini">厨王赛得分 <b>${r.challenge.score}</b> / 对手 70　${r.won?'🏆 获得猛火掌控':'未达标，下轮仍可挑战'}</div>`:''}<div class="recipe-lead"><small>🔎 顾客带来的研发灵感</small><strong>${lead?`“${lead.hint}”`:'目前的菜谱已经全部解锁！'}</strong>${lead?`<span>可尝试 ${lead.ingredients.map(id=>ING[id].emoji).join(' + ')}</span>`:''}</div></div>`,
 `<div class="action-row">${b('details','📊 账本','secondary')}${b('to-upgrade','🌅 结束本日 →','primary wide')}</div>`]}
function upgrade(){return [`<div class="scene-bg diner-bg">${restaurantView(false)}<div class="upgrade-card"><h2>🏠 让小食堂越来越好</h2><p>你做出来的菜谱与食堂成长都会永久保留。不同菜单会吸引不同的客人。</p><div class="upgrade-feature">${game.tech?'🔥 猛火掌控：首次厨王胜利已解锁':'🔒 首次赢得厨王战可解锁「猛火掌控」'}</div><div class="upgrade-feature">⚙ 炒锅改装（炒锅出餐 -2 秒） ${game.upgrade?'已安装':`需要 60 金币`}</div>${b('upgrade','⚙ 改装炒锅','secondary',game.upgrade||game.coins<60)}</div></div>`,
 `<div class="action-row">${b('next-day',game.day===3?'🔁 再开一轮':'🌅 开始下一天','primary wide')}</div>`]}
function render(){if(walking&&(!game.field||game.phase!=='field')){clearInterval(walking);walking=null;}const [stage,dock]=({forecast,field,research,menu,prep,service,report,upgrade}[game.phase])();app.innerHTML=shell(stage,dock);save(game)}
function note(txt){message=txt;render()}
function stepMove(dx,dy){const result=moveExplorer(game,dx,dy);if(result.ok)message=result.message;render();return result.ok}
function findPath(x,y){const f=game.field;if(!f)return [];const start=[f.x,f.y];const seen=new Set([start.join(',')]);let paths=[[...start,[]]];while(paths.length){const [cx,cy,path]=paths.shift();if(cx===x&&cy===y)return path;for(const [dx,dy] of [[0,-1],[1,0],[0,1],[-1,0]]){const nx=cx+dx,ny=cy+dy,key=`${nx},${ny}`;if(nx<0||ny<0||nx>=f.worldW||ny>=f.worldH||seen.has(key)||f.obstacles.some(o=>o.x===nx&&o.y===ny))continue;seen.add(key);paths.push([nx,ny,[...path,[dx,dy]]]);}}return []}
function walkTo(x,y){if(walking)clearInterval(walking);const path=findPath(x,y);if(!path.length){note('点击可到达的地图格，或用方向键行走。');return}walking=setInterval(()=>{const step=path.shift();if(!step||game.phase!=='field'||!game.field||game.field.settled){clearInterval(walking);walking=null;return}const old=game.field.nodes.filter(n=>n.claimed).length;stepMove(...step);if(game.phase!=='field'||game.field.nodes.filter(n=>n.claimed).length>old||!path.length){clearInterval(walking);walking=null;}},130)}
function action(act){
 if(act==='close-sheet'){overlay='';render();return}
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
 if(act.startsWith('prep:')){note(prepDish(game,act.slice(5))?'备好一份餐点，稍后可直接上桌。':'食材不足，备餐失败。');return}
 if(act==='open'){nextPhase(game,'service');createService(game);servicePanel='';selectedOrderId=null;note('今晚开门了。点 ▶ 迎客，观察顾客、工位与等待。');return}
 if(act==='toggle-service'){setServicePaused(game,!game.service.paused);note(game.service.paused?'已暂停营业。':'开始迎客！新菜会自动进厨房制作。');return}
 if(act==='resume-break'){servicePanel='';resumeBreak(game);note('下一波开始，注意哪一口锅更忙。');return}
 if(act==='show-management'){servicePanel='event';render();return}
 if(act==='show-swap'){servicePanel='swap';render();return}
 if(act==='show-prep'){servicePanel='prep';render();return}
 if(act.startsWith('breakprep:')){note(breakPrep(game,act.slice(10))?'休整时额外预制了一份菜，等待时间会降低。':'只能在本次休整备餐一次，且需要实际食材。');return}
 if(act.startsWith('priority:')){note(expedite(game,act.slice(9))?'已把该客人的订单排到同工位队列前面。':'这单已经开工，不能再插队。');return}
 if(act.startsWith('soothe:')){note(sootheGuest(game,act.slice(7))?'💛 花费 5 金币招待客人，延长其耐心 9 秒。':'今晚的招待机会已用或该客人已经离开。');return}
 if(act==='clear-table'){selectedOrderId=null;note('点餐桌查看客人的实时订单，再决定是否优先出餐。');return}
 if(act==='close'){const r=closeService(game);note(r?'日报已经生成。今天的客人会告诉你该研发什么新菜。':'请先完成本晚营业。');return}
 if(act==='to-upgrade'){nextPhase(game,'upgrade');note('所有食材与新菜都会保留到下一天。');return}
 if(act==='upgrade'){note(buyUpgrade(game)?'炒锅改装完成，今后出餐更快。':'已经升级或金币不足。');return}
 if(act==='next-day'){advanceDay(game);note('🌅 新的一天！客人偏好与探索路线在变化。');return}
}
app.addEventListener('click',e=>{
 const tile=e.target.closest('[data-tile]');if(tile&&game.cook){const i=+tile.dataset.tile;if(tileSelected===null){if(game.cook.tiles[i]){tileSelected=i;note('再点一次目的格，交换或移动食材。');}}else{const from=tileSelected;tileSelected=null;note(moveTile(game,from,i)?'已翻动锅内食材。':'本拍换位机会已用完。')}return}
 const ev=e.target.closest('[data-event]');if(ev){if(resolveFieldEvent(game,ev.dataset.event)){message=game.field.actionMessage;render()}return}
 const ch=e.target.closest('[data-choice]');if(ch){if(chooseServiceEvent(game,ch.dataset.choice)){servicePanel='';note(game.service.decisionFlash+'，下一波将兑现。')}else note('目前条件不足或已经处理过本波事件。');return}
 const bp=e.target.closest('[data-breakprep]');if(bp){servicePanel='';note(breakPrep(game,bp.dataset.breakprep)?game.service.decisionFlash+'，下波同款订单将优先出餐。':'原料不足或本波应急机会已用。');return}
 const swap=e.target.closest('[data-apply-swap]');if(swap){const slot=Number(swap.dataset.applySwap),id=app.querySelector(`[data-swap-slot="${slot}"]`)?.value;const ok=swapBreakMenu(game,slot,id);servicePanel='';note(ok?game.service.decisionFlash+'，只影响尚未入店的顾客。':'无法换菜：只能一次，或与现有菜相同。');return}
 const a=e.target.closest('[data-act]');if(a){if(!a.disabled)action(a.dataset.act);return}
 const route=e.target.closest('[data-route]');if(route){const entered=enterField(game,route.dataset.route);if(entered)startActionField(game);note(entered?'按住森林任意位置并拖动移动，靠近目标会自动采集、挥铲！':'路线无法进入。');return}
 const target=e.target.closest('[data-target]');if(target){game.selectedTarget=target.dataset.target;render();return}
 const item=e.target.closest('[data-ingredient]');if(item){const id=item.dataset.ingredient;if(selectedIngredients.includes(id))selectedIngredients=selectedIngredients.filter(i=>i!==id);else if(selectedIngredients.length<3)selectedIngredients=[...selectedIngredients,id];else message='一锅最多放三种食材。';render();return}
 const book=e.target.closest('[data-book]');if(book){const r=RECIPES[book.dataset.book];selectedIngredients=[...r.ids];selectedMethod=r.method;overlay='';note(`已选择实验线索：${r.hint}`);return}
 const slot=e.target.closest('[data-edit-slot]');if(slot){overlay=`menu:${slot.dataset.editSlot}`;render();return}
 const pick=e.target.closest('[data-menu-pick]');if(pick){const [slot,id]=pick.dataset.menuPick.split(':');game.menu[Number(slot)]=id;overlay='';note(`已上架 ${RECIPES[id].name}，看看厨房的双工位负担。`);return}
 const seat=e.target.closest('[data-seat]');if(seat){const id=+seat.dataset.seat;const o=game.service?.orders.find(o=>o.tableId===id&&['queued','cooking'].includes(o.status));selectedOrderId=o?.id||null;note(o?`${CUSTOMERS[o.segment].name}：想吃 ${RECIPES[o.recipeId].name}。`:'这桌目前空闲，新顾客会从入口来。');return}
 const station=e.target.closest('[data-station]');if(station){const st=station.dataset.station,v=game.service;const queue=v?v.queued.filter(id=>RECIPES[v.orders.find(o=>o.id===id)?.recipeId]?.station===st).length:0;note(`${st==='WOK'?'炒锅':'炖锅'}当前排队 ${queue} 单。多安排另一口锅的菜能减少堵单。`);return}
 // Realtime field uses the thumb joystick; no grid click-to-walk.
 
});
app.addEventListener('pointerdown',e=>{const a=e.target.closest('[data-tile]');if(a&&game.cook&&game.cook.tiles[+a.dataset.tile])drag={i:+a.dataset.tile,x:e.clientX,y:e.clientY};},{passive:true});
app.addEventListener('pointerup',e=>{if(!drag)return;const from=drag;drag=null;if(Math.hypot(e.clientX-from.x,e.clientY-from.y)<25)return;const to=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-tile]');if(to){tileSelected=null;note(moveTile(game,from.i,+to.dataset.tile)?'拖动翻炒成功。':'本拍只能换位一次。')}},{passive:true});
document.addEventListener('keydown',e=>{if(game.phase==='field'&&game.field&&!overlay){const map={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0],w:[0,-1],s:[0,1],a:[-1,0],d:[1,0]};if(map[e.key]){e.preventDefault();keys.add(e.key)}}});
setInterval(()=>{if(document.hidden||overlay)return;if(game.phase==='service'&&game.service&&!game.service.paused&&!game.service.done&&!game.service.breakAt){tick(game,1);if(game.service.done)message='今晚的顾客已经全部处理完毕，可以查看日报。';else if(game.service.breakAt){servicePanel='event';message='突发经营事件！请选择应对方案，或改菜单、备菜。';}render()}},750);
document.addEventListener('keyup',e=>keys.delete(e.key));
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(walking){clearInterval(walking);walking=null}if(game.phase==='service'&&game.service&&!game.service.paused){game.service.paused=true;message='已自动暂停营业，返回后继续。'}save(game)}});
render();

// The simulation and visual rendering are decoupled: canvas runs each frame,
// the rules tick at a fixed delta, and HTML overlays rerender only on decisions.
function analogAxis(){let x=stick.x,y=stick.y;for(const key of keys){if(['ArrowLeft','a'].includes(key))x-=1;if(['ArrowRight','d'].includes(key))x+=1;if(['ArrowUp','w'].includes(key))y-=1;if(['ArrowDown','s'].includes(key))y+=1;}const l=Math.hypot(x,y);return l>1?[x/l,y/l]:[x,y]}
function frame(now){const delta=Math.min(.045,(now-(lastFrame||now))/1000);lastFrame=now;gameClock+=delta;
 if(game.phase==='field'&&game.field?.action&&!document.hidden&&!overlay){
  const [dx,dy]=analogAxis(),evt=stepActionField(game,dx,dy,delta);
  if(evt==='field_event'){message='遇见流浪调味师：请选择方案。';releaseStick();render()}
  else if(game.phase!=='field'){releaseStick();message='探索结束：只损失本次背包收获，原仓库安全。';render()}
  else {const f=game.field;const hud=app.querySelector('.action-hud');if(hud)hud.innerHTML=`<span>体力 ${f.hp}/3</span><span>收获 ${Object.entries(f.bag).map(([k,n])=>ING[k].name+'×'+n).join(' · ')||'空'}</span><span>${Math.floor(f.elapsed)}s</span>`;
   const skill=app.querySelector('[data-act="skill"]');if(skill){skill.disabled=f.skillCd>0;skill.textContent=f.skillCd>0?`锅铲 ${Math.ceil(f.skillCd)}s`:'锅铲击退'};
  }
 }
 const forest=app.querySelector('#forest-canvas');if(forest)drawField(forest,game,gameClock);
 const diner=app.querySelector('#diner-canvas');if(diner)drawDiner(diner,game,gameClock);
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