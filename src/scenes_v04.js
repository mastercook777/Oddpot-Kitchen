import {a21AtlasReady,a21Sprite,a21Tile} from './hearth_assets_v016a21.js?v=0.16-a21';
import {fieldHitPose,fieldAttackPose} from './field_hit_response_v011h.js?v=0.12.0-alpha.1';
import {drawFieldHitEffects} from './field_effects_v011e2.js?v=0.12.0-alpha.1';
import {drawEcologyWarning} from './field_ecology_v011b2.js';
import {drawPixelMiniBoss,drawMiniBossWarning,drawBossZones} from './field_bosses_v011g.js';
import {isHybridFieldArt,drawHybridFieldGround,drawHybridFieldObstacle,drawHybridFieldHazard,drawHybridFieldAtmosphere} from './field_hybrid_biomes_v011f.js?v=0.12.0-alpha.1';
import {drawFieldImpact,drawFieldProjectile,drawFieldSwipe,drawFieldSkillWave,drawFieldBurst,drawFieldCollection,drawFieldDeath,drawFieldActorIndicators,drawFieldNodeMarkers} from './field_effects_v011e2.js?v=0.12.0-alpha.1';
import {fieldWokPose,fieldPotPose} from './field_pose_v083.js?v=0.8.5';
import {drawPixelWok,drawPixelPot,drawPixelFork,drawForkThrustFx,drawForkFlameFx} from './field_cookware_v014c.js?v=0.14.0-alpha.5';
import {drawPixelSteamBasket,drawSteamMistField,drawSteamPulse} from './field_steam_visuals_v015e.js?v=0.15.0-alpha.7';
import {drawCloudPortProps,drawCloudCrystalTable,drawCloudSteamerStation} from './cloud_diner_assets_v015e.js?v=0.15.0-alpha.7';
import {hazardPhase,fieldTilePath} from './field_rules_v011a.js';
import {fieldCamera} from './field_camera_v011b1.js';
import {drawExpandedLandscape,drawExpandedObstacle} from './field_world_render_v011b1.js';
import {isHerbPixelSlice,drawHerbPixelGround,drawHerbPixelObstacle,drawHerbPixelNode,drawHerbPixelHazard,drawHerbPixelEnemy,drawHerbPixelProjectile} from './field_pixel_herb_v011c.js?v=0.13.0-alpha.9';
import {isHybridMeadow,drawHybridMeadowGround,drawHybridMeadowObstacle,drawHybridMeadowHazard} from './field_hybrid_meadow_v011e.js?v=0.12.0-alpha.1';
import {meleeProfile,meleeWindupProgress} from './field_combat_feedback_v084.js?v=0.8.4';
import {pixelActor,pixelEnemy,pixelImpact} from './pixels_v041.js?v=0.15.0-alpha.7';
import {homeKitchenActors,homeKitchenChatter} from './home_kitchen_v013j.js?v=0.15.0-alpha.7';
// Lightweight procedural game graphics: original Canvas shapes, no art pack.
import {ING,RECIPES,CUSTOMERS} from './data.js?v=0.14.0-alpha.5';
import {heroZone,waiterDeliveryPose,HERO_PASS} from './walkable_restaurant_v07.js?v=y4d';
import {DINER_FLOOR,dinerFloor,dinerGuestRoute,dinerWeather,dinerQueueGuests} from './restaurant_scene_v075.js?v=y4d';
import {selectDiningSpeech,selectStaffSpeech,diningBubbleLines,speechOpacity} from './diner_ambience_v077.js?v=0.15.0-alpha.3';
import {selectOutdoorQueueSpeech} from './outdoor_queue_speech_v012f.js';
const color={ink:'#24382a',leaf:'#386b43',soil:'#806044',stone:'#a6b392',cream:'#f4dfb0',gold:'#dfb873'};
function rect(c,x,y,w,h,fill){c.fillStyle=fill;c.fillRect(x,y,w,h)}
function circle(c,x,y,r,fill){c.fillStyle=fill;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill()}
function line(c,x1,y1,x2,y2,stroke,width=1){c.strokeStyle=stroke;c.lineWidth=width;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke()}
function text(c,string,x,y,fill='#fff1d0',size=12,align='center'){c.textAlign=align;c.textBaseline='middle';c.fillStyle=fill;c.font=`bold ${size}px system-ui`;c.fillText(string,x,y)}
function capsule(c,x,y,w,h,fill,stroke){c.beginPath();c.roundRect(x,y,w,h,h/2);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.stroke()}}
export function setCanvas(canvas){if(!canvas)return null;const {width,height}=canvas.getBoundingClientRect();if(width<10||height<10)return null;const dpr=Math.min(window.devicePixelRatio||1,2);const W=Math.floor(width*dpr),H=Math.floor(height*dpr);if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H}const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.imageSmoothingEnabled=false;c.clearRect(0,0,width,height);return {c,w:width,h:height};}
function tree(c,x,y,t=0){rect(c,x-4,y+2,8,16,'#6d4930');circle(c,x,y-8,16,'#214d34');circle(c,x-6,y-12,12,'#3e7850');circle(c,x+7,y-13,10,'#4e8a50');circle(c,x-6,y-16,2,'#92b66d')}
function chef(c,x,y,t=0,options={}){
 pixelActor(c,'chef',x,y,options.scale||1.7,{face:options.face||1,walk:options.walk?t:0,attack:options.attack||false,hurt:options.hurt||0});
}
function monster(c,e,t){
 const x=e.x,y=e.y;
 const melee=meleeProfile(e.kind),charging=!!melee&&e.warning>0;
 if(e.hp>0||e.deathFx>0){c.save();if(e.hp<=0)c.globalAlpha=Math.min(1,(e.deathFx||0)/.27);if(e.isBoss){
  circle(c,x,y+5,27,'#352d2a88');
  circle(c,x,y-4,22,e.kind==='boss_spore'?'#9870af':'#e46c3c');
  circle(c,x,y-5,15,e.kind==='boss_spore'?'#d2b0da':'#ffc26d');
  for(const a of [-1,0,1])circle(c,x+a*12,y-13,4,e.kind==='boss_spore'?'#ede5ff':'#ffebae');
  circle(c,x-8,y-2,3,'#222e29');circle(c,x+8,y-2,3,'#222e29');
  line(c,x-9,y+12,x+9,y+12,'#382d30',3);
 }else {
  c.save();
  if(charging){
   const windup=meleeWindupProgress(e);
   // Visible crouch/pullback over the full warning, followed by sharp strike.
   c.translate(0,1.6*windup);
   c.scale(1+windup*.12,1-windup*.09);
  }
  pixelEnemy(c,e.kind,x,y,1.8,{face:e.face||1,walk:charging?0:t,hurt:e.hurtFx||0});
  c.restore();
 }c.restore();}
 if(e.warning>0){circle(c,x,y,(e.isBoss?30:19)+Math.sin(t*14)*3,charging?'#f8866266':'#e9c26445');text(c,charging?'⚠':'!',x,y-29,charging?'#ffe3b8':'#ffdf83',16)}
 if(e.hp>0){capsule(c,x-12,y-27,24,4,'#28352f');capsule(c,x-12,y-27,24*e.hp/e.maxHp,4,'#e3b65d')}
}
function plant(c,n,t){const x=n.x,y=n.y;if(n.claimed)return;
 c.fillStyle='#203b3188';c.beginPath();c.ellipse(x,y+9,12,4,0,0,Math.PI*2);c.fill();
 if(n.id==='mushroom_heart'){circle(c,x,y-5,9,'#bb89e8');circle(c,x,y-10,5,'#f9dcff');text(c,'★',x,y,'#fff6df',11)}
 else if(n.id==='ember_pepper'){circle(c,x,y,10,'#db653e');circle(c,x,y-6,5,'#ffe6a1');text(c,'★',x,y,'#fff6df',11)}
 else if(n.id==='mushroom'){rect(c,x-2,y-2,4,13,'#e8d3ad');circle(c,x,y-4,9,'#a75f56');circle(c,x-3,y-6,2,'#f7e4b7')}
 else if(n.id==='chili'){line(c,x-2,y+8,x+3,y-8,'#d85e37',7);line(c,x+3,y-8,x+7,y-11,'#376b38',3)}
 else if(n.id==='beef'||n.id==='chicken'){circle(c,x,y,9,'#b36656');circle(c,x-2,y-1,5,'#d99171')}
 else {circle(c,x-4,y,6,'#6c9862');circle(c,x+4,y-3,5,'#c3ba68');rect(c,x-1,y+1,3,9,'#6f553e')}
 if(n.key==='target'){c.strokeStyle='#ffe09c';c.lineWidth=2;c.beginPath();c.ellipse(x,y+8,16+Math.sin(t*3),6,0,0,Math.PI*2);c.stroke()}
}
// Landmark painting is expressed in actual 9x11 world coordinates.
// It stays below combatants and pickups, and is purely presentational.
function drawBiomeLandscape(c,f,time){
 const bio=f.biome||{},style=bio.style|| (f.region==='spring'?'spring':'meadow');
 const floor=bio.floor|| (f.region==='spring'?'#a38a66':'#51764e');
 const grain=bio.grain||'#6f8d65',accent=bio.accent||'#f3db9b';
 const ellipse=(x,y,rx,ry,fill,stroke=null,sw=.05)=>{
  c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=fill;c.fill();
  if(stroke){c.strokeStyle=stroke;c.lineWidth=sw;c.stroke();}
 };
 const ribbon=(pts,col,width)=>{
  c.beginPath();c.moveTo(pts[0][0],pts[0][1]);
  for(const p of pts.slice(1))c.lineTo(p[0],p[1]);
  c.strokeStyle=col;c.lineWidth=width;c.lineJoin='round';c.lineCap='round';c.stroke();
 };
 const dot=(x,y,color,r=.075)=>ellipse(x,y,r,r,color);
 c.fillStyle=floor;c.fillRect(0,0,f.worldW,f.worldH);
 c.save();c.globalAlpha=.21;
 for(let i=0;i<47;i++){
  const x=.2+((i*47+11)%89)/10,y=.2+((i*29+3)%106)/10;
  ellipse(x,y,.14+(i%3)*.055,.07,grain);
 }
 c.restore();
 const mirror=fn=>{if(bio.flipped){c.save();c.translate(9,0);c.scale(-1,1);fn();c.restore()}else fn()};
 if(style==='meadow'){
  ribbon([[3.8,11],[4.5,8.3],[3.7,5.8],[4.3,3.4],[3.6,0]],'#a5a177',1.45);
  ribbon([[3.8,11],[4.5,8.3],[3.7,5.8],[4.3,3.4],[3.6,0]],'#cec49a',.86);
  for(let i=0;i<32;i++){const x=((i*29+6)%86)/10+.1,y=((i*23+13)%106)/10+.2;
   if(Math.abs(x-(4.1+Math.sin(y*1.3)*.5))>.8){
    dot(x,y,i%3===0?'#f0e3ae':i%3===1?'#d6b0a3':'#a9d99b',.06);
    dot(x-.09,y+.09,'#466747',.075);
   }}
 }else if(style==='glow'){
  mirror(()=>{
   ellipse(2.2,4.2,2.65,2.8,'#193d50','#477983',.20);
   ellipse(1.9,4,2.35,2.25,'#245568','#79d9d0',.13);
   for(let i=0;i<12;i++){
    const x=.65+((i*17)%38)/10,y=2.0+((i*21)%46)/10;
    c.save();c.shadowBlur=14;c.shadowColor='#a7ffe5';
    ellipse(x,y,.20+(i%3)*.09,.16+(i%3)*.04,'#9ff0d5');
    c.restore();dot(x,y-.18,'#f1ffcb',.06);
   }
   ribbon([[7.7,11],[6.4,8.1],[5.6,5.7],[5.2,3],[6,0]],'#547c76',1.03);
   ribbon([[7.7,11],[6.4,8.1],[5.6,5.7],[5.2,3],[6,0]],'#88a78d',.55);
  });
 }else if(style==='roots'){
  mirror(()=>{
   ellipse(1.9,2.2,2,2.15,'#1d292f','#806574',.35);
   ellipse(2,2.5,1.45,1.54,'#49383b','#ab8292',.25);
   ellipse(2.0,2.45,.95,1.15,'#201f2a');
   for(const pts of [
    [[1.7,3],[1.6,4.6],[.7,6.7],[.15,8.8]],
    [[2.3,3.2],[3.3,5],[3.9,7.7],[5.6,10]],
    [[3,2.7],[4.5,3.7],[6.7,4.4],[8.7,5.8]]]){
    ribbon(pts,'#332832',.56);ribbon(pts,'#81606b',.29);
   }
   for(let i=0;i<10;i++){const x=((i*17)%72)/10+.65,y=((i*13)%78)/10+1;
    dot(x,y,'#c598df',.15);dot(x-.07,y-.12,'#f0d7ee',.06);}
  });
 }else if(style==='garden'){
  ribbon([[4.5,0],[4,3],[5,5],[4,8],[4.8,11]],'#c8b48b',.95);
  for(let r=0;r<3;r++)for(let k=0;k<3;k++){
   const x=.3+k*1.18+(r%2)*.18,y=2.6+r*2.35;
   c.save();c.translate(x,y);c.rotate(-.07);
   c.fillStyle=(r+k)%2?'#4f7552':'#667e50';c.fillRect(0,0,.92,1.68);
   for(let n=0;n<5;n++)dot(.14+n*.13,.28+n*.23,n%2?'#a5cb77':'#d9b27b',.075);
   c.restore();
  }
 }else if(style==='spring'){
  for(const [x,y,rx] of [[6,3.1,1.95],[3.1,5.4,1.33],[7,8.5,1.06]]){
   ellipse(x,y,rx,rx*.78,'#d6be99','#8f806b',.22);
   ellipse(x,y,rx*.82,rx*.63,'#6eada7','#d2f8e5',.16);
   ellipse(x+.15,y-.12,rx*.6,rx*.39,'#80c1b3');
   for(let i=0;i<3;i++)dot(x-.35+i*.24,y+.15,'#c8e9d8',.09);
  }
  ribbon([[0,2],[1.9,2.8],[4,2],[8.8,1]],'#9d8b6f',.55);
 }else if(style==='steam'){
  mirror(()=>{
   ribbon([[1,0],[2.5,2.6],[3.6,4.3],[5.4,6.8],[8.4,11]],'#2d464b',1.15);
   ribbon([[1,0],[2.5,2.6],[3.6,4.3],[5.4,6.8],[8.4,11]],'#779b9a',.63);
   ribbon([[1,0],[2.5,2.6],[3.6,4.3],[5.4,6.8],[8.4,11]],'#b6c7ba',.25);
   for(const [x,y] of [[2,2],[5.6,3.2],[7.2,7],[1.9,8.6]]){
    ellipse(x,y,1.1,.58,'#9bada8','#566e72',.17);
    for(let i=0;i<3;i++){
     c.save();c.globalAlpha=.19+Math.sin(time*2+i)*.055;
     ellipse(x+.12*i-.2,y-.40-.13*i,.18+i*.12,.45,'#f1f4df');c.restore();
    }
   }
  });
 }else if(style==='ember'){
  mirror(()=>{
   ribbon([[0,1],[2.2,2.2],[2.6,4.8],[4.8,5.7],[5.3,8.5],[7.6,11]],'#241f2a',1.2);
   ribbon([[0,1],[2.2,2.2],[2.6,4.8],[4.8,5.7],[5.3,8.5],[7.6,11]],'#bb4c32',.77);
   ribbon([[0,1],[2.2,2.2],[2.6,4.8],[4.8,5.7],[5.3,8.5],[7.6,11]],'#ef9b48',.34);
   for(let i=0;i<20;i++){
    const x=((i*33)%86)/10+.15,y=((i*41)%105)/10+.25;
    ellipse(x,y,.13+(i%3)*.08,.09,i%2?'#8b5c46':'#2e3038');
    if(i%4===0)dot(x+.06,y-.03,'#efb668',.065);
   }
  });
 }else if(style==='oasis'){
  for(const [x,y,r] of [[2.4,3.4,2.4],[6.5,6.4,2.3],[3,8.5,1.4]]){
   ellipse(x,y,r,r*.75,'#e6cfb4','#998d79',.16);
   ellipse(x,y,r*.85,r*.64,'#75ada7','#c0e9dd',.17);
   ellipse(x,y,r*.65,r*.49,'#a0ded1');
  }
  ribbon([[.1,5],[3.7,5],[5.1,4],[8.8,3.3]],'#c5a980',.8);
 }
}
// A stationary, aim-locked fan appears BEFORE melee strikes. It communicates
// both remaining wind-up and the direction the player can dodge out of.
function drawMeleeWarnings(c,f){
 for(const e of f.enemies||[]){
  const p=meleeProfile(e.kind);if(!p||e.hp<=0||e.ecologyAttack)continue;
  const fx=e.strikeFx,charging=e.warning>0;
  if(!charging&&!(fx?.ttl>0))continue;
  if(charging){
   const origin=e.attackOrigin||e,aim=e.aim||f.pos;
   const a=Math.atan2(aim.y-origin.y,aim.x-origin.x);
   const progress=meleeWindupProgress(e),spread=p.arcDeg*Math.PI/360;
   c.save();c.translate(e.x,e.y);c.rotate(a);
   c.beginPath();c.moveTo(0,0);c.arc(0,0,p.reach,-spread,spread);c.closePath();
   c.fillStyle=`rgba(245,87,54,${(.14+progress*.29).toFixed(3)})`;c.fill();
   c.strokeStyle=progress>.7?'#ffe29b':'#fa9372';c.lineWidth=.060+progress*.022;c.stroke();
   c.beginPath();c.arc(0,0,.45,-Math.PI/2,-Math.PI/2+progress*Math.PI*2);
   c.strokeStyle='#fff3aa';c.lineWidth=.08;c.stroke();
   c.restore();
  }
  if(fx?.ttl>0){
   const a=Math.atan2(fx.dy,fx.dx),alpha=Math.min(1,fx.ttl/.18);
   c.save();c.translate(fx.x,fx.y);c.rotate(a);c.globalAlpha=alpha;
   c.beginPath();c.arc(0,0,p.reach*.90,-.55,.55);
   c.strokeStyle='#fff0c4';c.lineWidth=.17;c.stroke();
   c.beginPath();c.arc(0,0,p.reach,-.60,.60);
   c.strokeStyle=p.accent;c.lineWidth=.07;c.stroke();c.restore();
  }
 }
}
export function drawField(canvas,s,clock){const size=setCanvas(canvas);if(!size||!s.field?.action)return;const {c,w,h}=size,f=s.field;const springs=f.region==='spring';const camera=fieldCamera(f,w,h),sc=camera.scale,left=camera.offsetX,top=camera.offsetY;
 const jolt=(f.combatJolt||0)/.09;
 const shake=(f.hitShake||0)/.24,shakeX=(shake?Math.sin(f.elapsed*151)*4*shake:0)+Math.sin(f.elapsed*137)*1.6*jolt;
 const shakeY=(shake?Math.cos(f.elapsed*117)*2.4*shake:0)+Math.cos(f.elapsed*103)*.8*jolt;
 const y3=globalThis.__oddpotY3Renderer;
 const three=!!y3?.draw(canvas,s,clock,w,h,camera,shakeX,shakeY);
 if(!three){c.fillStyle=isHybridMeadow(f)?'#75896f':isHerbPixelSlice(f)?'#485e4c':springs?'#9c674c':'#305a40';c.fillRect(0,0,w,h);}
 c.save();c.translate(left+shakeX,top+shakeY);c.scale(sc,sc);
 const herbPixelArt=isHerbPixelSlice(f),herbHybridArt=isHybridMeadow(f),fieldHybridArt=isHybridFieldArt(f),fieldSpriteArt=herbPixelArt||fieldHybridArt,smoothFx=!['pixel','legacy'].includes(f.artPreviewMode);
 if(!three){if(herbHybridArt)drawHybridMeadowGround(c,f);
 else if(fieldHybridArt)drawHybridFieldGround(c,f);
 else if(herbPixelArt)drawHerbPixelGround(c,f);
 else if(camera.expanded)drawExpandedLandscape(c,f,clock);else drawBiomeLandscape(c,f,clock);}
 // Mist is a real world-space persistent control area, behind actors.
 if(!three&&f.steamMist?.ttl>0)drawSteamMistField(c,f,clock);
 // This faint route follows the REAL passable cells; artwork never fakes a blocked path.
 const goal=f.nodes.find(n=>n.key==='target'&&!n.claimed);
 if(goal&&!fieldSpriteArt){const trail=fieldTilePath(f,f.spawn||f.pos,goal,{avoidHazards:true});
  if(trail.length>1){c.save();c.beginPath();c.moveTo(trail[0].x,trail[0].y);
   for(const pt of trail.slice(1))c.lineTo(pt.x,pt.y);
   c.strokeStyle='#f2e6b082';c.lineWidth=.11;c.setLineDash([.12,.23]);c.stroke();c.restore();}}

 if(f.hazards?.length)for(const hz of f.hazards){
   const p=hazardPhase(hz,f.elapsed,f.biome),x=hz.x+.5,y=hz.y+.5;
   if(herbHybridArt){drawHybridMeadowHazard(c,hz,p,clock);continue;}
   if(fieldHybridArt){drawHybridFieldHazard(c,hz,p,f.biome.style,clock);continue;}
   if(herbPixelArt){drawHerbPixelHazard(c,hz,p,clock);continue;}
   const roots=f.biome?.style==='roots',ember=f.biome?.style==='ember';
   c.save();c.translate(x,y);
   // Jagged fracture: dangerous even at rest, unlike raised edible pickup sprites.
   c.beginPath();for(let i=0;i<12;i++){
    const theta=i*Math.PI/6,r=i%2===0?.43:.25;
    if(i===0)c.moveTo(Math.cos(theta)*r,Math.sin(theta)*r);
    else c.lineTo(Math.cos(theta)*r,Math.sin(theta)*r);
   }
   c.closePath();c.fillStyle=roots?'#34283c':ember?'#492c30':'#455861';c.fill();
   c.strokeStyle=roots?'#ddb5e9':ember?'#e49c67':'#e1dbc1';c.lineWidth=.07;c.stroke();
   for(const theta of [-.8,.6,2.45])line(c,Math.cos(theta)*.05,Math.sin(theta)*.05,Math.cos(theta)*.34,Math.sin(theta)*.34,'#efc797',.04);
   if(p.warning||p.active){
    c.beginPath();c.arc(0,0,p.radius,0,Math.PI*2);
    c.strokeStyle='#fff0b4';c.lineWidth=.08;
    if(p.warning)c.setLineDash([.16,.10]);c.stroke();c.setLineDash([]);
    c.fillStyle=p.active?'#ff6d4266':'#ffc66a44';c.fill();
    if(p.active){for(const dx of [-.18,0,.18])line(c,dx,.05,dx+.05,-.38-Math.sin(f.elapsed*13+dx)*.08,'#ffe5b1',.08);}
    else text(c,'!',0,-.09,'#fff8d6',.29);
   }
   c.restore();
  }
  if(!three)for(const [i,o] of f.obstacles.entries()){if(fieldSpriteArt){if(o.y+.5<=f.pos.y){if(herbHybridArt){if(!f.artPreviewMode)a20HerbObstacle(c,o,i);else drawHybridMeadowObstacle(c,o,i);}else if(fieldHybridArt)drawHybridFieldObstacle(c,o,f.biome.style,i);else drawHerbPixelObstacle(c,o,i);}continue;}if(camera.expanded){drawExpandedObstacle(c,o,f.biome?.style,clock);continue;}c.save();c.translate(o.x+.5,o.y+.5);c.scale(1/sc,1/sc);if(f.biome?.style==='glow'){
  circle(c,0,4,14,'#263d48');circle(c,0,-6,17,'#6ebaaa');circle(c,-7,-9,8,'#c5e8d1');
 }else if(f.biome?.style==='roots'){
  circle(c,0,5,17,'#242430');circle(c,0,-5,19,'#75505f');
  circle(c,-6,-8,9,'#aa7589');
 }else if(f.biome?.style==='ember'){
  circle(c,0,5,16,'#292a30');circle(c,-4,-6,14,'#443d42');
  line(c,-5,-10,1,4,'#df7546',4);
 }else if(springs){circle(c,0,3,15,'#8c5940');circle(c,-5,-4,14,'#625d59');circle(c,5,-6,9,'#817875');rect(c,-4,-18,8,3,'#be9a78')}
 else tree(c,0,0);c.restore()}
 if(!three)for(const n of f.nodes){if(n.claimed)continue;
   if(n.type==='event'&&n.offer){drawHerbPixelNode(c,n,clock,false,sc);continue;}
   if(fieldSpriteArt){if(smoothFx)drawHerbPixelNode(c,n,clock,false,sc);else drawHerbPixelNode(c,n,clock);continue;}
   if(n.type==='event'){
    // Small traveling cook with a pack: clearly an NPC, not a glowing dot.
    c.save();c.translate(n.x,n.y);c.scale(1/sc,1/sc);
    rect(c,-12,-4,8,17,'#99784f');rect(c,-7,-3,16,16,'#54756e');
    circle(c,1,-12,10,'#dfb58d');rect(c,-12,-22,24,7,'#6f4b39');
    rect(c,-5,-27,13,8,'#92724f');rect(c,-5,10,5,5,'#4b382d');rect(c,5,10,5,5,'#4b382d');
    text(c,'?',13,-28,'#ffe9b1',12);c.restore();
   }else{c.save();c.translate(n.x,n.y);c.scale(1/sc,1/sc);plant(c,{...n,x:0,y:0},clock);c.restore();}
  }
  if(!three)drawHybridFieldAtmosphere(c,f,clock);
  if(!three)for(const p of f.projectiles||[]){if(smoothFx)drawFieldProjectile(c,p);else if(herbPixelArt)drawHerbPixelProjectile(c,p);else {circle(c,p.x,p.y,.12,'#ef9c4e');circle(c,p.x,p.y,.05,'#ffe5a3')}}
 if(!three)for(const p of f.playerProjectiles||[]){
  const arc=Math.sin(Math.PI*Math.min(1,p.time/p.duration))*.37;
  if(smoothFx){drawFieldProjectile(c,p,'player');continue;}
  if(herbPixelArt){drawHerbPixelProjectile(c,{x:p.x,y:p.y-arc},'player');continue;}
  circle(c,p.x,p.y,.18,'#eac69b');circle(c,p.x,p.y-arc,.16,'#c68c55');
  circle(c,p.x-.045,p.y-arc-.04,.04,'#fff0ca');
  line(c,p.x,p.y-arc-.17,p.x+.08,p.y-arc-.22,'#7ca26a',.06);
 }
 drawMeleeWarnings(c,f);
 for(const e of f.enemies||[])drawEcologyWarning(c,e);
 for(const e of f.enemies||[])if(e.isBoss)drawMiniBossWarning(c,e);
 drawBossZones(c,f);
 for(const e of f.enemies||[]){
  if(e.hp<=0&&!(e.deathFx>0))continue;
  if(three){drawFieldActorIndicators(c,e,sc);continue;}
  const pose=fieldHitPose(e),actor=e.hitResponse?{...e,hurtFx:0}:e;
  c.save();c.translate(e.x+pose.x/sc,e.y+pose.y/sc);c.scale(pose.sx,pose.sy);c.translate(-e.x,-e.y);
  if(e.hitResponse&&e.hitResponse.ttl/e.hitResponse.total>.68)c.filter='brightness(1.7)';
  if(e.isBoss)drawPixelMiniBoss(c,actor,clock,sc);
  else if(fieldSpriteArt)drawHerbPixelEnemy(c,actor,e.hitResponse?0:clock,sc,pixelEnemy,!smoothFx);
  else {c.save();c.translate(e.x,e.y);c.scale(1/sc,1/sc);monster(c,{...actor,x:0,y:0},clock);c.restore();}
  c.restore();if(smoothFx||e.isBoss)drawFieldActorIndicators(c,e,sc);
 }
 if(!three&&smoothFx)for(const e of f.enemies||[])drawFieldDeath(c,e);
 if(!three){
 // Attack swipe uses the *same* direction and trigger as combat hit detection.
 if(smoothFx&&!['GRILL','STEAM'].includes(f.weapon?.type))drawFieldSwipe(c,f);
 if(f.weapon?.type==='STEAM')drawSteamPulse(c,f);
 if(f.weapon?.type==='GRILL')drawForkThrustFx(c,f);
 if(!smoothFx&&f.attackFx?.ttl>0&&!f.attackFx.pot&&f.weapon?.type!=='GRILL'){
  const fx=f.attackFx,progress=1-fx.ttl/fx.duration,angle=Math.atan2(fx.dy,fx.dx);
  c.save();c.translate(f.pos.x,f.pos.y);c.rotate(angle);c.globalAlpha=Math.min(1,fx.ttl*4);
  if(herbPixelArt){c.fillStyle='#ffe6a1';for(let i=0;i<6;i++)c.fillRect(.32+i*.12,-.38+i*.12,.16,.13);
   c.fillStyle='#fff9e0';for(let i=0;i<4;i++)c.fillRect(.45+i*.12,-.48+i*.11,.08,.08);
  }else{
   c.strokeStyle='#ffe6a1';c.lineWidth=.15;c.beginPath();c.arc(0,0,.79,-.93+progress*.7,.52+progress*.7);c.stroke();
   c.strokeStyle='#fff9e0';c.lineWidth=.07;c.beginPath();c.arc(0,0,1.05,-.65+progress*.65,.30+progress*.65);c.stroke();}
  c.restore();
 }
 if(smoothFx){if(f.weapon?.type==='GRILL')drawForkFlameFx(c,f);else if(f.weapon?.type!=='STEAM')drawFieldSkillWave(c,f);drawFieldHitEffects(c,f);}
 if(!smoothFx&&f.weapon?.type==='GRILL')drawForkFlameFx(c,f);
 if(!smoothFx&&f.skillFx>0&&!['GRILL','STEAM'].includes(f.weapon?.type)){c.save();c.strokeStyle=`rgba(255,231,151,${Math.min(.95,f.skillFx*2.4)})`;c.lineWidth=.12;c.beginPath();c.arc(f.pos.x,f.pos.y,(.42-f.skillFx)*3+.35,0,Math.PI*2);c.stroke();c.restore();}
 for(const e of f.enemies||[]){if(e.hurtFx>0&&e.hp>0&&!e.hitResponse){c.save();c.translate(e.x,e.y);c.scale(1/sc,1/sc);if(smoothFx)drawFieldImpact(c,0,-5,e.hurtFx/.36,8);else pixelImpact(c,0,-5,8);c.restore()}}
 }
 for(const fx of f.popFx||[]){if(smoothFx&&fx.text==='💥'){drawFieldBurst(c,fx);continue;}if(smoothFx&&String(fx.text).startsWith('+'))drawFieldCollection(c,fx);c.save();c.translate(fx.x,fx.y-(.76-fx.ttl)*.5);c.scale(1/sc,1/sc);text(c,fx.text,0,-17,fx.color||'#fff1b1',12);c.restore()}
 c.save();c.translate(f.pos.x,f.pos.y);c.scale(1/sc,1/sc);
 const attackPose=fieldAttackPose(f);c.translate(attackPose.x,attackPose.y);
 if(!three){
 const chefFace=(f.facing?.x||0)<-.15?-1:1;
 const isWok=f.weapon?.type==='WOK',isGrill=f.weapon?.type==='GRILL',isSteam=f.weapon?.type==='STEAM';
 const posture=isWok?fieldWokPose(f.facing,f.moving,clock,(f.guardTime||0)>0):null;
 const potPose=!isWok&&!isGrill&&!isSteam?fieldPotPose(f.facing,f.moving,clock,!!(f.attackFx?.pot&&f.attackFx?.ttl>0)):null;
 if(isWok)drawPixelWok(c,posture,{layer:'back',level:f.weapon?.level});
 else if(isSteam)drawPixelSteamBasket(c,f,{layer:'back'});
 else if(potPose)drawPixelPot(c,potPose,{layer:'back',level:f.weapon?.level});
 else drawPixelFork(c,f,{layer:'back'});
 // Exploration draws the equipped cookware separately; the generic actor attack
 // used to raise its hand and paint an obsolete utensil over all three weapons.
 chef(c,0,Math.sin(clock*9)*(f.moving?1.5:.35),clock,{scale:1.55,walk:f.moving,face:chefFace,hurt:f.hurtFx});
 if(isGrill)drawPixelFork(c,f,{layer:'front'});
 if(isSteam)drawPixelSteamBasket(c,f,{layer:'front'});
 if(isWok)drawPixelWok(c,posture,{layer:'front',parry:(f.guardTime||0)>0,level:f.weapon?.level});
 else if(potPose)drawPixelPot(c,potPose,{layer:'front',level:f.weapon?.level});
 }
 if((f.hitFlash||0)>0){
  const ratio=Math.min(1,f.hitFlash/.52);
  c.save();c.globalAlpha=ratio;
  c.strokeStyle='#fff5df';c.lineWidth=2.4;
  c.beginPath();c.arc(0,-3,14+(1-ratio)*12,0,Math.PI*2);c.stroke();
  if(smoothFx)drawFieldImpact(c,0,-8,ratio,14,'#fff3d4');else pixelImpact(c,0,-8,14,'#fff3d4');
  c.restore();
 }
 c.restore();
 // Foreground tree canopies overlap actors only when their foot is farther
 // down screen. Physical obstacles/AI remain completely unchanged.
 if(!three&&fieldSpriteArt)for(const [i,o] of f.obstacles.entries()){
  if(o.y+.5>f.pos.y){if(herbHybridArt){if(!f.artPreviewMode)a20HerbObstacle(c,o,i);else drawHybridMeadowObstacle(c,o,i);}else if(fieldHybridArt)drawHybridFieldObstacle(c,o,f.biome.style,i);else drawHerbPixelObstacle(c,o,i);}
 }
 if(smoothFx)for(const n of f.nodes)drawFieldNodeMarkers(c,n,clock,sc);
 if(f.harvestNode){const n=f.nodes.find(n=>n.key===f.harvestNode);if(n){capsule(c,n.x-.40,n.y-.49,.8,.10,'#304d39');capsule(c,n.x-.40,n.y-.49,.8*(f.harvestProgress/.82),.10,'#f3dd7e')}}
 c.restore();
 // Real HP loss briefly lights the screen edges without adding UI controls.
 if((f.hitFlash||0)>0){
  const intensity=Math.min(1,f.hitFlash/.52);
  c.save();
  const grad=c.createRadialGradient(w/2,h/2,Math.min(w,h)*.12,w/2,h/2,Math.max(w,h)*.72);
  grad.addColorStop(0,'rgba(255,80,55,0)');
  grad.addColorStop(1,`rgba(203,45,36,${(.32*intensity).toFixed(3)})`);
  c.fillStyle=grad;c.fillRect(0,0,w,h);
  c.restore();
 }
 // Gameplay feedback lives in a short-lived DOM notice; never reserve a permanent text strip over the forest.
}
function guest(c,x,y,kind,time,walking=false){pixelActor(c,kind||'regular',x,y,1.4,{walk:walking?time:0});}
// Countdown lives next to each customer instead of consuming a table-width HUD strip.
// Derived from the same service clock and patience values used for order resolution.
export function guestWaitRatio(simTime,arrival,patience){
 const total=Math.max(1,Number(patience)||1);
 return Math.max(0,Math.min(1,(total-Math.max(0,simTime-arrival))/total));
}
function waitingRing(c,x,y,ratio){
 const pct=Math.max(0,Math.min(1,ratio));
 circle(c,x,y,12,'#203b32dd');
 c.strokeStyle='#819182';c.lineWidth=3;c.beginPath();c.arc(x,y,9,-Math.PI/2,3*Math.PI/2);c.stroke();
 if(pct>0){c.strokeStyle=pct>.36?'#b4e27c':pct>.18?'#f6c563':'#f07f5b';c.lineWidth=3.5;c.lineCap='round';c.beginPath();c.arc(x,y,9,-Math.PI/2,-Math.PI/2+Math.PI*2*pct);c.stroke();}
 circle(c,x,y,2.2,'#f2e8cd');
}
function dish(c,x,y,kind){
 circle(c,x,y,12,'#f1e5c6');circle(c,x,y,9,'#9ba288');
 if(kind==='GRILL'){
  for(const dy of [-3,3]){
   line(c,x-10,y+dy,x+10,y+dy,'#e4c187',1.8);
   for(const dx of [-5,0,5])circle(c,x+dx,y+dy,2.2,dx===0?'#d29053':'#8b5d3d');
  }
  return;
 }
 circle(c,x-3,y-1,4,kind==='POT'?'#ca9866':'#9a5438');circle(c,x+4,y-2,3,'#d3b76b');circle(c,x+1,y+4,3,'#719b55');
}
// These pure timelines have no clock modulo. Each order animates exactly once.
export function arrivalProgress(simTime,arrivedAt,duration=.85){return Math.max(0,Math.min(1,(simTime-arrivedAt)/duration))}
export function servingProgress(simTime,servedAt,duration=1.25){const age=simTime-servedAt;return age<0||age>=duration?null:age/duration}
// Physical restaurant set. World units are scaled together, including ALL actors.
// Actor size, seat locations, chef throw, and waiter walk are a single visual contract.
export const DINER_ACTOR_SCALE=1.13;
export function seatLocation(table,seat,w,h){
 const tx=w*(table===0?.28:.72),ty=h*.60;
 return {x:tx+(seat===0?-33:33),y:ty-51};
}
export function plateFlight(simTime,servedAt,duration=1.12){
 const age=simTime-servedAt;
 return {progress:Math.max(0,Math.min(1,age/duration)),flying:age>=0&&age<duration,landed:age>=duration};
}
function lerp(a,b,t){return a+(b-a)*t}
function smooth(t){const p=Math.max(0,Math.min(1,t));return p*p*(3-2*p)}
// Deliberate lanes: entry -> center aisle -> outside table -> chair.
// Guests traverse this route in reverse when leaving, never crossing a table.
export function guestPathPoints(order,w,h){
 const seat=seatLocation(order.tableId,order.seatId??0,w,h);
 const side=(order.seatId??0)===0?-1:1;
 const flank={x:seat.x+side*29,y:seat.y};
 const lower={x:flank.x,y:h*.735};
 return [{x:w*.5,y:h*.94},{x:w*.5,y:h*.735},lower,flank,seat];
}
function routePoint(points,p){
 const t=Math.max(0,Math.min(.999999,p))*(points.length-1),i=Math.floor(t);
 return {x:lerp(points[i].x,points[i+1].x,smooth(t-i)),y:lerp(points[i].y,points[i+1].y,smooth(t-i))};
}
export function guestStagePosition(order,simTime,w,h){
 const points=guestPathPoints(order,w,h),age=simTime-(order.doorAt??order.arrival);
 const leaving=order.status==='served'&&order.served!==null&&simTime-(order.reviewedAt??order.served)>=.65
  ||(['left','rejected'].includes(order.status)&&Number.isFinite(order.leftAt));
 if(leaving){const elapsed=order.status==='served'?simTime-(order.reviewedAt??order.served)-.65:simTime-order.leftAt;
  const progress=Math.max(0,Math.min(1,elapsed/(order.status==='served'?1.55:2.5)));
  return {...routePoint(points,1-progress),moving:progress<1,visible:progress<1};}
 if(age<0)return {...points[0],moving:false,visible:false};
 const progress=Math.max(0,Math.min(1,age/2));
 return {...routePoint(points,progress),moving:progress<1,visible:true};
}
// Review bubbles are driven by deterministic quality/fit/wait values from
// the simulation, not random decorative phrases.
export function guestSceneBubble(order,t){
 if(order.status==='ordering')return {text:'我看看菜单…',kind:'choice'};
 if(['queued','cooking'].includes(order.status))return {text:RECIPES[order.recipeId]?.name||'点单中',kind:'order'};
 if(order.status==='eating')return {text:'',kind:'eating'};
 if(order.status==='review'||(order.status==='served'&&t-(order.reviewedAt??0)<.9))return {text:order.reviewText||'谢谢招待！',kind:order.reviewType||'happy'};
 return null;
}
// Dialogue follows the actual head position. Plan ALL currently visible guest
// bubbles together so a two-seat table never layers one text card over another.
// Only this renderer owns their offsets; no arbitrary seat-specific -28px shift.
export function dinerBubbleSize(words,kind){
 const characters=Array.from(words||'').slice(0,16);
 const lines=characters.length>8?[characters.slice(0,8).join(''),characters.slice(8).join('')]:[characters.join('')];
 const fontSize=kind==='order'?11:10.5;
 const width=Math.min(135,Math.max(62,Math.ceil(Math.max(...lines.map(x=>x.length))*fontSize+20)));
 return {width,height:lines.length>1?39:25,lines,fontSize};
}
export function dinerBubbleLayout(orders,t,w,h){
 const padding=8,placed=[];
 // Sit-down seats get fixed positions, but the speech follows a moving guest
 // on the approach/exit. Keep ordering deterministic for screenshot stability.
 let actors=(orders||[]).map(order=>{
  const bubble=guestSceneBubble(order,t),pos=guestStagePosition(order,t,w,h);
  if(!bubble?.text||!pos.visible)return null;
  const size=dinerBubbleSize(bubble.text,bubble.kind);
  return {id:order.id,tableId:order.tableId,seatId:order.seatId,kind:bubble.kind,words:bubble.text,
   anchorX:pos.x,anchorY:pos.y-22,...size};
 }).filter(Boolean);
 // Low-value menu musing yields to actual dish requests and post-meal reviews.
 // Two diners can still chat together; crowded tables don't make four loud cards.
 const important=actors.filter(a=>a.kind!=='choice');
 if(actors.length>2)actors=[...important,...actors.filter(a=>a.kind==='choice').slice(0,Math.max(0,2-important.length))];
 actors.sort((a,b)=>a.anchorY-b.anchorY||Math.min(a.anchorX,w-a.anchorX)-Math.min(b.anchorX,w-b.anchorX)||a.anchorX-b.anchorX||String(a.id).localeCompare(String(b.id)));
 for(const item of actors){
  const side=item.seatId===0?-1:1;
  const xOffsets=[side*26,0,side*49,-side*18,side*65,-side*42];
  const upOffsets=[0,7,22,39,55,72,90,110];
  let best=null;
  for(const up of upOffsets){
   for(const dx of xOffsets){
    const x=Math.max(padding,Math.min(w-padding-item.width,item.anchorX+dx-item.width/2));
    const y=Math.max(padding,Math.min(h-padding-item.height,item.anchorY-6-up-item.height));
    const overlap=placed.reduce((sum,p)=>{
      const ix=Math.max(0,Math.min(x+item.width,p.x+p.width+5)-Math.max(x,p.x-5));
      const iy=Math.max(0,Math.min(y+item.height,p.y+p.height+5)-Math.max(y,p.y-5));
      return sum+ix*iy;
    },0);
    const displacement=Math.abs((x+item.width/2)-item.anchorX);
    const penalty=overlap*10000+up*.8+displacement*.20+Math.abs(dx-side*26)*.55;
    if(best===null||penalty<best.penalty)best={x,y,penalty};
   }
  }
  placed.push({...item,x:best.x,y:best.y});
 }
 return placed;
}
function drawReviewBubble(c,item){
 const {x,y,width,height,lines,fontSize,kind,anchorX,anchorY}=item;
 const positive=['delicious','happy','choice'].includes(kind),negative=['bad','quality','late','taste'].includes(kind);
 const bg=negative?'#ffe1d3':positive?'#e5f3d1':'#f6e8c7';
 const stroke=negative?'#b77363':'#7f8b68';
 capsule(c,x,y,width,height,bg,stroke);
 for(let i=0;i<lines.length;i++)text(c,lines[i],x+width/2,y+(lines.length===1?height/2:12+i*16),negative?'#703c32':'#394636',fontSize);
 // Connector starts inside the bubble border and ends just above the head.
 const baseX=Math.max(x+12,Math.min(x+width-12,anchorX));
 c.fillStyle=bg;c.beginPath();c.moveTo(baseX-3,y+height-1);c.lineTo(baseX+3,y+height-1);
 c.lineTo(anchorX,Math.max(y+height+1,anchorY-1));c.closePath();c.fill();
 c.strokeStyle=stroke;c.lineWidth=1;c.beginPath();c.moveTo(baseX-3,y+height);c.lineTo(anchorX,Math.max(y+height+1,anchorY-1));c.stroke();
}
function walkGuest(c,order,v,t,w,h){
 const pos=guestStagePosition(order,t,w,h);if(!pos.visible)return;
 const eating=order.status==='eating',review=order.status==='review';
 const bob=eating?Math.sin((t-(order.landedAt||t))*6)*1.3:review?Math.sin(t*3)*.5:0;
 pixelActor(c,order.segment,pos.x,pos.y+bob,DINER_ACTOR_SCALE,{walk:pos.moving?t:0});
 const bubble=guestSceneBubble(order,t);
 if(bubble?.kind==='eating')line(c,pos.x-8,pos.y-23,pos.x-4,pos.y-32,'#f3e8bc',2);
 if(['queued','cooking'].includes(order.status))waitingRing(c,pos.x+19,pos.y-14,guestWaitRatio(t,order.arrival,order.patience));
}
// Every shift begins and ends at the service station. Queue interactions
// rather than retarget a moving actor when another guest arrives.
export function waiterJobs(v){
 const events=(v?.events||[]).filter(e=>['seated','ordered','served'].includes(e.type));
 let end=0;
 return events.map(e=>{
  const start=Math.max(e.t,end),duration=e.type==='ordered'?3.4:3.8;
  end=start+duration;
  return {start,end,type:e.type,table:e.table??v.orders?.find(o=>o.id===e.order)?.tableId??0};
 });
}
export function waiterStagePosition(v,t,w,h){
 const home={x:w*.5,y:h*.79};
 const job=waiterJobs(v).find(j=>t>=j.start&&t<j.end);
 if(!job)return {...home,moving:false};
 const a=(t-job.start)/(job.end-job.start);
 const p=a<.43?smooth(a/.43):a>.63?1-smooth((a-.63)/.37):1;
 const side=job.table===0?-1:1;
 const target={x:home.x+side*w*.10,y:h*.718};
 return {x:lerp(home.x,target.x,p),y:lerp(home.y,target.y,p),moving:p>.01&&p<.99,action:job.type};
}
function paintDinerStaff(c,s,v,t,w,h){
 const staff=v?.crew||s.crew||{},jobs=v?.stations||{};
 for(let i=0;i<2;i++){
  const x=w*(i===0?.21:.79),busy=!!jobs[i===0?'WOK':'POT'];
  if(staff.helper?.hired&&staff.helper.station===i){
   pixelActor(c,'helper',x+(i===0?35:-35),h*.345,DINER_ACTOR_SCALE,{walk:busy?t:0,attack:busy,level:staff.helper.level||1});
  }
 }
 if(v?.walkable&&v.hero){
  if(staff.waiter?.hired){
   const pos=waiterDeliveryPose(s,t);
   pixelActor(c,'waiter',pos.x*w,pos.y*h,DINER_ACTOR_SCALE,{walk:pos.moving?t:0,level:staff.waiter.level||1});
   if(pos.plate)dish(c,pos.x*w+15,pos.y*h-13,'WOK');
  }
  // One authoritative movable chef. EXACT SAME scale as helper, waiter and guests.
  const hero=v.hero,carried=v.orders.find(o=>o.id===hero.carryOrderId&&o.status==='carried');
  const z=heroZone(hero);
  const cooking=!carried&&(z==='WOK'||z==='POT')&&!!jobs[z];
  pixelActor(c,'chef',hero.x*w,hero.y*h,DINER_ACTOR_SCALE,
    {walk:hero.moving?t:0,face:hero.direction==='left'?-1:1,attack:cooking});
  if(carried)dish(c,hero.x*w+15,hero.y*h-14,RECIPES[carried.recipeId]?.station||'WOK');
  // Small ICON only; no status words, no floating text balloon.
  const stateIcon=carried?'🍽️':cooking?'🍳':
    z==='PASS'&&v.orders.some(o=>o.status==='pickup')?'🍽️':
    z?.startsWith('TABLE')&&v.orders.some(o=>o.tableId===Number(z.slice(5))&&['queued','cooking','pickup','delivering'].includes(o.status))?'💛':null;
  if(stateIcon)text(c,stateIcon,hero.x*w,hero.y*h-29,'#ffdf99',13);
  return;
 }
 if(staff.waiter?.hired){
  const pos=waiterStagePosition(v,t,w,h);
  pixelActor(c,'waiter',pos.x,pos.y,DINER_ACTOR_SCALE,{walk:pos.moving?t:0,level:staff.waiter.level||1});
 }
 const recentThrow=(v?.events||[]).slice().reverse().find(e=>e.type==='throw'&&plateFlight(t,e.t,2).flying);
 pixelActor(c,'chef',w*.5,h*.34,DINER_ACTOR_SCALE,{attack:!!recentThrow,walk:jobs.WOK||jobs.POT?t:0});
}
// Compact speech is painted INSIDE the one restaurant canvas. It has no DOM
// hit target, cannot intercept the joystick, and never covers either table.

const speechClamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function speechRectOverlap(a,b,pad=0){
 return Math.max(0,Math.min(a.x+a.width+pad,b.x+b.width+pad)-Math.max(a.x-pad,b.x-pad))*
        Math.max(0,Math.min(a.y+a.height+pad,b.y+b.height+pad)-Math.max(a.y-pad,b.y-pad));
}
// Deterministic speech placement for one Canvas frame. Guest priority and
// actual head positions drive layout; staff chatter uses only spare space.
// Returns a map of cue IDs, not persistent game state or interactive overlays.
export function placeRestaurantSpeech(guestCues,workerCue,actors,w,h){
 const byId=new Map(actors.map(a=>[a.id,a])),placed=[],result=new Map();
 const items=[...(guestCues||[]).map(cue=>({cue,actor:byId.get(cue.id),staff:false})),
   ...(workerCue?[{cue:workerCue,actor:byId.get(workerCue.staffRole),staff:true}]:[])]
   .filter(x=>x.actor&&x.cue.text)
   .sort((a,b)=>(b.cue.priority||0)-(a.cue.priority||0)||Number(a.staff)-Number(b.staff));
 const safeTop=h*.205+4,safeBottom=h*.90,margin=7;
 // A speech bubble belongs to its speaker. Never trade that identity away to
 // avoid scenery: previous collision scoring teleported bubbles below cooks
 // and towards neighbouring dining tables on narrow phones.
 for(const {cue,actor,staff} of items){
  const lines=diningBubbleLines(cue.text,staff?12:16);
  const font=staff?10:11,height=lines.length>1?(staff?35:40):(staff?27:29);
  const width=Math.min(w-2*margin,Math.min(staff?116:129,Math.max(64,
    Math.max(...lines.map(line=>Array.from(line).length))*font+18)));
  const ax=actor.x*w,ay=actor.y*h;
  // Pixel actors are drawn with their feet at (ax,ay); the tip should point
  // to the forehead, not to the table, the feet or the order emoji.
  const tipX=ax,tipY=ay-24;
  const originY=tipY-height-12;
  const offsets=staff?[0,17,-17,29,-29]:[0,14,-14,27,-27];
  let best=null;
  for(const [i,off] of offsets.entries()){
   const left=speechClamp(ax-width/2+off,margin,w-width-margin);
   const top=speechClamp(originY,safeTop,Math.max(safeTop,safeBottom-height));
   const box={x:left,y:top,width,height};
   const peer=placed.reduce((sum,p)=>sum+speechRectOverlap(box,p,4),0);
   const coversOtherHeads=actors.filter(other=>other!==actor).reduce((sum,other)=>
    sum+speechRectOverlap(box,{x:other.x*w-11,y:other.y*h-30,width:22,height:29},2),0);
   const tail=Math.hypot(speechClamp(tipX,left+9,left+width-9)-tipX,tipY-(top+height));
   const penalty=peer*120+ coversOtherHeads*38+ Math.max(0,tail-30)*90+
     Math.abs(off)*1.5+Math.abs(top-originY)*.8+i*.5;
   if(!best||penalty<best.penalty)best={...box,penalty};
  }
  // Suppress low-value worker chatter rather than let it cover a customer,
  // the hero or migrate into an unrelated corner of the restaurant.
  if(!best)continue;
  const overlap=placed.reduce((sum,p)=>sum+speechRectOverlap(best,p,3),0);
  if(staff&&overlap>0)continue;
  const baseX=speechClamp(tipX,best.x+9,best.x+best.width-9);
  const baseY=best.y+best.height;
  if(staff&&Math.hypot(baseX-tipX,baseY-tipY)>40)continue;
  placed.push(best);
  result.set(cue.id,{...best,lines,baseX,baseY,tipX,tipY,staff,dir:'above'});
 }
 return result;
}
function drawSpeechCard(c,cue,p,staff=false){
 if(!p)return;
 const negative=!staff&&(cue.kind==='upset'||cue.kind==='review'&&['late','bad','quality','taste'].includes(cue.reviewType));
 const fill=staff?'#dcebd6':negative?'#ffe2ca':cue.kind==='review'?'#f5e9c8':'#f2eed3';
 const stroke=staff?'#5c846c':negative?'#d59775':'#b7a67c';
 c.save();c.globalAlpha=Math.min(staff ? .92 : .94,speechOpacity(cue));
 c.fillStyle=fill;c.strokeStyle=stroke;c.lineWidth=1.1;
 c.beginPath();c.roundRect(p.x,p.y,p.width,p.height,staff?7:9);c.fill();c.stroke();
 // A short pointer connects the bubble edge with the ACTUAL actor head.
 const dx=p.tipX-p.baseX,dy=p.tipY-p.baseY,dist=Math.hypot(dx,dy)||1;
 if(dist<=42&&p.tipY>=p.baseY){
  const nx=-dy/dist*3.6,ny=dx/dist*3.6;
  c.fillStyle=fill;c.beginPath();c.moveTo(p.baseX+nx,p.baseY+ny);
  c.lineTo(p.baseX-nx,p.baseY-ny);c.lineTo(p.tipX,p.tipY);c.closePath();c.fill();
  c.strokeStyle=stroke;c.beginPath();c.moveTo(p.baseX+nx,p.baseY+ny);
  c.lineTo(p.tipX,p.tipY);c.lineTo(p.baseX-nx,p.baseY-ny);c.stroke();
 }
 for(let i=0;i<p.lines.length;i++)
  text(c,p.lines[i],p.x+p.width/2,p.y+(p.lines.length===1?p.height/2:(staff?10:12)+i*(staff?14:15)),
       staff?'#2f493e':negative?'#7b4237':'#394234',staff?10:11);
 c.restore();
}
function drawGuestSpeech077(c,cue,actor,w,h){
 drawSpeechCard(c,cue,actor.speechPlacement,false);
}
function drawStaffSpeech078(c,cue,actor,w,h){
 drawSpeechCard(c,cue,actor.speechPlacement,true);
}
// Short, quiet talk follows an actual guest who is visibly waiting OUTSIDE.
// The doorway clips this to its own window. Never adds an interaction layer.
function drawOutdoorQueueChatter(c,queue,t,L,T,W,H){
 const cue=selectOutdoorQueueSpeech(queue,t);
 if(!cue||W<118||H<58)return null;
 const slot=queue.slice(0,4).findIndex(o=>o.id===cue.orderId);
 if(slot<0)return null;
 const actorX=L+W*(.20+slot*.205),actorY=T+H*.77;
 const glyphs=Array.from(cue.text);
 const words=glyphs.length>10?glyphs.slice(0,9).join('')+'…':glyphs.join('');
 const font=H<85?8:9;
 const width=Math.min(W-12,Math.max(45,Math.ceil(Array.from(words).length*font+14)));
 const height=H<85?20:23;
 const X=speechClamp(actorX-width*.5,L+5,L+W-width-5);
 // The status bar occupies the top 28 px. A small gap is always preserved.
 const Y=T+Math.min(Math.max(31,H*.32),H-height-4);
 const urgent=cue.kind==='urgent';
 c.save();c.globalAlpha=Math.min(.93,speechOpacity(cue));
 c.fillStyle=urgent?'#ffdfc4':'#eff3d9';c.strokeStyle=urgent?'#ca966c':'#83a18a';
 c.lineWidth=1;
 c.beginPath();c.roundRect(X,Y,width,height,6);c.fill();c.stroke();
 const headY=actorY-19,base=speechClamp(actorX,X+9,X+width-9);
 if(headY>Y+height&&headY-(Y+height)<24){
  c.beginPath();c.moveTo(base-3,Y+height-1);c.lineTo(base+3,Y+height-1);
  c.lineTo(actorX,headY);c.closePath();c.fill();
 }
 text(c,words,X+width/2,Y+height/2,urgent?'#77402f':'#395248',font);
 c.restore();
 return cue.orderId;
}

