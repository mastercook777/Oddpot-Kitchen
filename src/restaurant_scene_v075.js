// Oddpot v0.7.5 canonical restaurant floor plan.
// Every live-scene station, zone, furniture shape and route uses this world.
// Coordinates are fractions of the SAME untransformed Canvas drawing space.
// Internal worldbuilding IDs are deliberately NOT drawn as room labels.
// All stations, seats, route waypoints and physical obstacles share this layout.
export const RESTAURANT_LORE=Object.freeze({
 entrance:'gurgle-porch',front:'warm-hearth-hall',alcove:'spore-lantern-alcove',
 kitchen:'ember-range',reservedStation:'sealed-third-hearth'
});
export const DINER_FLOOR={
 left:{x:.245,y:.325},right:{x:.755,y:.325},centre:{x:.500,y:.325},
 stoveLeft:{x:.245,y:.240},stoveRight:{x:.755,y:.240},
 reservedStove:{x:.500,y:.240},
 pass:{x:.50,y:.448},passFurniture:{x:.50,y:.397},
 // Two stools face each other across each compact square table.
 tables:[{x:.255,y:.745},{x:.745,y:.745}],
 tableWork:[{x:.385,y:.752},{x:.615,y:.752}],
 // The expansion opens a genuine rear-left alcove, not a third crowded row.
 expandedTables:[{x:.255,y:.745},{x:.745,y:.745},{x:.255,y:.555}],
 expandedTableWork:[{x:.385,y:.752},{x:.615,y:.752},{x:.385,y:.562}],
 fourTables:[{x:.255,y:.745},{x:.745,y:.745},{x:.255,y:.555},{x:.745,y:.555}],
 fourTableWork:[{x:.385,y:.752},{x:.615,y:.752},{x:.385,y:.562},{x:.615,y:.562}],
 entrance:{x:.50,y:.930},
 waitLane:{x:.50,y:.620},
 doorwayView:{left:.185,right:.815,top:.857,bottom:.985},
 helper:[{x:.120,y:.325},{x:.880,y:.325},{x:.412,y:.324}],
 margin:{left:.075,right:.925,top:.165,bottom:.945},
 geometry:{tableHalfX:.088,tableHalfY:.046,stoveHalfX:.085,stoveHalfY:.046,
  counterTop:.388,counterBottom:.428,counterGapLeft:.410,counterGapRight:.590}
};
export function dinerSeatPoint(table,seat,s=null){
 const g=dinerFloor(s),pt=g.tables[table];
 if(!pt)return null;
 // The sprite's feet land ON the chair; a +.042 offset placed guests on the floor below it.
 return {x:pt.x+(seat===0?-.102:.102),y:pt.y+.002};
}
export function dinerGuestRoute(table,seat,s=null){
 const g=dinerFloor(s),target=dinerSeatPoint(table,seat,s);
 if(!target)return [g.entrance];
 const pt=g.tables[table],aisleY=Math.min(.848,pt.y+.112);
 return [{x:g.entrance.x,y:g.entrance.y},{x:.5,y:aisleY},
  {x:target.x,y:aisleY},target];
}
export function dinerFloor(s){
 const count=s?.dining?.tableCount||s?.service?.tableCount||2;
 return count>=4?{...DINER_FLOOR,tables:DINER_FLOOR.fourTables,tableWork:DINER_FLOOR.fourTableWork}:
  count>=3?{...DINER_FLOOR,tables:DINER_FLOOR.expandedTables,tableWork:DINER_FLOOR.expandedTableWork}:DINER_FLOOR;
}
const clamp075=(x,a,b)=>Math.max(a,Math.min(b,x));
const close075=(a,b,rx,ry)=>((a.x-b.x)/rx)**2+((a.y-b.y)/ry)**2<1;
export function dinerSpot(hero,s=null){
 if(!hero)return null;
 const g=dinerFloor(s);
 if(close075(hero,g.pass,.100,.055))return 'PASS';
 if(close075(hero,g.left,.108,.060))return 'WOK';
 if(close075(hero,g.right,.108,.060))return 'POT';
 if((s?.service?.kitchenSnapshot?.length||0)>=3&&close075(hero,g.centre,.085,.056))return 'CENTER';
 for(let i=0;i<g.tableWork.length;i++)if(close075(hero,g.tableWork[i],.078,.070))return 'TABLE'+i;
 return null;
}
export function dinerBlocked(x,y,s=null){
 const g=dinerFloor(s);
 if(x<g.margin.left||x>g.margin.right||y<g.margin.top||y>g.margin.bottom)return true;
 // Solid counters have a central pass-through opening. The chef can get
 // from kitchen to dining without walking through stove fronts.
 if(y>g.geometry.counterTop&&y<g.geometry.counterBottom&&(x<g.geometry.counterGapLeft||x>g.geometry.counterGapRight))return true;
 if(close075({x,y},g.stoveLeft,g.geometry.stoveHalfX,g.geometry.stoveHalfY)||close075({x,y},g.stoveRight,g.geometry.stoveHalfX,g.geometry.stoveHalfY))return true;
 if(close075({x,y},g.reservedStove,.071,.047))return true;
 for(const p of g.tables)if(Math.abs(x-p.x)<g.geometry.tableHalfX&&Math.abs(y-p.y)<g.geometry.tableHalfY)return true;
 return false;
}
export function dinerWalk(hero,dx,dy,dt,s=null){
 const g=dinerFloor(s);
 if(!hero||![dx,dy,dt].every(Number.isFinite))return false;
 const length=Math.hypot(dx,dy);
 dt=clamp075(dt,0,.06);
 if(length<.12||!dt){hero.moving=false;return false}
 dx/=Math.max(1,length);dy/=Math.max(1,length);
 // Equivalent on-screen speed in either direction on 9:16 viewports.
 // The hero is never enlarged to improve legibility.
 const oldX=hero.x,oldY=hero.y;
 const nx=clamp075(hero.x+dx*.40*dt,g.margin.left,g.margin.right);
 const ny=clamp075(hero.y+dy*.30*dt,g.margin.top,g.margin.bottom);
 if(!dinerBlocked(nx,hero.y,s))hero.x=nx;
 if(!dinerBlocked(hero.x,ny,s))hero.y=ny;
 hero.moving=Math.hypot(hero.x-oldX,hero.y-oldY)>.00001;
 if(hero.moving)hero.direction=Math.abs(dx)>Math.abs(dy)?dx<0?'left':'right':dy<0?'up':'down';
 return hero.moving;
}
export function dinerWaiterRoute(s,simTime){
 const v=s?.service,g=dinerFloor(s),home=g.pass;
 const moving=v?.orders?.find(o=>o.status==='delivering'&&Number.isFinite(o.deliveryAt));
 let target=null,progress=0,returning=false,plate=false;
 if(moving){target=moving.tableId;progress=clamp075((simTime-moving.deliveryAt)/3,0,1);plate=true}
 else {
  const last=(v?.events||[]).slice().reverse().find(e=>e.type==='waiter_return'&&simTime-e.t>=0&&simTime-e.t<2);
  if(last){target=last.table;progress=1-clamp075((simTime-last.t)/2,0,1);returning=true}
 }
 if(target==null)return {...home,moving:false,plate:false};
 const via=g.waitLane,end=g.tableWork[target]||via;
 // Continuous two-segment path. Return uses exact reversed geometry.
 const point=progress<.40?
   {x:home.x+(via.x-home.x)*progress/.40,y:home.y+(via.y-home.y)*progress/.40}:
   {x:via.x+(end.x-via.x)*(progress-.40)/.60,y:via.y+(end.y-via.y)*(progress-.40)/.60};
 return {...point,moving:true,plate,returning,table:target};
}
export function dinerPickupTarget(table,s=null){const g=dinerFloor(s);return g.tableWork[table]||g.pass}

// A deterministic *in-game* weather vignette. This is decorative only and
// never claims to represent real-world weather or change game difficulty.
export function dinerWeather(s){
 const scenario=s?.service?.scenario||'';
 if(scenario==='雨夜暖汤')return 'rain';
 const day=(s?.cycle||1)*11+(s?.day||1)*19,seed=Number(s?.seed)||0;
 const mixed=(Math.imul((seed^day)>>>0,1664525)+1013904223)>>>0;
 return ['clear','clear','mist','breeze','rain'][mixed%5];
}
export function dinerQueueGuests(s,at=s?.service?.time||0){
 return (s?.service?.orders||[]).filter(o=>o.status==='waiting'&&o.arrival<=at);
}
