import {VARIANTS,paintChefV3} from './src/chef_v3_lab.js?v=x3';
const cards=document.querySelector('#variants'),views=[];
for(const [kind,v] of Object.entries(VARIANTS)){
 const el=document.createElement('article');el.innerHTML='<div class="stage"><canvas aria-label="V3-'+kind+' 像素角色"></canvas></div><h2>V3-'+kind+' · '+v.name+'</h2><p>'+v.note+'</p><a href="./visual-lab.html?v=x3&character='+kind+'">进入餐厅走动 ↗</a>';cards.append(el);views.push({kind,canvas:el.querySelector('canvas')});
}
const s={direction:'front',action:'idle',paused:matchMedia('(prefers-reduced-motion: reduce)').matches,frame:0,zoom:3};
const pause=document.querySelector('#pause'),label=document.querySelector('#frame');let stamp=0;
function count(){return s.action==='walk'?6:4}
function paint(){for(const {kind,canvas} of views){const w=32*s.zoom,h=44*s.zoom;if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}const c=canvas.getContext('2d');c.clearRect(0,0,w,h);c.fillStyle='#171d1b66';c.beginPath();c.ellipse(w/2,h-s.zoom*1.1,10*s.zoom,1.7*s.zoom,0,0,Math.PI*2);c.fill();paintChefV3(c,kind,s.direction,s.action,s.frame,w/2,h-s.zoom,s.zoom);}label.textContent=(s.frame+1)+' / '+count();}
function togglePause(p){s.paused=p;pause.textContent=p?'播放':'暂停';pause.setAttribute('aria-pressed',String(p));}
togglePause(s.paused);
for(const [attr,prop] of [['dir','direction'],['action','action']])document.querySelectorAll('[data-'+attr+']').forEach(b=>b.addEventListener('click',()=>{s[prop]=b.dataset[attr];s.frame=0;stamp=0;document.querySelectorAll('[data-'+attr+']').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));paint();}));
pause.addEventListener('click',()=>togglePause(!s.paused));document.querySelector('#step').addEventListener('click',()=>{togglePause(true);s.frame=(s.frame+1)%count();paint()});document.querySelector('#zoom').addEventListener('change',e=>{s.zoom=+e.target.value;paint()});
function tick(t){if(!s.paused&&t-stamp>(s.action==='walk'?115:475)){stamp=t;s.frame=(s.frame+1)%count();paint()}requestAnimationFrame(tick)}paint();requestAnimationFrame(tick);