// Compact cutaway outside the entry: environmental context, not a modal panel.
// Weather is consistent for the day; standing visitors are actual pending orders.
function drawCloudRestaurantBackdrop(c,t,w,h){
 const x=f=>f*w,y=f=>f*h;
 const sky=c.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#80bbdb');sky.addColorStop(.55,'#d1e8df');sky.addColorStop(1,'#638fac');rect(c,0,0,w,h,sky);
 // Distant floating silhouettes are visible through the entire open upper deck.
 for(const [i,px,py,scale] of [[0,.15,.095,.8],[1,.73,.115,1.15],[2,.48,.047,.48]]){
  const X=x(px+Math.sin(t*.14+i)*.008),Y=y(py),W=w*.17*scale;
  c.fillStyle=i===1?'#6698a8':'#86abba';c.beginPath();c.ellipse(X,Y,W,7*scale,0,0,Math.PI*2);c.fill();
  c.beginPath();c.moveTo(X-W*.73,Y+2);c.lineTo(X,Y+28*scale);c.lineTo(X+W*.70,Y+2);c.fill();
  line(c,X-W*.65,Y-4,X+W*.64,Y-4,'#e2ead0',3);
 }
 for(let i=0;i<8;i++){
  const px=x(((i*.19+t*.003)%1.4)-.20),py=y(.20+i*.105),rw=w*(.10+i%3*.04);
  c.fillStyle='#f1f9f0a8';c.beginPath();c.ellipse(px,py,rw,7+i%3*2,0,0,Math.PI*2);c.fill();
 }
 // A smaller suspended stone platform creates real visual height. Walkable
 // geometry remains owned by dinerFloor, so no misleading clickable ledges.
 c.fillStyle='#65849a';c.beginPath();c.moveTo(x(.06),y(.18));c.lineTo(x(.94),y(.18));c.lineTo(x(.91),y(.945));c.lineTo(x(.50),y(.985));c.lineTo(x(.09),y(.945));c.closePath();c.fill();
 c.fillStyle='#c4d5d0';c.beginPath();c.moveTo(x(.065),y(.165));c.lineTo(x(.935),y(.165));c.lineTo(x(.92),y(.926));c.lineTo(x(.50),y(.969));c.lineTo(x(.08),y(.926));c.closePath();c.fill();
 for(let row=0;row<12;row++){
  const yy=y(.19+row*.061);line(c,x(.09),yy,x(.91),yy,'#7097a046',1.3);
  for(let col=0;col<8;col++)line(c,x(.105+col*.105+(row%2)*.05),yy,x(.105+col*.105+(row%2)*.05),yy+h*.061,'#83a9ad3a',1);
 }
 // Open rails and mooring ropes at the void-facing edges.
 for(const side of [.075,.925]){
  line(c,x(side),y(.18),x(side),y(.90),'#315c7188',4);
  for(let j=0;j<6;j++){
   const Y=y(.23+j*.13);circle(c,x(side),Y,3,'#ddcf9b');
   line(c,x(side),Y,x(side+(side<.5?.035:-.035)),Y+13,'#67849b',2);
  }
 }
 // The harbour pennants sway above the cookware without hiding it.
 for(const px of [.35,.65]){
  line(c,x(px),y(.01),x(px),y(.19),'#6b8192',1.5);
  c.fillStyle='#e7c789';c.beginPath();c.moveTo(x(px),y(.035));c.lineTo(x(px+(px<.5?.09:-.09)),y(.066));c.lineTo(x(px),y(.089));c.fill();
 }
}
export function drawDinerDoorway(c,s,t,w,h){
 const g=dinerFloor(s),p=g.doorwayView,queue=dinerQueueGuests(s,t),weather=dinerWeather(s);
 const L=p.left*w,R=p.right*w,T=p.top*h,B=p.bottom*h,W=R-L,H=B-T;
 if(s.activeWorld==='cloud'){
  c.save();c.fillStyle='#4b7188';c.beginPath();c.roundRect(L-6,T-6,W+12,H+12,10);c.fill();c.beginPath();c.rect(L,T,W,H);c.clip();
  const sky=c.createLinearGradient(0,T,0,B);sky.addColorStop(0,'#7cbada');sky.addColorStop(1,'#eff9ec');c.fillStyle=sky;c.fillRect(L,T,W,H);
  for(const [i,px] of [.18,.52,.83].entries()){
   const X=L+px*W,Y=T+H*(.48+i*.06);c.fillStyle='#759cab';c.beginPath();c.ellipse(X,Y,W*.12,H*.06,0,0,Math.PI*2);c.fill();
   c.beginPath();c.moveTo(X-W*.09,Y);c.lineTo(X,Y+H*.28);c.lineTo(X+W*.09,Y);c.fill();
  }
  c.fillStyle='#9bb9c0';c.fillRect(L,T+H*.77,W,H*.23);
  for(let i=0;i<5;i++)line(c,L+i*W*.23,T+H*.80,L+i*W*.23,T+H,'#526f8299',2);
  queue.slice(0,4).forEach((o,i)=>pixelActor(c,o.segment,L+W*(.20+i*.205),T+H*.77,DINER_ACTOR_SCALE*.82,{walk:0}));
  c.fillStyle='#294e68cb';c.fillRect(L+6,T+6,94,22);text(c,'☁ 等位 '+queue.length,L+51,T+17,'#fff6dd',11);
  drawOutdoorQueueChatter(c,queue,t,L,T,W,H);c.strokeStyle='#e4d4aa';c.lineWidth=4;c.strokeRect(L+2,T+2,W-4,H-4);c.restore();
  return {queue:queue.length,weather:'breeze'};
 }
 c.save();
 c.fillStyle='#4c382d';c.beginPath();c.roundRect(L-6,T-6,W+12,H+12,12);c.fill();
 c.fillStyle='#c39965';c.beginPath();c.roundRect(L-3,T-3,W+6,H+6,9);c.fill();
 c.beginPath();c.rect(L,T,W,H);c.clip();
 const sky=c.createLinearGradient(0,T,0,B);
 sky.addColorStop(0,weather==='rain'?'#314e61':weather==='mist'?'#6b7776':'#355a62');
 sky.addColorStop(1,weather==='rain'?'#617788':'#8aa28a');c.fillStyle=sky;c.fillRect(L,T,W,H);
 // Distant roofline and the pathway give the little outside view scale.
 c.fillStyle='#365249';c.fillRect(L,T+H*.50,W,H*.18);
 for(let i=0;i<7;i++){
  const sx=L+i*W/6;
  c.fillStyle=i%2?'#2e4941':'#435e4e';
  c.fillRect(sx,T+H*.39+(i%3)*4,W/6+2,H*.2);
 }
 c.fillStyle='#867b68';c.fillRect(L,T+H*.68,W,H*.32);
 c.fillStyle='#b2a08a';for(let i=0;i<5;i++)c.fillRect(L+i*W*.235,T+H*.79+((i%2)*5),W*.15,2);
 // Weather affects only the view, not the simulation or the actual ingredient economy.
 if(weather==='rain'){
  for(let i=0;i<23;i++){
   const px=L+((i*41+t*21)%(W+12)),py=T+((i*27+t*53)%(H*.8));
   line(c,px,py,px-4,py+9,'#c1ddeb88',1.4);
  }
 }else if(weather==='mist'){
  for(let i=0;i<3;i++){
   c.fillStyle='#d6ddd24f';c.beginPath();c.ellipse(L+W*(.25+i*.22),T+H*(.49+i*.08),W*.25,H*.13,0,0,Math.PI*2);c.fill();
  }
 }else {
  circle(c,L+W*.85,T+H*.18,8,weather==='breeze'?'#e8e6bf':'#ffe4a7');
  if(weather==='breeze')for(let i=0;i<3;i++)line(c,L+W*.1+i*13,T+H*(.20+i*.1),L+W*.3+i*13,T+H*(.20+i*.1),'#d2eddb9c',1);
 }
 // Real queued arrivals are the ONLY guests displayed in this row.
 queue.slice(0,4).forEach((o,i)=>{
  const px=L+W*(.20+i*.205);
  pixelActor(c,o.segment,px,T+H*.77,DINER_ACTOR_SCALE*.82,{walk:0});
  circle(c,px,T+H*.82,9,'#d8caa221');
 });
 // Quiet, functional status text. There is deliberately no fictional room name.
 c.font='bold 11px system-ui';c.textBaseline='middle';
 c.fillStyle='#193a32c9';c.fillRect(L+6,T+6,Math.min(W-12,queue.length?94:102),22);
 text(c,(weather==='rain'?'☔':weather==='mist'?'☁️':weather==='breeze'?'🍃':'☀️')+' 等位 '+queue.length,L+51,T+17,'#fff0cc',11);
 drawOutdoorQueueChatter(c,queue,t,L,T,W,H);
 // Door threshold and open-frame mullions sit above the outdoor strip.
 c.strokeStyle='#d7b07b';c.lineWidth=4;c.strokeRect(L+2,T+2,W-4,H-4);
 c.fillStyle='#79563d';c.fillRect(L+W*.475,T+H*.03,W*.05,H*.13);
 c.restore();
 return {queue:queue.length,weather};
}

