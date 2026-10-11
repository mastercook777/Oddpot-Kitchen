// v0.7 experimental staffing lab. Pure logic: no DOM, no inventory,
// no writes to the current v0.6.3 business engine. Same joystick math in UI.
export const LAB_STATIONS={
 WOK:{x:.25,y:.28,label:'炒锅'},
 POT:{x:.75,y:.28,label:'深锅'}
};
export const LAB_PASS={x:.50,y:.47,label:'出餐台'};
export const LAB_TABLES=[
 {x:.27,y:.73,label:'1号桌'},
 {x:.73,y:.73,label:'2号桌'}
];
const ORDER_PLAN=[
 {at:1,station:'WOK',table:0,time:7,patience:29,name:'辣椒炒肉'},
 {at:6,station:'POT',table:1,time:10,patience:30,name:'蘑菇焖鸡'},
 {at:12,station:'WOK',table:1,time:8,patience:26,name:'葱爆牛肉'},
 {at:18,station:'POT',table:0,time:10,patience:26,name:'森林浓汤'},
 {at:24,station:'WOK',table:0,time:7,patience:26,name:'菌香小炒'},
 {at:31,station:'POT',table:1,time:9,patience:29,name:'洋葱炖牛肉'},
 {at:37,station:'WOK',table:1,time:8,patience:30,name:'焦香蒜牛'},
 {at:44,station:'POT',table:0,time:10,patience:31,name:'牛肉土豆煲'}
];
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const waitStatuses=new Set(['queued','cooking','pickup','carried']);
function say(s,msg){s.message=msg;s.messageT=2.7;s.events.push({time:+s.time.toFixed(1),text:msg});}
export function makeServiceLab(staff={helper:false,waiter:false}){
 return {
  time:0,limit:72,paused:false,done:false,
  staff:{helper:!!staff.helper,waiter:!!staff.waiter},
  hero:{x:.50,y:.28,facing:'down',energy:6,maxEnergy:6,recharge:0,zone:null,dwell:0,assists:0,comforts:0,carryOrderId:null,handServed:0},
  kitchen:{WOK:null,POT:null},orders:[],nextOrder:0,
  events:[],message:'移动主厨，靠近厨位自动工作。',messageT:4,
  score:{served:0,lost:0,chefSeconds:0,autoSeconds:0,comfortSaves:0,manualServed:0,waiterServed:0,selfPicked:0}
 };
}
export function laboratoryMode(s){
 if(!s.staff.helper&&!s.staff.waiter)return '单人开店：主厨做菜、取餐、上菜；也可安抚，离锅就停工';
 if(s.staff.helper&&!s.staff.waiter)return '阿火掌一口锅；主厨可取餐上菜，但另一口锅会积压';
 if(!s.staff.helper&&s.staff.waiter)return '小芽自动上菜；主厨仍要负责实质烹饪';
 return '阿火帮厨、小芽自动上菜：主厨可重点救场';
}
export function kitchenBusy(s,key){return s.kitchen[key]&&s.orders.find(o=>o.id===s.kitchen[key]);}
export function nearbyZone(hero){
 // Single central pass can be reached by the same kitchen-to-table walkway.
 if(dist(hero,LAB_PASS)<.125)return 'PASS';
 // Kitchen spots and tables are physically separated by a service counter.
 for(const [id,p] of Object.entries(LAB_STATIONS)){
  if(dist(hero,{x:p.x,y:p.y+.09})<.16)return id;
 }
 for(let i=0;i<LAB_TABLES.length;i++){
  if(dist(hero,{x:LAB_TABLES[i].x,y:LAB_TABLES[i].y-.12})<.17)return 'TABLE'+i;
 }
 return null;
}
function walk(s,dx,dy,dt){
 const h=s.hero,l=Math.hypot(dx,dy),scale=l>1?1/l:1,velocity=.48;
 dx*=scale;dy*=scale;
 if(Math.hypot(dx,dy)<.09)return;
 if(Math.abs(dx)>Math.abs(dy))h.facing=dx<0?'left':'right';
 else h.facing=dy<0?'up':'down';
 const nx=clamp(h.x+dx*velocity*dt,.075,.925);
 const ny=clamp(h.y+dy*velocity*dt,.14,.93);
 // The serving counter separates kitchen and dining; central passage is open.
 if((h.y<.47&&ny>=.47||h.y>.49&&ny<=.49)&&!(nx>.405&&nx<.595))return;
 const blocked=LAB_TABLES.some(p=>Math.hypot((nx-p.x)*1,(ny-p.y)*1.2)<.095);
 if(blocked)return;
 h.x=nx;h.y=ny;
}
function arrival(s){
 while(s.nextOrder<ORDER_PLAN.length&&ORDER_PLAN[s.nextOrder].at<=s.time){
  const i=s.nextOrder++,raw=ORDER_PLAN[i];
  s.orders.push({
   id:'o'+i,name:raw.name,station:raw.station,table:raw.table,
   arrive:raw.at,time:raw.time,left:raw.time,
   patience:raw.patience+(s.staff.waiter?6:0),
   status:'queued',comforted:false,boosted:false,
   pickup:0
  });
  say(s,'🧾 '+raw.name+' · '+(raw.station==='WOK'?'炒锅':'深锅')+' 新订单');
 }
}
function queueUp(s){
 for(const station of ['WOK','POT']){
  if(s.kitchen[station])continue;
  const o=s.orders.find(x=>x.status==='queued'&&x.station===station);
  if(o){o.status='cooking';s.kitchen[station]=o.id}
 }
}
function finishServing(s,o,via){
 if(!o||!['pickup','carried'].includes(o.status))return false;
 if(s.hero.carryOrderId===o.id)s.hero.carryOrderId=null;
 o.status='served';o.deliveredBy=via;s.score.served++;
 if(via==='chef'){s.score.manualServed++;s.hero.handServed++}
 else if(via==='waiter')s.score.waiterServed++;
 else s.score.selfPicked++;
 say(s,(via==='chef'?'🙌 主厨亲自上菜：':via==='waiter'?'🪑 小芽上菜：':'🍽️ 顾客自取：')+o.name);
 return true;
}
export function carriedPlate(s){return s.orders.find(o=>o.id===s.hero.carryOrderId&&o.status==='carried')||null}
export function passOrder(s){
 // Front of pass is FIFO, and only finished food can be collected.
 return s.orders.find(o=>o.status==='pickup'&&!o.claimed);
}
export function serviceZoneIntent(s){
 const zone=nearbyZone(s.hero),carry=carriedPlate(s);
 if(zone==='PASS'){
  if(carry)return {zone,action:'carrying',order:carry};
  const food=passOrder(s);return {zone,action:food?'collect':'wait',order:food};
 }
 if(zone?.startsWith('TABLE')){
  const table=Number(zone.slice(5));
  if(carry)return {zone,action:carry.table===table?'serve':'wrong-table',order:carry};
  const pending=s.orders.find(o=>o.table===table&&waitStatuses.has(o.status)&&!o.comforted);
  return {zone,action:pending?'comfort':'wait',order:pending};
 }
 if(zone==='WOK'||zone==='POT')return {zone,action:carry?'carrying':'cook',order:kitchenBusy(s,zone)};
 return {zone:null,action:carry?'carrying':'move',order:carry};
}
function useZone(s,dt){
 const h=s.hero,intent=serviceZoneIntent(s),zone=intent.zone;
 // Changing either zone or nearby objective resets dwell; no extra click.
 const focus=zone+'|'+(intent.action||'none')+'|'+(intent.order?.id||'-');
 if(h.zone!==zone||h.focus!==focus){h.zone=zone;h.focus=focus;h.dwell=0}
 if(!zone)return;
 h.dwell+=dt;
 const delay=intent.action==='collect'?.38:intent.action==='serve'?.50:.60;
 if(h.dwell<delay)return;
 if(intent.action==='collect'){
  const order=intent.order;
  if(!order||order.status!=='pickup'||h.carryOrderId)return;
  order.status='carried';order.claimed=true;h.carryOrderId=order.id;
  h.dwell=0;
  say(s,'🍽️ 端起 '+order.name+'！送往 '+(order.table+1)+' 号桌');
  return;
 }
 if(intent.action==='serve'){
  finishServing(s,intent.order,'chef');h.dwell=0;return;
 }
 if(intent.action==='cook'){
  const order=intent.order;
  if(!order||order.boosted||h.energy<2)return;
  order.boosted=true;h.energy-=2;h.assists++;
  order.left=Math.max(.8,order.left-2);
  say(s,'🍳 主厨协助 '+order.name+'：省 2 秒，精力 -2');
  return;
 }
 if(intent.action==='comfort'){
  const order=intent.order;
  if(!order||h.energy<1||order.comforted)return;
  h.energy-=1;h.comforts++;order.comforted=true;
  order.patience+=4;s.score.comfortSaves+=4;
  say(s,'💛 安抚 '+(order.table+1)+' 号桌：耐心 +4 秒，精力 -1');
 }
}

