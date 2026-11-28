import {ING} from './data.js?v=0.14.0-alpha.5';
import {ingredientIconHtml} from './ingredient_icons_v011g.js';
import {specialEncounterDetails,specialEncounterChoices,previewSpecialEncounter,specialBagSlots} from './field_encounters_v011c.js';
const encounterEsc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function encounterItemText(items){return Object.entries(items).map(([id,q])=>`${ingredientIconHtml(id,20)} ${encounterEsc(ING[id]?.name||id)} ×${q}`).join(' + ');}
export function specialEncounterHtml(s,n){
 const details=specialEncounterDetails(n),f=s.field;
 const actions=specialEncounterChoices(n).map(choice=>{
  const quote=previewSpecialEncounter(s,n,choice);
  const gain=n.kind==='ecology'&&choice==='forage'?Object.fromEntries(Object.keys(n.offer.gain).map(id=>[id,3])):n.offer.gain;
  const label=choice==='leave'?'离开，结束这次机会':choice==='buy'?`支付 ${n.offer.coins} 金币 → ${encounterItemText(gain)}`:choice==='trade'?`${encounterItemText(n.offer.cost)} → ${encounterItemText(gain)}`:choice==='observe'?`安全采集 → ${encounterItemText(gain)}`:`消耗 1 生命 → ${encounterItemText(gain)}`;
  return `<button type="button" data-event="${choice}" ${quote.ok?'':'disabled'}><span>${label}</span>${quote.ok&&choice!=='leave'?`<small>完成后背包 ${quote.slots}/${f.capacity} 格</small>`:!quote.ok?`<small>${encounterEsc(quote.reason)}</small>`:''}</button>`;
 }).join('');
 return `<section class="field-event special-encounter" role="dialog" aria-modal="true" aria-labelledby="special-encounter-title"><strong id="special-encounter-title">${encounterEsc(details.title)}</strong><p>${encounterEsc(details.line)}</p><p class="encounter-wallet">金币 ${s.coins} · 野外背包 ${specialBagSlots(f.bag)}/${f.capacity} 格 · 生命 ${f.hp}</p><div class="encounter-actions">${actions}</div><small class="encounter-cargo">${n.kind==='merchant'?'货品先入野外包，回店才入库；晕倒会减损，已付金币不退。离开机会即结束。':'收获先入野外包，回店才入库；晕倒会减损。机会只能使用一次，离开即结束。'}</small><p class="encounter-hint">${encounterEsc(details.hint)}</p></section>`;
}