// v0.7.5 official restaurant. One world; furniture, actors, services and
// collision share DINER_FLOOR. The old DOM kitchen is NOT drawn here.
// A2.0 art study: authored shapes, shared light/material language, unchanged ground anchors.
const A20_MATERIAL=Object.freeze({ink:'#302b26',woodShade:'#785039',wood:'#ad8052',woodLight:'#e0b77a',leafShade:'#294b3d',leaf:'#527952',leafLight:'#a0b57a',stone:'#66766d'});
function a20Poly(c,pts,fill,stroke=null,lw=1){
 c.beginPath();c.moveTo(...pts[0]);for(const p of pts.slice(1))c.lineTo(...p);c.closePath();c.fillStyle=fill;c.fill();
 if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke();}
}
function a20Ellipse(c,x,y,rx,ry,fill){
 c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=fill;c.fill();
}
function a20Wood(c,x,y,w,h){
 rect(c,x,y,w,h,A20_MATERIAL.wood);rect(c,x,y,w,Math.min(2,h*.12),A20_MATERIAL.woodLight);
 for(let j=1;j<4;j++){let py=y+h*j/4;line(c,x+2,py,x+w-2,py,'#69442c80',1);line(c,x+3,py+1,x+w-3,py+1,'#e6bc7938',1);}
}
function a20Table(c,X,Y,side,i){
 c.save();const p=side/2,d=side*.19;
 // Seats retain the original centre and chair lip drawn by the shared actor renderer.
 for(const sign of [-1,1]){
  const cx=X+sign*side*.77;
  a20Ellipse(c,cx+2,Y+12,9,5,'#382b2280');rect(c,cx-6,Y+2,3,13,'#4b3227');rect(c,cx+3,Y+2,3,13,'#4b3227');
  a20Poly(c,[[cx-8,Y-9],[cx+8,Y-9],[cx+8,Y+1],[cx-8,Y+1]],'#72523a','#493126');
  a20Wood(c,cx-7,Y-12,14,11);rect(c,cx-5,Y-10,10,7,i>=2?'#627b59':'#935b43');
 }
 a20Ellipse(c,X+5,Y+p+9,p+8,10,'#392b2366');
 for(const xx of [X-p+5,X+p-8]){rect(c,xx,Y+p-4,5,12,'#513629');rect(c,xx,Y+p-4,1,11,'#b18053')}
 a20Poly(c,[[X-p,Y-p+6],[X+p,Y-p+6],[X+p,Y+p],[X-p,Y+p]],A20_MATERIAL.woodShade,'#422e25');
 a20Poly(c,[[X-p,Y-p],[X+p-3,Y-p],[X+p,Y-p+3],[X+p,Y+p-d],[X-p,Y+p-d]],'#ba8a55','#533728');
 a20Wood(c,X-p+3,Y-p+3,side-6,side-d-6);
 rect(c,X-p+3,Y+p-d+1,side-6,2,'#d1a56b');
 // A woven runner and tiny ceramic vase, off the real plate positions.
 rect(c,X-5,Y-p+3,10,side*.31,'#74564a');rect(c,X-4,Y-p+4,8,side*.28,'#a37d5d');
 a20Ellipse(c,X,Y-p+7,4,3,'#ddd2ad');a20Ellipse(c,X,Y-p+6,2.5,1.7,'#6d7e54');
 c.restore();
}
function a20Range(c,X,Y,rw,type,busy,t){
 c.save();let p=rw/2;
 a20Ellipse(c,X+4,Y+26,p+5,9,'#36271f66');
 a20Poly(c,[[X-p,Y-16],[X+p,Y-16],[X+p,Y+26],[X-p,Y+26]],'#76563e','#402d25');
 rect(c,X-p+2,Y-3,rw-4,25,'#8b6749');
 for(let j=0;j<3;j++)line(c,X-p+4,Y+4+j*7,X+p-4,Y+4+j*7,'#624936',1);
 a20Poly(c,[[X-p-2,Y-22],[X+p-2,Y-22],[X+p+2,Y-17],[X+p+2,Y+5],[X-p-2,Y+5]],'#b6a087','#514238');
 rect(c,X-p,Y+3,rw,4,'#6d5b4c');
 c.beginPath();c.roundRect(X-9,Y+10,18,12,2);c.fillStyle='#3b322b';c.fill();c.strokeStyle='#c29963';c.stroke();
 if(busy){a20Ellipse(c,X,Y+18,7,3,'#bc5b35');a20Ellipse(c,X-2,Y+17,3,3,'#f3c16b')}
 if(type==='WOK'){
  a20Ellipse(c,X,Y-9,p*.69,12,'#282e2c');a20Ellipse(c,X,Y-12,p*.68,10,'#b7b6a0');a20Ellipse(c,X,Y-12,p*.60,8,'#3c4843');a20Ellipse(c,X-4,Y-14,p*.36,3,'#61716a');
  line(c,X+p*.52,Y-8,X+p*.9,Y-19,'#3e3128',5);line(c,X+p*.55,Y-9,X+p*.86,Y-19,'#c49b64',2);
 }else{
  rect(c,X-p*.52,Y-22,p*1.04,15,'#5e7973');a20Ellipse(c,X,Y-7,p*.52,5,'#405a54');a20Ellipse(c,X,Y-22,p*.57,5,'#a1b3a5');a20Ellipse(c,X,Y-23,p*.46,4,'#69847a');rect(c,X-3,Y-29,6,5,'#c3a16c');
  line(c,X-p*.55,Y-16,X-p*.8,Y-16,'#4d4134',4);line(c,X+p*.55,Y-16,X+p*.8,Y-16,'#4d4134',4);
 }
 if(busy)for(let k=0;k<3;k++)a20Ellipse(c,X-7+k*7,Y-30-((t*9+k*4)%11),2,3,'#f5e8d08a');
 c.restore();
}
// Forest specimen: original tree silhouette with faceted leaf clusters and anchored roots.
function a20HerbObstacle(c,o,i){
 if(i%5===2){drawHybridMeadowObstacle(c,o,i);return;}
 c.save();c.translate(o.x+.5,o.y+.5);const variant=[.91,1,1.07][i%3];c.scale(variant,variant);
 const m=A20_MATERIAL;
 a20Ellipse(c,.22,.23,.68,.29,'#243b3155');a20Ellipse(c,.04,.19,.32,.15,'#28372f80');
 a20Poly(c,[[-.27,.25],[-.14,.05],[-.13,-.71],[.15,-.78],[.19,.01],[.31,.21],[.12,.15],[.03,.30],[-.04,.15]],m.woodShade);
 a20Poly(c,[[-.14,.08],[-.12,-.63],[-.03,-.69],[-.02,.08],[-.12,.21]],m.wood);
 line(c,.08,-.45,.09,.10,'#4e392c',.045);line(c,-.07,-.36,-.04,.04,'#e0b77a77',.035);
 line(c,-.08,-.56,-.41,-.83,m.woodShade,.13);line(c,.08,-.52,.47,-.91,m.woodShade,.13);
 const lobes=[[-.43,-.73,.55,.43],[.43,-.76,.56,.42],[-.55,-1.05,.48,.40],[.43,-1.14,.55,.44],[0,-1.42,.63,.44],[0,-.98,.57,.43]];
 for(let j=0;j<lobes.length;j++){
  const [x,y,rx,ry]=lobes[j];
  const pts=Array.from({length:14},(_,k)=>{const a=k*Math.PI/7,r=1+(k%2?.07:-.035);return [x+Math.cos(a)*rx*r,y+Math.sin(a)*ry*r]});
  a20Poly(c,pts,j<2?m.leafShade:'#365d47');
  const lit=pts.map(([xx,yy])=>[x+(xx-x)*.81-.035,y+(yy-y)*.77-.065]);
  a20Poly(c,lit,j<2?'#42664b':m.leaf);
  for(let k=0;k<3;k++){let dx=x-rx*.45+k*rx*.36,dy=y-ry*.44+(k%2)*.045; a20Poly(c,[[dx-.08,dy+.045],[dx-.035,dy-.035],[dx+.085,dy-.04],[dx+.035,dy+.04]],j<2?'#718e60':m.leafLight);}
 }
 c.restore();
}