function cook(s,dt){
 const h=s.hero,zone=nearbyZone(h);
 for(const key of ['WOK','POT']){
  const order=kitchenBusy(s,key);if(!order)continue;
  const chef=zone===key&&!carriedPlate(s)?1:0;
  // Solo: no chef nearby = no unattended production.
  // With helper: left station is automatic, right gets only safety simmer.
  const helper=s.staff.helper?(key==='WOK'?1:.24):0;
  const rate=chef+helper;
  if(!rate)continue;
  const used=Math.min(order.left,rate*dt);
  order.left-=used;
  s.score.chefSeconds+=chef*dt;
  s.score.autoSeconds+=helper*dt;
  if(order.left<=.0001){
   order.left=0;s.kitchen[key]=null;
   order.status='pickup';order.pickup=s.staff.waiter?1.25:8.0;
   say(s,'🥘 '+order.name+' 出锅！'+(s.staff.waiter?'小芽会自动上菜':'出餐台可取餐，自己上菜更快'));
  }
 }
}
function resolve(s,dt){
 for(const o of s.orders){
  if(!waitStatuses.has(o.status))continue;
  // Even a chef-carried plate cannot outlive the customer who ordered it.
  if(s.time-o.arrive>o.patience){
   o.status='left';s.score.lost++;
   if(s.hero.carryOrderId===o.id)s.hero.carryOrderId=null;
   if(s.kitchen[o.station]===o.id)s.kitchen[o.station]=null;
   say(s,'😟 '+o.name+' 顾客久等离开');continue;
  }
  if(o.status==='pickup'){
   o.pickup-=dt;
   if(o.pickup<=0)finishServing(s,o,s.staff.waiter?'waiter':'self');
  }
 }
}

