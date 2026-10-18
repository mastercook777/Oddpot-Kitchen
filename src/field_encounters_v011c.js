// Pure planning/quotes. engine.js owns the unique ledger + field commit.
import {ING} from './data.js?v=0.14.0-alpha.4';
const encounterHash=n=>{let h=n>>>0;h=Math.imul(h^(h>>>16),0x45d9f3b);h=Math.imul(h^(h>>>16),0x45d9f3b);return (h^(h>>>16))>>>0;};
export const SPECIAL_ENCOUNTER_KINDS=['merchant','traveler','ecology'];
export function specialEncounterOffer(kind,region='forest'){
 if(kind==='merchant')return {coins:36,cost:{},gain:{tide_sour_pulp:2}};
 if(kind==='traveler')return {coins:0,cost:{[region==='spring'?'potato':'mushroom']:2},gain:{starlit_nectar:2}};
 if(kind==='ecology')return {coins:0,cost:{},gain:{[region==='spring'?'potato':'mushroom']:1}};
 return null;
}
export function makeSpecialEncounterPlan(s,route){
 const region=String(route).startsWith('spring')?'spring':'forest',risk=/risk/.test(route);
 const seed=encounterHash((s.seed||20261009)+(s.cycle||1)*1009+(s.day||1)*139+(region==='spring'?104729:0));
 const misses=Math.min(2,Math.max(0,Number(s.encounterProgress?.misses)||0)),npc=misses>=2||seed%100<(risk?50:40);
 const encounters=[],segment=2+encounterHash(seed+5)%2,key=`${s.cycle}-${s.day}-${region}`;
 if(npc){const kind=encounterHash(seed+17)%100<(risk?70:30)?'merchant':'traveler';
  encounters.push({eventId:`special-${key}`,segment,kind,region,offer:specialEncounterOffer(kind,region)});}
 if(encounterHash(seed+91)%100<25){
  const stage=npc?1:2+encounterHash(seed+117)%2;
  encounters.push({eventId:`ecology-${key}`,segment:stage,kind:'ecology',region,offer:specialEncounterOffer('ecology',region)});
 }
 return {version:'0.11-C',region,npcScheduled:npc,encounters};
}
export function specialEncounterDetails(n){
 if(n?.kind==='merchant')return {title:'神秘商人',line:'「酸得会拐弯，一包两份。先试一锅，再留一份招待识货的客人。」',hint:'酸浆适合鸡肉与蒜瓣爆炒，也能与土豆、洋葱慢炖。'};
 if(n?.kind==='traveler')return {title:'采蜜旅人',line:'「蜜蜂不收金币，我也不收。拿你这趟找到的食材换吧。」',hint:'花蜜可以翻炒魔菜，或与鸡肉、洋葱轻搅慢炖。'};
 return {title:n?.region==='spring'?'温泉晶簇':'月露花丛',line:'一处尚未被取走的自然馈赠。可以安全采一点，或付出体力深入调查。',hint:'这里得到普通食材；不会直接解锁菜谱。'};
}
export function specialEncounterChoices(n){
 return n?.kind==='merchant'?['buy','leave']:n?.kind==='traveler'?['trade','leave']:n?.kind==='ecology'?['observe','forage','leave']:[];
}
export function specialBagSlots(bag){return Object.values(bag||{}).reduce((n,v)=>n+Math.ceil(Math.max(0,v)/3),0);}
const encounterItemsValid=items=>items&&typeof items==='object'&&!Array.isArray(items)&&Object.entries(items).every(([id,q])=>Object.hasOwn(ING,id)&&Number.isInteger(q)&&q>0&&q<=9);
export function previewSpecialEncounter(s,n,choice){
 const f=s.field,fail=reason=>({ok:false,reason});
 if(!f||!n||!specialEncounterChoices(n).includes(choice))return fail('无效的奇遇选项');
 if(n.claimed||n.status==='resolved'||s.ledger?.some(t=>t.id==='encounter-'+n.eventId))return fail('这次奇遇已经结束');
 if(choice==='leave')return {ok:true,bag:{...f.bag},coins:0,hp:0,cost:{},gain:{},slots:specialBagSlots(f.bag)};
 const offer=n.offer;if(!offer||!encounterItemsValid(offer.cost)||!encounterItemsValid(offer.gain)||!Number.isInteger(offer.coins)||offer.coins<0)return fail('这份报价无法使用');
 const cost={...offer.cost},gain={...offer.gain},coins=offer.coins,hp=n.kind==='ecology'&&choice==='forage'?1:0;
 if(hp)for(const id of Object.keys(gain))gain[id]=3;
 if(!Number.isFinite(s.coins)||s.coins<coins)return fail(`金币不足：需要${coins}金币`);
 if(!Number.isFinite(f.hp)||f.hp<=hp)return fail('生命不足：调查后至少保留1点生命');
 const bag={...f.bag};
 for(const [id,q] of Object.entries(cost)){
  if((bag[id]||0)<q)return fail(`野外背包缺少${ING[id].name}×${q}（不使用仓库）`);
  bag[id]-=q;if(!bag[id])delete bag[id];
 }
 for(const [id,q] of Object.entries(gain))bag[id]=(bag[id]||0)+q;
 const slots=specialBagSlots(bag);
 if(slots>(f.capacity||8))return fail('背包空间不足：需要装下整份收获');
 return {ok:true,bag,coins,hp,cost,gain,slots};
}