// A1: decorative backdrop only. No hitboxes, inventory, or simulation effects.
function drawLivingHearthA1(c,w,h){
 c.save();
 const X=n=>n*w,Y=n=>n*h;
 const block=(x,y,a,b,color)=>{c.fillStyle=color;c.fillRect(X(x),Y(y),X(a),Y(b))};
 const wall=c.createLinearGradient(0,0,0,Y(.18));wall.addColorStop(0,'#263c35');wall.addColorStop(1,'#53644a');
 c.fillStyle=wall;c.fillRect(0,0,w,Y(.18));
 const floor=c.createLinearGradient(0,Y(.15),0,h);floor.addColorStop(0,'#956e47');floor.addColorStop(.48,'#b0875a');floor.addColorStop(1,'#6b4d37');
 c.fillStyle=floor;c.fillRect(0,Y(.15),w,h-Y(.15));
 // Long staggered planks and restrained grain; fixed coordinates, no random flicker.
 for(let j=0;j<11;j++){
  const px=j*w/11;
  c.fillStyle=j%2?'#e7b87b12':'#392a2010';c.fillRect(px,Y(.15),w/11,h-Y(.15));
  c.strokeStyle='#4d352b78';c.lineWidth=1;c.beginPath();c.moveTo(px,Y(.15));c.lineTo(px,h);c.stroke();
  for(let k=0;k<3;k++){
   const py=Y(.2+((j*7+k*11)%21)*.031);
   c.fillStyle='#f5c78924';c.fillRect(px+3,py,1,Y(.06));
  }
  for(let k=0;k<3;k++){
   const py=Y(.27+k*.25+(j%3)*.075);
   c.fillStyle='#4b352953';c.fillRect(px,py,w/11,1);
  }
 }
 // Framed wall and three physical objects associated with the home actions.
 block(0,.135,1,.022,'#543925');block(0,.135,1,.006,'#d1a16a');
 block(.02,0,.025,.15,'#4a3328');block(.955,0,.025,.15,'#4a3328');
 // Recessed plaster panels, stone skirting, beam faces and pegged joints.
 for(let j=0;j<8;j++){
  const xx=.027+j*.12;
  block(xx,.144,.116,.017,j%2?'#7b7868':'#8a8976');
  block(xx,.144,.116,.003,'#b6af91');
 }
 block(.02,.004,.96,.012,'#4b362b');block(.02,.014,.96,.005,'#8d6644');
 for(const xx of [.028,.96]){block(xx,.02,.008,.115,'#b18155');for(const yy of [.035,.12])block(xx,.01+yy,.006,.006,'#352a24');}

 // Pantry cupboard (left). Shelf silhouettes: jars, baskets, roots.
 block(.055,.018,.25,.117,'#422d25');block(.066,.024,.228,.105,'#9a6d43');
 for(let k=0;k<2;k++){
  const yy=.028+k*.048;block(.074,yy,.212,.041,'#503c2c');
  for(let j=0;j<4;j++){const px=.084+j*.051;block(px,yy+.011,.032,.027,['#ac7047','#c5a16a','#83925f','#aa8751'][j]);block(px-.003,yy+.006,.038,.007,'#e0c797');}
  block(.07,yy+.038,.22,.007,'#d3a06a');
 }
 // Open window with hills, trees and mullions.
 block(.35,.012,.30,.116,'#4b3327');block(.366,.023,.268,.095,'#d5e3bd');
 block(.366,.075,.268,.043,'#7a9a72');
 for(let i=0;i<6;i++){const px=.37+i*.045;c.fillStyle=i%2?'#486a51':'#628660';c.beginPath();c.moveTo(X(px),Y(.104));c.lineTo(X(px+.021),Y(.046+(i%3)*.008));c.lineTo(X(px+.043),Y(.104));c.fill();}
 block(.493,.023,.012,.095,'#68452e');block(.366,.062,.268,.009,'#68452e');block(.34,.119,.32,.011,'#d1a16a');
 // Wall recipe ledger; actual button opens existing recipe book.
 block(.715,.023,.22,.107,'#493126');block(.73,.033,.19,.087,'#ceaf79');
 for(let i=0;i<4;i++)block(.75,.047+i*.015,.145-(i%2)*.035,.003,'#77583a');
 // Framed recipe folio: paper sheets, leather tabs, brass fastening.
 block(.736,.039,.176,.005,'#e8cd91');block(.737,.041,.004,.077,'#775037');
 for(let j=0;j<3;j++){block(.89,.051+j*.021,.021,.009,['#935b43','#697d50','#8f6b43'][j]);}
 block(.807,.028,.018,.009,'#cfa56b');

 // Canvas gradients create sunlight without laying a tint over real actors.
 c.save();c.beginPath();c.moveTo(X(.38),Y(.15));c.lineTo(X(.61),Y(.15));c.lineTo(X(.89),Y(.83));c.lineTo(X(.48),Y(.83));c.closePath();c.clip();
 const sun=c.createLinearGradient(0,Y(.15),0,Y(.83));sun.addColorStop(0,'#ffe6a345');sun.addColorStop(1,'#ffe6a300');c.fillStyle=sun;c.fillRect(0,0,w,h);c.restore();
 // Border shadows and a woven entry runner, outside furniture collision geometry.
 block(0,.16,.026,.84,'#3c2d27a0');block(.974,.16,.026,.84,'#3c2d27a0');
 block(.413,.795,.174,.057,'#55473a');block(.422,.799,.156,.049,'#8b5140');
 for(let k=0;k<5;k++)block(.432+k*.028,.801,.008,.045,'#c6a16a');
 c.restore();
}

