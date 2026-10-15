// v0.12-C · Single authoritative restaurant business rules.
// No duplicate guest simulation: promotion/marketing/payroll all operate on the existing engine state.
export const CAMPAIGNS={
 none:{id:'none',name:'自然营业',cost:0,guests:[],desc:'安全营业 · 不增加客流'},
 flyer:{id:'flyer',name:'街头传单',cost:18,guests:['family','regular'],desc:'新增2位家庭/街坊食客 · 菌香和清爽'},
 guild:{id:'guild',name:'冒险公会告示',cost:35,guests:['adventurer','adventurer','adventurer'],desc:'高峰新增3位冒险者 · 辛辣与肉类'},
 tasting:{id:'tasting',name:'品鉴邀请',cost:45,guests:['critic'],stars:1,desc:'首星后邀请1位鉴味师 · 香与爆香'}
};
export const CREW_GROWTH={
 helper:{wages:[10,14,19],promotionCosts:[0,28,64]},
 waiter:{wages:[9,13,18],promotionCosts:[0,28,64]}
};
export const CREW_XP_THRESHOLDS={2:8,3:30};
export const currentDayKey=s=>s.cycle+'-'+s.day;

export function ensureManagement(s){
 const dayKey=currentDayKey(s);
 s.management??={dayKey,openingCoins:s.coins,campaignId:'none',wageDebt:0};
 if(s.management.dayKey!==dayKey){
  s.management.dayKey=dayKey;s.management.openingCoins=s.coins;s.management.campaignId='none';
 }
 s.management.wageDebt=Math.max(0,Math.floor(Number(s.management.wageDebt)||0));
 s.management.openingCoins??=s.coins;
 if(!CAMPAIGNS[s.management.campaignId])s.management.campaignId='none';
 return s.management;
}
export function selectedCampaign(s){
 return CAMPAIGNS[ensureManagement(s).campaignId]||CAMPAIGNS.none;
}
export function chooseCampaign(s,id){
 const campaign=CAMPAIGNS[id];
 if(s.phase!=='prep'||s.service||!campaign)return false;
 if(campaign.stars&&(s.chapterProgress?.stars||0)<campaign.stars)return false;
 ensureManagement(s).campaignId=id;return true;
}
export function crewWage(role,level=1){
 return CREW_GROWTH[role]?.wages[Math.max(1,Math.min(3,level))-1]||0;
}
export function ensureStaffProgress(s){
 s.crew??={};
 for(const role of Object.keys(CREW_GROWTH)){
  const person=s.crew[role]??={};
  person.hired=!!person.hired;
  person.level=Math.max(1,Math.min(3,Math.floor(Number(person.level)||1)));
  person.xp=Math.max(0,Math.floor(Number(person.xp)||0));
  // v0.5B saves have no duty flag: hired staff continue working until explicitly benched.
  person.onDuty=person.hired&&person.onDuty!==false;
  s.crew[role]=person;
 }
 return s.crew;
}
export function setCrewDuty(s,role,enabled){
 const person=ensureStaffProgress(s)[role];
 if(s.phase!=='prep'||s.service||!person?.hired||person.onDuty===!!enabled)return false;
 person.onDuty=!!enabled;return true;
}
export function crewPromotion(s,role){
 const person=ensureStaffProgress(s)[role],growth=CREW_GROWTH[role];
 if(!growth||!person?.hired||person.level>=3)return null;
 const level=person.level+1;
 return {level,requiredXP:CREW_XP_THRESHOLDS[level],cost:growth.promotionCosts[level-1],
  nextWage:crewWage(role,level),ready:person.xp>=CREW_XP_THRESHOLDS[level]};
}
export function applyCrewPromotion(s,role,transact){
 if(!['prep','upgrade'].includes(s.phase))return false;
 const next=crewPromotion(s,role);
 if(!next?.ready||s.coins<next.cost)return false;
 if(!transact(s,'crew-promote-'+role+'-lv'+next.level,'crew_promotion',{},-next.cost))return false;
 ensureStaffProgress(s)[role].level=next.level;return true;
}
export function payroll(s,shift,transact){
 const management=ensureManagement(s);
 const wage=Object.keys(CREW_GROWTH).reduce((sum,role)=>sum+(shift.crew?.[role]?.salary||0),0);
 const previousDebt=management.wageDebt;
 const payable=wage+previousDebt;
 const paid=Math.min(Math.max(0,s.coins),payable);
 if(paid&&!transact(s,'payroll-'+currentDayKey(s),'payroll',{},-paid))
  throw Error('重复工资流水：不能再次营业结算');
 management.wageDebt=payable-paid;
 return {wage,previousDebt,paid,debt:management.wageDebt,
  roster:Object.fromEntries(Object.keys(CREW_GROWTH).map(role=>[role,shift.crew?.[role]?.salary||0]))};
}
export function settleCrewExperience(s,shift){
 const crew=ensureStaffProgress(s),served=new Set(shift.orders.filter(x=>x.status==='served').map(x=>x.id));
 const helperOrders=new Set(shift.events.filter(x=>x.type==='helper_finished').map(x=>x.order));
 const waiterOrders=new Set(shift.events.filter(x=>x.type==='waiter_pickup'&&served.has(x.order)).map(x=>x.order));
 const earned={helper:shift.crew?.helper?.hired?helperOrders.size:0,waiter:shift.crew?.waiter?.hired?waiterOrders.size:0};
 for(const role of Object.keys(earned))crew[role].xp+=earned[role];
 return {earned,after:Object.fromEntries(Object.keys(earned).map(role=>[role,{xp:crew[role].xp,level:crew[role].level}]))};
}
