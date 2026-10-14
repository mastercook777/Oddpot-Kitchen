let jsdom;try{jsdom=require('jsdom');}catch{jsdom=require(process.env.ODDPOT_QA_NODE_MODULES+'/jsdom');}
const {JSDOM}=jsdom;
let canvasRuntime;try{canvasRuntime=require('@napi-rs/canvas');}catch{canvasRuntime=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas');}
const {createCanvas}=canvasRuntime;
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=require('node:path').resolve(__dirname,'..');
const html=fs.readFileSync(root+'/standalone.html','utf8');
const dom=new JSDOM(html,{url:'https://oddpot.test/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,queue=[];w.requestAnimationFrame=cb=>(queue.push(cb),queue.length);w.setInterval=()=>0;w.setTimeout=()=>0;
w.HTMLElement.prototype.setPointerCapture=()=>{};w.HTMLElement.prototype.releasePointerCapture=()=>{};
w.HTMLElement.prototype.hasPointerCapture=()=>true;
w.HTMLCanvasElement.prototype.getBoundingClientRect=function(){return {x:0,y:0,left:0,top:0,width:390,height:450,right:390,bottom:450};};
w.HTMLCanvasElement.prototype.getContext=function(){
 if(!this._canvas||this._canvas.width!==this.width||this._canvas.height!==this.height){
  this._canvas=createCanvas(this.width||1,this.height||1);const c=this._canvas.getContext('2d'),draw=c.drawImage;
  c.drawImage=function(image,...rest){return draw.call(c,image._canvas||image,...rest);};
 }
 return this._canvas.getContext('2d');
};
w.HTMLCanvasElement.prototype.toDataURL=function(){this.getContext();return this._canvas.toDataURL();};
const ctx=dom.getInternalVMContext();new vm.Script(html.match(/<script>([\s\S]*)<\/script>/)[1]).runInContext(ctx);
const run=code=>new vm.Script(code).runInContext(ctx);
assert.match(w.document.querySelector('#app').textContent,/出门取材/);
w.document.querySelector('[data-act="to-field"]').click();w.document.querySelector('[data-route="safe"]').click();
assert.ok(run('game.field.action'));assert.ok(w.document.querySelector('.field-skill'));
run("game.field.enemies=[];game.field.obstacles=[];game.field.hazards=[];game.field.nodes=[];game.field.pos={x:6,y:9};game.field.weapon.type='WOK';game.field.attackCd=999;game.field.skillCd=0;game.field.enemies.push({id:'qa',kind:'boar',x:6.9,y:9,hp:4,maxHp:4,cooldown:999});render()");
const pointer=(target,type,id,x,y)=>{const e=new w.Event(type,{bubbles:true,cancelable:true});Object.assign(e,{pointerId:id,clientX:x,clientY:y,button:0,pointerType:'touch'});target.dispatchEvent(e);};
// Formal multi-touch handlers: first pointer keeps stick ownership while second casts.
const scene=w.document.querySelector('.forest-scene');pointer(scene,'pointerdown',1,80,350);pointer(scene,'pointermove',1,110,350);
const owner=run('stick.pointer');
pointer(w.document.querySelector('.field-skill'),'pointerdown',2,330,380);
assert.equal(run('game.field.enemies[0].hp'),2);assert.equal(run('game.field.skillCd'),6.5);assert.equal(run('stick.pointer'),owner);
assert.equal(run('game.field.impactFx.length'),1);
let ms=100;for(let i=0;i<16;i++){const frame=queue.shift();if(frame)frame(ms+=16);}
assert.ok(run('game.field.enemies[0].x')>6.9);assert.ok(run('game.field.pos.x')>6);
pointer(scene,'pointerup',1,110,350);
assert.equal(run('stick.pointer'),null);
run("save(game)");assert.ok(w.localStorage.getItem('oddpot-prototype-v04'));
console.log('Offline boot → formal route → real skill pointer handler, retained joystick ownership, recoil, release and save passed (jsdom/native Canvas; no browser layout claim).');
dom.window.close();