// A2.1: real pixel atlas layered at the existing room anchors.
function a21HearthBackground(c,w,h){
 const sx=n=>n*w,sy=n=>n*h,unit=Math.max(38,Math.round(w/6));
 rect(c,0,0,w,h,'#302727');
 a21Tile(c,'floor',sx(.035),sy(.145),sx(.93),sy(.855),unit);
 a21Tile(c,'stone',sx(.035),sy(.145),sx(.93),sy(.245),unit*.72);
 a21Tile(c,'wall',sx(.035),0,sx(.93),sy(.145),unit*.75);
 // Dark top beam and side walls give a readable cutaway silhouette.
 rect(c,0,0,w,7,'#3b2b2b');rect(c,0,7,w,4,'#705343');
 for(const px of [0,.966]){
  a21Tile(c,'stone',sx(px),0,sx(.034),h,unit*.55);
  rect(c,sx(px),0,3,h,'#463732');
 }
 rect(c,sx(.035),sy(.14),sx(.93),6,'#553a2e');
 rect(c,sx(.035),sy(.14)+1,sx(.93),2,'#c49159');
 // Shelf under its existing stock hotspot; window and ledger retain their actions.
 const shelfW=Math.min(w*.24,84),shelfH=Math.min(h*.125,shelfW*39/42);
 a21Sprite(c,'shelf',sx(.175)-shelfW/2,sy(.135)-shelfH,shelfW,shelfH);
 const wx=sx(.39),wy=sy(.025),ww=sx(.22),wh=sy(.105);
 rect(c,wx-3,wy-3,ww+6,wh+6,'#49352d');rect(c,wx,wy,ww,wh,'#94b0a0');
 a20Poly(c,[[wx,wy+wh],[wx,wy+wh*.68],[wx+ww*.36,wy+wh*.25],[wx+ww*.64,wy+wh*.72],[wx+ww,wy+wh*.44],[wx+ww,wy+wh]],'#527952');
 rect(c,wx+ww*.48,wy,3,wh,'#694832');rect(c,wx,wy+wh*.54,ww,3,'#694832');
 rect(c,wx-4,wy+wh,ww+8,4,'#bc8b57');
 const bx=sx(.737),by=sy(.035),bw=sx(.18),bh=sy(.09);
 rect(c,bx-3,by-3,bw+6,bh+6,'#563c2f');rect(c,bx,by,bw,bh,'#d6b88a');
 for(let k=0;k<4;k++)rect(c,bx+4,by+4+k*bh*.19,bw*(k%2?.62:.76),1.5,'#876547');
 // Fixed props stay near the walls, out of all walkable kitchen/table paths.
 const prop=Math.min(35,w*.095);
 a21Sprite(c,'barrel',sx(.045),sy(.79),prop*.76,prop*1.1);
 a21Sprite(c,'crate',sx(.85),sy(.79),prop,prop*1.06);
 const bwid=Math.min(38,w*.11);
 a21Sprite(c,'banner',sx(.50)-bwid/2,sy(.435),bwid,bwid*39/34);
 const light=c.createLinearGradient(0,sy(.15),w,sy(.9));
 light.addColorStop(0,'#ffdf9a14');light.addColorStop(.65,'#302c2500');light.addColorStop(1,'#241e2930');
 c.fillStyle=light;c.fillRect(sx(.035),sy(.145),sx(.93),sy(.855));
 // Woven entry runner stays off the furniture and table paths.
 rect(c,sx(.41),sy(.79),sx(.18),sy(.065),'#553c32');
 rect(c,sx(.42),sy(.795),sx(.16),sy(.055),'#536c5e');
 rect(c,sx(.43),sy(.802),sx(.14),sy(.041),'#647968');
 for(const q of [.435,.56])rect(c,sx(q),sy(.806),2,sy(.033),'#d1ab73');
}
function a21DrawTable(c,X,Y,side){
 const tw=side*1.12,th=tw*36/44;
 a20Ellipse(c,X+3,Y+th*.38,tw*.55,8,'#31282155');
 for(const sign of [-1,1]){
  const cx=X+sign*side*.77,sw=side*.32,sh=sw*22/17;
  a20Ellipse(c,cx+2,Y+7,sw*.55,4,'#30251d55');
  a21Sprite(c,'stool',cx-sw/2,Y-sh*.62,sw,sh);
 }
 a21Sprite(c,'table',X-tw/2,Y-th*.60,tw,th);
}
function a21DrawRange(c,X,Y,rw,type){
 const w=rw*.95,h=w*(type==='POT'?44/34:47/31);
 a20Ellipse(c,X+3,Y+23,w*.53,7,'#30282066');
 a21Sprite(c,type==='POT'?'pot':'hearth',X-w/2,Y+24-h,w,h);
 if(type==='WOK'){
  // The extracted hearth is a chimney/range. Keep a distinct iron wok in
  // front of the chimney; no duplicate stove or false third work station.
  a20Ellipse(c,X,Y-6,rw*.29,8,'#282c2d');
  a20Ellipse(c,X,Y-9,rw*.29,7,'#a5a89b');
  a20Ellipse(c,X,Y-9,rw*.25,5,'#405048');
  line(c,X+rw*.24,Y-9,X+rw*.45,Y-17,'#433428',4);
 }
}