export function stepServiceLab(s,dx,dy,dt){
 if(s.done||s.paused)return s;
 dt=clamp(Number(dt)||0,0,.06);if(!dt)return s;
 s.time+=dt;
 if(s.messageT>0)s.messageT=Math.max(0,s.messageT-dt);
 walk(s,dx,dy,dt);
 arrival(s);queueUp(s);
 const z=nearbyZone(s.hero);
 if(z)useZone(s,dt);
 cook(s,dt);resolve(s,dt);
 // Recovery is tied to ACTIVE service time, never background idle time.
 s.hero.recharge+=dt;
 if(s.hero.recharge>=10){const units=Math.floor(s.hero.recharge/10);s.hero.recharge%=10;s.hero.energy=Math.min(s.hero.maxEnergy,s.hero.energy+units)}
 if(s.time>=s.limit || (s.nextOrder===ORDER_PLAN.length&&s.orders.every(o=>['served','left'].includes(o.status)))){
  s.done=true;s.time=Math.min(s.time,s.limit);say(s,'🌙 营业演示结束：送达 '+s.score.served+' / '+s.orders.length);
 }
 return s;
}
export function snapshotLab(s){
 const pending=s.orders.filter(o=>waitStatuses.has(o.status)).length;
 return {
  mode:laboratoryMode(s),served:s.score.served,lost:s.score.lost,
  total:ORDER_PLAN.length,pending,energy:s.hero.energy,maxEnergy:s.hero.maxEnergy,
  kitchen:{WOK:kitchenBusy(s,'WOK'),POT:kitchenBusy(s,'POT')},
  zone:nearbyZone(s.hero),intent:serviceZoneIntent(s),carry:carriedPlate(s),
  passReady:s.orders.filter(o=>o.status==='pickup').length,
  manualServed:s.score.manualServed,waiterServed:s.score.waiterServed,selfPicked:s.score.selfPicked,
  message:s.message,finished:s.done
 };
}
