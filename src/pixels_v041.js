// v0.4.1 original 16x24-ish pixel actors. Raster blocks rendered at integer scale,
// so these are maintainable gameplay sprites rather than platform emoji or external art.
const P={outline:'#2b3334',skin:'#e4b18a',skinLight:'#f7d0a1',white:'#f5ead1',shadow:'#534b48'};
function r(c,x,y,w,h,col){c.fillStyle=col;c.fillRect(x|0,y|0,w|0,h|0)}
// v0.12-D staff apparel is layered onto the ORIGINAL working pixel actor.
// The descriptor and the painted silhouette share one authoritative level contract.
export const CREW_APPEARANCES={
 helper2:[
  {label:'见习后厨',uniform:'炭蓝短衫 · 杏色厨帽',accent:'#527d85'},
  {label:'资深后厨',uniform:'铜蓝厨衣 · 绒白围裙',accent:'#639a9c'},
  {label:'炉火匠人',uniform:'金边烟蓝高帽 · 琥珀徽章',accent:'#e4b768'}],
 helper:[
  {label:'见习帮厨',uniform:'经典橙色厨衣',accent:'#d27a46'},
  {label:'熟练厨师',uniform:'铜红厨衣 · 奶油围裙 · 厨帽束带',accent:'#d49b68'},
  {label:'火候大师',uniform:'金纹高帽 · 火焰徽章 · 大师围裙',accent:'#f2bf62'}],
 waiter:[
  {label:'见习跑堂',uniform:'经典草绿制服',accent:'#708d62'},
  {label:'资深侍者',uniform:'湖绿马甲 · 金色领结 · 帽徽',accent:'#7fc0a2'},
  {label:'明星管家',uniform:'松绿礼服 · 金色肩章 · 星纹帽徽',accent:'#e8cf7b'}]
};
export function crewAppearance(kind,rawLevel=1){
 const outfits=CREW_APPEARANCES[kind];
 if(!outfits)return null;
 const level=Number.isInteger(rawLevel)&&rawLevel>=1&&rawLevel<=3?rawLevel:1;
 return {role:kind,level,...outfits[level-1]};
}
function paintCrewRank(c,kind,level,arm){
 if(kind!=='helper'&&kind!=='helper2'&&kind!=='waiter'||level<=1)return;
 if(kind==='helper2'){r(c,4,10,11,9,level>=3?'#356275':'#56838b');r(c,5,14,9,5,'#e6e5cb');r(c,7,-4,7,3,'#87b4b1');if(level>=3){r(c,6,-8,7,4,'#f3dfbc');r(c,9,11,3,3,'#e7b76c')}return;}
 if(kind==='helper'){
  // Same 18x24 actor. Rank 2: copper jacket, chef cap ribbon, cream apron.
  r(c,4,10,11,3,'#bd6e45');
  r(c,5,12,8,8,'#f1e3c2');
  r(c,7,12,4,2,'#e2b46d');r(c,8,14,2,5,'#a95f3c');
  r(c,4,15,2,3,'#d5a06a');r(c,13,15+arm,2,3,'#d5a06a');
  r(c,4,0,11,2,'#b36b48');
  r(c,6,-3,7,2,'#fff3dc');
  if(level>=3){
   // Rank 3: visibly taller layered master hat + copper flame crest.
   r(c,5,-7,9,6,P.outline);r(c,6,-7,7,5,'#fff2d8');
   r(c,7,-9,5,3,P.outline);r(c,8,-9,3,3,'#f2b85b');
   r(c,3,0,13,2,'#edc26a');
   r(c,4,10,11,3,'#773d33');r(c,5,12,8,8,'#f9e7b8');
   r(c,8,13,2,7,'#bf693d');
   r(c,3,11,3,3,'#edb763');r(c,14,11+arm,3,3,'#edb763');
   // Tiny independent flame insignia remains visible at full diner size.
   r(c,11,12,2,4,'#dd7c34');r(c,11,11,1,2,'#ffd473');
   r(c,5,17,2,2,'#b77245');r(c,12,17,2,2,'#b77245');
  }
 }else{
  // Rank 2: distinct lake-green waistcoat, pearl lapels and gold tie.
  r(c,4,10,11,10,'#438a79');
  r(c,6,11,3,5,'#e5e9c9');r(c,11,11,2,5,'#e5e9c9');
  r(c,8,13,3,3,'#f1bc65');
  r(c,6,18,8,2,'#2c6655');
  r(c,3,0,13,2,'#518b76');r(c,7,-3,6,2,'#e4bd6b');
  if(level>=3){
   // Rank 3: deep emerald formal coat, luminous trim & high heraldic cap.
   r(c,3,9,13,11,P.outline);r(c,4,10,11,10,'#254c47');
   r(c,5,10,3,9,'#2f7166');r(c,11,10,3,9,'#2f7166');
   r(c,7,11,4,7,'#f7e5c0');
   r(c,8,12,2,4,'#d5a957');
   r(c,3,10,4,2,'#dfbc6c');r(c,13,10+arm,4,2,'#dfbc6c');
   r(c,6,18,8,2,'#d9be76');
   r(c,4,-5,11,6,P.outline);r(c,5,-5,9,5,'#2a5750');
   r(c,2,0,15,2,'#e0c271');
   r(c,8,-5,3,3,'#f4d275');r(c,9,-7,1,4,'#f8e29b');
  }
 }
}
function person(c,kind,walk,attack,level=1){
 const p={chef:['#477a91','#e7d4a7','#7e4f37'],helper:['#d27a46','#f2d69a','#654730'],waiter:['#708d62','#dfc18e','#466251'],adventurer:['#4d8a66','#c59d55','#5d4630'],family:['#d67872','#f0cf79','#8a5747'],regular:['#729aba','#9bc1ce','#6c5440'],critic:['#795777','#bb9abd','#362e48'],stargazer:['#41576e','#c3b67e','#7f5c91']}[kind]||['#729aba','#9bc1ce','#6c5440'];
 const step=walk?Math.round(Math.sin(walk*13)*2):0,arm=attack? -7:Math.round(Math.sin(walk*13+2)*1);
 // Shoes, alternating leg pixels, outlined torso/arms, expressive large face.
 r(c,3,18+step,5,5,P.outline);r(c,10,18-step,5,5,P.outline);
 r(c,4,19+step,3,4,'#56493e');r(c,11,19-step,3,4,'#56493e');
 r(c,3,9,13,12,P.outline);r(c,4,10,11,10,p[0]);
 r(c,1,10,4,8,P.outline);r(c,2,11,3,6,p[0]);
 r(c,14,10+arm,4,8,P.outline);r(c,15,11+arm,2,6,p[0]);
 r(c,5,11,8,8,p[1]);r(c,8,11,2,6,kind==='chef'?'#d26f52':p[0]);
 r(c,3,2,13,11,P.outline);r(c,4,3,11,9,P.skin);r(c,5,4,9,6,P.skinLight);
 r(c,5,6,2,2,P.outline);r(c,12,6,2,2,P.outline);r(c,9,9,3,1,'#9d644f');
 if(kind==='chef'||kind==='helper'||kind==='helper2'){
  r(c,2,1,15,4,P.outline);r(c,3,1,13,3,P.white);r(c,5,-4,9,6,P.outline);r(c,6,-4,7,5,P.white);r(c,8,-6,4,3,P.white);
 }else if(kind==='waiter'){
  r(c,2,0,14,3,'#466251');r(c,6,-2,7,3,'#ddc391');r(c,6,13,8,3,'#e9daa7');
 }else if(kind==='adventurer'){
  // Ironhorn dwarf: horned helmet, copper beard and heavy travel pack.
  r(c,2,1,15,4,P.outline);r(c,4,0,12,4,'#8d7660');r(c,1,-3,4,5,'#ddd0a5');r(c,14,-3,4,5,'#ddd0a5');
  r(c,5,9,9,4,'#ab6a3d');r(c,8,11,3,4,'#b87d43');r(c,14,11,4,8,'#8c764b');
 }else if(kind==='critic'){
  // Floating ghost critic, veil and lilac ectoplasm rather than a normal human.
  r(c,3,0,13,4,P.outline);r(c,4,-2,11,4,'#d8c6ed');r(c,1,3,4,8,'#9275ae');r(c,14,3,4,8,'#9275ae');
  r(c,3,18,12,4,'#bb9ad3');r(c,5,13,8,2,'#d4b16d');
 }else if(kind==='family'){
  // Spotted mushroom-cap people, silhouette still legible at phone size.
  r(c,1,1,17,4,'#a34c5b');r(c,3,-3,13,5,'#d26c79');r(c,5,-2,3,2,'#fff0c6');r(c,12,0,2,2,'#fff0c6');
  r(c,2,3,4,8,p[2]);r(c,15,3,3,8,p[2]);
 }else if(kind==='stargazer'){
  // Pointed night-blue hood, gold star pin and a small travel satchel.
  r(c,3,-2,13,7,P.outline);r(c,5,-4,9,7,'#41576e');
  r(c,2,1,4,9,'#566c87');r(c,14,1,4,9,'#566c87');
  r(c,14,11,5,7,'#8b658f');r(c,15,12,2,2,'#f8df90');
  r(c,8,-3,3,3,'#f7d97b');r(c,9,-5,1,7,'#f7d97b');r(c,7,-3,5,1,'#f7d97b');
 }else{
  // Slime villager: translucent turquoise head and bobbing droplets.
  r(c,3,0,13,4,'#52ae9d');r(c,4,3,5,2,'#70debc');r(c,1,1,2,2,'#8be9d3');r(c,15,1,2,2,'#8be9d3');
 }
 // The newest kitchen worker is recognisable at Lv1 without enlarging the silhouette.
 if(kind==='helper2'){r(c,4,11,11,5,'#547f87');r(c,5,15,9,5,'#e9d4a5');r(c,7,1,5,2,'#7ca3a1');if(level>=2)paintCrewRank(c,kind,level,arm);}
 else paintCrewRank(c,kind,level,arm);
 if(attack){
  // A readable, off-center utensil silhouette synchronized to the attack state.
  r(c,17,-1,2,12,'#b7c4b8');r(c,14,-4,8,4,P.outline);r(c,15,-4,6,3,'#e2ddc3');
 }
}
export function pixelActor(c,kind,x,y,scale=2.4,options={}){
 c.save();c.translate(Math.round(x),Math.round(y));const face=options.face??1;
 c.scale((face<0?-1:1)*scale,scale);c.translate(-9,-12);
 if(options.hurt&&Math.floor(options.hurt*20)%2===0)c.globalAlpha=.44;
 person(c,kind,options.walk||0,options.attack||false,crewAppearance(kind,options.level)?.level||1);
 c.restore();
}
export function pixelEnemy(c,kind,x,y,scale=2.4,options={}){
 c.save();c.translate(Math.round(x),Math.round(y));c.scale((options.face||1)<0?-scale:scale,scale);c.translate(-9,-10);
 const bounce=Math.sin((options.walk||0)*12)*1.5;
 if(options.hurt&&Math.floor(options.hurt*22)%2===0)c.globalAlpha=.36;
 if(kind==='sporeling'){
  // Animated purple fungus with luminous spores, distinct from pepper.
  r(c,6,14+bounce,4,5,P.outline);r(c,11,14-bounce,4,5,P.outline);
  r(c,4,7,12,11,P.outline);r(c,5,7,10,10,'#a88bc4');
  r(c,1,5,18,7,P.outline);r(c,2,4,16,7,'#9e67b9');
  r(c,5,1,11,5,'#d6acdc');r(c,5,4,3,2,'#eed9eb');r(c,13,3,3,3,'#eed9eb');
  r(c,8,11,2,2,P.outline);r(c,12,11,2,2,P.outline);
 }else if(kind==='boar'){
  // Stocky meat boar: charge attack rather than a ranged projectile.
  r(c,1,13+bounce,5,6,P.outline);r(c,13,13-bounce,5,6,P.outline);
  r(c,2,4,16,13,P.outline);r(c,3,5,14,11,'#87593e');
  r(c,0,3,6,6,'#483832');r(c,14,3,6,6,'#483832');
  r(c,5,9,10,6,'#bd9271');r(c,5,12,3,3,'#483832');r(c,12,12,3,3,'#483832');
  r(c,3,10,3,4,'#eee4c9');r(c,14,10,3,4,'#eee4c9');
  r(c,6,6,2,2,'#fff4d5');r(c,13,6,2,2,'#fff4d5');
 }else if(kind==='steam_crab'){
  // Steam shell hides until it lunges; distinctive horizontal silhouette.
  r(c,0,12+bounce,6,4,'#3f5853');r(c,14,12-bounce,6,4,'#3f5853');
  r(c,1,8,5,6,'#7c9d8d');r(c,14,8,5,6,'#7c9d8d');
  r(c,3,7,14,11,P.outline);r(c,4,7,12,10,'#6d9b96');r(c,6,4,8,7,'#a2c9b8');
  r(c,6,10,2,2,P.outline);r(c,12,10,2,2,P.outline);
  r(c,8,2,4,3,'#e2f1d6');
 }else if(kind==='chicken'){
  r(c,3,15+bounce,4,6,P.outline);r(c,12,15-bounce,4,6,P.outline);
  r(c,3,4,14,13,P.outline);r(c,4,5,12,11,'#e6cca1');r(c,2,8,5,6,'#d8b482');
  r(c,6,0,3,6,'#ba5545');r(c,10,-2,4,8,'#c7694a');
  r(c,11,7,3,3,P.outline);r(c,14,10,5,4,'#dc8b50');r(c,6,14,6,2,'#f3e7c6');
 }else{
  r(c,6,15+bounce,3,5,P.outline);r(c,12,15-bounce,3,5,P.outline);
  r(c,3,3,14,15,P.outline);r(c,4,4,12,12,'#b74637');r(c,5,2,10,7,'#e3764a');
  r(c,8,-2,3,7,'#466d36');r(c,10,0,5,3,'#729849');
  r(c,6,9,3,3,P.outline);r(c,12,9,3,3,P.outline);
  r(c,7,14,6,2,'#e7a26a');
 }
 c.restore();
}
export function pixelImpact(c,x,y,size=13,accent='#fff0a1'){
 c.save();c.translate(x,y);r(c,-2,-size-3,4,size*2+6,accent);r(c,-size-3,-2,size*2+6,4,accent);
 c.rotate(Math.PI/4);r(c,-1,-size+2,2,size*2-4,'#fff9d8');r(c,-size+2,-1,size*2-4,2,'#fff9d8');c.restore();
}