export function restaurantActorsV075(s,t){
 const g=dinerFloor(s),v=s.service,pending=v?.orders?.filter(o=>o.status==='pickup')||[];
 // Actors are sorted by floor position. Same real sprite scale for everyone.
 const actors=[];
 if(v){
  for(const o of v.orders){
   if(o.tableId==null)continue;
   const eligible=['entering','ordering','queued','cooking','pickup','carried','delivering','flying','eating','review'].includes(o.status)
       ||(o.status==='served'&&t-(o.reviewedAt??o.served??t)<2.3)
       ||(['left','rejected'].includes(o.status)&&Number.isFinite(o.leftAt)&&t-o.leftAt<2.6);
   if(!eligible)continue;
   const route=dinerGuestRoute(o.tableId,o.seatId??0,s);
   const age=Math.max(0,t-(Number.isFinite(o.doorAt)?o.doorAt:Number.isFinite(o.arrival)?o.arrival:t));
   const leaving=o.status==='served'&&t-(o.reviewedAt??o.served??t)>.65||(['left','rejected'].includes(o.status)&&Number.isFinite(o.leftAt));
   const progress=leaving?Math.max(0,1-(t-(o.status==='served'?(o.reviewedAt??o.served??t)+.65:o.leftAt))/2.2):
       (o.status==='entering'?Math.max(0,Math.min(1,age/2.4)):1);
   if(leaving&&progress<=0)continue;
   const loc=progress>=.999?route.at(-1):routePoint(route,progress);if(!Number.isFinite(loc?.x)||!Number.isFinite(loc?.y))continue;
   actors.push({id:o.id,x:loc.x,y:loc.y,kind:o.segment,walk:progress>0&&progress<1,seat:progress>=.999&&!leaving,order:o});
  }
  const crew=v.crew||s.crew;
  // The worker visibly walks between stations; the kitchen rules only credit
  // them AFTER travel time has elapsed (never a magical production teleport).
  for(const role of ['helper','helper2']){
   const person=crew?.[role];if(!person?.hired)continue;
   const station=person.currentStation??person.station??(role==='helper2'?2:0);
   const start=person.moveStart,until=person.moveUntil;
   const moving=until>0&&Number.isFinite(start)&&t<until;
   let pt=g.helper[station]||g.helper[0];
   if(moving){
    const from=g.helper[person.moveFrom]||pt,to=g.helper[person.moveTo]||pt;
    const alpha=Math.max(0,Math.min(1,(t-start)/Math.max(.1,until-start)));
    pt={x:from.x+(to.x-from.x)*alpha,y:from.y+(to.y-from.y)*alpha};
   }
   actors.push({id:role,x:pt.x,y:pt.y,kind:s.activeWorld==='cloud'?'cloud_'+role:role,level:person.level||1,
    walk:moving?t*2:false,working:!moving&&!!v.stations[['WOK','POT','CENTER'][station]]});
  }
  for(const role of ['waiter',...(s.activeWorld==='cloud'?['waiter2']:[])]){
   const person=crew?.[role];if(!person?.hired)continue;
   const pos=waiterDeliveryPose(s,t,role);
   const delivery=pos.plate?v.orders.find(o=>o.status==='delivering'&&(o.deliveryRole||'waiter')===role&&Number.isFinite(o.deliveryAt)):null;
   // Two idle couriers stand apart rather than stacking on the exact pass point;
   // moving paths remain driven by the actual role-locked order.
   const idleOffset=!pos.moving&&s.activeWorld==='cloud'&&crew?.waiter?.hired&&crew?.waiter2?.hired?(role==='waiter'?-0.045:0.045):0;
   actors.push({id:role,x:pos.x+idleOffset,y:pos.y,kind:s.activeWorld==='cloud'?'cloud_'+role:role,level:person.level||1,walk:pos.moving,plate:pos.plate,plateRecipeId:delivery?.recipeId});
  }
  if(v.hero){
   const hero=v.hero,zone=heroZone(hero,s);
   const carried=v.orders.find(o=>o.id===hero.carryOrderId&&o.status==='carried');
   actors.push({id:'hero',x:hero.x,y:hero.y,kind:'chef',walk:hero.moving,plate:!!carried,plateRecipeId:carried?.recipeId,
     working:!carried&&['WOK','POT','CENTER'].includes(zone)&&!!v.stations[zone],direction:hero.direction,
     stateIcon:carried?'🍽️':zone==='PASS'&&pending.length?'🍽️':
      zone?.startsWith('TABLE')&&v.orders.some(o=>o.tableId===Number(zone.slice(5))&&['queued','cooking','pickup','delivering'].includes(o.status))?'💛':null});
  }
 }
 else {
  const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false;
  for(const person of homeKitchenActors(s,t,reduced))actors.push(s.activeWorld==='cloud'&&['helper','helper2','waiter','waiter2'].includes(person.kind)?{...person,kind:'cloud_'+person.kind}:person);

 }
 actors.sort((a,b)=>a.y-b.y);
 return actors;
}

function drawRestaurantV075(c,s,t,w,h){
 const g=dinerFloor(s),v=s.service,x=f=>f*w,y=f=>f*h;
 const rr=(X,Y,W,H,R,color,stroke)=>{
  c.beginPath();c.roundRect(X,Y,W,H,R);c.fillStyle=color;c.fill();
  if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.stroke();}
 };
 const cloud=s.activeWorld==='cloud',assetHome=!cloud&&s.phase==='forecast'&&!v&&a21AtlasReady();
 if(cloud){drawCloudRestaurantBackdrop(c,t,w,h);drawCloudPortProps(c,t,w,h);}else if(assetHome){a21HearthBackground(c,w,h);}else if(s.phase==='forecast'&&!v){drawLivingHearthA1(c,w,h);}else rect(c,0,0,w,h,'#6f513b');
 // Rich warm tile floor: one drawable scene rather than HTML furniture overlay.
 for(let row=0;!cloud&&!(s.phase==='forecast'&&!v)&&row<Math.ceil(h/28);row++){
  rect(c,0,row*28,w,27,row%2?'#796045':'#72563e');
  line(c,0,row*28,w,row*28,'#4b382ca0',1);
  for(let column=0;column<Math.ceil(w/36);column++)
    line(c,column*36+(row%2)*18,row*28,column*36+(row%2)*18,row*28+27,'#9d775022',1);
 }
 // Shrink the redundant upper wall; the game HUD already displays the name.
 if(!cloud&&!(s.phase==='forecast'&&!v))rect(c,0,0,w,h*.145,'#304f3e');if(cloud||s.phase!=='forecast'||v)rect(c,0,h*.145-7,w,8,cloud?'#e2d6aa':'#b88c5c');
 // v0.15-F: obsolete saturated wall posts were mistaken for controls; remove them from both chapters.
 // The two active stoves are deliberately compact; the centre is reserved for
 // a later third production slot. No area names are printed on screen.
 for(const [i,key] of (v?.kitchenSnapshot?.length>=3||!v&&s.kitchen?.thirdUnlocked?['WOK','POT','CENTER']:['WOK','POT']).entries()){
  const body=i===2?g.reservedStove:i?g.stoveRight:g.stoveLeft,pt=i===2?g.centre:i?g.right:g.left,slot=v?.kitchenSnapshot?.[i]||s.kitchen?.slots?.[i];
  const type=slot?.type||(i===1?'POT':'WOK'),busy=v?.stations?.[key];
  const X=x(body.x),Y=y(body.y),rw=Math.min(58,w*.168);
  if(type==='STEAM'){
   drawCloudSteamerStation(c,X,Y,rw,t,!!busy,slot?.level||1);
  }else if(type==='GRILL'){
   // Low, horizontal charcoal rack, not a cluster of four vertical
   // coloured posts that players could mistake for interactive devices.
   const gw=rw*.95,gy=Y-16;
   rr(X-rw/2,Y-24,rw,51,7,cloud?'#476b80':'#513c30',cloud?'#e5d6ad':'#b99765');
   rr(X-gw/2,gy,gw,27,4,'#353d3e','#d9b879');
   rr(X-gw*.43,gy+3,gw*.86,20,2,'#61362d','#a88b72');
   for(let ember=0;ember<7;ember++)circle(c,X-gw*.33+ember*gw*.11,gy+13+(ember%2)*4,busy?2.2:1.25,busy?'#f1a25b':'#975a3b');
   for(let rail=0;rail<5;rail++)line(c,X-gw*.35+rail*gw*.17,gy+2,X-gw*.35+rail*gw*.17,gy+24,'#a8abaa',1.4);
   for(const [row,sy] of [gy+7,gy+18].entries()){
    line(c,X-gw*.52,sy,X+gw*.52,sy,'#edcf8c',2);
    for(let item=0;item<3;item++){
     const ix=X-gw*.27+item*gw*.27;
     rr(ix-4,sy-2.6,8,5.2,2,busy?(row?'#a76840':'#c89462'):'#ab855f','#f0d39a');
    }
   }
   if(busy)for(let j=0;j<3;j++)circle(c,X-12+j*12,gy-5-Math.sin(t*4+j)*2,1.7,'#e8d8b599');
  }else if(!cloud&&s.phase==='forecast'&&!v){
   if(assetHome)a21DrawRange(c,X,Y,rw,type);else a20Range(c,X,Y,rw,type,!!busy,t);
  }else{
   rr(X-rw/2,Y-24,rw,51,7,cloud?'#476b80':'#513c30',cloud?'#e5d6ad':'#b99765');
   rr(X-rw*.43,Y-20,rw*.86,39,5,cloud?'#9dbabd':'#916d49',cloud?'#e8dcba':'#d8ae74');
   circle(c,X,Y-4,Math.min(21,w*.057),'#d7c19b');
   circle(c,X,Y-4,Math.min(17,w*.047),type==='WOK'?'#394b49':'#587580','#d5c9a7');
   if(type==='POT'){circle(c,X,Y-4,Math.min(11,w*.034),'#ac7a51');rect(c,X-18,Y-7,36,4,'#dbc39a')}
   else line(c,X+12,Y-8,X+24,Y-16,'#d5b47a',4);
   if(busy){for(let j=0;j<2;j++)circle(c,X-7+j*14,Y-18+Math.sin(t*4+j)*2.5,2.5,'#f2e9bcaa')}
  }
  // Equipment level is shown with one understated pip, never a large floating label.
  if(slot?.level>1)circle(c,X+rw*.37,Y-19,3.4,'#ffe3a2');
  const cookProgress=busy?Math.max(0,Math.min(1,1-(busy.left/Math.max(1,RECIPES[v.orders.find(o=>o.id===busy.orderId)?.recipeId]?.time||10)))):0;
  if(!assetHome)rr(X-rw*.34,Y+19,rw*.68,5,3,'#243c33','#b18b64');
  if(busy){rr(X-rw*.33,Y+20,Math.max(2,rw*.66*cookProgress),3,2,'#f6cc82');text(c,Math.ceil(busy.left)+'s',X,Y+33,'#ffe3a8',10);}
  const near=heroZone(v?.hero,s)===key;
  c.beginPath();c.ellipse(x(pt.x),y(pt.y),w*.075,h*.025,0,0,Math.PI*2);
  if(!assetHome){c.lineWidth=1.5;c.strokeStyle=near?'#ffe69f':'#c8b68575';c.stroke();}
 }
 // Before the REAL expansion purchase, show the old sealed central hearth.
 if((v?.kitchenSnapshot?.length||(!v&&s.kitchen?.thirdUnlocked?3:2))<3){
  const reserve=g.reservedStove,RX=x(reserve.x),RY=y(reserve.y);
  rr(RX-21,RY-20,42,42,6,cloud?'#456576':'#463c34',cloud?'#d7cfab':'#907859');
  rr(RX-16,RY-15,32,27,4,cloud?'#688c9b':'#625647',cloud?'#adc9cb':'#927d60');
  line(c,RX-13,RY+8,RX+13,RY-12,'#998469',3);
  line(c,RX-13,RY-12,RX+13,RY+8,'#998469',3);
 }
 // Compact pass counter: continuous centre aisle, no full-width obstruction.
 for(const [from,to] of [[.075,.390],[.610,.925]]){
  rr(x(from),y(g.geometry.counterTop),x(to-from),h*.039,4,cloud?'#5c8395':'#5b3e2e',cloud?'#eee2bd':'#cda575');
  rect(c,x(from),y(g.geometry.counterTop),x(to-from),4,cloud?'#d9e5d6':'#c39965');
  if(!cloud&&s.phase==='forecast'&&!v){
   const px=x(from),py=y(g.geometry.counterTop),pw=x(to-from),ph=h*.039;
   rect(c,px+2,py+4,pw-4,Math.max(3,ph-4),'#875b3c');
   for(let k=1;k<4;k++){const q=px+pw*k/4;line(c,q,py+5,q,py+ph-2,'#503728',1);rect(c,q-5,py+ph*.55,3,2,'#e0b77a');}
   line(c,px,py+ph,px+pw,py+ph,'#4b3429',2);
  }
 }
 rr(x(g.passFurniture.x-.057),y(g.passFurniture.y-.012),x(.114),h*.025,4,cloud?'#a2bdba':'#9e805d',cloud?'#f0e1bd':'#caaa77');
 const pending=v?.orders?.filter(o=>o.status==='pickup')||[];
 pending.slice(0,3).forEach((o,i)=>{dish(c,x(g.passFurniture.x+(i-(Math.min(pending.length,3)-1)/2)*.038),y(g.passFurniture.y+.003),RECIPES[o.recipeId]?.station||'WOK')});
 const target=v?.hero?.carryOrderId?v.orders.find(o=>o.id===v.hero.carryOrderId&&o.status==='carried'):null;
 if(target){const p=g.tableWork[target.tableId];if(p){c.beginPath();c.ellipse(x(p.x),y(p.y),w*.081,h*.034,0,0,Math.PI*2);c.fillStyle='#ffe6a325';c.fill();c.lineWidth=2;c.strokeStyle='#f6d37d';c.stroke();}}
 // Real two-person SQUARE tables. Seats, plates, collision and serving target
 // all correspond to the same canonical room coordinates, even after expansion.
 for(const [i,pt] of g.tables.entries()){
  const X=x(pt.x),Y=y(pt.y),side=Math.min(51,Math.max(39,w*.126)),half=side/2;
  if(cloud)drawCloudCrystalTable(c,X,Y,side,t,i);
  else if(assetHome)a21DrawTable(c,X,Y,side);
  else if(s.phase==='forecast'&&!v)a20Table(c,X,Y,side,i);
  else{
  for(const sign of [-1,1]){
   rr(X+sign*side*.77-8,Y-10,16,24,4,'#4e372c','#a87d56');
   rr(X+sign*side*.77-7,Y-14,14,13,3,'#78573b','#bc9366');
  }
  rr(X-half-3,Y-half+7,side+6,side+5,6,cloud?'#42677c':'#493124',cloud?'#83a7af':'#67462e');
  rr(X-half,Y-half,side,side,5,cloud?'#a6c5c4':i>=2?'#916b48':'#a0754a',cloud?'#e7dab3':'#e0b27b');
  rr(X-half+4,Y-half+4,side-8,side-8,3,cloud?'#c7dcd2':'#ae865a',cloud?'#a3c5c0':'#c69d65');
  line(c,X-half+6,Y-4,X+half-6,Y-4,'#8d6845',1);
  line(c,X-half+6,Y+6,X+half-6,Y+6,'#8d6845',1);
  // A single subtle rune is part of the wood, not an in-world UI name.
  circle(c,X,Y,3,i>=2?'#b2db9e':'#ceb17c');
  if(i>=2){ // low lamps mark the rear extension without a room label
   const lampX=X+(i===2?-1:1)*(half+8);
   line(c,lampX,Y-half-28,lampX,Y-half-8,'#756d56',2);
   circle(c,lampX,Y-half-28,8,i===2?'#72a37f':'#86a6aa');
   circle(c,lampX,Y-half-30,3,'#c1e9a9');
  }
  }
  if(v){
   // Plates remain on the ACTUAL table while visitors eat and review.
   const meals=v.orders.filter(o=>o.tableId===i&&['eating','review'].includes(o.status));
   meals.forEach(o=>{
    const px=X+(o.seatId===0?-1:1)*Math.min(13,side*.24),py=Y+4;
    dish(c,px,py,RECIPES[o.recipeId]?.station||'WOK');
    if(o.status==='eating'&&t-(o.landedAt??t)<.8){
     const shimmer=Math.max(0,1-(t-o.landedAt)/.8);
     c.save();c.globalAlpha=shimmer*.8;
     circle(c,px-8,py-12-Math.sin(t*7)*2,2,'#fff2ae');c.restore();
    }
   });
   const waiting=v.orders.filter(o=>o.tableId===i&&['ordering','queued','cooking','pickup','carried','delivering'].includes(o.status));
   if(waiting.length){
    const patience=Math.min(...waiting.map(o=>o.patience-(t-o.arrival)));
    const urgency=patience<=9?'#ff756e':patience<=16?'#ffc67c':'#a4daaa';
    const pct=Math.max(.04,Math.min(1,patience/35));
    rr(X-half,Y+half+5,side,4,2,'#392c25');
    rr(X-half,Y+half+5,Math.max(2,side*pct),4,2,urgency);
    const icon=RECIPES[waiting[0].recipeId]?.name||'点餐';
    text(c,icon,X,Y+4,'#ffe4af',14);
   }
  }
 }
 // Natural wall lamps anchor the interior; the 4 inert coloured vertical
 // pantry sticks at x=.15..315 and y=.185 looked like mysterious controls.
 // They had no mechanics and are removed in BOTH worlds (v0.15-G).
 for(const [sx,shade] of [[.088,'#76a17f'],[.912,'#8d9b7d']]){
  if(assetHome){const sw=Math.min(29,w*.08);a21Sprite(c,'lantern',x(sx)-sw/2,y(.185)-sw*37/26,sw,sw*37/26);continue;}
  line(c,x(sx),y(.144),x(sx),y(.187),'#b69c72',2);
  circle(c,x(sx),y(.190),8,shade);
  circle(c,x(sx)-2,y(.187),2,'#e4e3ae');
 }
 // Outside seen through an actual doorway opening, not a floating status card.
 drawDinerDoorway(c,s,v?.time??t,w,h);
 // Subtle planters on the INSIDE flanking the glass view.
 for(const px of [.09,.91]){rr(x(px)-6,y(.860),12,18,3,'#6f4b32');circle(c,x(px),y(.855),9,'#62916c')}
 const actors=restaurantActorsV075(s,t);
 if(!v){
  const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false;
  // The idle room has no active orders. This is a small visual cue only.
  for(const stove of reduced?[]:[g.stoveLeft,g.stoveRight,...(s.kitchen?.thirdUnlocked?[g.reservedStove]:[])]){
   const X=x(stove.x),Y=y(stove.y);
   for(let i=0;i<2;i++)circle(c,X+(i?5:-4),Y-23-((t*8+i*7)%14),2.1,'#eee0b286');
  }
 }
 // The dialogue slots attach to actual seated actors. Only high-signal
 // transient phrases survive, with one bubble per table and no stick overlays.
 const speechCues=selectDiningSpeech(v?.orders||[],t,2);
 const speechActors=new Map(actors.filter(a=>a.order&&(!a.walk||['left','rejected'].includes(a.order.status))).map(a=>[a.id,a]));
 const visibleSpeech=speechCues.filter(q=>speechActors.has(q.id));
 // Customer urgency and actual reviews always beat optional worker banter.
 const workerCue=selectStaffSpeech(s,t,visibleSpeech);
 const workerActor=workerCue?actors.find(a=>a.id===workerCue.staffRole):null;
 const speechPlacements=placeRestaurantSpeech(visibleSpeech,workerCue,actors,w,h);
 for(const a of actors)a.speechPlacement=speechPlacements.get(a.id)||(workerCue&&a.id===workerCue.staffRole?speechPlacements.get(workerCue.id):null);
 const speaking=new Set(visibleSpeech.map(q=>q.id));
 for(const a of actors){
  const X=x(a.x),Y=y(a.y)+(a.order?.status==='eating'?Math.sin(t*5+Number(a.order.seatId||0))*.9:0);
  // No permanent player-foot overlay; interaction progress is on the action guide.
  pixelActor(c,a.kind,X,Y,DINER_ACTOR_SCALE,{walk:a.walk?t*2:0,
    face:a.direction==='left'?-1:1,attack:!!a.working,level:a.level||1});
  // Feet overlap the chair, not the floor next to it. The cushion lip
  // masks the lower legs, producing a seated read without a sprite sheet.
  if(a.seat&&a.order){
   const pt=g.tables[a.order.tableId],chairSide=a.order.seatId===0?-1:1;
   if(pt){const cx=x(pt.x)+chairSide*Math.min(51,Math.max(39,w*.126))*.77;
    rr(cx-10,y(pt.y)+10,20,7,3,'#a77c50','#c69c6d');
   }
  }
  if(a.plate)dish(c,X+14,Y-12,RECIPES[a.plateRecipeId]?.station||'WOK');
  if(['left','rejected'].includes(a.order?.status)&&t-(a.order.leftAt??t)<1.1){
   // Short angry-exit cue, anchored to the REAL walking guest.
   line(c,X-9,Y-28,X-4,Y-32,'#f4a48b',2);
   line(c,X-3,Y-32,X+3,Y-30,'#f4a48b',2);
  }
  if(a.order?.status==='eating'){
   // Low-key cutlery gesture, same actor scale and no extra speech sprite.
   const bite=Math.sin(t*5+(a.order.seatId||0))*.9;
   line(c,X-12,Y-18+bite,X-9,Y-25+bite,'#f6dfac',1.4);
  }
  if(a.id==='hero'){
   const hero=v.hero,focus=hero.dwellZone;
   // Dwell progress lives in the service action strip.
   const icon=a.working?'🍳':a.stateIcon;
   if(icon&&a.working)text(c,'烹饪中',X,Y-30,'#ffe8b9',10);
  }
  if(a.order){
   const o=a.order;
   if(!speaking.has(o.id)&&['queued','cooking','pickup','carried','delivering'].includes(o.status))
    text(c,RECIPES[o.recipeId]?.name||'点餐',X,Y-34,'#fff2c9',10);
   if(!speaking.has(o.id)&&(o.status==='review'||(o.status==='served'&&t-(o.reviewedAt??0)<1.1)))
    text(c,o.sat>=70?'💚':'💬',X,Y-34,'#ffe6bd',15);
  }
 }
 for(const cue of visibleSpeech){const speaker=speechActors.get(cue.id);if(speaker)drawGuestSpeech077(c,cue,speaker,w,h)}
 if(workerCue&&workerActor)drawStaffSpeech078(c,workerCue,workerActor,w,h);
 if(!v){
  const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false;
  const cue=homeKitchenChatter(s,t,reduced),speaker=actors.find(a=>a.id===cue?.actor);
  if(speaker){
   const X=x(speaker.x),Y=y(speaker.y)-40,wide=Math.min(w-16,Math.max(96,cue.text.length*10+15));
   const bx=Math.max(8,Math.min(w-wide-8,X-wide/2)),by=Math.max(8,Y-25);
   c.save();c.globalAlpha=Math.min(.95,(2.4-t%19)*1.7);rr(bx,by,wide,24,7,'#eff2da','#8ba789');
   text(c,cue.text,bx+wide/2,by+13,'#2e4b3b',10);c.restore();
  }
 }
}

