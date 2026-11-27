// Formal production UI architecture. Gameplay, persistence and actions remain in app/engine.
export function ui2Scene(phase,hasField){return ['forecast','menu','prep','service','report','upgrade'].includes(phase)?'room':phase==='field'?(hasField?'field':'departure'):'research'}
export function ui2Mount(root,markup,phase,hasField){
 const t=document.createElement('template');t.innerHTML=markup.trim();const incoming=t.content.firstElementChild,newStage=incoming.querySelector('.stage'),scene=ui2Scene(phase,hasField);
 let shell=root.querySelector('.game-shell'),stage=shell?.querySelector('.stage'),room=stage?.querySelector(':scope > .ui2-room-host');
 if(!shell){shell=document.createElement('div');stage=document.createElement('main');shell.append(stage);root.replaceChildren(shell)}
 const oldScene=shell.dataset.ui2Scene;shell.className=incoming.className+' ui2-shell';shell.dataset.ui2Transition=String(!!oldScene&&oldScene!==scene);shell.dataset.ui2Scene=scene;shell.dataset.ui2Mode=phase;stage.className=newStage.className;
 // Keep the real room canvas AND its renderer parent connected across modes.
 const nextRoom=scene==='room'?newStage.querySelector('#diner-canvas')?.parentElement:null;
 if(nextRoom){
  if(!room){room=nextRoom;room.classList.add('ui2-room-host');stage.prepend(room)}
  else {
   const live=room.querySelector('#diner-canvas');
   for(const el of Array.from(room.children))if(el!==live&&el.tagName!=='CANVAS')el.remove();
   for(const el of Array.from(nextRoom.children))if(el.tagName!=='CANVAS')room.append(el);
   nextRoom.remove();
  }
 }else if(room){room.remove();room=null}
 const priorField=stage.querySelector('#forest-canvas'),nextField=newStage.querySelector('#forest-canvas');
 if(priorField&&nextField&&scene==='field')nextField.replaceWith(priorField);
 for(const el of Array.from(stage.children))if(el!==room)el.remove();
 stage.append(...Array.from(newStage.childNodes));
 // Header, overlay and dock may update; the world host and shell identity do not.
 for(const el of Array.from(shell.children))if(el!==stage)el.remove();
 for(const el of Array.from(incoming.childNodes)){if(el===newStage){incoming.removeChild(el);break}shell.insertBefore(el,stage)}
 shell.append(...Array.from(incoming.childNodes));
 for(const el of shell.children)el.inert=false;
 return shell;
}
export function ui2SlotGrid(sheet,selection){
 if(!sheet)return;const kind=sheet.dataset.sheetKind,body=sheet.querySelector('.sheet-body');if(!body)return;
 const schemas={
 stock:{container:'.stock-list[aria-label]',item:'.stock-line',art:'span',label:el=>el.querySelector('span')?.textContent,quantity:el=>el.querySelector('b')?.textContent},
 crew:{container:'.staff-roster',item:'.staff-person',art:'.v12d-staff-portrait',label:el=>el.querySelector('.staff-person-head b')?.textContent},
 book:{container:'.v063-book-list,.v102-guest-list',item:'.v063-book-entry,.v102-guest-card',art:'.z2b-dish-art,.z2c13-unknown,.v104-guest-portrait,.v104-guest-unknown',label:el=>el.querySelector('strong')?.textContent},
 menu:{container:'.book-list',item:'.v101-menu-option',art:'.z2b-dish-art',label:el=>el.querySelector('strong')?.textContent},
 'field-bag':{container:'.book-list',item:'[data-discard]',art:'.book-icon',label:el=>el.querySelector('strong')?.textContent}
 };
 const def=schemas[kind];if(!def)return;const list=body.querySelector(def.container);if(!list)return;
 const items=Array.from(list.querySelectorAll(def.item));if(!items.length)return;
 const key=kind+':'+(sheet.dataset.ui2Context||'');let selected=selection[key];if(!Number.isInteger(selected)||selected<0||selected>=items.length)selected=0;
 const grid=document.createElement('div');grid.className='ui2-slots '+(kind==='crew'?'ui2-crew-slots':'');grid.setAttribute('role','group');grid.setAttribute('aria-label','选择'+({stock:'食材',crew:'伙伴',book:'图鉴条目',menu:'料理','field-bag':'背包物品'}[kind]));
 items.forEach((item,i)=>{
  const btn=document.createElement('button');btn.type='button';btn.className='ui2-slot';btn.dataset.act='ui2-slot:'+key+':'+i;btn.setAttribute('aria-pressed',String(i===selected));
  const label=(def.label(item)||'未发现').trim();btn.setAttribute('aria-label',label);const art=item.querySelector(def.art);
  if(art){const copy=art.cloneNode(true);copy.removeAttribute('id');if(kind==='stock'){for(const n of Array.from(copy.childNodes))if(n.nodeType===3)n.remove()}btn.append(copy)}
  const title=document.createElement('small');title.textContent=label;btn.append(title);if(def.quantity){const qty=document.createElement('b');qty.textContent=def.quantity(item)||'';btn.append(qty)}
  grid.append(btn);item.hidden=i!==selected;item.classList.add('ui2-selected-detail');
 });
 list.classList.add('ui2-detail-list');for(const head of list.querySelectorAll('.z2b-menu-group'))head.hidden=true;
 list.before(grid);
}
