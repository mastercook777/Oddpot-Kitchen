// Oddpot v0.7.5 canonical restaurant floor plan.
// Every live-scene station, zone, furniture shape and route uses this world.
// Coordinates are fractions of the SAME untransformed Canvas drawing space.
export const DINER_FLOOR={
 left:{x:.245,y:.365},right:{x:.755,y:.365},
 stoveLeft:{x:.245,y:.268},stoveRight:{x:.755,y:.268},
 pass:{x:.50,y:.485},passFurniture:{x:.50,y:.427},
 tables:[{x:.265,y:.716},{x:.735,y:.716}],
 tableWork:[{x:.265,y:.605},{x:.735,y:.605}],
 // A third table opens the back-left alcove; keep the centre entry aisle open.
 expandedTables:[{x:.265,y:.655},{x:.735,y:.655},{x:.265,y:.85}],
 expandedTableWork:[{x:.265,y:.547},{x:.735,y:.547},{x:.265,y:.74}],
 entrance:{x:.5,y:.915},
 waitLane:{x:.5,y:.588},
 helper:[{x:.145,y:.345},{x:.855,y:.345}],
 margin:{left:.095,right:.905,top:.155,bottom:.915}
};
export function dinerFloor(s){
 const count=s?.service?.tableCount||s?.dining?.tableCount||2;
 return count>=3?{...DINER_FLOOR,tables:DINER_FLOOR.expandedTables,tableWork:DINER_FLOOR.expandedTableWork}:DINER_FLOOR;
}
const clamp075=(x,a,b)=>Math.max(a,Math.min(b,x));
const close075=(a,b,rx,ry)=>((a.x-b.x)/rx)**2+((a.y-b.y)/ry)**2<1;
export function dinerSpot(hero,s=null){
 if(!hero)return null;
 const g=dinerFloor(s);
 if(close075(hero,g.pass,.105,.062))return 'PASS';
 if(close075(hero,g.left,.145,.072))return 'WOK';
 if(close075(hero,g.right,.145,.072))return 'POT';
 for(let i=0;i<g.tableWork.length;i++)if(close075(hero,g.tableWork[i],.15,.080))return 'TABLE'+i;
 return null;
}
export function dinerBlocked(x,y,s=null){
 const g=dinerFloor(s);
 if(x<g.margin.left||x>g.margin.right||y<g.margin.top||y>g.margin.bottom)return true;
 // Solid counters have a central pass-through opening. The chef can get
 // from kitchen to dining without walking through stove fronts.
 if(y>.432&&y<.476&&(x<.411||x>.589))return true;
 if(close075({x,y},g.stoveLeft,.115,.069)||close075({x,y},g.stoveRight,.115,.069))return true;
 for(const p of g.tables)if(close075({x,y},p,.160,.079))return true;
 return false;
}
export function dinerWalk(hero,dx,dy,dt,s=null){
 if(!hero||![dx,dy,dt].every(Number.isFinite))return false;
 const length=Math.hypot(dx,dy);
 dt=clamp075(dt,0,.06);
 if(length<.12||!dt){hero.moving=false;return false}
 dx/=Math.max(1,length);dy/=Math.max(1,length);
 // Equivalent on-screen speed in either direction on 9:16 viewports.
 // The hero is never enlarged to improve legibility.
 const oldX=hero.x,oldY=hero.y;
 const nx=clamp075(hero.x+dx*.40*dt,.095,.905);
 const ny=clamp075(hero.y+dy*.30*dt,.155,.915);
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
