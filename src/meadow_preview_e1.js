import {stepActionField,useFieldSkill,resolveFieldEvent} from './field_v04.js?v=0.11.0-alpha.6';
import {drawField} from './scenes_v04.js?v=0.11.0-alpha.6';
import {joystickVector} from './controls_v041.js';
import {ING} from './data.js';
import {createMeadowPreview,setMeadowPreviewMode,meadowPreviewPose,prepareGPreview,prepareEcologyPreview} from './meadow_preview_state_e1.js?v=0.11.0-alpha.6';
const $=id=>document.getElementById(id),canvas=$('scene');
const params=new URLSearchParams(location.search);
let biome=params.get('zone')||'herb_path';
let seed=Number(params.get('seed'))||20261013,s=createMeadowPreview(seed,biome),maxHp=s.field.hp,paused=false,last=0,axis={x:0,y:0},pointer=null;
biome=s.field.biome.zoneId;
const keys=new Set();let selectedMode='hybrid-e1',weapon='WOK',hudKey='';
function clearInput(){axis={x:0,y:0};pointer=null;keys.clear();$('knob').style.transform='';}
function mode(name){if(!setMeadowPreviewMode(s,name))return;selectedMode=name;
 document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===name)));}
function pause(value){paused=value;clearInput();$('pause').textContent=paused?'继续':'暂停';$('pause').setAttribute('aria-label',paused?'继续试玩':'暂停试玩');last=0;}
function reset(nextSeed=seed){seed=nextSeed;clearInput();s=createMeadowPreview(seed,biome);maxHp=s.field.hp;s.field.weapon.type=weapon;mode(selectedMode);hudKey='';pause(false);$('camera').value='live';$('seed-label').textContent='种子 '+seed;updateHud();}
function updateHud(){
 const f=s.field,used=Object.values(f.bag).reduce((a,b)=>a+b,0),skill=Math.ceil(f.skillCd||0);
 const key=[f.hp,used,JSON.stringify(f.bag),skill,paused,f.finished,f.activeEvent,f.harvestNode,f.actionMessage,Math.floor(f.harvestProgress*10)].join('|');
 if(key===hudKey)return;hudKey=key;
 $('health').textContent='生命 '+f.hp+' / '+maxHp;
 $('bag-count').textContent='背包 '+(f.bagStacks?.length||0)+' / '+f.capacity;
 $('inventory').textContent=used?'本次收获 · '+Object.entries(f.bag).map(([id,n])=>ING[id].name+' ×'+n).join('  '):'本次收获 · 尚未采集（独立试玩，不写入存档）';
 $('skill').textContent=skill?'冷却 '+skill+' 秒':weapon==='POT'?'高压汤锅':'锅盖反击';
 $('skill').disabled=skill>0||paused||!!f.finished||!!f.activeEvent;
 $('notice').textContent=paused?'已暂停 · 切换画面保持同一地图与位置':f.harvestNode?'采集中 '+Math.min(100,Math.round(f.harvestProgress/.82*100))+'%':f.actionMessageTTL>0?f.actionMessage:'左下摇杆移动 · 靠近食材自动采集';
 const event=!!f.activeEvent,finished=!!f.finished;
 $('overlay').hidden=!event&&!finished;$('event-actions').hidden=!event;$('again').hidden=event;
 $('overlay-title').textContent=event?'流浪调味师':'本次试玩结束';
 $('overlay-note').textContent=event?'沿用原有奇遇：1 份蘑菇交换 1 份火椒，或直接离开。':'采集与战斗使用真实引擎。可以重置，继续检查画面与走位。';
}
$('biome').value=s.field.biome.zoneId;
$('biome').onchange=()=>{biome=$('biome').value;if(biome!=='herb_path')selectedMode='hybrid-e1';reset();syncModeOptions();};
function syncModeOptions(){document.querySelectorAll('[data-mode]').forEach(b=>{b.disabled=biome!=='herb_path'&&['pixel','hybrid-e0'].includes(b.dataset.mode);});}
syncModeOptions();
$('pause').onclick=()=>pause(!paused);$('reset').onclick=()=>reset();$('again').onclick=()=>reset();$('seed').onclick=()=>reset(seed+137);
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{pause(true);mode(b.dataset.mode);hudKey='';updateHud();drawField(canvas,s,s.field.elapsed||4.3);});
document.querySelectorAll('[data-weapon]').forEach(b=>b.onclick=()=>{weapon=b.dataset.weapon;s.field.weapon.type=weapon;
 document.querySelectorAll('[data-weapon]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.weapon===weapon)));hudKey='';updateHud();});
$('skill').onclick=()=>{if(!paused)useFieldSkill(s);};
document.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{resolveFieldEvent(s,b.dataset.choice);clearInput();hudKey='';updateHud();});
$('camera').onchange=()=>{const name=$('camera').value;if(name==='live'){pause(false);return;}
 pause(true);if(['encounter','encounter_risk'].includes(name))prepareEcologyPreview(s,name==='encounter_risk');else if(!prepareGPreview(s,name))s.field.pos={...meadowPreviewPose(s,name)};s.field.x=s.field.pos.x;s.field.y=s.field.pos.y;s.field.moving=false;drawField(canvas,s,4.3);};
const joy=$('joystick');
joy.addEventListener('pointerdown',e=>{if(pointer!==null||paused)return;pointer=e.pointerId;joy.setPointerCapture(pointer);move(e);e.preventDefault();});
function move(e){if(e.pointerId!==pointer)return;const r=joy.getBoundingClientRect();
 axis=joystickVector(r.left+r.width/2,r.top+r.height/2,e.clientX,e.clientY,36,5);
 $('knob').style.transform=`translate(${axis.knobX}px,${axis.knobY}px)`;}
joy.addEventListener('pointermove',move);
for(const name of ['pointerup','pointercancel','lostpointercapture'])joy.addEventListener(name,e=>{if(e.pointerId===pointer)clearInput();});
window.addEventListener('keydown',e=>{if(e.target.matches('select,input,textarea')||(e.target.matches('button')&&e.key===' '))return;
 const key=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d',' '].includes(key)){e.preventDefault();keys.add(key);if(key===' '&&!e.repeat&&!paused)useFieldSkill(s);}});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>pause(true));document.addEventListener('visibilitychange',()=>{if(document.hidden)pause(true);});
function frame(now){const dt=last?Math.min(.06,(now-last)/1000):0;last=now;
 if(!paused&&!document.hidden){const x=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0),y=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0);
  stepActionField(s,x||axis.x,y||axis.y,dt);}
 drawField(canvas,s,s.field.elapsed||4.3);updateHud();
 window.__oddpotPreview={view:params.get('view')||'live',mode:selectedMode,seed,worldVersion:s.field.worldVersion,style:s.field.biome.zoneId,rendered:true,paused,pos:{...s.field.pos},hp:s.field.hp,boss:s.field.enemies.find(e=>e.isBoss)?.kind,encounterVersion:s.field.encounterVersion,enemies:s.field.enemies.filter(e=>e.hp>0).map(e=>({id:e.id,kind:e.kind,x:e.x,y:e.y,engaged:!!e.engaged,warning:e.warning||0}))};
 requestAnimationFrame(frame);
}
const view=params.get('view');mode(params.get('mode')||(view==='pixel'?'pixel':view==='original'?'legacy':'hybrid-e1'));
if(view){if(['encounter','encounter_risk'].includes(view))prepareEcologyPreview(s,view==='encounter_risk');else if(!prepareGPreview(s,view))s.field.pos={...meadowPreviewPose(s,view)};pause(true);}
updateHud();requestAnimationFrame(frame);
