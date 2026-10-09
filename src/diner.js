import {CUSTOMERS, RECIPES} from './data.js?v=0.2.1';

// A scene presentation, never a separate restaurant simulation. Every occupied chair,
// kitchen flame and order bubble reads from the shared deterministic service state.
const palettes={
  adventurer:{hat:'#436c58',body:'#426e8e',hair:'#4d352b',trim:'#d2af65'},
  family:{hat:'#9c5d47',body:'#ca8261',hair:'#704636',trim:'#f5dc9e'},
  regular:{hat:'#5c709a',body:'#739dbe',hair:'#5a4834',trim:'#e9ca6e'},
  critic:{hat:'#413d50',body:'#704359',hair:'#392f32',trim:'#eecb79'},
  chef:{hat:'#faf2de',body:'#e9d4a7',hair:'#64422c',trim:'#a84736'}
};
export function personSprite(kind='regular'){
 const p=palettes[kind]||palettes.regular;
 return `<svg class="person-sprite person-${kind}" viewBox="0 0 24 32" aria-hidden="true" focusable="false" shape-rendering="crispEdges">
 <rect x="7" y="2" width="10" height="4" fill="${p.hat}"/><rect x="5" y="5" width="14" height="3" fill="${p.hat}"/>
 <rect x="6" y="8" width="12" height="4" fill="${p.hair}"/><rect x="7" y="11" width="10" height="9" fill="#f0bd86"/>
 <rect x="9" y="14" width="2" height="2" fill="#322c2a"/><rect x="14" y="14" width="2" height="2" fill="#322c2a"/>
 <rect x="8" y="20" width="8" height="7" fill="${p.body}"/><rect x="8" y="21" width="8" height="2" fill="${p.trim}"/>
 <rect x="4" y="21" width="4" height="5" fill="${p.body}"/><rect x="16" y="21" width="4" height="5" fill="${p.body}"/>
 <rect x="8" y="27" width="3" height="4" fill="#5a3e35"/><rect x="13" y="27" width="3" height="4" fill="#5a3e35"/></svg>`;
}
const statusMap={queued:'等餐中',cooking:'制作中',served:'已送达',left:'已离店',rejected:'未接单'};
const bubbleFor=o=>{
 if(!o)return '<span class="seat-placeholder">空桌 · 等候开门</span>';
 const dish=RECIPES[o.recipeId];
 return `<div class="table-request ${o.segment==='critic'?'critic-request':''}"><span>${dish?.emoji||'❔'} ${dish?.name||'暂无合适菜'}</span><small>${statusMap[o.status]||'点单中'}</small></div>`;
};
function station(st,v,interactive){
 const job=v?.stations[st];const order=job&&v.orders.find(o=>o.id===job.orderId);
 const names=st==='WOK'?['炒锅','爆炒']:['炖锅','焖煮'];
 const count=v?.queued.filter(id=>v.orders.find(o=>o.id===id&&RECIPES[o.recipeId]?.station===st)).length||0;
 const label=`${names[0]}，${job?`正在制作${RECIPES[order?.recipeId]?.name||''}，剩余${job.left}秒`:'当前空闲'}，等待${count}单`;
 return `<button type="button" class="scene-station ${st==='WOK'?'station-wok':'station-pot'} ${job?'active':''}" ${interactive?`data-scene-station="${st}"`: 'disabled'} aria-label="${label}">
 <span class="stove-flame">${job?'♨':'·'}</span><span class="stove-lid">${st==='WOK'?'🍳':'🍲'}</span>
 <span class="stove-name">${names[0]}</span><span class="stove-status">${job?`${RECIPES[order?.recipeId]?.emoji||'🍽'} ${job.left}s`:`${count} 单候锅`}</span>
 </button>`;
}
function tableAt(n,v,interactive,selectedId){
 const active=v?.orders.find(o=>o.tableId===n&&['queued','cooking'].includes(o.status));
 const recent=!active&&v?.orders.find(o=>o.tableId===n&&o.status==='served'&&v.time-o.served<=3);
 const o=active||recent||null;
 const pct=active?Math.max(0,Math.round((1-(v.time-active.arrival)/active.patience)*100)):100;
 return `<button type="button" class="scene-table table-${n} ${o?'has-customer':''} ${o?.id===selectedId?'is-selected':''} ${active&&pct<35?'is-urgent':''}" ${interactive?`data-scene-seat="${n}"`:'disabled'} aria-label="${o?`第${n+1}桌，${CUSTOMERS[o.segment]?.name||'客人'}，${RECIPES[o.recipeId]?.name||''}，${statusMap[o.status]||''}`:`第${n+1}桌，空闲`}">
 <span class="chair chair-top"></span><span class="table-surface"><span class="table-platter">${recent?'🍽️':o?RECIPES[o.recipeId]?.emoji||'🍽️':'☕'}</span></span><span class="chair chair-bottom"></span>
 ${o?`<span class="visitor ${active&&v.time-active.arrival<=1?'arrived-now':''}">${personSprite(o.segment)}</span>${bubbleFor(o)}${active?`<span class="scene-patience"><i style="width:${pct}%"></i></span>`:''}`:`<span class="table-empty">${n+1} 号桌</span>`}
 </button>`;
}
export function restaurantScene(game,{selectedOrderId=null,interactive=true,compact=false}={}){
 const v=game.service,playing=interactive&&!!v;const waiting=v?.orders.filter(o=>o.status==='waiting'&&o.arrival<=v.time).length||0;
 return `<section class="restaurant-frame ${compact?'compact':''}" aria-label="食堂经营场景">
 <div class="restaurant-scene">
 <div class="room-wall"><span class="wall-window">🌙</span><span class="wall-sign">ODDPOT KITCHEN</span><span class="wall-window">🌿</span></div>
 <div class="room-floor"></div>
 <div class="scene-shelf"><span>🥖</span><span>🧄</span><span>🍯</span></div>
 <div class="scene-counter"></div>
 ${station('WOK',v,playing)}${station('POT',v,playing)}
 <div class="cook-hero">${personSprite('chef')}<span class="chef-name">主厨</span></div>
 ${tableAt(0,v,playing,selectedOrderId)}${tableAt(1,v,playing,selectedOrderId)}
 <div class="floor-pot">🪴</div><div class="entrance"><span>🚪</span><small>${waiting?`门外等候 ${waiting} 位`:'欢迎光临'}</small></div>
 </div>
 <div class="scene-caption"><span>🏠 边境小食堂 · 两桌 / 双锅</span><span>${v?`已完成 ${v.orders.filter(o=>o.status==='served').length}/${v.orders.length} 单`:'每日菜单决定今晚的客流'}</span></div>
 </section>`;
}