export function drawDiner(canvas,s,clock,simTime=s.service?.time??clock){
 const size=setCanvas(canvas);if(!size)return;
 const {c,w,h}=size,v=s.service,t=v?simTime:clock;
 if(v?.walkable||!v){
  const y2=globalThis.__oddpotY2Renderer;
  if(y2&&y2.draw(canvas,s,t,w,h,restaurantActorsV075))return;
  drawRestaurantV075(c,s,t,w,h);return;
 }
 rect(c,0,0,w,h,'#66523e');
 for(let y=0;y<h;y+=24){rect(c,0,y,w,22,y%48===0?'#765d46':'#71563f');line(c,0,y,w,y,'#674b34',1)}
 // A little wider than v0.5B, but without stretching character proportions.
 c.save();c.translate(w*.095,h*.075);c.scale(.81,.82);
 rect(c,0,0,w,h*.20,'#4c7158');rect(c,w*.1,14,w*.31,26,'#d0a56b');text(c,'ODDPOT',w*.25,28,'#48382a',13);
 rect(c,w*.77,7,w*.13,43,'#346064');rect(c,w*.80,7,w*.018,43,'#c9dac6');
 for(let i=0;i<2;i++){
  const x=w*(i===0?.21:.79),slot=s.kitchen?.slots?.[i],isPot=(slot?.type||(i?'POT':'WOK'))==='POT';
  rect(c,x-45,h*.24-16,90,62,'#694c33');rect(c,x-40,h*.24-11,80,52,'#b58457');
  circle(c,x,h*.24,24,isPot?'#7296a0':'#576d69');circle(c,x,h*.24,17,'#3b4545');
  if(isPot)rect(c,x-25,h*.24-4,50,6,'#8eabb0');else line(c,x-21,h*.24,x-41,h*.24-10,'#ddbc81',5);
  if(slot?.level===2){circle(c,x+26,h*.24-23,8,'#f2d584');text(c,'Ⅱ',x+26,h*.24-23,'#564627',10)}
  const busy=v?.stations[i===0?'WOK':'POT'];if(busy){for(let j=0;j<3;j++)circle(c,x-15+j*14,h*.24-23+Math.sin(t*2+j)*2.4,4,'#f3e1bd99');
   text(c,`${Math.max(0,Math.ceil(busy.left))}s`,x,h*.24+37,'#fff4ce',12)}
 }
 // Cooking steam and gentle work motions remain tied to the simulation clock.
 for(const [idx,station] of ['WOK','POT'].entries()){if(!v?.stations[station])continue;const xx=w*(idx===0?.21:.79);circle(c,xx+Math.sin(t*.65+idx)*5,h*.20-20,3,'#eed9b55c');}
 rect(c,w*.14,h*.43,w*.72,17,'#6b4930');rect(c,w*.14,h*.43,w*.72,7,'#d7a96d');
 // Two real chairs per table, with reserved physical positions.
 for(let i=0;i<2;i++){
  const x=w*(i===0?.28:.72),y=h*.60;
  for(let seat=0;seat<2;seat++){const pos=seatLocation(i,seat,w,h);
   rect(c,pos.x-13,pos.y+16,26,14,'#684931');rect(c,pos.x-10,pos.y+18,20,9,'#b68a62');}
  circle(c,x,y+9,49,'#4b3526a8');circle(c,x,y,43,'#654a35');circle(c,x,y-5,38,'#c08b5a');
 }
 // Serving is one transaction but a visible plate enters only after landing.
 const serveEvents=(v?.events||[]).filter(e=>e.type==='throw');
 if(v?.walkable){
  const waiting=v.orders.filter(o=>o.status==='pickup');
  waiting.forEach((o,i)=>dish(c,w*(.5+(i-(waiting.length-1)/2)*.035),h*.425,RECIPES[o.recipeId]?.station||'WOK'));
  // Plates delivered by feet are placed at their destination, never re-thrown.
  for(const o of v.orders){if(!o.deliveryMode||o.tableId==null||!['flying','eating','review','served'].includes(o.status))continue;
   const x=w*(o.tableId===0?.28:.72)+(o.seatId===0?-13:13),y=h*.60-9;
   if(o.status!=='served'||t-(o.reviewedAt??o.served)<1.5)dish(c,x,y,RECIPES[o.recipeId]?.station||'WOK');
  }
 }
 for(const e of serveEvents){const o=v.orders.find(order=>order.id===e.order);if(!o||o.tableId==null)continue;
  const progress=plateFlight(t,e.t,2);if(t-e.t>8)continue;
  const center=w*(o.tableId===0?.28:.72),tx=center+(o.seatId===0?-13:13),ty=h*.60-9;
  if(progress.flying){
    const p=smooth(progress.progress),sx=w*.5,sy=h*.42;
    const x=lerp(sx,tx,p),y=lerp(sy,ty,p)-35*4*p*(1-p);
    circle(c,x-12*p,y+10,3,'#f5e9c17a');dish(c,x,y,RECIPES[o.recipeId]?.station||'WOK');
  }else if(progress.landed&&(['eating','review'].includes(o.status)||(o.status==='served'&&t-(o.reviewedAt??o.served)<1.5))){dish(c,tx,ty,RECIPES[o.recipeId]?.station||'WOK');}
 }
 // Characters are drawn in separate chair slots after table/plate geometry.
 if(v){const occupants=v.orders.filter(o=>o.tableId!=null&&(
   ['entering','ordering','queued','cooking','pickup','carried','delivering','flying','eating','review'].includes(o.status)||(o.status==='served'&&t-(o.reviewedAt??o.served)<2.2)||(['left','rejected'].includes(o.status)&&Number.isFinite(o.leftAt)&&t-o.leftAt<2.5)));
  for(const o of occupants)walkGuest(c,o,v,t,w,h);
  paintDinerStaff(c,s,v,t,w,h);
  for(const bubble of dinerBubbleLayout(occupants,t,w,h))drawReviewBubble(c,bubble);
 }else paintDinerStaff(c,s,v,t,w,h);
 rect(c,w*.45,h*.87,w*.1,h*.11,'#b98b62');rect(c,w*.47,h*.87,w*.06,h*.07,'#2b473a');
 for(const [x,y] of [[w*.12,h*.83],[w*.88,h*.82]]){rect(c,x-4,y+5,8,15,'#795436');circle(c,x,y,11,'#5d975d')}
 c.restore();
}
